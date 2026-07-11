import * as THREE from 'three';
import { clamp, damp } from '../utils/math';

const OFFSET_DIR = new THREE.Vector3(0.42, 1.0, 0.75).normalize();
const MIN_ZOOM = 7;
const MAX_ZOOM = 22;

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private target = new THREE.Vector3();
  private desiredTarget = new THREE.Vector3();
  private zoom = 14;
  private desiredZoom = 14;
  private bounds = { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private keys = new Set<string>();
  /** temporary focus override (boss intro) */
  private focus: THREE.Vector3 | null = null;
  private focusTimer = 0;
  private el: HTMLElement;
  private tmp = new THREE.Vector3();
  enabled = true;

  constructor(el: HTMLElement) {
    this.el = el;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.applyImmediate();

    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.pointers.size === 1) {
          this.lastPointer = { x: e.clientX, y: e.clientY };
        } else if (this.pointers.size === 2) {
          this.pinchDistance = this.touchDistance();
        }
        el.setPointerCapture(e.pointerId);
      } else if (e.button === 1 || e.button === 2) {
        this.dragging = true;
        this.lastPointer = { x: e.clientX, y: e.clientY };
        el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && this.pointers.has(e.pointerId)) {
        const previous = this.pointers.get(e.pointerId)!;
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (!this.enabled) return;
        if (this.pointers.size === 2) {
          const distance = this.touchDistance();
          if (this.pinchDistance > 0) {
            this.desiredZoom = clamp(
              this.desiredZoom - (distance - this.pinchDistance) * 0.025,
              MIN_ZOOM,
              MAX_ZOOM
            );
          }
          this.pinchDistance = distance;
        } else if (this.pointers.size === 1) {
          const dx = e.clientX - previous.x;
          const dy = e.clientY - previous.y;
          if (Math.abs(dx) + Math.abs(dy) > 1.5) this.panByScreen(dx * 0.72, dy * 0.72);
        }
        return;
      }
      if (!this.dragging || !this.enabled) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.panByScreen(dx, dy);
    });
    const stop = (e: PointerEvent) => {
      this.dragging = false;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinchDistance = 0;
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.desiredZoom = clamp(this.desiredZoom + e.deltaY * 0.012, MIN_ZOOM, MAX_ZOOM);
      },
      { passive: false }
    );
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  private touchDistance(): number {
    const points = [...this.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }

  private panByScreen(dx: number, dy: number): void {
    // screen right = camera right projected on XZ; screen up = camera forward on XZ
    const scale = this.zoom * 0.0016;
    const right = this.tmp.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();
    this.desiredTarget.addScaledVector(right, -dx * scale);
    const fwd = this.tmp.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    fwd.y = 0;
    fwd.normalize();
    this.desiredTarget.addScaledVector(fwd, dy * scale);
    this.clampTarget();
  }

  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.bounds = { minX, maxX, minZ, maxZ };
    this.clampTarget();
  }

  setView(center: THREE.Vector3, zoom: number, immediate = false): void {
    this.desiredTarget.copy(center);
    this.desiredZoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.clampTarget();
    if (immediate) this.applyImmediate();
  }

  focusOn(point: THREE.Vector3, seconds: number): void {
    this.focus = point.clone();
    this.focusTimer = seconds;
  }

  private clampTarget(): void {
    this.desiredTarget.x = clamp(this.desiredTarget.x, this.bounds.minX, this.bounds.maxX);
    this.desiredTarget.z = clamp(this.desiredTarget.z, this.bounds.minZ, this.bounds.maxZ);
    this.desiredTarget.y = 0;
  }

  private applyImmediate(): void {
    this.target.copy(this.desiredTarget);
    this.zoom = this.desiredZoom;
    this.updateCamera();
  }

  private updateCamera(): void {
    const goal = this.focus ?? this.target;
    this.camera.position.copy(goal).addScaledVector(OFFSET_DIR, this.zoom);
    this.camera.lookAt(goal.x, goal.y, goal.z);
  }

  update(dt: number): void {
    if (this.enabled && !this.focus) {
      const spd = this.zoom * 0.9 * dt;
      if (this.keys.has('arrowleft') || this.keys.has('a')) this.panByScreen(spd * 400 * 0.016, 0);
      if (this.keys.has('arrowright') || this.keys.has('d')) this.panByScreen(-spd * 400 * 0.016, 0);
      if (this.keys.has('arrowup') || this.keys.has('w')) this.panByScreen(0, spd * 400 * 0.016);
      if (this.keys.has('arrowdown') || this.keys.has('s')) this.panByScreen(0, -spd * 400 * 0.016);
    }
    if (this.focus && (this.focusTimer -= dt) <= 0) this.focus = null;
    const k = damp(6, dt);
    this.target.lerp(this.desiredTarget, k);
    this.zoom += (this.desiredZoom - this.zoom) * k;
    this.updateCamera();
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
