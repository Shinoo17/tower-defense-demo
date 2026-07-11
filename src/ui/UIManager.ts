import type { Game, GameUI } from '../app/Game';
import type { LevelDef, TowerType } from '../types';
import { LEVELS } from '../config/levels';
import { saves } from '../systems/SaveSystem';
import type { Tower } from '../entities/Tower';
import { MainMenu } from './MainMenu';
import { LevelSelect } from './LevelSelect';
import { HUD } from './HUD';
import { Overlays } from './Overlays';
import { Tutorial } from './Tutorial';
import { el } from '../utils/dom';
import type { Enemy } from '../entities/Enemy';

export class UIManager implements GameUI {
  private game: Game;
  private menu: MainMenu;
  private levelSelect: LevelSelect;
  private hud: HUD;
  private overlays: Overlays;
  private tutorial: Tutorial;
  private root: HTMLElement;
  private loadingScreen: HTMLElement;

  constructor(game: Game) {
    this.game = game;
    this.root = el('div', 'ui-root');
    document.body.appendChild(this.root);

    this.menu = new MainMenu(this.root);
    this.levelSelect = new LevelSelect(this.root, () => this.menu.difficulty);
    this.hud = new HUD(this.root, game);
    this.overlays = new Overlays(this.root);
    this.tutorial = new Tutorial(this.root);
    this.loadingScreen = el(
      'div',
      'level-loading hidden',
      '<div class="level-loading-mark"></div><strong>Preparing the battlefield</strong><span>Setting towers and opening the roads...</span>'
    );
    this.root.appendChild(this.loadingScreen);

    this.wire();
    game.ui = this;
    this.showMenu();
  }

  private wire(): void {
    this.menu.onPlayCampaign = () => {
      this.menu.hide();
      this.levelSelect.show(false);
    };
    this.menu.onEndless = () => {
      this.menu.hide();
      this.levelSelect.show(true);
    };
    this.menu.onContinue = () => {
      this.menu.hide();
      const next = Math.min(saves.data.highestUnlocked, LEVELS.length);
      this.launchLevel(next, false);
    };
    this.menu.onSettings = () => this.overlays.showSettings(false);

    this.levelSelect.onBack = () => {
      this.levelSelect.hide();
      this.showMenu();
    };
    this.levelSelect.onPick = (levelId, endless) => {
      this.levelSelect.hide();
      this.launchLevel(levelId, endless);
    };

    this.hud.onPause = () => {
      this.game.setPaused(true);
      this.overlays.showPause();
    };

    this.overlays.onResume = () => {
      this.overlays.closeAll();
      this.game.setPaused(false);
    };
    this.overlays.onRestart = () => {
      this.overlays.closeAll();
      this.game.setPaused(false);
      this.game.restartLevel();
    };
    this.overlays.onMainMenu = () => {
      this.overlays.closeAll();
      this.game.setPaused(false);
      this.game.quitToMenu();
      this.hud.hide();
      this.showMenu();
    };
    this.overlays.onNextLevel = () => {
      if (!this.game.state) return;
      const next = Math.min(this.game.state.levelId + 1, LEVELS.length);
      this.overlays.closeAll();
      void this.game.startLevel(next, this.menu.difficulty, false);
    };
    this.overlays.onReplayCampaign = () => {
      this.overlays.closeAll();
      void this.game.startLevel(1, this.menu.difficulty, false);
    };
    this.overlays.onSelectLevel = () => {
      this.overlays.closeAll();
      this.game.quitToMenu();
      this.hud.hide();
      this.levelSelect.show(false);
    };
    this.overlays.onPlayEndless = () => {
      this.overlays.closeAll();
      this.game.quitToMenu();
      this.hud.hide();
      this.levelSelect.show(true);
    };
    this.overlays.onReplayEndless = () => {
      this.overlays.closeAll();
      this.game.restartLevel();
    };
    this.overlays.onShadowsChanged = (on) => this.game.setShadows(on);

    // ESC toggles pause during play
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (this.game.phase === 'playing') {
        if (this.game.placement.buildMode) {
          this.game.setBuildMode(null);
        } else if (this.game.towerSys.selected) {
          this.game.towerSys.select(null);
          this.towerSelected(null);
        } else {
          this.game.setPaused(true);
          this.overlays.showPause();
        }
      } else if (this.game.phase === 'paused') {
        this.overlays.closeAll();
        this.game.setPaused(false);
      }
    });
  }

  private showMenu(): void {
    this.menu.show();
    void this.game.showMenuScene();
  }

  private launchLevel(levelId: number, endless: boolean): void {
    this.loadingScreen.classList.remove('hidden');
    void this.game.startLevel(levelId, this.menu.difficulty, endless).catch((error) => {
      console.error('Failed to prepare level', error);
      this.loadingScreen.innerHTML = '<strong>Could not prepare the battlefield</strong><span>Please return to the menu and try again.</span>';
    });
  }

  // ------------------------------------------------------------ GameUI impl
  hudChanged(): void {
    this.hud.updateStats();
  }

  waveChanged(): void {
    this.hud.updateWavePanel();
  }

  towerSelected(tower: Tower | null): void {
    this.hud.showTower(tower);
    if (tower) this.tutorial.onTowerSelected();
  }

  enemySelected(enemy: Enemy | null): void {
    this.hud.showEnemy(enemy);
  }

  buildModeChanged(type: TowerType | null): void {
    this.hud.setBuildMode(type);
    if (type) this.tutorial.onBuildModeSet();
  }

  showWin(stats: { livesLeft: number; reward: number; levelId: number }): void {
    this.overlays.showWin(stats);
  }

  showLose(): void {
    this.overlays.showLose();
  }

  showCampaignComplete(): void {
    this.overlays.showCampaignComplete();
  }

  showEndlessOver(stats: { wave: number; kills: number; coins: number; towers: number; best: number }): void {
    this.overlays.showEndlessOver(stats);
  }

  levelLoaded(def: LevelDef): void {
    this.loadingScreen.classList.add('hidden');
    this.menu.hide();
    this.levelSelect.hide();
    this.hud.show();
    this.hud.updateStats();
    this.hud.updateWavePanel();
    const isEndless = !!this.game.state?.endless;
    this.overlays.showLevelIntro(
      isEndless ? `${def.name}: Endless` : `Level ${def.id}: ${def.name}`,
      isEndless
        ? 'Infinite waves of skeletons, growing stronger every wave. A boss arrives every fifth wave. How long can you hold?'
        : def.intro,
      () => {
        if (def.id === 1 && !isEndless) this.tutorial.start();
      }
    );
  }

  waveStarted(n: number): void {
    this.tutorial.onWaveStarted(n);
  }

  waveCompleted(n: number): void {
    this.tutorial.onWaveCompleted(n);
  }

  towerBuilt(tower: Tower): void {
    this.tutorial.onTowerBuilt();
  }
}
