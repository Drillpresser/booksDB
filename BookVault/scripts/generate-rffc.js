// Regenerates src/data/rffcClassifications.ts from RFFC-v4-comprehensive.md.
// Run after editing the schema doc:  node scripts/generate-rffc.js
//
// Terminology mapping (the doc and the app invert two level names):
//   RFFC Class   (500)        -> app MainClass
//   RFFC Division (500.20)    -> app Section
//   RFFC Section  (500.20.03) -> app Division (the leaf books attach to)
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'RFFC-v4-comprehensive.md');
const OUT = path.join(__dirname, '..', 'src', 'data', 'rffcClassifications.ts');

const md = fs.readFileSync(SRC, 'utf8');

// Schedules live in Part 2; the Level 4 suffix table and tag vocabulary in Part 1
const part1 = md.split(/^# PART 1\b.*$/m)[1]?.split(/^# PART 2\b.*$/m)[0];
const part2 = md.split(/^# PART 2\b.*$/m)[1]?.split(/^# PART 3\b.*$/m)[0];
if (!part1) throw new Error('Could not locate PART 1 system rules in the doc');
if (!part2) throw new Error('Could not locate PART 2 schedules in the doc');

// Italicized scope notes like *(Ruling R3)* are shelving guidance, not part of
// the name; plain parentheses are kept.
const stripNotes = (s) => s.replace(/\*\([^)]*\)\*/g, '').replace(/\s+/g, ' ').trim();

const titleCase = (s) =>
  s
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());

const versionMatch = md.match(/^## Comprehensive Edition — v([\d.]+)/m);
const version = versionMatch ? versionMatch[1] : 'unknown';

const classes = [];
let cls = null;
let sec = null;

for (const raw of part2.split('\n')) {
  const line = raw.trim();

  let m = line.match(/^## (\d{3}) — (.+)$/);
  if (m) {
    cls = { code: m[1], name: titleCase(stripNotes(m[2])), sections: [] };
    sec = null;
    classes.push(cls);
    continue;
  }

  m = line.match(/^\*\*(\d{3}\.\d{2}) — (.+?)\*\*/);
  if (m && cls) {
    sec = { code: m[1], name: stripNotes(m[2]), divisions: [] };
    cls.sections.push(sec);
    continue;
  }

  m = line.match(/^- (\d{3}\.\d{2}\.\d{2}) (.+)$/);
  if (m && sec) {
    sec.divisions.push({ code: m[1], name: stripNotes(m[2]) });
  }
}

// Level 4a: form & audience suffixes (markdown table rows like `| `–a` | meaning |`).
// `short` is a chip-length display label: the meaning truncated at its first
// " / ", ", " or " (" — the doc's own qualifier separators.
const suffixes = [];
{
  const sect = part1.split(/^## Form & Audience Suffixes.*$/m)[1]?.split(/^## /m)[0] ?? '';
  for (const line of sect.split('\n')) {
    const m = line.match(/^\|\s*`(–[a-z])`\s*\|\s*(.+?)\s*\|/);
    if (m) {
      suffixes.push({ code: m[1], meaning: m[2], short: m[2].split(/ \/ |, | \(/)[0] });
    }
  }
}

// Level 4b: core cross-genre tag vocabulary (backticked lowercase words)
const tags = [];
{
  const sect = part1.split(/^## Cross-Genre Tags.*$/m)[1]?.split(/^## /m)[0] ?? '';
  const re = /`([a-z]+)`/g;
  let m;
  while ((m = re.exec(sect))) {
    if (!tags.includes(m[1])) tags.push(m[1]);
  }
}

if (suffixes.length === 0 || tags.length === 0) {
  throw new Error('Parse produced no suffixes or tags — check the Part 1 format');
}

const nClasses = classes.length;
const nSections = classes.reduce((n, c) => n + c.sections.length, 0);
const nDivisions = classes.reduce(
  (n, c) => n + c.sections.reduce((k, s) => k + s.divisions.length, 0),
  0
);

// Sanity checks against the doc's own footer claim (10 / 87 / 470 for v4.0)
if (nClasses === 0 || nSections === 0 || nDivisions === 0) {
  throw new Error('Parse produced empty schedules — check the doc format');
}
for (const c of classes) {
  for (const s of c.sections) {
    if (!s.code.startsWith(c.code + '.')) throw new Error(`Section ${s.code} not under class ${c.code}`);
    for (const d of s.divisions) {
      if (!d.code.startsWith(s.code + '.')) throw new Error(`Division ${d.code} not under section ${s.code}`);
    }
  }
}

const header = `// AUTO-GENERATED from RFFC-v4-comprehensive.md — do not edit by hand.
// Regenerate with:  node scripts/generate-rffc.js
// RFFC v${version}: ${nClasses} classes, ${nSections} divisions, ${nDivisions} sections, ${suffixes.length} suffixes, ${tags.length} tags
// (RFFC "division"/"section" = app Section/Division; see scripts/generate-rffc.js)

export type SeedDivision = { code: string; name: string };
export type SeedSection = { code: string; name: string; divisions: SeedDivision[] };
export type SeedMainClass = { code: string; name: string; sections: SeedSection[] };
export type SeedSuffix = { code: string; meaning: string; short: string };

export const RFFC_VERSION = ${JSON.stringify(version)};

// Level 4a — form & audience suffixes (a copy takes at most one)
export const RFFC_SUFFIXES: SeedSuffix[] = ${JSON.stringify(suffixes, null, 2)};

// Level 4b — core cross-genre tag vocabulary (extend freely)
export const RFFC_TAGS: string[] = ${JSON.stringify(tags, null, 2)};

export const RFFC_CLASSIFICATIONS: SeedMainClass[] = `;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + JSON.stringify(classes, null, 2) + ';\n', 'utf8');
console.log(`Wrote ${OUT}`);
console.log(`${nClasses} classes, ${nSections} sections (RFFC divisions), ${nDivisions} divisions (RFFC sections), ${suffixes.length} suffixes, ${tags.length} tags`);
