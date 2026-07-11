import type { Difficulty } from '../types';
import { LEVELS } from '../config/levels';
import { saves } from '../systems/SaveSystem';
import { el } from '../utils/dom';

export class LevelSelect {
  readonly root: HTMLElement;
  /** endless=true → picking a map for endless mode */
  endlessMode = false;
  onPick: (levelId: number, endless: boolean) => void = () => {};
  onBack: () => void = () => {};
  private grid: HTMLElement;
  private title: HTMLElement;
  private getDifficulty: () => Difficulty;

  constructor(parent: HTMLElement, getDifficulty: () => Difficulty) {
    this.getDifficulty = getDifficulty;
    this.root = el('div', 'screen level-select hidden');
    parent.appendChild(this.root);
    const panel = el('div', 'select-panel');
    this.title = el('h2', 'select-title', 'Select Level');
    panel.appendChild(this.title);
    this.grid = el('div', 'level-grid');
    panel.appendChild(this.grid);
    const back = el('button', 'menu-btn back-btn', 'Back');
    back.addEventListener('click', () => this.onBack());
    panel.appendChild(back);
    this.root.appendChild(panel);
  }

  show(endless: boolean): void {
    this.endlessMode = endless;
    this.title.textContent = endless ? 'Endless Mode: Choose a Map' : 'Select Level';
    this.rebuild();
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  private rebuild(): void {
    this.grid.innerHTML = '';
    const diff = this.getDifficulty();
    for (const lvl of LEVELS) {
      const result = saves.levelResult(lvl.id, diff);
      const completedAny = ['easy', 'normal', 'hard'].some(
        (d) => saves.levelResult(lvl.id, d as Difficulty)?.completed
      );
      const unlocked = this.endlessMode ? completedAny : lvl.id <= saves.data.highestUnlocked;
      const card = el('div', 'level-card' + (unlocked ? '' : ' locked') + ` theme-${lvl.theme}`);
      const badge = result?.completed ? '<span class="badge done">✓</span>' : '';
      const bestLine = result?.completed
        ? `<div class="level-best">Best: ${result.bestLives} lives kept (${diff})</div>`
        : `<div class="level-best">${unlocked ? 'Not completed on ' + diff : ''}</div>`;
      const endlessBest = this.endlessMode ? saves.endlessBestFor(lvl.id, diff) : 0;
      const endlessLine = this.endlessMode
        ? `<div class="level-best">Best wave: ${endlessBest > 0 ? endlessBest : 'None'}</div>`
        : '';
      card.innerHTML = `
        <div class="level-num">${lvl.id}${badge}</div>
        <div class="level-name">${lvl.name}</div>
        <div class="level-meta">
          <span class="chip">${lvl.theme === 'snow' ? 'Snow' : 'Grass'}</span>
          <span class="chip">${this.endlessMode ? 'Unlimited waves' : lvl.waves.length + ' waves'}</span>
          <span class="chip">${lvl.paths.length} ${lvl.paths.length > 1 ? 'routes' : 'route'}</span>
        </div>
        ${this.endlessMode ? endlessLine : bestLine}
        ${unlocked ? '' : '<div class="lock">Locked: ' + (this.endlessMode ? 'complete this level first' : 'complete previous level') + '</div>'}
      `;
      if (unlocked) {
        card.addEventListener('click', () => this.onPick(lvl.id, this.endlessMode));
      }
      this.grid.appendChild(card);
    }
  }
}
