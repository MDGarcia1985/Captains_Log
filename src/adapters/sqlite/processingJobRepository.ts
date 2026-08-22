/*
 * File: src/adapters/sqlite/processingJobRepository.ts
 *
 * Purpose:
 *     Persist non-blocking attachment and extraction job state.
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
 *     DEV-2026-08-21-010
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import type { ProcessingJobRepository } from '@/models/contracts';
import type { ProcessingJob, ProcessingKind, ProcessingStatus } from '@/models/types';

interface JobRow {
  id: string;
  entry_id: string;
  kind: string;
  status: string;
  detail: string;
  retry_count: number;
  created_at: number;
  updated_at: number;
}

/*
 * Purpose: Map a processing_jobs row to the domain job object.
 * Design: Cast stored kind/status at the repository edge.
 * Workflow: Used after SELECT in listFailed and getById.
 * Data Handoff: Returns a ProcessingJob for Settings and retry.
 */
function mapJob(row: JobRow): ProcessingJob {
  return {
    id: row.id,
    entryId: row.entry_id,
    kind: row.kind as ProcessingKind,
    status: row.status as ProcessingStatus,
    detail: row.detail,
    retryCount: row.retry_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/*
 * Purpose: Bind processing job SQL to one database connection.
 * Design: Jobs are diagnostic state, not canonical log content.
 * Workflow: Constructed by createAppServices for EntryService and ProcessingService.
 * Data Handoff: Returns a ProcessingJobRepository.
 */
export function createProcessingJobRepository(db: SQLiteDatabase): ProcessingJobRepository {
  return {
    async create(job) {
      await db.runAsync(
        `INSERT INTO processing_jobs
          (id, entry_id, kind, status, detail, retry_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        job.id,
        job.entryId,
        job.kind,
        job.status,
        job.detail,
        job.retryCount,
        job.createdAt,
        job.updatedAt
      );
    },

    async markSucceeded(id) {
      await db.runAsync(
        `UPDATE processing_jobs
         SET status = 'succeeded', detail = '', updated_at = ?
         WHERE id = ?`,
        Date.now(),
        id
      );
    },

    async markFailed(id, detail) {
      await db.runAsync(
        `UPDATE processing_jobs
         SET status = 'failed', detail = ?, retry_count = retry_count + 1, updated_at = ?
         WHERE id = ?`,
        detail,
        Date.now(),
        id
      );
    },

    async listFailed() {
      const rows = await db.getAllAsync<JobRow>(
        `SELECT id, entry_id, kind, status, detail, retry_count, created_at, updated_at
         FROM processing_jobs
         WHERE status = 'failed'
         ORDER BY updated_at DESC
         LIMIT 50`
      );
      return rows.map(mapJob);
    },

    async getById(id) {
      const row = await db.getFirstAsync<JobRow>(
        `SELECT id, entry_id, kind, status, detail, retry_count, created_at, updated_at
         FROM processing_jobs WHERE id = ?`,
        id
      );
      return row ? mapJob(row) : null;
    },
  };
}
