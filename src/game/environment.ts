import * as THREE from 'three';
import { GraphicsPreset, WeatherType } from './types';
import { MaterialLibrary } from './materials';

export interface EnvironmentState {
  nightFactor: number; // 0 = day, 1 = night
  gripFactor: number; // 0.62..1.0
  isLightning: boolean;
}

export class DynamicEnvironment {
  public timeOfDay = 16.6; // Golden hour Solana sunset by default!
  public timeSpeed = 0.08; // Hours per real second (~5 min per full day)
  public weather: WeatherType = 'sunny';

  public readonly sunLight: THREE.DirectionalLight;
  public readonly hemiLight: THREE.HemisphereLight;
  private readonly skyMesh: THREE.Mesh;
  private readonly skyUniforms: {
    uTopColor: { value: THREE.Color };
    uHorizonColor: { value: THREE.Color };
    uSunDir: { value: THREE.Vector3 };
    uSunColor: { value: THREE.Color };
  };
  private readonly rainLines: THREE.LineSegments;
  private readonly rainPositions: Float32Array;
  private readonly rainCount = 900;

  private lightningTimer = 7;
  private lightningFlash = 0;
  private readonly isSoftwareGl: boolean;

  // Reusable colors (zero per-frame GC)
  private readonly _topColor = new THREE.Color();
  private readonly _horizonColor = new THREE.Color();
  private readonly _sunColor = new THREE.Color();
  private readonly _hemiSky = new THREE.Color();
  private readonly _hemiGround = new THREE.Color();
  private readonly _sunDir = new THREE.Vector3();

  private readonly cDayTop = new THREE.Color(0x1f6fb8);
  private readonly cDayHor = new THREE.Color(0x9bd2f0);
  private readonly cSunsetTop = new THREE.Color(0x273469);
  private readonly cSunsetHor = new THREE.Color(0xf48c5b);
  private readonly cNightTop = new THREE.Color(0x060a14);
  private readonly cNightHor = new THREE.Color(0x142038);
  private readonly cStormTop = new THREE.Color(0x1c232e);
  private readonly cStormHor = new THREE.Color(0x3f4c5e);

  constructor(scene: THREE.Scene, isSoftwareGl: boolean) {
    this.isSoftwareGl = isSoftwareGl;

    // 1. Directional Sun / Moon Key Light with Player-Following Shadow Frustum
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    this.sunLight.castShadow = !isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 105;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 340;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.03;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // 2. Sky / Ground Hemisphere Fill Light
    this.hemiLight = new THREE.HemisphereLight(0x8ec5fc, 0x3b4856, 0.85);
    scene.add(this.hemiLight);

    // 3. Horizon-Matched Exponential Fog
    scene.fog = new THREE.FogExp2(0xd8a88c, 0.0014);

    // 4. Procedural Atmospheric Sky Dome Shader
    this.skyUniforms = {
      uTopColor: { value: new THREE.Color(0x273469) },
      uHorizonColor: { value: new THREE.Color(0xf48c5b) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.25, -0.8).normalize() },
      uSunColor: { value: new THREE.Color(0xffcf88) },
    };

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldDir;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        varying vec3 vWorldDir;
        void main() {
          vec3 dir = normalize(vWorldDir);
          float h = clamp(dir.y, 0.0, 1.0);
          vec3 col = mix(uHorizonColor, uTopColor, pow(h, 0.55));
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunGlow = pow(sunDot, 22.0) * 0.55 + pow(sunDot, 240.0) * 1.4;
          col += uSunColor * sunGlow * smoothstep(-0.08, 0.12, uSunDir.y);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1300, 24, 16), skyMat);
    scene.add(this.skyMesh);

    // 5. Volumetric Rain Streak Particle System
    this.rainPositions = new Float32Array(this.rainCount * 6);
    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 90;
      const ry = Math.random() * 44;
      const rz = (Math.random() - 0.5) * 90;
      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.18;
      this.rainPositions[idx + 4] = ry - 1.5;
      this.rainPositions[idx + 5] = rz;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xcbe4ff,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    this.rainLines.visible = false;
    scene.add(this.rainLines);
  }

  public applyGraphicsPreset(preset: GraphicsPreset): void {
    if (this.isSoftwareGl) return;
    const mapSize =
      preset === 'low' ? 512 : preset === 'medium' ? 1024 : preset === 'high' ? 2048 : 2048;
    this.sunLight.castShadow = preset !== 'low';
    if (this.sunLight.shadow.mapSize.width !== mapSize) {
      this.sunLight.shadow.mapSize.set(mapSize, mapSize);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
  }

  public update(
    dt: number,
    elapsed: number,
    focusX: number,
    focusZ: number,
    scene: THREE.Scene,
    materials: MaterialLibrary,
    onThunder?: () => void
  ): EnvironmentState {
    // Advance 24h clock smoothly
    this.timeOfDay = (this.timeOfDay + dt * this.timeSpeed) % 24;

    // Sun angle from 0..24h (6:00 sunrise, 12:00 zenith, 18:00 sunset)
    const sunAngle = ((this.timeOfDay - 6) / 24) * Math.PI * 2;
    const sunElev = Math.sin(sunAngle); // -1..1
    const sunHoriz = Math.cos(sunAngle);

    this._sunDir.set(sunHoriz * 0.85, sunElev, -0.52).normalize();

    const dayFactor = THREE.MathUtils.smoothstep(sunElev, -0.1, 0.35);
    const sunsetFactor =
      Math.max(0, 1 - Math.abs(sunElev - 0.08) / 0.28) *
      THREE.MathUtils.smoothstep(sunElev, -0.22, 0.0);
    const nightFactor = 1 - dayFactor;

    // Blend sky palette by time of day
    this._topColor.copy(this.cNightTop).lerp(this.cDayTop, dayFactor);
    this._horizonColor.copy(this.cNightHor).lerp(this.cDayHor, dayFactor);
    this._topColor.lerp(this.cSunsetTop, sunsetFactor * 0.72);
    this._horizonColor.lerp(this.cSunsetHor, sunsetFactor * 0.88);

    // Apply weather overcast/fog/storm modulation
    const overcast =
      this.weather === 'storm'
        ? 0.88
        : this.weather === 'rain'
          ? 0.68
          : this.weather === 'cloudy'
            ? 0.45
            : this.weather === 'foggy'
              ? 0.52
              : 0;

    if (overcast > 0) {
      this._topColor.lerp(this.cStormTop, overcast * (0.35 + 0.65 * dayFactor));
      this._horizonColor.lerp(this.cStormHor, overcast * (0.4 + 0.6 * dayFactor));
    }

    // Tropical Storm Lightning Flashes
    let isLightning = false;
    if (this.weather === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.lightningFlash = 1.0;
        this.lightningTimer = 6 + Math.random() * 9;
        isLightning = true;
        onThunder?.();
      }
      this.lightningFlash = Math.max(0, this.lightningFlash - dt * 3.8);
    } else {
      this.lightningFlash = 0;
    }

    // Update sky dome centered on camera/player
    this.skyMesh.position.set(focusX, 0, focusZ);
    this.skyUniforms.uTopColor.value.copy(this._topColor);
    this.skyUniforms.uHorizonColor.value.copy(this._horizonColor);
    this.skyUniforms.uSunDir.value.copy(this._sunDir);
    this._sunColor
      .setHex(0xfff4de)
      .lerp(new THREE.Color(0xff9454), sunsetFactor * 0.85);
    this.skyUniforms.uSunColor.value.copy(this._sunColor);

    // Update Directional Key Light (switches smoothly to cool moonlight at night)
    const lightDirY = sunElev > -0.05 ? Math.max(0.18, sunElev) : 0.45;
    const lightDirX = sunElev > -0.05 ? sunHoriz * 0.85 : -sunHoriz * 0.7;
    this.sunLight.position.set(
      focusX + lightDirX * 130,
      lightDirY * 145,
      focusZ - 75
    );
    this.sunLight.target.position.set(focusX, 0, focusZ);
    this.sunLight.target.updateMatrixWorld();

    const sunIntensity =
      THREE.MathUtils.lerp(0.42, 2.35, dayFactor) * (1 - overcast * 0.55) +
      this.lightningFlash * 3.5;
    this.sunLight.intensity = sunIntensity;
    if (nightFactor > 0.65) {
      this.sunLight.color.setHex(0x88b4e8);
    } else {
      this.sunLight.color.copy(this._sunColor);
    }

    // Hemisphere Fill
    this._hemiSky.copy(this._horizonColor);
    this._hemiGround.setHex(nightFactor > 0.5 ? 0x131b2b : 0x454f5e);
    this.hemiLight.color.copy(this._hemiSky);
    this.hemiLight.groundColor.copy(this._hemiGround);
    this.hemiLight.intensity =
      THREE.MathUtils.lerp(0.45, 0.95, dayFactor) * (1 - overcast * 0.25) +
      this.lightningFlash * 1.6;

    // Horizon-matched Fog density
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.color.copy(this._horizonColor);
      const targetDensity =
        this.weather === 'foggy'
          ? 0.0068
          : this.weather === 'storm'
            ? 0.0046
            : this.weather === 'rain'
              ? 0.0031
              : this.weather === 'cloudy'
                ? 0.0019
                : 0.0013;
      scene.fog.density = THREE.MathUtils.damp(scene.fog.density, targetDensity, 2.5, dt);
    }

    // Ocean Shader Uniforms & Wet Asphalt Gloss in Rain
    materials.oceanUniforms.uTime.value = elapsed;
    const stormTarget = this.weather === 'storm' ? 1 : this.weather === 'rain' ? 0.55 : 0;
    materials.oceanUniforms.uStorm.value = THREE.MathUtils.damp(
      materials.oceanUniforms.uStorm.value,
      stormTarget,
      2,
      dt
    );
    const wetAsphaltRough = this.weather === 'storm' ? 0.28 : this.weather === 'rain' ? 0.38 : 0.82;
    materials.asphalt.roughness = THREE.MathUtils.damp(
      materials.asphalt.roughness,
      wetAsphaltRough,
      1.8,
      dt
    );

    // Rain particle drop animation around focus point
    const isRaining = this.weather === 'rain' || this.weather === 'storm';
    this.rainLines.visible = isRaining;
    if (isRaining) {
      this.rainLines.position.set(focusX, 0, focusZ);
      const fallSpeed = this.weather === 'storm' ? 46 : 32;
      const windX = this.weather === 'storm' ? -9 : -2.5;
      const streakLen = this.weather === 'storm' ? 2.2 : 1.5;
      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 6;
        let x = this.rainPositions[idx] + windX * dt;
        let y = this.rainPositions[idx + 1] - fallSpeed * dt;
        const z = this.rainPositions[idx + 2];
        if (y < 0) {
          y += 44;
          x = (Math.random() - 0.5) * 90;
        }
        this.rainPositions[idx] = x;
        this.rainPositions[idx + 1] = y;
        this.rainPositions[idx + 3] = x + windX * 0.04;
        this.rainPositions[idx + 4] = y - streakLen;
        this.rainPositions[idx + 5] = z;
      }
      this.rainLines.geometry.attributes.position.needsUpdate = true;
    }

    const gripFactor =
      this.weather === 'storm'
        ? 0.62
        : this.weather === 'rain'
          ? 0.76
          : this.weather === 'foggy'
            ? 0.92
            : 1.0;

    return { nightFactor, gripFactor, isLightning };
  }
}
