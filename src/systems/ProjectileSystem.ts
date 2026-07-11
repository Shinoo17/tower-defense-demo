import * as THREE from 'three';
import { assets } from '../assets/AssetManager';
import type { Enemy } from '../entities/Enemy';
import type { Tower } from '../entities/Tower';

export interface ProjectileHit {
  tower: Tower;
  target: Enemy | null;
  impact: THREE.Vector3;
}

interface Projectile {
  mesh: THREE.Object3D;
  modelKey: string;
  active: boolean;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  arc: boolean;
  tower: Tower;
  target: Enemy | null;
}

const TINTS: Record<string, number> = {
  frost: 0x55ccff,
  arcane: 0xcc66ff,
};

export class ProjectileSystem {
  private scene: THREE.Scene;
  private pool: Projectile[] = [];
  private tintedMats = new Map<string, THREE.Material>();
  onHit: (hit: ProjectileHit) => void = () => {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private modelKeyFor(tower: Tower): string {
    return tower.def.projectile + (TINTS[tower.def.type] !== undefined ? ':' + tower.def.type : '');
  }

  private createMesh(tower: Tower, key: string): THREE.Object3D {
    const obj = assets.getModel(tower.def.projectile);
    const tint = TINTS[tower.def.type];
    if (tint !== undefined) {
      let mat = this.tintedMats.get(key);
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (!mat) {
          mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(tint);
          (mat as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
          mat.userData.shared = true;
          this.tintedMats.set(key, mat);
        }
        mesh.material = mat;
        mesh.castShadow = false;
      });
      obj.scale.setScalar(tower.def.type === 'arcane' ? 1.6 : 1.1);
    } else {
      obj.traverse((o) => ((o as THREE.Mesh).castShadow = false));
    }
    return obj;
  }

  fire(tower: Tower, target: Enemy): void {
    const key = this.modelKeyFor(tower);
    let p = this.pool.find((x) => !x.active && x.modelKey === key);
    if (!p) {
      const mesh = this.createMesh(tower, key);
      this.scene.add(mesh);
      p = {
        mesh,
        modelKey: key,
        active: false,
        from: new THREE.Vector3(),
        to: new THREE.Vector3(),
        t: 0,
        duration: 1,
        arc: false,
        tower,
        target: null,
      };
      this.pool.push(p);
    }
    p.active = true;
    p.mesh.visible = true;
    p.tower = tower;
    p.target = target;
    p.from.copy(tower.muzzle);
    p.to.copy(target.position).setY(target.position.y + 0.3);
    p.t = 0;
    p.arc = tower.def.arc;
    const dist = p.from.distanceTo(p.to);
    p.duration = Math.max(0.08, dist / tower.def.projectileSpeed);
    p.mesh.position.copy(p.from);
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      // home in on living targets
      if (p.target && p.target.state === 'walking') {
        p.to.copy(p.target.position).setY(p.target.position.y + 0.3);
      }
      p.t += dt / p.duration;
      if (p.t >= 1) {
        p.active = false;
        p.mesh.visible = false;
        this.onHit({ tower: p.tower, target: p.target, impact: p.to.clone() });
        continue;
      }
      p.mesh.position.lerpVectors(p.from, p.to, p.t);
      if (p.arc) {
        const h = p.from.distanceTo(p.to) * 0.35;
        p.mesh.position.y += Math.sin(p.t * Math.PI) * h;
      }
      p.mesh.lookAt(p.to);
      p.mesh.rotateX(Math.PI / 2);
    }
  }

  clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  dispose(): void {
    for (const p of this.pool) p.mesh.removeFromParent();
    for (const m of this.tintedMats.values()) m.dispose();
    this.tintedMats.clear();
    this.pool.length = 0;
  }
}
