export declare const COMPLETION_COLUMNS: string[]
export declare const COMPLETIONS_DEFAULT_LIMIT: number
export declare const COMPLETIONS_MAX_LIMIT: number
export declare function clampCompletionsLimit(limit: unknown): number

export interface SponsorExportSummary {
  title: string
  sponsor_name: string | null
  sponsor_reward: string | null
  total: number
  approved: number
  pending: number
  rejected: number
  issued: number
  redeemed: number
  lastRedemption: string
}
export declare function summariseSponsoredQuest(quest: {
  title: string
  sponsor_name?: string | null
  sponsor_reward?: string | null
  completions?: Array<{
    status: string
    redemption_code?: string | null
    redeemed_at?: string | null
  }> | null
}): SponsorExportSummary

export declare function canGrantStickerByHand(
  sticker: { unlock_rule?: string | null; quest_id?: string | null; is_active?: boolean | null } | null | undefined
): boolean
