'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Completion {
  id: string
  photo_url: string
  lat: number
  lng: number
  completed_at: string
  status: string
  user_id: string
  quest_id: string
  profiles: { username: string } | null
  quests: { title: string; xp_reward: number } | null
}

export default function CompletionsQueue() {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPending()
  }, [])

  async function fetchPending() {
    const { data } = await supabase
      .from('completions')
      .select('*, profiles(username), quests(title, xp_reward)')
      .eq('status', 'pending')
      .order('completed_at', { ascending: true })
    setCompletions((data as Completion[]) ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await supabase
      .from('completions')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    setCompletions((prev) => prev.filter((c) => c.id !== id))
  }

  if (loading) return <p style={{ color: '#64748B' }}>Loading…</p>

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>
        Completions Queue ({completions.length} pending)
      </h1>

      {completions.length === 0 && (
        <p style={{ color: '#64748B' }}>All caught up! No pending submissions.</p>
      )}

      <div style={{ display: 'grid', gap: 16 }}>
        {completions.map((c) => (
          <div key={c.id} style={{ background: '#1E293B', borderRadius: 16, padding: 20, display: 'flex', gap: 20 }}>
            <a href={c.photo_url} target="_blank" rel="noreferrer">
              <img src={c.photo_url} alt="proof" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12 }} />
            </a>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                {c.quests?.title ?? 'Unknown quest'}
              </div>
              <div style={{ color: '#64748B', marginBottom: 4 }}>by @{c.profiles?.username}</div>
              <div style={{ color: '#64748B', fontSize: 13, marginBottom: 4 }}>
                {new Date(c.completed_at).toLocaleString()} · {c.quests?.xp_reward} XP
              </div>
              <div style={{ color: '#64748B', fontSize: 12 }}>
                GPS: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => updateStatus(c.id, 'approved')}
                style={{ background: '#22C55E', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}
              >
                Approve
              </button>
              <button
                onClick={() => updateStatus(c.id, 'rejected')}
                style={{ background: '#EF4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
