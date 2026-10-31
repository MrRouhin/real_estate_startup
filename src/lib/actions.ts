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
  BILL_EXCEEDS_PROGRESS: 'This bill would take your total billing past the verified progress of this work. Update progress first, or bill a smaller amount.',
  NOT_YOUR_WORK: 'That work package is not assigned to your company.',
  NOT_YOUR_CREW: 'That worker is not in your crew.',
  NOT_A_CONTRACTOR: 'This login is not linked to a contractor company yet.',
  NOT_A_PARTNER: 'This login is not linked to a company yet.',
  BAD_AMOUNT: 'Enter an amount above zero.',
  BAD_TRANSITION: 'That step is not possible from the bill’s current status.',
  PAYMENT_REF_REQUIRED: 'Enter the payment reference (UTR or cheque number).',
  PROMISE_DATE_REQUIRED: 'Pick the date you will deliver by.',
  DATE_IN_PAST: 'Pick a date from today onwards.',
  ALREADY_ANSWERED: 'This order was already answered.',
  NOT_ACCEPTED: 'Accept the order first.',
  PO_MISMATCH: 'That order belongs to another vendor.',
  OVERLAPS_EXISTING_LEAVE: 'You already have leave on some of those days.',
  DATE_OUT_OF_RANGE: 'Attendance can be marked only for the last 7 days.',
  AGE_NOT_ALLOWED: 'Site workers must be at least 18 years old.',
  BAD_IFSC: 'Enter a valid IFSC code, like HDFC0001234.',
  BAD_UPI: 'Enter a valid UPI ID, like name@okhdfc.',
  BAD_GSTIN: 'Enter a valid 15-character GSTIN.',
  BAD_PAN: 'Enter a valid PAN, like ABCDE1234F.',
  ALREADY_LINKED: 'This person already has a workspace.',
  NOT_ISSUED: 'This letter has not been issued yet.',
  BAD_STATUS: 'That status is not allowed here.',
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
