import { withSupabase } from 'npm:@supabase/server'

/**
 * snapshot-ranks edge function
 *
 * Reads the current leaderboard view (ordered by weekly_xp DESC) and writes
 * each user's current rank position into profiles.last_week_rank.
 *
 * Intended to be called every Monday (via a cron or pg_cron job) so that the
 * leaderboard screen can show rank deltas vs the previous week.
 *
 * Authentication: requires service-role secret (auth: 'secret').
 */
export default {
  fetch: withSupabase({ auth: 'secret' }, async (_req, ctx) => {
    // Fetch the full leaderboard ordered by weekly_xp descending.
    const { data: rows, error } = await ctx.supabaseAdmin
      .from('leaderboard')
      .select('user_id')
      .order('weekly_xp', { ascending: false })

    if (error) {
      console.error('Failed to fetch leaderboard:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return Response.json({ ok: true, snapshotted: 0 })
    }

    // Build an array of updates — one per user with their 1-indexed rank.
    const updates = rows.map((row: { user_id: string }, index: number) => ({
      id: row.user_id,
      last_week_rank: index + 1,
    }))

    // Upsert all rank values in a single call.
    const { error: upsertError } = await ctx.supabaseAdmin
      .from('profiles')
      .upsert(updates, { onConflict: 'id' })

    if (upsertError) {
      console.error('Failed to upsert last_week_rank:', upsertError)
      return Response.json({ error: upsertError.message }, { status: 500 })
    }

    return Response.json({ ok: true, snapshotted: updates.length })
  }),
}
