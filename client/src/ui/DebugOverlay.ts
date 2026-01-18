/**
 * Panda & Dog - Debug Overlay
 * Development tools for testing and debugging
 */

import type { MultiplayerScene } from '../game/MultiplayerScene';

export interface DebugOverlay {
  update(scene: MultiplayerScene): void;
  toggle(): void;
  isVisible(): boolean;
  destroy(): void;
}

export function createDebugOverlay(container: HTMLElement): DebugOverlay {
  let visible = false;
  let lastUpdate = 0;
  let frameCount = 0;
  let fps = 0;

  const panel = document.createElement('div');
  panel.className = 'debug-overlay';
  panel.innerHTML = `
    <div class="debug-overlay__header">
      <span class="debug-overlay__title">Debug</span>
      <button class="debug-overlay__close" id="debug-close">×</button>
    </div>
    <div class="debug-overlay__content">
      <div class="debug-section">
        <div class="debug-section__title">Performance</div>
        <div class="debug-row">
          <span class="debug-label">FPS:</span>
          <span class="debug-value" id="debug-fps">--</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Server Tick:</span>
          <span class="debug-value" id="debug-tick">--</span>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-section__title">Network</div>
        <div class="debug-row">
          <span class="debug-label">Role:</span>
          <span class="debug-value" id="debug-role">--</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Entities:</span>
          <span class="debug-value" id="debug-entities">--</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Interactables:</span>
          <span class="debug-value" id="debug-interactables">--</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Pings:</span>
          <span class="debug-value" id="debug-pings">--</span>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-section__title">Puzzles</div>
        <div class="debug-row">
          <span class="debug-label">Completed:</span>
          <span class="debug-value" id="debug-puzzles">--</span>
        </div>
        <div class="debug-row">
          <span class="debug-label">Nearby:</span>
          <span class="debug-value" id="debug-nearby">--</span>
        </div>
      </div>
      <div class="debug-section">
        <div class="debug-section__title">Actions</div>
        <div class="debug-actions">
          <button class="debug-action" id="debug-reload">Reload Level</button>
          <button class="debug-action" id="debug-teleport">Teleport to Start</button>
        </div>
      </div>
    </div>
  `;
  panel.style.display = 'none';
  container.appendChild(panel);

  // Elements
  const fpsEl = panel.querySelector('#debug-fps') as HTMLElement;
  const tickEl = panel.querySelector('#debug-tick') as HTMLElement;
  const roleEl = panel.querySelector('#debug-role') as HTMLElement;
  const entitiesEl = panel.querySelector('#debug-entities') as HTMLElement;
  const interactablesEl = panel.querySelector('#debug-interactables') as HTMLElement;
  const pingsEl = panel.querySelector('#debug-pings') as HTMLElement;
  const puzzlesEl = panel.querySelector('#debug-puzzles') as HTMLElement;
  const nearbyEl = panel.querySelector('#debug-nearby') as HTMLElement;
  const closeBtn = panel.querySelector('#debug-close') as HTMLButtonElement;

  closeBtn.addEventListener('click', () => toggle());

  // Keyboard shortcut
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === '`' || e.key === 'F3') {
      e.preventDefault();
      toggle();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function update(scene: MultiplayerScene): void {
    if (!visible) return;

    // FPS calculation
    frameCount++;
    const now = performance.now();
    if (now - lastUpdate >= 1000) {
      fps = Math.round(frameCount * 1000 / (now - lastUpdate));
      frameCount = 0;
      lastUpdate = now;
    }

    // Update values
    fpsEl.textContent = String(fps);
    tickEl.textContent = String(scene.getServerTick());
    roleEl.textContent = scene.getLocalRole() || 'None';

    const interactables = scene.getInteractables();
    const pings = scene.getPings();
    const puzzles = scene.getPuzzleStates();
    const nearby = scene.getNearbyInteractable();

    entitiesEl.textContent = '2'; // Dog + Panda
    interactablesEl.textContent = String(interactables.length);
    pingsEl.textContent = String(pings.length);

    const completedPuzzles = puzzles.filter(p => p.completed).length;
    puzzlesEl.textContent = `${completedPuzzles}/${puzzles.length}`;

    nearbyEl.textContent = nearby ? nearby.prompt : 'None';
  }

  function toggle(): void {
    visible = !visible;
    panel.style.display = visible ? 'block' : 'none';
    if (visible) {
      lastUpdate = performance.now();
      frameCount = 0;
    }
  }

  function isVisible(): boolean {
    return visible;
  }

  function destroy(): void {
    window.removeEventListener('keydown', handleKeyDown);
    panel.remove();
  }

  return {
    update,
    toggle,
    isVisible,
    destroy,
  };
}
