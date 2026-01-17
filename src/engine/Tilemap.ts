/* ============================================
   SHADOW NINJA - Tilemap System
   ============================================ */

import { Container, Graphics } from 'pixi.js';
import { COLORS } from './constants';
import { worldToScreen, gridToWorld } from './isometric';
import { createIsoTile, createIsoBlock } from './ShapeRenderer';
import type { TileData, TileType, GridPos, WorldPos } from './types';
import { Camera } from './Camera';

interface TileVisual {
  container: Container;
  baseY: number;
}

export class Tilemap {
  private width: number;
  private height: number;
  private tiles: TileData[][];
  private visuals: Map<string, TileVisual> = new Map();
  private groundLayer: Container;
  private wallLayer: Container;

  constructor(groundLayer: Container, wallLayer: Container) {
    this.width = 0;
    this.height = 0;
    this.tiles = [];
    this.groundLayer = groundLayer;
    this.wallLayer = wallLayer;
  }

  /**
   * Load tilemap from data
   */
  load(width: number, height: number, tiles: TileData[][]): void {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
    this.buildVisuals();
  }

  /**
   * Create a blank tilemap
   */
  createBlank(width: number, height: number, defaultType: TileType = 'ground'): void {
    this.width = width;
    this.height = height;
    this.tiles = [];

    for (let row = 0; row < height; row++) {
      const rowData: TileData[] = [];
      for (let col = 0; col < width; col++) {
        rowData.push(this.createTileData(defaultType, 0));
      }
      this.tiles.push(rowData);
    }

    this.buildVisuals();
  }

  /**
   * Set a single tile
   */
  setTile(col: number, row: number, type: TileType, elevation: number = 0): void {
    if (!this.isValidPosition(col, row)) return;
    this.tiles[row][col] = this.createTileData(type, elevation);
    this.updateTileVisual(col, row);
  }

  /**
   * Get tile data at position
   */
  getTile(col: number, row: number): TileData | null {
    if (!this.isValidPosition(col, row)) return null;
    return this.tiles[row][col];
  }

  /**
   * Get all tiles (for debug view)
   */
  getAllTiles(): TileData[][] {
    return this.tiles;
  }

  /**
   * Get tile at world position
   */
  getTileAtWorld(world: WorldPos): TileData | null {
    const col = Math.floor(world.x);
    const row = Math.floor(world.y);
    return this.getTile(col, row);
  }

  /**
   * Check if a world position is walkable
   */
  isWalkable(world: WorldPos): boolean {
    const tile = this.getTileAtWorld(world);
    if (!tile) return false;
    return tile.walkable && Math.abs(world.z - tile.elevation) < 0.5;
  }

  /**
   * Check if position is a valid grid position
   */
  isValidPosition(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  /**
   * Get elevation at world position
   */
  getElevation(world: WorldPos): number {
    const tile = this.getTileAtWorld(world);
    return tile ? tile.elevation : 0;
  }

  /**
   * Check if tile blocks line of sight
   */
  blocksLineOfSight(col: number, row: number): boolean {
    const tile = this.getTile(col, row);
    if (!tile) return true;
    return tile.type === 'wall' || tile.type === 'void';
  }

  /**
   * Get all hiding spot tiles
   */
  getHidingSpots(): GridPos[] {
    const spots: GridPos[] = [];
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        if (this.tiles[row][col].hidingSpot) {
          spots.push({ col, row });
        }
      }
    }
    return spots;
  }

  /**
   * Update tile visuals based on camera visibility
   */
  updateVisibility(camera: Camera): void {
    const bounds = camera.getVisibleBounds();

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const key = `${col},${row}`;
        const visual = this.visuals.get(key);
        if (!visual) continue;

        const isVisible =
          col >= bounds.minX - 1 &&
          col <= bounds.maxX + 1 &&
          row >= bounds.minY - 1 &&
          row <= bounds.maxY + 1;

        visual.container.visible = isVisible;
      }
    }
  }

  /**
   * Apply camera transform to layers
   */
  applyCamera(camera: Camera): void {
    const pos = camera.getPosition();
    const zoom = camera.getZoom();

    const offsetX = -pos.x * zoom + 640; // CANVAS_WIDTH / 2
    const offsetY = -pos.y * zoom + 360; // CANVAS_HEIGHT / 2

    for (const layer of [this.groundLayer, this.wallLayer]) {
      layer.x = offsetX;
      layer.y = offsetY;
      layer.scale.set(zoom);
    }
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  // Private methods

  private createTileData(type: TileType, elevation: number): TileData {
    const configs: Record<TileType, Partial<TileData>> = {
      ground: { walkable: true },
      grass: { walkable: true, hidingSpot: false },
      stone: { walkable: true },
      water: { walkable: false },
      bridge: { walkable: true, elevation: 0.5 },
      wall: { walkable: false, occluder: true },
      wall_low: { walkable: false, elevation: 0.5 },
      fence: { walkable: false },
      void: { walkable: false },
    };

    const config = configs[type] || {};

    return {
      type,
      elevation,
      walkable: config.walkable ?? false,
      climbable: config.climbable ?? false,
      hidingSpot: config.hidingSpot ?? false,
      interactable: config.interactable ?? false,
      occluder: config.occluder ?? false,
    };
  }

  private buildVisuals(): void {
    // Clear existing
    this.groundLayer.removeChildren();
    this.wallLayer.removeChildren();
    this.visuals.clear();

    // Build tiles from back to front for proper depth
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        this.createTileVisual(col, row);
      }
    }

    // Sort by depth
    this.groundLayer.sortChildren();
    this.wallLayer.sortChildren();
  }

  private createTileVisual(col: number, row: number): void {
    const tile = this.tiles[row][col];
    const world = gridToWorld({ col, row }, tile.elevation);
    const screen = worldToScreen(world);
    const key = `${col},${row}`;

    const container = new Container();
    container.x = screen.x;
    container.y = screen.y;
    container.zIndex = col + row;

    const visual = this.getTileGraphics(tile);
    container.addChild(visual);

    // Add to appropriate layer
    if (tile.type === 'wall' || tile.elevation > 1) {
      this.wallLayer.addChild(container);
    } else {
      this.groundLayer.addChild(container);
    }

    this.visuals.set(key, { container, baseY: screen.y });
  }

  private updateTileVisual(col: number, row: number): void {
    const key = `${col},${row}`;
    const existing = this.visuals.get(key);
    if (existing) {
      existing.container.destroy({ children: true });
      this.visuals.delete(key);
    }
    this.createTileVisual(col, row);
  }

  private getTileGraphics(tile: TileData): Graphics | Container {
    const colors: Record<TileType, number> = {
      ground: COLORS.GROUND_DARK,
      grass: COLORS.GROUND_LIGHT,
      stone: 0x607d8b,
      water: COLORS.WATER,
      bridge: 0x8d6e63,
      wall: COLORS.WALL_LIGHT,
      wall_low: COLORS.WALL_DARK,
      fence: 0x5d4037,
      void: 0x000000,
    };

    const patterns: Record<TileType, 'solid' | 'grass' | 'stone' | 'water' | undefined> = {
      ground: 'solid',
      grass: 'grass',
      stone: 'stone',
      water: 'water',
      bridge: 'solid',
      wall: 'solid',
      wall_low: 'solid',
      fence: 'solid',
      void: undefined,
    };

    if (tile.type === 'void') {
      return new Graphics();
    }

    if (tile.type === 'wall') {
      return createIsoBlock(colors[tile.type], 3, 1, 1);
    }

    if (tile.type === 'wall_low' || tile.type === 'fence') {
      return createIsoBlock(colors[tile.type], 1.5, 1, 1);
    }

    return createIsoTile(colors[tile.type], tile.elevation, patterns[tile.type], tile.hidingSpot);
  }
}
