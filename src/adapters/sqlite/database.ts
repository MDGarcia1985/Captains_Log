/*
 * File: src/adapters/sqlite/database.ts
 *
 * Purpose:
 *     Open the local SQLite archive and apply versioned migrations.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 *
 * Related Decisions:
 *     DEV-2026-08-21-002, DEV-2026-08-21-005
 */

import * as SQLite from 'expo-sqlite';

import { migrateV1, migrateV2 } from '@/adapters/sqlite/migrations';
import { DATABASE_NAME, REQUIRED_TABLES } from '@/adapters/sqlite/schema';
import type { RestoreVerification } from '@/models/types';

/*
 * Purpose: Open the local archive and guarantee the schema is current before services run.
 * Design: Open then migrate in one call so callers cannot forget migrations.
 * Workflow: Invoked once by AppServicesProvider at boot, before createAppServices.
 * Data Handoff: Returns a live SQLiteDatabase handed to the composition root.
 */
export async function openArchiveDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrate(db);
  return db;
}

/*
 * Purpose: Apply versioned schema changes without rebuilding the database.
 * Design: Named migrateV1/migrateV2; user_version advances only after that step succeeds.
 * Workflow: Runs immediately after openDatabaseAsync, before any repository query.
 * Data Handoff: Mutates the opened database in place.
 */
export async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await migrateV1(db);
    await db.execAsync('PRAGMA user_version = 1');
    version = 1;
  }

  if (version < 2) {
    await migrateV2(db);
    await db.execAsync('PRAGMA user_version = 2');
    version = 2;
  }
}

/*
 * Purpose: Flush WAL onto the main database file before a snapshot serialize.
 * Design: TRUNCATE checkpoint so backup bytes include committed writes, not only the WAL sidecar.
 * Workflow: Called by Drive snapshot creation immediately before serializeAsync.
 * Data Handoff: Mutates WAL state; no return value.
 */
export async function checkpointWal(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');
}

/*
 * Purpose: Replace the live archive with verified snapshot bytes and re-open it.
 * Design: Verify in memory first; close and delete the live file only after integrity_check is ok.
 * Workflow: Called from AppServicesProvider.installRestoredArchive after Drive download.
 * Data Handoff: Returns the newly opened SQLiteDatabase; caller recomposes services.
 */
export async function replaceArchiveDatabase(
  current: SQLite.SQLiteDatabase,
  databaseBytes: Uint8Array
): Promise<SQLite.SQLiteDatabase> {
  const staging = await SQLite.deserializeDatabaseAsync(databaseBytes);
  try {
    const check = await staging.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
    if ((check?.integrity_check ?? '') !== 'ok') {
      throw new Error(`Snapshot failed integrity_check: ${check?.integrity_check ?? 'unknown'}`);
    }

    await checkpointWal(current);
    await current.closeAsync();
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);

    const next = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await SQLite.backupDatabaseAsync({
      sourceDatabase: staging,
      destDatabase: next,
      sourceDatabaseName: 'main',
      destDatabaseName: 'main',
    });
    await migrate(next);
    return next;
  } finally {
    await staging.closeAsync();
  }
}

/*
 * Purpose: Confirm the opened archive is a usable Captain's Log database.
 * Design: integrity_check plus required table names; attachment file checks belong to the caller.
 * Workflow: Used after restore and available for Settings diagnostics.
 * Data Handoff: Returns the database portion of RestoreVerification.
 */
export async function verifyDatabaseIntegrity(
  db: SQLite.SQLiteDatabase
): Promise<Pick<RestoreVerification, 'databaseOk' | 'integrityCheck' | 'requiredTablesPresent'>> {
  const check = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  const integrityCheck = check?.integrity_check ?? 'missing';
  const tables = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table'`
  );
  const names = new Set(tables.map((row) => row.name));
  const requiredTablesPresent = REQUIRED_TABLES.every((name) => names.has(name));
  return {
    databaseOk: integrityCheck === 'ok' && requiredTablesPresent,
    integrityCheck,
    requiredTablesPresent,
  };
}
