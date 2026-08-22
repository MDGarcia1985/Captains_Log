/*
 * File: src/utilities/fts.ts
 *
 * Purpose:
 *     Build a safe SQLite FTS5 prefix query from typed search text.
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

/*
 * Purpose: Turn typed search text into a safe FTS5 prefix query.
 * Design: Strip MATCH operators so user punctuation cannot break or inject FTS syntax.
 * Workflow: Called by searchEntries and searchEntities before MATCH.
 * Data Handoff: Returns a token* string, or empty when there is nothing to search.
 */
export function toFtsQuery(raw: string): string {
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/["'*(){}[\]:^~]/g, ''))
    .filter((token) => token.length > 0);
  return tokens.map((token) => `${token}*`).join(' ');
}
