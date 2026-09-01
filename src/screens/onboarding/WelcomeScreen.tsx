/**
 * WelcomeScreen  (F1 + F2 merged)
 *
 * Single screen with a horizontally-swipeable content area.
 * The footer (CTA button + sign-in link) stays fixed; only the
 * hero illustration, title, and subtitle slide left/right.
 *
 *   ┌─────────────────────────────────┐
 *   │  ← swipeable slides →           │
 *   │  [orbit hero]                   │
 *   │  Title                          │
 *   │  Subtitle                       │
 *   │  ●○ / ○●  (pagination)          │
 *   ├─────────────────────────────────┤
 *   │  [Continue] / [Get started]     │
 *   │  Already have an account? Sign in│
 *   └─────────────────────────────────┘
 */

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { PaginationDots } from '../../components/ui/PaginationDots';
import { OrbitHero } from '../../components/onboarding/OrbitHero';
import { Colors } from '../../theme/colors';

// Fallback only — actual width measured from ScrollView layout below
const { width: INITIAL_WIDTH } = Dimensions.get('window');

// ─── slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    tone: 'rose' as const,
    icon: 'heart' as const,
    title: 'Nothing starts\nwithout your family',
    subtitle:
      'Your wali reviews every introduction before it becomes a conversation. Not a setting you switch on — the first step, every time.',
    buttonLabel: 'Continue',
  },
  {
    tone: 'vio' as const,
    icon: 'shield' as const,
    title: 'You cannot\nbe browsed',
    subtitle:
      'You are not listed anywhere. Your details reach only families whose criteria you match, and your photos stay hidden until you say otherwise.',
    buttonLabel: 'Get started',
  },
];

// ─── component ────────────────────────────────────────────────────────────────
interface WelcomeScreenProps {
  /** Called when the user taps "Get started" on the last slide */
  onContinue?: () => void;
  /** Called when the user taps "Sign in" */
  onSignIn?: () => void;
}

export function WelcomeScreen({ onContinue, onSignIn }: WelcomeScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [sliderHeight, setSliderHeight] = useState(0);
  // Measured from the ScrollView's actual rendered width so pagingEnabled
  // snaps to exactly the right position on every Android device.
  const [pagerWidth, setPagerWidth] = useState(INITIAL_WIDTH);

  const handlePagerLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPagerWidth(w);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / pagerWidth);
    setActiveIndex(index);
  };

  const handleContinue = () => {
    onContinue?.();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Ambient gradient blobs ──────────────────────────────────────── */}
      <AmbientBackground />

      {/* ── Safe-area-aware layout container ───────────────────────────── */}
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* ── Swipeable slide area ────────────────────────────────────── */}
        <View
          style={styles.pagerContainer}
          onLayout={e => setSliderHeight(e.nativeEvent.layout.height)}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            onLayout={handlePagerLayout}
            style={styles.pager}>
            {SLIDES.map((slide, i) => (
              <View
                key={i}
                style={[styles.slide, { width: pagerWidth, height: sliderHeight }]}>
                <View style={styles.orbWrap}>
                  <OrbitHero tone={slide.tone} icon={slide.icon} />
                </View>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Pagination dots ─────────────────────────────────────────── */}
        <View style={styles.dotsWrap}>
          <PaginationDots total={SLIDES.length} active={activeIndex} />
        </View>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Get started"
            onPress={handleContinue}
          />

          <Pressable
            onPress={onSignIn}
            style={({ pressed }) => [
              styles.textBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={styles.textBtnLabel}>
              Already have an account?{'  '}
              <Text style={styles.textBtnBold}>Sign in</Text>
            </Text>
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

  // Wrapper that measures available height for the pager
  pagerContainer: {
    flex: 1,
    // Extend edge-to-edge so pagingEnabled snaps cleanly to full screen width
    marginHorizontal: -16,
  },

  pager: {
    flex: 1,
  },

  // Each slide: full-width, centred content, inner padding restores the 16+4 px
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  orbWrap: {
    marginBottom: 32,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 37,
    textAlign: 'center',
    color: Colors.ink,
  },

  subtitle: {
    fontSize: 16,
    color: Colors.ink2,
    marginTop: 16,
    lineHeight: 26,
    textAlign: 'center',
  },

  dotsWrap: {
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 4,
  },

  footer: {
    paddingTop: 12,
  },

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
    textAlign: 'center',
  },
  textBtnBold: {
    color: Colors.vioD,
    fontWeight: '700',
  },
});
