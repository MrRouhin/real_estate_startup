import crypto from 'node:crypto';
import { createClient as createJsClient } from '@supabase/supabase-js';
import { createClient, SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase/server';
import type { Database } from './database.types';

export const PAYMENTS_MODE = process.env.PAYMENTS_MODE === 'razorpay' ? 'razorpay' : 'simulated';

/** Signed-in user's client: cookie session (web) or `Authorization: Bearer` (mobile app). */
export async function userClient(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '');
  if (token) {
    return createJsClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false },
    });
  }
  return createClient();
}

export function hmacMatches(payload: string, signature: string, secret: string) {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(signature || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export const toPaise = (rupees: number | string) => Math.round(Number(rupees) * 100);

/** Create an order with Razorpay's Orders API (no SDK needed). */
export async function createRazorpayOrder(amountRupees: number, receipt: string, notes: Record<string, string>) {
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay keys are not configured');
  const r = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
    body: JSON.stringify({ amount: toPaise(amountRupees), currency: 'INR', receipt: receipt.slice(0, 40), notes }),
  });
  if (!r.ok) throw new Error('Razorpay order failed: ' + (await r.text()).slice(0, 200));
  return (await r.json()) as { id: string };
}
