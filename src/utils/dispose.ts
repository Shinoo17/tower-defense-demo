import * as THREE from 'three';

/** Dispose geometries/materials created uniquely for this subtree (shared cache assets excluded via userData.shared). */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh || (obj as THREE.Points).type === 'Points') {
      if (mesh.geometry && !mesh.geometry.userData.shared) mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) {
        if (m && !m.userData.shared) m.dispose();
      }
    }
  });
  root.removeFromParent();
}

/** Mark all geometries/materials in a cached asset subtree as shared so instance disposal skips them. */
export function markShared(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      if (mesh.geometry) mesh.geometry.userData.shared = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const m of mats) if (m) m.userData.shared = true;
    }
  });
}
