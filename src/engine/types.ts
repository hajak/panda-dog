/* ============================================
   SHADOW NINJA - Type Definitions
   ============================================ */

// Vector types
export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Grid position (integer tile coordinates)
export interface GridPos {
  col: number;
  row: number;
}

// World position (floating point world coordinates)
export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

// Screen position (pixel coordinates)
export interface ScreenPos {
  x: number;
  y: number;
}

// Direction types
export type Direction8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type Direction4 = 'N' | 'E' | 'S' | 'W';

// Tile types
export type TileType =
  | 'ground'
  | 'grass'
  | 'stone'
  | 'water'
  | 'bridge'
  | 'wall'
  | 'wall_low'
  | 'fence'
  | 'void';

export interface TileData {
  type: TileType;
  elevation: number;
  walkable: boolean;
  climbable: boolean;
  hidingSpot: boolean;
  interactable: boolean;
  occluder: boolean;
}

// Entity types
export type EntityType =
  | 'player'
  | 'guard'
  | 'archer'
  | 'skeleton'
  | 'oni'
  | 'boss'
  | 'projectile'
  | 'pickup'
  | 'interactable';

// AI states
export type AIState =
  | 'idle'
  | 'patrol'
  | 'suspicious'
  | 'alert'
  | 'chase'
  | 'search'
  | 'return';

// Player states
export type PlayerState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  | 'climb'
  | 'attack'
  | 'block'
  | 'throw'
  | 'hurt'
  | 'hidden';

// Animation state
export interface AnimationState {
  name: string;
  frame: number;
  time: number;
  loop: boolean;
  finished: boolean;
}

// Combat
export interface Attack {
  damage: number;
  knockback: Vec2;
  stunDuration: number;
  hitbox: { x: number; y: number; width: number; height: number };
}

export interface HitData {
  attacker: string;
  target: string;
  damage: number;
  knockback: Vec2;
  position: WorldPos;
}

// Input
export interface InputState {
  moveX: number;
  moveY: number;
  run: boolean;
  jump: boolean;
  jumpPressed: boolean;
  attack: boolean;
  attackPressed: boolean;
  block: boolean;
  throw: boolean;
  throwPressed: boolean;
  interact: boolean;
  interactPressed: boolean;
  inventory1: boolean;
  inventory2: boolean;
  inventory3: boolean;
  pause: boolean;
  pausePressed: boolean;
  debug: boolean;
  debugPressed: boolean;
  toggleVision: boolean;
  toggleVisionPressed: boolean;
  toggleGrid: boolean;
  toggleGridPressed: boolean;
  toggleHelp: boolean;
  toggleHelpPressed: boolean;
  toggleDebugUI: boolean;
  toggleDebugUIPressed: boolean;
}

// Camera
export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  shakeIntensity: number;
  shakeDecay: number;
}

// Game events
export type GameEvent =
  | { type: 'hit'; data: HitData }
  | { type: 'death'; entityId: string }
  | { type: 'pickup'; itemType: string; amount: number }
  | { type: 'interact'; objectId: string }
  | { type: 'alert'; guardId: string; position: WorldPos }
  | { type: 'noise'; position: WorldPos; radius: number }
  | { type: 'enter_hide'; }
  | { type: 'exit_hide'; };

// Scene definition
export interface SceneData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileData[][];
  entities: EntitySpawnData[];
  triggers: TriggerData[];
}

export interface EntitySpawnData {
  type: EntityType;
  x: number;
  y: number;
  z: number;
  properties?: Record<string, unknown>;
}

export interface TriggerData {
  id: string;
  type: 'interact' | 'proximity' | 'combat';
  x: number;
  y: number;
  width: number;
  height: number;
  action: string;
  properties?: Record<string, unknown>;
}

// Interactable types
export type InteractableType =
  | 'door'
  | 'lever'
  | 'chest'
  | 'pickup_shuriken'
  | 'pickup_health'
  | 'stairs_down'
  | 'stairs_up';

export interface InteractableData {
  type: InteractableType;
  state: 'closed' | 'open' | 'collected';
  linkedId?: string;
}

// Inventory
export interface InventorySlot {
  itemType: string | null;
  count: number;
  maxCount: number;
}

// Debug options
export interface DebugOptions {
  showFPS: boolean;
  showColliders: boolean;
  showVisionCones: boolean;
  showNoiseRadius: boolean;
  showPaths: boolean;
  showGrid: boolean;
  showElevation: boolean;
  godMode: boolean;
}
