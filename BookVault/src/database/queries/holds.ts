import { getDB, generateId } from '../db';
import type { Contact } from '../../types';

export type Hold = {
  id: string;
  recordId: string;
  contactId: string;
  requestedAt: string;
  notes: string | null;
};

export type HoldWithContact = Hold & { contact: Contact };

export function getHoldsForRecord(recordId: string): HoldWithContact[] {
  const db = getDB();
  const rows = db.getAllSync(`
    SELECT h.id, h.record_id, h.contact_id, h.requested_at, h.notes,
           c.id as c_id, c.name, c.phone, c.email, c.notes as c_notes, c.color
    FROM holds h
    JOIN contacts c ON c.id = h.contact_id
    WHERE h.record_id = ?
    ORDER BY h.requested_at ASC
  `, [recordId]) as any[];
  return rows.map((r) => ({
    id: r.id,
    recordId: r.record_id,
    contactId: r.contact_id,
    requestedAt: r.requested_at,
    notes: r.notes,
    contact: { id: r.c_id, name: r.name, phone: r.phone, email: r.email, notes: r.c_notes, color: r.color },
  }));
}

export function addHold(recordId: string, contactId: string, notes: string | null = null): string {
  const db = getDB();
  const id = generateId();
  db.runSync(
    'INSERT INTO holds (id, record_id, contact_id, requested_at, notes) VALUES (?, ?, ?, ?, ?)',
    [id, recordId, contactId, new Date().toISOString(), notes]
  );
  return id;
}

export function removeHold(holdId: string): void {
  getDB().runSync('DELETE FROM holds WHERE id = ?', [holdId]);
}

export function isContactOnHold(recordId: string, contactId: string): boolean {
  const row = getDB().getFirstSync(
    'SELECT id FROM holds WHERE record_id = ? AND contact_id = ?',
    [recordId, contactId]
  );
  return !!row;
}
