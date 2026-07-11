import * as THREE from 'three';
import type { DamageKind, EnemyType, SpecialRule } from '../types';
import { ENEMIES } from '../config/enemies';
import { Enemy } from '../entities/Enemy';
import type { EffectsSystem } from './EffectsSystem';

export interface SpawnMods {
  hpMul: number;
  speedMul: number;
  rewardMul: number;
}

export class EnemySystem {
  readonly enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private effects: EffectsSystem;
  private paths: THREE.Vector3[][] = [];
  now = 0;
  special: SpecialRule | null = null;
  currentWave = 0;
  onLeak: (enemy: Enemy) => void = () => {};
  onKilled: (enemy: Enemy) => void = () => {};

  constructor(scene: THREE.Scene, effects: EffectsSystem) {
    this.scene = scene;
    this.effects = effects;
  }

  setPaths(paths: THREE.Vector3[][]): void {
    this.paths = paths;
  }

  spawn(type: EnemyType, pathIndex: number, mods: SpawnMods): Enemy {
    const def = ENEMIES[type];
    const path = this.paths[Math.min(pathIndex, this.paths.length - 1)];
    const enemy = new Enemy(def, path, mods.hpMul, mods.speedMul, mods.rewardMul);
    this.enemies.push(enemy);
    this.scene.add(enemy.root);
    this.effects.burst(enemy.position.clone().setY(enemy.position.y + 0.3), 0x9df0a0, { speed: 1, life: 0.4 });
    return enemy;
  }

  get aliveCount(): number {
    return this.enemies.reduce((n, e) => n + (e.state === 'walking' ? 1 : 0), 0);
  }

  damage(enemy: Enemy, amount: number, kind: DamageKind): void {
    if (enemy.state !== 'walking') return;
    enemy.takeDamage(amount, kind);
    if (enemy.hp <= 0) {
      enemy.startDeath();
      this.effects.burst(enemy.position.clone().setY(enemy.position.y + 0.4), 0xf5f0dd, { speed: 2, life: 0.55 });
      this.onKilled(enemy);
    }
  }

  update(dt: number, camQuat: THREE.Quaternion): void {
    this.now += dt;

    // captain aura
    let anyCaptain = false;
    for (const e of this.enemies) {
      e.buffFactor = 1;
      if (e.state === 'walking' && e.def.buffRadius) anyCaptain = true;
    }
    if (anyCaptain) {
      for (const cap of this.enemies) {
        if (cap.state !== 'walking' || !cap.def.buffRadius) continue;
        const r2 = cap.def.buffRadius * cap.def.buffRadius;
        for (const e of this.enemies) {
          if (e === cap || e.state !== 'walking') continue;
          if (e.position.distanceToSquared(cap.position) <= r2) {
            e.buffFactor = Math.max(e.buffFactor, cap.def.buffSpeed ?? 1.1);
          }
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // level-4 fortress boost
      if (
        this.special?.type === 'fortressBoost' &&
        !e.boosted &&
        e.state === 'walking' &&
        this.currentWave >= this.special.fromWave &&
        e.progress >= this.special.atProgress
      ) {
        e.boosted = true;
        e.boostFactor = this.special.boost;
        e.boostUntil = this.now + this.special.duration;
        this.effects.burst(e.position.clone().setY(e.position.y + 0.4), 0xffb347, { speed: 1.2, life: 0.4 });
      }

      const leaked = e.update(dt, this.now, camQuat);
      if (leaked) {
        this.effects.burst(e.position.clone().setY(e.position.y + 0.4), 0xff5555, { speed: 2.2, life: 0.6 });
        this.onLeak(e);
        e.dispose();
        this.enemies.splice(i, 1);
      } else if (e.state === 'dead') {
        e.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const e of this.enemies) e.dispose();
    this.enemies.length = 0;
    this.now = 0;
    this.special = null;
    this.currentWave = 0;
  }
}
