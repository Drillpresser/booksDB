import { getDB, generateId } from '../db';
import type { MainClass, Section, Division } from '../../types';

function rowToMainClass(row: any): MainClass {
  return { id: row.id, code: row.code, name: row.name, sortOrder: row.sort_order };
}

function rowToSection(row: any): Section {
  return { id: row.id, code: row.code, name: row.name, mainClassId: row.main_class_id, sortOrder: row.sort_order };
}

function rowToDivision(row: any): Division {
  return { id: row.id, code: row.code, name: row.name, sectionId: row.section_id, sortOrder: row.sort_order };
}

export function getAllMainClasses(): MainClass[] {
  const db = getDB();
  const rows = db.getAllSync('SELECT * FROM main_classes ORDER BY sort_order, code');
  return rows.map(rowToMainClass);
}

export function getSectionsByMainClass(mainClassId: string): Section[] {
  const db = getDB();
  const rows = db.getAllSync(
    'SELECT * FROM sections WHERE main_class_id = ? ORDER BY sort_order, code',
    [mainClassId]
  );
  return rows.map(rowToSection);
}

export function getDivisionsBySection(sectionId: string): Division[] {
  const db = getDB();
  const rows = db.getAllSync(
    'SELECT * FROM divisions WHERE section_id = ? ORDER BY sort_order, code',
    [sectionId]
  );
  return rows.map(rowToDivision);
}

export function getMainClassById(id: string): MainClass | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM main_classes WHERE id = ?', [id]);
  return row ? rowToMainClass(row) : null;
}

export function getSectionById(id: string): Section | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM sections WHERE id = ?', [id]);
  return row ? rowToSection(row) : null;
}

export function getDivisionById(id: string): Division | null {
  const db = getDB();
  const row = db.getFirstSync('SELECT * FROM divisions WHERE id = ?', [id]);
  return row ? rowToDivision(row) : null;
}

export function createMainClass(code: string, name: string): MainClass {
  const db = getDB();
  const id = generateId();
  const existing = db.getAllSync('SELECT COUNT(*) as count FROM main_classes') as any[];
  const sortOrder = existing[0]?.count ?? 0;
  db.runSync(
    'INSERT INTO main_classes (id, code, name, sort_order) VALUES (?, ?, ?, ?)',
    [id, code, name, sortOrder]
  );
  return { id, code, name, sortOrder };
}

export function createSection(mainClassId: string, code: string, name: string): Section {
  const db = getDB();
  const id = generateId();
  const existing = db.getAllSync(
    'SELECT COUNT(*) as count FROM sections WHERE main_class_id = ?',
    [mainClassId]
  ) as any[];
  const sortOrder = existing[0]?.count ?? 0;
  db.runSync(
    'INSERT INTO sections (id, code, name, main_class_id, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, code, name, mainClassId, sortOrder]
  );
  return { id, code, name, mainClassId, sortOrder };
}

export function createDivision(sectionId: string, code: string, name: string): Division {
  const db = getDB();
  const id = generateId();
  const existing = db.getAllSync(
    'SELECT COUNT(*) as count FROM divisions WHERE section_id = ?',
    [sectionId]
  ) as any[];
  const sortOrder = existing[0]?.count ?? 0;
  db.runSync(
    'INSERT INTO divisions (id, code, name, section_id, sort_order) VALUES (?, ?, ?, ?, ?)',
    [id, code, name, sectionId, sortOrder]
  );
  return { id, code, name, sectionId, sortOrder };
}

export function updateMainClass(id: string, code: string, name: string) {
  const db = getDB();
  db.runSync('UPDATE main_classes SET code = ?, name = ? WHERE id = ?', [code, name, id]);
}

export function updateSection(id: string, code: string, name: string) {
  const db = getDB();
  db.runSync('UPDATE sections SET code = ?, name = ? WHERE id = ?', [code, name, id]);
}

export function updateDivision(id: string, code: string, name: string) {
  const db = getDB();
  db.runSync('UPDATE divisions SET code = ?, name = ? WHERE id = ?', [code, name, id]);
}

export function deleteMainClass(id: string) {
  const db = getDB();
  db.runSync('DELETE FROM main_classes WHERE id = ?', [id]);
}

export function deleteSection(id: string) {
  const db = getDB();
  db.runSync('DELETE FROM sections WHERE id = ?', [id]);
}

export function deleteDivision(id: string) {
  const db = getDB();
  db.runSync('DELETE FROM divisions WHERE id = ?', [id]);
}

export function getBookCountForDivision(divisionId: string): number {
  const db = getDB();
  const row = db.getFirstSync(
    'SELECT COUNT(*) as count FROM book_copies WHERE division_id = ?',
    [divisionId]
  ) as any;
  return row?.count ?? 0;
}

export function getBookCountForSection(sectionId: string): number {
  const db = getDB();
  const row = db.getFirstSync(
    `SELECT COUNT(*) as count FROM book_copies bc
     JOIN divisions d ON bc.division_id = d.id
     WHERE d.section_id = ?`,
    [sectionId]
  ) as any;
  return row?.count ?? 0;
}

export function getBookCountForMainClass(mainClassId: string): number {
  const db = getDB();
  const row = db.getFirstSync(
    `SELECT COUNT(*) as count FROM book_copies bc
     JOIN divisions d ON bc.division_id = d.id
     JOIN sections s ON d.section_id = s.id
     WHERE s.main_class_id = ?`,
    [mainClassId]
  ) as any;
  return row?.count ?? 0;
}
