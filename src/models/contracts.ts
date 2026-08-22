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
  BackupSnapshot,
  BackupStatus,
  CapturedImage,
  Entity,
  ExtractedReference,
  GeoLocation,
  LogEntry,
  ProcessingJob,
  Relationship,
  RestoreVerification,
  RestoredArchivePayload,
  RestoredAttachmentFile,
  SearchHit,
} from '@/models/types';

export interface EntryRepository {
  create(entry: LogEntry): Promise<void>;
  update(entry: LogEntry, previousText: string): Promise<void>;
  getById(id: string): Promise<LogEntry | null>;
  listNewestFirst(): Promise<LogEntry[]>;
  archive(id: string): Promise<void>;
}

export interface EntityRepository {
  create(entity: Entity): Promise<void>;
  getById(id: string): Promise<Entity | null>;
  findByName(name: string): Promise<Entity | null>;
  listAll(): Promise<Entity[]>;
  getByIds(ids: string[]): Promise<Entity[]>;
  linkEntry(entryId: string, entityId: string): Promise<void>;
  unlinkAllForEntry(entryId: string): Promise<void>;
  listForEntry(entryId: string): Promise<Entity[]>;
  listEntriesForEntity(entityId: string): Promise<LogEntry[]>;
}

export interface RelationshipRepository {
  create(relationship: Relationship): Promise<void>;
  listForEntity(entityId: string): Promise<Relationship[]>;
  deleteForSourceEntry(entryId: string): Promise<void>;
}

export interface ProcessingJobRepository {
  create(job: ProcessingJob): Promise<void>;
  markSucceeded(id: string): Promise<void>;
  markFailed(id: string, detail: string): Promise<void>;
  listFailed(): Promise<ProcessingJob[]>;
  getById(id: string): Promise<ProcessingJob | null>;
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
  listManagedFiles(): Promise<{ uri: string; mimeType: string; attachmentId: string; fileName: string }[]>;
  readFileBytes(uri: string): Promise<Uint8Array>;
  replaceAllManagedFiles(files: RestoredAttachmentFile[]): Promise<void>;
  fileExists(uri: string): Promise<boolean>;
  managedUri(attachmentId: string, fileName: string): string;
}

export interface LocationProvider {
  getPermissionStatus(): Promise<string>;
  requestCurrentLocation(): Promise<GeoLocation | null>;
}

export interface AuthProvider {
  method: 'local_archive' | 'google';
  getAccount(): Promise<AuthAccount | null>;
  signIn(credentials?: { identifier: string; password: string }): Promise<AuthAccount>;
  signOut(): Promise<void>;
  isConfigured(): boolean;
}

export interface BackupProvider {
  backup(): Promise<void>;
  getStatus(): Promise<BackupStatus>;
  authorize(): Promise<void>;
  isAuthorized(): Promise<boolean>;
  listBackups(): Promise<BackupSnapshot[]>;
  restoreBackup(snapshotId: string): Promise<RestoreVerification>;
}

export interface ArchiveRuntime {
  installRestoredArchive(payload: RestoredArchivePayload): Promise<RestoreVerification>;
}

export interface ExtractionProvider {
  extract(sourceText: string): ExtractedReference[];
}

export interface NetworkStatusProvider {
  isInternetReachable(): Promise<boolean>;
}
