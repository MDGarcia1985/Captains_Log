/*
 * File: src/services/extractionService.ts
 *
 * Purpose:
 *     Apply derived extraction after an entry is already saved.
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
 *     DEV-2026-08-21-001
 */

import type { EntityRepository, ExtractionProvider, RelationshipRepository } from '@/models/contracts';
import type { Entity, LogEntry } from '@/models/types';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';

/*
 * Purpose: Apply derived entities after an entry is already saved.
 * Design: Clear prior derived links for this source entry, then recreate from current text.
 * Workflow: Invoked by EntryService after create/update.
 * Data Handoff: Writes entities, entry_entities, and pairwise relates_to relationships with source_entry_id.
 */
export function createExtractionService(deps: {
  extraction: ExtractionProvider;
  entities: EntityRepository;
  relationships: RelationshipRepository;
}) {
  return {
    /*
     * Purpose: Turn extracted references into graph nodes and first-degree edges.
     * Design: Idempotent: delete this entry's derived links/edges first so edits cannot duplicate the graph.
     * Workflow: Receives a saved LogEntry; uses ExtractionProvider.extract on sourceText.
     * Data Handoff: Mutates entity/relationship tables consumed by EntityService and GraphScreen.
     */
    async processEntry(entry: LogEntry): Promise<void> {
      await deps.relationships.deleteForSourceEntry(entry.id);
      await deps.entities.unlinkAllForEntry(entry.id);

      const refs = deps.extraction.extract(entry.sourceText);
      const entities: Entity[] = [];

      for (const ref of refs) {
        let entity = await deps.entities.findByName(ref.name);
        if (!entity) {
          const timestamp = nowMs();
          entity = {
            id: createId(),
            name: ref.name,
            type: ref.type,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          await deps.entities.create(entity);
        }
        await deps.entities.linkEntry(entry.id, entity.id);
        entities.push(entity);
      }

      for (let i = 0; i < entities.length; i += 1) {
        for (let j = i + 1; j < entities.length; j += 1) {
          await deps.relationships.create({
            id: createId(),
            sourceEntityId: entities[i].id,
            targetEntityId: entities[j].id,
            type: 'relates_to',
            sourceEntryId: entry.id,
            createdAt: nowMs(),
          });
        }
      }
    },
  };
}

export type ExtractionService = ReturnType<typeof createExtractionService>;
