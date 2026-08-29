/**
 * WhoIsForScreen  (F5)
 *
 * Appears after phone + SMS verification. Forks the onboarding flow:
 * "For myself" → regular seeker flow
 * "I am a wali" → wali invitation flow
 *
 *   ┌─────────────────────────────────────┐
 *   │ [←]  ████░░░░░░░░░░░░░  (20%)      │  nav bar
 *   │                                     │
 *   │  Step 2 of 5                        │
 *   │  Who is this                        │
 *   │  account for?                       │
 *   │                                     │
 *   │  ┌──────────────────────────────┐   │
 *   │  │ [👤]  For myself             │   │  ← selected by default
 *   │  │       I am looking to marry  │   │
 *   │  └──────────────────────────────┘   │
 *   │  ┌──────────────────────────────┐   │
 *   │  │ [👨‍👩] I am a wali            │   │
 *   │  │       Someone invited me     │   │
 *   │  └──────────────────────────────┘   │
 *   │                                     │
 *   │  ┌──────────────────────────────┐   │
 *   │  │ 🛡  A wali needs an invite   │   │  indigo info banner
 *   │  │     They send you a link…    │   │
 *   │  └──────────────────────────────┘   │
 *   │                                     │
 *   │  [         Continue         ]       │  footer
 *   └─────────────────────────────────────┘
 *
 * Entrance: question rises at d1 (70 ms), cards at d2 (150 ms),
 * banner at d3 (230 ms) — same cadence as WelcomeScreen.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';

// ─── types ────────────────────────────────────────────────────────────────────

export type WhoIsForSelection = 'self' | 'wali';

interface WhoIsForScreenProps {
  /** Called when the user taps the back arrow */
  onBack?: () => void;
  /** Called when the user taps "Continue"; receives their selection */
  onContinue?: (selection: WhoIsForSelection) => void;
}

// ─── animation helpers ────────────────────────────────────────────────────────

const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  return { anim, delay };
}

function riseStyle(anim: Animated.Value) {
  return {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [RISE_OFFSET, 0],
        }),
      },
    ],
  };
}

// ─── icon helpers ─────────────────────────────────────────────────────────────

/** .ic — the 40×40 icon container */
function IconContainer({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  if (selected) {
    return (
      <LinearGradient
        colors={[...GradientColors.primary]}
        locations={[...GradientColors.primaryLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}>
        {children}
      </LinearGradient>
    );
  }
  return <View style={[styles.iconContainer, styles.iconContainerUnselected]}>{children}</View>;
}

/** Person / "myself" icon (user) */
function UserIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Circle cx={12} cy={8} r={4} />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" />
    </Svg>
  );
}

/** Family / "wali" icon (fam) */
function FamilyIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

/** Shield-check icon for the info banner */
function ShieldIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.vioInk}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

/** Back chevron */
function BackIcon() {
  return (
    <Svg
      width={17}
      height={17}
      viewBox="0 0 24 24"
      fill="none"
      stroke={Colors.vioInk}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

/** .nb — nav bar: back button + progress bar */
function NavBar({
  onBack,
  progressPercent,
}: {
  onBack?: () => void;
  progressPercent: number;
}) {
  return (
    <View style={styles.navBar}>
      {/* Back button — .back */}
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backBtn,
          { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}>
        <BackIcon />
      </Pressable>

    </View>
  );
}

/** Selection card — .segr .sgb */
function SelectionCard({
  selected,
  onPress,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        { transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      {/* Card background — gradient when selected */}
      {selected ? (
        <LinearGradient
          colors={['#FEF0F6', '#F2ECFE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* Icon container + text — row layout (.segr .sgb) */}
      <View style={styles.cardInner}>
        <IconContainer selected={selected}>{icon}</IconContainer>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Info banner — .bn.bn-ind */
function InfoBanner({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <LinearGradient
      colors={['#F3EEFE', '#EBE3FD']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}>
      <View style={styles.bannerIcon}>{icon}</View>
      <View style={styles.bannerText}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerBody}>{body}</Text>
      </View>
    </LinearGradient>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function WhoIsForScreen({ onBack, onContinue }: WhoIsForScreenProps) {
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<WhoIsForSelection>('self');

  // Staggered entrance animations: d1 (70 ms), d2 (150 ms), d3 (230 ms)
  const question = useFadeRise(70);
  const cards = useFadeRise(150);
  const banner = useFadeRise(230);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([
      makeRise(question),
      makeRise(cards),
      makeRise(banner),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Ambient gradient blobs */}
      <AmbientBackground />

      {/* Safe-area-aware layout */}
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* Nav bar */}
        <NavBar onBack={onBack} progressPercent={0} />

        {/* Scrollable body */}
        <View style={styles.body}>

          {/* Question header */}
          <Animated.View style={[styles.question, riseStyle(question.anim)]}>
            <Text style={styles.heading}>
              Who is this{'\n'}account for?
            </Text>
          </Animated.View>

          {/* Selection cards — .field.segr */}
          <Animated.View style={[styles.cardsField, riseStyle(cards.anim)]}>
            <SelectionCard
              selected={selection === 'self'}
              onPress={() => setSelection('self')}
              icon={<UserIcon color={selection === 'self' ? '#fff' : Colors.vioD} />}
              title="For myself"
              subtitle="I am looking to marry"
            />
            <SelectionCard
              selected={selection === 'wali'}
              onPress={() => setSelection('wali')}
              icon={<FamilyIcon color={selection === 'wali' ? '#fff' : Colors.vioD} />}
              title="I am a wali"
              subtitle="Someone invited me"
            />
          </Animated.View>

          {/* Info banner — .bn.bn-ind */}
          <Animated.View style={riseStyle(banner.anim)}>
            <InfoBanner
              icon={<ShieldIcon />}
              title="A wali needs an invitation"
              body="They send you a link or a six-digit code."
            />
          </Animated.View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <GradientButton
            label="Continue"
            onPress={() => onContinue?.(selection)}
          />
        </View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
    overflow: 'hidden',
  },

  screen: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'column',
  },

  // ── nav bar ────────────────────────────────────────────────────────────────

  // .nb — flex row, gap:12, padding:12px 0 4px
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // .back — 38×38, borderRadius:14, white bg, shadow
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // .prg — flex:1, height:7, borderRadius:5, muted track
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i — gradient fill
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },

  // ── body ───────────────────────────────────────────────────────────────────

  body: {
    flex: 1,
    flexDirection: 'column',
  },

  // ── question header ─────────────────────────────────────────────────────

  // .q — padding:18px 2px 2px
  question: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
    flexShrink: 0,
  },

  // .qh — 24px 800, letterSpacing:-0.7, lineHeight:1.2
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29, // 24 × 1.2
    color: Colors.ink,
  },

  // ── selection cards ─────────────────────────────────────────────────────

  // .field.an.d2 — margin-top:14
  cardsField: {
    marginTop: 14,
    gap: 10,
    flexShrink: 0,
  },

  // .segr .sgb — row card
  card: {
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 7,
    elevation: 2,
  },

  cardSelected: {
    borderColor: Colors.vioD,
    shadowColor: '#A06EDC',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },

  // .segr .sgb inner — flex row, alignItems center, gap:13, padding:14 15
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 14,
    paddingHorizontal: 15,
  },

  // .ic — 40×40, borderRadius:14
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconContainerUnselected: {
    backgroundColor: Colors.vioSoft,
  },

  cardText: {
    flex: 1,
  },

  // .t — 14px 700
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },

  // .s — 11px, ink3, marginTop:2
  cardSubtitle: {
    fontSize: 11,
    color: Colors.ink3,
    marginTop: 2,
  },

  // ── info banner ─────────────────────────────────────────────────────────

  // .bn.bn-ind — indigo gradient bg, row, gap:10, padding:13 14, borderRadius:18, marginTop:12
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
    marginTop: 12,
  },

  bannerIcon: {
    marginTop: 1,
    flexShrink: 0,
  },

  bannerText: {
    flex: 1,
  },

  // .bn-ind h4 — 13px 800, vioInk
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.vioInk,
    marginBottom: 2,
  },

  // .bn-ind p — 11.5px, lineHeight:1.5, #584A93
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17, // 11.5 × 1.5
    color: '#584A93',
  },

  // ── footer ──────────────────────────────────────────────────────────────

  footer: {
    paddingTop: 12,
  },
});
