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
import { Guard, GuardAttackEvent } from './Guard';
import { Archer, ProjectileSpawnEvent } from './Archer';
import { Skeleton, SkeletonAttackEvent } from './Skeleton';
import { Oni, OniAttackEvent } from './Oni';
import { Boss, BossAttackEvent, BossShurikenEvent } from './Boss';
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
import { createDungeonLevel } from '../levels/Dungeon';
import { createDungeonB1Level } from '../levels/DungeonB1';
import { createDungeonB2Level } from '../levels/DungeonB2';
import { createDungeonB3Level } from '../levels/DungeonB3';

// Level registry
const LEVELS: Record<string, () => ReturnType<typeof createCourtyardLevel>> = {
  courtyard: createCourtyardLevel,
  dungeon: createDungeonLevel,
  dungeon_b1: createDungeonB1Level,
  dungeon_b2: createDungeonB2Level,
  dungeon_b3: createDungeonB3Level,
};

interface LevelExit {
  x: number;
  y: number;
  targetLevel: string;
  targetSpawn: { x: number; y: number };
}

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

  // Level state
  private currentLevel: string = 'courtyard';
  private levelExits: LevelExit[] = [];

  // Persistent state - track killed enemies per level
  private killedEnemies: Map<string, Set<number>> = new Map();

  // Score system
  private score: number = 0;
  private highScore: number = 0;
  private static readonly HIGHSCORE_KEY = 'shadow-ninja-highscore';

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
    // Load high score from storage
    this.loadHighScore();

    // Initialize managers (only once)
    this.propManager = new PropManager(this.propLayer);
    this.projectileManager = new ProjectileManager(this.projectileLayer);
    this.particles = new ParticleSystem(this.app.getLayer(LAYERS.EFFECTS));

    // Load the starting level
    this.loadLevel('courtyard');

    // Add player to entity layer
    this.entityLayer.addChild(this.player.container);
    this.entities.push(this.player);

    // Set up player throw callback
    this.player.onThrow = (direction) => {
      this.handlePlayerThrow(direction);
    };

    // Set up camera
    this.camera.snapToTarget(this.player.position);

    // Start game loop
    this.lastTime = performance.now();
    this.app.ticker.add(this.gameLoop);
  }

  private loadLevel(levelName: string, spawnPos?: { x: number; y: number }): void {
    const levelFactory = LEVELS[levelName];
    if (!levelFactory) {
      console.error(`Level not found: ${levelName}`);
      return;
    }

    // Clear existing level entities (but not player)
    for (const enemy of this.enemies) {
      this.entityLayer.removeChild(enemy.container);
      enemy.container.destroy({ children: true });
    }
    this.enemies = [];
    this.entities = this.entities.filter(e => e === this.player);

    // Clear interactables
    this.interactables.clear();

    // Clear props
    if (this.propManager) {
      for (const prop of this.propManager.getAllProps()) {
        this.propManager.removeProp(prop.id);
      }
    }

    // Load new level data
    const levelData = levelFactory();
    this.currentLevel = levelName;
    this.levelExits = levelData.exits || [];

    // Load tilemap
    this.tilemap.load(levelData.width, levelData.height, levelData.tiles);

    // Initialize/update collision system
    this.collision = new CollisionSystem(this.tilemap);

    // Add props from level data
    if (this.propManager) {
      for (const propData of levelData.props) {
        this.propManager.addProp({
          id: `prop_${propData.type}_${propData.x}_${propData.y}`,
          type: propData.type,
          x: propData.x,
          y: propData.y,
        });
      }
    }

    // Add interactables from level data
    for (const interactData of levelData.interactables) {
      this.interactables.register({
        id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
        type: interactData.type as never,
        position: { x: interactData.x, y: interactData.y, z: 0 },
        properties: interactData.properties,
      });

      // Add visual prop for pickups, doors, and stairs
      if (this.propManager) {
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
        } else if (interactData.type === 'stairs_down' || interactData.type === 'stairs_up') {
          this.propManager.addProp({
            id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
            type: interactData.type,
            x: interactData.x,
            y: interactData.y,
            interactive: true,
          });
        } else if (interactData.type === 'lever') {
          this.propManager.addProp({
            id: `interact_${interactData.type}_${interactData.x}_${interactData.y}`,
            type: 'lever',
            x: interactData.x,
            y: interactData.y,
            interactive: true,
            state: 'off',
          });
        }
      }
    }

    // Get killed enemies for this level
    const killedInLevel = this.killedEnemies.get(levelName) || new Set();

    // Spawn enemies from level data, skipping killed ones (they stay dead)
    for (let i = 0; i < levelData.enemySpawns.length; i++) {
      const enemyData = levelData.enemySpawns[i];

      // Skip enemies that were previously killed - they stay dead
      if (killedInLevel.has(i)) {
        continue;
      }

      const patrolPoints = enemyData.patrol?.map((p) => ({ x: p.x, y: p.y }));

      let enemy: Enemy;
      if (enemyData.type === 'guard') {
        const guard = new Guard(enemyData.x, enemyData.y, patrolPoints);
        guard.onAttack = (event: GuardAttackEvent) => {
          this.handleGuardAttack(event);
        };
        enemy = guard;
      } else if (enemyData.type === 'archer') {
        const archer = new Archer(enemyData.x, enemyData.y, patrolPoints);
        archer.onSpawnProjectile = (event: ProjectileSpawnEvent) => {
          this.handleArcherProjectile(event);
        };
        enemy = archer;
      } else if (enemyData.type === 'skeleton') {
        const skeleton = new Skeleton(enemyData.x, enemyData.y, patrolPoints);
        skeleton.onAttack = (event: SkeletonAttackEvent) => {
          this.handleGuardAttack(event); // Reuse guard attack handler
        };
        enemy = skeleton;
      } else if (enemyData.type === 'oni') {
        const oni = new Oni(enemyData.x, enemyData.y, patrolPoints);
        oni.onAttack = (event: OniAttackEvent) => {
          this.handleGuardAttack(event); // Reuse guard attack handler
        };
        enemy = oni;
      } else if (enemyData.type === 'boss') {
        const boss = new Boss(enemyData.x, enemyData.y, patrolPoints);
        boss.onAttack = (event: BossAttackEvent) => {
          this.handleBossAttack(event);
        };
        boss.onSpawnShuriken = (event: BossShurikenEvent) => {
          this.handleBossShuriken(event);
        };
        enemy = boss;
      } else {
        continue;
      }

      enemy.position.z = this.collision.getGroundElevation(enemy.position);
      if (enemyData.facing) {
        enemy.facing = enemyData.facing;
      }

      this.enemies.push(enemy);
      this.entities.push(enemy);
      this.entityLayer.addChild(enemy.container);
    }

    // Set player position
    const spawn = spawnPos || levelData.playerSpawn;
    this.player.position = { x: spawn.x, y: spawn.y, z: 0 };
    this.player.position.z = this.collision.getGroundElevation(this.player.position);

    // Snap camera to new position
    this.camera.snapToTarget(this.player.position);

    console.log(`Loaded level: ${levelName}`);
  }

  private checkLevelExits(): void {
    // Check if player is near a door exit
    for (const exit of this.levelExits) {
      const dx = this.player.position.x - exit.x;
      const dy = this.player.position.y - exit.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 1.0) {
        // Check if the door at this position is open
        const doorId = `interact_door_${exit.x}_${exit.y}`;
        const door = this.interactables.get(doorId);

        if (door && door.state === 'active') {
          // Door is open - transition to new level
          this.loadLevel(exit.targetLevel, exit.targetSpawn);
          return;
        }
      }
    }
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

    // Apply enemy knockback with collision checking
    this.applyEnemyKnockback();

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

    // Check for level exits (when near an open door)
    this.checkLevelExits();

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
        // Store ID and position before handling so we can remove the prop and show effects
        const pickupId = nearest.id;
        const pickupPos = { ...nearest.position };
        const isHealth = nearest.type === 'pickup_health';

        this.handleInteraction(pickupId);

        // Remove the visual prop
        if (this.propManager) {
          this.propManager.removeProp(pickupId);
        }

        // Pickup particle effect
        if (this.particles) {
          const color = isHealth ? 0xef4444 : 0x14b8a6; // Red for health, teal for shuriken
          ParticleEffects.pickup(this.particles, pickupPos, color);
        }

        // Pickup sound
        audioHooks.emit(isHealth ? 'pickup_health' : 'pickup_item');

        this.nearbyInteractable = null;
        console.log(`Picked up: ${nearest.type}`);
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
          // Update tile walkability for doors
          if (effect.newState === 'open' || effect.newState === 'closed') {
            const interactable = this.interactables.get(effect.targetId);
            if (interactable) {
              const col = Math.floor(interactable.position.x);
              const row = Math.floor(interactable.position.y);
              this.tilemap.setTileWalkable(col, row, effect.newState === 'open');
            }
          }
          break;

        case 'climb':
          this.player.startClimb(effect.target);
          break;

        case 'message':
          console.log('Game message:', effect.text);
          break;

        case 'level_transition':
          this.loadLevel(effect.targetLevel, effect.targetSpawn);
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

      // Store position before AI update
      const prevX = enemy.position.x;
      const prevY = enemy.position.y;

      // Check if enemy can see the player
      const canSeePlayer = enemy.canSee(this.player, this.checkLineOfSight.bind(this));

      // Update AI behavior
      enemy.updateAI(deltaTime, this.player, canSeePlayer);

      // Validate enemy movement with collision system
      if (this.collision) {
        const canMove = this.collision.canMoveTo(
          { x: prevX, y: prevY, z: enemy.position.z },
          enemy.position.x,
          enemy.position.y
        );

        if (!canMove) {
          // Revert to previous position if move is invalid
          enemy.position.x = prevX;
          enemy.position.y = prevY;
        } else {
          // Update enemy's z position to match ground elevation
          enemy.position.z = this.collision.getGroundElevation(enemy.position);
        }
      }

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

  private applyEnemyKnockback(): void {
    if (!this.collision) return;

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      // Apply any pending knockback with collision checking
      if (enemy.pendingKnockback) {
        enemy.applyKnockback((from, toX, toY) => {
          return this.collision!.canMoveTo(from as WorldPos, toX, toY);
        });
      }

      // Safety check: if enemy somehow ended up in a wall, push them out
      const tile = this.tilemap.getTile(
        Math.floor(enemy.position.x),
        Math.floor(enemy.position.y)
      );

      if (tile && !tile.walkable) {
        // Find nearest valid position
        const checkRadius = 0.5;
        const directions = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];

        for (const dir of directions) {
          const testX = enemy.position.x + dir.x * checkRadius;
          const testY = enemy.position.y + dir.y * checkRadius;
          const testTile = this.tilemap.getTile(Math.floor(testX), Math.floor(testY));

          if (testTile && testTile.walkable) {
            enemy.position.x = testX;
            enemy.position.y = testY;
            break;
          }
        }
      }

      // Clamp to world bounds
      enemy.position.x = Math.max(0.5, Math.min(this.tilemap.getWidth() - 0.5, enemy.position.x));
      enemy.position.y = Math.max(0.5, Math.min(this.tilemap.getHeight() - 0.5, enemy.position.y));
    }
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

        // Award score based on enemy max health
        const scoreValue = this.getEnemyScoreValue(enemy.maxHealth);
        this.addScore(scoreValue);

        // Track killed enemy for persistence
        const enemyIndex = this.enemies.indexOf(enemy);
        if (enemyIndex !== -1) {
          if (!this.killedEnemies.has(this.currentLevel)) {
            this.killedEnemies.set(this.currentLevel, new Set());
          }
          this.killedEnemies.get(this.currentLevel)!.add(enemyIndex);
        }

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

      // Check all projectiles against this enemy (no excludeOwner)
      const enemyHit = this.projectileManager.checkCollisions(
        enemy.position,
        0.5 // Enemy hitbox radius
      );

      // Only player-owned projectiles damage enemies
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
        range: 1.8,
        angle: dirAngle,
        width: Math.PI * 0.6, // 108 degree arc
        damage: 20, // Reduced from 35 - takes 2 hits to kill guard
        knockback: KNOCKBACK_FORCE,
        owner: this.player,
      };

      this.combatSystem.registerAttack(hitbox);

      // Attack swing visual effect
      if (this.particles) {
        const dirVec = {
          x: Math.cos(dirAngle),
          y: Math.sin(dirAngle),
        };
        ParticleEffects.attackSwing(this.particles, this.player.position, dirVec);
      }

      // Audio for attack swing
      audioHooks.emit('player_attack');
      console.log(`Attack registered: pos=${this.player.position.x.toFixed(1)},${this.player.position.y.toFixed(1)} dir=${this.player.facing} range=${hitbox.range}`);
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

  private handleGuardAttack(event: GuardAttackEvent): void {
    // Enemy attack visual effect
    if (this.particles) {
      ParticleEffects.enemyAttack(this.particles, event.position, event.direction);
    }
    audioHooks.emit('enemy_attack');
  }

  private handleBossAttack(event: BossAttackEvent): void {
    // Boss attack visual effect - more dramatic
    if (this.particles) {
      ParticleEffects.enemyAttack(this.particles, event.position, event.direction);
      // Extra particles for boss
      ParticleEffects.hit(this.particles, event.position, event.direction);
    }
    audioHooks.emit('enemy_attack');

    // Camera shake for boss attacks
    if (event.type === 'charge') {
      this.camera.shake(6);
    } else {
      this.camera.shake(3);
    }
  }

  private handleBossShuriken(event: BossShurikenEvent): void {
    if (!this.projectileManager) return;

    this.projectileManager.spawn({
      type: 'shuriken',
      position: event.position,
      direction: event.direction,
      speed: event.speed,
      damage: event.damage,
      owner: event.owner,
    });

    audioHooks.emit('shuriken_throw');
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

  private handlePlayerThrow(direction: { x: number; y: number }): void {
    if (!this.projectileManager) return;

    // Spawn shuriken from player position, slightly offset in throw direction
    const spawnOffset = 0.5;
    const spawnPos = {
      x: this.player.position.x + direction.x * spawnOffset,
      y: this.player.position.y + direction.y * spawnOffset,
      z: this.player.position.z + 0.5, // Throw at chest height
    };

    this.projectileManager.spawn({
      type: 'shuriken',
      position: spawnPos,
      direction: direction,
      speed: 12, // Fast shuriken
      damage: 25,
      owner: this.player.id,
    });

    // Audio hook for shuriken throw
    audioHooks.emit('shuriken_throw', {
      position: { x: this.player.position.x, y: this.player.position.y },
    });

    console.log(`Shuriken thrown! Direction: ${direction.x.toFixed(2)}, ${direction.y.toFixed(2)}`);
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

    // Get interactables for debug view
    const debugInteractables = this.interactables.getAll().map(i => ({
      id: i.id,
      type: i.type,
      x: i.position.x,
      y: i.position.y,
      state: i.state,
    }));

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
      interactables: debugInteractables,
      currentLevel: this.currentLevel,
    });
  }

  private updateHUD(): void {
    // Update HTML HUD elements
    const healthFill = document.querySelector('.stat-bar__fill--health') as HTMLElement;
    const staminaFill = document.querySelector('.stat-bar__fill--stamina') as HTMLElement;
    const healthValue = document.querySelector('.stat-bar__value') as HTMLElement;
    const ammoValue = document.querySelector('.ammo-counter__value') as HTMLElement;
    const scoreValue = document.getElementById('score-value') as HTMLElement;
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

    // Update score display
    if (scoreValue) {
      scoreValue.textContent = this.score.toString();
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
    // Save high score on game over
    this.saveHighScore();
    const isNewHighScore = this.score >= this.highScore && this.score > 0;

    this.gameOverElement.className = 'game-over-screen';
    this.gameOverElement.innerHTML = `
      <div class="game-over-content">
        <div class="game-over-title">GAME OVER</div>
        <div class="game-over-subtitle">You have fallen...</div>
        <div class="game-over-score">Score: ${this.score}</div>
        ${isNewHighScore ? '<div class="game-over-highscore new">NEW HIGH SCORE!</div>' : `<div class="game-over-highscore">High Score: ${this.highScore}</div>`}
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

    // Clear all persistent state - fresh start
    this.killedEnemies.clear();

    // Reset score
    this.score = 0;

    // Reset player
    this.player.health = this.player.maxHealth;
    this.player.stamina = this.player.maxStamina;
    this.player.velocity = { x: 0, y: 0 };
    this.player.verticalVelocity = 0;
    this.player.active = true;
    this.player.state = 'idle';

    this.gameOver = false;

    // Reload from the starting level
    this.loadLevel('courtyard');
  }

  private loadHighScore(): void {
    try {
      const stored = localStorage.getItem(GameScene.HIGHSCORE_KEY);
      if (stored) {
        this.highScore = parseInt(stored, 10) || 0;
      }
    } catch {
      console.warn('Failed to load high score');
    }
  }

  private saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(GameScene.HIGHSCORE_KEY, this.highScore.toString());
      } catch {
        console.warn('Failed to save high score');
      }
    }
  }

  private addScore(points: number): void {
    this.score += points;
  }

  private getEnemyScoreValue(maxHealth: number): number {
    // Score based on enemy health: tougher enemies = more points
    if (maxHealth >= 300) return 1000; // Boss
    if (maxHealth >= 100) return 200;  // Oni
    if (maxHealth >= 40) return 100;   // Guard
    if (maxHealth >= 35) return 75;    // Archer
    return 50; // Skeleton and weaker
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
