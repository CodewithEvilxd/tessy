// What "/" shows: marketing landing page, or owner's page in personal mode.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { edition } from '@/edition';
import { ownerUsername } from '@/lib/pages';
import UserPage, { generateMetadata as userMetadata } from '@/app/[username]/page';
import { LandingPage } from '@/components/landing/LandingPage';

export async function homeMetadata(): Promise<Metadata> {
  if (edition.root === 'owner-page') {
    const username = await ownerUsername();
    if (username) return userMetadata({ params: Promise.resolve({ username }) });
  }
  return {
    title: 'Tessy · a link in bio with taste',
    description:
      'A link-in-bio page that looks hand-made. Pick a look, add your links, publish. Edit it yourself or let your AI do it.',
    openGraph: {
      title: 'Tessy · a link in bio with taste',
      description:
        'A link-in-bio page that looks hand-made. Pick a look, add your links, publish. Edit it yourself or let your AI do it.',
      siteName: 'Tessy',
    },
  };
}

export async function Home() {
  if (edition.root === 'owner-page') {
    const username = await ownerUsername();
    if (username) return <UserPage params={Promise.resolve({ username })} />;
    redirect('/signup');
  }
  return <LandingPage />;
}
