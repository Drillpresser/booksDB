import type { BookLookupResult } from '../types';

export async function lookupByIsbn(isbn: string): Promise<BookLookupResult | null> {
  const clean = isbn.replace(/[^0-9X]/gi, '');
  const result = await lookupOpenLibrary(clean);
  if (result) return result;
  return lookupGoogleBooks(clean);
}

async function lookupOpenLibrary(isbn: string): Promise<BookLookupResult | null> {
  try {
    const bibRes = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!bibRes.ok) return null;
    const bib = await bibRes.json();

    const title: string = bib.title ?? '';
    const publisher: string | null = bib.publishers?.[0] ?? null;
    const publishedYear: number | null = bib.publish_date
      ? parseInt(bib.publish_date.slice(-4), 10) || null
      : null;
    const pageCount: number | null = bib.number_of_pages ?? null;
    const deweyDecimal: string | null = bib.dewey_decimal_class?.[0] ?? null;

    let authors: string[] = [];
    if (bib.authors?.length) {
      authors = await Promise.all(
        bib.authors.map(async (a: { key: string }) => {
          try {
            const aRes = await fetch(`https://openlibrary.org${a.key}.json`);
            const aData = await aRes.json();
            return aData.name ?? '';
          } catch {
            return '';
          }
        })
      );
      authors = authors.filter(Boolean);
    }

    let synopsis: string | null = null;
    let coverUrl: string | null = null;

    const workKey = bib.works?.[0]?.key;
    if (workKey) {
      try {
        const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
        const work = await workRes.json();
        synopsis =
          typeof work.description === 'string'
            ? work.description
            : work.description?.value ?? null;
        const coverId = work.covers?.[0];
        if (coverId) {
          coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
        }
      } catch {
        // ignore
      }
    }

    if (!coverUrl && bib.covers?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/id/${bib.covers[0]}-L.jpg`;
    }

    if (!title) return null;

    return { title, authors, publisher, publishedYear, pageCount, synopsis, coverUrl, deweyDecimal, communityRating: null, communityRatingCount: null };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<BookLookupResult | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const info = item.volumeInfo;
    const title: string = info.title ?? '';
    const authors: string[] = info.authors ?? [];
    const publisher: string | null = info.publisher ?? null;
    const publishedYear: number | null = info.publishedDate
      ? parseInt(info.publishedDate.slice(0, 4), 10) || null
      : null;
    const pageCount: number | null = info.pageCount ?? null;
    const synopsis: string | null = info.description ?? null;
    const coverUrl: string | null =
      info.imageLinks?.extraLarge ??
      info.imageLinks?.large ??
      info.imageLinks?.thumbnail?.replace('http://', 'https://') ??
      null;
    const communityRating: number | null = info.averageRating ?? null;
    const communityRatingCount: number | null = info.ratingsCount ?? null;

    const cats: string[] = info.categories ?? [];
    const deweyDecimal: string | null = cats.length > 0 ? null : null;

    if (!title) return null;

    return { title, authors, publisher, publishedYear, pageCount, synopsis, coverUrl, deweyDecimal, communityRating, communityRatingCount };
  } catch {
    return null;
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
