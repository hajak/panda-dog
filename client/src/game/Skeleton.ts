/* ============================================
   SHADOW NINJA - Skeleton Enemy
   Fast, weak undead enemy that swarms
   ============================================ */

import { Enemy, EnemyConfig, PatrolPoint } from './Enemy';
import { Entity } from './Entity';
import { createCharacterShape } from '../engine/ShapeRenderer';
import { KNOCKBACK_FORCE } from '../engine/constants';
import type { Vec2 } from '../engine/types';

const SKELETON_ATTACK_RANGE = 1.2;
const SKELETON_ATTACK_DAMAGE = 15;
const SKELETON_ATTACK_COOLDOWN = 450; // Very fast attacks

export interface SkeletonAttackEvent {
  position: { x: number; y: number; z: number };
  direction: Vec2;
}

export class Skeleton extends Enemy {
  private attackCooldown: number = 0;
  private characterSprite: ReturnType<typeof createCharacterShape>;

  onAttack: ((event: SkeletonAttackEvent) => void) | null = null;

  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 14; // Fast shambling
  private walkBobHeight: number = 2;

  constructor(x: number, y: number, patrolPoints?: PatrolPoint[]) {
    const config: EnemyConfig = {
      x,
      y,
      type: 'guard',
      health: 30,
      patrolPoints,
      visionRange: 7, // Good vision
      visionAngle: Math.PI * 0.7, // 126 degrees - very wide vision
    };
    super(config);

    // Override speed - skeletons are very fast
    this.moveSpeed = 4.5;

    // Create skeleton visual
    this.characterSprite = createCharacterShape(0xb0bec5, 0.9, 'guard');
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

    this.attackCooldown = SKELETON_ATTACK_COOLDOWN;

    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const knockback: Vec2 = dist > 0.01
      ? { x: (dx / dist) * KNOCKBACK_FORCE * 0.5, y: (dy / dist) * KNOCKBACK_FORCE * 0.5 }
      : { x: 0, y: 0 };

    target.onHit(SKELETON_ATTACK_DAMAGE, knockback);
    this.playAnimation('attack', false);

    if (this.onAttack && dist > 0.01) {
      this.onAttack({
        position: { ...this.position },
        direction: { x: dx / dist, y: dy / dist },
      });
    }
  }

  getAttackRange(): number {
    return SKELETON_ATTACK_RANGE;
  }

  updateVisual(): void {
    let scaleX = 1;
    let scaleY = 1;
    let bobOffset = 0;
    let rotation = 0;

    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
    const isChasing = this.aiState === 'chase' || this.aiState === 'alert';

    if (isMoving) {
      const speedMult = isChasing ? 1.6 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult;

      // Shambling, jerky movement
      bobOffset = Math.abs(Math.sin(this.walkAnimTime)) * this.walkBobHeight * speedMult;

      // More erratic squash
      const squash = Math.sin(this.walkAnimTime * 2.5) * 0.06;
      scaleY = 1 - squash;
      scaleX = 1 + squash * 0.3;

      // Wobbly rotation
      rotation = Math.sin(this.walkAnimTime * 1.5) * 0.1 * speedMult;
    } else {
      this.walkAnimTime = 0;
    }

    // Attack flash
    if (this.attackCooldown > SKELETON_ATTACK_COOLDOWN - 150) {
      scaleX = 1.15;
      rotation = Math.sin(Date.now() * 0.05) * 0.2;
    }

    // Bone-white tint when alert
    if (isChasing) {
      this.characterSprite.tint = 0xe0e0e0;
    } else {
      this.characterSprite.tint = 0xffffff;
    }

    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }
}
