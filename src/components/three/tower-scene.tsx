'use client';
// Apartment towers in 3D. Every floor is drawn as it stands on site today (slab and columns,
// blockwork, plastered, finished facade, or a ghost outline if not cast yet), with a crane on
// towers still rising. "Availability" mode colours each flat by status, like a 3D stacking
// plan. Flats are clickable.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { liveStatus, STATUS_COLOR } from '@/lib/site';
import { lakh } from '@/lib/format';
import { floorStage, type FloorStage } from '@/lib/flats/tower';
import type { Layout } from '@/lib/flats/layout';
import type { PlotStatus } from '@/lib/types';
import { Label } from './label';
import { worldBox } from './flat/geo';
import { concreteTexture, blockTexture, grassTexture } from './flat/materials';

export type TowerData = {
  id: string; code: string; name: string; floors: number; units_per_floor: number; slabs_cast: number; stages: unknown;
  expected_completion: string | null; position: { x: number; z: number; rot: number } | null; floor_height_m: number;
};
export type TowerFlat = { id: string; plot_number: string; status: PlotStatus; held_until: string | null; price: number; floor: number | null; stack: number | null; unit_type_id: string | null; tower_id: string | null };
export type TowerType = { id: string; layout: Layout; name?: string; code?: string };
export type TowerSceneProps = {
  towers: TowerData[]; flats: TowerFlat[]; types: TowerType[];
  mode?: 'construction' | 'status'; selectedId?: string | null; onSelect?: (id: string) => void;
  matches?: (f: TowerFlat) => boolean; compact?: boolean; autoRotate?: boolean; dark?: boolean; active?: boolean; labels?: boolean;
};

const CORRIDOR = 2.4;

/** Where each stack sits on a floor plate: front row faces +z, back row −z (entries meet at the corridor). */
export function floorPlate(t: TowerData, flats: TowerFlat[], types: TowerType[]) {
  const upf = t.units_per_floor, half = Math.ceil(upf / 2);
  const typeOf = (stack: number) => {
    const f = flats.find((x) => x.tower_id === t.id && x.stack === stack && x.unit_type_id);
    return types.find((ty) => ty.id === f?.unit_type_id)?.layout ?? null;
  };
  const front = Array.from({ length: half }, (_, i) => i + 1);
  const back = Array.from({ length: upf - half }, (_, i) => upf - i);
  const units: { stack: number; x: number; z: number; w: number; d: number; front: boolean; layout: Layout | null; balcony: { x: number; w: number; d: number } | null }[] = [];
  for (const [row, isFront] of [[front, true], [back, false]] as const) {
    const ls = row.map((s) => typeOf(s));
    const total = ls.reduce((a, l) => a + (l?.w ?? 10), 0);
    let x = -total / 2;
    row.forEach((s, i) => {
      const L = ls[i] ?? null, w = L?.w ?? 10, d = L?.d ?? 10;
      const b = L?.rooms.find((r) => r.kind === 'balcony');
      // the balcony's x within the unit, flipped for the back row (seen from the front)
      const bx = b ? (isFront ? b.x : w - b.x - b.w) : 0;
      units.push({ stack: s, x: x + w / 2, z: isFront ? CORRIDOR / 2 + d / 2 : -CORRIDOR / 2 - d / 2, w, d, front: isFront, layout: L, balcony: b ? { x: -w / 2 + bx + b.w / 2, w: b.w, d: b.d } : null });
      x += w;
    });
  }
  const width = Math.max(...units.map((u) => Math.abs(u.x) + u.w / 2)) * 2;
  const depth = Math.max(...units.map((u) => Math.abs(u.z) + u.d / 2)) * 2;
  return { units, width, depth };
}

function facadeTex(kind: 'finished' | 'services') {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = kind === 'finished' ? '#ece6da' : '#c9c6bf'; g.fillRect(0, 0, 256, 256);
  // two windows per 3 m bay with a frame and a lintel band
  for (const x of [28, 148]) {
    g.fillStyle = kind === 'finished' ? '#2c3d48' : '#3b3a37'; g.fillRect(x, 70, 80, 120);
    if (kind === 'finished') {
      const gr = g.createLinearGradient(x, 70, x + 80, 190); gr.addColorStop(0, 'rgba(180,215,235,.55)'); gr.addColorStop(1, 'rgba(40,60,75,.1)');
      g.fillStyle = gr; g.fillRect(x, 70, 80, 120);
      g.fillStyle = '#f7f7f5'; g.fillRect(x - 4, 66, 88, 6); g.fillRect(x - 4, 188, 88, 6); g.fillRect(x + 38, 70, 4, 120);
    }
  }
  g.fillStyle = kind === 'finished' ? '#d9d1c2' : '#b9b5ad'; g.fillRect(0, 0, 256, 14);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function useMats() {
  return useMemo(() => {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(o);
    const status = Object.fromEntries((Object.keys(STATUS_COLOR) as PlotStatus[]).map((k) => [k, std({ color: STATUS_COLOR[k], roughness: 0.55, emissive: STATUS_COLOR[k], emissiveIntensity: k === 'available' ? 0.18 : 0.05 })])) as Record<PlotStatus, THREE.MeshStandardMaterial>;
    return {
      finished: std({ map: facadeTex('finished'), roughness: 0.7 }),
      services: std({ map: facadeTex('services'), roughness: 0.9 }),
      blocks: std({ map: blockTexture(), roughness: 0.95 }),
      concrete: std({ map: concreteTexture(), roughness: 0.95 }),
      slab: std({ color: '#b9b6ae', roughness: 0.9 }),
      ghost: new THREE.MeshBasicMaterial({ color: '#4fb8be', transparent: true, opacity: 0.07, depthWrite: false }),
      ghostLine: new THREE.LineBasicMaterial({ color: '#4fb8be', transparent: true, opacity: 0.35 }),
      dim: std({ color: '#9aa3a8', transparent: true, opacity: 0.22, roughness: 0.8, depthWrite: false }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#cfe6ee', roughness: 0.05, transparent: true, opacity: 0.35, metalness: 0.1 }),
      rail: std({ color: '#c9ccd0', roughness: 0.3, metalness: 0.8 }),
      crane: std({ color: '#f0b43a', roughness: 0.5, metalness: 0.3 }),
      craneDark: std({ color: '#3b3f45', roughness: 0.6 }),
      core: std({ color: '#a8a59e', roughness: 0.9 }),
      lobby: new THREE.MeshPhysicalMaterial({ color: '#9fc4cf', roughness: 0.1, transparent: true, opacity: 0.55 }),
      select: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.0, depthWrite: false }),
      selectLine: new THREE.LineBasicMaterial({ color: '#f0b43a' }),
      status,
    };
  }, []);
}
type Mats = ReturnType<typeof useMats>;

function Crane({ height, at, phase = 0, M }: { height: number; at: [number, number]; phase?: number; M: Mats }) {
  const jib = useRef<THREE.Group>(null);
  useFrame((st) => { if (jib.current) jib.current.rotation.y = phase + Math.sin(st.clock.elapsedTime * 0.12 + phase) * 1.2; });
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, height / 2, 0]} material={M.crane} castShadow><boxGeometry args={[1.4, height, 1.4]} /></mesh>
      {Array.from({ length: Math.floor(height / 3) }, (_, i) => (
        <mesh key={i} position={[0, i * 3 + 1.5, 0]} rotation={[0, 0, Math.PI / 4]} material={M.craneDark}><boxGeometry args={[0.08, 2.1, 1.45]} /></mesh>
      ))}
      <group ref={jib} position={[0, height, 0]}>
        <mesh position={[11, 0.6, 0]} material={M.crane} castShadow><boxGeometry args={[26, 1.0, 1.0]} /></mesh>
        <mesh position={[-6, 0.6, 0]} material={M.crane}><boxGeometry args={[10, 0.9, 1.0]} /></mesh>
        <mesh position={[-9.5, 0.1, 0]} material={M.craneDark} castShadow><boxGeometry args={[2.6, 1.8, 1.8]} /></mesh>
        <mesh position={[0, 2.6, 0]} material={M.crane}><boxGeometry args={[0.8, 4.2, 0.8]} /></mesh>
        <mesh position={[0.6, 1.1, 0.9]} material={M.craneDark}><boxGeometry args={[1.6, 1.4, 1.2]} /></mesh>
        <mesh position={[16, -6, 0]} material={M.craneDark}><cylinderGeometry args={[0.03, 0.03, 12, 4]} /></mesh>
        <mesh position={[16, -12.2, 0]} material={M.crane}><boxGeometry args={[0.6, 0.4, 0.6]} /></mesh>
      </group>
    </group>
  );
}

type UnitProps = {
  u: ReturnType<typeof floorPlate>['units'][number]; y: number; fh: number; stage: FloorStage; flat?: TowerFlat; mode: 'construction' | 'status';
  M: Mats; selected: boolean; dimmed: boolean; onPick?: (id: string) => void; onHover?: (id: string | null) => void;
};
const Unit = memo(function Unit({ u, y, fh, stage, flat, mode, M, selected, dimmed, onPick, onHover }: UnitProps) {
  const bd = u.balcony?.d ?? 0;
  const bodyD = u.d - bd, h = fh - 0.2;
  // body sits on the corridor side; the balcony is the outer strip
  const bodyZ = u.front ? u.z - bd / 2 : u.z + bd / 2;
  const balZ = u.front ? u.z + u.d / 2 - bd / 2 : u.z - u.d / 2 + bd / 2;
  const geo = useMemo(() => worldBox(u.w - 0.08, h, bodyD - 0.04, 3), [u.w, h, bodyD]);
  useEffect(() => () => geo.dispose(), [geo]);
  const events = flat && onPick ? {
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (e.delta < 6) onPick(flat.id); },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover?.(flat.id); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { onHover?.(null); document.body.style.cursor = ''; },
  } : {};
  if (mode === 'status') {
    const st = flat ? liveStatus(flat) : 'blocked';
    const mat = dimmed ? M.dim : M.status[st];
    return (
      <group position={[u.x, y + h / 2 + 0.2, 0]}>
        <mesh position={[0, 0, u.z]} material={mat} castShadow={!dimmed} receiveShadow {...events}><boxGeometry args={[u.w - 0.3, h - 0.25, u.d - 0.3]} /></mesh>
        {selected && <Selection w={u.w} h={h} d={u.d} z={u.z} M={M} />}
      </group>
    );
  }
  if (stage === 'not_started') {
    return (
      <group position={[u.x, y + h / 2 + 0.2, 0]}>
        <mesh position={[0, 0, u.z]} material={M.ghost} {...events}><boxGeometry args={[u.w - 0.1, h, u.d - 0.1]} /></mesh>
        {selected && <Selection w={u.w} h={h} d={u.d} z={u.z} M={M} />}
      </group>
    );
  }
  const body = stage === 'ready' ? M.finished : stage === 'services' ? M.services : stage === 'masonry' ? M.blocks : null;
  return (
    <group position={[u.x, y + 0.2, 0]}>
      {body ? <mesh position={[0, h / 2, bodyZ]} geometry={geo} material={body} castShadow receiveShadow {...events} />
        : <>
          {/* open frame: columns at the unit corners, and an invisible box to click */}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => (
            <mesh key={i} position={[a! * (u.w / 2 - 0.25), h / 2, u.z + b! * (u.d / 2 - 0.3)]} material={M.concrete} castShadow><boxGeometry args={[0.35, h, 0.5]} /></mesh>
          ))}
          <mesh position={[0, h / 2, u.z]} material={M.select} {...events}><boxGeometry args={[u.w, h, u.d]} /></mesh>
        </>}
      {u.balcony && (stage === 'ready' || stage === 'services') && (
        <group position={[u.balcony.x, 0, balZ]}>
          <mesh position={[0, 0.55, (u.front ? 1 : -1) * (bd / 2 - 0.03)]} material={stage === 'ready' ? M.glass : M.rail}>
            <boxGeometry args={[u.balcony.w, stage === 'ready' ? 1.05 : 0.05, 0.04]} />
          </mesh>
          {stage === 'ready' && <mesh position={[0, 1.1, (u.front ? 1 : -1) * (bd / 2 - 0.03)]} material={M.rail}><boxGeometry args={[u.balcony.w, 0.05, 0.06]} /></mesh>}
        </group>
      )}
      {selected && <group position={[0, h / 2, 0]}><Selection w={u.w} h={h} d={u.d} z={u.z} M={M} /></group>}
    </group>
  );
});

function Selection({ w, h, d, z, M }: { w: number; h: number; d: number; z: number; M: Mats }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((st) => { const m = ref.current?.material as THREE.MeshBasicMaterial | undefined; if (m) m.opacity = 0.25 + Math.sin(st.clock.elapsedTime * 3) * 0.12; });
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w + 0.15, h + 0.1, d + 0.15)), [w, h, d]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0b43a', transparent: true, opacity: 0.3, depthWrite: false }), []);
  return (
    <group position={[0, 0, z]}>
      <mesh ref={ref} material={mat}><boxGeometry args={[w + 0.12, h + 0.08, d + 0.12]} /></mesh>
      <lineSegments geometry={geo} material={M.selectLine} />
    </group>
  );
}

const Tower = memo(function Tower({ t, flats, types, mode, M, selectedId, matches, onPick, onHover, labels }: {
  t: TowerData; flats: TowerFlat[]; types: TowerType[]; mode: 'construction' | 'status'; M: Mats; selectedId?: string | null;
  matches?: (f: TowerFlat) => boolean; onPick?: (id: string) => void; onHover?: (id: string | null) => void; labels?: boolean;
}) {
  const plate = useMemo(() => floorPlate(t, flats, types), [t, flats, types]);
  const fh = t.floor_height_m || 3;
  const byKey = useMemo(() => new Map(flats.filter((f) => f.tower_id === t.id).map((f) => [`${f.floor}-${f.stack}`, f])), [flats, t.id]);
  const pos = t.position ?? { x: 0, z: 0, rot: 0 };
  const top = (t.floors + 1) * fh;
  const built = (t.slabs_cast + 1) * fh;
  const rising = t.slabs_cast < t.floors;
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, (pos.rot * Math.PI) / 180, 0]}>
      {/* stilt / lobby level */}
      <mesh position={[0, fh / 2, 0]} material={M.lobby}><boxGeometry args={[plate.width * 0.5, fh - 0.3, CORRIDOR + 3]} /></mesh>
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} position={[sx * (plate.width / 2 - 0.4), fh / 2, sz * (plate.depth / 2 - 0.4)]} material={M.concrete} castShadow><boxGeometry args={[0.6, fh, 0.6]} /></mesh>))}
      {/* lift and stair core, running a little ahead of the slabs */}
      <mesh position={[0, Math.min(top, built + fh) / 2, 0]} material={M.core} castShadow receiveShadow><boxGeometry args={[6, Math.min(top, built + fh), CORRIDOR + 1.2]} /></mesh>
      {Array.from({ length: t.floors }, (_, i) => {
        const floor = i + 1, y = floor * fh, stage = floorStage(t as never, floor);
        const cast = floor <= t.slabs_cast;
        return (
          <group key={floor}>
            {cast && mode === 'construction' && <mesh position={[0, y + 0.1, 0]} material={M.slab} castShadow receiveShadow><boxGeometry args={[plate.width + 0.3, 0.2, plate.depth + 0.3]} /></mesh>}
            {cast && mode === 'status' && <mesh position={[0, y + 0.06, 0]} material={M.slab}><boxGeometry args={[plate.width + 0.2, 0.12, plate.depth + 0.2]} /></mesh>}
            {plate.units.map((u) => {
              const f = byKey.get(`${floor}-${u.stack}`);
              return <Unit key={u.stack} u={u} y={y} fh={fh} stage={stage} flat={f} mode={mode} M={M} selected={!!f && f.id === selectedId}
                dimmed={mode === 'status' && !!matches && !!f && !matches(f)} onPick={onPick} onHover={onHover} />;
            })}
          </group>
        );
      })}
      {/* roof */}
      {!rising && <>
        <mesh position={[0, top + 0.6, 0]} material={M.finished}><boxGeometry args={[plate.width + 0.3, 1.2, plate.depth + 0.3]} /></mesh>
        <mesh position={[0, top + 2.4, 0]} material={M.core} castShadow><boxGeometry args={[7, 3.6, CORRIDOR + 2]} /></mesh>
      </>}
      {rising && <Crane height={built + 12} at={[plate.width / 2 + 4, 0]} phase={pos.x * 0.1} M={M} />}
      {labels && <Label text={t.name} sub={rising ? `${t.slabs_cast} of ${t.floors} slabs cast` : 'Structure complete'} position={[0, top + (rising ? 16 : 7), 0]} height={2.2} />}
    </group>
  );
});

function SiteGround({ towers, M, dark }: { towers: TowerData[]; M: Mats; dark?: boolean }) {
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1, color: dark ? '#6d7d66' : '#ffffff' }), [dark]);
  const xs = towers.map((t) => t.position?.x ?? 0), zs = towers.map((t) => t.position?.z ?? 0);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const trees = useMemo(() => {
    const out: [number, number, number][] = []; let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 46; i++) { const a = (i / 46) * Math.PI * 2, d = 62 + r() * 8; out.push([cx + Math.cos(a) * d, cz + Math.sin(a) * d * 0.75, 0.8 + r() * 0.6]); }
    return out;
  }, [cx, cz]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.02, cz]} material={grass} receiveShadow><circleGeometry args={[140, 48]} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.0, cz]} receiveShadow><ringGeometry args={[52, 58, 64]} /><meshStandardMaterial color="#5a5d61" roughness={0.9} /></mesh>
      {/* pool deck and pool, clubhouse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.02, cz + 26]} receiveShadow><planeGeometry args={[26, 14]} /><meshStandardMaterial color="#d8d2c6" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.05, cz + 26]}><planeGeometry args={[18, 8]} /><meshPhysicalMaterial color="#3fb6d3" roughness={0.05} clearcoat={1} emissive="#0b5f75" emissiveIntensity={0.25} /></mesh>
      <mesh position={[cx, 2.5, cz - 28]} material={M.finished} castShadow receiveShadow><boxGeometry args={[18, 5, 10]} /></mesh>
      {trees.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.15, 0.22, 2.8, 6]} /><meshStandardMaterial color="#5a4030" /></mesh>
          <mesh position={[0, 4.2, 0]} castShadow><icosahedronGeometry args={[2.2, 1]} /><meshStandardMaterial color={i % 3 ? '#4f7a3c' : '#5d8a45'} roughness={0.85} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Frame({ towers, compact, flats, types }: { towers: TowerData[]; compact?: boolean; flats: TowerFlat[]; types: TowerType[] }) {
  const { camera, size } = useThree();
  const target = useMemo(() => {
    if (compact && towers[0]) { const t = towers[0]; return new THREE.Vector3(t.position?.x ?? 0, ((t.floors + 1) * (t.floor_height_m || 3)) / 2, t.position?.z ?? 0); }
    const xs = towers.map((t) => t.position?.x ?? 0), zs = towers.map((t) => t.position?.z ?? 0);
    const hMax = Math.max(...towers.map((t) => (t.floors + 1) * (t.floor_height_m || 3)));
    return new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, hMax * 0.38, (Math.min(...zs) + Math.max(...zs)) / 2);
  }, [towers, compact]);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    let r: number;
    if (compact && towers[0]) {
      const p = floorPlate(towers[0], flats, types), h = (towers[0].floors + 1) * (towers[0].floor_height_m || 3);
      r = Math.max(h * 1.25, Math.max(p.width, p.depth) * 1.6 / Math.min(1, aspect));
    } else {
      const xs = towers.map((t) => t.position?.x ?? 0);
      r = Math.max(90, (Math.max(...xs) - Math.min(...xs) + 40) * 1.5 / Math.min(1.2, aspect));
    }
    const rot = compact && towers[0] ? ((towers[0].position?.rot ?? 0) * Math.PI) / 180 : 0;
    const dir = new THREE.Vector3(Math.sin(rot + 0.5), 0.42, Math.cos(rot + 0.5)).normalize();
    cam.position.copy(target).addScaledVector(dir, r);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  }, [camera, size, target, compact, towers, flats, types]);
  return <OrbitControlsWrapper target={target} compact={compact} />;
}
function OrbitControlsWrapper({ target, compact }: { target: THREE.Vector3; compact?: boolean }) {
  const [spin, setSpin] = useState(true);
  return <OrbitControls target={target} enablePan={!compact} enableDamping dampingFactor={0.08} minDistance={compact ? 20 : 40} maxDistance={compact ? 160 : 260}
    maxPolarAngle={1.42} autoRotate={spin} autoRotateSpeed={compact ? 0.6 : 0.3} onStart={() => setSpin(false)} />;
}

export default function TowerScene(props: TowerSceneProps) {
  const M = useMats();
  const [hover, setHover] = useState<string | null>(null);
  const mode = props.mode ?? 'construction';
  const hovered = hover ? props.flats.find((f) => f.id === hover) : null;
  const sel = props.selectedId ? props.flats.find((f) => f.id === props.selectedId) : null;
  const tag = (f: TowerFlat | null | undefined) => {
    if (!f) return null;
    const t = props.towers.find((x) => x.id === f.tower_id); if (!t) return null;
    const plate = floorPlate(t, props.flats, props.types), u = plate.units.find((x) => x.stack === f.stack); if (!u) return null;
    const fh = t.floor_height_m || 3, p = t.position ?? { x: 0, z: 0, rot: 0 }, a = (p.rot * Math.PI) / 180;
    const lx = u.x, lz = u.z + (u.front ? u.d / 2 : -u.d / 2);
    return { f, pos: [p.x + lx * Math.cos(a) + lz * Math.sin(a), (f.floor ?? 1) * fh + fh + 1.4, p.z - lx * Math.sin(a) + lz * Math.cos(a)] as [number, number, number] };
  };
  const hv = tag(hovered), sv = hovered?.id === sel?.id ? null : tag(sel);
  return (
    <Canvas frameloop={props.active === false ? 'never' : 'always'} shadows dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
      camera={{ fov: 32, near: 1, far: 1200, position: [80, 60, 80] }} style={{ touchAction: 'none' }}>
      <hemisphereLight args={[props.dark ? '#7f9cb0' : '#e6f2ff', props.dark ? '#1b1712' : '#8d806a', props.dark ? 0.5 : 0.9]} />
      <directionalLight position={[60, 90, 40]} intensity={props.dark ? 1.2 : 2.2} castShadow shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90} shadow-camera-far={300} shadow-bias={-0.0005} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} color="#e6eef8" position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form="rect" intensity={1} color="#fff0dc" position={[0, 3, 20]} scale={[40, 6, 1]} />
      </Environment>
      {!props.compact && <SiteGround towers={props.towers} M={M} dark={props.dark} />}
      {props.compact && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[props.towers[0]?.position?.x ?? 0, -0.02, props.towers[0]?.position?.z ?? 0]} receiveShadow><circleGeometry args={[40, 40]} /><meshStandardMaterial color={props.dark ? '#25302c' : '#d9dfd9'} roughness={1} /></mesh>}
      {props.towers.map((t) => (
        <Tower key={t.id} t={t} flats={props.flats} types={props.types} mode={mode} M={M} selectedId={props.selectedId} matches={props.matches}
          onPick={props.onSelect} onHover={setHover} labels={props.labels ?? !props.compact} />
      ))}
      {hv && <Label text={`Flat ${hv.f.plot_number}`} sub={`${liveStatus(hv.f)} · ${lakh(hv.f.price)}`} position={hv.pos} height={props.compact ? 2.4 : 2.8} />}
      {sv && <Label text={`Flat ${sv.f.plot_number}`} sub={props.compact ? 'This flat' : `${liveStatus(sv.f)} · ${lakh(sv.f.price)}`} position={sv.pos} height={props.compact ? 2.4 : 2.8} bg="#b4530a" />}
      <Frame towers={props.towers} compact={props.compact} flats={props.flats} types={props.types} />
    </Canvas>
  );
}
