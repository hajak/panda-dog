/* ============================================
   SHADOW NINJA - Main Entry Point
   ============================================ */

import { GameApplication } from './engine/Application';
import { GameScene } from './game/GameScene';
import { createHUD } from './ui/HUD';
import { audioPlayer } from './engine/AudioPlayer';
import { musicPlayer } from './engine/MusicPlayer';

async function main(): Promise<void> {
  // Get canvas element
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  // Get UI overlay
  const uiOverlay = document.getElementById('ui-overlay');
  if (!uiOverlay) {
    throw new Error('UI overlay element not found');
  }

  // Show loading state
  showLoading(uiOverlay);

  try {
    // Initialize PixiJS application
    const app = new GameApplication();
    await app.init(canvas);

    // Create game scene
    const scene = new GameScene(app);
    await scene.init();

    // Create HUD
    const hud = createHUD();
    uiOverlay.appendChild(hud);

    // Hide loading
    hideLoading(uiOverlay);

    // Initialize audio on first user interaction (browser autoplay policy)
    const initAudio = () => {
      audioPlayer.init();
      musicPlayer.init();
      musicPlayer.play(); // Start background music
      document.removeEventListener('keydown', initAudio);
      document.removeEventListener('click', initAudio);
    };
    document.addEventListener('keydown', initAudio, { once: true });
    document.addEventListener('click', initAudio, { once: true });

    // Toggle music with M key
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        musicPlayer.toggle();
        console.log(`Music ${musicPlayer.isCurrentlyPlaying() ? 'ON' : 'OFF'}`);
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      handleResize(canvas);
    });
    handleResize(canvas);

    // Expose for debugging
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).game = { app, scene };
    }

    console.log('Shadow Ninja initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);
    showError(uiOverlay, error instanceof Error ? error.message : 'Unknown error');
  }
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

function showError(container: HTMLElement, message: string): void {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.remove();
  }

  const error = document.createElement('div');
  error.className = 'loading';
  error.innerHTML = `
    <div style="color: var(--color-danger); font-size: var(--font-size-lg); margin-bottom: var(--space-4);">
      Failed to load game
    </div>
    <div style="color: var(--color-text-muted); font-size: var(--font-size-sm);">
      ${message}
    </div>
  `;
  container.appendChild(error);
}

function handleResize(canvas: HTMLCanvasElement): void {
  const container = document.getElementById('app');
  if (!container) return;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate scale to fit while maintaining aspect ratio
  const targetWidth = 1280;
  const targetHeight = 720;
  const scale = Math.min(
    containerWidth / targetWidth,
    containerHeight / targetHeight
  );

  // Apply scale to canvas via CSS
  canvas.style.width = `${targetWidth * scale}px`;
  canvas.style.height = `${targetHeight * scale}px`;
}

// Start the game
main();
