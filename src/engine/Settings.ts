/* ============================================
   SHADOW NINJA - Settings Manager
   Handles game settings and persistence
   ============================================ */

import { audioPlayer } from './AudioPlayer';
import { musicPlayer } from './MusicPlayer';

export interface GameSettings {
  musicVolume: number;
  effectsVolume: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.15,
  effectsVolume: 0.5,
};

const STORAGE_KEY = 'shadow-ninja-settings';

class SettingsManager {
  private settings: GameSettings;
  private listeners: Set<(settings: GameSettings) => void> = new Set();

  constructor() {
    this.settings = this.load();
    this.apply();
  }

  private load(): GameSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      console.warn('Failed to load settings from storage');
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      console.warn('Failed to save settings to storage');
    }
  }

  private apply(): void {
    musicPlayer.setVolume(this.settings.musicVolume);
    audioPlayer.setVolume(this.settings.effectsVolume);
  }

  get(): GameSettings {
    return { ...this.settings };
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    musicPlayer.setVolume(this.settings.musicVolume);
    this.save();
    this.notifyListeners();
  }

  setEffectsVolume(volume: number): void {
    this.settings.effectsVolume = Math.max(0, Math.min(1, volume));
    audioPlayer.setVolume(this.settings.effectsVolume);
    this.save();
    this.notifyListeners();
  }

  onChange(listener: (settings: GameSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.settings);
    }
  }
}

export const settings = new SettingsManager();
