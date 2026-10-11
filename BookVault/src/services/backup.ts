import * as FileSystem from 'expo-file-system/legacy';
import { getDB } from '../database/db';
import { importClassifications } from '../database/queries/classifications';
import { toDateKey } from '../lib/dates';
import type { SeedMainClass } from '../data/rffcClassifications';

// A full, restorable copy of the on-device library: books, copies (with their
// classification), patrons, loans and waitlists. Rows keep their ids, so
// restoring the same file twice adds nothing the second time.
//
// Classification is stored by code path (main › section › division) rather than
// row id, because each device generates its own taxonomy ids.
//
// Covers saved on the device are not included (they would make the file huge);
// covers that are web URLs are kept.

const FORMAT = 'bookhoarder-backup';
const VERSION = 1;

type Row = Record<string, any>;

type Backup = {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  taxonomy: SeedMainClass[];
  bookRecords: Row[];
  bookCopies: Row[]; // with division_path: [mainCode, sectionCode, divisionCode] | null
  contacts: Row[];
  loans: Row[];
  holds: Row[];
};

export type RestoreSummary = {
  books: number;
  copies: number;
  contacts: number;
  loans: number;
  holds: number;
};

function exportTaxonomy(): SeedMainClass[] {
  const db = getDB();
  const mcs = db.getAllSync('SELECT * FROM main_classes ORDER BY sort_order, code') as Row[];
  const secs = db.getAllSync('SELECT * FROM sections ORDER BY sort_order, code') as Row[];
  const divs = db.getAllSync('SELECT * FROM divisions ORDER BY sort_order, code') as Row[];
  return mcs.map((m) => ({
    code: m.code,
    name: m.name,
    sections: secs.filter((s) => s.main_class_id === m.id).map((s) => ({
      code: s.code,
      name: s.name,
      divisions: divs.filter((d) => d.section_id === s.id).map((d) => ({ code: d.code, name: d.name })),
    })),
  }));
}

function buildBackup(): Backup {
  const db = getDB();
  const records = (db.getAllSync('SELECT * FROM book_records') as Row[]).map((r) => ({
    ...r,
    cover_image: r.cover_image && /^https?:\/\//i.test(r.cover_image) ? r.cover_image : null,
  }));
  const copies = db.getAllSync(`
    SELECT bc.*, m.code AS m_code, s.code AS s_code, d.code AS d_code
    FROM book_copies bc
    LEFT JOIN divisions d ON bc.division_id = d.id
    LEFT JOIN sections s ON d.section_id = s.id
    LEFT JOIN main_classes m ON s.main_class_id = m.id
  `) as Row[];
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    taxonomy: exportTaxonomy(),
    bookRecords: records,
    bookCopies: copies.map(({ m_code, s_code, d_code, division_id: _d, ...c }) => ({
      ...c,
      division_path: d_code ? [m_code, s_code, d_code] : null,
    })),
    contacts: db.getAllSync('SELECT * FROM contacts') as Row[],
    loans: db.getAllSync('SELECT * FROM loans') as Row[],
    holds: db.getAllSync('SELECT * FROM holds') as Row[],
  };
}

/** Writes a backup file and returns its file:// URI. */
export async function writeBackupFile(): Promise<string> {
  const uri = `${FileSystem.cacheDirectory}BookHoarder-backup-${toDateKey(new Date())}.json`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(buildBackup()));
  return uri;
}

function findDivisionId(path: unknown): string | null {
  if (!Array.isArray(path) || path.length !== 3) return null;
  const row = getDB().getFirstSync(
    `SELECT d.id FROM divisions d
     JOIN sections s ON d.section_id = s.id
     JOIN main_classes m ON s.main_class_id = m.id
     WHERE m.code = ? AND s.code = ? AND d.code = ?`,
    path.map(String),
  ) as Row | null;
  return row?.id ?? null;
}

function exists(table: string, id: string): boolean {
  return !!getDB().getFirstSync(`SELECT 1 FROM ${table} WHERE id = ?`, [id]);
}

/** Restores a backup file's contents into the library, merging with what is already there. */
export async function restoreBackupFile(uri: string): Promise<RestoreSummary> {
  let data: Backup;
  try {
    data = JSON.parse(await FileSystem.readAsStringAsync(uri));
  } catch {
    throw new Error('That file isn\'t a readable BookHoarder backup.');
  }
  if (data?.format !== FORMAT || typeof data.version !== 'number') {
    throw new Error('That file isn\'t a BookHoarder backup.');
  }
  if (data.version > VERSION) {
    throw new Error('This backup was made by a newer version of BookHoarder. Update the app and try again.');
  }

  // Missing classes are added first (in their own transaction); existing ones are kept.
  if (Array.isArray(data.taxonomy) && data.taxonomy.length) importClassifications(data.taxonomy);

  const db = getDB();
  const summary: RestoreSummary = { books: 0, copies: 0, contacts: 0, loans: 0, holds: 0 };
  // Backup record id → local record id (differs when this device already has the ISBN)
  const recordIdMap = new Map<string, string>();

  db.withTransactionSync(() => {
    for (const r of data.bookRecords ?? []) {
      if (exists('book_records', r.id)) {
        recordIdMap.set(r.id, r.id);
        continue;
      }
      const sameIsbn = r.isbn13
        ? db.getFirstSync('SELECT id FROM book_records WHERE isbn13 = ?', [r.isbn13]) as Row | null
        : null;
      if (sameIsbn) {
        recordIdMap.set(r.id, sameIsbn.id);
        continue;
      }
      db.runSync(
        `INSERT INTO book_records
          (id, title, authors, sort_author, isbn13, publisher, published_year, page_count,
           synopsis, cover_image, dewey_decimal, community_rating, community_rating_count, community_rating_fetched)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.title ?? 'Untitled', r.authors ?? '[]', r.sort_author ?? '', r.isbn13 ?? null,
         r.publisher ?? null, r.published_year ?? null, r.page_count ?? null, r.synopsis ?? null,
         r.cover_image ?? null, r.dewey_decimal ?? null, r.community_rating ?? null,
         r.community_rating_count ?? null, r.community_rating_fetched ?? null],
      );
      recordIdMap.set(r.id, r.id);
      summary.books++;
    }

    for (const c of data.bookCopies ?? []) {
      const recordId = recordIdMap.get(c.record_id);
      if (!recordId || exists('book_copies', c.id)) continue;
      const max = db.getFirstSync(
        'SELECT MAX(copy_number) AS max FROM book_copies WHERE record_id = ?', [recordId],
      ) as Row | null;
      const taken = db.getFirstSync(
        'SELECT 1 FROM book_copies WHERE record_id = ? AND copy_number = ?', [recordId, c.copy_number],
      );
      db.runSync(
        `INSERT INTO book_copies (id, record_id, copy_number, division_id, suffix, tags, personal_rating, notes, date_added)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, recordId, taken ? (max?.max ?? 0) + 1 : (c.copy_number ?? 1), findDivisionId(c.division_path),
         c.suffix ?? null, c.tags ?? '[]', c.personal_rating ?? null, c.notes ?? null,
         c.date_added ?? new Date().toISOString()],
      );
      summary.copies++;
    }

    for (const p of data.contacts ?? []) {
      if (exists('contacts', p.id)) continue;
      db.runSync(
        'INSERT INTO contacts (id, name, phone, email, notes, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name ?? 'Patron', p.phone ?? null, p.email ?? null, p.notes ?? null, p.color ?? null, p.created_at ?? null],
      );
      summary.contacts++;
    }

    for (const l of data.loans ?? []) {
      if (exists('loans', l.id) || !exists('book_copies', l.copy_id) || !exists('contacts', l.contact_id)) continue;
      db.runSync(
        'INSERT INTO loans (id, copy_id, contact_id, date_lent, expected_return, date_returned, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [l.id, l.copy_id, l.contact_id, l.date_lent, l.expected_return ?? null, l.date_returned ?? null, l.notes ?? null],
      );
      summary.loans++;
    }

    for (const h of data.holds ?? []) {
      const recordId = recordIdMap.get(h.record_id);
      if (!recordId || exists('holds', h.id) || !exists('contacts', h.contact_id)) continue;
      const dup = db.getFirstSync('SELECT 1 FROM holds WHERE record_id = ? AND contact_id = ?', [recordId, h.contact_id]);
      if (dup) continue;
      db.runSync(
        'INSERT INTO holds (id, record_id, contact_id, requested_at, notes) VALUES (?, ?, ?, ?, ?)',
        [h.id, recordId, h.contact_id, h.requested_at, h.notes ?? null],
      );
      summary.holds++;
    }
  });

  return summary;
}
