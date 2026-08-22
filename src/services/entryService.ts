/*
 * File: src/services/entryService.ts
 *
 * Purpose:
 *     Application service for creating, updating, and listing log entries.
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
 *     DEV-2026-08-21-001, DEV-2026-08-21-006, DEV-2026-08-21-010
 */

import type { EntryRepository, ProcessingJobRepository } from '@/models/contracts';
import type { CapturedImage, EntrySource, GeoLocation, LogEntry, ProcessingJob } from '@/models/types';
import { recordDiagnostic } from '@/utilities/diagnostics';
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

function newJob(
  entryId: string,
  kind: ProcessingJob['kind'],
  status: ProcessingJob['status'],
  detail: string
): ProcessingJob {
  const timestamp = nowMs();
  return {
    id: createId(),
    entryId,
    kind,
    status,
    detail,
    retryCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
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
  jobs: ProcessingJobRepository;
}) {
  /*
   * Purpose: Persist a processing_jobs row and never throw into capture.
   * Design: Job recording is best-effort; a failed diagnostic write still must not block save.
   * Workflow: Used around attachment copies and extraction.
   * Data Handoff: Writes processing_jobs when the repository accepts the insert.
   */
  async function recordJob(job: ProcessingJob): Promise<void> {
    try {
      await deps.jobs.create(job);
    } catch (error) {
      recordDiagnostic('processing_jobs', error);
    }
  }

  return {
    /*
     * Purpose: Commit a new log entry as the canonical source record.
     * Design: Persist text immediately, then photos and extraction; failures are recorded, not thrown.
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
        const job = newJob(entry.id, 'attachment', 'pending', image.fileName ?? image.uri);
        await recordJob(job);
        try {
          await deps.attachments.addAttachment(entry.id, image);
          await deps.jobs.markSucceeded(job.id);
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Attachment store failed';
          recordDiagnostic('attachment', error);
          try {
            await deps.jobs.markFailed(job.id, detail);
          } catch (jobError) {
            recordDiagnostic('processing_jobs', jobError);
          }
        }
      }

      const extractionJob = newJob(entry.id, 'extraction', 'pending', '');
      await recordJob(extractionJob);
      try {
        await deps.extraction.processEntry(entry);
        await deps.jobs.markSucceeded(extractionJob.id);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Extraction failed';
        recordDiagnostic('extraction', error);
        try {
          await deps.jobs.markFailed(extractionJob.id, detail);
        } catch (jobError) {
          recordDiagnostic('processing_jobs', jobError);
        }
      }

      return entry;
    },

    /*
     * Purpose: Edit source text while keeping revision history.
     * Design: Re-run extraction after update; record extraction errors so the edit still sticks.
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
      const extractionJob = newJob(next.id, 'extraction', 'pending', 're-extract after edit');
      await recordJob(extractionJob);
      try {
        await deps.extraction.processEntry(next);
        await deps.jobs.markSucceeded(extractionJob.id);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Extraction failed';
        recordDiagnostic('extraction', error);
        try {
          await deps.jobs.markFailed(extractionJob.id, detail);
        } catch (jobError) {
          recordDiagnostic('processing_jobs', jobError);
        }
      }
      return next;
    },

    async getEntry(id: string): Promise<LogEntry | null> {
      return deps.entries.getById(id);
    },

    async listEntries(): Promise<LogEntry[]> {
      return deps.entries.listNewestFirst();
    },

    async archiveEntry(id: string): Promise<void> {
      await deps.entries.archive(id);
    },
  };
}

export type EntryService = ReturnType<typeof createEntryService>;
