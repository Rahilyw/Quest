// Supabase Edge Function: award-xp
// Called when an admin approves a completion.
// Updates the user's total_xp and level, then checks for new badge unlocks.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { completion_id } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: completion } = await supabase
    .from('completions')
    .select('*, quest:quests(xp_reward)')
    .eq('id', completion_id)
    .single()

  if (!completion) {
    return new Response(JSON.stringify({ error: 'Completion not found' }), { status: 404 })
  }

  // XP is awarded automatically by the DB trigger on_completion_approved.
  // This function is a hook for future badge-check logic.
  // Extend here when badge unlocks need server-side evaluation.

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
