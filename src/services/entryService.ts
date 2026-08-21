/*
 * File: entryService.ts
 *
 * Purpose:
 *     Application service for creating, updating, and listing log entries.
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

import type { EntryRepository } from '@/models/contracts';
import type { CapturedImage, EntrySource, GeoLocation, LogEntry } from '@/models/types';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';
import type { AttachmentService } from '@/services/attachmentService';
import type { ExtractionService } from '@/services/extractionService';

export interface CreateEntryInput {
  sourceText: string;
  location?: GeoLocation | null;
  source?: EntrySource;
  images?: CapturedImage[];
}

/*
 * Purpose: Expose entry create/update/list as the UI and future YA contract.
 * Design: Save the source entry first; attachments and extraction cannot roll it back.
 * Workflow: Constructed by createAppServices; called from CaptureScreen and LogScreen.
 * Data Handoff: Returns LogEntry objects to screens; persists via repositories.
 */
export function createEntryService(deps: {
  entries: EntryRepository;
  attachments: AttachmentService;
  extraction: ExtractionService;
}) {
  return {
    /*
     * Purpose: Commit a new log entry as the canonical source record.
     * Design: Persist text immediately, then best-effort photos and extraction so a failed derivative never blocks capture.
     * Workflow: Called from CaptureScreen.commit with draft text, images, and optional location.
     * Data Handoff: Writes SQLite via EntryRepository and returns the saved LogEntry to dismiss/refresh the log.
     */
    async createEntry(input: CreateEntryInput): Promise<LogEntry> {
      const timestamp = nowMs();
      const entry: LogEntry = {
        id: createId(),
        sourceText: input.sourceText,
        createdAt: timestamp,
        updatedAt: timestamp,
        location: input.location ?? null,
        source: input.source ?? 'capture',
      };
      await deps.entries.create(entry);

      for (const image of input.images ?? []) {
        try {
          await deps.attachments.addAttachment(entry.id, image);
        } catch {
          // Original capture is already saved; a failed copy must not roll back the entry.
        }
      }

      try {
        await deps.extraction.processEntry(entry);
      } catch {
        // Derived interpretation is regeneratable and must never block save.
      }

      return entry;
    },

    /*
     * Purpose: Edit source text while keeping revision history.
     * Design: Re-run extraction after update; ignore extraction errors so the edit still sticks.
     * Workflow: Intended for future inline edit; currently available on the service contract.
     * Data Handoff: Returns the updated LogEntry or null if the id does not exist.
     */
    async updateEntry(id: string, sourceText: string): Promise<LogEntry | null> {
      const current = await deps.entries.getById(id);
      if (!current) {
        return null;
      }
      const next: LogEntry = {
        ...current,
        sourceText,
        updatedAt: nowMs(),
      };
      await deps.entries.update(next, current.sourceText);
      try {
        await deps.extraction.processEntry(next);
      } catch {
        // Keep the edited source even if extraction fails.
      }
      return next;
    },

    async getEntry(id: string): Promise<LogEntry | null> {
      return deps.entries.getById(id);
    },

    async listEntries(): Promise<LogEntry[]> {
      return deps.entries.listNewestFirst();
    },
  };
}

export type EntryService = ReturnType<typeof createEntryService>;
