/*
 * File: extractionService.ts
 *
 * Purpose:
 *     Apply derived extraction after an entry is already saved.
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

import type { EntityRepository, ExtractionProvider, RelationshipRepository } from '@/models/contracts';
import type { Entity, LogEntry } from '@/models/types';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';

/*
 * Purpose: Apply derived entities after an entry is already saved.
 * Design: Source content stays authoritative; this layer is regeneratable and must not throw into createEntry.
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
     * Design: Link each entity to the entry; create relates_to pairs instead of self-loops so the graph is useful.
     * Workflow: Receives a saved LogEntry; uses ExtractionProvider.extract on sourceText.
     * Data Handoff: Mutates entity/relationship tables consumed by EntityService and GraphScreen.
     */
    async processEntry(entry: LogEntry): Promise<void> {
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

      // Pairwise relates_to keeps first-degree graph useful without self-loops.
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
