'use client';
import { useState } from 'react';
import { Copy, MessageCircle, ShoppingCart } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/toast';

/** Shows a drafted purchase order and sends it on WhatsApp or copies it. */
export function OrderButton({ message, phone, title }: { message: string; phone: string | null; title: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(message);
  const toast = useToast();
  const digits = (phone || '').replace(/\D/g, '');
  const wa = digits ? `https://wa.me/${digits.length === 10 ? '91' + digits : digits}?text=${encodeURIComponent(text)}` : null;
  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}><ShoppingCart className="size-4" />Draft order</button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <div className="grid gap-3">
          <textarea className="input min-h-[200px] text-[13.5px]" value={text} onChange={(e) => setText(e.target.value)} aria-label="Order message" />
          <div className="flex flex-wrap gap-2">
            {wa && <a className="btn btn-primary" href={wa} target="_blank" rel="noopener"><MessageCircle className="size-4" />Send on WhatsApp</a>}
            <button className="btn" onClick={() => navigator.clipboard?.writeText(text).then(() => toast('Copied', 'success')).catch(() => toast('Could not copy', 'error'))}><Copy className="size-4" />Copy</button>
          </div>
          <p className="text-[12px] text-ink-3">Nothing is sent until you press Send. Quantities cover the next 30 days at the current issue rate plus open requests and the reorder level, with a 7-day lead time.</p>
        </div>
      </Sheet>
    </>
  );
}
