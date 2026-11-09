import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useRouter } from 'expo-router'
import MapView, { Marker } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Body, BodyStrong, Heading, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { track } from '@/lib/analytics'
import { CITY } from '@/lib/constants'
import { validateSuggestion } from '@/lib/suggestionForm'
import { supabase } from '@/lib/supabase'
import { CATEGORY_KEYS, COLOR, getCategory, RADIUS, SPACE, TYPE, type CategoryKey } from '@/lib/theme'
import type { QuestCategory } from '@/lib/types'

const OPEN_LIMIT = 3

export default function SuggestQuestScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<QuestCategory>('community')
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [openCount, setOpenCount] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) return
    supabase
      .from('quest_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'submitted')
      .then(({ count, error }) => {
        if (!error) setOpenCount(count ?? 0)
      })
  }, [session?.user?.id])

  async function useMyLocation() {
    setFormError(null)
    const current = await Location.getForegroundPermissionsAsync()
    let granted = current.status === 'granted'
    if (current.status === 'undetermined') {
      const asked = await Location.requestForegroundPermissionsAsync()
      granted = asked.status === 'granted'
    }
    if (!granted) {
      setFormError('Location is off. You can still send the idea without a pin.')
      return
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    setShowMap(true)
  }

  async function onSubmit() {
    const userId = session?.user?.id
    if (!userId || submitting) return
    const parsed = validateSuggestion({
      title,
      description,
      category,
      lat: pin?.lat ?? null,
      lng: pin?.lng ?? null,
    })
    setFieldErrors(parsed.errors)
    if (!parsed.ok) return
    if (openCount != null && openCount >= OPEN_LIMIT) {
      setFormError('You already have 3 open quest ideas.')
      return
    }

    setSubmitting(true)
    setFormError(null)
    const { error } = await supabase.from('quest_suggestions').insert({
      user_id: userId,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      lat: parsed.lat,
      lng: parsed.lng,
    })
    setSubmitting(false)
    if (error) {
      const message = error.message.includes('3 open')
        ? 'You already have 3 open quest ideas.'
        : 'Couldn’t send that. Check your signal and try again.'
      setFormError(message)
      return
    }
    track('suggestion_submitted', { category: parsed.category, has_pin: parsed.lat != null })
    setDone(true)
  }

  if (done) {
    return (
      <View style={[styles.screen, styles.done, { paddingTop: insets.top + SPACE.s6 }]}>
        <Title>Got it</Title>
        <Body tone="soft">
          If it goes live, the quest carries your name. Publishing is curated — we read every idea.
        </Body>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to Quest"
          style={styles.primary}
        >
          <BodyStrong color={COLOR.white}>Back</BodyStrong>
        </Pressable>
      </View>
    )
  }

  const atLimit = openCount != null && openCount >= OPEN_LIMIT

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s3,
          paddingHorizontal: SPACE.s4,
          paddingBottom: insets.bottom + SPACE.s7,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={22} color={COLOR.ink} />
        </Pressable>
        <Title>Suggest a quest</Title>
        <Body tone="soft" style={styles.lead}>
          If we publish it, the quest carries your name. We read every idea. Publishing is curated.
        </Body>
        <Small tone="soft" style={styles.lead}>
          {openCount == null
            ? 'You can have 3 open ideas at a time.'
            : `${openCount} of 3 open ideas.`}
        </Small>

        <Heading style={styles.label}>Title</Heading>
        <TextInput
          value={title}
          onChangeText={setTitle}
          accessibilityLabel="Quest title"
          maxLength={80}
          placeholder="Inner Harbour lights"
          placeholderTextColor={COLOR.inkFaint}
          style={styles.input}
        />
        {fieldErrors.title ? <Small tone="soft">{fieldErrors.title}</Small> : null}

        <Heading style={styles.label}>What should people do?</Heading>
        <TextInput
          value={description}
          onChangeText={setDescription}
          accessibilityLabel="Quest description"
          maxLength={500}
          multiline
          placeholder="Walk the causeway after dark and find the lights."
          placeholderTextColor={COLOR.inkFaint}
          style={[styles.input, styles.area]}
        />
        {fieldErrors.description ? <Small tone="soft">{fieldErrors.description}</Small> : null}

        <Heading style={styles.label}>Category</Heading>
        <View style={styles.cats}>
          {CATEGORY_KEYS.map((key) => {
            const cat = getCategory(key as CategoryKey)
            const selected = category === key
            return (
              <Pressable
                key={key}
                onPress={() => setCategory(key as QuestCategory)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={cat.label}
                style={[
                  styles.cat,
                  { backgroundColor: selected ? cat.color : COLOR.paperDeep },
                ]}
              >
                <Small color={selected ? cat.onColor : COLOR.ink}>{cat.label}</Small>
              </Pressable>
            )
          })}
        </View>
        {fieldErrors.category ? <Small tone="soft">{fieldErrors.category}</Small> : null}

        <Heading style={styles.label}>Place, if you have one</Heading>
        {!showMap ? (
          <Pressable
            onPress={() => {
              setPin({ lat: CITY.lat, lng: CITY.lng })
              setShowMap(true)
            }}
            accessibilityRole="button"
            accessibilityLabel="Add a map pin"
            style={styles.secondary}
          >
            <BodyStrong>Add a map pin</BodyStrong>
          </Pressable>
        ) : (
          <View>
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: pin?.lat ?? CITY.lat,
                  longitude: pin?.lng ?? CITY.lng,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                onPress={(event) => {
                  setPin({
                    lat: event.nativeEvent.coordinate.latitude,
                    lng: event.nativeEvent.coordinate.longitude,
                  })
                }}
              >
                {pin ? (
                  <Marker
                    coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                    draggable
                    onDragEnd={(event) => {
                      setPin({
                        lat: event.nativeEvent.coordinate.latitude,
                        lng: event.nativeEvent.coordinate.longitude,
                      })
                    }}
                    title="Suggested place"
                  />
                ) : null}
              </MapView>
            </View>
            <View style={styles.pinRow}>
              <Pressable
                onPress={useMyLocation}
                accessibilityRole="button"
                accessibilityLabel="Use my location"
                style={styles.secondary}
              >
                <Small>Use my location</Small>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPin(null)
                  setShowMap(false)
                }}
                accessibilityRole="button"
                accessibilityLabel="Remove pin"
                style={styles.secondary}
              >
                <Small>Remove pin</Small>
              </Pressable>
            </View>
          </View>
        )}
        {fieldErrors.pin ? <Small tone="soft">{fieldErrors.pin}</Small> : null}

        {formError ? (
          <Body tone="soft" style={styles.lead} accessibilityRole="alert">
            {formError}
          </Body>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={submitting || atLimit}
          accessibilityRole="button"
          accessibilityLabel="Send quest idea"
          accessibilityState={{ disabled: submitting || atLimit, busy: submitting }}
          style={({ pressed }) => [
            styles.primary,
            (submitting || atLimit) && styles.primaryOff,
            pressed && !submitting && !atLimit && styles.pressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={COLOR.white} />
          ) : (
            <BodyStrong color={submitting || atLimit ? COLOR.inkSoft : COLOR.white}>
              {atLimit ? 'Three ideas already open' : 'Send idea'}
            </BodyStrong>
          )}
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLOR.paper },
  done: { paddingHorizontal: SPACE.s5, gap: SPACE.s3 },
  back: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -SPACE.s3,
  },
  lead: { marginTop: SPACE.s2 },
  label: { marginTop: SPACE.s5, marginBottom: SPACE.s2 },
  input: {
    minHeight: 48,
    borderRadius: RADIUS.control,
    backgroundColor: COLOR.white,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s3,
    color: COLOR.ink,
    ...TYPE.body,
  },
  area: { minHeight: 120, textAlignVertical: 'top' },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s2 },
  cat: {
    minHeight: 48,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: {
    height: 220,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    backgroundColor: COLOR.paperDeep,
  },
  map: { flex: 1 },
  pinRow: { flexDirection: 'row', gap: SPACE.s2, marginTop: SPACE.s2 },
  secondary: {
    minHeight: 48,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.paperDeep,
    paddingHorizontal: SPACE.s4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    marginTop: SPACE.s5,
    minHeight: 52,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACE.s5,
  },
  primaryOff: { backgroundColor: COLOR.disabledFill },
  pressed: { backgroundColor: COLOR.inkPressed, transform: [{ scale: 0.97 }] },
})
