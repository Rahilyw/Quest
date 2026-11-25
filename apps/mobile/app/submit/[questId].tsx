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
import { ensureDuoAvailable } from '@/hooks/useDuoAvailable'
import { useGeofenceCheck } from '@/hooks/useGeofenceCheck'
import { useLocation } from '@/hooks/useLocation'
import { useQuest } from '@/hooks/useQuests'
import {
  track,
  trackCompletionVerified,
  trackDuoCompleted,
  type SubmissionBlockReason,
} from '@/lib/analytics'
import { partyErrorCopy } from '@/lib/party'
import { didLevelUp } from '@/lib/celebration'
import { resolveBadgeSpec } from '@/lib/badgeFromDb'
import type { BadgeSpec } from '@/lib/badgeCatalog'
import type { Badge } from '@/lib/types'
import { paramAsString } from '@/lib/routeParams'
import { captureAttempt, type CapturedAttempt } from '@/lib/submissionAttempt'
import { removeProofQuietly, submitCompletion } from '@/lib/submitCompletion'
import { resolveXpAwarded, xpMultiplier } from '@/lib/xpCopy'
import { useSubmissionQueue } from '@/hooks/useSubmissionQueue'
import { supabase } from '@/lib/supabase'
import { COLOR, FONT, RADIUS, SPACE } from '@/lib/theme'
import { outsideZoneCopy } from '@/lib/zoneStatus'
import { ZoneMap } from '@/components/ZoneMap'

interface CelebrationState {
  variant: CelebrationVariant
  xpReward: number
  xpReason: string | null
  totalXp: number
  level: number
  levelUp: boolean
  streakCount: number
  redemptionCode: string | null
  sponsorReward: string | null
  /** Badges this completion unlocked (same transaction as the insert). */
  newBadgeIds: string[]
  /** First newly earned badge, for the Verified reward lead. */
  earnedBadge: BadgeSpec | null
  duoUsernames?: [string, string] | null
}

// 'queued': no signal, so the capture was saved to send later (plan Phase 3).
type Step = 'place' | 'selfie' | 'upload' | 'failed' | 'queued'

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
  const { enqueueCapture } = useSubmissionQueue()
  const [camPermission, requestCamPermission] = useCameraPermissions()

  const cameraRef = useRef<CameraView>(null)
  const skipRef = useRef(false)
  const selfieStarted = useRef(false)
  const uploadStarted = useRef(false)
  // Storage path of this attempt's place photo once it is uploaded, so a retry
  // after a failed insert reuses it instead of uploading again.
  const uploadedPlacePath = useRef<string | null>(null)
  // True once the server has answered the insert with a rejection, so the row
  // is known not to exist and the uploaded photo is safe to delete.
  const insertRejected = useRef(false)

  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [step, setStep] = useState<Step>('place')
  const [countdown, setCountdown] = useState<number | null>(null)
  const [shooting, setShooting] = useState(false)
  const [placePhoto, setPlacePhoto] = useState<string | null>(null)
  const [captured, setCaptured] = useState<CapturedAttempt | null>(null)
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
  // Submissions are judged on where the photo was taken, not where the player
  // is when the upload (or a retry) runs. The server re-checks these coordinates.
  const { insideGeofence: capturedInZone } = useGeofenceCheck(quest, captured, bypassGeofence)

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
    // Freeze the fix at the shutter press: retries send these, not live GPS.
    const attempt = captureAttempt(effectiveCoords)
    setShooting(true)
    try {
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (!pic?.uri) return
      setPlacePhoto(pic.uri)
      setCaptured(attempt)
      uploadedPlacePath.current = null
      insertRejected.current = false
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
    if (!placePhoto || !captured || !quest || !userId || !questId || !profile) {
      setFailMessage(
        placePhoto && !captured
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
    if (requiresLocation && !capturedInZone) {
      trackSubmissionBlocked('outside_zone')
      Alert.alert('Too far away', outsideZoneCopy(quest, captured))
      setStep('place')
      return
    }

    const previousXp = profile.total_xp
    const previousStreak = profile.current_streak
    setSubmitting(true)

    try {
      insertRejected.current = false
      const result = await submitCompletion({
        userId,
        questId,
        attempt: captured,
        placeUri: placePhoto,
        selfieUri: selfiePhoto,
        isSponsored: quest.is_sponsored,
        uploadedPlacePath: uploadedPlacePath.current,
      })
      uploadedPlacePath.current = result.uploadedPlacePath
      // Any server answer other than a duplicate means no row points at this
      // attempt's photo. A network failure leaves that unknown.
      insertRejected.current = result.kind === 'rate_limited' || result.kind === 'rejected'

      switch (result.kind) {
        case 'network': {
          // No server answer: keep the capture and send it when the signal is back.
          // It is not verified until the server accepts it.
          const { accepted } = await enqueueCapture({
            questId,
            questTitle: quest.title,
            xpReward: quest.xp_reward,
            isSponsored: quest.is_sponsored,
            attempt: captured,
            placeUri: placePhoto,
            selfieUri: selfiePhoto,
            placeUploaded: !!result.uploadedPlacePath,
          })
          if (accepted) {
            setStep('queued')
            return
          }
          setFailMessage(
            result.stage === 'upload'
              ? 'That photo didn’t upload, and it couldn’t be saved for later. Try again when you have signal.'
              : 'That didn’t go through, and it couldn’t be saved for later. Check your signal and try again.',
          )
          setStep('failed')
          return
        }
        case 'duplicate':
          setAlreadyCompleted(true)
          openCelebration({
            variant: 'alreadyDone',
            xpReward: resolveXpAwarded(result.ownCompletion?.xp_awarded, quest.xp_reward),
            xpReason: result.ownCompletion?.xp_reason ?? null,
            totalXp: profile.total_xp,
            level: profile.level,
            levelUp: false,
            streakCount: profile.current_streak,
            redemptionCode: null,
            sponsorReward: null,
            newBadgeIds: [],
            earnedBadge: null,
          })
          return
        case 'rate_limited':
          trackSubmissionBlocked('rate_limited')
          setFailMessage('You’re submitting quests too quickly. Give it a few minutes, then try again.')
          setStep('failed')
          return
        case 'party_required':
          trackSubmissionBlocked('party_required')
          setFailMessage(partyErrorCopy('PARTY_REQUIRED'))
          setStep('failed')
          return
        case 'outside_zone':
          // Final for this capture: the player has to shoot again.
          trackSubmissionBlocked('outside_zone')
          Alert.alert('Too far away', outsideZoneCopy(quest, captured))
          setStep('place')
          return
        case 'rejected':
          setFailMessage('That didn’t go through. Check your signal and try again.')
          setStep('failed')
          return
        case 'verified':
          break
      }

      track('proof_submitted', {
        quest_id: questId,
        category: quest.category,
        gps_accuracy: captured.accuracy,
        is_sponsored: quest.is_sponsored,
      })

      await refreshProfile()
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('total_xp, level, current_streak')
        .eq('id', userId)
        .single()

      const awardedXp = resolveXpAwarded(result.xpAwarded, quest.xp_reward)
      const awardedReason = result.xpReason
      const newXp = freshProfile?.total_xp ?? previousXp + awardedXp
      const newLevel = freshProfile?.level ?? profile.level
      const newStreak = freshProfile?.current_streak ?? profile.current_streak

      trackCompletionVerified({
        quest_id: questId,
        xp: awardedXp,
        xp_multiplier: xpMultiplier(awardedXp, quest.xp_reward),
        xp_reason: awardedReason,
        instant: true,
      })
      if (newStreak > previousStreak) track('streak_extended', { length: newStreak })
      else if (newStreak < previousStreak) track('streak_broken', { length: previousStreak })

      let earnedBadge: BadgeSpec | null = null
      if (result.newBadgeIds.length > 0) {
        const { data: badgeRows } = await supabase
          .from('badges')
          .select('*')
          .in('id', result.newBadgeIds)
          .limit(1)
        const badge = (badgeRows?.[0] ?? null) as Badge | null
        if (badge) earnedBadge = resolveBadgeSpec(badge)
      }

      let duoUsernames: [string, string] | null = null
      // Dark-launch: never call own_party unless 045's min_party_size is readable.
      if (awardedReason === 'duo' && profile.username && (await ensureDuoAvailable())) {
        const { data: partyPayload } = await supabase.rpc('own_party', { p_quest_id: questId })
        const members =
          partyPayload &&
          typeof partyPayload === 'object' &&
          Array.isArray((partyPayload as { members?: unknown }).members)
            ? ((partyPayload as { members: { username?: string; user_id?: string }[] }).members)
            : []
        const partner = members.find((m) => m.user_id && m.user_id !== userId)
        if (partner?.username) {
          duoUsernames = [profile.username, partner.username]
          trackDuoCompleted({ quest_id: questId, referral: false })
        }
      }

      setAlreadyCompleted(true)
      openCelebration({
        variant: 'success',
        xpReward: awardedXp,
        xpReason: awardedReason,
        totalXp: newXp,
        level: newLevel,
        levelUp: didLevelUp(previousXp, newXp),
        streakCount: newStreak,
        redemptionCode: result.redemptionCode,
        sponsorReward: quest.is_sponsored ? quest.sponsor_reward : null,
        newBadgeIds: result.newBadgeIds,
        earnedBadge,
        duoUsernames,
      })
    } catch {
      setFailMessage('That didn’t go through. Check your signal and try again.')
      setStep('failed')
    } finally {
      setSubmitting(false)
    }
  }, [
    placePhoto,
    selfiePhoto,
    captured,
    quest,
    userId,
    questId,
    profile,
    isMocked,
    requiresLocation,
    capturedInZone,
    refreshProfile,
    enqueueCapture,
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
      for (const badgeId of state.newBadgeIds) {
        track('badge_unlocked', { badge_id: badgeId, quest_id: quest?.id ?? null })
      }
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

  /**
   * The player is giving up on this capture. Delete its uploaded photo only when
   * the server has rejected the insert; after a network failure the row may
   * exist and point at that file.
   */
  function abandonAttempt() {
    if (insertRejected.current && uploadedPlacePath.current) {
      void removeProofQuietly('proof-photos', uploadedPlacePath.current)
    }
    uploadedPlacePath.current = null
    insertRejected.current = false
  }

  function close() {
    if (!submitting) abandonAttempt()
    router.back()
  }

  function retake() {
    abandonAttempt()
    uploadStarted.current = false
    skipRef.current = false
    selfieStarted.current = false
    setFailMessage(null)
    setCaptured(null)
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
          onPress={close}
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
                xpReason: null,
                totalXp: profile?.total_xp ?? 0,
                level: profile?.level ?? 1,
                levelUp: false,
                streakCount: profile?.current_streak ?? 0,
                redemptionCode: null,
                sponsorReward: null,
                newBadgeIds: [],
                earnedBadge: null,
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
      ) : step === 'queued' ? (
        <View style={styles.message}>
          <Body color={COLOR.white} style={styles.messageText} accessibilityLiveRegion="polite">
            Saved. We’ll send it when you’re back online.
          </Body>
          <Small color={COLOR.inkFaint} style={styles.messageText}>
            It counts once it arrives. You’ll find it on You until then.
          </Small>
          <Pressable
            onPress={() => router.back()}
            style={styles.whiteBtn}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Body style={styles.btnLabel}>Done</Body>
          </Pressable>
        </View>
      ) : step === 'failed' ? (
        <View style={styles.message}>
          <Body color={COLOR.white} style={styles.messageText} accessibilityLiveRegion="polite">
            {failMessage ?? 'That photo didn’t upload. Try again.'}
          </Body>
          {placePhoto && captured ? (
            <Pressable onPress={retryUpload} style={styles.whiteBtn} accessibilityRole="button" accessibilityLabel="Try again">
              <Body style={styles.btnLabel}>Try again</Body>
            </Pressable>
          ) : null}
          <Pressable
            onPress={retake}
            style={placePhoto && captured ? styles.skip : styles.whiteBtn}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Body
              color={placePhoto && captured ? COLOR.white : COLOR.ink}
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
        xpReason={celebration?.xpReason ?? null}
        totalXp={celebration?.totalXp}
        level={celebration?.level}
        levelUp={celebration?.levelUp}
        streakCount={celebration?.streakCount ?? 0}
        redemptionCode={celebration?.redemptionCode}
        sponsorReward={celebration?.sponsorReward}
        earnedBadge={celebration?.earnedBadge ?? null}
        duoUsernames={celebration?.duoUsernames ?? null}
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
            xpReward: celebration?.xpReward ?? quest.xp_reward,
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
