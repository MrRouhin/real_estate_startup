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
  const staffOnly = next?.startsWith('/console'), partnerOnly = next?.startsWith('/portal');
  const allowed = next && next.startsWith('/') && !next.startsWith('//')
    && (!staffOnly || home === '/console') && (!partnerOnly || home === '/portal');
  return NextResponse.redirect(new URL(allowed ? next! : home, url));
}
