import { useEffect, useRef } from 'react'
import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet, Easing } from 'react-native'
import { COLORS } from '@/lib/constants'

export type CelebrationVariant = 'success' | 'alreadyDone'

interface Props {
  visible: boolean
  variant?: CelebrationVariant
  questTitle: string
  xpReward: number
  totalXp?: number
  level?: number
  levelUp?: boolean
  streakCount?: number
  redemptionCode?: string | null
  sponsorReward?: string | null
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
  variant = 'success',
  questTitle,
  xpReward,
  totalXp,
  level,
  levelUp = false,
  streakCount = 0,
  redemptionCode,
  sponsorReward,
  onDone,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const isAlreadyDone = variant === 'alreadyDone'

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
        {!isAlreadyDone &&
          CONFETTI.map((_, i) => <ConfettiPiece key={i} index={i} active={visible} />)}

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View
            style={[
              styles.checkCircle,
              isAlreadyDone && styles.doneCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={[styles.checkMark, isAlreadyDone && styles.doneMark]}>
              {isAlreadyDone ? '🏅' : '✓'}
            </Text>
          </Animated.View>

          <Text style={styles.title}>
            {isAlreadyDone ? 'Already Completed!' : levelUp ? 'Level Up!' : 'Quest Complete!'}
          </Text>
          <Text style={styles.subtitle}>{questTitle}</Text>

          {!isAlreadyDone && (
            <>
              <View style={styles.xpPill}>
                <Text style={styles.xpText}>{`+${xpReward} XP`}</Text>
              </View>

              {totalXp != null && (
                <Text style={styles.totalXpText}>
                  {totalXp.toLocaleString()} XP total{level != null ? ` · LV ${level}` : ''}
                </Text>
              )}

              {streakCount > 0 && (
                <View style={styles.streakPill}>
                  <Text style={styles.streakText}>🔥 Week {streakCount} streak!</Text>
                </View>
              )}

              {redemptionCode ? (
                <View style={styles.codeCard}>
                  <Text style={styles.codeLabel}>Show this at the counter</Text>
                  <Text style={styles.codeValue}>{redemptionCode}</Text>
                  {sponsorReward ? (
                    <Text style={styles.codeReward}>{sponsorReward}</Text>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.infoText}>
                  Your proof is live on the city feed. Keep exploring!
                </Text>
              )}
            </>
          )}

          {isAlreadyDone && (
            <Text style={styles.infoText}>
              You already finished this quest. Check your profile for the proof and any rewards.
            </Text>
          )}

          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>
              {isAlreadyDone ? 'View Profile' : 'Keep Exploring'}
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
  doneCircle: {
    backgroundColor: COLORS.primarySoft,
  },
  checkMark: {
    fontSize: 36,
    color: COLORS.surface,
    fontWeight: '800',
  },
  doneMark: {
    fontSize: 32,
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
    backgroundColor: COLORS.successSoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  xpText: {
    color: COLORS.success,
    fontWeight: '700',
    fontSize: 14,
  },
  totalXpText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  streakPill: {
    marginTop: 8,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  streakText: {
    color: COLORS.warning,
    fontWeight: '700',
    fontSize: 14,
  },
  codeCard: {
    marginTop: 16,
    backgroundColor: COLORS.indigoSoft,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.indigo + '33',
  },
  codeLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  codeValue: {
    color: COLORS.indigo,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  codeReward: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
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
    color: COLORS.surface,
    fontWeight: '700',
    fontSize: 16,
  },
})
