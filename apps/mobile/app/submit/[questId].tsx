import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CompletionCelebration, { type CelebrationVariant } from '@/components/CompletionCelebration'
import { Pillow, PILLOW_SIZES } from '@/components/Pillow'
import { ShareStoryModal } from '@/components/ShareStoryModal'
import { Body, Small, Title } from '@/components/ui/Text'
import { endsThisSunday, isNewThisWeek, isQuestActive } from '@quest/geofence'
import { useAuth } from '@/hooks/useAuth'
import { useGeofenceCheck } from '@/hooks/useGeofenceCheck'
import { useLocation } from '@/hooks/useLocation'
import { useQuest } from '@/hooks/useQuests'
import { track, type SubmissionBlockReason } from '@/lib/analytics'
import { didLevelUp } from '@/lib/celebration'
import { paramAsString } from '@/lib/routeParams'
import { supabase } from '@/lib/supabase'
import { COLOR, FONT, RADIUS, SPACE } from '@/lib/theme'
import { readUriAsArrayBuffer } from '@/lib/uploadImage'
import { outsideZoneCopy } from '@/lib/zoneStatus'
import { ZoneMap } from '@/components/ZoneMap'

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

type Step = 'place' | 'selfie' | 'upload' | 'failed'

export default function Submit() {
  const params = useLocalSearchParams<{ questId: string | string[] }>()
  const questId = paramAsString(params.questId)
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session, profile, loading: authLoading, refreshProfile } = useAuth()
  const {
    coords,
    error: locationError,
    bypassGeofence,
    isMocked,
    ensurePermission,
    getSubmissionCoords,
  } = useLocation()
  const { quest, loading: questLoading } = useQuest(questId)
  const [camPermission, requestCamPermission] = useCameraPermissions()

  const cameraRef = useRef<CameraView>(null)
  const skipRef = useRef(false)
  const selfieStarted = useRef(false)
  const uploadStarted = useRef(false)

  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [step, setStep] = useState<Step>('place')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shooting, setShooting] = useState(false)
  const [placePhoto, setPlacePhoto] = useState<string | null>(null)
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebration, setCelebration] = useState<CelebrationState | null>(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [failMessage, setFailMessage] = useState<string | null>(null)

  const userId = profile?.id ?? session?.user?.id
  const submissionCoords = getSubmissionCoords(quest?.lat, quest?.lng)
  const effectiveCoords =
    submissionCoords ??
    (quest?.geofence_type === 'none' && quest
      ? { lat: quest.lat, lng: quest.lng, accuracy: null }
      : null)
  const { insideGeofence, requiresLocation } = useGeofenceCheck(quest, effectiveCoords, bypassGeofence)

  const canShoot =
    !shooting &&
    !isMocked &&
    !alreadyCompleted &&
    !!quest &&
    (!requiresLocation || (!!effectiveCoords && insideGeofence))

  useEffect(() => {
    if (!questId || !quest) return
    const now = new Date()
    track('quest_started', {
      quest_id: questId,
      new_this_week: isNewThisWeek(quest, now),
      ends_sunday: endsThisSunday(quest, now),
    })
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
        if (data?.status === 'approved' || data?.status === 'removed') setAlreadyCompleted(true)
      })
  }, [userId, questId])

  useEffect(() => {
    if (camPermission && !camPermission.granted && camPermission.canAskAgain) {
      requestCamPermission()
    }
  }, [camPermission, requestCamPermission])

  const takeSelfie = useCallback(async () => {
    if (selfieStarted.current || skipRef.current) return
    selfieStarted.current = true
    try {
      const pic = await cameraRef.current?.takePictureAsync({ quality: 0.7 })
      if (pic?.uri && !skipRef.current) setSelfiePhoto(pic.uri)
    } catch {
      // The place photo is the proof. A failed selfie does not block it.
    }
    if (!skipRef.current) setStep('upload')
  }, [])

  useEffect(() => {
    if (step !== 'selfie' || countdown == null) return
    if (countdown <= 0) {
      void takeSelfie()
      return
    }
    const timer = setTimeout(() => setCountdown((current) => (current == null ? current : current - 1)), 1000)
    return () => clearTimeout(timer)
  }, [step, countdown, takeSelfie])

  function trackSubmissionBlocked(reason: SubmissionBlockReason) {
    if (!questId) return
    track('submission_blocked', { quest_id: questId, reason })
  }

  async function capturePlace() {
    if (!canShoot || !cameraRef.current) {
      if (isMocked) trackSubmissionBlocked('mock_location')
      else if (requiresLocation && !effectiveCoords) trackSubmissionBlocked('no_gps')
      else if (requiresLocation && !insideGeofence) trackSubmissionBlocked('outside_zone')
      return
    }
    uploadStarted.current = false
    setShooting(true)
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (!pic?.uri) return
      setPlacePhoto(pic.uri)
      skipRef.current = false
      selfieStarted.current = false
      setFacing('front')
      setCountdown(3)
      setStep('selfie')
    } catch {
      Alert.alert('Camera unavailable', 'Could not take the photo. Check that camera access is allowed in Settings.')
    } finally {
      setShooting(false)
    }
  }

  function skipSelfie() {
    skipRef.current = true
    setCountdown(null)
    setSelfiePhoto(null)
    setStep('upload')
  }

  const handleSubmit = useCallback(async () => {
    if (!placePhoto || !effectiveCoords || !quest || !userId || !questId || !profile) {
      setFailMessage(
        placePhoto && !effectiveCoords
          ? 'We lost your location. Retake the photo once the chip says you’re in the zone.'
          : 'That didn’t go through. Retake the photo and try again.',
      )
      setStep('failed')
      return
    }
    if (!isQuestActive(quest, new Date())) {
      Alert.alert('Not available', 'This quest isn’t open right now.')
      router.back()
      return
    }
    if (isMocked) {
      trackSubmissionBlocked('mock_location')
      Alert.alert('Mock location is on', 'Turn it off, then take the photo again.')
      setStep('place')
      return
    }
    if (requiresLocation && !insideGeofence) {
      trackSubmissionBlocked('outside_zone')
      Alert.alert('Too far away', outsideZoneCopy(quest, effectiveCoords))
      setStep('place')
      return
    }

    const previousXp = profile.total_xp
    const previousStreak = profile.current_streak
    setSubmitting(true)

    try {
      const placeName = `${userId}/${questId}/${Date.now()}.jpg`
      const placeData = await readUriAsArrayBuffer(placePhoto)
      const { error: placeError } = await supabase.storage
        .from('proof-photos')
        .upload(placeName, placeData, { contentType: 'image/jpeg', upsert: false })
      if (placeError) {
        setFailMessage('That photo didn’t upload. Your shot is saved here: try again when you have signal.')
        setStep('failed')
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('proof-photos').getPublicUrl(placeName)

      let selfiePath: string | null = null
      if (selfiePhoto) {
        try {
          selfiePath = `${userId}/${questId}-${Date.now()}.jpg`
          const selfieData = await readUriAsArrayBuffer(selfiePhoto)
          const { error: selfieError } = await supabase.storage
            .from('proof-selfies')
            .upload(selfiePath, selfieData, { contentType: 'image/jpeg', upsert: false })
          if (selfieError) selfiePath = null
        } catch {
          selfiePath = null
        }
      }

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
          selfie_url: selfiePath,
          lat: effectiveCoords.lat,
          lng: effectiveCoords.lng,
          gps_accuracy: effectiveCoords.accuracy ?? null,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (insertError) {
        if (selfiePath) {
          await supabase.storage.from('proof-selfies').remove([selfiePath])
        }
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
        } else if (insertError.message?.includes('GEOFENCE_VIOLATION') || insertError.code === '23514') {
          trackSubmissionBlocked('outside_zone')
          Alert.alert('Too far away', outsideZoneCopy(quest, effectiveCoords))
          setStep('place')
        } else if (insertError.message?.includes('RATE_LIMITED') || insertError.hint === 'RATE_LIMITED') {
          trackSubmissionBlocked('rate_limited')
          setFailMessage('You’re submitting quests too quickly. Give it a few minutes, then try again.')
          setStep('failed')
        } else {
          setFailMessage('That didn’t go through. Check your signal and try again.')
          setStep('failed')
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

      track('completion_verified', { quest_id: questId, xp: quest.xp_reward, instant: true })
      if (newStreak > previousStreak) track('streak_extended', { length: newStreak })
      else if (newStreak < previousStreak) track('streak_broken', { length: previousStreak })

      let redemptionCode: string | null = null
      if (quest.is_sponsored && completion?.id) {
        const { data: reward } = await supabase.rpc('own_completion_reward', {
          p_completion_id: completion.id,
        })
        if (reward && typeof reward === 'object' && !Array.isArray(reward)) {
          const code = (reward as { redemption_code?: unknown }).redemption_code
          redemptionCode = typeof code === 'string' ? code : null
        }
      }

      setAlreadyCompleted(true)
      openCelebration({
        variant: 'success',
        xpReward: quest.xp_reward,
        totalXp: newXp,
        level: newLevel,
        levelUp: didLevelUp(previousXp, newXp),
        streakCount: newStreak,
        redemptionCode,
        sponsorReward: quest.is_sponsored ? quest.sponsor_reward : null,
      })
    } catch (err) {
      setFailMessage('That didn’t go through. Check your signal and try again.')
      setStep('failed')
    } finally {
      setSubmitting(false)
    }
  }, [
    placePhoto,
    selfiePhoto,
    effectiveCoords,
    quest,
    userId,
    questId,
    profile,
    isMocked,
    requiresLocation,
    insideGeofence,
    refreshProfile,
  ])

  useEffect(() => {
    if (step !== 'upload' || uploadStarted.current) return
    uploadStarted.current = true
    void handleSubmit()
  }, [step, handleSubmit])

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
    router.replace(celebration?.variant === 'alreadyDone' ? '/(tabs)/profile' : '/(tabs)')
  }

  function retryUpload() {
    uploadStarted.current = false
    setFailMessage(null)
    setStep('upload')
  }

  function retake() {
    uploadStarted.current = false
    skipRef.current = false
    selfieStarted.current = false
    setFailMessage(null)
    setPlacePhoto(null)
    setSelfiePhoto(null)
    setCountdown(null)
    setFacing('back')
    setStep('place')
  }

  let zoneText = 'Finding you…'
  let zoneIcon: keyof typeof Ionicons.glyphMap = 'ellipse-outline'
  if (isMocked) {
    zoneText = 'Turn off mock location to check in'
    zoneIcon = 'warning-outline'
  } else if (quest?.geofence_type === 'none') {
    zoneText = 'No location required'
    zoneIcon = 'checkmark'
  } else if (locationError && !effectiveCoords) {
    zoneText = 'Turn on location to check in'
    zoneIcon = 'alert-circle-outline'
  } else if (!effectiveCoords || authLoading || questLoading) {
    zoneText = 'Finding you…'
    zoneIcon = 'ellipse-outline'
  } else if (insideGeofence) {
    zoneText = 'You’re in the zone'
    zoneIcon = 'checkmark'
  } else if (quest) {
    zoneText = outsideZoneCopy(quest, effectiveCoords)
    zoneIcon = 'arrow-forward'
  }

  const showCamera = step === 'place' || step === 'selfie'
  const cameraReady = !!camPermission?.granted

  if (!questLoading && quest && !isQuestActive(quest, new Date())) {
    return (
      <View style={[styles.screen, styles.closed, { paddingTop: insets.top + SPACE.s6 }]}>
        <Title>Not out yet</Title>
        <Small tone="soft">This quest isn’t available right now.</Small>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.closedBtn}
        >
          <Small color={COLOR.white}>Go back</Small>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {showCamera && cameraReady ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} mode="picture" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}

      <View style={[styles.top, { paddingTop: insets.top + SPACE.s2 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.iconBtn}
        >
          <Ionicons name="close" size={22} color={COLOR.ink} />
        </Pressable>
        <View style={styles.chip} accessible accessibilityRole="text" accessibilityLiveRegion="polite">
          {zoneText === 'Finding you…' ? (
            <ActivityIndicator size="small" color={COLOR.ink} />
          ) : (
            <Ionicons name={zoneIcon} size={16} color={COLOR.ink} />
          )}
          <Small style={styles.chipText}>{zoneText}</Small>
          {!effectiveCoords && requiresLocation ? (
            <Pressable onPress={() => ensurePermission()} accessibilityRole="button" accessibilityLabel="Turn on location">
              <Small style={styles.allow}>Allow</Small>
            </Pressable>
          ) : null}
        </View>
        {quest && step === 'place' && !alreadyCompleted ? (
          <View style={styles.zoneMap}>
            <ZoneMap quest={quest} coords={effectiveCoords} />
          </View>
        ) : null}
      </View>

      {alreadyCompleted ? (
        <View style={styles.message}>
          <Body color={COLOR.white} style={styles.messageText}>You already finished this quest.</Body>
          <Pressable
            onPress={() =>
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
            }
            style={styles.whiteBtn}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Body style={styles.btnLabel}>Done</Body>
          </Pressable>
        </View>
      ) : !cameraReady ? (
        <View style={styles.message}>
          <Body color={COLOR.white} style={styles.messageText}>
            Quest! uses the camera for two photos: the place, then you.
          </Body>
          <Pressable
            onPress={() => (camPermission?.canAskAgain ? requestCamPermission() : Linking.openSettings())}
            style={styles.whiteBtn}
            accessibilityRole="button"
            accessibilityLabel="Allow camera"
          >
            <Body style={styles.btnLabel}>Allow camera</Body>
          </Pressable>
        </View>
      ) : step === 'failed' ? (
        <View style={styles.message}>
          <Body color={COLOR.white} style={styles.messageText} accessibilityLiveRegion="polite">
            {failMessage ?? 'That photo didn’t upload. Try again.'}
          </Body>
          {placePhoto && effectiveCoords ? (
            <Pressable onPress={retryUpload} style={styles.whiteBtn} accessibilityRole="button" accessibilityLabel="Try again">
              <Body style={styles.btnLabel}>Try again</Body>
            </Pressable>
          ) : null}
          <Pressable
            onPress={retake}
            style={placePhoto && effectiveCoords ? styles.skip : styles.whiteBtn}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Body
              color={placePhoto && effectiveCoords ? COLOR.white : COLOR.ink}
              style={styles.btnLabel}
            >
              Retake photo
            </Body>
          </Pressable>
        </View>
      ) : step === 'upload' || submitting ? (
        <View style={styles.message}>
          <ActivityIndicator color={COLOR.white} />
          <Body color={COLOR.white} accessibilityLiveRegion="polite">Uploading photo…</Body>
          <Small color={COLOR.inkFaint} style={styles.messageText}>Keep the app open. This takes a few seconds.</Small>
        </View>
      ) : (
        <View style={[styles.bottom, { paddingBottom: insets.bottom + SPACE.s4 }]}>
          <View style={styles.slot} pointerEvents="none">
            {placePhoto && step === 'selfie' ? (
              <Pillow uri={placePhoto} {...PILLOW_SIZES.row} edge="white" accessibilityLabel="The place" />
            ) : (
              <View style={styles.emptySlot}>
                <Small color={COLOR.white}>You, next</Small>
              </View>
            )}
          </View>
          <Small color={COLOR.white} style={styles.hint}>
            {step === 'selfie' ? 'Look at the camera.' : 'Get the place in frame.'}
          </Small>
          {step === 'place' ? (
            <Pressable
              onPress={capturePlace}
              disabled={!canShoot}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              accessibilityState={{ disabled: !canShoot }}
              style={[styles.shutter, !canShoot && styles.shutterOff]}
            >
              <View style={styles.shutterCore} />
            </Pressable>
          ) : (
            <View style={styles.selfieRow}>
              <Title color={COLOR.white} accessibilityLiveRegion="polite">{countdown && countdown > 0 ? String(countdown) : ''}</Title>
              <Pressable
                onPress={skipSelfie}
                accessibilityRole="button"
                accessibilityLabel="Skip selfie"
                style={styles.skip}
              >
                <Body color={COLOR.white} style={styles.btnLabel}>Skip selfie</Body>
              </Pressable>
            </View>
          )}
        </View>
      )}

      <CompletionCelebration
        visible={showCelebration}
        variant={celebration?.variant ?? 'success'}
        questTitle={quest?.title ?? ''}
        category={quest?.category}
        cutoutUrl={quest?.cutout_url}
        actionPhrase={quest?.action_phrase}
        photoUri={placePhoto}
        selfieUri={selfiePhoto}
        xpReward={celebration?.xpReward ?? quest?.xp_reward ?? 0}
        totalXp={celebration?.totalXp}
        level={celebration?.level}
        levelUp={celebration?.levelUp}
        streakCount={celebration?.streakCount ?? 0}
        redemptionCode={celebration?.redemptionCode}
        sponsorReward={celebration?.sponsorReward}
        onDone={handleCelebrationDone}
        onShare={placePhoto && profile && quest ? () => setShareOpen(true) : undefined}
      />

      {placePhoto && profile && quest ? (
        <ShareStoryModal
          visible={shareOpen}
          onClose={() => setShareOpen(false)}
          data={{
            photoUri: placePhoto,
            questTitle: quest.title,
            username: profile.username,
            level: celebration?.level ?? profile.level,
            xpReward: quest.xp_reward,
            completedAt: new Date().toISOString(),
            category: quest.category,
            cutoutUrl: quest.cutout_url,
          }}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.ink,
  },
  closed: {
    backgroundColor: COLOR.paper,
    paddingHorizontal: SPACE.s5,
    gap: SPACE.s3,
  },
  closedBtn: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    backgroundColor: COLOR.ink,
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACE.s4,
    gap: SPACE.s3,
    zIndex: 2,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s2,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    maxWidth: '100%',
  },
  zoneMap: { alignSelf: 'flex-start' },
  chipText: {
    flexShrink: 1,
    fontFamily: FONT.bold,
  },
  allow: {
    fontFamily: FONT.black,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: SPACE.s3,
    zIndex: 2,
  },
  slot: {
    position: 'absolute',
    left: SPACE.s4,
    bottom: 120,
  },
  emptySlot: {
    width: PILLOW_SIZES.row.width,
    height: PILLOW_SIZES.row.height,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLOR.white,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.s1,
  },
  hint: {
    textAlign: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: {
    opacity: 0.4,
  },
  shutterCore: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLOR.white,
  },
  selfieRow: {
    alignItems: 'center',
    gap: SPACE.s3,
  },
  skip: {
    minHeight: 48,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLOR.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.s4,
    paddingHorizontal: SPACE.s5,
  },
  messageText: {
    textAlign: 'center',
  },
  whiteBtn: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.pill,
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontFamily: FONT.black,
  },
})
