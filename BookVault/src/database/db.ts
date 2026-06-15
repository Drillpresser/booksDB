import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('bookvault.db');
    migrate(_db);
  }
  return _db;
}

function migrate(db: SQLite.SQLiteDatabase) {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS main_classes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      main_class_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (main_class_id) REFERENCES main_classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS divisions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      section_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS book_records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      authors TEXT NOT NULL DEFAULT '[]',
      sort_author TEXT NOT NULL DEFAULT '',
      isbn13 TEXT,
      publisher TEXT,
      published_year INTEGER,
      page_count INTEGER,
      synopsis TEXT,
      cover_image TEXT,
      dewey_decimal TEXT,
      community_rating REAL,
      community_rating_count INTEGER,
      community_rating_fetched TEXT
    );

    CREATE TABLE IF NOT EXISTS book_copies (
      id TEXT PRIMARY KEY,
      record_id TEXT NOT NULL,
      copy_number INTEGER NOT NULL DEFAULT 1,
      division_id TEXT,
      personal_rating INTEGER,
      notes TEXT,
      date_added TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES book_records(id) ON DELETE CASCADE,
      FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      copy_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      date_lent TEXT NOT NULL,
      expected_return TEXT,
      date_returned TEXT,
      notes TEXT,
      FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE CASCADE,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS classification_systems (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classification_nodes (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      parent_id TEXT,
      depth INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (system_id) REFERENCES classification_systems(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES classification_nodes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS book_copy_classifications (
      copy_id TEXT NOT NULL,
      node_id TEXT NOT NULL,
      system_id TEXT NOT NULL,
      PRIMARY KEY (copy_id, system_id),
      FOREIGN KEY (copy_id) REFERENCES book_copies(id) ON DELETE CASCADE,
      FOREIGN KEY (node_id) REFERENCES classification_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (system_id) REFERENCES classification_systems(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_cls_nodes_system ON classification_nodes(system_id, depth, sort_order);
    CREATE INDEX IF NOT EXISTS idx_cls_nodes_parent ON classification_nodes(parent_id);
  `);
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
