import * as THREE from 'three';
import type { LevelDef, Vec2 } from '../types';
import { assets } from '../assets/AssetManager';
import { expandCells, key } from '../utils/math';
import { disposeObject } from '../utils/dispose';

// direction bits
const N = 1, E = 2, S = 4, W = 8;

/** rotate mask one quarter turn CCW (rotation.y += PI/2): S->E->N->W->S */
function rot1(m: number): number {
  return ((m & N) ? W : 0) | ((m & W) ? S : 0) | ((m & S) ? E : 0) | ((m & E) ? N : 0);
}

/** base connection masks of Kenney tiles at rotation 0 (measured from geometry) */
const BASE_MASK: Record<string, number> = {
  'tile-straight': N | S,
  'tile-corner-round': E | S,
  'tile-split': E | S | W,
  'tile-crossing': N | E | S | W,
  'tile-end-round': S,
  'tile-spawn-end-round': S,
  'tile-river-straight': N | S,
  'tile-river-corner': E | S,
  'tile-river-waterfall': S,
  'tile-river-bridge': N | S, // road axis; river runs E-W
};

function tileFor(mask: number): { model: string; r: number } {
  const candidates = ['tile-end-round', 'tile-straight', 'tile-corner-round', 'tile-split', 'tile-crossing'];
  return matchTile(mask, candidates);
}

function riverTileFor(mask: number): { model: string; r: number } {
  const candidates = ['tile-river-waterfall', 'tile-river-straight', 'tile-river-corner'];
  return matchTile(mask, candidates);
}

function matchTile(mask: number, candidates: string[]): { model: string; r: number } {
  for (const model of candidates) {
    let m = BASE_MASK[model];
    for (let r = 0; r < 4; r++) {
      if (m === mask) return { model, r };
      m = rot1(m);
    }
  }
  // fallback: straight
  return { model: 'tile-straight', r: 0 };
}

function rotationFor(model: string, mask: number): number {
  let m = BASE_MASK[model];
  for (let r = 0; r < 4; r++) {
    if (m === mask) return r;
    m = rot1(m);
  }
  return 0;
}

export interface Pad {
  index: number;
  x: number;
  z: number;
  world: THREE.Vector3;
  hitMesh: THREE.Mesh;
  baseMesh: THREE.Object3D;
  occupied: boolean;
}

export interface BuiltLevel {
  group: THREE.Group;
  worldPaths: THREE.Vector3[][];
  pathLengths: number[];
  pads: Pad[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  center: THREE.Vector3;
  toWorld: (x: number, z: number) => THREE.Vector3;
  dispose: () => void;
}

const ROAD_Y = 0.2;

export async function buildLevel(def: LevelDef): Promise<BuiltLevel> {
  const themed = (name: string) => (def.theme === 'snow' ? `snow-${name}` : name);
  const offX = (def.gridW - 1) / 2;
  const offZ = (def.gridH - 1) / 2;
  const toWorld = (x: number, z: number) => new THREE.Vector3(x - offX, 0, z - offZ);

  // --- expand paths and rivers into cells, build connection graphs
  const pathCells = def.paths.map((p) => expandCells(p));
  const riverCells = (def.rivers ?? []).map((r) => expandCells(r));

  const roadMask = new Map<string, number>();
  const riverMask = new Map<string, number>();
  const starts = new Set<string>();
  const ends = new Set<string>();

  const addConn = (map: Map<string, number>, a: Vec2, b: Vec2) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const dirAB = dx === 1 ? E : dx === -1 ? W : dz === 1 ? S : N;
    const dirBA = dx === 1 ? W : dx === -1 ? E : dz === 1 ? N : S;
    map.set(key(a.x, a.z), (map.get(key(a.x, a.z)) ?? 0) | dirAB);
    map.set(key(b.x, b.z), (map.get(key(b.x, b.z)) ?? 0) | dirBA);
  };

  for (const cells of pathCells) {
    for (let i = 0; i < cells.length - 1; i++) addConn(roadMask, cells[i], cells[i + 1]);
    starts.add(key(cells[0].x, cells[0].z));
    ends.add(key(cells[cells.length - 1].x, cells[cells.length - 1].z));
  }
  for (const cells of riverCells) {
    for (let i = 0; i < cells.length - 1; i++) addConn(riverMask, cells[i], cells[i + 1]);
  }

  // --- decide model per cell
  interface Placement { model: string; r: number; x: number; z: number; s?: number }
  const placements: Placement[] = [];
  const covered = new Set<string>();

  for (const [k, mask] of roadMask) {
    const [x, z] = k.split(',').map(Number);
    covered.add(k);
    if (riverMask.has(k)) {
      // bridge: orient road axis
      placements.push({ model: 'tile-river-bridge', r: rotationFor('tile-river-bridge', mask), x, z });
    } else if (starts.has(k)) {
      placements.push({ model: 'tile-spawn-end-round', r: rotationFor('tile-spawn-end-round', mask), x, z });
    } else if (ends.has(k)) {
      placements.push({ model: 'tile-end-round', r: rotationFor('tile-end-round', mask), x, z });
    } else {
      const t = tileFor(mask);
      placements.push({ model: t.model, r: t.r, x, z });
    }
  }
  for (const [k, mask] of riverMask) {
    if (covered.has(k)) continue;
    covered.add(k);
    const [rx, rz] = k.split(',').map(Number);
    const t = riverTileFor(mask);
    placements.push({ model: t.model, r: t.r, x: rx, z: rz });
  }

  // pads occupy a plain tile + tower base
  const padSet = new Set(def.pads.map((p) => key(p.x, p.z)));
  for (const p of def.pads) {
    if (roadMask.has(key(p.x, p.z))) throw new Error(`Level ${def.id}: pad on road at ${p.x},${p.z}`);
    covered.add(key(p.x, p.z));
  }

  // decorations
  for (const d of def.decor) {
    covered.add(key(d.x, d.z));
  }

  // --- load required models
  const names = new Set<string>();
  names.add(themed('tile'));
  for (const pl of placements) names.add(themed(pl.model));
  for (const d of def.decor) names.add(d.m);
  names.add('tower-round-base');
  await assets.ensure([...names]);

  // --- build scene
  const group = new THREE.Group();

  // base ground: instanced plain tiles for every uncovered cell (+ pad cells + decor cells that sit on ground)
  const baseCells: Vec2[] = [];
  for (let x = 0; x < def.gridW; x++) {
    for (let z = 0; z < def.gridH; z++) {
      const k = key(x, z);
      if (roadMask.has(k) || riverMask.has(k)) continue;
      baseCells.push({ x, z });
    }
  }
  const baseTile = assets.getModel(themed('tile'));
  let baseMesh: THREE.Mesh | null = null;
  baseTile.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !baseMesh) baseMesh = o as THREE.Mesh;
  });
  if (baseMesh) {
    const bm = baseMesh as THREE.Mesh;
    const inst = new THREE.InstancedMesh(bm.geometry, bm.material, baseCells.length);
    inst.receiveShadow = true;
    inst.castShadow = false;
    const m = new THREE.Matrix4();
    baseCells.forEach((c, i) => {
      const w = toWorld(c.x, c.z);
      m.makeTranslation(w.x, 0, w.z);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    group.add(inst);
  }

  for (const pl of placements) {
    const obj = assets.getModel(themed(pl.model));
    const w = toWorld(pl.x, pl.z);
    obj.position.set(w.x, 0, w.z);
    obj.rotation.y = pl.r * Math.PI * 0.5;
    group.add(obj);
  }

  for (const d of def.decor) {
    const obj = assets.getModel(d.m);
    const w = toWorld(d.x, d.z);
    obj.position.set(w.x, d.y ?? 0, w.z);
    obj.rotation.y = (d.r ?? 0) * Math.PI * 0.5;
    if (d.s) obj.scale.setScalar(d.s);
    group.add(obj);
  }

  // pads
  const hitGeo = new THREE.BoxGeometry(0.92, 0.5, 0.92);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const pads: Pad[] = def.pads.map((p, index) => {
    const w = toWorld(p.x, p.z);
    const base = assets.getModel('tower-round-base');
    base.position.set(w.x, 0.06, w.z);
    group.add(base);
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.set(w.x, 0.4, w.z);
    hit.userData.padIndex = index;
    group.add(hit);
    return { index, x: p.x, z: p.z, world: new THREE.Vector3(w.x, ROAD_Y, w.z), hitMesh: hit, baseMesh: base, occupied: false };
  });

  // world paths + lengths
  const worldPaths = pathCells.map((cells) => cells.map((c) => toWorld(c.x, c.z).setY(ROAD_Y)));
  const pathLengths = worldPaths.map((wp) => {
    let len = 0;
    for (let i = 0; i < wp.length - 1; i++) len += wp[i].distanceTo(wp[i + 1]);
    return len;
  });

  const bounds = {
    minX: -offX + 1,
    maxX: offX - 1,
    minZ: -offZ + 1,
    maxZ: offZ - 1,
  };

  return {
    group,
    worldPaths,
    pathLengths,
    pads,
    bounds,
    center: new THREE.Vector3(0, 0, 0),
    toWorld,
    dispose: () => {
      hitGeo.dispose();
      hitMat.dispose();
      disposeObject(group);
    },
  };
}
