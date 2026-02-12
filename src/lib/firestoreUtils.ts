import { Timestamp } from 'firebase/firestore';

/**
 * Recursively remove undefined values from an object.
 * Firebase/Firestore does NOT accept `undefined` at any level of a document.
 * This strips undefined from top-level, nested objects, and arrays.
 * Preserves Firestore Timestamps, Dates, and null values.
 */
export const removeUndefinedDeep = (obj: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      cleaned[key] = value
        .filter(item => item !== undefined)
        .map(item => {
          if (item !== null && typeof item === 'object' && !(item instanceof Timestamp) && !(item instanceof Date)) {
            return removeUndefinedDeep(item as Record<string, unknown>);
          }
          return item;
        });
    } else if (value !== null && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date)) {
      cleaned[key] = removeUndefinedDeep(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};
