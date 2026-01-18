/* ============================================
   SHADOW NINJA - Oni Enemy
   Slow, powerful demon with high health
   ============================================ */

import { Enemy, EnemyConfig, PatrolPoint } from './Enemy';
import { Entity } from './Entity';
import { createCharacterShape } from '../engine/ShapeRenderer';
import { KNOCKBACK_FORCE } from '../engine/constants';
import type { Vec2 } from '../engine/types';

const ONI_ATTACK_RANGE = 1.8;
const ONI_ATTACK_DAMAGE = 40;
const ONI_ATTACK_COOLDOWN = 1200; // Heavy hits

export interface OniAttackEvent {
  position: { x: number; y: number; z: number };
  direction: Vec2;
}

export class Oni extends Enemy {
  private attackCooldown: number = 0;
  private characterSprite: ReturnType<typeof createCharacterShape>;

  onAttack: ((event: OniAttackEvent) => void) | null = null;

  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 6; // Slow, heavy steps
  private walkBobHeight: number = 3;

  constructor(x: number, y: number, patrolPoints?: PatrolPoint[]) {
    const config: EnemyConfig = {
      x,
      y,
      type: 'guard',
      health: 120, // Very high health
      patrolPoints,
      visionRange: 9, // Excellent vision range
      visionAngle: Math.PI / 3, // 60 degrees
    };
    super(config);

    // Override speed - Oni are moderately slow but relentless
    this.moveSpeed = 2.5;

    // Create Oni visual - red/crimson color, larger
    this.characterSprite = createCharacterShape(0xc62828, 1.3, 'guard');
    this.container.addChild(this.characterSprite);
  }

  update(deltaTime: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime * 1000;
    }
    super.update(deltaTime);
  }

  attack(target: Entity): void {
    if (this.attackCooldown > 0) return;

    this.attackCooldown = ONI_ATTACK_COOLDOWN;

    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Strong knockback
    const knockback: Vec2 = dist > 0.01
      ? { x: (dx / dist) * KNOCKBACK_FORCE * 2, y: (dy / dist) * KNOCKBACK_FORCE * 2 }
      : { x: 0, y: 0 };

    target.onHit(ONI_ATTACK_DAMAGE, knockback);
    this.playAnimation('attack', false);

    if (this.onAttack && dist > 0.01) {
      this.onAttack({
        position: { ...this.position },
        direction: { x: dx / dist, y: dy / dist },
      });
    }
  }

  getAttackRange(): number {
    return ONI_ATTACK_RANGE;
  }

  updateVisual(): void {
    let scaleX = 1;
    let scaleY = 1;
    let bobOffset = 0;
    let rotation = 0;

    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
    const isChasing = this.aiState === 'chase' || this.aiState === 'alert';

    if (isMoving) {
      const speedMult = isChasing ? 1.2 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult;

      // Heavy, stomping movement
      bobOffset = Math.abs(Math.sin(this.walkAnimTime)) * this.walkBobHeight;

      // Ground shake effect - quick squash on each step
      const step = Math.sin(this.walkAnimTime);
      if (step > 0.9) {
        scaleY = 0.92;
        scaleX = 1.08;
      }

      // Slight sway
      rotation = Math.sin(this.walkAnimTime * 0.5) * 0.04;
    } else {
      this.walkAnimTime = 0;
    }

    // Attack windup - pull back then lunge
    if (this.attackCooldown > ONI_ATTACK_COOLDOWN - 300) {
      const t = (this.attackCooldown - (ONI_ATTACK_COOLDOWN - 300)) / 300;
      if (t > 0.5) {
        // Windup
        scaleY = 1.1;
        scaleX = 0.9;
      } else {
        // Smash
        scaleY = 0.85;
        scaleX = 1.2;
      }
      rotation = Math.sin(Date.now() * 0.02) * 0.15;
    }

    // Rage glow when chasing
    if (isChasing && !isMoving) {
      // Breathing/pulsing when alert
      const pulse = Math.sin(Date.now() * 0.008) * 0.05;
      scaleX = 1.05 + pulse;
      scaleY = 1.05 - pulse;
    }

    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }
}
