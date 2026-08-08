import { supabase } from '../lib/supabase';
import type { BookLookupResult } from '../types';

// A shared, ISBN-keyed catalog of book metadata. When a user edits or adds a
// book we upsert its details here; when another user looks up the same ISBN we
// consult this table so they receive the community-curated version rather than
// only the raw external-API data. Last-write-wins, attributed via updated_by.

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

export async function upsertCommunityBook(book: CommunityBookInput): Promise<void> {
  if (!book.isbn13 || !book.title.trim()) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('community_books').upsert(
    {
      isbn13: book.isbn13,
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      published_year: book.publishedYear,
      page_count: book.pageCount,
      synopsis: book.synopsis,
      cover_url: book.coverUrl,
      dewey_decimal: book.deweyDecimal,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'isbn13' },
  );
}
