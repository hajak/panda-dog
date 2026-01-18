/**
 * Panda & Dog - Shared Types
 * Common type definitions used by both client and server
 */

// ============================================
// Core Types
// ============================================

export interface Vec2 {
  x: number;
  y: number;
}

export interface WorldPos {
  x: number;
  y: number;
  z: number;
}

export type Role = 'dog' | 'panda';

export type Direction8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

// ============================================
// Entity State
// ============================================

export interface EntityState {
  id: string;
  type: 'dog' | 'panda';
  position: WorldPos;
  velocity: Vec2;
  facing: Direction8;
  state: string;
  animation?: string;
}

export interface InputState {
  moveX: number;  // -1 to 1
  moveY: number;  // -1 to 1
  run: boolean;
  jump: boolean;
  interact: boolean;
  surveillance: boolean;  // Dog only
  operateHold: boolean;   // Panda only - hold interaction
}

// ============================================
// Interactable Types
// ============================================

export type InteractableType =
  | 'door'
  | 'lever'
  | 'pressure_plate'
  | 'crate'
  | 'winch'
  | 'camera_node'
  | 'platform'
  | 'button'
  | 'hazard';

export interface InteractableState {
  id: string;
  type: InteractableType;
  position: WorldPos;
  state: Record<string, unknown>;
  linkedIds?: string[];  // Connected interactables
}

export interface DoorState extends InteractableState {
  type: 'door';
  state: {
    open: boolean;
    locked: boolean;
    requiresHeavy: boolean;  // Panda only
  };
}

export interface LeverState extends InteractableState {
  type: 'lever';
  state: {
    position: 'off' | 'on' | 'held';  // held = requires continuous hold
    requiresStrength: boolean;  // Panda only
  };
}

export interface PressurePlateState extends InteractableState {
  type: 'pressure_plate';
  state: {
    activated: boolean;
    weightThreshold: 'light' | 'heavy';  // light = either, heavy = Panda/crate only
    currentWeight: number;
  };
}

export interface CrateState extends InteractableState {
  type: 'crate';
  state: {
    gridX: number;
    gridY: number;
    beingPushed: boolean;
    pushDirection?: Direction8;
  };
}

export interface WinchState extends InteractableState {
  type: 'winch';
  state: {
    extended: number;  // 0.0 to 1.0
    operating: boolean;
    requiresPower: boolean;  // Needs Dog to enable power
    poweredById?: string;    // ID of power source
  };
}

export interface CameraNodeState extends InteractableState {
  type: 'camera_node';
  state: {
    active: boolean;
    rotation: number;  // Current angle
    minRotation: number;
    maxRotation: number;
    viewingPlayerId?: string;  // Dog viewing this camera
  };
}

export interface PlatformState extends InteractableState {
  type: 'platform';
  state: {
    currentPosition: number;  // 0.0 to 1.0 along path
    moving: boolean;
    direction: 1 | -1;
    speed: number;
    waypoints: WorldPos[];
  };
}

export interface ButtonState extends InteractableState {
  type: 'button';
  state: {
    pressed: boolean;
    momentary: boolean;  // Returns to unpressed when released
    cooldown: number;    // Remaining cooldown in ms
  };
}

export interface HazardState extends InteractableState {
  type: 'hazard';
  state: {
    active: boolean;
    hazardType: 'laser' | 'spikes' | 'electric';
    cycleTime?: number;  // For cycling hazards
    cycleOffset?: number;
  };
}

// ============================================
// Ping/Marker System
// ============================================

export type PingType =
  | 'look'      // Generic attention
  | 'go'        // Go here
  | 'wait'      // Wait/stop
  | 'interact'  // Interact with this
  | 'danger';   // Hazard warning

export interface PingMarker {
  id: string;
  position: WorldPos;
  type: PingType;
  createdBy: Role;
  createdAt: number;  // Timestamp
  expiresAt: number;  // Timestamp
}

// ============================================
// Room/Session State
// ============================================

export type RoomStatus =
  | 'waiting'     // Waiting for second player
  | 'ready'       // Both players connected
  | 'playing'     // Game in progress
  | 'paused'      // Game paused
  | 'completed';  // Level completed

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  levelId: string;
  players: {
    dog?: PlayerInfo;
    panda?: PlayerInfo;
  };
  createdAt: number;
}

export interface PlayerInfo {
  id: string;
  role: Role;
  connected: boolean;
  lastSeen: number;  // Timestamp for reconnection handling
}

// ============================================
// Game State (Full Snapshot)
// ============================================

export interface GameState {
  tick: number;
  timestamp: number;
  entities: EntityState[];
  interactables: InteractableState[];
  pings: PingMarker[];
  puzzleStates: PuzzleState[];
}

export interface PuzzleState {
  id: string;
  name: string;
  completed: boolean;
  objectives: ObjectiveState[];
}

export interface ObjectiveState {
  id: string;
  description: string;
  completed: boolean;
  optional: boolean;
}

// ============================================
// Level Definition
// ============================================

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileData[][];
  spawns: {
    dog: WorldPos;
    panda: WorldPos;
  };
  interactables: InteractableConfig[];
  puzzles: PuzzleConfig[];
  cameraNodes?: CameraNodeConfig[];
}

export interface TileData {
  type: TileType;
  elevation: number;
  walkable: boolean;
}

export type TileType =
  | 'ground'
  | 'grass'
  | 'stone'
  | 'water'
  | 'wall'
  | 'bridge'
  | 'void';

export interface InteractableConfig {
  id: string;
  type: InteractableType;
  position: WorldPos;
  initialState: Record<string, unknown>;
  linkedIds?: string[];
}

export interface PuzzleConfig {
  id: string;
  name: string;
  description: string;
  objectives: {
    id: string;
    description: string;
    condition: PuzzleCondition;
    optional?: boolean;
  }[];
  completionReward?: string;  // ID of thing to unlock
}

export interface PuzzleCondition {
  type: 'interactable_state' | 'both_players_in_zone' | 'all_objectives';
  targetId?: string;
  state?: Record<string, unknown>;
  zoneMin?: WorldPos;
  zoneMax?: WorldPos;
}

export interface CameraNodeConfig {
  id: string;
  position: WorldPos;
  defaultRotation: number;
  minRotation: number;
  maxRotation: number;
  viewRadius: number;
}
