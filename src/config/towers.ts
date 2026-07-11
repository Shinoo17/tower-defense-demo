import type { TowerDef, TowerType } from '../types';

const UP2 = { dmg: 1.45, range: 1.1, rate: 1.1, cost: 0.7 };
const UP3 = { dmg: 1.95, range: 1.2, rate: 1.22, cost: 1.1 };

function levels(cost: number, damage: number, range: number, rate: number): TowerDef['levels'] {
  return [
    { damage, range, rate, cost },
    {
      damage: Math.round(damage * UP2.dmg),
      range: +(range * UP2.range).toFixed(2),
      rate: +(rate * UP2.rate).toFixed(2),
      cost: Math.round(cost * UP2.cost),
    },
    {
      damage: Math.round(damage * UP3.dmg),
      range: +(range * UP3.range).toFixed(2),
      rate: +(rate * UP3.rate).toFixed(2),
      cost: Math.round(cost * UP3.cost),
    },
  ];
}

export const TOWERS: Record<TowerType, TowerDef> = {
  archer: {
    type: 'archer',
    name: 'Archer Tower',
    role: 'Fast single-target',
    kind: 'physical',
    projectile: 'weapon-ammo-arrow',
    projectileSpeed: 14,
    arc: false,
    levels: levels(120, 13, 2.9, 1.4),
    color: '#7ec850',
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon Tower',
    role: 'Area damage',
    kind: 'physical',
    aoeRadius: 1.0,
    projectile: 'weapon-ammo-cannonball',
    projectileSpeed: 9,
    arc: true,
    levels: levels(220, 36, 2.7, 0.5),
    color: '#e08a3c',
  },
  frost: {
    type: 'frost',
    name: 'Frost Tower',
    role: 'Slows enemies',
    kind: 'magic',
    slowPct: 0.25,
    slowDuration: 1.5,
    projectile: 'weapon-ammo-bullet',
    projectileSpeed: 11,
    arc: false,
    levels: levels(180, 6, 2.6, 0.85),
    color: '#5ac8e8',
  },
  arcane: {
    type: 'arcane',
    name: 'Arcane Tower',
    role: 'Long-range burst',
    kind: 'magic',
    projectile: 'weapon-ammo-bullet',
    projectileSpeed: 13,
    arc: false,
    levels: levels(300, 62, 3.9, 0.55),
    color: '#b06ae0',
  },
};

/** Frost slow strengthens slightly with tower level. */
export function frostSlow(level: number): { pct: number; duration: number } {
  return { pct: 0.25 + (level - 1) * 0.07, duration: 1.5 + (level - 1) * 0.4 };
}

/** Upgrade visual recipes: stacked Kenney pieces per level (weapon added on top). */
export const TOWER_RECIPES: Record<TowerType, { pieces: string[][]; weapon: string | null; tint?: number }> = {
  archer: {
    pieces: [
      ['tower-round-bottom-c', 'tower-round-top-a'],
      ['tower-round-bottom-c', 'tower-round-middle-a', 'tower-round-top-a'],
      ['tower-round-bottom-c', 'tower-round-middle-a', 'tower-round-middle-b', 'tower-round-top-b'],
    ],
    weapon: 'weapon-ballista',
  },
  cannon: {
    pieces: [
      ['tower-square-bottom-c', 'tower-square-top-a'],
      ['tower-square-bottom-c', 'tower-square-middle-a', 'tower-square-top-a'],
      ['tower-square-bottom-c', 'tower-square-middle-a', 'tower-square-middle-b', 'tower-square-top-b'],
    ],
    weapon: 'weapon-cannon',
  },
  frost: {
    pieces: [
      ['tower-round-bottom-b', 'tower-round-crystals'],
      ['tower-round-bottom-b', 'tower-round-middle-c', 'tower-round-crystals'],
      ['tower-round-bottom-b', 'tower-round-middle-c', 'tower-round-middle-c', 'tower-round-crystals'],
    ],
    weapon: null,
    tint: 0x66ccff,
  },
  arcane: {
    pieces: [
      ['tower-square-bottom-a', 'tower-round-crystals'],
      ['tower-square-bottom-a', 'tower-square-middle-c', 'tower-round-crystals'],
      ['tower-square-bottom-a', 'tower-square-middle-c', 'tower-square-middle-c', 'tower-round-crystals'],
    ],
    weapon: null,
    tint: 0xbb66ff,
  },
};
