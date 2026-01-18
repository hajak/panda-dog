/* ============================================
   PANDA & DOG - Main Entry Point
   ============================================ */

import { createLobby, type LobbyUI } from './ui/Lobby';
import { createPuzzleHUD } from './ui/PuzzleHUD';
import { createTouchControls, isMobileDevice } from './ui/TouchControls';
import { createDebugOverlay } from './ui/DebugOverlay';
import { createLevelCompleteModal } from './ui/LevelCompleteModal';
import { createHelpScreen } from './ui/HelpScreen';
import { networkClient } from './net/NetworkClient';

let lobby: LobbyUI | null = null;
let errorToast: HTMLElement | null = null;

async function main(): Promise<void> {
  const uiOverlay = document.getElementById('ui-overlay');
  if (!uiOverlay) {
    throw new Error('UI overlay element not found');
  }

  // Check for join code in URL
  const urlParams = new URLSearchParams(window.location.search);
  const joinCode = urlParams.get('join');

  // Create error toast container
  errorToast = document.createElement('div');
  errorToast.className = 'error-toast error-toast--hidden';
  document.body.appendChild(errorToast);

  // Start with lobby screen
  showLobby(uiOverlay, joinCode);
}

function showLobby(container: HTMLElement, joinCode: string | null = null): void {
  // Hide canvas during lobby
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.style.display = 'none';
  }

  lobby = createLobby(container, {
    onGameStart: () => {
      if (lobby) {
        lobby.destroy();
        lobby = null;
      }
      startGame(container);
    },
    onError: (message) => {
      showError(message);
    },
  });

  // If there's a join code in URL, trigger join after a brief delay
  if (joinCode) {
    setTimeout(() => {
      const input = document.getElementById('input-code') as HTMLInputElement;
      const btnJoin = document.getElementById('btn-join') as HTMLButtonElement;
      if (input && btnJoin) {
        input.value = joinCode;
        btnJoin.click();
      }
    }, 100);
  }
}

async function startGame(container: HTMLElement): Promise<void> {
  // Show canvas
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.style.display = 'block';
  }

  // Clear any lobby content
  container.innerHTML = '';

  // Show loading state
  showLoading(container);

  try {
    // Dynamic import to reduce initial bundle size
    const { GameApplication } = await import('./engine/Application');
    const { MultiplayerScene } = await import('./game/MultiplayerScene');

    // Initialize PixiJS application
    const app = new GameApplication();
    await app.init(canvas);

    // Create multiplayer scene
    const scene = new MultiplayerScene(app);
    await scene.init();

    // Hide loading
    hideLoading(container);

    // Detect mobile
    const isMobile = isMobileDevice();

    // Create simple HUD for multiplayer
    const hud = createMultiplayerHUD(scene.getLocalRole(), isMobile);
    container.appendChild(hud);

    // Create puzzle HUD (only on desktop - mobile doesn't need it cluttering the screen)
    const puzzleHud = isMobile ? null : createPuzzleHUD(container);

    // Create touch controls for mobile (Panda player)
    const touchControls = isMobile ? createTouchControls(container) : null;

    // Connect touch controls to the input system
    if (touchControls) {
      scene.getInput().setTouchProvider(touchControls);
    }

    // Set higher zoom for mobile (Panda has limited visibility and needs Dog's guidance)
    if (isMobile) {
      scene.setMobileZoom(2.5);
    }

    // Create debug overlay (dev only, toggle with ` or F3)
    const debugOverlay = import.meta.env.DEV ? createDebugOverlay(container) : null;

    // Create level complete modal
    const levelCompleteModal = createLevelCompleteModal(container);

    // Create help screen
    const helpScreen = createHelpScreen(container, scene.getLocalRole());

    // Connect mobile help button to help screen
    if (isMobile) {
      const helpBtn = document.getElementById('help-button-mobile');
      if (helpBtn) {
        helpBtn.addEventListener('click', () => helpScreen.toggle());
      }
    }

    // Listen for level complete event
    networkClient.on('level_complete', (event) => {
      const data = event.data as { puzzlesCompleted: number; totalPuzzles: number; timeElapsed: number };
      levelCompleteModal.show(data);
    });

    // Update puzzle HUD and debug overlay periodically
    const updateInterval = setInterval(() => {
      if (puzzleHud) {
        puzzleHud.update(scene.getPuzzleStates());
      }
      if (debugOverlay) {
        debugOverlay.update(scene);
      }
    }, 100);

    // Handle window resize
    window.addEventListener('resize', () => {
      handleResize(canvas);
    });
    handleResize(canvas);

    // Expose for debugging
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).game = {
        app,
        scene,
        puzzleHud,
        touchControls,
        debugOverlay,
        helpScreen,
        clearUpdateInterval: () => clearInterval(updateInterval),
      };
    }

    console.log('Panda & Dog initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    showError(error instanceof Error ? error.message : 'Unknown error');
  }
}

function createMultiplayerHUD(role: string | null, isMobile: boolean): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'hud';

  // On mobile, show a simple help button instead of keyboard hint
  // Also hide the role badge on mobile (takes up valuable space)
  if (isMobile) {
    hud.innerHTML = `
      <div class="hud__stats hud__stats--mobile">
        <button class="help-button-mobile" id="help-button-mobile">?</button>
      </div>
      <div class="hud__prompts">
        <div id="interaction-prompt" class="interaction-prompt"></div>
      </div>
    `;
  } else {
    hud.innerHTML = `
      <div class="hud__stats">
        <div class="player-role-badge ${role || 'unknown'}">
          <span class="player-role-badge__icon">${role === 'dog' ? '🐕' : role === 'panda' ? '🐼' : '?'}</span>
          <span class="player-role-badge__label">${role ? role.toUpperCase() : 'Unknown'}</span>
        </div>
        <div class="help-hint-badge">Press <kbd>H</kbd> for help</div>
      </div>
      <div class="hud__prompts">
        <div id="interaction-prompt" class="interaction-prompt"></div>
      </div>
    `;
  }
  return hud;
}

function showLoading(container: HTMLElement): void {
  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.id = 'loading-screen';
  loading.innerHTML = `
    <div class="loading__spinner"></div>
    <div class="loading__text">Loading</div>
  `;
  container.appendChild(loading);
}

function hideLoading(_container: HTMLElement): void {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.opacity = '0';
    loading.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      loading.remove();
    }, 300);
  }
}

function showError(message: string): void {
  if (!errorToast) return;

  errorToast.textContent = message;
  errorToast.classList.remove('error-toast--hidden');

  setTimeout(() => {
    if (errorToast) {
      errorToast.classList.add('error-toast--hidden');
    }
  }, 4000);
}

function handleResize(canvas: HTMLCanvasElement): void {
  const container = document.getElementById('app');
  if (!container) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const targetWidth = 1280;
  const targetHeight = 720;
  const scale = Math.min(
    containerWidth / targetWidth,
    containerHeight / targetHeight
  );

  canvas.style.width = `${targetWidth * scale}px`;
  canvas.style.height = `${targetHeight * scale}px`;
}

// Start the application
main();
