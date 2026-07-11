import type { Vec2 } from '../types';

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Framerate-independent smoothing factor. */
export function damp(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

/** Expand corner waypoints into a full sequence of orthogonal grid cells. */
export function expandCells(corners: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    const dx = Math.sign(b.x - a.x);
    const dz = Math.sign(b.z - a.z);
    if (dx !== 0 && dz !== 0) throw new Error(`Path segment not orthogonal: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
    let x = a.x;
    let z = a.z;
    while (x !== b.x || z !== b.z) {
      out.push({ x, z });
      x += dx;
      z += dz;
    }
  }
  out.push(corners[corners.length - 1]);
  return out;
}

export function key(x: number, z: number): string {
  return `${x},${z}`;
}
