import * as THREE from 'three';
import { AABB, VEHICLE_PRESETS, VehiclePreset, VehicleType } from './types';
import { WATER_LEVEL, getGroundHeightAt } from './world';

export interface VehicleInput {
  throttle: number; // -1..1
  steer: number; // -1..1 (left positive)
  handbrake: boolean;
}

export class VehicleEntity {
  public readonly id: string;
  public readonly type: VehicleType;
  public readonly preset: VehiclePreset;
  public readonly group = new THREE.Group();
  public readonly chassisGroup = new THREE.Group();

  public position = new THREE.Vector3();
  public yaw = 0;
  public speed = 0; // forward signed m/s
  public lateralSpeed = 0;
  public steerAngle = 0;
  public health = 100;
  public headlightsOn = false;
  public sirenOn = false;
  public isPlayerOwned = false;
  public isPolice = false;
  public gear = 1;
  public rpm = 0.2;
  public drifting = false;

  private bodyPaintMat: THREE.MeshPhysicalMaterial;
  private headlightMat: THREE.MeshStandardMaterial;
  private taillightMat: THREE.MeshStandardMaterial;
  private wheelMeshes: THREE.Group[] = [];
  private frontWheelPivots: THREE.Group[] = [];
  private lightbarRedMat: THREE.MeshStandardMaterial | null = null;
  private lightbarBlueMat: THREE.MeshStandardMaterial | null = null;
  private headlightSpot: THREE.SpotLight | null = null;

  private pitchVisual = 0;
  private rollVisual = 0;

  constructor(
    id: string,
    type: VehicleType,
    x: number,
    z: number,
    yaw: number,
    contactShadowTex: THREE.CanvasTexture,
    isSoftwareGl: boolean,
    customColor?: number
  ) {
    this.id = id;
    this.type = type;
    this.preset = VEHICLE_PRESETS[type];
    this.isPolice = type === 'police';
    this.position.set(x, Math.max(WATER_LEVEL + 0.1, getGroundHeightAt(x, z)), z);
    this.yaw = yaw;

    // Grounded Contact Shadow Plane
    const shadowW = type === 'suv' ? 3.2 : 2.9;
    const shadowL = type === 'suv' ? 5.8 : 5.4;
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(shadowW, shadowL).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
      })
    );
    shadowPlane.position.y = 0.04;
    this.group.add(shadowPlane);

    this.group.add(this.chassisGroup);

    const paintColor = customColor ?? this.preset.defaultColor;
    this.bodyPaintMat = new THREE.MeshPhysicalMaterial({
      color: paintColor,
      roughness: 0.24,
      metalness: 0.55,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x161a21,
      roughness: 0.62,
      metalness: 0.35,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d1520,
      roughness: 0.1,
      metalness: 0.85,
      clearcoat: 1.0,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.16,
      metalness: 0.92,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x17191e,
      roughness: 0.9,
      metalness: 0.05,
    });

    this.headlightMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: new THREE.Color(0xfff4d6),
      emissiveIntensity: 0.2,
      roughness: 0.15,
    });

    this.taillightMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: new THREE.Color(0xff1f1f),
      emissiveIntensity: 0.35,
      roughness: 0.2,
    });

    // Build Composite Multi-Part Vehicle Silhouettes (10-14 distinct parts per car!)
    const isSuv = type === 'suv';
    const isRoadster = type === 'roadster';
    const bodyW = isSuv ? 2.18 : 2.02;
    const bodyL = isSuv ? 4.8 : 4.65;
    const bodyH = isSuv ? 0.82 : 0.58;
    const baseY = isSuv ? 0.64 : 0.48;

    // 1. Lower Chassis / Skirts
    const lowerSkirt = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.04, 0.22, bodyL + 0.08),
      trimMat
    );
    lowerSkirt.position.y = baseY - bodyH * 0.42;
    this.chassisGroup.add(lowerSkirt);

    // 2. Main Sculpted Body Hull
    const mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW, bodyH, bodyL),
      this.bodyPaintMat
    );
    mainBody.position.y = baseY;
    mainBody.castShadow = !isSoftwareGl;
    mainBody.receiveShadow = true;
    this.chassisGroup.add(mainBody);

    // 3. Police White Side Doors & Roof Accent
    if (this.isPolice) {
      const whiteDoorMat = new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        roughness: 0.26,
        metalness: 0.2,
        clearcoat: 0.9,
      });
      const doorBand = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW + 0.03, bodyH * 0.86, 1.95),
        whiteDoorMat
      );
      doorBand.position.set(0, baseY, 0.05);
      this.chassisGroup.add(doorBand);

      // Front Bullbar
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.44, 0.2), trimMat);
      bullbar.position.set(0, baseY - 0.04, bodyL * 0.5 + 0.14);
      this.chassisGroup.add(bullbar);
    }

    // 4. Hood Slope & Front Grille Intake
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW * 0.92, 0.14, 1.45),
      this.bodyPaintMat
    );
    hood.position.set(0, baseY + bodyH * 0.46, 1.38);
    hood.rotation.x = 0.08;
    this.chassisGroup.add(hood);

    const grille = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.68, 0.26, 0.1), trimMat);
    grille.position.set(0, baseY - 0.06, bodyL * 0.5 + 0.02);
    this.chassisGroup.add(grille);

    // 5. Cabin / Greenhouse (Open cockpit for roadster, tall cabin for SUV, sleek fastback for Supercar)
    if (isRoadster) {
      // Sloped windshield + roll hoops + interior dash/seats
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.48, 0.12), glassMat);
      windshield.position.set(0, baseY + 0.48, 0.68);
      windshield.rotation.x = -0.58;
      this.chassisGroup.add(windshield);

      const interior = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.26, 1.55), trimMat);
      interior.position.set(0, baseY + 0.28, -0.2);
      this.chassisGroup.add(interior);

      const hoopGeo = new THREE.TorusGeometry(0.22, 0.045, 8, 16, Math.PI);
      for (const hx of [-0.46, 0.46]) {
        const hoop = new THREE.Mesh(hoopGeo, chromeMat);
        hoop.position.set(hx, baseY + 0.42, -0.78);
        this.chassisGroup.add(hoop);
      }
    } else {
      const cabinH = isSuv ? 0.72 : 0.48;
      const cabinL = isSuv ? 2.75 : 2.15;
      const cabinZ = isSuv ? -0.35 : -0.18;
      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.84, cabinH, cabinL),
        glassMat
      );
      cabin.position.set(0, baseY + bodyH * 0.5 + cabinH * 0.45, cabinZ);
      cabin.castShadow = !isSoftwareGl;
      this.chassisGroup.add(cabin);

      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW * 0.8, 0.09, cabinL * 0.84),
        this.isPolice
          ? new THREE.MeshPhysicalMaterial({ color: 0xf8fafc, roughness: 0.25, clearcoat: 0.8 })
          : this.bodyPaintMat
      );
      roof.position.set(0, baseY + bodyH * 0.5 + cabinH * 0.92, cabinZ);
      this.chassisGroup.add(roof);

      // Police Roof Lightbar
      if (this.isPolice) {
        this.lightbarRedMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          emissive: new THREE.Color(0xff1a1a),
          emissiveIntensity: 0.2,
          roughness: 0.2,
        });
        this.lightbarBlueMat = new THREE.MeshStandardMaterial({
          color: 0x3b82f6,
          emissive: new THREE.Color(0x2563eb),
          emissiveIntensity: 0.2,
          roughness: 0.2,
        });
        const barY = baseY + bodyH * 0.5 + cabinH + 0.1;
        const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 0.28), trimMat);
        barBase.position.set(0, barY - 0.04, 0.05);
        const redLens = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.24), this.lightbarRedMat);
        redLens.position.set(-0.31, barY + 0.05, 0.05);
        const blueLens = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.15, 0.24), this.lightbarBlueMat);
        blueLens.position.set(0.31, barY + 0.05, 0.05);
        this.chassisGroup.add(barBase, redLens, blueLens);
      }
    }

    // 6. Supercar Aerodynamic Rear Wing & Diffuser
    if (type === 'supercar') {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.96, 0.07, 0.34), trimMat);
      wing.position.set(0, baseY + 0.52, -bodyL * 0.46);
      const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.18), trimMat);
      strutL.position.set(-0.62, baseY + 0.34, -bodyL * 0.45);
      const strutR = strutL.clone();
      strutR.position.x = 0.62;
      this.chassisGroup.add(wing, strutL, strutR);
    }

    // 7. Side Mirrors
    for (const side of [-1, 1]) {
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.14), this.bodyPaintMat);
      mirror.position.set(side * (bodyW * 0.5 + 0.09), baseY + bodyH * 0.44, 0.55);
      this.chassisGroup.add(mirror);
    }

    // 8. Headlights, Taillights & Twin Exhaust Pipes
    for (const side of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 0.1), this.headlightMat);
      hl.position.set(side * (bodyW * 0.34), baseY + 0.08, bodyL * 0.5 + 0.01);
      this.chassisGroup.add(hl);

      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 0.08), this.taillightMat);
      tl.position.set(side * (bodyW * 0.32), baseY + 0.12, -bodyL * 0.5 - 0.01);
      this.chassisGroup.add(tl);

      const exhaust = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8).rotateX(Math.PI / 2),
        chromeMat
      );
      exhaust.position.set(side * 0.52, baseY - 0.22, -bodyL * 0.5 - 0.06);
      this.chassisGroup.add(exhaust);
    }

    // 9. Four Detailed Wheels with Metallic Alloy Rims & Steerable Front Pivots
    const wheelRadius = isSuv ? 0.44 : 0.36;
    const wheelWidth = isSuv ? 0.3 : 0.28;
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.02, 10);
    rimGeo.rotateZ(Math.PI / 2);

    const wheelCoords: [number, number, boolean][] = [
      [-bodyW * 0.5 + 0.06, 1.44, true],
      [bodyW * 0.5 - 0.06, 1.44, true],
      [-bodyW * 0.5 + 0.06, -1.44, false],
      [bodyW * 0.5 - 0.06, -1.44, false],
    ];

    for (const [wx, wz, isFront] of wheelCoords) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, wheelRadius, wz);
      const wheelSpin = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, tireMat);
      const rim = new THREE.Mesh(rimGeo, chromeMat);
      wheelSpin.add(tire, rim);
      pivot.add(wheelSpin);
      this.group.add(pivot);
      this.wheelMeshes.push(wheelSpin);
      if (isFront) this.frontWheelPivots.push(pivot);
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }

  public enableRealHeadlight(scene: THREE.Scene, isSoftwareGl: boolean): void {
    if (isSoftwareGl || this.headlightSpot) return;
    const spot = new THREE.SpotLight(0xfff4d6, 0, 55, Math.PI / 4.2, 0.55, 1.4);
    spot.position.set(0, 0.9, 2.2);
    spot.target.position.set(0, -0.5, 22);
    this.group.add(spot, spot.target);
    this.headlightSpot = spot;
    void scene;
  }

  public setPaintColor(hex: number): void {
    this.bodyPaintMat.color.setHex(hex);
  }

  public repair(): void {
    this.health = 100;
  }

  public updatePhysics(
    dt: number,
    input: VehicleInput,
    weatherGripFactor: number,
    colliders: AABB[],
    elapsed: number,
    nightFactor: number,
    onImpact?: (intensity: number) => void
  ): void {
    const p = this.preset;

    // Acceleration, braking & reverse
    const forwardBrake = input.throttle < -0.1 && this.speed > 1.0;
    const reverseBrake = input.throttle > 0.1 && this.speed < -1.0;

    if (input.handbrake) {
      this.speed = THREE.MathUtils.damp(this.speed, 0, 3.6 * weatherGripFactor, dt);
    } else if (forwardBrake || reverseBrake) {
      const decel = p.braking * weatherGripFactor * dt;
      this.speed =
        this.speed > 0 ? Math.max(0, this.speed - decel) : Math.min(0, this.speed + decel);
    } else if (Math.abs(input.throttle) > 0.05) {
      const maxSpd = input.throttle > 0 ? p.maxSpeed : p.maxSpeed * 0.32;
      const accel = p.acceleration * (0.75 + 0.25 * weatherGripFactor);
      this.speed += input.throttle * accel * dt;
      this.speed = THREE.MathUtils.clamp(this.speed, -maxSpd, maxSpd);
    } else {
      // Natural rolling + aero drag
      this.speed = THREE.MathUtils.damp(this.speed, 0, 0.65, dt);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // Steering response scaled by speed
    const speedNorm = Math.min(1, Math.abs(this.speed) / 8);
    const highSpeedDamp = 1 - Math.min(0.45, Math.abs(this.speed) / (p.maxSpeed * 1.4));
    const targetSteer = input.steer * 0.48 * highSpeedDamp;
    this.steerAngle = THREE.MathUtils.damp(this.steerAngle, targetSteer, 11, dt);

    const dirSign = this.speed >= -0.05 ? 1 : -1;
    const driftBoost = input.handbrake ? 1.38 : 1.0;
    const yawDelta =
      this.steerAngle * p.turnRate * speedNorm * driftBoost * dirSign * dt;
    this.yaw += yawDelta;

    // Lateral drift slip physics
    const desiredLateral =
      input.handbrake && Math.abs(this.speed) > 9
        ? -this.steerAngle * Math.abs(this.speed) * 0.55
        : -this.steerAngle * Math.abs(this.speed) * (1 - weatherGripFactor) * 0.35;
    this.lateralSpeed = THREE.MathUtils.damp(
      this.lateralSpeed,
      desiredLateral,
      p.grip * weatherGripFactor,
      dt
    );
    this.drifting =
      Math.abs(this.speed) > 12 &&
      (input.handbrake || Math.abs(this.lateralSpeed) > 3.2 || (Math.abs(this.steerAngle) > 0.34 && weatherGripFactor < 0.8));

    // Integrate world position (forward is +Z in local vehicle coordinates)
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const vx = sinY * this.speed + cosY * this.lateralSpeed;
    const vz = cosY * this.speed - sinY * this.lateralSpeed;

    let nextX = THREE.MathUtils.clamp(this.position.x + vx * dt, -205, 200);
    let nextZ = THREE.MathUtils.clamp(this.position.z + vz * dt, -205, 200);

    // Prevent driving deep into the ocean (allow shallow beach)
    const nextGround = getGroundHeightAt(nextX, nextZ);
    if (nextGround < WATER_LEVEL - 0.25) {
      nextX = this.position.x;
      nextZ = this.position.z;
      this.speed *= -0.25;
    }

    // Building AABB Collisions
    const halfExt = 1.65;
    let collided = false;
    for (const c of colliders) {
      if (
        nextX + halfExt > c.minX &&
        nextX - halfExt < c.maxX &&
        nextZ + halfExt > c.minZ &&
        nextZ - halfExt < c.maxZ
      ) {
        const penL = Math.abs(nextX + halfExt - c.minX);
        const penR = Math.abs(c.maxX - (nextX - halfExt));
        const penT = Math.abs(nextZ + halfExt - c.minZ);
        const penB = Math.abs(c.maxZ - (nextZ - halfExt));
        const minPen = Math.min(penL, penR, penT, penB);
        if (minPen === penL) nextX = c.minX - halfExt;
        else if (minPen === penR) nextX = c.maxX + halfExt;
        else if (minPen === penT) nextZ = c.minZ - halfExt;
        else nextZ = c.maxZ + halfExt;
        collided = true;
      }
    }

    if (collided) {
      const impactSpeed = Math.abs(this.speed);
      if (impactSpeed > 7) {
        this.health = Math.max(15, this.health - impactSpeed * 0.45);
        onImpact?.(Math.min(1, impactSpeed / 30));
      }
      this.speed *= -0.28;
    }

    this.position.x = nextX;
    this.position.z = nextZ;
    this.position.y = Math.max(WATER_LEVEL + 0.05, getGroundHeightAt(nextX, nextZ));

    // Automatic 5-gear calculation & RPM
    const absSpd = Math.abs(this.speed);
    const speedRatio = absSpd / p.maxSpeed;
    if (this.speed < -0.5) {
      this.gear = 0; // Reverse
      this.rpm = THREE.MathUtils.clamp(0.25 + (absSpd / 15) * 0.65, 0.2, 0.95);
    } else {
      const gearIdx = Math.min(5, Math.max(1, Math.floor(speedRatio * 5) + 1));
      this.gear = gearIdx;
      const gearLow = ((gearIdx - 1) / 5) * p.maxSpeed;
      const gearHigh = (gearIdx / 5) * p.maxSpeed;
      const inGear = (absSpd - gearLow) / Math.max(1, gearHigh - gearLow);
      this.rpm = THREE.MathUtils.clamp(0.18 + inGear * 0.78, 0.16, 0.98);
    }

    // Suspension visual pitch & body roll
    const targetPitch = -input.throttle * 0.04 + (forwardBrake ? 0.055 : 0);
    const targetRoll = -this.steerAngle * Math.min(1, absSpd / 18) * 0.14;
    this.pitchVisual = THREE.MathUtils.damp(this.pitchVisual, targetPitch, 9, dt);
    this.rollVisual = THREE.MathUtils.damp(this.rollVisual, targetRoll, 9, dt);
    this.chassisGroup.rotation.x = this.pitchVisual;
    this.chassisGroup.rotation.z = this.rollVisual;

    // Spin & steer wheels
    const wheelRotDelta = (this.speed / 0.38) * dt;
    for (const w of this.wheelMeshes) {
      w.rotation.x += wheelRotDelta;
    }
    for (const fp of this.frontWheelPivots) {
      fp.rotation.y = this.steerAngle;
    }

    // Lighting states
    const lightsActive = this.headlightsOn || nightFactor > 0.35;
    this.headlightMat.emissiveIntensity = lightsActive ? 2.6 : 0.15;
    this.taillightMat.emissiveIntensity = forwardBrake || input.handbrake ? 3.2 : lightsActive ? 1.2 : 0.25;
    if (this.headlightSpot) {
      this.headlightSpot.intensity = lightsActive ? 38 : 0;
    }

    // Police lightbar strobe
    if (this.lightbarRedMat && this.lightbarBlueMat) {
      if (this.sirenOn) {
        const strobe = Math.sin(elapsed * 22) > 0;
        this.lightbarRedMat.emissiveIntensity = strobe ? 4.2 : 0.15;
        this.lightbarBlueMat.emissiveIntensity = strobe ? 0.15 : 4.2;
      } else {
        this.lightbarRedMat.emissiveIntensity = 0.2;
        this.lightbarBlueMat.emissiveIntensity = 0.2;
      }
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }
}
