'use client';
// A parametric house on the buyer's plot: footprint inside the setbacks, one storey per floor,
// windows, door, parapet, car porch and garden. Units: 1 scene unit = 10 ft.
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import type { HousePlan } from '@/lib/ai/house';
import { Label } from './label';

const S = 0.1, FLOOR_H = 10.5;
const BEARING: Record<string, number> = { north: 0, north_east: 45, east: 90, south_east: 135, south: 180, south_west: 225, west: 270, north_west: 315 };

function Grow({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const g = useRef<THREE.Group>(null);
  const t = useRef(-delay);
  useFrame((_, dt) => { if (!g.current) return; t.current = Math.min(1, t.current + dt * 2.2); const k = Math.max(0.001, 1 - Math.pow(1 - Math.max(0, t.current), 3)); g.current.scale.set(1, k, 1); });
  return <group ref={g} scale={[1, 0.001, 1]}>{children}</group>;
}

function House({ plan, facing, finish, dark }: { plan: HousePlan; facing: string | null; finish: string; dark: boolean }) {
  const W = plan.plotW * S, D = plan.plotD * S;
  const fw = plan.footprint.w * S, fd = plan.footprint.d * S;
  // plot centred at origin; the road/front is +z
  const x0 = -W / 2 + plan.footprint.x * S + fw / 2;
  const z0 = D / 2 - plan.footprint.z * S - fd / 2;
  const fh = FLOOR_H * S;
  const wall = finish === 'premium' ? '#efe6d8' : finish === 'basic' ? '#e2ded6' : '#f3efe7';
  const accent = finish === 'premium' ? '#6b4f3a' : '#3f6d73';
  const winsPerFloor = Math.max(1, Math.floor(plan.footprint.w / 9));
  const b = BEARING[facing || 'east'] ?? 90;
  const th = (b * Math.PI) / 180;
  const north: [number, number] = [Math.sin(th), Math.cos(th)];
  return (
    <group>
      {/* road in front */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, D / 2 + 1.6]} receiveShadow><planeGeometry args={[W + 6, 3]} /><meshStandardMaterial color={dark ? '#2b3033' : '#5b6166'} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, D / 2 + 1.6]}><planeGeometry args={[W + 6, 0.06]} /><meshBasicMaterial color="#f5f5f0" /></mesh>
      {/* plot */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow><planeGeometry args={[W, D]} /><meshStandardMaterial color={dark ? '#3b4a32' : '#c9d6a8'} /></mesh>
      {/* boundary */}
      {[[0, D / 2, W, 0.08], [0, -D / 2, W, 0.08], [-W / 2, 0, 0.08, D], [W / 2, 0, 0.08, D]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x!, 0.12, z!]} castShadow><boxGeometry args={[w!, 0.24, d!]} /><meshStandardMaterial color="#b9ad98" /></mesh>
      ))}
      {/* setback outline */}
      <lineSegments position={[x0, 0.02, z0]} rotation-x={-Math.PI / 2}>
        <edgesGeometry args={[new THREE.PlaneGeometry(fw, fd)]} /><lineBasicMaterial color={dark ? '#9fb3a5' : '#5c6f62'} />
      </lineSegments>
      {plan.garden && (
        <mesh rotation-x={-Math.PI / 2} position={[x0, 0.015, z0 - fd / 2 - (plan.garden.d * S) / 2]}><planeGeometry args={[fw, plan.garden.d * S]} /><meshStandardMaterial color={dark ? '#2f5d34' : '#7fb06a'} /></mesh>
      )}
      {plan.parking && (
        <mesh rotation-x={-Math.PI / 2} position={[x0 - fw / 2 + (plan.parking.w * S) / 2 + 0.05, 0.02, D / 2 - (plan.setbacks.front * S) / 2]}>
          <planeGeometry args={[plan.parking.w * S, plan.setbacks.front * S]} /><meshStandardMaterial color={dark ? '#4b4f52' : '#a3a7a8'} /></mesh>
      )}
      <Grow>
        {Array.from({ length: plan.floors }, (_, f) => (
          <group key={f} position={[x0, f * fh, z0]}>
            <mesh position={[0, fh / 2, 0]} castShadow receiveShadow><boxGeometry args={[fw, fh - 0.04, fd]} /><meshStandardMaterial color={wall} /></mesh>
            <mesh position={[0, fh - 0.02, 0]} castShadow><boxGeometry args={[fw + 0.18, 0.08, fd + 0.18]} /><meshStandardMaterial color="#d6d0c6" /></mesh>
            {Array.from({ length: winsPerFloor }, (_, i) => {
              const wx = -fw / 2 + ((i + 0.5) * fw) / winsPerFloor;
              const isDoor = f === 0 && i === 0;
              return (
                <group key={i} position={[wx, 0, fd / 2 + 0.006]}>
                  <mesh position={[0, isDoor ? 0.37 : fh * 0.55, 0]}><planeGeometry args={[isDoor ? 0.32 : Math.min(0.5, fw / winsPerFloor * 0.5), isDoor ? 0.74 : 0.42]} /><meshStandardMaterial color={isDoor ? accent : '#3d5866'} metalness={isDoor ? 0 : 0.3} roughness={0.35} /></mesh>
                </group>
              );
            })}
            {Array.from({ length: Math.max(1, Math.floor(plan.footprint.d / 12)) }, (_, i) => (
              <mesh key={'s' + i} position={[fw / 2 + 0.006, fh * 0.55, -fd / 2 + ((i + 0.5) * fd) / Math.max(1, Math.floor(plan.footprint.d / 12))]} rotation-y={Math.PI / 2}>
                <planeGeometry args={[0.4, 0.4]} /><meshStandardMaterial color="#3d5866" metalness={0.3} roughness={0.35} /></mesh>
            ))}
          </group>
        ))}
        {/* parapet / terrace */}
        <group position={[x0, plan.floors * fh, z0]}>
          {[[0, fd / 2, fw, 0.06], [0, -fd / 2, fw, 0.06], [-fw / 2, 0, 0.06, fd], [fw / 2, 0, 0.06, fd]].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x!, 0.16, z!]} castShadow><boxGeometry args={[w!, 0.32, d!]} /><meshStandardMaterial color={wall} /></mesh>
          ))}
          {/* staircase head room */}
          <mesh position={[fw / 2 - 0.45, 0.45, -fd / 2 + 0.55]} castShadow><boxGeometry args={[0.8, 0.9, 1]} /><meshStandardMaterial color={wall} /></mesh>
          {plan.floors > 0 && <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[fw - 0.1, fd - 0.1]} /><meshStandardMaterial color="#c9c1b3" /></mesh>}
        </group>
      </Grow>
      {/* compass */}
      <group position={[W / 2 + 1.4, 0.05, -D / 2 + 0.6]}>
        <group rotation-y={Math.atan2(north[0], north[1])}>
          <mesh position={[0, 0.05, 0.3]} rotation-x={Math.PI / 2}><coneGeometry args={[0.16, 0.5, 16]} /><meshStandardMaterial color="#c43d38" /></mesh>
        </group>
        <mesh rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.62, 32]} /><meshBasicMaterial color={dark ? '#cfd8d4' : '#334'} /></mesh>
        <Label text="N" position={[north[0] * 1.05, 0.25, north[1] * 1.05]} height={0.28} />
      </group>
      <Label text="Road" position={[0, 0.3, D / 2 + 1.6]} height={0.3} plain />
    </group>
  );
}

export default function HouseScene({ plan, facing, finish, dark = false }: { plan: HousePlan; facing: string | null; finish: string; dark?: boolean }) {
  const span = Math.max(plan.plotW, plan.plotD, plan.floors * FLOOR_H * 1.25) * S;
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [span * 1.25, span * 1.05, span * 1.75], fov: 35 }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }} style={{ touchAction: 'none' }}>
      <hemisphereLight args={[dark ? '#7f9cb0' : '#eef6ff', dark ? '#1b1712' : '#8d806a', dark ? 0.6 : 1]} />
      <directionalLight position={[span, span * 2, span * 0.8]} intensity={dark ? 1.1 : 1.6} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} />
      <House key={`${plan.floors}-${plan.footprint.w}-${plan.footprint.d}-${!!plan.garden}-${!!plan.parking}`} plan={plan} facing={facing} finish={finish} dark={dark} />
      <OrbitControls enablePan={false} enableDamping minDistance={span * 0.9} maxDistance={span * 4} maxPolarAngle={1.35} target={[0, (plan.floors * FLOOR_H * S) / 2.6, 0]} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}
