/**
 * YourPhotosScreen — M3
 *
 * Manage the user's photos. Shows empty state when no photo added,
 * lists who currently has access, and a gold tip banner.
 */

import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  roseInk:   '#A31C48',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
  page:      '#F6F5FA',
  line:      '#EEEDF3',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
} as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5M12 16h.01" />
    </Svg>
  );
}

// ─── banner ───────────────────────────────────────────────────────────────────
function GoldBanner({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: C.goldSoft }]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: C.goldInk }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: '#8A6410' }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return <Text style={styles.shead}>{label}</Text>;
}

// ─── props ────────────────────────────────────────────────────────────────────
interface YourPhotosScreenProps {
  onBack?: () => void;
  onAddPhoto?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function YourPhotosScreen({ onBack, onAddPhoto }: YourPhotosScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Your photos</Text>
          <Text style={styles.topBarSub}>Visible to nobody yet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* No photo card */}
        <View style={styles.card}>
          <View style={styles.pad}>
            <Text style={styles.cardH4}>You have not added a photo</Text>
            <Text style={styles.cardP}>
              One photo is enough. It stays hidden until you approve someone, and you can remove access afterwards without them being told.
            </Text>
          </View>
          <View style={styles.acts}>
            <Pressable
              onPress={onAddPhoto}
              style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Add a photo</Text>
            </Pressable>
          </View>
        </View>

        <SectionHeader label="Who has access right now" />

        {/* Empty access card */}
        <View style={styles.card}>
          <View style={styles.emptyAccess}>
            <Text style={styles.emptyText}>Nobody has access to your photos.</Text>
          </View>
        </View>

        <GoldBanner
          icon={<AlertIcon color={C.goldInk} />}
          title="A photo roughly doubles wali approvals"
          body="Families are more comfortable approving a proposal when they have seen a face."
        />

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

  // TopBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.ink,
  },
  topBarSub: {
    fontSize: 11.5,
    color: C.ink3,
    marginTop: 1,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 13,
    overflow: 'hidden',
  },

  // Padding container
  pad: {
    padding: 18,
    paddingBottom: 6,
  },

  cardH4: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  cardP: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 20,
  },

  // Empty access
  emptyAccess: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    color: C.ink3,
    textAlign: 'center',
  },

  // Section header
  shead: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: C.ink3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    paddingBottom: 9,
  },

  // Banner
  banner: {
    borderRadius: 18,
    padding: 13,
    paddingHorizontal: 14,
    marginBottom: 13,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bannerIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 12,
    lineHeight: 18.6,
  },

  // Action buttons
  acts: {
    flexDirection: 'row',
    gap: 9,
    padding: 15,
    paddingBottom: 16,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnF: {
    backgroundColor: C.rose,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
