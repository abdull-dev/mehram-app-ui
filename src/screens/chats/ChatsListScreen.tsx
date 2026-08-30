/**
 * ChatsListScreen — CH1 / CH2
 *
 * CH1: One or more open conversations.
 * CH2: Empty state (no accepted proposals yet).
 *
 * Both walis join automatically once a proposal is accepted by both families.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  page:    '#F6F5FA',
  ink:     '#17171F',
  ink2:    '#5F5E70',
  ink3:    '#9695A5',
  rose:    '#E6396E',
  roseSoft:'#FDECF2',
  roseInk: '#A31C48',
  indSoft: '#EEECF8',
  indInk:  '#332C66',
  mintSoft:'#E5F6F0',
  mintInk: '#0A5C43',
  line:    '#EEEDF3',
  white:   '#FFFFFF',
} as const;

// ─── types ────────────────────────────────────────────────────────────────────
export interface ChatSummary {
  id: string;
  /** matchId — used to open chat from ProfileDetailScreen */
  matchId?: string;
  /** Display name of the other seeker */
  name: string;
  age?: number;
  /** Last message snippet */
  lastMessage: string;
  /** ISO timestamp of last message */
  lastMessageAt: string;
  /** userId of whoever sent the last message */
  lastMessageSenderId?: string;
  /** Current user's id — drives "Read" chip visibility */
  myUserId?: string;
  /** Total participants in the group (typically 4) */
  participantCount?: number;
  /** Number of unread messages */
  unreadCount?: number;
}

export interface ChatsListScreenProps {
  chats?: ChatSummary[];
  loading?: boolean;
  onOpenChat?: (chatId: string) => void;
  onSeeProposals?: () => void;
  onBack?: () => void;
  /** True when inside wali home (no standalone back button needed) */
  embedded?: boolean;
}

// ─── icons ────────────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

function ChatIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none"
      stroke="#8C86A8" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" />
    </Svg>
  );
}

function BackIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr  = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr  < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// ─── skeleton ─────────────────────────────────────────────────────────────────
function SkeletonChatCard() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <Animated.View style={[styles.chatCard, styles.skelCard, { opacity }]}>
      <View style={styles.skelLine1} />
      <View style={styles.skelLine2} />
      <View style={styles.skelLine3} />
    </Animated.View>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
export function ChatsListScreen({
  chats = [],
  loading = false,
  onOpenChat,
  onSeeProposals,
  onBack,
  embedded = false,
}: ChatsListScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: embedded ? 0 : insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header — only when used as a standalone pushed screen */}
      {!embedded && (
        <View style={styles.header}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Chats</Text>
          <View style={styles.headerSpacer} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 40) },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Tab-style heading (shown when embedded in home tabs) */}
        {embedded && <Text style={styles.pageTitle}>Chats</Text>}

        {/* Wali transparency banner */}
        <View style={styles.eyeBanner}>
          <EyeIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.eyeTitle}>Both walis can read every conversation</Text>
            <Text style={styles.eyeBody}>
              They see messages as they are sent, not a summary afterwards.
            </Text>
          </View>
        </View>

        {loading ? (
          /* ── Loading: skeleton cards ───────────────────────────────────── */
          <>
            <SkeletonChatCard />
            <SkeletonChatCard />
            <SkeletonChatCard />
          </>
        ) : chats.length === 0 ? (
          /* ── CH2: Empty state ──────────────────────────────────────────── */
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <ChatIcon />
            </View>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>
              A chat opens once a proposal is accepted by both families.
              Both walis join automatically and can read everything.
            </Text>
            <Pressable
              onPress={onSeeProposals}
              style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.82 }]}>
              <Text style={styles.emptyBtnText}>See your proposals</Text>
            </Pressable>
          </View>
        ) : (
          /* ── CH1: Conversation list ────────────────────────────────────── */
          chats.map(chat => {
            const hasUnread = (chat.unreadCount ?? 0) > 0;
            const participantCount = chat.participantCount ?? 4;
            const time = fmtTime(chat.lastMessageAt);

            // "Read" chip: only show when I sent the last msg AND the other side read it
            const iMySentLast = !!chat.myUserId && chat.lastMessageSenderId === chat.myUserId;
            const showReadChip = iMySentLast && !hasUnread;

            return (
              <Pressable
                key={chat.id}
                onPress={() => onOpenChat?.(chat.id)}
                style={({ pressed }) => [styles.chatCard, pressed && { opacity: 0.82 }]}>
                <View style={styles.chatCardInner}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chatName, hasUnread && styles.chatNameBold]}>
                      {chat.name}{chat.age != null ? ` · ${chat.age}` : ''}
                    </Text>
                    <Text style={styles.chatPreview} numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    <Text style={styles.chatMeta}>
                      {participantCount} people in this chat · {time}
                    </Text>
                  </View>

                  {hasUnread ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{chat.unreadCount}</Text>
                    </View>
                  ) : showReadChip ? (
                    <View style={styles.readChip}>
                      <Text style={styles.readChipText}>Read</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },

  // ── Header (standalone mode) ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    backgroundColor: C.page,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.line,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.2,
  },
  headerSpacer: { width: 38 },

  // ── Scroll ──
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // ── Tab-mode title ──
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: C.ink,
    marginBottom: 12,
    paddingHorizontal: 2,
  },

  // ── Eye banner ──
  eyeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.indSoft,
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
  },
  eyeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.indInk,
    marginBottom: 2,
  },
  eyeBody: {
    fontSize: 12,
    color: '#4B4384',
    lineHeight: 17,
  },

  // ── Empty state (CH2) ──
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: 'rgba(40,30,80,0.055)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#EFEDF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: C.ink2,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  emptyBtn: {
    height: 47,
    borderRadius: 15,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: C.white,
  },

  // ── Skeleton ──
  skelCard: {
    padding: 18,
    paddingHorizontal: 18,
    marginBottom: 13,
  },
  skelLine1: {
    height: 14,
    width: '55%',
    borderRadius: 7,
    backgroundColor: '#DDD9EC',
    marginBottom: 10,
  },
  skelLine2: {
    height: 11,
    width: '85%',
    borderRadius: 6,
    backgroundColor: '#E8E5F2',
    marginBottom: 8,
  },
  skelLine3: {
    height: 10,
    width: '40%',
    borderRadius: 5,
    backgroundColor: '#EDEBF5',
  },

  // ── Chat cards (CH1) ──
  chatCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    marginBottom: 13,
    shadowColor: 'rgba(40,30,80,0.055)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 2,
    overflow: 'hidden',
  },
  chatCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: C.ink,
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  chatNameBold: {
    fontWeight: '800',
  },
  chatPreview: {
    fontSize: 13,
    color: C.ink2,
    marginBottom: 4,
    lineHeight: 19,
  },
  chatMeta: {
    fontSize: 11.5,
    color: C.ink3,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginTop: 2,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.white,
  },
  readChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F0F6',
    marginTop: 2,
  },
  readChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6E6B80',
  },
});
