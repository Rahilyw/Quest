import { useState, useEffect } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Application from 'expo-application'
import { useAuth } from '@/hooks/useAuth'
import { Row, ScreenHeader, Section, SwitchRow } from '@/components/ui/Screen'
import { BodyStrong, Small } from '@/components/ui/Text'
import { LEGAL_URLS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { registerForPushNotifications, clearPushToken } from '@/lib/notifications'
import { track, resetAnalytics } from '@/lib/analytics'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

const WEEKLY_DIGEST_KEY = 'pref_weekly_digest'

export default function Settings() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { session, profile, signOut } = useAuth()
  const [questNearby, setQuestNearby] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)
  const [feedPublic, setFeedPublic] = useState(true)
  const [pushSocial, setPushSocial] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    // Whether a push token is stored for this account. The token itself is not
    // readable by clients (migration 039), so ask for a yes/no instead.
    supabase.rpc('own_push_enabled').then(({ data, error }) => {
      if (!error) setQuestNearby(data === true)
    })

    supabase
      .from('profiles')
      .select('feed_public, push_social, push_drops')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.feed_public != null) setFeedPublic(data.feed_public)
        if (data?.push_social != null) setPushSocial(data.push_social)
        if (data?.push_drops != null) setWeeklyDigest(data.push_drops)
      })

    // Restore weekly digest preference
    AsyncStorage.getItem(WEEKLY_DIGEST_KEY).then((val) => {
      if (val !== null) setWeeklyDigest(val === 'true')
    })
  }, [session?.user?.id])

  const notSaved = () => setNote('That change didn’t save. Check your signal and try again.')

  async function handleQuestNearbyToggle(enabled: boolean) {
    if (!session?.user?.id) return
    setNote(null)
    if (enabled) {
      const token = await registerForPushNotifications(session.user.id)
      // Permission was denied: registerForPushNotifications returns null
      setQuestNearby(token !== null)
      if (token === null) setNote('Notifications are off for Quest! in your phone’s settings. Turn them on there first.')
    } else {
      await clearPushToken(session.user.id)
      setQuestNearby(false)
    }
  }

  async function handleWeeklyDigestToggle(enabled: boolean) {
    if (!session?.user?.id) return
    setNote(null)
    setWeeklyDigest(enabled)
    await AsyncStorage.setItem(WEEKLY_DIGEST_KEY, String(enabled))
    const { error } = await supabase
      .from('profiles')
      .update({ push_drops: enabled })
      .eq('id', session.user.id)
    if (error) {
      setWeeklyDigest(!enabled)
      notSaved()
    }
  }

  async function handlePushSocialToggle(enabled: boolean) {
    if (!session?.user?.id) return
    setNote(null)
    setPushSocial(enabled)
    const { error } = await supabase
      .from('profiles')
      .update({ push_social: enabled })
      .eq('id', session.user.id)
    if (error) {
      setPushSocial(!enabled)
      notSaved()
    }
  }

  async function handleFeedPublicToggle(enabled: boolean) {
    if (!session?.user?.id) return
    setNote(null)
    setFeedPublic(enabled)
    const { error } = await supabase
      .from('profiles')
      .update({ feed_public: enabled })
      .eq('id', session.user.id)
    if (error) {
      setFeedPublic(!enabled)
      notSaved()
    }
  }

  async function handleSignOut() {
    await signOut()
    router.replace('/(auth)/sign-in')
  }

  function confirmDeleteAccount() {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your profile, XP, badges, streaks and proof photos. It can’t be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: handleDeleteAccount },
      ]
    )
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      track('account_deleted')
      const { error } = await supabase.rpc('delete_own_account')
      if (error) throw error
      resetAnalytics()
      // The auth user no longer exists, so a global sign-out would 403:
      // clear the local session only.
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      router.replace('/(auth)/sign-in')
    } catch {
      setDeleting(false)
      Alert.alert(
        'Your account wasn’t deleted',
        'Check your connection and try again.'
      )
    }
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE.s4, paddingBottom: insets.bottom + SPACE.s8 }}
      >
        {note ? (
          <View style={styles.note} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <Small>{note}</Small>
          </View>
        ) : null}

        <Section title="Account" style={styles.firstSection}>
          <Row first label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <Row label="Username" value={profile?.username ? `@${profile.username}` : ''} />
          <Row label="Email" value={session?.user?.email ?? ''} />
          <Row label="City" value={profile?.city ?? ''} />
        </Section>

        <Section title="Notifications">
          <SwitchRow
            first
            label="Quest alerts"
            hint="Push notifications from Quest! on this phone."
            value={questNearby}
            onValueChange={handleQuestNearbyToggle}
          />
          <SwitchRow
            label="Comments and followers"
            hint="When someone comments, replies or follows you. Everything still shows in Activity."
            value={pushSocial}
            onValueChange={handlePushSocialToggle}
          />
          <SwitchRow
            label="Monday drop"
            hint="Monday morning, when new quests land in Victoria."
            value={weeklyDigest}
            onValueChange={handleWeeklyDigestToggle}
          />
        </Section>

        <Section title="Privacy">
          <SwitchRow
            first
            label="Show my photos on City"
            hint="When off, your proof photos stay on your profile and off the public feed."
            value={feedPublic}
            onValueChange={handleFeedPublicToggle}
          />
          <Row label="Blocked accounts" onPress={() => router.push('/blocked-users')} />
        </Section>

        <Section title="About">
          <Row first label="Terms of service" onPress={() => router.push('/legal/terms')} />
          <Row label="Privacy policy" onPress={() => router.push('/legal/privacy')} />
          <Row
            label="Privacy policy on the web"
            icon="open-outline"
            accessibilityRole="link"
            onPress={() => Linking.openURL(LEGAL_URLS.privacyPolicy).catch(() => {})}
          />
          <Row label="Version" value={Application.nativeApplicationVersion ?? '1.0.0'} />
        </Section>

        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <BodyStrong>Sign out</BodyStrong>
        </Pressable>

        <Pressable
          onPress={confirmDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityHint="Asks you to confirm first"
          accessibilityState={{ disabled: deleting, busy: deleting }}
          style={({ pressed }) => [styles.delete, pressed && styles.deletePressed]}
        >
          {deleting ? <ActivityIndicator size="small" color={COLOR.ink} /> : null}
          <Small>{deleting ? 'Deleting your account…' : 'Delete account'}</Small>
        </Pressable>
        <Small tone="soft" style={styles.deleteHint}>
          Deleting removes your profile, completions, XP, badges and photos for good.
        </Small>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLOR.paper },
  firstSection: { marginTop: SPACE.s3 },
  note: {
    backgroundColor: COLOR.paperDeep,
    borderRadius: RADIUS.control,
    padding: SPACE.s3,
    marginTop: SPACE.s2,
  },
  signOut: {
    marginTop: SPACE.s7,
    minHeight: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.97 }] },
  delete: {
    marginTop: SPACE.s4,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s2,
  },
  deletePressed: { opacity: 0.6 },
  deleteHint: { textAlign: 'center', paddingHorizontal: SPACE.s4 },
})
