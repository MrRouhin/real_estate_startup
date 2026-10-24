import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProjectBySlug } from '@/lib/queries';
import { LiveRefresh } from '@/components/live-refresh';
import { CompareBar } from '@/components/buyer/compare-toggle';
import { PlotExplorer } from './explorer';

export const metadata: Metadata = { title: 'Plot map' };

export default async function PlotsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ai?: string }> }) {
  const { slug } = await params;
  const { ai } = await searchParams;
  const supabase = await createClient();
  const d = await loadProjectBySlug(supabase, slug);
  if (!d) notFound();
  return (
    <>
      <LiveRefresh tables={['plots']} filter={`project_id=eq.${d.project.id}`} every={15000} />
      <PlotExplorer project={{ id: d.project.id, name: d.project.name, slug: d.project.slug }} plots={d.plots} layout={d.layout} progress={d.progress} openAI={ai === '1'} />
      <CompareBar />
    </>
  );
}
