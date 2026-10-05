import { supabase } from '../lib/supabase';
import { isValidIsbn13 } from '../lib/isbn';
import type { BookLookupResult } from '../types';

// A shared, ISBN-keyed catalog of book metadata. When another user looks up an
// ISBN we consult this table so they receive the community-curated version
// rather than only the raw external-API data.
//
// The user who first contributes an ISBN owns that entry and edits it directly.
// Anyone else's edits become suggestions the owner approves or rejects
// (see supabase/migrations/20261005000000_community_edit_approval.sql). All
// writes go through RPCs; the table has no direct insert/update policies.

export type CommunityBookInput = {
  isbn13: string;
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string | null;
  coverUrl: string | null;
  deweyDecimal: string | null;
};

export type ContributionResult = 'created' | 'updated' | 'proposed' | 'unchanged' | 'skipped';

// Mirrors the community_books_cover_host constraint: only covers from the public
// catalogs are shared. Anything else (on-device photos, other hosts) is dropped
// so it doesn't make the database reject the whole contribution.
const SHAREABLE_COVER = /^https:\/\/(covers\.openlibrary\.org|books\.google\.com|books\.googleusercontent\.com)\//;

function shareableCover(url: string | null): string | null {
  const https = url?.replace(/^http:\/\//i, 'https://') ?? null;
  return https && SHAREABLE_COVER.test(https) ? https : null;
}

// Fit external-API data inside the community_book_fields_valid limits (e.g. some
// Google descriptions exceed 5000 chars) so it isn't refused outright.
function clampText(s: string | null, max: number): string | null {
  return s === null ? null : s.slice(0, max);
}

function inRange(n: number | null, min: number, max: number): number | null {
  return n !== null && n >= min && n <= max ? n : null;
}

export async function getCommunityBook(isbn13: string): Promise<BookLookupResult | null> {
  if (!isbn13) return null;
  const { data, error } = await supabase
    .from('community_books')
    .select('isbn13, title, authors, publisher, published_year, page_count, synopsis, cover_url, dewey_decimal')
    .eq('isbn13', isbn13)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as any;
  return {
    title: r.title ?? '',
    authors: Array.isArray(r.authors) ? r.authors : JSON.parse(r.authors ?? '[]'),
    publisher: r.publisher ?? null,
    publishedYear: r.published_year ?? null,
    pageCount: r.page_count ?? null,
    synopsis: r.synopsis ?? null,
    coverUrl: r.cover_url ?? null,
    deweyDecimal: r.dewey_decimal ?? null,
    communityRating: null,
    communityRatingCount: null,
    isbn13: r.isbn13,
  };
}

// `propose: false` (adding a book) only ever creates a new entry or updates one
// you own. `propose: true` (an explicit edit) turns changes to someone else's
// entry into a suggestion for them to review.
export async function contributeCommunityBook(
  book: CommunityBookInput,
  { propose }: { propose: boolean },
): Promise<ContributionResult | null> {
  // Only canonical ISBN-13s — a hyphenated or ISBN-10 key would never match a lookup
  if (!isValidIsbn13(book.isbn13) || !book.title.trim()) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.rpc('contribute_community_book', {
    p_isbn13: book.isbn13,
    p_title: book.title.trim().slice(0, 500),
    p_authors: book.authors.slice(0, 20),
    p_publisher: clampText(book.publisher, 200),
    p_published_year: inRange(book.publishedYear, 1000, 2100),
    p_page_count: inRange(book.pageCount, 1, 20000),
    p_synopsis: clampText(book.synopsis, 5000),
    p_cover_url: shareableCover(book.coverUrl),
    p_dewey_decimal: clampText(book.deweyDecimal, 30),
    p_propose: propose,
  });
  if (error) throw error;
  return data as ContributionResult;
}

// ── Suggestions on entries I own ────────────────────────────────────────────

// Keys are community_books column names
export type CommunityEditChanges = Partial<{
  title: string;
  authors: string[];
  publisher: string | null;
  published_year: number | null;
  page_count: number | null;
  synopsis: string | null;
  cover_url: string | null;
  dewey_decimal: string | null;
}>;

export type CommunityEdit = {
  id: string;
  isbn13: string;
  proposedBy: string;
  proposerName: string;
  changes: CommunityEditChanges;
  current: CommunityEditChanges;
  createdAt: string;
};

export async function getPendingEditsForMyBooks(): Promise<CommunityEdit[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from('community_book_edits')
    .select('id, isbn13, proposed_by, changes, created_at, community_books!inner(title, authors, publisher, published_year, page_count, synopsis, cover_url, dewey_decimal, created_by)')
    .eq('status', 'pending')
    .eq('community_books.created_by', session.user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as any[];

  const proposerIds = [...new Set(rows.map((r) => r.proposed_by))];
  const names: Record<string, string> = {};
  if (proposerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', proposerIds);
    ((profiles as any[]) ?? []).forEach((p) => { names[p.id] = p.display_name ?? 'Reader'; });
  }

  return rows.map((r) => {
    const { created_by: _owner, ...current } = r.community_books;
    return {
      id: r.id,
      isbn13: r.isbn13,
      proposedBy: r.proposed_by,
      proposerName: names[r.proposed_by] ?? 'Reader',
      changes: r.changes,
      current,
      createdAt: r.created_at,
    };
  });
}

export async function getPendingEditCount(): Promise<number> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return 0;
  const { count, error } = await supabase
    .from('community_book_edits')
    .select('id, community_books!inner(created_by)', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('community_books.created_by', session.user.id);
  if (error) return 0;
  return count ?? 0;
}

export async function reviewCommunityEdit(editId: string, approve: boolean): Promise<void> {
  const { error } = await supabase.rpc('review_community_edit', { p_edit_id: editId, p_approve: approve });
  if (error) throw error;
}
