import { getDB, generateId } from '../db';
import type { Contact } from '../../types';

function rowToContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
  };
}

export function getAllContacts(): Contact[] {
  const db = getDB();
  const rows = db.getAllSync('SELECT * FROM contacts ORDER BY name') as any[];
  return rows.map(rowToContact);
}

export function getContactById(id: string): Contact | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM contacts WHERE id = ?', [id]) as any;
  return row ? rowToContact(row) : null;
}

export function createContact(data: Omit<Contact, 'id'>): string {
  const db = getDB();
  const id = generateId();
  db.runSync(
    'INSERT INTO contacts (id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)',
    [id, data.name, data.phone, data.email, data.notes]
  );
  return id;
}

export function updateContact(id: string, data: Partial<Omit<Contact, 'id'>>) {
  const db = getDB();
  const fields: [string, any][] = [
    ['name', data.name],
    ['phone', data.phone],
    ['email', data.email],
    ['notes', data.notes],
  ];
  for (const [col, val] of fields) {
    if (val !== undefined) {
      db.runSync(`UPDATE contacts SET ${col} = ? WHERE id = ?`, [val, id]);
    }
  }
}

export function deleteContact(id: string) {
  const db = getDB();
  db.runSync('DELETE FROM contacts WHERE id = ?', [id]);
}

export function getActiveLoansCountForContact(contactId: string): number {
  const db = getDB();
  const row = db.getFirstSync(
    'SELECT COUNT(*) as count FROM loans WHERE contact_id = ? AND date_returned IS NULL',
    [contactId]
  ) as any;
  return row?.count ?? 0;
}
