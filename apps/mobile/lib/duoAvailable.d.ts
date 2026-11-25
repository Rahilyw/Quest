export function interpretDuoProbeError(
  error: { message?: string; code?: string; details?: string; hint?: string } | null | undefined,
): boolean

/** Accepts a Supabase-like client; `limit` may return a thenable builder. */
export function probeDuoAvailable(client: {
  from: (table: string) => {
    select: (cols: string) => {
      limit: (n: number) => PromiseLike<{ error: unknown }>
    }
  }
}): Promise<boolean>
