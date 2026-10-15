import { FileText, FileUp } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { date } from '@/lib/format';
import { PageHeader, Section } from '@/components/ui/bits';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { uploadDocument } from '../actions';

export const metadata = { title: 'Documents' };

export default async function Documents() {
  const { supabase, project } = await requireStaff();
  const [{ data: docs }, { data: bookings }] = await Promise.all([
    supabase.from('documents').select('*').eq('project_id', project!.id).order('created_at', { ascending: false }),
    supabase.from('bookings').select('id, plots(plot_number), profiles(full_name)').eq('org_id', project!.org_id).in('status', ['confirmed', 'registered', 'handed_over']),
  ]);
  const signed = await Promise.all((docs || []).map(async (d) => ({ ...d, url: (await supabase.storage.from('documents').createSignedUrl(d.storage_path, 600)).data?.signedUrl })));
  const label = Object.fromEntries((bookings || []).map((b) => [b.id, `${(b.plots as unknown as { plot_number: string }).plot_number} · ${(b.profiles as unknown as { full_name: string }).full_name}`]));
  return (
    <>
      <PageHeader eyebrow={project!.name} title="Documents" sub="Public documents are visible to every visitor. Booking documents are visible only to that buyer." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title={`${signed.length} files`}>
          <ul className="divide-y divide-line">
            {signed.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent"><FileText className="size-4" /></span>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{d.title}</div>
                  <div className="text-[12px] text-ink-3"><span className="capitalize">{d.category}</span> · {d.booking_id ? `Only buyer of ${label[d.booking_id] || 'booking'}` : d.visibility === 'public' ? 'Everyone' : 'Internal'} · {date(d.created_at)}</div></div>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open</a>}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Upload">
          <ActionForm action={uploadDocument} className="grid gap-3">
            <div><label className="label" htmlFor="ut">Title</label><input id="ut" name="title" className="input" placeholder="Approved layout plan" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="uc">Category</label><select id="uc" name="category" className="input">{['rera', 'approval', 'legal', 'brochure', 'agreement', 'receipt', 'general'].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="label" htmlFor="uv">Visible to</label><select id="uv" name="visibility" className="input"><option value="public">Everyone</option><option value="internal">Staff only</option></select></div>
            </div>
            <div><label className="label" htmlFor="ub">Or share with one buyer</label><select id="ub" name="booking_id" className="input"><option value="">—</option>{(bookings || []).map((b) => <option key={b.id} value={b.id}>{label[b.id]}</option>)}</select></div>
            <label className="btn btn-outline cursor-pointer"><FileUp className="size-4" />Choose PDF or image<input type="file" name="file" accept="application/pdf,image/*" className="sr-only" required /></label>
            <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}
