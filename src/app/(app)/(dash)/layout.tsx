import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { pageForUser } from '@/lib/pages';
import { siteUrl } from '@/lib/site';
import { DashHeader } from '@/components/dash/DashHeader';
import { AppFrame } from '@/components/dash/ui';
import { edition } from '@/edition';
import { SkyBand } from '@/components/art/SkyBand';

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const row = await pageForUser(user.id);
  if (!row) redirect('/onboarding');
  return (
    <AppFrame>
      <DashHeader username={row.username} email={user.email} site={siteUrl()} extra={edition.nav} />
      <SkyBand className="sb-strip" src="/art/rooftop.webp" small="/art/rooftop-sm.webp" position="50% 80%" />
      <main className="mx-auto w-full max-w-260 px-5 pb-24 pt-2 sm:px-8">{children}</main>
      {edition.id === 'self-hosted' && (
        <p className="pb-8 text-center text-[13px] text-muted">
          Running your own Tessy instance.
        </p>
      )}
    </AppFrame>
  );
}
