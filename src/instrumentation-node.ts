// A fresh self-hosted install (or a new Turso database) just works: migrations run at startup.
import path from 'node:path';
import fs from 'node:fs';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { db } from './db';

const candidates = [
  path.join(process.cwd(), 'src', 'db', 'migrations'),
  path.join(process.cwd(), 'drizzle'),
  path.resolve(__dirname, 'db', 'migrations'),
];

const migrationsFolder = candidates.find(f => fs.existsSync(path.join(f, 'meta', '_journal.json')));

if (migrationsFolder) {
  await migrate(db, { migrationsFolder });
} else {
  console.warn('Migrations folder not found, skipping startup migration.');
}
