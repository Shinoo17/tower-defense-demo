import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../config/difficulty';
import { saves } from '../systems/SaveSystem';
import { el } from '../utils/dom';

const DIFFICULTY_COPY: Record<Difficulty, { description: string; recommended: string }> = {
  easy: { description: 'A generous economy with gentler skeletons.', recommended: 'New defenders' },
  normal: { description: 'The intended balance of pressure and rewards.', recommended: 'Most players' },
  hard: { description: 'Tighter resources and faster, tougher enemies.', recommended: 'Veteran strategists' },
};

export class MainMenu {
  readonly root: HTMLElement;
  difficulty: Difficulty;
  onPlayCampaign: () => void = () => {};
  onEndless: () => void = () => {};
  onContinue: () => void = () => {};
  onSettings: () => void = () => {};
  private diffButtons = new Map<Difficulty, HTMLButtonElement>();
  private endlessBtn: HTMLButtonElement;
  private continueBtn: HTMLButtonElement;
  private mainView: HTMLElement;
  private difficultyView: HTMLElement;
  private credits: HTMLElement;

  constructor(parent: HTMLElement) {
    this.difficulty = saves.data.difficulty;
    this.root = el('div', 'screen main-menu hidden');
    parent.appendChild(this.root);

    const layout = el('div', 'menu-layout');
    const panel = el('main', 'menu-panel');
    panel.appendChild(el('div', 'menu-kicker', 'Hold the line'));
    panel.appendChild(el('h1', 'game-title', 'Skeleton Siege'));
    panel.appendChild(el('p', 'game-subtitle', 'Build wisely. Defend every road.'));

    this.mainView = el('div', 'menu-view menu-main-view');
    const btns = el('div', 'menu-buttons');
    this.continueBtn = el('button', 'menu-btn primary continue-btn', 'Continue');
    this.continueBtn.addEventListener('click', () => this.onContinue());
    const play = el('button', 'menu-btn primary', 'Play');
    play.addEventListener('click', () => this.showDifficulty());
    const levels = el('button', 'menu-btn', 'Level Select');
    levels.addEventListener('click', () => this.showDifficulty());
    this.endlessBtn = el('button', 'menu-btn', 'Endless Mode');
    this.endlessBtn.addEventListener('click', () => this.onEndless());
    const settings = el('button', 'menu-btn', 'Settings');
    settings.addEventListener('click', () => this.onSettings());
    const creditsBtn = el('button', 'menu-btn quiet', 'Credits');
    creditsBtn.addEventListener('click', () => this.credits.classList.toggle('hidden'));
    btns.append(this.continueBtn, play, levels, this.endlessBtn, settings, creditsBtn);
    this.mainView.appendChild(btns);

    this.credits = el(
      'p',
      'menu-credits hidden',
      'Game environment by Kenney and skeleton characters by KayKit. Both asset packs are CC0.'
    );
    this.mainView.appendChild(this.credits);
    panel.appendChild(this.mainView);

    this.difficultyView = el('section', 'menu-view difficulty-view hidden');
    this.difficultyView.appendChild(el('h2', 'difficulty-title', 'Choose your challenge'));
    this.difficultyView.appendChild(el('p', 'difficulty-intro', 'You can change difficulty before any campaign run.'));
    const diffRow = el('div', 'diff-row');
    (Object.keys(DIFFICULTIES) as Difficulty[]).forEach((difficulty) => {
      const def = DIFFICULTIES[difficulty];
      const copy = DIFFICULTY_COPY[difficulty];
      const button = el('button', 'diff-btn');
      button.innerHTML = `
        <span class="diff-name">${def.label}</span>
        <span class="diff-description">${copy.description}</span>
        <span class="diff-stats">
          <span><b>${def.startCoins}</b> starting coins</span>
          <span><b>${def.enemyHp.toFixed(2)}x</b> enemy health</span>
          <span><b>${def.enemySpeed.toFixed(2)}x</b> enemy speed</span>
          <span><b>${def.enemyReward.toFixed(2)}x</b> rewards</span>
        </span>
        <span class="diff-recommend">Recommended for ${copy.recommended.toLowerCase()}</span>
      `;
      button.addEventListener('click', () => this.setDifficulty(difficulty));
      this.diffButtons.set(difficulty, button);
      diffRow.appendChild(button);
    });
    this.difficultyView.appendChild(diffRow);
    const difficultyActions = el('div', 'difficulty-actions');
    const back = el('button', 'menu-btn quiet', 'Back');
    back.addEventListener('click', () => this.showMain());
    const confirm = el('button', 'menu-btn primary', 'Select Levels');
    confirm.addEventListener('click', () => this.onPlayCampaign());
    difficultyActions.append(back, confirm);
    this.difficultyView.appendChild(difficultyActions);
    panel.appendChild(this.difficultyView);

    layout.appendChild(panel);
    this.root.appendChild(layout);
    this.setDifficulty(this.difficulty);
  }

  private setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    saves.data.difficulty = difficulty;
    saves.save();
    for (const [key, button] of this.diffButtons) {
      const selected = key === difficulty;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  private showDifficulty(): void {
    this.mainView.classList.add('hidden');
    this.difficultyView.classList.remove('hidden');
    this.root.classList.add('choosing-difficulty');
  }

  private showMain(): void {
    this.difficultyView.classList.add('hidden');
    this.mainView.classList.remove('hidden');
    this.root.classList.remove('choosing-difficulty');
  }

  show(): void {
    const hasProgress = saves.data.highestUnlocked > 1;
    this.continueBtn.classList.toggle('hidden', !hasProgress);
    this.endlessBtn.disabled = !saves.data.endlessUnlocked;
    this.endlessBtn.title = saves.data.endlessUnlocked ? '' : 'Complete Level 5 to unlock';
    this.showMain();
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
