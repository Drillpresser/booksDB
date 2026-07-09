import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('bookvault.db');
    // foreign_keys is connection-scoped — must be set on every open
    _db.execSync('PRAGMA foreign_keys = ON;');
    migrate(_db);
  }
  return _db;
}

const SCHEMA_VERSION = 5;

function migrate(db: SQLite.SQLiteDatabase) {
  const versionRow = db.getFirstSync('PRAGMA user_version') as any;
  const currentVersion: number = versionRow?.user_version ?? 0;
  if (currentVersion >= SCHEMA_VERSION) return;

  // journal_mode cannot be changed inside a transaction; it persists in the db file
  db.execSync('PRAGMA journal_mode = WAL;');

  // All DDL runs in one transaction so a crash mid-migration can't leave
  // user_version behind a partially applied schema.
  db.withTransactionSync(() => {

  if (currentVersion < 1) {
  db.execSync(`
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
  `);

  db.runSync(`PRAGMA user_version = 1`);
  }

  if (currentVersion < 2) {
    db.execSync(`ALTER TABLE contacts ADD COLUMN color TEXT`);
    db.runSync(`PRAGMA user_version = 2`);
  }

  if (currentVersion < 3) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS holds (
        id TEXT PRIMARY KEY,
        record_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (record_id) REFERENCES book_records(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
    `);
    db.runSync(`PRAGMA user_version = 3`);
  }

  if (currentVersion < 4) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT);
      ALTER TABLE contacts ADD COLUMN created_at TEXT;
    `);
    db.runSync(`PRAGMA user_version = 4`);
  }

  // RFFC Level 4: one optional form/audience suffix and secondary-genre tags per copy
  if (currentVersion < 5) {
    db.execSync(`
      ALTER TABLE book_copies ADD COLUMN suffix TEXT;
      ALTER TABLE book_copies ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
    `);
    db.runSync(`PRAGMA user_version = 5`);
  }

  });
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
