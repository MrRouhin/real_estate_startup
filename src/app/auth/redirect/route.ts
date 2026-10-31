import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { homeFor } from '@/lib/auth';

// After any sign-in: send the person to `next` if it fits their role, else to their home screen.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(req.url);
  if (!user) return NextResponse.redirect(new URL('/login', url));
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const home = homeFor(profile?.role);
  const next = url.searchParams.get('next');
  // role areas only open for their own role; anything else falls back to the person's home
  const area = ['/console', '/contractor', '/vendor', '/employee', '/portal'].find((a) => next === a || next?.startsWith(a + '/'));
  const allowed = next && next.startsWith('/') && !next.startsWith('//') && (!area || area === home);
  return NextResponse.redirect(new URL(allowed ? next! : home, url));
}
