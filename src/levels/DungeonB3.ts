/* ============================================
   SHADOW NINJA - Dungeon Floor B3 (Boss Level)
   The Shogun's lair - final boss encounter
   ============================================ */

import type { TileData, TileType, Direction8 } from '../engine/types';

interface LevelData {
  width: number;
  height: number;
  tiles: TileData[][];
  playerSpawn: { x: number; y: number };
  enemySpawns: { type: string; x: number; y: number; patrol?: { x: number; y: number }[]; facing?: Direction8 }[];
  props: { type: string; x: number; y: number }[];
  interactables: { type: string; x: number; y: number; properties?: Record<string, unknown> }[];
  exits: { x: number; y: number; targetLevel: string; targetSpawn: { x: number; y: number } }[];
}

function createTile(type: TileType, elevation: number = 0, options: Partial<TileData> = {}): TileData {
  const baseConfigs: Record<TileType, Partial<TileData>> = {
    ground: { walkable: true },
    grass: { walkable: true, hidingSpot: false },
    stone: { walkable: true },
    water: { walkable: false },
    bridge: { walkable: true },
    wall: { walkable: false, occluder: true },
    wall_low: { walkable: false },
    fence: { walkable: false },
    void: { walkable: false },
  };

  const base = baseConfigs[type] || {};

  return {
    type,
    elevation,
    walkable: options.walkable ?? base.walkable ?? false,
    climbable: options.climbable ?? base.climbable ?? false,
    hidingSpot: options.hidingSpot ?? base.hidingSpot ?? false,
    interactable: options.interactable ?? false,
    occluder: options.occluder ?? base.occluder ?? false,
  };
}

export function createDungeonB3Level(): LevelData {
  const width = 22;
  const height = 18;
  const tiles: TileData[][] = [];

  for (let row = 0; row < height; row++) {
    const rowData: TileData[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push(createTile('void', 0));
    }
    tiles.push(rowData);
  }

  const setTile = (col: number, row: number, type: TileType, elevation: number = 0, options: Partial<TileData> = {}) => {
    if (row >= 0 && row < height && col >= 0 && col < width) {
      tiles[row][col] = createTile(type, elevation, options);
    }
  };

  const fillRect = (x1: number, y1: number, x2: number, y2: number, type: TileType, elevation: number = 0, options: Partial<TileData> = {}) => {
    for (let row = y1; row <= y2; row++) {
      for (let col = x1; col <= x2; col++) {
        setTile(col, row, type, elevation, options);
      }
    }
  };

  // === DUNGEON B3 LAYOUT - Shogun's Throne Room ===

  // Entry corridor
  fillRect(7, 1, 14, 4, 'stone', 0);

  // Main boss arena (large circular-ish room)
  fillRect(3, 4, 18, 14, 'stone', 0);

  // Throne platform (elevated, at the back)
  fillRect(8, 12, 13, 14, 'stone', 1);
  fillRect(9, 13, 12, 14, 'stone', 1.5);

  // Steps to throne
  setTile(8, 11, 'stone', 0.5, { climbable: true });
  setTile(13, 11, 'stone', 0.5, { climbable: true });
  setTile(9, 12, 'stone', 0.75, { climbable: true });
  setTile(12, 12, 'stone', 0.75, { climbable: true });

  // Pillars around arena
  setTile(5, 6, 'wall_low', 0);
  setTile(5, 10, 'wall_low', 0);
  setTile(16, 6, 'wall_low', 0);
  setTile(16, 10, 'wall_low', 0);
  setTile(8, 6, 'wall_low', 0);
  setTile(13, 6, 'wall_low', 0);
  setTile(8, 10, 'wall_low', 0);
  setTile(13, 10, 'wall_low', 0);

  // Side alcoves (hiding spots)
  fillRect(2, 6, 3, 8, 'grass', 0, { hidingSpot: true });
  fillRect(18, 6, 19, 8, 'grass', 0, { hidingSpot: true });

  // Decorative water/lava moats around throne
  fillRect(6, 12, 7, 14, 'water', -0.5);
  fillRect(14, 12, 15, 14, 'water', -0.5);

  // Small antechambers
  fillRect(2, 10, 4, 13, 'stone', 0);
  fillRect(17, 10, 19, 13, 'stone', 0);

  // Walls
  fillRect(6, 0, 15, 0, 'wall', 0);
  fillRect(6, 0, 6, 4, 'wall', 0);
  fillRect(15, 0, 15, 4, 'wall', 0);
  fillRect(2, 4, 6, 4, 'wall', 0);
  fillRect(15, 4, 19, 4, 'wall', 0);
  fillRect(1, 4, 1, 14, 'wall', 0);
  fillRect(20, 4, 20, 14, 'wall', 0);
  fillRect(1, 14, 5, 14, 'wall', 0);
  fillRect(16, 14, 20, 14, 'wall', 0);
  fillRect(1, 14, 1, 15, 'wall', 0);
  fillRect(20, 14, 20, 15, 'wall', 0);
  fillRect(5, 15, 16, 15, 'wall', 0);

  // Inner wall decorations
  setTile(4, 5, 'wall_low', 0);
  setTile(17, 5, 'wall_low', 0);
  setTile(4, 13, 'wall_low', 0);
  setTile(17, 13, 'wall_low', 0);

  return {
    width,
    height,
    tiles,
    playerSpawn: { x: 9, y: 3 },
    enemySpawns: [
      // THE SHOGUN BOSS - center of throne area
      {
        type: 'boss',
        x: 10,
        y: 13,
        facing: 'N',
      },
      // Elite guards flanking the boss
      {
        type: 'guard',
        x: 7,
        y: 12,
        patrol: [
          { x: 6, y: 12 },
          { x: 8, y: 12 },
        ],
      },
      {
        type: 'guard',
        x: 14,
        y: 12,
        patrol: [
          { x: 13, y: 12 },
          { x: 15, y: 12 },
        ],
      },
      // Skeletons in antechambers
      {
        type: 'skeleton',
        x: 3,
        y: 11,
      },
      {
        type: 'skeleton',
        x: 18,
        y: 11,
      },
      // Archers on raised positions
      {
        type: 'archer',
        x: 3,
        y: 5,
        facing: 'E',
      },
      {
        type: 'archer',
        x: 18,
        y: 5,
        facing: 'W',
      },
    ],
    props: [
      // Lanterns (dramatic lighting)
      { type: 'lantern', x: 9, y: 1 },
      { type: 'lantern', x: 12, y: 1 },
      { type: 'lantern', x: 4, y: 5 },
      { type: 'lantern', x: 17, y: 5 },
      { type: 'lantern', x: 4, y: 11 },
      { type: 'lantern', x: 17, y: 11 },
      { type: 'lantern', x: 9, y: 8 },
      { type: 'lantern', x: 12, y: 8 },
      // Decorative barrels/crates
      { type: 'barrel', x: 3, y: 12 },
      { type: 'barrel', x: 18, y: 12 },
      { type: 'crate', x: 7, y: 2 },
      { type: 'crate', x: 14, y: 2 },
      // Rocks
      { type: 'rock', x: 2, y: 7 },
      { type: 'rock', x: 19, y: 7 },
    ],
    interactables: [
      // Stairs up to B2 (escape route)
      {
        type: 'stairs_up',
        x: 10,
        y: 2,
        properties: {
          targetLevel: 'dungeon_b2',
          targetSpawn: { x: 11, y: 14 },
        },
      },
      // Victory stairs (after defeating boss - leads back to courtyard)
      // This appears after boss is defeated (would need special logic)
      {
        type: 'stairs_up',
        x: 11,
        y: 14,
        properties: {
          targetLevel: 'courtyard',
          targetSpawn: { x: 10, y: 10 },
        },
      },
      // Health pickups for boss fight
      {
        type: 'pickup_health',
        x: 2,
        y: 7,
        properties: { amount: 50 },
      },
      {
        type: 'pickup_health',
        x: 19,
        y: 7,
        properties: { amount: 50 },
      },
      // Shuriken pickups in alcoves
      {
        type: 'pickup_shuriken',
        x: 2,
        y: 6,
        properties: { count: 10 },
      },
      {
        type: 'pickup_shuriken',
        x: 19,
        y: 8,
        properties: { count: 10 },
      },
    ],
    exits: [],
  };
}
