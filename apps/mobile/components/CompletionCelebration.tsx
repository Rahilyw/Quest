import { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native'
import { COLORS } from '@/lib/constants'

interface Props {
  visible: boolean
  questTitle: string
  xpReward: number
  streakCount?: number
  variant?: 'success' | 'alreadyPending'
  onDone: () => void
}

const CONFETTI = ['🎉', '⭐', '✨', '🏅', '🎊', '💫']

function ConfettiPiece({ index, active }: { index: number; active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current
  const left = 8 + (index * 14) % 84

  useEffect(() => {
    if (!active) {
      progress.setValue(0)
      return
    }
    progress.setValue(0)
    Animated.timing(progress, {
      toValue: 1,
      duration: 1400 + (index % 4) * 200,
      delay: index * 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start()
  }, [active, index, progress])

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 220],
  })

  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  })

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${(index % 2 === 0 ? 1 : -1) * 180}deg`],
  })

  return (
    <Animated.Text
      style={[
        styles.confetti,
        {
          left: `${left}%`,
          opacity,
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      {CONFETTI[index % CONFETTI.length]}
    </Animated.Text>
  )
}

export default function CompletionCelebration({
  visible,
  questTitle,
  xpReward,
  streakCount = 0,
  variant = 'success',
  onDone,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const isAlreadyPending = variant === 'alreadyPending'

  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(0)
      pulseAnim.setValue(1)
      return
    }

    scaleAnim.setValue(0)
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
      stiffness: 160,
    }).start()

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [visible, scaleAnim, pulseAnim])

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDone}>
      <View style={styles.backdrop}>
        {!isAlreadyPending &&
          CONFETTI.map((_, i) => <ConfettiPiece key={i} index={i} active={visible} />)}

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View
            style={[
              styles.checkCircle,
              isAlreadyPending && styles.pendingCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.checkMark, isAlreadyPending && styles.pendingMark]}>
              {isAlreadyPending ? '⏳' : '✓'}
            </Text>
          </Animated.View>

          <Text style={styles.title}>
            {isAlreadyPending ? 'Already In Review' : 'Quest Submitted!'}
          </Text>
          <Text style={styles.subtitle}>{questTitle}</Text>

          <View style={[styles.xpPill, isAlreadyPending && styles.pendingPill]}>
            <Text style={[styles.xpText, isAlreadyPending && styles.pendingPillText]}>
              {`+${xpReward} XP pending approval`}
            </Text>
          </View>

          {streakCount > 0 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>🔥 Week {streakCount} streak!</Text>
            </View>
          )}

          <Text style={styles.infoText}>
            {isAlreadyPending
              ? 'Your proof is already being reviewed.\nFind it under Pending Quests on your profile.'
              : 'Your submission is under review.\nYou\'ll earn XP once it\'s approved. Find it under Pending Quests on your profile.'}
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>
              {isAlreadyPending ? 'View Profile' : 'Keep Exploring'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    top: '18%',
    fontSize: 22,
  },
  card: {
    backgroundColor: COLORS.surface,
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
  pendingCircle: {
    backgroundColor: '#FEF3C7',
  },
  checkMark: {
    fontSize: 36,
    color: 'white',
    fontWeight: '800',
  },
  pendingMark: {
    fontSize: 32,
    color: COLORS.warning,
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
  pendingPill: {
    backgroundColor: '#FEF3C7',
  },
  xpText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 14,
  },
  pendingPillText: {
    color: COLORS.warning,
  },
  streakPill: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  streakText: {
    color: COLORS.warning,
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
