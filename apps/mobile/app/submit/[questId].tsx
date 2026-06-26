import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { useQuest } from '@/hooks/useQuests'
import { PROOF_GEOFENCE_RADIUS, COLORS } from '@/lib/constants'
import { ensureCameraPermission } from '@/lib/permissions'
import { paramAsString } from '@/lib/routeParams'
import { readUriAsArrayBuffer } from '@/lib/uploadImage'
import CompletionCelebration from '@/components/CompletionCelebration'

export default function Submit() {
  const params = useLocalSearchParams<{ questId: string | string[] }>()
  const questId = paramAsString(params.questId)
  const router = useRouter()
  const { session, profile, loading: authLoading } = useAuth()
  const {
    coords,
    error: locationError,
    bypassGeofence,
    ensurePermission,
    refresh,
    getSubmissionCoords,
    isWithinRadius,
  } = useLocation()
  const { quest, loading: questLoading } = useQuest(questId)
  const [photo, setPhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationVariant, setCelebrationVariant] = useState<'success' | 'alreadyPending'>('success')
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const userId = profile?.id ?? session?.user?.id
  const submissionCoords = getSubmissionCoords(quest?.lat, quest?.lng)
  const hasLocation = submissionCoords != null
  const hasPhoto = photo != null

  useEffect(() => {
    if (!userId || !questId) return

    supabase
      .from('completions')
      .select('status')
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'pending') {
          setAlreadySubmitted(true)
        }
      })
  }, [userId, questId])

  async function pickPhoto() {
    const granted = await ensureCameraPermission()
    if (!granted) return

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      })
      if (!result.canceled) setPhoto(result.assets[0].uri)
    } catch {
      Alert.alert(
        'Camera unavailable',
        'Could not open the camera. Check that camera access is allowed in Settings.'
      )
    }
  }

  function handleRetakePhoto() {
    setPhoto(null)
    pickPhoto()
  }

  async function handleRequestLocation() {
    await ensurePermission()
  }

  function submissionBlockReason(): string | null {
    if (alreadySubmitted) return 'This quest is already awaiting approval. Check Pending Quests on your profile.'
    if (authLoading || questLoading) return null
    if (!questId) return 'Invalid quest link.'
    if (!hasPhoto) return 'Take a photo first.'
    if (!hasLocation) return 'Location is required. Tap the GPS row above to allow access.'
    if (!quest) return 'Could not load this quest. Go back and try again.'
    if (!userId) return 'You must be signed in to submit. Sign in and try again.'
    return null
  }

  function showCelebrationModal(variant: 'success' | 'alreadyPending') {
    setCelebrationVariant(variant)
    setShowCelebration(true)
    if (variant === 'success' || variant === 'alreadyPending') {
      setAlreadySubmitted(true)
    }
  }

  function handleCelebrationDone() {
    setShowCelebration(false)
    if (celebrationVariant === 'alreadyPending') {
      router.replace('/(tabs)/profile')
    } else {
      router.replace('/(tabs)')
    }
  }

  async function handleSubmit() {
    if (alreadySubmitted && !showCelebration) {
      showCelebrationModal('alreadyPending')
      return
    }

    const blockReason = submissionBlockReason()
    if (blockReason) {
      Alert.alert('Not ready to submit', blockReason)
      return
    }

    if (!photo || !submissionCoords || !quest || !userId || !questId) return

    if (!isWithinRadius(quest.lat, quest.lng, PROOF_GEOFENCE_RADIUS)) {
      Alert.alert(
        'Too far away',
        `You need to be within ${PROOF_GEOFENCE_RADIUS}m of the quest location.`
      )
      return
    }

    setSubmitting(true)

    try {
      const fileName = `${userId}/${questId}/${Date.now()}.jpg`
      const imageData = await readUriAsArrayBuffer(photo)

      const { error: uploadError } = await supabase.storage
        .from('proof-photos')
        .upload(fileName, imageData, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('proof-photos')
        .getPublicUrl(fileName)

      const { error: insertError } = await supabase.from('completions').insert({
        user_id: userId,
        quest_id: questId,
        photo_url: publicUrl,
        lat: submissionCoords.lat,
        lng: submissionCoords.lng,
        completed_at: new Date().toISOString(),
        status: 'pending',
      })

      if (insertError) {
        if (insertError.code === '23505') {
          showCelebrationModal('alreadyPending')
        } else {
          Alert.alert('Submission failed', insertError.message)
        }
        return
      }

      showCelebrationModal('success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.'
      Alert.alert('Submission failed', message)
    } finally {
      setSubmitting(false)
    }
  }

  function locationStatusText() {
    if (submissionCoords) {
      if (bypassGeofence && !coords) {
        return 'Test mode: using quest location (no GPS needed)'
      }
      return `GPS locked, ±${Math.round(submissionCoords.accuracy ?? 0)}m`
    }
    if (locationError) return locationError
    return 'Getting your location…'
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Submit Proof</Text>
          <Text style={styles.questName}>{quest?.title ?? 'Loading quest…'}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.photoBox}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={styles.photo} />
            <View style={styles.photoOverlay}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetakePhoto} activeOpacity={0.85}>
                <Text style={styles.retakeBtnText}>↻ Retake Photo</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity style={styles.photoEmpty} onPress={pickPhoto} activeOpacity={0.85}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoHint}>Tap to take a photo</Text>
            <Text style={styles.photoSub}>Show us you were there</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.statusRow}
        onPress={hasLocation ? refresh : handleRequestLocation}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: hasLocation ? COLORS.success : COLORS.warning,
            marginRight: 6,
            fontSize: 12,
          }}
        >
          ●
        </Text>
        <Text style={[styles.statusText, { flex: 1 }]}>{locationStatusText()}</Text>
        {!hasLocation && <Text style={styles.statusAction}>Allow →</Text>}
      </TouchableOpacity>

      {bypassGeofence && (
        <Text style={styles.devBanner}>
          Dev mode: geofence bypass is on — you can submit without being at the quest.
        </Text>
      )}

      {alreadySubmitted && !showCelebration && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>
            ⏳ Awaiting approval — find this under Pending Quests on your profile.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          (submitting || ((authLoading || questLoading) && !alreadySubmitted)) && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>
            {alreadySubmitted
              ? 'View Submission Status'
              : authLoading || questLoading
                ? 'Loading…'
                : `Submit for +${quest?.xp_reward ?? '?'} XP`}
          </Text>
        )}
      </TouchableOpacity>

      <CompletionCelebration
        visible={showCelebration}
        variant={celebrationVariant}
        questTitle={quest?.title ?? ''}
        xpReward={quest?.xp_reward ?? 0}
        streakCount={profile?.current_streak ?? 0}
        onDone={handleCelebrationDone}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  questName: { color: COLORS.textMuted, fontSize: 14 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700' },
  photoBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 4,
  },
  photo: { width: '100%', height: '100%' },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  retakeBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retakeBtnText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },
  photoEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  photoIcon: { fontSize: 40, marginBottom: 12 },
  photoHint: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  photoSub: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 13 },
  statusAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  devBanner: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  pendingBannerText: {
    color: COLORS.warning,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
