export type ActionResult = { ok: boolean; message?: string; error?: string; id?: string };

const FRIENDLY: Record<string, string> = {
  PLOT_NOT_AVAILABLE: 'Someone else is booking this plot right now. Try another plot, or check back in 15 minutes.',
  HOLD_EXPIRED_OR_MISSING: 'Your 15-minute hold ran out. Tap Book again to restart.',
  KYC_REJECTED: 'Your ID verification needs attention. Contact the developer.',
  NOT_SIGNED_IN: 'Sign in first.',
  INSUFFICIENT_STOCK: 'Not enough of this material in the store. Accept a delivery first.',
  NOT_ENOUGH_AT_SITE: 'That is more than the contractor holds at site.',
  ALREADY_CHECKED_IN: 'You have already checked in today.',
  NOT_CHECKED_IN: 'Check in first.',
  NOT_AN_EMPLOYEE: 'This login is not linked to an employee record.',
  ALREADY_INSPECTED: 'This delivery was already inspected.',
  ALREADY_DECIDED: 'This request was already decided.',
  NOT_ISSUABLE: 'Only requested or approved requests can be issued.',
  BAD_QUANTITY: 'Check the quantity.',
  NOT_QUOTED: 'This request has no quote to respond to yet.',
  NAME_REQUIRED: 'Enter your name.',
  BAD_PHONE: 'Enter a valid 10-digit mobile number.',
  VISIT_IN_PAST: 'Pick a visit time in the future.',
  NOT_ALLOWED: 'You do not have permission to do that.',
};

/** Turn a Postgres / PostgREST error into something a person can act on. */
export function friendly(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return 'Something went wrong. Try again.';
  const msg = error.message || '';
  if (FRIENDLY[msg]) return FRIENDLY[msg];
  if (error.code === '42501' || /permission denied|row-level security/i.test(msg)) return FRIENDLY.NOT_ALLOWED!;
  if (error.code === '23505') return 'That already exists.';
  return msg || 'Something went wrong. Try again.';
}

export const ok = (message?: string, id?: string): ActionResult => ({ ok: true, message, id });
export const fail = (error: string): ActionResult => ({ ok: false, error });
export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};
export const numOf = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (v == null) return null;
  const n = Number(v.replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
