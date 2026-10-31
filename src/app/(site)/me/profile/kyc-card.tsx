'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, FileUp, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { submitKyc } from './actions';

export function KycCard({ userId, status, idType, last4, note }: { userId: string; status: string; idType: string | null; last4: string | null; note: string | null }) {
  const [type, setType] = useState(idType ?? 'PAN');
  const [num, setNum] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  async function send() {
    if (!file) { toast('Choose a photo or PDF of the ID', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Use a file under 5 MB', 'error'); return; }
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/id-${Date.now()}.${ext}`;
    const up = await getBrowserClient().storage.from('kyc').upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (up.error) { setBusy(false); toast(up.error.message, 'error'); return; }
    const r = await submitKyc(type, num, path);
    setBusy(false);
    toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error');
    if (r.ok) { setNum(''); setFile(null); router.refresh(); }
  }
  if (status === 'verified') return (
    <div className="card grid gap-2 p-5"><div className="flex items-center gap-2 text-[16px] font-bold text-good"><BadgeCheck className="size-5" />ID verified</div>
      <p className="text-[13.5px] text-ink-2">{idType} ending <b className="num">{last4}</b>. Bookings go through without waiting for checks.</p></div>
  );
  return (
    <div className="card grid gap-3 p-5">
      <div className="flex items-start justify-between gap-2"><h2 className="text-[16px] font-bold">Verify your ID (KYC)</h2>
        {status === 'submitted' && <span className="tag">Under review</span>}{status === 'rejected' && <span className="tag !text-bad">Needs another look</span>}</div>
      {status === 'rejected' && note && <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--bad)_8%,transparent)] px-3 py-2 text-[13px] text-bad"><ShieldAlert className="mt-0.5 size-4 shrink-0" />{note}</p>}
      {status === 'submitted' ? <p className="text-[13.5px] text-ink-2">{idType} ending <b className="num">{last4}</b> is with the developer for checks. You will get a notification.</p> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="kt">ID type</label><select id="kt" className="input" value={type} onChange={(e) => setType(e.target.value)}>{['PAN', 'Aadhaar', 'Passport', 'Voter ID', 'Driving licence'].map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className="label" htmlFor="kn">ID number</label><input id="kn" className="input num uppercase" type="password" autoComplete="off" value={num} onChange={(e) => setNum(e.target.value)} placeholder="Only the last 4 are kept" /></div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-line p-4 text-[13.5px] hover:border-accent">
            <FileUp className="size-5 text-accent" /><span className="flex-1">{file ? file.name : 'Photo or PDF of the ID (under 5 MB)'}</span>
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button className="btn btn-primary" onClick={send} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}Send for verification</button>
          <p className="flex items-start gap-1.5 text-[12px] text-ink-3"><Lock className="mt-0.5 size-3.5 shrink-0" />The document is stored privately and only the developer you book with can open it. We never store the full ID number.</p>
        </>
      )}
    </div>
  );
}
