/* ============================================
   SHADOW NINJA - Dungeon Floor B2
   Deeper level with Oni demons
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

export function createDungeonB2Level(): LevelData {
  const width = 20;
  const height = 16;
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

  // === DUNGEON B2 LAYOUT - Oni Lair ===

  // Entry chamber from stairs
  fillRect(2, 2, 5, 5, 'stone', 0);

  // Main hall (large open area for Oni combat)
  fillRect(5, 4, 14, 11, 'stone', 0);

  // Northern alcoves
  fillRect(7, 2, 9, 4, 'stone', 0);
  fillRect(11, 2, 13, 4, 'stone', 0);

  // Western corridor
  fillRect(2, 5, 5, 8, 'stone', 0);
  fillRect(2, 8, 4, 12, 'stone', 0);

  // Eastern room (Oni den)
  fillRect(14, 6, 17, 10, 'stone', 0);

  // Southern chamber (stairs to B3)
  fillRect(8, 11, 14, 14, 'stone', 0);

  // Hiding spots
  fillRect(3, 10, 4, 11, 'grass', 0, { hidingSpot: true });
  fillRect(16, 7, 17, 8, 'grass', 0, { hidingSpot: true });

  // Elevated platform in center
  fillRect(8, 6, 11, 9, 'stone', 0.5);
  setTile(7, 7, 'stone', 0.25, { climbable: true });
  setTile(12, 8, 'stone', 0.25, { climbable: true });

  // Lava pits (dangerous!)
  fillRect(5, 9, 6, 10, 'water', -0.5); // Water represents lava visually
  fillRect(13, 5, 13, 6, 'water', -0.5);

  // Walls
  fillRect(1, 1, 6, 1, 'wall', 0);
  fillRect(1, 1, 1, 13, 'wall', 0);
  fillRect(1, 13, 7, 13, 'wall', 0);
  fillRect(7, 13, 7, 15, 'wall', 0);
  fillRect(7, 15, 15, 15, 'wall', 0);
  fillRect(15, 11, 15, 15, 'wall', 0);
  fillRect(15, 11, 18, 11, 'wall', 0);
  fillRect(18, 5, 18, 11, 'wall', 0);
  fillRect(14, 5, 18, 5, 'wall', 0);
  fillRect(14, 2, 14, 5, 'wall', 0);
  fillRect(10, 1, 14, 1, 'wall', 0);
  fillRect(6, 1, 6, 2, 'wall', 0);
  fillRect(10, 1, 10, 2, 'wall', 0);
  fillRect(5, 3, 5, 4, 'wall_low', 0);

  // Pillars in main hall
  setTile(6, 5, 'wall_low', 0);
  setTile(6, 10, 'wall_low', 0);
  setTile(13, 10, 'wall_low', 0);

  return {
    width,
    height,
    tiles,
    playerSpawn: { x: 3, y: 3 },
    enemySpawns: [
      // Oni in main hall (slow but deadly)
      {
        type: 'oni',
        x: 10,
        y: 5,
        patrol: [
          { x: 7, y: 5 },
          { x: 12, y: 5 },
          { x: 12, y: 10 },
          { x: 7, y: 10 },
        ],
      },
      // Oni in eastern den
      {
        type: 'oni',
        x: 16,
        y: 8,
        patrol: [
          { x: 15, y: 7 },
          { x: 16, y: 9 },
        ],
      },
      // Skeletons as minions
      {
        type: 'skeleton',
        x: 8,
        y: 3,
        patrol: [
          { x: 8, y: 3 },
          { x: 8, y: 5 },
        ],
      },
      {
        type: 'skeleton',
        x: 12,
        y: 3,
        patrol: [
          { x: 12, y: 3 },
          { x: 12, y: 5 },
        ],
      },
      // Guard near stairs down
      {
        type: 'guard',
        x: 11,
        y: 13,
        patrol: [
          { x: 9, y: 13 },
          { x: 13, y: 13 },
        ],
      },
      // Archer on elevated platform
      {
        type: 'archer',
        x: 9,
        y: 7,
        facing: 'S',
      },
    ],
    props: [
      // Lanterns (fewer - darker atmosphere)
      { type: 'lantern', x: 3, y: 2 },
      { type: 'lantern', x: 8, y: 2 },
      { type: 'lantern', x: 12, y: 2 },
      { type: 'lantern', x: 16, y: 6 },
      { type: 'lantern', x: 11, y: 14 },
      // Barrels and crates
      { type: 'barrel', x: 4, y: 4 },
      { type: 'barrel', x: 15, y: 9 },
      { type: 'crate', x: 3, y: 7 },
      { type: 'crate', x: 14, y: 8 },
      // Rocks
      { type: 'rock', x: 6, y: 11 },
      { type: 'rock', x: 14, y: 13 },
    ],
    interactables: [
      // Stairs up to B1
      {
        type: 'stairs_up',
        x: 3,
        y: 3,
        properties: {
          targetLevel: 'dungeon_b1',
          targetSpawn: { x: 15, y: 5 },
        },
      },
      // Stairs down to B3 (boss level)
      {
        type: 'stairs_down',
        x: 11,
        y: 14,
        properties: {
          targetLevel: 'dungeon_b3',
          targetSpawn: { x: 9, y: 3 },
        },
      },
      // Health pickup on elevated platform
      {
        type: 'pickup_health',
        x: 10,
        y: 8,
        properties: { amount: 50 },
      },
      // Shuriken pickup in hiding spot
      {
        type: 'pickup_shuriken',
        x: 3,
        y: 11,
        properties: { count: 8 },
      },
      // Health in Oni den (risk/reward)
      {
        type: 'pickup_health',
        x: 17,
        y: 7,
        properties: { amount: 40 },
      },
    ],
    exits: [],
  };
}
