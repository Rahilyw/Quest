'use server'

import { supabaseAdmin } from '@/lib/supabase'

export type RedeemResult =
  | { result: 'valid'; title: string; reward: string | null; level: number | null }
  | { result: 'used' | 'redeemed'; title: string; reward: string | null; level: number | null; redeemed_at: string }
  | { result: 'invalid' | 'limited' | 'error' }

function asResult(data: unknown): RedeemResult {
  if (!data || typeof data !== 'object') return { result: 'error' }
  const row = data as Record<string, unknown>
  const result = row.result
  if (result === 'invalid' || result === 'limited') return { result }
  if (result !== 'valid' && result !== 'used' && result !== 'redeemed') return { result: 'error' }
  const title = typeof row.title === 'string' ? row.title : 'Quest'
  const reward = typeof row.reward === 'string' ? row.reward : null
  const level = typeof row.level === 'number' ? row.level : null
  if (result === 'valid') return { result, title, reward, level }
  const redeemedAt = typeof row.redeemed_at === 'string' ? row.redeemed_at : ''
  if (!redeemedAt) return { result: 'error' }
  return { result, title, reward, level, redeemed_at: redeemedAt }
}

async function callRedeem(fn: 'lookup_redemption' | 'mark_redemption', merchantKey: string, code: string) {
  if (!/^[a-f0-9]{48}$/.test(merchantKey)) return { result: 'invalid' } as const
  const { data, error } = await supabaseAdmin.rpc(fn, {
    p_merchant_key: merchantKey,
    p_code: code,
  })
  if (error) return { result: 'error' } as const
  return asResult(data)
}

/** Public. The unguessable merchant key is the only credential. */
export async function lookupRedemption(merchantKey: string, code: string): Promise<RedeemResult> {
  return callRedeem('lookup_redemption', merchantKey, code)
}

/** Public and idempotent. A second tap returns the original redeemed time. */
export async function markRedemption(merchantKey: string, code: string): Promise<RedeemResult> {
  return callRedeem('mark_redemption', merchantKey, code)
}
