import * as THREE from 'three';
import type { TargetPriority, TowerDef } from '../types';
import { TOWER_RECIPES } from '../config/towers';
import { assets } from '../assets/AssetManager';
import { disposeObject } from '../utils/dispose';
import type { Enemy } from './Enemy';
import type { Pad } from '../levels/LevelBuilder';

const box = new THREE.Box3();

let rangeGeo: THREE.RingGeometry | null = null;
let rangeMat: THREE.MeshBasicMaterial | null = null;

function rangeAssets() {
  if (!rangeGeo) {
    rangeGeo = new THREE.RingGeometry(0.96, 1, 48);
    rangeGeo.rotateX(-Math.PI / 2);
    rangeGeo.userData.shared = true;
    rangeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
    rangeMat.userData.shared = true;
  }
  return { rangeGeo: rangeGeo!, rangeMat: rangeMat! };
}

export class Tower {
  readonly def: TowerDef;
  readonly pad: Pad;
  readonly root: THREE.Group;
  level = 1;
  priority: TargetPriority = 'first';
  invested: number;
  target: Enemy | null = null;
  cooldown = 0;
  /** world position of the muzzle */
  muzzle = new THREE.Vector3();
  private weapon: THREE.Object3D | null = null;
  private bodyGroup: THREE.Group;
  private rangeRing: THREE.Mesh;
  private topY = 0;

  constructor(def: TowerDef, pad: Pad) {
    this.def = def;
    this.pad = pad;
    this.invested = def.levels[0].cost;
    this.root = new THREE.Group();
    this.root.position.set(pad.world.x, 0.1, pad.world.z);
    this.bodyGroup = new THREE.Group();
    this.root.add(this.bodyGroup);

    const { rangeGeo, rangeMat } = rangeAssets();
    this.rangeRing = new THREE.Mesh(rangeGeo, rangeMat);
    this.rangeRing.position.y = 0.14;
    this.rangeRing.visible = false;
    this.root.add(this.rangeRing);

    this.rebuild();
  }

  get stats() {
    return this.def.levels[this.level - 1];
  }

  get upgradeCost(): number | null {
    return this.level < 3 ? this.def.levels[this.level].cost : null;
  }

  rebuild(): void {
    // clear previous pieces
    while (this.bodyGroup.children.length) {
      disposeObject(this.bodyGroup.children[0]);
    }
    const recipe = TOWER_RECIPES[this.def.type];
    let y = 0;
    for (const pieceName of recipe.pieces[this.level - 1]) {
      const piece = assets.getModel(pieceName);
      piece.position.y = y;
      if (recipe.tint && pieceName.includes('crystal')) {
        const tint = new THREE.Color(recipe.tint);
        const seen = new Map<THREE.Material, THREE.Material>();
        piece.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const src = mesh.material as THREE.MeshStandardMaterial;
          if (!seen.has(src)) {
            const m = src.clone() as THREE.MeshStandardMaterial;
            m.userData.shared = false;
            m.emissive = new THREE.Color(recipe.tint!);
            m.emissiveIntensity = 0.45;
            seen.set(src, m);
          }
          mesh.material = seen.get(src)!;
        });
      }
      this.bodyGroup.add(piece);
      box.setFromObject(piece);
      y = box.max.y;
    }
    this.topY = y;
    this.weapon = null;
    if (recipe.weapon) {
      this.weapon = assets.getModel(recipe.weapon);
      this.weapon.position.y = y;
      const s = 1 + (this.level - 1) * 0.12;
      this.weapon.scale.setScalar(s);
      this.bodyGroup.add(this.weapon);
      this.topY = y + 0.35 * s;
    } else {
      this.topY = y + 0.1;
    }
    this.muzzle.set(this.root.position.x, this.root.position.y + this.topY, this.root.position.z);
    this.rangeRing.scale.setScalar(this.stats.range);
    // raycast target for selection
    this.root.traverse((o) => (o.userData.tower = this));
  }

  setSelected(sel: boolean): void {
    this.rangeRing.visible = sel;
  }

  aimAt(enemy: Enemy, dt: number): void {
    if (!this.weapon) return;
    const dx = enemy.position.x - this.root.position.x;
    const dz = enemy.position.z - this.root.position.z;
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - this.weapon.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.weapon.rotation.y += diff * Math.min(1, dt * 12);
  }

  dispose(): void {
    disposeObject(this.root);
  }
}
