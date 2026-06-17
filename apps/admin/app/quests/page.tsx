'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Quest {
  id: string
  title: string
  category: string
  xp_reward: number
  is_sponsored: boolean
  sponsor_name: string | null
  status: string
}

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', category: 'fitness', lat: '', lng: '',
    radius_meters: '300', xp_reward: '100', is_sponsored: false,
    sponsor_name: '', sponsor_reward: '',
  })

  useEffect(() => {
    supabase.from('quests').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setQuests((data as Quest[]) ?? []))
  }, [])

  async function handleCreate() {
    const { data } = await supabase.from('quests').insert({
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      radius_meters: parseInt(form.radius_meters),
      xp_reward: parseInt(form.xp_reward),
    }).select().single()
    if (data) setQuests((prev) => [data as Quest, ...prev])
    setShowForm(false)
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === 'active' ? 'inactive' : 'active'
    await supabase.from('quests').update({ status: next }).eq('id', id)
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, status: next } : q)))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Quests ({quests.length})</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontWeight: 700 }}
        >
          + New Quest
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#1E293B', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ marginBottom: 16 }}>Create Quest</h2>
          {[
            ['title', 'Title'], ['description', 'Description'], ['lat', 'Latitude'],
            ['lng', 'Longitude'], ['xp_reward', 'XP Reward'], ['radius_meters', 'Radius (m)'],
          ].map(([key, label]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <label style={{ color: '#64748B', fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</label>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', background: '#0F172A', color: '#F1F5F9', border: '1px solid #334155', borderRadius: 8, padding: 10 }}
              />
            </div>
          ))}
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            style={{ background: '#0F172A', color: '#F1F5F9', border: '1px solid #334155', borderRadius: 8, padding: 10, marginBottom: 16, width: '100%' }}
          >
            {['fitness', 'social', 'food', 'community', 'nature'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            style={{ background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontWeight: 700 }}
          >
            Create
          </button>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#64748B', textAlign: 'left', borderBottom: '1px solid #1E293B' }}>
            <th style={{ padding: '12px 16px' }}>Title</th>
            <th style={{ padding: '12px 16px' }}>Category</th>
            <th style={{ padding: '12px 16px' }}>XP</th>
            <th style={{ padding: '12px 16px' }}>Sponsored</th>
            <th style={{ padding: '12px 16px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {quests.map((q) => (
            <tr key={q.id} style={{ borderBottom: '1px solid #1E293B' }}>
              <td style={{ padding: '12px 16px' }}>{q.title}</td>
              <td style={{ padding: '12px 16px', color: '#64748B' }}>{q.category}</td>
              <td style={{ padding: '12px 16px', color: '#6366F1' }}>{q.xp_reward}</td>
              <td style={{ padding: '12px 16px' }}>{q.is_sponsored ? `⭐ ${q.sponsor_name}` : '—'}</td>
              <td style={{ padding: '12px 16px' }}>
                <button
                  onClick={() => toggleStatus(q.id, q.status)}
                  style={{
                    background: q.status === 'active' ? '#22C55E22' : '#64748B22',
                    color: q.status === 'active' ? '#22C55E' : '#64748B',
                    border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontWeight: 700,
                  }}
                >
                  {q.status}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
