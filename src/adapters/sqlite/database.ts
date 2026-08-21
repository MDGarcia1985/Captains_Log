/*
 * File: database.ts
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
 */

import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, DATABASE_VERSION, SCHEMA_V1 } from '@/adapters/sqlite/schema';

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
 * Design: Additive migrations keyed by PRAGMA user_version so existing logs survive app updates.
 * Workflow: Runs immediately after openDatabaseAsync, before any repository query.
 * Data Handoff: Mutates the opened database in place; no return besides the updated user_version.
 */
async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(SCHEMA_V1);
    await db.execAsync('PRAGMA user_version = 1');
    version = 1;
  }

  if (version < DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
