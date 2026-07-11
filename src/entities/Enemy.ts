import * as THREE from 'three';
import type { EnemyDef } from '../types';
import { assets } from '../assets/AssetManager';
import { disposeObject } from '../utils/dispose';

const HEALTHBAR_W = 0.6;

let barBgMat: THREE.MeshBasicMaterial | null = null;
let barFillMat: THREE.MeshBasicMaterial | null = null;
let barGeo: THREE.PlaneGeometry | null = null;

function barMats() {
  if (!barBgMat) {
    barBgMat = new THREE.MeshBasicMaterial({ color: 0x222222, depthTest: false, transparent: true, opacity: 0.75 });
    barBgMat.userData.shared = true;
    barFillMat = new THREE.MeshBasicMaterial({ color: 0x55e05a, depthTest: false, transparent: true, opacity: 0.95 });
    barFillMat.userData.shared = true;
    barGeo = new THREE.PlaneGeometry(HEALTHBAR_W, 0.07);
    barGeo.userData.shared = true;
  }
  return { barBgMat: barBgMat!, barFillMat: barFillMat!, barGeo: barGeo! };
}

export type EnemyState = 'walking' | 'dying' | 'dead' | 'leaked';

let nextId = 1;

export class Enemy {
  readonly id = nextId++;
  readonly def: EnemyDef;
  readonly root: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly maxHp: number;
  hp: number;
  reward: number;
  speedBase: number;
  state: EnemyState = 'walking';

  /** distance travelled along path */
  dist = 0;
  readonly path: THREE.Vector3[];
  readonly pathLength: number;
  private segLengths: number[] = [];
  private segIndex = 0;
  /** cumulative path length before current segment */
  private segStart = 0;

  slowUntil = 0;
  slowFactor = 1;
  buffFactor = 1;
  boostUntil = 0;
  boostFactor = 1;
  /** level-4 fortress speed boost already applied */
  boosted = false;

  private deathTimer = 0;
  private bar: THREE.Group | null = null;
  private barFill: THREE.Mesh | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private yaw = 0;
  private tmpDir = new THREE.Vector3();

  constructor(def: EnemyDef, path: THREE.Vector3[], hpMul: number, speedMul: number, rewardMul: number) {
    this.def = def;
    this.path = path;
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    this.reward = Math.max(1, Math.round(def.reward * rewardMul));
    this.speedBase = def.speed * speedMul;

    let total = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const l = path[i].distanceTo(path[i + 1]);
      this.segLengths.push(l);
      total += l;
    }
    this.pathLength = total;

    this.root = assets.getSkinned(def.model);
    this.root.scale.setScalar(def.scale);
    this.root.position.copy(path[0]);
    if (def.tint) {
      const tint = new THREE.Color(def.tint);
      const seen = new Map<THREE.Material, THREE.Material>();
      this.root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const src = mesh.material as THREE.MeshStandardMaterial;
        if (!seen.has(src)) {
          const m = src.clone();
          m.userData.shared = false;
          (m as THREE.MeshStandardMaterial).color.multiply(tint);
          seen.set(src, m);
        }
        mesh.material = seen.get(src)!;
      });
    }

    this.mixer = new THREE.AnimationMixer(this.root);
    const walkClip = assets.getClip(def.walkClips);
    if (walkClip) {
      this.walkAction = this.mixer.clipAction(walkClip);
      this.walkAction.timeScale = def.animSpeedScale * (0.7 + this.speedBase * 0.45);
      this.walkAction.time = Math.random() * walkClip.duration;
      this.walkAction.play();
    }
  }

  get progress(): number {
    return this.dist / this.pathLength;
  }

  get position(): THREE.Vector3 {
    return this.root.position;
  }

  currentSpeed(now: number): number {
    let s = this.speedBase * this.buffFactor;
    if (now < this.slowUntil) s *= this.slowFactor;
    if (now < this.boostUntil) s *= this.boostFactor;
    return s;
  }

  applySlow(pct: number, duration: number, now: number): void {
    this.slowFactor = Math.min(now < this.slowUntil ? this.slowFactor : 1, 1 - pct);
    this.slowUntil = Math.max(this.slowUntil, now + duration);
  }

  /** returns actual damage dealt */
  takeDamage(amount: number, kind: 'physical' | 'magic'): number {
    if (this.state !== 'walking') return 0;
    const mult = kind === 'physical' ? 1 - this.def.armor : 1;
    const dmg = Math.max(1, Math.round(amount * mult));
    this.hp -= dmg;
    this.updateBar();
    return dmg;
  }

  startDeath(): void {
    this.state = 'dying';
    this.walkAction?.stop();
    const clip = assets.getClip(this.def.deathClips);
    if (clip) {
      const action = this.mixer.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1.4;
      action.play();
      this.deathTimer = Math.min(clip.duration / 1.4, 1.1);
    } else {
      this.deathTimer = 0.3;
    }
    if (this.bar) this.bar.visible = false;
  }

  private updateBar(): void {
    if (!this.bar) {
      const { barBgMat, barFillMat, barGeo } = barMats();
      this.bar = new THREE.Group();
      const bg = new THREE.Mesh(barGeo, barBgMat);
      this.barFill = new THREE.Mesh(barGeo, barFillMat);
      this.barFill.position.z = 0.001;
      this.bar.add(bg, this.barFill);
      this.bar.position.y = 1.35 + 0.35 / this.def.scale;
      this.bar.renderOrder = 10;
      this.root.add(this.bar);
      // undo parent scale so bar size is consistent
      this.bar.scale.setScalar(1 / this.def.scale);
    }
    const f = Math.max(0, this.hp / this.maxHp);
    this.barFill!.scale.x = f;
    this.barFill!.position.x = (-(1 - f) * HEALTHBAR_W) / 2;
    const mat = this.barFill!.material as THREE.MeshBasicMaterial;
    // shared material: color set globally is fine (green->red gradient would need per-enemy mat; keep green)
    void mat;
  }

  /** advance along path; returns true if reached the end */
  update(dt: number, now: number, camQuat: THREE.Quaternion): boolean {
    this.mixer.update(dt);
    if (this.state === 'dying') {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0) this.state = 'dead';
      return false;
    }
    if (this.state !== 'walking') return false;

    this.dist += this.currentSpeed(now) * dt;
    if (this.dist >= this.pathLength) {
      this.state = 'leaked';
      return true;
    }
    // find segment (dist is monotonic, so only ever advance)
    let d = this.dist - this.segStart;
    while (this.segIndex < this.segLengths.length - 1 && d > this.segLengths[this.segIndex]) {
      d -= this.segLengths[this.segIndex];
      this.segStart += this.segLengths[this.segIndex];
      this.segIndex++;
    }
    if (d > this.segLengths[this.segIndex]) d = this.segLengths[this.segIndex];
    const a = this.path[this.segIndex];
    const b = this.path[this.segIndex + 1];
    const t = this.segLengths[this.segIndex] > 0 ? d / this.segLengths[this.segIndex] : 1;
    this.root.position.lerpVectors(a, b, t);

    // smooth rotation toward direction
    this.tmpDir.subVectors(b, a);
    const targetYaw = Math.atan2(this.tmpDir.x, this.tmpDir.z);
    let diff = targetYaw - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += diff * Math.min(1, dt * 10);
    this.root.rotation.y = this.yaw;

    if (this.bar && this.bar.visible) {
      // counter parent yaw so the bar faces the camera
      this.bar.quaternion.copy(this.root.quaternion).invert().multiply(camQuat);
    }
    return false;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    disposeObject(this.root);
  }
}
