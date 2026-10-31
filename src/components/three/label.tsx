'use client';
// Labels drawn into a texture and shown as a sprite inside the 3D scene.
// (No DOM overlays, so nothing breaks when the scene unmounts during navigation.)
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

type Props = {
  text: string; sub?: string; position: [number, number, number];
  height?: number; bg?: string; fg?: string; subFg?: string; mono?: boolean; plain?: boolean; depthTest?: boolean; onClick?: () => void;
};

export function Label({ text, sub, position, height = 0.34, bg = '#12201c', fg = '#ffffff', subFg = 'rgba(255,255,255,.72)', mono = false, plain = false, depthTest = false, onClick }: Props) {
  const { texture, aspect } = useMemo(() => {
    const scale = 3;
    const font = `${mono ? '600' : '650'} ${26 * scale}px ${mono ? '"JetBrains Mono", ui-monospace, monospace' : '"Public Sans Variable", "Public Sans", system-ui, sans-serif'}`;
    const subFont = `500 ${20 * scale}px "Public Sans Variable", system-ui, sans-serif`;
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d')!;
    ctx.font = font; const w1 = ctx.measureText(text).width;
    ctx.font = subFont; const w2 = sub ? ctx.measureText(sub).width : 0;
    const padX = plain ? 6 * scale : 16 * scale, padY = plain ? 4 * scale : 10 * scale;
    const w = Math.ceil(Math.max(w1, w2) + padX * 2), h = Math.ceil((sub ? 58 : 34) * scale + padY * 2 - (plain ? 10 * scale : 0));
    c.width = w; c.height = h;
    if (!plain) {
      ctx.fillStyle = bg; const r = 14 * scale;
      ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
    }
    ctx.textBaseline = 'top';
    if (plain) { ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 6 * scale; }
    ctx.font = font; ctx.fillStyle = fg; ctx.fillText(text, padX, padY);
    if (sub) { ctx.font = subFont; ctx.fillStyle = subFg; ctx.fillText(sub, padX, padY + 32 * scale); }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { texture: t, aspect: w / h };
  }, [text, sub, bg, fg, subFg, mono, plain]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]} renderOrder={10}
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={onClick ? () => { document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={onClick ? () => { document.body.style.cursor = ''; } : undefined}>
      <spriteMaterial map={texture} transparent depthTest={depthTest} depthWrite={false} />
    </sprite>
  );
}
