/*
 * File: exportService.ts
 * Purpose: Explicit safe placeholder for portable export mechanics not yet approved.
 * Author: Codex; Contact: michael@mandedesign.studio
 * License: SPDX-License-Identifier: MPL-2.0
 * Decision: DEV-2026-09-07-025; related DEV-2026-09-07-023
 */
/* Purpose: Report the unimplemented Export action without producing a fake success.
 * Design: No dependencies, archive reads, filesystem writes or outbound sharing.
 * Workflow: Export dock action. Data Handoff: Typed outcome for a dismissible notice.
 * Deferred: Michael defines formats/scope/destinations under DEV-2026-09-07-025. */
export function requestExport() {
  return {
    status: 'not_implemented' as const,
    message: 'Export is not implemented yet. No file has been created or shared. Export formats and destinations will be added in a future release.',
  };
}
