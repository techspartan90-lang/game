import * as THREE from 'three';

export interface MaterialLibrary {
  asphalt: THREE.MeshStandardMaterial;
  asphaltCrosswalk: THREE.MeshStandardMaterial;
  sidewalk: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  grass: THREE.MeshStandardMaterial;
  woodDeck: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  glassFacade: THREE.MeshPhysicalMaterial;
  artDecoCoral: THREE.MeshStandardMaterial;
  artDecoMint: THREE.MeshStandardMaterial;
  artDecoCream: THREE.MeshStandardMaterial;
  modernTower: THREE.MeshStandardMaterial;
  industrialWall: THREE.MeshStandardMaterial;
  emissiveWindows: THREE.MeshStandardMaterial[];
  contactShadowTex: THREE.CanvasTexture;
  oceanMaterial: THREE.MeshPhysicalMaterial;
  oceanUniforms: { uTime: { value: number }; uStorm: { value: number } };
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function createAsphaltTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#252930';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt aggregate noise
  for (let i = 0; i < 14000; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 43758.5453) % 1;
    const px = Math.abs(x) * 512;
    const py = Math.abs(y) * 512;
    const shade = 30 + (i % 24);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // Subtle tire wear tracks
  ctx.fillStyle = 'rgba(15, 17, 22, 0.25)';
  ctx.fillRect(92, 0, 56, 512);
  ctx.fillRect(364, 0, 56, 512);

  // Double yellow center line
  ctx.fillStyle = '#d4a12a';
  ctx.fillRect(247, 0, 5, 512);
  ctx.fillRect(260, 0, 5, 512);

  // Outer white shoulder lines
  ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.fillRect(14, 0, 6, 512);
  ctx.fillRect(492, 0, 6, 512);

  return configureTexture(c, maxAniso, 1, 1, true);
}

function createIntersectionTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#24282f';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 8000; i++) {
    const px = ((i * 73) % 512);
    const py = ((i * 139) % 512);
    const shade = 32 + (i % 18);
    ctx.fillStyle = `rgb(${shade},${shade + 2},${shade + 4})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // Crosswalk stripes on all 4 edges
  ctx.fillStyle = 'rgba(232, 236, 242, 0.78)';
  for (let s = 44; s < 468; s += 42) {
    ctx.fillRect(s, 14, 22, 52);
    ctx.fillRect(s, 446, 22, 52);
    ctx.fillRect(14, s, 52, 22);
    ctx.fillRect(446, s, 52, 22);
  }

  return configureTexture(c, maxAniso, 1, 1, true);
}

function createSidewalkTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#9aa1a8';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete grain
  for (let i = 0; i < 6000; i++) {
    const px = (i * 97) % 512;
    const py = (i * 193) % 512;
    const v = 138 + (i % 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 3})`;
    ctx.fillRect(px, py, 2, 2);
  }

  // Expansion joint grid
  ctx.strokeStyle = 'rgba(55, 62, 70, 0.45)';
  ctx.lineWidth = 3;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  return configureTexture(c, maxAniso, 1, 1, true);
}

function createSandTexture(maxAniso: number): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#dec99d';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle wind ripples
  for (let y = 0; y < 512; y += 16) {
    ctx.fillStyle = 'rgba(196, 170, 124, 0.28)';
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 32) {
      const wy = y + Math.sin(x * 0.05 + y * 0.1) * 4;
      if (x === 0) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.lineTo(512, y + 6);
    ctx.lineTo(0, y + 6);
    ctx.closePath();
    ctx.fill();
  }

  for (let i = 0; i < 9000; i++) {
    const px = (i * 61) % 512;
    const py = (i * 157) % 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,232,0.22)' : 'rgba(164,136,92,0.22)';
    ctx.fillRect(px, py, 2, 2);
  }

  return configureTexture(c, maxAniso, 10, 10, true);
}

function createFacadeTextures(
  maxAniso: number,
  wallHex: string,
  trimHex: string,
  glassHex: string,
  cols: number,
  rows: number,
  seed: number
): { map: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const [c, ctx] = makeCanvas(512, 512);
  const [ec, ectx] = makeCanvas(512, 512);

  ctx.fillStyle = wallHex;
  ctx.fillRect(0, 0, 512, 512);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 512, 512);

  const cellW = 512 / cols;
  const cellH = 512 / rows;

  // Horizontal architectural floor ledges
  ctx.fillStyle = trimHex;
  for (let r = 0; r < rows; r++) {
    ctx.fillRect(0, r * cellH, 512, Math.max(4, cellH * 0.14));
  }

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const padX = cellW * 0.16;
      const padY = cellH * 0.22;
      const wx = col * cellW + padX;
      const wy = r * cellH + padY;
      const ww = cellW - padX * 2;
      const wh = cellH - padY * 1.45;

      // Window recess
      ctx.fillStyle = '#101722';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);

      // Glass pane gradient
      const grad = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      grad.addColorStop(0, glassHex);
      grad.addColorStop(1, '#0f1c2e');
      ctx.fillStyle = grad;
      ctx.fillRect(wx, wy, ww, wh);

      // Mullion divider
      ctx.fillStyle = trimHex;
      ctx.fillRect(wx + ww * 0.48, wy, 2, wh);

      // Deterministic lit windows for night emissive map
      const hash = Math.abs(Math.sin((r + 1) * 31.7 + (col + 1) * 17.3 + seed * 91.1) * 43758.5453) % 1;
      if (hash > 0.36) {
        const warm = hash > 0.65 ? '#ffcf86' : hash > 0.5 ? '#ffe7b8' : '#a8d8ff';
        ectx.fillStyle = warm;
        ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
      }
    }
  }

  return {
    map: configureTexture(c, maxAniso, 1, 1, true),
    emissiveMap: configureTexture(ec, maxAniso, 1, 1, true),
  };
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 256);
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): MaterialLibrary {
  const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];

  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const asphaltTex = trackTex(createAsphaltTexture(maxAniso));
  const crosswalkTex = trackTex(createIntersectionTexture(maxAniso));
  const sidewalkTex = trackTex(createSidewalkTexture(maxAniso));
  const sandTex = trackTex(createSandTexture(maxAniso));
  const contactShadowTex = trackTex(createContactShadowTexture());

  const asphalt = trackMat(
    new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.82,
      metalness: 0.05,
    })
  );

  const asphaltCrosswalk = trackMat(
    new THREE.MeshStandardMaterial({
      map: crosswalkTex,
      roughness: 0.82,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );

  const sidewalk = trackMat(
    new THREE.MeshStandardMaterial({
      map: sidewalkTex,
      roughness: 0.88,
      metalness: 0.02,
    })
  );

  const sand = trackMat(
    new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const grass = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b6e3c,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const woodDeck = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x855e42,
      roughness: 0.85,
      metalness: 0.04,
    })
  );

  const concreteDark = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b424d,
      roughness: 0.86,
      metalness: 0.08,
    })
  );

  const glassTex = createFacadeTextures(maxAniso, '#1d2d3e', '#52657a', '#3c6e8f', 6, 8, 1);
  const coralTex = createFacadeTextures(maxAniso, '#e59a84', '#f7e6d8', '#264457', 4, 5, 2);
  const mintTex = createFacadeTextures(maxAniso, '#8bc4b5', '#eef6f3', '#1f3e4f', 4, 5, 3);
  const creamTex = createFacadeTextures(maxAniso, '#e8dcc7', '#f8f3ea', '#274054', 5, 6, 4);
  const modernTex = createFacadeTextures(maxAniso, '#cfd6df', '#7d8a99', '#2b4f6e', 6, 8, 5);
  const indTex = createFacadeTextures(maxAniso, '#6b6e73', '#494c52', '#26323d', 4, 3, 6);

  [glassTex, coralTex, mintTex, creamTex, modernTex, indTex].forEach((p) => {
    trackTex(p.map);
    trackTex(p.emissiveMap);
  });

  const glassFacade = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: glassTex.map,
      emissive: new THREE.Color(0xfff1d6),
      emissiveMap: glassTex.emissiveMap,
      emissiveIntensity: 0.15,
      roughness: 0.16,
      metalness: 0.65,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
    })
  );

  const artDecoCoral = trackMat(
    new THREE.MeshStandardMaterial({
      map: coralTex.map,
      emissive: new THREE.Color(0xffdfa6),
      emissiveMap: coralTex.emissiveMap,
      emissiveIntensity: 0.12,
      roughness: 0.72,
      metalness: 0.06,
    })
  );

  const artDecoMint = trackMat(
    new THREE.MeshStandardMaterial({
      map: mintTex.map,
      emissive: new THREE.Color(0xffe6b8),
      emissiveMap: mintTex.emissiveMap,
      emissiveIntensity: 0.12,
      roughness: 0.74,
      metalness: 0.06,
    })
  );

  const artDecoCream = trackMat(
    new THREE.MeshStandardMaterial({
      map: creamTex.map,
      emissive: new THREE.Color(0xffe3b3),
      emissiveMap: creamTex.emissiveMap,
      emissiveIntensity: 0.12,
      roughness: 0.7,
      metalness: 0.05,
    })
  );

  const modernTower = trackMat(
    new THREE.MeshStandardMaterial({
      map: modernTex.map,
      emissive: new THREE.Color(0xdbeeff),
      emissiveMap: modernTex.emissiveMap,
      emissiveIntensity: 0.15,
      roughness: 0.35,
      metalness: 0.42,
    })
  );

  const industrialWall = trackMat(
    new THREE.MeshStandardMaterial({
      map: indTex.map,
      emissive: new THREE.Color(0xffd79c),
      emissiveMap: indTex.emissiveMap,
      emissiveIntensity: 0.08,
      roughness: 0.85,
      metalness: 0.15,
    })
  );

  // PBR Ocean Water extended via onBeforeCompile for realistic waves & sun reflections
  const oceanUniforms = {
    uTime: { value: 0 },
    uStorm: { value: 0 },
  };

  const oceanMaterial = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b5d7a,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9,
      transparent: true,
      opacity: 0.92,
    })
  );

  oceanMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = oceanUniforms.uTime;
    shader.uniforms.uStorm = oceanUniforms.uStorm;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime;
        uniform float uStorm;
        varying float vWaveHeight;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float amp = mix(0.28, 0.85, uStorm);
        float w1 = sin(position.x * 0.065 + uTime * 1.4) * cos(position.z * 0.055 + uTime * 1.1);
        float w2 = sin(position.x * 0.13 - uTime * 1.9 + position.z * 0.09) * 0.45;
        float h = (w1 + w2) * amp;
        transformed.y += h;
        vWaveHeight = h;`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vWaveHeight;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float foam = smoothstep(0.26, 0.62, vWaveHeight);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.74, 0.90, 0.95), foam * 0.35);`
      );
  };

  const emissiveWindows: THREE.MeshStandardMaterial[] = [
    glassFacade,
    artDecoCoral,
    artDecoMint,
    artDecoCream,
    modernTower,
    industrialWall,
  ];

  return {
    asphalt,
    asphaltCrosswalk,
    sidewalk,
    sand,
    grass,
    woodDeck,
    concreteDark,
    glassFacade,
    artDecoCoral,
    artDecoMint,
    artDecoCream,
    modernTower,
    industrialWall,
    emissiveWindows,
    contactShadowTex,
    oceanMaterial,
    oceanUniforms,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
