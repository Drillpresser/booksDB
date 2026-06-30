import { getDB } from '../db';

export function getPreference(key: string, fallback: string): string {
  const row = getDB().getFirstSync('SELECT value FROM preferences WHERE key = ?', [key]) as any;
  return row?.value ?? fallback;
}

export function setPreference(key: string, value: string): void {
  getDB().runSync('INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}
