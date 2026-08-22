/*
 * File: src/utilities/diagnostics.ts
 *
 * Purpose:
 *     Development diagnostics for non-blocking attachment and extraction failures.
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

/*
 * Purpose: Surface a swallowed side-effect error in development without changing production UX.
 * Design: __DEV__ only; persistent state lives in processing_jobs, not in this helper.
 * Workflow: Called from EntryService catch paths after a job row is recorded.
 * Data Handoff: Writes to the console; does not throw.
 */
export function recordDiagnostic(scope: string, error: unknown): void {
  if (__DEV__) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[Captain's Log:${scope}] ${detail}`);
  }
}
