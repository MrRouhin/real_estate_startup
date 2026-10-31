'use client';
import * as THREE from 'three';

/** Box geometry whose UVs are in world units / span, so tiled textures keep their real size. */
export function worldBox(sx: number, sy: number, sz: number, span = 1.2) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f]![0] / span, uv.getY(i) * dims[f]![1] / span); }
  uv.needsUpdate = true;
  return g;
}
export function worldPlane(w: number, h: number, span = 1.6) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / span, (uv.getY(i) * h) / span);
  uv.needsUpdate = true;
  return g;
}
