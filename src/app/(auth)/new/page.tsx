import type { Metadata } from 'next';
import { currentUser } from '@/lib/session';
import { pageForUser } from '@/lib/pages';
import { siteUrl } from '@/lib/site';
import { NewFromFile } from '@/components/auth/NewFromFile';

export const metadata: Metadata = {
  title: 'Make a page from a file · Tessy',
  description: 'Ask any chat (ChatGPT, Claude, Gemini) to write your link-in-bio page as a small JSON file, then load it here.',
  alternates: { canonical: '/new' },
};

/** Load a Tessy page file (written by any chat, or exported from another Tessy). Public: nobody needs an account to preview. */
export default async function NewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser();
  const hasPage = user ? !!(await pageForUser(user.id)) : false;
  const query = new URLSearchParams(Object.entries(await searchParams).flatMap(([k, v]) => (Array.isArray(v) ? v : v === undefined ? [] : [v]).map(x => [k, x] as [string, string]))).toString();
  return <NewFromFile signedIn={!!user} hasPage={hasPage} site={siteUrl()} query={query} />;
}
