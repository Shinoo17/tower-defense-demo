import * as THREE from 'three';

interface Burst {
  points: THREE.Points;
  mat: THREE.PointsMaterial;
  velocities: Float32Array;
  life: number;
  maxLife: number;
  active: boolean;
}

const PARTICLES = 14;
const MAX_BURSTS = 40;

export class EffectsSystem {
  private scene: THREE.Scene;
  private bursts: Burst[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private getBurst(): Burst | null {
    let b = this.bursts.find((x) => !x.active);
    if (!b) {
      if (this.bursts.length >= MAX_BURSTS) return null;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLES * 3), 3));
      const mat = new THREE.PointsMaterial({
        size: 0.09,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      points.visible = false;
      this.scene.add(points);
      b = { points, mat, velocities: new Float32Array(PARTICLES * 3), life: 0, maxLife: 0, active: false };
      this.bursts.push(b);
    }
    return b;
  }

  burst(pos: THREE.Vector3, color: number, opts: { speed?: number; life?: number; size?: number; up?: number } = {}): void {
    const b = this.getBurst();
    if (!b) return;
    const speed = opts.speed ?? 1.6;
    const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < PARTICLES; i++) {
      attr.setXYZ(i, pos.x, pos.y, pos.z);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const s = speed * (0.4 + Math.random() * 0.6);
      b.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * s;
      b.velocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * s * 0.9 + (opts.up ?? 0.8);
      b.velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * s;
    }
    attr.needsUpdate = true;
    b.mat.color.setHex(color);
    b.mat.size = opts.size ?? 0.09;
    b.mat.opacity = 1;
    b.maxLife = b.life = opts.life ?? 0.5;
    b.active = true;
    b.points.visible = true;
  }

  update(dt: number): void {
    for (const b of this.bursts) {
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) {
        b.active = false;
        b.points.visible = false;
        continue;
      }
      const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLES; i++) {
        b.velocities[i * 3 + 1] -= 4.5 * dt;
        attr.setXYZ(
          i,
          attr.getX(i) + b.velocities[i * 3] * dt,
          Math.max(0.05, attr.getY(i) + b.velocities[i * 3 + 1] * dt),
          attr.getZ(i) + b.velocities[i * 3 + 2] * dt
        );
      }
      attr.needsUpdate = true;
      b.mat.opacity = b.life / b.maxLife;
    }
  }

  clear(): void {
    for (const b of this.bursts) {
      b.active = false;
      b.points.visible = false;
    }
  }

  dispose(): void {
    for (const b of this.bursts) {
      b.points.geometry.dispose();
      b.mat.dispose();
      b.points.removeFromParent();
    }
    this.bursts.length = 0;
  }
}
