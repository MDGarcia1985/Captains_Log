/*
 * File: entryRepository.ts
 *
 * Purpose:
 *     Persist log entries and revision history in SQLite.
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
 *     DEV-2026-08-21-006
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { EntryRepository } from '@/models/contracts';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';
import { mapEntry, type EntryRow } from '@/adapters/sqlite/mappers';

/*
 * Purpose: Bind entry SQL to one database connection for the service layer.
 * Design: Closure over db keeps SQL private and lets tests replace the repository without changing EntryService.
 * Workflow: Called from createAppServices after migrations complete.
 * Data Handoff: Returns an EntryRepository consumed by EntryService.
 */
export function createEntryRepository(db: SQLiteDatabase): EntryRepository {
  return {
    /*
     * Purpose: Insert a new canonical log entry.
     * Design: Parameterized INSERT so UI never composes SQL; location columns stay nullable.
     * Workflow: Called by EntryService.createEntry after the domain object is allocated.
     * Data Handoff: Writes the entries table; FTS triggers index source_text for search.
     */
    async create(entry) {
      await db.runAsync(
        `INSERT INTO entries (id, source_text, created_at, updated_at, latitude, longitude, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        entry.id,
        entry.sourceText,
        entry.createdAt,
        entry.updatedAt,
        entry.location?.latitude ?? null,
        entry.location?.longitude ?? null,
        entry.source
      );
    },

    /*
     * Purpose: Update source text while preserving the previous version.
     * Design: Transaction writes entry_revisions first so a failed update cannot drop history.
     * Workflow: Called by EntryService.updateEntry with the prior sourceText.
     * Data Handoff: Mutates entries and entry_revisions; FTS update trigger refreshes search.
     */
    async update(entry, previousText) {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO entry_revisions (id, entry_id, source_text, created_at)
           VALUES (?, ?, ?, ?)`,
          createId(),
          entry.id,
          previousText,
          nowMs()
        );
        await db.runAsync(
          `UPDATE entries
           SET source_text = ?, updated_at = ?, latitude = ?, longitude = ?
           WHERE id = ?`,
          entry.sourceText,
          entry.updatedAt,
          entry.location?.latitude ?? null,
          entry.location?.longitude ?? null,
          entry.id
        );
      });
    },

    /*
     * Purpose: Load one entry by id.
     * Design: Map at the repository edge so services never see snake_case columns.
     * Workflow: Used by get/update entry flows and the entry detail route.
     * Data Handoff: Returns a LogEntry or null to EntryService.
     */
    async getById(id) {
      const row = await db.getFirstAsync<EntryRow>(
        `SELECT id, source_text, created_at, updated_at, latitude, longitude, source
         FROM entries WHERE id = ? AND archived_at IS NULL`,
        id
      );
      return row ? mapEntry(row) : null;
    },

    /*
     * Purpose: Provide the chronological log's newest-first list.
     * Design: ORDER BY created_at DESC is the canonical history sort from the product spec.
     * Workflow: Called by EntryService.listEntries for LogScreen.
     * Data Handoff: Returns mapped LogEntry[] for grouping by day.
     */
    async listNewestFirst() {
      const rows = await db.getAllAsync<EntryRow>(
        `SELECT id, source_text, created_at, updated_at, latitude, longitude, source
         FROM entries WHERE archived_at IS NULL ORDER BY created_at DESC`
      );
      return rows.map(mapEntry);
    },

    /*
     * Purpose: Tombstone an entry and its attachments, links, and provenance edges.
     * Design: Set archived_at instead of DELETE so chronicle history is recoverable later.
     * Workflow: Called by EntryService.archiveEntry; not exposed in UI this pass.
     * Data Handoff: Updates entries, attachments, entry_entities, and relationships for that id.
     */
    async archive(id) {
      const archivedAt = nowMs();
      await db.withTransactionAsync(async () => {
        await db.runAsync(`UPDATE entries SET archived_at = ? WHERE id = ? AND archived_at IS NULL`, archivedAt, id);
        await db.runAsync(
          `UPDATE attachments SET archived_at = ? WHERE entry_id = ? AND archived_at IS NULL`,
          archivedAt,
          id
        );
        await db.runAsync(
          `UPDATE entry_entities SET archived_at = ? WHERE entry_id = ? AND archived_at IS NULL`,
          archivedAt,
          id
        );
        await db.runAsync(
          `UPDATE relationships SET archived_at = ? WHERE source_entry_id = ? AND archived_at IS NULL`,
          archivedAt,
          id
        );
      });
    },
  };
}
