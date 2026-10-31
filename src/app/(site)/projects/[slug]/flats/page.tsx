import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadApartments } from '@/lib/flats/queries';
import { LiveRefresh } from '@/components/live-refresh';
import { CompareBar } from '@/components/buyer/compare-toggle';
import { FlatExplorer } from './explorer';

export const metadata: Metadata = { title: 'Find your flat' };

export default async function FlatsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ai?: string }> }) {
  const { slug } = await params;
  const { ai } = await searchParams;
  const supabase = await createClient();
  const { data: project } = await supabase.from('projects').select('id, name, slug, kind').eq('slug', slug).maybeSingle();
  if (!project) notFound();
  if (project.kind !== 'apartments') redirect(`/projects/${slug}/plots`);
  const d = await loadApartments(supabase, project.id);
  return (
    <>
      <LiveRefresh tables={['plots', 'towers']} filter={`project_id=eq.${project.id}`} every={15000} />
      <FlatExplorer project={{ id: project.id, name: project.name, slug: project.slug }} towers={d.towers.map((t) => ({ ...t, position: t.position ?? null, expected_completion: t.expected_completion }))}
        types={d.types} flats={d.flats} openAI={ai === '1'} />
      <CompareBar />
    </>
  );
}
