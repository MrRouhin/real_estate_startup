import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { date } from '@/lib/format';
import { loadApartments } from '@/lib/flats/queries';
import { STAGE_LABEL, STAGE_WEIGHT, stagesOf, towerPercent, type StageKey } from '@/lib/flats/tower';
import { liveStatus } from '@/lib/site';
import { Empty, PageHeader, Section } from '@/components/ui/bits';
import { ProgressBar } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { TowerView } from '@/components/three/tower-view';
import { LiveRefresh } from '@/components/live-refresh';
import { postTowerProgress } from '../ops-actions';

export const metadata = { title: 'Towers' };

export default async function Towers() {
  const { supabase, project } = await requireStaff();
  if (!project || project.kind !== 'apartments') return <Empty emoji="🏢" title="Towers are for apartment projects" href="/console/projects/new" cta="Start an apartment project">Switch to an apartment project at the top, or create one.</Empty>;
  const d = await loadApartments(supabase, project.id);
  return (
    <>
      <LiveRefresh tables={['towers', 'plots']} filter={`project_id=eq.${project.id}`} every={30000} />
      <PageHeader emoji="🏢" title="Towers" sub="Post progress after each slab or stage. Buyers of every flat in the tower see their floor update at once, and construction-linked payments fall due automatically." />
      <div className="overflow-hidden rounded-[22px] border border-[var(--glass-line)]"><TowerView towers={d.towers} flats={d.flats} types={d.types} height={460} /></div>
      <div className="grid gap-5 lg:grid-cols-2">
        {d.towers.map((t) => { const s = stagesOf(t); const tf = d.flats.filter((f) => f.tower_id === t.id); const sold = tf.filter((f) => ['booked', 'sold'].includes(liveStatus(f))).length; const last = d.updates.find((u) => u.tower_id === t.id); return (
          <Section key={t.id} title={`${t.name} · ${Math.round(towerPercent(t))}%`} action={<span className="text-[12.5px] text-ink-3">{sold} of {tf.length} flats sold</span>}>
            <ul className="mb-4 grid gap-1.5 text-[12.5px]">
              {(Object.keys(STAGE_WEIGHT) as StageKey[]).map((k) => <li key={k} className="grid grid-cols-[150px_1fr_40px] items-center gap-2"><span className="text-ink-2">{STAGE_LABEL[k]}</span><ProgressBar value={s[k]} className="h-1.5" /><span className="num text-right">{Math.round(s[k])}%</span></li>)}
            </ul>
            <ActionForm action={postTowerProgress} reset={false} className="grid gap-3 rounded-2xl bg-[var(--glass)] p-3">
              <input type="hidden" name="tower_id" value={t.id} />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="label" htmlFor={`sl-${t.id}`}>Slabs cast</label><input id={`sl-${t.id}`} name="slabs_cast" type="number" min={0} max={t.floors} defaultValue={t.slabs_cast} className="input num" /></div>
                {(['foundation', 'masonry', 'mep', 'finishing', 'facade'] as const).map((k) => (
                  <div key={k}><label className="label" htmlFor={`${k}-${t.id}`}>{STAGE_LABEL[k].split(' ')[0]} %</label><input id={`${k}-${t.id}`} name={k} type="number" min={0} max={100} defaultValue={Math.round(s[k])} className="input num" /></div>
                ))}
              </div>
              <div><label className="label" htmlFor={`ti-${t.id}`}>Headline</label><input id={`ti-${t.id}`} name="title" className="input" placeholder={`Slab ${Math.min(t.floors, t.slabs_cast + 1)} cast`} required /></div>
              <div><label className="label" htmlFor={`bo-${t.id}`}>Details for buyers</label><input id={`bo-${t.id}`} name="body" className="input" placeholder="Blockwork on floors 6 to 8; conduits on 4 to 5" /></div>
              <SubmitButton className="btn btn-primary">Post update</SubmitButton>
            </ActionForm>
            {last && <p className="mt-2 text-[12px] text-ink-3">Last update {date(last.created_at)}: {last.title}</p>}
          </Section>
        ); })}
      </div>
      <p className="text-[12.5px] text-ink-3">Prices for individual flats are under <Link href="/console/plots" className="font-semibold text-accent">Flats and prices</Link>.</p>
    </>
  );
}
