import { Empty } from '@/components/ui/bits';

export function NoProject() {
  return <Empty emoji="✨" title="Add a project first" href="/console/projects/new" cta="Start a project">This page fills in once you have a project. It takes about two minutes.</Empty>;
}
