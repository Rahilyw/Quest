import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import QRCode from 'react-native-qrcode-svg'
import { Ionicons } from '@expo/vector-icons'
import { Body, BodyStrong, Heading, Micro, Sentence, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { createParty, joinParty, leaveParty, useOwnParty } from '@/hooks/useParty'
import { useQuest } from '@/hooks/useQuests'
import { track } from '@/lib/analytics'
import {
  isValidPartyCode,
  normalizePartyCode,
  partyDeepLink,
  partyErrorCopy,
  partyExpiryLabel,
  partyPartnerStatus,
} from '@/lib/party'
import { COLOR, FONT, RADIUS, SPACE, TYPE } from '@/lib/theme'

export default function PartyLobbyScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const params = useLocalSearchParams<{ code?: string; questId?: string }>()
  const rawCode = normalizePartyCode(
    typeof params.code === 'string' ? params.code : Array.isArray(params.code) ? params.code[0] : '',
  )
  const questIdParam =
    typeof params.questId === 'string'
      ? params.questId
      : Array.isArray(params.questId)
        ? params.questId[0]
        : null

  const [joinCode, setJoinCode] = useState(rawCode === 'join' || rawCode === 'new' ? '' : rawCode)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeCode, setActiveCode] = useState<string | null>(
    isValidPartyCode(rawCode) ? rawCode : null,
  )
  const [questId, setQuestId] = useState<string | null>(questIdParam)

  const { quest } = useQuest(questId ?? undefined)
  const { party, state, refresh } = useOwnParty(questId, !!questId)

  useEffect(() => {
    if (party?.code) setActiveCode(party.code)
  }, [party?.code])

  useEffect(() => {
    if (state === 'expired' && party?.quest_id) {
      track('party_expired', { quest_id: party.quest_id })
    }
  }, [state, party?.quest_id])

  const deepLink = activeCode ? partyDeepLink(activeCode) : ''
  const expiryText = party ? partyExpiryLabel(party.expires_at) : null
  const partnerLine = party
    ? partyPartnerStatus(party.members, profile?.id)
    : 'Waiting for a friend'
  const ready = state === 'ready'

  const startWithFriend = useCallback(async () => {
    if (!questId) return
    setBusy(true)
    setError(null)
    const result = await createParty(questId)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setActiveCode(result.code)
    await refresh()
    router.setParams({ code: result.code })
  }, [questId, refresh, router])

  useEffect(() => {
    if (rawCode === 'new' && questId && !party && !busy) {
      void startWithFriend()
    }
  }, [rawCode, questId, party, busy, startWithFriend])

  const onJoin = useCallback(async () => {
    setBusy(true)
    setError(null)
    const result = await joinParty(joinCode)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setQuestId(result.quest_id)
    setActiveCode(normalizePartyCode(joinCode))
    await refresh()
  }, [joinCode, refresh])

  const onShare = useCallback(async () => {
    if (!activeCode) return
    await Share.share({
      message: `Join my Quest! duo party: ${activeCode}\n${deepLink}`,
    })
  }, [activeCode, deepLink])

  const onLeave = useCallback(async () => {
    if (!activeCode) return
    setBusy(true)
    await leaveParty(activeCode)
    setBusy(false)
    setActiveCode(null)
    router.back()
  }, [activeCode, router])

  const goCamera = useCallback(() => {
    if (!questId || !ready) return
    router.push(`/submit/${questId}`)
  }, [questId, ready, router])

  const title = useMemo(() => quest?.title ?? 'Duo party', [quest?.title])

  return (
    <View style={[styles.screen, { paddingTop: insets.top + SPACE.s3, paddingBottom: insets.bottom + SPACE.s4 }]}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
        </Pressable>
        <Heading style={styles.heading}>{title}</Heading>
        <View style={styles.iconBtn} />
      </View>

      {!questId && !activeCode ? (
        <View style={styles.card}>
          <Sentence>Have a code?</Sentence>
          <Small tone="soft" style={styles.gap}>
            Type the six characters your friend shared.
          </Small>
          <TextInput
            value={joinCode}
            onChangeText={(t) => setJoinCode(normalizePartyCode(t).slice(0, 6))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="ABC123"
            placeholderTextColor={COLOR.inkFaint}
            accessibilityLabel="Party code"
            style={styles.codeInput}
          />
          <Pressable
            onPress={onJoin}
            disabled={busy || !isValidPartyCode(joinCode)}
            accessibilityRole="button"
            accessibilityLabel="Join party"
            accessibilityState={{ disabled: busy || !isValidPartyCode(joinCode) }}
            style={({ pressed }) => [
              styles.primary,
              (busy || !isValidPartyCode(joinCode)) && styles.primaryOff,
              pressed && styles.pressed,
            ]}
          >
            <BodyStrong color={COLOR.white}>Join party</BodyStrong>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Micro tone="soft">Party code</Micro>
          <Title style={styles.bigCode} tabular>
            {activeCode ?? '------'}
          </Title>
          {expiryText ? (
            <Small tone="soft" style={styles.gap}>
              {expiryText}
            </Small>
          ) : null}
          <Sentence style={styles.gap}>{partnerLine}</Sentence>

          {deepLink ? (
            <View style={styles.qrWrap} accessibilityLabel="QR code for party link">
              <QRCode value={deepLink} size={168} backgroundColor={COLOR.white} color={COLOR.ink} />
            </View>
          ) : null}

          <View style={styles.row}>
            <Pressable
              onPress={onShare}
              disabled={!activeCode}
              accessibilityRole="button"
              accessibilityLabel="Share party code"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Ionicons name="share-outline" size={20} color={COLOR.ink} />
              <Body>Share</Body>
            </Pressable>
            <Pressable
              onPress={onLeave}
              accessibilityRole="button"
              accessibilityLabel="Leave party"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Body>Leave</Body>
            </Pressable>
          </View>

          <Pressable
            onPress={goCamera}
            disabled={!ready}
            accessibilityRole="button"
            accessibilityLabel="Go to the camera"
            accessibilityHint={ready ? 'Both of you are in' : 'Waiting for a friend'}
            accessibilityState={{ disabled: !ready }}
            style={({ pressed }) => [
              styles.primary,
              !ready && styles.primaryOff,
              pressed && ready && styles.pressed,
            ]}
          >
            <BodyStrong color={ready ? COLOR.white : COLOR.inkSoft}>Go to the camera</BodyStrong>
          </Pressable>
        </View>
      )}

      {error ? (
        <Small style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Small>
      ) : null}

      {!error && state === 'expired' ? (
        <Small style={styles.error} accessibilityLiveRegion="polite">
          {partyErrorCopy('PARTY_EXPIRED')}
        </Small>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.paper,
    paddingHorizontal: SPACE.s4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE.s4,
  },
  iconBtn: {
    width: SPACE.s8,
    height: SPACE.s8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.card,
    padding: SPACE.s5,
    gap: SPACE.s2,
  },
  gap: {
    marginTop: SPACE.s1,
  },
  bigCode: {
    letterSpacing: 6,
    marginTop: SPACE.s2,
    textAlign: 'center',
  },
  qrWrap: {
    alignSelf: 'center',
    marginVertical: SPACE.s4,
    padding: SPACE.s3,
    backgroundColor: COLOR.white,
    borderRadius: RADIUS.control,
  },
  row: {
    flexDirection: 'row',
    gap: SPACE.s3,
    marginTop: SPACE.s2,
  },
  primary: {
    minHeight: SPACE.s8,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACE.s3,
    paddingHorizontal: SPACE.s4,
  },
  primaryOff: {
    backgroundColor: COLOR.disabledFill,
  },
  secondary: {
    flex: 1,
    minHeight: SPACE.s8,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACE.s2,
  },
  codeInput: {
    minHeight: SPACE.s8,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.paperDeep,
    paddingHorizontal: SPACE.s4,
    ...TYPE.heading,
    fontFamily: FONT.medium,
    letterSpacing: 4,
    color: COLOR.ink,
    marginTop: SPACE.s3,
    textAlign: 'center',
  },
  error: {
    color: COLOR.ink,
    marginTop: SPACE.s3,
  },
  pressed: {
    opacity: 0.85,
  },
})
