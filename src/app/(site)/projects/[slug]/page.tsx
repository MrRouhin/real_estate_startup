import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Box, FileText, MapPin, Megaphone, ShieldCheck, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth';
import { loadProjectBySlug } from '@/lib/queries';
import { liveStatus, MILESTONES } from '@/lib/site';
import { date, lakh } from '@/lib/format';
import { ConstructionTimeline } from '@/components/three/construction-timeline';
import { EnquiryButton } from '@/components/buyer/enquiry';
import { LiveRefresh } from '@/components/live-refresh';
import { Item, ProgressRing, Stagger } from '@/components/ui/motion';
import { Empty } from '@/components/ui/bits';
import { DocsAskButton } from '@/components/ai/docs-ask';
import { ApartmentOverview } from './apartments';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('name, city').eq('slug', slug).maybeSingle();
  return { title: data ? `${data.name}, ${data.city}` : 'Project' };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const d = await loadProjectBySlug(supabase, slug);
  if (!d) notFound();
  const { project, plots, layout, progress, updates, milestones } = d;
  const { profile } = await getSession();
  const [{ data: docs }, { data: news }] = await Promise.all([
    supabase.from('documents').select('id, title, category, storage_path').eq('project_id', project.id).eq('visibility', 'public').order('created_at'),
    supabase.from('announcements').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).limit(5),
  ]);
  const signed = await Promise.all((docs || []).map(async (doc) => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(doc.storage_path, 600);
    return { ...doc, url: data?.signedUrl ?? null };
  }));
  const avail = plots.filter((p) => liveStatus(p) === 'available');
  const from = avail.length ? Math.min(...avail.map((p) => Number(p.price))) : null;
  const msName = Object.fromEntries(milestones.map((m) => [m.key, m.name]));

  return (
    <div className="grid gap-8">
      <LiveRefresh tables={['plots', 'construction_updates', 'milestones', 'towers']} filter={`project_id=eq.${project.id}`} />
      {project.kind === 'apartments' ? <ApartmentOverview supabase={supabase} project={project as never} profile={profile ? { full_name: profile.full_name, phone: profile.phone, email: profile.email } : null} /> : <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        {plots.length > 0 ? (
          <ConstructionTimeline plots={plots} layout={layout} current={progress} updates={updates} height="min(64vh, 540px)" />
        ) : (
          <Empty title="Layout coming soon">This project is opening for registrations. Book a visit to get first access to plots.</Empty>
        )}
        <Stagger className="grid content-start gap-4">
          <Item>
            <div className="eyebrow flex items-center gap-1.5"><MapPin className="size-3.5" />{project.city}</div>
            <h1 className="mt-1 text-[32px] font-bold leading-tight">{project.name}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{project.description}</p>
          </Item>
          <Item className="card grid grid-cols-[auto_1fr] items-center gap-4 p-4">
            <ProgressRing value={Number(project.progress_percent)} size={72} stroke={7} />
            <div><div className="font-semibold">Development progress</div>
              <div className="text-[13px] text-ink-2">{updates[0] ? <>Last update {date(updates[0].created_at)}: {updates[0].title}</> : 'Work starting soon'}</div></div>
          </Item>
          <Item className="grid grid-cols-3 gap-2">
            {[['Available', avail.length, 'text-available'], ['Total plots', plots.length, ''], ['From', from ? lakh(from) : '—', '']].map(([l, v, c]) => (
              <div key={l as string} className="rounded-2xl bg-surface-2 p-3"><div className={'num text-[17px] font-semibold ' + c}>{v}</div><div className="text-[12px] text-ink-3">{l}</div></div>
            ))}
          </Item>
          <Item className="flex items-center gap-2 rounded-2xl border border-line p-3 text-[13px]">
            <ShieldCheck className="size-5 shrink-0 text-good" />
            <div><div className="font-semibold">RERA registered</div><div className="num text-[12px] text-ink-2">{project.rera_number}</div></div>
          </Item>
          <Item className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {plots.length > 0 && <Link href={`/projects/${project.slug}/plots`} className="btn btn-primary btn-lg"><Box className="size-4" />Explore plots in 3D</Link>}
            {plots.length > 0 && <Link href={`/projects/${project.slug}/plots?ai=1`} className="btn btn-outline btn-lg"><Sparkles className="size-4" />Find my plot with AI</Link>}
            <EnquiryButton projectId={project.id} className="btn btn-outline btn-lg" defaults={{ name: profile?.full_name, phone: profile?.phone, email: profile?.email }} />
          </Item>
        </Stagger>
      </div>

      {milestones.length > 0 && (
        <section>
          <h2 className="mb-3 text-[20px] font-bold">What’s been built</h2>
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {MILESTONES.filter((m) => m.key in progress).map((m) => (
              <Item key={m.key} className="card grid justify-items-center gap-2 p-4 text-center">
                <ProgressRing value={progress[m.key] ?? 0} color={m.color} size={62} />
                <div className="text-[12.5px] font-semibold leading-tight">{msName[m.key] || m.label}</div>
              </Item>
            ))}
          </Stagger>
        </section>
      )}
      </>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section>
          <h2 className="mb-3 text-[20px] font-bold">Construction updates</h2>
          {updates.length === 0 ? <Empty title="No updates yet" /> : (
            <ol className="relative grid gap-3 border-l-2 border-line pl-5">
              {updates.map((u) => {
                const m = MILESTONES.find((x) => x.key === u.milestone_key);
                return (
                  <li key={u.id} className="relative">
                    <span className="absolute -left-[27px] top-4 size-3 rounded-full border-2 border-surface" style={{ background: m?.color || 'var(--accent)' }} />
                    <div className="card p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                        <span>{date(u.created_at)}</span>{m && <span className="tag" style={{ color: m.color }}>{msName[m.key] || m.label}</span>}
                        {u.progress_percent != null && <span className="num ml-auto font-semibold text-ink-2">Project {Math.round(u.progress_percent)}%</span>}
                      </div>
                      <div className="mt-1.5 font-semibold">{u.title}</div>
                      {u.body && <p className="mt-0.5 text-[13.5px] text-ink-2">{u.body}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <div className="grid content-start gap-6">
          <section className="card p-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-[17px] font-bold"><FileText className="size-5 text-accent" />Documents</h2><DocsAskButton projectId={project.id} /></div>
            {signed.length === 0 ? <p className="text-[13.5px] text-ink-2">No documents uploaded yet.</p> : (
              <ul className="divide-y divide-line">
                {signed.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div><div className="text-[14px] font-medium">{doc.title}</div><div className="text-[12px] capitalize text-ink-3">{doc.category} · PDF</div></div>
                    {doc.url ? <a className="btn btn-ghost btn-sm" href={doc.url} target="_blank" rel="noreferrer">Open</a> : <span className="text-[12px] text-ink-3">Unavailable</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-5">
            <h2 className="mb-2 flex items-center gap-2 text-[17px] font-bold"><Megaphone className="size-5 text-accent" />Announcements</h2>
            {(news || []).length === 0 ? <p className="text-[13.5px] text-ink-2">Nothing new.</p> : (
              <ul className="grid gap-3">
                {news!.map((n) => <li key={n.id}><div className="text-[12px] text-ink-3">{date(n.created_at)}</div><div className="font-semibold">{n.title}</div><p className="text-[13.5px] text-ink-2">{n.body}</p></li>)}
              </ul>
            )}
          </section>
          {project.site_lat && (
            <section className="card p-5">
              <h2 className="mb-1 flex items-center gap-2 text-[17px] font-bold"><MapPin className="size-5 text-accent" />Location</h2>
              <p className="text-[13.5px] text-ink-2">{project.address}</p>
              <a className="btn btn-outline btn-sm mt-3" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${project.site_lat},${project.site_lng}`}>Open in Google Maps</a>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
