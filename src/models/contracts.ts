/*
 * File: contracts.ts
 *
 * Purpose:
 *     Explicit replaceable-provider interfaces used by application services.
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

import type {
  Attachment,
  AuthAccount,
  BackupStatus,
  CapturedImage,
  Entity,
  ExtractedReference,
  GeoLocation,
  LogEntry,
  Relationship,
  SearchHit,
} from '@/models/types';

export interface EntryRepository {
  create(entry: LogEntry): Promise<void>;
  update(entry: LogEntry, previousText: string): Promise<void>;
  getById(id: string): Promise<LogEntry | null>;
  listNewestFirst(): Promise<LogEntry[]>;
}

export interface EntityRepository {
  create(entity: Entity): Promise<void>;
  getById(id: string): Promise<Entity | null>;
  findByName(name: string): Promise<Entity | null>;
  listAll(): Promise<Entity[]>;
  getByIds(ids: string[]): Promise<Entity[]>;
  linkEntry(entryId: string, entityId: string): Promise<void>;
  listForEntry(entryId: string): Promise<Entity[]>;
  listEntriesForEntity(entityId: string): Promise<LogEntry[]>;
}

export interface RelationshipRepository {
  create(relationship: Relationship): Promise<void>;
  listForEntity(entityId: string): Promise<Relationship[]>;
}

export interface AttachmentRepository {
  create(attachment: Attachment): Promise<void>;
  listForEntry(entryId: string): Promise<Attachment[]>;
  listForEntity(entityId: string): Promise<Attachment[]>;
  listAll(): Promise<Attachment[]>;
}

export interface SearchRepository {
  searchEntries(query: string): Promise<SearchHit[]>;
  searchEntities(query: string): Promise<Entity[]>;
}

export interface ImageCaptureSource {
  captureFromCamera(): Promise<CapturedImage | null>;
  pickFromGallery(): Promise<CapturedImage | null>;
  getPermissionStatus(): Promise<{ camera: string; gallery: string }>;
}

export interface AttachmentStorage {
  storeImage(image: CapturedImage, attachmentId: string): Promise<{
    fileUri: string;
    thumbnailUri: string | null;
    mimeType: string;
    width: number | null;
    height: number | null;
    size: number | null;
  }>;
  listManagedFiles(): Promise<{ uri: string; mimeType: string }[]>;
}

export interface LocationProvider {
  getPermissionStatus(): Promise<string>;
  requestCurrentLocation(): Promise<GeoLocation | null>;
}

export interface AuthProvider {
  method: 'email' | 'google';
  getAccount(): Promise<AuthAccount | null>;
  signIn(credentials?: { email: string; password: string }): Promise<AuthAccount>;
  signOut(): Promise<void>;
  isConfigured(): boolean;
}

export interface BackupProvider {
  backupDatabase(): Promise<void>;
  backupAttachments(): Promise<void>;
  getStatus(): Promise<BackupStatus>;
  authorize(): Promise<void>;
  isAuthorized(): Promise<boolean>;
}

export interface ExtractionProvider {
  extract(sourceText: string): ExtractedReference[];
}

export interface NetworkStatusProvider {
  isInternetReachable(): Promise<boolean>;
}
