// Converts ISBN-10 to ISBN-13 by prepending 978 and recomputing the check digit,
// stripping hyphens/spaces. Passthrough for anything else (unrecognised length).
// Every ISBN is stored and keyed in this form so the same book always matches.
export function normalizeIsbn(raw: string): string {
  const clean = raw.replace(/[^0-9X]/gi, '').toUpperCase();
  if (clean.length === 13) return clean;
  if (clean.length !== 10) return clean;
  const base = '978' + clean.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i], 10) * (i % 2 === 0 ? 1 : 3);
  return base + ((10 - (sum % 10)) % 10);
}

// True for a well-formed Bookland EAN (978/979 prefix, valid check digit) — i.e.
// a normalized ISBN-13 rather than some other barcode or a typo.
export function isValidIsbn13(isbn: string): boolean {
  if (!/^97[89]\d{10}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}
