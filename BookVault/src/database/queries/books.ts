import * as FileSystem from 'expo-file-system';
import { getDB, generateId } from '../db';
import type { BookRecord, BookCopy, BookCopyWithDetails, LoanWithContact } from '../../types';

const COVERS_DIR = FileSystem.documentDirectory + 'covers/';

async function ensureCoversDir() {
  const info = await FileSystem.getInfoAsync(COVERS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(COVERS_DIR, { intermediates: true });
  }
}

export async function saveCoverImage(bookRecordId: string, imageUrl: string): Promise<string | null> {
  try {
    const httpsUrl = imageUrl.replace(/^http:\/\//i, 'https://');
    await ensureCoversDir();
    const localUri = COVERS_DIR + bookRecordId + '.jpg';
    const result = await FileSystem.downloadAsync(httpsUrl, localUri);
    return result.status === 200 ? result.uri : null;
  } catch {
    return null;
  }
}

function rowToRecord(row: any): BookRecord {
  return {
    id: row.id,
    title: row.title,
    authors: JSON.parse(row.authors ?? '[]'),
    sortAuthor: row.sort_author,
    isbn13: row.isbn13,
    publisher: row.publisher,
    publishedYear: row.published_year,
    pageCount: row.page_count,
    synopsis: row.synopsis,
    coverImage: row.cover_image,
    deweyDecimal: row.dewey_decimal,
    communityRating: row.community_rating,
    communityRatingCount: row.community_rating_count,
    communityRatingFetched: row.community_rating_fetched,
  };
}

function rowToCopy(row: any): BookCopy {
  return {
    id: row.id,
    recordId: row.record_id,
    copyNumber: row.copy_number,
    divisionId: row.division_id,
    personalRating: row.personal_rating,
    notes: row.notes,
    dateAdded: row.date_added,
  };
}

const COPY_DETAIL_QUERY = `
  SELECT
    bc.id, bc.record_id, bc.copy_number, bc.division_id,
    bc.personal_rating, bc.notes, bc.date_added,
    br.title, br.authors, br.sort_author, br.isbn13,
    br.publisher, br.published_year, br.page_count,
    br.synopsis, br.cover_image, br.dewey_decimal,
    br.community_rating, br.community_rating_count, br.community_rating_fetched,
    d.id AS d_id, d.code AS d_code, d.name AS d_name, d.section_id AS d_section_id, d.sort_order AS d_sort,
    s.id AS s_id, s.code AS s_code, s.name AS s_name, s.main_class_id AS s_main_class_id, s.sort_order AS s_sort,
    m.id AS m_id, m.code AS m_code, m.name AS m_name, m.sort_order AS m_sort,
    (SELECT COUNT(*) FROM loans l WHERE l.copy_id = bc.id AND l.date_returned IS NULL) AS on_loan_count
  FROM book_copies bc
  JOIN book_records br ON bc.record_id = br.id
  LEFT JOIN divisions d ON bc.division_id = d.id
  LEFT JOIN sections s ON d.section_id = s.id
  LEFT JOIN main_classes m ON s.main_class_id = m.id
`;

function rowToDetail(row: any): BookCopyWithDetails {
  const record = rowToRecord(row);
  record.id = row.record_id;

  const copy: BookCopy = {
    id: row.id,
    recordId: row.record_id,
    copyNumber: row.copy_number,
    divisionId: row.division_id,
    personalRating: row.personal_rating,
    notes: row.notes,
    dateAdded: row.date_added,
  };

  return {
    ...copy,
    record,
    division: row.d_id ? { id: row.d_id, code: row.d_code, name: row.d_name, sectionId: row.d_section_id, sortOrder: row.d_sort } : null,
    section: row.s_id ? { id: row.s_id, code: row.s_code, name: row.s_name, mainClassId: row.s_main_class_id, sortOrder: row.s_sort } : null,
    mainClass: row.m_id ? { id: row.m_id, code: row.m_code, name: row.m_name, sortOrder: row.m_sort } : null,
    isOnLoan: row.on_loan_count > 0,
    currentLoan: null,
  };
}

export function getAllCopies(sortBy: 'author' | 'title' | 'dateAdded' | 'classification' = 'classification'): BookCopyWithDetails[] {
  const db = getDB();
  const orderClause = {
    author: 'br.sort_author, br.title',
    title: 'br.title, br.sort_author',
    dateAdded: 'bc.date_added DESC',
    classification: 'm.sort_order, m.code, s.sort_order, s.code, d.sort_order, d.code, br.sort_author, br.title',
  }[sortBy];

  const rows = db.getAllSync(`${COPY_DETAIL_QUERY} ORDER BY ${orderClause}`) as any[];
  return rows.map(rowToDetail);
}

export function getCopiesByDivision(divisionId: string): BookCopyWithDetails[] {
  const db = getDB();
  const rows = db.getAllSync(
    `${COPY_DETAIL_QUERY} WHERE bc.division_id = ? ORDER BY br.sort_author, br.title`,
    [divisionId]
  ) as any[];
  return rows.map(rowToDetail);
}

export function getCopyById(copyId: string): BookCopyWithDetails | null {
  const db = getDB();
  const row = db.getFirstSync(`${COPY_DETAIL_QUERY} WHERE bc.id = ?`, [copyId]) as any;
  if (!row) return null;
  const detail = rowToDetail(row);
  if (detail.isOnLoan) {
    detail.currentLoan = getCurrentLoanForCopy(copyId);
  }
  return detail;
}

export function getRecordByIsbn(isbn13: string): BookRecord | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM book_records WHERE isbn13 = ?', [isbn13]) as any;
  return row ? rowToRecord(row) : null;
}

export function getCopyCountForRecord(recordId: string): number {
  const db = getDB();
  const row = db.getFirstSync(
    'SELECT COUNT(*) as count FROM book_copies WHERE record_id = ?',
    [recordId]
  ) as any;
  return row?.count ?? 0;
}

export function insertBookRecord(data: Omit<BookRecord, 'id'>, presetId?: string): string {
  const db = getDB();
  const id = presetId ?? generateId();
  db.runSync(
    `INSERT INTO book_records
      (id, title, authors, sort_author, isbn13, publisher, published_year, page_count,
       synopsis, cover_image, dewey_decimal, community_rating, community_rating_count, community_rating_fetched)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.title,
      JSON.stringify(data.authors),
      data.sortAuthor,
      data.isbn13,
      data.publisher,
      data.publishedYear,
      data.pageCount,
      data.synopsis,
      data.coverImage,
      data.deweyDecimal,
      data.communityRating,
      data.communityRatingCount,
      data.communityRatingFetched,
    ]
  );
  return id;
}

export function insertBookCopy(data: Omit<BookCopy, 'id'>): string {
  const db = getDB();
  const id = generateId();
  db.runSync(
    `INSERT INTO book_copies (id, record_id, copy_number, division_id, personal_rating, notes, date_added)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, data.recordId, data.copyNumber, data.divisionId, data.personalRating, data.notes, data.dateAdded]
  );
  return id;
}

export function updateBookRecord(id: string, data: Partial<Omit<BookRecord, 'id'>>) {
  const db = getDB();
  if (data.authors !== undefined) {
    db.runSync('UPDATE book_records SET authors = ? WHERE id = ?', [JSON.stringify(data.authors), id]);
  }
  const fields: [string, any][] = [
    ['title', data.title],
    ['sort_author', data.sortAuthor],
    ['isbn13', data.isbn13],
    ['publisher', data.publisher],
    ['published_year', data.publishedYear],
    ['page_count', data.pageCount],
    ['synopsis', data.synopsis],
    ['cover_image', data.coverImage],
    ['dewey_decimal', data.deweyDecimal],
    ['community_rating', data.communityRating],
    ['community_rating_count', data.communityRatingCount],
    ['community_rating_fetched', data.communityRatingFetched],
  ];
  for (const [col, val] of fields) {
    if (val !== undefined) {
      db.runSync(`UPDATE book_records SET ${col} = ? WHERE id = ?`, [val, id]);
    }
  }
}

export function updateBookCopy(id: string, data: Partial<Pick<BookCopy, 'divisionId' | 'personalRating' | 'notes'>>) {
  const db = getDB();
  if (data.divisionId !== undefined) {
    db.runSync('UPDATE book_copies SET division_id = ? WHERE id = ?', [data.divisionId, id]);
  }
  if (data.personalRating !== undefined) {
    db.runSync('UPDATE book_copies SET personal_rating = ? WHERE id = ?', [data.personalRating, id]);
  }
  if (data.notes !== undefined) {
    db.runSync('UPDATE book_copies SET notes = ? WHERE id = ?', [data.notes, id]);
  }
}

export function deleteBookCopy(copyId: string) {
  const db = getDB();
  const copy = db.getFirstSync('SELECT record_id FROM book_copies WHERE id = ?', [copyId]) as any;
  db.runSync('DELETE FROM book_copies WHERE id = ?', [copyId]);
  if (copy) {
    const remaining = db.getFirstSync(
      'SELECT COUNT(*) as count FROM book_copies WHERE record_id = ?',
      [copy.record_id]
    ) as any;
    if (remaining?.count === 0) {
      db.runSync('DELETE FROM book_records WHERE id = ?', [copy.record_id]);
    }
  }
}

export function getRecordCopySummary(recordId: string): { total: number; available: number } {
  const db = getDB();
  const rows = db.getAllSync(
    `SELECT bc.id,
            (SELECT COUNT(*) FROM loans l WHERE l.copy_id = bc.id AND l.date_returned IS NULL) AS on_loan
     FROM book_copies bc WHERE bc.record_id = ?`,
    [recordId]
  ) as any[];
  return {
    total: rows.length,
    available: rows.filter((r) => r.on_loan === 0).length,
  };
}

export function searchCopies(query: string): BookCopyWithDetails[] {
  const db = getDB();
  const like = `%${query}%`;
  const rows = db.getAllSync(
    `${COPY_DETAIL_QUERY}
     WHERE br.title LIKE ? OR br.authors LIKE ? OR br.isbn13 LIKE ?
     ORDER BY br.sort_author, br.title`,
    [like, like, like]
  ) as any[];
  return rows.map(rowToDetail);
}

function getCurrentLoanForCopy(copyId: string): LoanWithContact | null {
  const db = getDB();
  const row = db.getFirstSync(
    `SELECT l.*, c.id AS c_id, c.name AS c_name, c.phone AS c_phone, c.email AS c_email, c.notes AS c_notes
     FROM loans l JOIN contacts c ON l.contact_id = c.id
     WHERE l.copy_id = ? AND l.date_returned IS NULL
     LIMIT 1`,
    [copyId]
  ) as any;
  if (!row) return null;
  const now = new Date();
  const isOverdue = row.expected_return
    ? new Date(row.expected_return) < now
    : new Date(new Date(row.date_lent).getTime() + 90 * 86400000) < now;
  return {
    id: row.id,
    copyId: row.copy_id,
    contactId: row.contact_id,
    dateLent: row.date_lent,
    expectedReturn: row.expected_return,
    dateReturned: row.date_returned,
    notes: row.notes,
    contact: { id: row.c_id, name: row.c_name, phone: row.c_phone, email: row.c_email, notes: row.c_notes, color: row.c_color ?? null },
    isOverdue,
  };
}
