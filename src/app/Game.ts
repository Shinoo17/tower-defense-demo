import * as THREE from 'three';
import type { Difficulty, LevelDef, TowerType } from '../types';
import { DIFFICULTIES, ECONOMY } from '../config/difficulty';
import { ENDLESS } from '../config/endless';
import { TOWERS } from '../config/towers';
import { LEVELS, levelById } from '../config/levels';
import { buildLevel, type BuiltLevel, type Pad } from '../levels/LevelBuilder';
import { CameraRig } from '../camera/CameraRig';
import { GameLoop } from './GameLoop';
import { GameState } from './GameState';
import { EffectsSystem } from '../systems/EffectsSystem';
import { EnemySystem } from '../systems/EnemySystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { TowerSystem } from '../systems/TowerSystem';
import { WaveSystem } from '../systems/WaveSystem';
import { PlacementSystem } from '../systems/PlacementSystem';
import { saves } from '../systems/SaveSystem';
import type { Tower } from '../entities/Tower';
import { ENEMIES } from '../config/enemies';

export type GamePhase = 'menu' | 'loading' | 'playing' | 'paused' | 'won' | 'lost' | 'campaign-complete' | 'endless-over';

export interface GameUI {
  hudChanged(): void;
  waveChanged(): void;
  towerSelected(tower: Tower | null): void;
  buildModeChanged(type: TowerType | null): void;
  showWin(stats: { livesLeft: number; reward: number; levelId: number }): void;
  showLose(): void;
  showCampaignComplete(): void;
  showEndlessOver(stats: { wave: number; kills: number; coins: number; towers: number; best: number }): void;
  levelLoaded(def: LevelDef): void;
  waveStarted(n: number): void;
  waveCompleted(n: number): void;
  towerBuilt(tower: Tower): void;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly rig: CameraRig;
  readonly loop: GameLoop;
  readonly effects: EffectsSystem;
  readonly enemySys: EnemySystem;
  readonly projectiles: ProjectileSystem;
  readonly towerSys: TowerSystem;
  readonly waveSys: WaveSystem;
  readonly placement: PlacementSystem;

  phase: GamePhase = 'menu';
  state: GameState | null = null;
  built: BuiltLevel | null = null;
  levelDef: LevelDef | null = null;
  ui!: GameUI;
  private dirLight: THREE.DirectionalLight;
  private sessionSaveTimer = 0;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = saves.data.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d6);
    this.scene.fog = new THREE.Fog(0x87b5d6, 30, 70);

    const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7a8a5a, 0.9);
    this.scene.add(hemi);
    this.dirLight = new THREE.DirectionalLight(0xfff2d9, 2.1);
    this.dirLight.position.set(8, 14, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -14;
    this.dirLight.shadow.camera.right = 14;
    this.dirLight.shadow.camera.top = 14;
    this.dirLight.shadow.camera.bottom = -14;
    this.dirLight.shadow.camera.far = 50;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight, this.dirLight.target);

    this.rig = new CameraRig(this.renderer.domElement);
    this.effects = new EffectsSystem(this.scene);
    this.enemySys = new EnemySystem(this.scene, this.effects);
    this.projectiles = new ProjectileSystem(this.scene);
    this.towerSys = new TowerSystem(this.scene, this.enemySys, this.projectiles, this.effects);
    this.waveSys = new WaveSystem(this.enemySys);
    this.placement = new PlacementSystem(this.scene, this.rig.camera, this.renderer.domElement);

    this.wireSystems();
    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.loop = new GameLoop((dt, rawDt) => this.tick(dt, rawDt));
    this.loop.start();
  }

  private wireSystems(): void {
    this.enemySys.onLeak = (enemy) => {
      if (!this.state) return;
      this.state.lives = Math.max(0, this.state.lives - enemy.def.livesCost);
      this.ui.hudChanged();
      if (this.state.lives <= 0) this.handleDefeat();
    };
    this.enemySys.onKilled = (enemy) => {
      if (!this.state) return;
      this.state.kills++;
      this.state.earn(enemy.reward);
      this.ui.hudChanged();
    };
    this.waveSys.onSpawn = (type, path, mods) => {
      const enemy = this.enemySys.spawn(type, path, mods);
      if (ENEMIES[type].isBoss) {
        this.rig.focusOn(enemy.position.clone(), 1.4);
      }
      this.ui.hudChanged();
    };
    this.waveSys.onWaveStart = (n) => {
      this.ui.waveStarted(n);
      this.ui.waveChanged();
      this.ui.hudChanged();
    };
    this.waveSys.onWaveComplete = (n) => {
      if (!this.state) return;
      const reward = ECONOMY.waveBaseReward + n * ECONOMY.waveNumberReward;
      this.state.earn(reward);
      if (this.state.endless) {
        saves.recordEndless(this.state.levelId, this.state.difficulty, n);
      }
      this.ui.waveCompleted(n);
      this.ui.waveChanged();
      this.ui.hudChanged();
    };
    this.waveSys.onLevelComplete = () => this.handleVictory();

    this.placement.getRange = (type) => TOWERS[type].levels[0].range;
    this.placement.onBuildRequest = (pad, type) => this.buildTower(pad, type);
    this.placement.onTowerClicked = (tower) => {
      this.setBuildMode(null);
      this.towerSys.select(tower);
      this.ui.towerSelected(tower);
    };
    this.placement.onEmptyClick = () => {
      if (this.placement.buildMode) this.setBuildMode(null);
      else if (this.towerSys.selected) {
        this.towerSys.select(null);
        this.ui.towerSelected(null);
      }
    };
  }

  // ------------------------------------------------------------ lifecycle

  async startLevel(levelId: number, difficulty: Difficulty, endless: boolean): Promise<void> {
    this.phase = 'loading';
    this.teardownLevel();
    const def = levelById(levelId);
    this.levelDef = def;
    this.built = await buildLevel(def);
    this.scene.add(this.built.group);

    this.state = new GameState(levelId, difficulty, endless, endless ? ENDLESS.startCoinsBonus : 0);
    this.enemySys.setPaths(this.built.worldPaths);
    this.enemySys.special = def.special ?? null;
    this.waveSys.setup(def.waves, difficulty, endless, def.paths.length);
    this.placement.setPads(this.built.pads);
    this.placement.enabled = true;

    const halfW = def.gridW / 2;
    const halfH = def.gridH / 2;
    this.rig.setBounds(-halfW + 2, halfW - 2, -halfH + 2, halfH - 2);
    this.rig.setView(new THREE.Vector3(0, 0, -1), Math.max(def.gridW, def.gridH) * 1.05, true);
    this.rig.setView(new THREE.Vector3(0, 0, -0.5), Math.max(def.gridW, def.gridH) * 0.92);

    saves.data.difficulty = difficulty;
    saves.save();

    this.phase = 'playing';
    this.loop.paused = false;
    this.loop.speed = 1;
    this.ui.levelLoaded(def);
    this.ui.hudChanged();
    this.ui.waveChanged();
    this.ui.towerSelected(null);
    this.ui.buildModeChanged(null);
  }

  restartLevel(): void {
    if (!this.state) return;
    const { levelId, difficulty, endless } = this.state;
    void this.startLevel(levelId, difficulty, endless);
  }

  quitToMenu(): void {
    this.teardownLevel();
    this.phase = 'menu';
  }

  private teardownLevel(): void {
    this.flushRunStats();
    this.placement.clear();
    this.placement.enabled = false;
    this.towerSys.clear();
    this.projectiles.clear();
    this.enemySys.clear();
    this.effects.clear();
    if (this.built) {
      this.built.dispose();
      this.built = null;
    }
    this.state = null;
    this.levelDef = null;
  }

  private flushRunStats(): void {
    if (!this.state) return;
    saves.addStats({
      kills: this.state.kills,
      coins: this.state.coinsEarned,
      towers: this.state.towersBuilt,
      playMs: this.state.playMs,
    });
  }

  private handleVictory(): void {
    if (!this.state || this.phase !== 'playing') return;
    const livesLeft = this.state.lives;
    const reward = livesLeft * ECONOMY.levelLifeReward;
    this.state.earn(reward);
    saves.recordLevelComplete(this.state.levelId, this.state.difficulty, livesLeft, LEVELS.length);
    const levelId = this.state.levelId;
    if (levelId === LEVELS.length) {
      this.phase = 'campaign-complete';
      this.placement.enabled = false;
      this.ui.showCampaignComplete();
    } else {
      this.phase = 'won';
      this.placement.enabled = false;
      this.ui.showWin({ livesLeft, reward, levelId });
    }
  }

  private handleDefeat(): void {
    if (!this.state || this.phase !== 'playing') return;
    this.placement.enabled = false;
    if (this.state.endless) {
      this.phase = 'endless-over';
      const wave = Math.max(0, this.waveSys.currentWaveNumber - 1);
      const best = saves.recordEndless(this.state.levelId, this.state.difficulty, wave);
      this.ui.showEndlessOver({
        wave,
        kills: this.state.kills,
        coins: this.state.coinsEarned,
        towers: this.state.towersBuilt,
        best,
      });
    } else {
      this.phase = 'lost';
      this.ui.showLose();
    }
  }

  // ------------------------------------------------------------ player actions

  setBuildMode(type: TowerType | null): void {
    if (type && this.state && this.state.coins < TOWERS[type].levels[0].cost) return;
    if (type) {
      this.towerSys.select(null);
      this.ui.towerSelected(null);
    }
    this.placement.setBuildMode(type);
    this.ui.buildModeChanged(type);
  }

  private buildTower(pad: Pad, type: TowerType): void {
    if (!this.state || this.phase !== 'playing') return;
    const def = TOWERS[type];
    if (!this.state.spend(def.levels[0].cost)) return;
    const tower = this.towerSys.build(def, pad);
    this.state.towersBuilt++;
    this.setBuildMode(null);
    this.ui.towerBuilt(tower);
    this.ui.hudChanged();
  }

  upgradeSelected(): void {
    const tower = this.towerSys.selected;
    if (!tower || !this.state || this.phase !== 'playing') return;
    const cost = tower.upgradeCost;
    if (cost === null || !this.state.spend(cost)) return;
    this.towerSys.upgrade(tower);
    this.ui.towerSelected(tower);
    this.ui.hudChanged();
  }

  sellSelected(): void {
    const tower = this.towerSys.selected;
    if (!tower || !this.state || this.phase !== 'playing') return;
    const refund = Math.round(tower.invested * DIFFICULTIES[this.state.difficulty].sellRefund);
    this.state.earn(refund);
    this.towerSys.sell(tower);
    this.ui.towerSelected(null);
    this.ui.hudChanged();
  }

  sellRefundFor(tower: Tower): number {
    if (!this.state) return 0;
    return Math.round(tower.invested * DIFFICULTIES[this.state.difficulty].sellRefund);
  }

  startWave(): void {
    if (this.phase !== 'playing') return;
    const bonus = this.waveSys.startWave();
    if (bonus > 0 && this.state) {
      this.state.earn(bonus);
    }
    this.ui.waveChanged();
    this.ui.hudChanged();
  }

  setPaused(paused: boolean): void {
    if (this.phase === 'playing' || this.phase === 'paused') {
      this.loop.paused = paused;
      this.phase = paused ? 'paused' : 'playing';
      this.rig.enabled = !paused;
    }
  }

  setSpeed(mult: 1 | 2): void {
    this.loop.speed = mult;
  }

  // ------------------------------------------------------------ frame

  private tick(dt: number, rawDt: number): void {
    this.rig.update(rawDt);
    if (this.phase === 'playing' && dt > 0) {
      this.waveSys.update(dt);
      this.enemySys.update(dt, this.rig.camera.quaternion);
      this.towerSys.update(dt);
      this.projectiles.update(dt);
      this.effects.update(dt);
      this.sessionSaveTimer += dt;
      if (this.waveSys.phase === 'prep') this.ui.waveChanged();
      this.ui.hudChanged();
    }
    this.renderer.render(this.scene, this.rig.camera);
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.rig.resize(w, h);
  }

  setShadows(on: boolean): void {
    saves.data.settings.shadows = on;
    saves.save();
    this.renderer.shadowMap.enabled = on;
    // force material refresh
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) if (m) m.needsUpdate = true;
      }
    });
  }
}
