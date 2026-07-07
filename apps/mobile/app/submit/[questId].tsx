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
import { useGeofenceCheck } from '@/hooks/useGeofenceCheck'
import { COLORS } from '@/lib/constants'
import { didLevelUp } from '@/lib/celebration'
import { track, type SubmissionBlockReason } from '@/lib/analytics'
import { ensureCameraPermission } from '@/lib/permissions'
import { paramAsString } from '@/lib/routeParams'
import { readUriAsArrayBuffer } from '@/lib/uploadImage'
import CompletionCelebration, { type CelebrationVariant } from '@/components/CompletionCelebration'

interface CelebrationState {
  variant: CelebrationVariant
  xpReward: number
  totalXp: number
  level: number
  levelUp: boolean
  streakCount: number
  redemptionCode: string | null
  sponsorReward: string | null
}

export default function Submit() {
  const params = useLocalSearchParams<{ questId: string | string[] }>()
  const questId = paramAsString(params.questId)
  const router = useRouter()
  const { session, profile, loading: authLoading, refreshProfile } = useAuth()
  const {
    coords,
    error: locationError,
    bypassGeofence,
    isMocked,
    ensurePermission,
    refresh,
    getSubmissionCoords,
  } = useLocation()
  const { quest, loading: questLoading } = useQuest(questId)
  const [photo, setPhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  const userId = profile?.id ?? session?.user?.id
  const submissionCoords = getSubmissionCoords(quest?.lat, quest?.lng)
  const effectiveCoords =
    submissionCoords ??
    (quest?.geofence_type === 'none' && quest
      ? { lat: quest.lat, lng: quest.lng, accuracy: null }
      : null)
  const hasLocation = effectiveCoords != null
  const hasPhoto = photo != null
  const { insideGeofence, geofenceLabel, requiresLocation } = useGeofenceCheck(
    quest,
    effectiveCoords,
    bypassGeofence
  )

  useEffect(() => {
    if (!questId || !quest) return
    track('quest_started', { quest_id: questId })
  }, [questId, quest?.id])

  useEffect(() => {
    if (!userId || !questId) return

    supabase
      .from('completions')
      .select('status')
      .eq('user_id', userId)
      .eq('quest_id', questId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'approved' || data?.status === 'removed') {
          setAlreadyCompleted(true)
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

  function trackSubmissionBlocked(reason: SubmissionBlockReason) {
    if (!questId) return
    track('submission_blocked', { quest_id: questId, reason })
  }

  function submissionBlockReason(): string | null {
    if (alreadyCompleted) return 'You already completed this quest.'
    if (isMocked) return 'Turn off mock location to submit.'
    if (authLoading || questLoading) return null
    if (!questId) return 'Invalid quest link.'
    if (!hasPhoto) return 'Take a photo first.'
    if (!hasLocation && requiresLocation) return 'Location is required. Tap the GPS row above to allow access.'
    if (!quest) return 'Could not load this quest. Go back and try again.'
    if (!userId) return 'You must be signed in to submit. Sign in and try again.'
    return null
  }

  function openCelebration(state: CelebrationState) {
    setCelebration(state)
    setShowCelebration(true)
    if (state.variant === 'success') {
      track('celebration_viewed', { level_up: state.levelUp, streak: state.streakCount })
      if (state.redemptionCode && quest) {
        track('redemption_code_viewed', {
          quest_id: quest.id,
          sponsor_name: quest.sponsor_name ?? 'unknown',
        })
      }
    }
  }

  function handleCelebrationDone() {
    setShowCelebration(false)
    if (celebration?.variant === 'alreadyDone') {
      router.replace('/(tabs)/profile')
    } else {
      router.replace('/(tabs)')
    }
  }

  async function handleSubmit() {
    if (alreadyCompleted && !showCelebration) {
      openCelebration({
        variant: 'alreadyDone',
        xpReward: quest?.xp_reward ?? 0,
        totalXp: profile?.total_xp ?? 0,
        level: profile?.level ?? 1,
        levelUp: false,
        streakCount: profile?.current_streak ?? 0,
        redemptionCode: null,
        sponsorReward: null,
      })
      return
    }

    const blockReason = submissionBlockReason()
    if (blockReason) {
      if (isMocked) trackSubmissionBlocked('mock_location')
      else if (!hasPhoto) trackSubmissionBlocked('no_photo')
      else if (!hasLocation && requiresLocation) trackSubmissionBlocked('no_gps')
      else if (alreadyCompleted) trackSubmissionBlocked('already_completed')
      Alert.alert('Not ready to submit', blockReason)
      return
    }

    if (!photo || !effectiveCoords || !quest || !userId || !questId || !profile) return

    if (!insideGeofence) {
      trackSubmissionBlocked('outside_zone')
      Alert.alert(
        'Too far away',
        `You need to be ${geofenceLabel.toLowerCase()} to submit.`
      )
      return
    }

    const previousXp = profile.total_xp
    const previousStreak = profile.current_streak
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

      track('proof_submitted', {
        quest_id: questId,
        category: quest.category,
        gps_accuracy: effectiveCoords.accuracy,
        is_sponsored: quest.is_sponsored,
      })

      const { data: completion, error: insertError } = await supabase
        .from('completions')
        .insert({
          user_id: userId,
          quest_id: questId,
          photo_url: publicUrl,
          lat: effectiveCoords.lat,
          lng: effectiveCoords.lng,
          completed_at: new Date().toISOString(),
        })
        .select('redemption_code')
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          setAlreadyCompleted(true)
          openCelebration({
            variant: 'alreadyDone',
            xpReward: quest.xp_reward,
            totalXp: profile.total_xp,
            level: profile.level,
            levelUp: false,
            streakCount: profile.current_streak,
            redemptionCode: null,
            sponsorReward: null,
          })
        } else if (
          insertError.message?.includes('GEOFENCE_VIOLATION') ||
          insertError.code === '23514'
        ) {
          trackSubmissionBlocked('outside_zone')
          Alert.alert(
            'Too far away',
            `Your location is outside the quest zone. ${geofenceLabel}.`
          )
        } else if (
          insertError.message?.includes('RATE_LIMITED') ||
          insertError.hint === 'RATE_LIMITED'
        ) {
          trackSubmissionBlocked('rate_limited')
          Alert.alert(
            'Slow down',
            'You are submitting quests too quickly. Take a breather and try again in a few minutes.'
          )
        } else {
          Alert.alert('Submission failed', insertError.message)
        }
        return
      }

      await refreshProfile()

      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('total_xp, level, current_streak')
        .eq('id', userId)
        .single()

      const newXp = freshProfile?.total_xp ?? previousXp + quest.xp_reward
      const newLevel = freshProfile?.level ?? profile.level
      const newStreak = freshProfile?.current_streak ?? profile.current_streak

      track('completion_verified', {
        quest_id: questId,
        xp: quest.xp_reward,
        instant: true,
      })

      if (newStreak > previousStreak) {
        track('streak_extended', { length: newStreak })
      } else if (newStreak < previousStreak) {
        track('streak_broken', { length: previousStreak })
      }

      setAlreadyCompleted(true)
      openCelebration({
        variant: 'success',
        xpReward: quest.xp_reward,
        totalXp: newXp,
        level: newLevel,
        levelUp: didLevelUp(previousXp, newXp),
        streakCount: newStreak,
        redemptionCode: completion?.redemption_code ?? null,
        sponsorReward: quest.is_sponsored ? quest.sponsor_reward : null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Try again.'
      Alert.alert('Submission failed', message)
    } finally {
      setSubmitting(false)
    }
  }

  function locationStatusText() {
    if (isMocked) return 'Mock location detected — turn it off to submit'
    if (quest?.geofence_type === 'none') {
      return 'No location required for this quest'
    }
    if (effectiveCoords) {
      if (bypassGeofence && !coords) {
        return 'Test mode: using quest location (no GPS needed)'
      }
      const zoneStatus = insideGeofence ? 'Inside quest zone' : 'Outside quest zone'
      return `${zoneStatus} · GPS ±${Math.round(effectiveCoords.accuracy ?? 0)}m`
    }
    if (locationError) return locationError
    return 'Getting your location…'
  }

  const locationOk = !isMocked && (insideGeofence || quest?.geofence_type === 'none')

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
            color: isMocked ? COLORS.danger : locationOk ? COLORS.success : COLORS.warning,
            marginRight: 6,
            fontSize: 12,
          }}
        >
          ●
        </Text>
        <Text style={[styles.statusText, { flex: 1 }]}>{locationStatusText()}</Text>
        {!hasLocation && !isMocked && <Text style={styles.statusAction}>Allow →</Text>}
      </TouchableOpacity>

      {bypassGeofence && (
        <Text style={styles.devBanner}>
          Dev mode: geofence bypass is on — set EXPO_PUBLIC_BYPASS_GEOFENCE=true in dev only.
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.submitBtn,
          (submitting || ((authLoading || questLoading) && !alreadyCompleted)) && styles.submitDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitText}>
            {alreadyCompleted
              ? 'View Completion'
              : authLoading || questLoading
                ? 'Loading…'
                : `Submit for +${quest?.xp_reward ?? '?'} XP`}
          </Text>
        )}
      </TouchableOpacity>

      <CompletionCelebration
        visible={showCelebration}
        variant={celebration?.variant ?? 'success'}
        questTitle={quest?.title ?? ''}
        xpReward={celebration?.xpReward ?? quest?.xp_reward ?? 0}
        totalXp={celebration?.totalXp}
        level={celebration?.level}
        levelUp={celebration?.levelUp}
        streakCount={celebration?.streakCount ?? 0}
        redemptionCode={celebration?.redemptionCode}
        sponsorReward={celebration?.sponsorReward}
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
    shadowColor: COLORS.navy,
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
  statusText: { color: COLORS.textMuted, fontSize: 13 },
  statusAction: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
  devBanner: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
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
