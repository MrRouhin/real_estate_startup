'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { saveEmployeeProfile } from '../actions';

type P = {
  date_of_birth: string | null; address: string | null; city: string | null; home_state: string | null; emergency_name: string | null; emergency_phone: string | null;
  emergency_relation: string | null; id_type: string | null; id_last4: string | null; trade: string | null; skills: string[] | null; experience_years: number | null;
  languages: string[] | null; blood_group: string | null; safety_trained: boolean | null; safety_training_date: string | null; upi_id: string | null; bank_ifsc: string | null; bank_last4: string | null; status: string;
};

const STEPS = [
  { key: 'personal', emoji: '🙋', title: 'About you' },
  { key: 'emergency', emoji: '🚑', title: 'Emergency contact' },
  { key: 'work', emoji: '🛠️', title: 'Your work' },
  { key: 'id', emoji: '🪪', title: 'ID and wages' },
  { key: 'review', emoji: '✅', title: 'Check and send' },
] as const;
const SKILLS = ['Shuttering', 'Bar bending', 'Concreting', 'Brickwork', 'Plastering', 'Tiling', 'Wiring', 'Plumbing', 'Welding', 'Painting', 'Scaffolding', 'Machine operation'];
const LANGS = ['Kannada', 'Hindi', 'Telugu', 'Tamil', 'English', 'Odia', 'Bengali', 'Marathi'];
const STATES = ['Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Kerala', 'Odisha', 'West Bengal', 'Bihar', 'Jharkhand', 'Uttar Pradesh', 'Maharashtra', 'Assam', 'Rajasthan', 'Madhya Pradesh', 'Other'];
const maxDob = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10); };

export function ProfileWizard({ initial, phone }: { initial: P | null; phone: string | null }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Record<string, unknown>>({
    date_of_birth: initial?.date_of_birth ?? '', phone: phone ?? '', address: initial?.address ?? '', city: initial?.city ?? '', home_state: initial?.home_state ?? '',
    blood_group: initial?.blood_group ?? '', languages: initial?.languages ?? [],
    emergency_name: initial?.emergency_name ?? '', emergency_relation: initial?.emergency_relation ?? '', emergency_phone: initial?.emergency_phone ?? '',
    trade: initial?.trade ?? '', skills: initial?.skills ?? [], experience_years: initial?.experience_years ?? '', safety_trained: initial?.safety_trained ?? false, safety_training_date: initial?.safety_training_date ?? '',
    id_type: initial?.id_type ?? 'Aadhaar', id_number: '', bank_ifsc: initial?.bank_ifsc ?? '', bank_account: '', upi_id: initial?.upi_id ?? '',
  });
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = (k: string, v: unknown) => setF((x) => ({ ...x, [k]: v }));
  const toggle = (k: 'skills' | 'languages', v: string) => setF((x) => { const a = (x[k] as string[]) || []; return { ...x, [k]: a.includes(v) ? a.filter((i) => i !== v) : [...a, v] }; });
  const fields: Record<string, string[]> = {
    personal: ['date_of_birth', 'phone', 'address', 'city', 'home_state', 'blood_group', 'languages'],
    emergency: ['emergency_name', 'emergency_relation', 'emergency_phone'],
    work: ['trade', 'skills', 'experience_years', 'safety_trained', 'safety_training_date'],
    id: ['id_type', 'id_number', 'bank_ifsc', 'bank_account', 'upi_id'],
  };
  const save = (submit = false) => start(async () => {
    const key = STEPS[step]!.key;
    const payload = Object.fromEntries((submit ? Object.values(fields).flat() : fields[key] || []).map((k) => [k, f[k]]).filter(([k, v]) => !((k === 'id_number' || k === 'bank_account') && !v)));
    const r = await saveEmployeeProfile(payload, submit);
    if (!r.ok) { toast(r.error || 'Could not save', 'error'); return; }
    if (submit) { toast(r.message || 'Sent'); router.refresh(); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    router.refresh();
  });
  const I = ({ k, label, type = 'text', placeholder, ...rest }: { k: string; label: string; type?: string; placeholder?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div><label className="label" htmlFor={k}>{label}</label><input id={k} type={type} className="input" placeholder={placeholder} value={String(f[k] ?? '')} onChange={(e) => set(k, e.target.value)} {...rest} /></div>
  );
  const Chips = ({ k, options }: { k: 'skills' | 'languages'; options: string[] }) => (
    <div className="flex flex-wrap gap-1.5">{options.map((o) => <button type="button" key={o} className="chip" aria-pressed={((f[k] as string[]) || []).includes(o)} onClick={() => toggle(k, o)}>{o}</button>)}</div>
  );
  const key = STEPS[step]!.key;
  return (
    <div className="card grid gap-5 p-5">
      <ol className="grid grid-cols-5 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s.key}><button type="button" onClick={() => setStep(i)} className="grid w-full justify-items-center gap-1 text-center">
            <span className={'grid size-10 place-items-center rounded-2xl text-[18px] transition ' + (i === step ? 'bg-accent text-white shadow-lg' : i < step ? 'bg-accent-soft' : 'bg-surface-2 grayscale')}>{i < step ? <Check className="size-5 text-accent" /> : s.emoji}</span>
            <span className={'hidden text-[11.5px] sm:block ' + (i === step ? 'font-semibold' : 'text-ink-3')}>{s.title}</span>
          </button></li>
        ))}
      </ol>
      <AnimatePresence mode="wait">
        <motion.div key={key} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }} className="grid gap-3 sm:grid-cols-2">
          <h2 className="text-[18px] font-bold sm:col-span-2">{STEPS[step]!.emoji} {STEPS[step]!.title}</h2>
          {key === 'personal' && <>
            {I({ k: "date_of_birth", label: "Date of birth", type: "date", max: maxDob() })}
            {I({ k: "phone", label: "Mobile number", type: "tel", placeholder: "98450 12345" })}
            <div className="sm:col-span-2">{I({ k: "address", label: "Address where you stay now", placeholder: "Labour camp, Block 2, Devanahalli" })}</div>
            {I({ k: "city", label: "Home town", placeholder: "Raichur" })}
            <div><label className="label" htmlFor="home_state">Home state</label><select id="home_state" className="input" value={String(f.home_state)} onChange={(e) => set('home_state', e.target.value)}><option value="">—</option>{STATES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className="label" htmlFor="blood_group">Blood group</label><select id="blood_group" className="input" value={String(f.blood_group)} onChange={(e) => set('blood_group', e.target.value)}><option value="">Don’t know</option>{['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}</select></div>
            <div className="sm:col-span-2"><div className="label">Languages you speak</div>{Chips({ k: "languages", options: LANGS })}</div>
          </>}
          {key === 'emergency' && <>
            {I({ k: "emergency_name", label: "Name", placeholder: "Lakshmi" })}
            <div><label className="label" htmlFor="emergency_relation">Relation</label><select id="emergency_relation" className="input" value={String(f.emergency_relation)} onChange={(e) => set('emergency_relation', e.target.value)}><option value="">—</option>{['Wife', 'Husband', 'Mother', 'Father', 'Brother', 'Sister', 'Son', 'Daughter', 'Friend'].map((r) => <option key={r}>{r}</option>)}</select></div>
            {I({ k: "emergency_phone", label: "Their mobile number", type: "tel", placeholder: "98450 12345" })}
            <p className="text-[12.5px] text-ink-3 sm:col-span-2">We call this person only in an emergency on site.</p>
          </>}
          {key === 'work' && <>
            {I({ k: "trade", label: "Main trade", placeholder: "Bar bender", list: "trade-list" })}
            <datalist id="trade-list">{['Mason', 'Bar bender', 'Carpenter (shuttering)', 'Electrician', 'Plumber', 'Helper', 'Welder', 'Painter', 'Tile layer', 'Supervisor'].map((t) => <option key={t} value={t} />)}</datalist>
            {I({ k: "experience_years", label: "Years of experience", type: "number", min: 0, max: 50 })}
            <div className="sm:col-span-2"><div className="label">Skills</div>{Chips({ k: "skills", options: SKILLS })}</div>
            <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" checked={!!f.safety_trained} onChange={(e) => set('safety_trained', e.target.checked)} className="size-4 accent-[var(--accent)]" />I have done site safety training</label>
            {!!f.safety_trained && I({ k: "safety_training_date", label: "Training date", type: "date", max: new Date().toISOString().slice(0, 10) })}
          </>}
          {key === 'id' && <>
            <div><label className="label" htmlFor="id_type">ID proof</label><select id="id_type" className="input" value={String(f.id_type)} onChange={(e) => set('id_type', e.target.value)}>{['Aadhaar', 'Voter ID', 'Driving licence', 'PAN', 'Passport', 'e-Shram card'].map((t) => <option key={t}>{t}</option>)}</select></div>
            {I({ k: "id_number", label: initial?.id_last4 ? `ID number (saved: ending ${initial.id_last4})` : 'ID number', type: "password", placeholder: "Only the last 4 are kept", autoComplete: "off" })}
            {I({ k: "bank_ifsc", label: "Bank IFSC", placeholder: "SBIN0001234", className: "input num uppercase" })}
            {I({ k: "bank_account", label: initial?.bank_last4 ? `Account number (saved: ending ${initial.bank_last4})` : 'Bank account number', type: "password", placeholder: "Only the last 4 are kept", autoComplete: "off" })}
            {I({ k: "upi_id", label: "UPI ID (optional)", placeholder: "9845012345@ybl" })}
            <p className="flex items-start gap-1.5 text-[12.5px] text-ink-3 sm:col-span-2"><Lock className="mt-0.5 size-3.5 shrink-0" />Full ID and account numbers are never stored. We keep only the last 4 digits to match your records and wage payments.</p>
          </>}
          {key === 'review' && (
            <div className="grid gap-2 text-[13.5px] sm:col-span-2">
              {[['Date of birth', f.date_of_birth], ['Mobile', f.phone], ['Home', [f.city, f.home_state].filter(Boolean).join(', ')], ['Emergency contact', f.emergency_name ? `${f.emergency_name} (${f.emergency_relation}) ${f.emergency_phone}` : ''],
                ['Trade', f.trade], ['Skills', ((f.skills as string[]) || []).join(', ')], ['Experience', f.experience_years ? `${f.experience_years} years` : ''], ['Safety training', f.safety_trained ? `Yes${f.safety_training_date ? `, ${f.safety_training_date}` : ''}` : 'Not yet'],
                ['ID', `${f.id_type}${initial?.id_last4 || f.id_number ? ` ending ${String(f.id_number || initial?.id_last4).slice(-4)}` : ' (not given)'}`], ['Wages to', f.upi_id || (f.bank_ifsc ? `${f.bank_ifsc}${initial?.bank_last4 || f.bank_account ? ` ••${String(f.bank_account || initial?.bank_last4).slice(-4)}` : ''}` : '')]].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 border-b border-line py-1.5"><span className="text-ink-3">{String(k)}</span><span className={v ? 'text-right font-medium' : 'text-bad'}>{String(v || 'Missing')}</span></div>
              ))}
              <p className="text-[12.5px] text-ink-3">Your supervisor checks these details and verifies you. Changing anything later sends it for a quick re-check.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
        <button type="button" className="btn btn-ghost" disabled={step === 0 || pending} onClick={() => setStep((s) => s - 1)}><ArrowLeft className="size-4" />Back</button>
        {key === 'review'
          ? <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save(true)}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}Send for verification</button>
          : <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save(false)}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Save and continue<ArrowRight className="size-4" /></button>}
      </div>
    </div>
  );
}
