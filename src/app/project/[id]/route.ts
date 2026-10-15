import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Notification links point at /project/<id>; send people to the project's page.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('projects').select('slug').eq('id', id).maybeSingle();
  return NextResponse.redirect(new URL(data ? `/projects/${data.slug}` : '/', req.url));
}
