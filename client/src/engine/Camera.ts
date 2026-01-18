/* ============================================
   SHADOW NINJA - Camera System
   ============================================ */

import {
  CAMERA_DAMPING,
  CAMERA_ZOOM_LEVELS,
  DEFAULT_ZOOM_INDEX,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './constants';
import { worldToScreen, lerp, clamp } from './isometric';
import type { CameraState, WorldPos, ScreenPos } from './types';

export class Camera {
  private state: CameraState;
  private zoomIndex: number = DEFAULT_ZOOM_INDEX;
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  constructor() {
    this.state = {
      x: 0,
      y: 0,
      zoom: CAMERA_ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
      targetX: 0,
      targetY: 0,
      targetZoom: CAMERA_ZOOM_LEVELS[DEFAULT_ZOOM_INDEX],
      shakeIntensity: 0,
      shakeDecay: 0.9,
    };
  }

  /**
   * Set camera bounds in world coordinates
   */
  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.bounds = { minX, minY, maxX, maxY };
  }

  /**
   * Clear camera bounds
   */
  clearBounds(): void {
    this.bounds = null;
  }

  /**
   * Set the target position for smooth follow
   */
  setTarget(world: WorldPos): void {
    const screen = worldToScreen(world);
    this.state.targetX = screen.x;
    this.state.targetY = screen.y;
  }

  /**
   * Immediately snap to target position
   */
  snapToTarget(world: WorldPos): void {
    const screen = worldToScreen(world);
    this.state.x = this.state.targetX = screen.x;
    this.state.y = this.state.targetY = screen.y;
  }

  /**
   * Cycle through zoom levels
   */
  cycleZoom(direction: 1 | -1 = 1): void {
    this.zoomIndex = clamp(
      this.zoomIndex + direction,
      0,
      CAMERA_ZOOM_LEVELS.length - 1
    );
    this.state.targetZoom = CAMERA_ZOOM_LEVELS[this.zoomIndex];
  }

  /**
   * Set specific zoom level
   */
  setZoom(zoom: number): void {
    this.state.targetZoom = clamp(zoom, CAMERA_ZOOM_LEVELS[0], CAMERA_ZOOM_LEVELS[CAMERA_ZOOM_LEVELS.length - 1]);
    // Find closest zoom index
    let closestIndex = 0;
    let closestDiff = Math.abs(CAMERA_ZOOM_LEVELS[0] - zoom);
    for (let i = 1; i < CAMERA_ZOOM_LEVELS.length; i++) {
      const diff = Math.abs(CAMERA_ZOOM_LEVELS[i] - zoom);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    }
    this.zoomIndex = closestIndex;
  }

  /**
   * Apply camera shake
   */
  shake(intensity: number): void {
    this.state.shakeIntensity = Math.max(this.state.shakeIntensity, intensity);
  }

  /**
   * Update camera position with smoothing
   */
  update(_deltaTime: number): void {
    // Smooth camera movement
    this.state.x = lerp(this.state.x, this.state.targetX, CAMERA_DAMPING);
    this.state.y = lerp(this.state.y, this.state.targetY, CAMERA_DAMPING);
    this.state.zoom = lerp(this.state.zoom, this.state.targetZoom, CAMERA_DAMPING);

    // Apply bounds
    if (this.bounds) {
      const halfWidth = (CANVAS_WIDTH / 2) / this.state.zoom;
      const halfHeight = (CANVAS_HEIGHT / 2) / this.state.zoom;
      this.state.x = clamp(this.state.x, this.bounds.minX + halfWidth, this.bounds.maxX - halfWidth);
      this.state.y = clamp(this.state.y, this.bounds.minY + halfHeight, this.bounds.maxY - halfHeight);
    }

    // Decay shake
    this.state.shakeIntensity *= this.state.shakeDecay;
    if (this.state.shakeIntensity < 0.1) {
      this.state.shakeIntensity = 0;
    }
  }

  /**
   * Get current camera position with shake applied
   */
  getPosition(): ScreenPos {
    let x = this.state.x;
    let y = this.state.y;

    // Apply shake
    if (this.state.shakeIntensity > 0) {
      x += (Math.random() - 0.5) * this.state.shakeIntensity * 2;
      y += (Math.random() - 0.5) * this.state.shakeIntensity * 2;
    }

    return { x, y };
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.state.zoom;
  }

  /**
   * Transform world position to screen position relative to camera
   */
  worldToCamera(world: WorldPos): ScreenPos {
    const screen = worldToScreen(world);
    const camPos = this.getPosition();
    const zoom = this.state.zoom;

    return {
      x: (screen.x - camPos.x) * zoom + CANVAS_WIDTH / 2,
      y: (screen.y - camPos.y) * zoom + CANVAS_HEIGHT / 2,
    };
  }

  /**
   * Transform screen position to world position
   */
  cameraToWorld(screen: ScreenPos, z: number = 0): WorldPos {
    const camPos = this.getPosition();
    const zoom = this.state.zoom;

    const worldScreenX = (screen.x - CANVAS_WIDTH / 2) / zoom + camPos.x;
    const worldScreenY = (screen.y - CANVAS_HEIGHT / 2) / zoom + camPos.y;

    // Convert from isometric screen to world
    const adjustedY = worldScreenY + z * 16; // TILE_DEPTH
    return {
      x: (worldScreenX / 32 + adjustedY / 16) / 2,
      y: (adjustedY / 16 - worldScreenX / 32) / 2,
      z,
    };
  }

  /**
   * Check if a world position is visible on screen
   */
  isVisible(world: WorldPos, margin: number = 100): boolean {
    const screen = this.worldToCamera(world);
    return (
      screen.x >= -margin &&
      screen.x <= CANVAS_WIDTH + margin &&
      screen.y >= -margin &&
      screen.y <= CANVAS_HEIGHT + margin
    );
  }

  /**
   * Get the visible world bounds
   */
  getVisibleBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const topLeft = this.cameraToWorld({ x: 0, y: 0 });
    const topRight = this.cameraToWorld({ x: CANVAS_WIDTH, y: 0 });
    const bottomLeft = this.cameraToWorld({ x: 0, y: CANVAS_HEIGHT });
    const bottomRight = this.cameraToWorld({ x: CANVAS_WIDTH, y: CANVAS_HEIGHT });

    return {
      minX: Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) - 2,
      minY: Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) - 2,
      maxX: Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x) + 2,
      maxY: Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y) + 2,
    };
  }
}
