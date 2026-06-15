import { getDB, generateId } from '../db';
import type { ClassificationSystem, ClassificationNode } from '../../types';

function rowToSystem(row: any): ClassificationSystem {
  return { id: row.id, name: row.name, description: row.description ?? null, createdAt: row.created_at };
}

function rowToNode(row: any): ClassificationNode {
  return { id: row.id, systemId: row.system_id, code: row.code, label: row.label, parentId: row.parent_id ?? null, depth: row.depth, sortOrder: row.sort_order };
}

// --- Systems ---

export function getAllSystems(): ClassificationSystem[] {
  const db = getDB();
  return (db.getAllSync('SELECT * FROM classification_systems ORDER BY created_at') as any[]).map(rowToSystem);
}

export function getSystemById(id: string): ClassificationSystem | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM classification_systems WHERE id = ?', [id]);
  return row ? rowToSystem(row) : null;
}

export function createSystem(name: string, description: string | null): ClassificationSystem {
  const db = getDB();
  const id = generateId();
  const createdAt = new Date().toISOString();
  db.runSync(
    'INSERT INTO classification_systems (id, name, description, created_at) VALUES (?, ?, ?, ?)',
    [id, name, description, createdAt]
  );
  return { id, name, description, createdAt };
}

export function deleteSystem(id: string): void {
  getDB().runSync('DELETE FROM classification_systems WHERE id = ?', [id]);
}

export function getNodeCountForSystem(systemId: string): number {
  const row = getDB().getFirstSync('SELECT COUNT(*) as count FROM classification_nodes WHERE system_id = ?', [systemId]) as any;
  return row?.count ?? 0;
}

// --- Nodes ---

export function getRootNodes(systemId: string): ClassificationNode[] {
  const db = getDB();
  return (db.getAllSync(
    'SELECT * FROM classification_nodes WHERE system_id = ? AND parent_id IS NULL ORDER BY sort_order, code',
    [systemId]
  ) as any[]).map(rowToNode);
}

export function getChildNodes(parentId: string): ClassificationNode[] {
  const db = getDB();
  return (db.getAllSync(
    'SELECT * FROM classification_nodes WHERE parent_id = ? ORDER BY sort_order, code',
    [parentId]
  ) as any[]).map(rowToNode);
}

export function hasChildren(nodeId: string): boolean {
  const row = getDB().getFirstSync('SELECT COUNT(*) as count FROM classification_nodes WHERE parent_id = ?', [nodeId]) as any;
  return (row?.count ?? 0) > 0;
}

export function getNodeById(id: string): ClassificationNode | null {
  const row = getDB().getFirstSync('SELECT * FROM classification_nodes WHERE id = ?', [id]);
  return row ? rowToNode(row) : null;
}

export function searchNodes(systemId: string, query: string): ClassificationNode[] {
  const q = `%${query.toLowerCase()}%`;
  return (getDB().getAllSync(
    `SELECT * FROM classification_nodes
     WHERE system_id = ? AND (LOWER(code) LIKE ? OR LOWER(label) LIKE ?)
     ORDER BY depth, sort_order, code LIMIT 50`,
    [systemId, q, q]
  ) as any[]).map(rowToNode);
}

export function getNodeAncestors(nodeId: string): ClassificationNode[] {
  const ancestors: ClassificationNode[] = [];
  let node = getNodeById(nodeId);
  while (node?.parentId) {
    const parent = getNodeById(node.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    node = parent;
  }
  return ancestors;
}

export type ImportNodeInput = {
  code: string;
  label: string;
  parentCode: string | null;
  depth: number;
  sortOrder: number;
};

export function importNodes(systemId: string, nodes: ImportNodeInput[]): void {
  const db = getDB();
  // Pre-generate all IDs so parent references can be resolved regardless of insert order
  const codeToId = new Map<string, string>();
  for (const node of nodes) {
    if (!codeToId.has(node.code)) codeToId.set(node.code, generateId());
  }

  db.withTransactionSync(() => {
    // Sort by depth so parents are inserted before children (required by FK constraint)
    const sorted = [...nodes].sort((a, b) => a.depth - b.depth || a.sortOrder - b.sortOrder);
    for (const node of sorted) {
      const id = codeToId.get(node.code)!;
      const parentId = node.parentCode ? (codeToId.get(node.parentCode) ?? null) : null;
      db.runSync(
        'INSERT OR IGNORE INTO classification_nodes (id, system_id, code, label, parent_id, depth, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, systemId, node.code, node.label, parentId, node.depth, node.sortOrder]
      );
    }
  });
}

// --- Book copy classifications ---

export function getBookCopyClassifications(copyId: string): Array<{ systemId: string; nodeId: string; node: ClassificationNode; system: ClassificationSystem }> {
  const rows = getDB().getAllSync(
    `SELECT bcc.system_id, bcc.node_id,
            cn.code, cn.label, cn.parent_id, cn.depth, cn.sort_order,
            cs.name as system_name, cs.description as system_description, cs.created_at
     FROM book_copy_classifications bcc
     JOIN classification_nodes cn ON bcc.node_id = cn.id
     JOIN classification_systems cs ON bcc.system_id = cs.id
     WHERE bcc.copy_id = ?`,
    [copyId]
  ) as any[];
  return rows.map(row => ({
    systemId: row.system_id as string,
    nodeId: row.node_id as string,
    node: { id: row.node_id, systemId: row.system_id, code: row.code, label: row.label, parentId: row.parent_id ?? null, depth: row.depth, sortOrder: row.sort_order },
    system: { id: row.system_id, name: row.system_name, description: row.system_description ?? null, createdAt: row.created_at },
  }));
}

export function setBookCopyClassification(copyId: string, systemId: string, nodeId: string): void {
  getDB().runSync(
    'INSERT OR REPLACE INTO book_copy_classifications (copy_id, node_id, system_id) VALUES (?, ?, ?)',
    [copyId, nodeId, systemId]
  );
}

export function removeBookCopyClassification(copyId: string, systemId: string): void {
  getDB().runSync('DELETE FROM book_copy_classifications WHERE copy_id = ? AND system_id = ?', [copyId, systemId]);
}
