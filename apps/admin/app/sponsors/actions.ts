'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

/** One unguessable link per sponsor name. Creating it twice returns the same link. */
export async function ensureSponsorLink(name: string): Promise<{ ok: true; merchantKey: string } | { ok: false; error: string }> {
  await requireAdmin()
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 80) return { ok: false, error: 'That sponsor name is missing.' }

  const { data: quest, error: questError } = await supabaseAdmin
    .from('quests')
    .select('id')
    .eq('is_sponsored', true)
    .eq('sponsor_name', trimmed)
    .limit(1)
    .maybeSingle()
  if (questError) return { ok: false, error: questError.message }
  if (!quest) return { ok: false, error: 'No sponsored quest uses that name.' }

  const exact = trimmed.replace(/[%_\\]/g, '\\$&')
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('sponsors')
    .select('merchant_key')
    .ilike('name', exact)
    .maybeSingle()
  if (existingError) return { ok: false, error: existingError.message }
  if (existing?.merchant_key) return { ok: true, merchantKey: existing.merchant_key }

  const merchantKey = randomBytes(24).toString('hex')
  const { error } = await supabaseAdmin.from('sponsors').insert({ name: trimmed, merchant_key: merchantKey })
  if (error) {
    const { data: raced } = await supabaseAdmin
      .from('sponsors')
      .select('merchant_key')
      .ilike('name', exact)
      .maybeSingle()
    if (raced?.merchant_key) return { ok: true, merchantKey: raced.merchant_key }
    return { ok: false, error: error.message }
  }

  revalidatePath('/sponsors')
  return { ok: true, merchantKey }
}
