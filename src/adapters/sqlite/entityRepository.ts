/*
 * File: entityRepository.ts
 *
 * Purpose:
 *     Persist entities and entry-entity links in SQLite.
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

import type { SQLiteDatabase } from 'expo-sqlite';

import type { EntityRepository } from '@/models/contracts';
import { mapEntity, mapEntry, type EntityRow, type EntryRow } from '@/adapters/sqlite/mappers';

/*
 * Purpose: Bind entity SQL to one database connection.
 * Design: Name lookup is case-insensitive so @Alice and @alice resolve to one node.
 * Workflow: Constructed by createAppServices for EntityService and ExtractionService.
 * Data Handoff: Returns an EntityRepository for create/find/link/list operations.
 */
export function createEntityRepository(db: SQLiteDatabase): EntityRepository {
  return {
    /*
     * Purpose: Insert a newly extracted or manually created entity.
     * Design: The service decides uniqueness first; this method only writes.
     * Workflow: Called after findByName returns null during extraction or createEntity.
     * Data Handoff: Writes entities; FTS trigger indexes the name.
     */
    async create(entity) {
      await db.runAsync(
        `INSERT INTO entities (id, name, type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        entity.id,
        entity.name,
        entity.type,
        entity.createdAt,
        entity.updatedAt
      );
    },

    /*
     * Purpose: Load one entity by id.
     * Design: Null rather than throw so compact entity routes can show "not found".
     * Workflow: Used by entity views and first-degree graph assembly.
     * Data Handoff: Returns Entity or null to EntityService.
     */
    async getById(id) {
      const row = await db.getFirstAsync<EntityRow>(
        `SELECT id, name, type, created_at, updated_at FROM entities WHERE id = ? AND archived_at IS NULL`,
        id
      );
      return row ? mapEntity(row) : null;
    },

    /*
     * Purpose: Reuse an existing entity when extraction sees the same name.
     * Design: COLLATE NOCASE avoids duplicate graph nodes from capitalization drift.
     * Workflow: Called before create during extraction and createEntity.
     * Data Handoff: Returns the existing Entity or null.
     */
    async findByName(name) {
      const row = await db.getFirstAsync<EntityRow>(
        `SELECT id, name, type, created_at, updated_at
         FROM entities WHERE name = ? COLLATE NOCASE AND archived_at IS NULL`,
        name
      );
      return row ? mapEntity(row) : null;
    },

    /*
     * Purpose: List all entities for graph pickers.
     * Design: Alphabetical by name so the graph screen is scannable.
     * Workflow: Called by GraphScreen via EntityService.listEntities.
     * Data Handoff: Returns Entity[] for the selection list.
     */
    async listAll() {
      const rows = await db.getAllAsync<EntityRow>(
        `SELECT id, name, type, created_at, updated_at FROM entities WHERE archived_at IS NULL ORDER BY name COLLATE NOCASE`
      );
      return rows.map(mapEntity);
    },

    /*
     * Purpose: Hydrate related entities for a first-degree neighborhood.
     * Design: Skip the IN query when ids is empty to avoid invalid SQL.
     * Workflow: Called after RelationshipRepository.listForEntity collects neighbor ids.
     * Data Handoff: Returns Entity[] for EntityNeighborhood.relatedEntities.
     */
    async getByIds(ids) {
      if (ids.length === 0) {
        return [];
      }
      const placeholders = ids.map(() => '?').join(', ');
      const rows = await db.getAllAsync<EntityRow>(
        `SELECT id, name, type, created_at, updated_at FROM entities WHERE id IN (${placeholders}) AND archived_at IS NULL`,
        ...ids
      );
      return rows.map(mapEntity);
    },

    /*
     * Purpose: Record that an entry mentions an entity.
     * Design: INSERT OR IGNORE so re-extraction after edit does not fail on duplicates.
     * Workflow: Called by ExtractionService.processEntry after the entity exists.
     * Data Handoff: Writes entry_entities used by log chips and entity history.
     */
    async linkEntry(entryId, entityId) {
      await db.runAsync(
        `INSERT OR IGNORE INTO entry_entities (entry_id, entity_id) VALUES (?, ?)`,
        entryId,
        entityId
      );
    },

    /*
     * Purpose: Drop derived entry-entity links before a re-extract of the same source entry.
     * Design: Hard-delete regeneratable links rather than tombstone them (DEV-2026-08-21-001).
     * Workflow: Called at the start of ExtractionService.processEntry.
     * Data Handoff: Deletes entry_entities rows for the entry id.
     */
    async unlinkAllForEntry(entryId) {
      await db.runAsync(`DELETE FROM entry_entities WHERE entry_id = ?`, entryId);
    },

    /*
     * Purpose: Show unobtrusive entity chips on a log entry.
     * Design: Join through entry_entities rather than parsing text again.
     * Workflow: Called by LogScreen via EntityService.listEntitiesForEntry.
     * Data Handoff: Returns Entity[] for EntryCard.
     */
    async listForEntry(entryId) {
      const rows = await db.getAllAsync<EntityRow>(
        `SELECT e.id, e.name, e.type, e.created_at, e.updated_at
         FROM entities e
         INNER JOIN entry_entities x ON x.entity_id = e.id
         WHERE x.entry_id = ? AND e.archived_at IS NULL AND x.archived_at IS NULL
         ORDER BY e.name COLLATE NOCASE`,
        entryId
      );
      return rows.map(mapEntity);
    },

    /*
     * Purpose: Provide the associated-entry list on an entity page.
     * Design: Newest first so the most recent mention is at the top.
     * Workflow: Called by EntityService.getEntityHistory.
     * Data Handoff: Returns LogEntry[] plus timestamps derived by the service.
     */
    async listEntriesForEntity(entityId) {
      const rows = await db.getAllAsync<EntryRow>(
        `SELECT en.id, en.source_text, en.created_at, en.updated_at, en.latitude, en.longitude, en.source
         FROM entries en
         INNER JOIN entry_entities x ON x.entry_id = en.id
         WHERE x.entity_id = ? AND en.archived_at IS NULL AND x.archived_at IS NULL
         ORDER BY en.created_at DESC`,
        entityId
      );
      return rows.map(mapEntry);
    },
  };
}
