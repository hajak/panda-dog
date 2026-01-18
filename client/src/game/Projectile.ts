/* ============================================
   SHADOW NINJA - Projectile System
   Handles arrows, shurikens, and other projectiles
   ============================================ */

import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from '../engine/isometric';
import { COLORS } from '../engine/constants';
import type { WorldPos, Vec2 } from '../engine/types';

export interface ProjectileConfig {
  id: string;
  type: 'arrow' | 'shuriken';
  position: WorldPos;
  direction: Vec2;
  speed: number;
  damage: number;
  owner: string;
  maxDistance?: number;
}

export class Projectile {
  id: string;
  type: 'arrow' | 'shuriken';
  position: WorldPos;
  direction: Vec2;
  speed: number;
  damage: number;
  owner: string;
  maxDistance: number;

  active: boolean = true;
  distanceTraveled: number = 0;

  container: Container;
  private graphics: Graphics;

  constructor(config: ProjectileConfig) {
    this.id = config.id;
    this.type = config.type;
    this.position = { ...config.position };
    this.direction = { ...config.direction };
    this.speed = config.speed;
    this.damage = config.damage;
    this.owner = config.owner;
    this.maxDistance = config.maxDistance ?? 15; // tiles

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.createVisual();
    this.updateVisualPosition();
  }

  private createVisual(): void {
    this.graphics.clear();

    if (this.type === 'arrow') {
      // Arrow shape - elongated with point
      const angle = Math.atan2(this.direction.y, this.direction.x);
      const length = 12;
      const width = 2;

      // Rotate arrow based on direction
      this.graphics.rotation = angle;

      // Arrow body
      this.graphics.rect(-length / 2, -width / 2, length, width);
      this.graphics.fill({ color: COLORS.ARROW });

      // Arrow head
      this.graphics.moveTo(length / 2, 0);
      this.graphics.lineTo(length / 2 - 4, -3);
      this.graphics.lineTo(length / 2 - 4, 3);
      this.graphics.closePath();
      this.graphics.fill({ color: COLORS.ARROW });

      // Fletching
      this.graphics.moveTo(-length / 2, 0);
      this.graphics.lineTo(-length / 2 - 3, -3);
      this.graphics.lineTo(-length / 2, 0);
      this.graphics.lineTo(-length / 2 - 3, 3);
      this.graphics.stroke({ color: COLORS.ARROW, width: 1 });
    } else {
      // Shuriken - 4-pointed star with glow
      const size = 10;

      // Outer glow
      this.graphics.star(0, 0, 4, size + 4, (size + 4) / 2);
      this.graphics.fill({ color: 0x00ffff, alpha: 0.3 });

      // Main star
      this.graphics.star(0, 0, 4, size, size / 2);
      this.graphics.fill({ color: COLORS.SHURIKEN });

      // Inner bright core
      this.graphics.circle(0, 0, 2);
      this.graphics.fill({ color: 0xffffff, alpha: 0.8 });
    }
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    // Move projectile
    const movement = this.speed * deltaTime;
    this.position.x += this.direction.x * movement;
    this.position.y += this.direction.y * movement;

    this.distanceTraveled += movement;

    // Deactivate if traveled too far
    if (this.distanceTraveled >= this.maxDistance) {
      this.active = false;
    }

    // Spin shuriken
    if (this.type === 'shuriken') {
      this.graphics.rotation += deltaTime * 20;
    }

    this.updateVisualPosition();
  }

  private updateVisualPosition(): void {
    const screen = worldToScreen(this.position);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = screen.y + this.position.z * 100;
  }

  checkCollision(targetPos: WorldPos, radius: number): boolean {
    const dx = targetPos.x - this.position.x;
    const dy = targetPos.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

export class ProjectileManager {
  private projectiles: Map<string, Projectile> = new Map();
  private container: Container;
  private projectileIdCounter: number = 0;

  constructor(parentContainer: Container) {
    this.container = parentContainer;
  }

  spawn(config: Omit<ProjectileConfig, 'id'>): Projectile {
    const id = `projectile_${++this.projectileIdCounter}`;
    const projectile = new Projectile({ ...config, id });

    this.projectiles.set(id, projectile);
    this.container.addChild(projectile.container);

    return projectile;
  }

  update(deltaTime: number): void {
    for (const [id, projectile] of this.projectiles) {
      projectile.update(deltaTime);

      if (!projectile.active) {
        this.remove(id);
      }
    }
  }

  checkCollisions(
    targetPos: WorldPos,
    radius: number,
    excludeOwner?: string
  ): Projectile | null {
    for (const projectile of this.projectiles.values()) {
      if (!projectile.active) continue;
      if (excludeOwner && projectile.owner === excludeOwner) continue;

      if (projectile.checkCollision(targetPos, radius)) {
        return projectile;
      }
    }
    return null;
  }

  remove(id: string): void {
    const projectile = this.projectiles.get(id);
    if (projectile) {
      projectile.destroy();
      this.projectiles.delete(id);
    }
  }

  clear(): void {
    for (const projectile of this.projectiles.values()) {
      projectile.destroy();
    }
    this.projectiles.clear();
  }

  getAll(): Projectile[] {
    return Array.from(this.projectiles.values());
  }
}
