export type Difficulty = 'easy' | 'normal' | 'hard';
export type TowerType = 'archer' | 'cannon' | 'frost' | 'arcane';
export type EnemyType = 'basic' | 'runner' | 'armored' | 'captain' | 'boss';
export type TargetPriority = 'first' | 'last' | 'strong';
export type DamageKind = 'physical' | 'magic';

export interface Vec2 {
  x: number;
  z: number;
}

export interface WaveGroup {
  type: EnemyType;
  count: number;
  /** seconds between spawns within the group */
  interval: number;
  /** which path (index into level paths) the group uses */
  path: number;
  /** seconds to wait after the previous group started spawning */
  delay: number;
  hpMul?: number;
  speedMul?: number;
  rewardMul?: number;
}

export interface WaveDef {
  groups: WaveGroup[];
}

export interface DifficultyDef {
  label: string;
  startCoins: number;
  startLives: number;
  enemyHp: number;
  enemySpeed: number;
  enemyReward: number;
  spawnInterval: number;
  sellRefund: number;
  bossHpBonus: number;
}

export interface TowerLevelStats {
  damage: number;
  range: number;
  /** attacks per second */
  rate: number;
  cost: number;
}

export interface TowerDef {
  type: TowerType;
  name: string;
  role: string;
  kind: DamageKind;
  aoeRadius?: number;
  slowPct?: number;
  slowDuration?: number;
  projectile: string;
  projectileSpeed: number;
  arc: boolean;
  levels: [TowerLevelStats, TowerLevelStats, TowerLevelStats];
  color: string;
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  model: string;
  walkClips: string[];
  deathClips: string[];
  hitClips: string[];
  hp: number;
  /** world units per second */
  speed: number;
  reward: number;
  livesCost: number;
  /** fraction of physical damage ignored */
  armor: number;
  scale: number;
  tint?: number;
  isElite?: boolean;
  isBoss?: boolean;
  /** captain aura: speed buff for nearby skeletons */
  buffRadius?: number;
  buffSpeed?: number;
  animSpeedScale: number;
}

export interface TilePlacement {
  m: string;
  x: number;
  z: number;
  /** rotation in quarter turns counter-clockwise (0-3) */
  r?: number;
  s?: number;
  y?: number;
}

export interface SpecialRule {
  type: 'fortressBoost';
  fromWave: number;
  atProgress: number;
  boost: number;
  duration: number;
}

export interface LevelDef {
  id: number;
  name: string;
  theme: 'grass' | 'snow';
  gridW: number;
  gridH: number;
  /** waypoint corner lists in tile coords; expanded to cell sequences */
  paths: Vec2[][];
  pads: Vec2[];
  decor: TilePlacement[];
  /** extra river cells: list of corner waypoints, expanded like paths */
  rivers?: Vec2[][];
  /** cells where a road crosses a river (bridge tile placed) */
  waves: WaveDef[];
  special?: SpecialRule;
  intro: string;
}
