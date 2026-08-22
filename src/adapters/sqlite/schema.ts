/*
 * File: schema.ts
 *
 * Purpose:
 *     SQLite schema SQL and migration version for the local archive.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-002
 */

export const DATABASE_NAME = 'captains-log.db';
export const DATABASE_VERSION = 2;
export const REQUIRED_TABLES = [
  'entries',
  'entities',
  'entry_entities',
  'relationships',
  'attachments',
  'entry_revisions',
  'app_settings',
  'processing_jobs',
] as const;

export const SCHEMA_V1 = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  source_text TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  latitude REAL,
  longitude REAL,
  source TEXT NOT NULL DEFAULT 'capture'
);

CREATE TABLE IF NOT EXISTS entry_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL,
  source_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_entities (
  entry_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, entity_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id),
  FOREIGN KEY (entity_id) REFERENCES entities(id)
);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY NOT NULL,
  source_entity_id TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  source_entry_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_entity_id) REFERENCES entities(id),
  FOREIGN KEY (target_entity_id) REFERENCES entities(id),
  FOREIGN KEY (source_entry_id) REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL,
  file_uri TEXT NOT NULL,
  thumbnail_uri TEXT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  size INTEGER,
  created_at INTEGER NOT NULL,
  role TEXT,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_relationships_source ON relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entry_id ON attachments(entry_id);

CREATE VIRTUAL TABLE IF NOT EXISTS entries_fts USING fts5(
  source_text,
  content='entries',
  content_rowid='rowid'
);

CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
  name,
  content='entities',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS entries_ai AFTER INSERT ON entries BEGIN
  INSERT INTO entries_fts(rowid, source_text) VALUES (new.rowid, new.source_text);
END;

CREATE TRIGGER IF NOT EXISTS entries_ad AFTER DELETE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, source_text)
    VALUES('delete', old.rowid, old.source_text);
END;

CREATE TRIGGER IF NOT EXISTS entries_au AFTER UPDATE ON entries BEGIN
  INSERT INTO entries_fts(entries_fts, rowid, source_text)
    VALUES('delete', old.rowid, old.source_text);
  INSERT INTO entries_fts(rowid, source_text) VALUES (new.rowid, new.source_text);
END;

CREATE TRIGGER IF NOT EXISTS entities_ai AFTER INSERT ON entities BEGIN
  INSERT INTO entities_fts(rowid, name) VALUES (new.rowid, new.name);
END;

CREATE TRIGGER IF NOT EXISTS entities_ad AFTER DELETE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, name)
    VALUES('delete', old.rowid, old.name);
END;

CREATE TRIGGER IF NOT EXISTS entities_au AFTER UPDATE ON entities BEGIN
  INSERT INTO entities_fts(entities_fts, rowid, name)
    VALUES('delete', old.rowid, old.name);
  INSERT INTO entities_fts(rowid, name) VALUES (new.rowid, new.name);
END;
`;

export const PROCESSING_JOBS_SQL = `
CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  entry_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_entry ON processing_jobs(entry_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_relationships_source_entry ON relationships(source_entry_id);
CREATE INDEX IF NOT EXISTS idx_entries_archived_at ON entries(archived_at);
`;
