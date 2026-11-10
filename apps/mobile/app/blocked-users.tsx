import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { supabase } from '@/lib/supabase'
import { track } from '@/lib/analytics'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'

interface BlockedRow {
  blocked_id: string
  profile: { username: string; avatar_url: string | null; level: number } | null
}

export default function BlockedUsersScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { unblockUser } = useBlockedUsers(profile?.id)
  const [rows, setRows] = useState<BlockedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('blocked_users')
      .select('blocked_id, profile:profiles!blocked_users_blocked_id_fkey(username, avatar_url, level)')
      .eq('blocker_id', profile.id)
      .order('created_at', { ascending: false })
    setRows(((data ?? []) as unknown as BlockedRow[]).filter((r) => r.profile))
    setLoading(false)
  }, [profile?.id])

  useEffect(() => {
    load()
  }, [load])

  async function handleUnblock(row: BlockedRow) {
    setBusyId(row.blocked_id)
    const result = await unblockUser(row.blocked_id)
    setBusyId(null)
    if (!result.ok) {
      Alert.alert('Could not unblock user', result.error)
      return
    }
    track('user_unblocked', { source: 'settings' })
    setRows((prev) => prev.filter((r) => r.blocked_id !== row.blocked_id))
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.back, { top: insets.top + 12, left: SPACING.lg }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <View style={styles.backPill}>
          <Text style={styles.backText}>←</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Blocked accounts</Text>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: insets.top + 120 }} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.blocked_id}
          contentContainerStyle={[styles.list, { paddingTop: insets.top + 64 }]}
          ListEmptyComponent={
            <EmptyState
              title="No blocked accounts"
              subtitle="People you block from a post or profile show up here."
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Avatar username={item.profile!.username} uri={item.profile!.avatar_url} size={40} />
              <View style={styles.rowInfo}>
                <Text style={styles.username} numberOfLines={1}>
                  @{item.profile!.username}
                </Text>
                <Text style={styles.level}>LV {item.profile!.level}</Text>
              </View>
              <TouchableOpacity
                style={[styles.unblockBtn, busyId === item.blocked_id && styles.unblockBtnBusy]}
                onPress={() => handleUnblock(item)}
                disabled={busyId === item.blocked_id}
                accessibilityRole="button"
                accessibilityLabel={`Unblock ${item.profile!.username}`}
              >
                <Text style={styles.unblockText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  back: { position: 'absolute', zIndex: 10 },
  backPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  backText: { fontSize: 20, fontWeight: '700', lineHeight: 28, color: COLORS.accent },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9,
  },
  list: { padding: SPACING.md, paddingBottom: 80 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  username: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  level: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  unblockBtn: {
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    minHeight: 36,
    justifyContent: 'center',
  },
  unblockBtnBusy: { opacity: 0.5 },
  unblockText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
})
