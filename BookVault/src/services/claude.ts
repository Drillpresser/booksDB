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

// Calls the Anthropic messages API and forces Claude to respond via a named tool.
// Returns the tool input object T, or null on any failure.
async function callClaudeWithTool<T>(
  userPrompt: string,
  toolName: string,
  toolDescription: string,
  inputSchema: object,
): Promise<T | null> {
  try {
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
        tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const toolUse = (data.content as any[])?.find(
      (b) => b.type === 'tool_use' && b.name === toolName,
    );
    return (toolUse?.input as T) ?? null;
  } catch {
    return null;
  }
}

interface BookData {
  title: string;
  authors: string[];
  publisher: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  synopsis: string | null;
  deweyDecimal: string | null;
}

const BOOK_DATA_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Book title' },
    authors: { type: 'array', items: { type: 'string' }, description: 'Author full names' },
    publisher: { type: ['string', 'null'], description: 'Publisher name or null' },
    publishedYear: { type: ['integer', 'null'], description: 'Year of publication or null' },
    pageCount: { type: ['integer', 'null'], description: 'Number of pages or null' },
    synopsis: { type: ['string', 'null'], description: 'Brief description or null' },
    deweyDecimal: { type: ['string', 'null'], description: 'Dewey Decimal number or null' },
  },
  required: ['title', 'authors', 'publisher', 'publishedYear', 'pageCount', 'synopsis', 'deweyDecimal'],
} as const;

// Last-resort ISBN lookup using Claude's training knowledge.
// Only called when both OL and Google fail. Results may be inaccurate for
// obscure books or titles published after Claude's training cutoff.
export async function lookupBookWithClaude(
  isbn: string,
  partialData?: Partial<BookLookupResult>,
): Promise<BookLookupResult | null> {
  const contextClause = partialData && Object.keys(partialData).length
    ? `I have partial data from other sources: ${JSON.stringify(partialData)}. Use this as a starting point and fill in any null or missing fields.`
    : '';

  const prompt = `${contextClause}
Based on your training knowledge, provide bibliographic information for the book with ISBN ${isbn}.
Only fill fields you are confident about — use null for anything uncertain.
Do not invent data for fields you do not recognise.`;

  const result = await callClaudeWithTool<BookData>(
    prompt.trim(),
    'submit_book_data',
    'Submit bibliographic data for the requested book. Use null for unknown fields.',
    BOOK_DATA_SCHEMA,
  );

  if (!result || !result.title) return null;

  return {
    title: result.title,
    authors: result.authors ?? [],
    publisher: result.publisher ?? null,
    publishedYear: result.publishedYear ?? null,
    pageCount: result.pageCount ?? null,
    synopsis: result.synopsis ?? null,
    coverUrl: null,
    deweyDecimal: result.deweyDecimal ?? null,
    communityRating: null,
    communityRatingCount: null,
  };
}

interface ClassificationResult {
  mainClassId: string | null;
  sectionId: string | null;
  divisionId: string | null;
}

const EMPTY_CLASSIFICATION: ClassificationResult = {
  mainClassId: null,
  sectionId: null,
  divisionId: null,
};

export async function suggestClassification(
  book: { title: string; authors: string[]; synopsis: string | null; deweyDecimal: string | null },
  taxonomy: { mainClasses: MainClass[]; sections: Section[]; divisions: Division[] },
): Promise<ClassificationResult> {
  const taxSummary = taxonomy.mainClasses
    .map((m) => {
      const secs = taxonomy.sections
        .filter((s) => s.mainClassId === m.id)
        .map((s) => {
          const divs = taxonomy.divisions
            .filter((d) => d.sectionId === s.id)
            .map((d) => `      - ${d.code}: ${d.name} (id:${d.id})`)
            .join('\n');
          return `    Section ${s.code}: ${s.name} (id:${s.id})\n${divs}`;
        })
        .join('\n');
      return `  Main Class ${m.code}: ${m.name} (id:${m.id})\n${secs}`;
    })
    .join('\n');

  const prompt = `You are classifying a book in a personal library system.

Book: "${book.title}" by ${book.authors.join(', ')}
${book.synopsis ? `Synopsis: ${book.synopsis.slice(0, 300)}` : ''}
${book.deweyDecimal ? `Dewey Decimal: ${book.deweyDecimal}` : ''}

Available taxonomy (use the exact id strings shown):
${taxSummary}

Choose the most specific matching division. Use null for any level that does not apply.`;

  const result = await callClaudeWithTool<ClassificationResult>(
    prompt,
    'suggest_classification',
    'Suggest a classification for the book from the provided taxonomy using the exact id strings.',
    {
      type: 'object',
      properties: {
        mainClassId: { type: ['string', 'null'], description: 'id of the chosen main class, or null' },
        sectionId: { type: ['string', 'null'], description: 'id of the chosen section, or null' },
        divisionId: { type: ['string', 'null'], description: 'id of the chosen division, or null' },
      },
      required: ['mainClassId', 'sectionId', 'divisionId'],
    },
  );

  return result ?? EMPTY_CLASSIFICATION;
}

export async function fillMissingFields(
  existing: Partial<BookLookupResult>,
): Promise<Partial<BookLookupResult> | null> {
  const missing = (Object.keys(existing) as Array<keyof BookLookupResult>).filter((k) => {
    const v = existing[k];
    return v === null || v === undefined || v === '';
  });

  if (!missing.length) return null;

  const prompt = `I have a book with this partial information:
${JSON.stringify(existing, null, 2)}

Fill in only the following missing fields using your training knowledge: ${missing.join(', ')}.
Use null for any field you cannot determine with confidence.`;

  // Build a schema that only requests the missing fields
  const properties: Record<string, object> = {};
  const FIELD_SCHEMAS: Record<string, object> = {
    title: { type: 'string' },
    authors: { type: 'array', items: { type: 'string' } },
    publisher: { type: ['string', 'null'] },
    publishedYear: { type: ['integer', 'null'] },
    pageCount: { type: ['integer', 'null'] },
    synopsis: { type: ['string', 'null'] },
    coverUrl: { type: ['string', 'null'] },
    deweyDecimal: { type: ['string', 'null'] },
    communityRating: { type: ['number', 'null'] },
    communityRatingCount: { type: ['integer', 'null'] },
  };
  for (const field of missing) {
    if (FIELD_SCHEMAS[field]) properties[field] = FIELD_SCHEMAS[field];
  }

  if (!Object.keys(properties).length) return null;

  const result = await callClaudeWithTool<Partial<BookLookupResult>>(
    prompt,
    'fill_fields',
    'Fill in the requested missing book fields. Use null for any field you cannot determine.',
    { type: 'object', properties },
  );

  return result;
}
