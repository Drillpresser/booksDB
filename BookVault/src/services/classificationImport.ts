import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { createSystem, importNodes } from '../database/queries/classificationSystems';
import type { ImportNodeInput } from '../database/queries/classificationSystems';

export async function pickAndImportSystem(systemName: string): Promise<{ nodeCount: number; systemId: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'application/json', 'text/plain', 'text/*', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) throw new Error('CANCELLED');

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri);
  const nodes = parseContent(content, asset.name ?? '');

  if (nodes.length === 0) throw new Error('No classification entries found in the file.');

  const system = createSystem(systemName, null);
  importNodes(system.id, nodes);

  return { nodeCount: nodes.length, systemId: system.id };
}

export function parseContent(content: string, filename: string): ImportNodeInput[] {
  const trimmed = content.trim();

  if (filename.toLowerCase().endsWith('.json') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJsonNested(trimmed);
  }

  const { headers, rows } = parseCSV(trimmed);

  const hasParent = headers.some(h => h.includes('parent'));
  if (hasParent) return parseCsvCodeParent(headers, rows);

  const hasPath = headers.some(h => h === 'path' || h === 'category' || h === 'hierarchy');
  if (hasPath) return parseCsvPath(headers, rows);

  // Heuristic: check if the first data value looks like a path
  if (rows.length > 0) {
    const firstVal = Object.values(rows[0])[0] ?? '';
    if (firstVal.includes('/') || firstVal.includes('>') || firstVal.includes('|')) {
      return parseCsvPath(headers, rows);
    }
  }

  return parseCsvCodeParent(headers, rows);
}

// --- CSV parser ---

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const fields: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        fields.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const vals = parseLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
      return row;
    });

  return { headers, rows };
}

// --- CSV code+parent format ---
// Expected: code, label/name, parent_code/parent

function parseCsvCodeParent(headers: string[], rows: Record<string, string>[]): ImportNodeInput[] {
  const codeCol = headers.find(h => h === 'code') ?? headers[0];
  const labelCol = headers.find(h => h === 'label' || h === 'name' || h === 'title') ?? headers[1] ?? '';
  const parentCol = headers.find(h => h.includes('parent'));

  const nodeMap = new Map<string, { label: string; parentCode: string | null; order: number }>();
  let order = 0;
  for (const row of rows) {
    const code = row[codeCol]?.trim();
    const label = (labelCol ? row[labelCol]?.trim() : '') || code;
    const parentCode = parentCol ? (row[parentCol]?.trim() || null) : null;
    if (code) nodeMap.set(code, { label: label ?? code, parentCode, order: order++ });
  }

  // Compute depths (BFS via memoization)
  const depths = new Map<string, number>();
  function getDepth(code: string, visited = new Set<string>()): number {
    if (depths.has(code)) return depths.get(code)!;
    if (visited.has(code)) return 0;
    visited.add(code);
    const node = nodeMap.get(code);
    if (!node?.parentCode || !nodeMap.has(node.parentCode)) {
      depths.set(code, 0);
      return 0;
    }
    const d = getDepth(node.parentCode, visited) + 1;
    depths.set(code, d);
    return d;
  }
  for (const code of nodeMap.keys()) getDepth(code);

  const result: ImportNodeInput[] = [];
  for (const [code, { label, parentCode, order: o }] of nodeMap.entries()) {
    result.push({ code, label, parentCode, depth: depths.get(code) ?? 0, sortOrder: o });
  }
  return result;
}

// --- CSV path format ---
// Expected: path column with delimiter-separated segments, optional code/label columns

function parseCsvPath(headers: string[], rows: Record<string, string>[]): ImportNodeInput[] {
  const pathCol = headers.find(h => h === 'path' || h === 'category' || h === 'hierarchy') ?? headers[0];
  const codeCol = headers.find(h => h === 'code' && h !== pathCol);
  const labelCol = headers.find(h => (h === 'label' || h === 'name') && h !== pathCol);

  // Detect delimiter
  let delim = '/';
  for (const row of rows.slice(0, 10)) {
    const p = row[pathCol] ?? '';
    if (p.includes('>')) { delim = '>'; break; }
    if (p.includes('|')) { delim = '|'; break; }
    if (p.includes('\\')) { delim = '\\'; break; }
  }

  // pathStr → { code, label, parentPath, depth }
  const nodeByPath = new Map<string, { code: string; label: string; parentPath: string | null; depth: number; order: number }>();
  let order = 0;

  for (const row of rows) {
    const rawPath = row[pathCol]?.trim();
    if (!rawPath) continue;

    const segments = rawPath.split(delim).map(s => s.trim()).filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      const currentPath = segments.slice(0, i + 1).join(delim);
      if (nodeByPath.has(currentPath)) continue;

      const isLeaf = i === segments.length - 1;
      const explicitCode = isLeaf && codeCol ? row[codeCol]?.trim() : undefined;
      const explicitLabel = isLeaf && labelCol ? row[labelCol]?.trim() : undefined;

      nodeByPath.set(currentPath, {
        code: explicitCode || segments[i],
        label: explicitLabel || segments[i],
        parentPath: i > 0 ? segments.slice(0, i).join(delim) : null,
        depth: i,
        order: order++,
      });
    }
  }

  const pathToCode = new Map<string, string>();
  for (const [path, node] of nodeByPath.entries()) pathToCode.set(path, node.code);

  const result: ImportNodeInput[] = [];
  for (const [path, node] of nodeByPath.entries()) {
    result.push({
      code: node.code,
      label: node.label,
      parentCode: node.parentPath ? (pathToCode.get(node.parentPath) ?? null) : null,
      depth: node.depth,
      sortOrder: node.order,
    });
  }
  return result;
}

// --- JSON nested format ---
// Expected: [{code, label/name, children: [...]}]

function parseJsonNested(content: string): ImportNodeInput[] {
  let data: any;
  try { data = JSON.parse(content); } catch { throw new Error('Invalid JSON — could not parse file.'); }
  if (!Array.isArray(data)) data = [data];

  const result: ImportNodeInput[] = [];
  let sortOrder = 0;

  function walk(items: any[], depth: number, parentCode: string | null): void {
    for (const item of items) {
      const code = String(item.code ?? item.id ?? ++sortOrder);
      const label = String(item.label ?? item.name ?? item.title ?? code);
      result.push({ code, label, parentCode, depth, sortOrder: sortOrder++ });
      if (Array.isArray(item.children) && item.children.length > 0) {
        walk(item.children, depth + 1, code);
      }
    }
  }
  walk(data, 0, null);
  return result;
}
