/*
 * File: attachmentRepository.ts
 *
 * Purpose:
 *     Persist attachment metadata in SQLite.
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

import type { AttachmentRepository } from '@/models/contracts';
import { mapAttachment, type AttachmentRow } from '@/adapters/sqlite/mappers';

/*
 * Purpose: Bind attachment metadata SQL to one database connection.
 * Design: Files live in managed storage; this table only stores URIs and dimensions.
 * Workflow: Constructed by createAppServices for AttachmentService.
 * Data Handoff: Returns an AttachmentRepository for create/list operations.
 */
export function createAttachmentRepository(db: SQLiteDatabase): AttachmentRepository {
  return {
    /*
     * Purpose: Record metadata after a file has been copied into app storage.
     * Design: Role stays nullable so capture never requires photo categorization.
     * Workflow: Called by AttachmentService.addAttachment after filesystem storeImage.
     * Data Handoff: Writes attachments rows consumed by log and entity photo strips.
     */
    async create(attachment) {
      await db.runAsync(
        `INSERT INTO attachments
          (id, entry_id, file_uri, thumbnail_uri, mime_type, width, height, size, created_at, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        attachment.id,
        attachment.entryId,
        attachment.fileUri,
        attachment.thumbnailUri,
        attachment.mimeType,
        attachment.width,
        attachment.height,
        attachment.size,
        attachment.createdAt,
        attachment.role
      );
    },

    /*
     * Purpose: Load photos belonging to one log entry.
     * Design: Oldest-first so capture order is preserved in the strip.
     * Workflow: Called by LogScreen and EntryScreen via AttachmentService.getAttachments.
     * Data Handoff: Returns Attachment[] for EntryCard image URIs.
     */
    async listForEntry(entryId) {
      const rows = await db.getAllAsync<AttachmentRow>(
        `SELECT id, entry_id, file_uri, thumbnail_uri, mime_type, width, height, size, created_at, role
         FROM attachments WHERE entry_id = ? ORDER BY created_at ASC`,
        entryId
      );
      return rows.map(mapAttachment);
    },

    /*
     * Purpose: Show photos associated with an entity through its linked entries.
     * Design: Join entry_entities rather than duplicating entity ids on attachments.
     * Workflow: Called by ContextPane and EntityScreen via getAttachmentsForEntity.
     * Data Handoff: Returns Attachment[] for entity inspectors.
     */
    async listForEntity(entityId) {
      const rows = await db.getAllAsync<AttachmentRow>(
        `SELECT a.id, a.entry_id, a.file_uri, a.thumbnail_uri, a.mime_type, a.width, a.height, a.size, a.created_at, a.role
         FROM attachments a
         INNER JOIN entry_entities x ON x.entry_id = a.entry_id
         WHERE x.entity_id = ?
         ORDER BY a.created_at DESC`,
        entityId
      );
      return rows.map(mapAttachment);
    },

    /*
     * Purpose: Enumerate all attachment metadata if a full listing is needed.
     * Design: Newest first for diagnostics; file bytes still come from the filesystem adapter.
     * Workflow: Available to services; backup uses filesystem listManagedFiles instead.
     * Data Handoff: Returns Attachment[] mapped from SQLite.
     */
    async listAll() {
      const rows = await db.getAllAsync<AttachmentRow>(
        `SELECT id, entry_id, file_uri, thumbnail_uri, mime_type, width, height, size, created_at, role
         FROM attachments ORDER BY created_at DESC`
      );
      return rows.map(mapAttachment);
    },
  };
}
