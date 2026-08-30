/**
 * GuidedPromptScreen  (F12)
 *
 * "In your words" — first of three free-text prompts. Mirrors the HTML
 * prototype screen F12 exactly:
 *
 *   ┌─────────────────────────────────┐
 *   │  [←]  ████████████░░░░  Save   │  ← progress bar (72 %)
 *   │                                 │
 *   │  IN YOUR WORDS                  │  ← section pill
 *   │  How would your                 │
 *   │  family describe you?           │
 *   │  One or two sentences…          │
 *   │                                 │
 *   │  ┌─────────────────────────┐    │
 *   │  │ (multi-line input)      │    │
 *   │  └─────────────────────────┘    │
 *   │  88 characters · question 1/3   │
 *   │                                 │
 *   │  [Show me an example]           │
 *   │                                 │
 *   │  ⚠ Leave out your workplace     │
 *   │    Employer names…removed auto  │
 *   ├─────────────────────────────────┤
 *   │  [Next question]                │
 *   └─────────────────────────────────┘
 *
 * Entrance: header d1 (70 ms), input field d2 (150 ms), chip d3 (230 ms)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';
import { getMyProfile } from '../../api/profile';

// ─── constants ────────────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

const EXAMPLE_TEXT =
  'Steady, a little stubborn, and the one everyone calls when something needs organising.';

const MIN_CHARS = 30;

// ─── animation helpers ────────────────────────────────────────────────────────
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

// ─── sub-components ───────────────────────────────────────────────────────────

/** Back-chevron icon (← pointing left) */
function ChevronLeft() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M11 4L6 9L11 14"
        stroke={Colors.vioInk}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Alert triangle icon used in the gold banner */
function AlertIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M9 2L16.5 15H1.5L9 2Z"
        stroke={Colors.goldInk}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M9 7.5V10.5"
        stroke={Colors.goldInk}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M9 12.5V13"
        stroke={Colors.goldInk}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
interface GuidedPromptScreenProps {
  /** Called when the user taps the back arrow */
  onBack?: () => void;
  /** Called when the user taps "Save" (top-right) */
  onSave?: () => void;
  /** Called when the user taps "Next question" — passes the entered text */
  onNext?: (text: string) => void;
  /** Which prompt question this is (1-indexed) */
  questionIndex?: number;
  /** Total number of prompt questions in this section */
  totalQuestions?: number;
  /** Overall onboarding progress, 0–1 (displayed in the progress bar) */
  progress?: number;
  continueLoading?: boolean;
}

export function GuidedPromptScreen({
  onBack,
  onSave,
  onNext,
  questionIndex = 1,
  totalQuestions = 3,
  progress = 0.72,
  continueLoading,
}: GuidedPromptScreenProps) {
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  // Pre-populate existing bio when navigating back
  useEffect(() => {
    getMyProfile().then(profile => {
      if (profile.bio) setText(profile.bio);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Staggered entrance animations: d1 / d2 / d3
  const header = useFadeRise(70);
  const field = useFadeRise(150);
  const chip = useFadeRise(230);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([makeRise(header), makeRise(field), makeRise(chip)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const charCount = text.length;
  const meetsMin = text.trim().length >= MIN_CHARS;

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

        {/* ── NavBar (.nb) ────────────────────────────────────────────── */}
        <View style={styles.nb}>
          {/* Back button */}
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.back,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}>
            <ChevronLeft />
          </Pressable>

          {/* Progress bar track */}
          <View style={styles.prgTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.prgFill, { width: `${Math.round(progress * 100)}%` }]}
            />
          </View>

          {/* Save link */}
          <Pressable
            onPress={onSave}
            style={({ pressed }) => [{ opacity: pressed ? 0.65 : 1 }]}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Q header block (.q) — d1 */}
          <Animated.View style={[styles.qBlock, riseStyle(header.anim)]}>
            {/* Section pill (.qk) */}
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>In your words</Text>
            </View>

            {/* Heading (.qh) */}
            <Text style={styles.heading}>
              How would your{'\n'}family describe you?
            </Text>

            {/* Subtitle (.qs) */}
            <Text style={styles.subtitle}>
              One or two sentences. This is the part families actually read.
            </Text>
          </Animated.View>

          {/* Text input field — d2 */}
          <Animated.View style={[styles.fieldWrap, riseStyle(field.anim)]}>
            <View style={[styles.inp, focused && styles.inpFocused]}>
              <TextInput
                style={styles.textInput}
                multiline
                placeholder="Describe yourself in your family's words…"
                placeholderTextColor={Colors.ink3}
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                textAlignVertical="top"
                scrollEnabled={false}
              />
            </View>
            <Text style={styles.fhint}>
              {charCount} / {MIN_CHARS} characters
              {meetsMin ? ` · question ${questionIndex} of ${totalQuestions}` : ` minimum`}
            </Text>
          </Animated.View>

          {/* "Show me an example" chip — d3 */}
          <Animated.View style={[styles.chipWrap, riseStyle(chip.anim)]}>
            <Pressable
              onPress={() => setText(EXAMPLE_TEXT)}
              style={({ pressed }) => [
                styles.chip,
                { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Text style={styles.chipText}>Show me an example</Text>
            </Pressable>
          </Animated.View>

          {/* Gold warning banner (.bn-gold) */}
          <LinearGradient
            colors={['#FDF5E6', '#FBEFD8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}>
            <View style={styles.bannerIconWrap}>
              <AlertIcon />
            </View>
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>Leave out your workplace</Text>
              <Text style={styles.bannerDesc}>
                Employer names, numbers and social handles are removed automatically.
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Footer (.foot) ──────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Next question"
            variant={meetsMin ? 'primary' : 'disabled'}
            loading={continueLoading}
            onPress={meetsMin ? () => onNext?.(text.trim()) : undefined}
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

  // ── NavBar (.nb) ──────────────────────────────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
    flexShrink: 0,
  },

  // Back button (.back)
  back: {
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

  // Progress bar track (.prg)
  prgTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // Gradient fill (.prg i) — width applied inline
  prgFill: {
    height: '100%',
    borderRadius: 5,
  },

  // Save / skip text link (.skip)
  saveText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    flexDirection: 'column',
  },

  // Q header block (.q)
  qBlock: {
    paddingTop: 18,
    paddingBottom: 2,
    paddingHorizontal: 2,
    flexShrink: 0,
  },

  // Section pill (.qk)
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },

  sectionPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },

  // Heading (.qh) — 24 px, 800, line-height 1.2
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // Subtitle (.qs) — 13 px, ink-2, line-height 1.55
  subtitle: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Text input field (.field / .inp) ─────────────────────────────────────
  fieldWrap: {
    marginTop: 14,
    flexShrink: 0,
  },

  inp: {
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    minHeight: 106,
    padding: 14,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Focused variant (.inp.focus)
  inpFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },

  textInput: {
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
    minHeight: 80,
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },

  // Hint (.fhint)
  fhint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 7,
    lineHeight: 17,
  },

  // ── Chip (.chipwrap / .chip) ──────────────────────────────────────────────
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4.5,
    elevation: 1,
  },

  chipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },

  // ── Gold banner (.bn / .bn-gold) ──────────────────────────────────────────
  banner: {
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    flexShrink: 0,
  },

  bannerIconWrap: {
    flexShrink: 0,
    marginTop: 1,
  },

  bannerBody: {
    flex: 1,
  },

  // Banner title (.bn h4)
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.goldInk,
    marginBottom: 2,
  },

  // Banner description (.bn p)
  bannerDesc: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#8A6410',
  },

  // ── Footer (.foot) ────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
});
