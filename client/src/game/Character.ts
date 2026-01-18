/**
 * Panda & Dog - Character Entity
 * Simplified character for co-op multiplayer
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { worldToScreen, getDepthValue } from '../engine/isometric';
import type { EntityState, WorldPos, Vec2, Direction8, Role } from '@shared/types';

const COLORS = {
  dog: 0x8b4513,      // Brown
  panda: 0xffffff,    // White
  dogAccent: 0xd2691e,
  pandaAccent: 0x1a1a1a,
};

export class Character {
  readonly id: string;
  readonly role: Role;

  position: WorldPos;
  velocity: Vec2 = { x: 0, y: 0 };
  facing: Direction8 = 'S';
  state: string = 'idle';

  container: Container;
  private sprite: Container;
  private nameTag: Text;

  private walkAnimTime = 0;
  private isLocal: boolean;

  constructor(id: string, role: Role, position: WorldPos, isLocal: boolean = false) {
    this.id = id;
    this.role = role;
    this.position = { ...position };
    this.isLocal = isLocal;

    this.container = new Container();
    this.sprite = this.createSprite();
    this.nameTag = this.createNameTag();

    this.container.addChild(this.sprite);
    this.container.addChild(this.nameTag);

    this.updateVisualPosition();
  }

  private createSprite(): Container {
    const sprite = new Container();
    const g = new Graphics();

    const mainColor = this.role === 'dog' ? COLORS.dog : COLORS.panda;
    const accentColor = this.role === 'dog' ? COLORS.dogAccent : COLORS.pandaAccent;

    // Shadow
    g.ellipse(0, 4, 12, 6);
    g.fill({ color: 0x000000, alpha: 0.3 });

    // Body
    g.ellipse(0, -8, 14, 18);
    g.fill({ color: mainColor });
    g.stroke({ color: accentColor, width: 2 });

    // Face indicator based on role
    if (this.role === 'dog') {
      // Dog ears
      g.circle(-8, -22, 5);
      g.circle(8, -22, 5);
      g.fill({ color: COLORS.dogAccent });
      // Dog snout
      g.ellipse(0, -6, 5, 3);
      g.fill({ color: 0xf5deb3 });
    } else {
      // Panda ears
      g.circle(-10, -24, 6);
      g.circle(10, -24, 6);
      g.fill({ color: COLORS.pandaAccent });
      // Panda eye patches
      g.ellipse(-5, -14, 4, 5);
      g.ellipse(5, -14, 4, 5);
      g.fill({ color: COLORS.pandaAccent });
    }

    // Eyes
    g.circle(-4, -12, 2);
    g.circle(4, -12, 2);
    g.fill({ color: 0x000000 });

    sprite.addChild(g);
    return sprite;
  }

  private createNameTag(): Text {
    const style = new TextStyle({
      fontSize: 10,
      fill: 0xffffff,
      fontFamily: 'Inter, sans-serif',
      fontWeight: 'bold',
      stroke: { color: 0x000000, width: 2 },
    });

    const label = this.isLocal ? 'YOU' : this.role.toUpperCase();
    const text = new Text({ text: label, style });
    text.anchor.set(0.5, 0);
    text.y = -40;

    return text;
  }

  updateFromState(state: EntityState): void {
    this.position = { ...state.position };
    this.velocity = { ...state.velocity };
    this.facing = state.facing;
    this.state = state.state;
    this.updateVisualPosition();
  }

  update(deltaTime: number): void {
    // Animation updates
    const isMoving = this.state === 'walk' || this.state === 'run';

    if (isMoving) {
      const speedMult = this.state === 'run' ? 1.5 : 1;
      this.walkAnimTime += deltaTime * 14 * speedMult;

      // Bobbing animation
      const bob = Math.sin(this.walkAnimTime) * 2;
      const squash = Math.sin(this.walkAnimTime * 2) * 0.05;

      this.sprite.y = bob;
      this.sprite.scale.set(1 + squash * 0.5, 1 - squash);
      this.sprite.rotation = Math.sin(this.walkAnimTime) * 0.08 * speedMult;
    } else {
      this.walkAnimTime = 0;
      this.sprite.y = 0;
      this.sprite.scale.set(1, 1);
      this.sprite.rotation = 0;
    }

    this.updateVisualPosition();
  }

  private updateVisualPosition(): void {
    const screen = worldToScreen(this.position);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = getDepthValue(this.position);
  }

  setSelected(selected: boolean): void {
    this.nameTag.visible = selected || this.isLocal;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
