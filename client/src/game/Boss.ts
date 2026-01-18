/* ============================================
   SHADOW NINJA - Shogun Boss
   Final boss with shuriken attacks and dynamic movement
   ============================================ */

import { Enemy, EnemyConfig, PatrolPoint } from './Enemy';
import { Entity } from './Entity';
import { createCharacterShape } from '../engine/ShapeRenderer';
import { KNOCKBACK_FORCE } from '../engine/constants';
import type { Vec2, WorldPos } from '../engine/types';

const BOSS_ATTACK_RANGE = 2.0;
const BOSS_MELEE_DAMAGE = 30;
const BOSS_ATTACK_COOLDOWN = 900;
const BOSS_CHARGE_COOLDOWN = 4000;
const BOSS_CHARGE_SPEED = 10;
const BOSS_SHURIKEN_COOLDOWN = 2500;
const BOSS_SHURIKEN_DAMAGE = 20;
const BOSS_DODGE_COOLDOWN = 3000;

type BossPhase = 'patrol' | 'combat' | 'enraged';

export interface BossAttackEvent {
  position: WorldPos;
  direction: Vec2;
  type: 'melee' | 'charge' | 'shuriken';
}

export interface BossShurikenEvent {
  position: WorldPos;
  direction: Vec2;
  speed: number;
  damage: number;
  owner: string;
}

export class Boss extends Enemy {
  private attackCooldown: number = 0;
  private chargeCooldown: number = 2000;
  private shurikenCooldown: number = 1000;
  private dodgeCooldown: number = 0;
  private characterSprite: ReturnType<typeof createCharacterShape>;
  private phase: BossPhase = 'patrol';
  private isCharging: boolean = false;
  private chargeDirection: Vec2 = { x: 0, y: 0 };
  private chargeTime: number = 0;
  private strafeDirection: number = 1;
  private strafeTimer: number = 0;

  onAttack: ((event: BossAttackEvent) => void) | null = null;
  onSpawnShuriken: ((event: BossShurikenEvent) => void) | null = null;

  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 10;
  private walkBobHeight: number = 2;

  constructor(x: number, y: number, patrolPoints?: PatrolPoint[]) {
    const config: EnemyConfig = {
      x,
      y,
      type: 'guard',
      health: 300, // Boss health!
      patrolPoints,
      visionRange: 12, // Can see very far
      visionAngle: Math.PI / 2, // Wide angle
    };
    super(config);

    this.moveSpeed = 3.5;

    // Create Boss visual - gold/black color, very large
    this.characterSprite = createCharacterShape(0xffd700, 1.6, 'guard');
    this.container.addChild(this.characterSprite);
  }

  update(deltaTime: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime * 1000;
    }
    if (this.chargeCooldown > 0) {
      this.chargeCooldown -= deltaTime * 1000;
    }
    if (this.shurikenCooldown > 0) {
      this.shurikenCooldown -= deltaTime * 1000;
    }
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= deltaTime * 1000;
    }

    // Strafe timer for movement variation
    this.strafeTimer += deltaTime;
    if (this.strafeTimer > 2) {
      this.strafeTimer = 0;
      this.strafeDirection *= -1; // Change strafe direction
    }

    // Handle charging
    if (this.isCharging) {
      this.chargeTime -= deltaTime;
      if (this.chargeTime <= 0) {
        this.isCharging = false;
        this.velocity.x = 0;
        this.velocity.y = 0;
      } else {
        this.velocity.x = this.chargeDirection.x * BOSS_CHARGE_SPEED;
        this.velocity.y = this.chargeDirection.y * BOSS_CHARGE_SPEED;
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
      }
    }

    // Phase transitions based on health
    const healthPercent = this.health / this.maxHealth;
    if (healthPercent < 0.3) {
      this.phase = 'enraged';
      this.moveSpeed = 5; // Very fast when enraged
    } else if (healthPercent < 0.6) {
      this.phase = 'combat';
      this.moveSpeed = 4;
    }

    super.update(deltaTime);
  }

  attack(target: Entity): void {
    if (this.isCharging) return;

    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const normalizedDir = dist > 0.01 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 1 };

    // Throw shuriken at medium-long range
    if (this.shurikenCooldown <= 0 && dist > 3 && dist < 10) {
      this.throwShuriken(target, normalizedDir);
      return;
    }

    // Try charge attack if ready and at good range
    if (this.chargeCooldown <= 0 && dist > 4 && dist < 9) {
      this.startCharge(target);
      return;
    }

    if (this.attackCooldown > 0) return;

    // Melee attack when close
    if (dist <= BOSS_ATTACK_RANGE) {
      const cooldownMod = this.phase === 'enraged' ? 0.5 : 1;
      this.attackCooldown = BOSS_ATTACK_COOLDOWN * cooldownMod;

      const knockback: Vec2 = {
        x: normalizedDir.x * KNOCKBACK_FORCE * 2,
        y: normalizedDir.y * KNOCKBACK_FORCE * 2,
      };

      const damage = this.phase === 'enraged' ? BOSS_MELEE_DAMAGE * 1.5 : BOSS_MELEE_DAMAGE;
      target.onHit(damage, knockback);
      this.playAnimation('attack', false);

      if (this.onAttack) {
        this.onAttack({
          position: { ...this.position },
          direction: normalizedDir,
          type: 'melee',
        });
      }
    }
  }

  private throwShuriken(_target: Entity, direction: Vec2): void {
    const cooldownMod = this.phase === 'enraged' ? 0.4 : this.phase === 'combat' ? 0.7 : 1;
    this.shurikenCooldown = BOSS_SHURIKEN_COOLDOWN * cooldownMod;

    // Throw multiple shurikens when enraged
    const shurikenCount = this.phase === 'enraged' ? 3 : this.phase === 'combat' ? 2 : 1;
    const spreadAngle = Math.PI / 12; // 15 degree spread

    for (let i = 0; i < shurikenCount; i++) {
      const angleOffset = (i - (shurikenCount - 1) / 2) * spreadAngle;
      const cos = Math.cos(angleOffset);
      const sin = Math.sin(angleOffset);
      const rotatedDir = {
        x: direction.x * cos - direction.y * sin,
        y: direction.x * sin + direction.y * cos,
      };

      if (this.onSpawnShuriken) {
        this.onSpawnShuriken({
          position: {
            x: this.position.x + rotatedDir.x * 0.5,
            y: this.position.y + rotatedDir.y * 0.5,
            z: this.position.z + 0.5,
          },
          direction: rotatedDir,
          speed: 10,
          damage: BOSS_SHURIKEN_DAMAGE,
          owner: this.id,
        });
      }
    }

    if (this.onAttack) {
      this.onAttack({
        position: { ...this.position },
        direction,
        type: 'shuriken',
      });
    }
  }

  private startCharge(target: Entity): void {
    const dx = target.position.x - this.position.x;
    const dy = target.position.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.01) return;

    this.isCharging = true;
    this.chargeTime = 0.6;
    this.chargeDirection = { x: dx / dist, y: dy / dist };

    const chargeCooldownMod = this.phase === 'enraged' ? 0.4 : 1;
    this.chargeCooldown = BOSS_CHARGE_COOLDOWN * chargeCooldownMod;

    if (this.onAttack) {
      this.onAttack({
        position: { ...this.position },
        direction: this.chargeDirection,
        type: 'charge',
      });
    }
  }

  // Override chase to add strafing movement
  protected updateChase(deltaTime: number, player: Entity): void {
    const distance = this.distanceTo(player);

    if (distance < this.getAttackRange()) {
      this.attack(player);
    } else {
      // Move toward player but with strafing
      const dx = player.position.x - this.position.x;
      const dy = player.position.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0.01) {
        // Direct movement toward player
        let moveX = (dx / dist) * this.moveSpeed;
        let moveY = (dy / dist) * this.moveSpeed;

        // Add perpendicular strafing when at medium range
        if (distance > 3 && distance < 8) {
          const perpX = -dy / dist;
          const perpY = dx / dist;
          const strafeAmount = this.strafeDirection * this.moveSpeed * 0.5;
          moveX += perpX * strafeAmount;
          moveY += perpY * strafeAmount;
        }

        this.velocity.x = moveX;
        this.velocity.y = moveY;
        this.updateFacing();
      }

      this.position.x += this.velocity.x * deltaTime;
      this.position.y += this.velocity.y * deltaTime;
    }
  }

  getAttackRange(): number {
    return this.isCharging ? 1.5 : BOSS_ATTACK_RANGE;
  }

  onHit(damage: number, knockback: Vec2): void {
    // Boss takes minimal knockback
    super.onHit(damage, { x: knockback.x * 0.2, y: knockback.y * 0.2 });

    // Interrupt charge if hit hard
    if (damage > 20 && this.isCharging) {
      this.isCharging = false;
    }

    // Chance to dodge-strafe after being hit
    if (this.dodgeCooldown <= 0 && Math.random() < 0.4) {
      this.dodgeCooldown = BOSS_DODGE_COOLDOWN;
      this.strafeDirection *= -1;
    }
  }

  updateVisual(): void {
    let scaleX = 1;
    let scaleY = 1;
    let bobOffset = 0;
    let rotation = 0;

    const isMoving = Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.y) > 0.1;
    const isChasing = this.aiState === 'chase' || this.aiState === 'alert';

    if (this.isCharging) {
      // Charging animation - stretched forward
      scaleX = 1.35;
      scaleY = 0.8;
      rotation = Math.atan2(this.chargeDirection.y, this.chargeDirection.x) * 0.15;
      this.characterSprite.tint = 0xff4444;
    } else if (isMoving) {
      const speedMult = isChasing ? 1.4 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult;

      bobOffset = Math.sin(this.walkAnimTime) * this.walkBobHeight;

      const squash = Math.sin(this.walkAnimTime * 2) * 0.05;
      scaleY = 1 - squash;
      scaleX = 1 + squash * 0.4;

      rotation = Math.sin(this.walkAnimTime) * 0.06;

      // Color based on phase
      if (this.phase === 'enraged') {
        this.characterSprite.tint = 0xff4400;
      } else if (this.phase === 'combat') {
        this.characterSprite.tint = 0xffaa00;
      } else {
        this.characterSprite.tint = 0xffd700;
      }
    } else {
      this.walkAnimTime = 0;

      // Menacing idle
      if (isChasing) {
        const breathe = Math.sin(Date.now() * 0.005) * 0.05;
        scaleY = 1.05 + breathe;
        scaleX = 1.05 - breathe * 0.5;
      }

      // Color based on phase
      if (this.phase === 'enraged') {
        this.characterSprite.tint = 0xff2200;
        const pulse = Math.sin(Date.now() * 0.015) * 0.3 + 0.7;
        this.characterSprite.alpha = pulse;
      } else {
        this.characterSprite.tint = 0xffd700;
        this.characterSprite.alpha = 1;
      }
    }

    // Attack animation
    if (this.attackCooldown > BOSS_ATTACK_COOLDOWN * 0.6) {
      scaleX = 1.25;
      scaleY = 0.85;
      rotation += Math.sin(Date.now() * 0.04) * 0.12;
    }

    // Shuriken throw animation
    if (this.shurikenCooldown > BOSS_SHURIKEN_COOLDOWN * 0.8) {
      rotation += Math.sin(Date.now() * 0.05) * 0.15;
      scaleX = 1.1;
    }

    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }
}
