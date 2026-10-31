import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { LettersInbox } from '@/components/portal/letters';

export const metadata = { title: 'Letters' };

export default async function EmployeeLetters() {
  const { supabase, user } = await requirePartner('employee');
  const { data: me } = await supabase.from('employees').select('id').eq('user_id', user.id).eq('active', true).single();
  return (
    <>
      <PageHeader emoji="📬" title="My letters" sub={<>Appointment letters and notices addressed to you.</>} />
      <LettersInbox supabase={supabase} recipientType="employee" recipientId={me!.id} />
    </>
  );
}
