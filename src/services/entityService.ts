/*
 * File: entityService.ts
 *
 * Purpose:
 *     Application service for entities, related records, and first-degree graph.
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

import type { EntityRepository, RelationshipRepository } from '@/models/contracts';
import type { Entity, EntityNeighborhood, EntityType, LogEntry } from '@/models/types';
import { createId } from '@/utilities/ids';
import { nowMs } from '@/utilities/time';

/*
 * Purpose: Application service for entities, related records, and first-degree graph.
 * Design: Neighborhood depth is 1 to avoid a global hairball; provenance stays on relationships.
 * Workflow: Constructed by createAppServices; used by GraphScreen, EntityScreen, and ContextPane.
 * Data Handoff: Returns Entity, EntityNeighborhood, and history bundles to UI.
 */
export function createEntityService(deps: {
  entities: EntityRepository;
  relationships: RelationshipRepository;
}) {
  return {
    /*
     * Purpose: Create an entity only when the name is new.
     * Design: findByName first so extraction and manual create share one node.
     * Workflow: Available to UI; extraction currently creates via the repository directly after findByName.
     * Data Handoff: Returns the existing or newly inserted Entity.
     */
    async createEntity(name: string, type: EntityType): Promise<Entity> {
      const existing = await deps.entities.findByName(name);
      if (existing) {
        return existing;
      }
      const timestamp = nowMs();
      const entity: Entity = {
        id: createId(),
        name,
        type,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await deps.entities.create(entity);
      return entity;
    },

    async getEntity(id: string): Promise<Entity | null> {
      return deps.entities.getById(id);
    },

    async findEntityByName(name: string): Promise<Entity | null> {
      return deps.entities.findByName(name);
    },

    async listEntities(): Promise<Entity[]> {
      return deps.entities.listAll();
    },

    /*
     * Purpose: Assemble the selected entity plus immediate neighbors.
     * Design: Collect ids from both relationship directions then hydrate; drop the focus id.
     * Workflow: Called when GraphScreen or ContextPane has a selected entityId.
     * Data Handoff: Returns EntityNeighborhood or null for first-degree rendering.
     */
    async getRelatedEntities(entityId: string): Promise<EntityNeighborhood | null> {
      const entity = await deps.entities.getById(entityId);
      if (!entity) {
        return null;
      }
      const relationships = await deps.relationships.listForEntity(entityId);
      const relatedIds = new Set<string>();
      for (const rel of relationships) {
        relatedIds.add(rel.sourceEntityId);
        relatedIds.add(rel.targetEntityId);
      }
      relatedIds.delete(entityId);
      const relatedEntities = await deps.entities.getByIds([...relatedIds]);
      return { entity, relationships, relatedEntities };
    },

    /*
     * Purpose: Provide first/latest mention and associated entries for the entity page.
     * Design: Sort entry timestamps rather than storing denormalized mention fields.
     * Workflow: Called by EntityScreen and AppShell context loading.
     * Data Handoff: Returns entity, entries, and mention timestamps for telemetry labels.
     */
    async getEntityHistory(entityId: string): Promise<{
      entity: Entity;
      entries: LogEntry[];
      firstMention: number | null;
      mostRecentMention: number | null;
    } | null> {
      const entity = await deps.entities.getById(entityId);
      if (!entity) {
        return null;
      }
      const entries = await deps.entities.listEntriesForEntity(entityId);
      const timestamps = entries.map((entry) => entry.createdAt).sort((a, b) => a - b);
      return {
        entity,
        entries,
        firstMention: timestamps[0] ?? entity.createdAt,
        mostRecentMention: timestamps[timestamps.length - 1] ?? entity.updatedAt,
      };
    },

    /*
     * Purpose: List question-typed entities as open questions.
     * Design: Type filter is enough for MVP; there is no resolved flag yet.
     * Workflow: Called for ContextPane OPEN QUESTIONS telemetry.
     * Data Handoff: Returns Entity[] of type question.
     */
    async getOpenQuestions(): Promise<Entity[]> {
      const all = await deps.entities.listAll();
      return all.filter((entity) => entity.type === 'question');
    },

    /*
     * Purpose: List decision-typed entities for the inspector.
     * Design: Same type-filter approach as open questions.
     * Workflow: Called for ContextPane DECISIONS telemetry.
     * Data Handoff: Returns Entity[] of type decision.
     */
    async getDecisions(): Promise<Entity[]> {
      const all = await deps.entities.listAll();
      return all.filter((entity) => entity.type === 'decision');
    },

    async listEntitiesForEntry(entryId: string): Promise<Entity[]> {
      return deps.entities.listForEntry(entryId);
    },
  };
}

export type EntityService = ReturnType<typeof createEntityService>;
