/*
 * File: types.ts
 *
 * Purpose:
 *     Shared domain types for log entries, entities, relationships,
 *     attachments, and application settings.
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

export const ENTITY_TYPES = [
  'person',
  'project',
  'organization',
  'hardware',
  'software',
  'idea',
  'decision',
  'problem',
  'question',
  'experiment',
  'artifact',
  'place',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const RELATIONSHIP_TYPES = [
  'mentions',
  'relates_to',
  'belongs_to',
  'depends_on',
  'supports',
  'contradicts',
  'supersedes',
  'derived_from',
  'documents',
  'depicts',
  'contains',
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export type Handedness = 'left' | 'right';

export type LayoutMode = 'compact' | 'medium' | 'expanded';

export type EntrySource = 'capture' | 'share' | 'import';

export type BackupState =
  | 'current'
  | 'pending'
  | 'failed'
  | 'unauthorized'
  | 'not_configured'
  | 'offline';

export type ProcessingKind = 'extraction' | 'attachment';

export type ProcessingStatus = 'pending' | 'succeeded' | 'failed';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface LogEntry {
  id: string;
  sourceText: string;
  createdAt: number;
  updatedAt: number;
  location: GeoLocation | null;
  source: EntrySource;
}

export interface EntryRevision {
  id: string;
  entryId: string;
  sourceText: string;
  createdAt: number;
}

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  createdAt: number;
  updatedAt: number;
}

export interface EntryEntityLink {
  entryId: string;
  entityId: string;
}

export interface Relationship {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationshipType;
  sourceEntryId: string;
  createdAt: number;
}

export interface Attachment {
  id: string;
  entryId: string;
  fileUri: string;
  thumbnailUri: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  size: number | null;
  createdAt: number;
  role: string | null;
}

export interface SearchHit {
  entry: LogEntry;
  snippet: string;
  entities: Entity[];
}

export interface EntityNeighborhood {
  entity: Entity;
  relationships: Relationship[];
  relatedEntities: Entity[];
}

export interface CapturedImage {
  uri: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  fileName: string | null;
}

export interface AuthAccount {
  identifier: string;
  method: 'local_archive' | 'google';
}

export interface ProcessingJob {
  id: string;
  entryId: string;
  kind: ProcessingKind;
  status: ProcessingStatus;
  detail: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BackupSnapshot {
  id: string;
  createdAt: number;
  label: string;
  attachmentCount: number;
}

export interface RestoreVerification {
  databaseOk: boolean;
  integrityCheck: string;
  requiredTablesPresent: boolean;
  attachmentRows: number;
  attachmentFilesPresent: number;
  missingAttachmentIds: string[];
}

export interface RestoredArchivePayload {
  databaseBytes: Uint8Array;
  files: RestoredAttachmentFile[];
}

export interface RestoredAttachmentFile {
  attachmentId: string;
  fileName: string;
  bytes: Uint8Array;
}

export interface BackupStatus {
  localArchive: 'active';
  lastBackupAt: number | null;
  state: BackupState;
  detail: string;
}

export interface AppSettings {
  handedness: Handedness;
  skin: 'starship';
  lastBackupAt: number | null;
  lastBackupState: BackupState;
  lastBackupDetail: string;
}

export interface ExtractedReference {
  name: string;
  type: EntityType;
  relationshipType: RelationshipType;
}
