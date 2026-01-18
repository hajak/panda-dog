/* ============================================
   SHADOW NINJA - Dungeon Floor B1
   First underground level with skeletons
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

export function createDungeonB1Level(): LevelData {
  const width = 18;
  const height = 14;
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

  // === DUNGEON B1 LAYOUT ===
  // Entry chamber from stairs
  fillRect(2, 2, 5, 5, 'stone', 0);

  // Main corridor (east-west)
  fillRect(5, 3, 15, 4, 'stone', 0);

  // North chamber (skeletons patrol here)
  fillRect(8, 1, 13, 3, 'stone', 0);

  // South chamber
  fillRect(8, 4, 13, 7, 'stone', 0);

  // Eastern room (treasure + stairs down)
  fillRect(13, 2, 16, 6, 'stone', 0);

  // Western alcove (hiding spot)
  fillRect(2, 6, 4, 8, 'grass', 0, { hidingSpot: true });

  // Narrow passage to south
  fillRect(6, 5, 7, 10, 'stone', 0);

  // Southern chamber
  fillRect(3, 9, 10, 12, 'stone', 0);

  // Walls around everything
  fillRect(1, 1, 1, 9, 'wall', 0);
  fillRect(1, 1, 6, 1, 'wall', 0);
  fillRect(7, 0, 14, 0, 'wall', 0);
  fillRect(14, 1, 17, 1, 'wall', 0);
  fillRect(17, 1, 17, 7, 'wall', 0);
  fillRect(14, 7, 17, 7, 'wall', 0);
  fillRect(14, 7, 14, 8, 'wall', 0);
  fillRect(8, 8, 14, 8, 'wall', 0);
  fillRect(11, 8, 11, 13, 'wall', 0);
  fillRect(2, 13, 11, 13, 'wall', 0);
  fillRect(2, 8, 2, 13, 'wall', 0);
  fillRect(5, 6, 5, 8, 'wall', 0);
  fillRect(1, 9, 2, 9, 'wall_low', 0);

  // Water hazard
  fillRect(8, 10, 9, 11, 'water', -0.5);

  return {
    width,
    height,
    tiles,
    playerSpawn: { x: 3, y: 3 },
    enemySpawns: [
      // Skeletons patrolling north chamber
      {
        type: 'skeleton',
        x: 9,
        y: 2,
        patrol: [
          { x: 9, y: 2 },
          { x: 12, y: 2 },
        ],
      },
      {
        type: 'skeleton',
        x: 11,
        y: 2,
        patrol: [
          { x: 11, y: 2 },
          { x: 8, y: 2 },
        ],
      },
      // Skeleton in main corridor
      {
        type: 'skeleton',
        x: 7,
        y: 3,
        patrol: [
          { x: 7, y: 3 },
          { x: 12, y: 3 },
          { x: 12, y: 6 },
          { x: 7, y: 6 },
        ],
      },
      // Guard in eastern room (protecting stairs)
      {
        type: 'guard',
        x: 15,
        y: 4,
        patrol: [
          { x: 15, y: 3 },
          { x: 15, y: 5 },
        ],
      },
      // Skeleton in southern chamber
      {
        type: 'skeleton',
        x: 6,
        y: 10,
        patrol: [
          { x: 4, y: 10 },
          { x: 6, y: 10 },
          { x: 6, y: 11 },
          { x: 4, y: 11 },
        ],
      },
    ],
    props: [
      // Lanterns
      { type: 'lantern', x: 3, y: 2 },
      { type: 'lantern', x: 9, y: 1 },
      { type: 'lantern', x: 15, y: 2 },
      { type: 'lantern', x: 5, y: 10 },
      // Barrels
      { type: 'barrel', x: 4, y: 4 },
      { type: 'barrel', x: 14, y: 3 },
      // Crates
      { type: 'crate', x: 10, y: 6 },
      { type: 'crate', x: 4, y: 12 },
      // Rocks
      { type: 'rock', x: 3, y: 7 },
    ],
    interactables: [
      // Stairs up (back to dungeon)
      {
        type: 'stairs_up',
        x: 3,
        y: 3,
        properties: {
          targetLevel: 'dungeon',
          targetSpawn: { x: 7, y: 5 },
        },
      },
      // Stairs down to B2
      {
        type: 'stairs_down',
        x: 15,
        y: 5,
        properties: {
          targetLevel: 'dungeon_b2',
          targetSpawn: { x: 3, y: 3 },
        },
      },
      // Health pickup
      {
        type: 'pickup_health',
        x: 10,
        y: 2,
        properties: { amount: 30 },
      },
      // Shuriken pickup in south
      {
        type: 'pickup_shuriken',
        x: 9,
        y: 12,
        properties: { count: 5 },
      },
    ],
    exits: [],
  };
}
