import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  authorizeWebhook,
  deliverSocialPush,
  type NotificationRecord,
  type SocialPushDeps,
} from '../_shared/socialPush.ts'

/**
 * send-social-push edge function
 *
 * Called by a Database Webhook on INSERT into `notifications` (migration 029).
 * Sends an Expo push for comment / reply / follow rows; likes stay inbox-only.
 *
 * Logic lives in `_shared/socialPush.ts` so Deno tests can inject fetch + deps.
 */

function depsFromAdmin(admin: SupabaseClient): SocialPushDeps {
  return {
    async getRecipient(id) {
      const { data } = await admin
        .from('profiles')
        .select('push_token, push_social')
        .eq('id', id)
        .maybeSingle()
      return data as { push_token: string | null; push_social: boolean | null } | null
    },
    async getActor(id) {
      const { data } = await admin.from('profiles').select('username').eq('id', id).maybeSingle()
      return data as { username: string } | null
    },
    async getComment(id) {
      const { data } = await admin
        .from('completion_comments')
        .select('body, hidden')
        .eq('id', id)
        .maybeSingle()
      return data as { body: string | null; hidden: boolean } | null
    },
    async countRecentPushes(recipientId, sinceIso) {
      const { count } = await admin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', recipientId)
        .gte('pushed_at', sinceIso)
      return count ?? 0
    },
    async clearPushToken(userId) {
      await admin.from('profiles').update({ push_token: null }).eq('id', userId)
    },
    async markPushed(notificationId) {
      await admin
        .from('notifications')
        .update({ pushed_at: new Date().toISOString() })
        .eq('id', notificationId)
    },
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('SOCIAL_PUSH_WEBHOOK_SECRET')
  if (!authorizeWebhook(req, secret)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const payload = await req.json().catch(() => null)
  const record = payload?.record as NotificationRecord | undefined
  if (payload?.type !== 'INSERT' || !record?.id) {
    return Response.json({ ok: true, skipped: 'not an insert' })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  return deliverSocialPush(record, depsFromAdmin(admin))
})
