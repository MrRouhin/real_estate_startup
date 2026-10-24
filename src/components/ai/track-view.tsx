'use client';
import { useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

/** Records an anonymous "view" of a plot (no personal data) for demand-based pricing. */
export function TrackView({ plotId }: { plotId: string }) {
  useEffect(() => {
    const k = 'pl-view-' + plotId;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch { /* private mode */ }
    getBrowserClient().rpc('track_plot_event', { p_plot: plotId, p_kind: 'view' }).then(() => {}, () => {});
  }, [plotId]);
  return null;
}
