/*
 * File: time.ts
 *
 * Purpose:
 *     Timestamp helpers for storage and chronological grouping.
 *
 * Author:
 *     Michael Garcia
 *
 * Contact:
 *     michael@mandedesign.studio
 *
 * License:
 *     SPDX-License-Identifier: MPL-2.0
 */

export function nowMs(): number {
  return Date.now();
}

/*
 * Purpose: Collapse a timestamp onto the local calendar day for log grouping.
 * Design: Mutate a Date to 00:00:00 local rather than UTC so entries follow the user's day boundary.
 * Workflow: Called by the chronological log when sectioning rows from EntryService.listEntries.
 * Data Handoff: Returns epoch milliseconds used as SectionList section keys.
 */
export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/*
 * Purpose: Render a human-readable day heading above log sections.
 * Design: Use the device locale instead of a fixed format so dates remain readable on phone and tablet.
 * Workflow: Receives a local-day epoch from startOfLocalDay in LogScreen.
 * Data Handoff: Returns a short weekday/date string for section headers.
 */
export function formatDayHeading(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/*
 * Purpose: Render a 24-hour clock for entry timestamps and telemetry.
 * Design: hour12 false keeps the starship telemetry look consistent across locales that would otherwise use AM/PM.
 * Workflow: Called from entry cards, entity views, and backup status labels.
 * Data Handoff: Returns HH:MM text for UI labels.
 */
export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/*
 * Purpose: Show last-backup time or an explicit NEVER state.
 * Design: Treat null as NEVER so telemetry never invents a fake timestamp.
 * Workflow: Called by AppShell and Settings after BackupService.getStatus.
 * Data Handoff: Returns a clock string or NEVER for telemetry strips.
 */
export function formatTelemetryTime(timestamp: number | null): string {
  if (timestamp == null) {
    return 'NEVER';
  }
  return formatClock(timestamp);
}
