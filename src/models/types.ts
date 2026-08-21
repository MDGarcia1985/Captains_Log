/*
 * File: types.ts
 *
 * Purpose:
 *     Shared domain types for log entries, entities, relationships,
 *     attachments, and application settings.
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
  email: string;
  method: 'email' | 'google';
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
