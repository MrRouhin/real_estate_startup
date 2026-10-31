'use client';
// The flat tour shell: 3D walk-through / dollhouse, a timeline from "today on site" to the
// finished, furnished home, time of day and season for the real sun, furnishing styles,
// a live minimap and room-by-room specifications.
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Footprints, Maximize2, Minimize2, Moon, Sparkles, Sun, Sunrise, Sunset, Gauge } from 'lucide-react';
import { mirrorLayout, roomSize, roomSqft, ROOM_FINISH, type Layout } from '@/lib/flats/layout';
import { FACING_DEG, FLOOR_STAGE, type FloorStage } from '@/lib/flats/tower';
import type { Pose, TourMode, TourPhase } from '@/components/three/flat/flat-scene';
import { STYLES, type StyleId } from '@/components/three/flat/materials';
import { FloorPlan } from './floor-plan';

const FlatScene = dynamic(() => import('@/components/three/flat/flat-scene'), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0 !rounded-none" />,
});


const STEPS: { phase: TourPhase; label: string; stage?: FloorStage }[] = [
  { phase: 'not_started', label: 'Slab pending', stage: 'not_started' },
  { phase: 'structure', label: 'Slab cast', stage: 'structure' },
  { phase: 'masonry', label: 'Walls up', stage: 'masonry' },
  { phase: 'services', label: 'Services in', stage: 'services' },
  { phase: 'ready', label: 'Handover', stage: 'ready' },
  { phase: 'finished', label: 'Furnished' },
];

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
const fmtHour = (h: number) => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const ap = hh >= 12 ? 'pm' : 'am'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
const monthYear = (d: Date | null | undefined) => (d ? d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null);

export function FlatTour({ layout: raw, mirror, facing, floor, view, stageToday, forecast, unitLabel, height = 560 }: {
  layout: Layout; mirror?: boolean; facing: string | null; floor: number; view?: string | null;
  /** the stage this flat's floor is at today */ stageToday: FloorStage;
  /** when each later stage is expected, if known */ forecast?: Partial<Record<FloorStage, Date | null>>;
  unitLabel: string; height?: number;
}) {
  const layout = useMemo(() => (mirror ? mirrorLayout(raw) : raw), [raw, mirror]);
  const facingDeg = FACING_DEG[facing || 'east'] ?? 90;
  const [mode, setMode] = useState<TourMode>('walk');
  const [phase, setPhase] = useState<TourPhase>('finished');
  const [style, setStyle] = useState<StyleId>('warm');
  const [hour, setHour] = useState(10.5);
  const [season, setSeason] = useState<'summer' | 'winter'>('winter');
  const [quality, setQuality] = useState<'high' | 'low'>('high');
  const [pose, setPose] = useState<Pose | null>(null);
  const [goTo, setGoTo] = useState<{ room: string; n: number } | null>(null);
  const [can3d, setCan3d] = useState(true);
  const [full, setFull] = useState(false);
  const [hint, setHint] = useState(true);
  const lastPose = useRef<Pose | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCan3d(webglOK());
    // phones and low-power machines start on the lighter renderer
    const low = (navigator.hardwareConcurrency || 8) <= 4 || window.matchMedia('(max-width: 640px)').matches;
    const q = new URLSearchParams(window.location.search).get('quality');
    if (q === 'low' || q === 'high') setQuality(q); else if (low) setQuality('low');
    try { const s = localStorage.getItem('remmo.tour.style'); if (s === 'warm' || s === 'scandi' || s === 'classic') setStyle(s); } catch { /* storage unavailable */ }
    const t = setTimeout(() => setHint(false), 9000);
    const fs = () => setFull(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', fs);
    return () => { clearTimeout(t); document.removeEventListener('fullscreenchange', fs); };
  }, []);
  useEffect(() => { try { localStorage.setItem('remmo.tour.style', style); } catch { /* ignore */ } }, [style]);

  const date = useMemo(() => new Date(new Date().getFullYear(), season === 'summer' ? 5 : 11, 21), [season]);
  const onPose = useCallback((p: Pose) => {
    const prev = lastPose.current;
    lastPose.current = p;
    // keep React updates cheap: only re-render the minimap when we have moved or turned a little
    if (!prev || Math.abs(prev.x - p.x) > 0.05 || Math.abs(prev.y - p.y) > 0.05 || Math.abs(prev.yaw - p.yaw) > 0.03 || prev.room !== p.room) setPose(p);
  }, []);
  const jump = (room: string) => {
    if (mode !== 'walk') setMode('walk');
    setGoTo((g) => ({ room, n: (g?.n ?? 0) + 1 }));
  };
  const toggleFull = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await wrap.current?.requestFullscreen(); } catch { /* not allowed */ }
  };
  const todayIdx = STEPS.findIndex((s) => s.stage === stageToday);
  const room = pose?.room ? layout.rooms.find((r) => r.id === pose.room) : null;
  const phaseInfo = phase === 'finished' ? null : FLOOR_STAGE[(STEPS.find((s) => s.phase === phase)?.stage ?? 'ready')];
  const isToday = STEPS[todayIdx]?.phase === phase;
  const tod = hour < 7 ? Sunrise : hour < 17 ? Sun : hour < 19 ? Sunset : Moon;
  const TodIcon = tod;

  return (
    <div className="card overflow-hidden">
      <div ref={wrap} onPointerDown={() => hint && setHint(false)} className={'relative bg-[#0d1512] ' + (full ? 'h-screen' : '')} style={full ? undefined : { height: `min(${height}px, 78vh)` }}>
        {can3d ? (
          <FlatScene layout={layout} style={style} mode={mode} phase={phase} facingDeg={facingDeg} hour={hour} date={date}
            floor={floor} view={view} quality={quality} goTo={goTo} initial={lastPose.current} onPose={onPose}
            onPickRoom={jump} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-surface p-4"><FloorPlan layout={layout} facingDeg={facingDeg} className="max-h-full w-full" /></div>
        )}

        {/* top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
          <div className="pointer-events-auto flex gap-1 rounded-xl border border-white/15 bg-black/45 p-1 text-white backdrop-blur">
            <button className={'btn btn-sm !px-2.5 ' + (mode === 'walk' ? 'btn-primary' : '!bg-transparent !text-white')} onClick={() => setMode('walk')} aria-pressed={mode === 'walk'}><Footprints className="size-4" />Walk through</button>
            <button className={'btn btn-sm !px-2.5 ' + (mode === 'dollhouse' ? 'btn-primary' : '!bg-transparent !text-white')} onClick={() => setMode('dollhouse')} aria-pressed={mode === 'dollhouse'}><Box className="size-4" />Dollhouse</button>
          </div>
          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/15 bg-black/45 p-1 text-white backdrop-blur">
            {phase === 'finished' && STYLES.map((s) => (
              <button key={s.id} className={'btn btn-sm !px-2 ' + (style === s.id ? '!bg-white !text-black' : '!bg-transparent !text-white')} onClick={() => setStyle(s.id)} aria-pressed={style === s.id} title={`${s.label} furnishing`}>
                <span className="hidden sm:inline">{s.label}</span><span className="sm:hidden">{s.label.split(' ')[0]}</span>
              </button>
            ))}
            <button className="btn btn-sm !bg-transparent !px-2 !text-white" onClick={() => setQuality((q) => (q === 'high' ? 'low' : 'high'))} title={quality === 'high' ? 'High quality (switch to faster)' : 'Fast mode (switch to high quality)'} aria-label="Toggle render quality">
              {quality === 'high' ? <Sparkles className="size-4" /> : <Gauge className="size-4" />}
            </button>
            <button className="btn btn-sm !bg-transparent !px-2 !text-white" onClick={toggleFull} aria-label={full ? 'Exit full screen' : 'Full screen'}>{full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}</button>
          </div>
        </div>

        {/* stage banner */}
        {phaseInfo && (
          <div className="pointer-events-none absolute left-3 top-16 max-w-[min(360px,calc(100%-24px))] rounded-xl border border-white/15 bg-black/55 p-3 text-white backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-white/70">
              {isToday ? <span className="rounded bg-[#f0b43a] px-1.5 py-0.5 text-black">Today on site</span> : <span>{todayIdx >= 0 && STEPS.findIndex((s) => s.phase === phase) < todayIdx ? 'Done earlier' : 'Coming up'}</span>}
              <span>{phaseInfo.label}</span>
            </div>
            <p className="mt-1 text-sm leading-snug">{phaseInfo.now}</p>
            {!isToday && forecast?.[STEPS.find((s) => s.phase === phase)!.stage!] && <p className="mt-1 text-xs text-white/70">Expected around {monthYear(forecast[STEPS.find((s) => s.phase === phase)!.stage!])} at the current pace.</p>}
            {(phase === 'structure' || phase === 'not_started') && <p className="mt-1 text-xs text-[#7fd6db]">Blue outlines show where the walls will go.</p>}
          </div>
        )}

        {/* hint */}
        {mode === 'walk' && hint && (
          <div className="pointer-events-none absolute left-1/2 top-[46%] grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-2 text-center">
            <span className="hint-pill"><span className="hint-drag text-[20px]" aria-hidden>👆</span>Drag to look around, tap the floor to walk</span>
            <span className="hidden rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/80 backdrop-blur sm:inline">Arrow keys or W A S D move you · scroll zooms</span>
          </div>
        )}

        {/* minimap */}
        {mode === 'walk' && (
          <div className="absolute bottom-[92px] right-3 w-[150px] rounded-xl border border-white/15 bg-white/90 p-1.5 shadow-lg backdrop-blur sm:bottom-[84px] sm:w-[200px]">
            <FloorPlan layout={layout} facingDeg={facingDeg} pose={pose} active={pose?.room} onRoom={jump} furniture={false} compact />
          </div>
        )}

        {/* room card */}
        {mode === 'walk' && room && (
          <div className="pointer-events-none absolute bottom-[92px] left-3 hidden max-w-[300px] rounded-xl border border-white/15 bg-black/55 p-3 text-white backdrop-blur sm:bottom-[84px] sm:block">
            <div className="text-sm font-semibold">{room.name}</div>
            <div className="num text-xs text-white/75">{roomSize(room)} · {roomSqft(room)} sq ft</div>
            <p className="mt-1 text-xs leading-snug text-white/80">{ROOM_FINISH[room.kind]}</p>
          </div>
        )}

        {/* bottom controls */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/75 to-black/0 p-3 pt-6 text-white sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">{unitLabel} · from today on site to your finished home</div>
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {STEPS.map((s, i) => {
                const today = i === todayIdx, past = i < todayIdx;
                const when = s.stage && !past && !today ? monthYear(forecast?.[s.stage]) : null;
                return (
                  <button key={s.phase} onClick={() => setPhase(s.phase)} aria-pressed={phase === s.phase}
                    className={'shrink-0 rounded-lg border px-2.5 py-1.5 text-left text-xs transition ' + (phase === s.phase ? 'border-white bg-white text-black' : 'border-white/20 bg-black/35 text-white hover:border-white/50')}>
                    <div className="flex items-center gap-1 font-semibold">{today && <span className="size-1.5 rounded-full bg-[#f0b43a]" />}{s.label}</div>
                    <div className={'text-[10px] ' + (phase === s.phase ? 'text-black/60' : 'text-white/60')}>{today ? 'Today' : past ? 'Done' : s.phase === 'finished' ? 'Your home' : when ? `~${when}` : 'Planned'}</div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-black/35 px-2.5 py-1.5">
            <TodIcon className="size-4 text-[#f0b43a]" />
            <input type="range" min={6} max={20.5} step={0.25} value={hour} onChange={(e) => setHour(Number(e.target.value))} className="w-28 accent-[#f0b43a] sm:w-36" aria-label="Time of day" />
            <span className="num w-16 text-xs">{fmtHour(hour)}</span>
            <select value={season} onChange={(e) => setSeason(e.target.value as 'summer' | 'winter')} className="rounded bg-transparent text-xs outline-none" aria-label="Season">
              <option value="winter" className="text-black">Winter sun</option>
              <option value="summer" className="text-black">Summer sun</option>
            </select>
          </div>
        </div>
      </div>
      {/* room chips below the viewer */}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-line p-2">
        {layout.rooms.filter((r) => r.kind !== 'passage').map((r) => (
          <button key={r.id} onClick={() => jump(r.id)} className={'chip shrink-0 ' + (pose?.room === r.id && mode === 'walk' ? '!border-accent !bg-accent-soft' : '')}>
            {r.name} <span className="num text-ink-3">{roomSqft(r)} sq ft</span>
          </button>
        ))}
      </div>
    </div>
  );
}
