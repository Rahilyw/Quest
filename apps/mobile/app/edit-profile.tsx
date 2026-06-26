import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Avatar } from '@/components/Avatar'
import { SectionHeader } from '@/components/SectionHeader'
import { COLORS, SPACING, RADIUS } from '@/lib/constants'
import { ensureMediaLibraryPermission } from '@/lib/permissions'
import { PILOT_CITIES } from '@/lib/onboarding'

function isLocalImageUri(uri: string): boolean {
  return (
    uri.startsWith('file:') ||
    uri.startsWith('content:') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://')
  )
}

export default function EditProfile() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const [username, setUsername] = useState(profile?.username ?? '')
  const [city, setCity] = useState(profile?.city ?? PILOT_CITIES[0])
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.avatar_url) return
    setAvatarUri((current) => {
      if (current == null || !isLocalImageUri(current)) return profile.avatar_url
      return current
    })
  }, [profile?.avatar_url])

  if (!profile) return null

  const user = profile

  async function uploadAvatar(uri: string): Promise<string | null> {
    const response = await fetch(uri)
    const blob = await response.blob()
    const fileName = `avatars/${user.id}.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) {
      Alert.alert('Upload failed', error.message)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
    return `${publicUrl}?t=${Date.now()}`
  }

  async function pickAvatar() {
    const granted = await ensureMediaLibraryPermission()
    if (!granted) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (!result.canceled) setAvatarUri(result.assets[0].uri)
    } catch {
      Alert.alert(
        'Photos unavailable',
        'Could not open your photo library. Check that photo access is allowed in Settings.'
      )
    }
  }

  async function handleSave() {
    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      Alert.alert('Username required', 'Enter a username to save your profile.')
      return
    }
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      Alert.alert('Invalid username', 'Use 3 to 20 characters: letters, numbers, or underscores.')
      return
    }

    setSaving(true)

    let newAvatarUrl = user.avatar_url
    if (avatarUri && isLocalImageUri(avatarUri)) {
      newAvatarUrl = await uploadAvatar(avatarUri)
      if (!newAvatarUrl) {
        setSaving(false)
        return
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed, city, avatar_url: newAvatarUrl })
      .eq('id', user.id)

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Username taken', 'That one\'s gone. Try a different username.')
      } else {
        Alert.alert('Error', error.message)
      }
      return
    }

    await refreshProfile()
    router.back()
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
          <Text style={[styles.backText, { color: COLORS.accent }]}>←</Text>
        </View>
      </TouchableOpacity>

      <Text style={[styles.screenTitle, { paddingTop: insets.top + 18 }]}>Edit Profile</Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 64 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.avatarSection}
          onPress={pickAvatar}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          <Avatar username={user.username} uri={avatarUri} size={88} />
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditText}>📷</Text>
          </View>
        </TouchableOpacity>

        <SectionHeader title="Public Info" />
        <View style={styles.sectionCard}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="yourname"
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={styles.fieldHint}>Shown as @{username.trim() || 'username'}</Text>
          </View>
        </View>

        <SectionHeader title="City" />
        <View style={styles.sectionCard}>
          {PILOT_CITIES.map((option) => {
            const selected = city === option
            return (
              <TouchableOpacity
                key={option}
                style={[styles.cityRow, selected && styles.cityRowSelected]}
                onPress={() => setCity(option)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cityLabel, selected && styles.cityLabelSelected]}>
                  {option}
                </Text>
                {selected && (
                  <Text style={styles.cityCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Saving…' : 'Save changes'}
          accessibilityState={{ disabled: saving }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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
  avatarSection: {
    alignSelf: 'center',
    marginBottom: SPACING.xxl,
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditText: { fontSize: 14 },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  field: { padding: SPACING.lg },
  fieldLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fieldHint: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 52,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cityRowSelected: { backgroundColor: COLORS.accentSoft },
  cityLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '500' },
  cityLabelSelected: { color: COLORS.accentText, fontWeight: '700' },
  cityCheck: { color: COLORS.accent, fontWeight: '800', fontSize: 16 },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
})
