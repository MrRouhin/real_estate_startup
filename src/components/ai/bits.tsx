// Small presentational pieces for AI output. Server-safe (no client hooks).
import { Bot, Sparkles } from 'lucide-react';

export const SEVERITY_COLOR: Record<string, string> = { good: 'var(--good)', info: 'var(--st-booked)', warn: 'var(--warn)', critical: 'var(--bad)' };
export const STATE_COLOR: Record<string, string> = { done: 'var(--good)', ahead: 'var(--good)', on_track: 'var(--st-booked)', at_risk: 'var(--warn)', behind: 'var(--bad)', not_started: 'var(--ink-3)' };

/** Shows whether text was written by the model or by the built-in rules. */
export function AISource({ source, model }: { source: string; model?: string | null }) {
  const ai = source === 'ai';
  return (
    <span title={ai ? `Written by AI${model ? ` (${model})` : ''} from the numbers below` : 'Built from the numbers by Plotline’s rules. Add an AI key for plain-language reports.'}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide"
      style={{ color: ai ? 'var(--accent)' : 'var(--ink-3)', background: ai ? 'var(--accent-soft)' : 'var(--surface-2)' }}>
      {ai ? <Sparkles className="size-3" /> : <Bot className="size-3" />}{ai ? 'AI' : 'Rules'}
    </span>
  );
}

/** Renders report text: "## " lines become headings, "• " lines bullets, the rest paragraphs. */
export function ReportText({ text, className = '' }: { text: string; className?: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = (k: string) => { if (list.length) { blocks.push(<ul key={k} className="grid gap-1 pl-1">{list.map((l, i) => <li key={i} className="flex gap-2"><span className="mt-[9px] size-1 shrink-0 rounded-full bg-ink-3" /><span>{l}</span></li>)}</ul>); list = []; } };
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (/^[•\-*]\s+/.test(line)) { list.push(line.replace(/^[•\-*]\s+/, '')); return; }
    flush('l' + i);
    if (!line) return;
    if (/^#{1,3}\s+/.test(line)) blocks.push(<h4 key={i} className="mt-2 text-[12px] font-bold uppercase tracking-wide text-ink-3">{line.replace(/^#{1,3}\s+/, '')}</h4>);
    else blocks.push(<p key={i}>{line.replace(/\*\*(.+?)\*\*/g, '$1')}</p>);
  });
  flush('end');
  return <div className={'grid gap-1.5 text-[13.5px] leading-relaxed text-ink-2 [&_p]:text-ink ' + className}>{blocks}</div>;
}

/** Planned vs actual S-curve with today marker and forecast finish. */
export function SCurve({ planned, actual, today, forecast, due, height = 150 }: {
  planned: [string, number][]; actual: [string, number][]; today: string; forecast?: string | null; due?: string | null; height?: number;
}) {
  const all = [...planned.map((p) => p[0]), ...actual.map((p) => p[0]), today, ...(forecast ? [forecast] : [])].map((d) => new Date(d).getTime());
  const t0 = Math.min(...all), t1 = Math.max(...all);
  const W = 600, H = height, pad = { l: 30, r: 10, t: 10, b: 20 };
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  const path = (pts: [string, number][]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const last = actual[actual.length - 1];
  const yr = (d: number) => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Planned versus actual progress">
      {[0, 50, 100].map((v) => (
        <g key={v}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === 0 ? '' : '3 4'} />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{v}%</text></g>
      ))}
      <text x={pad.l} y={H - 4} fontSize="10" fill="var(--ink-3)">{yr(t0)}</text>
      <text x={W - pad.r} y={H - 4} fontSize="10" fill="var(--ink-3)" textAnchor="end">{yr(t1)}</text>
      <line x1={x(today)} x2={x(today)} y1={pad.t} y2={H - pad.b} stroke="var(--ink-3)" strokeDasharray="2 3" />
      <text x={x(today)} y={pad.t + 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle" dy="-2">today</text>
      {due && <g><line x1={x(due)} x2={x(due)} y1={pad.t} y2={H - pad.b} stroke="var(--warn)" strokeOpacity=".6" /><text x={x(due)} y={H - pad.b - 4} fontSize="10" fill="var(--warn)" textAnchor={x(due) > W - 30 ? 'end' : 'middle'}>due</text></g>}
      <path d={path(planned)} fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeDasharray="5 4" />
      <path d={path(actual)} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {last && forecast && <path d={`M${x(last[0])},${y(last[1])} L${x(forecast)},${y(100)}`} fill="none" stroke="var(--accent)" strokeOpacity=".45" strokeWidth="2" strokeDasharray="2 4" />}
      {last && <circle cx={x(last[0])} cy={y(last[1])} r="4" fill="var(--accent)" />}
      {forecast && <g><circle cx={x(forecast)} cy={y(100)} r="3.5" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" /><text x={x(forecast)} y={y(100) + 14} fontSize="10" fill="var(--accent)" textAnchor={x(forecast) > W - 40 ? 'end' : 'middle'}>forecast</text></g>}
    </svg>
  );
}

export function CurveLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-3">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 border-t-2 border-dashed border-ink-3" />Plan</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 rounded bg-accent" />Actual</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-0.5 w-4 border-t-2 border-dotted border-accent/50" />Forecast at current pace</span>
    </div>
  );
}
