/*
 * File: mappers.ts
 *
 * Purpose:
 *     Map SQLite row shapes onto domain types.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

import type { Attachment, Entity, EntityType, LogEntry, Relationship, RelationshipType } from '@/models/types';

export interface EntryRow {
  id: string;
  source_text: string;
  created_at: number;
  updated_at: number;
  latitude: number | null;
  longitude: number | null;
  source: LogEntry['source'];
}

export interface EntityRow {
  id: string;
  name: string;
  type: string;
  created_at: number;
  updated_at: number;
}

export interface RelationshipRow {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  type: string;
  source_entry_id: string;
  created_at: number;
}

export interface AttachmentRow {
  id: string;
  entry_id: string;
  file_uri: string;
  thumbnail_uri: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  created_at: number;
  role: string | null;
}

/*
 * Purpose: Convert an entries row into the domain LogEntry used above SQLite.
 * Design: Location is present only when both coordinates exist so partial GPS rows cannot leak invalid points.
 * Workflow: Called by entry and search repositories after SELECT.
 * Data Handoff: Returns a LogEntry for services and UI.
 */
export function mapEntry(row: EntryRow): LogEntry {
  const hasLocation = row.latitude != null && row.longitude != null;
  return {
    id: row.id,
    sourceText: row.source_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: hasLocation
      ? { latitude: row.latitude as number, longitude: row.longitude as number }
      : null,
    source: row.source,
  };
}

/*
 * Purpose: Convert an entities row into the domain Entity type.
 * Design: Cast the stored type string to EntityType at the repository boundary, not in UI.
 * Workflow: Called after entity SELECT and join queries.
 * Data Handoff: Returns an Entity for graph, search, and entity views.
 */
export function mapEntity(row: EntityRow): Entity {
  return {
    id: row.id,
    name: row.name,
    type: row.type as EntityType,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/*
 * Purpose: Convert a relationships row into the provenance-bearing domain object.
 * Design: Keep sourceEntryId in the mapped object so graph UI can show why a link exists.
 * Workflow: Called by RelationshipRepository.listForEntity.
 * Data Handoff: Returns a Relationship for EntityService first-degree neighborhoods.
 */
export function mapRelationship(row: RelationshipRow): Relationship {
  return {
    id: row.id,
    sourceEntityId: row.source_entity_id,
    targetEntityId: row.target_entity_id,
    type: row.type as RelationshipType,
    sourceEntryId: row.source_entry_id,
    createdAt: row.created_at,
  };
}

/*
 * Purpose: Convert an attachments row into domain Attachment metadata.
 * Design: Default a missing MIME type so image views always have a type string.
 * Workflow: Called after attachment SELECT queries.
 * Data Handoff: Returns an Attachment for PhotoStrip/EntryCard rendering.
 */
export function mapAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    entryId: row.entry_id,
    fileUri: row.file_uri,
    thumbnailUri: row.thumbnail_uri,
    mimeType: row.mime_type ?? 'application/octet-stream',
    width: row.width,
    height: row.height,
    size: row.size,
    createdAt: row.created_at,
    role: row.role,
  };
}
