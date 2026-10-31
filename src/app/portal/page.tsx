import { redirect } from 'next/navigation';
import { homeFor, requireUser } from '@/lib/auth';

// The old shared site portal; each role now has its own workspace.
export default async function Portal() {
  const { profile } = await requireUser('/portal');
  redirect(homeFor(profile.role));
}
