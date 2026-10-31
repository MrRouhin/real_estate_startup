import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { CompanyProfileForm } from '@/components/portal/company-profile';

export const metadata = { title: 'Company profile' };

export default async function ContractorProfile() {
  const { supabase } = await requirePartner('contractor');
  const { data: cid } = await supabase.rpc('my_contractor_id');
  const { data: c } = await supabase.from('contractors').select('*').eq('id', cid!).single();
  return (
    <>
      <PageHeader emoji="🏢" title="Company profile" sub={<>The developer uses these details for work orders, bills and payments.</>} />
      <CompanyProfileForm c={c!} kind="contractor" />
    </>
  );
}
