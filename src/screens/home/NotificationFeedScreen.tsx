/**
 * NotificationFeedScreen
 *
 * The notifications themselves. Distinct from `NotificationsScreen`, which is
 * the preferences page in Settings deciding *which* ones get sent.
 *
 *   ┌──────────────────────────────────────┐
 *   │  ‹  Notifications      Mark all read │
 *   │  ┌────────────────────────────────┐  │
 *   │  │ ●  Ayesha accepted             │  │  ← unread: dot + tint
 *   │  │    Your proposal was accepted. │  │
 *   │  │    2h ago                      │  │
 *   │  └────────────────────────────────┘  │
 *   └──────────────────────────────────────┘
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationsRealtime } from '../../hooks/useNotificationsRealtime';
import { Bone } from '../../components/ui/Skeleton';
import { FadeInUp, PressableScale } from '../../components/ui/Motion';
import Svg, { Circle, Path } from 'react-native-svg';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType,
} from '../../api/notifications';

const PAGE = 30;

const C = {
  rose:     '#E6396E',
  roseSoft: '#FDECF2',
  roseInk:  '#A31C48',
  ind:      '#5B4BB8',
  indSoft:  '#EEECF8',
  indInk:   '#332C66',
  mint:     '#17B07E',
  mintSoft: '#E5F6F0',
  mintInk:  '#0A5C43',
  goldSoft: '#FBF2DE',
  goldInk:  '#7A5709',
  greySoft: '#F1F0F6',
  greyInk:  '#5F5E70',
  page:     '#F6F5FA',
  line:     '#EEEDF3',
  ink:      '#17171F',
  ink2:     '#5F5E70',
  ink3:     '#9695A5',
};

/**
 * Icon tint per type, so the list is scannable without reading every line.
 *
 * Grouped by what the notification is *about* rather than one colour per enum
 * value: proposals and matches are rose, family and verification indigo, good
 * news mint. Ten distinct colours would be noise, not information.
 */
const TONE: Record<NotificationType, { bg: string; fg: string }> = {
  MATCH_CREATED:         { bg: C.mintSoft, fg: C.mintInk },
  VERIFICATION_APPROVED: { bg: C.mintSoft, fg: C.mintInk },
  WALI_APPROVAL_GRANTED: { bg: C.mintSoft, fg: C.mintInk },
  INTEREST_RECEIVED:     { bg: C.roseSoft, fg: C.roseInk },
  MESSAGE_RECEIVED:      { bg: C.roseSoft, fg: C.roseInk },
  WALI_APPROVAL_NEEDED:  { bg: C.goldSoft, fg: C.goldInk },
  VERIFICATION_REJECTED: { bg: C.goldSoft, fg: C.goldInk },
  INVITE_ACCEPTED:       { bg: C.indSoft,  fg: C.indInk  },
  PROFILE_VIEW:          { bg: C.indSoft,  fg: C.indInk  },
  WEEKLY_REMINDER:       { bg: C.goldSoft, fg: C.goldInk },
  SYSTEM:                { bg: C.greySoft, fg: C.greyInk },
};

function BackIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

/** One glyph per family of notification, matching the TONE grouping. */
function TypeIcon({ type, color }: { type: NotificationType; color: string }) {
  const p = { stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'MESSAGE_RECEIVED':
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...p} />
        </Svg>
      );
    case 'MATCH_CREATED':
    case 'INTEREST_RECEIVED':
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" {...p} />
        </Svg>
      );
    case 'WALI_APPROVAL_NEEDED':
    case 'WALI_APPROVAL_GRANTED':
    case 'INVITE_ACCEPTED':
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx={9} cy={7} r={4} {...p} />
          <Path d="M23 21v-2a4 4 0 0 0-3-3.9" {...p} />
        </Svg>
      );
    case 'VERIFICATION_APPROVED':
    case 'VERIFICATION_REJECTED':
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2L3 7v5c0 5.2 3.9 10.7 9 12 5.1-1.3 9-6.8 9-12V7l-9-5z" {...p} />
        </Svg>
      );
    case 'PROFILE_VIEW':
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" {...p} />
          <Circle cx={12} cy={12} r={3} {...p} />
        </Svg>
      );
    default:
      return (
        <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
          <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...p} />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...p} />
        </Svg>
      );
  }
}

/** Relative time, coarsening as it ages — nobody needs "37 minutes" from June. */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

/**
 * Stands in for a notification row: icon square, title, body, timestamp.
 *
 * Matches the real row's padding and radius so the list holds its shape when
 * the data lands.
 */
function NotificationRowSkeleton() {
  return (
    <View style={styles.row}>
      <Bone w={36} h={36} radius={12} />
      <View style={{ flex: 1 }}>
        <Bone w={'62%'} h={14} radius={6} />
        <Bone w={'88%'} h={12} radius={6} style={{ marginTop: 6 }} />
        <Bone w={54} h={11} radius={5} style={{ marginTop: 7 }} />
      </View>
    </View>
  );
}

interface NotificationFeedScreenProps {
  onBack?: () => void;
  /** Signed-in user's id, for the live subscription. */
  userId?: string;
  /** Called after any read-state change, so a badge elsewhere can catch up. */
  onReadStateChange?: () => void;
  /**
   * Open whatever the notification is about.
   *
   * The row only marked itself read before, so tapping "Proposal accepted" did
   * nothing but remove the dot — the user still had to go and find the thing
   * they had just been told about. The destination is resolved by the caller,
   * which is where the navigator and the chat list live.
   */
  onOpen?: (notification: AppNotification) => void;
}

export function NotificationFeedScreen({ onBack, userId, onReadStateChange, onOpen }: NotificationFeedScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await getNotifications({ limit: PAGE }));
    } catch {
      // An empty feed and a failed fetch look the same on screen; the pull to
      // refresh is the retry, so there is nothing useful to say here.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // A notification arriving while this screen is open should appear on it.
  useNotificationsRealtime(userId ?? '', load);

  const unread = items.filter(n => !n.readAt).length;

  const openOne = async (n: AppNotification) => {
    // Navigating is the point of the tap; marking read is the side effect.
    // Fired before the await so the screen changes immediately rather than
    // after a round-trip.
    onOpen?.(n);

    if (n.readAt) return;
    // Marked locally first: the row is already on screen and the round-trip
    // would otherwise leave the dot showing after a deliberate tap.
    setItems(prev =>
      prev.map(x => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
    );
    onReadStateChange?.();
    try {
      await markNotificationRead(n.id);
    } catch {
      // Put the dot back rather than claim it was read.
      setItems(prev => prev.map(x => (x.id === n.id ? { ...x, readAt: null } : x)));
      onReadStateChange?.();
    }
  };

  const markAll = async () => {
    if (marking || unread === 0) return;
    setMarking(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems(prev => prev.map(x => (x.readAt ? x : { ...x, readAt: now })));
      onReadStateChange?.();
    } catch {
      // Leave the list as it was; the next refresh reports the truth.
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + 8, 20),
            paddingBottom: Math.max(insets.bottom + 24, 40),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.rose}
          />
        }>

        <View style={styles.hdr}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
            <BackIcon />
          </Pressable>
          <Text style={styles.hdrTitle}>Notifications</Text>
          {unread > 0 && (
            <Pressable onPress={markAll} disabled={marking} hitSlop={8}>
              <Text style={[styles.hdrAction, marking && { opacity: 0.5 }]}>
                {marking ? 'Marking…' : 'Mark all read'}
              </Text>
            </Pressable>
          )}
        </View>

        {loading ? (
          <>
            <NotificationRowSkeleton />
            <NotificationRowSkeleton />
            <NotificationRowSkeleton />
            <NotificationRowSkeleton />
          </>
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <TypeIcon type="SYSTEM" color={C.ind} />
            </View>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyBody}>
              Proposals, messages and family updates will appear here.
            </Text>
          </View>
        ) : (
          items.map((n, i) => {
            const tone = TONE[n.type] ?? TONE.SYSTEM;
            const isUnread = !n.readAt;
            return (
              <FadeInUp key={n.id} index={i}>
                <PressableScale
                  onPress={() => openOne(n)}
                  style={[styles.row, isUnread && styles.rowUnread]}>
                <View style={[styles.icon, { backgroundColor: tone.bg }]}>
                  <TypeIcon type={n.type} color={tone.fg} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, isUnread && styles.titleUnread]}>
                    {n.title}
                  </Text>
                  {!!n.body && <Text style={styles.body}>{n.body}</Text>}
                  <Text style={styles.when}>{fmtWhen(n.createdAt)}</Text>
                </View>
                {/* The one affordance that says "this is new". */}
                {isUnread && <View style={styles.dot} />}
                </PressableScale>
              </FadeInUp>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  scroll: { paddingHorizontal: 15 },

  hdr: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  hdrTitle: { flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, color: C.ink },
  hdrAction: { fontSize: 13, fontWeight: '700', color: C.rose },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: 'rgba(40,30,80,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 10, elevation: 1,
  },
  // A tint, not a border: unread should read at a glance without turning the
  // list into a grid of outlines.
  rowUnread: { backgroundColor: '#FFFDFE', borderWidth: 1, borderColor: C.roseSoft },

  icon: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14.5, fontWeight: '600', color: C.ink, lineHeight: 20 },
  titleUnread: { fontWeight: '700' },
  body: { fontSize: 13, color: C.ink2, lineHeight: 19, marginTop: 2 },
  when: { fontSize: 11.5, color: C.ink3, marginTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.rose, marginTop: 6 },

  spinner: { marginTop: 40 },
  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, gap: 9 },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 18, backgroundColor: C.indSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 16.5, fontWeight: '700', color: C.ink },
  emptyBody: { fontSize: 13, lineHeight: 20, color: C.ink2, textAlign: 'center' },
});
