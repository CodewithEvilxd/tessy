import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Where local data (SQLite + uploads) lives.
 * Development uses ~/.tessy so database writes don't trigger the dev server's file watcher (reload loops).
 * Production uses ./.data unless TESSY_DATA_DIR or DATABASE_URL (Turso) is set.
 */
const defaultDevDir = () => path.join(os.homedir(), '.tessy');

export const DATA_DIR = path.resolve(
  /*turbopackIgnore: true*/ process.env.TESSY_DATA_DIR || (process.env.NODE_ENV === 'production' ? '.data' : defaultDevDir()),
);
export const LOCAL_DB_URL = `file:${path.join(DATA_DIR, 'tessy.db')}`;
