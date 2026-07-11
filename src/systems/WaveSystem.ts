import type { Difficulty, EnemyType, WaveDef } from '../types';
import { DIFFICULTIES, ECONOMY } from '../config/difficulty';
import { ENDLESS } from '../config/endless';
import { ENEMIES } from '../config/enemies';
import type { EnemySystem, SpawnMods } from './EnemySystem';

export type WavePhase = 'awaiting-first' | 'prep' | 'active' | 'level-done';

interface QueuedSpawn {
  time: number;
  type: EnemyType;
  path: number;
  mods: SpawnMods;
}

export interface WavePreviewEntry {
  type: EnemyType;
  name: string;
  count: number;
  isBoss: boolean;
  isElite: boolean;
}

const PREP_TIME = 20;

export class WaveSystem {
  phase: WavePhase = 'awaiting-first';
  waveIndex = 0; // 0-based index of the NEXT wave while prepping, current while active
  prepRemaining = PREP_TIME;
  private queue: QueuedSpawn[] = [];
  private elapsed = 0;
  private waves: WaveDef[] = [];
  private endless = false;
  private endlessWaveCache: WaveDef | null = null;
  private difficulty: Difficulty = 'normal';
  private pathCount = 1;
  private enemySys: EnemySystem;

  onWaveStart: (waveNumber: number) => void = () => {};
  onWaveComplete: (waveNumber: number) => void = () => {};
  onLevelComplete: () => void = () => {};
  onSpawn: (type: EnemyType, path: number, mods: SpawnMods) => void = () => {};

  constructor(enemySys: EnemySystem) {
    this.enemySys = enemySys;
  }

  setup(waves: WaveDef[], difficulty: Difficulty, endless: boolean, pathCount: number): void {
    this.waves = waves;
    this.difficulty = difficulty;
    this.endless = endless;
    this.pathCount = pathCount;
    this.phase = 'awaiting-first';
    this.waveIndex = 0;
    this.queue = [];
    this.elapsed = 0;
    this.prepRemaining = PREP_TIME;
    this.endlessWaveCache = null;
  }

  get totalWaves(): number {
    return this.endless ? Infinity : this.waves.length;
  }

  get currentWaveNumber(): number {
    return this.waveIndex + (this.phase === 'active' ? 1 : 0);
  }

  get remainingInWave(): number {
    return this.queue.length;
  }

  /** definition of the upcoming wave (during prep) or null when level finished */
  nextWaveDef(): WaveDef | null {
    if (this.phase === 'active' || this.phase === 'level-done') return null;
    if (this.endless) {
      if (!this.endlessWaveCache) this.endlessWaveCache = this.generateEndlessWave(this.waveIndex + 1);
      return this.endlessWaveCache;
    }
    return this.waves[this.waveIndex] ?? null;
  }

  preview(): { entries: WavePreviewEntry[]; hasBoss: boolean } | null {
    const def = this.nextWaveDef();
    if (!def) return null;
    const counts = new Map<EnemyType, number>();
    for (const grp of def.groups) counts.set(grp.type, (counts.get(grp.type) ?? 0) + grp.count);
    const entries: WavePreviewEntry[] = [...counts.entries()].map(([type, count]) => ({
      type,
      name: ENEMIES[type].name,
      count,
      isBoss: !!ENEMIES[type].isBoss,
      isElite: !!ENEMIES[type].isElite,
    }));
    return { entries, hasBoss: entries.some((e) => e.isBoss) };
  }

  earlyBonus(): number {
    if (this.phase !== 'prep') return 0;
    return Math.min(ECONOMY.earlyStartMaxBonus, Math.ceil(this.prepRemaining * 2));
  }

  /** player pressed Start Wave. Returns coin bonus earned. */
  startWave(): number {
    if (this.phase !== 'prep' && this.phase !== 'awaiting-first') return 0;
    const bonus = this.phase === 'prep' ? this.earlyBonus() : 0;
    this.beginWave();
    return bonus;
  }

  private beginWave(): void {
    const def = this.nextWaveDef();
    if (!def) return;
    const diff = DIFFICULTIES[this.difficulty];
    const waveNum = this.waveIndex + 1;
    this.queue = [];
    this.elapsed = 0;

    const groups = [...def.groups];
    // Hard mode: elites appear earlier — inject a captain mid-campaign waves that lack one
    if (
      this.difficulty === 'hard' &&
      !this.endless &&
      waveNum >= Math.max(3, Math.floor(this.waves.length * 0.45)) &&
      !groups.some((g) => g.type === 'captain' || g.type === 'boss')
    ) {
      groups.push({ type: 'captain', count: 1, interval: 1, path: groups[0].path, delay: 6 });
    }

    for (const grp of groups) {
      const def2 = ENEMIES[grp.type];
      const bossBonus = def2.isBoss ? diff.bossHpBonus : 1;
      const mods: SpawnMods = {
        hpMul: diff.enemyHp * (grp.hpMul ?? 1) * bossBonus,
        speedMul: diff.enemySpeed * (grp.speedMul ?? 1),
        rewardMul: diff.enemyReward * (grp.rewardMul ?? 1),
      };
      for (let i = 0; i < grp.count; i++) {
        this.queue.push({
          time: grp.delay + i * grp.interval * diff.spawnInterval,
          type: grp.type,
          path: grp.path,
          mods,
        });
      }
    }
    this.queue.sort((a, b) => a.time - b.time);
    this.phase = 'active';
    this.endlessWaveCache = null;
    this.enemySys.currentWave = waveNum;
    this.onWaveStart(waveNum);
  }

  update(dt: number): void {
    if (this.phase === 'prep') {
      this.prepRemaining -= dt;
      if (this.prepRemaining <= 0) this.beginWave();
      return;
    }
    if (this.phase !== 'active') return;

    this.elapsed += dt;
    while (this.queue.length && this.queue[0].time <= this.elapsed) {
      const s = this.queue.shift()!;
      this.onSpawn(s.type, s.path, s.mods);
    }
    if (this.queue.length === 0 && this.enemySys.aliveCount === 0 && this.enemySys.enemies.length === 0) {
      const finished = this.waveIndex + 1;
      this.waveIndex++;
      this.onWaveComplete(finished);
      if (!this.endless && this.waveIndex >= this.waves.length) {
        this.phase = 'level-done';
        this.onLevelComplete();
      } else {
        this.phase = 'prep';
        this.prepRemaining = PREP_TIME;
      }
    }
  }

  // ------------------------------------------------ endless generation
  private generateEndlessWave(n: number): WaveDef {
    const hpMul = Math.pow(ENDLESS.hpGrowthPerWave, n - 1);
    const speedMul = Math.min(1 + ENDLESS.speedGrowthPerWave * (n - 1), ENDLESS.speedCap);
    const interval = (base: number) =>
      Math.max(ENDLESS.minSpawnInterval, base * Math.pow(ENDLESS.spawnIntervalDecay, n - 1));
    const path = (i: number) => (n + i) % this.pathCount;
    const groups: WaveDef['groups'] = [];
    const grow = (base: number, per: number) => Math.min(30, base + Math.floor((n - 1) * per));

    const isBossWave = n % ENDLESS.bossEvery === 0;
    const mods = { hpMul, speedMul };

    groups.push({ type: 'basic', count: grow(6, 0.9), interval: interval(1.2), path: path(0), delay: 0, ...mods });
    if (n >= 2) {
      groups.push({ type: 'runner', count: grow(3, 0.6), interval: interval(0.7), path: path(1), delay: 5, ...mods });
    }
    if (n >= 3) {
      groups.push({ type: 'armored', count: grow(1, 0.45), interval: interval(1.9), path: path(2), delay: 9, ...mods });
    }
    const eliteChance = Math.min(
      ENDLESS.eliteChanceCap,
      ENDLESS.eliteChanceBase + ENDLESS.eliteChancePerWave * (n - 1)
    );
    const captains = (n >= 4 ? 1 : 0) + (Math.random() < eliteChance ? 1 : 0) + Math.floor(n / 12);
    if (captains > 0) {
      groups.push({ type: 'captain', count: Math.min(4, captains), interval: 5, path: path(0), delay: 12, ...mods });
    }
    if (isBossWave) {
      const bossHp = Math.pow(ENDLESS.bossHpGrowthPerWave, n - 1);
      groups.push({ type: 'boss', count: 1 + Math.floor(n / 25), interval: 8, path: path(1), delay: 14, hpMul: bossHp, speedMul });
    }
    return { groups };
  }
}
