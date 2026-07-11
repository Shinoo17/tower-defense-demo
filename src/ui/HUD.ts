import type { TowerType, TargetPriority } from '../types';
import { TOWERS } from '../config/towers';
import { frostSlow } from '../config/towers';
import type { Game } from '../app/Game';
import type { Tower } from '../entities/Tower';
import { el } from '../utils/dom';

const ENEMY_ICONS: Record<string, string> = {
  basic: '💀',
  runner: '🏃',
  armored: '🛡',
  captain: '⭐',
  boss: '👑',
};

export class HUD {
  readonly root: HTMLElement;
  private game: Game;
  // cached values to avoid DOM churn
  private last = { coins: -1, lives: -1, wave: '', enemies: -1 };
  private coinsEl: HTMLElement;
  private livesEl: HTMLElement;
  private waveEl: HTMLElement;
  private enemiesEl: HTMLElement;
  private buildCards = new Map<TowerType, HTMLButtonElement>();
  private towerPanel: HTMLElement;
  private wavePanel: HTMLElement;
  private waveInfo: HTMLElement;
  private startBtn: HTMLButtonElement;
  private speedBtns: HTMLButtonElement[] = [];
  onPause: () => void = () => {};

  constructor(parent: HTMLElement, game: Game) {
    this.game = game;
    this.root = el('div', 'hud hidden');
    parent.appendChild(this.root);

    // ---- top bar
    const top = el('div', 'hud-top');
    this.coinsEl = el('div', 'hud-stat coins', '');
    this.livesEl = el('div', 'hud-stat lives', '');
    this.waveEl = el('div', 'hud-stat wave', '');
    this.enemiesEl = el('div', 'hud-stat enemies', '');
    const spacer = el('div', 'hud-spacer');
    const speed1 = el('button', 'hud-btn speed active', '1×');
    const speed2 = el('button', 'hud-btn speed', '2×');
    speed1.addEventListener('click', () => this.setSpeed(1));
    speed2.addEventListener('click', () => this.setSpeed(2));
    this.speedBtns = [speed1, speed2];
    const pauseBtn = el('button', 'hud-btn', '⏸ Pause');
    pauseBtn.addEventListener('click', () => this.onPause());
    top.append(this.coinsEl, this.livesEl, this.waveEl, this.enemiesEl, spacer, speed1, speed2, pauseBtn);
    this.root.appendChild(top);

    // ---- build panel (bottom-left)
    const build = el('div', 'build-panel');
    (Object.keys(TOWERS) as TowerType[]).forEach((t) => {
      const def = TOWERS[t];
      const c = el('button', 'build-card');
      c.style.setProperty('--tower-color', def.color);
      c.innerHTML = `
        <div class="bc-name">${def.name.replace(' Tower', '')}</div>
        <div class="bc-role">${def.role}</div>
        <div class="bc-cost">🪙 ${def.levels[0].cost}</div>
        <div class="bc-stats">dmg ${def.levels[0].damage} · rng ${def.levels[0].range} · ${def.levels[0].rate}/s</div>
      `;
      c.addEventListener('click', () => {
        const active = this.game.placement.buildMode === t;
        this.game.setBuildMode(active ? null : t);
      });
      this.buildCards.set(t, c);
      build.appendChild(c);
    });
    this.root.appendChild(build);

    // ---- selected tower panel (right)
    this.towerPanel = el('div', 'tower-panel hidden');
    this.root.appendChild(this.towerPanel);

    // ---- wave panel (bottom-right)
    this.wavePanel = el('div', 'wave-panel');
    this.waveInfo = el('div', 'wave-info');
    this.startBtn = el('button', 'start-wave-btn', 'Start Wave');
    this.startBtn.addEventListener('click', () => this.game.startWave());
    this.wavePanel.append(this.waveInfo, this.startBtn);
    this.root.appendChild(this.wavePanel);
  }

  private setSpeed(mult: 1 | 2): void {
    this.game.setSpeed(mult);
    this.speedBtns[0].classList.toggle('active', mult === 1);
    this.speedBtns[1].classList.toggle('active', mult === 2);
  }

  show(): void {
    this.root.classList.remove('hidden');
    this.setSpeed(1);
  }

  hide(): void {
    this.root.classList.add('hidden');
  }

  updateStats(): void {
    const st = this.game.state;
    if (!st) return;
    const ws = this.game.waveSys;
    if (st.coins !== this.last.coins) {
      this.coinsEl.textContent = `🪙 ${st.coins}`;
      this.last.coins = st.coins;
      this.refreshAffordability();
    }
    if (st.lives !== this.last.lives) {
      this.livesEl.textContent = `❤️ ${st.lives}`;
      this.last.lives = st.lives;
    }
    const total = ws.totalWaves === Infinity ? '∞' : String(ws.totalWaves);
    const waveTxt = `Wave ${Math.max(1, ws.currentWaveNumber)} / ${total}`;
    if (waveTxt !== this.last.wave) {
      this.waveEl.textContent = waveTxt;
      this.last.wave = waveTxt;
    }
    const enemies = this.game.enemySys.aliveCount + ws.remainingInWave;
    if (enemies !== this.last.enemies) {
      this.enemiesEl.textContent = `💀 ${enemies}`;
      this.last.enemies = enemies;
    }
  }

  private refreshAffordability(): void {
    const st = this.game.state;
    if (!st) return;
    for (const [t, card] of this.buildCards) {
      card.classList.toggle('unaffordable', st.coins < TOWERS[t].levels[0].cost);
    }
  }

  setBuildMode(type: TowerType | null): void {
    for (const [t, card] of this.buildCards) card.classList.toggle('active', t === type);
  }

  // ---------------------------------------------------------------- wave panel
  private lastWaveKey = '';

  updateWavePanel(): void {
    const ws = this.game.waveSys;
    if (ws.phase === 'active' || ws.phase === 'level-done') {
      if (this.lastWaveKey !== 'active') {
        this.lastWaveKey = 'active';
        this.waveInfo.innerHTML = '<div class="wave-title">Wave in progress…</div>';
        this.startBtn.classList.add('hidden');
      }
      return;
    }
    const preview = ws.preview();
    if (!preview) return;
    const bonus = ws.earlyBonus();
    const timer = ws.phase === 'prep' ? Math.ceil(ws.prepRemaining) : null;
    const key = `${ws.waveIndex}:${bonus}:${timer}`;
    if (key === this.lastWaveKey) return;
    this.lastWaveKey = key;

    const rows = preview.entries
      .map(
        (e) =>
          `<div class="wp-row${e.isBoss ? ' boss' : e.isElite ? ' elite' : ''}">
            <span>${ENEMY_ICONS[e.type] ?? '💀'} ${e.name}</span><span>× ${e.count}</span>
          </div>`
      )
      .join('');
    const bossWarn = preview.hasBoss ? '<div class="boss-warning">⚠ BOSS INCOMING</div>' : '';
    const timerTxt = timer !== null ? `<div class="wp-timer">Auto-start in ${timer}s</div>` : '';
    this.waveInfo.innerHTML = `
      <div class="wave-title">Next: Wave ${ws.waveIndex + 1}</div>
      ${bossWarn}${rows}${timerTxt}
    `;
    this.startBtn.classList.remove('hidden');
    this.startBtn.innerHTML = bonus > 0 ? `Start Wave <span class="bonus">+🪙${bonus}</span>` : 'Start Wave';
  }

  // ---------------------------------------------------------------- tower panel
  showTower(tower: Tower | null): void {
    if (!tower) {
      this.towerPanel.classList.add('hidden');
      return;
    }
    const def = tower.def;
    const s = tower.stats;
    const st = this.game.state;
    const up = tower.upgradeCost;
    const next = tower.level < 3 ? def.levels[tower.level] : null;
    const canAfford = up !== null && !!st && st.coins >= up;
    const refund = this.game.sellRefundFor(tower);
    const slowLine =
      def.type === 'frost'
        ? `<div class="tp-row"><span>Slow</span><span>${Math.round(frostSlow(tower.level).pct * 100)}% / ${frostSlow(tower.level).duration.toFixed(1)}s</span></div>`
        : '';

    const upgradeHtml = next
      ? `<button class="tp-upgrade${canAfford ? '' : ' unaffordable'}" id="tp-upgrade">
          Upgrade — 🪙${up}
          <span class="tp-preview">dmg ${s.damage} → ${next.damage} · rng ${s.range} → ${next.range} · ${s.rate} → ${next.rate}/s</span>
        </button>`
      : '<div class="tp-max">★ Max level</div>';

    this.towerPanel.innerHTML = `
      <div class="tp-head" style="--tower-color:${def.color}">
        <span class="tp-name">${def.name}</span>
        <span class="tp-level">Lv ${tower.level}</span>
      </div>
      <div class="tp-row"><span>Damage</span><span>${s.damage}${def.aoeRadius ? ' (area)' : ''}${def.kind === 'magic' ? ' ✨' : ''}</span></div>
      <div class="tp-row"><span>Range</span><span>${s.range}</span></div>
      <div class="tp-row"><span>Attack speed</span><span>${s.rate}/s</span></div>
      ${slowLine}
      <div class="tp-row"><span>Priority</span><span class="tp-priority">
        <button data-p="first" class="${tower.priority === 'first' ? 'active' : ''}">First</button>
        <button data-p="last" class="${tower.priority === 'last' ? 'active' : ''}">Last</button>
        <button data-p="strong" class="${tower.priority === 'strong' ? 'active' : ''}">Strong</button>
      </span></div>
      ${upgradeHtml}
      <button class="tp-sell" id="tp-sell">Sell — 🪙${refund}</button>
    `;
    this.towerPanel.classList.remove('hidden');

    this.towerPanel.querySelector('#tp-upgrade')?.addEventListener('click', () => this.game.upgradeSelected());
    this.towerPanel.querySelector('#tp-sell')?.addEventListener('click', () => this.game.sellSelected());
    this.towerPanel.querySelectorAll('.tp-priority button').forEach((b) => {
      b.addEventListener('click', () => {
        tower.priority = (b as HTMLElement).dataset.p as TargetPriority;
        tower.target = null;
        this.showTower(tower);
      });
    });
  }
}
