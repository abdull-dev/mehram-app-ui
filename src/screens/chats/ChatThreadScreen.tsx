/**
 * ChatThreadScreen — CH3
 *
 * Real-time 4-person group chat (2 seekers + 2 walis).
 * Features:
 *  - Live messages over Supabase Realtime
 *  - Multi-user typing indicator ("Ahmad and Tariq are typing…")
 *  - Per-message read receipts (initials of readers)
 *  - Presence: online dot or "last seen X ago" per participant
 *  - Gold left-bordered wali bubbles
 *  - System messages (blocked content notice, chat-opened notice)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  useChatRealtime,
  type AnyMessage,
  type ChatMessagePayload,
  type ParticipantPresence,
  type Typer,
} from '../../hooks/useChatRealtime';
import { getMessages } from '../../api/chat';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  page:      '#F6F5FA',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
  rose:      '#E6396E',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  goldBg:    '#FBF2DE',
  goldBorder:'#B5820D',
  goldInk:   '#7A5709',
  mintInk:   '#0A5C43',
  line:      '#EEEDF3',
  white:     '#FFFFFF',
  online:    '#17B07E',
} as const;

// ─── props ────────────────────────────────────────────────────────────────────
export interface ChatThreadScreenProps {
  conversationId: string;
  /** Current user's ID — used to classify message types */
  myUserId: string;
  /** Current user's display name — broadcast via presence so others see it */
  myDisplayName?: string;
  /** Display title shown in the header */
  chatTitle: string;
  onBack?: () => void;
  /**
   * Open the other seeker's profile. Omitted when there is nobody to open —
   * the button hides rather than rendering a control that does nothing.
   */
  onViewProfile?: () => void;
  /** Called immediately when the user sends a message — used for optimistic chat list update */
  onMessageSent?: (text: string) => void;
}

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function EyeIcon() {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

function SendIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"
      stroke={C.white} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.65)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 6v6l4 2" />
    </Svg>
  );
}

function DotsIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill={C.ink3}>
      <Circle cx={12} cy={5} r={2.2} />
      <Circle cx={12} cy={12} r={2.2} />
      <Circle cx={12} cy={19} r={2.2} />
    </Svg>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function fmtLastSeen(iso?: string): string {
  if (!iso) return '';
  const diffMs  = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);
  if (diffMin < 1)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

/** Classify message type from the receiver's perspective */
function classifyMsg(
  msg: ChatMessagePayload,
  myUserId: string,
): 'me' | 'them' | 'my-wali' | 'their-wali' {
  if (msg.senderId === myUserId) return 'me';
  if (msg.senderIsWali && msg.seekerIdOfWali === myUserId) return 'my-wali';
  if (msg.senderIsWali) return 'their-wali';
  return 'them';
}

/** Build wali bubble label: "TARIQ · YOUR WALI" / "HER WALI" */
function waliLabel(
  msg: ChatMessagePayload,
  myUserId: string,
): string {
  const relation = msg.seekerIdOfWali === myUserId ? 'YOUR WALI' : 'HER WALI';
  return `${msg.senderName.toUpperCase()} · ${relation}`;
}

/** Format typing string: "Ahmad is typing…" / "Ahmad and Tariq are typing…" */
function typingLabel(typers: Typer[]): string {
  if (typers.length === 0) return '';
  if (typers.length === 1) return `${typers[0].displayName} is typing…`;
  if (typers.length === 2) return `${typers[0].displayName} and ${typers[1].displayName} are typing…`;
  return `${typers[0].displayName} and ${typers.length - 1} others are typing…`;
}

/** Group messages by day for separators */
function groupByDay(messages: AnyMessage[]): { label: string; items: AnyMessage[] }[] {
  const groups: { label: string; items: AnyMessage[] }[] = [];
  let last = '';
  for (const m of messages) {
    const label = fmtDayLabel(m.sentAt);
    if (label !== last) { groups.push({ label, items: [] }); last = label; }
    groups[groups.length - 1].items.push(m);
  }
  return groups;
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** Tiny initials badges showing who has read a message */
function ReadReceipts({
  reads,
  participants,
  myUserId,
}: {
  reads: { userId: string; readAt: string }[];
  participants: ParticipantPresence[];
  myUserId: string;
}) {
  // Only show readers who are NOT the sender (we only call this for 'me' messages)
  const others = reads.filter(r => r.userId !== myUserId);
  if (others.length === 0) return null;

  return (
    <View style={rcStyles.row}>
      {others.map(r => {
        const p = participants.find(p => p.userId === r.userId);
        return (
          <View key={r.userId} style={rcStyles.avatar}>
            <Text style={rcStyles.avatarText}>{p ? initials(p.displayName) : '?'}</Text>
          </View>
        );
      })}
    </View>
  );
}

const rcStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3, justifyContent: 'flex-end', marginTop: 3, marginRight: 2 },
  avatar: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: C.indInk,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 7, fontWeight: '800', color: C.white },
});

// ─── Participant presence header row ─────────────────────────────────────────

function ParticipantsBar({ participants }: { participants: ParticipantPresence[] }) {
  if (participants.length === 0) return null;

  const online = participants.filter(p => p.isOnline);
  const offline = participants.filter(p => !p.isOnline);

  return (
    <View style={pbStyles.row}>
      {participants.map(p => (
        <View key={p.userId} style={pbStyles.item}>
          <View style={[pbStyles.dot, { backgroundColor: p.isOnline ? C.online : '#CCCAD6' }]} />
          <Text style={pbStyles.name} numberOfLines={1}>
            {p.displayName}{p.isWali ? ' (wali)' : ''}
          </Text>
          {!p.isOnline && !!p.lastSeenAt && (
            <Text style={pbStyles.seen}>{fmtLastSeen(p.lastSeenAt)}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const pbStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
    backgroundColor: C.white,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  name: { fontSize: 11, fontWeight: '600', color: C.ink2 },
  seen: { fontSize: 10, color: C.ink3 },
});

// ─── skeleton loader ──────────────────────────────────────────────────────────

const SKELETON_ROWS: { side: 'left' | 'right'; pct: string }[] = [
  { side: 'left',  pct: '62%' },
  { side: 'left',  pct: '42%' },
  { side: 'right', pct: '55%' },
  { side: 'left',  pct: '70%' },
  { side: 'right', pct: '48%' },
  { side: 'right', pct: '32%' },
];

function MessageSkeleton() {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[skStyles.container, { opacity }]}>
      {SKELETON_ROWS.map((row, i) => (
        <View
          key={i}
          style={[
            skStyles.bubble,
            row.side === 'left' ? skStyles.left : skStyles.right,
            { width: row.pct },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const skStyles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 24, gap: 12 },
  bubble: { height: 44, borderRadius: 17, backgroundColor: '#DDD9EE' },
  left:  { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  right: { alignSelf: 'flex-end',   borderBottomRightRadius: 5 },
});

// ─── component ────────────────────────────────────────────────────────────────

export function ChatThreadScreen({
  conversationId,
  myUserId,
  myDisplayName,
  chatTitle,
  onBack,
  onMessageSent,
  onViewProfile,
}: ChatThreadScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [inputText, setInputText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  // Which message has the ⋮ button visible (hover simulation via onPressIn)
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Popover menu — stores the message + screen Y of the anchor button
  const [popover, setPopover] = useState<{
    msg: ChatMessagePayload & { __kind: 'message' };
    anchorY: number;
    isMe: boolean;
  } | null>(null);
  // Refs to measure bubble positions for popover anchoring
  // Instance type, not the component type — the same distinction the single
  // refs above needed.
  const bubbleRefsMap = useRef<Map<string, React.ComponentRef<typeof View> | null>>(
    new Map(),
  );
  // Edit mode — when set, sending PATCHes instead of POSTing a new message
  const [editingId, setEditingId] = useState<string | null>(null);

  const {
    messages,
    participants,
    typers,
    isConnected,
    isReady,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    markSeen,
    prependMessages,
    setInitialMessages,
  } = useChatRealtime(conversationId, myUserId, myDisplayName);

  // Show skeleton only on first open when there's no cached data yet.
  const [isLoadingFirst, setIsLoadingFirst] = useState(() => messages.length === 0);

  // Pre-load history via HTTP only when cache is empty (first open).
  // On re-open the cache seeds messages instantly — no fetch needed.
  // The channel's chat:history event always replaces with the authoritative set.
  useEffect(() => {
    if (!conversationId || messages.length > 0) {
      setIsLoadingFirst(false);
      return;
    }
    getMessages(conversationId, undefined, 40)
      .then(msgs => {
        if (msgs.length > 0) setInitialMessages(msgs);
        setIsLoadingFirst(false);
      })
      .catch(() => { setIsLoadingFirst(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // intentionally exclude messages — only run on first open

  // Also hide skeleton when Realtime pushes messages before HTTP returns.
  useEffect(() => {
    if (messages.length > 0) setIsLoadingFirst(false);
  }, [messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages.length]);

  // Mark last message as seen — skip if it's our own message or still pending
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      last?.__kind === 'message' &&
      last.senderId !== myUserId &&
      !last.id.startsWith('optimistic-')
    ) {
      markSeen(last.id);
    }
  }, [messages.length, markSeen, myUserId]);

  // Load-more (older messages)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const oldest = messages.find(m => m.__kind === 'message') as (ChatMessagePayload & { __kind: 'message' }) | undefined;
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const older = await getMessages(conversationId, oldest.id, 40);
      if (older.length < 40) setHasMore(false);
      if (older.length > 0) {
        setCursor(older[0].id);
        prependMessages(older);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, messages, prependMessages]);

  function showHover(id: string) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredId(id);
  }

  function hideHoverSoon() {
    hoverTimerRef.current = setTimeout(() => setHoveredId(null), 1400);
  }

  function handleDotsPress(m: ChatMessagePayload & { __kind: 'message' }, isMe: boolean) {
    const ref = bubbleRefsMap.current.get(m.id);
    const open = (y: number) => {
      setHoveredId(null);
      setPopover({ msg: m, anchorY: y, isMe });
    };
    if (ref) {
      (ref as any).measure((_x: number, _y: number, _w: number, h: number, _px: number, py: number) => {
        open(py + h / 2);
      });
    } else {
      open(300);
    }
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    if (editingId) {
      editMessage(editingId, text);
      setEditingId(null);
    } else {
      sendMessage(text);
      onMessageSent?.(text);
    }
    setInputText('');
    sendTyping(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setInputText('');
    sendTyping(false);
  }

  function handleChangeText(text: string) {
    setInputText(text);
    sendTyping(text.length > 0);
  }

  const groups = groupByDay(messages);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.chatHeader}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
          <BackIcon />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.chatTitle} numberOfLines={1}>{chatTitle}</Text>
            {/* Connection dot */}
            <View style={[styles.connDot, { backgroundColor: isConnected ? C.online : '#CCCAD6' }]} />
          </View>
          <Text style={styles.chatSub}>
            {(() => {
              const others = participants.filter(
                p => p.userId !== myUserId && p.displayName !== p.userId,
              );
              return others.length > 0
                ? others.map(p => p.isWali ? `${p.displayName} (wali)` : p.displayName).join(', ')
                : '4 people in this chat';
            })()}
          </Text>
        </View>

        {/* The thread names someone the reader may not have decided about yet;
            their biodata is one tap away rather than back through Proposals. */}
        {!!onViewProfile && (
          <Pressable
            onPress={onViewProfile}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View profile"
            style={({ pressed }) => [styles.viewProfileBtn, pressed && { opacity: 0.65 }]}>
            <Text style={styles.viewProfileText}>View profile</Text>
          </Pressable>
        )}
      </View>

      {/* ── Participants presence bar ──────────────────────────────────────── */}
      <ParticipantsBar participants={participants.filter(p => p.userId !== myUserId && p.displayName !== p.userId)} />

      {/* ── Wali watch banner ─────────────────────────────────────────────── */}
      <View style={styles.watchBanner}>
        <EyeIcon />
        <Text style={styles.watchText}>
          Both walis can read this conversation as it happens
        </Text>
      </View>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.msgScroll}
        contentContainerStyle={[styles.msgContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y < 60) loadMore();
        }}>

        {loadingMore && (
          <Text style={styles.loadingMore}>Loading older messages…</Text>
        )}

        {isLoadingFirst ? (
          <MessageSkeleton />
        ) : groups.length === 0 ? (
          <View style={styles.noMsgs}>
            <Text style={styles.noMsgsText}>No messages yet — say salaam!</Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.label}>
              <Text style={styles.dayLabel}>{group.label}</Text>

              {group.items.map(m => {
                if (m.__kind === 'system') {
                  return (
                    <View key={m.id} style={styles.sysWrap}>
                      <View style={styles.sysBubble}>
                        <Text style={styles.sysText}>{m.text}</Text>
                      </View>
                    </View>
                  );
                }

                const type = classifyMsg(m, myUserId);

                if (type === 'me') {
                  const isPending = m.id.startsWith('optimistic-');
                  const isHovered = hoveredId === m.id;
                  return (
                    <View key={m.id}>
                      <Pressable
                        onPressIn={() => !isPending && showHover(m.id)}
                        onPressOut={hideHoverSoon}
                        style={styles.meWrap}
                      >
                        {isHovered && (
                          <Pressable
                            style={styles.dotsBtn}
                            onPress={() => handleDotsPress(m, true)}
                            hitSlop={8}
                          >
                            <DotsIcon />
                          </Pressable>
                        )}
                        <View
                          ref={el => { bubbleRefsMap.current.set(m.id, el); }}
                          style={[styles.meBubble, isPending && { opacity: 0.75 }, m.deleted && styles.deletedBubble]}
                        >
                          {m.deleted
                            ? <Text style={styles.deletedText}>Message deleted</Text>
                            : <Text style={styles.meBubbleText}>{m.text}</Text>
                          }
                          <View style={styles.timeMeRow}>
                            {isPending && <ClockIcon />}
                            {m.editedAt && !m.deleted && <Text style={styles.editedLabel}>edited</Text>}
                            <Text style={styles.timeMe}>{fmtTime(m.sentAt)}</Text>
                          </View>
                        </View>
                      </Pressable>
                      <ReadReceipts reads={m.reads} participants={participants} myUserId={myUserId} />
                    </View>
                  );
                }

                if (type === 'my-wali' || type === 'their-wali') {
                  const isHovered = hoveredId === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      onPressIn={() => showHover(m.id)}
                      onPressOut={hideHoverSoon}
                      style={styles.waliRow}
                    >
                      <View
                        ref={el => { bubbleRefsMap.current.set(m.id, el); }}
                        style={styles.waliWrap}
                      >
                        <Text style={styles.waliLabel}>{waliLabel(m, myUserId)}</Text>
                        {m.deleted
                          ? <Text style={styles.deletedTextDark}>Message deleted</Text>
                          : <Text style={styles.waliText}>{m.text}</Text>
                        }
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {m.editedAt && !m.deleted && <Text style={styles.editedLabelDark}>edited</Text>}
                          <Text style={styles.timeThem}>{fmtTime(m.sentAt)}</Text>
                        </View>
                      </View>
                      {isHovered && (
                        <Pressable
                          style={styles.dotsBtnRight}
                          onPress={() => handleDotsPress(m, false)}
                          hitSlop={8}
                        >
                          <DotsIcon />
                        </Pressable>
                      )}
                    </Pressable>
                  );
                }

                // 'them'
                const isHovered = hoveredId === m.id;
                return (
                  <View key={m.id}>
                    <Text style={styles.themName}>{m.senderName}</Text>
                    <Pressable
                      onPressIn={() => showHover(m.id)}
                      onPressOut={hideHoverSoon}
                      style={styles.themWrap}
                    >
                      <View
                        ref={el => { bubbleRefsMap.current.set(m.id, el); }}
                        style={[styles.themBubble, m.deleted && styles.deletedBubbleLight]}
                      >
                        {m.deleted
                          ? <Text style={styles.deletedTextDark}>Message deleted</Text>
                          : <Text style={styles.themBubbleText}>{m.text}</Text>
                        }
                        <View style={{ flexDirection: 'row', gap: 4 }}>
                          {m.editedAt && !m.deleted && <Text style={styles.editedLabelDark}>edited</Text>}
                          <Text style={styles.timeThem}>{fmtTime(m.sentAt)}</Text>
                        </View>
                      </View>
                      {isHovered && (
                        <Pressable
                          style={styles.dotsBtnRight}
                          onPress={() => handleDotsPress(m, false)}
                          hitSlop={8}
                        >
                          <DotsIcon />
                        </Pressable>
                      )}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* ── Typing indicator ──────────────────────────────────────────────── */}
      {typers.length > 0 && (
        <View style={styles.typingBar}>
          <View style={styles.typingDots}>
            {[0, 1, 2].map(i => (
              <View key={i} style={[styles.typingDot, { opacity: 0.4 + i * 0.3 }]} />
            ))}
          </View>
          <Text style={styles.typingText}>{typingLabel(typers)}</Text>
        </View>
      )}

      {/* ── Edit mode banner ─────────────────────────────────────────────── */}
      {editingId && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText} numberOfLines={1}>
            Editing message
          </Text>
          <Pressable onPress={cancelEdit} hitSlop={10}>
            <Text style={styles.editBannerCancel}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* ── Compose bar ──────────────────────────────────────────────────── */}
      <View style={[styles.compose, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.composeRow}>
          <TextInput
            style={styles.input}
            placeholder={isReady ? 'Write a message' : 'Connecting…'}
            placeholderTextColor={C.ink3}
            value={inputText}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSend}
            editable={isReady}
            multiline
            blurOnSubmit={false}
            returnKeyType="send"
            textAlignVertical="center"
            underlineColorAndroid="transparent"
          />
          <Pressable
            onPress={handleSend}
            disabled={!isReady || !inputText.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (!isReady || !inputText.trim()) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}>
            <SendIcon />
          </Pressable>
        </View>
        <Text style={styles.composeWarn}>
          Phone numbers, emails and links are blocked automatically.
        </Text>
      </View>

      {/* ── Bubble popover menu ──────────────────────────────────────────── */}
      {popover && (() => {
        const { msg, anchorY, isMe } = popover;
        const readers = msg.reads.filter(r => r.userId !== msg.senderId);
        // Show card above anchor if anchor is in bottom half of screen, else below
        const CARD_H_ESTIMATE = 180;
        const screenH = 800; // safe fallback; exact value doesn't matter much
        const showAbove = anchorY > screenH / 2;
        const cardTop = showAbove ? Math.max(anchorY - CARD_H_ESTIMATE - 8, 60) : anchorY + 8;

        return (
          <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPopover(null)}>
            <Pressable style={popStyles.overlay} onPress={() => setPopover(null)}>
              {/* Stop press propagation so tapping inside card doesn't close it */}
              <Pressable
                style={[popStyles.card, { top: cardTop }, isMe ? popStyles.cardRight : popStyles.cardLeft]}
                onPress={() => {}}
              >
                {/* Actions — own non-deleted messages only */}
                {isMe && !msg.deleted && (
                  <View style={popStyles.actions}>
                    <Pressable
                      style={({ pressed }) => [popStyles.actionBtn, pressed && { opacity: 0.5 }]}
                      onPress={() => {
                        setInputText(msg.text);
                        setEditingId(msg.id);
                        setPopover(null);
                      }}
                    >
                      <Text style={popStyles.actionText}>Edit</Text>
                    </Pressable>
                    <View style={popStyles.actionDivider} />
                    <Pressable
                      style={({ pressed }) => [popStyles.actionBtn, pressed && { opacity: 0.5 }]}
                      onPress={() => { deleteMessage(msg.id); setPopover(null); }}
                    >
                      <Text style={[popStyles.actionText, { color: '#D0244A' }]}>Delete</Text>
                    </Pressable>
                  </View>
                )}

                {/* Read by */}
                <View style={[popStyles.readsRow, (isMe && !msg.deleted) && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line }]}>
                  <Text style={popStyles.readsLabel}>Read by</Text>
                  {readers.length === 0
                    ? <Text style={popStyles.readsEmpty}>No one yet</Text>
                    : (
                      <View style={popStyles.readsChips}>
                        {readers.map(r => {
                          const p = participants.find(p => p.userId === r.userId);
                          const name = p?.displayName && p.displayName !== r.userId ? p.displayName : '?';
                          return (
                            <View key={r.userId} style={popStyles.chip}>
                              <View style={popStyles.chipAvatar}>
                                <Text style={popStyles.chipAvatarText}>{name[0].toUpperCase()}</Text>
                              </View>
                              <Text style={popStyles.chipName}>{name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )
                  }
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}
    </KeyboardAvoidingView>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },

  // Header
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: C.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  // Sits at the end of the header row, which is flex with a gap; the title
  // column above it has flex:1 and gives up the space.
  viewProfileBtn: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.indSoft,
    flexShrink: 0,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.indInk,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: '#F4F3F9',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatTitle: {
    fontSize: 15.5, fontWeight: '700', color: C.ink, letterSpacing: -0.2, flexShrink: 1,
  },
  connDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  chatSub: { fontSize: 11, color: C.ink3, marginTop: 2 },

  // Watch banner
  watchBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.indSoft,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  watchText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: C.indInk, lineHeight: 16 },

  // Messages
  msgScroll: { flex: 1 },
  msgContent: { paddingHorizontal: 14, paddingTop: 10 },
  loadingMore: { textAlign: 'center', fontSize: 11.5, color: C.ink3, marginBottom: 10 },
  noMsgs: { paddingTop: 60, alignItems: 'center' },
  noMsgsText: { fontSize: 13.5, color: C.ink3 },
  dayLabel: {
    textAlign: 'center', fontSize: 11, fontWeight: '600',
    color: C.ink3, marginVertical: 14,
  },

  // System message
  sysWrap: { alignItems: 'center', marginBottom: 12 },
  sysBubble: {
    backgroundColor: C.indSoft, borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 14, maxWidth: '92%',
  },
  sysText: {
    fontSize: 11.5, fontWeight: '600', color: C.indInk,
    lineHeight: 17, textAlign: 'center',
  },

  // Me bubble
  meWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 2, gap: 6 },
  dotsBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  meBubble: {
    maxWidth: '80%', backgroundColor: C.rose,
    borderRadius: 17, borderBottomRightRadius: 6,
    paddingVertical: 11, paddingHorizontal: 13,
  },
  meBubbleText: { fontSize: 13.5, color: C.white, lineHeight: 20 },
  timeMeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
  timeMe: { fontSize: 10, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },

  // Them bubble
  themName: { fontSize: 10.5, fontWeight: '700', color: C.ink3, marginBottom: 3, marginLeft: 2 },
  themWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginBottom: 9, gap: 6 },
  dotsBtnRight: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  themBubble: {
    maxWidth: '80%', backgroundColor: C.white,
    borderRadius: 17, borderBottomLeftRadius: 6,
    paddingVertical: 11, paddingHorizontal: 13,
    shadowColor: 'rgba(40,30,80,0.06)',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 1,
  },
  themBubbleText: { fontSize: 13.5, color: C.ink, lineHeight: 20 },
  timeThem: { fontSize: 10, color: C.ink3, marginTop: 4 },

  // Wali bubble
  waliRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 9 },
  waliWrap: {
    maxWidth: '88%',
    backgroundColor: '#FBF2DE',
    borderLeftWidth: 3, borderLeftColor: '#B5820D',
    borderTopRightRadius: 14, borderBottomRightRadius: 14,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  waliLabel: {
    fontSize: 10.5, fontWeight: '700', color: '#7A5709',
    letterSpacing: 0.4, marginBottom: 3,
  },
  waliText: { fontSize: 13, color: '#5B4409', lineHeight: 19 },

  // Typing
  typingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: C.page,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: {
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.ink3,
  },
  typingText: { fontSize: 11.5, color: C.ink3, fontStyle: 'italic' },

  // Compose
  compose: {
    backgroundColor: C.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    paddingHorizontal: 14, paddingTop: 11,
  },
  composeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    borderRadius: 14, backgroundColor: '#F4F3F9',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13.5, color: C.ink, lineHeight: 20,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: C.rose,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: '#E4DDEF' },
  composeWarn: {
    fontSize: 10.5, color: C.ink3, textAlign: 'center',
    marginTop: 8, marginBottom: 4, lineHeight: 15,
  },

  // Deleted / edited states
  deletedBubble: { backgroundColor: 'rgba(230,57,110,0.35)' },
  deletedBubbleLight: { backgroundColor: '#F0EEF8' },
  deletedText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' },
  deletedTextDark: { fontSize: 13, color: C.ink3, fontStyle: 'italic' },
  editedLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' },
  editedLabelDark: { fontSize: 9, color: C.ink3, fontStyle: 'italic' },

  // Edit mode banner
  editBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.indSoft,
    paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line,
  },
  editBannerText: { fontSize: 12, fontWeight: '600', color: C.indInk, flex: 1 },
  editBannerCancel: { fontSize: 16, color: C.indInk, paddingLeft: 12 },
});

// ─── popover bubble menu styles ───────────────────────────────────────────────
const popStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  card: {
    position: 'absolute',
    width: 230,
    backgroundColor: C.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  cardRight: { right: 14 },
  cardLeft: { left: 14 },
  readsRow: {
    paddingHorizontal: 14, paddingVertical: 10,
  },
  readsLabel: { fontSize: 10, fontWeight: '700', color: C.ink3, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  readsEmpty: { fontSize: 12, color: C.ink3, fontStyle: 'italic' },
  readsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.indInk,
    alignItems: 'center', justifyContent: 'center',
  },
  chipAvatarText: { fontSize: 9, fontWeight: '800', color: C.white },
  chipName: { fontSize: 11.5, fontWeight: '600', color: C.ink },
  actions: { paddingVertical: 2 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 13 },
  actionText: { fontSize: 14, color: C.ink },
  actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: 14 },
});
