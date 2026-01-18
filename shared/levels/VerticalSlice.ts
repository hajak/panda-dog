/**
 * Panda & Dog - Vertical Slice Level
 * A demonstration level featuring 3 cooperative puzzles
 *
 * Layout (30x20):
 * ┌────────────────────────────────────────────────────────────────┐
 * │  START AREA          │  PUZZLE A (Hazard)    │  TRANSITION    │
 * │  Dog & Panda spawn   │  Crate + Pressure     │  Path to B     │
 * │                      │  Plate + Laser        │                │
 * ├──────────────────────┼───────────────────────┼────────────────┤
 * │  PUZZLE B (Bridge)   │  PUZZLE C (Co-op)     │  EXIT          │
 * │  Power Switch +      │  Two Pressure Plates  │  Final Door    │
 * │  Winch + Bridge      │  + Heavy Door         │                │
 * └────────────────────────────────────────────────────────────────┘
 */

import type {
  LevelData,
  TileData,
  TileType,
  InteractableConfig,
  PuzzleConfig,
  WorldPos,
} from '../types';

function createTile(
  type: TileType,
  elevation: number = 0,
  walkable?: boolean
): TileData {
  const defaultWalkable: Record<TileType, boolean> = {
    ground: true,
    grass: true,
    stone: true,
    water: false,
    wall: false,
    bridge: true,
    void: false,
  };

  return {
    type,
    elevation,
    walkable: walkable ?? defaultWalkable[type] ?? false,
  };
}

export function createVerticalSliceLevel(): LevelData {
  const width = 30;
  const height = 20;
  const tiles: TileData[][] = [];

  // Initialize with stone floor
  for (let row = 0; row < height; row++) {
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      tiles[row][col] = createTile('stone', 0);
    }
  }

  // Helper functions
  const setTile = (x: number, y: number, type: TileType, elevation: number = 0, walkable?: boolean) => {
    if (y >= 0 && y < height && x >= 0 && x < width) {
      tiles[y][x] = createTile(type, elevation, walkable);
    }
  };

  const fillRect = (x1: number, y1: number, x2: number, y2: number, type: TileType, elevation: number = 0, walkable?: boolean) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setTile(x, y, type, elevation, walkable);
      }
    }
  };

  // === BUILD THE LEVEL ===

  // Outer walls
  fillRect(0, 0, width - 1, 0, 'wall');
  fillRect(0, height - 1, width - 1, height - 1, 'wall');
  fillRect(0, 0, 0, height - 1, 'wall');
  fillRect(width - 1, 0, width - 1, height - 1, 'wall');

  // === START AREA (left section) ===
  fillRect(1, 1, 9, 9, 'stone');
  // Decorative grass patches
  fillRect(2, 2, 3, 3, 'grass');
  fillRect(7, 7, 8, 8, 'grass');

  // === PUZZLE A AREA (center-top) ===
  fillRect(10, 1, 19, 9, 'stone');
  // Dividing wall with gap for hazard
  fillRect(10, 1, 10, 3, 'wall');
  fillRect(10, 6, 10, 9, 'wall');
  // The gap at rows 4-5 is where the laser hazard goes

  // === TRANSITION PATH (right-top) ===
  fillRect(20, 1, 28, 9, 'stone');
  // Wall separating A from transition
  fillRect(20, 1, 20, 6, 'wall');
  // Opening at bottom of transition wall
  setTile(20, 7, 'stone');
  setTile(20, 8, 'stone');

  // === PUZZLE B AREA (left-bottom) ===
  fillRect(1, 10, 14, 18, 'stone');
  // Wall between start and B
  fillRect(1, 10, 9, 10, 'wall');
  // Opening to start area
  setTile(5, 10, 'stone');

  // Water/gap that needs bridge
  fillRect(8, 13, 11, 15, 'water');
  // Bridge position (starts retracted)
  fillRect(9, 14, 10, 14, 'void'); // Bridge slot

  // === PUZZLE C AREA (center-bottom) ===
  fillRect(15, 10, 23, 18, 'stone');
  // Wall separating B from C
  fillRect(15, 10, 15, 18, 'wall');
  // Door opening to C
  setTile(15, 14, 'stone');

  // Two platform areas for pressure plates
  fillRect(17, 12, 18, 13, 'ground');  // Dog plate area
  fillRect(20, 15, 21, 16, 'ground');  // Panda plate area

  // === EXIT AREA (right-bottom) ===
  fillRect(24, 10, 28, 18, 'stone');
  // Wall separating C from exit
  fillRect(24, 10, 24, 13, 'wall');
  fillRect(24, 16, 24, 18, 'wall');
  // Door opening (blocked by final door)
  setTile(24, 14, 'stone');
  setTile(24, 15, 'stone');

  // Exit marker
  fillRect(26, 13, 27, 16, 'grass');

  // === CAMERA NODE POSITIONS (elevated) ===
  setTile(16, 2, 'stone', 1);  // Camera node for Puzzle A overview
  setTile(3, 14, 'stone', 1);  // Camera node for Puzzle B
  setTile(22, 11, 'stone', 1); // Camera node for Puzzle C

  // === INTERACTABLES ===
  const interactables: InteractableConfig[] = [
    // === PUZZLE A: Hazard Bypass ===
    // Laser hazard blocking the path
    {
      id: 'hazard_laser_a',
      type: 'hazard',
      position: { x: 10, y: 4.5, z: 0 },
      initialState: {
        active: true,
        hazardType: 'laser',
      },
      linkedIds: ['plate_a'],
    },
    // Pressure plate that disables laser (needs heavy weight)
    {
      id: 'plate_a',
      type: 'pressure_plate',
      position: { x: 15, y: 6, z: 0 },
      initialState: {
        activated: false,
        weightThreshold: 'heavy',
        currentWeight: 0,
      },
      linkedIds: ['hazard_laser_a'],
    },
    // Crate that Panda pushes onto pressure plate
    {
      id: 'crate_a',
      type: 'crate',
      position: { x: 13, y: 3, z: 0 },
      initialState: {
        gridX: 13,
        gridY: 3,
        beingPushed: false,
      },
    },
    // Camera node for Dog to scout ahead
    {
      id: 'camera_a',
      type: 'camera_node',
      position: { x: 16, y: 2, z: 1 },
      initialState: {
        active: false,
        rotation: 180,
        minRotation: 90,
        maxRotation: 270,
      },
    },

    // === PUZZLE B: Bridge Lowering ===
    // Power lever (Dog can flip this)
    {
      id: 'lever_power_b',
      type: 'lever',
      position: { x: 4, y: 15, z: 0 },
      initialState: {
        position: 'off',
        requiresStrength: false,
      },
      linkedIds: ['winch_b'],
    },
    // Winch that Panda operates (needs power first)
    {
      id: 'winch_b',
      type: 'winch',
      position: { x: 6, y: 12, z: 0 },
      initialState: {
        extended: 0,
        operating: false,
        requiresPower: true,
        poweredById: 'lever_power_b',
      },
      linkedIds: ['platform_bridge_b'],
    },
    // Bridge platform
    {
      id: 'platform_bridge_b',
      type: 'platform',
      position: { x: 9.5, y: 14, z: -1 },
      initialState: {
        currentPosition: 0,
        moving: false,
        direction: 1,
        speed: 0.5,
        waypoints: [
          { x: 9.5, y: 14, z: -1 },  // Retracted (below water)
          { x: 9.5, y: 14, z: 0 },   // Extended (bridge level)
        ],
      },
    },
    // Camera node for Dog to see bridge mechanism
    {
      id: 'camera_b',
      type: 'camera_node',
      position: { x: 3, y: 14, z: 1 },
      initialState: {
        active: false,
        rotation: 45,
        minRotation: 0,
        maxRotation: 90,
      },
    },
    // Door between B and C (opens when bridge is extended)
    {
      id: 'door_bc',
      type: 'door',
      position: { x: 15, y: 14, z: 0 },
      initialState: {
        open: false,
        locked: false,
        requiresHeavy: false,
      },
    },

    // === PUZZLE C: Cooperative Finale ===
    // Dog's pressure plate (light weight ok)
    {
      id: 'plate_c_dog',
      type: 'pressure_plate',
      position: { x: 17.5, y: 12.5, z: 0 },
      initialState: {
        activated: false,
        weightThreshold: 'light',
        currentWeight: 0,
      },
      linkedIds: ['door_final'],
    },
    // Panda's pressure plate (heavy weight required)
    {
      id: 'plate_c_panda',
      type: 'pressure_plate',
      position: { x: 20.5, y: 15.5, z: 0 },
      initialState: {
        activated: false,
        weightThreshold: 'heavy',
        currentWeight: 0,
      },
      linkedIds: ['door_final'],
    },
    // Final door (requires BOTH plates active)
    {
      id: 'door_final',
      type: 'door',
      position: { x: 24, y: 14.5, z: 0 },
      initialState: {
        open: false,
        locked: true,  // Locked until both plates active
        requiresHeavy: true,
      },
    },
    // Camera node for overview
    {
      id: 'camera_c',
      type: 'camera_node',
      position: { x: 22, y: 11, z: 1 },
      initialState: {
        active: false,
        rotation: 225,
        minRotation: 180,
        maxRotation: 270,
      },
    },

    // === HELPER BUTTONS ===
    // Reset button for Puzzle A (resets crate position)
    {
      id: 'button_reset_a',
      type: 'button',
      position: { x: 12, y: 8, z: 0 },
      initialState: {
        pressed: false,
        momentary: true,
        cooldown: 0,
      },
      linkedIds: ['crate_a'],
    },
  ];

  // === PUZZLES ===
  const puzzles: PuzzleConfig[] = [
    {
      id: 'puzzle_a',
      name: 'Laser Bypass',
      description: 'Dog scouts ahead with the camera. Panda pushes the crate onto the pressure plate to disable the laser.',
      objectives: [
        {
          id: 'obj_a_scout',
          description: 'Dog: Use camera to scout the laser hazard',
          condition: {
            type: 'interactable_state',
            targetId: 'camera_a',
            state: { active: true },
          },
          optional: true,
        },
        {
          id: 'obj_a_disable',
          description: 'Disable the laser by weighing down the pressure plate',
          condition: {
            type: 'interactable_state',
            targetId: 'hazard_laser_a',
            state: { active: false },
          },
        },
      ],
      completionReward: 'Pathway to Puzzle B opens',
    },
    {
      id: 'puzzle_b',
      name: 'Bridge Builder',
      description: 'Dog activates the power switch. Panda operates the winch to raise the bridge.',
      objectives: [
        {
          id: 'obj_b_power',
          description: 'Dog: Activate the power switch',
          condition: {
            type: 'interactable_state',
            targetId: 'lever_power_b',
            state: { position: 'on' },
          },
        },
        {
          id: 'obj_b_bridge',
          description: 'Panda: Operate the winch to raise the bridge',
          condition: {
            type: 'interactable_state',
            targetId: 'platform_bridge_b',
            state: { currentPosition: 1 },
          },
        },
      ],
      completionReward: 'door_bc',
    },
    {
      id: 'puzzle_c',
      name: 'Together We Stand',
      description: 'Both players must stand on their respective pressure plates simultaneously.',
      objectives: [
        {
          id: 'obj_c_both',
          description: 'Both players on pressure plates at the same time',
          condition: {
            type: 'all_objectives',
          },
        },
        {
          id: 'obj_c_dog',
          description: 'Dog standing on the left plate',
          condition: {
            type: 'interactable_state',
            targetId: 'plate_c_dog',
            state: { activated: true },
          },
        },
        {
          id: 'obj_c_panda',
          description: 'Panda standing on the right plate',
          condition: {
            type: 'interactable_state',
            targetId: 'plate_c_panda',
            state: { activated: true },
          },
        },
      ],
      completionReward: 'door_final',
    },
  ];

  // Spawn positions
  const spawns = {
    dog: { x: 3, y: 5, z: 0 } as WorldPos,
    panda: { x: 6, y: 5, z: 0 } as WorldPos,
  };

  return {
    id: 'vertical_slice',
    name: 'The Training Grounds',
    width,
    height,
    tiles,
    spawns,
    interactables,
    puzzles,
    cameraNodes: [
      {
        id: 'camera_a',
        position: { x: 16, y: 2, z: 1 },
        defaultRotation: 180,
        minRotation: 90,
        maxRotation: 270,
        viewRadius: 8,
      },
      {
        id: 'camera_b',
        position: { x: 3, y: 14, z: 1 },
        defaultRotation: 45,
        minRotation: 0,
        maxRotation: 90,
        viewRadius: 6,
      },
      {
        id: 'camera_c',
        position: { x: 22, y: 11, z: 1 },
        defaultRotation: 225,
        minRotation: 180,
        maxRotation: 270,
        viewRadius: 7,
      },
    ],
  };
}
