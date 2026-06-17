import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { XPBar } from '@/components/XPBar'
import { BadgeGrid } from '@/components/BadgeGrid'
import type { UserBadge } from '@/lib/types'

export default function Profile() {
  const { profile, signOut } = useAuth()
  const [badges, setBadges] = useState<UserBadge[]>([])
  const [completionCount, setCompletionCount] = useState(0)

  useEffect(() => {
    if (!profile) return

    supabase
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', profile.id)
      .then(({ data }) => setBadges(data ?? []))

    supabase
      .from('completions')
      .select('id', { count: 'exact' })
      .eq('user_id', profile.id)
      .eq('status', 'approved')
      .then(({ count }) => setCompletionCount(count ?? 0))
  }, [profile])

  if (!profile) return null

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.username[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.city}>{profile.city}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completionCount}</Text>
          <Text style={styles.statLabel}>Quests</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{profile.total_xp}</Text>
          <Text style={styles.statLabel}>Total XP</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>Lv {profile.level}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
      </View>

      <XPBar totalXp={profile.total_xp} />

      <Text style={styles.sectionTitle}>Badges</Text>
      <BadgeGrid badges={badges} />

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingBottom: 100 },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  username: { color: '#F1F5F9', fontSize: 20, fontWeight: '700' },
  city: { color: '#64748B', marginTop: 4 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, marginHorizontal: 16, backgroundColor: '#1E293B', borderRadius: 16, marginBottom: 20 },
  stat: { alignItems: 'center' },
  statValue: { color: '#6366F1', fontSize: 22, fontWeight: '800' },
  statLabel: { color: '#64748B', marginTop: 4 },
  sectionTitle: { color: '#F1F5F9', fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
  signOut: { margin: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  signOutText: { color: '#64748B', fontWeight: '600' },
})
