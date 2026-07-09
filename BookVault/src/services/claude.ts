import * as SecureStore from 'expo-secure-store';
import type { BookLookupResult } from '../types';
import type { MainClass, Section, Division } from '../types';
import { getTaxonomyVersion } from '../database/queries/classifications';
import { RFFC_SUFFIXES, RFFC_TAGS } from '../data/rffcClassifications';

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

type SystemBlock = {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral'; ttl?: '1h' };
};

// Calls the Anthropic messages API and forces Claude to respond via a named tool.
// Returns the tool input object T, or null on any failure.
// Optional `system` blocks render before messages in the cache prefix — put
// large stable context there (with cache_control) and volatile text in the
// user message so repeat calls hit the prompt cache.
async function callClaudeWithTool<T>(
  userPrompt: string,
  toolName: string,
  toolDescription: string,
  inputSchema: object,
  system?: SystemBlock[],
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
        ...(system ? { system } : {}),
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
  suffix: string | null;
  tags: string[];
}

const EMPTY_CLASSIFICATION: ClassificationResult = {
  mainClassId: null,
  sectionId: null,
  divisionId: null,
  suffix: null,
  tags: [],
};

// The taxonomy system prompt must be byte-identical across calls or the prompt
// cache misses, so it is serialized once and reused until the hierarchy changes.
let taxonomyPromptCache: { version: number; text: string } | null = null;

function buildTaxonomyPrompt(taxonomy: {
  mainClasses: MainClass[];
  sections: Section[];
  divisions: Division[];
}): string {
  const version = getTaxonomyVersion();
  if (taxonomyPromptCache && taxonomyPromptCache.version === version) {
    return taxonomyPromptCache.text;
  }

  const lines: string[] = [];
  for (const m of taxonomy.mainClasses) {
    lines.push(`${m.code} ${m.name}`);
    for (const s of taxonomy.sections) {
      if (s.mainClassId !== m.id) continue;
      lines.push(`  ${s.code} ${s.name}`);
      for (const d of taxonomy.divisions) {
        if (d.sectionId !== s.id) continue;
        lines.push(`    ${d.code} ${d.name}`);
      }
    }
  }

  const suffixLines = RFFC_SUFFIXES.map((s) => `${s.code} ${s.meaning}`).join('\n');

  const text = `You classify books into a personal library taxonomy. The taxonomy below is a three-level hierarchy; each entry is "code name" and indentation shows nesting.

${lines.join('\n')}

Choose the single most specific entry that fits the book. Prefer a full three-part code (e.g. 500.20.03). Use a two-part or one-part code only when nothing more specific fits. Return null if nothing fits at all.

Additionally, apply the taxonomy's Level 4 rules. Audience and format never change the code — they become a suffix; secondary genres become tags.
- suffix: at most ONE form/audience marker, only when clearly applicable, from exactly:
${suffixLines}
- tags: lowercase words for genuine SECONDARY genre or content only — never the book's own class family (e.g. never tag a Horror book "horror"). Prefer this core vocabulary, extending only when necessary: ${RFFC_TAGS.join(', ')}. Use an empty array when there are none.`;

  taxonomyPromptCache = { version, text };
  return text;
}

// Map the returned code back onto local row ids, deriving parents from the
// hierarchy so a leaf code fills in all three levels.
function resolveCode(
  code: string | null,
  taxonomy: { mainClasses: MainClass[]; sections: Section[]; divisions: Division[] },
): Pick<ClassificationResult, 'mainClassId' | 'sectionId' | 'divisionId'> {
  const trimmed = code?.trim();
  if (!trimmed) return EMPTY_CLASSIFICATION;

  const div = taxonomy.divisions.find((d) => d.code === trimmed);
  if (div) {
    const sec = taxonomy.sections.find((s) => s.id === div.sectionId);
    return { mainClassId: sec?.mainClassId ?? null, sectionId: div.sectionId, divisionId: div.id };
  }
  const sec = taxonomy.sections.find((s) => s.code === trimmed);
  if (sec) {
    return { mainClassId: sec.mainClassId, sectionId: sec.id, divisionId: null };
  }
  const mc = taxonomy.mainClasses.find((m) => m.code === trimmed);
  if (mc) {
    return { mainClassId: mc.id, sectionId: null, divisionId: null };
  }
  return EMPTY_CLASSIFICATION;
}

// Tolerate hyphen/em-dash variants of the en-dash suffixes; drop anything
// that isn't one of the eight RFFC suffixes.
function resolveSuffix(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.trim().replace(/^[-—−]/, '–');
  return RFFC_SUFFIXES.some((s) => s.code === normalized) ? normalized : null;
}

function resolveTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const tags = raw
    .map((t) => String(t).trim().toLowerCase())
    .filter((t) => /^[a-z][a-z-]{1,23}$/.test(t));
  return [...new Set(tags)].slice(0, 5);
}

export async function suggestClassification(
  book: { title: string; authors: string[]; synopsis: string | null; deweyDecimal: string | null },
  taxonomy: { mainClasses: MainClass[]; sections: Section[]; divisions: Division[] },
): Promise<ClassificationResult> {
  // Stable prefix (tool schema + this block) is cached for 1h; only the short
  // book description below is processed fresh on repeat calls.
  const system: SystemBlock[] = [
    {
      type: 'text',
      text: buildTaxonomyPrompt(taxonomy),
      cache_control: { type: 'ephemeral', ttl: '1h' },
    },
  ];

  const prompt = `Book: "${book.title}" by ${book.authors.join(', ')}
${book.synopsis ? `Synopsis: ${book.synopsis.slice(0, 300)}` : ''}
${book.deweyDecimal ? `Dewey Decimal: ${book.deweyDecimal}` : ''}`;

  const result = await callClaudeWithTool<{ code: string | null; suffix: string | null; tags: string[] }>(
    prompt,
    'suggest_classification',
    'Suggest a classification for the book: the exact code of the chosen taxonomy entry (or null), plus optional form/audience suffix and secondary-genre tags.',
    {
      type: 'object',
      properties: {
        code: {
          type: ['string', 'null'],
          description: 'Exact code of the most specific matching taxonomy entry (e.g. 500.20.03), or null if none fit',
        },
        suffix: {
          type: ['string', 'null'],
          description: 'One form/audience suffix from the listed set (e.g. –a), or null',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lowercase secondary genre/content tags; empty array if none',
        },
      },
      required: ['code', 'suffix', 'tags'],
    },
    system,
  );

  return {
    ...resolveCode(result?.code ?? null, taxonomy),
    suffix: resolveSuffix(result?.suffix),
    tags: resolveTags(result?.tags),
  };
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
