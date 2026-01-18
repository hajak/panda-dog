/* ============================================
   SHADOW NINJA - Dungeon Level
   Dark interior with traps and guards
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

export function createDungeonLevel(): LevelData {
  const width = 16;
  const height = 12;
  const tiles: TileData[][] = [];

  // Initialize with void
  for (let row = 0; row < height; row++) {
    const rowData: TileData[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push(createTile('void', 0));
    }
    tiles.push(rowData);
  }

  // Helper to set tiles
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

  // === DUNGEON LAYOUT ===

  // Main room - stone floor
  fillRect(2, 2, 13, 9, 'stone', 0);

  // Walls around the room
  fillRect(1, 1, 14, 1, 'wall', 0);
  fillRect(1, 10, 14, 10, 'wall', 0);
  fillRect(1, 1, 1, 10, 'wall', 0);
  fillRect(14, 1, 14, 10, 'wall', 0);

  // Entry corridor (from courtyard)
  fillRect(2, 2, 3, 2, 'stone', 0);
  setTile(2, 1, 'stone', 0); // Door position

  // Central pillars
  setTile(5, 4, 'wall_low', 0);
  setTile(5, 7, 'wall_low', 0);
  setTile(10, 4, 'wall_low', 0);
  setTile(10, 7, 'wall_low', 0);

  // Alcove with hiding spot (dark corner)
  fillRect(11, 7, 13, 9, 'grass', 0, { hidingSpot: true });

  // Raised platform area
  fillRect(11, 2, 13, 4, 'stone', 1);
  setTile(10, 3, 'stone', 0.5, { climbable: true });

  // Water/pit hazard
  fillRect(6, 5, 8, 6, 'water', -0.5);

  return {
    width,
    height,
    tiles,
    playerSpawn: { x: 3, y: 3 },
    enemySpawns: [
      // Guard patrolling main area
      {
        type: 'guard',
        x: 7,
        y: 3,
        patrol: [
          { x: 7, y: 3 },
          { x: 7, y: 8 },
          { x: 12, y: 8 },
          { x: 12, y: 3 },
        ],
      },
      // Guard near treasure
      {
        type: 'guard',
        x: 12,
        y: 3,
        patrol: [
          { x: 12, y: 3 },
          { x: 12, y: 4 },
        ],
      },
    ],
    props: [
      // Barrels
      { type: 'barrel', x: 3, y: 8 },
      { type: 'barrel', x: 4, y: 8 },

      // Crates
      { type: 'crate', x: 13, y: 8 },

      // Lanterns for atmosphere
      { type: 'lantern', x: 5, y: 2 },
      { type: 'lantern', x: 10, y: 2 },
      { type: 'lantern', x: 5, y: 9 },
    ],
    interactables: [
      // Exit door back to courtyard
      {
        type: 'door',
        x: 2,
        y: 1,
        properties: { state: 'closed' },
      },
      // Stairs down to dungeon B1
      {
        type: 'stairs_down',
        x: 7,
        y: 5,
        properties: {
          targetLevel: 'dungeon_b1',
          targetSpawn: { x: 3, y: 3 },
        },
      },
      // Health pickup
      {
        type: 'pickup_health',
        x: 12.5,
        y: 2.5,
        properties: { amount: 50 },
      },
      // Shuriken pickup
      {
        type: 'pickup_shuriken',
        x: 4,
        y: 4,
        properties: { count: 5 },
      },
    ],
    exits: [
      // Exit back to courtyard - spawn away from guard patrol
      {
        x: 2,
        y: 1,
        targetLevel: 'courtyard',
        targetSpawn: { x: 6, y: 8 },
      },
    ],
  };
}
