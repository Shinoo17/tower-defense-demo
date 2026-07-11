import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { markShared } from '../utils/dispose';

const KENNEY = 'assets/kenney/';
const SKELETONS = 'assets/skeletons/';
const ANIMS = 'assets/anims/';

/** Models loaded up-front at boot (towers, weapons, enemies, shared bits). */
export const CORE_MODELS = [
  'tower-round-base', 'tower-round-bottom-a', 'tower-round-bottom-b', 'tower-round-bottom-c',
  'tower-round-middle-a', 'tower-round-middle-b', 'tower-round-middle-c',
  'tower-round-top-a', 'tower-round-top-b', 'tower-round-crystals',
  'tower-square-bottom-a', 'tower-square-bottom-b', 'tower-square-bottom-c',
  'tower-square-middle-a', 'tower-square-middle-b', 'tower-square-middle-c',
  'tower-square-top-a', 'tower-square-top-b',
  'weapon-ballista', 'weapon-cannon',
  'weapon-ammo-arrow', 'weapon-ammo-cannonball', 'weapon-ammo-bullet',
  'selection-a', 'selection-b', 'spawn-round', 'spawn-square',
];

export const SKELETON_MODELS = ['Skeleton_Minion', 'Skeleton_Rogue', 'Skeleton_Warrior', 'Skeleton_Mage'];
const ANIM_FILES = ['Rig_Medium_General', 'Rig_Medium_MovementBasic'];

function pathFor(name: string): string {
  if (name.startsWith('Skeleton_')) return SKELETONS + name + '.glb';
  if (name.startsWith('Rig_')) return ANIMS + name + '.glb';
  return KENNEY + name + '.glb';
}

export class AssetManager {
  private loader = new GLTFLoader();
  private scenes = new Map<string, THREE.Group>();
  private clips: THREE.AnimationClip[] = [];
  private clipIndex = new Map<string, THREE.AnimationClip>();

  async loadBoot(onProgress: (done: number, total: number) => void): Promise<void> {
    const names = [...CORE_MODELS, ...SKELETON_MODELS, ...ANIM_FILES];
    let done = 0;
    await Promise.all(
      names.map(async (n) => {
        await this.load(n);
        done++;
        onProgress(done, names.length);
      })
    );
  }

  async ensure(names: string[]): Promise<void> {
    const missing = [...new Set(names)].filter((n) => !this.scenes.has(n));
    await Promise.all(missing.map((n) => this.load(n)));
  }

  private async load(name: string): Promise<void> {
    if (this.scenes.has(name)) return;
    const gltf = await this.loader.loadAsync(pathFor(name));
    const scene = gltf.scene as THREE.Group;
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    markShared(scene);
    this.scenes.set(name, scene);
    if (gltf.animations?.length) {
      for (const clip of gltf.animations) {
        this.clips.push(clip);
        if (!this.clipIndex.has(clip.name.toLowerCase())) this.clipIndex.set(clip.name.toLowerCase(), clip);
      }
    }
  }

  has(name: string): boolean {
    return this.scenes.has(name);
  }

  /** Clone for static (non-skinned) models. Shares geometry + materials. */
  getModel(name: string): THREE.Object3D {
    const src = this.scenes.get(name);
    if (!src) throw new Error(`Asset not loaded: ${name}`);
    return src.clone(true);
  }

  /** Clone for skinned models. */
  getSkinned(name: string): THREE.Object3D {
    const src = this.scenes.get(name);
    if (!src) throw new Error(`Asset not loaded: ${name}`);
    return skeletonClone(src);
  }

  /** First clip matching any of the candidate names (case-insensitive); null if none. */
  getClip(candidates: string[]): THREE.AnimationClip | null {
    for (const c of candidates) {
      const clip = this.clipIndex.get(c.toLowerCase());
      if (clip) return clip;
    }
    return null;
  }
}

export const assets = new AssetManager();
