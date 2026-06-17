import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useLocation } from '@/hooks/useLocation'
import { useQuest } from '@/hooks/useQuests'
import { PROOF_GEOFENCE_RADIUS } from '@/lib/constants'

export default function Submit() {
  const { questId } = useLocalSearchParams<{ questId: string }>()
  const router = useRouter()
  const { profile } = useAuth()
  const { coords, isWithinRadius } = useLocation()
  const { quest } = useQuest(questId)
  const [photo, setPhoto] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      Alert.alert(
        'Submitted!',
        'Your proof is under review. XP will be awarded once approved (usually within 2 hours).',
        [{ text: 'Back to quests', onPress: () => router.replace('/(tabs)') }]
      )
    }
    setSubmitting(false)
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Submit Proof</Text>
      <Text style={styles.questName}>{quest?.title}</Text>

      <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <Text style={styles.photoPlaceholder}>📷{'\n'}Take a photo</Text>
        )}
      </TouchableOpacity>

      <View style={styles.status}>
        <Text style={[styles.statusDot, { color: coords ? '#22C55E' : '#F59E0B' }]}>●</Text>
        <Text style={styles.statusText}>
          {coords ? `GPS locked (±${Math.round(coords.accuracy ?? 0)}m)` : 'Waiting for GPS…'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!photo || !coords || submitting) && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!photo || !coords || submitting}
      >
        <Text style={styles.submitText}>
          {submitting ? 'Submitting…' : `Submit for +${quest?.xp_reward ?? '?'} XP`}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 24 },
  close: { alignSelf: 'flex-end', padding: 8 },
  closeText: { color: '#64748B', fontSize: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#F1F5F9', marginBottom: 4 },
  questName: { color: '#64748B', marginBottom: 24 },
  photoBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { color: '#64748B', fontSize: 18, textAlign: 'center', lineHeight: 32 },
  status: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusDot: { marginRight: 8, fontSize: 12 },
  statusText: { color: '#64748B', fontSize: 14 },
  submitBtn: { backgroundColor: '#6366F1', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
})
