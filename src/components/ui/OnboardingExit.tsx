/**
 * The exit control in an onboarding screen's nav bar.
 *
 * Which one appears depends on how the screen was reached, and the two cases are
 * genuinely different:
 *
 *   • from Home, to finish a profile section — there is somewhere to return to,
 *     so an ✕ takes you back;
 *   • walking the signup flow — the account exists but nothing is finished, and
 *     the only way out is to abandon it, so "Log out".
 *
 * A single component because every onboarding screen needs the same rule and
 * half of them draw their own nav bar. Renders nothing when neither handler is
 * given, which is the resumed-session case: the flow continues, and there is no
 * exit to offer that is not one of the two above.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

interface OnboardingExitProps {
  /** Return to Home. Takes precedence — it is the gentler of the two. */
  onClose?: () => void;
  /** Abandon the signup. */
  onLogout?: () => void;
}

export function OnboardingExit({ onClose, onLogout }: OnboardingExitProps) {
  if (onClose) {
    return (
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
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
    );
  }

  if (onLogout) {
    return (
      <Pressable
        onPress={onLogout}
        hitSlop={10}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    );
  }

  return null;
}

/** True when either exit is available, for laying out around it. */
export function hasOnboardingExit(props: OnboardingExitProps): boolean {
  return !!props.onClose || !!props.onLogout;
}

const styles = StyleSheet.create({
  close: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logout: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexShrink: 0,
  },
  logoutText: { fontSize: 12, fontWeight: '800', color: Colors.ink3 },
  pressed: { opacity: 0.65 },
});
