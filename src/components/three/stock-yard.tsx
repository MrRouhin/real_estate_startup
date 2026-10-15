'use client';
// Materials as 3D stacks in a store yard: height = stock in store, red pulse = below reorder level.
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Label } from './label';
import { useRef } from 'react';
import * as THREE from 'three';
import { qty } from '@/lib/format';

export type YardItem = { id: string; name: string; unit: string; category: string; in_store: number; reorder_level: number };
const CAT: Record<string, string> = {
  cement: '#9aa3ad', steel: '#5b6b7c', aggregate: '#b79a73', masonry: '#c56b4d', pipes: '#8a8f98', electrical: '#e0a21b', finishing: '#8b5cf6', other: '#0e5d63',
};

export default function StockYard({ items, dark }: { items: YardItem[]; dark?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.in_store / Math.max(i.reorder_level, 1)));
  const cols = Math.min(items.length, 4);
  const rows = Math.ceil(items.length / cols);
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 6.5, 9.5], fov: 36 }} gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <hemisphereLight args={[dark ? '#8aa' : '#eef6ff', dark ? '#222' : '#8a806c', dark ? 0.6 : 1]} />
      <directionalLight position={[5, 10, 6]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[cols * 2.4 + 1.5, rows * 2.4 + 1.5]} />
        <meshStandardMaterial color={dark ? '#2a2f31' : '#cfd3d6'} roughness={1} />
      </mesh>
      {items.map((it, k) => {
        const c = k % cols, r = Math.floor(k / cols);
        const x = (c - (cols - 1) / 2) * 2.4, z = (r - (rows - 1) / 2) * 2.4;
        const ratio = it.in_store / Math.max(it.reorder_level, 1);
        return <Stack key={it.id} item={it} x={x} z={z} h={0.15 + (ratio / max) * 2.6} low={it.in_store < it.reorder_level} delay={k * 0.08} />;
      })}
      <OrbitControls enablePan={false} minDistance={6} maxDistance={18} maxPolarAngle={1.25} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
}

function Stack({ item, x, z, h, low, delay }: { item: YardItem; x: number; z: number; h: number; low: boolean; delay: number }) {
  const m = useRef<THREE.Mesh>(null);
  const t0 = useRef<number | null>(null);
  const color = CAT[item.category] || CAT.other!;
  useFrame(({ clock }) => {
    if (!m.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = Math.max(0, clock.elapsedTime - t0.current - delay);
    const f = 1 - Math.pow(1 - Math.min(1, t / 1.2), 3);
    const cur = Math.max(0.001, h * f);
    m.current.scale.y = cur; m.current.position.y = cur / 2;
    const mat = m.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = low ? 0.35 + Math.sin(clock.elapsedTime * 4) * 0.25 : 0;
  });
  return (
    <group position={[x, 0, z]}>
      <mesh ref={m} castShadow receiveShadow scale={[1, 0.001, 1]}>
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshStandardMaterial color={color} emissive={low ? '#d2504b' : '#000'} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.8, 1.8]} /><meshStandardMaterial color="#8d6e4a" transparent opacity={0.35} />
      </mesh>
      <Label text={item.name} sub={`${qty(item.in_store)} ${item.unit}${low ? ' · below reorder' : ''}`} position={[0, h + 0.55, 0]} height={0.62}
        bg={low ? '#c43d38' : '#ffffff'} fg={low ? '#ffffff' : '#12201c'} subFg={low ? 'rgba(255,255,255,.85)' : '#4f5f5a'} />
    </group>
  );
}
