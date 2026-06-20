import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { useQuest } from '@/hooks/useQuests'
import { PROOF_GEOFENCE_RADIUS, COLORS } from '@/lib/constants'
import CompletionCelebration from '@/components/CompletionCelebration'

export default function Submit() {
  const { questId } = useLocalSearchParams<{ questId: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { coords, isWithinRadius } = useLocation()
  const { quest } = useQuest(questId)
  const [photo, setPhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  async function pickPhoto() {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!result.canceled) setPhoto(result.assets[0].uri)
  }

  async function handleSubmit() {
    if (!photo || !coords || !quest || !profile) return

    if (!isWithinRadius(quest.lat, quest.lng, PROOF_GEOFENCE_RADIUS)) {
      Alert.alert(
        'Too far away',
        `You need to be within ${PROOF_GEOFENCE_RADIUS}m of the quest location.`
      )
      return
    }

    setSubmitting(true)

    const fileName = `${profile.id}/${questId}/${Date.now()}.jpg`
    const response = await fetch(photo)
    const blob = await response.blob()

    const { error: uploadError } = await supabase.storage
      .from('proof-photos')
      .upload(fileName, blob, { contentType: 'image/jpeg' })

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message)
      setSubmitting(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('proof-photos')
      .getPublicUrl(fileName)

    const { error: insertError } = await supabase.from('completions').insert({
      user_id: profile.id,
      quest_id: questId,
      photo_url: publicUrl,
      lat: coords.lat,
      lng: coords.lng,
      completed_at: new Date().toISOString(),
      status: 'pending',
    })

    if (insertError) {
      Alert.alert('Submission failed', insertError.message)
    } else {
      setShowCelebration(true)
    }
    setSubmitting(false)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Submit Proof</Text>
          <Text style={styles.questName}>{quest?.title}</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Photo box — glass card treatment */}
      <TouchableOpacity style={styles.photoBox} onPress={pickPhoto} activeOpacity={0.85}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoHint}>Tap to take a photo</Text>
            <Text style={styles.photoSub}>Proof of your quest completion</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* GPS status */}
      <View style={styles.statusRow}>
        <Text style={{ color: coords ? COLORS.success : COLORS.warning, marginRight: 6, fontSize: 12 }}>●</Text>
        <Text style={styles.statusText}>
          {coords
            ? `GPS locked, ±${Math.round(coords.accuracy ?? 0)}m`
            : 'Waiting for GPS location…'}
        </Text>
      </View>

      {/* Submit CTA */}
      <TouchableOpacity
        style={[styles.submitBtn, (!photo || !coords || submitting) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!photo || !coords || submitting}
        activeOpacity={0.85}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Submitting…' : `Submit for +${quest?.xp_reward ?? '?'} XP`}
        </Text>
      </TouchableOpacity>

      <CompletionCelebration
        visible={showCelebration}
        questTitle={quest?.title ?? ''}
        xpReward={quest?.xp_reward ?? 0}
        streakCount={0}
        onDone={() => {
          setShowCelebration(false)
          router.replace('/(tabs)')
        }}
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusText: { color: COLORS.textSecondary, fontSize: 13 },
  submitBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
})
