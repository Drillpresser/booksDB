export interface MainClass {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface Section {
  id: string;
  code: string;
  name: string;
  mainClassId: string;
  sortOrder: number;
}

export interface Division {
  id: string;
  code: string;
  name: string;
  sectionId: string;
  sortOrder: number;
}

export interface BookRecord {
  id: string;
  title: string;
  authors: string[];
  sortAuthor: string;
  isbn13: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string | null;
  coverImage: string | null;
  deweyDecimal: string | null;
  communityRating: number | null;
  communityRatingCount: number | null;
  communityRatingFetched: string | null;
}

export interface BookCopy {
  id: string;
  recordId: string;
  copyNumber: number;
  divisionId: string | null;
  personalRating: number | null;
  notes: string | null;
  dateAdded: string;
}

export interface BookCopyWithDetails extends BookCopy {
  record: BookRecord;
  division: Division | null;
  section: Section | null;
  mainClass: MainClass | null;
  isOnLoan: boolean;
  currentLoan: LoanWithContact | null;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

export interface Loan {
  id: string;
  copyId: string;
  contactId: string;
  dateLent: string;
  expectedReturn: string | null;
  dateReturned: string | null;
  notes: string | null;
}

export interface LoanWithContact extends Loan {
  contact: Contact;
}

export interface LoanWithDetails extends Loan {
  contact: Contact;
  bookRecord: BookRecord;
  bookCopy: BookCopy;
  isOverdue: boolean;
}

export type SortMode = 'classification' | 'author' | 'title' | 'dateAdded';

export interface BookLookupResult {
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string | null;
  coverUrl: string | null;
  deweyDecimal: string | null;
  communityRating: number | null;
  communityRatingCount: number | null;
  isbn13?: string | null;
}
