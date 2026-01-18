/* ============================================
   SHADOW NINJA - Debug UI
   Simple 2D playable debug view
   ============================================ */

import type { Player } from '../game/Player';
import type { Enemy } from '../game/Enemy';
import type { TileData, InputState } from '../engine/types';

export interface DebugInteractable {
  id: string;
  type: string;
  x: number;
  y: number;
  state: string;
}

export interface DebugUIData {
  fps: number;
  frameTime: number;
  player: Player;
  enemies: Enemy[];
  currentTile: TileData | null;
  nearbyInteractable: { id: string; promptText: string } | null;
  inputState: InputState;
  paused: boolean;
  showVisionCones: boolean;
  showGrid: boolean;
  tiles: TileData[][];
  worldWidth: number;
  worldHeight: number;
  interactables?: DebugInteractable[];
  currentLevel?: string;
}

const CELL_SIZE = 32;
const COLORS: Record<string, string> = {
  ground: '#5a4a3a',
  grass: '#2d5a2d',
  stone: '#6a6a6a',
  water: '#2a4a8a',
  bridge: '#8a6a4a',
  wall: '#3a3a3a',
  wall_low: '#4a4a4a',
  fence: '#6a5030',
  void: '#1a1a1a',
};

export class DebugUI {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private infoPanel: HTMLElement;
  private visible = false;

  constructor() {
    // Main container
    this.container = document.createElement('div');
    this.container.id = 'debug-ui';
    this.container.className = 'debug-game-mode';
    this.container.style.display = 'none';

    // Canvas for 2D game view
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'debug-canvas';
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d')!;

    // Info panel
    this.infoPanel = document.createElement('div');
    this.infoPanel.className = 'debug-info';

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

    const { player, enemies, currentTile, nearbyInteractable, inputState, fps, paused, tiles, worldWidth, worldHeight, interactables, currentLevel } = data;

    // Resize canvas if needed
    const canvasWidth = Math.min(worldWidth * CELL_SIZE, 700);
    const canvasHeight = Math.min(worldHeight * CELL_SIZE, 500);
    if (this.canvas.width !== canvasWidth || this.canvas.height !== canvasHeight) {
      this.canvas.width = canvasWidth;
      this.canvas.height = canvasHeight;
    }

    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Calculate camera offset to center on player
    const camX = Math.max(0, Math.min(
      player.position.x * CELL_SIZE - this.canvas.width / 2,
      worldWidth * CELL_SIZE - this.canvas.width
    ));
    const camY = Math.max(0, Math.min(
      player.position.y * CELL_SIZE - this.canvas.height / 2,
      worldHeight * CELL_SIZE - this.canvas.height
    ));

    ctx.save();
    ctx.translate(-camX, -camY);

    // Draw tiles
    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row].length; col++) {
        const tile = tiles[row][col];
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;

        // Tile background
        ctx.fillStyle = COLORS[tile.type] || '#333';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Grid lines
        ctx.strokeStyle = '#222';
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Hiding spot indicator
        if (tile.hidingSpot) {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }

        // Non-walkable indicator
        if (!tile.walkable) {
          ctx.strokeStyle = '#f00';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 4);
          ctx.lineTo(x + CELL_SIZE - 4, y + CELL_SIZE - 4);
          ctx.moveTo(x + CELL_SIZE - 4, y + 4);
          ctx.lineTo(x + 4, y + CELL_SIZE - 4);
          ctx.stroke();
          ctx.lineWidth = 1;
        }

        // Elevation text
        if (tile.elevation > 0) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px monospace';
          ctx.fillText(`${tile.elevation}`, x + 2, y + 10);
        }
      }
    }

    // Draw interactables (doors, pickups)
    if (interactables) {
      for (const item of interactables) {
        const ix = item.x * CELL_SIZE;
        const iy = item.y * CELL_SIZE;

        if (item.type === 'door') {
          // Draw door as a prominent rectangle
          const isOpen = item.state === 'active';
          ctx.fillStyle = isOpen ? '#4caf50' : '#ff9800';
          ctx.fillRect(ix - 14, iy - 20, 28, 40);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.strokeRect(ix - 14, iy - 20, 28, 40);
          ctx.lineWidth = 1;

          // Door label
          ctx.fillStyle = '#000';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(isOpen ? 'OPEN' : 'DOOR', ix, iy + 4);

          // Arrow indicator for exit
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px monospace';
          ctx.fillText('🚪', ix, iy - 6);
        } else if (item.type.startsWith('pickup_')) {
          // Draw pickup as a small circle
          ctx.fillStyle = item.type === 'pickup_health' ? '#ff4444' : '#44aaff';
          ctx.beginPath();
          ctx.arc(ix, iy, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.stroke();

          // Pickup label
          ctx.fillStyle = '#fff';
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(item.type === 'pickup_health' ? '♥' : '★', ix, iy + 3);
        }
      }
    }

    // Draw enemies
    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const ex = enemy.position.x * CELL_SIZE;
      const ey = enemy.position.y * CELL_SIZE;

      // Enemy body
      ctx.fillStyle = enemy.aiState === 'chase' ? '#ff0000' :
                      enemy.aiState === 'alert' ? '#ff8800' :
                      enemy.aiState === 'suspicious' ? '#ffff00' :
                      '#aa0000';
      ctx.fillRect(ex - 10, ey - 10, 20, 20);

      // Enemy state and health label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.aiState.toUpperCase().slice(0, 4), ex, ey - 14);

      // Health bar above enemy
      const healthPct = enemy.health / enemy.maxHealth;
      const barWidth = 30;
      const barHeight = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(ex - barWidth / 2, ey - 24, barWidth, barHeight);
      ctx.fillStyle = healthPct > 0.5 ? '#4caf50' : healthPct > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(ex - barWidth / 2, ey - 24, barWidth * healthPct, barHeight);
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(ex - barWidth / 2, ey - 24, barWidth, barHeight);

      // Health number
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`${Math.ceil(enemy.health)}`, ex, ey - 28);

      // Vision direction
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      const angle = Math.atan2(
        enemy.facing === 'S' || enemy.facing === 'SE' || enemy.facing === 'SW' ? 1 :
        enemy.facing === 'N' || enemy.facing === 'NE' || enemy.facing === 'NW' ? -1 : 0,
        enemy.facing === 'E' || enemy.facing === 'NE' || enemy.facing === 'SE' ? 1 :
        enemy.facing === 'W' || enemy.facing === 'NW' || enemy.facing === 'SW' ? -1 : 0
      );
      ctx.lineTo(ex + Math.cos(angle) * 40, ey + Math.sin(angle) * 40);
      ctx.stroke();
    }

    // Draw player
    const px = player.position.x * CELL_SIZE;
    const py = player.position.y * CELL_SIZE;

    // Player shadow (shows Z height)
    if (player.position.z > player.groundElevation) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(px, py, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player body (offset by Z)
    const pz = (player.position.z - player.groundElevation) * 20;
    ctx.fillStyle = player.isHidden ? '#00aa00' :
                    player.state === 'attack' ? '#ff4444' :
                    player.state === 'block' ? '#4444ff' :
                    player.state === 'jump' || player.state === 'fall' ? '#ffff00' :
                    '#00ff00';
    ctx.fillRect(px - 12, py - 12 - pz, 24, 24);

    // Player direction indicator
    ctx.fillStyle = '#000';
    const dirAngles: Record<string, number> = {
      N: -Math.PI/2, NE: -Math.PI/4, E: 0, SE: Math.PI/4,
      S: Math.PI/2, SW: Math.PI*3/4, W: Math.PI, NW: -Math.PI*3/4
    };
    const dirAngle = dirAngles[player.facing] ?? 0;
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(dirAngle) * 12, py - pz + Math.sin(dirAngle) * 12);
    ctx.lineTo(px + Math.cos(dirAngle + 2.5) * 6, py - pz + Math.sin(dirAngle + 2.5) * 6);
    ctx.lineTo(px + Math.cos(dirAngle - 2.5) * 6, py - pz + Math.sin(dirAngle - 2.5) * 6);
    ctx.fill();

    // Player state label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.state.toUpperCase(), px, py - 20 - pz);

    ctx.restore();

    // Update info panel
    const isAirborne = player.state === 'jump' || player.state === 'fall';
    const height = (player.position.z - player.groundElevation).toFixed(2);
    const alertCount = enemies.filter(e => e.active && (e.aiState === 'alert' || e.aiState === 'chase')).length;

    // Input display
    const keys: string[] = [];
    if (inputState.moveY < 0) keys.push('↑');
    if (inputState.moveY > 0) keys.push('↓');
    if (inputState.moveX < 0) keys.push('←');
    if (inputState.moveX > 0) keys.push('→');
    if (inputState.run) keys.push('RUN');
    if (inputState.jump) keys.push('JUMP');
    if (inputState.attack) keys.push('ATK');
    if (inputState.block) keys.push('BLK');

    this.infoPanel.innerHTML = `
      <div class="dbg-section">
        <div class="dbg-title">PLAYER</div>
        <div>State: <b class="st-${player.state}">${player.state.toUpperCase()}</b></div>
        <div>Pos: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}</div>
        <div>Z: <b class="${isAirborne ? 'yellow' : ''}">${player.position.z.toFixed(2)}</b> / Ground: ${player.groundElevation}</div>
        <div>Height: <b class="${isAirborne ? 'yellow' : ''}">${height}</b></div>
        <div>Grounded: <b class="${player.isGrounded ? 'green' : 'red'}">${player.isGrounded ? 'YES' : 'NO'}</b></div>
        <div>VelZ: ${player.verticalVelocity.toFixed(1)}</div>
        <div>Hidden: <b class="${player.isHidden ? 'green' : ''}">${player.isHidden ? 'YES' : 'NO'}</b></div>
        <div>HP: ${Math.ceil(player.health)} / Stam: ${Math.ceil(player.stamina)}</div>
      </div>

      <div class="dbg-section">
        <div class="dbg-title">TILE</div>
        <div>Type: <b>${currentTile?.type?.toUpperCase() || '?'}</b></div>
        <div>Elev: ${currentTile?.elevation ?? '?'}</div>
        <div>Walk: <b class="${currentTile?.walkable ? 'green' : 'red'}">${currentTile?.walkable ? 'YES' : 'NO'}</b></div>
        <div>Hide: <b class="${currentTile?.hidingSpot ? 'green' : ''}">${currentTile?.hidingSpot ? 'YES' : 'NO'}</b></div>
      </div>

      <div class="dbg-section">
        <div class="dbg-title">INTERACT</div>
        ${nearbyInteractable
          ? `<div class="green big">>> ${nearbyInteractable.promptText} <<</div>`
          : `<div class="dim">None nearby</div>`
        }
      </div>

      <div class="dbg-section">
        <div class="dbg-title">ENEMIES</div>
        <div>Total: ${enemies.filter(e => e.active).length}</div>
        <div>Alert: <b class="${alertCount > 0 ? 'red' : ''}">${alertCount}</b></div>
        ${enemies.filter(e => e.active).slice(0, 3).map(e =>
          `<div class="dim">• ${e.aiState}: ${Math.ceil(e.health)}/${e.maxHealth} HP</div>`
        ).join('')}
      </div>

      <div class="dbg-section">
        <div class="dbg-title">INPUT</div>
        <div class="big yellow">${keys.join(' ') || '---'}</div>
      </div>

      <div class="dbg-section">
        <div>FPS: <b class="${fps < 30 ? 'red' : 'green'}">${fps}</b></div>
        <div>Level: <b class="yellow">${currentLevel?.toUpperCase() || '?'}</b></div>
        ${paused ? '<div class="big red">PAUSED</div>' : ''}
      </div>

      <div class="dbg-hint">§ = normal view | 🚪 = door</div>
    `;
  }

  destroy(): void {
    this.container.remove();
  }
}
