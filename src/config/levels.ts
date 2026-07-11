import type { EnemyType, LevelDef, WaveDef, WaveGroup } from '../types';

function g(
  type: EnemyType,
  count: number,
  interval = 1,
  path = 0,
  delay = 0,
  mods: Partial<Pick<WaveGroup, 'hpMul' | 'speedMul' | 'rewardMul'>> = {}
): WaveGroup {
  return { type, count, interval, path, delay, ...mods };
}

function w(...groups: WaveGroup[]): WaveDef {
  return { groups };
}

export const LEVELS: LevelDef[] = [
  // ---------------------------------------------------------- Level 1
  {
    id: 1,
    name: 'Greenfield Gate',
    theme: 'grass',
    gridW: 16,
    gridH: 12,
    intro: 'A gentle valley. Learn to build, upgrade and sell towers while holding one winding road.',
    paths: [
      [
        { x: 0, z: 2 }, { x: 11, z: 2 }, { x: 11, z: 5 }, { x: 3, z: 5 },
        { x: 3, z: 9 }, { x: 15, z: 9 },
      ],
    ],
    rivers: [[{ x: 14, z: 0 }, { x: 14, z: 11 }]],
    pads: [
      { x: 2, z: 1 }, { x: 5, z: 1 }, { x: 8, z: 3 }, { x: 12, z: 3 },
      { x: 5, z: 6 }, { x: 9, z: 6 }, { x: 6, z: 10 }, { x: 12, z: 8 },
    ],
    decor: [
      { m: 'tile-tree-double', x: 0, z: 0 }, { m: 'tile-tree', x: 6, z: 0 },
      { m: 'tile-tree-quad', x: 0, z: 6 }, { m: 'tile-tree', x: 1, z: 4 },
      { m: 'tile-rock', x: 9, z: 4 }, { m: 'tile-tree-double', x: 13, z: 1 },
      { m: 'tile-tree', x: 0, z: 11 }, { m: 'tile-tree-double', x: 6, z: 11 },
      { m: 'tile-rock', x: 2, z: 7 }, { m: 'tile-tree', x: 10, z: 10 },
      { m: 'tile-hill', x: 12, z: 0 }, { m: 'tile-crystal', x: 1, z: 8 },
      { m: 'wood-structure-high', x: 15, z: 10 }, { m: 'tile-tree', x: 13, z: 11 },
    ],
    waves: [
      w(g('basic', 6, 1.7)),
      w(g('basic', 10, 1.4)),
      w(g('basic', 6, 1.4), g('runner', 4, 0.9, 0, 8)),
      w(g('runner', 12, 0.75)),
      w(g('basic', 8, 1.3), g('armored', 1, 1, 0, 10)),
      w(g('basic', 6, 1.2), g('runner', 6, 0.8, 0, 6), g('captain', 1, 1, 0, 14)),
    ],
  },
  // ---------------------------------------------------------- Level 2
  {
    id: 2,
    name: 'Riverbend Crossing',
    theme: 'grass',
    gridW: 18,
    gridH: 12,
    intro: 'The road crosses the river twice. Cannons and frost towers shine against tight groups near the bridges.',
    paths: [
      [
        { x: 0, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 1 }, { x: 11, z: 1 },
        { x: 11, z: 4 }, { x: 14, z: 4 }, { x: 14, z: 9 }, { x: 17, z: 9 },
      ],
    ],
    rivers: [[{ x: 8, z: 0 }, { x: 8, z: 6 }, { x: 17, z: 6 }]],
    pads: [
      { x: 3, z: 1 }, { x: 2, z: 2 }, { x: 6, z: 4 }, { x: 9, z: 2 }, { x: 12, z: 2 },
      { x: 10, z: 5 }, { x: 12, z: 8 }, { x: 13, z: 7 }, { x: 15, z: 8 }, { x: 16, z: 10 },
    ],
    decor: [
      { m: 'tile-tree-double', x: 0, z: 0 }, { m: 'tile-tree', x: 1, z: 10 },
      { m: 'tile-tree-quad', x: 4, z: 7 }, { m: 'tile-tree', x: 7, z: 8 },
      { m: 'tile-tree-double', x: 16, z: 2 }, { m: 'tile-rock', x: 6, z: 10 },
      { m: 'tile-rock', x: 10, z: 8 }, { m: 'tile-crystal', x: 17, z: 0 },
      { m: 'tile-tree', x: 2, z: 5 }, { m: 'tile-tree', x: 13, z: 0 },
      { m: 'wood-structure-high', x: 17, z: 10 }, { m: 'tile-hill', x: 0, z: 7 },
      { m: 'tile-tree-double', x: 9, z: 10 },
    ],
    waves: [
      w(g('basic', 8, 1.4)),
      w(g('basic', 6, 1.3), g('runner', 5, 0.8, 0, 8)),
      w(g('basic', 14, 0.9)),
      w(g('armored', 3, 2.2), g('basic', 6, 1.2, 0, 6)),
      w(g('runner', 16, 0.6)),
      w(g('basic', 8, 1.1), g('armored', 3, 2, 0, 5), g('runner', 6, 0.7, 0, 12)),
      w(g('captain', 2, 6), g('basic', 10, 1, 0, 3)),
      w(g('basic', 12, 0.9), g('runner', 8, 0.6, 0, 8), g('armored', 4, 1.8, 0, 14), g('captain', 1, 1, 0, 20)),
    ],
  },
  // ---------------------------------------------------------- Level 3
  {
    id: 3,
    name: 'Frostbone Pass',
    theme: 'snow',
    gridW: 18,
    gridH: 14,
    intro: 'Two frozen trails merge in the pass. Split your defenses; the merged road alone will not save you. A boss stirs beneath the ice.',
    paths: [
      [
        { x: 0, z: 2 }, { x: 7, z: 2 }, { x: 7, z: 6 }, { x: 11, z: 6 },
        { x: 11, z: 9 }, { x: 15, z: 9 }, { x: 15, z: 6 }, { x: 17, z: 6 },
      ],
      [
        { x: 0, z: 11 }, { x: 7, z: 11 }, { x: 7, z: 6 }, { x: 11, z: 6 },
        { x: 11, z: 9 }, { x: 15, z: 9 }, { x: 15, z: 6 }, { x: 17, z: 6 },
      ],
    ],
    rivers: [[{ x: 3, z: 0 }, { x: 3, z: 13 }]],
    pads: [
      { x: 1, z: 3 }, { x: 5, z: 1 }, { x: 5, z: 3 }, { x: 8, z: 4 },
      { x: 1, z: 9 }, { x: 5, z: 10 }, { x: 5, z: 12 }, { x: 8, z: 8 },
      { x: 9, z: 5 }, { x: 9, z: 7 }, { x: 12, z: 5 }, { x: 13, z: 8 },
    ],
    decor: [
      { m: 'snow-tile-tree', x: 0, z: 0 }, { m: 'snow-tile-tree-double', x: 0, z: 13 },
      { m: 'snow-tile-tree', x: 6, z: 0 }, { m: 'snow-tile-tree-quad', x: 10, z: 2 },
      { m: 'snow-tile-tree', x: 2, z: 6 }, { m: 'snow-tile-tree-double', x: 6, z: 13 },
      { m: 'snow-tile-tree', x: 10, z: 12 }, { m: 'snow-tile-tree', x: 16, z: 1 },
      { m: 'snow-tile-tree-double', x: 16, z: 12 }, { m: 'snow-tile-rock', x: 9, z: 10 },
      { m: 'snow-tile-rock', x: 13, z: 4 }, { m: 'snow-tile-crystal', x: 17, z: 0 },
      { m: 'snow-tile-crystal', x: 0, z: 7 }, { m: 'snow-wood-structure-high', x: 16, z: 5 },
      { m: 'snow-tile-hill', x: 12, z: 12 },
    ],
    waves: [
      w(g('basic', 8, 1.3, 0)),
      w(g('basic', 8, 1.3, 1)),
      w(g('basic', 5, 1.2, 0), g('basic', 5, 1.2, 1, 4), g('basic', 5, 1.2, 0, 8)),
      w(g('runner', 8, 0.7, 0), g('runner', 8, 0.7, 1, 2)),
      w(g('armored', 4, 2, 0), g('basic', 6, 1.1, 1, 4)),
      w(g('basic', 8, 1, 0), g('runner', 6, 0.7, 1, 3), g('armored', 2, 2, 1, 10)),
      w(g('captain', 1, 1, 0), g('basic', 8, 1, 0, 2), g('captain', 1, 1, 1, 6), g('basic', 8, 1, 1, 8)),
      w(g('runner', 12, 0.55, 0), g('armored', 4, 1.8, 1, 8)),
      w(g('basic', 10, 0.9, 0), g('runner', 8, 0.6, 1, 4), g('armored', 4, 1.7, 0, 10), g('captain', 1, 1, 1, 16)),
      w(g('boss', 1, 1, 0), g('basic', 8, 1, 1, 5), g('runner', 6, 0.7, 0, 10)),
    ],
  },
  // ---------------------------------------------------------- Level 4
  {
    id: 4,
    name: 'Siege of Ember Keep',
    theme: 'grass',
    gridW: 18,
    gridH: 14,
    intro: 'The horde circles Ember Keep before striking its gate. From Wave 6, enemies sprint after passing the keep, so target priority matters.',
    paths: [
      [
        { x: 0, z: 7 }, { x: 3, z: 7 }, { x: 3, z: 3 }, { x: 14, z: 3 },
        { x: 14, z: 11 }, { x: 5, z: 11 }, { x: 5, z: 7 }, { x: 8, z: 7 },
      ],
    ],
    pads: [
      { x: 1, z: 5 }, { x: 2, z: 4 }, { x: 2, z: 9 }, { x: 5, z: 2 }, { x: 5, z: 5 },
      { x: 8, z: 2 }, { x: 11, z: 2 }, { x: 15, z: 2 }, { x: 12, z: 5 }, { x: 15, z: 6 },
      { x: 15, z: 9 }, { x: 12, z: 10 }, { x: 8, z: 10 }, { x: 6, z: 8 },
    ],
    decor: [
      // Ember Keep (central fortress, not buildable)
      { m: 'wood-structure-high', x: 9, z: 5 }, { m: 'wood-structure-high', x: 11, z: 5 },
      { m: 'wood-structure-high', x: 9, z: 9 }, { m: 'wood-structure-high', x: 11, z: 9 },
      { m: 'wood-structure', x: 10, z: 5 }, { m: 'wood-structure', x: 10, z: 9 },
      { m: 'tile-dirt', x: 9, z: 6 }, { m: 'tile-dirt', x: 9, z: 7 }, { m: 'tile-dirt', x: 9, z: 8 },
      { m: 'tile-dirt', x: 11, z: 6 }, { m: 'tile-dirt', x: 11, z: 7 }, { m: 'tile-dirt', x: 11, z: 8 },
      { m: 'tile-dirt', x: 10, z: 6 }, { m: 'tile-dirt', x: 10, z: 8 },
      { m: 'tower-square-bottom-c', x: 10, z: 7, s: 1.35 },
      // surroundings
      { m: 'tile-tree-double', x: 0, z: 0 }, { m: 'tile-tree', x: 0, z: 12 },
      { m: 'tile-tree-quad', x: 17, z: 0 }, { m: 'tile-tree', x: 17, z: 13 },
      { m: 'tile-tree', x: 1, z: 11 }, { m: 'tile-tree-double', x: 16, z: 4 },
      { m: 'tile-rock', x: 7, z: 4 }, { m: 'tile-rock', x: 13, z: 9 },
      { m: 'tile-hill', x: 16, z: 12 }, { m: 'tile-crystal', x: 0, z: 2 },
      { m: 'tile-tree', x: 7, z: 12 }, { m: 'tile-tree-double', x: 2, z: 12 },
    ],
    special: { type: 'fortressBoost', fromWave: 6, atProgress: 0.6, boost: 1.45, duration: 3.5 },
    waves: [
      w(g('basic', 10, 1.2)),
      w(g('runner', 12, 0.65)),
      w(g('armored', 5, 1.9)),
      w(g('basic', 8, 1), g('runner', 6, 0.7, 0, 6), g('armored', 2, 2, 0, 12)),
      w(g('captain', 2, 7), g('basic', 10, 0.95, 0, 2)),
      w(g('basic', 10, 0.9), g('runner', 8, 0.6, 0, 8)),
      w(g('basic', 20, 0.55)),
      w(g('armored', 6, 1.5), g('runner', 10, 0.55, 0, 6)),
      w(g('runner', 8, 0.5), g('basic', 6, 1, 0, 5), g('runner', 8, 0.5, 0, 10)),
      w(g('captain', 3, 5), g('basic', 8, 0.9, 0, 3)),
      w(g('armored', 8, 1.3), g('captain', 2, 6, 0, 6), g('runner', 8, 0.55, 0, 10)),
      w(g('boss', 1, 1), g('captain', 2, 6, 0, 6), g('runner', 10, 0.6, 0, 10)),
    ],
  },
  // ---------------------------------------------------------- Level 5
  {
    id: 5,
    name: 'The Last Citadel',
    theme: 'snow',
    gridW: 20,
    gridH: 16,
    intro: 'Three frozen roads converge on the Last Citadel. Hold every gate as the Skeleton Army sends everything it has.',
    paths: [
      [
        { x: 0, z: 3 }, { x: 5, z: 3 }, { x: 5, z: 6 }, { x: 9, z: 6 },
        { x: 14, z: 6 }, { x: 14, z: 10 }, { x: 18, z: 10 },
      ],
      [
        { x: 0, z: 12 }, { x: 4, z: 12 }, { x: 4, z: 14 }, { x: 10, z: 14 },
        { x: 10, z: 12 }, { x: 14, z: 12 }, { x: 14, z: 10 }, { x: 18, z: 10 },
      ],
      [
        { x: 9, z: 0 }, { x: 9, z: 6 }, { x: 14, z: 6 }, { x: 14, z: 10 }, { x: 18, z: 10 },
      ],
    ],
    rivers: [
      [{ x: 17, z: 0 }, { x: 17, z: 7 }],
      [{ x: 0, z: 8 }, { x: 7, z: 8 }],
    ],
    pads: [
      { x: 2, z: 2 }, { x: 6, z: 2 }, { x: 3, z: 4 }, { x: 8, z: 2 },
      { x: 10, z: 3 }, { x: 7, z: 4 }, { x: 2, z: 11 }, { x: 5, z: 13 },
      { x: 8, z: 13 }, { x: 11, z: 13 }, { x: 11, z: 5 }, { x: 11, z: 7 },
      { x: 13, z: 8 }, { x: 12, z: 11 }, { x: 15, z: 8 }, { x: 16, z: 11 },
    ],
    decor: [
      // the Last Citadel
      { m: 'snow-wood-structure-high', x: 19, z: 9 }, { m: 'snow-wood-structure-high', x: 19, z: 11 },
      { m: 'snow-wood-structure', x: 18, z: 9 }, { m: 'snow-wood-structure', x: 18, z: 11 },
      { m: 'tower-square-bottom-a', x: 19, z: 10, s: 1.3 },
      // scenery
      { m: 'snow-tile-tree-double', x: 0, z: 0 }, { m: 'snow-tile-tree', x: 1, z: 6 },
      { m: 'snow-tile-tree', x: 3, z: 10 }, { m: 'snow-tile-tree-quad', x: 6, z: 9 },
      { m: 'snow-tile-tree', x: 12, z: 2 }, { m: 'snow-tile-tree-double', x: 15, z: 3 },
      { m: 'snow-tile-tree', x: 17, z: 13 }, { m: 'snow-tile-tree-double', x: 2, z: 14 },
      { m: 'snow-tile-tree', x: 12, z: 14 }, { m: 'snow-tile-rock', x: 7, z: 10 },
      { m: 'snow-tile-rock', x: 12, z: 8 }, { m: 'snow-tile-crystal', x: 19, z: 0 },
      { m: 'snow-tile-crystal', x: 0, z: 15 }, { m: 'snow-tile-crystal', x: 16, z: 2 },
      { m: 'snow-tile-hill', x: 5, z: 0 }, { m: 'snow-tile-tree', x: 0, z: 10 },
    ],
    waves: [
      w(g('basic', 8, 1.2, 0)),
      w(g('basic', 6, 1.1, 0), g('basic', 6, 1.1, 1, 3)),
      w(g('runner', 5, 0.9, 0), g('runner', 5, 0.9, 1, 3), g('runner', 5, 0.9, 2, 6)),
      w(g('armored', 5, 1.8, 2), g('armored', 3, 1.8, 0, 6)),
      w(g('basic', 8, 1, 0), g('runner', 6, 0.65, 1, 4), g('armored', 3, 1.8, 2, 9)),
      w(g('captain', 2, 6, 1), g('basic', 10, 0.9, 1, 2), g('runner', 6, 0.7, 0, 8)),
      w(g('basic', 12, 0.7, 0), g('basic', 12, 0.7, 2, 4)),
      w(g('runner', 7, 0.5, 0), g('runner', 7, 0.5, 1, 2), g('runner', 7, 0.5, 2, 4)),
      w(g('armored', 6, 1.4, 1), g('armored', 4, 1.5, 2, 6), g('captain', 1, 1, 1, 12)),
      w(g('captain', 1, 1, 2, 0, { hpMul: 3, speedMul: 0.85, rewardMul: 2.5 }), g('basic', 8, 0.9, 0, 4)),
      w(g('basic', 6, 0.8, 0), g('basic', 6, 0.8, 1, 5), g('basic', 6, 0.8, 2, 10), g('runner', 6, 0.6, 0, 14)),
      w(g('basic', 10, 0.8, 0), g('runner', 8, 0.55, 1, 4), g('armored', 5, 1.5, 2, 8), g('captain', 1, 1, 0, 15)),
      w(g('captain', 3, 5, 1), g('basic', 8, 0.9, 0, 3), g('runner', 8, 0.6, 2, 8)),
      w(g('armored', 8, 1.2, 0), g('armored', 6, 1.2, 1, 6), g('captain', 2, 6, 2, 10)),
      w(g('boss', 1, 1, 1), g('captain', 2, 7, 0, 8), g('runner', 10, 0.6, 2, 12), g('basic', 10, 0.8, 0, 16)),
    ],
  },
];

export function levelById(id: number): LevelDef {
  const def = LEVELS.find((l) => l.id === id);
  if (!def) throw new Error(`Unknown level ${id}`);
  return def;
}
