import * as THREE from 'three';
import type { TowerType } from '../types';
import { assets } from '../assets/AssetManager';
import type { Pad } from '../levels/LevelBuilder';
import type { Tower } from '../entities/Tower';
import { disposeObject } from '../utils/dispose';

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
  private hoverPad: Pad | null = null;
  private downPos = { x: 0, y: 0 };

  onBuildRequest: (pad: Pad, type: TowerType) => void = () => {};
  onTowerClicked: (tower: Tower) => void = () => {};
  onEmptyClick: () => void = () => {};
  getRange: (type: TowerType) => number = () => 2;
  enabled = false;

  constructor(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.downPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!this.enabled || e.button !== 0) return;
      const dx = e.clientX - this.downPos.x;
      const dy = e.clientY - this.downPos.y;
      if (dx * dx + dy * dy > 36) return; // was a drag
      this.handleClick(e);
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
    if (this.ghost) {
      disposeObject(this.ghost);
      this.ghost = null;
      this.ghostRing = null;
    }
    if (type) {
      const g = new THREE.Group();
      const marker = assets.getModel('selection-a');
      marker.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          const m = (mesh.material as THREE.Material).clone();
          m.transparent = true;
          m.opacity = 0.8;
          m.userData.shared = false;
          mesh.material = m;
          mesh.castShadow = false;
        }
      });
      g.add(marker);
      const ringGeo = new THREE.RingGeometry(0.97, 1, 48);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x88ff88, transparent: true, opacity: 0.5, depthWrite: false });
      this.ghostRing = new THREE.Mesh(ringGeo, ringMat);
      this.ghostRing.position.y = 0.15;
      g.add(this.ghostRing);
      g.visible = false;
      this.ghost = g;
      this.scene.add(g);
    }
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
    const hits = this.cast(e, this.pads.filter((p) => !p.occupied).map((p) => p.hitMesh));
    if (hits.length) {
      const pad = this.pads[hits[0].object.userData.padIndex];
      this.hoverPad = pad;
      this.ghost.visible = true;
      this.ghost.position.set(pad.world.x, 0.12, pad.world.z);
      if (this.ghostRing && this.buildMode) this.ghostRing.scale.setScalar(this.getRange(this.buildMode));
    } else {
      this.hoverPad = null;
      this.ghost.visible = false;
    }
  }

  private handleClick(e: PointerEvent): void {
    if (this.buildMode) {
      const hits = this.cast(e, this.pads.filter((p) => !p.occupied).map((p) => p.hitMesh));
      if (hits.length) {
        const pad = this.pads[hits[0].object.userData.padIndex];
        this.onBuildRequest(pad, this.buildMode);
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
        o = o.parent;
      }
      break; // only consider closest hit chain
    }
    this.onEmptyClick();
  }

  clear(): void {
    this.setBuildMode(null);
    this.pads = [];
    this.hoverPad = null;
  }
}
