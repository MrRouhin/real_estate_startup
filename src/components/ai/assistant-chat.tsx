'use client';
// A small chat used by every assistant (plot matchmaker, document Q&A, ask-your-site).
// Optional language picker, voice input (Web Speech API) and read-aloud.
import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import { LANGS, type Lang } from '@/lib/ai/i18n';
import { AISource } from './bits';

export type ChatMsg = { role: 'user' | 'assistant'; content: string; data?: Record<string, unknown> };

type SR = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export function AssistantChat({ endpoint, extra = {}, greeting, suggestions = [], languages = false, placeholder = 'Type a message…', renderExtras, onResult, height = 'min(60dvh, 520px)' }: {
  endpoint: string; extra?: Record<string, unknown>; greeting: string; suggestions?: string[]; languages?: boolean; placeholder?: string;
  renderExtras?: (data: Record<string, unknown>) => React.ReactNode; onResult?: (data: Record<string, unknown>) => void; height?: string;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ role: 'assistant', content: greeting }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [canVoice, setCanVoice] = useState(false);
  const state = useRef<unknown>(null);
  const rec = useRef<SR | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { const w = window as unknown as Record<string, unknown>; setCanVoice(!!(w.SpeechRecognition || w.webkitSpeechRecognition)); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy]);

  const say = (t: string) => {
    if (!speak || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t.replace(/[•#*]/g, ''));
    u.lang = LANGS.find((l) => l.id === lang)!.speech;
    window.speechSynthesis.speak(u);
  };

  async function send(q: string) {
    const content = q.trim();
    if (!content || busy) return;
    const next: ChatMsg[] = [...msgs, { role: 'user', content }];
    setMsgs(next); setText(''); setBusy(true);
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...extra, lang, state: state.current, messages: next.slice(1).map(({ role, content }) => ({ role, content })).slice(-12) }) });
      const j = await res.json().catch(() => ({}));
      const reply = res.ok ? String(j.reply || '…') : String(j.error || 'Something went wrong. Try again in a moment.');
      if (res.ok) { state.current = j.state ?? null; onResult?.(j); }
      setMsgs((m) => [...m, { role: 'assistant', content: reply, data: res.ok ? j : undefined }]);
      if (res.ok) say(reply);
    } catch {
      setMsgs((m) => [...m, { role: 'assistant', content: 'Could not reach the assistant. Check your connection.' }]);
    } finally { setBusy(false); }
  }

  function toggleMic() {
    if (listening) { rec.current?.stop(); return; }
    const w = window as unknown as Record<string, new () => SR>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = LANGS.find((l) => l.id === lang)!.speech; r.interimResults = false; r.continuous = false;
    r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0]?.transcript || '').join(' '); if (t) send(t); };
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; setListening(true); r.start();
  }

  return (
    <div className="grid gap-3">
      {languages && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Language">
            {LANGS.map((l) => <button key={l.id} role="radio" aria-checked={lang === l.id} onClick={() => setLang(l.id)}
              className={'rounded-lg px-2.5 py-1 text-[12.5px] font-semibold ' + (lang === l.id ? 'bg-surface text-ink shadow-sm' : 'text-ink-3')}>{l.label}</button>)}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setSpeak(!speak); if (speak) window.speechSynthesis?.cancel(); }} aria-pressed={speak} title="Read replies aloud">
            {speak ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}<span className="text-[12px]">{speak ? 'Voice on' : 'Voice off'}</span>
          </button>
        </div>
      )}
      <div className="grid content-start gap-2.5 overflow-y-auto rounded-2xl bg-surface-2/60 p-3" style={{ height }} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={'grid gap-2 ' + (m.role === 'user' ? 'justify-items-end' : '')}>
            <div className={'max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ' + (m.role === 'user' ? 'rounded-br-md bg-accent text-accent-ink' : 'rounded-bl-md border border-line bg-surface')}>
              {m.content}
              {m.role === 'assistant' && typeof m.data?.source === 'string' && <div className="mt-1.5"><AISource source={m.data.source as string} /></div>}
            </div>
            {m.data && renderExtras && <div className="w-full">{renderExtras(m.data)}</div>}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-[13px] text-ink-3"><Loader2 className="size-4 animate-spin" />Thinking…</div>}
        <div ref={end} />
      </div>
      {suggestions.length > 0 && msgs.length <= 2 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {suggestions.map((s) => <button key={s} className="chip shrink-0 whitespace-nowrap" onClick={() => send(s)} disabled={busy}>{s}</button>)}
        </div>
      )}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
        <input className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder={listening ? 'Listening…' : placeholder} aria-label="Message" maxLength={600} />
        {canVoice && <button type="button" className={'btn !px-3 ' + (listening ? 'btn-primary' : '')} onClick={toggleMic} aria-label={listening ? 'Stop listening' : 'Speak'}>{listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}</button>}
        <button className="btn btn-primary !px-3" disabled={busy || !text.trim()} aria-label="Send"><Send className="size-4" /></button>
      </form>
    </div>
  );
}
