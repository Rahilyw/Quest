import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/components/Avatar'
import { Cutout } from '@/components/Cutout'
import { Sprite } from '@/components/Sprite'
import { PenRing } from '@/components/scraps'
import { Body, Heading, Sentence, Small, Title } from '@/components/ui/Text'
import { useAuth } from '@/hooks/useAuth'
import { useBlockedUsers } from '@/hooks/useBlockedUsers'
import { useThisWeek } from '@/hooks/useThisWeek'
import { useUnreadNotificationCount } from '@/hooks/useNotifications'
import { useUserCompletions } from '@/hooks/useUserCompletions'
import { daysLeftLabel } from '@/lib/copy'
import { getDaysLeftInWeek, getISOWeek, TAB_BAR_CLEARANCE } from '@/lib/constants'
import { track } from '@/lib/analytics'
import { greetingName, ordinal } from '@/lib/thisWeek'
import { CATEGORY, COLOR, FONT, RADIUS, SPACE } from '@/lib/theme'

function victoriaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return { weekday: part('weekday'), monthDay: `${part('month')} ${part('day')}` }
}

export default function ThisWeekScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const { excludedQuestIds, loading: playedLoading } = useUserCompletions(profile?.id)
  const { blockedIds, loading: blockedLoading } = useBlockedUsers(profile?.id)
  const { count: unread } = useUnreadNotificationCount(profile?.id)
  const week = useThisWeek(
    profile?.id,
    excludedQuestIds,
    blockedIds,
    profile?.current_streak ?? 0,
    !playedLoading && !blockedLoading,
  )
  const date = victoriaDate()
  const name = greetingName(profile?.username)
  const seenDrop = useRef(false)
  useEffect(() => {
    if (week.loading || week.error || seenDrop.current) return
    seenDrop.current = true
    track('weekly_drop_seen', {
      new_count: week.newCount,
      ending_count: week.endingCount,
      source: 'this-week',
    })
  }, [week.loading, week.error, week.newCount, week.endingCount])

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + SPACE.s5,
          paddingHorizontal: SPACE.s4,
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + SPACE.s6,
        }}
        refreshControl={
          <RefreshControl
            refreshing={week.refreshing}
            onRefresh={week.refresh}
            tintColor={COLOR.white}
            colors={[COLOR.white]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Title color={COLOR.white} style={styles.title}>
            This week
          </Title>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            hitSlop={8}
            style={styles.bell}
          >
            <Ionicons name="notifications-outline" size={22} color={COLOR.inkFaint} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
          <View style={styles.date}>
            <Small color={COLOR.white}>{date.monthDay}</Small>
            <Small color={COLOR.inkFaint}>{date.weekday}</Small>
          </View>
        </View>
        <Small color={COLOR.inkFaint} style={styles.clock}>
          {`Week ${getISOWeek()}, ${daysLeftLabel(getDaysLeftInWeek())}`}
        </Small>
        {!week.loading && !week.error ? (
          <Pressable
            onPress={() => router.push('/(tabs)/quests')}
            accessibilityRole="button"
            accessibilityLabel={
              week.newCount > 0 ? `${week.newCount} new this week` : 'Nothing new this week'
            }
            style={styles.dropLink}
          >
            <Small color={COLOR.white}>
              {week.newCount > 0
                ? `${week.newCount} new this week`
                : 'Nothing new this week. The next drop is Monday.'}
            </Small>
          </Pressable>
        ) : null}

        {week.loading ? (
          <Sentence color={COLOR.inkFaint} style={styles.sentence}>
            Finding this week…
          </Sentence>
        ) : week.error ? (
          <Sentence color={COLOR.inkFaint} style={styles.sentence}>
            Couldn’t load this week. Pull to try again.
          </Sentence>
        ) : week.picked.length === 0 ? (
          <Sentence color={COLOR.inkFaint} style={styles.sentence}>
            {`Hi, ${name}! Nothing new near you this week.`}
          </Sentence>
        ) : (
          <Sentence color={COLOR.inkFaint} style={styles.sentence}>
            {`Hi, ${name}! This week you could `}
            {week.picked.map((item, index) => {
              const joiner =
                index === 0 ? '' : index === week.picked.length - 1 ? ' and ' : ', '
              return (
                <Sentence key={item.quest.id} color={COLOR.inkFaint}>
                  {joiner}
                  {item.quest.cutout_url ? (
                    <Cutout
                      uri={item.quest.cutout_url}
                      category={item.quest.category}
                      questTitle={item.quest.title}
                      role="inline"
                    />
                  ) : null}
                  <Sentence
                    color={COLOR.white}
                    style={styles.phrase}
                    onPress={() => router.push(`/quest/${item.quest.id}?source=this-week`)}
                    accessibilityRole="button"
                    accessibilityLabel={item.phrase}
                    suppressHighlighting
                  >
                    {item.phrase}
                  </Sentence>
                </Sentence>
              )
            })}
            .
          </Sentence>
        )}

        {week.picked.length > 0 ? (
          <View style={styles.picked}>
            {week.friends.map((friend, index) => (
              <View key={friend.userId} style={[styles.friend, index > 0 && styles.friendOverlap]}>
                <Avatar username={friend.username} uri={friend.avatarUrl} size={28} />
              </View>
            ))}
            <Small color={COLOR.inkFaint} style={styles.pickedLabel}>
              {week.usedLocation
                ? `Picked from ${week.poolSize} quests near you`
                : `Picked from ${week.poolSize} quests`}
            </Small>
          </View>
        ) : null}

        <View style={styles.sheet}>
          <View style={styles.seal} pointerEvents="none">
            <Sprite name="seal" size={72} />
          </View>

          {week.standing?.rank ? (
            <View style={styles.standingRow}>
              <Body>You’re </Body>
              <View style={styles.rankMark}>
                <View style={styles.rankRing} pointerEvents="none">
                  <PenRing width={58} height={34} color={CATEGORY.food.color} />
                </View>
                <Body tabular style={styles.rankText}>
                  {ordinal(week.standing.rank)}
                </Body>
              </View>
              <Body tabular>{` with ${week.standing.weeklyXp.toLocaleString('en-CA')} XP.`}</Body>
            </View>
          ) : (
            <Body>Finish a quest and you’ll show up this week.</Body>
          )}
          {week.standing?.passLine ? <Body>{week.standing.passLine}</Body> : null}
          {week.standing?.streakLine ? <Body>{week.standing.streakLine}</Body> : null}

          <View style={styles.cityHead}>
            <Heading>From the city:</Heading>
            <Small tone="soft" tabular>
              {`${week.todayCount} today`}
            </Small>
          </View>

          {week.notes.length === 0 ? (
            <Body tone="soft">The city is quiet today.</Body>
          ) : (
            week.notes.map((note) => (
              <View key={note.id} style={styles.note}>
                <Avatar username={note.username} uri={note.avatarUrl} size={36} />
                <View style={styles.noteCopy}>
                  <Body style={styles.finished} numberOfLines={1}>
                    {note.isYou ? 'You finished' : `${note.username} finished`}
                  </Body>
                  <Small tone="soft" numberOfLines={2}>
                    {`\u2026${note.phrase}`}
                  </Small>
                </View>
                <Cutout
                  uri={note.cutoutUrl}
                  category={note.category}
                  questTitle={note.phrase}
                  role="row"
                />
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.ink,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACE.s2,
  },
  title: {
    flex: 1,
  },
  bell: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLOR.white,
  },
  date: {
    alignItems: 'flex-end',
    paddingTop: SPACE.s1,
  },
  clock: {
    marginTop: SPACE.s2,
  },
  dropLink: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    marginBottom: SPACE.s4,
  },
  sentence: {
    marginBottom: SPACE.s4,
  },
  phrase: {
    fontFamily: FONT.black,
  },
  picked: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACE.s5,
  },
  friend: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLOR.white,
  },
  friendOverlap: {
    marginLeft: -8,
  },
  pickedLabel: {
    marginLeft: SPACE.s2,
    flex: 1,
  },
  sheet: {
    backgroundColor: COLOR.paper,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderBottomLeftRadius: RADIUS.sheet,
    borderBottomRightRadius: RADIUS.sheet,
    padding: SPACE.s4,
    paddingTop: SPACE.s6,
    gap: SPACE.s2,
  },
  seal: {
    position: 'absolute',
    top: -36,
    right: SPACE.s5,
  },
  standingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  rankMark: {
    minWidth: 48,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRing: {
    position: 'absolute',
    width: 58,
    height: 34,
  },
  rankText: {
    fontFamily: FONT.black,
  },
  cityHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: SPACE.s4,
    gap: SPACE.s3,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    paddingVertical: SPACE.s2,
  },
  noteCopy: {
    flex: 1,
    gap: 2,
  },
  finished: {
    fontFamily: FONT.black,
  },
})
