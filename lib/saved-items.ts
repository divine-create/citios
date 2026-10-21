/**
 * Canonical entity types that can be saved by a resident.
 * Stored in `SavedItem.entityType`; resolved by `getResolvedSavedItems`.
 * (`service_org` is a separate "like" namespace owned by the services vertical.)
 */
export const SAVED_ENTITY_TYPES = ['biz', 'product', 'job', 'event', 'place', 'stay'] as const;

export type SavedEntityType = (typeof SAVED_ENTITY_TYPES)[number];

export function isSavedEntityType(value: string): value is SavedEntityType {
  return (SAVED_ENTITY_TYPES as readonly string[]).includes(value);
}

export function savedKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}
