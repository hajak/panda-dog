/* ============================================
   SHADOW NINJA - Base Enemy Class
   ============================================ */

import { Graphics } from 'pixi.js';
import { Entity } from './Entity';
import { distanceXY } from '../engine/isometric';
import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VISION_RANGE,
  GUARD_VISION_ANGLE,
  SUSPICIOUS_TIMEOUT,
  ALERT_TIMEOUT,
  SEARCH_TIMEOUT,
  COLORS,
} from '../engine/constants';
import type { AIState, WorldPos, Vec2, Direction8 } from '../engine/types';

export interface PatrolPoint {
  x: number;
  y: number;
  waitTime?: number;
}

export interface EnemyConfig {
  x: number;
  y: number;
  type: 'guard' | 'archer';
  health?: number;
  patrolPoints?: PatrolPoint[];
  visionRange?: number;
  visionAngle?: number;
}

export abstract class Enemy extends Entity {
  // Stats
  health: number;
  maxHealth: number;

  // AI State
  aiState: AIState = 'patrol';
  protected stateTimer: number = 0;
  protected alertLevel: number = 0; // 0-100

  // Patrol
  protected patrolPoints: PatrolPoint[] = [];
  protected currentPatrolIndex: number = 0;
  protected waitTimer: number = 0;

  // Vision
  visionRange: number;
  visionAngle: number;
  protected visionConeGraphics: Graphics;
  protected lastKnownPlayerPos: WorldPos | null = null;

  // Target
  protected target: Entity | null = null;

  // Movement
  protected moveSpeed: number = GUARD_PATROL_SPEED;

  constructor(config: EnemyConfig) {
    super(config.x, config.y, 0);

    this.health = config.health ?? 50;
    this.maxHealth = this.health;
    this.patrolPoints = config.patrolPoints ?? [];
    this.visionRange = config.visionRange ?? GUARD_VISION_RANGE;
    this.visionAngle = config.visionAngle ?? GUARD_VISION_ANGLE;

    // Create vision cone graphics
    this.visionConeGraphics = new Graphics();
    this.visionConeGraphics.visible = false;
    this.container.addChild(this.visionConeGraphics);
  }

  /**
   * Update AI behavior
   */
  updateAI(deltaTime: number, player: Entity, canSeePlayer: boolean): void {
    this.stateTimer += deltaTime * 1000;

    // Update alert level based on player visibility
    if (canSeePlayer && !player.isHidden) {
      this.alertLevel = Math.min(100, this.alertLevel + deltaTime * 50);
    } else {
      this.alertLevel = Math.max(0, this.alertLevel - deltaTime * 10);
    }

    // State machine
    switch (this.aiState) {
      case 'idle':
        this.updateIdle(deltaTime);
        break;
      case 'patrol':
        this.updatePatrol(deltaTime);
        break;
      case 'suspicious':
        this.updateSuspicious(deltaTime, player);
        break;
      case 'alert':
        this.updateAlert(deltaTime, player);
        break;
      case 'chase':
        this.updateChase(deltaTime, player);
        break;
      case 'search':
        this.updateSearch(deltaTime);
        break;
      case 'return':
        this.updateReturn(deltaTime);
        break;
    }

    // State transitions based on alert level
    if (this.alertLevel >= 100 && this.aiState !== 'alert' && this.aiState !== 'chase') {
      this.transitionTo('alert');
    } else if (this.alertLevel >= 50 && this.aiState === 'patrol') {
      this.transitionTo('suspicious');
    }
  }

  protected transitionTo(newState: AIState): void {
    this.aiState = newState;
    this.stateTimer = 0;

    switch (newState) {
      case 'patrol':
        this.moveSpeed = GUARD_PATROL_SPEED;
        break;
      case 'chase':
      case 'alert':
        this.moveSpeed = GUARD_CHASE_SPEED;
        break;
      case 'suspicious':
      case 'search':
        this.moveSpeed = GUARD_PATROL_SPEED * 0.7;
        break;
    }
  }

  protected updateIdle(_deltaTime: number): void {
    if (this.patrolPoints.length > 0) {
      this.transitionTo('patrol');
    }
  }

  protected updatePatrol(deltaTime: number): void {
    if (this.patrolPoints.length === 0) {
      this.transitionTo('idle');
      return;
    }

    const target = this.patrolPoints[this.currentPatrolIndex];
    const distance = distanceXY(this.position, { x: target.x, y: target.y, z: 0 });

    if (distance < 0.2) {
      // Reached patrol point
      this.waitTimer += deltaTime;
      const waitTime = target.waitTime ?? 1;

      if (this.waitTimer >= waitTime) {
        this.waitTimer = 0;
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    } else {
      // Move towards patrol point
      this.moveTowards({ x: target.x, y: target.y, z: 0 }, deltaTime);
    }
  }

  protected updateSuspicious(_deltaTime: number, _player: Entity): void {
    // Look towards last known position or player
    if (this.lastKnownPlayerPos) {
      this.lookAt(this.lastKnownPlayerPos);
    }

    if (this.stateTimer > SUSPICIOUS_TIMEOUT) {
      this.transitionTo('patrol');
      this.alertLevel = 0;
    }
  }

  protected updateAlert(_deltaTime: number, player: Entity): void {
    this.lastKnownPlayerPos = { ...player.position };
    this.transitionTo('chase');
  }

  protected updateChase(deltaTime: number, player: Entity): void {
    const distance = this.distanceTo(player);

    if (distance < this.getAttackRange()) {
      // In attack range
      this.attack(player);
    } else {
      // Chase player
      this.moveTowards(player.position, deltaTime);
    }

    // Lost sight for too long
    if (this.stateTimer > ALERT_TIMEOUT && this.alertLevel < 50) {
      this.transitionTo('search');
    }
  }

  protected updateSearch(deltaTime: number): void {
    // Move towards last known position
    if (this.lastKnownPlayerPos) {
      const distance = distanceXY(this.position, this.lastKnownPlayerPos);

      if (distance < 0.5) {
        // Reached last known position, look around
        this.lastKnownPlayerPos = null;
      } else {
        this.moveTowards(this.lastKnownPlayerPos, deltaTime);
      }
    }

    if (this.stateTimer > SEARCH_TIMEOUT) {
      this.transitionTo('return');
    }
  }

  protected updateReturn(deltaTime: number): void {
    if (this.patrolPoints.length === 0) {
      this.transitionTo('idle');
      return;
    }

    const startPoint = this.patrolPoints[0];
    const distance = distanceXY(this.position, { x: startPoint.x, y: startPoint.y, z: 0 });

    if (distance < 0.3) {
      this.currentPatrolIndex = 0;
      this.transitionTo('patrol');
    } else {
      this.moveTowards({ x: startPoint.x, y: startPoint.y, z: 0 }, deltaTime);
    }
  }

  protected moveTowards(target: WorldPos, deltaTime: number): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      this.velocity.x = (dx / dist) * this.moveSpeed;
      this.velocity.y = (dy / dist) * this.moveSpeed;
      this.updateFacing();
    } else {
      this.velocity.x = 0;
      this.velocity.y = 0;
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  protected lookAt(target: WorldPos): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;

    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

    const angle = Math.atan2(dy, dx);
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
   * Check if enemy can see the player
   */
  canSee(player: Entity, checkLineOfSight: (from: WorldPos, to: WorldPos) => boolean): boolean {
    if (player.isHidden) return false;

    const distance = this.distanceTo(player);
    if (distance > this.visionRange) return false;

    // Check if player is in vision cone
    const directionVec = this.getDirectionVector();
    const toPlayer = {
      x: player.position.x - this.position.x,
      y: player.position.y - this.position.y,
    };

    // Normalize
    const len = Math.sqrt(toPlayer.x * toPlayer.x + toPlayer.y * toPlayer.y);
    if (len < 0.01) return true;

    toPlayer.x /= len;
    toPlayer.y /= len;

    // Dot product to get angle
    const dot = directionVec.x * toPlayer.x + directionVec.y * toPlayer.y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle > this.visionAngle / 2) return false;

    // Check line of sight
    return checkLineOfSight(this.position, player.position);
  }

  protected getDirectionVector(): Vec2 {
    const directions: Record<Direction8, Vec2> = {
      N: { x: 0, y: -1 },
      NE: { x: 0.707, y: -0.707 },
      E: { x: 1, y: 0 },
      SE: { x: 0.707, y: 0.707 },
      S: { x: 0, y: 1 },
      SW: { x: -0.707, y: 0.707 },
      W: { x: -1, y: 0 },
      NW: { x: -0.707, y: -0.707 },
    };
    return directions[this.facing] || { x: 0, y: 1 };
  }

  /**
   * React to noise
   */
  hearNoise(position: WorldPos, radius: number): void {
    const distance = distanceXY(this.position, position);
    if (distance <= radius) {
      this.lastKnownPlayerPos = position;
      this.alertLevel = Math.min(100, this.alertLevel + 30);

      if (this.aiState === 'patrol' || this.aiState === 'idle') {
        this.transitionTo('suspicious');
      }
    }
  }

  /**
   * Update vision cone visual
   */
  updateVisionConeVisual(show: boolean): void {
    this.visionConeGraphics.visible = show;

    if (show) {
      this.visionConeGraphics.clear();

      const state = this.aiState === 'alert' || this.aiState === 'chase'
        ? 'alert'
        : this.aiState === 'suspicious'
        ? 'suspicious'
        : 'calm';

      const colors = {
        calm: COLORS.VISION_CONE_CALM,
        suspicious: COLORS.VISION_CONE_SUSPICIOUS,
        alert: COLORS.VISION_CONE_ALERT,
      };

      const color = colors[state];
      const dir = this.getDirectionVector();
      const range = this.visionRange * 32; // Convert to pixels

      // Draw cone
      this.visionConeGraphics.moveTo(0, 0);

      const segments = 12;
      const halfAngle = this.visionAngle / 2;
      const baseAngle = Math.atan2(dir.y, dir.x);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const angle = baseAngle - halfAngle + this.visionAngle * t;
        const x = Math.cos(angle) * range;
        const y = Math.sin(angle) * range * 0.5; // Flatten for isometric
        this.visionConeGraphics.lineTo(x, y);
      }

      this.visionConeGraphics.closePath();
      this.visionConeGraphics.fill({ color, alpha: 0.15 });
      this.visionConeGraphics.stroke({ color, width: 1, alpha: 0.4 });
    }
  }

  abstract attack(target: Entity): void;
  abstract getAttackRange(): number;

  onHit(damage: number, knockback: Vec2): void {
    this.health -= damage;

    // Store knockback for collision-checked application
    this.pendingKnockback = {
      x: knockback.x * 0.1,
      y: knockback.y * 0.1,
    };

    // Become alert
    this.alertLevel = 100;
    this.transitionTo('alert');

    if (this.health <= 0) {
      this.onDeath();
    }
  }

  // Pending knockback to be applied with collision checking
  pendingKnockback: Vec2 | null = null;

  /**
   * Apply pending knockback with collision validation
   * Called by GameScene after collision system is available
   */
  applyKnockback(canMoveTo: (from: { x: number; y: number; z: number }, toX: number, toY: number) => boolean): void {
    if (!this.pendingKnockback) return;

    const newX = this.position.x + this.pendingKnockback.x;
    const newY = this.position.y + this.pendingKnockback.y;

    // Only apply knockback if the destination is valid
    if (canMoveTo(this.position, newX, newY)) {
      this.position.x = newX;
      this.position.y = newY;
    } else {
      // Try partial knockback (half distance)
      const halfX = this.position.x + this.pendingKnockback.x * 0.5;
      const halfY = this.position.y + this.pendingKnockback.y * 0.5;
      if (canMoveTo(this.position, halfX, halfY)) {
        this.position.x = halfX;
        this.position.y = halfY;
      }
      // If still invalid, don't apply any knockback
    }

    this.pendingKnockback = null;
  }

  update(deltaTime: number): void {
    this.updateAnimation(deltaTime);
    this.updateVisual();
    this.updateVisualPosition();
  }
}
