/* ============================================
   SHADOW NINJA - Engine Constants
   ============================================ */

// Tile dimensions (isometric 2:1 ratio)
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const TILE_DEPTH = 16;

// World grid size
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 20;

// Camera settings
export const CAMERA_DAMPING = 0.08;
export const CAMERA_ZOOM_LEVELS = [0.75, 1.0, 1.5] as const;
export const DEFAULT_ZOOM_INDEX = 1;

// Rendering
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const TARGET_FPS = 60;
export const FIXED_TIMESTEP = 1000 / TARGET_FPS;

// Physics
export const GRAVITY = 980; // pixels per second squared
export const MAX_FALL_SPEED = 600;

// Gameplay timing (in milliseconds)
export const JUMP_BUFFER_TIME = 150;
export const COYOTE_TIME = 100;
export const PARRY_WINDOW = 120;
export const INVULNERABILITY_DURATION = 500;
export const HIT_STUN_DURATION = 200;

// Movement speeds (tiles per second)
export const PLAYER_WALK_SPEED = 3.5;
export const PLAYER_RUN_SPEED = 6;
export const PLAYER_CLIMB_SPEED = 2;

// Combat
export const LIGHT_ATTACK_COMBO_WINDOW = 400;
export const KNOCKBACK_FORCE = 18; // Balanced knockback
export const PROJECTILE_SPEED = 500;

// AI
export const GUARD_PATROL_SPEED = 1.5; // Reduced from 2
export const GUARD_CHASE_SPEED = 3; // Reduced from 4
export const GUARD_VISION_RANGE = 6;
export const GUARD_VISION_ANGLE = Math.PI / 3; // 60 degrees
export const ARCHER_ATTACK_RANGE = 8;
export const NOISE_RADIUS_SPRINT = 3;
export const NOISE_RADIUS_JUMP = 4;
export const NOISE_RADIUS_ATTACK = 5;
export const SUSPICIOUS_TIMEOUT = 3000;
export const ALERT_TIMEOUT = 8000;
export const SEARCH_TIMEOUT = 5000;

// Lighting direction (isometric NW light source)
export const LIGHT_DIRECTION = { x: -0.5, y: -0.7, z: 0.5 };

// Colors (matching design tokens for consistency)
export const COLORS = {
  // Primary palette
  PRIMARY: 0x14b8a6,
  PRIMARY_LIGHT: 0x5eead4,

  // Environment
  GROUND_LIGHT: 0x3d5a47,
  GROUND_DARK: 0x2d4a37,
  WALL_LIGHT: 0x5a5a6a,
  WALL_DARK: 0x3a3a4a,
  WATER: 0x2a4a6a,

  // Entities
  PLAYER: 0x14b8a6,
  PLAYER_SHADOW: 0x0d4f5c,
  GUARD: 0xef4444,
  GUARD_ALERT: 0xf97316,
  ARCHER: 0x8b5cf6,

  // Projectiles
  ARROW: 0x8b6914,
  SHURIKEN: 0x9ca3af,

  // Effects
  VISION_CONE_CALM: 0x22c55e,
  VISION_CONE_SUSPICIOUS: 0xeab308,
  VISION_CONE_ALERT: 0xef4444,
  NOISE_RADIUS: 0xf97316,
  HIDE_ZONE: 0x14b8a6,
  INTERACTION: 0x5eead4,

  // UI
  HEALTH: 0xef4444,
  STAMINA: 0x14b8a6,
  SELECTION: 0xfde047,
} as const;

// Depth sorting layers
export const LAYERS = {
  GROUND: 0,
  GROUND_DECOR: 1,
  SHADOWS: 2,
  ENTITIES: 3,
  EFFECTS: 4,
  PROJECTILES: 5,
  UI_WORLD: 6,
} as const;
