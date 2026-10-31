import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LettersInbox } from '@/components/portal/letters';
import { LiveRefresh } from '@/components/live-refresh';

export const metadata = { title: 'Letters' };

export default async function VendorLetters() {
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  return (
    <>
      <LiveRefresh tables={['letters']} every={30000} />
      <PageHeader emoji="📬" title="Letters from the developer" />
      <LettersInbox supabase={supabase} recipientType="vendor" recipientId={vid!} />
    </>
  );
}
