'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { HardHat, LayoutGrid } from 'lucide-react';
import type { TowerData, TowerFlat, TowerSceneProps, TowerType } from './tower-scene';

const TowerScene = dynamic(() => import('./tower-scene'), { ssr: false, loading: () => <div className="skeleton absolute inset-0 !rounded-none" /> });

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Towers in 3D, mounted only while on screen. Flats open their page on click unless `onSelect` is given. */
export function TowerView({ tower, towers, flats, types, selectedId, onSelect, matches, height = 420, compact, initialMode = 'construction', toggle = !compact, className = '' }: {
  tower?: TowerData; towers?: TowerData[]; flats: TowerFlat[]; types: TowerType[]; selectedId?: string | null; onSelect?: (id: string) => void;
  matches?: TowerSceneProps['matches']; height?: number | string; compact?: boolean; initialMode?: 'construction' | 'status'; toggle?: boolean; className?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [ok, setOk] = useState(true);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOk(webglOK());
    const mq = window.matchMedia('(prefers-color-scheme: dark)'); setDark(mq.matches);
    const io = new IntersectionObserver(([e]) => { const v = !!e?.isIntersecting; setVisible(v); if (v) setMounted(true); }, { rootMargin: '200px' });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const list = towers ?? (tower ? [tower] : []);
  const [hint, setHint] = useState(true);
  useEffect(() => { const t = setTimeout(() => setHint(false), 9000); return () => clearTimeout(t); }, []);
  return (
    <div ref={ref} onPointerDown={() => setHint(false)} className={'relative overflow-hidden ' + className}
      style={{ height, background: 'radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--accent) 12%, var(--surface)) 0%, var(--surface-2) 75%)' }}>
      {ok && mounted && <TowerScene towers={list} flats={flats} types={types} mode={mode} selectedId={selectedId} matches={matches} compact={compact} dark={dark}
        active={visible} onSelect={onSelect ?? ((id) => router.push(`/flats/${id}`))} />}
      {!ok && <div className="absolute inset-0 grid place-items-center p-4 text-center text-[13px] text-ink-2">3D needs WebGL, which this browser has turned off.</div>}
      {ok && hint && !compact && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="hint-pill"><span className="relative grid size-6 place-items-center text-white"><span className="ring-out" /><span className="hint-tap text-[17px]" aria-hidden>👆</span></span>Tap any flat to see it · drag to turn the towers</span>
        </div>
      )}
      {toggle && (
        <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl border border-line bg-surface/85 p-1 shadow-sm backdrop-blur">
          <button className={'btn btn-sm !px-2.5 ' + (mode === 'construction' ? 'btn-primary' : 'btn-ghost !bg-transparent')} onClick={() => setMode('construction')} aria-pressed={mode === 'construction'}><HardHat className="size-4" />On site</button>
          <button className={'btn btn-sm !px-2.5 ' + (mode === 'status' ? 'btn-primary' : 'btn-ghost !bg-transparent')} onClick={() => setMode('status')} aria-pressed={mode === 'status'}><LayoutGrid className="size-4" />Availability</button>
        </div>
      )}
    </div>
  );
}
