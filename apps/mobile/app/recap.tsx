import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Ionicons } from '@expo/vector-icons'
import { EmptyState } from '@/components/EmptyState'
import {
  RecapShareCard,
  RECAP_CARD_HEIGHT,
  RECAP_CARD_WIDTH,
  recapCardLabel,
} from '@/components/RecapShareCard'
import { ScreenHeader } from '@/components/ui/Screen'
import { Body, BodyStrong, Small } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useWeekRecap } from '@/hooks/useWeekRecap'
import { track } from '@/lib/analytics'
import {
  RECAP_SHARE_EVENT,
  recapKind,
  shareOutcome,
  shouldTrackShare,
  weekRangeLabel,
  type ShareOutcome,
} from '@/lib/recapWeek'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

/**
 * Weekly recap (Spec 06 §2). Opened from Rankings any day of the week.
 * Sunday shows the week in progress; Monday to Saturday shows the week that
 * just ended (lib/recapWeek.js).
 *
 * Nothing leaves the phone until the player taps Share. The image is drawn
 * and captured on-device, then handed to the OS share sheet.
 */
export default function RecapScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { session, profile } = useAuth()
  const { week, recap, loading, failed, photoReady, reload } = useWeekRecap(session?.user?.id)
  const cardRef = useRef<View>(null)
  const [sharing, setSharing] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const kind = recapKind(recap, photoReady !== false)
  // The card is final once we know whether the photo can be drawn.
  const photoSettled = photoReady !== null
  const showPhoto = kind === 'ready' && photoReady === true
  const username = profile?.username ?? ''
  const canShare = Boolean(recap) && kind !== 'empty' && photoSettled && username !== '' && !sharing

  const scale = Math.min(1, (width - SPACE.s4 * 2) / RECAP_CARD_WIDTH, 420 / RECAP_CARD_HEIGHT)
  const cardData = recap ? { recap, username, showPhoto } : null

  async function handleShare() {
    if (!canShare || !cardData) return
    setSharing(true)
    setNote(null)

    let uri: string
    try {
      uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: 1080,
        height: 1920,
      })
    } catch {
      setNote('Your card couldn’t be made. Nothing was shared. Try again.')
      setSharing(false)
      return
    }

    try {
      let outcome: ShareOutcome = 'unknown'
      if (Platform.OS === 'ios') {
        // iOS reports whether the sheet was dismissed; Android share intents report nothing.
        outcome = shareOutcome(await Share.share({ url: uri }))
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your week' })
      } else {
        setNote('Sharing isn’t available on this phone.')
        return
      }
      if (shouldTrackShare(outcome)) track('share_completed', { ...RECAP_SHARE_EVENT })
    } catch {
      setNote('The share sheet didn’t open. Nothing was shared. Try again.')
    } finally {
      setSharing(false)
    }
  }

  const range = weekRangeLabel(week.weekStart)
  const status = week.inProgress ? 'Still open. It settles tonight at midnight.' : 'Final.'

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Your week" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + SPACE.s8 }}
      >
        <Small tone="soft" style={styles.week}>{`${range}. ${status}`}</Small>

        {loading ? (
          <View
            style={styles.loading}
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Loading your week"
          >
            <View
              style={[
                styles.skeleton,
                { width: RECAP_CARD_WIDTH * scale, height: RECAP_CARD_HEIGHT * scale },
              ]}
            />
          </View>
        ) : failed || !recap ? (
          <View style={styles.message} accessibilityRole="alert">
            <Body tone="soft">Couldn’t load your week. Check your signal and try again.</Body>
            <Pressable
              onPress={reload}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <BodyStrong color={COLOR.white}>Try again</BodyStrong>
            </Pressable>
          </View>
        ) : kind === 'empty' ? (
          <EmptyState
            sprite="seal"
            title={week.inProgress ? 'No quests yet this week' : 'No quests that week'}
            subtitle={
              week.inProgress
                ? 'Finish one before midnight and your week shows up here.'
                : 'Finish a quest this week and you’ll have a recap to share on Sunday.'
            }
            ctaLabel="Find a quest"
            onCtaPress={() => router.push('/quests')}
          />
        ) : cardData ? (
          <View style={styles.body}>
            {/* Scaled preview (display only) */}
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={recapCardLabel(cardData)}
              style={{
                width: RECAP_CARD_WIDTH * scale,
                height: RECAP_CARD_HEIGHT * scale,
                borderRadius: RADIUS.card,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLOR.rule,
              }}
            >
              <View
                style={{
                  width: RECAP_CARD_WIDTH,
                  height: RECAP_CARD_HEIGHT,
                  transform: [
                    { translateX: -(RECAP_CARD_WIDTH * (1 - scale)) / 2 },
                    { translateY: -(RECAP_CARD_HEIGHT * (1 - scale)) / 2 },
                    { scale },
                  ],
                }}
              >
                <RecapShareCard data={cardData} />
              </View>
            </View>

            {/* Full-size off-screen copy that view-shot captures */}
            <View style={styles.captureHost} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View
                ref={cardRef}
                collapsable={false}
                style={{ width: RECAP_CARD_WIDTH, height: RECAP_CARD_HEIGHT }}
              >
                <RecapShareCard data={cardData} />
              </View>
            </View>

            {kind === 'no_photo' && photoSettled ? (
              <Small tone="soft" style={styles.hint}>
                {recap.photo
                  ? 'Your photo didn’t load, so this card is numbers only.'
                  : 'No photo to show for this week, so this card is numbers only.'}
              </Small>
            ) : null}

            {note ? (
              <View style={styles.note} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Small>{note}</Small>
              </View>
            ) : null}

            <Pressable
              onPress={handleShare}
              disabled={!canShare}
              accessibilityRole="button"
              accessibilityLabel="Share your week"
              accessibilityHint="Opens your phone’s share sheet with this card"
              accessibilityState={{ disabled: !canShare, busy: sharing || !photoSettled }}
              style={({ pressed }) => [
                styles.share,
                !canShare && styles.shareDisabled,
                pressed && canShare && styles.ctaPressed,
              ]}
            >
              {sharing || !photoSettled ? (
                <ActivityIndicator color={COLOR.white} />
              ) : (
                <>
                  <Ionicons name="share-outline" size={19} color={COLOR.white} />
                  <BodyStrong color={COLOR.white}>Share your week</BodyStrong>
                </>
              )}
            </Pressable>
            <Small tone="soft" style={styles.hint}>
              The card is made on your phone. It goes nowhere until you share it.
            </Small>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  week: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s2, marginBottom: SPACE.s4 },
  loading: { alignItems: 'center' },
  skeleton: { borderRadius: RADIUS.card, backgroundColor: COLOR.paperDeep },
  message: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, alignItems: 'flex-start' },
  body: { alignItems: 'center', paddingHorizontal: SPACE.s4 },
  captureHost: { position: 'absolute', top: 0, left: -RECAP_CARD_WIDTH * 4 },
  note: {
    alignSelf: 'stretch',
    backgroundColor: COLOR.paperDeep,
    borderRadius: RADIUS.control,
    padding: SPACE.s3,
    marginTop: SPACE.s3,
  },
  hint: { marginTop: SPACE.s3, textAlign: 'center' },
  cta: {
    minHeight: 48,
    paddingHorizontal: SPACE.s5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
  share: {
    marginTop: SPACE.s5,
    minHeight: 56,
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: SPACE.s2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareDisabled: { backgroundColor: COLOR.inkSoft },
})
