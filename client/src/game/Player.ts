/* ============================================
   SHADOW NINJA - Player Entity
   ============================================ */

import { Container } from 'pixi.js';
import { Entity } from './Entity';
import { createCharacterShape, createHighlightRing } from '../engine/ShapeRenderer';
import {
  PLAYER_WALK_SPEED,
  PLAYER_RUN_SPEED,
  PLAYER_CLIMB_SPEED,
  GRAVITY,
  MAX_FALL_SPEED,
  JUMP_BUFFER_TIME,
  COYOTE_TIME,
  PARRY_WINDOW,
  INVULNERABILITY_DURATION,
  HIT_STUN_DURATION,
  LIGHT_ATTACK_COMBO_WINDOW,
  COLORS,
} from '../engine/constants';
import type { InputState, PlayerState, Vec2, WorldPos, InventorySlot } from '../engine/types';

const JUMP_FORCE = 65; // Reasonable jump height (~1.5 tiles)
const COMBO_ATTACKS = 2;

export class Player extends Entity {
  // Stats
  health: number = 100;
  maxHealth: number = 100;
  stamina: number = 100;
  maxStamina: number = 100;

  // State
  state: PlayerState = 'idle';
  private previousState: PlayerState = 'idle';

  // Movement
  private moveInput: Vec2 = { x: 0, y: 0 };
  isRunning: boolean = false;

  // Jump mechanics
  private jumpBufferTimer: number = 0;
  private coyoteTimer: number = 0;
  private wasGrounded: boolean = true;

  // Combat
  private attackCombo: number = 0;
  private attackCooldown: number = 0;
  private comboTimer: number = 0;
  isBlocking: boolean = false;
  private parryTimer: number = 0;
  private invulnerableTimer: number = 0;
  private hitStunTimer: number = 0;
  attackFrame: number = 0; // For attack hitbox timing

  // Climbing
  private isClimbing: boolean = false;
  private climbTarget: WorldPos | null = null;

  // Stealth
  isHidden: boolean = false;
  private hideZoneTimer: number = 0;

  // Inventory
  inventory: InventorySlot[] = [
    { itemType: 'shuriken', count: 5, maxCount: 10 },
    { itemType: null, count: 0, maxCount: 1 },
    { itemType: null, count: 0, maxCount: 1 },
  ];
  activeSlot: number = 0;

  // Throw callback for projectile spawning
  onThrow: ((direction: Vec2) => void) | null = null;

  // Visuals
  private characterSprite: Container;
  private selectionRing: ReturnType<typeof createHighlightRing>;

  // Animation
  private walkAnimTime: number = 0;
  private walkBobSpeed: number = 14; // Bob frequency
  private walkBobHeight: number = 2; // Bob amplitude in pixels
  private walkSwayAmount: number = 0.08; // Rotation sway

  constructor(x: number, y: number, z: number = 0) {
    super(x, y, z);

    // Create visuals
    this.characterSprite = createCharacterShape(COLORS.PLAYER, 1, 'ninja');
    this.selectionRing = createHighlightRing(16, COLORS.SELECTION);
    this.selectionRing.y = 4;
    this.selectionRing.visible = false;

    this.container.addChild(this.selectionRing);
    this.container.addChild(this.characterSprite);
  }

  /**
   * Process input and update state
   */
  handleInput(input: InputState): void {
    // Can't act during hit stun
    if (this.hitStunTimer > 0) {
      this.moveInput = { x: 0, y: 0 };
      return;
    }

    // Movement input
    this.moveInput = { x: input.moveX, y: input.moveY };
    this.isRunning = input.run && this.stamina > 0;

    // Jump input (with buffering)
    if (input.jumpPressed) {
      this.jumpBufferTimer = JUMP_BUFFER_TIME;
    }

    // Attack input
    if (input.attackPressed && this.attackCooldown <= 0) {
      this.tryAttack();
    }

    // Block input
    if (input.block && !this.isBlocking) {
      this.startBlock();
    } else if (!input.block && this.isBlocking) {
      this.endBlock();
    }

    // Throw input
    if (input.throwPressed) {
      this.tryThrow();
    }

    // Interact input
    if (input.interactPressed) {
      this.tryInteract();
    }

    // Inventory shortcuts
    if (input.inventory1) this.activeSlot = 0;
    if (input.inventory2) this.activeSlot = 1;
    if (input.inventory3) this.activeSlot = 2;
  }

  update(deltaTime: number): void {
    this.previousState = this.state;

    // Update timers
    this.updateTimers(deltaTime);

    // Update based on state
    if (this.isClimbing) {
      this.updateClimbing(deltaTime);
    } else {
      this.updateMovement(deltaTime);
      this.updateJump(deltaTime);
      this.updateGravity(deltaTime);
    }

    // Update combat state
    this.updateCombat(deltaTime);

    // Update stamina
    this.updateStamina(deltaTime);

    // Update stealth
    this.updateStealth(deltaTime);

    // Update animation
    this.updateState();
    this.updateAnimation(deltaTime);
    this.updateVisual();
    this.updateVisualPosition();
  }

  private updateTimers(deltaTime: number): void {
    const dt = deltaTime * 1000; // Convert to ms

    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.comboTimer > 0) this.comboTimer -= dt;
    if (this.parryTimer > 0) this.parryTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.hitStunTimer > 0) this.hitStunTimer -= dt;
  }

  private updateMovement(_deltaTime: number): void {
    // Normalize diagonal movement
    let moveX = this.moveInput.x;
    let moveY = this.moveInput.y;

    if (moveX !== 0 && moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      moveX /= len;
      moveY /= len;
    }

    // Determine speed
    const speed = this.isRunning ? PLAYER_RUN_SPEED : PLAYER_WALK_SPEED;

    // Set velocity (collision system will apply it)
    this.velocity.x = moveX * speed;
    this.velocity.y = moveY * speed;

    // Update facing direction
    if (moveX !== 0 || moveY !== 0) {
      this.updateFacing();
    }
  }

  private updateJump(_deltaTime: number): void {
    // Track grounded state for coyote time
    if (this.isGrounded && !this.wasGrounded) {
      // Just landed
      this.coyoteTimer = 0;
    } else if (!this.isGrounded && this.wasGrounded) {
      // Just left ground
      this.coyoteTimer = COYOTE_TIME;
    }
    this.wasGrounded = this.isGrounded;

    // Check for jump with buffer and coyote time
    const canJump = this.isGrounded || this.coyoteTimer > 0;
    if (this.jumpBufferTimer > 0 && canJump) {
      this.performJump();
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    }
  }

  private performJump(): void {
    this.verticalVelocity = JUMP_FORCE;
    this.isGrounded = false;
    this.state = 'jump';
  }

  private updateGravity(deltaTime: number): void {
    if (!this.isGrounded) {
      // Apply gravity
      this.verticalVelocity -= GRAVITY * deltaTime;
      this.verticalVelocity = Math.max(this.verticalVelocity, -MAX_FALL_SPEED);

      // Update Z position
      this.position.z += this.verticalVelocity * deltaTime;

      // Check for landing
      if (this.position.z <= this.groundElevation) {
        this.position.z = this.groundElevation;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.state = 'land';
      }
    }
  }

  private updateClimbing(deltaTime: number): void {
    if (!this.climbTarget) {
      this.isClimbing = false;
      return;
    }

    // Move towards climb target
    const dx = this.climbTarget.x - this.position.x;
    const dy = this.climbTarget.y - this.position.y;
    const dz = this.climbTarget.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < 0.1) {
      // Reached target
      this.position = { ...this.climbTarget };
      this.isClimbing = false;
      this.climbTarget = null;
      this.groundElevation = this.position.z;
      this.isGrounded = true;
    } else {
      // Move towards target
      const speed = PLAYER_CLIMB_SPEED * deltaTime;
      const ratio = Math.min(speed / dist, 1);
      this.position.x += dx * ratio;
      this.position.y += dy * ratio;
      this.position.z += dz * ratio;
    }
  }

  private updateCombat(_deltaTime: number): void {
    // Reset combo if timer expired
    if (this.comboTimer <= 0 && this.attackCombo > 0) {
      this.attackCombo = 0;
    }

    // Decrement attack frame after one update (hit detection happens once)
    if (this.attackFrame > 0) {
      this.attackFrame--;
    }
  }

  private updateStamina(deltaTime: number): void {
    if (this.isRunning && (this.moveInput.x !== 0 || this.moveInput.y !== 0)) {
      // Drain stamina while running
      this.stamina = Math.max(0, this.stamina - 20 * deltaTime);
    } else if (!this.isBlocking) {
      // Regenerate stamina
      this.stamina = Math.min(this.maxStamina, this.stamina + 15 * deltaTime);
    }
  }

  private updateStealth(deltaTime: number): void {
    if (this.isHidden) {
      this.hideZoneTimer += deltaTime;
    } else {
      this.hideZoneTimer = 0;
    }
  }

  private updateState(): void {
    // Determine current state based on actions
    if (this.hitStunTimer > 0) {
      this.state = 'hurt';
    } else if (this.isClimbing) {
      this.state = 'climb';
    } else if (this.attackCooldown > 150) {
      this.state = 'attack';
    } else if (this.isBlocking) {
      this.state = 'block';
    } else if (!this.isGrounded) {
      this.state = this.verticalVelocity > 0 ? 'jump' : 'fall';
    } else if (this.state === 'land' && this.previousState === 'fall') {
      // Keep land state briefly
    } else if (this.moveInput.x !== 0 || this.moveInput.y !== 0) {
      this.state = this.isRunning ? 'run' : 'walk';
    } else if (this.isHidden) {
      this.state = 'hidden';
    } else {
      this.state = 'idle';
    }

    // Play appropriate animation
    this.playAnimation(this.state);
  }

  private tryAttack(): void {
    if (this.isClimbing || this.isBlocking) return;

    // Progress combo
    this.attackCombo = (this.attackCombo % COMBO_ATTACKS) + 1;
    this.attackCooldown = 300; // ms
    this.comboTimer = LIGHT_ATTACK_COMBO_WINDOW;
    this.attackFrame = 2; // Set to 2 so it's 1 after first update decrement
  }

  private startBlock(): void {
    if (this.isClimbing) return;

    this.isBlocking = true;
    this.parryTimer = PARRY_WINDOW;
  }

  private endBlock(): void {
    this.isBlocking = false;
    this.parryTimer = 0;
  }

  private tryThrow(): void {
    const slot = this.inventory[this.activeSlot];
    if (slot.itemType === 'shuriken' && slot.count > 0) {
      slot.count--;

      // Get throw direction based on facing
      const directions: Record<string, Vec2> = {
        E: { x: 1, y: 0 },
        SE: { x: 0.707, y: 0.707 },
        S: { x: 0, y: 1 },
        SW: { x: -0.707, y: 0.707 },
        W: { x: -1, y: 0 },
        NW: { x: -0.707, y: -0.707 },
        N: { x: 0, y: -1 },
        NE: { x: 0.707, y: -0.707 },
      };
      const direction = directions[this.facing] ?? { x: 1, y: 0 };

      // Emit throw event
      if (this.onThrow) {
        this.onThrow(direction);
      }
    }
  }

  private tryInteract(): void {
    // Would emit interact event for nearby interactables
  }

  /**
   * Start climbing to a target position
   */
  startClimb(target: WorldPos): void {
    this.isClimbing = true;
    this.climbTarget = target;
    this.velocity = { x: 0, y: 0 };
    this.verticalVelocity = 0;
    this.state = 'climb';
  }

  /**
   * Enter a hiding spot
   */
  enterHideZone(): void {
    this.isHidden = true;
  }

  /**
   * Exit a hiding spot
   */
  exitHideZone(): void {
    this.isHidden = false;
  }

  /**
   * Take damage
   */
  onHit(damage: number, knockback: Vec2): void {
    if (this.invulnerableTimer > 0) return;

    // Check for parry
    if (this.parryTimer > 0) {
      // Perfect parry - no damage, brief stun for attacker
      return;
    }

    // Check for block
    if (this.isBlocking) {
      damage *= 0.25; // 75% damage reduction
      knockback = { x: knockback.x * 0.5, y: knockback.y * 0.5 };
    }

    this.health = Math.max(0, this.health - damage);
    this.invulnerableTimer = INVULNERABILITY_DURATION;
    this.hitStunTimer = HIT_STUN_DURATION;

    // Apply knockback
    this.velocity.x += knockback.x;
    this.velocity.y += knockback.y;

    if (this.health <= 0) {
      this.onDeath();
    }
  }

  /**
   * Heal player
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Add item to inventory
   */
  addItem(itemType: string, count: number = 1): boolean {
    // Find existing slot or empty slot
    for (const slot of this.inventory) {
      if (slot.itemType === itemType && slot.count < slot.maxCount) {
        const space = slot.maxCount - slot.count;
        const add = Math.min(count, space);
        slot.count += add;
        return true;
      }
    }

    // Find empty slot
    for (const slot of this.inventory) {
      if (slot.itemType === null) {
        slot.itemType = itemType;
        slot.count = Math.min(count, slot.maxCount);
        return true;
      }
    }

    return false; // No space
  }

  /**
   * Check if currently performing parry
   */
  isParrying(): boolean {
    return this.parryTimer > 0;
  }

  /**
   * Check if invulnerable
   */
  isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  updateVisual(): void {
    // Base alpha
    let alpha = 1;

    // Invulnerability flicker
    if (this.invulnerableTimer > 0) {
      alpha = 0.5 + Math.sin(Date.now() * 0.02) * 0.3;
    }

    // Hidden state - semi-transparent
    if (this.isHidden) {
      alpha *= 0.5;
    }

    // Climbing visual - slight transparency
    if (this.isClimbing) {
      alpha *= 0.85;
    }

    this.characterSprite.alpha = alpha;

    // Visual scale and animation based on state
    let scaleY = 1;
    let scaleX = 1;
    let bobOffset = 0;
    let rotation = 0;

    const isMoving = this.state === 'walk' || this.state === 'run';

    if (isMoving) {
      // Walking/running animation
      const speedMult = this.state === 'run' ? 1.5 : 1;
      this.walkAnimTime += 0.016 * this.walkBobSpeed * speedMult; // Approximate deltaTime

      // Bobbing up and down
      bobOffset = Math.sin(this.walkAnimTime) * this.walkBobHeight * speedMult;

      // Squash and stretch with movement
      const squash = Math.sin(this.walkAnimTime * 2) * 0.05;
      scaleY = 1 - squash;
      scaleX = 1 + squash * 0.5;

      // Slight sway/lean in movement direction
      rotation = Math.sin(this.walkAnimTime) * this.walkSwayAmount * speedMult;

      // Lean into movement direction
      if (this.velocity.x > 0.1) rotation += 0.05;
      else if (this.velocity.x < -0.1) rotation -= 0.05;
    } else {
      // Reset walk animation when stopped
      this.walkAnimTime = 0;
    }

    if (this.state === 'jump') {
      scaleY = 1.1; // Stretch when jumping
      scaleX = 0.9;
    } else if (this.state === 'land') {
      scaleY = 0.85; // Squash on landing
      scaleX = 1.1;
    } else if (this.state === 'climb') {
      scaleY = 0.95;
      // Climbing bob
      bobOffset = Math.sin(Date.now() * 0.008) * 1.5;
    } else if (this.state === 'attack') {
      // Attack lunge
      const attackProgress = this.attackCooldown / 300;
      scaleX = 1 + attackProgress * 0.15;
      rotation = (this.facing === 'E' || this.facing === 'NE' || this.facing === 'SE') ? 0.1 : -0.1;
    }

    this.characterSprite.scale.set(scaleX, scaleY);
    this.characterSprite.rotation = rotation;
    this.characterSprite.y = bobOffset;
  }

  /**
   * Show/hide selection indicator
   */
  setSelected(selected: boolean): void {
    this.selectionRing.visible = selected;
  }
}
