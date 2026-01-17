/* ============================================
   SHADOW NINJA - Game Scene
   ============================================ */

import { Container } from 'pixi.js';
import { GameApplication } from '../engine/Application';
import { Camera } from '../engine/Camera';
import { Tilemap } from '../engine/Tilemap';
import { Input } from '../engine/Input';
import { Player } from './Player';
import { Entity } from './Entity';
import { Enemy } from './Enemy';
import { Guard } from './Guard';
import { Archer, ProjectileSpawnEvent } from './Archer';
import { CollisionSystem } from './Collision';
import { PropManager } from './PropManager';
import { InteractableManager, InteractionEffect } from './Interactable';
import { CombatSystem, AttackHitbox } from './CombatSystem';
import { ProjectileManager } from './Projectile';
import { ParticleSystem, ParticleEffects } from '../engine/ParticleSystem';
import { audioHooks } from '../engine/AudioHooks';
import { DebugUI } from '../ui/DebugUI';
import { LAYERS, FIXED_TIMESTEP, CANVAS_WIDTH, CANVAS_HEIGHT, KNOCKBACK_FORCE } from '../engine/constants';
import type { DebugOptions, WorldPos } from '../engine/types';
import { createCourtyardLevel } from '../levels/Courtyard';

export class GameScene {
  private app: GameApplication;
  private camera: Camera;
  private tilemap: Tilemap;
  private input: Input;
  private player: Player;
  private entities: Entity[] = [];
  private enemies: Enemy[] = [];
  private entityLayer: Container;
  private propLayer: Container;
  private projectileLayer: Container;

  // Systems
  private collision: CollisionSystem | null = null;
  private propManager: PropManager | null = null;
  private interactables: InteractableManager;
  private combatSystem: CombatSystem;
  private projectileManager: ProjectileManager | null = null;
  private particles: ParticleSystem | null = null;

  // Timing
  private accumulator: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private frameTime: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  // Debug UI
  private debugUI: DebugUI | null = null;

  // Interaction state
  private nearbyInteractable: { id: string; promptText: string } | null = null;

  // Debug
  debugOptions: DebugOptions = {
    showFPS: true,
    showColliders: false,
    showVisionCones: false,
    showNoiseRadius: false,
    showPaths: false,
    showGrid: false,
    showElevation: false,
    godMode: false,
  };

  // State
  private paused: boolean = false;
  private gameOver: boolean = false;
  private gameOverElement: HTMLElement | null = null;

  constructor(app: GameApplication) {
    this.app = app;
    this.camera = new Camera();
    this.input = new Input();
    this.entityLayer = app.getLayer(LAYERS.ENTITIES);
    this.propLayer = app.getLayer(LAYERS.GROUND_DECOR);
    this.projectileLayer = app.getLayer(LAYERS.PROJECTILES);
    this.tilemap = new Tilemap(
      app.getLayer(LAYERS.GROUND),
      app.getLayer(LAYERS.GROUND_DECOR)
    );
    this.player = new Player(10, 10, 0);
    this.interactables = new InteractableManager();
    this.combatSystem = new CombatSystem();
    this.debugUI = new DebugUI();
  }

  async init(): Promise<void> {
    // Load level
    const levelData = createCourtyardLevel();
    this.tilemap.load(levelData.width, levelData.height, levelData.tiles);

    // Initialize collision system
    this.collision = new CollisionSystem(this.tilemap);

    // Initialize prop manager
    this.propManager = new PropManager(this.propLayer);

    // Initialize projectile manager
    this.projectileManager = new ProjectileManager(this.projectileLayer);

    // Initialize particle system
    this.particles = new ParticleSystem(this.app.getLayer(LAYERS.EFFECTS));

    // Add props from level data
    for (const propData of levelData.props) {
      this.propManager.addProp({
        id: `prop_${propData.type}_${propData.x}_${propData.y}`,
        type: propData.type,
        x: propData.x,
        y: propData.y,
      });
    }

    // Add interactables from level data
    for (const interactData of levelData.interactables) {
      // Register interactable
      this.interactables.register({
        id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
        type: interactData.type as never,
        position: { x: interactData.x, y: interactData.y, z: 0 },
        properties: interactData.properties,
      });

      // Add visual prop for pickups
      if (interactData.type.startsWith('pickup_')) {
        this.propManager.addProp({
          id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
          type: interactData.type,
          x: interactData.x,
          y: interactData.y,
          interactive: true,
        });
      } else if (interactData.type === 'door') {
        this.propManager.addProp({
          id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
          type: 'door',
          x: interactData.x,
          y: interactData.y,
          interactive: true,
          state: 'closed',
        });
      }
    }

    // Spawn enemies from level data
    for (const enemyData of levelData.enemySpawns) {
      const patrolPoints = enemyData.patrol?.map((p) => ({ x: p.x, y: p.y }));

      let enemy: Enemy;
      if (enemyData.type === 'guard') {
        enemy = new Guard(enemyData.x, enemyData.y, patrolPoints);
      } else if (enemyData.type === 'archer') {
        const archer = new Archer(enemyData.x, enemyData.y, patrolPoints);
        // Set up projectile spawn callback
        archer.onSpawnProjectile = (event: ProjectileSpawnEvent) => {
          this.handleArcherProjectile(event);
        };
        enemy = archer;
      } else {
        continue;
      }

      this.enemies.push(enemy);
      this.entities.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }

    // Set up player
    this.player.position = { x: levelData.playerSpawn.x, y: levelData.playerSpawn.y, z: 0 };
    this.entityLayer.addChild(this.player.container);
    this.entities.push(this.player);

    // Set up camera
    this.camera.snapToTarget(this.player.position);
    this.camera.setBounds(
      -CANVAS_WIDTH / 4,
      -CANVAS_HEIGHT / 4,
      levelData.width * 32 + CANVAS_WIDTH / 4,
      levelData.height * 16 + CANVAS_HEIGHT / 4
    );

    // Start game loop
    this.lastTime = performance.now();
    this.app.ticker.add(this.gameLoop);
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;

    // FPS counter
    this.frameTime = deltaTime;
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer -= 1000;
    }

    // Update input
    this.input.update();
    const inputState = this.input.getState();

    // Handle pause (only on key press, not hold)
    if (inputState.pausePressed) {
      this.paused = !this.paused;
    }

    // Toggle debug options (only on key press, not hold)
    if (inputState.debugPressed) {
      this.debugOptions.showFPS = !this.debugOptions.showFPS;
    }
    if (inputState.toggleVisionPressed) {
      this.debugOptions.showVisionCones = !this.debugOptions.showVisionCones;
    }
    if (inputState.toggleGridPressed) {
      this.debugOptions.showGrid = !this.debugOptions.showGrid;
    }
    if (inputState.toggleHelpPressed) {
      this.toggleHelpPanel();
    }
    if (inputState.toggleDebugUIPressed) {
      this.debugUI?.toggle();
    }

    if (this.paused) return;

    // Check for player death
    if (!this.gameOver && !this.player.active) {
      this.triggerGameOver();
    }

    // Game over state - wait for restart
    if (this.gameOver) {
      if (inputState.jumpPressed || inputState.attackPressed) {
        this.restartGame();
      }
      return;
    }

    // Fixed timestep physics
    this.accumulator += deltaTime;
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.fixedUpdate(FIXED_TIMESTEP / 1000);
      this.accumulator -= FIXED_TIMESTEP;
    }

    // Variable timestep rendering
    const alpha = this.accumulator / FIXED_TIMESTEP;
    this.render(alpha, deltaTime / 1000);
  };

  private fixedUpdate(deltaTime: number): void {
    // Store previous positions for interpolation
    for (const entity of this.entities) {
      entity.storePreviousPosition();
    }

    // Handle player input
    this.player.handleInput(this.input.getState());

    // Update all entities
    for (const entity of this.entities) {
      if (entity.active) {
        entity.update(deltaTime);
      }
    }

    // Update enemy AI
    this.updateEnemyAI(deltaTime);

    // Update projectiles
    if (this.projectileManager) {
      this.projectileManager.update(deltaTime);
      this.checkProjectileCollisions();
    }

    // Process combat
    this.processCombat();

    // Collision detection with new system
    this.handleCollisions(deltaTime);

    // Check for nearby interactables
    this.checkInteractables();

    // Check hiding spots
    this.checkHidingSpots();

    // Handle interaction input
    if (this.input.getState().interactPressed && this.nearbyInteractable) {
      this.handleInteraction(this.nearbyInteractable.id);
    }

    // Handle player attacks
    this.handlePlayerAttacks();

    // Update camera target
    this.camera.setTarget(this.player.position);
    this.camera.update(deltaTime);
  }

  private handleCollisions(deltaTime: number): void {
    if (!this.collision) return;

    // Use enhanced collision system
    const result = this.collision.resolveMovement(
      this.player.position,
      this.player.velocity,
      deltaTime
    );

    // Apply collision result
    this.player.position = result.position;
    this.player.groundElevation = result.groundElevation;
    this.player.isGrounded = result.grounded;

    // Check for climbing opportunity
    if (result.canClimb && result.climbTarget && this.input.getState().jump) {
      this.player.startClimb(result.climbTarget);
    }

    // Clamp to world bounds
    this.player.position.x = Math.max(0.5, Math.min(this.tilemap.getWidth() - 0.5, this.player.position.x));
    this.player.position.y = Math.max(0.5, Math.min(this.tilemap.getHeight() - 0.5, this.player.position.y));
  }

  private checkInteractables(): void {
    const nearest = this.interactables.findNearest(this.player.position, 1.5);

    if (nearest && nearest.state !== 'used') {
      // Auto-pickup for health and shuriken pickups
      if (nearest.type === 'pickup_health' || nearest.type === 'pickup_shuriken') {
        this.handleInteraction(nearest.id);
        this.nearbyInteractable = null;
        return;
      }

      this.nearbyInteractable = {
        id: nearest.id,
        promptText: nearest.promptText,
      };
    } else {
      this.nearbyInteractable = null;
    }
  }

  private handleInteraction(interactableId: string): void {
    const result = this.interactables.interact(interactableId, {
      hasKey: (key: string) => {
        return this.player.inventory.some(
          (slot) => slot.itemType === `key_${key}` && slot.count > 0
        );
      },
    });

    if (result.success) {
      this.applyInteractionEffects(result.effects);
    }
  }

  private applyInteractionEffects(effects: InteractionEffect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'pickup':
          this.player.addItem(effect.itemType, effect.amount);
          // Remove pickup visual
          if (this.propManager) {
            const propId = this.nearbyInteractable?.id;
            if (propId) {
              this.propManager.removeProp(propId);
            }
          }
          break;

        case 'heal':
          this.player.heal(effect.amount);
          // Remove pickup visual
          if (this.propManager && this.nearbyInteractable) {
            this.propManager.removeProp(this.nearbyInteractable.id);
          }
          break;

        case 'toggle':
          if (this.propManager) {
            this.propManager.setPropState(effect.targetId, effect.newState);
          }
          break;

        case 'climb':
          this.player.startClimb(effect.target);
          break;

        case 'message':
          console.log('Game message:', effect.text);
          break;
      }
    }
  }

  private checkHidingSpots(): void {
    if (!this.collision) return;

    const isHiding = this.collision.isInHidingSpot(this.player.position);
    if (isHiding && !this.player.isHidden) {
      this.player.enterHideZone();
    } else if (!isHiding && this.player.isHidden) {
      this.player.exitHideZone();
    }
  }

  private updateEnemyAI(deltaTime: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      // Check if enemy can see the player
      const canSeePlayer = enemy.canSee(this.player, this.checkLineOfSight.bind(this));

      // Update AI behavior
      enemy.updateAI(deltaTime, this.player, canSeePlayer);

      // Update vision cone visualization
      enemy.updateVisionConeVisual(this.debugOptions.showVisionCones);
    }
  }

  private checkLineOfSight(from: WorldPos, to: WorldPos): boolean {
    if (!this.collision) return true;

    // Simple raycast check for obstacles
    const steps = 10;
    const dx = (to.x - from.x) / steps;
    const dy = (to.y - from.y) / steps;

    for (let i = 1; i < steps; i++) {
      const checkX = from.x + dx * i;
      const checkY = from.y + dy * i;
      const tile = this.tilemap.getTile(Math.floor(checkX), Math.floor(checkY));

      if (tile && !tile.walkable && tile.type !== 'fence') {
        return false;
      }
    }

    return true;
  }

  private processCombat(): void {
    // Process combat events
    const events = this.combatSystem.update(this.player, this.enemies);

    for (const event of events) {
      if (event.type === 'kill') {
        // Enemy killed - remove from active
        const enemy = event.defender as Enemy;
        enemy.active = false;
        enemy.container.visible = false;

        // Death particles and audio
        if (this.particles) {
          ParticleEffects.death(this.particles, event.position);
        }
        audioHooks.emit('enemy_death', {
          position: { x: event.position.x, y: event.position.y },
        });
        this.camera.shake(4);
      } else if (event.type === 'parry') {
        // Parry particles and audio
        if (this.particles) {
          ParticleEffects.parry(this.particles, event.position);
        }
        audioHooks.emit('hit_parried');
        this.camera.shake(3);
      } else if (event.type === 'block') {
        // Block particles and audio
        if (this.particles) {
          ParticleEffects.block(this.particles, event.position);
        }
        audioHooks.emit('hit_blocked');
      } else if (event.type === 'hit') {
        // Hit particles
        const direction = {
          x: event.defender.position.x - event.attacker.position.x,
          y: event.defender.position.y - event.attacker.position.y,
        };
        if (this.particles) {
          ParticleEffects.hit(this.particles, event.position, direction);
        }

        // Audio based on who got hit
        if (event.defender === this.player) {
          audioHooks.emit('hit_player', { volume: 0.8 });
        } else {
          audioHooks.emit('hit_enemy');
        }

        // Screen shake on significant hit
        if (event.damage >= 15) {
          this.camera.shake(2);
        }
      }
    }
  }

  private checkProjectileCollisions(): void {
    if (!this.projectileManager) return;

    // Check projectiles hitting player
    const hitProjectile = this.projectileManager.checkCollisions(
      this.player.position,
      0.4, // Player hitbox radius
      this.player.id
    );

    if (hitProjectile) {
      // Player got hit by projectile
      const dx = this.player.position.x - hitProjectile.position.x;
      const dy = this.player.position.y - hitProjectile.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const knockback = dist > 0.01
        ? { x: (dx / dist) * KNOCKBACK_FORCE * 0.5, y: (dy / dist) * KNOCKBACK_FORCE * 0.5 }
        : { x: 0, y: 0 };

      if (this.player.isBlocking) {
        // Blocked - reduced damage
        this.player.onHit(Math.floor(hitProjectile.damage * 0.25), { x: 0, y: 0 });
      } else {
        this.player.onHit(hitProjectile.damage, knockback);
      }

      hitProjectile.active = false;
    }

    // Check player shurikens hitting enemies
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const enemyHit = this.projectileManager.checkCollisions(
        enemy.position,
        0.5, // Enemy hitbox radius
        this.player.id // Only player projectiles can hit enemies
      );

      if (enemyHit && enemyHit.owner === this.player.id) {
        enemy.onHit(enemyHit.damage, { x: 0, y: 0 });
        enemyHit.active = false;
      }
    }
  }

  private handlePlayerAttacks(): void {
    // Check if player is attacking and register attack hitbox
    if (this.player.state === 'attack' && this.player.attackFrame === 1) {
      const dirAngle = this.getDirectionAngle(this.player.facing);

      const hitbox: AttackHitbox = {
        position: { ...this.player.position },
        range: 1.5,
        angle: dirAngle,
        width: Math.PI / 2, // 90 degree arc
        damage: 25,
        knockback: KNOCKBACK_FORCE,
        owner: this.player,
      };

      this.combatSystem.registerAttack(hitbox);
    }
  }

  private getDirectionAngle(facing: string): number {
    const angles: Record<string, number> = {
      E: 0,
      SE: Math.PI / 4,
      S: Math.PI / 2,
      SW: (Math.PI * 3) / 4,
      W: Math.PI,
      NW: (-Math.PI * 3) / 4,
      N: -Math.PI / 2,
      NE: -Math.PI / 4,
    };
    return angles[facing] ?? 0;
  }

  private handleArcherProjectile(event: ProjectileSpawnEvent): void {
    if (!this.projectileManager) return;

    this.projectileManager.spawn({
      type: event.type,
      position: event.position,
      direction: event.direction,
      speed: event.speed,
      damage: event.damage,
      owner: event.owner,
    });

    // Audio hook for archer firing
    audioHooks.emit('archer_fire', {
      position: { x: event.position.x, y: event.position.y },
    });
  }

  private render(_alpha: number, deltaTime: number): void {
    // Apply camera transform to layers
    this.tilemap.applyCamera(this.camera);

    // Apply camera to entity layer
    const pos = this.camera.getPosition();
    const zoom = this.camera.getZoom();
    const offsetX = -pos.x * zoom + CANVAS_WIDTH / 2;
    const offsetY = -pos.y * zoom + CANVAS_HEIGHT / 2;

    this.entityLayer.x = offsetX;
    this.entityLayer.y = offsetY;
    this.entityLayer.scale.set(zoom);

    // Apply camera to projectile layer
    this.projectileLayer.x = offsetX;
    this.projectileLayer.y = offsetY;
    this.projectileLayer.scale.set(zoom);

    // Update and apply camera to particles
    if (this.particles) {
      this.particles.update(deltaTime);
      this.particles.applyCamera(offsetX, offsetY, zoom);
    }

    // Update prop manager occlusion
    if (this.propManager) {
      this.propManager.applyCamera(offsetX, offsetY, zoom);
      this.propManager.updateOcclusion(this.player.position, deltaTime);
      this.propManager.sortByDepth();
    }

    // Update tile visibility (culling)
    this.tilemap.updateVisibility(this.camera);

    // Sort entities by depth
    this.entityLayer.sortChildren();

    // Update HUD
    this.updateHUD();

    // Update comprehensive debug UI
    this.updateDebugUI();
  }

  private updateDebugUI(): void {
    if (!this.debugUI || !this.debugUI.isVisible()) return;

    // Get current tile under player
    const playerTile = this.tilemap.getTile(
      Math.floor(this.player.position.x),
      Math.floor(this.player.position.y)
    );

    this.debugUI.update({
      fps: this.fps,
      frameTime: this.frameTime,
      player: this.player,
      enemies: this.enemies,
      currentTile: playerTile,
      nearbyInteractable: this.nearbyInteractable,
      inputState: this.input.getState(),
      paused: this.paused,
      showVisionCones: this.debugOptions.showVisionCones,
      showGrid: this.debugOptions.showGrid,
      tiles: this.tilemap.getAllTiles(),
      worldWidth: this.tilemap.getWidth(),
      worldHeight: this.tilemap.getHeight(),
    });
  }

  private updateHUD(): void {
    // Update HTML HUD elements
    const healthFill = document.querySelector('.stat-bar__fill--health') as HTMLElement;
    const staminaFill = document.querySelector('.stat-bar__fill--stamina') as HTMLElement;
    const healthValue = document.querySelector('.stat-bar__value') as HTMLElement;
    const ammoValue = document.querySelector('.ammo-counter__value') as HTMLElement;
    const fpsDisplay = document.querySelector('.debug-panel') as HTMLElement;
    const interactPrompt = document.getElementById('prompt-interact') as HTMLElement;

    if (healthFill) {
      healthFill.style.width = `${(this.player.health / this.player.maxHealth) * 100}%`;
    }
    if (staminaFill) {
      staminaFill.style.width = `${(this.player.stamina / this.player.maxStamina) * 100}%`;
    }
    if (healthValue) {
      healthValue.textContent = `${Math.ceil(this.player.health)}`;
    }
    if (ammoValue) {
      const shurikenSlot = this.player.inventory[0];
      ammoValue.textContent = `${shurikenSlot.count}`;

      // Add low ammo warning
      const ammoCounter = ammoValue.closest('.ammo-counter');
      if (ammoCounter) {
        ammoCounter.classList.toggle('ammo-counter--low', shurikenSlot.count <= 2);
      }
    }

    // Update interact prompt
    if (interactPrompt) {
      if (this.nearbyInteractable) {
        interactPrompt.classList.add('prompt--visible');
        const label = interactPrompt.querySelector('.prompt__label');
        if (label) {
          label.textContent = this.nearbyInteractable.promptText;
        }
      } else {
        interactPrompt.classList.remove('prompt--visible');
      }
    }

    // Update status indicators
    const hiddenStatus = document.getElementById('status-hidden');
    const climbStatus = document.getElementById('status-climb');
    const alertStatus = document.getElementById('status-alert');

    if (hiddenStatus) {
      hiddenStatus.style.display = this.player.isHidden ? 'flex' : 'none';
    }
    if (climbStatus) {
      climbStatus.style.display = this.player.state === 'climb' ? 'flex' : 'none';
    }

    // Show alert when any enemy is in alert/chase state
    const anyEnemyAlert = this.enemies.some(
      (e) => e.active && (e.aiState === 'alert' || e.aiState === 'chase')
    );
    if (alertStatus) {
      alertStatus.style.display = anyEnemyAlert ? 'flex' : 'none';
    }

    // Update debug panel
    if (fpsDisplay && this.debugOptions.showFPS) {
      const activeEnemies = this.enemies.filter((e) => e.active).length;
      const alertEnemies = this.enemies.filter((e) => e.active && (e.aiState === 'alert' || e.aiState === 'chase')).length;

      fpsDisplay.style.display = 'block';
      fpsDisplay.innerHTML = `
        <div class="debug-panel__row"><span class="debug-panel__label">FPS:</span> ${this.fps}</div>
        <div class="debug-panel__row"><span class="debug-panel__label">Pos:</span> ${this.player.position.x.toFixed(1)}, ${this.player.position.y.toFixed(1)}, ${this.player.position.z.toFixed(1)}</div>
        <div class="debug-panel__row"><span class="debug-panel__label">Elev:</span> ${this.player.groundElevation.toFixed(1)}</div>
        <div class="debug-panel__row"><span class="debug-panel__label">State:</span> ${this.player.state}</div>
        <div class="debug-panel__row"><span class="debug-panel__label">Hidden:</span> ${this.player.isHidden ? 'Yes' : 'No'}</div>
        <div class="debug-panel__row"><span class="debug-panel__label">Enemies:</span> ${activeEnemies} (${alertEnemies} alert)</div>
        <div class="debug-panel__row"><span class="debug-panel__label">Vision:</span> ${this.debugOptions.showVisionCones ? 'ON' : 'OFF'} [V]</div>
      `;
    } else if (fpsDisplay) {
      fpsDisplay.style.display = 'none';
    }
  }

  getPlayer(): Player {
    return this.player;
  }

  getCamera(): Camera {
    return this.camera;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private triggerGameOver(): void {
    this.gameOver = true;

    // Create game over overlay
    this.gameOverElement = document.createElement('div');
    this.gameOverElement.className = 'game-over-screen';
    this.gameOverElement.innerHTML = `
      <div class="game-over-content">
        <div class="game-over-title">GAME OVER</div>
        <div class="game-over-subtitle">You have fallen...</div>
        <div class="game-over-prompt">Press SPACE or J to restart</div>
      </div>
    `;
    document.body.appendChild(this.gameOverElement);
  }

  private restartGame(): void {
    // Remove game over screen
    if (this.gameOverElement) {
      this.gameOverElement.remove();
      this.gameOverElement = null;
    }

    // Reset player
    this.player.health = this.player.maxHealth;
    this.player.stamina = this.player.maxStamina;
    this.player.position = { x: 10, y: 10, z: 0 };
    this.player.velocity = { x: 0, y: 0 };
    this.player.verticalVelocity = 0;
    this.player.active = true;
    this.player.state = 'idle';

    // Reset enemies
    for (const enemy of this.enemies) {
      enemy.aiState = 'patrol';
    }

    this.gameOver = false;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  destroy(): void {
    this.app.ticker.remove(this.gameLoop);
    this.input.destroy();
    for (const entity of this.entities) {
      entity.destroy();
    }
    if (this.projectileManager) {
      this.projectileManager.clear();
    }
    if (this.particles) {
      this.particles.destroy();
    }
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  private toggleHelpPanel(): void {
    const helpPanel = document.getElementById('help-panel');
    const helpHint = document.getElementById('help-hint');

    if (helpPanel) {
      const isVisible = helpPanel.classList.contains('help-panel--visible');
      helpPanel.classList.toggle('help-panel--visible', !isVisible);

      // Pause game when help is open, unpause when closed
      this.paused = !isVisible;

      // Hide the hint once help has been opened
      if (helpHint && !isVisible) {
        helpHint.classList.add('help-hint--hidden');
      }
    }
  }
}
