import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CameraMode,
  GameSettings,
  GraphicsPreset,
  HudSnapshot,
  OutfitId,
  SaveState,
  VEHICLE_PRESETS,
  VehicleType,
  WeatherType,
  WorldLandmark,
} from './types';
import { createMaterialLibrary, MaterialLibrary } from './materials';
import { buildSolanaWorld, WORLD_LANDMARKS, WorldData, getGroundHeightAt } from './world';
import { PlayerController } from './player';
import { VehicleEntity } from './vehicles';
import { DynamicEnvironment } from './environment';
import { CitySimulation } from './simulation';
import { MISSIONS } from './missions';
import { ProceduralAudioEngine, RADIO_STATIONS } from './audio';

const SAVE_KEY = 'project_vice_world_solana_bay_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'high',
  masterVolume: 0.75,
  sfxVolume: 0.8,
  radioVolume: 0.65,
  mouseSensitivity: 1.0,
  invertY: false,
  radioEnabled: true,
  radioStation: 1,
};

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class ViceWorldEngine {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly isSoftwareGl: boolean;

  private readonly materials: MaterialLibrary;
  private readonly world: WorldData;
  private readonly player: PlayerController;
  private readonly environment: DynamicEnvironment;
  private readonly simulation: CitySimulation;
  private readonly audio: ProceduralAudioEngine;

  private playerVehicles: VehicleEntity[] = [];
  private activeVehicle: VehicleEntity | null = null;

  // Game & Progression State
  private screen: 'menu' | 'playing' = 'menu';
  private paused = false;
  private cash = 1500;
  private ownedVehicles: VehicleType[] = ['supercar'];
  private completedMissions: string[] = [];
  private activeMissionId: string | null = null;
  private activeMissionStep = 0;
  private activeMissionTimer: number | null = null;
  private customWaypoint: { x: number; z: number; label: string } | null = null;

  private dialogueBanner: { speaker: string; text: string } | null = null;
  private dialogueTimer = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;

  // Camera & Input State
  private cameraMode: CameraMode = 'chase';
  private camYaw = Math.PI * 0.12;
  private camPitch = 0.24;
  private camZoom = 1.0;
  private isDraggingMouse = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private keys = new Set<string>();
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  // Pre-allocated math helpers (zero GC inside render loop)
  private readonly _camTargetPos = new THREE.Vector3();
  private readonly _camLookAt = new THREE.Vector3();
  private readonly _currentLookAt = new THREE.Vector3(24, 2, -14);

  // Loop & Callbacks
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = performance.now();
  private elapsed = 0;
  private hudEmitAccum = 0;
  private fpsSmooth = 60;
  private trafficCrimeCooldown = 0;

  private readonly onHudUpdate: (snapshot: HudSnapshot) => void;
  private readonly onOpenModal?: (modal: 'map' | 'phone' | 'pause' | 'garage') => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (snapshot: HudSnapshot) => void,
    onOpenModal?: (modal: 'map' | 'phone' | 'pause' | 'garage') => void
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onOpenModal = onOpenModal;
    this.isSoftwareGl = detectSoftwareWebGL();

    // 1. Modern WebGL2 Renderer with Software-WebGL Guard
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Handle WebGL context loss gracefully
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    });

    // 2. Scene & Studio RoomEnvironment Reflections
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.65;
    pmrem.dispose();

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.2,
      1800
    );

    // 4. Build World, PBR Materials, Environment, Player, Hero Vehicles & Living Simulation
    this.materials = createMaterialLibrary(this.renderer, this.isSoftwareGl);
    this.world = buildSolanaWorld(this.materials, this.isSoftwareGl);
    this.scene.add(this.world.group);

    this.environment = new DynamicEnvironment(this.scene, this.isSoftwareGl);
    this.player = new PlayerController(this.materials.contactShadowTex, this.isSoftwareGl);
    this.scene.add(this.player.group);

    this.simulation = new CitySimulation(
      this.scene,
      this.materials.contactShadowTex,
      this.isSoftwareGl
    );

    this.audio = new ProceduralAudioEngine(this.settings);

    // Spawn Hero Parked Vehicles across Solana Bay (first hero supercar parked right beside player!)
    this.spawnWorldVehicle('supercar', 30, -14, 0.15, true);
    this.spawnWorldVehicle('roadster', 86, 42, Math.PI * 0.5, false);
    this.spawnWorldVehicle('suv', -30, 42, -0.3, false);
    this.spawnWorldVehicle('police', -96, -34, Math.PI * 0.5, false);

    // Pre-warm shaders on hardware GPU
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHud();
    this.startLoop();
  }

  private spawnWorldVehicle(
    type: VehicleType,
    x: number,
    z: number,
    yaw: number,
    isPlayerOwned: boolean,
    customColor?: number
  ): VehicleEntity {
    const v = new VehicleEntity(
      `hero-${type}-${Date.now()}-${Math.random()}`,
      type,
      x,
      z,
      yaw,
      this.materials.contactShadowTex,
      this.isSoftwareGl,
      customColor
    );
    v.isPlayerOwned = isPlayerOwned;
    v.enableRealHeadlight(this.scene, this.isSoftwareGl);
    this.scene.add(v.group);
    this.playerVehicles.push(v);
    return v;
  }

  // --- Public Gameplay API for React UI ---

  public hasSaveData(): boolean {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  public startNewGame(): void {
    this.audio.unlock();
    this.screen = 'playing';
    this.paused = false;
    this.cash = 1500;
    this.ownedVehicles = ['supercar'];
    this.completedMissions = [];
    this.activeMissionId = null;
    this.world.checkpointBeacon.visible = false;
    this.simulation.clearWanted();
    if (this.activeVehicle) {
      this.exitVehicle();
    }
    this.player.position.set(24, 0, -14);
    this.player.health = 100;
    this.player.stamina = 100;
    this.player.setOutfit('coastal');
    this.environment.timeOfDay = 16.6;
    this.environment.weather = 'sunny';
    this.showDialogue(
      'Elena Vance',
      'Welcome to Solana Bay. Your Veloce GT-R is parked right beside you—press E to hop in, or open your Smartphone (P) for jobs.'
    );
    this.emitHud();
  }

  public continueGame(): void {
    this.audio.unlock();
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SaveState;
        this.cash = saved.cash ?? 1500;
        this.completedMissions = saved.completedMissions ?? [];
        this.ownedVehicles = saved.ownedVehicles?.length ? saved.ownedVehicles : ['supercar'];
        this.player.setOutfit(saved.outfit ?? 'coastal');
        this.environment.timeOfDay = saved.timeOfDay ?? 16.6;
        this.environment.weather = saved.weather ?? 'sunny';
        this.player.position.set(saved.playerX ?? 24, 0, saved.playerZ ?? -14);
        if (saved.settings) {
          this.updateSettings(saved.settings);
        }
      }
    } catch {
      // Fall back to current session state
    }
    this.screen = 'playing';
    this.paused = false;
    this.showToast('Session restored in Solana Bay');
    this.emitHud();
  }

  public saveGame(): void {
    const state: SaveState = {
      cash: this.cash,
      completedMissions: this.completedMissions,
      ownedVehicles: this.ownedVehicles,
      outfit: this.player.outfitId,
      timeOfDay: this.environment.timeOfDay,
      weather: this.environment.weather,
      playerX: this.activeVehicle ? this.activeVehicle.position.x : this.player.position.x,
      playerZ: this.activeVehicle ? this.activeVehicle.position.z : this.player.position.z,
      settings: this.settings,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      this.audio.playChime(true);
      this.showToast('Game progress saved');
    } catch {
      this.showToast('Unable to access browser storage');
    }
    this.emitHud();
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    this.keys.clear();
    this.emitHud();
  }

  public returnToMenu(): void {
    this.screen = 'menu';
    this.paused = false;
    this.keys.clear();
    this.emitHud();
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.audio.applySettings(this.settings);
    this.applyGraphicsPreset(this.settings.graphics);
    this.emitHud();
  }

  public applyGraphicsPreset(preset: GraphicsPreset): void {
    this.settings.graphics = preset;
    this.environment.applyGraphicsPreset(preset);
    if (!this.isSoftwareGl) {
      const dprCap =
        preset === 'low' ? 1 : preset === 'medium' ? 1.25 : preset === 'high' ? 1.5 : 2;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
    }
  }

  public setWeather(w: WeatherType): void {
    this.environment.weather = w;
    this.showToast(`Weather shifted to ${w.charAt(0).toUpperCase() + w.slice(1)}`);
    this.emitHud();
  }

  public setTimeOfDay(hour: number): void {
    this.environment.timeOfDay = ((hour % 24) + 24) % 24;
    this.emitHud();
  }

  public cycleCameraMode(): void {
    const order: CameraMode[] = ['chase', 'far', 'hood', 'orbit'];
    const idx = order.indexOf(this.cameraMode);
    this.cameraMode = order[(idx + 1) % order.length];
    this.showToast(`Camera: ${this.cameraMode.toUpperCase()}`);
    this.emitHud();
  }

  public cycleRadio(): void {
    this.audio.unlock();
    const next = (this.settings.radioStation + 1) % RADIO_STATIONS.length;
    this.settings.radioStation = next;
    this.settings.radioEnabled = next > 0;
    this.audio.applySettings(this.settings);
    this.showToast(`Radio: ${RADIO_STATIONS[next].name}`);
    this.emitHud();
  }

  public toggleHeadlights(): void {
    if (this.activeVehicle) {
      this.activeVehicle.headlightsOn = !this.activeVehicle.headlightsOn;
      this.emitHud();
    }
  }

  public toggleSiren(): void {
    if (this.activeVehicle && this.activeVehicle.isPolice) {
      this.activeVehicle.sirenOn = !this.activeVehicle.sirenOn;
      this.emitHud();
    }
  }

  public setOutfit(id: OutfitId): void {
    this.player.setOutfit(id);
    this.audio.playChime(true);
    this.showToast('Appearance updated');
    this.emitHud();
  }

  public paintCurrentVehicle(hex: number): void {
    const target = this.activeVehicle || this.findNearestVehicle(14);
    if (!target) {
      this.showToast('Bring a vehicle nearby to repaint');
      return;
    }
    target.setPaintColor(hex);
    this.audio.playChime(true);
    this.showToast(`${target.preset.name} repainted`);
  }

  public repairCurrentVehicle(): void {
    const target = this.activeVehicle || this.findNearestVehicle(14);
    if (!target) {
      this.showToast('No nearby vehicle to repair');
      return;
    }
    target.repair();
    this.audio.playChime(true);
    this.showToast(`${target.preset.name} restored to 100%`);
    this.emitHud();
  }

  public purchaseOrSummonVehicle(type: VehicleType): void {
    const preset = VEHICLE_PRESETS[type];
    if (!this.ownedVehicles.includes(type)) {
      if (this.cash < preset.price) {
        this.audio.playChime(false);
        this.showToast(`Need $${preset.price.toLocaleString()} to unlock ${preset.name}`);
        return;
      }
      this.cash -= preset.price;
      this.ownedVehicles.push(type);
      this.showToast(`Purchased ${preset.name}! Delivered nearby.`);
    } else {
      this.showToast(`${preset.name} delivered to your location`);
    }

    // Deliver cleanly 6m in front of the player
    const basePos = this.activeVehicle ? this.activeVehicle.position : this.player.position;
    const baseYaw = this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw;
    const sx = THREE.MathUtils.clamp(basePos.x + Math.sin(baseYaw) * 7.5, -180, 115);
    const sz = THREE.MathUtils.clamp(basePos.z + Math.cos(baseYaw) * 7.5, -180, 180);

    // Reuse existing player vehicle of same type or spawn fresh
    const existing = this.playerVehicles.find((v) => v.type === type && v !== this.activeVehicle);
    if (existing) {
      existing.position.set(sx, Math.max(0, getGroundHeightAt(sx, sz)), sz);
      existing.yaw = baseYaw;
      existing.speed = 0;
      existing.repair();
      existing.group.position.copy(existing.position);
      existing.group.rotation.y = existing.yaw;
    } else {
      this.spawnWorldVehicle(type, sx, sz, baseYaw, true);
    }
    this.audio.playChime(true);
    this.emitHud();
  }

  public startMission(missionId: string): void {
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) return;
    this.activeMissionId = def.id;
    this.activeMissionStep = 0;
    this.activeMissionTimer = def.timeLimitSec ?? null;
    this.customWaypoint = null;

    const first = def.checkpoints[0];
    this.world.checkpointBeacon.position.set(first.x, getGroundHeightAt(first.x, first.z), first.z);
    this.world.checkpointBeacon.visible = true;

    if (def.triggerWanted) {
      this.simulation.raiseWanted(def.triggerWanted);
    }
    this.audio.playChime(true);
    this.showDialogue(def.giver, def.introDialogue);
    this.emitHud();
  }

  public abortMission(): void {
    this.activeMissionId = null;
    this.activeMissionTimer = null;
    this.world.checkpointBeacon.visible = false;
    this.showToast('Active mission canceled');
    this.emitHud();
  }

  public setWaypoint(x: number, z: number, label: string): void {
    this.customWaypoint = { x, z, label };
    if (!this.activeMissionId) {
      this.world.checkpointBeacon.position.set(x, getGroundHeightAt(x, z), z);
      this.world.checkpointBeacon.visible = true;
    }
    this.showToast(`GPS Route set: ${label}`);
    this.emitHud();
  }

  public fastTravel(x: number, z: number, label: string): void {
    const targetY = Math.max(0, getGroundHeightAt(x, z));
    if (this.activeVehicle) {
      this.activeVehicle.position.set(x, targetY, z);
      this.activeVehicle.speed = 0;
      this.activeVehicle.group.position.copy(this.activeVehicle.position);
    } else {
      this.player.position.set(x, targetY, z);
      this.player.velocity.set(0, 0, 0);
      this.player.group.position.copy(this.player.position);
    }
    this.audio.playChime(true);
    this.showToast(`Arrived at ${label}`);
    this.emitHud();
  }

  public triggerTestWanted(): void {
    this.simulation.addCrimeHeat();
    this.showToast(`Wanted Level escalated to ${this.simulation.wantedLevel} Star${this.simulation.wantedLevel > 1 ? 's' : ''}`);
    this.emitHud();
  }

  public clearWantedCheat(): void {
    this.simulation.clearWanted();
    this.showToast('Solana PD pursuit cleared');
    this.emitHud();
  }

  public toggleVehicleEntry(): void {
    this.audio.unlock();
    if (this.activeVehicle) {
      this.exitVehicle();
      return;
    }

    const nearest = this.findNearestVehicle(5.6);
    if (nearest) {
      this.activeVehicle = nearest;
      this.player.group.visible = false;
      this.camYaw = nearest.yaw + Math.PI;
      this.audio.playChime(true);
      this.showToast(`Entered ${nearest.preset.name}`);
      if (nearest.isPolice) {
        this.simulation.raiseWanted(Math.max(1, this.simulation.wantedLevel));
      }
      this.emitHud();
      return;
    }

    // Check interactive world zones when on foot
    const zone = this.getActiveLandmark();
    if (zone) {
      this.activateLandmark(zone);
    }
  }

  private activateLandmark(zone: WorldLandmark): void {
    if (zone.type === 'garage') {
      this.repairCurrentVehicle();
      this.onOpenModal?.('garage');
    } else if (zone.type === 'safehouse') {
      this.player.health = this.player.maxHealth;
      this.player.stamina = this.player.maxStamina;
      this.simulation.clearWanted();
      this.saveGame();
      this.onOpenModal?.('phone');
    } else if (zone.type === 'lounge') {
      this.player.health = this.player.maxHealth;
      this.player.stamina = this.player.maxStamina;
      this.audio.playChime(true);
      this.showToast('Refreshed at Club Solara Terrace (Full Health & Stamina)');
    }
  }

  private exitVehicle(): void {
    if (!this.activeVehicle) return;
    const v = this.activeVehicle;
    const exitX = v.position.x - Math.cos(v.yaw) * 2.5;
    const exitZ = v.position.z + Math.sin(v.yaw) * 2.5;
    this.player.position.set(exitX, Math.max(0, getGroundHeightAt(exitX, exitZ)), exitZ);
    this.player.yaw = v.yaw;
    this.player.velocity.set(0, 0, 0);
    this.player.group.visible = true;
    this.player.group.position.copy(this.player.position);
    this.activeVehicle = null;
    this.emitHud();
  }

  private findNearestVehicle(maxDist: number): VehicleEntity | null {
    let best: VehicleEntity | null = null;
    let bestD = maxDist;
    const px = this.player.position.x;
    const pz = this.player.position.z;

    for (const v of this.playerVehicles) {
      const d = Math.hypot(v.position.x - px, v.position.z - pz);
      if (d < bestD) {
        bestD = d;
        best = v;
      }
    }
    return best;
  }

  private getActiveLandmark(): WorldLandmark | null {
    const px = this.activeVehicle ? this.activeVehicle.position.x : this.player.position.x;
    const pz = this.activeVehicle ? this.activeVehicle.position.z : this.player.position.z;
    for (const lm of WORLD_LANDMARKS) {
      if (lm.type !== 'garage' && lm.type !== 'safehouse' && lm.type !== 'lounge') continue;
      if (Math.hypot(lm.x - px, lm.z - pz) < lm.radius) {
        return lm;
      }
    }
    return null;
  }

  private showDialogue(speaker: string, text: string): void {
    this.dialogueBanner = { speaker, text };
    this.dialogueTimer = 7.5;
  }

  private showToast(msg: string): void {
    this.toastMessage = msg;
    this.toastTimer = 3.2;
  }

  // --- Event Listeners ---

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.screen !== 'playing') return;
    this.audio.unlock();

    if (e.code === 'Escape') {
      this.onOpenModal?.('pause');
      return;
    }
    if (this.paused) return;

    const code = e.code;
    this.keys.add(code);

    if (code === 'KeyE' || code === 'KeyF') {
      const zone = this.getActiveLandmark();
      if (this.activeVehicle && zone?.type === 'garage') {
        this.activateLandmark(zone);
      } else {
        this.toggleVehicleEntry();
      }
    } else if (code === 'KeyV') {
      this.cycleCameraMode();
    } else if (code === 'KeyR') {
      this.cycleRadio();
    } else if (code === 'KeyL') {
      this.toggleHeadlights();
    } else if (code === 'KeyH') {
      if (this.activeVehicle) {
        this.audio.playHorn();
        if (this.activeVehicle.isPolice) {
          this.toggleSiren();
        }
        this.simulation.alertNearbyPedestrians(
          this.activeVehicle.position.x,
          this.activeVehicle.position.z,
          18
        );
      }
    } else if (code === 'KeyM') {
      this.onOpenModal?.('map');
    } else if (code === 'KeyP') {
      this.onOpenModal?.('phone');
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.target !== this.renderer.domElement) return;
    this.audio.unlock();
    this.isDraggingMouse = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.isDraggingMouse || this.screen !== 'playing' || this.paused) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    const sens = 0.0045 * this.settings.mouseSensitivity;
    this.camYaw -= dx * sens;
    const ySign = this.settings.invertY ? -1 : 1;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * sens * ySign, -0.15, 0.95);
  };

  private onPointerUp = () => {
    this.isDraggingMouse = false;
  };

  private onWheel = (e: WheelEvent) => {
    if (e.target !== this.renderer.domElement) return;
    this.camZoom = THREE.MathUtils.clamp(this.camZoom + e.deltaY * 0.0008, 0.7, 1.8);
  };

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    window.addEventListener('resize', this.onResize);
  }

  private pollGamepad(): {
    moveX: number;
    moveY: number;
    throttle: number;
    steer: number;
    sprint: boolean;
    jump: boolean;
    camX: number;
    camY: number;
  } {
    const out = {
      moveX: 0,
      moveY: 0,
      throttle: 0,
      steer: 0,
      sprint: false,
      jump: false,
      camX: 0,
      camY: 0,
    };
    const pads = navigator.getGamepads?.();
    if (!pads) return out;
    const gp = pads[0];
    if (!gp) return out;

    const dead = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
    out.moveX = dead(gp.axes[0] ?? 0);
    out.moveY = -dead(gp.axes[1] ?? 0);
    out.camX = dead(gp.axes[2] ?? 0);
    out.camY = dead(gp.axes[3] ?? 0);
    out.steer = -out.moveX;
    const rt = gp.buttons[7]?.value ?? 0;
    const lt = gp.buttons[6]?.value ?? 0;
    out.throttle = rt - lt;
    out.jump = Boolean(gp.buttons[0]?.pressed);
    out.sprint = Boolean(gp.buttons[2]?.pressed || gp.buttons[10]?.pressed);
    return out;
  }

  // --- Frame Loop with Software-WebGL afterDraw Pacing ---

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      this.fpsSmooth = THREE.MathUtils.lerp(this.fpsSmooth, 1 / Math.max(0.005, rawDt), 0.1);

      this.stepSimulation(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stepSimulation(dt: number): void {
    if (!this.paused) {
      this.elapsed += dt;
    }

    const activePos = this.activeVehicle ? this.activeVehicle.position : this.player.position;
    const envState = this.environment.update(
      this.paused ? 0 : dt,
      this.elapsed,
      activePos.x,
      activePos.z,
      this.scene,
      this.materials,
      () => this.audio.playThunder()
    );

    this.world.update(this.elapsed, envState.nightFactor, this.simulation.trafficPhaseNS);

    if (this.screen === 'menu') {
      // Cinematic aerial orbit over Solana Bay skyline & ocean at golden sunset
      const orbitAngle = this.elapsed * 0.085;
      this.camera.position.set(
        40 + Math.cos(orbitAngle) * 145,
        46 + Math.sin(orbitAngle * 1.4) * 9,
        15 + Math.sin(orbitAngle) * 145
      );
      this.camera.lookAt(22, 14, -10);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 4, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.paused) return;

    const gp = this.pollGamepad();
    if (Math.abs(gp.camX) > 0.01) this.camYaw -= gp.camX * dt * 2.2;
    if (Math.abs(gp.camY) > 0.01) {
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + gp.camY * dt * 1.5, -0.15, 0.95);
    }

    // 1. Update Active Vehicle or Player on Foot
    let playerSpeed = 0;
    if (this.activeVehicle) {
      const throttle =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) +
        gp.throttle;
      const steer =
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) -
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) +
        gp.steer;
      const handbrake = this.keys.has('Space') || gp.jump;

      this.activeVehicle.updatePhysics(
        dt,
        {
          throttle: THREE.MathUtils.clamp(throttle, -1, 1),
          steer: THREE.MathUtils.clamp(steer, -1, 1),
          handbrake,
        },
        envState.gripFactor,
        this.world.colliders,
        this.elapsed,
        envState.nightFactor,
        (intensity) => {
          this.audio.playImpact(intensity);
          if (intensity > 0.65) {
            this.simulation.alertNearbyPedestrians(
              this.activeVehicle!.position.x,
              this.activeVehicle!.position.z,
              25
            );
          }
        }
      );
      playerSpeed = this.activeVehicle.speed;
      // Keep player synced inside car
      this.player.position.copy(this.activeVehicle.position);
      this.player.yaw = this.activeVehicle.yaw;

      // Auto-follow chase camera gently behind vehicle when not dragging mouse
      if (!this.isDraggingMouse && this.cameraMode !== 'orbit' && Math.abs(playerSpeed) > 2) {
        const desiredCamYaw = this.activeVehicle.yaw + Math.PI;
        let diff = desiredCamYaw - this.camYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.camYaw += diff * Math.min(1, dt * 3.4);
      }
    } else {
      const forward =
        (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
        (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) +
        gp.moveY;
      const right =
        (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
        (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) +
        gp.moveX;
      const sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || gp.sprint;
      const jump = this.keys.has('Space') || gp.jump;
      const crouch = this.keys.has('KeyC') || this.keys.has('ControlLeft');

      this.player.update(
        dt,
        {
          forward: THREE.MathUtils.clamp(forward, -1, 1),
          right: THREE.MathUtils.clamp(right, -1, 1),
          sprint,
          jump,
          crouch,
          cameraYaw: this.camYaw,
        },
        this.world.colliders,
        (isSand) => this.audio.playFootstep(isSand)
      );
      playerSpeed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    }

    // Update idle parked hero vehicles (lights & police strobes)
    for (const v of this.playerVehicles) {
      if (v !== this.activeVehicle) {
        v.updatePhysics(
          dt,
          { throttle: 0, steer: 0, handbrake: true },
          envState.gripFactor,
          this.world.colliders,
          this.elapsed,
          envState.nightFactor
        );
      }
    }

    // 2. City Traffic, NPCs & Police Pursuit Simulation
    this.trafficCrimeCooldown = Math.max(0, this.trafficCrimeCooldown - dt);
    const simResult = this.simulation.update(
      dt,
      this.elapsed,
      activePos.x,
      activePos.z,
      playerSpeed,
      this.environment.weather,
      envState.nightFactor,
      envState.gripFactor,
      this.world.colliders,
      () => {
        if (this.trafficCrimeCooldown <= 0) {
          this.trafficCrimeCooldown = 5.5;
          this.audio.playImpact(0.75);
          if (this.simulation.addCrimeHeat()) {
            this.showToast(`Solana PD Alert: Wanted Level ${this.simulation.wantedLevel}`);
          }
        }
      },
      () => {
        // Busted by Solana PD -> pay fine, respawn outside Bayfront Precinct
        const fine = Math.min(this.cash, 250 * this.simulation.wantedLevel);
        this.cash -= fine;
        this.simulation.clearWanted();
        if (this.activeVehicle) this.exitVehicle();
        this.player.position.set(-96, 0, -28);
        this.audio.playChime(false);
        this.showDialogue(
          'Bayfront Precinct',
          `Released on bail after a $${fine} municipal fine. Keep it clean on the boulevards.`
        );
      }
    );

    // 3. Mission Checkpoint Progression
    this.updateMission(dt, activePos.x, activePos.z);

    // 4. Third-Person Damped Camera + Speed FOV Widening
    this.updateCamera(dt, activePos, playerSpeed);

    // 5. Procedural Audio Sync
    const distToBeach = Math.max(0, 120 - activePos.x);
    this.audio.update(
      dt,
      this.elapsed,
      Boolean(this.activeVehicle),
      this.activeVehicle?.rpm ?? 0,
      this.activeVehicle?.drifting ?? false,
      this.environment.weather,
      distToBeach,
      Math.max(simResult.closestSirenFactor, this.activeVehicle?.sirenOn ? 0.85 : 0)
    );

    // Timers for banners & toasts
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueBanner = null;
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMessage = null;
    }

    // Throttled HUD snapshot emit (~15 Hz so React stays razor-fast)
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.emitHud(simResult.minimapEntities);
    }
  }

  private updateMission(dt: number, px: number, pz: number): void {
    if (!this.activeMissionId) {
      if (this.customWaypoint) {
        if (Math.hypot(px - this.customWaypoint.x, pz - this.customWaypoint.z) < 10) {
          this.showToast(`Arrived at ${this.customWaypoint.label}`);
          this.customWaypoint = null;
          this.world.checkpointBeacon.visible = false;
        }
      }
      return;
    }

    const def = MISSIONS.find((m) => m.id === this.activeMissionId);
    if (!def) return;

    if (this.activeMissionTimer !== null) {
      this.activeMissionTimer -= dt;
      if (this.activeMissionTimer <= 0) {
        this.activeMissionId = null;
        this.activeMissionTimer = null;
        this.world.checkpointBeacon.visible = false;
        this.audio.playChime(false);
        this.showDialogue(def.giver, 'Time expired! Open your Smartphone (P) to retry the contract.');
        return;
      }
    }

    const cp = def.checkpoints[this.activeMissionStep];
    if (!cp) return;
    if (Math.hypot(px - cp.x, pz - cp.z) < cp.radius) {
      this.audio.playChime(true);
      this.activeMissionStep += 1;
      if (this.activeMissionStep >= def.checkpoints.length) {
        // Mission Complete!
        this.cash += def.reward;
        if (!this.completedMissions.includes(def.id)) {
          this.completedMissions.push(def.id);
        }
        this.activeMissionId = null;
        this.activeMissionTimer = null;
        this.world.checkpointBeacon.visible = false;
        if (def.triggerWanted) {
          this.simulation.clearWanted();
        }
        this.showDialogue(def.giver, def.completeDialogue);
        this.showToast(`Mission Complete: +$${def.reward.toLocaleString()}`);
        this.saveGame();
      } else {
        const nextCp = def.checkpoints[this.activeMissionStep];
        this.world.checkpointBeacon.position.set(
          nextCp.x,
          getGroundHeightAt(nextCp.x, nextCp.z),
          nextCp.z
        );
        this.showToast(`Checkpoint reached — Next: ${nextCp.label}`);
      }
    }
  }

  private updateCamera(dt: number, focus: THREE.Vector3, speed: number): void {
    const inCar = Boolean(this.activeVehicle);

    if (inCar && this.cameraMode === 'hood') {
      const v = this.activeVehicle!;
      const sinY = Math.sin(v.yaw);
      const cosY = Math.cos(v.yaw);
      this._camTargetPos.set(
        v.position.x + sinY * 0.65,
        v.position.y + 1.48,
        v.position.z + cosY * 0.65
      );
      this._camLookAt.set(
        v.position.x + sinY * 22,
        v.position.y + 1.2,
        v.position.z + cosY * 22
      );
      this.camera.position.lerp(this._camTargetPos, 1 - Math.exp(-20 * dt));
      this._currentLookAt.lerp(this._camLookAt, 1 - Math.exp(-20 * dt));
      this.camera.lookAt(this._currentLookAt);
    } else {
      const baseDist = inCar
        ? this.cameraMode === 'far'
          ? 12.2
          : 8.6
        : this.cameraMode === 'far'
          ? 7.2
          : 4.8;
      const dist = baseDist * this.camZoom;
      const height = inCar ? 2.4 : 1.75;

      const sinYaw = Math.sin(this.camYaw);
      const cosYaw = Math.cos(this.camYaw);
      const cosPitch = Math.cos(this.camPitch);
      const sinPitch = Math.sin(this.camPitch);

      this._camTargetPos.set(
        focus.x + sinYaw * cosPitch * dist,
        Math.max(0.8, focus.y + height + sinPitch * dist),
        focus.z + cosYaw * cosPitch * dist
      );
      this._camLookAt.set(focus.x, focus.y + (inCar ? 1.25 : 1.35), focus.z);

      const dampFactor = 1 - Math.exp(-(inCar ? 9 : 11) * dt);
      this.camera.position.lerp(this._camTargetPos, dampFactor);
      this._currentLookAt.lerp(this._camLookAt, 1 - Math.exp(-14 * dt));
      this.camera.lookAt(this._currentLookAt);
    }

    // Dynamic high-speed FOV widening
    const targetFov = inCar
      ? 62 + Math.min(18, (Math.abs(speed) / 50) * 18)
      : 60;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 5, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private emitHud(minimapEntities: HudSnapshot['minimapEntities'] = []): void {
    const activePos = this.activeVehicle ? this.activeVehicle.position : this.player.position;
    const activeZone = this.getActiveLandmark();
    const nearbyCar = !this.activeVehicle ? this.findNearestVehicle(5.6) : null;

    let interactionPrompt: string | null = null;
    if (this.activeVehicle && activeZone?.type === 'garage') {
      interactionPrompt = 'Press E to enter Solana Customs Garage';
    } else if (!this.activeVehicle && nearbyCar) {
      interactionPrompt = `Press E to drive ${nearbyCar.preset.name}`;
    } else if (!this.activeVehicle && activeZone) {
      interactionPrompt = `Press E to interact with ${activeZone.name}`;
    }

    const activeMission = this.activeMissionId
      ? MISSIONS.find((m) => m.id === this.activeMissionId) || null
      : null;
    const activeCp = activeMission ? activeMission.checkpoints[this.activeMissionStep] : null;
    const waypoint = activeCp
      ? { x: activeCp.x, z: activeCp.z, label: activeCp.label }
      : this.customWaypoint;

    const station = RADIO_STATIONS[this.settings.radioStation] || RADIO_STATIONS[0];

    this.onHudUpdate({
      screen: this.screen,
      health: Math.round(this.player.health),
      maxHealth: this.player.maxHealth,
      stamina: Math.round(this.player.stamina),
      maxStamina: this.player.maxStamina,
      cash: this.cash,
      wantedLevel: this.simulation.wantedLevel,
      wantedCooldown: this.simulation.wantedCooldown,
      district: this.world.getDistrictAt(activePos.x, activePos.z),
      timeOfDay: this.environment.timeOfDay,
      weather: this.environment.weather,
      inVehicle: Boolean(this.activeVehicle),
      vehicleName: this.activeVehicle?.preset.name ?? '',
      vehicleHealth: Math.round(this.activeVehicle?.health ?? 100),
      speedKmh: Math.round(Math.abs(this.activeVehicle?.speed ?? 0) * 3.6),
      gear: this.activeVehicle?.gear ?? 1,
      rpm: this.activeVehicle?.rpm ?? 0,
      headlightsOn: Boolean(this.activeVehicle?.headlightsOn),
      sirenOn: Boolean(this.activeVehicle?.sirenOn),
      cameraMode: this.cameraMode,
      playerX: activePos.x,
      playerZ: activePos.z,
      playerYaw: this.activeVehicle ? this.activeVehicle.yaw : this.player.yaw,
      isSwimming: this.player.isSwimming,
      isCrouching: this.player.isCrouching,
      interactionPrompt,
      activeZone,
      activeMissionId: activeMission?.id ?? null,
      activeMissionTitle: activeMission?.title ?? null,
      activeMissionStep: this.activeMissionStep + 1,
      activeMissionTotal: activeMission?.checkpoints.length ?? 0,
      activeMissionObjective: activeCp?.label ?? null,
      activeMissionTimer:
        this.activeMissionTimer !== null ? Math.ceil(this.activeMissionTimer) : null,
      waypoint,
      completedMissions: [...this.completedMissions],
      ownedVehicles: [...this.ownedVehicles],
      outfit: this.player.outfitId,
      dialogueBanner: this.dialogueBanner,
      toastMessage: this.toastMessage,
      radioTrack: this.settings.radioEnabled && station.bpm > 0 ? `${station.name} · ${station.track}` : 'Radio Off',
      minimapEntities,
      fps: Math.round(this.fpsSmooth),
      hasSaveData: this.hasSaveData(),
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    this.audio.dispose();
    this.materials.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
