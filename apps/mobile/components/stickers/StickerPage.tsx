/**
 * Your page: the sticker board and, for its owner, the sticker drawer
 * (BRAND.md §6 Placement, §7 "Your page", §8 Motion).
 *
 * - The board is `desk` coloured. Stickers sit where the player put them,
 *   stored as fractions of the board so a page looks the same on every phone.
 * - Owners place stickers by dragging one up out of the drawer onto the board,
 *   or by tapping it in the drawer and then tapping the board.
 * - Tapping a placed sticker selects it: Tilt, Bigger, Smaller, Remove.
 *   Dragging moves it; it lifts to 108% while held and settles in 180ms.
 * - Visitors see the board read-only. Missing or hidden stickers render nothing.
 */

import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native'
import { Sticker } from '@/components/Sticker'
import { Body, BodyStrong, Small } from '@/components/ui/Text'
import { useStickerPage } from '@/hooks/useStickerPage'
import {
  BOARD_ASPECT,
  STICKER_SIZE,
  bigger,
  dragBy,
  nextTilt,
  smaller,
  stickerPoints,
  toFraction,
  toPoints,
  topZ,
  type DrawerEntry,
  type Placement,
  type StickerRecord,
} from '@/lib/stickerBoard'
import { COLOR, RADIUS, SPACE } from '@/lib/theme'

const SETTLE = { duration: 180, easing: Easing.out(Easing.cubic) }
const LIFT = { duration: 120, easing: Easing.out(Easing.cubic) }

interface Props {
  userId: string | null | undefined
  /** The signed-in player looking at their own page. */
  owner: boolean
  /** True while a sticker is being dragged, so the screen can stop scrolling. */
  onDragChange?: (dragging: boolean) => void
  /** Shown to the owner when their drawer is empty (e.g. a "Find a quest" button). */
  emptyAction?: React.ReactNode
}

export function StickerPage({ userId, owner, onDragChange, emptyAction }: Props) {
  const page = useStickerPage(userId, owner)
  const [board, setBoard] = useState({ x: 0, y: 0, w: 0, h: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ sticker: StickerRecord; x: number; y: number } | null>(null)
  const root = useRef<ComponentRef<typeof View>>(null)
  const rootOrigin = useRef({ x: 0, y: 0 })

  const selected = page.board.find((p) => p.id === selectedId) ?? null
  const picked = pickedId ? page.stickersById[pickedId] ?? null : null

  const onBoardLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width } = e.nativeEvent.layout
    setBoard({ x, y, w: width, h: Math.round(width * BOARD_ASPECT) })
  }, [])

  const setDragging = useCallback((on: boolean) => onDragChange?.(on), [onDragChange])

  // ─── Board taps: place the picked sticker, or deselect ────────────────────
  const onBoardPress = useCallback(
    async (e: GestureResponderEvent) => {
      if (!owner) return
      if (pickedId) {
        const { x, y } = toFraction(e.nativeEvent.locationX, e.nativeEvent.locationY, board.w, board.h)
        const id = await page.place(pickedId, x, y)
        setPickedId(null)
        if (id) setSelectedId(id)
        return
      }
      setSelectedId(null)
    },
    [owner, pickedId, board.w, board.h, page],
  )

  // ─── Dragging out of the drawer ───────────────────────────────────────────
  const ghostStart = useCallback(
    (sticker: StickerRecord, pageX: number, pageY: number) => {
      setDragging(true)
      setPickedId(null)
      setSelectedId(null)
      root.current?.measureInWindow((x: number, y: number) => {
        rootOrigin.current = { x, y }
        setGhost({ sticker, x: pageX - x, y: pageY - y })
      })
    },
    [setDragging],
  )
  const ghostMove = useCallback((pageX: number, pageY: number) => {
    setGhost((g) => (g ? { ...g, x: pageX - rootOrigin.current.x, y: pageY - rootOrigin.current.y } : g))
  }, [])
  const ghostDrop = useCallback(
    async (pageX: number, pageY: number) => {
      setDragging(false)
      const current = ghost
      setGhost(null)
      if (!current) return
      const rx = pageX - rootOrigin.current.x - board.x
      const ry = pageY - rootOrigin.current.y - board.y
      if (rx < 0 || ry < 0 || rx > board.w || ry > board.h) return
      const { x, y } = toFraction(rx, ry, board.w, board.h)
      const id = await page.place(current.sticker.id, x, y)
      if (id) setSelectedId(id)
    },
    [ghost, board, page, setDragging],
  )

  if (page.status === 'unavailable' || page.status === 'loading') {
    return page.status === 'loading' ? <View style={[styles.board, styles.boardLoading]} /> : null
  }
  if (page.status === 'error') {
    return (
      <Body tone="soft" style={styles.pad}>
        {owner ? 'Your stickers didn’t load. Pull to try again.' : 'Their stickers didn’t load.'}
      </Body>
    )
  }
  // Visitors see nothing at all when the board is empty.
  if (!owner && page.board.length === 0) return null

  const earnedEntries = page.drawer.filter((d) => d.earned)

  return (
    <View ref={root} collapsable={false}>
      <Pressable
        onLayout={onBoardLayout}
        onPress={onBoardPress}
        disabled={!owner}
        accessibilityRole={owner && picked ? 'button' : undefined}
        accessibilityLabel={
          owner && picked
            ? `Place ${picked.alt_text} in the middle of your page`
            : `${owner ? 'Your' : 'Their'} sticker page, ${page.board.length} ${page.board.length === 1 ? 'sticker' : 'stickers'}`
        }
        onAccessibilityTap={owner && picked ? () => void page.place(picked.id, 0.5, 0.45).then(() => setPickedId(null)) : undefined}
        style={[styles.board, { height: board.h || undefined, aspectRatio: board.h ? undefined : 1 / BOARD_ASPECT }]}
      >
        {board.w > 0
          ? page.board.map((p) => (
              <PlacedSticker
                key={p.id}
                placement={p}
                sticker={page.stickersById[p.sticker_id]}
                boardW={board.w}
                boardH={board.h}
                editable={owner}
                selected={p.id === selectedId}
                onSelect={() => {
                  setPickedId(null)
                  setSelectedId((cur) => (cur === p.id ? null : p.id))
                }}
                onDragStart={() => {
                  setDragging(true)
                  setSelectedId(p.id)
                  const z = topZ(page.board)
                  if (z - 1 !== p.z) void page.update(p.id, { z })
                }}
                onMoveEnd={(dx, dy) => {
                  setDragging(false)
                  if (dx === 0 && dy === 0) return
                  void page.update(p.id, dragBy(p.x, p.y, dx, dy, board.w, board.h))
                }}
              />
            ))
          : null}
        {owner && page.board.length === 0 ? (
          <View style={styles.emptyBoard} pointerEvents="none">
            <Body tone="soft" style={styles.center}>
              {earnedEntries.length
                ? 'Your page is empty. Drag a sticker up from your drawer, or tap one and then tap here.'
                : 'Your page is empty. Verify a quest and its sticker lands in your drawer.'}
            </Body>
          </View>
        ) : null}
      </Pressable>

      {owner ? (
        <View style={styles.controls}>
          {selected ? (
            <>
              <Control label="Tilt" onPress={() => void page.update(selected.id, { tilt: nextTilt(selected.tilt) })} />
              <Control label="Bigger" onPress={() => void page.update(selected.id, { scale: bigger(selected.scale) })} disabled={selected.scale >= 1.6} />
              <Control label="Smaller" onPress={() => void page.update(selected.id, { scale: smaller(selected.scale) })} disabled={selected.scale <= 0.6} />
              <Control
                label="Remove"
                onPress={() => {
                  void page.remove(selected.id)
                  setSelectedId(null)
                }}
              />
              <Control label="Done" primary onPress={() => setSelectedId(null)} />
            </>
          ) : picked ? (
            <>
              <Small style={styles.flex}>{`Tap the board to place ${picked.alt_text}.`}</Small>
              <Control label="Cancel" onPress={() => setPickedId(null)} />
            </>
          ) : earnedEntries.length ? (
            <Small tone="soft">Drag a sticker up onto your page, or tap one, then tap the board.</Small>
          ) : null}
        </View>
      ) : null}
      {owner && page.message ? (
        <Small style={styles.pad} accessibilityLiveRegion="polite">
          {page.message}
        </Small>
      ) : null}

      {owner ? (
        <Drawer
          entries={page.drawer}
          pickedId={pickedId}
          onPick={(id) => {
            setSelectedId(null)
            setPickedId((cur) => (cur === id ? null : id))
          }}
          onGhostStart={ghostStart}
          onGhostMove={ghostMove}
          onGhostDrop={ghostDrop}
          emptyAction={emptyAction}
        />
      ) : null}

      {ghost ? (
        <View
          pointerEvents="none"
          style={[styles.ghost, { left: ghost.x - STICKER_SIZE.board / 2, top: ghost.y - STICKER_SIZE.board / 2 }]}
        >
          <Sticker uri={ghost.sticker.image_url} size="board" tilt={-4} style={styles.lifted} />
        </View>
      ) : null}
    </View>
  )
}

// ─── A sticker on the board ──────────────────────────────────────────────────

function PlacedSticker({
  placement,
  sticker,
  boardW,
  boardH,
  editable,
  selected,
  onSelect,
  onDragStart,
  onMoveEnd,
}: {
  placement: Placement
  sticker: StickerRecord | undefined
  boardW: number
  boardH: number
  editable: boolean
  selected: boolean
  onSelect: () => void
  onDragStart: () => void
  onMoveEnd: (dx: number, dy: number) => void
}) {
  const drag = useRef(new Animated.ValueXY()).current
  const lift = useRef(new Animated.Value(1)).current
  const latest = useRef({ editable, onSelect, onDragStart, onMoveEnd })
  latest.current = { editable, onSelect, onDragStart, onMoveEnd }
  const moved = useRef(false)

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => latest.current.editable,
        onMoveShouldSetPanResponder: (_, g) => latest.current.editable && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          moved.current = false
          Animated.timing(lift, { toValue: 1.08, ...LIFT, useNativeDriver: false }).start()
        },
        onPanResponderMove: (_, g) => {
          if (!moved.current && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4)) {
            moved.current = true
            latest.current.onDragStart()
          }
          if (moved.current) drag.setValue({ x: g.dx, y: g.dy })
        },
        onPanResponderRelease: (_, g) => finish(g.dx, g.dy),
        onPanResponderTerminate: (_, g) => finish(g.dx, g.dy),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  function finish(dx: number, dy: number) {
    Animated.timing(lift, { toValue: 1, ...SETTLE, useNativeDriver: false }).start()
    if (!moved.current) {
      latest.current.onSelect()
      return
    }
    moved.current = false
    latest.current.onMoveEnd(dx, dy)
    drag.setValue({ x: 0, y: 0 })
  }

  if (!sticker) return null
  const size = stickerPoints(placement.scale, boardW)
  const { left, top } = toPoints(placement.x, placement.y, boardW, boardH, size)

  return (
    <Animated.View
      {...(editable ? responder.panHandlers : null)}
      accessible
      accessibilityRole={editable ? 'button' : 'image'}
      accessibilityLabel={editable ? `${sticker.alt_text}. Double tap to select` : sticker.alt_text}
      accessibilityState={editable ? { selected } : undefined}
      onAccessibilityTap={editable ? onSelect : undefined}
      style={[
        styles.placed,
        { left, top, width: size, height: size, zIndex: placement.z },
        selected && styles.selected,
        { transform: [...drag.getTranslateTransform(), { scale: lift }] },
      ]}
    >
      <Sticker uri={sticker.image_url} size={size} tilt={placement.tilt} />
    </Animated.View>
  )
}

// ─── The drawer ──────────────────────────────────────────────────────────────

function Drawer({
  entries,
  pickedId,
  onPick,
  onGhostStart,
  onGhostMove,
  onGhostDrop,
  emptyAction,
}: {
  entries: DrawerEntry[]
  pickedId: string | null
  onPick: (id: string) => void
  onGhostStart: (sticker: StickerRecord, pageX: number, pageY: number) => void
  onGhostMove: (pageX: number, pageY: number) => void
  onGhostDrop: (pageX: number, pageY: number) => void
  emptyAction?: React.ReactNode
}) {
  const earnedCount = entries.filter((e) => e.earned).length
  return (
    <View style={styles.drawer}>
      <View style={styles.drawerHead}>
        <BodyStrong>Sticker drawer</BodyStrong>
        <Small tone="soft" tabular>
          {`${earnedCount} of ${entries.length}`}
        </Small>
      </View>
      {earnedCount === 0 ? (
        <View style={styles.drawerEmpty}>
          <Body tone="soft">Verify a quest and its sticker lands here.</Body>
          {emptyAction}
        </View>
      ) : null}
      {entries.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.drawerRow}>
          {entries.map((entry) => (
            <DrawerItem
              key={entry.sticker.id}
              entry={entry}
              picked={entry.sticker.id === pickedId}
              onPick={onPick}
              onGhostStart={onGhostStart}
              onGhostMove={onGhostMove}
              onGhostDrop={onGhostDrop}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  )
}

function DrawerItem({
  entry,
  picked,
  onPick,
  onGhostStart,
  onGhostMove,
  onGhostDrop,
}: {
  entry: DrawerEntry
  picked: boolean
  onPick: (id: string) => void
  onGhostStart: (sticker: StickerRecord, pageX: number, pageY: number) => void
  onGhostMove: (pageX: number, pageY: number) => void
  onGhostDrop: (pageX: number, pageY: number) => void
}) {
  const latest = useRef({ onGhostStart, onGhostMove, onGhostDrop, entry })
  latest.current = { onGhostStart, onGhostMove, onGhostDrop, entry }
  const responder = useMemo(
    () =>
      PanResponder.create({
        // Up and out of the drawer is a drag; sideways scrolls the drawer.
        onMoveShouldSetPanResponder: (_, g) =>
          latest.current.entry.earned && g.dy < -10 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (_, g) => latest.current.onGhostStart(latest.current.entry.sticker, g.moveX, g.moveY),
        onPanResponderMove: (_, g) => latest.current.onGhostMove(g.moveX, g.moveY),
        onPanResponderRelease: (_, g) => void latest.current.onGhostDrop(g.moveX, g.moveY),
        onPanResponderTerminate: (_, g) => void latest.current.onGhostDrop(g.moveX, g.moveY),
      }),
    [],
  )
  const { sticker, earned, hint } = entry

  return (
    <View {...(earned ? responder.panHandlers : null)} style={styles.drawerItem}>
      <Pressable
        disabled={!earned}
        onPress={() => onPick(sticker.id)}
        accessibilityRole={earned ? 'button' : 'image'}
        accessibilityLabel={earned ? `${sticker.alt_text}. Double tap, then tap your page to place it` : `${sticker.alt_text}, not earned yet. ${hint ?? ''}`}
        accessibilityState={earned ? { selected: picked } : { disabled: true }}
        style={[styles.drawerSlot, picked && styles.drawerSlotPicked]}
      >
        <Sticker uri={sticker.image_url} size="drawer" locked={!earned} />
      </Pressable>
      {!earned && hint ? (
        <Small tone="faint" numberOfLines={2} style={styles.hint}>
          {hint}
        </Small>
      ) : null}
    </View>
  )
}

function Control({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string
  onPress: () => void
  primary?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.control,
        primary && styles.controlPrimary,
        disabled && styles.controlDisabled,
        pressed && styles.controlPressed,
      ]}
    >
      <Small color={primary ? COLOR.white : COLOR.ink}>{label}</Small>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: SPACE.s4 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  board: {
    marginHorizontal: SPACE.s4,
    borderRadius: RADIUS.card,
    backgroundColor: COLOR.desk,
    overflow: 'hidden',
  },
  boardLoading: { aspectRatio: 1 / BOARD_ASPECT },
  emptyBoard: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.s6,
  },
  placed: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Editing chrome, not part of the sticker: shows which one the buttons act on.
  selected: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLOR.ink,
    borderRadius: RADIUS.control,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACE.s2,
    paddingHorizontal: SPACE.s4,
    paddingTop: SPACE.s3,
    minHeight: 48 + SPACE.s3,
  },
  control: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: SPACE.s4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLOR.secondaryFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPrimary: { backgroundColor: COLOR.ink },
  controlDisabled: { opacity: 0.45 },
  controlPressed: { transform: [{ scale: 0.97 }] },
  drawer: { marginTop: SPACE.s4, gap: SPACE.s2 },
  drawerHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.s4,
  },
  drawerEmpty: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, alignItems: 'flex-start' },
  drawerRow: { paddingHorizontal: SPACE.s4, gap: SPACE.s3, paddingVertical: SPACE.s2 },
  drawerItem: { width: 88, alignItems: 'center', gap: SPACE.s1 },
  drawerSlot: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLOR.desk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerSlotPicked: { backgroundColor: COLOR.ink },
  hint: { textAlign: 'center' },
  ghost: { position: 'absolute', zIndex: 1000 },
  lifted: { transform: [{ scale: 1.08 }, { rotate: '-4deg' }] },
})

export default StickerPage
