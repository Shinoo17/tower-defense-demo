import type { Difficulty, DifficultyDef } from '../types';

export const DIFFICULTIES: Record<Difficulty, DifficultyDef> = {
  easy: {
    label: 'Easy',
    startCoins: 650,
    startLives: 25,
    enemyHp: 0.8,
    enemySpeed: 0.9,
    enemyReward: 1.2,
    spawnInterval: 1.1,
    sellRefund: 0.8,
    bossHpBonus: 1.0,
  },
  normal: {
    label: 'Normal',
    startCoins: 500,
    startLives: 20,
    enemyHp: 1.0,
    enemySpeed: 1.0,
    enemyReward: 1.0,
    spawnInterval: 1.0,
    sellRefund: 0.7,
    bossHpBonus: 1.0,
  },
  hard: {
    label: 'Hard',
    startCoins: 400,
    startLives: 15,
    enemyHp: 1.35,
    enemySpeed: 1.1,
    enemyReward: 0.85,
    spawnInterval: 0.85,
    sellRefund: 0.6,
    bossHpBonus: 1.25,
  },
};

export const ECONOMY = {
  waveBaseReward: 30,
  waveNumberReward: 4,
  levelLifeReward: 5,
  earlyStartMaxBonus: 40,
};
