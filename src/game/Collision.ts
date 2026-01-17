/* ============================================
   SHADOW NINJA - Collision System
   Handles elevation-aware collision detection
   ============================================ */

import type { WorldPos, Vec2, TileData } from '../engine/types';
import { Tilemap } from '../engine/Tilemap';

export interface CollisionResult {
  position: WorldPos;
  grounded: boolean;
  groundElevation: number;
  hitWall: boolean;
  canClimb: boolean;
  climbTarget: WorldPos | null;
}

export interface CollisionBox {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

const STEP_HEIGHT = 0.3; // Max height difference player can step up
const COLLISION_RADIUS = 0.35; // Player collision radius in tiles

export class CollisionSystem {
  private tilemap: Tilemap;

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
  }

  /**
   * Resolve movement with elevation-aware collision
   */
  resolveMovement(
    currentPos: WorldPos,
    velocity: Vec2,
    deltaTime: number
  ): CollisionResult {
    const result: CollisionResult = {
      position: { ...currentPos },
      grounded: false,
      groundElevation: 0,
      hitWall: false,
      canClimb: false,
      climbTarget: null,
    };

    // Calculate desired position
    const desiredX = currentPos.x + velocity.x * deltaTime;
    const desiredY = currentPos.y + velocity.y * deltaTime;

    // Try full movement first
    const fullMove = this.tryMove(currentPos, desiredX, desiredY);

    if (fullMove.valid) {
      result.position.x = desiredX;
      result.position.y = desiredY;
      result.groundElevation = fullMove.elevation;
      result.grounded = true;
    } else {
      // Try sliding along X axis
      const xMove = this.tryMove(currentPos, desiredX, currentPos.y);
      if (xMove.valid) {
        result.position.x = desiredX;
        result.groundElevation = xMove.elevation;
      }

      // Try sliding along Y axis
      const yMove = this.tryMove(
        { ...currentPos, x: result.position.x },
        result.position.x,
        desiredY
      );
      if (yMove.valid) {
        result.position.y = desiredY;
        result.groundElevation = Math.max(result.groundElevation, yMove.elevation);
      }

      result.hitWall = !xMove.valid || !yMove.valid;
      result.grounded = xMove.valid || yMove.valid;

      // Check for climbable surface when hitting wall
      if (result.hitWall) {
        const climbCheck = this.checkClimbable(currentPos, velocity);
        result.canClimb = climbCheck.canClimb;
        result.climbTarget = climbCheck.target;
      }
    }

    // Get ground elevation at final position
    const groundTile = this.tilemap.getTileAtWorld(result.position);
    if (groundTile) {
      result.groundElevation = groundTile.elevation;
      // Only grounded if player's Z is at or below ground level
      result.grounded = result.position.z <= groundTile.elevation + 0.01;
    }

    return result;
  }

  /**
   * Try moving to a position, checking if it's valid
   */
  private tryMove(
    from: WorldPos,
    toX: number,
    toY: number
  ): { valid: boolean; elevation: number } {
    // Check corners of collision box
    const offsets = [
      { x: -COLLISION_RADIUS, y: -COLLISION_RADIUS },
      { x: COLLISION_RADIUS, y: -COLLISION_RADIUS },
      { x: -COLLISION_RADIUS, y: COLLISION_RADIUS },
      { x: COLLISION_RADIUS, y: COLLISION_RADIUS },
      { x: 0, y: 0 }, // Center
    ];

    let maxElevation = 0;
    let minElevation = Infinity;

    for (const offset of offsets) {
      const checkX = toX + offset.x;
      const checkY = toY + offset.y;
      const tile = this.tilemap.getTileAtWorld({ x: checkX, y: checkY, z: from.z });

      if (!tile) {
        return { valid: false, elevation: 0 };
      }

      if (!tile.walkable) {
        // Non-walkable tiles always block movement
        return { valid: false, elevation: tile.elevation };
      }

      // Check if elevation change is too steep for walkable tiles
      const heightDiff = tile.elevation - from.z;
      if (heightDiff > STEP_HEIGHT) {
        return { valid: false, elevation: tile.elevation };
      }

      maxElevation = Math.max(maxElevation, tile.elevation);
      minElevation = Math.min(minElevation, tile.elevation);
    }

    // Check if elevation change is too steep
    if (maxElevation - from.z > STEP_HEIGHT && minElevation < from.z) {
      return { valid: false, elevation: maxElevation };
    }

    return { valid: true, elevation: maxElevation };
  }

  /**
   * Check if there's a climbable surface in the movement direction
   */
  private checkClimbable(
    pos: WorldPos,
    velocity: Vec2
  ): { canClimb: boolean; target: WorldPos | null } {
    if (Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01) {
      return { canClimb: false, target: null };
    }

    // Normalize direction
    const len = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    const dirX = velocity.x / len;
    const dirY = velocity.y / len;

    // Check tile in movement direction
    const checkX = pos.x + dirX * 0.8;
    const checkY = pos.y + dirY * 0.8;
    const targetTile = this.tilemap.getTileAtWorld({ x: checkX, y: checkY, z: pos.z });

    if (!targetTile) {
      return { canClimb: false, target: null };
    }

    // Check if tile is climbable
    if (targetTile.climbable) {
      return {
        canClimb: true,
        target: {
          x: Math.floor(checkX) + 0.5,
          y: Math.floor(checkY) + 0.5,
          z: targetTile.elevation,
        },
      };
    }

    // Check for ledge grab (elevated walkable tile)
    const heightDiff = targetTile.elevation - pos.z;
    if (targetTile.walkable && heightDiff > STEP_HEIGHT && heightDiff <= 1.5) {
      return {
        canClimb: true,
        target: {
          x: Math.floor(checkX) + 0.5,
          y: Math.floor(checkY) + 0.5,
          z: targetTile.elevation,
        },
      };
    }

    return { canClimb: false, target: null };
  }

  /**
   * Check if a position is inside a hiding spot
   */
  isInHidingSpot(pos: WorldPos): boolean {
    const tile = this.tilemap.getTileAtWorld(pos);
    return tile?.hidingSpot ?? false;
  }

  /**
   * Check if an entity can move from one position to another
   * Used for enemy movement validation
   */
  canMoveTo(from: WorldPos, toX: number, toY: number): boolean {
    const result = this.tryMove(from, toX, toY);
    return result.valid;
  }

  /**
   * Get ground elevation at a position
   */
  getGroundElevation(pos: WorldPos): number {
    const tile = this.tilemap.getTileAtWorld(pos);
    return tile?.elevation ?? 0;
  }

  /**
   * Get all tiles within a radius (for area checks)
   */
  getTilesInRadius(center: WorldPos, radius: number): TileData[] {
    const tiles: TileData[] = [];
    const minCol = Math.floor(center.x - radius);
    const maxCol = Math.ceil(center.x + radius);
    const minRow = Math.floor(center.y - radius);
    const maxRow = Math.ceil(center.y + radius);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const tile = this.tilemap.getTile(col, row);
        if (tile) {
          const dx = col + 0.5 - center.x;
          const dy = row + 0.5 - center.y;
          if (dx * dx + dy * dy <= radius * radius) {
            tiles.push(tile);
          }
        }
      }
    }

    return tiles;
  }

  /**
   * Ray cast for line of sight checks
   */
  raycast(
    from: WorldPos,
    to: WorldPos,
    maxDistance: number = 20
  ): { hit: boolean; distance: number; tile: TileData | null } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDistance) {
      return { hit: false, distance: maxDistance, tile: null };
    }

    const steps = Math.ceil(dist * 4); // 4 checks per tile
    const stepX = dx / steps;
    const stepY = dy / steps;

    for (let i = 1; i <= steps; i++) {
      const checkX = from.x + stepX * i;
      const checkY = from.y + stepY * i;
      const tile = this.tilemap.getTileAtWorld({ x: checkX, y: checkY, z: from.z });

      if (!tile || tile.occluder) {
        return {
          hit: true,
          distance: (i / steps) * dist,
          tile,
        };
      }
    }

    return { hit: false, distance: dist, tile: null };
  }
}
