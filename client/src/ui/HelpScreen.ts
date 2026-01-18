/**
 * Panda & Dog - Help Screen
 * Shows controls and game instructions
 */

import type { Role } from '@shared/types';

export interface HelpScreen {
  show(): void;
  hide(): void;
  toggle(): void;
  destroy(): void;
}

export function createHelpScreen(container: HTMLElement, role: Role | null): HelpScreen {
  const overlay = document.createElement('div');
  overlay.className = 'help-screen';
  overlay.style.display = 'none';

  const isDog = role === 'dog';
  const isPanda = role === 'panda';

  overlay.innerHTML = `
    <div class="help-screen__content">
      <div class="help-screen__header">
        <h2 class="help-screen__title">Controls</h2>
        <button class="help-screen__close" id="help-close">&times;</button>
      </div>
      <div class="help-screen__body">
        <div class="help-section">
          <h3 class="help-section__title">Movement</h3>
          <div class="help-controls">
            <div class="help-control">
              <span class="help-key">W A S D</span>
              <span class="help-label">Move</span>
            </div>
            <div class="help-control">
              <span class="help-key">Shift</span>
              <span class="help-label">Run</span>
            </div>
          </div>
        </div>

        <div class="help-section">
          <h3 class="help-section__title">Actions</h3>
          <div class="help-controls">
            <div class="help-control">
              <span class="help-key">E</span>
              <span class="help-label">Interact</span>
            </div>
            ${isDog ? `
            <div class="help-control">
              <span class="help-key">1 2 3</span>
              <span class="help-label">Place Ping</span>
            </div>
            ` : ''}
          </div>
        </div>

        ${isDog ? `
        <div class="help-section">
          <h3 class="help-section__title">Ping Types</h3>
          <div class="help-controls">
            <div class="help-control">
              <span class="help-key">1</span>
              <span class="help-label">Look Here</span>
            </div>
            <div class="help-control">
              <span class="help-key">2</span>
              <span class="help-label">Go Here</span>
            </div>
            <div class="help-control">
              <span class="help-key">3</span>
              <span class="help-label">Wait</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="help-section">
          <h3 class="help-section__title">Your Role: ${role ? role.toUpperCase() : 'Unknown'}</h3>
          <p class="help-description">
            ${isDog ? `
              You are the scout! Use cameras to see ahead, place ping markers to guide your partner,
              and activate power switches. You're faster but can't push heavy objects.
            ` : isPanda ? `
              You are the muscle! Push crates onto pressure plates, operate winches to lower bridges,
              and use your weight to activate heavy switches.
            ` : 'Waiting for role assignment...'}
          </p>
        </div>

        <div class="help-section">
          <h3 class="help-section__title">Tips</h3>
          <ul class="help-tips">
            <li>Work together - most puzzles need both players!</li>
            <li>Dog should scout ahead with cameras</li>
            <li>Use ping markers to communicate</li>
            <li>Watch for hazards like lasers</li>
          </ul>
        </div>
      </div>
      <div class="help-screen__footer">
        <span class="help-hint">Press <kbd>H</kbd> to toggle this help</span>
      </div>
    </div>
  `;
  container.appendChild(overlay);

  const closeBtn = overlay.querySelector('#help-close') as HTMLButtonElement;
  closeBtn.addEventListener('click', hide);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hide();
    }
  });

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'h' || e.key === 'H') {
      toggle();
    }
    if (e.key === 'Escape' && overlay.style.display !== 'none') {
      hide();
    }
  }
  window.addEventListener('keydown', handleKeyDown);

  function show(): void {
    overlay.style.display = 'flex';
  }

  function hide(): void {
    overlay.style.display = 'none';
  }

  function toggle(): void {
    if (overlay.style.display === 'none') {
      show();
    } else {
      hide();
    }
  }

  function destroy(): void {
    window.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
  }

  return {
    show,
    hide,
    toggle,
    destroy,
  };
}
