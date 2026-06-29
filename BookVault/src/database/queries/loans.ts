import { getDB, generateId } from '../db';
import type { Loan, LoanWithDetails } from '../../types';

function isOverdue(loan: { dateLent: string; expectedReturn: string | null; dateReturned: string | null }): boolean {
  if (loan.dateReturned) return false;
  const now = new Date();
  if (loan.expectedReturn) {
    return new Date(loan.expectedReturn) < now;
  }
  const ninetyDaysAfterLent = new Date(loan.dateLent);
  ninetyDaysAfterLent.setDate(ninetyDaysAfterLent.getDate() + 90);
  return ninetyDaysAfterLent < now;
}

const LOAN_DETAIL_QUERY = `
  SELECT
    l.id, l.copy_id, l.contact_id, l.date_lent, l.expected_return,
    l.date_returned, l.notes,
    c.id AS c_id, c.name AS c_name, c.phone AS c_phone, c.email AS c_email, c.notes AS c_notes,
    br.id AS br_id, br.title, br.authors, br.sort_author, br.isbn13,
    br.publisher, br.published_year, br.page_count, br.synopsis, br.cover_image,
    br.dewey_decimal, br.community_rating, br.community_rating_count, br.community_rating_fetched,
    bc.id AS bc_id, bc.record_id, bc.copy_number, bc.division_id, bc.personal_rating, bc.notes AS bc_notes, bc.date_added
  FROM loans l
  JOIN contacts c ON l.contact_id = c.id
  JOIN book_copies bc ON l.copy_id = bc.id
  JOIN book_records br ON bc.record_id = br.id
`;

function rowToDetail(row: any): LoanWithDetails {
  const loan: Loan = {
    id: row.id,
    copyId: row.copy_id,
    contactId: row.contact_id,
    dateLent: row.date_lent,
    expectedReturn: row.expected_return,
    dateReturned: row.date_returned,
    notes: row.notes,
  };
  return {
    ...loan,
    contact: { id: row.c_id, name: row.c_name, phone: row.c_phone, email: row.c_email, notes: row.c_notes, color: row.c_color ?? null },
    bookRecord: {
      id: row.br_id,
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
    },
    bookCopy: {
      id: row.bc_id,
      recordId: row.record_id,
      copyNumber: row.copy_number,
      divisionId: row.division_id,
      personalRating: row.personal_rating,
      notes: row.bc_notes,
      dateAdded: row.date_added,
    },
    isOverdue: isOverdue(loan),
  };
}

export function getActiveLoans(): LoanWithDetails[] {
  const db = getDB();
  const rows = db.getAllSync(
    `${LOAN_DETAIL_QUERY} WHERE l.date_returned IS NULL ORDER BY l.date_lent ASC`
  ) as any[];
  return rows.map(rowToDetail);
}

export function getLoanHistoryForCopy(copyId: string): LoanWithDetails[] {
  const db = getDB();
  const rows = db.getAllSync(
    `${LOAN_DETAIL_QUERY} WHERE l.copy_id = ? ORDER BY l.date_lent DESC`,
    [copyId]
  ) as any[];
  return rows.map(rowToDetail);
}

export function getLoanHistoryForContact(contactId: string): LoanWithDetails[] {
  const db = getDB();
  const rows = db.getAllSync(
    `${LOAN_DETAIL_QUERY} WHERE l.contact_id = ? ORDER BY l.date_lent DESC`,
    [contactId]
  ) as any[];
  return rows.map(rowToDetail);
}

export function createLoan(
  copyId: string,
  contactId: string,
  dateLent: string,
  expectedReturn: string | null,
  notes: string | null
): string {
  const db = getDB();
  const id = generateId();
  db.runSync(
    'INSERT INTO loans (id, copy_id, contact_id, date_lent, expected_return, notes) VALUES (?, ?, ?, ?, ?, ?)',
    [id, copyId, contactId, dateLent, expectedReturn, notes]
  );
  return id;
}

export function returnLoan(loanId: string, dateReturned: string) {
  const db = getDB();
  db.runSync('UPDATE loans SET date_returned = ? WHERE id = ?', [dateReturned, loanId]);
}

export function getAllReturnedLoans(): LoanWithDetails[] {
  const db = getDB();
  const rows = db.getAllSync(
    `${LOAN_DETAIL_QUERY} WHERE l.date_returned IS NOT NULL ORDER BY l.date_returned DESC`
  ) as any[];
  return rows.map(rowToDetail);
}

export function getOverdueCount(): number {
  const db = getDB();
  const rows = db.getAllSync(
    `SELECT date_lent, expected_return FROM loans WHERE date_returned IS NULL`
  ) as any[];
  return rows.filter((r) =>
    isOverdue({ dateLent: r.date_lent, expectedReturn: r.expected_return, dateReturned: null })
  ).length;
}
