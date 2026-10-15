import type { ServerSupabase } from './supabase/server';
import { asLayout, progressFromMilestones } from './site';
import type { PlotShape, Progress } from './types';
import type { TimelineUpdate } from '@/components/three/construction-timeline';

export const PLOT_FIELDS = 'id, plot_number, status, shape_path, area_sqft, facing, is_corner, price, held_until, dimensions, project_id, org_id' as const;

/** Everything needed to draw a project's site in 2D/3D and replay its construction. */
export async function loadSite(supabase: ServerSupabase, projectId: string) {
  const [{ data: plots }, { data: milestones }, { data: updates }] = await Promise.all([
    supabase.from('plots').select(PLOT_FIELDS).eq('project_id', projectId).order('plot_number'),
    supabase.from('milestones').select('*').eq('project_id', projectId).order('sort_order'),
    supabase.from('construction_updates')
      .select('id, title, body, created_at, progress_percent, snapshot, milestone_id, photo_paths')
      .eq('project_id', projectId).order('created_at', { ascending: false }),
  ]);
  const msKey = Object.fromEntries((milestones || []).map((m) => [m.id, m.key]));
  const timeline: TimelineUpdate[] = (updates || []).map((u) => ({
    id: u.id, title: u.title, body: u.body, created_at: u.created_at,
    progress_percent: u.progress_percent == null ? null : Number(u.progress_percent),
    snapshot: (u.snapshot as Progress | null) ?? null, milestone_key: u.milestone_id ? msKey[u.milestone_id] : null,
  }));
  return {
    plots: (plots || []) as (PlotShape & { dimensions: string | null })[],
    milestones: milestones || [],
    progress: progressFromMilestones(milestones || []),
    updates: timeline,
    rawUpdates: updates || [],
  };
}

export async function loadProjectBySlug(supabase: ServerSupabase, slug: string) {
  const { data: project } = await supabase.from('projects').select('*').eq('slug', slug).maybeSingle();
  if (!project) return null;
  const site = await loadSite(supabase, project.id);
  return { project, layout: asLayout(project.layout), ...site };
}
