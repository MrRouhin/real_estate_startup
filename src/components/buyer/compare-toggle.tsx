'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, Columns3, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const KEY = 'remmo-compare';
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const write = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); window.dispatchEvent(new Event('compare-change')); } catch { /* storage unavailable */ } };

export function useCompare() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { const on = () => setIds(read()); on(); window.addEventListener('compare-change', on); return () => window.removeEventListener('compare-change', on); }, []);
  return ids;
}

export function CompareToggle({ id, number, className = 'btn btn-outline' }: { id: string; number: string; className?: string }) {
  const ids = useCompare();
  const toast = useToast();
  const on = ids.includes(id);
  return (
    <button className={className} aria-pressed={on} onClick={() => {
      if (on) { write(ids.filter((x) => x !== id)); return; }
      if (ids.length >= 3) { toast('You can compare up to 3 plots. Remove one first.', 'error'); return; }
      write([...ids, id]); toast(`Added ${number} to compare (${ids.length + 1}/3)`);
    }}>
      {on ? <Check className="size-4" /> : <Plus className="size-4" />}{on ? 'Comparing' : 'Compare'}
    </button>
  );
}

export function CompareBar() {
  const ids = useCompare();
  if (ids.length === 0) return null;
  return (
    <Link href={`/compare?ids=${ids.join(',')}`} className="btn btn-primary fixed z-30 shadow-xl" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 18px)', right: 'max(18px, env(safe-area-inset-right))' }}>
      <Columns3 className="size-4" /> Compare {ids.length} plot{ids.length > 1 ? 's' : ''}
    </Link>
  );
}
