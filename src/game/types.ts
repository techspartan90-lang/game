export type WeatherType = 'sunny' | 'cloudy' | 'foggy' | 'rain' | 'storm';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';

export type CameraMode = 'chase' | 'far' | 'hood' | 'orbit';

export type VehicleType = 'rickshaw' | 'supercar' | 'sedan' | 'suv' | 'motorcycle' | 'police';

export type OutfitId = 'marine' | 'bazaar' | 'monsoon' | 'saffron';

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
    id: 'marine',
    name: 'Marine Linen Kurta',
    jacketColor: 0xefe6d5,
    shirtColor: 0x164e63,
    pantsColor: 0x2b3648,
    shoesColor: 0x5c3d28,
    hairColor: 0x171412,
    swatchHex: '#efe6d5',
  },
  {
    id: 'bazaar',
    name: 'Purana Indigo Bandhgala',
    jacketColor: 0x1e3a8a,
    shirtColor: 0xf8fafc,
    pantsColor: 0x1e293b,
    shoesColor: 0x1c1917,
    hairColor: 0x141210,
    swatchHex: '#1e3a8a',
  },
  {
    id: 'monsoon',
    name: 'Expressway Biker',
    jacketColor: 0x181c24,
    shirtColor: 0xb91c1c,
    pantsColor: 0x111827,
    shoesColor: 0x0f172a,
    hairColor: 0x181512,
    swatchHex: '#181c24',
  },
  {
    id: 'saffron',
    name: 'Navpur Sunset Street',
    jacketColor: 0xd96b27,
    shirtColor: 0xfef3c7,
    pantsColor: 0x27272a,
    shoesColor: 0xe2e8f0,
    hairColor: 0x1f1916,
    swatchHex: '#d96b27',
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
  price: number; // INR
}

export const VEHICLE_PRESETS: Record<VehicleType, VehiclePreset> = {
  rickshaw: {
    id: 'rickshaw',
    name: 'Navpur Bajaj-3 Auto',
    category: 'Auto-Rickshaw',
    defaultColor: 0x15803d,
    maxSpeed: 29,
    acceleration: 16,
    braking: 25,
    turnRate: 3.1,
    grip: 6.4,
    price: 0,
  },
  sedan: {
    id: 'sedan',
    name: 'Deccan Aura GTX',
    category: 'Urban Sedan',
    defaultColor: 0xe2e8f0,
    maxSpeed: 42,
    acceleration: 18,
    braking: 29,
    turnRate: 2.35,
    grip: 6.9,
    price: 0,
  },
  motorcycle: {
    id: 'motorcycle',
    name: 'Deccan Bullet 350',
    category: 'Cruiser Motorcycle',
    defaultColor: 0x991b1b,
    maxSpeed: 46,
    acceleration: 23,
    braking: 33,
    turnRate: 2.95,
    grip: 7.4,
    price: 45000,
  },
  suv: {
    id: 'suv',
    name: 'Indraprastha 4x4',
    category: 'Rugged SUV',
    defaultColor: 0x1e293b,
    maxSpeed: 40,
    acceleration: 17,
    braking: 28,
    turnRate: 2.05,
    grip: 6.6,
    price: 85000,
  },
  supercar: {
    id: 'supercar',
    name: 'Vayu GT-8',
    category: 'Sports Supercar',
    defaultColor: 0xea580c,
    maxSpeed: 56,
    acceleration: 26,
    braking: 38,
    turnRate: 2.45,
    grip: 7.8,
    price: 180000,
  },
  police: {
    id: 'police',
    name: 'Navpur PCR Interceptor',
    category: 'Police Patrol',
    defaultColor: 0xf8fafc,
    maxSpeed: 49,
    acceleration: 22,
    braking: 34,
    turnRate: 2.4,
    grip: 7.3,
    price: 150000,
  },
};

export interface InventoryItemDef {
  id: 'chai' | 'medkit' | 'wrench' | 'armor';
  name: string;
  description: string;
  price: number;
}

export const SHOP_ITEMS: InventoryItemDef[] = [
  {
    id: 'chai',
    name: 'Cutting Chai Flask',
    description: 'Restores 100% stamina and +25 health instantly.',
    price: 150,
  },
  {
    id: 'medkit',
    name: 'Trauma First-Aid Kit',
    description: 'Restores full player health to 100%.',
    price: 800,
  },
  {
    id: 'wrench',
    name: 'Roadside Mechanic Kit',
    description: 'Repairs your current or nearest vehicle to 100% condition.',
    price: 1500,
  },
  {
    id: 'armor',
    name: 'Kevlar Street Vest',
    description: 'Reinforces health buffer and shields against pursuit collisions.',
    price: 3500,
  },
];

export type InventoryCounts = Record<InventoryItemDef['id'], number>;

export const PAINT_SWATCHES = [
  { name: 'Saffron Flame', hex: '#ea580c', value: 0xea580c },
  { name: 'Auto Emerald', hex: '#15803d', value: 0x15803d },
  { name: 'Marigold Taxi', hex: '#eab308', value: 0xeab308 },
  { name: 'Royal Crimson', hex: '#b91c1c', value: 0xb91c1c },
  { name: 'Arabian Teal', hex: '#0891b2', value: 0x0891b2 },
  { name: 'Pearl White', hex: '#f1f5f9', value: 0xf1f5f9 },
  { name: 'Graphite Matte', hex: '#181c24', value: 0x181c24 },
  { name: 'Indigo Night', hex: '#1d4ed8', value: 0x1d4ed8 },
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
  type: 'garage' | 'safehouse' | 'shop' | 'police' | 'hospital' | 'landmark';
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
  category: 'Main Story' | 'Auto Hustle' | 'Law Evasion' | 'Exploration';
  description: string;
  reward: number; // INR
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
  type: 'vehicle' | 'police' | 'npc' | 'helicopter' | 'coop';
  label?: string;
}

export interface RemotePlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  outfit: OutfitId;
  inVehicle: boolean;
  vehicleType: VehicleType | null;
  vehicleColor: number;
  speed: number;
}

export interface CoopChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface MultiplayerHudState {
  connected: boolean;
  roomCode: string | null;
  playerId: string | null;
  playerName: string;
  isHost: boolean;
  players: { id: string; name: string; inVehicle: boolean; district?: string }[];
  chat: CoopChatMessage[];
  statusText: string;
}

export interface HudSnapshot {
  screen: 'menu' | 'playing';
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  cash: number; // INR
  inventory: InventoryCounts;
  wantedLevel: number;
  wantedCooldown: number;
  district: string;
  timeOfDay: number;
  weather: WeatherType;
  inVehicle: boolean;
  vehicleName: string;
  vehicleType: VehicleType | null;
  vehicleHealth: number;
  speedKmh: number;
  gear: number;
  rpm: number;
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
  multiplayer: MultiplayerHudState;
  fps: number;
  hasSaveData: boolean;
}

export interface SaveState {
  cash: number;
  inventory: InventoryCounts;
  completedMissions: string[];
  ownedVehicles: VehicleType[];
  outfit: OutfitId;
  timeOfDay: number;
  weather: WeatherType;
  playerX: number;
  playerZ: number;
  settings: GameSettings;
}
