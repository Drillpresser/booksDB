import { getDB, generateId } from '../db';
import type { Contact } from '../../types';

function rowToContact(row: any): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    color: row.color ?? null,
    createdAt: row.created_at ?? null,
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

export function createContact(data: Omit<Contact, 'id' | 'createdAt'>): string {
  const db = getDB();
  const id = generateId();
  db.runSync(
    'INSERT INTO contacts (id, name, phone, email, notes, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.phone, data.email, data.notes, data.color ?? null, new Date().toISOString()]
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
    ['color', data.color],
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

export interface ContactLoanStatus {
  activeCount: number;
  hasOverdue: boolean;
  hasDueSoon: boolean;
}

export function getContactLoanStatus(contactId: string): ContactLoanStatus {
  const db = getDB();
  const rows = db.getAllSync(
    'SELECT date_lent, expected_return FROM loans WHERE contact_id = ? AND date_returned IS NULL',
    [contactId]
  ) as any[];
  const now = Date.now();
  let hasOverdue = false;
  let hasDueSoon = false;
  for (const r of rows) {
    if (r.expected_return) {
      const due = new Date(r.expected_return).getTime();
      if (due < now) hasOverdue = true;
      else if (due - now < 3 * 86400000) hasDueSoon = true;
    } else {
      const lentMs = new Date(r.date_lent).getTime();
      if (now - lentMs > 90 * 86400000) hasOverdue = true;
    }
  }
  return { activeCount: rows.length, hasOverdue, hasDueSoon };
}
