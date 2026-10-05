import { getDB } from '../db';

export function getPreference(key: string, fallback: string): string {
  const row = getDB().getFirstSync('SELECT value FROM preferences WHERE key = ?', [key]) as any;
  return row?.value ?? fallback;
}

export function setPreference(key: string, value: string): void {
  getDB().runSync('INSERT INTO preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

// Library sort is set from both the Library tab and Settings — keep one list.
export type LibrarySortMode = 'author' | 'title' | 'mainClass' | 'section' | 'classification';

export const LIBRARY_SORT_OPTIONS: { mode: LibrarySortMode; label: string }[] = [
  { mode: 'author', label: 'Author' },
  { mode: 'title', label: 'Title' },
  { mode: 'mainClass', label: 'Class' },
  { mode: 'section', label: 'Section' },
  { mode: 'classification', label: 'Division' },
];

export function getLibrarySort(): LibrarySortMode {
  const stored = getPreference('library_sort', 'author');
  return LIBRARY_SORT_OPTIONS.find((o) => o.mode === stored)?.mode ?? 'author';
}

export function setLibrarySort(mode: LibrarySortMode): void {
  setPreference('library_sort', mode);
}
