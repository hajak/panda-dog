/**
 * Panda & Dog - Shared Constants
 * Game constants used by both client and server
 */

// ============================================
// Tile Dimensions (Isometric 2:1 ratio)
// ============================================

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_DEPTH = 16;

// ============================================
// World Grid
// ============================================

export const DEFAULT_GRID_WIDTH = 20;
export const DEFAULT_GRID_HEIGHT = 20;

// ============================================
// Timing
// ============================================

export const TARGET_FPS = 60;
export const FIXED_TIMESTEP = 1000 / TARGET_FPS;  // ~16.67ms
export const SERVER_TICK_RATE = 20;  // 20 Hz
export const SERVER_TICK_MS = 1000 / SERVER_TICK_RATE;  // 50ms

// ============================================
// Character Movement
// ============================================

export const DOG = {
  WALK_SPEED: 4.5,      // Tiles per second
  RUN_SPEED: 7.0,       // Tiles per second
  COLLISION_RADIUS: 0.3,
  JUMP_FORCE: 50,
  CAN_PUSH_HEAVY: false,
  WEIGHT: 'light' as const,
} as const;

export const PANDA = {
  WALK_SPEED: 2.5,      // Tiles per second
  RUN_SPEED: 4.0,       // Tiles per second
  COLLISION_RADIUS: 0.4,
  JUMP_FORCE: 35,       // Lower jump
  CAN_PUSH_HEAVY: true,
  WEIGHT: 'heavy' as const,
} as const;

// ============================================
// Physics
// ============================================

export const GRAVITY = 150;  // Tiles per second squared
export const MAX_FALL_SPEED = 20;
export const MAX_STEP_HEIGHT = 0.3;  // Max height difference to walk up

// ============================================
// Interactables
// ============================================

export const INTERACTION_RANGE = 1.5;  // Tiles

export const CRATE = {
  PUSH_SPEED: 1.5,      // Tiles per second
  PUSH_DELAY: 200,      // Ms before push starts
  WEIGHT: 'heavy' as const,
} as const;

export const WINCH = {
  OPERATE_SPEED: 0.5,   // Extension per second (0-1 range)
  REQUIRE_HOLD: true,
} as const;

export const PLATFORM = {
  DEFAULT_SPEED: 2.0,   // Tiles per second
  PAUSE_AT_ENDS: 1000,  // Ms pause at waypoint
} as const;

export const PRESSURE_PLATE = {
  ACTIVATION_DELAY: 100,    // Ms before activation
  DEACTIVATION_DELAY: 500,  // Ms before deactivation
} as const;

// ============================================
// Surveillance (Dog)
// ============================================

export const SURVEILLANCE = {
  ZOOM_OUT_FACTOR: 0.6,   // Zoom level when in surveillance mode
  CAMERA_ROTATE_SPEED: 90, // Degrees per second
  CAMERA_VIEW_RADIUS: 8,   // Tiles visible from camera node
} as const;

// ============================================
// Ping System
// ============================================

export const PING = {
  LIFETIME: 10000,        // Ms
  MAX_PER_PLAYER: 5,
  COOLDOWN: 500,          // Ms between pings
  VISIBLE_RADIUS: 100,    // Always visible in pixels
} as const;

// ============================================
// UI / Visual
// ============================================

export const CAMERA_ZOOM_LEVELS = [0.6, 0.8, 1.0, 1.2] as const;
export const DEFAULT_ZOOM_INDEX = 2;  // 1.0x
export const CAMERA_DAMPING = 0.15;

export const LAYER = {
  GROUND: 0,
  GROUND_DECOR: 1,
  SHADOWS: 2,
  ENTITIES: 3,
  EFFECTS: 4,
  INTERACTABLES: 5,
  UI_WORLD: 6,
} as const;

// ============================================
// Colors (Design Tokens)
// ============================================

export const COLORS = {
  // Characters
  DOG: 0x4a90d9,        // Blue
  DOG_DARK: 0x2a5a8a,
  PANDA: 0x333333,      // Dark gray/black
  PANDA_WHITE: 0xf5f5f5,

  // Environment
  GROUND: 0x4a5568,
  GRASS: 0x48bb78,
  STONE: 0x718096,
  WATER: 0x4299e1,
  WALL: 0x2d3748,

  // Interactables
  DOOR_CLOSED: 0x8b5a2b,
  DOOR_OPEN: 0x6b4423,
  LEVER_OFF: 0x718096,
  LEVER_ON: 0x48bb78,
  BUTTON: 0xed8936,
  BUTTON_PRESSED: 0xdd6b20,
  PLATE_INACTIVE: 0x4a5568,
  PLATE_ACTIVE: 0x48bb78,
  CRATE: 0xd69e2e,
  WINCH: 0x805ad5,
  PLATFORM: 0x667eea,
  HAZARD: 0xe53e3e,

  // Pings
  PING_LOOK: 0xffffff,
  PING_GO: 0x48bb78,
  PING_WAIT: 0xed8936,
  PING_INTERACT: 0x4299e1,
  PING_DANGER: 0xe53e3e,

  // UI
  UI_BG: 0x1a202c,
  UI_SURFACE: 0x2d3748,
  UI_BORDER: 0x4a5568,
  UI_TEXT: 0xf7fafc,
  UI_TEXT_DIM: 0xa0aec0,
  UI_ACCENT: 0x4299e1,
  UI_SUCCESS: 0x48bb78,
  UI_WARNING: 0xed8936,
  UI_ERROR: 0xe53e3e,
} as const;
