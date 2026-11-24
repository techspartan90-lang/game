import * as THREE from 'three';
import { AABB, WorldLandmark } from './types';
import { MaterialLibrary } from './materials';

export const WATER_LEVEL = -1.6;
export const ROAD_X = [-150, -75, 0, 75];
export const ROAD_Z = [-150, -75, 0, 75, 150];
export const ROAD_WIDTH = 16;

export const WORLD_LANDMARKS: WorldLandmark[] = [
  {
    id: 'garage',
    name: 'Solana Customs Garage',
    district: 'Palm Heights',
    type: 'garage',
    x: -36,
    z: 36,
    radius: 10,
    description: 'Repair damage, repaint your ride, or summon owned vehicles.',
  },
  {
    id: 'safehouse',
    name: 'Oceanview Safehouse',
    district: 'Coral Strip',
    type: 'safehouse',
    x: 42,
    z: -36,
    radius: 8,
    description: 'Change outfits, advance time of day, and save your progress.',
  },
  {
    id: 'lounge',
    name: 'Club Solara Terrace',
    district: 'Coral Strip',
    type: 'lounge',
    x: 98,
    z: 48,
    radius: 8,
    description: 'Oceanfront lounge. Restores full health and stamina.',
  },
  {
    id: 'police',
    name: 'Bayfront Precinct',
    district: 'Vista Civic Center',
    type: 'police',
    x: -112,
    z: -36,
    radius: 10,
    description: 'Solana Bay Police Department central dispatch.',
  },
  {
    id: 'hospital',
    name: 'Vista Medical Center',
    district: 'Vista Civic Center',
    type: 'hospital',
    x: -112,
    z: 36,
    radius: 10,
    description: 'Emergency trauma hospital and recovery wing.',
  },
  {
    id: 'pier',
    name: 'Coral Pier Marina',
    district: 'Solana Marina',
    type: 'landmark',
    x: 175,
    z: 0,
    radius: 12,
    description: 'Scenic timber yacht pier overlooking the emerald bay.',
  },
  {
    id: 'lighthouse',
    name: 'Solana Cape Lighthouse',
    district: 'Solana Marina',
    type: 'landmark',
    x: 150,
    z: 162,
    radius: 14,
    description: 'Historic coastal beacon guiding ships into Solana Bay.',
  },
];

export interface WorldData {
  group: THREE.Group;
  colliders: AABB[];
  streetLampGlowMats: THREE.MeshStandardMaterial[];
  neonTrimMats: THREE.MeshStandardMaterial[];
  trafficLightRedMats: THREE.MeshStandardMaterial[];
  trafficLightGreenMats: THREE.MeshStandardMaterial[];
  zoneRings: THREE.Mesh[];
  lighthouseBeam: THREE.Group;
  checkpointBeacon: THREE.Group;
  update: (elapsed: number, nightFactor: number, trafficPhaseNS: boolean) => void;
  getGroundHeight: (x: number, z: number) => number;
  getDistrictAt: (x: number, z: number) => string;
}

export function getGroundHeightAt(x: number, z: number): number {
  // Timber Pier over the water
  if (x >= 106 && x <= 204 && Math.abs(z) <= 8.5) {
    return 0.6;
  }
  // Cape Lighthouse rocky peninsula
  const dxL = x - 150;
  const dzL = z - 162;
  const distL = Math.hypot(dxL, dzL);
  if (distL < 28) {
    const t = Math.max(0, 1 - distL / 28);
    return Math.max(-0.2, t * 2.2 - 0.2);
  }
  // Main urban plateau
  if (x >= -196 && x <= 104 && z >= -196 && z <= 196) {
    return 0;
  }
  // Gently sloping golden beach to the east
  if (x > 104 && x <= 175 && z >= -196 && z <= 196) {
    const t = (x - 104) / 71;
    return -t * 2.4;
  }
  // Sloping shoreline on north, south, west edges
  const overX = Math.max(0, -196 - x, x - 175);
  const overZ = Math.max(0, -196 - z, z - 196);
  const edgeDist = Math.hypot(overX, overZ);
  return Math.max(-6.5, -0.3 - edgeDist * 0.14);
}

export function getDistrictAt(x: number, z: number): string {
  if (x > 104 && Math.abs(z) < 42) return 'Solana Marina';
  if (x > 104 && z > 125) return 'Cape Point';
  if (x > 92) return 'Coral Strip Beach';
  if (x >= -20 && z <= 25 && z >= -125) return 'Bayfront Financial Core';
  if (x < -75 && z >= -80 && z <= 80) return 'Vista Civic Center';
  if (z > 75) return 'Harbor South';
  if (z < -75) return 'North Promenade';
  return 'Palm Heights';
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function buildSolanaWorld(
  materials: MaterialLibrary,
  isSoftwareGl: boolean
): WorldData {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const streetLampGlowMats: THREE.MeshStandardMaterial[] = [];
  const neonTrimMats: THREE.MeshStandardMaterial[] = [];
  const trafficLightRedMats: THREE.MeshStandardMaterial[] = [];
  const trafficLightGreenMats: THREE.MeshStandardMaterial[] = [];
  const zoneRings: THREE.Mesh[] = [];
  const rand = seededRand(4059);

  // 1. EXPANSIVE ANIMATED OCEAN PLANE (no empty void)
  const oceanGeo = new THREE.PlaneGeometry(2400, 2400, isSoftwareGl ? 36 : 96, isSoftwareGl ? 36 : 96);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMesh = new THREE.Mesh(oceanGeo, materials.oceanMaterial);
  oceanMesh.position.y = WATER_LEVEL;
  oceanMesh.receiveShadow = false;
  group.add(oceanMesh);

  // 2. MAIN ISLAND BASE TERRAIN (Urban Peninsula + Beach Slope + Seafloor)
  const islandBaseGeo = new THREE.BoxGeometry(304, 4, 396);
  const islandBase = new THREE.Mesh(islandBaseGeo, materials.sidewalk);
  islandBase.position.set(-46, -2.04, 0);
  islandBase.receiveShadow = true;
  group.add(islandBase);

  // Coastal retaining seawall along West, North, South edges
  const seawallMat = new THREE.MeshStandardMaterial({
    color: 0x737b84,
    roughness: 0.85,
    metalness: 0.1,
  });
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(308, 2.2, 2.5), seawallMat);
  wallN.position.set(-46, -0.5, -198);
  group.add(wallN);
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(308, 2.2, 2.5), seawallMat);
  wallS.position.set(-46, -0.5, 198);
  group.add(wallS);
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 398), seawallMat);
  wallW.position.set(-198, -0.5, 0);
  group.add(wallW);

  // 3. GOLDEN SLOPING BEACH & CORAL BOARDWALK
  const beachGeo = new THREE.PlaneGeometry(86, 396, 16, 16);
  beachGeo.rotateX(-Math.PI / 2);
  const posAttr = beachGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i); // -43 .. +43
    const t = (lx + 43) / 86;
    posAttr.setY(i, -t * 2.9);
  }
  beachGeo.computeVertexNormals();
  const beachMesh = new THREE.Mesh(beachGeo, materials.sand);
  beachMesh.position.set(147, -0.02, 0);
  beachMesh.receiveShadow = true;
  group.add(beachMesh);

  // Boardwalk timber promenade along the beach edge
  const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(8, 0.35, 386), materials.woodDeck);
  boardwalk.position.set(106, -0.05, 0);
  boardwalk.receiveShadow = true;
  group.add(boardwalk);

  // 4. ROAD NETWORK (Offset Y = +0.02 to prevent Z-fighting)
  const roadLenX = 330; // X from -195 to +105 -> centered around -45
  const roadLenZ = 384;

  // North-South Avenues
  for (const rx of ROAD_X) {
    const roadMat = materials.asphalt.clone();
    if (roadMat.map) {
      roadMat.map = roadMat.map.clone();
      roadMat.map.repeat.set(1, 24);
      roadMat.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLenZ), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(rx, 0.02, 0);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // East-West Streets
  for (const rz of ROAD_Z) {
    const roadMat = materials.asphalt.clone();
    if (roadMat.map) {
      roadMat.map = roadMat.map.clone();
      roadMat.map.repeat.set(1, 18);
      roadMat.map.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, roadLenX), roadMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.PI / 2;
    mesh.position.set(-45, 0.025, rz);
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Intersection Crosswalk Squares (Y = +0.035)
  const interGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 1.2, ROAD_WIDTH + 1.2);
  for (const rx of ROAD_X) {
    for (const rz of ROAD_Z) {
      const inter = new THREE.Mesh(interGeo, materials.asphaltCrosswalk);
      inter.rotation.x = -Math.PI / 2;
      inter.position.set(rx, 0.035, rz);
      inter.receiveShadow = true;
      group.add(inter);
    }
  }

  // 5. COMPOSITE MULTI-PART ARCHITECTURAL BUILDINGS
  const roofTrimMat = new THREE.MeshStandardMaterial({
    color: 0x2a313c,
    roughness: 0.7,
    metalness: 0.35,
  });
  const lobbyMat = new THREE.MeshStandardMaterial({
    color: 0x202733,
    roughness: 0.4,
    metalness: 0.5,
  });
  const awningColors = [0xd9483b, 0x0d9488, 0xd97706, 0x2563eb];
  const facadePool = [
    materials.glassFacade,
    materials.modernTower,
    materials.artDecoCoral,
    materials.artDecoMint,
    materials.artDecoCream,
    materials.industrialWall,
  ];

  const neonColors = [0xff6b4a, 0x22d3ee, 0xfbbf24, 0xf472b6, 0x34d399];

  const addCompositeBuilding = (
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    facadeMat: THREE.Material,
    accentHex: number | null,
    isHero = false
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(cx, 0, cz);

    // Podium / Ground-floor Lobby
    const podiumH = Math.min(5.2, h * 0.25);
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w, podiumH, d), lobbyMat);
    podium.position.y = podiumH * 0.5;
    podium.castShadow = !isSoftwareGl;
    podium.receiveShadow = true;
    bGroup.add(podium);

    // Entrance Canopy Awning
    const awningMat = new THREE.MeshStandardMaterial({
      color: awningColors[Math.floor(rand() * awningColors.length)],
      roughness: 0.65,
      metalness: 0.1,
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.45, 2.2), awningMat);
    awning.position.set(0, 3.6, d * 0.5 + 1.0);
    bGroup.add(awning);

    // Main Tower Shaft
    const mainH = h - podiumH;
    const shaftW = w * 0.94;
    const shaftD = d * 0.94;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(shaftW, mainH, shaftD), facadeMat);
    shaft.position.y = podiumH + mainH * 0.5;
    shaft.castShadow = !isSoftwareGl;
    shaft.receiveShadow = true;
    bGroup.add(shaft);

    // Roof Parapet Cornice
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(shaftW + 0.8, 0.9, shaftD + 0.8),
      roofTrimMat
    );
    parapet.position.y = h + 0.45;
    bGroup.add(parapet);

    // Stepped Penthouse Setback on taller towers
    if (h > 26 || isHero) {
      const pentH = Math.max(5, h * 0.16);
      const pent = new THREE.Mesh(
        new THREE.BoxGeometry(shaftW * 0.65, pentH, shaftD * 0.65),
        facadeMat
      );
      pent.position.y = h + pentH * 0.5;
      pent.castShadow = !isSoftwareGl;
      bGroup.add(pent);

      // Rooftop Spire or Helipad Deck
      if (isHero) {
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.5, 14, 8),
          roofTrimMat
        );
        spire.position.y = h + pentH + 7;
        bGroup.add(spire);
      } else {
        const hvac = new THREE.Mesh(
          new THREE.BoxGeometry(shaftW * 0.25, 2.2, shaftD * 0.25),
          roofTrimMat
        );
        hvac.position.set(shaftW * 0.12, h + pentH + 1.1, 0);
        bGroup.add(hvac);
      }
    } else {
      // Rooftop AC units
      const hvac = new THREE.Mesh(new THREE.BoxGeometry(w * 0.28, 1.5, d * 0.28), roofTrimMat);
      hvac.position.set(-w * 0.15, h + 1.2, d * 0.1);
      bGroup.add(hvac);
    }

    // Subtle Architectural Accent Crown Light Strip (glows at dusk/night)
    if (accentHex !== null) {
      const neonMat = new THREE.MeshStandardMaterial({
        color: accentHex,
        emissive: new THREE.Color(accentHex),
        emissiveIntensity: 0.2,
        roughness: 0.3,
        metalness: 0.2,
      });
      neonTrimMats.push(neonMat);
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(shaftW + 1.0, 0.42, shaftD + 1.0),
        neonMat
      );
      strip.position.y = h + 0.1;
      bGroup.add(strip);
    }

    group.add(bGroup);
    colliders.push({
      minX: cx - w * 0.5 - 0.5,
      maxX: cx + w * 0.5 + 0.5,
      minZ: cz - d * 0.5 - 0.5,
      maxZ: cz + d * 0.5 + 0.5,
      maxY: h,
    });
  };

  // Populate city blocks between roads (centers at X = -112.5, -37.5, +37.5 and Z = -112.5, -37.5, +37.5, +112.5)
  const blockCentersX = [-112.5, -37.5, 37.5];
  const blockCentersZ = [-112.5, -37.5, 37.5, 112.5];

  for (const bx of blockCentersX) {
    for (const bz of blockCentersZ) {
      // Reserve Palm Heights Garage block (-37.5, +37.5) with open drive-in forecourt!
      if (bx === -37.5 && bz === 37.5) {
        // Solana Customs Garage Building (north edge of block, open courtyard in center for driving in)
        addCompositeBuilding(bx, bz - 16, 36, 14, 11, materials.industrialWall, 0xf59e0b, false);
        // Garage canopy arch over drive-in bay
        const bayMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.5,
          metalness: 0.6,
        });
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), bayMat);
        canopy.position.set(bx, 5.8, bz - 2);
        group.add(canopy);
        const pillarGeo = new THREE.CylinderGeometry(0.4, 0.4, 5.8, 8);
        for (const px of [-8.2, 8.2]) {
          for (const pz of [-7.2, 3.2]) {
            const p = new THREE.Mesh(pillarGeo, bayMat);
            p.position.set(bx + px, 2.9, bz + pz);
            group.add(p);
          }
        }
        continue;
      }

      // Reserve Oceanview Safehouse Plaza (+37.5, -37.5) with Art Deco Boutique Tower & open driveway
      if (bx === 37.5 && bz === -37.5) {
        addCompositeBuilding(bx - 12, bz - 10, 20, 22, 24, materials.artDecoCream, 0x22d3ee, false);
        // Palm courtyard park patch
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(20, 0.16, 22), materials.grass);
        lawn.position.set(bx + 12, 0.08, bz + 10);
        lawn.receiveShadow = true;
        group.add(lawn);
        continue;
      }

      // Reserve Bayfront Civic Precinct (-112.5, -37.5) -> Police HQ
      if (bx === -112.5 && bz === -37.5) {
        addCompositeBuilding(bx - 8, bz - 10, 28, 22, 18, materials.modernTower, 0x3b82f6, false);
        continue;
      }

      // Reserve Vista Medical Center (-112.5, +37.5) -> Hospital
      if (bx === -112.5 && bz === 37.5) {
        addCompositeBuilding(bx - 6, bz + 10, 30, 22, 22, materials.artDecoCream, 0xef4444, false);
        continue;
      }

      // Reserve Central Plaza Park (-37.5, -37.5) — Lush Tropical Park Square with Fountain
      if (bx === -37.5 && bz === -37.5) {
        const parkLawn = new THREE.Mesh(new THREE.BoxGeometry(46, 0.16, 46), materials.grass);
        parkLawn.position.set(bx, 0.08, bz);
        parkLawn.receiveShadow = true;
        group.add(parkLawn);

        // Central Stone Fountain
        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(7, 7.6, 1.2, 24),
          materials.sidewalk
        );
        basin.position.set(bx, 0.6, bz);
        group.add(basin);
        const pool = new THREE.Mesh(
          new THREE.CylinderGeometry(6.2, 6.2, 0.25, 24),
          materials.oceanMaterial
        );
        pool.position.set(bx, 1.05, bz);
        group.add(pool);
        const obelisk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 1.5, 5.5, 12),
          materials.artDecoCream
        );
        obelisk.position.set(bx, 3.2, bz);
        group.add(obelisk);
        colliders.push({
          minX: bx - 7.5,
          maxX: bx + 7.5,
          minZ: bz - 7.5,
          maxZ: bz + 7.5,
          maxY: 6,
        });
        continue;
      }

      // Standard Urban City Blocks: 2 to 4 multi-part buildings per block
      const isFinancial = bx === 37.5 || (bx === -37.5 && bz === -112.5);
      const subOffsets = [
        [-13, -13],
        [13, -13],
        [-13, 13],
        [13, 13],
      ];

      subOffsets.forEach(([ox, oz], idx) => {
        const w = 18 + rand() * 5;
        const d = 18 + rand() * 5;
        const baseH = isFinancial ? 34 + rand() * 44 : 14 + rand() * 26;
        const mat = isFinancial
          ? idx % 2 === 0
            ? materials.glassFacade
            : materials.modernTower
          : facadePool[Math.floor(rand() * (facadePool.length - 1)) + 1];
        const accent = rand() > 0.45 ? neonColors[Math.floor(rand() * neonColors.length)] : null;
        addCompositeBuilding(
          bx + ox,
          bz + oz,
          w,
          d,
          baseH,
          mat,
          accent,
          isFinancial && idx === 0
        );
      });
    }
  }

  // Beachfront Coral Strip Art Deco Hotels & Club Solara (along X = 90)
  const beachfrontZ = [-135, -90, -45, 50, 105, 145];
  beachfrontZ.forEach((bz, i) => {
    const mat =
      i % 3 === 0
        ? materials.artDecoCoral
        : i % 3 === 1
          ? materials.artDecoMint
          : materials.artDecoCream;
    addCompositeBuilding(
      91,
      bz,
      14,
      24,
      i === 3 ? 16 : 18 + (i % 3) * 7,
      mat,
      neonColors[i % neonColors.length],
      false
    );
  });

  // 6. CORAL PIER & MOORED YACHTS (X = 108..202, Z = 0)
  const pierDeck = new THREE.Mesh(new THREE.BoxGeometry(96, 0.65, 16), materials.woodDeck);
  pierDeck.position.set(156, 0.3, 0);
  pierDeck.receiveShadow = true;
  group.add(pierDeck);

  // Pier timber pilings
  const pilingGeo = new THREE.CylinderGeometry(0.45, 0.5, 6.5, 8);
  const pilingMat = new THREE.MeshStandardMaterial({ color: 0x4b382a, roughness: 0.9 });
  for (let px = 114; px <= 200; px += 14) {
    for (const pz of [-7.2, 7.2]) {
      const post = new THREE.Mesh(pilingGeo, pilingMat);
      post.position.set(px, -2.5, pz);
      group.add(post);
    }
  }

  // Moored Composite Yachts beside the pier
  const buildYacht = (x: number, z: number, yaw: number, stripeHex: number) => {
    const yGroup = new THREE.Group();
    yGroup.position.set(x, WATER_LEVEL + 0.3, z);
    yGroup.rotation.y = yaw;
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.1,
      clearcoat: 0.85,
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: stripeHex, roughness: 0.35 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.85,
    });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(11, 1.6, 3.8), hullMat);
    hull.position.y = 0.6;
    yGroup.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(2.65, 4.2, 4), hullMat);
    bow.rotation.z = -Math.PI / 2;
    bow.rotation.x = Math.PI / 4;
    bow.scale.set(0.6, 1, 1);
    bow.position.set(7.4, 0.7, 0);
    yGroup.add(bow);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.28, 3.9), stripeMat);
    stripe.position.y = 1.05;
    yGroup.add(stripe);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.5, 2.8), hullMat);
    cabin.position.set(-0.6, 2.0, 0);
    yGroup.add(cabin);
    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 2.9), glassMat);
    bridgeGlass.position.set(0.8, 2.2, 0);
    yGroup.add(bridgeGlass);
    group.add(yGroup);
  };

  buildYacht(152, -16, 0.12, 0x0ea5e9);
  buildYacht(178, 16, -0.08, 0xe11d48);
  buildYacht(192, -22, 0.45, 0xf59e0b);

  // 7. SOLANA CAPE LIGHTHOUSE (X = 150, Z = 162)
  const capeRock = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 26, 4.4, 14),
    materials.concreteDark
  );
  capeRock.position.set(150, -0.3, 162);
  group.add(capeRock);

  const lhTower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3.6, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.7 })
  );
  lhTower.position.set(150, 13.5, 162);
  group.add(lhTower);

  const lhBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 3.05, 6, 16),
    new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.65 })
  );
  lhBand.position.set(150, 14.5, 162);
  group.add(lhBand);

  const lhCap = new THREE.Mesh(
    new THREE.ConeGeometry(2.9, 3.4, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.6 })
  );
  lhCap.position.set(150, 28.4, 162);
  group.add(lhCap);

  const lighthouseBeam = new THREE.Group();
  lighthouseBeam.position.set(150, 26.2, 162);
  const beamGeo = new THREE.ConeGeometry(4.5, 42, 14, 1, true);
  beamGeo.rotateZ(Math.PI / 2);
  beamGeo.translate(21, 0, 0);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3b0,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beam1 = new THREE.Mesh(beamGeo, beamMat);
  const beam2 = new THREE.Mesh(beamGeo, beamMat);
  beam2.rotation.y = Math.PI;
  lighthouseBeam.add(beam1, beam2);
  group.add(lighthouseBeam);

  colliders.push({ minX: 146, maxX: 154, minZ: 158, maxZ: 166, maxY: 28 });

  // 8. DISTANT SCENIC HORIZON MOUNTAINS & OUTER TROPICAL ISLANDS (natural outdoor perimeter!)
  const islandMat = new THREE.MeshStandardMaterial({
    color: 0x2d4a44,
    roughness: 0.92,
    metalness: 0.02,
  });
  const horizonPeaks = [
    [-460, -340, 150, 95],
    [-520, 40, 190, 125],
    [-440, 380, 160, 105],
    [80, -490, 170, 88],
    [-190, -510, 180, 110],
    [220, 510, 140, 72],
    [-140, 520, 175, 96],
    [520, -280, 120, 58],
  ];
  for (const [hx, hz, rad, height] of horizonPeaks) {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(rad, height, 7), islandMat);
    peak.position.set(hx, height * 0.42 - 6, hz);
    peak.rotation.y = rand() * Math.PI;
    group.add(peak);
  }

  // 9. INSTANCED PALM TREE GROVES (Curved Trunks + Layered Frond Crowns, bottom-center pivot)
  const palmPositions: { x: number; z: number; scale: number; rot: number }[] = [];
  // Along Coral Strip Beach & Boardwalk
  for (let z = -175; z <= 175; z += 18) {
    if (Math.abs(z) < 16) continue; // Keep pier entrance open
    palmPositions.push({
      x: 115 + (rand() - 0.5) * 14,
      z: z + (rand() - 0.5) * 6,
      scale: 0.85 + rand() * 0.35,
      rot: rand() * Math.PI * 2,
    });
  }
  // Along Ocean Boulevard median & Central Park
  for (let z = -165; z <= 165; z += 26) {
    if (ROAD_Z.some((rz) => Math.abs(z - rz) < 12)) continue;
    palmPositions.push({
      x: 85.5,
      z,
      scale: 0.88 + rand() * 0.24,
      rot: rand() * Math.PI * 2,
    });
  }
  // Around Central Park
  for (const [px, pz] of [
    [-54, -54],
    [-21, -54],
    [-54, -21],
    [-21, -21],
    [-50, -37],
    [-25, -37],
    [50, -24],
    [48, -48],
  ]) {
    palmPositions.push({
      x: px,
      z: pz,
      scale: 0.9 + rand() * 0.28,
      rot: rand() * Math.PI * 2,
    });
  }

  const palmCount = palmPositions.length;
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.35, 3.2, 0.1),
    new THREE.Vector3(0.95, 6.8, 0.25),
    new THREE.Vector3(1.15, 9.6, 0.3),
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 10, 0.34, 7, false);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6f543d, roughness: 0.92 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
  trunkInst.castShadow = !isSoftwareGl;

  const crownGeo = new THREE.ConeGeometry(3.5, 2.2, 7);
  crownGeo.translate(1.15, 9.8, 0.3);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2e7d3c, roughness: 0.78 });
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, palmCount);

  const upperCrownGeo = new THREE.ConeGeometry(2.6, 1.8, 7);
  upperCrownGeo.translate(1.15, 10.6, 0.3);
  const upperCrownInst = new THREE.InstancedMesh(upperCrownGeo, crownMat, palmCount);

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  palmPositions.forEach((p, idx) => {
    const gy = getGroundHeightAt(p.x, p.z);
    dummy.position.set(p.x, gy - 0.08, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    crownInst.setMatrixAt(idx, dummy.matrix);
    upperCrownInst.setMatrixAt(idx, dummy.matrix);
    tint.setHSL(0.32 + (rand() - 0.5) * 0.05, 0.48, 0.32 + (rand() - 0.5) * 0.08);
    crownInst.setColorAt(idx, tint);
    upperCrownInst.setColorAt(idx, tint);
  });
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  upperCrownInst.computeBoundingSphere();
  group.add(trunkInst, crownInst, upperCrownInst);

  // 10. STREETLAMPS & TRAFFIC LIGHTS AT INTERSECTIONS
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x29303b,
    roughness: 0.45,
    metalness: 0.75,
  });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff6dd,
    emissive: new THREE.Color(0xffd27d),
    emissiveIntensity: 0.1,
    roughness: 0.25,
  });
  streetLampGlowMats.push(lampBulbMat);

  const lampPositions: [number, number][] = [];
  for (const rx of ROAD_X) {
    for (let z = -168; z <= 168; z += 36) {
      if (ROAD_Z.some((rz) => Math.abs(z - rz) < 11)) continue;
      lampPositions.push([rx + 9.2, z]);
      lampPositions.push([rx - 9.2, z]);
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, 6.8, 6);
  poleGeo.translate(0, 3.4, 0);
  const bulbGeo = new THREE.SphereGeometry(0.32, 8, 8);
  bulbGeo.translate(0, 6.85, 0);

  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampPositions.length);
  const bulbInst = new THREE.InstancedMesh(bulbGeo, lampBulbMat, lampPositions.length);
  lampPositions.forEach(([lx, lz], i) => {
    dummy.position.set(lx, 0, lz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);
    bulbInst.setMatrixAt(i, dummy.matrix);
  });
  poleInst.computeBoundingSphere();
  bulbInst.computeBoundingSphere();
  group.add(poleInst, bulbInst);

  // Traffic Light Signals at primary intersections
  const redMatNS = new THREE.MeshStandardMaterial({
    color: 0x450a0a,
    emissive: new THREE.Color(0xef4444),
    emissiveIntensity: 0.2,
  });
  const greenMatNS = new THREE.MeshStandardMaterial({
    color: 0x052e16,
    emissive: new THREE.Color(0x22c55e),
    emissiveIntensity: 1.5,
  });
  trafficLightRedMats.push(redMatNS);
  trafficLightGreenMats.push(greenMatNS);

  const tlPoleGeo = new THREE.CylinderGeometry(0.12, 0.15, 5.5, 6);
  const tlBoxGeo = new THREE.BoxGeometry(0.55, 1.3, 0.55);
  const tlLensGeo = new THREE.SphereGeometry(0.16, 6, 6);
  for (const rx of [-75, 0, 75]) {
    for (const rz of [-75, 0, 75]) {
      const tl = new THREE.Group();
      tl.position.set(rx + 9.4, 0, rz + 9.4);
      const p = new THREE.Mesh(tlPoleGeo, poleMat);
      p.position.y = 2.75;
      const b = new THREE.Mesh(tlBoxGeo, poleMat);
      b.position.y = 5.4;
      const rLens = new THREE.Mesh(tlLensGeo, redMatNS);
      rLens.position.set(0, 5.7, -0.26);
      const gLens = new THREE.Mesh(tlLensGeo, greenMatNS);
      gLens.position.set(0, 5.1, -0.26);
      tl.add(p, b, rLens, gLens);
      group.add(tl);
    }
  }

  // 11. INTERACTIVE WORLD ZONE RINGS (Garage, Safehouse, Lounge)
  for (const lm of WORLD_LANDMARKS) {
    if (lm.type !== 'garage' && lm.type !== 'safehouse' && lm.type !== 'lounge') continue;
    const color =
      lm.type === 'garage' ? 0xf59e0b : lm.type === 'safehouse' ? 0x22d3ee : 0x34d399;
    const ringGeo = new THREE.RingGeometry(2.6, 3.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(lm.x, getGroundHeightAt(lm.x, lm.z) + 0.08, lm.z);
    group.add(ring);
    zoneRings.push(ring);
  }

  // 12. MISSION CHECKPOINT BEACON (Animated 3D Golden Ring + Sky Pillar)
  const checkpointBeacon = new THREE.Group();
  checkpointBeacon.visible = false;
  const cpRingGeo = new THREE.TorusGeometry(4.2, 0.24, 12, 36);
  cpRingGeo.rotateX(Math.PI / 2);
  const cpRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.9,
  });
  const cpRing = new THREE.Mesh(cpRingGeo, cpRingMat);
  cpRing.position.y = 0.6;
  const cpBeamGeo = new THREE.CylinderGeometry(1.4, 3.8, 52, 16, 1, true);
  const cpBeamMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cpBeam = new THREE.Mesh(cpBeamGeo, cpBeamMat);
  cpBeam.position.y = 26;
  checkpointBeacon.add(cpRing, cpBeam);
  group.add(checkpointBeacon);

  return {
    group,
    colliders,
    streetLampGlowMats,
    neonTrimMats,
    trafficLightRedMats,
    trafficLightGreenMats,
    zoneRings,
    lighthouseBeam,
    checkpointBeacon,
    getGroundHeight: getGroundHeightAt,
    getDistrictAt,
    update: (elapsed: number, nightFactor: number, trafficPhaseNS: boolean) => {
      // Update building emissive windows and neon trim based on dusk/night
      const winEmissive = THREE.MathUtils.lerp(0.06, 1.45, nightFactor);
      for (const m of materials.emissiveWindows) {
        m.emissiveIntensity = winEmissive;
      }
      const neonEmissive = THREE.MathUtils.lerp(0.25, 2.2, nightFactor);
      for (const m of neonTrimMats) {
        m.emissiveIntensity = neonEmissive;
      }
      const lampEmissive = THREE.MathUtils.lerp(0.05, 2.8, nightFactor);
      for (const m of streetLampGlowMats) {
        m.emissiveIntensity = lampEmissive;
      }

      // Traffic light phase
      redMatNS.emissiveIntensity = trafficPhaseNS ? 0.08 : 2.0;
      greenMatNS.emissiveIntensity = trafficPhaseNS ? 2.0 : 0.08;

      // Rotate lighthouse beam & animate checkpoint/zone rings
      lighthouseBeam.rotation.y = elapsed * 0.55;
      lighthouseBeam.visible = nightFactor > 0.25;

      const pulse = 1 + Math.sin(elapsed * 3.2) * 0.07;
      for (const r of zoneRings) {
        r.scale.setScalar(pulse);
      }
      if (checkpointBeacon.visible) {
        cpRing.scale.setScalar(1 + Math.sin(elapsed * 4.5) * 0.1);
        cpRing.position.y = 0.65 + Math.sin(elapsed * 3) * 0.25;
      }
    },
  };
}
