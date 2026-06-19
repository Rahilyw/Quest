import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { useAuth } from '@/hooks/useAuth'
import { SectionHeader } from '@/components/SectionHeader'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { registerForPushNotifications, clearPushToken } from '@/lib/notifications'

const WEEKLY_DIGEST_KEY = 'pref_weekly_digest'

export default function Settings(): JSX.Element {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session, profile, signOut } = useAuth()
  const [questNearby, setQuestNearby] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    // Derive questNearby from actual push token presence
    supabase
      .from('profiles')
      .select('push_token')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setQuestNearby(!!data?.push_token)
      })

    // Restore weekly digest preference
    AsyncStorage.getItem(WEEKLY_DIGEST_KEY).then((val) => {
      if (val !== null) setWeeklyDigest(val === 'true')
    })
  }, [session?.user?.id])

  async function handleQuestNearbyToggle(enabled: boolean) {
    if (!session?.user?.id) return
    if (enabled) {
      const token = await registerForPushNotifications(session.user.id)
      // Permission was denied — registerForPushNotifications returns null
      setQuestNearby(token !== null)
    } else {
      await clearPushToken(session.user.id)
      setQuestNearby(false)
    }
  }

  async function handleWeeklyDigestToggle(enabled: boolean) {
    setWeeklyDigest(enabled)
    await AsyncStorage.setItem(WEEKLY_DIGEST_KEY, String(enabled))
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/sign-in')
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.back, { top: insets.top + 12, left: SPACING.lg }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <View style={styles.backPill}>
          <Text style={[styles.backText, { color: COLORS.accent }]}>←</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Settings</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
      >
        {/* ACCOUNT */}
        <SectionHeader title="Account" />
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {session?.user?.email ?? ''}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {profile?.username ? '@' + profile.username : ''}
            </Text>
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>City</Text>
            <Text style={styles.rowValue} numberOfLines={1}>
              {profile?.city ?? ''}
            </Text>
          </View>
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader title="Notifications" />
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Quest Nearby</Text>
            <Switch
              value={questNearby}
              onValueChange={handleQuestNearbyToggle}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#CBD5E1', true: COLORS.accent }}
              ios_backgroundColor="#CBD5E1"
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <Text style={styles.rowLabel}>Weekly Digest</Text>
            <Switch
              value={weeklyDigest}
              onValueChange={handleWeeklyDigestToggle}
              thumbColor="#FFFFFF"
              trackColor={{ false: '#CBD5E1', true: COLORS.accent }}
              ios_backgroundColor="#CBD5E1"
            />
          </View>
        </View>

        {/* ABOUT */}
        <SectionHeader title="About" />
        <View style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.rowBorder]}
            activeOpacity={0.7}
            onPress={() => {}}
          >
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* DANGER ZONE */}
        <SectionHeader title="Danger Zone" />
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.signOutRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backText: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
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
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: 80 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  rowLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '500' },
  rowValue: {
    color: COLORS.textMuted,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  signOutRow: { height: 52, alignItems: 'center', justifyContent: 'center' },
  signOutText: { color: '#EF4444', fontSize: 15, fontWeight: '600' },
})
