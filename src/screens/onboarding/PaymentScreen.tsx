/**
 * PaymentScreen  (F17)
 *
 * Last step — membership payment. Mirrors the HTML prototype screen F17 exactly:
 *
 *   ┌─────────────────────────────────┐
 *   │                        [Skip]   │  top-right skip
 *   ├─────────────────────────────────┤
 *   │  Last step (pill)               │
 *   │  142 people                     │
 *   │  are waiting                    │
 *   │  Membership unlocks…            │
 *   │                                 │
 *   │  ┌─────────────────────────┐    │
 *   │  │  PKR 4,500  (gradient)  │    │  dark card .price
 *   │  │  One payment. No…       │    │
 *   │  └─────────────────────────┘    │
 *   │                                 │
 *   │  [mint]  Refunded if we…        │
 *   │  [indigo] Nobody can see…       │
 *   ├─────────────────────────────────┤
 *   │  [Become a member]              │
 *   │  What do I get?                 │
 *   └─────────────────────────────────┘
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Polyline, Rect } from 'react-native-svg';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { OnboardingExit } from '../../components/ui/OnboardingExit';
import { Colors, GradientColors } from '../../theme/colors';
import { GRADIENT_FILL } from '../../theme/layout';

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

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevronLeft() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Polyline
        points="15 18 9 12 15 6"
        stroke={Colors.vioInk}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 22s8-4 8-10V5.5L12 2.5 4 5.5V12c0 6 8 10 8 10z" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

function LockIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
interface PaymentScreenProps {
  /** Called when user taps the back chevron */
  onBack?: () => void;
  /**
   * How to leave the flow — an ✕ back to Home when this screen was opened from
   * there, or "Log out" while walking the signup. Exactly one is set.
   */
  onClose?: () => void;
  onLogout?: () => void;
  /** Called when user taps "Become a member" */
  onPay?: () => void;
  /** Called when user taps "Skip" */
  onSkip?: () => void;
  /** Called when user taps "What do I get?" */
  onWhatDoIGet?: () => void;
  /** Show loading spinner on the "Become a member" button while payment is processing */
  paying?: boolean;
  /** Why the last attempt did not complete. Backing out of the store sheet is not an error. */
  error?: string;
  /**
   * Google Play's own localised price, e.g. "Rs 4,500.00". Falls back to the
   * static PKR figure when the store cannot be reached, so the card is never
   * blank — but the store's price is the one the user is actually charged.
   */
  priceLabel?: string | null;
}

export function PaymentScreen({ onBack, onClose, onLogout, onPay, onSkip, onWhatDoIGet, paying = false, error, priceLabel }: PaymentScreenProps) {
  const insets = useSafeAreaInsets();

  // Staggered entrance: d1, d2, d3, d4
  const question = useFadeRise(70);
  const price    = useFadeRise(150);
  const banner1  = useFadeRise(230);
  const banner2  = useFadeRise(310);

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
      makeRise(price),
      makeRise(banner1),
      makeRise(banner2),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* ── NavBar: back + skip ─────────────────────────────────── */}
        <View style={styles.navbar}>
          {/* Omitted when there is nothing behind this screen: entering the
              flow straight from Home makes this its first step. */}
          {!!onBack && !onClose && !onLogout && (
            <Pressable
              onPress={onBack}
              style={({ pressed }) => [
                styles.backBtn,
                { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
              ]}>
              <ChevronLeft />
            </Pressable>
          )}

          <View style={styles.navSpacer} />

          {/* The exit when there is one, otherwise Skip. */}
          {onClose || onLogout ? (
            <OnboardingExit onClose={onClose} onLogout={onLogout} />
          ) : (
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </View>

        {/* ── Scrollable body ─────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

          {/* Question section (.q .an d1) */}
          <Animated.View style={[styles.qSection, riseStyle(question.anim)]}
            needsOffscreenAlphaCompositing>
            <View style={styles.kicker}>
              <Text style={styles.kickerText}>Last step</Text>
            </View>
            <Text style={styles.heading}>142 people{'\n'}are waiting</Text>
            <Text style={styles.subtitle}>
              Membership unlocks your introductions. Three a day, chosen
              against your criteria.
            </Text>
          </Animated.View>

          {/* Price block (.price .an.d2) — dark gradient card */}
          <Animated.View style={riseStyle(price.anim)}
            needsOffscreenAlphaCompositing>
            <View style={styles.priceCard}>
              <LinearGradient
              colors={[...GradientColors.vertDark]}
              locations={[0, 0.6, 1]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.4, y: 1 }}
              style={GRADIENT_FILL}
              pointerEvents="none"
            />
              {/* Real store price from billing; the literal is the fallback
                  while the product query is still in flight. */}
              <Text style={styles.priceAmount}>{priceLabel ?? 'PKR 4,500'}</Text>
              <Text style={styles.priceLabel}>One payment. No renewal, ever.</Text>
            </View>
          </Animated.View>

          {/* Benefit banner 1 — mint / refund (.bn.bn-mint.an.d3) */}
          <Animated.View style={[styles.banner, styles.bannerMint, riseStyle(banner1.anim)]}
            needsOffscreenAlphaCompositing>
            <ShieldIcon color={Colors.mintInk} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerHeading, styles.bannerHeadingMint]}>
                Refunded if we do not introduce you
              </Text>
              <Text style={[styles.bannerBody, styles.bannerBodyMint]}>
                No wali-approved introduction within 90 days and you get every
                rupee back.
              </Text>
            </View>
          </Animated.View>

          {/* Benefit banner 2 — indigo / privacy (.bn.bn-ind.an.d4) */}
          <Animated.View style={[styles.banner, styles.bannerInd, riseStyle(banner2.anim)]}
            needsOffscreenAlphaCompositing>
            <LockIcon color={Colors.vioInk} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerHeading, styles.bannerHeadingInd]}>
                Nobody can see you until you are ready
              </Text>
              <Text style={[styles.bannerBody, styles.bannerBodyInd]}>
                Paying does not list you anywhere.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <GradientButton label="Become a member" onPress={onPay} loading={paying} />

          {/* .btn-t — text link */}
          <Pressable
            onPress={onWhatDoIGet}
            style={({ pressed }) => [
              styles.textBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={styles.textBtnLabel}>What do I get?</Text>
          </Pressable>
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

  // NavBar row
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
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
  navSpacer: {
    flex: 1,
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // Scroll area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: 2,
    paddingBottom: 8,
  },

  // ── Question (.q) ──
  qSection: {
    paddingTop: 20,
    paddingHorizontal: 2,
    paddingBottom: 2,
    flexShrink: 0,
  },
  // .qk
  kicker: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },
  kickerText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  // .qh
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },
  // .qs
  subtitle: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Price card (.price) ──
  // .price: grad-v bg, border-radius 22, padding 19, margin-top 12, centred
  priceCard: {
    borderRadius: 22,
    padding: 19,
    marginTop: 12,
    alignItems: 'center',
    flexShrink: 0,
    // 0 12px 30px rgba(70,45,150,.28)
    shadowColor: '#462D96',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 15,
    shadowOpacity: 0.28,
    elevation: 12,
  },
  // .pn — 30px 800 white
  priceAmount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.9,
  },
  // .pl — 12px, #BFAFF0, margin-top 5
  priceLabel: {
    fontSize: 12,
    color: '#BFAFF0',
    marginTop: 5,
  },

  // ── Benefit banners (.bn) ──
  banner: {
    borderRadius: 18,
    padding: 13,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
  },
  bannerHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
  },

  // .bn-mint
  bannerMint: {
    backgroundColor: '#E9FBF3', // linear-gradient(140deg,#E9FBF3,#DFF6EC) approximated
  },
  bannerHeadingMint: { color: Colors.mintInk },
  bannerBodyMint: { color: '#2A7A5E' },

  // .bn-ind
  bannerInd: {
    backgroundColor: '#F3EEFE', // linear-gradient(140deg,#F3EEFE,#EBE3FD) approximated
  },
  bannerHeadingInd: { color: Colors.vioInk },
  bannerBodyInd: { color: '#584A93' },

  // ── Footer ──
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
  // Matches EditProfileScreen's inline error convention.
  errorText: {
    fontSize: 12.5,
    color: Colors.rose,
    textAlign: 'center',
    marginBottom: 8,
  },
  // .btn-t
  textBtn: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  textBtnLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },
});
