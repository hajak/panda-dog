/**
 * Panda & Dog - Multiplayer Game Scene
 * Handles networked co-op gameplay
 */

import { Container } from 'pixi.js';
import { GameApplication } from '../engine/Application';
import { Camera } from '../engine/Camera';
import { Tilemap } from '../engine/Tilemap';
import { Input } from '../engine/Input';
import { Character } from './Character';
import { InteractableRenderer } from './InteractableRenderer';
import { PingRenderer } from './PingRenderer';
import { networkClient, type NetworkEvent } from '@net/NetworkClient';
import { LAYERS, FIXED_TIMESTEP, CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine/constants';
import type { TileData as EngineTileData } from '../engine/types';
import type { WorldPos, Role, EntityState, GameState, InteractableState, PingMarker, InputState as SharedInputState, TileData as SharedTileData, PuzzleState, PingType } from '@shared/types';
import { getLevel } from '@shared/levels';

const INTERACTION_RANGE = 1.5;

export class MultiplayerScene {
  private app: GameApplication;
  private camera: Camera;
  private tilemap: Tilemap;
  private input: Input;
  private entityLayer: Container;

  // Characters
  private characters: Map<string, Character> = new Map();
  private localRole: Role | null = null;

  // Interactables
  private interactables: Map<string, InteractableRenderer> = new Map();
  private nearbyInteractable: { id: string; prompt: string } | null = null;

  // Ping markers
  private pings: Map<string, PingRenderer> = new Map();

  // State from server
  private _serverTick = 0;
  private puzzleStates: PuzzleState[] = [];

  // Timing
  private accumulator = 0;
  private lastTime = 0;

  // Network event handler
  private unsubscribe: (() => void) | null = null;

  constructor(app: GameApplication) {
    this.app = app;
    this.camera = new Camera();
    this.input = new Input();
    this.entityLayer = app.getLayer(LAYERS.ENTITIES);
    this.tilemap = new Tilemap(
      app.getLayer(LAYERS.GROUND),
      app.getLayer(LAYERS.GROUND_DECOR)
    );
  }

  async init(): Promise<void> {
    this.localRole = networkClient.getRole();

    // Set up network listeners
    this.setupNetworkListeners();

    // Load a basic test level
    this.loadTestLevel();

    // Start game loop
    this.lastTime = performance.now();
    this.app.ticker.add(this.gameLoop);

    console.log(`Multiplayer scene initialized as ${this.localRole}`);
  }

  private setupNetworkListeners(): void {
    this.unsubscribe = networkClient.on('*', (event: NetworkEvent) => {
      this.handleNetworkEvent(event);
    });
  }

  private handleNetworkEvent(event: NetworkEvent): void {
    switch (event.type) {
      case 'state_update': {
        const data = event.data as { tick: number; entities: EntityState[]; interactables: InteractableState[]; pings: PingMarker[] };
        this.applyStateUpdate(data);
        break;
      }
      case 'game_start': {
        const data = event.data as { gameState: GameState };
        this.applyFullState(data.gameState);
        break;
      }
      case 'ping_received': {
        const data = event.data as { ping: PingMarker };
        this.addPing(data.ping);
        break;
      }
      case 'ping_expired': {
        const data = event.data as { pingId: string };
        this.removePing(data.pingId);
        break;
      }
    }
  }

  private applyStateUpdate(data: { tick: number; entities: EntityState[]; interactables: InteractableState[]; pings: PingMarker[]; puzzleStates?: PuzzleState[] }): void {
    this._serverTick = data.tick;

    // Update puzzle states
    if (data.puzzleStates) {
      this.puzzleStates = data.puzzleStates;
    }

    // Update entities
    for (const entityState of data.entities) {
      let character = this.characters.get(entityState.id);

      if (!character) {
        // Create new character
        const isLocal = this.localRole === entityState.type;
        character = new Character(entityState.id, entityState.type, entityState.position, isLocal);
        this.characters.set(entityState.id, character);
        this.entityLayer.addChild(character.container);
      }

      character.updateFromState(entityState);
    }

    // Update interactables
    this.updateInteractables(data.interactables);

    // Update pings
    this.updatePings(data.pings);
  }

  private updatePings(serverPings: PingMarker[]): void {
    const serverIds = new Set(serverPings.map(p => p.id));

    // Remove expired or removed pings
    for (const [id, renderer] of this.pings) {
      if (!serverIds.has(id) || renderer.isExpired()) {
        this.entityLayer.removeChild(renderer.container);
        renderer.destroy();
        this.pings.delete(id);
      }
    }

    // Add new pings
    for (const ping of serverPings) {
      if (!this.pings.has(ping.id)) {
        const renderer = new PingRenderer(ping);
        this.pings.set(ping.id, renderer);
        this.entityLayer.addChild(renderer.container);
      }
    }
  }

  private updateInteractables(serverInteractables: InteractableState[]): void {
    const serverIds = new Set(serverInteractables.map(i => i.id));

    // Remove interactables that no longer exist
    for (const [id, renderer] of this.interactables) {
      if (!serverIds.has(id)) {
        this.entityLayer.removeChild(renderer.container);
        renderer.destroy();
        this.interactables.delete(id);
      }
    }

    // Update or create interactables
    for (const state of serverInteractables) {
      let renderer = this.interactables.get(state.id);

      if (!renderer) {
        renderer = new InteractableRenderer(state);
        this.interactables.set(state.id, renderer);
        this.entityLayer.addChild(renderer.container);
      } else {
        renderer.updateState(state);
      }
    }
  }

  private applyFullState(state: GameState): void {
    this._serverTick = state.tick;

    // Clear existing characters
    for (const char of this.characters.values()) {
      this.entityLayer.removeChild(char.container);
      char.destroy();
    }
    this.characters.clear();

    // Clear existing interactables
    for (const renderer of this.interactables.values()) {
      this.entityLayer.removeChild(renderer.container);
      renderer.destroy();
    }
    this.interactables.clear();

    // Create characters from state
    for (const entityState of state.entities) {
      const isLocal = this.localRole === entityState.type;
      const character = new Character(entityState.id, entityState.type, entityState.position, isLocal);
      this.characters.set(entityState.id, character);
      this.entityLayer.addChild(character.container);
    }

    // Create interactables from state
    this.updateInteractables(state.interactables);

    this.updatePings(state.pings);

    // Update puzzle states
    if (state.puzzleStates) {
      this.puzzleStates = state.puzzleStates;
    }
  }

  private addPing(ping: PingMarker): void {
    if (!this.pings.has(ping.id)) {
      const renderer = new PingRenderer(ping);
      this.pings.set(ping.id, renderer);
      this.entityLayer.addChild(renderer.container);
    }
  }

  private removePing(pingId: string): void {
    const renderer = this.pings.get(pingId);
    if (renderer) {
      this.entityLayer.removeChild(renderer.container);
      renderer.destroy();
      this.pings.delete(pingId);
    }
  }

  private loadTestLevel(): void {
    // Load the vertical slice level
    const levelData = getLevel('vertical_slice');

    if (!levelData) {
      console.error('Failed to load vertical_slice level');
      this.loadFallbackLevel();
      return;
    }

    // Convert shared tile data to engine tile data
    const tiles: EngineTileData[][] = [];
    for (let y = 0; y < levelData.height; y++) {
      tiles[y] = [];
      for (let x = 0; x < levelData.width; x++) {
        const sharedTile = levelData.tiles[y]?.[x];
        if (sharedTile) {
          tiles[y][x] = this.convertTile(sharedTile);
        } else {
          tiles[y][x] = this.convertTile({ type: 'void', elevation: 0, walkable: false });
        }
      }
    }

    this.tilemap.load(levelData.width, levelData.height, tiles);
    console.log(`Loaded level: ${levelData.name} (${levelData.width}x${levelData.height})`);
  }

  private convertTile(sharedTile: SharedTileData): EngineTileData {
    const isWall = sharedTile.type === 'wall';
    const isVoid = sharedTile.type === 'void';

    return {
      type: sharedTile.type,
      elevation: sharedTile.elevation,
      walkable: sharedTile.walkable,
      climbable: false,
      hidingSpot: false,
      interactable: false,
      occluder: isWall || isVoid,
    };
  }

  private loadFallbackLevel(): void {
    // Fallback to a simple test level
    const width = 20;
    const height = 15;
    const tiles: EngineTileData[][] = [];

    for (let y = 0; y < height; y++) {
      tiles[y] = [];
      for (let x = 0; x < width; x++) {
        const isWall = x === 0 || y === 0 || x === width - 1 || y === height - 1;
        tiles[y][x] = {
          type: isWall ? 'wall' : 'ground',
          walkable: !isWall,
          elevation: 0,
          climbable: false,
          hidingSpot: false,
          interactable: false,
          occluder: isWall,
        };
      }
    }

    this.tilemap.load(width, height, tiles);
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    // Update input
    this.input.update();

    // Fixed timestep updates
    this.accumulator += deltaTime;
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.fixedUpdate(FIXED_TIMESTEP / 1000);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Render
    this.render(deltaTime / 1000);
  };

  private fixedUpdate(deltaTime: number): void {
    // Check for nearby interactables
    this.checkNearbyInteractables();

    // Handle interaction input
    const inputState = this.input.getState();
    if (inputState.interactPressed && this.nearbyInteractable) {
      this.sendInteraction(this.nearbyInteractable.id);
    }

    // Handle ping placement (Dog can place pings with 1-5 keys)
    if (this.localRole === 'dog') {
      this.handlePingInput(inputState);
    }

    // Send input to server
    this.sendInput();

    // Update local character animations
    for (const character of this.characters.values()) {
      character.update(deltaTime);
    }

    // Update ping animations
    for (const ping of this.pings.values()) {
      ping.update(deltaTime);
    }

    // Update camera to follow local character
    const localChar = this.getLocalCharacter();
    if (localChar) {
      this.camera.setTarget(localChar.position);
      this.camera.update(deltaTime);
    }
  }

  private checkNearbyInteractables(): void {
    const localChar = this.getLocalCharacter();
    if (!localChar || !this.localRole) {
      this.nearbyInteractable = null;
      this.updateInteractionPrompt();
      return;
    }

    // Dog cannot interact with objects - only Panda can
    if (this.localRole === 'dog') {
      this.nearbyInteractable = null;
      this.updateInteractionPrompt();
      return;
    }

    let nearest: { id: string; prompt: string; distance: number } | null = null;

    for (const [id, renderer] of this.interactables) {
      const prompt = renderer.getPromptText(this.localRole);
      if (!prompt) continue;

      // Get interactable state to check position
      const dx = renderer.container.x - localChar.container.x;
      const dy = renderer.container.y - localChar.container.y;
      // Use screen distance as approximation
      const distance = Math.sqrt(dx * dx + dy * dy) / 32; // Approximate world units

      if (distance <= INTERACTION_RANGE) {
        if (!nearest || distance < nearest.distance) {
          nearest = { id, prompt, distance };
        }
      }
    }

    this.nearbyInteractable = nearest ? { id: nearest.id, prompt: nearest.prompt } : null;
    this.updateInteractionPrompt();
  }

  private updateInteractionPrompt(): void {
    const promptEl = document.getElementById('interaction-prompt');
    if (!promptEl) return;

    if (this.nearbyInteractable) {
      promptEl.textContent = `[E] ${this.nearbyInteractable.prompt}`;
      promptEl.classList.add('visible');
    } else {
      promptEl.classList.remove('visible');
    }
  }

  private sendInteraction(targetId: string): void {
    // Determine action based on interactable type
    const renderer = this.interactables.get(targetId);
    if (!renderer) return;

    let action = 'interact';
    switch (renderer.type) {
      case 'door':
      case 'lever':
        action = 'toggle';
        break;
      case 'button':
        action = 'press';
        break;
      case 'crate':
        action = 'push';
        break;
      case 'winch':
        action = 'operate_start';
        break;
      case 'camera_node':
        action = 'view';
        break;
    }

    networkClient.interact(targetId, action);
  }

  private handlePingInput(inputState: ReturnType<Input['getState']>): void {
    const localChar = this.getLocalCharacter();
    if (!localChar) return;

    // Ping types mapped to number keys
    const pingTypes: PingType[] = ['look', 'go', 'wait', 'interact', 'danger'];
    let pingType: PingType | null = null;

    if (inputState.inventory1) pingType = pingTypes[0]; // 1 = look
    if (inputState.inventory2) pingType = pingTypes[1]; // 2 = go
    if (inputState.inventory3) pingType = pingTypes[2]; // 3 = wait

    if (pingType) {
      networkClient.placePing(localChar.position, pingType);
    }
  }

  private sendInput(): void {
    const inputState = this.input.getState();

    const sharedInput: SharedInputState = {
      moveX: inputState.moveX,
      moveY: inputState.moveY,
      run: inputState.run,
      jump: inputState.jump,
      interact: inputState.interactPressed,
      surveillance: inputState.block, // Repurpose block as surveillance for Dog
      operateHold: inputState.block,  // Repurpose block as hold for Panda
    };

    const localChar = this.getLocalCharacter();
    const position: WorldPos = localChar?.position || { x: 0, y: 0, z: 0 };

    networkClient.sendInput(sharedInput, position);
  }

  private getLocalCharacter(): Character | undefined {
    for (const char of this.characters.values()) {
      if (char.role === this.localRole) {
        return char;
      }
    }
    return undefined;
  }

  private render(_deltaTime: number): void {
    // Apply camera to tilemap
    this.tilemap.applyCamera(this.camera);

    // Apply camera to entity layer
    const pos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    const offsetX = -pos.x * zoom + CANVAS_WIDTH / 2;
    const offsetY = -pos.y * zoom + CANVAS_HEIGHT / 2;

    this.entityLayer.x = offsetX;
    this.entityLayer.y = offsetY;
    this.entityLayer.scale.set(zoom);

    // Sort entities by depth
    this.entityLayer.sortChildren();

    // Update tile visibility
    this.tilemap.updateVisibility(this.camera);
  }

  getLocalRole(): Role | null {
    return this.localRole;
  }

  getServerTick(): number {
    return this._serverTick;
  }

  getInteractables(): InteractableRenderer[] {
    return Array.from(this.interactables.values());
  }

  getPings(): PingRenderer[] {
    return Array.from(this.pings.values());
  }

  destroy(): void {
    this.app.ticker.remove(this.gameLoop);
    this.input.destroy();

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    for (const character of this.characters.values()) {
      character.destroy();
    }
    this.characters.clear();

    for (const renderer of this.interactables.values()) {
      renderer.destroy();
    }
    this.interactables.clear();

    for (const ping of this.pings.values()) {
      ping.destroy();
    }
    this.pings.clear();
  }

  getNearbyInteractable(): { id: string; prompt: string } | null {
    return this.nearbyInteractable;
  }

  getPuzzleStates(): PuzzleState[] {
    return this.puzzleStates;
  }

  getInput(): Input {
    return this.input;
  }

  setMobileZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }
}
