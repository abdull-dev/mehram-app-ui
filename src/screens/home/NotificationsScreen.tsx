/**
 * NotificationsScreen
 *
 * Toggle notification types on/off.
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '../../api/notifications';
import Svg, { Path, Circle } from 'react-native-svg';

const C = {
  indInk:   '#332C66',
  indSoft:  '#EEECF8',
  mintSoft: '#E5F6F0',
  mintInk:  '#0A5C43',
  goldSoft: '#FBF2DE',
  goldInk:  '#B5820D',
  greySoft: '#F2F1F7',
  greyInk:  '#6E6B80',
  page:     '#F6F5FA',
  line:     '#EEEDF3',
  ink:      '#17171F',
  ink2:     '#5F5E70',
  ink3:     '#9695A5',
  mint:     '#17B07E',
  tgOff:    '#E2E0EC',
} as const;

function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16z" />
      <Path d="M10 21h4" />
    </Svg>
  );
}

function HeartIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z" />
    </Svg>
  );
}

function FamIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

function ChatIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle}
      style={[styles.tg, { backgroundColor: on ? C.mint : C.tgOff }]}>
      <View style={[styles.tgThumb, { left: on ? 21 : 3 }]} />
    </Pressable>
  );
}

function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  bg: string;
  title: string;
  subtitle?: string;
  on: boolean;
  onToggle: () => void;
  first?: boolean;
  /** Inert while the real values are still loading. */
  disabled?: boolean;
}

function ToggleRow({ icon, bg, title, subtitle, on, onToggle, first, disabled }: ToggleRowProps) {
  return (
    // Dimmed and inert until the server's values arrive: a switch that is
    // showing a default rather than the real setting must not be flippable.
    <View style={[styles.li, first && styles.liFirst, disabled && { opacity: 0.5 }]}>
      <View style={[styles.lic, { backgroundColor: bg }]}>{icon}</View>
      <View style={styles.lib}>
        <Text style={styles.lit}>{title}</Text>
        {subtitle ? <Text style={styles.lis}>{subtitle}</Text> : null}
      </View>
      <Toggle on={on} onToggle={disabled ? () => {} : onToggle} />
    </View>
  );
}

interface NotificationsScreenProps {
  onBack?: () => void;
}

/**
 * Server key behind each row.
 *
 * The server's names predate the app's proposal vocabulary — `newInterest` is a
 * proposal arriving, `interestAccepted` is its status changing — and the server
 * really does gate sends on these, so the labels have to map to them exactly.
 */
type PrefKey = keyof NotificationPreferences;

export function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();

  /**
   * Loaded from and written back to the server.
   *
   * These five were plain `useState(true)` with no API call anywhere in the
   * file: every toggle reset on close, nothing reached the server, and the
   * server was meanwhile gating notifications on values the user could not
   * actually change.
   */
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getNotificationPreferences()
      .then(p => { if (!cancelled) setPrefs(p); })
      .catch(() => {
        // Nothing is toggleable until the real values arrive; showing defaults
        // would invite the user to "change" a setting that was never read.
        if (!cancelled) setSaveError('Could not load your notification settings.');
      });
    return () => { cancelled = true; };
  }, []);

  /**
   * Flip locally, persist, and roll back if the write fails.
   *
   * Optimistic because a switch that waits on a round-trip feels broken; rolled
   * back because a switch that stays on after a failed save is a lie.
   */
  const toggle = (key: PrefKey) => async () => {
    if (!prefs) return;
    const next = !prefs[key];
    setPrefs({ ...prefs, [key]: next });
    setSaveError(null);
    try {
      await updateNotificationPreferences({ [key]: next });
    } catch (e) {
      setPrefs(prev => (prev ? { ...prev, [key]: !next } : prev));
      setSaveError(e instanceof Error ? e.message : 'Could not save that change.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}

        <SectionHeader label="Proposals" />
        <View style={styles.card}>
          <ToggleRow
            icon={<HeartIcon color="#A31C48" />}
            bg="#FDECF2"
            title="New proposal received"
            subtitle="When someone sends you a proposal"
            on={!!prefs?.newInterest}
            onToggle={toggle('newInterest')}
            disabled={!prefs}
            first
          />
          <ToggleRow
            icon={<HeartIcon color="#A31C48" />}
            bg="#FDECF2"
            title="Proposal status update"
            subtitle="Accepted, declined or withdrawn"
            on={!!prefs?.interestAccepted}
            onToggle={toggle('interestAccepted')}
            disabled={!prefs}
          />
        </View>

        <SectionHeader label="Family" />
        <View style={styles.card}>
          <ToggleRow
            icon={<FamIcon color={C.indInk} />}
            bg={C.indSoft}
            title="Wali action required"
            subtitle="When your wali needs to review something"
            on={!!prefs?.waliApproval}
            onToggle={toggle('waliApproval')}
            disabled={!prefs}
            first
          />
        </View>

        <SectionHeader label="Messages" />
        <View style={styles.card}>
          <ToggleRow
            icon={<ChatIcon color={C.mintInk} />}
            bg={C.mintSoft}
            title="New message"
            subtitle="In an active conversation"
            on={!!prefs?.newMessage}
            onToggle={toggle('newMessage')}
            disabled={!prefs}
            first
          />
        </View>

        <SectionHeader label="Reminders" />
        <View style={styles.card}>
          <ToggleRow
            icon={<BellIcon color={C.goldInk} />}
            bg={C.goldSoft}
            title="Weekly reminder"
            subtitle="Nudge to check new introductions"
            on={!!prefs?.weeklyReminder}
            onToggle={toggle('weeklyReminder')}
            disabled={!prefs}
            first
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  saveError: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#A31C48',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  root: { flex: 1, backgroundColor: C.page },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  scroll: { paddingHorizontal: 15, paddingTop: 4 },
  shead: {
    fontSize: 11.5, fontWeight: '700', letterSpacing: 0.9,
    textTransform: 'uppercase', color: C.ink3,
    paddingVertical: 4, paddingHorizontal: 6, paddingBottom: 9, marginTop: 8,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3, marginBottom: 4, overflow: 'hidden',
  },
  li: {
    flexDirection: 'row', gap: 13, alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  liFirst: { borderTopWidth: 0 },
  lic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lib: { flex: 1 },
  lit: { fontSize: 14.5, fontWeight: '600', color: C.ink },
  lis: { fontSize: 12, color: C.ink3, lineHeight: 17.4, marginTop: 2 },
  tg: { width: 44, height: 26, borderRadius: 14, flexShrink: 0, position: 'relative' },
  tgThumb: {
    position: 'absolute', top: 3, width: 20, height: 20,
    borderRadius: 10, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
  },
});
