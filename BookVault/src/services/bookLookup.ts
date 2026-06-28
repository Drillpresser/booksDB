import { getRecordByIsbn } from '../database/queries/books';
import type { BookLookupResult } from '../types';

const GOOGLE_BOOKS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY ?? '';
const NON_LATIN = /[^ -ɏ]/;

async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Converts ISBN-10 to ISBN-13 by prepending 978 and recomputing the check digit.
// Passthrough for ISBN-13 and anything else (unrecognised length).
function normalizeIsbn(raw: string): string {
  const clean = raw.replace(/[^0-9X]/gi, '').toUpperCase();
  if (clean.length === 13) return clean;
  if (clean.length !== 10) return clean;
  const base = '978' + clean.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  return base + ((10 - (sum % 10)) % 10);
}

type LangCode = 'en' | 'non-en' | null;

// Internal type that carries language detection alongside the public result shape.
type ResultWithLang = BookLookupResult & { _lang: LangCode };

// Merges two language-annotated ISBN lookup results.
// OL preferred for deweyDecimal/coverUrl; Google preferred for synopsis/ratings.
// If one source explicitly identifies the book as non-English, the other is preferred.
function mergeResults(
  ol: ResultWithLang | null,
  google: ResultWithLang | null,
): BookLookupResult | null {
  if (!ol && !google) return null;
  if (!ol) return toPublic(google!);
  if (!google) return toPublic(ol);

  const olOk = ol._lang !== 'non-en';
  const googleOk = google._lang !== 'non-en';
  if (!olOk && googleOk) return toPublic(google);
  if (!googleOk && olOk) return toPublic(ol);

  const lang: LangCode =
    ol._lang === 'en' || google._lang === 'en' ? 'en' : ol._lang ?? google._lang;

  return {
    title: ol.title || google.title,
    authors: ol.authors.length ? ol.authors : google.authors,
    publisher: ol.publisher ?? google.publisher,
    publishedYear: ol.publishedYear ?? google.publishedYear,
    pageCount: ol.pageCount ?? google.pageCount,
    synopsis: google.synopsis ?? ol.synopsis,
    coverUrl: ol.coverUrl ?? google.coverUrl,
    deweyDecimal: ol.deweyDecimal ?? null,
    communityRating: google.communityRating ?? null,
    communityRatingCount: google.communityRatingCount ?? null,
    isbn13: ol.isbn13 ?? google.isbn13,
    language: lang,
  };
}

function toPublic(r: ResultWithLang): BookLookupResult {
  const { _lang, ...rest } = r;
  return { ...rest, language: _lang };
}

// Merges two search results that are already assumed to be English.
// Identical field priorities as mergeResults but without language bookkeeping.
function mergeSearchResults(a: BookLookupResult, b: BookLookupResult): BookLookupResult {
  return {
    title: a.title || b.title,
    authors: a.authors.length ? a.authors : b.authors,
    publisher: a.publisher ?? b.publisher,
    publishedYear: a.publishedYear ?? b.publishedYear,
    pageCount: a.pageCount ?? b.pageCount,
    synopsis: b.synopsis ?? a.synopsis,
    coverUrl: a.coverUrl ?? b.coverUrl,
    deweyDecimal: a.deweyDecimal ?? null,
    communityRating: b.communityRating ?? null,
    communityRatingCount: b.communityRatingCount ?? null,
    isbn13: a.isbn13 ?? b.isbn13,
  };
}

export async function lookupByIsbn(isbn: string): Promise<BookLookupResult | null> {
  const clean = normalizeIsbn(isbn);

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

  const [olResult, googleResult] = await Promise.all([
    lookupOpenLibrary(clean),
    lookupGoogleBooks(clean),
  ]);
  return mergeResults(olResult, googleResult);
}

async function lookupOpenLibrary(isbn: string): Promise<ResultWithLang | null> {
  try {
    const bibRes = await fetchWithTimeout(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!bibRes.ok) return null;
    const bib = await bibRes.json();

    const title: string = bib.title ?? '';
    if (!title) return null;

    // Detect edition language from the languages array (keys like "/languages/eng")
    let _lang: LangCode = null;
    if (Array.isArray(bib.languages)) {
      _lang = bib.languages.some((l: { key: string }) => l.key === '/languages/eng')
        ? 'en'
        : 'non-en';
    }

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
          }),
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
          : (work.description?.value ?? null);
      const coverId: number | undefined = work.covers?.[0];
      if (coverId) coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
    }
    if (!coverUrl && bib.covers?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/id/${bib.covers[0]}-L.jpg`;
    }

    return {
      title,
      authors,
      publisher,
      publishedYear,
      pageCount,
      synopsis,
      coverUrl,
      deweyDecimal,
      communityRating: null,
      communityRatingCount: null,
      isbn13: isbn,
      _lang,
    };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<ResultWithLang | null> {
  try {
    const key = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
    // No langRestrict for ISBN lookup — we detect language from volumeInfo.language instead.
    const res = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${key}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const info = item.volumeInfo;
    const title: string = info.title ?? '';
    if (!title) return null;

    const rawLang = info.language as string | undefined;
    const _lang: LangCode = rawLang
      ? rawLang === 'en' || rawLang.startsWith('en-')
        ? 'en'
        : 'non-en'
      : null;

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
      _lang,
    };
  } catch {
    return null;
  }
}

export async function searchBooks(query: string): Promise<BookLookupResult[]> {
  if (!query.trim()) return [];

  const [olResults, googleResults] = await Promise.all([
    searchOpenLibrary(query),
    searchGoogleBooks(query),
  ]);

  const byIsbn = new Map<string, BookLookupResult>();
  const noIsbn: BookLookupResult[] = [];

  for (const r of olResults) {
    if (r.isbn13) byIsbn.set(r.isbn13, r);
    else noIsbn.push(r);
  }
  for (const r of googleResults) {
    if (r.isbn13) {
      const existing = byIsbn.get(r.isbn13);
      byIsbn.set(r.isbn13, existing ? mergeSearchResults(existing, r) : r);
    } else {
      noIsbn.push(r);
    }
  }

  return [...byIsbn.values(), ...noIsbn].slice(0, 30);
}

async function searchOpenLibrary(query: string): Promise<BookLookupResult[]> {
  try {
    const q = encodeURIComponent(query.trim());
    // language=eng filters works to those with an English edition.
    const res = await fetchWithTimeout(
      `https://openlibrary.org/search.json?q=${q}&language=eng&fields=key,title,author_name,cover_i,first_publish_year,isbn,language&limit=30`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.docs ?? []) as any[])
      .filter((d) => {
        if (!d.title) return false;
        if (NON_LATIN.test(d.title)) return false;
        // Secondary check: if OL returns language data and it excludes English, drop it.
        if (Array.isArray(d.language) && !d.language.includes('eng')) return false;
        return true;
      })
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
        // Prefer ISBN-13 (13 chars) over ISBN-10 from the editions array
        isbn13:
          (d.isbn as string[] | undefined)?.find((s) => s.length === 13) ??
          (d.isbn as string[] | undefined)?.[0] ??
          null,
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
      `https://www.googleapis.com/books/v1/volumes?q=${q}&langRestrict=en&maxResults=20${key}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.items ?? []) as any[])
      .filter((item) => item.volumeInfo?.title && !NON_LATIN.test(item.volumeInfo.title))
      .map((item) => {
        const info = item.volumeInfo;
        const identifiers: Array<{ type: string; identifier: string }> =
          info.industryIdentifiers ?? [];
        const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')?.identifier ?? null;
        return {
          title: info.title as string,
          authors: (info.authors as string[]) ?? [],
          publisher: (info.publisher as string) ?? null,
          publishedYear: info.publishedDate
            ? parseInt(info.publishedDate.slice(0, 4), 10) || null
            : null,
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
