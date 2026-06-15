import { getDB, generateId } from '../db';
import type { Shelf } from '../../types';

function rowToShelf(row: any): Shelf {
  return { id: row.id, name: row.name, description: row.description ?? null, sortOrder: row.sort_order };
}

export function getAllShelves(): Shelf[] {
  return (getDB().getAllSync('SELECT * FROM shelves ORDER BY sort_order, name') as any[]).map(rowToShelf);
}

export function getShelfById(id: string): Shelf | null {
  const row = getDB().getFirstSync('SELECT * FROM shelves WHERE id = ?', [id]);
  return row ? rowToShelf(row) : null;
}

export function createShelf(name: string, description: string | null = null): Shelf {
  const db = getDB();
  const id = generateId();
  const countRow = db.getFirstSync('SELECT COUNT(*) as c FROM shelves') as any;
  const sortOrder = countRow?.c ?? 0;
  db.runSync(
    'INSERT INTO shelves (id, name, description, sort_order) VALUES (?, ?, ?, ?)',
    [id, name.trim(), description, sortOrder]
  );
  return { id, name: name.trim(), description, sortOrder };
}

export function updateShelf(id: string, name: string, description: string | null = null): void {
  getDB().runSync('UPDATE shelves SET name = ?, description = ? WHERE id = ?', [name.trim(), description, id]);
}

export function deleteShelf(id: string): void {
  getDB().runSync('DELETE FROM shelves WHERE id = ?', [id]);
}

export function getBookCountForShelf(shelfId: string): number {
  const row = getDB().getFirstSync(
    'SELECT COUNT(*) as count FROM book_copies WHERE shelf_id = ?',
    [shelfId]
  ) as any;
  return row?.count ?? 0;
}

export function setBookCopyShelf(copyId: string, shelfId: string | null): void {
  getDB().runSync('UPDATE book_copies SET shelf_id = ? WHERE id = ?', [shelfId, copyId]);
}
