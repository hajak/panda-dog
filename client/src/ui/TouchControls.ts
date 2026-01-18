/**
 * Panda & Dog - Touch Controls
 * Virtual joystick and buttons for mobile (Panda) player
 */

export interface TouchControlsState {
  moveX: number;
  moveY: number;
  interact: boolean;
  run: boolean;
}

export interface TouchControls {
  getState(): TouchControlsState;
  isActive(): boolean;
  destroy(): void;
}

export function createTouchControls(container: HTMLElement): TouchControls {
  let state: TouchControlsState = {
    moveX: 0,
    moveY: 0,
    interact: false,
    run: false,
  };

  let joystickActive = false;
  let joystickOrigin = { x: 0, y: 0 };
  let joystickTouchId: number | null = null;

  // Create touch control elements
  const wrapper = document.createElement('div');
  wrapper.className = 'touch-controls';
  wrapper.innerHTML = `
    <div class="touch-joystick" id="touch-joystick">
      <div class="touch-joystick__base"></div>
      <div class="touch-joystick__stick"></div>
    </div>
    <div class="touch-buttons">
      <button class="touch-button touch-button--interact" id="touch-interact">
        <span class="touch-button__icon">E</span>
        <span class="touch-button__label">Interact</span>
      </button>
      <button class="touch-button touch-button--run" id="touch-run">
        <span class="touch-button__icon">⚡</span>
        <span class="touch-button__label">Run</span>
      </button>
    </div>
  `;
  container.appendChild(wrapper);

  const joystick = wrapper.querySelector('#touch-joystick') as HTMLElement;
  const stick = joystick.querySelector('.touch-joystick__stick') as HTMLElement;
  const interactBtn = wrapper.querySelector('#touch-interact') as HTMLButtonElement;
  const runBtn = wrapper.querySelector('#touch-run') as HTMLButtonElement;

  const JOYSTICK_RADIUS = 50;
  const DEADZONE = 0.15;

  // Joystick handlers
  function handleJoystickStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickActive = true;
    joystickTouchId = touch.identifier;
    joystickOrigin = {
      x: touch.clientX,
      y: touch.clientY,
    };
    joystick.classList.add('touch-joystick--active');
  }

  function handleJoystickMove(e: TouchEvent): void {
    if (!joystickActive) return;
    e.preventDefault();

    let touch: Touch | undefined;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        touch = e.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const dx = touch.clientX - joystickOrigin.x;
    const dy = touch.clientY - joystickOrigin.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Clamp to radius
    const clampedDist = Math.min(distance, JOYSTICK_RADIUS);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    // Update stick position
    stick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

    // Normalize to -1 to 1
    const normalizedX = clampedX / JOYSTICK_RADIUS;
    const normalizedY = clampedY / JOYSTICK_RADIUS;

    // Apply deadzone
    state.moveX = Math.abs(normalizedX) > DEADZONE ? normalizedX : 0;
    state.moveY = Math.abs(normalizedY) > DEADZONE ? normalizedY : 0;
  }

  function handleJoystickEnd(e: TouchEvent): void {
    let found = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        found = true;
        break;
      }
    }
    if (!found) return;

    joystickActive = false;
    joystickTouchId = null;
    state.moveX = 0;
    state.moveY = 0;
    stick.style.transform = 'translate(0, 0)';
    joystick.classList.remove('touch-joystick--active');
  }

  // Button handlers
  function handleInteractStart(e: TouchEvent | MouseEvent): void {
    e.preventDefault();
    state.interact = true;
    interactBtn.classList.add('touch-button--pressed');
  }

  function handleInteractEnd(e: TouchEvent | MouseEvent): void {
    e.preventDefault();
    state.interact = false;
    interactBtn.classList.remove('touch-button--pressed');
  }

  function handleRunStart(e: TouchEvent | MouseEvent): void {
    e.preventDefault();
    state.run = true;
    runBtn.classList.add('touch-button--pressed');
  }

  function handleRunEnd(e: TouchEvent | MouseEvent): void {
    e.preventDefault();
    state.run = false;
    runBtn.classList.remove('touch-button--pressed');
  }

  // Attach event listeners
  joystick.addEventListener('touchstart', handleJoystickStart, { passive: false });
  joystick.addEventListener('touchmove', handleJoystickMove, { passive: false });
  joystick.addEventListener('touchend', handleJoystickEnd);
  joystick.addEventListener('touchcancel', handleJoystickEnd);

  interactBtn.addEventListener('touchstart', handleInteractStart, { passive: false });
  interactBtn.addEventListener('touchend', handleInteractEnd);
  interactBtn.addEventListener('touchcancel', handleInteractEnd);

  runBtn.addEventListener('touchstart', handleRunStart, { passive: false });
  runBtn.addEventListener('touchend', handleRunEnd);
  runBtn.addEventListener('touchcancel', handleRunEnd);

  // Check if touch device
  function isActive(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function getState(): TouchControlsState {
    return { ...state };
  }

  function destroy(): void {
    wrapper.remove();
  }

  return {
    getState,
    isActive,
    destroy,
  };
}

/**
 * Detect if running on mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1);
}
