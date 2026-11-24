export type WeatherType = 'sunny' | 'cloudy' | 'foggy' | 'rain' | 'storm';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra' | 'cinematic';

export type CameraMode = 'chase' | 'far' | 'hood' | 'orbit';

export type VehicleType = 'supercar' | 'roadster' | 'suv' | 'police';

export type OutfitId = 'coastal' | 'midnight' | 'coral' | 'tactical';

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  jacketColor: number;
  shirtColor: number;
  pantsColor: number;
  shoesColor: number;
  hairColor: number;
  swatchHex: string;
}

export const OUTFITS: OutfitConfig[] = [
  {
    id: 'coastal',
    name: 'Coastal Linen',
    jacketColor: 0xe8dfd1,
    shirtColor: 0x1d4e63,
    pantsColor: 0x334155,
    shoesColor: 0xf8fafc,
    hairColor: 0x231a14,
    swatchHex: '#e8dfd1',
  },
  {
    id: 'midnight',
    name: 'Midnight Leather',
    jacketColor: 0x181c24,
    shirtColor: 0x991b1b,
    pantsColor: 0x111827,
    shoesColor: 0x0f172a,
    hairColor: 0x161210,
    swatchHex: '#181c24',
  },
  {
    id: 'coral',
    name: 'Solana Sunset',
    jacketColor: 0xe05d44,
    shirtColor: 0xf8fafc,
    pantsColor: 0x1e293b,
    shoesColor: 0xe2e8f0,
    hairColor: 0x3b2618,
    swatchHex: '#e05d44',
  },
  {
    id: 'tactical',
    name: 'Harbor Operative',
    jacketColor: 0x2d3b36,
    shirtColor: 0x1e293b,
    pantsColor: 0x1f2937,
    shoesColor: 0x1c1917,
    hairColor: 0x27201c,
    swatchHex: '#2d3b36',
  },
];

export interface VehiclePreset {
  id: VehicleType;
  name: string;
  category: string;
  defaultColor: number;
  maxSpeed: number; // m/s
  acceleration: number; // m/s^2
  braking: number;
  turnRate: number;
  grip: number;
  price: number;
}

export const VEHICLE_PRESETS: Record<VehicleType, VehiclePreset> = {
  supercar: {
    id: 'supercar',
    name: 'Veloce GT-R',
    category: 'Supercar',
    defaultColor: 0xd93829,
    maxSpeed: 54,
    acceleration: 24,
    braking: 36,
    turnRate: 2.35,
    grip: 7.5,
    price: 0,
  },
  roadster: {
    id: 'roadster',
    name: 'Breeze S8 Roadster',
    category: 'Sports Convertible',
    defaultColor: 0xf59e0b,
    maxSpeed: 47,
    acceleration: 21,
    braking: 32,
    turnRate: 2.55,
    grip: 7.0,
    price: 4500,
  },
  suv: {
    id: 'suv',
    name: 'Apex Crest V8',
    category: 'Luxury SUV',
    defaultColor: 0x1e293b,
    maxSpeed: 38,
    acceleration: 15,
    braking: 26,
    turnRate: 1.95,
    grip: 6.2,
    price: 3000,
  },
  police: {
    id: 'police',
    name: 'Solana Interceptor',
    category: 'Law Enforcement',
    defaultColor: 0x0f172a,
    maxSpeed: 49,
    acceleration: 22,
    braking: 34,
    turnRate: 2.4,
    grip: 7.2,
    price: 8000,
  },
};

export const PAINT_SWATCHES = [
  { name: 'Rosso Corsa', hex: '#d93829', value: 0xd93829 },
  { name: 'Solana Amber', hex: '#f59e0b', value: 0xf59e0b },
  { name: 'Pacific Teal', hex: '#0891b2', value: 0x0891b2 },
  { name: 'Obsidian Matte', hex: '#141821', value: 0x141821 },
  { name: 'Pearl White', hex: '#f1f5f9', value: 0xf1f5f9 },
  { name: 'Emerald Bay', hex: '#059669', value: 0x059669 },
  { name: 'Titanium Silver', hex: '#94a3b8', value: 0x94a3b8 },
  { name: 'Midnight Cobalt', hex: '#1d4ed8', value: 0x1d4ed8 },
];

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  label?: string;
}

export interface WorldLandmark {
  id: string;
  name: string;
  district: string;
  type: 'garage' | 'safehouse' | 'lounge' | 'police' | 'hospital' | 'landmark';
  x: number;
  z: number;
  radius: number;
  description: string;
}

export interface MissionCheckpoint {
  x: number;
  z: number;
  label: string;
  radius: number;
}

export interface MissionDef {
  id: string;
  title: string;
  giver: string;
  category: 'Main Story' | 'Street Run' | 'Law Evasion' | 'Exploration';
  description: string;
  reward: number;
  timeLimitSec?: number;
  requireVehicle?: boolean;
  triggerWanted?: number;
  checkpoints: MissionCheckpoint[];
  introDialogue: string;
  completeDialogue: string;
}

export interface GameSettings {
  graphics: GraphicsPreset;
  masterVolume: number;
  sfxVolume: number;
  radioVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  radioEnabled: boolean;
  radioStation: number;
}

export interface MinimapEntity {
  x: number;
  z: number;
  rot: number;
  type: 'vehicle' | 'police' | 'npc' | 'helicopter';
}

export interface HudSnapshot {
  screen: 'menu' | 'playing';
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  cash: number;
  wantedLevel: number;
  wantedCooldown: number; // 0-1
  district: string;
  timeOfDay: number; // 0..24
  weather: WeatherType;
  inVehicle: boolean;
  vehicleName: string;
  vehicleHealth: number;
  speedKmh: number;
  gear: number;
  rpm: number; // 0..1
  headlightsOn: boolean;
  sirenOn: boolean;
  cameraMode: CameraMode;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  isSwimming: boolean;
  isCrouching: boolean;
  interactionPrompt: string | null;
  activeZone: WorldLandmark | null;
  activeMissionId: string | null;
  activeMissionTitle: string | null;
  activeMissionStep: number;
  activeMissionTotal: number;
  activeMissionObjective: string | null;
  activeMissionTimer: number | null;
  waypoint: { x: number; z: number; label: string } | null;
  completedMissions: string[];
  ownedVehicles: VehicleType[];
  outfit: OutfitId;
  dialogueBanner: { speaker: string; text: string } | null;
  toastMessage: string | null;
  radioTrack: string;
  minimapEntities: MinimapEntity[];
  fps: number;
  hasSaveData: boolean;
}

export interface SaveState {
  cash: number;
  completedMissions: string[];
  ownedVehicles: VehicleType[];
  outfit: OutfitId;
  timeOfDay: number;
  weather: WeatherType;
  playerX: number;
  playerZ: number;
  settings: GameSettings;
}
