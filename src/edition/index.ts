// Self-hosted edition (open source). The hosted platform replaces this file.
import 'server-only';
import type { Edition } from './types';

const signup = (process.env.TESSY_SIGNUP as Edition['signup']) || 'first-user';
const root = (process.env.TESSY_ROOT as Edition['root']) || 'marketing';

export const edition: Edition = {
  id: 'self-hosted',
  signup,
  root,
  // Your server, your rules: everything the open-source edition has is unlocked.
  entitlements: async () => ({ plan: 'self-hosted', removeBranding: true, analyticsDays: 365, analyticsExport: true, premium: true, customDomain: true }),
};
