/* ============================================
   SHADOW NINJA - Archer Enemy
   Ranged enemy that keeps distance
   ============================================ */

import { Enemy, EnemyConfig, PatrolPoint } from './Enemy';
import { Entity } from './Entity';
import { createCharacterShape } from '../engine/ShapeRenderer';
import { COLORS, ARCHER_ATTACK_RANGE, PROJECTILE_SPEED } from '../engine/constants';
import type { Vec2, WorldPos } from '../engine/types';

const ARCHER_ATTACK_DAMAGE = 20;
const ARCHER_ATTACK_COOLDOWN = 2500; // ms
const ARCHER_PREFERRED_DISTANCE = 5; // tiles
const ARCHER_MIN_DISTANCE = 3; // tiles

export interface ProjectileSpawnEvent {
  type: 'arrow';
  position: WorldPos;
  direction: Vec2;
  speed: number;
  damage: number;
  owner: string;
}

export class Archer extends Enemy {
  private attackCooldown: number = 0;
  private characterSprite: ReturnType<typeof createCharacterShape>;

  // Walk animation
  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 8;
  private walkBobHeight: number = 1.2;

  // Event callback for spawning projectiles
  onSpawnProjectile: ((event: ProjectileSpawnEvent) => void) | null = null;

  constructor(x: number, y: number, patrolPoints?: PatrolPoint[]) {
    const config: EnemyConfig = {
      x,
      y,
      type: 'archer',
      health: 40,
      patrolPoints,
      visionRange: ARCHER_ATTACK_RANGE,
      visionAngle: Math.PI / 4, // 45 degrees - narrower vision
    };
    super(config);

    // Create visual
    this.characterSprite = createCharacterShape(COLORS.ARCHER, 1, 'archer');
    this.container.addChild(this.characterSprite);
  }

  update(deltaTime: number): void {
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime * 1000;
    }

    super.update(deltaTime);
  }

  protected updateChase(deltaTime: number, player: Entity): void {
    const distance = this.distanceTo(player);

    // Archer tries to maintain preferred distance
    if (distance < ARCHER_MIN_DISTANCE) {
      // Too close - retreat
      this.retreatFrom(player.position, deltaTime);
    } else if (distance > ARCHER_PREFERRED_DISTANCE) {
      // Too far - approach
      this.moveTowards(player.position, deltaTime);
    } else {
      // Good distance - attack
      this.lookAt(player.position);
      this.attack(player);
    }

    // Update alert timeout
    if (this.stateTimer > 10000 && this.alertLevel < 50) {
      this.transitionTo('search');
    }
  }

  private retreatFrom(target: WorldPos, deltaTime: number): void {
    const dx = this.position.x - target.x;
    const dy = this.position.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0.01) {
      this.velocity.x = (dx / dist) * this.moveSpeed;
      this.velocity.y = (dy / dist) * this.moveSpeed;
      this.updateFacing();
    }

    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
  }

  attack(target: Entity): void {
    if (this.attackCooldown > 0) return;

    this.attackCooldown = ARCHER_ATTACK_COOLDOWN;

    // Calculate direction to target
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.01) return;

    const direction: Vec2 = { x: dx / dist, y: dy / dist };

    // Spawn projectile via callback
    if (this.onSpawnProjectile) {
      this.onSpawnProjectile({
        type: 'arrow',
        position: { ...this.position },
        direction,
        speed: PROJECTILE_SPEED,
        damage: ARCHER_ATTACK_DAMAGE,
        owner: this.id,
      });
    }

    // Play attack animation
    this.playAnimation('attack', false);
  }

  getAttackRange(): number {
    return ARCHER_ATTACK_RANGE;
  }

  updateVisual(): void {
    let alpha = 1;
    let scaleX = 1;
    let scaleY = 1;
    let bobOffset = 0;
    let rotation = 0;

    // Check if moving
    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
    const isChasing = this.aiState === 'chase' || this.aiState === 'alert';

    if (isMoving) {
      // Walking animation
      const speedMult = isChasing ? 1.3 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult;

      // Bobbing
      bobOffset = Math.sin(this.walkAnimTime) * this.walkBobHeight * speedMult;

      // Squash and stretch
      const squash = Math.sin(this.walkAnimTime * 2) * 0.03;
      scaleY = 1 - squash;
      scaleX = 1 + squash * 0.3;

      // Slight sway
      rotation = Math.sin(this.walkAnimTime) * 0.04 * speedMult;
    } else {
      this.walkAnimTime = 0;
    }

    // Flash when attacking (draw animation)
    if (this.attackCooldown > ARCHER_ATTACK_COOLDOWN - 300) {
      alpha = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
      // Pull-back pose when firing
      scaleX = 0.95;
      scaleY = 1.05;
    }

    // Alert stance when in chase but not moving
    if (isChasing && !isMoving) {
      scaleX = 1.03;
      scaleY = 1.03;
      // Subtle breathing
      const breathe = Math.sin(Date.now() * 0.004) * 0.02;
      scaleY += breathe;
    }

    this.characterSprite.alpha = alpha;
    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }
}
