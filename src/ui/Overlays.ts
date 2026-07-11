import { el, fmtTime } from '../utils/dom';
import { saves } from '../systems/SaveSystem';
import { DIFFICULTIES } from '../config/difficulty';

/** Pause menu, win/lose screens, campaign completion, endless results, settings. */
export class Overlays {
  readonly root: HTMLElement;
  onResume: () => void = () => {};
  onRestart: () => void = () => {};
  onMainMenu: () => void = () => {};
  onNextLevel: () => void = () => {};
  onReplayCampaign: () => void = () => {};
  onSelectLevel: () => void = () => {};
  onPlayEndless: () => void = () => {};
  onReplayEndless: () => void = () => {};
  onShadowsChanged: (on: boolean) => void = () => {};
  private current: HTMLElement | null = null;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'overlay-root');
    parent.appendChild(this.root);
  }

  private open(className: string, html: string): HTMLElement {
    this.closeAll();
    const box = el('div', 'overlay ' + className);
    box.innerHTML = html;
    this.root.appendChild(box);
    this.current = box;
    return box;
  }

  closeAll(): void {
    this.root.innerHTML = '';
    this.current = null;
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  showPause(): void {
    const box = this.open(
      'pause-menu',
      `
      <div class="overlay-panel">
        <h2>Paused</h2>
        <button class="menu-btn primary" data-a="resume">Resume</button>
        <button class="menu-btn" data-a="restart">Restart Level</button>
        <button class="menu-btn" data-a="settings">Settings</button>
        <button class="menu-btn" data-a="menu">Main Menu</button>
      </div>`
    );
    box.querySelector('[data-a=resume]')!.addEventListener('click', () => this.onResume());
    box.querySelector('[data-a=restart]')!.addEventListener('click', () => this.onRestart());
    box.querySelector('[data-a=settings]')!.addEventListener('click', () => this.showSettings(true));
    box.querySelector('[data-a=menu]')!.addEventListener('click', () => this.onMainMenu());
  }

  showSettings(fromPause: boolean): void {
    const shadows = saves.data.settings.shadows;
    const box = this.open(
      'settings-menu',
      `
      <div class="overlay-panel">
        <h2>Settings</h2>
        <label class="setting-row">
          <span>Shadows</span>
          <input type="checkbox" id="set-shadows" ${shadows ? 'checked' : ''}>
        </label>
        <label class="setting-row">
          <span>Reset all progress</span>
          <button class="menu-btn danger small" id="set-reset">Reset</button>
        </label>
        <button class="menu-btn primary" data-a="back">Back</button>
      </div>`
    );
    box.querySelector('#set-shadows')!.addEventListener('change', (e) => {
      this.onShadowsChanged((e.target as HTMLInputElement).checked);
    });
    box.querySelector('#set-reset')!.addEventListener('click', () => {
      if (confirm('Reset all campaign progress and best scores?')) {
        saves.resetProgress();
      }
    });
    box.querySelector('[data-a=back]')!.addEventListener('click', () => {
      if (fromPause) this.showPause();
      else this.closeAll();
    });
  }

  showWin(stats: { livesLeft: number; reward: number; levelId: number }): void {
    const box = this.open(
      'win-screen',
      `
      <div class="overlay-panel">
        <h2 class="win-title">Level Complete!</h2>
        <p>You kept <b>${stats.livesLeft}</b> lives — bonus 🪙${stats.reward}</p>
        <button class="menu-btn primary" data-a="next">Next Level</button>
        <button class="menu-btn" data-a="restart">Replay Level</button>
        <button class="menu-btn" data-a="menu">Main Menu</button>
      </div>`
    );
    box.querySelector('[data-a=next]')!.addEventListener('click', () => this.onNextLevel());
    box.querySelector('[data-a=restart]')!.addEventListener('click', () => this.onRestart());
    box.querySelector('[data-a=menu]')!.addEventListener('click', () => this.onMainMenu());
  }

  showLose(): void {
    const box = this.open(
      'lose-screen',
      `
      <div class="overlay-panel">
        <h2 class="lose-title">Defeat</h2>
        <p>The skeletons overran your base.</p>
        <button class="menu-btn primary" data-a="restart">Try Again</button>
        <button class="menu-btn" data-a="menu">Main Menu</button>
      </div>`
    );
    box.querySelector('[data-a=restart]')!.addEventListener('click', () => this.onRestart());
    box.querySelector('[data-a=menu]')!.addEventListener('click', () => this.onMainMenu());
  }

  showCampaignComplete(): void {
    const s = saves.data.stats;
    const diff = DIFFICULTIES[saves.data.difficulty].label;
    const box = this.open(
      'campaign-complete',
      `
      <div class="overlay-panel complete-panel">
        <h1 class="complete-title">CAMPAIGN COMPLETE</h1>
        <p class="complete-text">Thank you for playing our Tower Defense demo.</p>
        <p class="complete-text">You defended every path, upgraded your towers, and defeated the Skeleton Army.</p>
        <div class="complete-stats">
          <div><span>Difficulty</span><b>${diff}</b></div>
          <div><span>Enemies defeated</span><b>${s.kills}</b></div>
          <div><span>Coins earned</span><b>${s.coins}</b></div>
          <div><span>Towers built</span><b>${s.towers}</b></div>
          <div><span>Play time</span><b>${fmtTime(s.playMs)}</b></div>
        </div>
        <div class="complete-buttons">
          <button class="menu-btn primary" data-a="replay">Replay Campaign</button>
          <button class="menu-btn" data-a="select">Select Level</button>
          <button class="menu-btn" data-a="endless">Play Endless Mode</button>
          <button class="menu-btn" data-a="menu">Main Menu</button>
        </div>
      </div>`
    );
    box.querySelector('[data-a=replay]')!.addEventListener('click', () => this.onReplayCampaign());
    box.querySelector('[data-a=select]')!.addEventListener('click', () => this.onSelectLevel());
    box.querySelector('[data-a=endless]')!.addEventListener('click', () => this.onPlayEndless());
    box.querySelector('[data-a=menu]')!.addEventListener('click', () => this.onMainMenu());
  }

  showEndlessOver(stats: { wave: number; kills: number; coins: number; towers: number; best: number }): void {
    const isRecord = stats.wave >= stats.best && stats.wave > 0;
    const box = this.open(
      'endless-over',
      `
      <div class="overlay-panel">
        <h2>Endless Run Over</h2>
        ${isRecord ? '<p class="new-record">🏆 New best!</p>' : ''}
        <div class="complete-stats">
          <div><span>Reached wave</span><b>${stats.wave}</b></div>
          <div><span>Best wave</span><b>${stats.best}</b></div>
          <div><span>Enemies defeated</span><b>${stats.kills}</b></div>
          <div><span>Coins earned</span><b>${stats.coins}</b></div>
          <div><span>Towers built</span><b>${stats.towers}</b></div>
        </div>
        <button class="menu-btn primary" data-a="replay">Replay Endless</button>
        <button class="menu-btn" data-a="menu">Main Menu</button>
      </div>`
    );
    box.querySelector('[data-a=replay]')!.addEventListener('click', () => this.onReplayEndless());
    box.querySelector('[data-a=menu]')!.addEventListener('click', () => this.onMainMenu());
  }

  showLevelIntro(name: string, intro: string, onStart: () => void): void {
    const box = this.open(
      'level-intro',
      `
      <div class="overlay-panel intro-panel">
        <h2>${name}</h2>
        <p>${intro}</p>
        <button class="menu-btn primary" data-a="go">Defend!</button>
      </div>`
    );
    box.querySelector('[data-a=go]')!.addEventListener('click', () => {
      this.closeAll();
      onStart();
    });
  }
}
