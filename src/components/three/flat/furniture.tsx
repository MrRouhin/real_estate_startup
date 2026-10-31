'use client';
// Furniture for the flat tour, modelled from simple solids with real-world sizes (metres).
// Every item faces +z in its own space; the layout's `rot` turns it (0 = towards the balcony side).
import { RoundedBox } from '@react-three/drei';
import type * as THREE from 'three';
import type { FurnitureItem, Room } from '@/lib/flats/layout';
import type { Mats } from './materials';

type V3 = [number, number, number];
function Box({ s, p, m, r, shadow = true }: { s: V3; p: V3; m: THREE.Material; r?: V3; shadow?: boolean }) {
  return <mesh position={p} rotation={r} material={m} castShadow={shadow} receiveShadow><boxGeometry args={s} /></mesh>;
}
function Cyl({ rt, rb, h, p, m, seg = 20, r }: { rt: number; rb: number; h: number; p: V3; m: THREE.Material; seg?: number; r?: V3 }) {
  return <mesh position={p} rotation={r} material={m} castShadow receiveShadow><cylinderGeometry args={[rt, rb, h, seg]} /></mesh>;
}
function Soft({ s, p, m, r, radius = 0.05 }: { s: V3; p: V3; m: THREE.Material; r?: V3; radius?: number }) {
  return <RoundedBox args={s} radius={radius} smoothness={3} position={p} rotation={r} material={m} castShadow receiveShadow />;
}
const legs = (w: number, d: number, h: number, m: THREE.Material, inset = 0.06, r = 0.018) =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b], i) => <Cyl key={i} rt={r} rb={r * 0.8} h={h} p={[a! * (w / 2 - inset), h / 2, b! * (d / 2 - inset)]} m={m} seg={10} />);

function Sofa({ w = 2.2, M }: { w?: number; M: Mats }) {
  const n = w > 2 ? 3 : 2, cw = (w - 0.36) / n;
  return (
    <group>
      <Box s={[w, 0.3, 0.9]} p={[0, 0.25, 0]} m={M.fabric} />
      <Soft s={[w - 0.05, 0.5, 0.22]} p={[0, 0.6, -0.34]} m={M.fabric} radius={0.06} />
      {[-1, 1].map((sd) => <Soft key={sd} s={[0.18, 0.62, 0.9]} p={[sd * (w / 2 - 0.09), 0.36, 0]} m={M.fabric} radius={0.06} />)}
      {Array.from({ length: n }, (_, i) => <Soft key={i} s={[cw - 0.02, 0.16, 0.66]} p={[-w / 2 + 0.18 + cw * (i + 0.5), 0.48, 0.07]} m={M.fabric} radius={0.06} />)}
      {Array.from({ length: n }, (_, i) => <Soft key={'b' + i} s={[cw - 0.04, 0.42, 0.14]} p={[-w / 2 + 0.18 + cw * (i + 0.5), 0.75, -0.2]} r={[-0.12, 0, 0]} m={M.fabric} radius={0.06} />)}
      <Soft s={[0.42, 0.38, 0.12]} p={[-w / 2 + 0.42, 0.72, -0.06]} r={[-0.2, 0.25, 0.08]} m={M.cushion} radius={0.05} />
      <Soft s={[0.42, 0.38, 0.12]} p={[w / 2 - 0.42, 0.72, -0.06]} r={[-0.2, -0.25, -0.08]} m={M.fabric2} radius={0.05} />
      {legs(w - 0.1, 0.8, 0.1, M.darkWood)}
    </group>
  );
}
function Armchair({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[0.82, 0.28, 0.8]} p={[0, 0.24, 0]} m={M.fabric2} />
      <Soft s={[0.8, 0.5, 0.18]} p={[0, 0.62, -0.32]} m={M.fabric2} radius={0.06} />
      {[-1, 1].map((s) => <Soft key={s} s={[0.14, 0.5, 0.8]} p={[s * 0.34, 0.4, 0]} m={M.fabric2} radius={0.05} />)}
      <Soft s={[0.56, 0.14, 0.6]} p={[0, 0.44, 0.06]} m={M.fabric2} radius={0.05} />
      <Soft s={[0.36, 0.32, 0.1]} p={[0, 0.66, -0.16]} r={[-0.25, 0, 0]} m={M.cushion} radius={0.04} />
      {legs(0.72, 0.7, 0.12, M.darkWood)}
    </group>
  );
}
function CoffeeTable({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[1.0, 0.04, 0.55]} p={[0, 0.4, 0]} m={M.woodFurniture} />
      <Box s={[0.9, 0.02, 0.45]} p={[0, 0.12, 0]} m={M.woodFurniture} />
      {legs(1.0, 0.55, 0.4, M.metal, 0.04, 0.012)}
      <Box s={[0.24, 0.05, 0.17]} p={[-0.22, 0.445, 0.05]} m={M.cushion} />
      <Box s={[0.22, 0.03, 0.16]} p={[-0.22, 0.485, 0.05]} r={[0, 0.2, 0]} m={M.fabric2} />
      <Cyl rt={0.05} rb={0.07} h={0.2} p={[0.25, 0.52, -0.05]} m={M.pot} />
    </group>
  );
}
function TvUnit({ w = 1.8, M }: { w?: number; M: Mats }) {
  return (
    <group>
      <Box s={[w, 0.42, 0.42]} p={[0, 0.27, 0]} m={M.darkWood} />
      <Box s={[w - 0.02, 0.005, 0.005]} p={[0, 0.27, 0.212]} m={M.black} shadow={false} />
      <Box s={[1.45, 0.84, 0.05]} p={[0, 1.3, -0.17]} m={M.black} />
      <mesh position={[0, 1.3, -0.143]} material={M.screen}><planeGeometry args={[1.4, 0.79]} /></mesh>
      <Box s={[0.9, 0.07, 0.09]} p={[0, 0.52, 0.02]} m={M.black} />
      <Cyl rt={0.07} rb={0.05} h={0.22} p={[w / 2 - 0.2, 0.59, 0]} m={M.pot} />
      <mesh position={[w / 2 - 0.2, 0.78, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.13, 1]} /></mesh>
    </group>
  );
}
function Rug({ w = 2.4, d = 1.7, M }: { w?: number; d?: number; M: Mats }) {
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={M.rug} receiveShadow><planeGeometry args={[w, d]} /></mesh>;
}
function Chair({ M, p, ry }: { M: Mats; p: V3; ry: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Soft s={[0.46, 0.06, 0.46]} p={[0, 0.46, 0]} m={M.fabric2} radius={0.02} />
      <Soft s={[0.44, 0.46, 0.05]} p={[0, 0.72, -0.2]} r={[-0.08, 0, 0]} m={M.fabric2} radius={0.02} />
      {legs(0.42, 0.42, 0.44, M.darkWood, 0.03, 0.014)}
    </group>
  );
}
function Dining({ w = 1.6, d = 0.9, seats = 4, M }: { w?: number; d?: number; seats?: number; M: Mats }) {
  const perSide = Math.floor(seats / 2);
  return (
    <group>
      <Box s={[w, 0.05, d]} p={[0, 0.75, 0]} m={M.woodFurniture} />
      {legs(w, d, 0.73, M.darkWood, 0.08, 0.025)}
      {Array.from({ length: perSide }, (_, i) => {
        const x = -w / 2 + (w / perSide) * (i + 0.5);
        return [<Chair key={'a' + i} M={M} p={[x, 0, d / 2 + 0.22]} ry={Math.PI} />, <Chair key={'b' + i} M={M} p={[x, 0, -d / 2 - 0.22]} ry={0} />];
      })}
      {seats % 2 === 1 && <Chair M={M} p={[w / 2 + 0.25, 0, 0]} ry={-Math.PI / 2} />}
      <Cyl rt={0.06} rb={0.09} h={0.16} p={[0, 0.86, 0]} m={M.pot} />
      <mesh position={[0, 1.0, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.12, 1]} /></mesh>
    </group>
  );
}
function Bed({ size = 'queen', M }: { size?: 'single' | 'double' | 'queen'; M: Mats }) {
  const W = size === 'queen' ? 1.6 : size === 'double' ? 1.5 : 1.0, L = 2.05;
  return (
    <group>
      <Box s={[W + 0.08, 0.28, L]} p={[0, 0.16, 0]} m={M.darkWood} />
      <Soft s={[W, 0.22, L - 0.06]} p={[0, 0.41, 0.01]} m={M.white} radius={0.06} />
      <Soft s={[W + 0.06, 0.07, L * 0.66]} p={[0, 0.55, L * 0.16]} m={M.bedding} radius={0.035} />
      <Soft s={[W + 0.08, 0.04, 0.45]} p={[0, 0.6, L * 0.38]} m={M.fabric2} radius={0.02} />
      {(size === 'single' ? [0] : [-W / 4, W / 4]).map((x, i) => <Soft key={i} s={[size === 'single' ? 0.62 : W / 2 - 0.1, 0.14, 0.38]} p={[x, 0.62, -L / 2 + 0.3]} r={[-0.35, 0, 0]} m={M.bedding} radius={0.06} />)}
      <Soft s={[0.4, 0.3, 0.1]} p={[0, 0.66, -L / 2 + 0.5]} r={[-0.3, 0, 0]} m={M.cushion} radius={0.04} />
      <Soft s={[W + 0.22, 1.05, 0.09]} p={[0, 0.65, -L / 2 - 0.02]} m={M.fabric} radius={0.04} />
    </group>
  );
}
function SideTable({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[0.45, 0.5, 0.4]} p={[0, 0.25, 0]} m={M.darkWood} />
      <Box s={[0.43, 0.005, 0.005]} p={[0, 0.3, 0.2]} m={M.metal} shadow={false} />
      <Cyl rt={0.04} rb={0.06} h={0.2} p={[0, 0.6, 0]} m={M.metal} />
      <Cyl rt={0.11} rb={0.15} h={0.2} p={[0, 0.8, 0]} m={M.lampShade} />
    </group>
  );
}
function Wardrobe({ w = 2, M }: { w?: number; M: Mats }) {
  const doors = Math.max(2, Math.round(w / 0.6));
  return (
    <group>
      <Box s={[w, 2.25, 0.6]} p={[0, 1.125, 0]} m={M.woodFurniture} />
      {Array.from({ length: doors - 1 }, (_, i) => <Box key={i} s={[0.006, 2.2, 0.005]} p={[-w / 2 + (w / doors) * (i + 1), 1.125, 0.302]} m={M.black} shadow={false} />)}
      <Box s={[w - 0.02, 0.006, 0.005]} p={[0, 1.75, 0.302]} m={M.black} shadow={false} />
      {Array.from({ length: doors }, (_, i) => <Box key={'h' + i} s={[0.015, 0.3, 0.025]} p={[-w / 2 + (w / doors) * (i + 0.5) + (i % 2 ? -0.22 : 0.22) * (w / doors / 0.6) * 0.5, 1.1, 0.315]} m={M.metal} />)}
    </group>
  );
}
function Desk({ w = 1.2, M }: { w?: number; M: Mats }) {
  return (
    <group>
      <Box s={[w, 0.035, 0.6]} p={[0, 0.75, 0]} m={M.woodFurniture} />
      <Box s={[0.4, 0.72, 0.55]} p={[w / 2 - 0.22, 0.37, 0]} m={M.darkWood} />
      {[[-w / 2 + 0.03, 0]].map(([x], i) => <Box key={i} s={[0.03, 0.73, 0.55]} p={[x!, 0.37, 0]} m={M.darkWood} />)}
      <Box s={[0.5, 0.3, 0.02]} p={[-0.1, 1.0, -0.18]} r={[-0.12, 0, 0]} m={M.black} />
      <mesh position={[-0.1, 1.0, -0.168]} rotation={[-0.12, 0, 0]} material={M.screen}><planeGeometry args={[0.47, 0.27]} /></mesh>
      <Cyl rt={0.08} rb={0.08} h={0.01} p={[-0.1, 0.775, -0.2]} m={M.black} />
      <Cyl rt={0.03} rb={0.05} h={0.35} p={[w / 2 - 0.15, 0.94, -0.18]} m={M.metal} />
      <Cyl rt={0.06} rb={0.09} h={0.1} p={[w / 2 - 0.15, 1.15, -0.12]} m={M.lampShade} />
      <Chair M={M} p={[-0.1, 0, 0.5]} ry={Math.PI} />
    </group>
  );
}
function Counter({ w = 2.4, sink, hob, upper, M }: { w?: number; sink?: boolean; hob?: boolean; upper?: boolean; M: Mats }) {
  const doors = Math.max(2, Math.round(w / 0.5));
  return (
    <group>
      <Box s={[w, 0.1, 0.52]} p={[0, 0.05, -0.02]} m={M.black} />
      <Box s={[w, 0.76, 0.58]} p={[0, 0.48, 0]} m={M.cabinet} />
      {Array.from({ length: doors - 1 }, (_, i) => <Box key={i} s={[0.006, 0.7, 0.004]} p={[-w / 2 + (w / doors) * (i + 1), 0.48, 0.292]} m={M.black} shadow={false} />)}
      {Array.from({ length: doors }, (_, i) => <Box key={'h' + i} s={[0.3, 0.012, 0.02]} p={[-w / 2 + (w / doors) * (i + 0.5), 0.8, 0.3]} m={M.steel} />)}
      <Box s={[w + 0.02, 0.04, 0.62]} p={[0, 0.88, 0.01]} m={M.counter} />
      <mesh position={[0, 1.2, -0.297]} material={M.kitchenBack} receiveShadow><planeGeometry args={[w, 0.6]} /></mesh>
      {sink && <group position={[0, 0, 0]}>
        <Box s={[0.6, 0.02, 0.42]} p={[0, 0.9, 0.02]} m={M.steel} />
        <Box s={[0.52, 0.015, 0.34]} p={[0, 0.885, 0.02]} m={M.black} shadow={false} />
        <Cyl rt={0.015} rb={0.02} h={0.32} p={[0, 1.06, -0.2]} m={M.steel} />
        <Cyl rt={0.012} rb={0.012} h={0.22} p={[0, 1.21, -0.1]} r={[Math.PI / 2, 0, 0]} m={M.steel} />
      </group>}
      {hob && <group position={[0, 0, 0]}>
        <Box s={[0.6, 0.01, 0.5]} p={[0, 0.905, 0.02]} m={M.black} />
        {[[-0.15, -0.08], [0.15, -0.08], [-0.15, 0.13], [0.15, 0.13]].map(([x, z], i) => <Cyl key={i} rt={0.07} rb={0.07} h={0.012} p={[x!, 0.915, z!]} m={M.steel} seg={16} />)}
        <Box s={[0.9, 0.12, 0.5]} p={[0, 1.65, -0.05]} m={M.steel} />
        <Box s={[0.32, 0.6, 0.28]} p={[0, 2.05, -0.16]} m={M.steel} />
      </group>}
      {upper && [-1, 1].map((sd) => {
        const segW = hob ? (w - 0.95) / 2 : w / 2;
        return <group key={sd}>
          <Box s={[segW, 0.7, 0.35]} p={[sd * (w / 2 - segW / 2), 1.85, -0.125]} m={M.cabinetTop} />
          <Box s={[0.25, 0.012, 0.02]} p={[sd * (w / 2 - segW / 2), 1.55, 0.06]} m={M.steel} />
        </group>;
      })}
    </group>
  );
}
function Fridge({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[0.7, 1.82, 0.68]} p={[0, 0.91, 0]} m={M.steel} />
      <Box s={[0.69, 0.006, 0.01]} p={[0, 1.25, 0.342]} m={M.black} shadow={false} />
      <Box s={[0.025, 0.5, 0.04]} p={[-0.28, 1.5, 0.36]} m={M.black} />
      <Box s={[0.025, 0.5, 0.04]} p={[-0.28, 0.9, 0.36]} m={M.black} />
    </group>
  );
}
function WC({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[0.5, 0.9, 0.15]} p={[0, 0.65, -0.3]} m={M.white} />
      <Box s={[0.2, 0.1, 0.02]} p={[0, 1.0, -0.22]} m={M.steel} />
      <mesh position={[0, 0.38, -0.02]} scale={[0.19, 0.16, 0.27]} material={M.porcelain} castShadow><sphereGeometry args={[1, 24, 16]} /></mesh>
      <Cyl rt={0.18} rb={0.16} h={0.03} p={[0, 0.43, -0.02]} m={M.porcelain} seg={24} />
    </group>
  );
}
function Vanity({ w = 0.9, M }: { w?: number; M: Mats }) {
  return (
    <group>
      <Box s={[w, 0.45, 0.48]} p={[0, 0.58, 0]} m={M.woodFurniture} />
      <Box s={[w + 0.02, 0.05, 0.5]} p={[0, 0.83, 0.01]} m={M.porcelain} />
      <mesh position={[0, 0.84, 0.03]} rotation={[-Math.PI / 2, 0, 0]} material={M.white}><circleGeometry args={[0.17, 24]} /></mesh>
      <Cyl rt={0.012} rb={0.016} h={0.22} p={[0, 0.96, -0.18]} m={M.steel} />
      <Box s={[w - 0.1, 0.8, 0.02]} p={[0, 1.55, -0.23]} m={M.mirror} />
      <Box s={[w - 0.2, 0.03, 0.04]} p={[0, 2.0, -0.21]} m={M.lightDisc} shadow={false} />
    </group>
  );
}
function Shower({ w = 1.2, d = 1.1, M, room, x, y }: { w?: number; d?: number; M: Mats; room?: Room; x: number; y: number }) {
  // glass on the sides that face into the room (not against a wall)
  const glassX = room && Math.abs(x - w / 2 - room.x) > 0.08 ? -1 : room && Math.abs(x + w / 2 - (room.x + room.w)) > 0.08 ? 1 : 0;
  const glassZ = room && Math.abs(y - d / 2 - room.y) > 0.08 ? -1 : room && Math.abs(y + d / 2 - (room.y + room.d)) > 0.08 ? 1 : 0;
  return (
    <group>
      <Box s={[w, 0.03, d]} p={[0, 0.015, 0]} m={M.bathFloor} />
      {glassX !== 0 && <mesh position={[glassX * w / 2, 1.0, 0]} rotation={[0, Math.PI / 2, 0]} material={M.glass}><planeGeometry args={[d, 2.0]} /></mesh>}
      {glassZ !== 0 && <mesh position={[0, 1.0, glassZ * d / 2]} material={M.glass}><planeGeometry args={[w * 0.6, 2.0]} /></mesh>}
      {glassX !== 0 && <Box s={[0.02, 2.0, 0.02]} p={[glassX * w / 2, 1.0, -d / 2 + 0.01]} m={M.steel} />}
      <Cyl rt={0.11} rb={0.11} h={0.015} p={[0, 2.15, 0]} m={M.steel} seg={20} />
      <Cyl rt={0.01} rb={0.01} h={0.25} p={[0, 2.27, 0]} m={M.steel} />
    </group>
  );
}
function ShoeCabinet({ w = 1, M }: { w?: number; M: Mats }) {
  return (
    <group>
      <Box s={[w, 0.95, 0.35]} p={[0, 0.5, 0]} m={M.darkWood} />
      <Box s={[0.004, 0.9, 0.004]} p={[0, 0.5, 0.177]} m={M.black} shadow={false} />
      <mesh position={[0, 1.6, -0.16]} material={M.mirror}><circleGeometry args={[0.32, 32]} /></mesh>
      <mesh position={[0, 1.6, -0.165]} material={M.metal}><ringGeometry args={[0.32, 0.345, 32]} /></mesh>
      <Cyl rt={0.05} rb={0.07} h={0.14} p={[w / 2 - 0.15, 1.04, 0]} m={M.pot} />
    </group>
  );
}
export function Plant({ M, scale = 1 }: { M: Mats; scale?: number }) {
  return (
    <group scale={scale}>
      <Cyl rt={0.17} rb={0.13} h={0.38} p={[0, 0.19, 0]} m={M.pot} />
      <Cyl rt={0.16} rb={0.16} h={0.02} p={[0, 0.37, 0]} m={M.soil} />
      {[[0, 0.75, 0, 0.26], [0.12, 1.0, 0.05, 0.22], [-0.1, 1.1, -0.06, 0.2], [0.03, 1.3, 0.02, 0.17], [-0.05, 0.9, 0.12, 0.2]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x!, y!, z!]} material={M.leaf} castShadow><icosahedronGeometry args={[r!, 1]} /></mesh>
      ))}
      <Cyl rt={0.012} rb={0.016} h={0.9} p={[0, 0.8, 0]} m={M.darkWood} seg={6} />
    </group>
  );
}
function BalconySet({ M }: { M: Mats }) {
  return (
    <group>
      <Cyl rt={0.3} rb={0.3} h={0.03} p={[0, 0.55, 0]} m={M.woodFurniture} />
      <Cyl rt={0.03} rb={0.05} h={0.55} p={[0, 0.27, 0]} m={M.metal} />
      <group position={[-0.6, 0, 0]} rotation={[0, Math.PI / 2, 0]}><Armchair M={M} /></group>
      <group position={[0.6, 0, 0]} rotation={[0, -Math.PI / 2, 0]}><Armchair M={M} /></group>
      <Cyl rt={0.05} rb={0.06} h={0.1} p={[0.08, 0.62, 0.05]} m={M.white} />
    </group>
  );
}
function Planter({ w = 1.6, M }: { w?: number; M: Mats }) {
  const n = Math.max(3, Math.round(w / 0.3));
  return (
    <group>
      <Box s={[w, 0.4, 0.32]} p={[0, 0.2, 0]} m={M.pot} />
      {Array.from({ length: n }, (_, i) => <mesh key={i} position={[-w / 2 + (w / n) * (i + 0.5), 0.5 + (i % 2) * 0.06, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.17, 1]} /></mesh>)}
    </group>
  );
}
function Washer({ M }: { M: Mats }) {
  return (
    <group>
      <Box s={[0.6, 0.85, 0.6]} p={[0, 0.425, 0]} m={M.white} />
      <mesh position={[0, 0.45, 0.302]} material={M.black}><circleGeometry args={[0.2, 28]} /></mesh>
      <mesh position={[0, 0.45, 0.304]} material={M.steel}><ringGeometry args={[0.2, 0.235, 28]} /></mesh>
      <Box s={[0.5, 0.08, 0.01]} p={[0, 0.77, 0.302]} m={M.steel} shadow={false} />
    </group>
  );
}
function Bookshelf({ w = 0.9, M }: { w?: number; M: Mats }) {
  const shelves = 5, books: React.ReactElement[] = [];
  const cols = [M.cushion, M.fabric, M.fabric2, M.black, M.darkWood];
  for (let s = 0; s < shelves - 1; s++) {
    let x = -w / 2 + 0.05;
    let i = 0;
    while (x < w / 2 - 0.12) {
      const bw = 0.03 + ((s * 7 + i * 3) % 5) * 0.008, bh = 0.2 + ((s + i) % 4) * 0.025;
      books.push(<Box key={`${s}-${i}`} s={[bw, bh, 0.22]} p={[x + bw / 2, 0.06 + s * 0.4 + bh / 2 + 0.02, 0]} m={cols[(s + i) % 5]!} />);
      x += bw + 0.004; i++;
      if (i % 9 === 8) x += 0.12;
    }
  }
  return (
    <group>
      {[-1, 1].map((sd) => <Box key={sd} s={[0.025, 1.9, 0.32]} p={[sd * (w / 2 - 0.012), 0.95, 0]} m={M.darkWood} />)}
      {Array.from({ length: shelves + 1 }, (_, i) => <Box key={'s' + i} s={[w, 0.025, 0.32]} p={[0, 0.06 + i * 0.4 - (i === shelves ? 0.12 : 0), 0]} m={M.darkWood} />)}
      {books}
    </group>
  );
}
function FloorLamp({ M }: { M: Mats }) {
  return (
    <group>
      <Cyl rt={0.14} rb={0.14} h={0.02} p={[0, 0.01, 0]} m={M.black} />
      <Cyl rt={0.012} rb={0.012} h={1.5} p={[0, 0.76, 0]} m={M.metal} />
      <Cyl rt={0.16} rb={0.22} h={0.26} p={[0, 1.58, 0]} m={M.lampShade} />
    </group>
  );
}
function Art({ w = 1.2, M }: { w?: number; M: Mats }) {
  const h = w * 0.7;
  return (
    <group position={[0, 1.55, 0]}>
      <Box s={[w + 0.06, h + 0.06, 0.03]} p={[0, 0, 0.015]} m={M.frame} />
      <mesh position={[0, 0, 0.032]} material={M.art}><planeGeometry args={[w, h]} /></mesh>
    </group>
  );
}

export function Furniture({ item, M, room }: { item: FurnitureItem; M: Mats; room?: Room }) {
  const rot = ((item.rot ?? 0) * Math.PI) / 180;
  let el: React.ReactNode = null;
  switch (item.type) {
    case 'sofa': el = <Sofa w={item.w} M={M} />; break;
    case 'armchair': el = <Armchair M={M} />; break;
    case 'coffee_table': el = <CoffeeTable M={M} />; break;
    case 'tv_unit': el = <TvUnit w={item.w} M={M} />; break;
    case 'rug': el = <Rug w={item.w} d={item.d} M={M} />; break;
    case 'dining': el = <Dining w={item.w} d={item.d} seats={item.seats} M={M} />; break;
    case 'bed': el = <Bed size={item.size} M={M} />; break;
    case 'side_table': el = <SideTable M={M} />; break;
    case 'wardrobe': el = <Wardrobe w={item.w} M={M} />; break;
    case 'desk': el = <Desk w={item.w} M={M} />; break;
    case 'counter': el = <Counter w={item.w} sink={item.sink} hob={item.hob} upper={item.upper} M={M} />; break;
    case 'fridge': el = <Fridge M={M} />; break;
    case 'wc': el = <WC M={M} />; break;
    case 'vanity': el = <Vanity w={item.w} M={M} />; break;
    case 'shower': return <group position={[item.x, 0, item.y]}><Shower w={item.w} d={item.d} M={M} room={room} x={item.x} y={item.y} /></group>;
    case 'shoe_cabinet': el = <ShoeCabinet w={item.w} M={M} />; break;
    case 'plant': el = <Plant M={M} />; break;
    case 'balcony_set': el = <BalconySet M={M} />; break;
    case 'planter': el = <Planter w={item.w} M={M} />; break;
    case 'washer': el = <Washer M={M} />; break;
    case 'bookshelf': el = <Bookshelf w={item.w} M={M} />; break;
    case 'floor_lamp': el = <FloorLamp M={M} />; break;
    case 'art': el = <Art w={item.w} M={M} />; break;
    default: return null;
  }
  return <group position={[item.x, 0, item.y]} rotation={[0, rot, 0]}>{el}</group>;
}

