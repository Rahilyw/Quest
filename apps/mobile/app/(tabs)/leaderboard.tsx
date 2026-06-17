import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { LeaderboardEntry } from '@/lib/types'

export default function Leaderboard() {
  const { profile } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('leaderboard')
      .select('*')
      .order('weekly_xp', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setEntries((data ?? []).map((e, i) => ({ ...e, rank: i + 1 })))
        setLoading(false)
      })
  }, [])

  const myEntry = entries.find((e) => e.user_id === profile?.id)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Season 1 · Resets Monday</Text>
      </View>

      {myEntry && (
        <View style={styles.myRank}>
          <Text style={styles.myRankText}>Your rank: #{myEntry.rank}</Text>
          <Text style={styles.myRankXp}>{myEntry.weekly_xp} XP this week</Text>
        </View>
      )}

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item }) => (
            <View style={[styles.row, item.user_id === profile?.id && styles.rowHighlight]}>
              <Text style={styles.rank}>#{item.rank}</Text>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.xp}>{item.weekly_xp} XP</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { color: '#64748B', marginTop: 4 },
  myRank: {
    backgroundColor: '#312E81',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  myRankText: { color: '#A5B4FC', fontWeight: '700' },
  myRankXp: { color: '#6366F1', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  rowHighlight: { backgroundColor: '#1E1B4B' },
  rank: { color: '#64748B', width: 36, fontWeight: '700' },
  username: { flex: 1, color: '#F1F5F9', fontWeight: '600' },
  xp: { color: '#6366F1', fontWeight: '700' },
  loading: { color: '#64748B', textAlign: 'center', marginTop: 40 },
})
