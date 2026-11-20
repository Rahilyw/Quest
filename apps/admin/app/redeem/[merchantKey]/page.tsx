import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { RedeemForm } from './RedeemForm'

export const dynamic = 'force-dynamic'

export default async function RedeemPage({ params }: { params: Promise<{ merchantKey: string }> }) {
  const { merchantKey } = await params
  if (!/^[a-f0-9]{48}$/.test(merchantKey)) notFound()

  const { data, error } = await supabaseAdmin
    .from('sponsors')
    .select('name')
    .eq('merchant_key', merchantKey)
    .maybeSingle()

  if (error || !data) notFound()

  return (
    <main
      style={{
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
        padding: '28px 20px 48px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div className="brand-wordmark" style={{ fontSize: 28, marginBottom: 8 }}>Quest!</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.3, margin: '0 0 20px' }}>
          Redeem a code
        </h1>
        <RedeemForm merchantKey={merchantKey} sponsorName={data.name} />
      </div>
    </main>
  )
}
