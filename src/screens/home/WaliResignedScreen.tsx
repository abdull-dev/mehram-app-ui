/**
 * WaliResignedScreen — F8
 *
 * Family tab state: wali has resigned / removed himself.
 * Shows stepped-down badge, explanation, action buttons, and info banners.
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
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  indBody:   '#4B4384',
  goldSoft:  '#FBF2DE',
  goldInk:   '#B5820D',
  goldBody:  '#8A6410',
  greySoft:  '#F1F0F6',
  greyInk:   '#6E6B80',
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

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

// ─── banner ───────────────────────────────────────────────────────────────────
function Banner({ icon, title, body, bg, titleColor, bodyColor }: {
  icon: React.ReactNode;
  title: string;
  body: string;
  bg: string;
  titleColor: string;
  bodyColor: string;
}) {
  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: titleColor }]}>{title}</Text>
        <Text style={[styles.bannerBody, { color: bodyColor }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliResignedScreenProps {
  onBack?: () => void;
  onAskAgain?: () => void;
  onChooseAnother?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function WaliResignedScreen({
  onBack,
  onAskAgain,
  onChooseAnother,
}: WaliResignedScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <Text style={styles.topBarTitle}>Family</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}>

        {/* Wali card */}
        <View style={styles.card}>
          {/* Wali header */}
          <View style={styles.whead}>
            <View style={[styles.av, { backgroundColor: C.greySoft }]}>
              <Text style={[styles.avText, { color: C.greyInk }]}>IM</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.wn}>Imran Mian</Text>
              <Text style={styles.wr}>Father</Text>
              <View style={[styles.ch, styles.chGrey]}>
                <Text style={[styles.chText, { color: C.greyInk }]}>Stepped down</Text>
              </View>
            </View>
          </View>

          {/* Explanation */}
          <View style={styles.bodyPad}>
            <Text style={styles.bodyText}>
              Imran has removed himself as your wali. He did not give a reason through the app.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.acts}>
            <Pressable
              onPress={onAskAgain}
              style={({ pressed }) => [styles.btn, styles.btnO, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.indInk }]}>Ask him again</Text>
            </Pressable>
            <Pressable
              onPress={onChooseAnother}
              style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Choose another</Text>
            </Pressable>
          </View>
        </View>

        <Banner
          bg={C.goldSoft}
          titleColor={C.goldInk}
          bodyColor={C.goldBody}
          icon={<AlertIcon color={C.goldInk} />}
          title="2 proposals are paused"
          body="They stay where they are until a new wali accepts. Nothing has been declined."
        />

        <Banner
          bg={C.indSoft}
          titleColor={C.indInk}
          bodyColor={C.indBody}
          icon={<ShieldIcon color={C.indInk} />}
          title="Your search keeps running"
          body="Only proposals needing a wali are held."
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

  // Wali header
  whead: {
    padding: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 13,
  },
  av: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avText: {
    fontSize: 18,
    fontWeight: '700',
  },
  wn: {
    fontSize: 19,
    fontWeight: '700',
    color: C.ink,
  },
  wr: {
    fontSize: 13,
    color: C.ink2,
    marginTop: 2,
  },
  ch: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  chGrey: {
    backgroundColor: C.greySoft,
  },
  chText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  // Body text
  bodyPad: {
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  bodyText: {
    fontSize: 13.5,
    color: C.ink2,
    lineHeight: 20,
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
    paddingHorizontal: 6,
  },
  btnO: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#EEECF8',
  },
  btnF: {
    backgroundColor: C.rose,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
