/*
 * File: relationshipRepository.ts
 *
 * Purpose:
 *     Persist provenance-bearing relationships in SQLite.
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

import type { RelationshipRepository } from '@/models/contracts';
import { mapRelationship, type RelationshipRow } from '@/adapters/sqlite/mappers';

/*
 * Purpose: Bind relationship SQL to one database connection.
 * Design: Every stored edge keeps source_entry_id so derived links remain regeneratable with provenance.
 * Workflow: Constructed by createAppServices for extraction and graph assembly.
 * Data Handoff: Returns a RelationshipRepository for EntityService.
 */
export function createRelationshipRepository(db: SQLiteDatabase): RelationshipRepository {
  return {
    /*
     * Purpose: Record a derived or explicit edge between two entities.
     * Design: Store provenance on insert rather than inferring it later.
     * Workflow: Called by ExtractionService when an entry mentions two or more entities.
     * Data Handoff: Writes the relationships table for first-degree graph queries.
     */
    async create(relationship) {
      await db.runAsync(
        `INSERT INTO relationships
          (id, source_entity_id, target_entity_id, type, source_entry_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        relationship.id,
        relationship.sourceEntityId,
        relationship.targetEntityId,
        relationship.type,
        relationship.sourceEntryId,
        relationship.createdAt
      );
    },

    /*
     * Purpose: Load only the selected entity's immediate neighbors.
     * Design: Filter by source or target so the graph never loads the whole hairball.
     * Workflow: Called by EntityService.getRelatedEntities for GraphScreen and ContextPane.
     * Data Handoff: Returns Relationship[] used to collect related entity ids.
     */
    async listForEntity(entityId) {
      const rows = await db.getAllAsync<RelationshipRow>(
        `SELECT id, source_entity_id, target_entity_id, type, source_entry_id, created_at
         FROM relationships
         WHERE (source_entity_id = ? OR target_entity_id = ?) AND archived_at IS NULL
         ORDER BY created_at DESC`,
        entityId,
        entityId
      );
      return rows.map(mapRelationship);
    },

    /*
     * Purpose: Remove derived edges that originated from one source entry before re-extraction.
     * Design: Hard-delete regeneratable provenance edges (DEV-2026-08-21-001).
     * Workflow: Called at the start of ExtractionService.processEntry.
     * Data Handoff: Deletes relationships rows with that source_entry_id.
     */
    async deleteForSourceEntry(entryId) {
      await db.runAsync(`DELETE FROM relationships WHERE source_entry_id = ?`, entryId);
    },
  };
}
