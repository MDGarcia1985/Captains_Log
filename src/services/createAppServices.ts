/*
 * File: createAppServices.ts
 *
 * Purpose:
 *     Composition root that wires adapters to application services.
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

import { createFilesystemAttachmentStorage } from '@/adapters/filesystem/attachmentStorage';
import { createExpoImagePicker } from '@/adapters/imagePicker/expoImagePicker';
import { createExpoLocationProvider } from '@/adapters/location/expoLocationProvider';
import { createExpoNetworkStatus } from '@/adapters/network/expoNetwork';
import { createLocalEmailAuthProvider } from '@/adapters/auth/localEmailAuthProvider';
import { createGoogleAuthProvider } from '@/adapters/auth/googleAuthProvider';
import { createGoogleDriveBackupProvider } from '@/adapters/googleDrive/googleDriveBackupProvider';
import { createDeterministicExtractionProvider } from '@/adapters/extraction/deterministicExtraction';
import { createEntryRepository } from '@/adapters/sqlite/entryRepository';
import { createEntityRepository } from '@/adapters/sqlite/entityRepository';
import { createRelationshipRepository } from '@/adapters/sqlite/relationshipRepository';
import { createAttachmentRepository } from '@/adapters/sqlite/attachmentRepository';
import { createSearchRepository } from '@/adapters/sqlite/searchRepository';
import { createSettingsStore } from '@/adapters/sqlite/settingsStore';
import { createAttachmentService } from '@/services/attachmentService';
import { createAuthService } from '@/services/authService';
import { createBackupService } from '@/services/backupService';
import { createEntityService } from '@/services/entityService';
import { createEntryService } from '@/services/entryService';
import { createExtractionService } from '@/services/extractionService';
import { createLocationService } from '@/services/locationService';
import { createSearchService } from '@/services/searchService';
import { createSettingsService } from '@/services/settingsService';

/*
 * Purpose: Wire adapters to services so UI depends on one composed object.
 * Design: Manual composition instead of a plugin registry; each adapter is constructed once per database.
 * Workflow: Called after openArchiveDatabase in AppServicesProvider.
 * Data Handoff: Returns AppServices placed on React context for screens.
 */
export function createAppServices(db: SQLiteDatabase) {
  const entries = createEntryRepository(db);
  const entities = createEntityRepository(db);
  const relationships = createRelationshipRepository(db);
  const attachments = createAttachmentRepository(db);
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
  });
  const backupProvider = createGoogleDriveBackupProvider({
    db,
    settings: settingsStore,
    attachments: storage,
    network,
  });

  return {
    entries: entryService,
    entities: createEntityService({ entities, relationships }),
    attachments: attachmentService,
    search: createSearchService(search),
    settings: createSettingsService(settingsStore),
    auth: createAuthService({
      email: createLocalEmailAuthProvider(),
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
