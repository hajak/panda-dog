/**
 * Panda & Dog - Debug UI
 * Simple 2D top-down debug view showing tiles, characters, and walkability
 */

import type { MultiplayerScene } from '../game/MultiplayerScene';

const CELL_SIZE = 20;
const COLORS: Record<string, string> = {
  ground: '#5a4a3a',
  grass: '#2d5a2d',
  stone: '#6a6a6a',
  water: '#2a4a8a',
  bridge: '#8a6a4a',
  wall: '#3a3a3a',
  void: '#1a1a1a',
};

export interface DebugUIData {
  scene: MultiplayerScene;
  fps: number;
  tiles?: { type: string; walkable: boolean; elevation: number }[][];
  worldWidth: number;
  worldHeight: number;
  dogPosition?: { x: number; y: number };
  pandaPosition?: { x: number; y: number };
}

export class DebugUI {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private infoPanel: HTMLElement;
  private visible = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'debug-ui';
    this.container.className = 'debug-game-mode';
    this.container.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      flex-direction: row;
      padding: 20px;
      box-sizing: border-box;
      font-family: 'Courier New', monospace;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      border: 2px solid #444;
      background: #111;
      flex-shrink: 0;
    `;
    this.canvas.width = 600;
    this.canvas.height = 400;
    this.ctx = this.canvas.getContext('2d')!;

    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      margin-left: 20px;
      color: #fff;
      font-size: 12px;
      min-width: 220px;
      overflow-y: auto;
    `;

    this.container.appendChild(this.canvas);
    this.container.appendChild(this.infoPanel);
    document.body.appendChild(this.container);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'flex' : 'none';
  }

  isVisible(): boolean {
    return this.visible;
  }

  update(data: DebugUIData): void {
    if (!this.visible) return;

    const { scene, fps, tiles, worldWidth, worldHeight, dogPosition, pandaPosition } = data;

    const canvasWidth = Math.min(worldWidth * CELL_SIZE, 600);
    const canvasHeight = Math.min(worldHeight * CELL_SIZE, 400);
    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
    }

    const ctx = this.ctx;

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!tiles || tiles.length === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '14px monospace';
      ctx.fillText('No tile data available', 20, 30);
      ctx.fillText('Level may not be loaded yet', 20, 50);
      this.updateInfoPanel(scene, fps, dogPosition, pandaPosition);
      return;
    }

    // Draw tiles
    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < (tiles[row]?.length || 0); col++) {
        const tile = tiles[row][col];
        if (!tile) continue;

        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        ctx.fillStyle = COLORS[tile.type] || '#333';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        ctx.strokeStyle = '#222';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Non-walkable indicator (red X)
        if (!tile.walkable) {
          ctx.strokeStyle = '#f00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 3, y + 3);
          ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 3);
          ctx.moveTo(x + CELL_SIZE - 3, y + 3);
          ctx.lineTo(x + 3, y + CELL_SIZE - 3);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        // Elevation text
        if (tile.elevation > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = '8px monospace';
          ctx.fillText(`${tile.elevation}`, x + 2, y + 8);
        }
      }
    }

    // Draw interactables
    const interactables = scene.getInteractables();
    for (const interactable of interactables) {
      // Convert screen coords back to world coords approximately
      // This is a rough estimate - interactable positions are in world space
      const state = interactable.getState();
      if (!state) continue;

      const ix = state.position.x * CELL_SIZE;
      const iy = state.position.y * CELL_SIZE;

      ctx.fillStyle = '#ff0';
      ctx.fillRect(ix - 4, iy - 4, 8, 8);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(ix - 4, iy - 4, 8, 8);

      ctx.fillStyle = '#000';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(interactable.type[0].toUpperCase(), ix, iy + 3);
      ctx.textAlign = 'left';
    }

    // Draw pings
    const pings = scene.getPings();
    for (const ping of pings) {
      const marker = ping.getMarker();
      if (!marker) continue;

      const px = marker.position.x * CELL_SIZE;
      const py = marker.position.y * CELL_SIZE;

      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    // Draw Dog position
    if (dogPosition) {
      const dx = dogPosition.x * CELL_SIZE;
      const dy = dogPosition.y * CELL_SIZE;

      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(dx, dy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('D', dx, dy + 4);
      ctx.textAlign = 'left';
    }

    // Draw Panda position
    if (pandaPosition) {
      const px = pandaPosition.x * CELL_SIZE;
      const py = pandaPosition.y * CELL_SIZE;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('P', px, py + 4);
      ctx.textAlign = 'left';
    }

    this.updateInfoPanel(scene, fps, dogPosition, pandaPosition);
  }

  private updateInfoPanel(
    scene: MultiplayerScene,
    fps: number,
    dogPosition?: { x: number; y: number },
    pandaPosition?: { x: number; y: number }
  ): void {
    const localRole = scene.getLocalRole();
    const puzzleStates = scene.getPuzzleStates();
    const nearbyInteractable = scene.getNearbyInteractable();

    this.infoPanel.innerHTML = `
      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #0af;">
        <div style="color: #0af; font-size: 10px; font-weight: bold; margin-bottom: 4px;">PLAYER INFO</div>
        <div>Role: <b style="color: ${localRole === 'dog' ? '#ff8c00' : '#0f9'}">${localRole?.toUpperCase() || '?'}</b></div>
        <div>Server Tick: <b>${scene.getServerTick()}</b></div>
      </div>

      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #ff8c00;">
        <div style="color: #ff8c00; font-size: 10px; font-weight: bold; margin-bottom: 4px;">DOG POSITION</div>
        ${dogPosition
          ? `<div>X: <b>${dogPosition.x.toFixed(2)}</b></div><div>Y: <b>${dogPosition.y.toFixed(2)}</b></div>`
          : `<div style="color: #666;">Not spawned</div>`
        }
      </div>

      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #0f9;">
        <div style="color: #0f9; font-size: 10px; font-weight: bold; margin-bottom: 4px;">PANDA POSITION</div>
        ${pandaPosition
          ? `<div>X: <b>${pandaPosition.x.toFixed(2)}</b></div><div>Y: <b>${pandaPosition.y.toFixed(2)}</b></div>`
          : `<div style="color: #666;">Not spawned</div>`
        }
      </div>

      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #ff0;">
        <div style="color: #ff0; font-size: 10px; font-weight: bold; margin-bottom: 4px;">INTERACT</div>
        ${nearbyInteractable
          ? `<div style="color: #0f0;">${nearbyInteractable.prompt}</div>`
          : `<div style="color: #666;">None nearby</div>`
        }
      </div>

      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #f0f;">
        <div style="color: #f0f; font-size: 10px; font-weight: bold; margin-bottom: 4px;">PUZZLES</div>
        ${puzzleStates.length > 0 ? puzzleStates.map(p => `
          <div style="color: ${p.completed ? '#0f0' : '#ff0'}; margin: 2px 0;">
            ${p.completed ? '✓' : '○'} ${p.name}
          </div>
        `).join('') : '<div style="color: #666;">No puzzles</div>'}
      </div>

      <div style="margin-bottom: 16px; padding: 10px; background: #222; border-radius: 4px; border-left: 3px solid #0f0;">
        <div style="color: #0f0; font-size: 10px; font-weight: bold; margin-bottom: 4px;">PERFORMANCE</div>
        <div>FPS: <b style="color: ${fps < 30 ? '#f00' : '#0f0'}">${fps}</b></div>
      </div>

      <div style="padding: 10px; background: #111; border-radius: 4px;">
        <div style="color: #888; font-size: 10px; font-weight: bold; margin-bottom: 6px;">LEGEND</div>
        <div style="font-size: 11px;"><span style="color: #f00">✕</span> = Non-walkable</div>
        <div style="font-size: 11px;"><span style="color: #ff0">■</span> = Interactable</div>
        <div style="font-size: 11px;"><span style="color: #0ff">●</span> = Ping marker</div>
        <div style="font-size: 11px;"><span style="color: #ff8c00">D</span> = Dog</div>
        <div style="font-size: 11px;"><span style="color: #fff">P</span> = Panda</div>
      </div>

      <div style="margin-top: 16px; color: #666; font-size: 10px; text-align: center;">
        Press <kbd style="background: #444; padding: 2px 6px; border-radius: 3px;">§</kbd> to close
      </div>
    `;
  }

  destroy(): void {
    this.container.remove();
  }
}
