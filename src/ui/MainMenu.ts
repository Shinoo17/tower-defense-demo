import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../config/difficulty';
import { saves } from '../systems/SaveSystem';
import { el } from '../utils/dom';

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

  constructor(parent: HTMLElement) {
    this.difficulty = saves.data.difficulty;
    this.root = el('div', 'screen main-menu hidden');
    parent.appendChild(this.root);

    const panel = el('div', 'menu-panel');
    panel.appendChild(el('h1', 'game-title', 'Skeleton&nbsp;Siege'));
    panel.appendChild(el('p', 'game-subtitle', 'A Tower Defense Demo'));

    const diffLabel = el('div', 'menu-label', 'Difficulty');
    panel.appendChild(diffLabel);
    const diffRow = el('div', 'diff-row');
    (Object.keys(DIFFICULTIES) as Difficulty[]).forEach((d) => {
      const b = el('button', 'diff-btn', DIFFICULTIES[d].label);
      b.addEventListener('click', () => this.setDifficulty(d));
      this.diffButtons.set(d, b);
      diffRow.appendChild(b);
    });
    panel.appendChild(diffRow);

    const btns = el('div', 'menu-buttons');
    this.continueBtn = el('button', 'menu-btn primary', 'Continue');
    this.continueBtn.addEventListener('click', () => this.onContinue());
    const play = el('button', 'menu-btn primary', 'Play Campaign');
    play.addEventListener('click', () => this.onPlayCampaign());
    this.endlessBtn = el('button', 'menu-btn', 'Endless Mode');
    this.endlessBtn.addEventListener('click', () => this.onEndless());
    const settings = el('button', 'menu-btn', 'Settings');
    settings.addEventListener('click', () => this.onSettings());
    btns.append(this.continueBtn, play, this.endlessBtn, settings);
    panel.appendChild(btns);

    panel.appendChild(
      el('p', 'menu-credits', 'Assets: Kenney Tower Defense Kit &amp; KayKit Skeletons (CC0)')
    );
    this.root.appendChild(panel);
    this.setDifficulty(this.difficulty);
  }

  private setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    saves.data.difficulty = d;
    saves.save();
    for (const [k, b] of this.diffButtons) b.classList.toggle('active', k === d);
  }

  show(): void {
    // continue visible if progress beyond level 1
    const hasProgress = saves.data.highestUnlocked > 1;
    this.continueBtn.classList.toggle('hidden', !hasProgress);
    this.endlessBtn.disabled = !saves.data.endlessUnlocked;
    this.endlessBtn.title = saves.data.endlessUnlocked ? '' : 'Complete Level 5 to unlock';
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
