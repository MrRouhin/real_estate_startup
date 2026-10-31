import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LettersInbox } from '@/components/portal/letters';
import { LiveRefresh } from '@/components/live-refresh';

export const metadata = { title: 'Letters' };

export default async function ContractorLetters() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  return (
    <>
      <LiveRefresh tables={['letters']} every={30000} />
      <PageHeader emoji="📬" title="Letters from the developer" sub={<>Work orders, compliance notices and other formal letters. Acknowledge each one so both sides have a record.</>} />
      <LettersInbox supabase={supabase} recipientType="contractor" recipientId={cid!} />
    </>
  );
}
