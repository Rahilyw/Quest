import { redemptionStats } from '@quest/geofence'
import { supabaseAdmin } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import ExportButton from './ExportButton'
import { MerchantLink } from './MerchantLink'

export const revalidate = 60

interface SponsoredCompletion {
  id: string
  status: string
  redemption_code: string | null
  redeemed_at: string | null
}

interface SponsoredQuest {
  id: string
  title: string
  sponsor_name: string | null
  sponsor_reward: string | null
  completions: SponsoredCompletion[] | null
}

function statsFor(quests: SponsoredQuest[]) {
  return redemptionStats(quests.flatMap((quest) => quest.completions ?? []))
}

function victoriaTime(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default async function SponsorsPage() {
  const { data: sponsored } = await supabaseAdmin
    .from('quests')
    .select('id, title, sponsor_name, sponsor_reward, completions(id, status, redemption_code, redeemed_at)')
    .eq('is_sponsored', true)
    .order('created_at', { ascending: false })

  const quests = (sponsored ?? []) as SponsoredQuest[]
  const { data: sponsorRows, error: sponsorError } = await supabaseAdmin
    .from('sponsors')
    .select('name, merchant_key')
  const merchantKeys = new Map(
    (sponsorRows ?? []).map((row) => [String(row.name).trim().toLowerCase(), String(row.merchant_key)]),
  )

  const groups = new Map<string, SponsoredQuest[]>()
  for (const quest of quests) {
    const name = quest.sponsor_name?.trim() || 'Unnamed sponsor'
    const list = groups.get(name) ?? []
    list.push(quest)
    groups.set(name, list)
  }

  return (
    <div>
      <h1 className="admin-page-title">Sponsors</h1>
      <p className="admin-page-sub">
        Sponsored quest performance. The merchant link is the counter login: no account, and it only sees that sponsor’s codes.
      </p>
      {sponsorError ? (
        <p style={{ color: theme.danger }}>Merchant links need migration 036 on this database.</p>
      ) : null}

      {quests.length === 0 && (
        <div className="admin-card" style={{ padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No sponsored quests yet. Create one in Quests → New Quest.
        </div>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {Array.from(groups.entries()).map(([name, sponsorQuests]) => {
          const redemption = statsFor(sponsorQuests)
          return (
            <section key={name} className="admin-card" style={{ padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{name}</div>
              <div style={{ color: theme.textMuted, marginTop: 4, fontSize: 14 }}>
                {redemption.issued} codes issued · {redemption.redeemed} redeemed · {redemption.rate}% · last{' '}
                {redemption.last ? victoriaTime(redemption.last) : 'none yet'}
              </div>
              {name !== 'Unnamed sponsor' && !sponsorError ? (
                <div style={{ marginTop: 12, marginBottom: 16 }}>
                  <MerchantLink name={name} merchantKey={merchantKeys.get(name.trim().toLowerCase()) ?? null} />
                </div>
              ) : null}
              <div style={{ display: 'grid', gap: 12 }}>
                {sponsorQuests.map((quest) => {
                  const total = quest.completions?.length ?? 0
                  const approved = quest.completions?.filter((row) => row.status === 'approved').length ?? 0
                  const questStats = statsFor([quest])
                  return (
                    <div key={quest.id} style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{quest.title}</div>
                          <div style={{ color: theme.textMuted, marginTop: 4 }}>Reward: {quest.sponsor_reward}</div>
                          <div style={{ color: theme.textMuted, marginTop: 4, fontSize: 13 }}>
                            {questStats.issued} issued · {questStats.redeemed} redeemed
                          </div>
                          <ExportButton quest={quest} />
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 28, fontWeight: 800, color: theme.success }}>{approved}</div>
                          <div style={{ color: theme.textMuted, fontSize: 12 }}>completions</div>
                          <div style={{ color: theme.textMuted, fontSize: 12, marginTop: 4 }}>{total} submitted</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
