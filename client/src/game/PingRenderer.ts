/**
 * Panda & Dog - Ping Marker Renderer
 * Visual representation of player pings/markers
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { worldToScreen, getDepthValue } from '../engine/isometric';
import type { PingMarker, WorldPos } from '@shared/types';

const PING_COLORS = {
  look: 0xffff00,      // Yellow
  go: 0x00ff00,        // Green
  wait: 0xff8800,      // Orange
  interact: 0x00aaff,  // Cyan
  danger: 0xff0000,    // Red
};

const PING_ICONS = {
  look: '👀',
  go: '➡️',
  wait: '✋',
  interact: '🔧',
  danger: '⚠️',
};

export class PingRenderer {
  readonly id: string;
  readonly createdBy: string;

  container: Container;
  private graphics: Graphics;
  private icon: Text;
  private position: WorldPos;
  private type: PingMarker['type'];
  private createdAt: number;
  private expiresAt: number;
  private pulseTime = 0;

  constructor(ping: PingMarker) {
    this.id = ping.id;
    this.createdBy = ping.createdBy;
    this.position = { ...ping.position };
    this.type = ping.type;
    this.createdAt = ping.createdAt;
    this.expiresAt = ping.expiresAt;

    this.container = new Container();
    this.graphics = new Graphics();
    this.icon = this.createIcon();

    this.container.addChild(this.graphics);
    this.container.addChild(this.icon);

    this.render();
    this.updateVisualPosition();
  }

  private createIcon(): Text {
    const style = new TextStyle({
      fontSize: 16,
      fill: 0xffffff,
    });

    const text = new Text({ text: PING_ICONS[this.type] || '?', style });
    text.anchor.set(0.5, 0.5);
    text.y = -30;

    return text;
  }

  update(deltaTime: number): void {
    this.pulseTime += deltaTime * 4;
    this.render();
  }

  private render(): void {
    const g = this.graphics;
    g.clear();

    const color = PING_COLORS[this.type] || 0xffffff;
    const pulse = Math.sin(this.pulseTime) * 0.3 + 0.7;
    const ringScale = 1 + Math.sin(this.pulseTime * 0.5) * 0.2;

    // Outer ring (pulsing)
    g.circle(0, 0, 20 * ringScale);
    g.stroke({ color, width: 2, alpha: pulse * 0.5 });

    // Inner ring
    g.circle(0, 0, 12);
    g.stroke({ color, width: 3, alpha: pulse });

    // Center dot
    g.circle(0, 0, 4);
    g.fill({ color, alpha: pulse });

    // Vertical line pointing up
    g.moveTo(0, -12);
    g.lineTo(0, -25);
    g.stroke({ color, width: 2, alpha: pulse });

    // Fade out as it approaches expiry
    const remaining = this.expiresAt - Date.now();
    const totalLife = this.expiresAt - this.createdAt;
    const lifeRatio = Math.max(0, remaining / totalLife);

    if (lifeRatio < 0.3) {
      this.container.alpha = lifeRatio / 0.3;
    } else {
      this.container.alpha = 1;
    }
  }

  isExpired(): boolean {
    return Date.now() >= this.expiresAt;
  }

  private updateVisualPosition(): void {
    const screen = worldToScreen(this.position);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = getDepthValue(this.position) + 1000; // Above other entities
  }

  getMarker(): PingMarker {
    return {
      id: this.id,
      position: { ...this.position },
      type: this.type,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt,
    };
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
