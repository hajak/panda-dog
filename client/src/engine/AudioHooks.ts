/* ============================================
   SHADOW NINJA - Audio Hook System
   Event-based audio triggers for easy sound integration
   ============================================ */

export type AudioEvent =
  // Player actions
  | 'player_footstep'
  | 'player_run_footstep'
  | 'player_jump'
  | 'player_land'
  | 'player_attack'
  | 'player_attack_combo'
  | 'player_block'
  | 'player_parry'
  | 'player_hurt'
  | 'player_death'
  | 'player_throw'
  | 'player_hide'
  | 'player_unhide'
  | 'player_climb_start'
  | 'player_climb_end'
  // Combat
  | 'hit_enemy'
  | 'hit_player'
  | 'hit_blocked'
  | 'hit_parried'
  | 'enemy_death'
  // Enemies
  | 'enemy_alert'
  | 'enemy_suspicious'
  | 'enemy_search'
  | 'enemy_attack'
  | 'archer_fire'
  // Projectiles
  | 'projectile_hit'
  | 'projectile_miss'
  | 'shuriken_throw'
  // Environment
  | 'door_open'
  | 'door_close'
  | 'lever_toggle'
  | 'pickup_item'
  | 'pickup_health'
  | 'ambient_wind'
  | 'ambient_water';

export interface AudioEventData {
  event: AudioEvent;
  volume?: number; // 0-1, default 1
  pitch?: number; // Multiplier, default 1
  position?: { x: number; y: number }; // For spatial audio
}

type AudioListener = (data: AudioEventData) => void;

class AudioHookSystem {
  private listeners: Map<AudioEvent | '*', Set<AudioListener>> = new Map();
  private enabled: boolean = true;

  on(event: AudioEvent | '*', listener: AudioListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  off(event: AudioEvent | '*', listener: AudioListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: AudioEvent, options: Omit<AudioEventData, 'event'> = {}): void {
    if (!this.enabled) return;

    const data: AudioEventData = {
      event,
      volume: options.volume ?? 1,
      pitch: options.pitch ?? 1,
      position: options.position,
    };

    // Notify specific listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(data);
      }
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      for (const listener of wildcardListeners) {
        listener(data);
      }
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  clear(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const audioHooks = new AudioHookSystem();

// Debug logger - can be enabled during development
export function enableAudioDebugLog(): () => void {
  return audioHooks.on('*', (data) => {
    console.log(`[Audio] ${data.event}`, data);
  });
}
