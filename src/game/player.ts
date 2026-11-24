import * as THREE from 'three';
import { AABB, OUTFITS, OutfitId } from './types';
import { WATER_LEVEL, getGroundHeightAt } from './world';

export interface PlayerInput {
  forward: number; // -1..1
  right: number; // -1..1
  sprint: boolean;
  jump: boolean;
  crouch: boolean;
  cameraYaw: number;
}

export class PlayerController {
  public readonly group = new THREE.Group();
  public position = new THREE.Vector3(24, 0, -14);
  public velocity = new THREE.Vector3();
  public yaw = 0;
  public health = 100;
  public maxHealth = 100;
  public stamina = 100;
  public maxStamina = 100;
  public isGrounded = true;
  public isSwimming = false;
  public isCrouching = false;
  public outfitId: OutfitId = 'coastal';

  private bodyRoot = new THREE.Group();
  private torsoMesh!: THREE.Mesh;
  private shirtMesh!: THREE.Mesh;
  private pelvisMesh!: THREE.Mesh;
  private headGroup = new THREE.Group();
  private hairMesh!: THREE.Mesh;
  private leftArmPivot = new THREE.Group();
  private rightArmPivot = new THREE.Group();
  private leftLegPivot = new THREE.Group();
  private rightLegPivot = new THREE.Group();
  private contactShadow!: THREE.Mesh;

  private jacketMat: THREE.MeshStandardMaterial;
  private shirtMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private shoesMat: THREE.MeshStandardMaterial;
  private hairMat: THREE.MeshStandardMaterial;

  private walkPhase = 0;
  private stepAccum = 0;

  constructor(contactShadowTex: THREE.CanvasTexture, isSoftwareGl: boolean) {
    const outfit = OUTFITS[0];
    this.jacketMat = new THREE.MeshStandardMaterial({
      color: outfit.jacketColor,
      roughness: 0.72,
      metalness: 0.05,
    });
    this.shirtMat = new THREE.MeshStandardMaterial({
      color: outfit.shirtColor,
      roughness: 0.8,
      metalness: 0.02,
    });
    this.pantsMat = new THREE.MeshStandardMaterial({
      color: outfit.pantsColor,
      roughness: 0.85,
      metalness: 0.02,
    });
    this.shoesMat = new THREE.MeshStandardMaterial({
      color: outfit.shoesColor,
      roughness: 0.45,
      metalness: 0.1,
    });
    this.hairMat = new THREE.MeshStandardMaterial({
      color: outfit.hairColor,
      roughness: 0.88,
      metalness: 0.04,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd9a782,
      roughness: 0.65,
      metalness: 0.02,
    });
    const shadesMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b0f17,
      roughness: 0.1,
      metalness: 0.85,
      clearcoat: 1.0,
    });

    // Contact shadow plane directly underneath player feet
    const shadowGeo = new THREE.PlaneGeometry(1.35, 1.35);
    shadowGeo.rotateX(-Math.PI / 2);
    this.contactShadow = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
      })
    );
    this.contactShadow.position.y = 0.03;
    this.group.add(this.contactShadow);

    // Composite 12-part articulated character (bottom-center pivot at y=0)
    this.group.add(this.bodyRoot);

    // Pelvis
    this.pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.25), this.pantsMat);
    this.pelvisMesh.position.y = 0.92;
    this.pelvisMesh.castShadow = !isSoftwareGl;
    this.bodyRoot.add(this.pelvisMesh);

    // Torso (Jacket outer + inner shirt chest)
    this.torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.27), this.jacketMat);
    this.torsoMesh.position.y = 1.28;
    this.torsoMesh.castShadow = !isSoftwareGl;
    this.bodyRoot.add(this.torsoMesh);

    this.shirtMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.52, 0.29), this.shirtMat);
    this.shirtMesh.position.y = 1.28;
    this.bodyRoot.add(this.shirtMesh);

    // Head, Hair & Aviator Sunglasses
    this.headGroup.position.y = 1.63;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 8), skinMat);
    neck.position.y = -0.02;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.25), skinMat);
    head.position.y = 0.14;
    head.castShadow = !isSoftwareGl;
    this.hairMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.27), this.hairMat);
    this.hairMesh.position.set(0, 0.27, -0.01);
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.065, 0.06), shadesMat);
    shades.position.set(0, 0.16, 0.125);
    this.headGroup.add(neck, head, this.hairMesh, shades);
    this.bodyRoot.add(this.headGroup);

    // Arms (Pivoted at shoulders)
    const buildArm = (pivot: THREE.Group, side: number) => {
      pivot.position.set(side * 0.31, 1.5, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.36, 0.15), this.jacketMat);
      upper.position.y = -0.16;
      upper.castShadow = !isSoftwareGl;
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.13), skinMat);
      lower.position.y = -0.46;
      pivot.add(upper, lower);
      this.bodyRoot.add(pivot);
    };
    buildArm(this.leftArmPivot, -1);
    buildArm(this.rightArmPivot, 1);

    // Legs (Pivoted at hips)
    const buildLeg = (pivot: THREE.Group, side: number) => {
      pivot.position.set(side * 0.13, 0.85, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.44, 0.19), this.pantsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = !isSoftwareGl;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.38, 0.17), this.pantsMat);
      shin.position.y = -0.6;
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.27), this.shoesMat);
      shoe.position.set(0, -0.8, 0.04);
      pivot.add(thigh, shin, shoe);
      this.bodyRoot.add(pivot);
    };
    buildLeg(this.leftLegPivot, -1);
    buildLeg(this.rightLegPivot, 1);

    this.group.position.copy(this.position);
  }

  public setOutfit(id: OutfitId): void {
    const cfg = OUTFITS.find((o) => o.id === id) || OUTFITS[0];
    this.outfitId = cfg.id;
    this.jacketMat.color.setHex(cfg.jacketColor);
    this.shirtMat.color.setHex(cfg.shirtColor);
    this.pantsMat.color.setHex(cfg.pantsColor);
    this.shoesMat.color.setHex(cfg.shoesColor);
    this.hairMat.color.setHex(cfg.hairColor);
  }

  public update(
    dt: number,
    input: PlayerInput,
    colliders: AABB[],
    onFootstep?: (isSand: boolean) => void
  ): void {
    const moveMag = Math.min(1, Math.hypot(input.forward, input.right));
    const groundY = getGroundHeightAt(this.position.x, this.position.z);
    const inWater = groundY < WATER_LEVEL - 0.35;
    this.isSwimming = inWater;
    this.isCrouching = !inWater && input.crouch;

    // Stamina management
    const wantsSprint = input.sprint && moveMag > 0.2 && !this.isCrouching && this.stamina > 2;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - dt * 22);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 15);
    }

    // Desired speed
    let targetSpeed = 0;
    if (moveMag > 0.05) {
      if (this.isSwimming) {
        targetSpeed = wantsSprint ? 4.4 : 2.8;
      } else if (this.isCrouching) {
        targetSpeed = 2.6;
      } else if (wantsSprint) {
        targetSpeed = 8.4;
      } else {
        targetSpeed = 4.6;
      }
    }

    // Camera-relative movement direction
    const sinY = Math.sin(input.cameraYaw);
    const cosY = Math.cos(input.cameraYaw);
    const fwdX = -sinY;
    const fwdZ = -cosY;
    const rightX = cosY;
    const rightZ = -sinY;

    let wishX = fwdX * input.forward + rightX * input.right;
    let wishZ = fwdZ * input.forward + rightZ * input.right;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 0.001) {
      wishX /= wishLen;
      wishZ /= wishLen;
    }

    const accel = this.isGrounded ? 14 : 4;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, wishX * targetSpeed, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, wishZ * targetSpeed, accel, dt);

    // Jump & Gravity / Buoyancy
    if (this.isSwimming) {
      const targetSwimY = WATER_LEVEL - 0.95;
      this.position.y = THREE.MathUtils.damp(this.position.y, targetSwimY, 6, dt);
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      if (input.jump && this.isGrounded && !this.isCrouching) {
        this.velocity.y = 7.4;
        this.isGrounded = false;
      }
      this.velocity.y -= 21 * dt;
      this.position.y += this.velocity.y * dt;
      if (this.position.y <= groundY) {
        this.position.y = groundY;
        this.velocity.y = 0;
        this.isGrounded = true;
      }
    }

    // Horizontal motion + AABB collision resolution
    const nextX = THREE.MathUtils.clamp(this.position.x + this.velocity.x * dt, -260, 260);
    const nextZ = THREE.MathUtils.clamp(this.position.z + this.velocity.z * dt, -260, 260);
    const radius = 0.45;

    let resolvedX = nextX;
    let resolvedZ = nextZ;
    for (const c of colliders) {
      if (
        resolvedX + radius > c.minX &&
        resolvedX - radius < c.maxX &&
        resolvedZ + radius > c.minZ &&
        resolvedZ - radius < c.maxZ
      ) {
        const penLeft = Math.abs(resolvedX + radius - c.minX);
        const penRight = Math.abs(c.maxX - (resolvedX - radius));
        const penTop = Math.abs(resolvedZ + radius - c.minZ);
        const penBot = Math.abs(c.maxZ - (resolvedZ - radius));
        const minPen = Math.min(penLeft, penRight, penTop, penBot);
        if (minPen === penLeft) resolvedX = c.minX - radius;
        else if (minPen === penRight) resolvedX = c.maxX + radius;
        else if (minPen === penTop) resolvedZ = c.minZ - radius;
        else resolvedZ = c.maxZ + radius;
      }
    }
    this.position.x = resolvedX;
    this.position.z = resolvedZ;

    // Smoothly turn character toward velocity
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.35) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetYaw - this.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.yaw += diff * Math.min(1, dt * 11);
    }

    // Procedural skeletal animation blending
    if (this.isSwimming) {
      this.walkPhase += dt * (4 + horizSpeed * 1.4);
      this.bodyRoot.rotation.x = THREE.MathUtils.damp(this.bodyRoot.rotation.x, 1.15, 8, dt);
      this.bodyRoot.position.y = THREE.MathUtils.damp(this.bodyRoot.position.y, 0.35, 8, dt);
      const stroke = Math.sin(this.walkPhase) * 0.9;
      this.leftArmPivot.rotation.x = -Math.PI * 0.65 + stroke;
      this.rightArmPivot.rotation.x = -Math.PI * 0.65 - stroke;
      this.leftLegPivot.rotation.x = stroke * 0.55;
      this.rightLegPivot.rotation.x = -stroke * 0.55;
    } else if (horizSpeed > 0.3) {
      const freq = wantsSprint ? 12.5 : this.isCrouching ? 6.5 : 8.5;
      this.walkPhase += dt * freq;
      const swing = Math.sin(this.walkPhase) * (wantsSprint ? 0.85 : 0.55);
      this.leftLegPivot.rotation.x = swing;
      this.rightLegPivot.rotation.x = -swing;
      this.leftArmPivot.rotation.x = -swing * 0.8;
      this.rightArmPivot.rotation.x = swing * 0.8;
      this.bodyRoot.rotation.x = THREE.MathUtils.damp(
        this.bodyRoot.rotation.x,
        wantsSprint ? 0.14 : this.isCrouching ? 0.25 : 0.05,
        10,
        dt
      );
      const bob = Math.abs(Math.sin(this.walkPhase)) * (wantsSprint ? 0.08 : 0.04);
      const crouchOffset = this.isCrouching ? -0.26 : 0;
      this.bodyRoot.position.y = THREE.MathUtils.damp(
        this.bodyRoot.position.y,
        crouchOffset + bob,
        14,
        dt
      );

      // Footstep trigger
      if (this.isGrounded) {
        this.stepAccum += dt * (wantsSprint ? 3.2 : 2.1);
        if (this.stepAccum >= 1) {
          this.stepAccum -= 1;
          onFootstep?.(this.position.x > 106);
        }
      }
    } else {
      // Idle breathing
      this.walkPhase += dt * 2.1;
      this.leftLegPivot.rotation.x = THREE.MathUtils.damp(this.leftLegPivot.rotation.x, 0, 10, dt);
      this.rightLegPivot.rotation.x = THREE.MathUtils.damp(this.rightLegPivot.rotation.x, 0, 10, dt);
      this.leftArmPivot.rotation.x = THREE.MathUtils.damp(this.leftArmPivot.rotation.x, 0, 10, dt);
      this.rightArmPivot.rotation.x = THREE.MathUtils.damp(this.rightArmPivot.rotation.x, 0, 10, dt);
      this.bodyRoot.rotation.x = THREE.MathUtils.damp(
        this.bodyRoot.rotation.x,
        this.isCrouching ? 0.22 : 0,
        10,
        dt
      );
      const idleTargetY = (this.isCrouching ? -0.26 : 0) + Math.sin(this.walkPhase) * 0.015;
      this.bodyRoot.position.y = THREE.MathUtils.damp(this.bodyRoot.position.y, idleTargetY, 10, dt);
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    this.contactShadow.visible = !this.isSwimming;
    this.contactShadow.position.y = Math.max(0.03, groundY - this.position.y + 0.03);
  }
}
