import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  authorizeWebhook,
  drainPushOutbox,
  MAX_ATTEMPTS,
  type PushOutboxAdmin,
} from '../_shared/pushOutbox.ts'

/**
 * send-push-outbox
 *
 * Drains `push_outbox` (034, bookkeeping from 041). Rows come from
 * enqueue_weekly_drop() (034), enqueue_week_recap() (041) and the admin when a
 * suggestion goes live (035).
 *
 * Callers, both with header `x-webhook-secret` = DROP_PUSH_WEBHOOK_SECRET
 * (verify_jwt is off):
 *   - pg_cron every 5 minutes through invoke_push_outbox_drain() (041), which
 *     only calls when there are rows to claim;
 *   - optionally the Database Webhook on INSERT into `weekly_drop_sends`.
 *
 * Logic lives in `_shared/pushOutbox.ts` so Deno tests can inject fetch + client.
 */

Deno.serve(async (req) => {
  const secret = Deno.env.get('DROP_PUSH_WEBHOOK_SECRET')
  if (!authorizeWebhook(req, secret)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  ) as unknown as PushOutboxAdmin

  const started = Date.now()
  const result = await drainPushOutbox(admin)

  console.log('[send-push-outbox]', JSON.stringify({
    batches: result.batches,
    pushed: result.pushed,
    skipped: result.skipped,
    failed: result.failed,
    dead_tokens: result.dead_tokens,
    stop: result.stop,
    ms: Date.now() - started,
    max_attempts: MAX_ATTEMPTS,
  }))

  const body = {
    ok: result.ok,
    batches: result.batches,
    pushed: result.pushed,
    skipped: result.skipped,
    failed: result.failed,
    dead_tokens: result.dead_tokens,
    stop: result.stop,
  }
  if (result.stop === 'claim_failed') {
    return Response.json({ ...body, error: 'claim failed' }, { status: 500 })
  }
  return Response.json(body)
})
