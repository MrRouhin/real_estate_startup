'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Keeps a server-rendered page fresh. With Supabase Realtime on, any change to the
 * listed tables re-renders the page within a second; otherwise it re-checks on an interval.
 */
export function LiveRefresh({ tables, filter, every = 20000 }: { tables: string[]; filter?: string; every?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };
    if (process.env.NEXT_PUBLIC_REALTIME === 'off') {
      const id = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, every);
      return () => clearInterval(id);
    }
    const supabase = getBrowserClient();
    const ch = supabase.channel('live-' + tables.join('-') + (filter || ''));
    tables.forEach((table) => ch.on('postgres_changes' as never, { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) } as never, refresh));
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [router, tables, filter, every]);
  return null;
}
