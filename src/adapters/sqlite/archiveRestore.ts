/*
 * File: src/adapters/sqlite/archiveRestore.ts
 *
 * Purpose:
 *     Install a downloaded snapshot into the live local archive and verify it.
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
 *     DEV-2026-08-21-005
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { replaceArchiveDatabase, verifyDatabaseIntegrity } from '@/adapters/sqlite/database';
import type { AttachmentStorage } from '@/models/contracts';
import type { RestoreVerification, RestoredArchivePayload } from '@/models/types';

/*
 * Purpose: Swap the live database and attachment files for a verified snapshot.
 * Design: Database replace first; files next; then rewrite device-local URIs and verify.
 * Workflow: Called from AppServicesProvider.installRestoredArchive.
 * Data Handoff: Returns the new SQLiteDatabase plus RestoreVerification for Settings.
 */
export async function installRestoredArchive(
  current: SQLiteDatabase,
  payload: RestoredArchivePayload,
  storage: AttachmentStorage
): Promise<{ db: SQLiteDatabase; verification: RestoreVerification }> {
  const db = await replaceArchiveDatabase(current, payload.databaseBytes);
  await storage.replaceAllManagedFiles(payload.files);
  await rewriteAttachmentUris(db, storage, payload);
  const verification = await verifyRestoredArchive(db, storage);
  return { db, verification };
}

/*
 * Purpose: Point restored attachment rows at this device's managed file URIs.
 * Design: Snapshot rows still contain the source device paths.
 * Workflow: Called after files are written during restore.
 * Data Handoff: Updates attachments.file_uri and thumbnail_uri.
 */
async function rewriteAttachmentUris(
  db: SQLiteDatabase,
  storage: AttachmentStorage,
  payload: RestoredArchivePayload
): Promise<void> {
  const byId = new Map<string, { fileUri: string | null; thumbnailUri: string | null }>();
  for (const file of payload.files) {
    const current = byId.get(file.attachmentId) ?? { fileUri: null, thumbnailUri: null };
    const uri = storage.managedUri(file.attachmentId, file.fileName);
    if (file.fileName.startsWith('thumb')) {
      current.thumbnailUri = uri;
    } else {
      current.fileUri = uri;
    }
    byId.set(file.attachmentId, current);
  }
  for (const [id, uris] of byId) {
    await db.runAsync(
      `UPDATE attachments
       SET file_uri = COALESCE(?, file_uri),
           thumbnail_uri = COALESCE(?, thumbnail_uri)
       WHERE id = ?`,
      uris.fileUri,
      uris.thumbnailUri,
      id
    );
  }
}

/*
 * Purpose: Verify SQLite integrity and that live attachment files exist on disk.
 * Design: Missing files are listed rather than throwing so Settings can show a partial restore.
 * Workflow: Called at the end of restore and available as a diagnostic.
 * Data Handoff: Returns RestoreVerification consumed by BackupService/Settings.
 */
export async function verifyRestoredArchive(
  db: SQLiteDatabase,
  storage: AttachmentStorage
): Promise<RestoreVerification> {
  const database = await verifyDatabaseIntegrity(db);
  const rows = await db.getAllAsync<{ id: string; file_uri: string }>(
    `SELECT id, file_uri FROM attachments WHERE archived_at IS NULL`
  );
  const missingAttachmentIds: string[] = [];
  let attachmentFilesPresent = 0;
  for (const row of rows) {
    const exists = await storage.fileExists(row.file_uri);
    if (exists) {
      attachmentFilesPresent += 1;
    } else {
      missingAttachmentIds.push(row.id);
    }
  }
  return {
    ...database,
    databaseOk: database.databaseOk && missingAttachmentIds.length === 0,
    attachmentRows: rows.length,
    attachmentFilesPresent,
    missingAttachmentIds,
  };
}
