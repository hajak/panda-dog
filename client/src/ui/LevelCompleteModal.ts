/**
 * Panda & Dog - Level Complete Modal
 * Shows when both players complete all puzzles
 */

export interface LevelCompleteData {
  puzzlesCompleted: number;
  totalPuzzles: number;
  timeElapsed: number;
}

export interface LevelCompleteModal {
  show(data: LevelCompleteData): void;
  hide(): void;
  destroy(): void;
}

export function createLevelCompleteModal(container: HTMLElement): LevelCompleteModal {
  const modal = document.createElement('div');
  modal.className = 'level-complete-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="level-complete-modal__content">
      <div class="level-complete-modal__icon">🏆</div>
      <div class="level-complete-modal__title">Level Complete!</div>
      <div class="level-complete-modal__subtitle">You and your partner solved all puzzles!</div>
      <div class="level-complete-modal__stats">
        <div class="level-complete-modal__stat">
          <div class="level-complete-modal__stat-value" id="complete-puzzles">0/0</div>
          <div class="level-complete-modal__stat-label">Puzzles</div>
        </div>
        <div class="level-complete-modal__stat">
          <div class="level-complete-modal__stat-value" id="complete-time">0:00</div>
          <div class="level-complete-modal__stat-label">Time</div>
        </div>
      </div>
      <button class="level-complete-modal__button" id="complete-continue">Continue</button>
    </div>
  `;
  container.appendChild(modal);

  const puzzlesEl = modal.querySelector('#complete-puzzles') as HTMLElement;
  const timeEl = modal.querySelector('#complete-time') as HTMLElement;
  const continueBtn = modal.querySelector('#complete-continue') as HTMLButtonElement;

  continueBtn.addEventListener('click', () => {
    hide();
    // Could trigger next level or return to menu
  });

  function formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  function show(data: LevelCompleteData): void {
    puzzlesEl.textContent = `${data.puzzlesCompleted}/${data.totalPuzzles}`;
    timeEl.textContent = formatTime(data.timeElapsed);
    modal.style.display = 'flex';
  }

  function hide(): void {
    modal.style.display = 'none';
  }

  function destroy(): void {
    modal.remove();
  }

  return {
    show,
    hide,
    destroy,
  };
}
