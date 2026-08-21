/*
 * File: searchService.ts
 *
 * Purpose:
 *     Deterministic local search over entries and entities.
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

import type { SearchRepository } from '@/models/contracts';

/*
 * Purpose: Keep SearchScreen free of FTS details.
 * Design: Thin pass-through; query sanitization lives in the repository.
 * Workflow: Constructed by createAppServices; called as the user types.
 * Data Handoff: Returns SearchHit[] and Entity[] to SearchScreen.
 */
export function createSearchService(search: SearchRepository) {
  return {
    searchEntries(query: string) {
      return search.searchEntries(query);
    },
    searchEntities(query: string) {
      return search.searchEntities(query);
    },
  };
}

export type SearchService = ReturnType<typeof createSearchService>;
