import { PageHeader } from '@/components/ui/bits';
import { requireStaff } from '@/lib/auth';
import { NewProjectWizard } from './wizard';

export const metadata = { title: 'New project' };

export default async function NewProject({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  await requireStaff();
  return (
    <>
      <PageHeader emoji="✨" title="New project" sub="Four short steps. Inventory, prices and the payment plan are generated for you; adjust anything afterwards." />
      <NewProjectWizard welcome={welcome === '1'} />
    </>
  );
}
