/*
 * File: src/adapters/sqlite/migrations.ts
 *
 * Purpose:
 *     Explicit sequential SQLite migrations that advance user_version only after success.
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
 *     DEV-2026-08-21-002, DEV-2026-08-21-006, DEV-2026-08-21-010
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { PROCESSING_JOBS_SQL, SCHEMA_V1 } from '@/adapters/sqlite/schema';

/*
 * Purpose: Create the original archive schema for a new or pre-v1 database.
 * Design: Identical to the first shipped schema so existing user_version 1 databases skip this step.
 * Workflow: Invoked from migrate() only when PRAGMA user_version is 0.
 * Data Handoff: Executes SCHEMA_V1; caller then sets user_version = 1.
 */
export async function migrateV1(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(SCHEMA_V1);
}

/*
 * Purpose: Add archival columns and processing_jobs without rebuilding v1 databases.
 * Design: ADD COLUMN only when missing so a retried v2 does not fail on duplicate columns.
 * Workflow: Invoked from migrate() only when user_version is 1.
 * Data Handoff: Mutates tables in place; caller then sets user_version = 2.
 */
export async function migrateV2(db: SQLiteDatabase): Promise<void> {
  await addColumnIfMissing(db, 'entries', 'archived_at', 'INTEGER');
  await addColumnIfMissing(db, 'entities', 'archived_at', 'INTEGER');
  await addColumnIfMissing(db, 'relationships', 'archived_at', 'INTEGER');
  await addColumnIfMissing(db, 'attachments', 'archived_at', 'INTEGER');
  await addColumnIfMissing(db, 'entry_entities', 'archived_at', 'INTEGER');
  await db.execAsync(PROCESSING_JOBS_SQL);
}

interface TableInfoRow {
  name: string;
}

/*
 * Purpose: Make v2 additive and retry-safe if user_version was not advanced.
 * Design: PRAGMA table_info is the SQLite-supported column existence check.
 * Workflow: Called from migrateV2 for each tombstone column.
 * Data Handoff: Executes ALTER TABLE when the column is absent.
 */
async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  spec: string
): Promise<void> {
  const columns = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${table})`);
  if (columns.some((row) => row.name === column)) {
    return;
  }
  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${spec}`);
}
