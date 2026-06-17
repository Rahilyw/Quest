// Supabase Edge Function: generate-redemption-code
// Generates a unique 8-char code on first call, marks it redeemed on second call.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

serve(async (req) => {
  const { completion_id, action } = await req.json()
  // action: 'generate' | 'redeem'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: completion } = await supabase
    .from('completions')
    .select('*')
    .eq('id', completion_id)
    .single()

  if (!completion) {
    return new Response(JSON.stringify({ error: 'Completion not found' }), { status: 404 })
  }

  if (action === 'generate') {
    if (completion.redemption_code) {
      return new Response(JSON.stringify({ code: completion.redemption_code }))
    }
    const code = generateCode()
    await supabase
      .from('completions')
      .update({ redemption_code: code })
      .eq('id', completion_id)

    return new Response(JSON.stringify({ code }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (action === 'redeem') {
    if (!completion.redemption_code) {
      return new Response(JSON.stringify({ error: 'No code to redeem' }), { status: 400 })
    }
    // Mark as redeemed by nulling the code (single-use)
    await supabase
      .from('completions')
      .update({ redemption_code: null })
      .eq('id', completion_id)

    return new Response(JSON.stringify({ ok: true, message: 'Redeemed!' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400 })
})
