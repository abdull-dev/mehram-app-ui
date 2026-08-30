/**
 * WaliInviteScreen  (F15)
 *
 * Wali invitation step in the seeker's onboarding flow.
 * Two paths:
 *  1. Invite on WhatsApp  → opens WhatsApp with invite link
 *  2. Generate invite code → shows the code inline; user copies/shares manually
 *
 * Name and relationship are NOT collected here — the wali enters
 * those details during their own registration (WaliDetailsScreen).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Linking,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';
import { createWaliInvite, type WaliInvite } from '../../api/wali';

// ─── animation ────────────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);
const RISE_OFFSET = 15;

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

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliInviteScreenProps {
  onBack?: () => void;
  onLater?: () => void;
  onInviteWhatsApp?: () => void;
  onReadCode?: () => void;
  onSkip?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliInviteScreen({
  onBack,
  onLater,
  onInviteWhatsApp,
  onReadCode,
  onSkip,
}: WaliInviteScreenProps) {
  const insets = useSafeAreaInsets();
  const [invitingWhatsApp, setInvitingWhatsApp] = useState(false);
  const [generatingCode, setGeneratingCode]     = useState(false);
  const [invite, setInvite]                     = useState<WaliInvite | null>(null);

  const questionAnimRef = useRef(new Animated.Value(0));
  const buttonsAnimRef  = useRef(new Animated.Value(0));
  const codeAnimRef     = useRef(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(questionAnimRef.current, {
        toValue: 1, duration: RISE_DURATION, delay: 0,
        easing: RISE_EASING, useNativeDriver: true,
      }),
      Animated.timing(buttonsAnimRef.current, {
        toValue: 1, duration: RISE_DURATION, delay: 100,
        easing: RISE_EASING, useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!invite) return;
    Animated.timing(codeAnimRef.current, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [invite]);

  // Format 10-char code as XXXXX-XXXXX for readability
  function formatCode(code: string) {
    if (code.length === 10) return `${code.slice(0, 5)}-${code.slice(5)}`;
    return code;
  }

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

        {/* Nav bar */}
        <View style={styles.nb}>
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [
              styles.backBtn,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
              stroke={Colors.vioInk} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </Pressable>

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

        {/* Body */}
        <View style={styles.body}>
          <Animated.View style={[styles.questionBlock, riseStyle(questionAnimRef.current)]}>
            <View style={styles.qLabelPill}>
              <Text style={styles.qLabelText}>Your wali</Text>
            </View>
            <Text style={styles.qHeading}>Invite your wali</Text>
            <Text style={styles.qSub}>
              Your wali reviews proposals before you see them — keeping the
              process respectful and family-guided. They'll create their own
              account once they receive your invite.
            </Text>
          </Animated.View>

          {/* Generated code card */}
          {invite && (
            <Animated.View
              style={[
                styles.codeCard,
                {
                  opacity: codeAnimRef.current,
                  transform: [{
                    translateY: codeAnimRef.current.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  }],
                },
              ]}>
              <Text style={styles.codeCardLabel}>Your invite code</Text>
              <Text style={styles.codeText}>{formatCode(invite.invitationCode)}</Text>
              <Text style={styles.codeHint}>Share this with your wali so they can register</Text>
            </Animated.View>
          )}
        </View>

        {/* Footer */}
        <Animated.View style={[styles.footer, riseStyle(buttonsAnimRef.current)]}>
          {invite ? (
            // ── Post-generation: Continue + Share ──────────────────────────
            <>
              <GradientButton
                label="Continue"
                onPress={() => onReadCode?.()}
              />
              <View style={styles.footerGap} />
              <Pressable
                onPress={() =>
                  Share.share({
                    message: `Your Mehram wali invite code: ${invite.invitationCode}\n\nOr use this link: ${invite.inviteLink}`,
                  })
                }
                style={({ pressed }) => [
                  styles.generateBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}>
                <Text style={styles.generateBtnText}>Share code</Text>
              </Pressable>
            </>
          ) : (
            // ── Pre-generation: WhatsApp + Generate + Skip ─────────────────
            <>
              <GradientButton
                label="Invite on WhatsApp"
                loading={invitingWhatsApp}
                onPress={async () => {
                  if (invitingWhatsApp || generatingCode) return;
                  setInvitingWhatsApp(true);
                  try {
                    const result = await createWaliInvite();
                    setInvite(result);
                    const msg = `Assalamu alaikum! I'm using Mehram for rishta and I'd like you to be my wali. Join using this link:\n${result.inviteLink}`;
                    const url = `whatsapp://send?text=${encodeURIComponent(msg)}`;
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      await Linking.openURL(url);
                    } else {
                      await Share.share({ message: msg });
                    }
                    onInviteWhatsApp?.();
                  } catch {
                    onInviteWhatsApp?.();
                  } finally {
                    setInvitingWhatsApp(false);
                  }
                }}
              />
              <View style={styles.footerGap} />
              <Pressable
                onPress={async () => {
                  if (generatingCode || invitingWhatsApp) return;
                  setGeneratingCode(true);
                  try {
                    const result = await createWaliInvite();
                    setInvite(result);
                    // do NOT call onReadCode here — user must tap Continue
                  } catch {
                    // silent — user can retry
                  } finally {
                    setGeneratingCode(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.generateBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}>
                {generatingCode ? (
                  <ActivityIndicator size="small" color={Colors.vioInk} />
                ) : (
                  <Text style={styles.generateBtnText}>Generate invite code</Text>
                )}
              </Pressable>
              <Pressable
                onPress={onSkip}
                style={({ pressed }) => [
                  styles.textBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}>
                <Text style={styles.textBtnLabel}>Skip for now</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
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

  // ── Nav bar ───────────────────────────────────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },
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
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '90%',
    borderRadius: 5,
  },
  skipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  questionBlock: {
    paddingHorizontal: 2,
    paddingBottom: 20,
  },
  qLabelPill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
    marginBottom: 14,
  },
  qLabelText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  qHeading: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 34,
    color: Colors.ink,
    marginBottom: 12,
  },
  qSub: {
    fontSize: 14,
    color: Colors.ink2,
    lineHeight: 22,
  },

  // ── Code card ─────────────────────────────────────────────────────────────
  codeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  codeCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 4,
    color: Colors.vioInk,
    marginBottom: 8,
  },
  codeHint: {
    fontSize: 12,
    color: Colors.ink3,
    textAlign: 'center',
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
  footerGap: {
    height: 9,
  },
  generateBtn: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  generateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.vioInk,
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
  },
});
