/**
 * Panda & Dog - Puzzle HUD
 * Displays puzzle objectives and progress
 */

import type { PuzzleState } from '@shared/types';

export interface PuzzleHUD {
  update(puzzles: PuzzleState[]): void;
  showNotification(message: string, type: 'success' | 'info' | 'warning'): void;
  destroy(): void;
}

export function createPuzzleHUD(container: HTMLElement): PuzzleHUD {
  // Create puzzle panel
  const panel = document.createElement('div');
  panel.className = 'puzzle-panel';
  panel.innerHTML = `
    <div class="puzzle-panel__header">
      <span class="puzzle-panel__title">Objectives</span>
      <button class="puzzle-panel__toggle" aria-label="Toggle objectives">▼</button>
    </div>
    <div class="puzzle-panel__content">
      <div class="puzzle-panel__list"></div>
    </div>
  `;
  container.appendChild(panel);

  // Create notification container
  const notificationContainer = document.createElement('div');
  notificationContainer.className = 'notification-container';
  container.appendChild(notificationContainer);

  const listEl = panel.querySelector('.puzzle-panel__list') as HTMLElement;
  const contentEl = panel.querySelector('.puzzle-panel__content') as HTMLElement;
  const toggleBtn = panel.querySelector('.puzzle-panel__toggle') as HTMLButtonElement;

  let isCollapsed = false;

  toggleBtn.addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    contentEl.style.display = isCollapsed ? 'none' : 'block';
    toggleBtn.textContent = isCollapsed ? '▶' : '▼';
    panel.classList.toggle('puzzle-panel--collapsed', isCollapsed);
  });

  let previousPuzzles: PuzzleState[] = [];

  function update(puzzles: PuzzleState[]): void {
    // Check for newly completed puzzles
    for (const puzzle of puzzles) {
      const prev = previousPuzzles.find(p => p.id === puzzle.id);
      if (puzzle.completed && (!prev || !prev.completed)) {
        showNotification(`🎉 Puzzle Complete: ${puzzle.name}`, 'success');
      }

      // Check for newly completed objectives
      for (const obj of puzzle.objectives) {
        const prevObj = prev?.objectives.find(o => o.id === obj.id);
        if (obj.completed && (!prevObj || !prevObj.completed) && !puzzle.completed) {
          showNotification(`✓ ${obj.description}`, 'info');
        }
      }
    }

    previousPuzzles = puzzles.map(p => ({
      ...p,
      objectives: p.objectives.map(o => ({ ...o })),
    }));

    // Update display
    listEl.innerHTML = '';

    for (const puzzle of puzzles) {
      const puzzleEl = document.createElement('div');
      puzzleEl.className = `puzzle-item ${puzzle.completed ? 'puzzle-item--completed' : ''}`;

      const headerEl = document.createElement('div');
      headerEl.className = 'puzzle-item__header';
      headerEl.innerHTML = `
        <span class="puzzle-item__status">${puzzle.completed ? '✅' : '⏳'}</span>
        <span class="puzzle-item__name">${puzzle.name}</span>
      `;
      puzzleEl.appendChild(headerEl);

      if (!puzzle.completed) {
        const objectivesEl = document.createElement('ul');
        objectivesEl.className = 'puzzle-item__objectives';

        for (const obj of puzzle.objectives) {
          const objEl = document.createElement('li');
          objEl.className = `objective ${obj.completed ? 'objective--completed' : ''} ${obj.optional ? 'objective--optional' : ''}`;
          objEl.innerHTML = `
            <span class="objective__icon">${obj.completed ? '✓' : '○'}</span>
            <span class="objective__text">${obj.description}</span>
            ${obj.optional ? '<span class="objective__optional">(optional)</span>' : ''}
          `;
          objectivesEl.appendChild(objEl);
        }

        puzzleEl.appendChild(objectivesEl);
      }

      listEl.appendChild(puzzleEl);
    }

    // Show message if all puzzles complete
    const allComplete = puzzles.length > 0 && puzzles.every(p => p.completed);
    if (allComplete) {
      const completeEl = document.createElement('div');
      completeEl.className = 'puzzle-item puzzle-item--all-complete';
      completeEl.innerHTML = `
        <div class="puzzle-item__header">
          <span class="puzzle-item__status">🏆</span>
          <span class="puzzle-item__name">Level Complete!</span>
        </div>
      `;
      listEl.appendChild(completeEl);
    }
  }

  function showNotification(message: string, type: 'success' | 'info' | 'warning'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.textContent = message;
    notificationContainer.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.classList.add('notification--visible');
    });

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('notification--visible');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  function destroy(): void {
    panel.remove();
    notificationContainer.remove();
  }

  return {
    update,
    showNotification,
    destroy,
  };
}
