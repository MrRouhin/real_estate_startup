'use client';
// The 3D site: every element is driven by milestone progress (0–100), so the
// same scene shows today's site, any past construction update, or a replay.
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Label } from './label';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { bbox, liveStatus, pathToPoints, STATUS_COLOR } from '@/lib/site';
import { lakh } from '@/lib/format';
import type { PlotShape, Progress, Rect, SiteLayout } from '@/lib/types';

const S = 0.02;
const X = (px: number) => (px - 500) * S;
const Z = (py: number) => (py - 350) * S;
const ease = (cur: number, target: number, dt: number, speed = 2.6) => cur + (target - cur) * Math.min(1, dt * speed);

export type SceneProps = {
  plots: PlotShape[];
  layout: SiteLayout;
  progress: Progress;
  selectedId?: string | null;
  onSelect?: (p: PlotShape) => void;
  matches?: (p: PlotShape) => boolean;
  autoRotate?: boolean;
  labels?: boolean;
  dark?: boolean;
  zoom?: 'wide' | 'close';
  /** Pause rendering when off screen or hidden behind the 2D view. */
  active?: boolean;
};

export default function SiteScene(props: SceneProps) {
  const [rotating, setRotating] = useState(props.autoRotate ?? true);
  const cam = props.zoom === 'close' ? [3, 10, 14] : [4, 12.5, 20];
  return (
    <Canvas frameloop={props.active === false ? 'never' : 'always'} shadows dpr={[1, 2]} camera={{ position: cam as [number, number, number], fov: 34, near: 0.5, far: 200 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} style={{ touchAction: 'none' }}>
      <hemisphereLight args={[props.dark ? '#7f9cb0' : '#e6f2ff', props.dark ? '#1b1712' : '#8d806a', props.dark ? 0.55 : 0.95]} />
      <ambientLight intensity={props.dark ? 0.15 : 0.25} />
      <directionalLight position={[9, 16, 7]} intensity={props.dark ? 1.1 : 1.7} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0008} />
      <Site {...props} />
      <FitCamera close={props.zoom === 'close'} />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} minDistance={8} maxDistance={40}
        minPolarAngle={0.3} maxPolarAngle={1.22} autoRotate={rotating} autoRotateSpeed={0.45} target={[0, 0, 0.4]}
        onStart={() => setRotating(false)} />
    </Canvas>
  );
}

/** Keeps the whole site in frame whatever the canvas shape (phone or wide desktop). */
function FitCamera({ close }: { close?: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(size.height, 1);
    const vfov = (cam.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const halfW = close ? 9.5 : 11.2, halfH = close ? 6.5 : 7.6;
    const d = Math.max(halfW / Math.tan(hfov / 2), halfH / Math.tan(vfov / 2) * 1.35) * 1.02;
    const dir = cam.position.clone().normalize();
    cam.position.copy(dir.multiplyScalar(Math.min(38, Math.max(close ? 11 : 13, d))));
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, close]);
  return null;
}

function Site({ plots, layout, progress, selectedId, onSelect, matches, labels, dark }: SceneProps) {
  const p = (k: keyof Progress) => Math.max(0, Math.min(100, Number(progress[k] ?? 0))) / 100;
  const b = layout.boundary;
  const mainRoads = layout.roads.filter((r) => r.main);
  return (
    <group>
      {/* ground and site slab */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.13, 0]} receiveShadow>
        <circleGeometry args={[42, 64]} />
        <meshStandardMaterial color={dark ? '#121a17' : '#d9e3d4'} roughness={1} />
      </mesh>
      <mesh position={[X(b.x + b.w / 2), -0.06, Z(b.y + b.h / 2)]} receiveShadow>
        <boxGeometry args={[b.w * S, 0.12, b.h * S]} />
        <meshStandardMaterial color={dark ? '#3a3227' : '#cdb995'} roughness={1} />
      </mesh>

      {layout.roads.map((r, i) => <Road key={i} rect={r} progress={p('roads')} dark={dark} />)}
      {mainRoads.map((r, i) => <Drains key={i} rect={r} progress={p('drains')} />)}
      {layout.roads.length > 0 && <Roller roads={mainRoads.length ? mainRoads : layout.roads} progress={p('roads')} />}
      <CompoundWall boundary={b} progress={p('compound_wall')} />
      <StreetLights roads={mainRoads} progress={p('electrical')} />
      {layout.park && <Park rect={layout.park} avoid={layout.clubhouse} tank={layout.water_tank} progress={p('park')} dark={dark} />}
      {layout.clubhouse && <Clubhouse rect={layout.clubhouse} progress={p('clubhouse')} />}
      {layout.water_tank && <WaterTank at={layout.water_tank} progress={p('water_tank')} />}

      <Surroundings boundary={b} dark={dark} />
      {plots.map((pl) => (
        <PlotSlab key={pl.id} plot={pl} selected={pl.id === selectedId} dim={matches ? !matches(pl) : false}
          onSelect={onSelect} label={labels} />
      ))}
    </group>
  );
}

// ---------- Context outside the wall: an access road and a ring of trees ----------
function Surroundings({ boundary: b, dark }: { boundary: Rect; dark?: boolean }) {
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = [];
    let seed = 11; const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const x0 = X(b.x) - 0.8, x1 = X(b.x + b.w) + 0.8, z0 = Z(b.y) - 0.8, z1 = Z(b.y + b.h) + 0.8;
    for (let i = 0; i < 46; i++) {
      const side = i % 4, t = r();
      const x = side === 0 ? x0 + t * (x1 - x0) : side === 1 ? x1 + r() * 1.4 : side === 2 ? x0 + t * (x1 - x0) : x0 - r() * 1.4;
      const z = side === 0 ? z0 - r() * 1.4 : side === 2 ? z1 + 1.4 + r() * 1.2 : z0 + t * (z1 - z0);
      out.push({ x, z, s: 0.6 + r() * 0.6 });
    }
    return out;
  }, [b]);
  return (
    <group>
      <mesh position={[0, 0.002, Z(b.y + b.h) + 1.05]} receiveShadow>
        <boxGeometry args={[60, 0.01, 1.1]} />
        <meshStandardMaterial color={dark ? '#2a2e31' : '#5a5f64'} roughness={0.9} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.03, 0.045, 0.32, 5]} /><meshStandardMaterial color="#6f5238" /></mesh>
          <mesh position={[0, 0.5, 0]} castShadow><coneGeometry args={[0.24, 0.6, 6]} /><meshStandardMaterial color={dark ? '#2c4a30' : '#5f9a52'} flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Roads: gravel base, asphalt that grows with progress, centre-line dashes ----------
function Road({ rect, progress, dark }: { rect: Rect; progress: number; dark?: boolean }) {
  const horizontal = rect.w >= rect.h;
  const len = (horizontal ? rect.w : rect.h) * S, wid = (horizontal ? rect.h : rect.w) * S;
  const cx = X(rect.x + rect.w / 2), cz = Z(rect.y + rect.h / 2);
  const start = horizontal ? X(rect.x) : Z(rect.y);
  const asphalt = useRef<THREE.Mesh>(null);
  const dashes = useRef<THREE.Group>(null);
  const cur = useRef(0);
  const nDash = Math.floor(len / 0.6);
  useFrame((_, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.6);
    const f = Math.max(cur.current, 0.0001);
    if (asphalt.current) {
      asphalt.current.scale.set(horizontal ? f : 1, 1, horizontal ? 1 : f);
      if (horizontal) asphalt.current.position.x = start + (len * f) / 2; else asphalt.current.position.z = start + (len * f) / 2;
    }
    dashes.current?.children.forEach((c, i) => { c.visible = (i + 0.5) / nDash < cur.current && progress >= 0.999; });
  });
  return (
    <group>
      <mesh position={[cx, 0.006, cz]} receiveShadow>
        <boxGeometry args={[horizontal ? len : wid, 0.012, horizontal ? wid : len]} />
        <meshStandardMaterial color={dark ? '#5d574d' : '#a99f8d'} roughness={1} />
      </mesh>
      <mesh ref={asphalt} position={[horizontal ? start : cx, 0.016, horizontal ? cz : start]} receiveShadow>
        <boxGeometry args={[horizontal ? len : wid * 0.96, 0.012, horizontal ? wid * 0.96 : len]} />
        <meshStandardMaterial color={dark ? '#23272b' : '#3a3f45'} roughness={0.85} />
      </mesh>
      {rect.main && (
        <group ref={dashes}>
          {Array.from({ length: nDash }, (_, i) => {
            const t = start + (i + 0.5) * (len / nDash);
            return (
              <mesh key={i} position={[horizontal ? t : cx, 0.024, horizontal ? cz : t]} visible={false}>
                <boxGeometry args={[horizontal ? 0.26 : 0.03, 0.004, horizontal ? 0.03 : 0.26]} />
                <meshStandardMaterial color="#f4f1e8" emissive="#f4f1e8" emissiveIntensity={0.15} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

function Drains({ rect, progress }: { rect: Rect; progress: number }) {
  const horizontal = rect.w >= rect.h;
  const len = (horizontal ? rect.w : rect.h) * S, wid = (horizontal ? rect.h : rect.w) * S;
  const start = horizontal ? X(rect.x) : Z(rect.y);
  const refs = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  const cur = useRef(0);
  useFrame((_, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.6);
    const f = Math.max(cur.current, 0.0001);
    refs.forEach((r) => {
      if (!r.current) return;
      r.current.scale.set(horizontal ? f : 1, 1, horizontal ? 1 : f);
      if (horizontal) r.current.position.x = start + (len * f) / 2; else r.current.position.z = start + (len * f) / 2;
    });
  });
  return (
    <group>
      {[-1, 1].map((side, i) => {
        const off = side * (wid / 2 + 0.06);
        return (
          <mesh key={side} ref={refs[i]} position={[horizontal ? start : X(rect.x + rect.w / 2) + off, 0.02, horizontal ? Z(rect.y + rect.h / 2) + off : start]}>
            <boxGeometry args={[horizontal ? len : 0.09, 0.03, horizontal ? 0.09 : len]} />
            <meshStandardMaterial color="#2f6f8a" roughness={0.4} metalness={0.1} />
          </mesh>
        );
      })}
    </group>
  );
}

// A road roller that works at the asphalt front while roads are under construction
function Roller({ roads, progress }: { roads: Rect[]; progress: number }) {
  const road = roads.reduce((a, r) => (Math.max(r.w, r.h) > Math.max(a.w, a.h) ? r : a), roads[0]!);
  const horizontal = road.w >= road.h;
  const len = (horizontal ? road.w : road.h) * S;
  const start = horizontal ? X(road.x) : Z(road.y);
  const g = useRef<THREE.Group>(null);
  const drum = useRef<THREE.Mesh>(null);
  const cur = useRef(0);
  useFrame(({ clock }, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.6);
    if (!g.current) return;
    const active = progress > 0.01 && progress < 0.99;
    g.current.visible = active;
    const wobble = Math.sin(clock.elapsedTime * 0.9) * 0.35;
    const pos = start + len * cur.current + wobble;
    if (horizontal) g.current.position.set(pos, 0.12, Z(road.y + road.h / 2)); else g.current.position.set(X(road.x + road.w / 2), 0.12, pos);
    if (drum.current) drum.current.rotation.z = clock.elapsedTime * 2.2;
  });
  return (
    <group ref={g} rotation-y={horizontal ? 0 : Math.PI / 2}>
      <mesh position={[0.18, 0.08, 0]} castShadow><boxGeometry args={[0.34, 0.2, 0.26]} /><meshStandardMaterial color="#f2b705" roughness={0.5} /></mesh>
      <mesh position={[0.22, 0.25, 0]} castShadow><boxGeometry args={[0.18, 0.16, 0.22]} /><meshStandardMaterial color="#2b2f33" /></mesh>
      <mesh ref={drum} position={[-0.16, 0.02, 0]} rotation-x={Math.PI / 2} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.3, 16]} /><meshStandardMaterial color="#6b7076" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ---------- Compound wall rises with progress; gate appears at the end ----------
function CompoundWall({ boundary: b, progress }: { boundary: Rect; progress: number }) {
  const segs = useMemo(() => {
    const x0 = X(b.x), x1 = X(b.x + b.w), z0 = Z(b.y), z1 = Z(b.y + b.h);
    const gap = 1.2; // gate opening on the west side near the south-west corner
    return [
      { x: (x0 + x1) / 2, z: z0, w: x1 - x0, d: 0.12 },
      { x: (x0 + x1) / 2, z: z1, w: x1 - x0, d: 0.12 },
      { x: x1, z: (z0 + z1) / 2, w: 0.12, d: z1 - z0 },
      { x: x0, z: (z0 + z1 - gap) / 2, w: 0.12, d: z1 - z0 - gap },
    ];
  }, [b]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const gate = useRef<THREE.Group>(null);
  const cur = useRef(0);
  const H = 0.5;
  useFrame((_, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.8);
    const h = Math.max(cur.current * H, 0.0001);
    refs.current.forEach((m) => { if (m) { m.scale.y = h / H; m.position.y = h / 2; } });
    if (gate.current) { const s = Math.max(0.0001, Math.min(1, (cur.current - 0.92) / 0.08)); gate.current.scale.setScalar(s); }
  });
  const gz = Z(b.y + b.h) - 0.6;
  return (
    <group>
      {segs.map((s, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} position={[s.x, 0, s.z]} castShadow receiveShadow>
          <boxGeometry args={[s.w, H, s.d]} />
          <meshStandardMaterial color="#e3dccd" roughness={0.9} />
        </mesh>
      ))}
      <group ref={gate} position={[X(b.x), 0, gz]}>
        {[-0.62, 0.62].map((dz) => (
          <mesh key={dz} position={[0, 0.42, dz]} castShadow><boxGeometry args={[0.24, 0.84, 0.24]} /><meshStandardMaterial color="#c9b48a" /></mesh>
        ))}
        <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[0.26, 0.14, 1.5]} /><meshStandardMaterial color="#0e5d63" /></mesh>
      </group>
    </group>
  );
}

// ---------- Street lights pop up one by one ----------
function StreetLights({ roads, progress }: { roads: Rect[]; progress: number }) {
  const poles = useMemo(() => {
    const out: { x: number; z: number; rot: number }[] = [];
    roads.forEach((r) => {
      const horizontal = r.w >= r.h;
      const len = (horizontal ? r.w : r.h) * S, wid = (horizontal ? r.h : r.w) * S;
      const n = Math.floor(len / 1.45);
      for (let i = 0; i < n; i++) {
        const t = (horizontal ? X(r.x) : Z(r.y)) + (i + 0.5) * (len / n);
        const side = i % 2 === 0 ? 1 : -1;
        const off = side * (wid / 2 + 0.22);
        if (horizontal) { if (Math.abs(t) < 0.7) continue; out.push({ x: t, z: Z(r.y + r.h / 2) + off, rot: side > 0 ? Math.PI : 0 }); }
        else { if (Math.abs(t - 0.4) < 0.7) continue; out.push({ x: X(r.x + r.w / 2) + off, z: t, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2 }); }
      }
    });
    return out;
  }, [roads]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const scales = useRef<number[]>([]);
  useFrame((_, dt) => {
    const visible = Math.round(poles.length * progress);
    refs.current.forEach((g, i) => {
      if (!g) return;
      const target = i < visible ? 1 : 0;
      const delay = Math.max(0, 1 - (visible - i) * 0.04);
      scales.current[i] = ease(scales.current[i] ?? 0, target, dt * (target ? 1 / (delay + 0.2) : 1), 4);
      const s = Math.max(scales.current[i]!, 0.0001);
      g.scale.set(s, s, s);
    });
  });
  return (
    <group>
      {poles.map((p, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} position={[p.x, 0, p.z]} rotation-y={p.rot} scale={0.0001}>
          <mesh position={[0, 0.42, 0]} castShadow><cylinderGeometry args={[0.022, 0.03, 0.84, 6]} /><meshStandardMaterial color="#6a7279" metalness={0.6} roughness={0.4} /></mesh>
          <mesh position={[0.12, 0.83, 0]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.012, 0.012, 0.26, 6]} /><meshStandardMaterial color="#6a7279" /></mesh>
          <mesh position={[0.24, 0.81, 0]}><boxGeometry args={[0.1, 0.035, 0.06]} /><meshStandardMaterial color="#fff6d6" emissive="#ffd36b" emissiveIntensity={1.6} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Park: soil greens up, trees appear ----------
function Park({ rect, avoid, tank, progress, dark }: { rect: Rect; avoid?: Rect; tank?: { x: number; y: number }; progress: number; dark?: boolean }) {
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; hue: number }[] = [];
    let seed = 7;
    const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; out.length < 20 && i < 400; i++) {
      const px = rect.x + 12 + r() * (rect.w - 24), py = rect.y + 12 + r() * (rect.h - 24);
      if (avoid && px > avoid.x - 14 && px < avoid.x + avoid.w + 14 && py > avoid.y - 14 && py < avoid.y + avoid.h + 14) continue;
      if (tank && Math.hypot(px - tank.x, py - tank.y) < 26) continue;
      if (out.some((t) => Math.hypot(X(px) - t.x, Z(py) - t.z) < 0.42)) continue;
      out.push({ x: X(px), z: Z(py), s: 0.75 + r() * 0.5, hue: r() });
    }
    return out;
  }, [rect, avoid, tank]);
  const grass = useRef<THREE.MeshStandardMaterial>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const cur = useRef(0);
  const soil = useMemo(() => new THREE.Color(dark ? '#3a3227' : '#cdb995'), [dark]);
  const green = useMemo(() => new THREE.Color(dark ? '#2f5a37' : '#7fbf6a'), [dark]);
  useFrame((_, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.8);
    grass.current?.color.copy(soil).lerp(green, Math.min(1, cur.current * 1.6));
    const visible = trees.length * progress;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const target = i < visible ? trees[i]!.s : 0;
      const s = ease(g.scale.x, target, dt, 3.2);
      g.scale.setScalar(Math.max(s, 0.0001));
    });
  });
  return (
    <group>
      <mesh position={[X(rect.x + rect.w / 2), 0.012, Z(rect.y + rect.h / 2)]} receiveShadow>
        <boxGeometry args={[rect.w * S, 0.02, rect.h * S]} />
        <meshStandardMaterial ref={grass} color={soil} roughness={1} />
      </mesh>
      {trees.map((t, i) => (
        <group key={i} ref={(g) => { refs.current[i] = g; }} position={[t.x, 0.02, t.z]} scale={0.0001}>
          <mesh position={[0, 0.14, 0]} castShadow><cylinderGeometry args={[0.03, 0.045, 0.28, 6]} /><meshStandardMaterial color="#7a5a3c" /></mesh>
          <mesh position={[0, 0.42, 0]} castShadow>
            <icosahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial color={new THREE.Color().setHSL(0.27 + t.hue * 0.07, 0.45, dark ? 0.3 : 0.38)} flatShading roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------- Clubhouse rises; a tower crane works until it is done ----------
function Clubhouse({ rect, progress }: { rect: Rect; progress: number }) {
  const walls = useRef<THREE.Mesh>(null);
  const glass = useRef<THREE.Mesh>(null);
  const roof = useRef<THREE.Mesh>(null);
  const crane = useRef<THREE.Group>(null);
  const jib = useRef<THREE.Group>(null);
  const cur = useRef(0);
  const W = rect.w * S, D = rect.h * S, H = 0.85;
  const cx = X(rect.x + rect.w / 2), cz = Z(rect.y + rect.h / 2);
  useFrame(({ clock }, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.6);
    const wallF = Math.max(0.0001, Math.min(1, cur.current / 0.85));
    if (walls.current) { walls.current.scale.y = wallF; walls.current.position.y = 0.06 + (H * wallF) / 2; }
    if (glass.current) { glass.current.scale.y = wallF; glass.current.position.y = 0.06 + (H * wallF) / 2; }
    if (roof.current) { const r = Math.max(0.0001, Math.min(1, (cur.current - 0.85) / 0.15)); roof.current.scale.set(r, 1, r); roof.current.visible = r > 0.01; }
    if (crane.current) crane.current.visible = progress > 0.005 && progress < 0.995;
    if (jib.current) jib.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 1.1;
  });
  return (
    <group position={[cx, 0, cz]}>
      {progress > 0 && (
        <mesh position={[0, 0.03, 0]} receiveShadow castShadow><boxGeometry args={[W + 0.1, 0.06, D + 0.1]} /><meshStandardMaterial color="#bdb6aa" /></mesh>
      )}
      <mesh ref={walls} position={[0, 0.06, 0]} castShadow receiveShadow scale={[1, 0.0001, 1]}>
        <boxGeometry args={[W, H, D]} /><meshStandardMaterial color="#f1ede4" roughness={0.8} />
      </mesh>
      <mesh ref={glass} position={[0, 0.06, 0]} scale={[1, 0.0001, 1]}>
        <boxGeometry args={[W * 1.004, H * 0.42, D * 1.004]} />
        <meshStandardMaterial color="#5aa6c4" metalness={0.3} roughness={0.15} transparent opacity={0.75} />
      </mesh>
      <mesh ref={roof} position={[0, 0.06 + H + 0.04, 0]} castShadow visible={false}>
        <boxGeometry args={[W + 0.25, 0.08, D + 0.25]} /><meshStandardMaterial color="#0e5d63" roughness={0.6} />
      </mesh>
      <group ref={crane} position={[W / 2 + 0.35, 0, -D / 2 - 0.2]}>
        <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[0.09, 2.5, 0.09]} /><meshStandardMaterial color="#f2b705" /></mesh>
        <group ref={jib} position={[0, 2.5, 0]}>
          <mesh position={[-0.9, 0, 0]} castShadow><boxGeometry args={[2.2, 0.07, 0.07]} /><meshStandardMaterial color="#f2b705" /></mesh>
          <mesh position={[0.45, -0.05, 0]}><boxGeometry args={[0.3, 0.18, 0.16]} /><meshStandardMaterial color="#555b61" /></mesh>
          <mesh position={[-1.6, -0.55, 0]}><cylinderGeometry args={[0.006, 0.006, 1.1, 4]} /><meshStandardMaterial color="#333" /></mesh>
          <mesh position={[-1.6, -1.12, 0]}><boxGeometry args={[0.12, 0.08, 0.12]} /><meshStandardMaterial color="#c0392b" /></mesh>
        </group>
      </group>
    </group>
  );
}

function WaterTank({ at, progress }: { at: { x: number; y: number }; progress: number }) {
  const cols = useRef<THREE.Group>(null);
  const tank = useRef<THREE.Group>(null);
  const cur = useRef(0);
  const H = 1.5;
  useFrame((_, dt) => {
    cur.current = ease(cur.current, progress, dt, 1.8);
    const c = Math.max(0.0001, Math.min(1, cur.current / 0.7));
    if (cols.current) { cols.current.scale.y = c; }
    if (tank.current) { const t = Math.max(0.0001, Math.min(1, (cur.current - 0.7) / 0.3)); tank.current.scale.setScalar(t); tank.current.position.y = H * c + 0.2; }
  });
  return (
    <group position={[X(at.x), 0, Z(at.y)]}>
      <group ref={cols} scale={[1, 0.0001, 1]}>
        {[[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].map(([dx, dz], i) => (
          <mesh key={i} position={[dx!, H / 2, dz!]} castShadow><boxGeometry args={[0.07, H, 0.07]} /><meshStandardMaterial color="#c9c4ba" /></mesh>
        ))}
      </group>
      <group ref={tank} scale={0.0001}>
        <mesh castShadow><cylinderGeometry args={[0.36, 0.3, 0.42, 18]} /><meshStandardMaterial color="#eae6de" roughness={0.6} /></mesh>
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.365, 0.365, 0.06, 18]} /><meshStandardMaterial color="#3a67d4" /></mesh>
      </group>
    </group>
  );
}

// ---------- Plots: extruded from their outline, coloured by live status ----------
function PlotSlab({ plot, selected, dim, onSelect, label }: { plot: PlotShape; selected: boolean; dim: boolean; onSelect?: (p: PlotShape) => void; label?: boolean }) {
  const pts = useMemo(() => pathToPoints(plot.shape_path), [plot.shape_path]);
  const geo = useMemo(() => {
    if (pts.length < 3) return null;
    const shape = new THREE.Shape(pts.map(([px, py]) => new THREE.Vector2(X(px), -Z(py))));
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [pts]);
  const box = useMemo(() => (pts.length ? bbox(pts) : null), [pts]);
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const status = liveStatus(plot);
  const color = STATUS_COLOR[status];
  useFrame(({ clock }, dt) => {
    if (!mesh.current) return;
    const lift = selected ? 0.2 : hover ? 0.1 : 0;
    mesh.current.position.y = ease(mesh.current.position.y, lift, dt, 8);
    const m = mesh.current.material as THREE.MeshStandardMaterial;
    m.emissiveIntensity = selected ? 0.35 + Math.sin(clock.elapsedTime * 4) * 0.12 : status === 'held' ? 0.25 + Math.sin(clock.elapsedTime * 5) * 0.2 : hover ? 0.2 : 0;
  });
  if (!geo || !box) return null;
  const interactive = !!onSelect;
  return (
    <group>
      <mesh ref={mesh} geometry={geo} castShadow receiveShadow
        onPointerOver={interactive ? (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer'; } : undefined}
        onPointerOut={interactive ? () => { setHover(false); document.body.style.cursor = ''; } : undefined}
        onClick={interactive ? (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect!(plot); } : undefined}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0} roughness={0.7} transparent opacity={dim ? 0.22 : 1} />
      </mesh>
      {(selected || hover) && !dim && (
        <Label text={`${plot.plot_number} · ${lakh(plot.price)}`} sub={`${Number(plot.area_sqft)} sq ft · ${status}`}
          position={[X(box.cx), selected ? 0.75 : 0.6, Z(box.cy)]} height={0.62} />
      )}
      {label && !selected && !hover && !dim && (
        <Label text={plot.plot_number} position={[X(box.cx), 0.2, Z(box.cy)]} height={0.26} plain mono />
      )}
    </group>
  );
}
