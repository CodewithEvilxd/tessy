// The public site's top bar and footer links. The hosted platform's edition can replace these.
import type { SiteLinks } from '@/edition/types';

export const GITHUB = 'https://github.com/codewithevilxd/tessy';

export const DEFAULT_SITE: SiteLinks = {
  nav: [
    { name: 'Looks', link: '/#looks' },
    { name: 'How it works', link: '/#how' },
    { name: 'Pricing', link: '/#pricing' },
    { name: 'Questions', link: '/#faq' },
  ],
  footer: [
    {
      title: 'Tessy',
      links: [
        ['Looks', '/#looks'],
        ['How it works', '/#how'],
        ['Pricing', '/#pricing'],
        ['Questions', '/#faq'],
      ],
    },
    {
      title: 'Open source',
      links: [
        ['GitHub', GITHUB],
        ['Run it yourself', `${GITHUB}#self-hosting`],
        ['For AI agents', `${GITHUB}/blob/main/docs/ai-agents.md`],
      ],
    },
    {
      title: 'Your page',
      links: [
        ['Make a page', '/signup'],
        ['Log in', '/login'],
        ['Go Pro', '/signup?plan=pro'],
      ],
    },
  ],
  tagline: 'One link for everything you make.',
};
