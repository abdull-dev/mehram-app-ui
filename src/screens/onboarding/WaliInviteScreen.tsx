/**
 * WaliInviteScreen  (F15)
 *
 * Wali invitation step in the onboarding flow. Mirrors the HTML prototype
 * screen F15 exactly:
 *
 *   ┌─────────────────────────────────┐
 *   │  [←]  ████████████████░░  Later │  90% progress
 *   ├─────────────────────────────────┤
 *   │  [YOUR WALI]                    │
 *   │  Who will review                │
 *   │  your proposals?                │
 *   │  Nine of your 142 matches only… │
 *   │                                 │
 *   │  THEIR NAME                     │
 *   │  ┌──────────────────────────┐   │
 *   │  │ Imran Mian               │   │
 *   │  └──────────────────────────┘   │
 *   │                                 │
 *   │  RELATIONSHIP                   │
 *   │  [▓Father▓] [Brother] [Uncle]   │
 *   │  [Grandfather] [Other]          │
 *   ├─────────────────────────────────┤
 *   │  [Invite on WhatsApp]           │
 *   │  [Read him a code instead]      │
 *   │  Skip for now                   │
 *   └─────────────────────────────────┘
 *
 * Entrance: question block rises immediately (.an), name field at 70 ms
 * (.an.d1), chips at 150 ms (.an.d2) — matching the HTML prototype delays.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';
import { createWaliInvite, WaliRelationship } from '../../api/wali';

// ─── animation helpers (mirrors WelcomeScreen pattern) ───────────────────────
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

// ─── relationship options (matches HTML prototype chip list) ──────────────────
const RELATIONSHIPS = ['Father', 'Brother', 'Uncle', 'Grandfather', 'Other'] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

// ─── component ────────────────────────────────────────────────────────────────
interface WaliInviteScreenProps {
  onBack?: () => void;
  onLater?: () => void;
  onInviteWhatsApp?: (name: string, relationship: Relationship) => void;
  onReadCode?: (name: string, relationship: Relationship) => void;
  onSkip?: () => void;
}

export function WaliInviteScreen({
  onBack,
  onLater,
  onInviteWhatsApp,
  onReadCode,
  onSkip,
}: WaliInviteScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<Relationship>('Father');
  const [inviting, setInviting] = useState(false);

  function requireName(): boolean {
    if (!name.trim()) {
      setNameError('Please enter your wali\'s name.');
      return false;
    }
    return true;
  }

  // Staggered entrance: .an (0 ms) → .an.d1 (70 ms) → .an.d2 (150 ms)
  const questionAnim = useFadeRise(0);
  const fieldAnim = useFadeRise(70);
  const chipsAnim = useFadeRise(150);

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
      makeRise(questionAnim),
      makeRise(fieldAnim),
      makeRise(chipsAnim),
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

        {/* ── Nav bar: [←] ██████████░░ Later ───────────────────────────── */}
        {/* Mirrors .nb — flex row, gap 12, padding 12px 0 4px              */}
        <View style={styles.nb}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}>
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
          </Pressable>

          {/* Progress track — 90% filled */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.progressFill}
            />
          </View>

          <Pressable
            onPress={onLater}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.skipText}>Later</Text>
          </Pressable>
        </View>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Question block — .q .an (0 ms delay) */}
          <Animated.View style={[styles.questionBlock, riseStyle(questionAnim.anim)]}>
            {/* .qk — section label pill */}
            <View style={styles.qLabelPill}>
              <Text style={styles.qLabelText}>Your wali</Text>
            </View>
            {/* .qh — 24px heading */}
            <Text style={styles.qHeading}>Who will review{'\n'}your proposals?</Text>
            {/* .qs — supporting text */}
            <Text style={styles.qSub}>
              Nine of your 142 matches only accept proposals where a wali is
              registered.
            </Text>
          </Animated.View>

          {/* Name field — .field .an .d1 (70 ms) */}
          <Animated.View style={[styles.field, riseStyle(fieldAnim.anim)]}>
            <Text style={styles.fieldLabel}>Their name</Text>
            <View style={[styles.inputWrap, nameFocused && styles.inputFocused, !!nameError && styles.inputError]}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ibrahim Khan"
                placeholderTextColor={Colors.ink3}
                value={name}
                onChangeText={v => {
                  setName(v.replace(/[^a-zA-Z\s]/g, ''));
                  if (nameError) setNameError(null);
                }}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                returnKeyType="done"
                autoCapitalize="words"
              />
            </View>
            {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
          </Animated.View>

          {/* Relationship chips — .field .an .d2 (150 ms) */}
          <Animated.View style={[styles.field, riseStyle(chipsAnim.anim)]}>
            <Text style={styles.fieldLabel}>Relationship</Text>
            <View style={styles.chipWrap}>
              {RELATIONSHIPS.map((rel) => {
                const selected = relationship === rel;
                return (
                  <Pressable
                    key={rel}
                    onPress={() => setRelationship(rel)}
                    style={({ pressed }) => [
                      { opacity: pressed ? 0.88 : 1 },
                      { transform: [{ scale: pressed ? 0.96 : 1 }] },
                    ]}>
                    {selected ? (
                      <LinearGradient
                        colors={[...GradientColors.primary]}
                        locations={[...GradientColors.primaryLocations]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={[styles.chip, styles.chipOn]}>
                        <Text style={styles.chipOnText}>{rel}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.chip, styles.chipOff]}>
                        <Text style={styles.chipOffText}>{rel}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Footer — .foot ─────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {/* .btn-f — primary gradient */}
          <GradientButton
            label={inviting ? 'Creating invite…' : 'Invite on WhatsApp'}
            loading={inviting}
            onPress={async () => {
              if (!requireName() || inviting) return;
              setInviting(true);
              try {
                await createWaliInvite(relationship as WaliRelationship);
                onInviteWhatsApp?.(name.trim(), relationship);
              } catch {
                onInviteWhatsApp?.(name.trim(), relationship);
              } finally {
                setInviting(false);
              }
            }}
          />
          {/* .btn-o — outline, margin-top:9px (.btn+.btn) */}
          <View style={styles.footerGap} />
          <GradientButton
            label="Read him a code instead"
            variant="outline"
            onPress={async () => {
              if (!requireName() || inviting) return;
              setInviting(true);
              try {
                await createWaliInvite(relationship as WaliRelationship);
                onReadCode?.(name.trim(), relationship);
              } catch {
                onReadCode?.(name.trim(), relationship);
              } finally {
                setInviting(false);
              }
            }}
          />
          {/* .btn-t — plain text link */}
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [
              styles.textBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}>
            <Text style={styles.textBtnLabel}>Skip for now</Text>
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

  // ── Nav bar (.nb) ──────────────────────────────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // .back — 38×38 white rounded square with shadow
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

  // .prg — flex:1, 7px height track
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },

  // .prg i — gradient fill at 90%
  progressFill: {
    height: '100%',
    width: '90%',
    borderRadius: 5,
  },

  // .skip
  skipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── Scroll area (.scrollarea) ──────────────────────────────────────────────
  scrollArea: {
    flex: 1,
  },

  scrollContent: {
    paddingRight: 2,
    paddingBottom: 12,
  },

  // ── Question block (.q) ────────────────────────────────────────────────────
  questionBlock: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
  },

  // .qk — uppercase pill label
  qLabelPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
    marginBottom: 10,
  },

  qLabelText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },

  // .qh — 24px bold heading
  qHeading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29, // 24 × 1.2 ≈ 29
    color: Colors.ink,
  },

  // .qs — 13px supporting text
  qSub: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20, // 13 × 1.55 ≈ 20
  },

  // ── Field (.field) ─────────────────────────────────────────────────────────
  field: {
    marginTop: 14,
  },

  // .flab — 11px uppercase label
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },

  // .inp — 54px input container
  inputWrap: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // .inp.focus
  inputFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },

  inputError: {
    borderColor: '#D9304F',
  },

  errorText: {
    fontSize: 11.5,
    color: '#D9304F',
    marginTop: 7,
    lineHeight: 17,
  },

  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
    backgroundColor: 'transparent',
  },

  // ── Chip group (.chipwrap) ─────────────────────────────────────────────────
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Base chip shape — applied to both selected (LinearGradient) and unselected
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
  },

  // .chip — unselected state
  chipOff: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4.5,
    elevation: 1,
  },

  chipOffText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },

  // .chip.on — selected state (applied to LinearGradient wrapper)
  chipOn: {
    shadowColor: '#B464C8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },

  chipOnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Footer (.foot) ─────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },

  // .btn+.btn margin-top:9px
  footerGap: {
    height: 9,
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
