/* ============================================
   SHADOW NINJA - Input System
   ============================================ */

import type { InputState } from './types';

type KeyMap = Record<string, keyof InputState | [keyof InputState, keyof InputState]>;

const KEY_BINDINGS: KeyMap = {
  // Movement
  KeyW: 'moveY',
  KeyS: 'moveY',
  KeyA: 'moveX',
  KeyD: 'moveX',
  ArrowUp: 'moveY',
  ArrowDown: 'moveY',
  ArrowLeft: 'moveX',
  ArrowRight: 'moveX',

  // Actions
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: ['jump', 'jumpPressed'],
  KeyJ: ['attack', 'attackPressed'],
  KeyK: 'block',
  KeyL: ['throw', 'throwPressed'],
  KeyE: ['interact', 'interactPressed'],

  // Inventory
  Digit1: 'inventory1',
  Digit2: 'inventory2',
  Digit3: 'inventory3',

  // System
  Escape: ['pause', 'pausePressed'],
  KeyF: ['debug', 'debugPressed'],
  KeyV: ['toggleVision', 'toggleVisionPressed'],
  KeyG: ['toggleGrid', 'toggleGridPressed'],
  KeyH: ['toggleHelp', 'toggleHelpPressed'],
  IntlBackslash: ['toggleDebugUI', 'toggleDebugUIPressed'],
  Backquote: ['toggleDebugUI', 'toggleDebugUIPressed'],
  DebugUIKey: ['toggleDebugUI', 'toggleDebugUIPressed'],
};

// Keys that should trigger debug UI by their character value (for § key on Nordic keyboards)
const DEBUG_UI_KEYS = new Set(['§', '`']);

const POSITIVE_KEYS = new Set([
  'KeyD',
  'KeyS',
  'ArrowRight',
  'ArrowDown',
]);

export interface TouchInputProvider {
  getState(): { moveX: number; moveY: number; interact: boolean; run: boolean };
  isActive(): boolean;
}

export class Input {
  private state: InputState;
  private keysDown: Set<string> = new Set();
  private keysPressed: Set<string> = new Set();
  private touchProvider: TouchInputProvider | null = null;

  constructor() {
    this.state = this.createEmptyState();
    this.setupListeners();
  }

  setTouchProvider(provider: TouchInputProvider | null): void {
    this.touchProvider = provider;
  }

  private createEmptyState(): InputState {
    return {
      moveX: 0,
      moveY: 0,
      run: false,
      jump: false,
      jumpPressed: false,
      attack: false,
      attackPressed: false,
      block: false,
      throw: false,
      throwPressed: false,
      interact: false,
      interactPressed: false,
      inventory1: false,
      inventory2: false,
      inventory3: false,
      pause: false,
      pausePressed: false,
      debug: false,
      debugPressed: false,
      toggleVision: false,
      toggleVisionPressed: false,
      toggleGrid: false,
      toggleGridPressed: false,
      toggleHelp: false,
      toggleHelpPressed: false,
      toggleDebugUI: false,
      toggleDebugUIPressed: false,
    };
  }

  private setupListeners(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) return;

    const code = event.code;

    // Handle § key by character for Nordic keyboard layouts
    if (DEBUG_UI_KEYS.has(event.key)) {
      if (!this.keysDown.has('DebugUIKey')) {
        this.keysDown.add('DebugUIKey');
        this.keysPressed.add('DebugUIKey');
      }
      event.preventDefault();
      return;
    }

    if (!this.keysDown.has(code)) {
      this.keysDown.add(code);
      this.keysPressed.add(code);
    }

    // Prevent default for game keys
    if (KEY_BINDINGS[code]) {
      event.preventDefault();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    // Handle § key by character for Nordic keyboard layouts
    if (DEBUG_UI_KEYS.has(event.key)) {
      this.keysDown.delete('DebugUIKey');
      return;
    }
    this.keysDown.delete(event.code);
  };

  private onBlur = (): void => {
    this.keysDown.clear();
    this.keysPressed.clear();
  };

  update(): void {
    // Reset state
    this.state = this.createEmptyState();

    // Process held keys
    for (const code of this.keysDown) {
      this.applyKeyToState(code, false);
    }

    // Process pressed keys (single frame)
    for (const code of this.keysPressed) {
      this.applyKeyToState(code, true);
    }

    // Apply touch input if available
    if (this.touchProvider?.isActive()) {
      this.applyTouchInput(this.touchProvider.getState());
    }

    // Clear pressed keys after processing
    this.keysPressed.clear();
  }

  private applyKeyToState(code: string, isPress: boolean): void {
    const binding = KEY_BINDINGS[code];
    if (!binding) return;

    if (Array.isArray(binding)) {
      // Handle hold + press pair
      const [holdKey, pressKey] = binding;
      this.state[holdKey] = true as never;
      if (isPress) {
        this.state[pressKey] = true as never;
      }
    } else if (binding === 'moveX' || binding === 'moveY') {
      // Handle axis input
      const value = POSITIVE_KEYS.has(code) ? 1 : -1;
      this.state[binding] = value;
    } else {
      // Handle boolean input
      this.state[binding] = true as never;
    }
  }

  getState(): Readonly<InputState> {
    return this.state;
  }

  /**
   * Apply touch input on top of keyboard input
   */
  applyTouchInput(touch: { moveX: number; moveY: number; interact: boolean; run: boolean }): void {
    if (touch.moveX !== 0) {
      this.state.moveX = touch.moveX;
    }
    if (touch.moveY !== 0) {
      this.state.moveY = touch.moveY;
    }
    if (touch.interact) {
      this.state.interact = true;
      this.state.interactPressed = true;
    }
    if (touch.run) {
      this.state.run = true;
    }
  }

  isKeyDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  isKeyPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
