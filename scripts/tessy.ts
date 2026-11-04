#!/usr/bin/env tsx
/**
 * Tessy CLI: manage your page from the terminal (or let a script/agent do it).
 *
 *   export TESSY_URL=https://your-tessy.example   # default http://localhost:3000
 *   export TESSY_API_KEY=tessy_…                  # create one on the Agents page
 *
 *   npm run tessy -- get
 *   npm run tessy -- add <link | email | owner/repo | "a note"> [--size s|w|t|l] [--color mint] [--after <id>]
 *   npm run tessy -- theme [--preset lavender] [--font modern] [--background aurora] [--tiles glass] [--layout list]
 *   npm run tessy -- profile [--name "…"] [--bio "…"] [--location "…"]
 *   npm run tessy -- remove <id>
 *   npm run tessy -- publish
 *   npm run tessy -- export [file]   |   import <file>
 *   npm run tessy -- validate <file> |   schema
 */
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { Page } from '../src/lib/schema';
import { exportFile } from '../src/lib/portable';

const [cmd, ...rest] = process.argv.slice(2);
const flags: Record<string, string> = {};
const args: string[] = [];
for (let i = 0; i < rest.length; i++) rest[i].startsWith('--') ? (flags[rest[i].slice(2)] = rest[++i]) : args.push(rest[i]);

const BASE = (process.env.TESSY_URL || 'http://localhost:3000').replace(/\/$/, '');
const KEY = process.env.TESSY_API_KEY;

async function api(method: string, p: string, body?: unknown) {
  if (!KEY) die('Set TESSY_API_KEY (create a key on the Agents page).');
  const res = await fetch(BASE + p, { method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) die(data.error ? `${data.error}${data.issues ? '\n  ' + data.issues.join('\n  ') : ''}` : `HTTP ${res.status}`);
  return data;
}
function die(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }
const ok = (msg: string) => console.log(`✓ ${msg}`);

async function editTheme(patch: Record<string, unknown>) {
  const s = await api('GET', '/api/v1/page');
  const page = { ...s.page, theme: { ...s.page.theme, ...patch, background: { ...s.page.theme.background, ...(patch.background as object) } } };
  await api('PUT', '/api/v1/page', { page, baseVersion: s.version });
}

switch (cmd) {
  case 'get': {
    const s = await api('GET', '/api/v1/page');
    console.log(`${s.url}  (version ${s.version}${s.hasUnpublishedChanges ? ', unpublished changes' : ''})\n`);
    for (const t of s.page.tiles) {
      const what = t.url ?? (t.handle ? `${t.platform} @${t.handle}` : t.repo ?? t.text ?? t.src ?? '');
      console.log(`${t.id.padEnd(11)} ${t.type.padEnd(8)} ${t.type === 'heading' ? '' : t.size}  ${what}`);
    }
    break;
  }
  case 'add': {
    if (!args[0]) die('usage: add <link | email | owner/repo | "a note">');
    const r = await api('POST', '/api/v1/page/tiles', { input: args.join(' '), size: flags.size, color: flags.color, after: flags.after });
    ok(`added ${r.tile.type} tile ${r.tile.id}`);
    break;
  }
  case 'remove': {
    await api('DELETE', `/api/v1/page/tiles/${encodeURIComponent(args[0] ?? '')}`);
    ok(`removed ${args[0]}`);
    break;
  }
  case 'theme': {
    await editTheme({
      ...(flags.preset && { preset: flags.preset }), ...(flags.accent && { accent: flags.accent }), ...(flags.font && { font: flags.font }),
      ...(flags.radius && { radius: flags.radius }), ...(flags.layout && { layout: flags.layout }), ...(flags.align && { align: flags.align }),
      ...(flags.tiles && { tileStyle: flags.tiles }), ...(flags.effect && { effect: flags.effect }),
      ...(flags.background && { background: { style: flags.background } }),
    });
    ok('theme updated (draft)');
    break;
  }
  case 'profile': {
    const s = await api('GET', '/api/v1/page');
    const profile = { ...s.page.profile, ...(flags.name && { name: flags.name }), ...(flags.bio !== undefined && { bio: flags.bio }), ...(flags.location && { location: flags.location }) };
    await api('PUT', '/api/v1/page', { page: { ...s.page, profile }, baseVersion: s.version });
    ok('profile updated (draft)');
    break;
  }
  case 'publish': {
    ok(`live at ${(await api('POST', '/api/v1/page/publish')).url}`);
    break;
  }
  case 'export': {
    const s = await api('GET', '/api/v1/page');
    const json = JSON.stringify(exportFile(s.page, BASE), null, 2) + '\n';
    if (args[0]) { fs.writeFileSync(args[0], json); ok(`wrote ${args[0]}`); } else process.stdout.write(json);
    break;
  }
  case 'import': {
    if (!args[0]) die('usage: import <file>');
    const page = Page.parse(JSON.parse(fs.readFileSync(args[0], 'utf8')));
    const s = await api('GET', '/api/v1/page');
    await api('PUT', '/api/v1/page', { page, baseVersion: s.version });
    ok(`imported ${args[0]} into your draft. Run "publish" to make it live.`);
    break;
  }
  case 'validate': {
    if (!args[0]) die('usage: validate <file>');
    const r = Page.safeParse(JSON.parse(fs.readFileSync(args[0], 'utf8')));
    if (r.success) { ok(`${args[0]} is valid (${r.data.tiles.length} tiles)`); break; }
    for (const i of r.error.issues) console.error(`✗ ${i.path.join('.') || '(root)'}: ${i.message}`);
    process.exit(1);
  }
  case 'schema': {
    const schema = JSON.stringify({ title: 'Tessy page', $id: 'https://tessy.page/schema/page.schema.json', ...z.toJSONSchema(Page, { io: 'input', target: 'draft-2020-12' }) }, null, 2) + '\n';
    for (const f of ['public/schema/page.schema.json']) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, schema); }
    ok('wrote public/schema/page.schema.json');
    break;
  }
  default:
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)?.[1].replace(/^ \* ?/gm, '').trim());
}
