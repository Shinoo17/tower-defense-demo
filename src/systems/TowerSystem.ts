import * as THREE from 'three';
import type { TowerDef } from '../types';
import { frostSlow } from '../config/towers';
import { Tower } from '../entities/Tower';
import type { Pad } from '../levels/LevelBuilder';
import type { Enemy } from '../entities/Enemy';
import type { EnemySystem } from './EnemySystem';
import type { ProjectileSystem, ProjectileHit } from './ProjectileSystem';
import type { EffectsSystem } from './EffectsSystem';

export class TowerSystem {
  readonly towers: Tower[] = [];
  private scene: THREE.Scene;
  private enemySys: EnemySystem;
  private projectiles: ProjectileSystem;
  private effects: EffectsSystem;
  private targetLine: THREE.Line;
  private targetLineGeo: THREE.BufferGeometry;
  selected: Tower | null = null;
  onTowerFired: () => void = () => {};

  constructor(scene: THREE.Scene, enemySys: EnemySystem, projectiles: ProjectileSystem, effects: EffectsSystem) {
    this.scene = scene;
    this.enemySys = enemySys;
    this.projectiles = projectiles;
    this.effects = effects;
    projectiles.onHit = (hit) => this.resolveHit(hit);

    this.targetLineGeo = new THREE.BufferGeometry();
    this.targetLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const mat = new THREE.LineBasicMaterial({ color: 0xffdd55, transparent: true, opacity: 0.85 });
    this.targetLine = new THREE.Line(this.targetLineGeo, mat);
    this.targetLine.visible = false;
    this.targetLine.frustumCulled = false;
    scene.add(this.targetLine);
  }

  build(def: TowerDef, pad: Pad): Tower {
    const tower = new Tower(def, pad);
    pad.occupied = true;
    this.towers.push(tower);
    this.scene.add(tower.root);
    this.effects.burst(tower.muzzle, 0xffffff, { speed: 1.4, life: 0.4 });
    return tower;
  }

  upgrade(tower: Tower): void {
    tower.level++;
    tower.invested += tower.def.levels[tower.level - 1].cost;
    tower.rebuild();
    this.effects.burst(tower.muzzle, 0xffe066, { speed: 1.8, life: 0.5 });
  }

  sell(tower: Tower): void {
    tower.pad.occupied = false;
    if (this.selected === tower) this.select(null);
    const i = this.towers.indexOf(tower);
    if (i >= 0) this.towers.splice(i, 1);
    this.effects.burst(tower.muzzle, 0xcccccc, { speed: 1.2, life: 0.4 });
    tower.dispose();
  }

  select(tower: Tower | null): void {
    if (this.selected) this.selected.setSelected(false);
    this.selected = tower;
    if (tower) tower.setSelected(true);
    else this.targetLine.visible = false;
  }

  private acquireTarget(tower: Tower): Enemy | null {
    const r2 = tower.stats.range * tower.stats.range;
    let best: Enemy | null = null;
    let bestKey = -Infinity;
    for (const e of this.enemySys.enemies) {
      if (e.state !== 'walking') continue;
      if (e.position.distanceToSquared(tower.root.position) > r2) continue;
      let k: number;
      switch (tower.priority) {
        case 'first':
          k = e.dist;
          break;
        case 'last':
          k = -e.dist;
          break;
        case 'strong':
          k = e.hp;
          break;
      }
      if (k > bestKey) {
        bestKey = k;
        best = e;
      }
    }
    return best;
  }

  private resolveHit(hit: ProjectileHit): void {
    const def = hit.tower.def;
    const dmg = hit.tower.stats.damage;
    if (def.aoeRadius) {
      const r2 = def.aoeRadius * def.aoeRadius;
      for (const e of [...this.enemySys.enemies]) {
        if (e.state !== 'walking') continue;
        if (e.position.distanceToSquared(hit.impact) <= r2) {
          this.enemySys.damage(e, dmg, def.kind);
        }
      }
      this.effects.burst(hit.impact, 0xff9944, { speed: 2.6, life: 0.55, size: 0.12 });
      return;
    }
    const target = hit.target;
    if (!target || target.state !== 'walking') return;
    this.enemySys.damage(target, dmg, def.kind);
    if (def.slowPct && target.state === 'walking') {
      const slow = frostSlow(hit.tower.level);
      target.applySlow(slow.pct, slow.duration, this.enemySys.now);
      this.effects.burst(hit.impact, 0x99ddff, { speed: 1.2, life: 0.45 });
    } else if (def.type === 'arcane') {
      this.effects.burst(hit.impact, 0xcc77ff, { speed: 1.8, life: 0.5 });
    } else {
      this.effects.burst(hit.impact, 0xffeeaa, { speed: 1, life: 0.3 });
    }
  }

  update(dt: number): void {
    for (const tower of this.towers) {
      tower.cooldown -= dt;
      // validate current target
      if (tower.target) {
        const t = tower.target;
        const r2 = tower.stats.range * tower.stats.range;
        if (t.state !== 'walking' || t.position.distanceToSquared(tower.root.position) > r2) {
          tower.target = null;
        }
      }
      if (!tower.target) tower.target = this.acquireTarget(tower);
      if (tower.target) {
        tower.aimAt(tower.target, dt);
        if (tower.cooldown <= 0) {
          tower.cooldown = 1 / tower.stats.rate;
          this.projectiles.fire(tower, tower.target);
          this.onTowerFired();
        }
      }
    }

    // targeting feedback for selected tower
    if (this.selected && this.selected.target && this.selected.target.state === 'walking') {
      const attr = this.targetLineGeo.getAttribute('position') as THREE.BufferAttribute;
      const m = this.selected.muzzle;
      const p = this.selected.target.position;
      attr.setXYZ(0, m.x, m.y, m.z);
      attr.setXYZ(1, p.x, p.y + 0.3, p.z);
      attr.needsUpdate = true;
      this.targetLine.visible = true;
    } else {
      this.targetLine.visible = false;
    }
  }

  clear(): void {
    this.select(null);
    for (const t of this.towers) {
      t.pad.occupied = false;
      t.dispose();
    }
    this.towers.length = 0;
  }
}
