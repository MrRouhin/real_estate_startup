'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Check, Loader2, LogOut, MapPin } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { time } from '@/lib/format';
import { employeeCheckIn, employeeCheckOut } from './actions';

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(null), { enableHighAccuracy: true, timeout: 10000 });
  });
}
function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000, r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function CheckIn({ orgId, userId, today, site }: {
  orgId: string; userId: string; today: { in: string; out: string | null; inside: boolean | null; distance: number | null } | null;
  site: { lat: number; lng: number; radius: number } | null;
}) {
  const [selfie, setSelfie] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [where, setWhere] = useState<{ lat: number; lng: number } | null>(null);
  const toast = useToast();
  const router = useRouter();
  const dist = where && site ? metres(where, site) : null;

  async function checkIn() {
    setBusy(true);
    const pos = await getPosition();
    setWhere(pos);
    let path: string | null = null;
    if (selfie) {
      path = `${orgId}/selfies/${userId}-${Date.now()}.jpg`;
      const { error } = await getBrowserClient().storage.from('site').upload(path, selfie, { contentType: selfie.type || 'image/jpeg' });
      if (error) path = null;
    }
    const r = await employeeCheckIn(pos?.lat ?? null, pos?.lng ?? null, path, null);
    setBusy(false);
    toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error');
    router.refresh();
  }
  async function checkOut() {
    setBusy(true);
    const r = await employeeCheckOut(null);
    setBusy(false); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh();
  }

  if (today) {
    return (
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={'card grid justify-items-center gap-3 p-6 text-center ' + (today.inside === false ? 'border-bad/40' : 'border-good/40')}>
        <span className={'grid size-16 place-items-center rounded-full text-white ' + (today.inside === false ? 'bg-bad' : 'bg-good')}><Check className="size-8" /></span>
        <div className="text-[18px] font-bold">Checked in at {time(today.in)}</div>
        <div className="text-[13.5px] text-ink-2">{today.inside === false ? `You were ${today.distance} m from the site. Your supervisor can see this.` : today.inside ? 'Inside the site boundary.' : 'No location was shared.'}</div>
        {today.out ? <div className="text-[13.5px] text-ink-2">Checked out at {time(today.out)}</div> : (
          <button className="btn btn-outline btn-lg" onClick={checkOut} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}Check out</button>
        )}
      </motion.div>
    );
  }
  return (
    <div className="card grid gap-4 p-5">
      <div className="flex items-center gap-3">
        <label className="relative grid size-20 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-surface-2 text-ink-3">
          {preview ? <img src={preview} alt="Your selfie" className="size-full object-cover" /> : <Camera className="size-7" />}
          <input type="file" accept="image/*" capture="user" className="sr-only" aria-label="Take a selfie"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelfie(f); setPreview(URL.createObjectURL(f)); } }} />
        </label>
        <div className="text-[13.5px] text-ink-2"><div className="font-semibold text-ink">Take a selfie, then check in</div>Your location is checked against the site{site ? ` (${site.radius} m radius)` : ''}.</div>
      </div>
      {dist != null && <div className={'flex items-center gap-1.5 text-[13px] ' + (dist <= (site?.radius ?? 0) ? 'text-good' : 'text-bad')}><MapPin className="size-4" />{dist} m from the site centre</div>}
      <motion.button whileTap={{ scale: 0.97 }} className="btn btn-primary h-16 text-[18px]" onClick={checkIn} disabled={busy}>
        {busy ? <Loader2 className="size-5 animate-spin" /> : <MapPin className="size-5" />}{busy ? 'Checking in…' : 'Check in'}
      </motion.button>
    </div>
  );
}
