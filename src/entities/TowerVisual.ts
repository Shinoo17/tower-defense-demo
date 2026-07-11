import * as THREE from 'three';
import type { TowerType } from '../types';
import { TOWER_RECIPES } from '../config/towers';
import { assets } from '../assets/AssetManager';

const box = new THREE.Box3();

export function createTowerVisual(type: TowerType, level = 1): THREE.Group {
  const recipe = TOWER_RECIPES[type];
  const group = new THREE.Group();
  let y = 0;

  for (const pieceName of recipe.pieces[level - 1]) {
    const piece = assets.getModel(pieceName);
    piece.position.y = y;
    if (recipe.tint && pieceName.includes('crystal')) tintCrystal(piece, recipe.tint);
    group.add(piece);
    box.setFromObject(piece);
    y = box.max.y;
  }

  if (recipe.weapon) {
    const weapon = assets.getModel(recipe.weapon);
    weapon.position.y = y;
    weapon.scale.setScalar(1 + (level - 1) * 0.12);
    group.add(weapon);
  }
  return group;
}

export function makeGhostMaterial(root: THREE.Object3D, opacity = 0.56): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const ghostMaterials = source.map((material) => {
      const ghost = material.clone();
      ghost.transparent = true;
      ghost.opacity = opacity;
      ghost.depthWrite = false;
      ghost.userData.shared = false;
      return ghost;
    });
    mesh.material = Array.isArray(mesh.material) ? ghostMaterials : ghostMaterials[0];
    mesh.castShadow = false;
  });
}

function tintCrystal(root: THREE.Object3D, tint: number): void {
  const seen = new Map<THREE.Material, THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as THREE.MeshStandardMaterial;
    if (!seen.has(source)) {
      const material = source.clone() as THREE.MeshStandardMaterial;
      material.userData.shared = false;
      material.emissive = new THREE.Color(tint);
      material.emissiveIntensity = 0.45;
      seen.set(source, material);
    }
    mesh.material = seen.get(source)!;
  });
}
