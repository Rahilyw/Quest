import { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { COLORS } from '@/lib/constants'

interface Props {
  visible: boolean
  questTitle: string
  xpReward: number
  onDone: () => void
}

export default function CompletionCelebration({ visible, questTitle, xpReward, onDone }: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 180,
      }).start()
    } else {
      scaleAnim.setValue(0)
    }
  }, [visible])

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Animated.View style={[styles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>

          <Text style={styles.title}>Quest Submitted!</Text>
          <Text style={styles.subtitle}>{questTitle}</Text>

          <View style={styles.xpPill}>
            <Text style={styles.xpText}>+{xpReward} XP pending approval</Text>
          </View>

          <Text style={styles.infoText}>
            {'Your submission is under review.\nYou\'ll be notified when it\'s approved.'}
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Back to Quests</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 36,
    color: 'white',
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
  },
  xpPill: {
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  xpText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 14,
  },
  infoText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  doneBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
})
