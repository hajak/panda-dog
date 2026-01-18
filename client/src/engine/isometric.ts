/* ============================================
   SHADOW NINJA - Isometric Utilities
   ============================================ */

import { TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH } from './constants';
import type { WorldPos, ScreenPos, GridPos, Vec2 } from './types';

/**
 * Convert world coordinates to screen (isometric) coordinates
 */
export function worldToScreen(world: WorldPos): ScreenPos {
  return {
    x: (world.x - world.y) * (TILE_WIDTH / 2),
    y: (world.x + world.y) * (TILE_HEIGHT / 2) - world.z * TILE_DEPTH,
  };
}

/**
 * Convert screen coordinates to world coordinates (assuming z = 0)
 */
export function screenToWorld(screen: ScreenPos, z: number = 0): WorldPos {
  const adjustedY = screen.y + z * TILE_DEPTH;
  return {
    x: (screen.x / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2,
    y: (adjustedY / (TILE_HEIGHT / 2) - screen.x / (TILE_WIDTH / 2)) / 2,
    z,
  };
}

/**
 * Convert grid position to world position (center of tile)
 */
export function gridToWorld(grid: GridPos, elevation: number = 0): WorldPos {
  return {
    x: grid.col + 0.5,
    y: grid.row + 0.5,
    z: elevation,
  };
}

/**
 * Convert world position to grid position
 */
export function worldToGrid(world: WorldPos): GridPos {
  return {
    col: Math.floor(world.x),
    row: Math.floor(world.y),
  };
}

/**
 * Calculate depth sort value for an entity at given world position
 * Higher values should be rendered later (on top)
 */
export function getDepthValue(world: WorldPos): number {
  return world.x + world.y + world.z * 0.01;
}

/**
 * Calculate the screen Y position for sorting (accounts for elevation)
 */
export function getSortY(world: WorldPos): number {
  const screen = worldToScreen(world);
  return screen.y;
}

/**
 * Get direction vector for 8-directional movement in isometric space
 */
export function getDirectionVector(direction: string): Vec2 {
  const vectors: Record<string, Vec2> = {
    N: { x: 0, y: -1 },
    NE: { x: 1, y: -1 },
    E: { x: 1, y: 0 },
    SE: { x: 1, y: 1 },
    S: { x: 0, y: 1 },
    SW: { x: -1, y: 1 },
    W: { x: -1, y: 0 },
    NW: { x: -1, y: -1 },
  };
  const vec = vectors[direction] || { x: 0, y: 0 };
  // Normalize diagonal vectors
  if (vec.x !== 0 && vec.y !== 0) {
    const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    return { x: vec.x / len, y: vec.y / len };
  }
  return vec;
}

/**
 * Get direction name from movement vector
 */
export function vectorToDirection(vec: Vec2): string | null {
  if (vec.x === 0 && vec.y === 0) return null;

  const angle = Math.atan2(vec.y, vec.x);
  const octant = Math.round((angle / Math.PI) * 4);

  const directions: Record<number, string> = {
    0: 'E',
    1: 'SE',
    2: 'S',
    3: 'SW',
    4: 'W',
    [-4]: 'W',
    [-3]: 'NW',
    [-2]: 'N',
    [-1]: 'NE',
  };

  return directions[octant] || 'E';
}

/**
 * Calculate distance between two world positions (XY plane only)
 */
export function distanceXY(a: WorldPos, b: WorldPos): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate full 3D distance between two world positions
 */
export function distance3D(a: WorldPos, b: WorldPos): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Linear interpolation for smooth movement
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a point is within a polygon (for vision cone checks)
 */
export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    if (
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Create vision cone polygon points
 */
export function createVisionCone(
  origin: Vec2,
  direction: Vec2,
  range: number,
  angle: number,
  segments: number = 8
): Vec2[] {
  const points: Vec2[] = [origin];

  const baseAngle = Math.atan2(direction.y, direction.x);
  const halfAngle = angle / 2;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const currentAngle = baseAngle - halfAngle + angle * t;
    points.push({
      x: origin.x + Math.cos(currentAngle) * range,
      y: origin.y + Math.sin(currentAngle) * range,
    });
  }

  return points;
}

/**
 * Check line of sight between two points (simplified, no obstacles)
 */
export function hasLineOfSight(
  from: WorldPos,
  to: WorldPos,
  checkTile: (col: number, row: number) => boolean
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(distance * 2);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + dx * t;
    const y = from.y + dy * t;
    if (!checkTile(Math.floor(x), Math.floor(y))) {
      return false;
    }
  }

  return true;
}
