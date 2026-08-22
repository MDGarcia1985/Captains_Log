/*
 * File: deterministicExtraction.ts
 *
 * Purpose:
 *     Derive entity references from source text without blocking capture.
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

import type { ExtractionProvider } from '@/models/contracts';
import type { EntityType, ExtractedReference } from '@/models/types';
import { ENTITY_TYPES } from '@/models/types';

const TYPE_SET = new Set<string>(ENTITY_TYPES);

/*
 * Purpose: Provide a non-AI ExtractionProvider for MVP graph seeding.
 * Design: Only explicit [[wiki]], @person, and #project markup; empty or failed extract must not block save.
 * Workflow: Constructed by createAppServices and invoked by ExtractionService after the entry is stored.
 * Data Handoff: Returns ExtractedReference[] for entity create/link and pairwise relates_to edges.
 */
export function createDeterministicExtractionProvider(): ExtractionProvider {
  return {
    /*
     * Purpose: Parse explicit references out of source text.
     * Design: Deduplicate by type:name lowercase so @Ada and [[person:Ada]] become one entity.
     * Workflow: Receives saved entry.sourceText from ExtractionService.processEntry.
     * Data Handoff: Returns unique ExtractedReference objects; never throws on ordinary text.
     */
    extract(sourceText) {
      const found = new Map<string, ExtractedReference>();

      for (const match of sourceText.matchAll(/\[\[([^\[\]]+)\]\]/g)) {
        const inner = match[1]?.trim();
        if (!inner) {
          continue;
        }
        const colon = inner.indexOf(':');
        let type: EntityType = 'idea';
        let name = inner;
        if (colon > 0) {
          const maybeType = inner.slice(0, colon).trim().toLowerCase();
          const maybeName = inner.slice(colon + 1).trim();
          if (TYPE_SET.has(maybeType) && maybeName) {
            type = maybeType as EntityType;
            name = maybeName;
          }
        }
        found.set(`${type}:${name.toLowerCase()}`, {
          name,
          type,
          relationshipType: 'mentions',
        });
      }

      for (const match of sourceText.matchAll(/(^|[^\w])@([A-Za-z][\w.-]*)/g)) {
        const name = match[2];
        if (name) {
          found.set(`person:${name.toLowerCase()}`, {
            name,
            type: 'person',
            relationshipType: 'mentions',
          });
        }
      }

      for (const match of sourceText.matchAll(/(^|[^\w])#([A-Za-z][\w.-]*)/g)) {
        const name = match[2];
        if (name) {
          found.set(`project:${name.toLowerCase()}`, {
            name,
            type: 'project',
            relationshipType: 'mentions',
          });
        }
      }

      return [...found.values()];
    },
  };
}
