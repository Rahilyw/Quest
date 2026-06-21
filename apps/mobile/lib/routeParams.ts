/** Normalize expo-router dynamic params that may arrive as string | string[]. */
export function paramAsString(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}
