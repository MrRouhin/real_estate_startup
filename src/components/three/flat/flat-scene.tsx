'use client';
// The flat tour: a furnished, sunlit 3D model of one flat built from its floor plan, with a
// Street View style walk-through (drag to look, click the floor to walk, arrows to move),
// a dollhouse view, the real sun for the flat's facing and time of day, the view from its
// floor, and "today on site" stages that show what the flat looks like right now.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls, Sky, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildWalls, resolveOpenings, roomAt, viewpoints, ftIn, type Layout, type OpeningInstance, type Room, type WallPiece } from '@/lib/flats/layout';
import { makeNav } from '@/lib/flats/nav';
import { Label } from '../label';
import { Furniture, Plant } from './furniture';
import { makeMaterials, type Mats, type StyleId } from './materials';
import { worldBox, worldPlane } from './geo';

export type TourPhase = 'finished' | 'ready' | 'services' | 'masonry' | 'structure' | 'not_started';
export type TourMode = 'walk' | 'dollhouse';
export type Pose = { x: number; y: number; yaw: number; room: string | null; fov: number };
export type FlatSceneProps = {
  layout: Layout; style: StyleId; mode: TourMode; phase: TourPhase;
  /** compass bearing (degrees) the balcony side faces */
  facingDeg: number; hour: number; date?: Date; latitude?: number;
  floor: number; floorHeight?: number; view?: string | null; quality: 'high' | 'low';
  goTo?: { room: string; n: number } | null; initial?: Pose | null;
  onPose?: (p: Pose) => void; onPickRoom?: (room: string) => void;
};

/* ---------------- sun ---------------- */

/** Approximate sun position (degrees) for a latitude, date and local solar hour. */
export function sunPosition(hour: number, date = new Date(), lat = 22.6) {
  const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const r = Math.PI / 180, dec = 23.44 * Math.sin((2 * Math.PI * (284 + doy)) / 365) * r, phi = lat * r, H = (hour - 12) * 15 * r;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI; // from north, clockwise
  return { el: el / r, az: ((az / r) % 360 + 360) % 360 };
}
/** Scene direction for a compass bearing when the balcony (+z) faces `facing`. */
const bearingDir = (bearing: number, facing: number, el = 0) => {
  const r = Math.PI / 180, c = Math.cos(el * r);
  return new THREE.Vector3(Math.sin((facing - bearing) * r) * c, Math.sin(el * r), Math.cos((bearing - facing) * r) * c);
};

/* ---------------- geometry helpers ---------------- */

const pieceBox = (p: WallPiece) => {
  const len = p.to - p.from, h = p.top - p.bottom;
  const mid = (p.from + p.to) / 2, y = (p.top + p.bottom) / 2;
  return p.axis === 'x'
    ? { size: [len, h, p.thickness] as [number, number, number], pos: [mid, y, p.fixed + p.offset] as [number, number, number] }
    : { size: [p.thickness, h, len] as [number, number, number], pos: [p.fixed + p.offset, y, mid] as [number, number, number] };
};
const stop = (e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>) => e.stopPropagation();

/* ---------------- walls, floors, ceilings ---------------- */

function wallMaterial(M: Mats, room: Room | undefined, phase: TourPhase, accent: boolean, cache: Map<string, THREE.Material>) {
  if (phase === 'masonry') return M.blocks;
  if (phase === 'services') return M.plaster;
  if (!room) return M.primer;
  if (room.kind === 'bath') return M.bathWall;
  if (accent && phase === 'finished') return M.accent;
  const k = room.kind;
  if (!cache.has(k)) cache.set(k, M.wall(k));
  return cache.get(k)!;
}

const Walls = memo(function Walls({ L, M, phase, walls, accentKeys }: { L: Layout; M: Mats; phase: TourPhase; walls: WallPiece[]; accentKeys: Set<string> }) {
  const cache = useMemo(() => new Map<string, THREE.Material>(), [M]);
  const ghost = phase === 'structure' || phase === 'not_started';
  const edges = useMemo(() => (ghost ? walls.map((p) => new THREE.EdgesGeometry(new THREE.BoxGeometry(...pieceBox(p).size))) : []), [walls, ghost]);
  useEffect(() => () => edges.forEach((g) => g.dispose()), [edges]);
  const geos = useMemo(() => walls.map((p) => {
    const room = L.rooms.find((r) => r.id === p.room);
    const { size } = pieceBox(p);
    if (p.railing) return ghost ? new THREE.BoxGeometry(...size) : null;
    if (phase === 'masonry') return worldBox(size[0], size[1], size[2], 1.8);
    if (room?.kind === 'bath' && phase !== 'services') return worldBox(size[0], size[1], size[2], 1.2);
    return new THREE.BoxGeometry(...size);
  }), [walls, phase, L]);
  useEffect(() => () => geos.forEach((g) => g?.dispose()), [geos]);
  return (
    <group>
      {walls.map((p, i) => {
        const room = L.rooms.find((r) => r.id === p.room);
        const { size, pos } = pieceBox(p);
        const key = `${p.room}:${p.side}:${p.from.toFixed(2)}`;
        if (p.railing) {
          if (ghost) return <group key={i} position={pos}><mesh material={M.ghost} geometry={geos[i]!} onPointerMove={stop} onClick={stop} /><lineSegments geometry={edges[i]} material={M.ghostEdge} /></group>;
          if (phase === 'finished' || phase === 'ready') {
            const along = p.axis === 'x' ? [size[0], 0.05, 0.06] : [0.06, 0.05, size[2]];
            return <group key={i}>
              <mesh position={[pos[0], 0.55, pos[2]]} material={M.glass} onPointerMove={stop} onClick={stop}><boxGeometry args={p.axis === 'x' ? [size[0], 1.0, 0.012] : [0.012, 1.0, size[2]]} /></mesh>
              <mesh position={[pos[0], 1.08, pos[2]]} material={M.steel} castShadow><boxGeometry args={along as [number, number, number]} /></mesh>
              <mesh position={[pos[0], 0.02, pos[2]]} material={M.steel}><boxGeometry args={along as [number, number, number]} /></mesh>
            </group>;
          }
          // temporary safety rail on site
          return <group key={i}>
            {[0.5, 1.0].map((y) => <mesh key={y} position={[pos[0], y, pos[2]]} material={M.conduit} castShadow><boxGeometry args={p.axis === 'x' ? [size[0], 0.04, 0.04] : [0.04, 0.04, size[2]]} /></mesh>)}
          </group>;
        }
        if (ghost) return (
          <group key={i} position={pos}>
            <mesh material={M.ghost} geometry={geos[i]!} onPointerMove={stop} onClick={stop} />
            <lineSegments geometry={edges[i]} material={M.ghostEdge} />
          </group>
        );
        const mat = wallMaterial(M, room, phase, accentKeys.has(key), cache);
        return <mesh key={i} position={pos} material={mat} geometry={geos[i]!} castShadow receiveShadow onPointerMove={stop} onClick={stop} />;
      })}
      {(phase === 'finished' || phase === 'ready') && walls.filter((p) => !p.railing && p.bottom === 0 && L.rooms.find((r) => r.id === p.room)?.kind !== 'bath').map((p, i) => {
        const { size, pos } = pieceBox(p);
        const t = p.thickness + 0.02;
        return <mesh key={'sk' + i} position={[pos[0], 0.05, pos[2]]} material={M.skirting}>
          <boxGeometry args={p.axis === 'x' ? [size[0], 0.1, t] : [t, 0.1, size[2]]} />
        </mesh>;
      })}
    </group>
  );
});

function floorMat(M: Mats, r: Room, phase: TourPhase) {
  if (phase === 'services') return M.screed;
  if (phase === 'masonry' || phase === 'structure') return M.concrete;
  if (r.kind === 'bath') return M.bathFloor;
  if (r.kind === 'balcony' || r.kind === 'utility') return M.balconyFloor;
  if (r.id === 'master' || r.kind === 'dress') return M.woodFloor;
  return M.tileFloor;
}

const Floors = memo(function Floors({ L, M, phase, onFloorMove, onFloorClick, onFloorOut }: {
  L: Layout; M: Mats; phase: TourPhase;
  onFloorMove?: (e: ThreeEvent<PointerEvent>) => void; onFloorClick?: (e: ThreeEvent<MouseEvent>) => void; onFloorOut?: () => void;
}) {
  const geos = useMemo(() => L.rooms.map((r) => worldPlane(r.w, r.d, r.kind === 'bath' ? 1.5 : 1.6)), [L]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  return (
    <group>
      {L.rooms.map((r, i) => {
        const m = phase === 'not_started' ? M.ghost : floorMat(M, r, phase);
        return (
          <mesh key={r.id} position={[r.x + r.w / 2, 0.002, r.y + r.d / 2]} rotation={[-Math.PI / 2, 0, 0]} material={m} receiveShadow
            geometry={geos[i]} onPointerMove={onFloorMove} onClick={onFloorClick} onPointerOut={onFloorOut} />
        );
      })}
      {/* slab edge under the flat */}
      {phase !== 'not_started' && <mesh position={[L.w / 2, -0.11, L.d / 2]} material={M.concrete} receiveShadow><boxGeometry args={[L.w + 0.1, 0.2, L.d + 0.1]} /></mesh>}
    </group>
  );
});

/** Ceiling, the slab above (it casts the shadows that make window light look right) and lights. */
const Ceiling = memo(function Ceiling({ L, M, phase, night, lightMat }: { L: Layout; M: Mats; phase: TourPhase; night: boolean; lightMat: THREE.Material }) {
  const H = L.height;
  const geos = useMemo(() => L.rooms.map((r) => worldPlane(r.w, r.d, 2)), [L]);
  useEffect(() => () => geos.forEach((g) => g.dispose()), [geos]);
  const done = phase === 'finished' || phase === 'ready';
  const mat = done ? M.ceiling : phase === 'services' ? M.plaster : M.concrete;
  const lit = L.rooms.filter((r) => r.kind !== 'balcony');
  return (
    <group>
      {L.rooms.map((r, i) => (
        <mesh key={r.id} position={[r.x + r.w / 2, H - 0.001, r.y + r.d / 2]} rotation={[Math.PI / 2, 0, 0]} material={mat} receiveShadow geometry={geos[i]} />
      ))}
      <mesh position={[L.w / 2, H + 0.08, L.d / 2]} material={M.concrete} castShadow><boxGeometry args={[L.w + 0.3, 0.15, L.d + 0.3]} /></mesh>
      {done && lit.map((r) => {
        const big = r.w * r.d > 9, pts: [number, number][] = big ? [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]] : [[0.5, 0.5]];
        return pts.map(([a, b], i) => (
          <mesh key={r.id + i} position={[r.x + r.w * a, H - 0.004, r.y + r.d * b]} rotation={[Math.PI / 2, 0, 0]} material={lightMat}>
            <circleGeometry args={[0.07, 20]} />
          </mesh>
        ));
      })}
      {done && lit.filter((r) => r.kind !== 'bath' && r.kind !== 'passage').map((r) => (
        <pointLight key={'pl' + r.id} position={[r.x + r.w / 2, H - 0.35, r.y + r.d / 2]} intensity={night ? (r.kind === 'living' ? 9 : 6) : 0} distance={Math.max(r.w, r.d) * 1.6} decay={2} color="#ffe2bd" />
      ))}
    </group>
  );
});

/* ---------------- doors and windows ---------------- */

function swingRoom(L: Layout, o: OpeningInstance) {
  const r = L.rooms.find((x) => x.id === o.rooms[0]);
  if (!r) return 1;
  const c = o.axis === 'x' ? r.y + r.d / 2 : r.x + r.w / 2;
  return c > o.fixed ? 1 : -1;
}

function Door({ o, L, M, entry }: { o: OpeningInstance; L: Layout; M: Mats; entry?: boolean }) {
  const w = o.to - o.from, s = swingRoom(L, o), open = entry ? 1.52 : 1.42;
  const t = entry ? 0.05 : 0.04, H = 2.08;
  // hinge at `from`; the leaf swings into rooms[0]
  const hinge: [number, number, number] = o.axis === 'x' ? [o.from + 0.03, 0, o.fixed] : [o.fixed, 0, o.from + 0.03];
  const rotY = o.axis === 'x' ? -s * open : s * open;
  const leafPos: [number, number, number] = o.axis === 'x' ? [(w - 0.06) / 2, H / 2, 0] : [0, H / 2, (w - 0.06) / 2];
  const leafSize: [number, number, number] = o.axis === 'x' ? [w - 0.06, H, t] : [t, H, w - 0.06];
  const handle: [number, number, number] = o.axis === 'x' ? [w - 0.16, 1.0, s * 0.05] : [s * 0.05, 1.0, w - 0.16];
  const frameT = o.axis === 'x' ? [0.05, 2.12, 0.16] : [0.16, 2.12, 0.05];
  const mid = (o.from + o.to) / 2;
  return (
    <group>
      {/* frame */}
      {[o.from, o.to].map((v, i) => (
        <mesh key={i} position={o.axis === 'x' ? [v + (i ? -0.025 : 0.025), 1.06, o.fixed] : [o.fixed, 1.06, v + (i ? -0.025 : 0.025)]} material={entry ? M.darkWood : M.frame} castShadow>
          <boxGeometry args={frameT as [number, number, number]} />
        </mesh>
      ))}
      <mesh position={o.axis === 'x' ? [mid, 2.12, o.fixed] : [o.fixed, 2.12, mid]} material={entry ? M.darkWood : M.frame}>
        <boxGeometry args={o.axis === 'x' ? [w, 0.06, 0.16] : [0.16, 0.06, w]} />
      </mesh>
      {/* leaf, standing open */}
      <group position={hinge} rotation={[0, rotY, 0]}>
        <mesh position={leafPos} material={entry ? M.darkWood : M.door} castShadow receiveShadow onPointerMove={stop} onClick={stop}><boxGeometry args={leafSize} /></mesh>
        <mesh position={handle} material={M.metal}><boxGeometry args={o.axis === 'x' ? [0.12, 0.025, 0.03] : [0.03, 0.025, 0.12]} /></mesh>
        {entry && <mesh position={[handle[0], 1.25, handle[2]]} material={M.black}><boxGeometry args={o.axis === 'x' ? [0.07, 0.16, 0.035] : [0.035, 0.16, 0.07]} /></mesh>}
      </group>
    </group>
  );
}

function Window({ o, M, glass }: { o: OpeningInstance; M: Mats; glass: boolean }) {
  const w = o.to - o.from, h = o.head - o.sill, mid = (o.from + o.to) / 2, yc = (o.sill + o.head) / 2;
  const inward = o.side === 'n' || o.side === 'w' ? 1 : -1;
  const plane = o.exterior ? o.fixed + inward * 0.07 : o.fixed;
  const P = (along: number, y: number): [number, number, number] => (o.axis === 'x' ? [along, y, plane] : [plane, y, along]);
  const S = (along: number, hh: number, depth = 0.07): [number, number, number] => (o.axis === 'x' ? [along, hh, depth] : [depth, hh, along]);
  const bars = 0.05, panels = o.type === 'slider' ? (w > 3.2 ? 4 : 3) : w > 1.3 ? 3 : 2;
  const fm = M.white;
  return (
    <group>
      <mesh position={P(mid, o.head - bars / 2)} material={fm} castShadow><boxGeometry args={S(w, bars)} /></mesh>
      <mesh position={P(mid, o.sill + bars / 2)} material={fm}><boxGeometry args={S(w, bars)} /></mesh>
      {Array.from({ length: panels + 1 }, (_, i) => (
        <mesh key={i} position={P(o.from + (w * i) / panels + (i === 0 ? bars / 2 : i === panels ? -bars / 2 : 0), yc)} material={fm} castShadow>
          <boxGeometry args={S(bars * (i === 0 || i === panels ? 1 : 0.8), h)} />
        </mesh>
      ))}
      {glass && Array.from({ length: panels }, (_, i) => (
        <mesh key={'g' + i} position={P(o.from + (w * (i + 0.5)) / panels, yc)} rotation={o.axis === 'x' ? [0, 0, 0] : [0, Math.PI / 2, 0]} material={M.glass} onPointerMove={stop} onClick={stop}>
          <planeGeometry args={[w / panels - bars, h - bars * 2]} />
        </mesh>
      ))}
      {/* granite sill inside */}
      {o.type === 'window' && o.exterior && (
        <mesh position={o.axis === 'x' ? [mid, o.sill - 0.015, o.fixed + inward * 0.16] : [o.fixed + inward * 0.16, o.sill - 0.015, mid]} material={M.counter} castShadow>
          <boxGeometry args={o.axis === 'x' ? [w + 0.1, 0.03, 0.06] : [0.06, 0.03, w + 0.1]} />
        </mesh>
      )}
      {/* sunshade (chajja) outside, part of the facade */}
      {o.exterior && (
        <mesh position={o.axis === 'x' ? [mid, o.head + 0.12, o.fixed - inward * 0.25] : [o.fixed - inward * 0.25, o.head + 0.12, mid]} material={M.concrete} castShadow>
          <boxGeometry args={o.axis === 'x' ? [w + 0.3, 0.08, 0.5] : [0.5, 0.08, w + 0.3]} />
        </mesh>
      )}
    </group>
  );
}

const Openings = memo(function Openings({ L, M, phase, ops }: { L: Layout; M: Mats; phase: TourPhase; ops: OpeningInstance[] }) {
  if (phase === 'structure' || phase === 'not_started' || phase === 'masonry') {
    // lintels and sills only exist as part of the blockwork
    return null;
  }
  const done = phase === 'finished' || phase === 'ready';
  return (
    <group>
      {ops.map((o, i) => {
        if (o.type === 'door') return done ? <Door key={i} o={o} L={L} M={M} /> : null;
        if (o.type === 'entry') return done ? <Door key={i} o={o} L={L} M={M} entry /> : null;
        if (o.type === 'window' || o.type === 'slider') return <Window key={i} o={o} M={M} glass={done} />;
        return null;
      })}
    </group>
  );
});

/* ---------------- on-site stages ---------------- */

function columnsFor(L: Layout) {
  const pts = new Map<string, [number, number]>();
  const on = (x: number, y: number) => x < 0.01 || y < 0.01 || Math.abs(x - L.w) < 0.01 || Math.abs(y - L.d) < 0.01;
  for (const r of L.rooms) {
    if (r.kind === 'balcony') continue;
    for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.d], [r.x + r.w, r.y + r.d]] as [number, number][]) {
      if (on(x, y) || (r.kind === 'living' && (x === r.x || x === r.x + r.w))) pts.set(`${x.toFixed(2)},${y.toFixed(2)}`, [x, y]);
    }
  }
  // move each column just inside the flat
  return [...pts.values()].map(([x, y]) => [Math.min(L.w - 0.16, Math.max(0.16, x)), Math.min(L.d - 0.24, Math.max(0.24, y))] as [number, number]);
}

const SiteStage = memo(function SiteStage({ L, M, phase, ops }: { L: Layout; M: Mats; phase: TourPhase; ops: OpeningInstance[] }) {
  const cols = useMemo(() => columnsFor(L), [L]);
  const props = useMemo(() => {
    const out: [number, number][] = [];
    for (const r of L.rooms) {
      if (r.kind === 'balcony' || r.kind === 'bath' || r.w * r.d < 6) continue;
      for (let x = r.x + 0.8; x < r.x + r.w - 0.4; x += 1.4) for (let y = r.y + 0.8; y < r.y + r.d - 0.4; y += 1.4) out.push([x, y]);
    }
    return out;
  }, [L]);
  const H = L.height;
  if (phase === 'finished' || phase === 'ready' || phase === 'not_started') return null;
  const living = L.rooms.find((r) => r.kind === 'living');
  return (
    <group>
      {cols.map(([x, y], i) => (
        <mesh key={i} position={[x, H / 2, y]} material={phase === 'services' ? M.plaster : M.concrete} castShadow receiveShadow>
          <boxGeometry args={[0.3, H, 0.45]} />
        </mesh>
      ))}
      {phase === 'structure' && <>
        {/* shuttering props still holding up the slab above */}
        {props.map(([x, y], i) => (
          <group key={'p' + i} position={[x, 0, y]}>
            <mesh position={[0, H / 2, 0]} material={M.pipe} castShadow><cylinderGeometry args={[0.025, 0.03, H, 8]} /></mesh>
            <mesh position={[0, H - 0.06, 0]} material={M.darkWood}><boxGeometry args={[0.6, 0.1, 0.1]} /></mesh>
          </group>
        ))}
        {/* rebar bundles and a pile of shuttering plates */}
        {living && <group position={[living.x + 0.9, 0, living.y + living.d - 1.0]}>
          {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[(i % 7) * 0.035, 0.04 + Math.floor(i / 7) * 0.035, 0]} rotation={[0, 0, Math.PI / 2]} material={M.pipe}><cylinderGeometry args={[0.012, 0.012, 3, 6]} /></mesh>)}
          <mesh position={[1.4, 0.12, 0.6]} material={M.darkWood} castShadow><boxGeometry args={[1.2, 0.24, 0.6]} /></mesh>
        </group>}
      </>}
      {phase === 'masonry' && living && <group position={[living.x + 1.0, 0, living.y + 1.2]}>
        {/* block stacks, cement bags, mortar tub */}
        {[0, 1].map((k) => <mesh key={k} position={[k * 0.75, 0.3, 0]} material={M.blocks} castShadow><boxGeometry args={[0.6, 0.6, 0.6]} /></mesh>)}
        {Array.from({ length: 6 }, (_, i) => <mesh key={'b' + i} position={[1.7 + (i % 3) * 0.42, 0.07 + Math.floor(i / 3) * 0.13, 0.1]} material={M.primer} castShadow><boxGeometry args={[0.4, 0.12, 0.6]} /></mesh>)}
        <mesh position={[0.4, 0.12, 1.0]} material={M.black}><cylinderGeometry args={[0.32, 0.26, 0.24, 18]} /></mesh>
      </group>}
      {phase === 'services' && <Services L={L} M={M} ops={ops} />}
    </group>
  );
});

/** Electrical conduits and plumbing lines, chased into plastered walls and ceilings. */
function Services({ L, M, ops }: { L: Layout; M: Mats; ops: OpeningInstance[] }) {
  const H = L.height;
  const runs = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (const o of ops) {
      if (o.type !== 'door' && o.type !== 'entry') continue;
      // a switch board beside each door, a conduit up to the ceiling, and across to the room centre
      for (const id of o.rooms) {
        const r = L.rooms.find((x) => x.id === id); if (!r || r.kind === 'passage') continue;
        const sgn = (o.axis === 'x' ? r.y + r.d / 2 > o.fixed : r.x + r.w / 2 > o.fixed) ? 1 : -1;
        const off = 0.08 * sgn;
        const along = o.to + 0.15;
        const bx = o.axis === 'x' ? along : o.fixed + off, bz = o.axis === 'x' ? o.fixed + off : along;
        out.push({ p: [bx, 1.2, bz], s: [0.1, 0.14, 0.03] });
        out.push({ p: [bx, (1.27 + H) / 2, bz], s: [0.025, H - 1.27, 0.025] });
        const cx = r.x + r.w / 2, cz = r.y + r.d / 2;
        out.push({ p: [(bx + cx) / 2, H - 0.02, bz], s: [Math.abs(cx - bx), 0.025, 0.025] });
        out.push({ p: [cx, H - 0.02, (bz + cz) / 2], s: [0.025, 0.025, Math.abs(cz - bz)] });
        out.push({ p: [cx, H - 0.04, cz], s: [0.1, 0.04, 0.1] });
      }
    }
    return out;
  }, [L, ops, H]);
  const pipes = L.rooms.filter((r) => r.kind === 'bath' || r.kind === 'kitchen');
  return (
    <group>
      {runs.map((r, i) => <mesh key={i} position={r.p} material={r.s[1] === 0.14 || r.s[1] === 0.04 ? M.white : M.conduit}><boxGeometry args={r.s} /></mesh>)}
      {pipes.map((r) => (
        <group key={r.id}>
          <mesh position={[r.x + 0.12, 0.45, r.y + r.d / 2]} rotation={[Math.PI / 2, 0, 0]} material={M.pipe}><cylinderGeometry args={[0.025, 0.025, r.d - 0.3, 10]} /></mesh>
          <mesh position={[r.x + r.w / 2, 0.9, r.y + 0.1]} rotation={[0, 0, Math.PI / 2]} material={M.pipe}><cylinderGeometry args={[0.02, 0.02, r.w - 0.3, 10]} /></mesh>
          <mesh position={[r.x + r.w - 0.18, 1.6, r.y + 0.12]} material={M.pipe}><cylinderGeometry args={[0.02, 0.02, 3.2 - 1.6, 10]} /></mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------------- outside world ---------------- */

const rand = (s: number) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, 64, 128);
  const r = rand(5);
  for (let y = 4; y < 128; y += 16) for (let x = 4; x < 64; x += 16) { const on = r() > 0.55; g.fillStyle = on ? `rgba(255,${200 + Math.floor(r() * 40)},140,${0.6 + r() * 0.4})` : 'rgba(20,30,40,1)'; g.fillRect(x, y, 9, 10); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 3); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function facadeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#d9d4ca'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) { g.fillStyle = '#bfb8ab'; g.fillRect(0, y, 128, 5); g.fillStyle = '#56606a'; for (let x = 10; x < 128; x += 42) g.fillRect(x, y + 10, 26, 16); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Instanced({ items, geometry, material, castShadow = false }: { items: { p: [number, number, number]; s: [number, number, number]; r?: number; c?: string }[]; geometry: THREE.BufferGeometry; material: THREE.Material; castShadow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current; if (!m) return;
    const o = new THREE.Object3D(), col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p); o.scale.set(...it.s); o.rotation.set(0, it.r ?? 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      if (it.c) m.setColorAt(i, col.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);
  return <instancedMesh key={items.length} ref={ref} args={[geometry, material, items.length]} castShadow={castShadow} receiveShadow frustumCulled={false} />;
}

const Outside = memo(function Outside({ L, M, H, view, night }: { L: Layout; M: Mats; H: number; view?: string | null; night: boolean }) {
  const data = useMemo(() => {
    const r = rand(42), cx = L.w / 2, front = L.d;
    const trees: { p: [number, number, number]; s: [number, number, number]; c?: string }[] = [];
    const addTree = (x: number, z: number, k = 1) => { const s = (0.8 + r() * 0.7) * k; trees.push({ p: [x, 0, z], s: [s, s, s], c: ['#4f7a3c', '#5d8a45', '#3f6b33', '#6a9150'][Math.floor(r() * 4)] }); };
    if (view === 'park' || view === 'garden') for (let i = 0; i < 46; i++) addTree(cx + (r() - 0.5) * 70, front + 14 + r() * 45, 1.1);
    for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = 40 + r() * 110; addTree(cx + Math.cos(a) * d, L.d / 2 + Math.sin(a) * d); }
    // a row along the site boundary
    for (let x = -60; x <= 60; x += 7) addTree(cx + x, front + 64, 0.9);
    const buildings: { p: [number, number, number]; s: [number, number, number]; r: number; c: string }[] = [];
    for (let i = 0; i < 130; i++) {
      const a = r() * Math.PI * 2, d = 140 + r() * 520, h = 8 + r() * r() * 70;
      const w = 14 + r() * 26, dd = 12 + r() * 24;
      buildings.push({ p: [cx + Math.cos(a) * d, h / 2, L.d / 2 + Math.sin(a) * d], s: [w, h, dd], r: r() * Math.PI, c: ['#cfc8bc', '#bdb6aa', '#d8d2c6', '#a9a49b', '#c4bcae'][Math.floor(r() * 5)]! });
    }
    const cars: { p: [number, number, number]; s: [number, number, number]; c: string }[] = [];
    const roadZ = front + (view === 'road' ? 26 : 72);
    for (let i = 0; i < 18; i++) cars.push({ p: [cx - 120 + r() * 240, 0.7, roadZ + (i % 2 ? 2 : -2)], s: [4.2, 1.4, 1.8], c: ['#b8352c', '#e8e8e8', '#2b2f36', '#3b5f8a', '#c9c3b6'][Math.floor(r() * 5)]! });
    return { trees, trunks: trees.map((t) => ({ p: t.p, s: t.s })), buildings, cars, roadZ };
  }, [L, view]);
  const geo = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    trunk: new THREE.CylinderGeometry(0.15, 0.22, 3, 6).translate(0, 1.5, 0),
    crown: new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.6, 0),
  }), []);
  const mats = useMemo(() => {
    const win = windowTexture();
    return {
      building: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, emissiveMap: win, emissive: '#ffffff', emissiveIntensity: 0 }),
      crown: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }),
      trunk: new THREE.MeshStandardMaterial({ color: '#5a4030', roughness: 1 }),
      car: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.5 }),
      ground: new THREE.MeshStandardMaterial({ color: '#7b8f5c', roughness: 1 }),
      paving: new THREE.MeshStandardMaterial({ color: '#c9c2b6', roughness: 0.9 }),
      road: new THREE.MeshStandardMaterial({ color: '#3c3e42', roughness: 0.85 }),
      water: new THREE.MeshPhysicalMaterial({ color: '#3fb6d3', roughness: 0.04, metalness: 0.1, transmission: 0, clearcoat: 1, emissive: '#0b5f75', emissiveIntensity: 0.25 }),
      facade: new THREE.MeshStandardMaterial({ map: facadeTexture(), roughness: 0.85 }),
    };
  }, []);
  useEffect(() => { mats.building.emissiveIntensity = night ? 1.1 : 0; }, [night, mats]);
  useEffect(() => { const t = mats.facade.map!; t.repeat.set(Math.max(1, L.w / 3), Math.max(1, H / 3)); t.needsUpdate = true; }, [mats, L.w, H]);
  const cx = L.w / 2;
  return (
    <group position={[0, -H, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.05, L.d / 2]} material={mats.ground} receiveShadow><circleGeometry args={[1400, 48]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.0, L.d / 2 + 8]} material={mats.paving} receiveShadow><planeGeometry args={[90, 110]} /></mesh>
      {view === 'park' || view === 'garden' ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.02, L.d + 36]} material={M.grass} receiveShadow><planeGeometry args={[80, 50]} /></mesh>
      ) : null}
      {view === 'pool' && <group position={[cx, 0, L.d + 26]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} material={mats.paving}><planeGeometry args={[34, 18]} /></mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={mats.water}><planeGeometry args={[25, 10]} /></mesh>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-12 + i * 3.4, 0.25, 7]} material={M.white} castShadow><boxGeometry args={[0.8, 0.4, 2]} /></mesh>)}
      </group>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.04, data.roadZ]} material={mats.road} receiveShadow><planeGeometry args={[1400, 11]} /></mesh>
      {Array.from({ length: 40 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[cx - 200 + i * 10, 0.05, data.roadZ]} material={M.white}><planeGeometry args={[3, 0.15]} /></mesh>)}
      {/* the tower below this flat, and a sister tower across the lawn */}
      <mesh position={[L.w / 2, (H - 0.3) / 2, L.d / 2]} material={mats.facade} receiveShadow castShadow><boxGeometry args={[L.w + 0.2, Math.max(0.1, H - 0.3), L.d + 0.2]} /></mesh>
      <mesh position={[L.w / 2 - 46, 26, L.d / 2 - 6]} material={mats.facade} castShadow receiveShadow><boxGeometry args={[22, 52, 18]} /></mesh>
      <Instanced items={data.buildings} geometry={geo.box} material={mats.building} />
      <Instanced items={data.trunks} geometry={geo.trunk} material={mats.trunk} />
      <Instanced items={data.trees} geometry={geo.crown} material={mats.crown} castShadow />
      <Instanced items={data.cars} geometry={geo.box} material={mats.car} />
    </group>
  );
});

/* ---------------- corridor outside the main door ---------------- */

const Corridor = memo(function Corridor({ L, M, ops, ceiling }: { L: Layout; M: Mats; ops: OpeningInstance[]; ceiling: boolean }) {
  const mat = useMemo(() => M.wall('foyer'), [M]);
  const e = ops.find((o) => o.type === 'entry');
  const g = useMemo(() => {
    if (!e || e.axis !== 'x') return null;
    // stop the corridor before any window on the same face
    const wins = ops.filter((o) => o.type === 'window' && o.axis === 'x' && Math.abs(o.fixed - e.fixed) < 0.01);
    const x0 = Math.max(e.from - 3, ...wins.filter((w) => w.to <= e.from).map((w) => w.to + 0.1));
    const x1 = Math.min(e.to + 3, ...wins.filter((w) => w.from >= e.to).map((w) => w.from - 0.1));
    return { x0, x1, floor: worldPlane(x1 - x0, 2.0) };
  }, [e, ops]);
  if (!e || !g) return null;
  const { x0, x1 } = g, d = 2.0, H = L.height;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.001, -d / 2]} material={M.tileFloor} receiveShadow geometry={g.floor} />
      <mesh position={[(x0 + x1) / 2, H / 2, -d - 0.07]} material={mat} receiveShadow><boxGeometry args={[x1 - x0, H, 0.14]} /></mesh>
      {[x0, x1].map((x, i) => <mesh key={i} position={[x, H / 2, -d / 2]} material={mat}><boxGeometry args={[0.14, H, d]} /></mesh>)}
      {ceiling && <mesh rotation={[Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, H - 0.001, -d / 2]} material={M.ceiling}><planeGeometry args={[x1 - x0, d]} /></mesh>}
      <group position={[x0 + 0.6, 0, -d + 0.35]}><Plant M={M} scale={1.1} /></group>
    </group>
  );
});

/* ---------------- walk controls ---------------- */

const EYE = 1.58;
type CursorState = { x: number; y: number; ok: boolean; on: boolean };

function WalkControls({ L, enabled, goTo, initial, onPose, clickRef }: {
  L: Layout; enabled: boolean; goTo?: { room: string; n: number } | null; initial?: Pose | null;
  onPose: (p: Pose) => void;
  clickRef: React.MutableRefObject<((x: number, y: number, room?: string) => void) | null>;
}) {
  const { camera, gl } = useThree();
  const nav = useMemo(() => makeNav(L), [L]);
  const vps = useMemo(() => viewpoints(L), [L]);
  const st = useRef({
    x: 0, y: 0, yaw: 0, pitch: -0.06, fov: 62, path: [] as { x: number; y: number }[], endYaw: null as number | null,
    keys: new Set<string>(), drag: null as null | { x: number; y: number; yaw: number; pitch: number }, bob: 0, lastPose: 0, speed: 0,
  });
  const initialRef = useRef(initial);
  // start just inside the main door, looking into the home (or where the visitor last stood)
  useEffect(() => {
    const s = st.current, init = initialRef.current;
    initialRef.current = null;
    if (init && nav.free(init.x, init.y)) { s.x = init.x; s.y = init.y; s.yaw = init.yaw; s.fov = init.fov || 62; }
    else {
      const f = vps.find((v) => L.rooms.find((r) => r.id === v.room)?.kind === 'foyer') || vps[0]!;
      const p = nav.nearest(f.x, f.y) || f;
      s.x = p.x; s.y = p.y;
      const living = L.rooms.find((r) => r.kind === 'living');
      s.yaw = living ? Math.atan2(living.x + living.w / 2 - p.x, living.y + living.d * 0.75 - p.y) : f.yaw;
    }
    s.path = []; s.endYaw = null;
  }, [L, nav, vps]);

  const walkTo = useCallback((x: number, y: number, endYaw: number | null = null) => {
    const s = st.current;
    const p = nav.path(s.x, s.y, x, y);
    if (p && p.length) { s.path = p; s.endYaw = endYaw; }
  }, [nav]);
  clickRef.current = (x, y, room) => {
    if (room) { const v = vps.find((q) => q.room === room); if (v) { const t = nav.nearest(v.x, v.y) || v; return walkTo(t.x, t.y, v.yaw); } }
    walkTo(x, y);
  };

  useEffect(() => {
    if (!goTo) return;
    const v = vps.find((q) => q.room === goTo.room);
    if (v) { const t = nav.nearest(v.x, v.y) || v; walkTo(t.x, t.y, v.yaw); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goTo?.n]);

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement, s = st.current;
    const pinch = { d: 0, fov: 62, pts: new Map<number, { x: number; y: number }>() };
    const down = (e: PointerEvent) => {
      pinch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.pts.size === 2) { const [a, b] = [...pinch.pts.values()]; pinch.d = Math.hypot(a!.x - b!.x, a!.y - b!.y); pinch.fov = s.fov; s.drag = null; return; }
      if (e.button !== 0) return;
      s.drag = { x: e.clientX, y: e.clientY, yaw: s.yaw, pitch: s.pitch };
    };
    const move = (e: PointerEvent) => {
      if (pinch.pts.has(e.pointerId)) pinch.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.pts.size === 2 && pinch.d > 0) { const [a, b] = [...pinch.pts.values()]; s.fov = Math.max(32, Math.min(80, (pinch.fov * pinch.d) / Math.max(20, Math.hypot(a!.x - b!.x, a!.y - b!.y)))); return; }
      if (!s.drag || !(e.buttons & 1)) return;
      const k = (s.fov / 62) * 0.0042;
      s.yaw = s.drag.yaw + (e.clientX - s.drag.x) * k;
      s.pitch = Math.max(-1.2, Math.min(1.1, s.drag.pitch + (e.clientY - s.drag.y) * k));
      if (Math.abs(e.clientX - s.drag.x) + Math.abs(e.clientY - s.drag.y) > 6) { s.path = []; s.endYaw = null; el.style.cursor = 'grabbing'; }
    };
    const up = (e: PointerEvent) => { pinch.pts.delete(e.pointerId); if (pinch.pts.size < 2) pinch.d = 0; s.drag = null; el.style.cursor = ''; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); s.fov = Math.max(32, Math.min(80, s.fov + e.deltaY * 0.03)); };
    const kd = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'].includes(k)) { s.keys.add(k); s.path = []; e.preventDefault(); }
    };
    const ku = (e: KeyboardEvent) => s.keys.delete(e.key.toLowerCase());
    const blur = () => s.keys.clear();
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false }); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); window.addEventListener('blur', blur);
    return () => {
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); window.removeEventListener('blur', blur);
    };
  }, [enabled, gl]);

  useFrame((state, dt) => {
    if (!enabled) return;
    const s = st.current, d = Math.min(dt, 0.05);
    let moving = false;
    const fwd = (s.keys.has('w') || s.keys.has('arrowup') ? 1 : 0) - (s.keys.has('s') || s.keys.has('arrowdown') ? 1 : 0);
    const side = (s.keys.has('d') ? 1 : 0) - (s.keys.has('a') ? 1 : 0);
    const turn = (s.keys.has('arrowleft') || s.keys.has('q') ? 1 : 0) - (s.keys.has('arrowright') || s.keys.has('e') ? 1 : 0);
    if (turn) s.yaw += turn * 1.6 * d;
    if (fwd || side) {
      const sp = 1.7 * d, fx = Math.sin(s.yaw), fy = Math.cos(s.yaw);
      const dx = (fx * fwd - fy * side) * sp, dy = (fy * fwd + fx * side) * sp;
      if (nav.free(s.x + dx, s.y + dy)) { s.x += dx; s.y += dy; }
      else if (nav.free(s.x + dx, s.y)) s.x += dx;
      else if (nav.free(s.x, s.y + dy)) s.y += dy;
      moving = true;
    }
    if (s.path.length) {
      const t = s.path[0]!, dx = t.x - s.x, dy = t.y - s.y, dist = Math.hypot(dx, dy);
      let remaining = dist;
      for (let i = 1; i < s.path.length; i++) remaining += Math.hypot(s.path[i]!.x - s.path[i - 1]!.x, s.path[i]!.y - s.path[i - 1]!.y);
      s.speed = Math.min(2.3, s.speed + d * 4.5, Math.max(0.45, remaining * 2.2));
      const step = s.speed * d;
      if (dist <= step) { s.x = t.x; s.y = t.y; s.path.shift(); }
      else { s.x += (dx / dist) * step; s.y += (dy / dist) * step; }
      if (remaining > 1.4 && dist > 0.05) { // turn to face the way we walk on longer walks
        let diff = Math.atan2(dx, dy) - s.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        s.yaw += diff * Math.min(1, d * 3);
      }
      moving = true;
    } else {
      s.speed = 0;
      if (s.endYaw != null) {
        let diff = s.endYaw - s.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        s.yaw += diff * Math.min(1, d * 4);
        if (Math.abs(diff) < 0.01) s.endYaw = null;
      }
    }
    s.bob = moving ? s.bob + d * 9 : 0;
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(s.x, EYE + (moving ? Math.sin(s.bob) * 0.012 : 0), s.y);
    cam.rotation.order = 'YXZ';
    cam.rotation.set(s.pitch, s.yaw + Math.PI, 0);
    if (Math.abs(cam.fov - s.fov) > 0.05) { cam.fov += (s.fov - cam.fov) * Math.min(1, d * 10); cam.updateProjectionMatrix(); }
    if (state.clock.elapsedTime - s.lastPose > 0.1) {
      s.lastPose = state.clock.elapsedTime;
      onPose({ x: s.x, y: s.y, yaw: s.yaw, room: roomAt(L, s.x, s.y)?.id ?? null, fov: s.fov });
    }
  });
  return null;
}

/** The disc that follows the pointer on the floor, like Street View. Driven by a ref, no re-renders. */
function Cursor({ cursor }: { cursor: React.MutableRefObject<CursorState> }) {
  const ref = useRef<THREE.Group>(null);
  const mats = useMemo(() => [new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.2, depthWrite: false })], []);
  useFrame((st) => {
    const g = ref.current, c = cursor.current; if (!g) return;
    g.visible = c.on;
    if (!c.on) return;
    g.position.set(c.x, 0.012, c.y);
    g.scale.setScalar(1 + Math.sin(st.clock.elapsedTime * 4) * 0.04);
    const col = c.ok ? '#ffffff' : '#ff6b5e';
    mats[0]!.color.set(col); mats[1]!.color.set(col);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats[0]}><ringGeometry args={[0.19, 0.24, 40]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats[1]}><circleGeometry args={[0.19, 40]} /></mesh>
    </group>
  );
}

/** Room hotspots: rings on the floor with the room name, click to walk there. */
const Hotspots = memo(function Hotspots({ L, current, onGo }: { L: Layout; current: string | null; onGo: (room: string) => void }) {
  const vps = useMemo(() => viewpoints(L), [L]);
  return (
    <group>
      {vps.filter((v) => v.room !== current).map((v) => {
        const r = L.rooms.find((x) => x.id === v.room)!;
        return (
          <group key={v.room} position={[v.x, 0, v.y]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} onClick={(e) => { e.stopPropagation(); onGo(v.room); }}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = ''; }}>
              <ringGeometry args={[0.22, 0.3, 36]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
            </mesh>
            <Label text={r.name} position={[0, 0.55, 0]} height={0.13} depthTest bg="rgba(18,32,28,.82)" onClick={() => onGo(v.room)} />
          </group>
        );
      })}
    </group>
  );
});

/* ---------------- lighting, sky, post ---------------- */

function SunAndSky({ L, facing, hour, date, lat, quality }: { L: Layout; facing: number; hour: number; date?: Date; lat?: number; quality: 'high' | 'low' }) {
  const sun = useMemo(() => sunPosition(hour, date, lat), [hour, date, lat]);
  const dir = useMemo(() => bearingDir(sun.az, facing, sun.el), [sun, facing]);
  const center = useMemo(() => new THREE.Vector3(L.w / 2, 0, L.d / 2), [L]);
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const day = sun.el > -2;
  const low = Math.max(0, Math.min(1, sun.el / 35));
  const color = useMemo(() => new THREE.Color('#ff9c55').lerp(new THREE.Color('#fff6ea'), low), [low]);
  const intensity = sun.el > 0 ? 1.4 + 2.6 * Math.sin((Math.min(sun.el, 70) * Math.PI) / 180) : 0;
  const { scene } = useThree();
  useEffect(() => {
    const l = lightRef.current; if (!l) return;
    l.target.position.copy(center); l.target.updateMatrixWorld();
  }, [center, dir]);
  useEffect(() => {
    scene.fog = new THREE.Fog(day ? new THREE.Color('#d7e1ea').lerp(new THREE.Color('#e9c7a1'), 1 - low) : new THREE.Color('#0f1626'), 160, 1300);
    return () => { scene.fog = null; };
  }, [day, low, scene]);
  const pos = useMemo(() => dir.clone().multiplyScalar(40).add(center), [dir, center]);
  const ext = Math.max(L.w, L.d) * 0.85;
  const envKey = `${day ? 'd' : 'n'}${Math.round(low * 4)}`;
  return (
    <>
      <directionalLight ref={lightRef} position={pos} intensity={intensity} color={color} castShadow={sun.el > 0}
        shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-ext} shadow-camera-right={ext} shadow-camera-top={ext} shadow-camera-bottom={-ext} shadow-camera-near={1} shadow-camera-far={90} />
      <hemisphereLight args={[day ? '#cfe3ff' : '#2a3a5a', day ? '#a89a86' : '#11151c', day ? 0.35 + 0.3 * low : 0.08]} />
      {day ? <Sky distance={4500} sunPosition={dir.toArray()} turbidity={7} rayleigh={sun.el < 12 ? 2.4 : 1.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
        : <><color attach="background" args={['#070b16']} /><Stars radius={900} depth={60} count={2500} factor={18} fade speed={0.3} /></>}
      <Environment key={envKey} resolution={128} frames={1} environmentIntensity={day ? 0.55 + 0.25 * low : 0.12}>
        <Lightformer form="rect" intensity={2.2} color={day ? '#e6eef8' : '#2a3550'} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[24, 24, 1]} />
        <Lightformer form="rect" intensity={1.4} color={day ? (low < 0.5 ? '#ffd9b0' : '#fff0dc') : '#3a3020'} position={[0, 2, 12]} scale={[24, 5, 1]} />
        <Lightformer form="rect" intensity={0.8} color={day ? '#d6e4f2' : '#20283a'} position={[-12, 2, 0]} rotation-y={Math.PI / 2} scale={[24, 5, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#c8c0b4" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[24, 24, 1]} />
      </Environment>
    </>
  );
}

function Post({ quality, night }: { quality: 'high' | 'low'; night: boolean }) {
  if (quality !== 'high') return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={0.75} distanceFalloff={0.6} intensity={2.4} quality="medium" halfRes />
      <Bloom mipmapBlur intensity={night ? 0.65 : 0.18} luminanceThreshold={night ? 0.7 : 0.95} luminanceSmoothing={0.2} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette eskil={false} offset={0.25} darkness={0.42} />
      <SMAA />
    </EffectComposer>
  );
}

/* ---------------- dollhouse ---------------- */

function DollhouseCamera({ L, enabled }: { L: Layout; enabled: boolean }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(L.w / 2, 0.6, L.d / 2), [L]);
  useEffect(() => {
    if (!enabled) return;
    const cam = camera as THREE.PerspectiveCamera;
    const r = Math.max(L.w, L.d);
    cam.position.set(L.w / 2 - r * 0.55, r * 1.05, L.d / 2 + r * 0.95);
    cam.fov = 42; cam.updateProjectionMatrix();
    cam.lookAt(target);
  }, [enabled, camera, L, target]);
  if (!enabled) return null;
  return <OrbitControls target={target} enableDamping dampingFactor={0.08} minDistance={5} maxDistance={Math.max(L.w, L.d) * 3} maxPolarAngle={1.32} minPolarAngle={0.12} />;
}

/* ---------------- the scene ---------------- */

function accentWalls(L: Layout, walls: WallPiece[]) {
  const keys = new Set<string>();
  for (const f of L.furniture) {
    if (f.type !== 'bed' && f.type !== 'tv_unit') continue;
    const a = ((f.rot ?? 0) * Math.PI) / 180, back = f.type === 'bed' ? 1.1 : 0.25;
    const px = f.x - Math.sin(a) * back, py = f.y - Math.cos(a) * back;
    let best: { k: string; d: number } | null = null;
    for (const p of walls) {
      if (p.room !== f.room || p.railing || p.bottom > 0) continue;
      const along = p.axis === 'x' ? px : py, across = p.axis === 'x' ? py : px;
      if (along < p.from - 0.05 || along > p.to + 0.05) continue;
      const d = Math.abs(across - p.fixed);
      if (d < 0.5 && (!best || d < best.d)) best = { k: `${p.room}:${p.side}:${p.from.toFixed(2)}`, d };
    }
    if (best) keys.add(best.k);
  }
  return keys;
}

const FurnitureSet = memo(function FurnitureSet({ L, M, onClick, onMove }: { L: Layout; M: Mats; onClick: (e: ThreeEvent<MouseEvent>) => void; onMove: (e: ThreeEvent<PointerEvent>) => void }) {
  return (
    <group onClick={onClick} onPointerMove={onMove}>
      {L.furniture.map((f, i) => <Furniture key={i} item={f} M={M} room={L.rooms.find((r) => r.id === f.room)} />)}
    </group>
  );
});

const RoomTags = memo(function RoomTags({ L, onPick }: { L: Layout; onPick: (r: string) => void }) {
  return <>{L.rooms.map((r) => (
    <Label key={r.id} text={r.name} sub={`${ftIn(r.w)} × ${ftIn(r.d)}`} position={[r.x + r.w / 2, L.height + 0.5, r.y + r.d / 2]} height={0.42} bg="rgba(18,32,28,.85)" onClick={() => onPick(r.id)} />
  ))}</>;
});

function Flat(props: FlatSceneProps) {
  const { layout: L, style, mode, phase, quality } = props;
  const M = useMemo(() => makeMaterials(style), [style]);
  const walls = useMemo(() => buildWalls(L), [L]);
  const ops = useMemo(() => resolveOpenings(L), [L]);
  const accents = useMemo(() => accentWalls(L, walls), [L, walls]);
  const nav = useMemo(() => makeNav(L), [L]);
  const sun = useMemo(() => sunPosition(props.hour, props.date, props.latitude), [props.hour, props.date, props.latitude]);
  const night = sun.el < 4;
  const lightMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f2ee', emissive: '#fff1d6', emissiveIntensity: 0 }), []);
  useEffect(() => { lightMat.emissiveIntensity = night ? 4 : 0.15; M.lampShade.emissiveIntensity = night ? 1.6 : 0; }, [night, lightMat, M]);
  const [room, setRoom] = useState<string | null>(null);
  const cursor = useRef<CursorState>({ x: 0, y: 0, ok: true, on: false });
  const clickRef = useRef<((x: number, y: number, room?: string) => void) | null>(null);
  const live = useRef(props); live.current = props;
  const walk = mode === 'walk';
  const walkRef = useRef(walk); walkRef.current = walk;
  const H = Math.max(0.5, props.floor * (props.floorHeight ?? 3.0));

  const pick = useCallback((r: string) => live.current.onPickRoom?.(r), []);
  const onFloorMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const c = cursor.current;
    if (!walkRef.current || (e.buttons & 1)) { c.on = false; return; }
    c.x = e.point.x; c.y = e.point.z; c.on = true; c.ok = nav.free(e.point.x, e.point.z) || !!nav.nearest(e.point.x, e.point.z, 0.4);
  }, [nav]);
  const onFloorOut = useCallback(() => { cursor.current.on = false; }, []);
  const onFloorClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (!walkRef.current) { const r = roomAt(L, e.point.x, e.point.z); if (r) pick(r.id); return; }
    clickRef.current?.(e.point.x, e.point.z);
  }, [L, pick]);
  const onFurnitureClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    if (!walkRef.current) { const r = roomAt(L, e.point.x, e.point.z); if (r) pick(r.id); return; }
    const t = nav.nearest(e.point.x, e.point.z, 2); // walk up to whatever was clicked
    if (t) clickRef.current?.(t.x, t.y);
  }, [L, nav, pick]);
  const onFurnitureMove = useCallback((e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); cursor.current.on = false; }, []);
  const onPose = useCallback((p: Pose) => { setRoom((r) => (r === p.room ? r : p.room)); live.current.onPose?.(p); }, []);
  const goRoom = useCallback((r: string) => clickRef.current?.(0, 0, r), []);

  return (
    <>
      <SunAndSky L={L} facing={props.facingDeg} hour={props.hour} date={props.date} lat={props.latitude} quality={quality} />
      <Floors L={L} M={M} phase={phase} onFloorMove={onFloorMove} onFloorClick={onFloorClick} onFloorOut={onFloorOut} />
      <Walls L={L} M={M} phase={phase} walls={walls} accentKeys={accents} />
      <Openings L={L} M={M} phase={phase} ops={ops} />
      <SiteStage L={L} M={M} phase={phase} ops={ops} />
      {walk && phase !== 'not_started' && <Ceiling L={L} M={M} phase={phase} night={night} lightMat={lightMat} />}
      {!walk && (phase === 'finished' || phase === 'ready') && night && L.rooms.filter((r) => r.kind === 'living' || r.kind === 'bedroom').map((r) => (
        <pointLight key={r.id} position={[r.x + r.w / 2, 2.4, r.y + r.d / 2]} intensity={5} distance={7} decay={2} color="#ffe2bd" />
      ))}
      {phase === 'finished' && <FurnitureSet L={L} M={M} onClick={onFurnitureClick} onMove={onFurnitureMove} />}
      <Corridor L={L} M={M} ops={ops} ceiling={walk} />
      <Outside L={L} M={M} H={H} view={props.view} night={night} />
      {walk && <Cursor cursor={cursor} />}
      {walk && <Hotspots L={L} current={room} onGo={goRoom} />}
      {!walk && <RoomTags L={L} onPick={pick} />}
      <WalkControls L={L} enabled={walk} goTo={props.goTo} initial={props.initial} clickRef={clickRef} onPose={onPose} />
      <DollhouseCamera L={L} enabled={!walk} />
      <Post quality={quality} night={night} />
    </>
  );
}

export default function FlatScene(props: FlatSceneProps) {
  return (
    <Canvas key={props.quality} shadows dpr={props.quality === 'high' ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: props.quality !== 'high', powerPreference: 'high-performance' }}
      camera={{ fov: 62, near: 0.05, far: 6000, position: [props.layout.w / 2, EYE, 1] }}
      style={{ touchAction: 'none' }}>
      <Flat {...props} />
    </Canvas>
  );
}
