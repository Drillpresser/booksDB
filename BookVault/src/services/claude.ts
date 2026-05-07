import * as SecureStore from 'expo-secure-store';
import type { BookLookupResult } from '../types';
import type { MainClass, Section, Division } from '../types';

const API_KEY_STORE = 'anthropic_api_key';
const MODEL = 'claude-haiku-4-5-20251001';

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(API_KEY_STORE);
}

export async function saveApiKey(key: string) {
  await SecureStore.setItemAsync(API_KEY_STORE, key);
}

export async function deleteApiKey() {
  await SecureStore.deleteItemAsync(API_KEY_STORE);
}

async function callClaude(prompt: string): Promise<string | null> {
  const apiKey = await getApiKey();
  if (!apiKey) return null;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.content?.[0]?.text ?? null;
}

export async function lookupBookWithClaude(
  isbn: string,
  partialData?: Partial<BookLookupResult>
): Promise<BookLookupResult | null> {
  const context = partialData
    ? `I have partial data: ${JSON.stringify(partialData)}.`
    : '';

  const prompt = `${context} Please look up the book with ISBN ${isbn} and return all available information.
Reply ONLY with a JSON object (no markdown, no explanation) with these exact fields:
{
  "title": "string",
  "authors": ["string"],
  "publisher": "string or null",
  "publishedYear": number or null,
  "pageCount": number or null,
  "synopsis": "string or null",
  "deweyDecimal": "string or null"
}`;

  const text = await callClaude(prompt);
  if (!text) return null;

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return {
      title: parsed.title ?? '',
      authors: parsed.authors ?? [],
      publisher: parsed.publisher ?? null,
      publishedYear: parsed.publishedYear ?? null,
      pageCount: parsed.pageCount ?? null,
      synopsis: parsed.synopsis ?? null,
      coverUrl: null,
      deweyDecimal: parsed.deweyDecimal ?? null,
      communityRating: null,
      communityRatingCount: null,
    };
  } catch {
    return null;
  }
}

export async function suggestClassification(
  book: { title: string; authors: string[]; synopsis: string | null; deweyDecimal: string | null },
  taxonomy: { mainClasses: MainClass[]; sections: Section[]; divisions: Division[] }
): Promise<{ mainClassId: string | null; sectionId: string | null; divisionId: string | null }> {
  const taxSummary = taxonomy.mainClasses.map((m) => {
    const secs = taxonomy.sections.filter((s) => s.mainClassId === m.id).map((s) => {
      const divs = taxonomy.divisions.filter((d) => d.sectionId === s.id).map((d) => `      - ${d.code}: ${d.name} (id:${d.id})`).join('\n');
      return `    Section ${s.code}: ${s.name} (id:${s.id})\n${divs}`;
    }).join('\n');
    return `  Main Class ${m.code}: ${m.name} (id:${m.id})\n${secs}`;
  }).join('\n');

  const prompt = `You are classifying a book in a personal library system.

Book: "${book.title}" by ${book.authors.join(', ')}
${book.synopsis ? `Synopsis: ${book.synopsis.slice(0, 300)}` : ''}
${book.deweyDecimal ? `Dewey Decimal: ${book.deweyDecimal}` : ''}

Available taxonomy:
${taxSummary}

Reply ONLY with a JSON object (no markdown, no explanation):
{
  "mainClassId": "the id string or null",
  "sectionId": "the id string or null",
  "divisionId": "the id string or null"
}`;

  const text = await callClaude(prompt);
  if (!text) return { mainClassId: null, sectionId: null, divisionId: null };

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { mainClassId: null, sectionId: null, divisionId: null };
  }
}

export async function fillMissingFields(
  existing: Partial<BookLookupResult>
): Promise<Partial<BookLookupResult> | null> {
  const missing = Object.entries(existing)
    .filter(([, v]) => v === null || v === undefined || v === '')
    .map(([k]) => k);

  if (!missing.length) return null;

  const prompt = `I have a book with this partial information:
${JSON.stringify(existing, null, 2)}

Please fill in the missing fields: ${missing.join(', ')}.
Reply ONLY with a JSON object containing only the missing fields (no markdown, no explanation).`;

  const text = await callClaude(prompt);
  if (!text) return null;

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}
