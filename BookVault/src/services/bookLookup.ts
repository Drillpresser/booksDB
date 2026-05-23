import { getRecordByIsbn } from '../database/queries/books';
import type { BookLookupResult } from '../types';

// Get a free key at console.cloud.google.com → APIs → Books API
const GOOGLE_BOOKS_API_KEY = '';

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupByIsbn(isbn: string): Promise<BookLookupResult | null> {
  const clean = isbn.replace(/[^0-9X]/gi, '');

  const cached = getRecordByIsbn(clean);
  if (cached) {
    return {
      title: cached.title,
      authors: cached.authors,
      publisher: cached.publisher,
      publishedYear: cached.publishedYear,
      pageCount: cached.pageCount,
      synopsis: cached.synopsis,
      coverUrl: null,
      deweyDecimal: cached.deweyDecimal,
      communityRating: cached.communityRating,
      communityRatingCount: cached.communityRatingCount,
      isbn13: clean,
    };
  }

  const result = await lookupOpenLibrary(clean);
  if (result) return result;
  return lookupGoogleBooks(clean);
}

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  try {
    const bibRes = await fetchWithTimeout(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!bibRes.ok) return null;
    const bib = await bibRes.json();

    const title: string = bib.title ?? '';
    if (!title) return null;

    const publisher: string | null = bib.publishers?.[0] ?? null;
    const publishedYear: number | null = bib.publish_date
      ? parseInt(bib.publish_date.slice(-4), 10) || null
      : null;
    const pageCount: number | null = bib.number_of_pages ?? null;
    const deweyDecimal: string | null = bib.dewey_decimal_class?.[0] ?? null;

    const authorsPromise: Promise<string[]> = bib.authors?.length
      ? Promise.all(
          bib.authors.map(async (a: { key: string }) => {
            try {
              const r = await fetchWithTimeout(`https://openlibrary.org${a.key}.json`);
              const d = await r.json();
              return (d.name as string) ?? '';
            } catch {
              return '';
            }
          })
        ).then((names) => names.filter(Boolean))
      : Promise.resolve([]);

    const workKey: string | undefined = bib.works?.[0]?.key;
    const workPromise = workKey
      ? fetchWithTimeout(`https://openlibrary.org${workKey}.json`)
          .then((r) => r.json())
          .catch(() => null)
      : Promise.resolve(null);

    const [authors, work] = await Promise.all([authorsPromise, workPromise]);

    let synopsis: string | null = null;
    let coverUrl: string | null = null;

    if (work) {
      synopsis =
        typeof work.description === 'string'
          ? work.description
          : work.description?.value ?? null;
      const coverId: number | undefined = work.covers?.[0];
      if (coverId) coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }
    if (!coverUrl && bib.covers?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/id/${bib.covers[0]}-L.jpg`;
    }

    return { title, authors, publisher, publishedYear, pageCount, synopsis, coverUrl, deweyDecimal, communityRating: null, communityRatingCount: null, isbn13: isbn };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  try {
    const key = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
    const res = await fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const info = item.volumeInfo;
    const title: string = info.title ?? '';
    if (!title) return null;

    const identifiers: Array<{ type: string; identifier: string }> = info.industryIdentifiers ?? [];
    const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')?.identifier ?? isbn;

    return {
      title,
      authors: info.authors ?? [],
      publisher: info.publisher ?? null,
      publishedYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) || null : null,
      pageCount: info.pageCount ?? null,
      synopsis: info.description ?? null,
      coverUrl:
        info.imageLinks?.extraLarge ??
        info.imageLinks?.large ??
        info.imageLinks?.thumbnail?.replace('http://', 'https://') ??
        null,
      deweyDecimal: null,
      communityRating: info.averageRating ?? null,
      communityRatingCount: info.ratingsCount ?? null,
      isbn13,
    };
  } catch {
    return null;
  }
}

export async function searchBooks(query: string): Promise<BookLookupResult[]> {
  if (!query.trim()) return [];
  const results = await searchOpenLibrary(query);
  if (results.length > 0) return results;
  return searchGoogleBooks(query);
}

async function searchOpenLibrary(query: string): Promise<BookLookupResult[]> {
  try {
    const q = encodeURIComponent(query.trim());
    const res = await fetchWithTimeout(
      `https://openlibrary.org/search.json?q=${q}&fields=key,title,author_name,cover_i,first_publish_year,isbn&limit=20`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.docs ?? []) as any[])
      .filter((d) => d.title)
      .map((d) => ({
        title: d.title as string,
        authors: (d.author_name as string[]) ?? [],
        publisher: null,
        publishedYear: (d.first_publish_year as number) ?? null,
        pageCount: null,
        synopsis: null,
        coverUrl: d.cover_i
          ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
          : null,
        deweyDecimal: null,
        communityRating: null,
        communityRatingCount: null,
        isbn13: (d.isbn as string[])?.[0] ?? null,
      }));
  } catch {
    return [];
  }
}

async function searchGoogleBooks(query: string): Promise<BookLookupResult[]> {
  try {
    const key = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
    const q = encodeURIComponent(query.trim());
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=20${key}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.items ?? []) as any[])
      .filter((item) => item.volumeInfo?.title)
      .map((item) => {
        const info = item.volumeInfo;
        const identifiers: Array<{ type: string; identifier: string }> = info.industryIdentifiers ?? [];
        const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')?.identifier ?? null;
        return {
          title: info.title as string,
          authors: (info.authors as string[]) ?? [],
          publisher: (info.publisher as string) ?? null,
          publishedYear: info.publishedDate ? parseInt(info.publishedDate.slice(0, 4), 10) || null : null,
          pageCount: (info.pageCount as number) ?? null,
          synopsis: (info.description as string) ?? null,
          coverUrl: info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null,
          deweyDecimal: null,
          communityRating: (info.averageRating as number) ?? null,
          communityRatingCount: (info.ratingsCount as number) ?? null,
          isbn13,
        };
      });
  } catch {
    return [];
  }
}

export function deriveSortAuthor(authors: string[]): string {
  if (!authors.length) return '';
  const first = authors[0].trim();
  const parts = first.split(' ');
  if (parts.length === 1) return first;
  const last = parts[parts.length - 1];
  const rest = parts.slice(0, -1).join(' ');
  return `${last}, ${rest}`;
}
