/* ============================================
   SHADOW NINJA - Guard Enemy
   Melee patrol enemy with vision cone
   ============================================ */

import { Enemy, EnemyConfig, PatrolPoint } from './Enemy';
import { Entity } from './Entity';
import { createCharacterShape } from '../engine/ShapeRenderer';
import { COLORS, KNOCKBACK_FORCE } from '../engine/constants';
import type { Vec2 } from '../engine/types';

const GUARD_ATTACK_RANGE = 1.4;
const GUARD_ATTACK_DAMAGE = 20;
const GUARD_ATTACK_COOLDOWN = 800; // Fast attacks

export interface GuardAttackEvent {
  position: { x: number; y: number; z: number };
  direction: Vec2;
}

export class Guard extends Enemy {
  private attackCooldown: number = 0;
  private characterSprite: ReturnType<typeof createCharacterShape>;

  // Callback for attack visual effects
  onAttack: ((event: GuardAttackEvent) => void) | null = null;

  // Walk animation
  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 10;
  private walkBobHeight: number = 1.5;

  constructor(x: number, y: number, patrolPoints?: PatrolPoint[]) {
    const config: EnemyConfig = {
      x,
      y,
      type: 'guard',
      health: 40,
      patrolPoints,
      visionRange: 6,
      visionAngle: Math.PI / 3, // 60 degrees
    };
    super(config);

    // Create visual
    this.characterSprite = createCharacterShape(COLORS.GUARD, 1, 'guard');
    this.container.addChild(this.characterSprite);
  }

  update(deltaTime: number): void {
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime * 1000;
    }

    super.update(deltaTime);
  }

  attack(target: Entity): void {
    if (this.attackCooldown > 0) return;

    this.attackCooldown = GUARD_ATTACK_COOLDOWN;

    // Calculate knockback direction
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const knockback: Vec2 = dist > 0.01
      ? { x: (dx / dist) * KNOCKBACK_FORCE, y: (dy / dist) * KNOCKBACK_FORCE }
      : { x: 0, y: 0 };

    // Deal damage
    target.onHit(GUARD_ATTACK_DAMAGE, knockback);

    // Play attack animation
    this.playAnimation('attack', false);

    // Emit attack event for visual effects
    if (this.onAttack && dist > 0.01) {
      this.onAttack({
        position: { ...this.position },
        direction: { x: dx / dist, y: dy / dist },
      });
    }
  }

  getAttackRange(): number {
    return GUARD_ATTACK_RANGE;
  }

  updateVisual(): void {
    // Update sprite alpha based on state
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
      const speedMult = isChasing ? 1.4 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult;

      // Bobbing
      bobOffset = Math.sin(this.walkAnimTime) * this.walkBobHeight * speedMult;

      // Squash and stretch
      const squash = Math.sin(this.walkAnimTime * 2) * 0.04;
      scaleY = 1 - squash;
      scaleX = 1 + squash * 0.4;

      // Slight sway
      rotation = Math.sin(this.walkAnimTime) * 0.06 * speedMult;
    } else {
      this.walkAnimTime = 0;
    }

    // Flash when attacking
    if (this.attackCooldown > GUARD_ATTACK_COOLDOWN - 200) {
      alpha = 0.7 + Math.sin(Date.now() * 0.03) * 0.3;
      scaleX = 1.1; // Lunge forward
      rotation = this.velocity.x > 0 ? 0.1 : -0.1;
    }

    // Alert state - slightly larger, more aggressive pose
    if (isChasing && !isMoving) {
      scaleX = 1.05;
      scaleY = 1.05;
      // Breathing animation when alert
      const breathe = Math.sin(Date.now() * 0.005) * 0.03;
      scaleY += breathe;
    }

    this.characterSprite.alpha = alpha;
    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }
}
