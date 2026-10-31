import { requirePartner } from '@/lib/auth';
import { PageHeader } from '@/components/ui/bits';
import { CompanyProfileForm } from '@/components/portal/company-profile';

export const metadata = { title: 'Company profile' };

export default async function VendorProfile() {
  const { supabase } = await requirePartner('vendor');
  const { data: vid } = await supabase.rpc('my_vendor_id');
  const { data: v } = await supabase.from('vendors').select('*').eq('id', vid!).single();
  return (
    <>
      <PageHeader emoji="🏢" title="Company profile" sub={<>Used on purchase orders and for payments.</>} />
      <CompanyProfileForm c={v!} kind="vendor" />
    </>
  );
}
