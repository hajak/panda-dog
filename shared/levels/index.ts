/**
 * Panda & Dog - Level Registry
 * Central registry for all game levels
 */

import type { LevelData } from '../types';
import { createVerticalSliceLevel } from './VerticalSlice';

type LevelFactory = () => LevelData;

const LEVEL_REGISTRY: Record<string, LevelFactory> = {
  'vertical_slice': createVerticalSliceLevel,
};

export function getLevel(levelId: string): LevelData | null {
  const factory = LEVEL_REGISTRY[levelId];
  if (!factory) {
    console.error(`Level not found: ${levelId}`);
    return null;
  }
  return factory();
}

export function getLevelList(): string[] {
  return Object.keys(LEVEL_REGISTRY);
}

export { createVerticalSliceLevel };
