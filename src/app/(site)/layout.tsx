import { SiteFooter, SiteHeader } from '@/components/buyer/site-header';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
