/**
 * Panda & Dog - Interactable Renderer
 * Visual representation of interactive objects
 */

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { worldToScreen, getDepthValue } from '../engine/isometric';
import type { InteractableState, WorldPos, Role } from '@shared/types';

const COLORS = {
  door: { closed: 0x8b4513, open: 0x654321, locked: 0x4a4a4a },
  lever: { off: 0x888888, on: 0x44aa44 },
  pressurePlate: { inactive: 0x666666, active: 0x44aa44 },
  crate: 0xcd853f,
  winch: { idle: 0x666666, operating: 0xffaa00 },
  cameraNode: { inactive: 0x444444, active: 0x00aaff },
  platform: 0x555555,
  button: { unpressed: 0xcc4444, pressed: 0x44cc44 },
  hazard: { laser: 0xff0000, spikes: 0x888888, electric: 0xffff00 },
};

export class InteractableRenderer {
  readonly id: string;
  readonly type: InteractableState['type'];

  container: Container;
  private graphics: Graphics;
  private label: Text | null = null;
  private state: Record<string, unknown>;
  private position: WorldPos;

  constructor(interactable: InteractableState) {
    this.id = interactable.id;
    this.type = interactable.type;
    this.state = { ...interactable.state };
    this.position = { ...interactable.position };

    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    this.render();
    this.updateVisualPosition();
  }

  updateState(newState: InteractableState): void {
    this.state = { ...newState.state };
    this.position = { ...newState.position };
    this.render();
    this.updateVisualPosition();
  }

  private render(): void {
    this.graphics.clear();

    switch (this.type) {
      case 'door':
        this.renderDoor();
        break;
      case 'lever':
        this.renderLever();
        break;
      case 'pressure_plate':
        this.renderPressurePlate();
        break;
      case 'crate':
        this.renderCrate();
        break;
      case 'winch':
        this.renderWinch();
        break;
      case 'camera_node':
        this.renderCameraNode();
        break;
      case 'platform':
        this.renderPlatform();
        break;
      case 'button':
        this.renderButton();
        break;
      case 'hazard':
        this.renderHazard();
        break;
    }
  }

  private renderDoor(): void {
    const { open, locked } = this.state as { open: boolean; locked: boolean };
    const g = this.graphics;

    // Door frame
    g.rect(-16, -40, 32, 40);
    g.fill({ color: 0x333333 });

    if (!open) {
      // Closed door
      const color = locked ? COLORS.door.locked : COLORS.door.closed;
      g.rect(-14, -38, 28, 36);
      g.fill({ color });

      // Door handle
      g.circle(8, -20, 3);
      g.fill({ color: locked ? 0xffcc00 : 0xaaaaaa });
    } else {
      // Open door (just frame visible)
      g.rect(-14, -38, 6, 36);
      g.fill({ color: COLORS.door.open });
    }

    this.addLabel(locked ? '🔒' : (open ? '' : 'Door'));
  }

  private renderLever(): void {
    const { position: leverPos } = this.state as { position: string };
    const isOn = leverPos === 'on' || leverPos === 'held';
    const g = this.graphics;

    // Base
    g.rect(-12, -4, 24, 8);
    g.fill({ color: 0x444444 });

    // Lever arm
    const rotation = isOn ? -0.6 : 0.6;
    g.moveTo(0, -4);
    g.lineTo(Math.sin(rotation) * 20, -4 - Math.cos(rotation) * 20);
    g.stroke({ color: isOn ? COLORS.lever.on : COLORS.lever.off, width: 4 });

    // Handle
    const handleX = Math.sin(rotation) * 20;
    const handleY = -4 - Math.cos(rotation) * 20;
    g.circle(handleX, handleY, 5);
    g.fill({ color: isOn ? COLORS.lever.on : COLORS.lever.off });

    this.addLabel(isOn ? 'ON' : 'OFF');
  }

  private renderPressurePlate(): void {
    const { activated } = this.state as { activated: boolean };
    const g = this.graphics;

    // Plate (isometric diamond shape)
    const plateY = activated ? 2 : 0;
    g.moveTo(0, -8 + plateY);
    g.lineTo(16, plateY);
    g.lineTo(0, 8 + plateY);
    g.lineTo(-16, plateY);
    g.closePath();
    g.fill({ color: activated ? COLORS.pressurePlate.active : COLORS.pressurePlate.inactive });
    g.stroke({ color: 0x333333, width: 2 });
  }

  private renderCrate(): void {
    const { beingPushed } = this.state as { beingPushed: boolean };
    const g = this.graphics;

    // Crate body (isometric box)
    const wobble = beingPushed ? Math.sin(Date.now() * 0.01) * 2 : 0;

    // Top face
    g.moveTo(0 + wobble, -24);
    g.lineTo(16 + wobble, -16);
    g.lineTo(0 + wobble, -8);
    g.lineTo(-16 + wobble, -16);
    g.closePath();
    g.fill({ color: COLORS.crate });

    // Right face
    g.moveTo(16 + wobble, -16);
    g.lineTo(16 + wobble, 0);
    g.lineTo(0 + wobble, 8);
    g.lineTo(0 + wobble, -8);
    g.closePath();
    g.fill({ color: 0xb8860b });

    // Left face
    g.moveTo(-16 + wobble, -16);
    g.lineTo(-16 + wobble, 0);
    g.lineTo(0 + wobble, 8);
    g.lineTo(0 + wobble, -8);
    g.closePath();
    g.fill({ color: 0x8b6914 });

    // Cross pattern on top
    g.moveTo(-8 + wobble, -20);
    g.lineTo(8 + wobble, -12);
    g.moveTo(8 + wobble, -20);
    g.lineTo(-8 + wobble, -12);
    g.stroke({ color: 0x654321, width: 2 });

    this.addLabel('🐼');
  }

  private renderWinch(): void {
    const { operating, extended } = this.state as { operating: boolean; extended: number };
    const g = this.graphics;

    // Base
    g.rect(-12, -8, 24, 16);
    g.fill({ color: 0x444444 });

    // Drum
    g.circle(0, -16, 10);
    g.fill({ color: operating ? COLORS.winch.operating : COLORS.winch.idle });

    // Rope/chain indicator
    const ropeLength = 20 + extended * 30;
    g.moveTo(0, -6);
    g.lineTo(0, ropeLength);
    g.stroke({ color: 0x888888, width: 2 });

    // Crank handle
    const crankAngle = operating ? Date.now() * 0.005 : 0;
    g.moveTo(0, -16);
    g.lineTo(Math.cos(crankAngle) * 12, -16 + Math.sin(crankAngle) * 6);
    g.stroke({ color: 0x666666, width: 3 });

    this.addLabel('🐼');
  }

  private renderCameraNode(): void {
    const { active } = this.state as { active: boolean };
    const g = this.graphics;

    // Pole
    g.rect(-3, -40, 6, 40);
    g.fill({ color: 0x333333 });

    // Camera housing
    g.rect(-10, -50, 20, 12);
    g.fill({ color: active ? COLORS.cameraNode.active : COLORS.cameraNode.inactive });

    // Lens
    g.circle(0, -44, 4);
    g.fill({ color: active ? 0x00ff00 : 0x222222 });

    // Active indicator light
    if (active) {
      g.circle(8, -48, 2);
      g.fill({ color: 0xff0000 });
    }

    this.addLabel('🐕');
  }

  private renderPlatform(): void {
    const g = this.graphics;

    // Platform surface (isometric)
    g.moveTo(0, -8);
    g.lineTo(24, 0);
    g.lineTo(0, 8);
    g.lineTo(-24, 0);
    g.closePath();
    g.fill({ color: COLORS.platform });
    g.stroke({ color: 0x333333, width: 2 });

    // Rails indicator
    g.moveTo(-24, 0);
    g.lineTo(-24, 4);
    g.lineTo(24, 4);
    g.lineTo(24, 0);
    g.stroke({ color: 0x444444, width: 1 });
  }

  private renderButton(): void {
    const { pressed } = this.state as { pressed: boolean };
    const g = this.graphics;

    // Button base
    g.circle(0, 0, 12);
    g.fill({ color: 0x333333 });

    // Button top
    const buttonY = pressed ? 2 : -2;
    g.circle(0, buttonY, 8);
    g.fill({ color: pressed ? COLORS.button.pressed : COLORS.button.unpressed });

    // Highlight
    g.circle(-2, buttonY - 2, 2);
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }

  private renderHazard(): void {
    const { active, hazardType } = this.state as { active: boolean; hazardType: string };
    const g = this.graphics;

    if (!active) {
      // Inactive hazard - dimmed
      g.rect(-16, -4, 32, 8);
      g.fill({ color: 0x333333, alpha: 0.5 });
      return;
    }

    switch (hazardType) {
      case 'laser':
        // Laser beam
        g.rect(-100, -2, 200, 4);
        g.fill({ color: COLORS.hazard.laser, alpha: 0.8 });
        // Glow effect
        g.rect(-100, -4, 200, 8);
        g.fill({ color: COLORS.hazard.laser, alpha: 0.3 });
        break;

      case 'spikes':
        // Spike pattern
        for (let i = -2; i <= 2; i++) {
          g.moveTo(i * 8, 0);
          g.lineTo(i * 8 - 4, 12);
          g.lineTo(i * 8 + 4, 12);
          g.closePath();
        }
        g.fill({ color: COLORS.hazard.spikes });
        break;

      case 'electric':
        // Electric arcs
        for (let i = 0; i < 3; i++) {
          const offset = Math.random() * 4 - 2;
          g.moveTo(-16, offset);
          g.lineTo(-8, offset + Math.random() * 8 - 4);
          g.lineTo(0, offset + Math.random() * 8 - 4);
          g.lineTo(8, offset + Math.random() * 8 - 4);
          g.lineTo(16, offset);
        }
        g.stroke({ color: COLORS.hazard.electric, width: 2, alpha: 0.8 });
        break;
    }

    this.addLabel('⚠️');
  }

  private addLabel(text: string): void {
    if (this.label) {
      this.container.removeChild(this.label);
    }

    if (!text) return;

    const style = new TextStyle({
      fontSize: 10,
      fill: 0xffffff,
      fontFamily: 'Inter, sans-serif',
      stroke: { color: 0x000000, width: 2 },
    });

    this.label = new Text({ text, style });
    this.label.anchor.set(0.5, 1);
    this.label.y = -50;
    this.container.addChild(this.label);
  }

  private updateVisualPosition(): void {
    const screen = worldToScreen(this.position);
    this.container.x = screen.x;
    this.container.y = screen.y;
    this.container.zIndex = getDepthValue(this.position);
  }

  /**
   * Check if a role can interact with this interactable
   */
  static canInteract(type: InteractableState['type'], state: Record<string, unknown>, role: Role): boolean {
    switch (type) {
      case 'crate':
        return role === 'panda';

      case 'winch':
        return role === 'panda';

      case 'camera_node':
        return role === 'dog';

      case 'lever': {
        const leverState = state as { requiresStrength?: boolean };
        if (leverState.requiresStrength && role === 'dog') {
          return false;
        }
        return true;
      }

      case 'door': {
        const doorState = state as { locked?: boolean; requiresHeavy?: boolean };
        if (doorState.locked) return false;
        if (doorState.requiresHeavy && role === 'dog') return false;
        return true;
      }

      case 'pressure_plate':
        // Pressure plates are passive - check weight
        return false;

      case 'button':
      case 'platform':
        return true;

      case 'hazard':
        return false;

      default:
        return true;
    }
  }

  /**
   * Get interaction prompt text
   */
  getPromptText(role: Role): string | null {
    if (!InteractableRenderer.canInteract(this.type, this.state, role)) {
      return null;
    }

    switch (this.type) {
      case 'door':
        return (this.state as { open: boolean }).open ? 'Close Door' : 'Open Door';
      case 'lever':
        return 'Pull Lever';
      case 'button':
        return 'Press Button';
      case 'crate':
        return 'Push Crate';
      case 'winch':
        return 'Operate Winch';
      case 'camera_node':
        return 'View Camera';
      default:
        return 'Interact';
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
