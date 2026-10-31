'use client';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { uploadEmployeePhoto } from '../actions';

export function PhotoUpload({ url }: { url: string | null }) {
  const [preview, setPreview] = useState<string | null>(url);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="card grid content-start justify-items-center gap-3 p-5 text-center">
      <button type="button" onClick={() => input.current?.click()} className="relative grid size-36 place-items-center overflow-hidden rounded-[28px] border-2 border-dashed border-line bg-surface-2 text-ink-3" aria-label="Change photo">
        {preview ? <img src={preview} alt="Your photo" className="size-full object-cover" /> : <span className="text-[44px]">🧑‍🔧</span>}
        <span className="absolute bottom-2 right-2 grid size-9 place-items-center rounded-full bg-accent text-white shadow">{pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}</span>
      </button>
      <input ref={input} type="file" accept="image/*" capture="user" className="sr-only" onChange={(e) => {
        const f = e.target.files?.[0]; if (!f) return;
        setPreview(URL.createObjectURL(f));
        const fd = new FormData(); fd.set('photo', f);
        start(async () => { const r = await uploadEmployeePhoto(fd); toast(r.ok ? r.message! : r.error!, r.ok ? 'success' : 'error'); router.refresh(); });
      }} />
      <p className="text-[12.5px] text-ink-2">A clear face photo for your site ID card.</p>
    </div>
  );
}
