import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { date } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/bits';
import { VerifyButton } from './verify-button';

export const metadata = { title: 'Platform' };

export default async function Platform() {
  const { supabase, profile } = await requireStaff();
  if (profile.role !== 'admin') redirect('/console');
  const { data: orgs } = await supabase.from('organizations').select('id, name, gst_number, phone, email, address, is_verified, is_demo, created_at, projects(id, name, rera_number, is_published)').order('created_at', { ascending: false });
  return (
    <>
      <PageHeader emoji="🛡️" title="Platform" sub="Check each developer’s RERA and GST details before verifying. Verified companies’ published projects are visible to buyers." />
      <Section title={`${(orgs || []).length} companies`}>
        <ul className="divide-y divide-[var(--glass-line)]">
          {(orgs || []).map((o) => { const ps = (o.projects as unknown as { id: string; name: string; rera_number: string | null; is_published: boolean }[]) || []; return (
            <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-[13.5px]">
              <div><b>{o.name}</b>{o.is_demo && <span className="tag ml-2">Demo</span>}
                <div className="text-[12px] text-ink-3">GSTIN {o.gst_number || '—'} · {o.phone || '—'} · {o.email || '—'} · joined {date(o.created_at)}</div>
                <div className="text-[12px] text-ink-2">{ps.length ? ps.map((p) => `${p.name}${p.rera_number ? ` (RERA ${p.rera_number})` : ' (no RERA)'}${p.is_published ? '' : ', unpublished'}`).join(' · ') : 'No projects yet'}</div></div>
              <VerifyButton id={o.id} verified={o.is_verified} />
            </li>
          ); })}
        </ul>
      </Section>
    </>
  );
}
