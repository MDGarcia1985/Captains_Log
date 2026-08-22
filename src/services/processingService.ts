/*
 * File: src/services/processingService.ts
 *
 * Purpose:
 *     Expose recorded side-effect job failures and extraction retry.
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
 *
 * Related Decisions:
 *     DEV-2026-08-21-010
 */

import type { EntryRepository, ProcessingJobRepository } from '@/models/contracts';
import type { ProcessingJob } from '@/models/types';
import { recordDiagnostic } from '@/utilities/diagnostics';
import type { ExtractionService } from '@/services/extractionService';

/*
 * Purpose: Let Settings inspect and retry failed non-blocking jobs.
 * Design: Extraction can retry from source text; attachment retry is not possible without original bytes.
 * Workflow: Constructed by createAppServices; used by SettingsScreen.
 * Data Handoff: Returns ProcessingJob[] and updates job rows after retry attempts.
 */
export function createProcessingService(deps: {
  jobs: ProcessingJobRepository;
  entries: EntryRepository;
  extraction: ExtractionService;
}) {
  return {
    listFailed(): Promise<ProcessingJob[]> {
      return deps.jobs.listFailed();
    },

    /*
     * Purpose: Re-run failed extraction jobs without blocking capture.
     * Design: Increment retry_count via markFailed/markSucceeded; skip attachment jobs.
     * Workflow: Fired from Settings "Retry failed extraction".
     * Data Handoff: Updates processing_jobs; may write derived graph rows.
     */
    async retryFailedExtraction(): Promise<number> {
      const failed = await deps.jobs.listFailed();
      let retried = 0;
      for (const job of failed) {
        if (job.kind !== 'extraction') {
          continue;
        }
        const entry = await deps.entries.getById(job.entryId);
        if (!entry) {
          await deps.jobs.markFailed(job.id, 'Entry missing or archived; cannot retry extraction');
          continue;
        }
        try {
          await deps.extraction.processEntry(entry);
          await deps.jobs.markSucceeded(job.id);
          retried += 1;
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Extraction retry failed';
          recordDiagnostic('extraction.retry', error);
          await deps.jobs.markFailed(job.id, detail);
        }
      }
      return retried;
    },
  };
}

export type ProcessingService = ReturnType<typeof createProcessingService>;
