/*
 * File: src/adapters/sqlite/searchRepository.ts
 *
 * Purpose:
 *     Full-text search over entry text and entity names using SQLite FTS5.
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

import type { SearchRepository } from '@/models/contracts';
import type { SearchHit } from '@/models/types';
import { mapEntry, mapEntity, type EntryRow, type EntityRow } from '@/adapters/sqlite/mappers';
import { toFtsQuery } from '@/utilities/fts';

export { toFtsQuery };

/*
 * Purpose: Bind FTS queries to one database connection.
 * Design: Try FTS first, fall back to LIKE if MATCH throws, so search still works without FTS.
 * Workflow: Constructed by createAppServices for SearchService / SearchScreen.
 * Data Handoff: Returns a SearchRepository producing hits and entity name matches.
 */
export function createSearchRepository(db: SQLiteDatabase): SearchRepository {
  return {
    /*
     * Purpose: Find log entries whose source text matches the query.
     * Design: Attach entities and a snippet so the UI can show why a hit matched without extra round trips per card.
     * Workflow: Called as the user types on SearchScreen via SearchService.searchEntries.
     * Data Handoff: Returns SearchHit[] with entry, snippet, and related entities.
     */
    async searchEntries(query) {
      const fts = toFtsQuery(query);
      if (!fts) {
        return [];
      }

      let rows: EntryRow[] = [];
      try {
        rows = await db.getAllAsync<EntryRow>(
          `SELECT e.id, e.source_text, e.created_at, e.updated_at, e.latitude, e.longitude, e.source
           FROM entries e
           INNER JOIN entries_fts f ON f.rowid = e.rowid
           WHERE entries_fts MATCH ? AND e.archived_at IS NULL
           ORDER BY e.created_at DESC
           LIMIT 80`,
          fts
        );
      } catch {
        rows = await db.getAllAsync<EntryRow>(
          `SELECT id, source_text, created_at, updated_at, latitude, longitude, source
           FROM entries
           WHERE source_text LIKE ? AND archived_at IS NULL
           ORDER BY created_at DESC
           LIMIT 80`,
          `%${query.trim()}%`
        );
      }

      const hits: SearchHit[] = [];
      for (const row of rows) {
        const entry = mapEntry(row);
        const entityRows = await db.getAllAsync<EntityRow>(
          `SELECT ent.id, ent.name, ent.type, ent.created_at, ent.updated_at
           FROM entities ent
           INNER JOIN entry_entities x ON x.entity_id = ent.id
           WHERE x.entry_id = ? AND ent.archived_at IS NULL AND x.archived_at IS NULL`,
          entry.id
        );
        hits.push({
          entry,
          snippet: snippetAround(entry.sourceText, query),
          entities: entityRows.map(mapEntity),
        });
      }
      return hits;
    },

    /*
     * Purpose: Find entities whose names match the query.
     * Design: Same FTS-then-LIKE strategy as entries so entity search degrades gracefully.
     * Workflow: Called in parallel with searchEntries from SearchScreen.
     * Data Handoff: Returns Entity[] for orange entity result cards.
     */
    async searchEntities(query) {
      const fts = toFtsQuery(query);
      if (!fts) {
        return [];
      }

      let rows: EntityRow[] = [];
      try {
        rows = await db.getAllAsync<EntityRow>(
          `SELECT e.id, e.name, e.type, e.created_at, e.updated_at
           FROM entities e
           INNER JOIN entities_fts f ON f.rowid = e.rowid
           WHERE entities_fts MATCH ? AND e.archived_at IS NULL
           ORDER BY e.name COLLATE NOCASE
           LIMIT 40`,
          fts
        );
      } catch {
        rows = await db.getAllAsync<EntityRow>(
          `SELECT id, name, type, created_at, updated_at
           FROM entities
           WHERE name LIKE ? AND archived_at IS NULL
           ORDER BY name COLLATE NOCASE
           LIMIT 40`,
          `%${query.trim()}%`
        );
      }
      return rows.map(mapEntity);
    },
  };
}

/*
 * Purpose: Show the matching region of an entry rather than the full source text.
 * Design: Window around the first query token; ellipses mark truncation.
 * Workflow: Called while assembling SearchHit objects inside searchEntries.
 * Data Handoff: Returns a short string rendered on search result cards.
 */
function snippetAround(text: string, query: string): string {
  const needle = query.trim().split(/\s+/)[0] ?? '';
  if (!needle) {
    return text.slice(0, 180);
  }
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) {
    return text.slice(0, 180);
  }
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + needle.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
