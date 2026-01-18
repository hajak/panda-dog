/* ============================================
   SHADOW NINJA - Particle System
   Lightweight particle effects for combat and environment
   ============================================ */

import { Container, Graphics } from 'pixi.js';
import { worldToScreen } from './isometric';
import type { WorldPos, Vec2 } from './types';

export interface ParticleConfig {
  position: WorldPos;
  velocity: Vec2;
  color: number;
  size: number;
  lifetime: number;
  gravity?: number;
  fadeOut?: boolean;
  shrink?: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: number;
  size: number;
  lifetime: number;
  maxLifetime: number;
  gravity: number;
  fadeOut: boolean;
  shrink: boolean;
  graphics: Graphics;
}

export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private maxParticles: number = 200;

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.sortableChildren = true;
    parentContainer.addChild(this.container);
  }

  emit(config: ParticleConfig): void {
    if (this.particles.length >= this.maxParticles) {
      // Remove oldest particle
      const oldest = this.particles.shift();
      if (oldest) {
        oldest.graphics.destroy();
      }
    }

    const graphics = new Graphics();
    this.container.addChild(graphics);

    const particle: Particle = {
      x: config.position.x,
      y: config.position.y,
      z: config.position.z,
      vx: config.velocity.x,
      vy: config.velocity.y,
      vz: 0,
      color: config.color,
      size: config.size,
      lifetime: config.lifetime,
      maxLifetime: config.lifetime,
      gravity: config.gravity ?? 0,
      fadeOut: config.fadeOut ?? true,
      shrink: config.shrink ?? false,
      graphics,
    };

    this.updateParticleGraphics(particle);
    this.particles.push(particle);
  }

  emitBurst(
    position: WorldPos,
    count: number,
    color: number,
    speed: number,
    lifetime: number,
    options: { size?: number; gravity?: number; fadeOut?: boolean; shrink?: boolean } = {}
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const spd = speed * (0.5 + Math.random() * 0.5);

      this.emit({
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * spd,
          y: Math.sin(angle) * spd,
        },
        color,
        size: options.size ?? 3,
        lifetime: lifetime * (0.8 + Math.random() * 0.4),
        gravity: options.gravity ?? 0,
        fadeOut: options.fadeOut ?? true,
        shrink: options.shrink ?? false,
      });
    }
  }

  emitDirectional(
    position: WorldPos,
    direction: Vec2,
    count: number,
    color: number,
    speed: number,
    lifetime: number,
    spread: number = Math.PI / 4,
    options: { size?: number; gravity?: number; fadeOut?: boolean; shrink?: boolean } = {}
  ): void {
    const baseAngle = Math.atan2(direction.y, direction.x);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const spd = speed * (0.5 + Math.random() * 0.5);

      this.emit({
        position: {
          x: position.x + (Math.random() - 0.5) * 0.3,
          y: position.y + (Math.random() - 0.5) * 0.3,
          z: position.z,
        },
        velocity: {
          x: Math.cos(angle) * spd,
          y: Math.sin(angle) * spd,
        },
        color,
        size: options.size ?? 3,
        lifetime: lifetime * (0.8 + Math.random() * 0.4),
        gravity: options.gravity ?? 0,
        fadeOut: options.fadeOut ?? true,
        shrink: options.shrink ?? false,
      });
    }
  }

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vz -= p.gravity * deltaTime;
      p.z += p.vz * deltaTime;

      // Update lifetime
      p.lifetime -= deltaTime;

      if (p.lifetime <= 0 || p.z < -1) {
        // Remove dead particle
        p.graphics.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      // Update visuals
      this.updateParticleGraphics(p);
    }
  }

  private updateParticleGraphics(p: Particle): void {
    const lifeRatio = p.lifetime / p.maxLifetime;
    const alpha = p.fadeOut ? lifeRatio : 1;
    const size = p.shrink ? p.size * lifeRatio : p.size;

    const screen = worldToScreen({ x: p.x, y: p.y, z: p.z });

    p.graphics.clear();
    p.graphics.circle(0, 0, Math.max(0.5, size));
    p.graphics.fill({ color: p.color, alpha });
    p.graphics.x = screen.x;
    p.graphics.y = screen.y;
    p.graphics.zIndex = screen.y + p.z * 100;
  }

  applyCamera(offsetX: number, offsetY: number, zoom: number): void {
    this.container.x = offsetX;
    this.container.y = offsetY;
    this.container.scale.set(zoom);
  }

  clear(): void {
    for (const p of this.particles) {
      p.graphics.destroy();
    }
    this.particles = [];
  }

  destroy(): void {
    this.clear();
    this.container.destroy();
  }
}

// Preset effect emitters
export const ParticleEffects = {
  hit(system: ParticleSystem, position: WorldPos, direction: Vec2): void {
    system.emitDirectional(position, direction, 8, 0xef4444, 4, 0.3, Math.PI / 3, {
      size: 4,
      gravity: 5,
      shrink: true,
    });
  },

  block(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 6, 0x94a3b8, 3, 0.2, {
      size: 3,
      fadeOut: true,
    });
  },

  parry(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 12, 0xfde047, 5, 0.4, {
      size: 5,
      fadeOut: true,
      shrink: true,
    });
  },

  death(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 20, 0xef4444, 3, 0.8, {
      size: 4,
      gravity: 8,
      shrink: true,
    });
    // Darker smoke
    system.emitBurst({ ...position, z: position.z + 0.2 }, 10, 0x1f2937, 2, 1.0, {
      size: 6,
      fadeOut: true,
    });
  },

  dust(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 4, 0x9ca3af, 1.5, 0.4, {
      size: 3,
      gravity: -1,
      fadeOut: true,
    });
  },

  jump(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 6, 0x6b7280, 2, 0.3, {
      size: 3,
      fadeOut: true,
    });
  },

  land(system: ParticleSystem, position: WorldPos): void {
    system.emitBurst(position, 8, 0x9ca3af, 3, 0.4, {
      size: 4,
      gravity: 2,
      shrink: true,
    });
  },

  arrowTrail(system: ParticleSystem, position: WorldPos): void {
    system.emit({
      position,
      velocity: { x: 0, y: 0 },
      color: 0x8b6914,
      size: 2,
      lifetime: 0.15,
      fadeOut: true,
    });
  },

  attackSwing(system: ParticleSystem, position: WorldPos, direction: Vec2): void {
    // Create arc of particles to show sword/weapon swing
    const baseAngle = Math.atan2(direction.y, direction.x);
    const arcWidth = Math.PI * 0.6; // 108 degree arc
    const numParticles = 8;

    for (let i = 0; i < numParticles; i++) {
      const t = i / (numParticles - 1);
      const angle = baseAngle - arcWidth / 2 + arcWidth * t;
      const distance = 0.8 + Math.random() * 0.4;

      // Yellow/white slash color
      const color = i % 2 === 0 ? 0xfde047 : 0xffffff;

      system.emit({
        position: {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance,
          z: position.z + 0.5,
        },
        velocity: {
          x: Math.cos(angle) * 3,
          y: Math.sin(angle) * 3,
        },
        color,
        size: 4 - Math.abs(t - 0.5) * 2, // Larger in middle
        lifetime: 0.15,
        fadeOut: true,
        shrink: true,
      });
    }

    // Add impact spark at the center
    system.emit({
      position: {
        x: position.x + direction.x * 1.2,
        y: position.y + direction.y * 1.2,
        z: position.z + 0.5,
      },
      velocity: { x: direction.x * 2, y: direction.y * 2 },
      color: 0xffffff,
      size: 6,
      lifetime: 0.1,
      fadeOut: true,
      shrink: true,
    });
  },

  enemyAttack(system: ParticleSystem, position: WorldPos, direction: Vec2): void {
    // Red slash effect for enemy attacks
    const baseAngle = Math.atan2(direction.y, direction.x);

    for (let i = 0; i < 5; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.4;
      const distance = 0.6 + Math.random() * 0.3;

      system.emit({
        position: {
          x: position.x + Math.cos(angle) * distance,
          y: position.y + Math.sin(angle) * distance,
          z: position.z + 0.4,
        },
        velocity: {
          x: Math.cos(angle) * 2,
          y: Math.sin(angle) * 2,
        },
        color: 0xef4444,
        size: 3,
        lifetime: 0.12,
        fadeOut: true,
        shrink: true,
      });
    }
  },

  pickup(system: ParticleSystem, position: WorldPos, color: number): void {
    // Sparkle burst when picking up items
    system.emitBurst(
      { ...position, z: position.z + 0.3 },
      16,
      color,
      4,
      0.5,
      { size: 5, fadeOut: true, shrink: true }
    );

    // Rising sparkles
    for (let i = 0; i < 8; i++) {
      system.emit({
        position: {
          x: position.x + (Math.random() - 0.5) * 0.5,
          y: position.y + (Math.random() - 0.5) * 0.5,
          z: position.z,
        },
        velocity: {
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
        },
        color: 0xffffff,
        size: 3,
        lifetime: 0.6 + Math.random() * 0.4,
        gravity: -3, // Float upward
        fadeOut: true,
        shrink: true,
      });
    }
  },
};
