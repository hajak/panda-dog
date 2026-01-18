/* ============================================
   SHADOW NINJA - Interactable System
   ============================================ */

import type { WorldPos } from '../engine/types';

export type InteractableType =
  | 'door'
  | 'lever'
  | 'chest'
  | 'pickup_shuriken'
  | 'pickup_health'
  | 'pickup_key'
  | 'climbable'
  | 'stairs_down'
  | 'stairs_up';

export interface InteractableConfig {
  id: string;
  type: InteractableType;
  position: WorldPos;
  properties?: Record<string, unknown>;
}

export interface Interactable {
  id: string;
  type: InteractableType;
  position: WorldPos;
  state: 'default' | 'active' | 'used' | 'locked';
  promptText: string;
  linkedId?: string;
  properties: Record<string, unknown>;
}

export interface InteractionResult {
  success: boolean;
  message?: string;
  effects: InteractionEffect[];
}

export type InteractionEffect =
  | { type: 'pickup'; itemType: string; amount: number }
  | { type: 'toggle'; targetId: string; newState: string }
  | { type: 'unlock'; targetId: string }
  | { type: 'heal'; amount: number }
  | { type: 'climb'; target: WorldPos }
  | { type: 'message'; text: string }
  | { type: 'level_transition'; targetLevel: string; targetSpawn: { x: number; y: number } };

export class InteractableManager {
  private interactables: Map<string, Interactable> = new Map();

  /**
   * Register an interactable
   */
  register(config: InteractableConfig): Interactable {
    const interactable: Interactable = {
      id: config.id,
      type: config.type,
      position: config.position,
      state: 'default',
      promptText: this.getPromptText(config.type),
      linkedId: config.properties?.linkedId as string | undefined,
      properties: config.properties ?? {},
    };

    this.interactables.set(config.id, interactable);
    return interactable;
  }

  /**
   * Remove an interactable
   */
  unregister(id: string): void {
    this.interactables.delete(id);
  }

  /**
   * Clear all interactables
   */
  clear(): void {
    this.interactables.clear();
  }

  /**
   * Get interactable by ID
   */
  get(id: string): Interactable | undefined {
    return this.interactables.get(id);
  }

  /**
   * Find nearest interactable to a position
   */
  findNearest(pos: WorldPos, maxRange: number = 1.5): Interactable | null {
    let nearest: Interactable | null = null;
    let nearestDist = maxRange;

    for (const interactable of this.interactables.values()) {
      if (interactable.state === 'used') continue;

      const dx = interactable.position.x - pos.x;
      const dy = interactable.position.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = interactable;
      }
    }

    return nearest;
  }

  /**
   * Interact with an interactable
   */
  interact(id: string, playerInventory?: { hasKey: (key: string) => boolean }): InteractionResult {
    const interactable = this.interactables.get(id);
    if (!interactable) {
      return { success: false, message: 'Nothing to interact with', effects: [] };
    }

    if (interactable.state === 'used') {
      return { success: false, message: 'Already used', effects: [] };
    }

    if (interactable.state === 'locked') {
      const requiredKey = interactable.properties.requiredKey as string | undefined;
      if (requiredKey && playerInventory?.hasKey(requiredKey)) {
        interactable.state = 'default';
        return {
          success: true,
          message: 'Unlocked!',
          effects: [{ type: 'unlock', targetId: id }],
        };
      }
      return { success: false, message: 'Locked', effects: [] };
    }

    return this.processInteraction(interactable);
  }

  private processInteraction(interactable: Interactable): InteractionResult {
    const effects: InteractionEffect[] = [];

    switch (interactable.type) {
      case 'door': {
        const newState = interactable.state === 'active' ? 'default' : 'active';
        interactable.state = newState;
        effects.push({
          type: 'toggle',
          targetId: interactable.id,
          newState: newState === 'active' ? 'open' : 'closed',
        });
        return { success: true, effects };
      }

      case 'lever': {
        const newState = interactable.state === 'active' ? 'default' : 'active';
        interactable.state = newState;

        // Toggle linked object
        if (interactable.linkedId) {
          const linked = this.interactables.get(interactable.linkedId);
          if (linked) {
            linked.state = newState;
            effects.push({
              type: 'toggle',
              targetId: interactable.linkedId,
              newState: newState === 'active' ? 'open' : 'closed',
            });
          }
        }

        effects.push({
          type: 'toggle',
          targetId: interactable.id,
          newState: newState === 'active' ? 'on' : 'off',
        });
        return { success: true, effects };
      }

      case 'chest': {
        if (interactable.state !== 'used') {
          interactable.state = 'used';
          const contents = interactable.properties.contents as { type: string; amount: number }[] | undefined;
          if (contents) {
            for (const item of contents) {
              effects.push({ type: 'pickup', itemType: item.type, amount: item.amount });
            }
          }
          effects.push({ type: 'toggle', targetId: interactable.id, newState: 'open' });
        }
        return { success: true, effects };
      }

      case 'pickup_shuriken': {
        interactable.state = 'used';
        const amount = (interactable.properties.count as number) ?? 3;
        effects.push({ type: 'pickup', itemType: 'shuriken', amount });
        return { success: true, effects };
      }

      case 'pickup_health': {
        interactable.state = 'used';
        const amount = (interactable.properties.amount as number) ?? 25;
        effects.push({ type: 'heal', amount });
        return { success: true, effects };
      }

      case 'pickup_key': {
        interactable.state = 'used';
        const keyId = (interactable.properties.keyId as string) ?? 'default_key';
        effects.push({ type: 'pickup', itemType: `key_${keyId}`, amount: 1 });
        return { success: true, effects };
      }

      case 'climbable': {
        const target = interactable.properties.climbTarget as WorldPos | undefined;
        if (target) {
          effects.push({ type: 'climb', target });
        }
        return { success: true, effects };
      }

      case 'stairs_down':
      case 'stairs_up': {
        const targetLevel = interactable.properties.targetLevel as string | undefined;
        const targetSpawn = interactable.properties.targetSpawn as { x: number; y: number } | undefined;
        if (targetLevel && targetSpawn) {
          effects.push({ type: 'level_transition', targetLevel, targetSpawn });
        }
        return { success: true, effects };
      }

      default:
        return { success: false, message: 'Cannot interact', effects: [] };
    }
  }

  private getPromptText(type: InteractableType): string {
    const prompts: Record<InteractableType, string> = {
      door: 'Open',
      lever: 'Pull',
      chest: 'Open',
      pickup_shuriken: 'Pick up',
      pickup_health: 'Pick up',
      pickup_key: 'Pick up',
      climbable: 'Climb',
      stairs_down: 'Descend',
      stairs_up: 'Ascend',
    };
    return prompts[type] ?? 'Interact';
  }

  /**
   * Get all interactables
   */
  getAll(): Interactable[] {
    return Array.from(this.interactables.values());
  }

  /**
   * Update interactable state externally
   */
  setState(id: string, state: 'default' | 'active' | 'used' | 'locked'): void {
    const interactable = this.interactables.get(id);
    if (interactable) {
      interactable.state = state;
    }
  }
}
