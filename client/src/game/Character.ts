/**
 * Panda & Dog - Character Entity
 * Low-poly style characters matching reference images
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { worldToScreen, getDepthValue } from '../engine/isometric';
import type { EntityState, WorldPos, Vec2, Direction8, Role } from '@shared/types';

// Shiba Inu colors
const DOG_COLORS = {
  body: 0xe07850,       // Coral/orange
  bodyLight: 0xf0a080,  // Lighter orange
  white: 0xf5f0eb,      // Cream white
  nose: 0x2a2a2a,       // Dark gray/black
  eye: 0x1a1a1a,        // Black
};

// Panda colors
const PANDA_COLORS = {
  white: 0xf5f5f5,      // Off-white
  black: 0x1a1a1a,      // Black
  darkGray: 0x2d2d2d,   // Dark gray for shading
  nose: 0x1a1a1a,       // Black
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
  private bodyParts: {
    body: Graphics;
    legs: Graphics[];
    head: Graphics;
    tail?: Graphics;
  };
  private nameTag: Text;

  private walkAnimTime = 0;
  private isLocal: boolean;

  constructor(id: string, role: Role, position: WorldPos, isLocal: boolean = false) {
    this.id = id;
    this.role = role;
    this.position = { ...position };
    this.isLocal = isLocal;

    this.container = new Container();
    const { sprite, parts } = this.createSprite();
    this.sprite = sprite;
    this.bodyParts = parts;
    this.nameTag = this.createNameTag();

    this.container.addChild(this.sprite);
    this.container.addChild(this.nameTag);

    this.updateVisualPosition();
  }

  private createSprite(): { sprite: Container; parts: typeof this.bodyParts } {
    const sprite = new Container();

    if (this.role === 'dog') {
      return this.createDogSprite(sprite);
    } else {
      return this.createPandaSprite(sprite);
    }
  }

  private createDogSprite(sprite: Container): { sprite: Container; parts: typeof this.bodyParts } {
    // Shadow
    const shadow = new Graphics();
    shadow.ellipse(0, 2, 18, 8);
    shadow.fill({ color: 0x000000, alpha: 0.25 });
    sprite.addChild(shadow);

    // Back legs (behind body)
    const backLegLeft = new Graphics();
    this.drawDogLeg(backLegLeft, -10, 0);
    sprite.addChild(backLegLeft);

    const backLegRight = new Graphics();
    this.drawDogLeg(backLegRight, 10, 0);
    sprite.addChild(backLegRight);

    // Tail (curled fluffy Shiba tail)
    const tail = new Graphics();
    tail.moveTo(-14, -18);
    tail.bezierCurveTo(-20, -28, -12, -35, -8, -28);
    tail.bezierCurveTo(-6, -24, -10, -20, -14, -18);
    tail.fill({ color: DOG_COLORS.white });
    tail.stroke({ color: DOG_COLORS.body, width: 1 });
    sprite.addChild(tail);

    // Body - low poly style (hexagonal-ish shape)
    const body = new Graphics();
    // Main body
    body.moveTo(-12, -8);
    body.lineTo(-14, -18);
    body.lineTo(-8, -24);
    body.lineTo(8, -24);
    body.lineTo(14, -18);
    body.lineTo(12, -8);
    body.lineTo(8, -2);
    body.lineTo(-8, -2);
    body.closePath();
    body.fill({ color: DOG_COLORS.body });

    // White chest marking
    body.moveTo(-6, -8);
    body.lineTo(0, -18);
    body.lineTo(6, -8);
    body.lineTo(4, -2);
    body.lineTo(-4, -2);
    body.closePath();
    body.fill({ color: DOG_COLORS.white });
    sprite.addChild(body);

    // Front legs
    const frontLegLeft = new Graphics();
    this.drawDogLeg(frontLegLeft, -8, 0);
    sprite.addChild(frontLegLeft);

    const frontLegRight = new Graphics();
    this.drawDogLeg(frontLegRight, 8, 0);
    sprite.addChild(frontLegRight);

    // Head - triangular low-poly style
    const head = new Graphics();
    // Main head shape
    head.moveTo(-10, -28);
    head.lineTo(0, -22);
    head.lineTo(10, -28);
    head.lineTo(8, -38);
    head.lineTo(0, -42);
    head.lineTo(-8, -38);
    head.closePath();
    head.fill({ color: DOG_COLORS.body });

    // White face marking
    head.moveTo(-6, -28);
    head.lineTo(0, -24);
    head.lineTo(6, -28);
    head.lineTo(4, -34);
    head.lineTo(0, -36);
    head.lineTo(-4, -34);
    head.closePath();
    head.fill({ color: DOG_COLORS.white });

    // Ears (pointed triangles)
    head.moveTo(-10, -38);
    head.lineTo(-14, -50);
    head.lineTo(-6, -42);
    head.closePath();
    head.fill({ color: DOG_COLORS.body });

    head.moveTo(10, -38);
    head.lineTo(14, -50);
    head.lineTo(6, -42);
    head.closePath();
    head.fill({ color: DOG_COLORS.body });

    // Inner ears
    head.moveTo(-9, -40);
    head.lineTo(-12, -48);
    head.lineTo(-7, -43);
    head.closePath();
    head.fill({ color: DOG_COLORS.bodyLight });

    head.moveTo(9, -40);
    head.lineTo(12, -48);
    head.lineTo(7, -43);
    head.closePath();
    head.fill({ color: DOG_COLORS.bodyLight });

    // Eyes
    head.circle(-4, -34, 2);
    head.circle(4, -34, 2);
    head.fill({ color: DOG_COLORS.eye });

    // Eye highlights
    head.circle(-3, -35, 0.8);
    head.circle(5, -35, 0.8);
    head.fill({ color: 0xffffff });

    // Nose
    head.moveTo(0, -28);
    head.lineTo(-3, -30);
    head.lineTo(3, -30);
    head.closePath();
    head.fill({ color: DOG_COLORS.nose });

    sprite.addChild(head);

    return {
      sprite,
      parts: {
        body,
        legs: [backLegLeft, backLegRight, frontLegLeft, frontLegRight],
        head,
        tail,
      },
    };
  }

  private drawDogLeg(g: Graphics, x: number, yOffset: number): void {
    // Low-poly leg shape
    g.moveTo(x - 3, -4 + yOffset);
    g.lineTo(x - 4, 4 + yOffset);
    g.lineTo(x - 2, 6 + yOffset);
    g.lineTo(x + 2, 6 + yOffset);
    g.lineTo(x + 4, 4 + yOffset);
    g.lineTo(x + 3, -4 + yOffset);
    g.closePath();
    g.fill({ color: DOG_COLORS.body });

    // White paw
    g.rect(x - 2, 4 + yOffset, 4, 2);
    g.fill({ color: DOG_COLORS.white });
  }

  private createPandaSprite(sprite: Container): { sprite: Container; parts: typeof this.bodyParts } {
    // Shadow
    const shadow = new Graphics();
    shadow.ellipse(0, 2, 20, 10);
    shadow.fill({ color: 0x000000, alpha: 0.25 });
    sprite.addChild(shadow);

    // Back legs (black)
    const backLegLeft = new Graphics();
    this.drawPandaLeg(backLegLeft, -12, 0);
    sprite.addChild(backLegLeft);

    const backLegRight = new Graphics();
    this.drawPandaLeg(backLegRight, 12, 0);
    sprite.addChild(backLegRight);

    // Body - chunky panda shape
    const body = new Graphics();

    // Main white body
    body.moveTo(-16, -10);
    body.lineTo(-18, -20);
    body.lineTo(-14, -30);
    body.lineTo(14, -30);
    body.lineTo(18, -20);
    body.lineTo(16, -10);
    body.lineTo(12, 0);
    body.lineTo(-12, 0);
    body.closePath();
    body.fill({ color: PANDA_COLORS.white });

    // Black band across back/shoulders
    body.moveTo(-16, -18);
    body.lineTo(-14, -28);
    body.lineTo(14, -28);
    body.lineTo(16, -18);
    body.lineTo(14, -14);
    body.lineTo(-14, -14);
    body.closePath();
    body.fill({ color: PANDA_COLORS.black });

    sprite.addChild(body);

    // Front legs (black)
    const frontLegLeft = new Graphics();
    this.drawPandaLeg(frontLegLeft, -10, 0);
    sprite.addChild(frontLegLeft);

    const frontLegRight = new Graphics();
    this.drawPandaLeg(frontLegRight, 10, 0);
    sprite.addChild(frontLegRight);

    // Head - round panda head
    const head = new Graphics();

    // Main head (white)
    head.moveTo(-12, -32);
    head.lineTo(-14, -40);
    head.lineTo(-10, -48);
    head.lineTo(0, -52);
    head.lineTo(10, -48);
    head.lineTo(14, -40);
    head.lineTo(12, -32);
    head.lineTo(0, -28);
    head.closePath();
    head.fill({ color: PANDA_COLORS.white });

    // Black ears (round)
    head.circle(-12, -50, 6);
    head.circle(12, -50, 6);
    head.fill({ color: PANDA_COLORS.black });

    // Black eye patches (distinctive panda marking)
    head.ellipse(-6, -40, 5, 6);
    head.ellipse(6, -40, 5, 6);
    head.fill({ color: PANDA_COLORS.black });

    // Eyes (white dots in black patches)
    head.circle(-6, -40, 2);
    head.circle(6, -40, 2);
    head.fill({ color: 0xffffff });

    // Pupils
    head.circle(-5, -40, 1);
    head.circle(7, -40, 1);
    head.fill({ color: PANDA_COLORS.black });

    // Nose (black triangle)
    head.moveTo(0, -34);
    head.lineTo(-3, -37);
    head.lineTo(3, -37);
    head.closePath();
    head.fill({ color: PANDA_COLORS.nose });

    // Mouth line
    head.moveTo(0, -34);
    head.lineTo(0, -32);
    head.stroke({ color: PANDA_COLORS.black, width: 1 });

    sprite.addChild(head);

    return {
      sprite,
      parts: {
        body,
        legs: [backLegLeft, backLegRight, frontLegLeft, frontLegRight],
        head,
      },
    };
  }

  private drawPandaLeg(g: Graphics, x: number, yOffset: number): void {
    // Chunky panda leg (all black)
    g.moveTo(x - 4, -6 + yOffset);
    g.lineTo(x - 5, 4 + yOffset);
    g.lineTo(x - 3, 8 + yOffset);
    g.lineTo(x + 3, 8 + yOffset);
    g.lineTo(x + 5, 4 + yOffset);
    g.lineTo(x + 4, -6 + yOffset);
    g.closePath();
    g.fill({ color: PANDA_COLORS.black });
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
    text.y = -58;

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
    const isMoving = this.state === 'walk' || this.state === 'run';
    const speedMult = this.state === 'run' ? 1.8 : 1;

    if (isMoving) {
      this.walkAnimTime += deltaTime * 12 * speedMult;

      // Body bob
      const bob = Math.sin(this.walkAnimTime * 2) * 1.5;
      this.sprite.y = bob;

      // Slight body rotation for natural movement
      this.sprite.rotation = Math.sin(this.walkAnimTime) * 0.03 * speedMult;

      // Animate legs
      const legPhase = this.walkAnimTime;
      const [backLeft, backRight, frontLeft, frontRight] = this.bodyParts.legs;

      // Diagonal leg pairs move together (like real quadrupeds)
      const legSwing = 4 * speedMult;
      backLeft.y = Math.sin(legPhase) * legSwing;
      frontRight.y = Math.sin(legPhase) * legSwing;
      backRight.y = Math.sin(legPhase + Math.PI) * legSwing;
      frontLeft.y = Math.sin(legPhase + Math.PI) * legSwing;

      // Tail wag for dog
      if (this.bodyParts.tail) {
        this.bodyParts.tail.rotation = Math.sin(this.walkAnimTime * 3) * 0.15;
      }

      // Head bob (slight)
      this.bodyParts.head.y = Math.sin(this.walkAnimTime * 2 + 0.5) * 1;

    } else {
      // Idle animation
      this.walkAnimTime += deltaTime * 2;

      // Subtle breathing animation
      const breathe = Math.sin(this.walkAnimTime) * 0.5;
      this.sprite.y = breathe;
      this.sprite.rotation = 0;

      // Reset legs
      for (const leg of this.bodyParts.legs) {
        leg.y = 0;
      }

      // Gentle tail sway for dog when idle
      if (this.bodyParts.tail) {
        this.bodyParts.tail.rotation = Math.sin(this.walkAnimTime * 1.5) * 0.05;
      }

      this.bodyParts.head.y = breathe * 0.5;
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
