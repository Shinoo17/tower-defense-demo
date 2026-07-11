import { saves } from '../systems/SaveSystem';
import { el } from '../utils/dom';

interface Step {
  id: string;
  text: string;
}

const STEPS: Step[] = [
  { id: 'build-pad', text: 'Round stone pads are build spots. Pick the Archer Tower from the bottom-left panel.' },
  { id: 'place', text: 'Now click a glowing pad near the road to place your Archer Tower.' },
  { id: 'range', text: 'The white ring shows tower range. Click a tower any time to inspect or upgrade it.' },
  { id: 'start', text: 'Ready? Press Start Wave (bottom-right). Starting early grants bonus coins!' },
  { id: 'upgrade', text: 'Waves cleared! Select a tower and use Upgrade to boost damage, range and speed.' },
  { id: 'sell', text: 'Misplaced a tower? The Sell button refunds part of its cost.' },
];

/** Lightweight contextual tutorial shown on Level 1 only. */
export class Tutorial {
  private box: HTMLElement;
  private textEl: HTMLElement;
  private stepIndex = -1;
  private active = false;
  private shownSell = false;

  constructor(parent: HTMLElement) {
    this.box = el('div', 'tutorial hidden');
    this.textEl = el('div', 'tutorial-text');
    const skip = el('button', 'tutorial-skip', 'Skip tutorial ✕');
    skip.addEventListener('click', () => this.skip());
    this.box.append(this.textEl, skip);
    parent.appendChild(this.box);
  }

  start(): void {
    if (saves.data.tutorialSkipped) return;
    this.active = true;
    this.showStep(0);
  }

  stop(): void {
    this.active = false;
    this.box.classList.add('hidden');
  }

  private skip(): void {
    saves.data.tutorialSkipped = true;
    saves.save();
    this.stop();
  }

  private showStep(i: number): void {
    if (!this.active || i >= STEPS.length) {
      this.stop();
      return;
    }
    this.stepIndex = i;
    this.textEl.textContent = STEPS[i].text;
    this.box.classList.remove('hidden');
  }

  private is(id: string): boolean {
    return this.active && STEPS[this.stepIndex]?.id === id;
  }

  // -------- event hooks called by UIManager
  onBuildModeSet(): void {
    if (this.is('build-pad')) this.showStep(1);
  }

  onTowerBuilt(): void {
    if (this.is('place') || this.is('build-pad')) this.showStep(2);
  }

  onWaveStarted(n: number): void {
    if (this.is('range') || this.is('start')) this.box.classList.add('hidden');
  }

  onWaveCompleted(n: number): void {
    if (!this.active) return;
    if (n >= 2 && this.stepIndex <= 4) this.showStep(4);
  }

  onTowerSelected(): void {
    if (this.is('range')) this.showStep(3);
    else if (this.is('upgrade') && !this.shownSell) {
      this.shownSell = true;
      this.showStep(5);
    } else if (this.is('sell')) {
      // done after seeing sell hint once more interaction happens
      setTimeout(() => this.stop(), 6000);
    }
  }
}
