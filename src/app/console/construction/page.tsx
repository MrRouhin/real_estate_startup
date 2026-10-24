import { requireStaff } from '@/lib/auth';
import { loadSite } from '@/lib/queries';
import { asLayout, MILESTONES } from '@/lib/site';
import { date } from '@/lib/format';
import { ConstructionTimeline } from '@/components/three/construction-timeline';
import { PageHeader, Section } from '@/components/ui/bits';
import { ProgressRing } from '@/components/ui/motion';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { LiveRefresh } from '@/components/live-refresh';
import { postAnnouncement } from '../actions';
import { UpdateForm } from './update-form';
import type { PhotoCheck } from '@/lib/ai/photo';
import { AISource } from '@/components/ai/bits';

export const metadata = { title: 'Construction' };

export default async function Construction() {
  const { supabase, project } = await requireStaff();
  const site = await loadSite(supabase, project!.id);
  const { data: wps } = await supabase.from('work_packages').select('milestone_id, contractors(company_name)').eq('project_id', project!.id);
  const { data: checks } = site.updates.length ? await supabase.from('ai_checks').select('subject_id, result').eq('kind', 'photo').in('subject_id', site.updates.map((u) => u.id)) : { data: [] };
  const checkOf = (id: string) => (checks || []).find((c) => c.subject_id === id)?.result as unknown as PhotoCheck | undefined;
  const who = (mid: string) => (wps || []).filter((w) => w.milestone_id === mid).map((w) => (w.contractors as unknown as { company_name: string }).company_name).join(', ');
  return (
    <>
      <LiveRefresh tables={['construction_updates', 'milestones']} filter={`project_id=eq.${project!.id}`} />
      <PageHeader eyebrow={project!.name} title="Construction"
        sub={<>Overall <b className="num text-ink">{Math.round(Number(project!.progress_percent))}%</b>, weighted by milestone. Each update moves one milestone, notifies every buyer, and is replayable in 3D.</>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
        <ConstructionTimeline plots={site.plots} layout={asLayout(project!.layout)} current={site.progress} updates={site.updates} height={480} />
        <Section title="Post a construction update">
          <UpdateForm milestones={site.milestones.map((m) => ({ id: m.id, key: m.key, name: m.name, progress: Number(m.progress) }))} />
        </Section>
      </div>
      <Section title="Milestones">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {site.milestones.map((m) => {
            const meta = MILESTONES.find((x) => x.key === m.key);
            return (
              <div key={m.id} className="grid justify-items-center gap-2 rounded-2xl border border-line p-4 text-center">
                <ProgressRing value={Number(m.progress)} color={meta?.color} size={64} />
                <div className="text-[13px] font-semibold leading-tight">{m.name}</div>
                <div className="text-[11.5px] text-ink-3">weight {Number(m.weight)} · {date(m.updated_at)}</div>
                {who(m.id) && <div className="text-[11.5px] text-ink-2">{who(m.id)}</div>}
              </div>
            );
          })}
        </div>
      </Section>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="Posted updates">
          <ol className="divide-y divide-line">
            {site.updates.map((u) => (
              <li key={u.id} className="grid gap-0.5 py-3">
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">{date(u.created_at)}
                  {u.milestone_key && <span className="tag">{MILESTONES.find((m) => m.key === u.milestone_key)?.label}</span>}
                  {u.snapshot && u.milestone_key && <span className="num">→ {Math.round(Number(u.snapshot[u.milestone_key as keyof typeof u.snapshot] ?? 0))}%</span>}
                  <span className="num ml-auto">project {Math.round(u.progress_percent ?? 0)}%</span></div>
                <div className="font-semibold">{u.title}</div>{u.body && <div className="text-[13.5px] text-ink-2">{u.body}</div>}
                {(() => { const c = checkOf(u.id); if (!c) return null; const bad = c.flags.filter((f) => f.severity !== 'info'); return (
                  <div className="mt-1.5 grid gap-1 rounded-xl border border-line bg-surface-2/50 p-2 text-[12px]">
                    <div className="flex items-center gap-2 font-semibold text-ink-2">Photo check <AISource source={c.source} />
                      {c.exif?.takenAt && <span className="font-normal text-ink-3">taken {date(c.exif.takenAt)}{c.exif.distanceM != null ? ` · ${c.exif.distanceM < 1000 ? c.exif.distanceM + ' m' : (c.exif.distanceM / 1000).toFixed(1) + ' km'} from site` : ''}</span>}</div>
                    {bad.length === 0 && <span className="text-good">{c.vision ? `Shows the claimed work${c.vision.estimated_range ? ` (looks ${c.vision.estimated_range[0]}–${c.vision.estimated_range[1]}% done)` : ''}.` : 'Camera time and place look right.'}</span>}
                    {bad.map((f, i) => <span key={i} className={f.severity === 'critical' ? 'text-bad' : 'text-warn'}><b>{f.label}.</b> <span className="text-ink-2">{f.detail}</span></span>)}
                    {c.vision?.observations?.length ? <span className="text-ink-3">{c.vision.observations.join(' ')}</span> : null}
                    {c.flags.filter((f) => f.severity === 'info').map((f, i) => <span key={'i' + i} className="text-ink-3">{f.label}. {f.detail}</span>)}
                  </div>
                ); })()}
              </li>
            ))}
          </ol>
        </Section>
        <Section title="Send an announcement">
          <ActionForm action={postAnnouncement} className="grid gap-3">
            <div><label className="label" htmlFor="at">Title</label><input id="at" name="title" className="input" placeholder="Open house this Sunday" required /></div>
            <div><label className="label" htmlFor="ab">Message</label><textarea id="ab" name="body" rows={3} className="input" /></div>
            <SubmitButton pendingText="Sending…">Send to all buyers</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
