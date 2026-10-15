import { createServerClient } from '@supabase/ssr';
import { createClient as createJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server client that acts as the signed-in user (row-level security applies). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the middleware refreshes the session instead.
        }
      },
    },
  });
}

/** Shown when a server feature needs the secret key and the host has not been given it. */
export const SERVICE_KEY_MISSING = 'This needs the server key: add SUPABASE_SERVICE_ROLE_KEY in the hosting settings (Vercel → Settings → Environment Variables) and redeploy.';
export const hasServiceKey = () => !!process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Bypasses row-level security. Server-only: payments, webhooks, admin lookups after an explicit permission check. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createJsClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;
