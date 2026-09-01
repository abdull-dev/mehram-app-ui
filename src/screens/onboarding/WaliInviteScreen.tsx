/**
 * WaliInviteScreen — invite a wali.
 *
 * Standalone, not an onboarding step. It used to sit at F15 between Photos and
 * Verification, carrying a progress bar and stepping the flow on, so its two
 * buttons behaved like "Continue": they created an invitation nobody was ever
 * shown and then moved to the next screen. The invite is the whole point of the
 * screen, so it now stays put and shows what it made — a WhatsApp share, or the
 * code to read out — and closes back to Home when the user is done.
 *
 *   ┌─────────────────────────────────┐
 *   │  [×]                            │
 *   ├─────────────────────────────────┤
 *   │  [YOUR WALI]                    │
 *   │  Who will review                │
 *   │  your proposals?                │
 *   │  Nine of your 142 matches only… │
 *   │  ┌ INVITATION CODE ──────────┐  │  after "Read him a code instead"
 *   │  │        482913             │  │
 *   │  │       [Copy code]         │  │
 *   │  └───────────────────────────┘  │
 *   ├─────────────────────────────────┤
 *   │  [Invite on WhatsApp]           │
 *   │  [Read him a code instead]      │
 *   └─────────────────────────────────┘
 *
 * Entrance: the question block rises immediately (.an).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors } from '../../theme/colors';
import { ApiError } from '../../api/client';
import { createWaliInvite, type WaliInvite } from '../../api/wali';

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

function CopyIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 9h10v10H9zM5 15V5h10"
        stroke={Colors.vioInk}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Neither the guardian's name nor his kinship is collected here — he states
// both during his own onboarding (WaliDetailsScreen), so asking the seeker for
// a name the invite never carried was pure friction. This screen only sends the
// invite, which is always a WALI invitation.

// ─── component ────────────────────────────────────────────────────────────────
interface WaliInviteScreenProps {
  /** Dismisses the screen. There is no "next" — this is not a step. */
  onClose?: () => void;
}

export function WaliInviteScreen({ onClose }: WaliInviteScreenProps) {
  const insets = useSafeAreaInsets();
  // Which button is waiting. A single boolean drove the WhatsApp button's
  // spinner from either press, so tapping "Read him a code instead" showed
  // progress on the wrong button — and that button showed none at all.
  const [pending, setPending] = useState<'whatsapp' | 'code' | null>(null);
  const [invite, setInvite] = useState<WaliInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrance: .an (0 ms)
  const questionAnim = useFadeRise(0);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    makeRise(questionAnim).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One invitation per visit, shared by both buttons, so sending the link and
  // reading the code out do not hand the wali two different codes.
  async function generateInvite(source: 'whatsapp' | 'code'): Promise<WaliInvite | null> {
    if (pending) return null;
    setPending(source);
    setError(null);
    try {
      const result = await createWaliInvite();
      setInvite(result);
      return result;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create the invite. Check your connection and try again.',
      );
      return null;
    } finally {
      setPending(null);
    }
  }

  async function handleWhatsApp() {
    const inv = invite ?? (await generateInvite('whatsapp'));
    if (inv?.inviteLink) Linking.openURL(inv.inviteLink).catch(() => {});
  }

  async function handleCode() {
    if (invite) return;
    await generateInvite('code');
  }

  function handleCopy() {
    if (!invite) return;
    Clipboard.setString(invite.invitationCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* ── Nav bar: [×] ──────────────────────────────────────────────────
            No progress bar and no back arrow: the screen is opened from Home on
            its own, so there is no step behind it and none it advances to. */}
        <View style={styles.nb}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [
              styles.closeBtn,
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
              <Path d="M18 6L6 18M6 6l12 12" />
            </Svg>
          </Pressable>
        </View>

        {/* ── Scrollable body ─────────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* Question block — .q .an (0 ms delay) */}
          <Animated.View style={[styles.questionBlock, riseStyle(questionAnim.anim)]}
            needsOffscreenAlphaCompositing>
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

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {/* The code itself — what "Read him a code instead" promises. */}
          {invite && (
            <View style={styles.codeBox}>
              <Text style={styles.codeBoxTitle}>Invitation code</Text>
              <Text style={styles.codeValue}>{invite.invitationCode}</Text>
              <Text style={styles.codeHint}>
                Ask your wali to open Kindred, choose that he is a wali, and
                enter this code.
              </Text>
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.7 }]}>
                <CopyIcon />
                <Text style={styles.copyBtnTxt}>{copied ? 'Copied!' : 'Copy code'}</Text>
              </Pressable>
            </View>
          )}

        </ScrollView>

        {/* ── Footer — .foot ─────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {/* .btn-f — primary gradient */}
          <GradientButton
            label="Invite on WhatsApp"
            loading={pending === 'whatsapp'}
            onPress={handleWhatsApp}
          />
          {/* .btn-o — outline, margin-top:9px (.btn+.btn) */}
          <View style={styles.footerGap} />
          <GradientButton
            label={
              invite
                ? 'Code shown above'
                : pending === 'code'
                  ? 'Creating invite…'
                  : 'Read him a code instead'
            }
            loading={pending === 'code'}
            // Once the code is on screen there is nothing left to press: a
            // second tap would mint a new invitation and silently invalidate
            // the one the user may already have read out.
            variant={invite ? 'disabled' : 'outline'}
            onPress={handleCode}
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

  // ── Nav bar (.nb) ──────────────────────────────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 4,
    flexShrink: 0,
  },

  // Close chip — 38×38 white rounded square with shadow.
  closeBtn: {
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

  errorText: {
    fontSize: 12.5,
    color: '#D9304F',
    marginTop: 14,
    marginHorizontal: 2,
    lineHeight: 18,
  },

  // ── Invitation code (shown once created) ───────────────────────────────────
  codeBox: {
    marginTop: 20,
    backgroundColor: Colors.vioSoft,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
  },

  codeBoxTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: Colors.vioInk,
    marginBottom: 8,
  },

  codeValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
    color: Colors.vioInk,
    marginBottom: 8,
  },

  codeHint: {
    fontSize: 12.5,
    color: Colors.vioInk,
    opacity: 0.75,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },

  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },

  copyBtnTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioInk,
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
});
