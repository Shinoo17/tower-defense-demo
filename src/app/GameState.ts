import type { Difficulty } from '../types';
import { DIFFICULTIES } from '../config/difficulty';

export class GameState {
  coins: number;
  lives: number;
  readonly startLives: number;
  readonly difficulty: Difficulty;
  readonly levelId: number;
  readonly endless: boolean;

  // per-run stats
  kills = 0;
  coinsEarned = 0;
  towersBuilt = 0;
  readonly startedAt = performance.now();

  constructor(levelId: number, difficulty: Difficulty, endless: boolean, bonusCoins = 0) {
    this.levelId = levelId;
    this.difficulty = difficulty;
    this.endless = endless;
    const d = DIFFICULTIES[difficulty];
    this.coins = d.startCoins + bonusCoins;
    this.lives = d.startLives;
    this.startLives = d.startLives;
  }

  earn(amount: number): void {
    this.coins += amount;
    this.coinsEarned += amount;
  }

  spend(amount: number): boolean {
    if (this.coins < amount) return false;
    this.coins = Math.max(0, this.coins - amount);
    return true;
  }

  get playMs(): number {
    return performance.now() - this.startedAt;
  }
}
