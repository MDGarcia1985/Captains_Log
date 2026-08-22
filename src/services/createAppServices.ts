/*
 * File: src/services/createAppServices.ts
 *
 * Purpose:
 *     Composition root that wires adapters to application services.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 *
 * Related Decisions:
 *     DEV-2026-08-21-011
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { createFilesystemAttachmentStorage } from '@/adapters/filesystem/attachmentStorage';
import { createExpoImagePicker } from '@/adapters/imagePicker/expoImagePicker';
import { createExpoLocationProvider } from '@/adapters/location/expoLocationProvider';
import { createExpoNetworkStatus } from '@/adapters/network/expoNetwork';
import { createLocalArchiveCredentialProvider } from '@/adapters/auth/localArchiveCredentialProvider';
import { createGoogleAuthProvider } from '@/adapters/auth/googleAuthProvider';
import { createGoogleDriveBackupProvider } from '@/adapters/googleDrive/googleDriveBackupProvider';
import { createDeterministicExtractionProvider } from '@/adapters/extraction/deterministicExtraction';
import { createEntryRepository } from '@/adapters/sqlite/entryRepository';
import { createEntityRepository } from '@/adapters/sqlite/entityRepository';
import { createRelationshipRepository } from '@/adapters/sqlite/relationshipRepository';
import { createAttachmentRepository } from '@/adapters/sqlite/attachmentRepository';
import { createProcessingJobRepository } from '@/adapters/sqlite/processingJobRepository';
import { createSearchRepository } from '@/adapters/sqlite/searchRepository';
import { createSettingsStore } from '@/adapters/sqlite/settingsStore';
import { createAttachmentService } from '@/services/attachmentService';
import { createAuthService } from '@/services/authService';
import { createBackupService } from '@/services/backupService';
import { createEntityService } from '@/services/entityService';
import { createEntryService } from '@/services/entryService';
import { createExtractionService } from '@/services/extractionService';
import { createLocationService } from '@/services/locationService';
import { createProcessingService } from '@/services/processingService';
import { createSearchService } from '@/services/searchService';
import { createSettingsService } from '@/services/settingsService';
import type { ArchiveRuntime } from '@/models/contracts';

export interface AppCompositionRuntime extends ArchiveRuntime {
  getDb: () => SQLiteDatabase;
}

/*
 * Purpose: Wire adapters to services so UI depends on one composed object.
 * Design: Manual composition instead of a plugin registry; each adapter is constructed once per database.
 * Workflow: Called after openArchiveDatabase in AppServicesProvider.
 * Data Handoff: Returns AppServices placed on React context for screens.
 */
export function createAppServices(db: SQLiteDatabase, runtime: AppCompositionRuntime) {
  const entries = createEntryRepository(db);
  const entities = createEntityRepository(db);
  const relationships = createRelationshipRepository(db);
  const attachments = createAttachmentRepository(db);
  const jobs = createProcessingJobRepository(db);
  const search = createSearchRepository(db);
  const settingsStore = createSettingsStore(db);
  const storage = createFilesystemAttachmentStorage();
  const capture = createExpoImagePicker();
  const location = createExpoLocationProvider();
  const network = createExpoNetworkStatus();
  const extractionProvider = createDeterministicExtractionProvider();

  const extraction = createExtractionService({
    extraction: extractionProvider,
    entities,
    relationships,
  });
  const attachmentService = createAttachmentService({
    attachments,
    storage,
    capture,
  });
  const entryService = createEntryService({
    entries,
    attachments: attachmentService,
    extraction,
    jobs,
  });
  const backupProvider = createGoogleDriveBackupProvider({
    getDb: runtime.getDb,
    settings: settingsStore,
    attachments: storage,
    network,
    runtime,
  });

  return {
    entries: entryService,
    entities: createEntityService({ entities, relationships }),
    attachments: attachmentService,
    search: createSearchService(search),
    settings: createSettingsService(settingsStore),
    processing: createProcessingService({ jobs, entries, extraction }),
    auth: createAuthService({
      localArchive: createLocalArchiveCredentialProvider(),
      google: createGoogleAuthProvider(),
    }),
    backup: createBackupService({
      provider: backupProvider,
      settings: settingsStore,
      network,
    }),
    location: createLocationService(location),
    network,
  };
}

export type AppServices = ReturnType<typeof createAppServices>;
