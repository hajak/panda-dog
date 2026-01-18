/* ============================================
   SHADOW NINJA - Combat System
   Handles hit detection, damage, and combat events
   ============================================ */

import { Entity } from './Entity';
import { Player } from './Player';
import { Enemy } from './Enemy';
import type { Vec2, WorldPos } from '../engine/types';

export interface CombatEvent {
  type: 'hit' | 'block' | 'parry' | 'kill';
  attacker: Entity;
  defender: Entity;
  damage: number;
  position: WorldPos;
}

export interface AttackHitbox {
  position: WorldPos;
  range: number;
  angle: number; // Direction angle
  width: number; // Arc width in radians
  damage: number;
  knockback: number;
  owner: Entity;
}

export class CombatSystem {
  private pendingAttacks: AttackHitbox[] = [];
  private combatEvents: CombatEvent[] = [];

  registerAttack(hitbox: AttackHitbox): void {
    this.pendingAttacks.push(hitbox);
  }

  update(player: Player, enemies: Enemy[]): CombatEvent[] {
    this.combatEvents = [];

    // Process player attacks against enemies
    for (const attack of this.pendingAttacks) {
      if (attack.owner === player) {
        for (const enemy of enemies) {
          if (!enemy.active) continue;
          if (this.checkHit(attack, enemy)) {
            this.processHit(attack, enemy);
          }
        }
      } else {
        // Enemy attack against player
        if (this.checkHit(attack, player)) {
          this.processPlayerHit(attack, player);
        }
      }
    }

    this.pendingAttacks = [];
    return this.combatEvents;
  }

  private checkHit(attack: AttackHitbox, target: Entity): boolean {
    const dx = target.position.x - attack.position.x;
    const dy = target.position.y - attack.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Check range
    if (distance > attack.range) return false;

    // Check angle
    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - attack.angle;

    // Normalize angle difference
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    return Math.abs(angleDiff) <= attack.width / 2;
  }

  private processHit(attack: AttackHitbox, enemy: Enemy): void {
    const dx = enemy.position.x - attack.position.x;
    const dy = enemy.position.y - attack.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const knockback: Vec2 = dist > 0.01
      ? { x: (dx / dist) * attack.knockback, y: (dy / dist) * attack.knockback }
      : { x: 0, y: 0 };

    console.log(`HIT! Enemy at ${enemy.position.x.toFixed(1)},${enemy.position.y.toFixed(1)} - damage=${attack.damage} health=${enemy.health} -> ${enemy.health - attack.damage}`);

    enemy.onHit(attack.damage, knockback);

    const eventType = enemy.health <= 0 ? 'kill' : 'hit';
    this.combatEvents.push({
      type: eventType,
      attacker: attack.owner,
      defender: enemy,
      damage: attack.damage,
      position: { ...enemy.position },
    });
  }

  private processPlayerHit(attack: AttackHitbox, player: Player): void {
    // Check if player is blocking
    if (player.isBlocking) {
      // Check if facing the attack
      const playerAngle = this.getEntityFacingAngle(player);
      const attackAngle = Math.atan2(
        player.position.y - attack.position.y,
        player.position.x - attack.position.x
      );

      let angleDiff = attackAngle - playerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Block successful if facing the attack (within 90 degrees)
      if (Math.abs(angleDiff) <= Math.PI / 2) {
        // Check for parry
        if (player.isParrying()) {
          this.combatEvents.push({
            type: 'parry',
            attacker: attack.owner,
            defender: player,
            damage: 0,
            position: { ...player.position },
          });
          // Parry stuns attacker
          if (attack.owner instanceof Enemy) {
            attack.owner.onHit(0, { x: 0, y: 0 }); // Stagger without damage
          }
          return;
        }

        // Regular block - reduced damage
        const reducedDamage = Math.floor(attack.damage * 0.25);
        const reducedKnockback: Vec2 = { x: 0, y: 0 };

        player.onHit(reducedDamage, reducedKnockback);
        this.combatEvents.push({
          type: 'block',
          attacker: attack.owner,
          defender: player,
          damage: reducedDamage,
          position: { ...player.position },
        });
        return;
      }
    }

    // Full hit
    const dx = player.position.x - attack.position.x;
    const dy = player.position.y - attack.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const knockback: Vec2 = dist > 0.01
      ? { x: (dx / dist) * attack.knockback, y: (dy / dist) * attack.knockback }
      : { x: 0, y: 0 };

    player.onHit(attack.damage, knockback);
    this.combatEvents.push({
      type: 'hit',
      attacker: attack.owner,
      defender: player,
      damage: attack.damage,
      position: { ...player.position },
    });
  }

  private getEntityFacingAngle(entity: Entity): number {
    const directionAngles: Record<string, number> = {
      E: 0,
      SE: Math.PI / 4,
      S: Math.PI / 2,
      SW: (Math.PI * 3) / 4,
      W: Math.PI,
      NW: (-Math.PI * 3) / 4,
      N: -Math.PI / 2,
      NE: -Math.PI / 4,
    };
    return directionAngles[entity.facing] ?? 0;
  }

  checkMeleeRange(attacker: Entity, target: Entity, range: number): boolean {
    const distance = attacker.distanceTo(target);
    return distance <= range;
  }
}
