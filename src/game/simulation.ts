import * as THREE from 'three';
import { AABB, MinimapEntity, VehicleType, WeatherType } from './types';
import { VehicleEntity } from './vehicles';
import { ROAD_X, ROAD_Z, getGroundHeightAt } from './world';

interface TrafficAgent {
  vehicle: VehicleEntity;
  axis: 'x' | 'z';
  dir: 1 | -1;
  laneCoord: number;
  cruiseSpeed: number;
}

interface PedestrianAgent {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  position: THREE.Vector3;
  yaw: number;
  speed: number;
  phase: number;
  walkDir: THREE.Vector2;
  state: 'stroll' | 'idle' | 'flee';
  stateTimer: number;
}

export class CitySimulation {
  public readonly traffic: TrafficAgent[] = [];
  public readonly policeUnits: VehicleEntity[] = [];
  public readonly pedestrians: PedestrianAgent[] = [];
  public readonly helicopterGroup = new THREE.Group();
  private heliMainRotor!: THREE.Mesh;
  private heliTailRotor!: THREE.Mesh;
  private heliPos = new THREE.Vector3(-112, 42, -36);
  private heliActive = false;

  public wantedLevel = 0; // 0..5
  public wantedCooldown = 0; // 0..1 progress to clear
  public trafficPhaseNS = true;
  private trafficSignalTimer = 0;

  private readonly scene: THREE.Scene;
  private readonly contactShadowTex: THREE.CanvasTexture;
  private readonly isSoftwareGl: boolean;

  constructor(
    scene: THREE.Scene,
    contactShadowTex: THREE.CanvasTexture,
    isSoftwareGl: boolean
  ) {
    this.scene = scene;
    this.contactShadowTex = contactShadowTex;
    this.isSoftwareGl = isSoftwareGl;

    this.spawnInitialTraffic(12);
    this.spawnPedestrians(22);
    this.buildPoliceHelicopter();
  }

  private spawnInitialTraffic(count: number): void {
    const types: VehicleType[] = ['roadster', 'suv', 'supercar'];
    const colors = [0xe2e8f0, 0x3b82f6, 0x10b981, 0xf59e0b, 0x64748b, 0xef4444, 0x1e293b];

    for (let i = 0; i < count; i++) {
      const axis: 'x' | 'z' = i % 2 === 0 ? 'z' : 'x';
      const dir: 1 | -1 = i % 4 < 2 ? 1 : -1;
      const laneOffset = dir === 1 ? 3.8 : -3.8;
      let x = 0;
      let z = 0;
      let laneCoord = 0;
      let yaw = 0;

      if (axis === 'z') {
        const rx = ROAD_X[i % ROAD_X.length];
        laneCoord = rx + (dir === 1 ? -3.8 : 3.8);
        x = laneCoord;
        z = -155 + (i * 31) % 310;
        yaw = dir === 1 ? 0 : Math.PI;
      } else {
        const rz = ROAD_Z[i % ROAD_Z.length];
        laneCoord = rz + laneOffset;
        z = laneCoord;
        x = -160 + (i * 41) % 240;
        yaw = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }

      const v = new VehicleEntity(
        `traffic-${i}`,
        types[i % types.length],
        x,
        z,
        yaw,
        this.contactShadowTex,
        this.isSoftwareGl,
        colors[i % colors.length]
      );
      this.scene.add(v.group);
      this.traffic.push({
        vehicle: v,
        axis,
        dir,
        laneCoord,
        cruiseSpeed: 10.5 + (i % 4) * 2.2,
      });
    }
  }

  private spawnPedestrians(count: number): void {
    const shirtPalette = [0xf8fafc, 0x0ea5e9, 0xf97316, 0x14b8a6, 0xe11d48, 0xfacc15, 0x334155];
    const pantsPalette = [0x1e293b, 0x334155, 0x78716c, 0x1e3a5f];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a37f, roughness: 0.72 });

    const torsoGeo = new THREE.BoxGeometry(0.42, 0.56, 0.24);
    const headGeo = new THREE.BoxGeometry(0.22, 0.24, 0.22);
    const limbGeo = new THREE.BoxGeometry(0.14, 0.62, 0.14);
    const armGeo = new THREE.BoxGeometry(0.11, 0.48, 0.11);

    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const shirtMat = new THREE.MeshStandardMaterial({
        color: shirtPalette[i % shirtPalette.length],
        roughness: 0.8,
      });
      const pantsMat = new THREE.MeshStandardMaterial({
        color: pantsPalette[i % pantsPalette.length],
        roughness: 0.85,
      });

      const torso = new THREE.Mesh(torsoGeo, shirtMat);
      torso.position.y = 1.18;
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.62;

      const leftLeg = new THREE.Mesh(limbGeo, pantsMat);
      leftLeg.position.set(-0.11, 0.48, 0);
      const rightLeg = new THREE.Mesh(limbGeo, pantsMat);
      rightLeg.position.set(0.11, 0.48, 0);

      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(-0.28, 1.12, 0);
      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(0.28, 1.12, 0);

      g.add(torso, head, leftLeg, rightLeg, leftArm, rightArm);

      // Place along sidewalks and boardwalk
      let px = 0;
      let pz = 0;
      let dx = 0;
      let dz = 1;
      if (i < 7) {
        // Coral Strip boardwalk strollers
        px = 104 + (i % 3) * 2;
        pz = -140 + i * 44;
        dx = 0;
        dz = i % 2 === 0 ? 1 : -1;
      } else {
        const rx = ROAD_X[i % ROAD_X.length];
        px = rx + (i % 2 === 0 ? 10.2 : -10.2);
        pz = -150 + ((i * 29) % 300);
        dx = 0;
        dz = i % 2 === 0 ? 1 : -1;
      }

      const py = getGroundHeightAt(px, pz);
      g.position.set(px, py, pz);
      this.scene.add(g);

      this.pedestrians.push({
        group: g,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        position: new THREE.Vector3(px, py, pz),
        yaw: Math.atan2(dx, dz),
        speed: 1.5 + (i % 3) * 0.35,
        phase: i * 1.1,
        walkDir: new THREE.Vector2(dx, dz).normalize(),
        state: 'stroll',
        stateTimer: 4 + (i % 5) * 2,
      });
    }
  }

  private buildPoliceHelicopter(): void {
    const hullMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.65,
      clearcoat: 0.85,
    });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.1,
      metalness: 0.9,
    });

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, 4.8), hullMat);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 1.6), glassMat);
    nose.position.set(0, -0.1, 2.8);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.35, 4.2), whiteMat);
    const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 5.4), hullMat);
    tailBoom.position.set(0, 0.35, -4.8);
    const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.8, 0.9), whiteMat);
    tailFin.position.set(0, 1.0, -7.2);

    // Skids
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.35 });
    for (const sx of [-1.1, 1.1]) {
      const skid = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 4.2), skidMat);
      skid.position.set(sx, -1.45, 0.3);
      this.helicopterGroup.add(skid);
    }

    this.heliMainRotor = new THREE.Mesh(
      new THREE.BoxGeometry(10.5, 0.08, 0.35),
      skidMat
    );
    this.heliMainRotor.position.set(0, 1.55, 0);

    this.heliTailRotor = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.8, 0.22),
      skidMat
    );
    this.heliTailRotor.position.set(0.35, 0.95, -7.2);

    // Volumetric surveillance spotlight cone
    const coneGeo = new THREE.ConeGeometry(8.5, 44, 16, 1, true);
    coneGeo.translate(0, -22, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const spotCone = new THREE.Mesh(coneGeo, coneMat);
    spotCone.position.set(0, -0.9, 2.4);

    this.helicopterGroup.add(
      cabin,
      nose,
      stripe,
      tailBoom,
      tailFin,
      this.heliMainRotor,
      this.heliTailRotor,
      spotCone
    );
    this.helicopterGroup.visible = false;
    this.scene.add(this.helicopterGroup);
  }

  public raiseWanted(stars: number): boolean {
    const next = Math.min(5, Math.max(this.wantedLevel, stars));
    const raised = next > this.wantedLevel;
    this.wantedLevel = next;
    this.wantedCooldown = 0;
    this.syncPoliceCount();
    return raised;
  }

  public addCrimeHeat(): boolean {
    return this.raiseWanted(Math.min(5, this.wantedLevel + 1));
  }

  public clearWanted(): void {
    this.wantedLevel = 0;
    this.wantedCooldown = 0;
    for (const unit of this.policeUnits) {
      unit.sirenOn = false;
    }
    this.heliActive = false;
    this.helicopterGroup.visible = false;
  }

  private syncPoliceCount(): void {
    const desired = this.wantedLevel === 0 ? 1 : Math.min(4, this.wantedLevel + 1);
    while (this.policeUnits.length < desired) {
      const idx = this.policeUnits.length;
      const rx = ROAD_X[idx % ROAD_X.length];
      const rz = ROAD_Z[(idx * 2) % ROAD_Z.length];
      const unit = new VehicleEntity(
        `police-${idx}`,
        'police',
        rx,
        rz,
        0,
        this.contactShadowTex,
        this.isSoftwareGl
      );
      this.scene.add(unit.group);
      this.policeUnits.push(unit);
    }
    this.heliActive = this.wantedLevel >= 3;
    this.helicopterGroup.visible = this.heliActive;
  }

  public alertNearbyPedestrians(originX: number, originZ: number, radius: number): void {
    for (const ped of this.pedestrians) {
      const dist = Math.hypot(ped.position.x - originX, ped.position.z - originZ);
      if (dist < radius) {
        ped.state = 'flee';
        ped.stateTimer = 6.5;
        const fx = ped.position.x - originX;
        const fz = ped.position.z - originZ;
        const len = Math.max(0.01, Math.hypot(fx, fz));
        ped.walkDir.set(fx / len, fz / len);
      }
    }
  }

  public update(
    dt: number,
    elapsed: number,
    playerX: number,
    playerZ: number,
    playerSpeed: number,
    weather: WeatherType,
    nightFactor: number,
    gripFactor: number,
    colliders: AABB[],
    onPlayerHitTraffic?: () => void,
    onBusted?: () => void
  ): { closestSirenFactor: number; minimapEntities: MinimapEntity[] } {
    // 1. Traffic Signal Cycle (10s green N/S, 10s green E/W)
    this.trafficSignalTimer += dt;
    if (this.trafficSignalTimer > 10) {
      this.trafficSignalTimer = 0;
      this.trafficPhaseNS = !this.trafficPhaseNS;
    }

    const minimapEntities: MinimapEntity[] = [];

    // 2. Update Autonomous Traffic AI
    for (const agent of this.traffic) {
      const v = agent.vehicle;

      // Check traffic light stop line & player obstacle ahead
      let mustStop = false;
      const distToPlayer = Math.hypot(v.position.x - playerX, v.position.z - playerZ);
      if (distToPlayer < 13) {
        const fwdX = Math.sin(v.yaw);
        const fwdZ = Math.cos(v.yaw);
        const dot =
          ((playerX - v.position.x) * fwdX + (playerZ - v.position.z) * fwdZ) /
          Math.max(0.1, distToPlayer);
        if (dot > 0.65) mustStop = true;
      }

      // Collision detection between player vehicle and traffic vehicle
      if (distToPlayer < 3.6 && Math.abs(playerSpeed) > 6) {
        onPlayerHitTraffic?.();
      }

      // Intersection traffic light obedience
      if (!mustStop) {
        if (agent.axis === 'z' && !this.trafficPhaseNS) {
          for (const rz of ROAD_Z) {
            const delta = (rz - v.position.z) * agent.dir;
            if (delta > 9 && delta < 16) mustStop = true;
          }
        } else if (agent.axis === 'x' && this.trafficPhaseNS) {
          for (const rx of ROAD_X) {
            const delta = (rx - v.position.x) * agent.dir;
            if (delta > 9 && delta < 16) mustStop = true;
          }
        }
      }

      const targetSpeed = mustStop ? 0 : agent.cruiseSpeed * (weather === 'storm' ? 0.72 : 1.0);
      v.speed = THREE.MathUtils.damp(v.speed, targetSpeed, mustStop ? 6 : 2.5, dt);

      if (agent.axis === 'z') {
        v.position.z += agent.dir * v.speed * dt;
        if (v.position.z > 176) v.position.z = -176;
        if (v.position.z < -176) v.position.z = 176;
        v.yaw = agent.dir === 1 ? 0 : Math.PI;
      } else {
        v.position.x += agent.dir * v.speed * dt;
        if (v.position.x > 88) v.position.x = -176;
        if (v.position.x < -176) v.position.x = 88;
        v.yaw = agent.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      }
      v.position.y = Math.max(0, getGroundHeightAt(v.position.x, v.position.z));
      v.group.position.copy(v.position);
      v.group.rotation.y = v.yaw;

      minimapEntities.push({
        x: v.position.x,
        z: v.position.z,
        rot: v.yaw,
        type: 'vehicle',
      });
    }

    // 3. Update Police Units & Pursuit AI
    let closestPoliceDist = 999;
    let anyPoliceInSight = false;

    for (let i = 0; i < this.policeUnits.length; i++) {
      const unit = this.policeUnits[i];
      const dx = playerX - unit.position.x;
      const dz = playerZ - unit.position.z;
      const dist = Math.hypot(dx, dz);

      if (this.wantedLevel > 0) {
        unit.sirenOn = true;
        closestPoliceDist = Math.min(closestPoliceDist, dist);
        if (dist < 72) anyPoliceInSight = true;

        // Respawn distant units closer ahead on a boulevard
        if (dist > 220) {
          const rx = ROAD_X[i % ROAD_X.length];
          const rz = ROAD_Z[(i + 1) % ROAD_Z.length];
          unit.position.set(rx, 0, rz);
          unit.speed = 12;
        }

        // Steering toward player
        const desiredYaw = Math.atan2(dx, dz);
        let diff = desiredYaw - unit.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const steerCmd = THREE.MathUtils.clamp(diff * 1.4, -1, 1);
        const throttleCmd = dist > 7 ? 0.85 : dist > 4 ? 0.35 : -0.2;

        unit.updatePhysics(
          dt,
          { throttle: throttleCmd, steer: steerCmd, handbrake: false },
          gripFactor,
          colliders,
          elapsed,
          nightFactor
        );

        // If player is nearly stopped and pinned by police, trigger arrest/fine
        if (dist < 4.3 && Math.abs(playerSpeed) < 1.8) {
          onBusted?.();
        }
      } else {
        unit.sirenOn = false;
        // Peaceful patrol cruise along road X = -75
        unit.speed = THREE.MathUtils.damp(unit.speed, 11, 2, dt);
        unit.position.z += unit.speed * dt;
        if (unit.position.z > 165) unit.position.z = -165;
        unit.position.x = -78.8;
        unit.yaw = 0;
        unit.group.position.copy(unit.position);
        unit.group.rotation.y = unit.yaw;
      }

      minimapEntities.push({
        x: unit.position.x,
        z: unit.position.z,
        rot: unit.yaw,
        type: 'police',
      });
    }

    // 4. Police Surveillance Helicopter (3+ Wanted Stars)
    if (this.heliActive && this.wantedLevel >= 3) {
      const targetX = playerX + Math.cos(elapsed * 0.45) * 26;
      const targetZ = playerZ + Math.sin(elapsed * 0.45) * 26;
      this.heliPos.x = THREE.MathUtils.damp(this.heliPos.x, targetX, 1.8, dt);
      this.heliPos.z = THREE.MathUtils.damp(this.heliPos.z, targetZ, 1.8, dt);
      this.heliPos.y = 38 + Math.sin(elapsed * 1.3) * 1.8;
      this.helicopterGroup.position.copy(this.heliPos);
      this.helicopterGroup.lookAt(playerX, 0, playerZ);
      this.heliMainRotor.rotation.y += dt * 26;
      this.heliTailRotor.rotation.x += dt * 34;

      const heliDist = Math.hypot(this.heliPos.x - playerX, this.heliPos.z - playerZ);
      if (heliDist < 85) anyPoliceInSight = true;
      closestPoliceDist = Math.min(closestPoliceDist, heliDist);

      minimapEntities.push({
        x: this.heliPos.x,
        z: this.heliPos.z,
        rot: 0,
        type: 'helicopter',
      });
    }

    // 5. Wanted Level Evasion Cooldown
    if (this.wantedLevel > 0) {
      if (anyPoliceInSight) {
        this.wantedCooldown = Math.max(0, this.wantedCooldown - dt * 0.25);
      } else {
        this.wantedCooldown += dt / (12 + this.wantedLevel * 4);
        if (this.wantedCooldown >= 1) {
          this.clearWanted();
        }
      }
    }

    // 6. Update Living Pedestrian NPCs
    const weatherHurry = weather === 'rain' || weather === 'storm' ? 1.55 : 1.0;
    for (const ped of this.pedestrians) {
      ped.stateTimer -= dt;
      if (ped.stateTimer <= 0) {
        if (ped.state === 'flee') {
          ped.state = 'stroll';
          ped.stateTimer = 5 + Math.random() * 5;
        } else if (ped.state === 'stroll' && Math.random() < 0.28) {
          ped.state = 'idle';
          ped.stateTimer = 2.5 + Math.random() * 3;
        } else {
          ped.state = 'stroll';
          ped.stateTimer = 5 + Math.random() * 6;
          if (Math.random() < 0.4) {
            ped.walkDir.negate();
          }
        }
      }

      // Flee if player drives fast very close
      const dp = Math.hypot(ped.position.x - playerX, ped.position.z - playerZ);
      if (dp < 7 && Math.abs(playerSpeed) > 8) {
        ped.state = 'flee';
        ped.stateTimer = 5;
        const fx = ped.position.x - playerX;
        const fz = ped.position.z - playerZ;
        const fl = Math.max(0.1, Math.hypot(fx, fz));
        ped.walkDir.set(fx / fl, fz / fl);
      }

      const moveSpeed =
        ped.state === 'idle' ? 0 : ped.state === 'flee' ? 4.8 : ped.speed * weatherHurry;

      if (moveSpeed > 0.1) {
        const nx = THREE.MathUtils.clamp(ped.position.x + ped.walkDir.x * moveSpeed * dt, -185, 130);
        const nz = THREE.MathUtils.clamp(ped.position.z + ped.walkDir.y * moveSpeed * dt, -185, 185);
        if (Math.abs(nx) > 180 || Math.abs(nz) > 180) {
          ped.walkDir.negate();
        } else {
          ped.position.x = nx;
          ped.position.z = nz;
        }
        ped.position.y = Math.max(0, getGroundHeightAt(ped.position.x, ped.position.z));
        ped.yaw = Math.atan2(ped.walkDir.x, ped.walkDir.y);

        ped.phase += dt * (ped.state === 'flee' ? 12 : 6.5);
        const sw = Math.sin(ped.phase) * (ped.state === 'flee' ? 0.75 : 0.45);
        ped.leftLeg.rotation.x = sw;
        ped.rightLeg.rotation.x = -sw;
        ped.leftArm.rotation.x = -sw * 0.75;
        ped.rightArm.rotation.x = sw * 0.75;
      } else {
        ped.leftLeg.rotation.x = THREE.MathUtils.damp(ped.leftLeg.rotation.x, 0, 8, dt);
        ped.rightLeg.rotation.x = THREE.MathUtils.damp(ped.rightLeg.rotation.x, 0, 8, dt);
        ped.leftArm.rotation.x = THREE.MathUtils.damp(ped.leftArm.rotation.x, 0, 8, dt);
        ped.rightArm.rotation.x = THREE.MathUtils.damp(ped.rightArm.rotation.x, 0, 8, dt);
      }

      ped.group.position.copy(ped.position);
      ped.group.rotation.y = ped.yaw;
    }

    const closestSirenFactor =
      this.wantedLevel > 0 ? Math.max(0, 1 - closestPoliceDist / 115) : 0;

    return { closestSirenFactor, minimapEntities };
  }
}
