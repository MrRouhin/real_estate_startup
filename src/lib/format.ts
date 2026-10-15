// Indian number and date formatting used across the app.

export const inr = (n: number | string | null | undefined) =>
  '₹' + Math.round(Number(n ?? 0)).toLocaleString('en-IN');

/** ₹27.6 L / ₹1.24 Cr */
export const lakh = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(1) + ' L';
  return inr(v);
};

export const qty = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const IST = 'Asia/Kolkata';
export const date = (d: string | number | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: IST }) : '—';
export const shortDate = (d: string | number | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST }) : '—';
export const time = (d: string | number | Date | null | undefined) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: IST }) : '—';
export const dateTime = (d: string | number | Date | null | undefined) => (d ? `${shortDate(d)}, ${time(d)}` : '—');

/** Relative time. Pass `now` from the server when rendering in a client component so SSR and hydration agree. */
export function ago(d: string | number | Date | null | undefined, now: number = Date.now()) {
  if (!d) return '—';
  const s = (now - new Date(d).getTime()) / 1000;
  if (s < 0) {
    const f = -s;
    if (f < 60) return 'just now';
    if (f < 3600) return `in ${Math.max(1, Math.round(f / 60))} min`;
    if (f < 86400) return `in ${Math.round(f / 3600)} h`;
    return `in ${Math.round(f / 86400)} d`;
  }
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return date(d);
}

export const pct = (n: number | string | null | undefined, digits = 0) => `${Number(n ?? 0).toFixed(digits)}%`;
export const cap = (s: string | null | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
export const initials = (name: string | null | undefined) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
/** 919845012345 → +91 98450 12345 */
export const phone = (p: string | null | undefined) => {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  return p || '—';
};
export const todayIST = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
