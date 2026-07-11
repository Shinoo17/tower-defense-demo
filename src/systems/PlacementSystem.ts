import * as THREE from 'three';
import type { TowerType } from '../types';
import type { Pad } from '../levels/LevelBuilder';
import type { Tower } from '../entities/Tower';
import { disposeObject } from '../utils/dispose';
import { createTowerVisual, makeGhostMaterial } from '../entities/TowerVisual';
import type { Enemy } from '../entities/Enemy';

/**
 * Handles pointer picking of pads and towers, plus the build-mode ghost preview.
 * Game supplies callbacks for actual build/select actions.
 */
export class PlacementSystem {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private camera: THREE.Camera;
  private canvas: HTMLElement;
  private pads: Pad[] = [];
  private scene: THREE.Scene;

  buildMode: TowerType | null = null;
  private ghost: THREE.Object3D | null = null;
  private ghostRing: THREE.Mesh | null = null;
  private padIndicators: THREE.Mesh[] = [];
  private hoverPad: Pad | null = null;
  private downPos = { x: 0, y: 0 };
  private activeTouches = new Set<number>();
  private gestureCancelled = false;

  onBuildRequest: (pad: Pad, type: TowerType) => void = () => {};
  onTowerClicked: (tower: Tower) => void = () => {};
  onEnemyClicked: (enemy: Enemy) => void = () => {};
  onEmptyClick: () => void = () => {};
  getRange: (type: TowerType) => number = () => 2;
  enabled = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) {
        if (e.pointerType === 'touch') {
          this.activeTouches.add(e.pointerId);
          if (this.activeTouches.size > 1) this.gestureCancelled = true;
        }
        this.downPos = { x: e.clientX, y: e.clientY };
        if (this.enabled && this.buildMode) this.updateGhost(e);
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') this.activeTouches.delete(e.pointerId);
      if (!this.enabled || e.button !== 0) {
        if (this.activeTouches.size === 0) this.gestureCancelled = false;
        return;
      }
      const dx = e.clientX - this.downPos.x;
      const dy = e.clientY - this.downPos.y;
      const wasGesture = this.gestureCancelled || dx * dx + dy * dy > 36;
      if (this.activeTouches.size === 0) this.gestureCancelled = false;
      if (wasGesture) return;
      this.handleClick(e);
    });
    canvas.addEventListener('pointercancel', (e) => {
      this.activeTouches.delete(e.pointerId);
      if (this.activeTouches.size === 0) this.gestureCancelled = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.enabled) return;
      if (this.buildMode) this.updateGhost(e);
    });
  }

  setPads(pads: Pad[]): void {
    this.pads = pads;
  }

  setBuildMode(type: TowerType | null): void {
    this.buildMode = type;
    this.clearPadIndicators();
    if (this.ghost) {
      disposeObject(this.ghost);
      this.ghost = null;
      this.ghostRing = null;
    }
    if (type) {
      const g = new THREE.Group();
      const tower = createTowerVisual(type);
      makeGhostMaterial(tower);
      g.add(tower);
      const ringGeo = new THREE.RingGeometry(0.97, 1, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x88ff88, transparent: true, opacity: 0.5, depthWrite: false });
      this.ghostRing = new THREE.Mesh(ringGeo, ringMat);
      this.ghostRing.position.y = 0.15;
      g.add(this.ghostRing);
      g.visible = false;
      this.ghost = g;
      this.scene.add(g);
      this.showPadIndicators();
    }
  }

  private showPadIndicators(): void {
    for (const pad of this.pads) {
      const geometry = new THREE.RingGeometry(0.34, 0.44, 28);
      geometry.rotateX(-Math.PI / 2);
      const material = new THREE.MeshBasicMaterial({
        color: pad.occupied ? 0xd96959 : 0x80c46a,
        transparent: true,
        opacity: pad.occupied ? 0.62 : 0.78,
        depthWrite: false,
      });
      const indicator = new THREE.Mesh(geometry, material);
      indicator.position.set(pad.world.x, 0.235, pad.world.z);
      this.scene.add(indicator);
      this.padIndicators.push(indicator);
    }
  }

  private clearPadIndicators(): void {
    for (const indicator of this.padIndicators) {
      indicator.geometry.dispose();
      (indicator.material as THREE.Material).dispose();
      indicator.removeFromParent();
    }
    this.padIndicators.length = 0;
  }

  private cast(e: PointerEvent, objects: THREE.Object3D[]): THREE.Intersection[] {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  private updateGhost(e: PointerEvent): void {
    if (!this.ghost) return;
    const hits = this.cast(e, this.pads.map((p) => p.hitMesh));
    if (hits.length) {
      const pad = this.pads[hits[0].object.userData.padIndex];
      this.hoverPad = pad;
      this.ghost.visible = true;
      this.ghost.position.set(pad.world.x, 0.12, pad.world.z);
      if (this.ghostRing && this.buildMode) {
        this.ghostRing.scale.setScalar(this.getRange(this.buildMode));
        (this.ghostRing.material as THREE.MeshBasicMaterial).color.setHex(pad.occupied ? 0xd96959 : 0x88ff88);
      }
    } else {
      this.hoverPad = null;
      this.ghost.visible = false;
    }
  }

  private handleClick(e: PointerEvent): void {
    if (this.buildMode) {
      const hits = this.cast(e, this.pads.map((p) => p.hitMesh));
      if (hits.length) {
        const pad = this.pads[hits[0].object.userData.padIndex];
        if (!pad.occupied) this.onBuildRequest(pad, this.buildMode);
      } else {
        this.onEmptyClick();
      }
      return;
    }
    // tower selection: raycast entire scene, look for userData.tower
    const hits = this.cast(e, [this.scene]);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData.tower) {
          this.onTowerClicked(o.userData.tower as Tower);
          return;
        }
        if (o.userData.enemy) {
          this.onEnemyClicked(o.userData.enemy as Enemy);
          return;
        }
        o = o.parent;
      }
      break; // only consider closest hit chain
    }
    this.onEmptyClick();
  }

  clear(): void {
    this.setBuildMode(null);
    this.clearPadIndicators();
    this.pads = [];
    this.hoverPad = null;
    this.activeTouches.clear();
    this.gestureCancelled = false;
  }
}
