/**
 * Supabase embeds a to-one relation as an object, but the generated-less client
 * types it as a possibly-array — normalize to the first row (or null).
 */
export function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}
