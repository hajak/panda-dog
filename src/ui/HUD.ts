/* ============================================
   SHADOW NINJA - HUD Component
   ============================================ */

function createHelpPanel(): void {
  // Check if already exists
  if (document.getElementById('help-panel')) return;

  const helpPanel = document.createElement('div');
  helpPanel.className = 'help-panel';
  helpPanel.id = 'help-panel';
  helpPanel.innerHTML = `
    <div class="panel">
      <div class="panel__header">
        <span class="panel__title">Controls</span>
        <span class="help-panel__close">[H] Close</span>
      </div>
      <div class="panel__body">
        <div class="help-section">
          <h4 class="help-section__title">Movement</h4>
          <div class="help-row"><span class="help-key">WASD</span><span>Move</span></div>
          <div class="help-row"><span class="help-key">Shift</span><span>Run (drains stamina)</span></div>
          <div class="help-row"><span class="help-key">Space</span><span>Jump / Climb</span></div>
        </div>
        <div class="help-section">
          <h4 class="help-section__title">Combat</h4>
          <div class="help-row"><span class="help-key">J</span><span>Attack (combo)</span></div>
          <div class="help-row"><span class="help-key">K</span><span>Block (hold for parry)</span></div>
          <div class="help-row"><span class="help-key">L</span><span>Throw shuriken</span></div>
        </div>
        <div class="help-section">
          <h4 class="help-section__title">Other</h4>
          <div class="help-row"><span class="help-key">E</span><span>Interact</span></div>
          <div class="help-row"><span class="help-key">1-3</span><span>Select item slot</span></div>
          <div class="help-row"><span class="help-key">Esc</span><span>Pause</span></div>
        </div>
        <div class="help-section">
          <h4 class="help-section__title">Debug</h4>
          <div class="help-row"><span class="help-key">§</span><span>Toggle debug view</span></div>
          <div class="help-row"><span class="help-key">V</span><span>Toggle vision cones</span></div>
          <div class="help-row"><span class="help-key">G</span><span>Toggle grid</span></div>
        </div>
      </div>
    </div>
  `;

  // Append directly to body for proper z-index stacking above debug mode
  document.body.appendChild(helpPanel);
}

export function createHUD(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'hud';

  container.innerHTML = `
    <!-- Stats (top-left) -->
    <div class="hud__stats">
      <!-- Health Bar -->
      <div class="stat-bar">
        <div class="stat-bar__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 14s-6-4.35-6-8.5C2 3.02 4.02 1 6.5 1 7.4 1 8 1.5 8 1.5S8.6 1 9.5 1C11.98 1 14 3.02 14 5.5 14 9.65 8 14 8 14z" fill="#ef4444"/>
          </svg>
        </div>
        <div class="stat-bar__track">
          <div class="stat-bar__fill stat-bar__fill--health" style="width: 100%"></div>
        </div>
        <span class="stat-bar__value">100</span>
      </div>

      <!-- Stamina Bar -->
      <div class="stat-bar">
        <div class="stat-bar__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6H14L10.5 9L12 14L8 11L4 14L5.5 9L2 6H6.5L8 1Z" fill="#14b8a6"/>
          </svg>
        </div>
        <div class="stat-bar__track">
          <div class="stat-bar__fill stat-bar__fill--stamina" style="width: 100%"></div>
        </div>
      </div>

      <!-- Ammo Counter -->
      <div class="ammo-counter">
        <span class="ammo-counter__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 0L10 6L8 4L6 6L8 0Z M16 8L10 10L12 8L10 6L16 8Z M8 16L6 10L8 12L10 10L8 16Z M0 8L6 6L4 8L6 10L0 8Z" fill="#94a3b8"/>
          </svg>
        </span>
        <span class="ammo-counter__value">5</span>
      </div>

      <!-- Status Indicators -->
      <div class="status-indicators">
        <div class="status-badge status-badge--hidden" id="status-hidden" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1C4 1 1.5 3.5 1 7c.5 3.5 3 6 6 6s5.5-2.5 6-6c-.5-3.5-3-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="currentColor"/>
            <circle cx="7" cy="7" r="2" fill="currentColor"/>
            <path d="M1 1l12 12" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span>Hidden</span>
        </div>
        <div class="status-badge status-badge--climb" id="status-climb" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M4 4l3-3 3 3M4 10l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Climbing</span>
        </div>
        <div class="status-badge status-badge--alert" id="status-alert" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L1 13h12L7 1z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M7 5v4M7 11v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Alert!</span>
        </div>
      </div>
    </div>

    <!-- Context Prompts (bottom-left) -->
    <div class="hud__prompts">
      <div class="prompt prompt--visible" id="prompt-move">
        <span class="prompt__key">WASD</span>
        <span class="prompt__label">Move</span>
      </div>
      <div class="prompt" id="prompt-interact">
        <span class="prompt__key">E</span>
        <span class="prompt__label">Interact</span>
      </div>
      <div class="prompt" id="prompt-climb">
        <span class="prompt__key">Space</span>
        <span class="prompt__label">Climb</span>
      </div>
      <div class="prompt prompt--visible" id="prompt-jump">
        <span class="prompt__key">Space</span>
        <span class="prompt__label">Jump</span>
      </div>
      <div class="prompt prompt--visible" id="prompt-run">
        <span class="prompt__key">Shift</span>
        <span class="prompt__label">Run</span>
      </div>
      <div class="prompt prompt--visible" id="prompt-attack">
        <span class="prompt__key">J</span>
        <span class="prompt__label">Attack</span>
      </div>
      <div class="prompt prompt--visible" id="prompt-block">
        <span class="prompt__key">K</span>
        <span class="prompt__label">Block</span>
      </div>
    </div>

    <!-- Quick Inventory (bottom-right) -->
    <div class="hud__inventory">
      <div class="quick-inventory">
        <div class="inventory-slot inventory-slot--active" data-slot="0">
          <span class="inventory-slot__hotkey">1</span>
          <span class="inventory-slot__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14 10L12 8L10 10L12 2Z M22 12L14 14L16 12L14 10L22 12Z M12 22L10 14L12 16L14 14L12 22Z M2 12L10 10L8 12L10 14L2 12Z" fill="#94a3b8"/>
            </svg>
          </span>
          <span class="inventory-slot__count">5</span>
        </div>
        <div class="inventory-slot inventory-slot--empty" data-slot="1">
          <span class="inventory-slot__hotkey">2</span>
          <span class="inventory-slot__icon"></span>
        </div>
        <div class="inventory-slot inventory-slot--empty" data-slot="2">
          <span class="inventory-slot__hotkey">3</span>
          <span class="inventory-slot__icon"></span>
        </div>
      </div>
    </div>

    <!-- Debug Panel -->
    <div class="debug-panel" style="display: none;">
      <div class="debug-panel__row"><span class="debug-panel__label">FPS:</span> 60</div>
      <div class="debug-panel__row"><span class="debug-panel__label">Pos:</span> 0, 0</div>
    </div>

    <!-- Press H for Help hint -->
    <div class="help-hint" id="help-hint">Press [H] for controls</div>
  `;

  // Create help panel separately and append to body for proper z-index stacking
  createHelpPanel();


  return container;
}

export function showPrompt(id: string): void {
  const prompt = document.getElementById(id);
  if (prompt) {
    prompt.classList.add('prompt--visible');
  }
}

export function hidePrompt(id: string): void {
  const prompt = document.getElementById(id);
  if (prompt) {
    prompt.classList.remove('prompt--visible');
  }
}

export function showStatus(id: string): void {
  const status = document.getElementById(id);
  if (status) {
    status.style.display = 'flex';
  }
}

export function hideStatus(id: string): void {
  const status = document.getElementById(id);
  if (status) {
    status.style.display = 'none';
  }
}

export function updateInventorySlot(slot: number, itemType: string | null, count: number): void {
  const slotElement = document.querySelector(`[data-slot="${slot}"]`);
  if (!slotElement) return;

  if (itemType) {
    slotElement.classList.remove('inventory-slot--empty');
    const countElement = slotElement.querySelector('.inventory-slot__count');
    if (countElement) {
      countElement.textContent = count.toString();
    }
  } else {
    slotElement.classList.add('inventory-slot--empty');
  }
}

export function setActiveSlot(slot: number): void {
  document.querySelectorAll('.inventory-slot').forEach((el, index) => {
    el.classList.toggle('inventory-slot--active', index === slot);
  });
}
