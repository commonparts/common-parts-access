/**
 * Returns a shallow copy of `value` without `key`. Used to drop a column read
 * for a server-side check (an owner id, for instance) before a row is sent to
 * the client.
 */
export function omitKey<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy: Partial<T> = { ...value }
  delete copy[key]
  // Cast: `copy` holds every key of T but `key`, which Partial<T> cannot say.
  return copy as Omit<T, K>
}
