/**
 * BottomNav — floating pill bottom navigation bar
 *
 * 4 tabs: Home · Proposals · Chats · Family
 *   Active:   rose #E6396E  + small dot indicator below icon
 *   Inactive: ink3 #A29CBB
 *
 * Position: absolute, left/right 15 px, bottom = safeArea.bottom + 13 px
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

export type NavTab = 'home' | 'proposals' | 'chats' | 'family';

interface BottomNavProps {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  proposalsBadge?: number;
}

// ─── icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5l9-7 9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ProposalsIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 7l9 6 9-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChatsIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FamilyIcon({ color }: { color: string }) {
  return (
    <Svg width={21} height={21} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9} cy={7} r={3.5} stroke={color} strokeWidth={2} />
      <Path
        d="M22 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const ROSE   = '#E6396E';
const INACTIVE = '#A29CBB';

const TABS: { id: NavTab; label: string }[] = [
  { id: 'home',      label: 'Home' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'chats',     label: 'Chats' },
  { id: 'family',    label: 'Family' },
];

function TabIcon({ id, color }: { id: NavTab; color: string }) {
  switch (id) {
    case 'home':      return <HomeIcon color={color} />;
    case 'proposals': return <ProposalsIcon color={color} />;
    case 'chats':     return <ChatsIcon color={color} />;
    case 'family':    return <FamilyIcon color={color} />;
  }
}

export function BottomNav({
  activeTab = 'home',
  onTabChange,
  proposalsBadge,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.nav,
        { bottom: Math.max(insets.bottom, 8) + 13 },
      ]}>
      {TABS.map(tab => {
        const isActive = tab.id === activeTab;
        const color = isActive ? ROSE : INACTIVE;
        const showBadge = tab.id === 'proposals' && proposalsBadge && proposalsBadge > 0;

        return (
          <Pressable
            key={tab.id}
            onPress={() => onTabChange?.(tab.id)}
            style={styles.tab}>
            {/* Badge */}
            {showBadge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {proposalsBadge! > 99 ? '99+' : String(proposalsBadge)}
                </Text>
              </View>
            ) : null}

            {/* Icon */}
            <TabIcon id={tab.id} color={color} />

            {/* Label */}
            <Text style={[styles.label, { color }]}>{tab.label}</Text>

            {/* Active dot */}
            {isActive && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 28,
    paddingTop: 12,
    paddingBottom: 11,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  dot: {
    position: 'absolute',
    bottom: -6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: ROSE,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: '50%',
    marginRight: -19,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: ROSE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
});
