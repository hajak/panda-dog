/* ============================================
   SHADOW NINJA - Prop Manager
   Handles props with occlusion fading
   ============================================ */

import { Container } from 'pixi.js';
import { createPropShape, createDoorShape, createPickupShape } from '../engine/ShapeRenderer';
import { worldToScreen, getDepthValue, distanceXY } from '../engine/isometric';
import type { WorldPos } from '../engine/types';

export interface PropConfig {
  id: string;
  type: string;
  x: number;
  y: number;
  z?: number;
  interactive?: boolean;
  occluder?: boolean;
  state?: string;
}

export interface Prop {
  id: string;
  type: string;
  position: WorldPos;
  container: Container;
  interactive: boolean;
  occluder: boolean;
  state: string;
  targetAlpha: number;
  currentAlpha: number;
  boundingRadius: number;
}

const FADE_SPEED = 4; // Alpha change per second
const OCCLUSION_DISTANCE = 2; // Distance at which props start fading
const MIN_ALPHA = 0.3; // Minimum alpha when occluded

export class PropManager {
  private props: Map<string, Prop> = new Map();
  private container: Container;

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.sortableChildren = true;
    parentContainer.addChild(this.container);
  }

  /**
   * Add a prop to the scene
   */
  addProp(config: PropConfig): Prop {
    const visual = this.createPropVisual(config.type, config.state);
    const position: WorldPos = {
      x: config.x,
      y: config.y,
      z: config.z ?? 0,
    };

    const screen = worldToScreen(position);
    visual.x = screen.x;
    visual.y = screen.y;
    visual.zIndex = getDepthValue(position);

    const prop: Prop = {
      id: config.id,
      type: config.type,
      position,
      container: visual,
      interactive: config.interactive ?? false,
      occluder: config.occluder ?? this.isOccluderType(config.type),
      state: config.state ?? 'default',
      targetAlpha: 1,
      currentAlpha: 1,
      boundingRadius: this.getBoundingRadius(config.type),
    };

    this.props.set(config.id, prop);
    this.container.addChild(visual);

    return prop;
  }

  /**
   * Remove a prop from the scene
   */
  removeProp(id: string): void {
    const prop = this.props.get(id);
    if (prop) {
      this.container.removeChild(prop.container);
      prop.container.destroy({ children: true });
      this.props.delete(id);
    }
  }

  /**
   * Update prop state (e.g., door open/closed)
   */
  setPropState(id: string, state: string): void {
    const prop = this.props.get(id);
    if (prop && prop.state !== state) {
      prop.state = state;

      // Rebuild visual
      const newVisual = this.createPropVisual(prop.type, state);
      const screen = worldToScreen(prop.position);
      newVisual.x = screen.x;
      newVisual.y = screen.y;
      newVisual.zIndex = prop.container.zIndex;
      newVisual.alpha = prop.currentAlpha;

      this.container.removeChild(prop.container);
      prop.container.destroy({ children: true });
      prop.container = newVisual;
      this.container.addChild(newVisual);
    }
  }

  /**
   * Update occlusion fading based on player position
   */
  updateOcclusion(playerPos: WorldPos, deltaTime: number): void {
    for (const prop of this.props.values()) {
      if (!prop.occluder) continue;

      // Check if player is behind this prop (higher depth value)
      const propDepth = getDepthValue(prop.position);
      const playerDepth = getDepthValue(playerPos);

      // Player is behind the prop if their depth is higher AND they're close
      const distance = distanceXY(playerPos, prop.position);
      const isBehind = playerDepth > propDepth - 0.5 && distance < OCCLUSION_DISTANCE;

      // Check if player is within the prop's occlusion zone
      const inOcclusionZone = this.isInOcclusionZone(playerPos, prop);

      prop.targetAlpha = (isBehind || inOcclusionZone) ? MIN_ALPHA : 1;

      // Smooth alpha transition
      if (prop.currentAlpha !== prop.targetAlpha) {
        const alphaDiff = prop.targetAlpha - prop.currentAlpha;
        const alphaChange = Math.sign(alphaDiff) * FADE_SPEED * deltaTime;

        if (Math.abs(alphaDiff) <= Math.abs(alphaChange)) {
          prop.currentAlpha = prop.targetAlpha;
        } else {
          prop.currentAlpha += alphaChange;
        }

        prop.container.alpha = prop.currentAlpha;
      }
    }
  }

  /**
   * Get props near a position
   */
  getPropsNear(pos: WorldPos, radius: number): Prop[] {
    const nearby: Prop[] = [];

    for (const prop of this.props.values()) {
      if (distanceXY(pos, prop.position) <= radius) {
        nearby.push(prop);
      }
    }

    return nearby;
  }

  /**
   * Get interactive props near a position
   */
  getInteractableNear(pos: WorldPos, radius: number = 1.5): Prop | null {
    let closest: Prop | null = null;
    let closestDist = radius;

    for (const prop of this.props.values()) {
      if (!prop.interactive) continue;

      const dist = distanceXY(pos, prop.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = prop;
      }
    }

    return closest;
  }

  /**
   * Apply camera transform
   * Note: Parent layer already has camera transform applied by Tilemap,
   * so we don't apply it again here to avoid double transformation
   */
  applyCamera(_offsetX: number, _offsetY: number, _zoom: number): void {
    // Camera transform is already applied to parent layer by Tilemap
    // No additional transform needed here
  }

  /**
   * Sort props by depth
   */
  sortByDepth(): void {
    this.container.sortChildren();
  }

  // Private methods

  private createPropVisual(type: string, state?: string): Container {
    switch (type) {
      case 'door':
      case 'gate':
        return createDoorShape(state === 'open');

      case 'pickup_shuriken':
        return createPickupShape('shuriken');

      case 'pickup_health':
        return createPickupShape('health');

      case 'pickup_key':
        return createPickupShape('key');

      case 'tree':
      case 'bush':
      case 'crate':
      case 'barrel':
      case 'lantern':
      case 'rock':
        return createPropShape(type as 'tree' | 'bush' | 'crate' | 'barrel' | 'lantern' | 'rock');

      default:
        // Generic prop
        return createPropShape('crate');
    }
  }

  private isOccluderType(type: string): boolean {
    return ['tree', 'wall', 'pillar', 'building'].includes(type);
  }

  private getBoundingRadius(type: string): number {
    const radii: Record<string, number> = {
      tree: 1.2,
      bush: 0.6,
      crate: 0.5,
      barrel: 0.4,
      lantern: 0.3,
      rock: 0.5,
      door: 0.8,
      gate: 1.0,
    };
    return radii[type] ?? 0.5;
  }

  private isInOcclusionZone(playerPos: WorldPos, prop: Prop): boolean {
    // Simple bounding check for now
    const dx = playerPos.x - prop.position.x;
    const dy = playerPos.y - prop.position.y;

    // Player is in occlusion zone if they're behind (positive dy in iso) and close
    return dy > 0 && dy < prop.boundingRadius * 2 && Math.abs(dx) < prop.boundingRadius;
  }

  getProp(id: string): Prop | undefined {
    return this.props.get(id);
  }

  getAllProps(): Prop[] {
    return Array.from(this.props.values());
  }
}
