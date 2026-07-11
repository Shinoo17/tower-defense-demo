import type { Difficulty } from '../types';

export interface LevelResult {
  bestLives: number;
  completed: boolean;
}

export interface SaveData {
  version: 1;
  difficulty: Difficulty;
  highestUnlocked: number;
  /** results[levelId][difficulty] */
  results: Record<string, Partial<Record<Difficulty, LevelResult>>>;
  campaignDone: Partial<Record<Difficulty, boolean>>;
  endlessUnlocked: boolean;
  /** best wave per `${mapId}:${difficulty}` */
  endlessBest: Record<string, number>;
  tutorialSkipped: boolean;
  stats: { kills: number; coins: number; towers: number; playMs: number };
  settings: { shadows: boolean };
}

const KEY = 'td-save-v1';

function defaults(): SaveData {
  return {
    version: 1,
    difficulty: 'normal',
    highestUnlocked: 1,
    results: {},
    campaignDone: {},
    endlessUnlocked: false,
    endlessBest: {},
    tutorialSkipped: false,
    stats: { kills: 0, coins: 0, towers: 0, playMs: 0 },
    settings: { shadows: true },
  };
}

export class SaveSystem {
  data: SaveData;

  constructor() {
    this.data = this.load();
  }

  private load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1) return defaults();
      // merge over defaults so missing fields never break the game
      const d = defaults();
      return {
        ...d,
        ...parsed,
        stats: { ...d.stats, ...(parsed.stats ?? {}) },
        settings: { ...d.settings, ...(parsed.settings ?? {}) },
        results: parsed.results ?? {},
        endlessBest: parsed.endlessBest ?? {},
        campaignDone: parsed.campaignDone ?? {},
      };
    } catch {
      return defaults();
    }
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // storage full/blocked: non-fatal
    }
  }

  levelResult(levelId: number, diff: Difficulty): LevelResult | null {
    return this.data.results[levelId]?.[diff] ?? null;
  }

  recordLevelComplete(levelId: number, diff: Difficulty, livesLeft: number, totalLevels: number): void {
    const byLevel = (this.data.results[levelId] ??= {});
    const prev = byLevel[diff];
    byLevel[diff] = {
      completed: true,
      bestLives: Math.max(prev?.bestLives ?? 0, livesLeft),
    };
    this.data.highestUnlocked = Math.max(this.data.highestUnlocked, Math.min(levelId + 1, totalLevels));
    if (levelId === totalLevels) {
      this.data.campaignDone[diff] = true;
      this.data.endlessUnlocked = true;
    }
    this.save();
  }

  recordEndless(mapId: number, diff: Difficulty, wave: number): number {
    const k = `${mapId}:${diff}`;
    const best = Math.max(this.data.endlessBest[k] ?? 0, wave);
    this.data.endlessBest[k] = best;
    this.save();
    return best;
  }

  endlessBestFor(mapId: number, diff: Difficulty): number {
    return this.data.endlessBest[`${mapId}:${diff}`] ?? 0;
  }

  addStats(partial: Partial<SaveData['stats']>): void {
    const s = this.data.stats;
    s.kills += partial.kills ?? 0;
    s.coins += partial.coins ?? 0;
    s.towers += partial.towers ?? 0;
    s.playMs += partial.playMs ?? 0;
    this.save();
  }

  resetProgress(): void {
    const settings = this.data.settings;
    const tutorialSkipped = this.data.tutorialSkipped;
    this.data = defaults();
    this.data.settings = settings;
    this.data.tutorialSkipped = tutorialSkipped;
    this.save();
  }
}

export const saves = new SaveSystem();
