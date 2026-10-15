'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Box, Map as MapIcon, RotateCw } from 'lucide-react';
import type { SceneProps } from './site-scene';
import { PlotMap2D } from '@/components/plot-map';

const SiteScene = dynamic(() => import('./site-scene'), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0 !rounded-none" />,
});

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** 3D site with a 2D fallback/toggle. Mounts the WebGL scene only while on screen. */
export function SiteView({ height = 420, toggle = true, initial = '3d', className = '', overlay, ...scene }: SceneProps & {
  height?: number | string; toggle?: boolean; initial?: '3d' | '2d'; className?: string; overlay?: React.ReactNode;
}) {
  const [mode, setMode] = useState<'3d' | '2d'>(initial);
  const [can3d, setCan3d] = useState(true);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false); // once the scene has been shown, keep it mounted (pause instead of unmount)
  const [dark, setDark] = useState(false);
  const [key, setKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCan3d(webglOK());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const on = () => setDark(mq.matches);
    mq.addEventListener('change', on);
    const io = new IntersectionObserver(([e]) => { const v = !!e?.isIntersecting; setVisible(v); if (v) setMounted(true); }, { rootMargin: '200px' });
    if (ref.current) io.observe(ref.current);
    return () => { mq.removeEventListener('change', on); io.disconnect(); };
  }, []);
  const show3d = mode === '3d' && can3d;
  return (
    <div ref={ref} className={'relative overflow-hidden ' + className}
      style={{ height, background: show3d ? 'radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--accent) 14%, var(--surface)) 0%, var(--surface-2) 70%)' : 'var(--surface)' }}>
      {can3d && mounted && (
        <div className="absolute inset-0" style={{ visibility: show3d ? 'visible' : 'hidden' }} aria-hidden={!show3d}>
          <SiteScene key={key} {...scene} dark={dark} active={show3d && visible} />
        </div>
      )}
      {!show3d && (
        <PlotMap2D plots={scene.plots} layout={scene.layout} selectedId={scene.selectedId}
          onSelect={scene.onSelect} matches={scene.matches} fill zoomable className="absolute inset-0 p-2" />
      )}
      {overlay && <div className="contents">{overlay}</div>}
      {toggle && (
        <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl border border-line bg-surface/85 p-1 shadow-sm backdrop-blur">
          <button className={'btn btn-sm !px-2.5 ' + (show3d ? 'btn-primary' : 'btn-ghost !bg-transparent')} onClick={() => setMode('3d')} disabled={!can3d}
            aria-pressed={show3d} title={can3d ? '3D view' : '3D needs WebGL'}><Box className="size-4" />3D</button>
          <button className={'btn btn-sm !px-2.5 ' + (!show3d ? 'btn-primary' : 'btn-ghost !bg-transparent')} onClick={() => setMode('2d')}
            aria-pressed={!show3d}><MapIcon className="size-4" />2D</button>
          {show3d && <button className="btn btn-ghost btn-sm !bg-transparent !px-2" onClick={() => setKey((k) => k + 1)} title="Reset camera" aria-label="Reset camera"><RotateCw className="size-4" /></button>}
        </div>
      )}
    </div>
  );
}
