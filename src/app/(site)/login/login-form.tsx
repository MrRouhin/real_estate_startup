'use client';
import { useState } from 'react';
import { Loader2, Mail, Smartphone } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';

const DEMO = [
  ['Developer console', 'sales@demodevelopers.dev'],
  ['Buyer', 'buyer@plotline.dev'],
  ['Contractor', 'contractor@abcconstructions.dev'],
  ['Vendor', 'vendor@xyzmaterials.dev'],
  ['Site employee', 'employee@plotline.dev'],
];

export function LoginForm({ next, error, showDemo }: { next?: string; error?: string; showDemo: boolean }) {
  const [tab, setTab] = useState<'phone' | 'email'>('email');
  const [step, setStep] = useState<'start' | 'otp'>('start');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(error === 'no-organization' ? 'Your login is not linked to a developer yet. Ask the platform admin to add you.' : null);
  const toast = useToast();
  const supabase = getBrowserClient();
  const done = () => { window.location.href = '/auth/redirect' + (next ? `?next=${encodeURIComponent(next)}` : ''); };
  const e164 = '+91' + phone.replace(/\D/g, '').slice(-10);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (phone.replace(/\D/g, '').length < 10) { setMsg('Enter your 10-digit mobile number.'); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164, options: { data: name ? { full_name: name } : undefined } });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setStep('otp'); toast('Code sent by SMS');
  }
  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' });
    setBusy(false);
    if (error) { setMsg('That code is wrong or expired. Try again.'); return; }
    done();
  }
  async function emailLogin(e: React.FormEvent) {
    e.preventDefault(); setMsg(null); setBusy(true);
    const { error } = signup
      ? await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setMsg(error.message === 'Invalid login credentials' ? 'Wrong email or password.' : error.message); return; }
    done();
  }

  return (
    <div className="card mx-auto w-full max-w-md p-6 shadow-[var(--shadow)]">
      <h2 className="text-[22px] font-bold">{signup ? 'Create your account' : 'Sign in'}</h2>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist">
        {([['phone', Smartphone, 'Mobile OTP'], ['email', Mail, 'Email']] as const).map(([k, I, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setMsg(null); setStep('start'); }}
            className={'btn btn-sm ' + (tab === k ? 'bg-surface shadow-sm' : '!bg-transparent text-ink-2')}><I className="size-4" />{l}</button>
        ))}
      </div>
      {tab === 'phone' ? (
        step === 'start' ? (
          <form onSubmit={sendOtp} className="mt-5 grid gap-3">
            <div><label className="label" htmlFor="ph">Mobile number</label>
              <div className="flex gap-2"><span className="input !w-auto text-ink-2">+91</span><input id="ph" className="input num" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" /></div></div>
            <div><label className="label" htmlFor="nm">Your name (first time only)</label><input id="nm" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
            <button className="btn btn-primary mt-1" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Send OTP</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-5 grid gap-3">
            <p className="text-[13.5px] text-ink-2">Enter the 6-digit code sent to <b className="num">{e164}</b>.</p>
            <input className="input num text-center text-[22px] tracking-[0.5em]" inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} aria-label="One-time code" />
            <button className="btn btn-primary" disabled={busy || otp.length !== 6}>{busy && <Loader2 className="size-4 animate-spin" />}Verify and continue</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep('start')}>Change number</button>
          </form>
        )
      ) : (
        <form onSubmit={emailLogin} className="mt-5 grid gap-3">
          {signup && <div><label className="label" htmlFor="sn">Full name</label><input id="sn" className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>}
          <div><label className="label" htmlFor="em">Email</label><input id="em" type="email" className="input" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" required minLength={8} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <button className="btn btn-primary mt-1" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{signup ? 'Create account' : 'Sign in'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSignup((s) => !s)}>{signup ? 'I already have an account' : 'New buyer? Create an account'}</button>
        </form>
      )}
      {msg && <p role="alert" className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--bad)_10%,transparent)] px-3 py-2 text-[13px] text-bad">{msg}</p>}
      {showDemo && (
        <details className="mt-5 rounded-xl border border-dashed border-line p-3 text-[13px]" open>
          <summary className="cursor-pointer font-semibold text-ink-2">Demo logins (password Plotline@2026)</summary>
          <div className="mt-2 grid gap-1.5">
            {DEMO.map(([role, em]) => (
              <button key={em} type="button" className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                onClick={() => { setTab('email'); setSignup(false); setEmail(em!); setPassword('Plotline@2026'); }}>
                <span className="font-medium">{role}</span><span className="num truncate text-[12px] text-ink-3">{em}</span>
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
