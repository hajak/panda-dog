/* ============================================
   SHADOW NINJA - Courtyard Level (Vertical Slice)
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
  exits?: { x: number; y: number; targetLevel: string; targetSpawn: { x: number; y: number } }[];
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

export function createCourtyardLevel(): LevelData {
  const width = 20;
  const height = 20;
  const tiles: TileData[][] = [];

  // Initialize with grass
  for (let row = 0; row < height; row++) {
    const rowData: TileData[] = [];
    for (let col = 0; col < width; col++) {
      rowData.push(createTile('grass', 0));
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

  // === LAYOUT ===

  // Outer walls (void/boundary)
  fillRect(0, 0, width - 1, 0, 'void');
  fillRect(0, height - 1, width - 1, height - 1, 'void');
  fillRect(0, 0, 0, height - 1, 'void');
  fillRect(width - 1, 0, width - 1, height - 1, 'void');

  // Main courtyard - stone floor
  fillRect(5, 5, 14, 14, 'stone', 0);

  // Central garden area with hiding bushes
  fillRect(8, 8, 11, 11, 'grass', 0, { hidingSpot: true });

  // Raised platform (NE corner) - elevation 1
  fillRect(13, 2, 17, 6, 'stone', 1);
  // Steps to platform
  setTile(12, 4, 'stone', 0.5, { climbable: true });
  setTile(12, 5, 'stone', 0.5, { climbable: true });

  // Building (NW corner)
  fillRect(2, 2, 6, 5, 'wall', 0);
  // Door opening - initially blocked by door
  setTile(4, 5, 'stone', 0, { walkable: false }); // Door blocks this
  setTile(5, 5, 'stone', 0);

  // Water feature (SW area)
  fillRect(2, 12, 5, 16, 'water', -0.5);
  // Bridge over water
  fillRect(3, 14, 4, 14, 'bridge', 0);

  // Low walls / fences around courtyard
  fillRect(5, 4, 6, 4, 'fence', 0);
  fillRect(13, 4, 14, 4, 'fence', 0);
  fillRect(4, 15, 4, 17, 'fence', 0);

  // Alcove for hiding (SE)
  fillRect(15, 13, 17, 17, 'grass', 0, { hidingSpot: true });
  setTile(15, 12, 'wall_low', 0);
  setTile(16, 12, 'wall_low', 0);
  setTile(17, 12, 'wall_low', 0);
  setTile(14, 13, 'wall_low', 0);
  setTile(14, 14, 'wall_low', 0);

  // Path through courtyard
  fillRect(7, 5, 7, 14, 'stone', 0);
  fillRect(7, 10, 12, 10, 'stone', 0);

  // Second elevated area (small tower base)
  fillRect(2, 8, 3, 10, 'stone', 1.5);
  setTile(4, 9, 'stone', 0.75, { climbable: true });

  return {
    width,
    height,
    tiles,
    playerSpawn: { x: 10, y: 10 },
    enemySpawns: [
      // Guard patrolling outer perimeter of courtyard
      {
        type: 'guard',
        x: 5,
        y: 6,
        patrol: [
          { x: 5, y: 6 },
          { x: 5, y: 14 },
          { x: 14, y: 14 },
          { x: 14, y: 6 },
        ],
      },
      // Guard patrolling inner courtyard and paths
      {
        type: 'guard',
        x: 8,
        y: 7,
        patrol: [
          { x: 8, y: 7 },
          { x: 12, y: 7 },
          { x: 12, y: 13 },
          { x: 8, y: 13 },
        ],
      },
      // Guard patrolling near water and south area
      {
        type: 'guard',
        x: 6,
        y: 11,
        patrol: [
          { x: 6, y: 11 },
          { x: 6, y: 17 },
          { x: 13, y: 17 },
          { x: 13, y: 11 },
        ],
      },
      // Archer on tower - facing east toward courtyard
      {
        type: 'archer',
        x: 3,
        y: 9,
        facing: 'E',
      },
    ],
    props: [
      // Trees
      { type: 'tree', x: 1, y: 7 },
      { type: 'tree', x: 18, y: 2 },
      { type: 'tree', x: 18, y: 8 },

      // Bushes (decorative, not hiding spots)
      { type: 'bush', x: 6, y: 6 },
      { type: 'bush', x: 13, y: 6 },

      // Crates
      { type: 'crate', x: 3, y: 4 },
      { type: 'crate', x: 16, y: 15 },

      // Barrels
      { type: 'barrel', x: 5, y: 3 },
      { type: 'barrel', x: 16, y: 3 },

      // Lanterns
      { type: 'lantern', x: 7, y: 5 },
      { type: 'lantern', x: 12, y: 5 },
      { type: 'lantern', x: 7, y: 14 },

      // Rocks
      { type: 'rock', x: 2, y: 14 },
      { type: 'rock', x: 6, y: 17 },
    ],
    interactables: [
      // Main gate
      {
        type: 'door',
        x: 4.5,
        y: 5,
        properties: { state: 'closed', requiredKey: null },
      },
      // Shuriken pickup
      {
        type: 'pickup_shuriken',
        x: 16,
        y: 16,
        properties: { count: 3 },
      },
      // Health pickup
      {
        type: 'pickup_health',
        x: 2.5,
        y: 9.5,
        properties: { amount: 25 },
      },
      // Lever for gate - linkedId matches auto-generated door id
      {
        type: 'lever',
        x: 3,
        y: 3,
        properties: { linkedId: 'interact_door_4.5_5', state: 'off' },
      },
    ],
    exits: [
      // Exit to dungeon through the building door
      {
        x: 4.5,
        y: 5,
        targetLevel: 'dungeon',
        targetSpawn: { x: 3, y: 3 },
      },
    ],
  };
}
