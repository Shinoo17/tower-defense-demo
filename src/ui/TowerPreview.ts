import * as THREE from 'three';
import type { TowerType } from '../types';
import { TOWERS } from '../config/towers';
import { createTowerVisual } from '../entities/TowerVisual';

let cache: Map<TowerType, string> | null = null;

export function towerPreviewImages(): Map<TowerType, string> {
  if (cache) return cache;
  cache = new Map();

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(240, 160, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4f0d8, 0x50614c, 2.1));
  const key = new THREE.DirectionalLight(0xffe8b8, 2.7);
  key.position.set(3, 5, 4);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(29, 1.5, 0.1, 30);
  camera.position.set(3.2, 2.8, 4.5);
  camera.lookAt(0, 0.85, 0);

  (Object.keys(TOWERS) as TowerType[]).forEach((type) => {
    const model = createTowerVisual(type);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.position.y += bounds.getSize(new THREE.Vector3()).y * 0.48;
    model.rotation.y = -0.52;
    scene.add(model);
    renderer.render(scene, camera);
    cache!.set(type, renderer.domElement.toDataURL('image/png'));
    scene.remove(model);
  });
  renderer.dispose();
  return cache;
}
