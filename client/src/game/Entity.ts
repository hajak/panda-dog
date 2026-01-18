/* ============================================
   SHADOW NINJA - Base Entity Class
   ============================================ */

import { Container } from 'pixi.js';
import { worldToScreen, getDepthValue } from '../engine/isometric';
import type { WorldPos, Vec2, AnimationState, Direction8 } from '../engine/types';

let entityIdCounter = 0;

export abstract class Entity {
  readonly id: string;

  // Position (world coordinates)
  position: WorldPos;
  previousPosition: WorldPos;

  // Velocity (world units per second)
  velocity: Vec2 = { x: 0, y: 0 };
  verticalVelocity: number = 0;

  // Physics
  isGrounded: boolean = true;
  groundElevation: number = 0;

  // Visual
  container: Container;
  facing: Direction8 = 'S';
  animation: AnimationState;

  // State
  active: boolean = true;
  visible: boolean = true;
  isHidden: boolean = false;

  constructor(x: number, y: number, z: number = 0) {
    this.id = `entity_${entityIdCounter++}`;
    this.position = { x, y, z };
    this.previousPosition = { x, y, z };
    this.container = new Container();
    this.animation = {
      name: 'idle',
      frame: 0,
      time: 0,
      loop: true,
      finished: false,
    };
    this.updateVisualPosition();
  }

  /**
   * Update entity state - called every frame
   */
  abstract update(deltaTime: number): void;

  /**
   * Update visual representation
   */
  abstract updateVisual(): void;

  /**
   * Called when entity takes damage
   */
  onHit(_damage: number, _knockback: Vec2): void {
    // Override in subclasses
  }

  /**
   * Called when entity dies
   */
  onDeath(): void {
    this.active = false;
  }

  /**
   * Store current position as previous (for interpolation)
   */
  storePreviousPosition(): void {
    this.previousPosition = { ...this.position };
  }

  /**
   * Update container position to match world position
   */
  updateVisualPosition(): void {
    const screen = worldToScreen(this.position);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = getDepthValue(this.position);
    this.container.visible = this.visible && this.active;
  }

  /**
   * Get interpolated position for smooth rendering
   */
  getInterpolatedPosition(alpha: number): WorldPos {
    return {
      x: this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha,
      y: this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha,
      z: this.previousPosition.z + (this.position.z - this.previousPosition.z) * alpha,
    };
  }

  /**
   * Set facing direction based on velocity
   */
  updateFacing(): void {
    if (Math.abs(this.velocity.x) < 0.01 && Math.abs(this.velocity.y) < 0.01) {
      return;
    }

    const angle = Math.atan2(this.velocity.y, this.velocity.x);
    const octant = Math.round((angle / Math.PI) * 4);

    const directions: Record<number, Direction8> = {
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

    this.facing = directions[octant] || 'S';
  }

  /**
   * Play animation
   */
  playAnimation(name: string, loop: boolean = true): void {
    if (this.animation.name === name && !this.animation.finished) {
      return;
    }

    this.animation = {
      name,
      frame: 0,
      time: 0,
      loop,
      finished: false,
    };
  }

  /**
   * Update animation timer
   */
  updateAnimation(deltaTime: number, frameRate: number = 12): void {
    if (this.animation.finished) return;

    this.animation.time += deltaTime;
    const frameDuration = 1 / frameRate;

    if (this.animation.time >= frameDuration) {
      this.animation.time -= frameDuration;
      this.animation.frame++;

      // Animation completion logic would go here
      // For now, just loop or mark as finished
      if (!this.animation.loop) {
        // Would check against frame count
        // this.animation.finished = true;
      }
    }
  }

  /**
   * Get distance to another entity
   */
  distanceTo(other: Entity): number {
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get direction to another entity
   */
  directionTo(other: Entity): Vec2 {
    const dx = other.position.x - this.position.x;
    const dy = other.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.001) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
  }

  /**
   * Check if entity is within range
   */
  isInRange(other: Entity, range: number): boolean {
    return this.distanceTo(other) <= range;
  }

  /**
   * Destroy entity and clean up
   */
  destroy(): void {
    this.active = false;
    this.container.destroy({ children: true });
  }
}
