/**
 * GradientButton
 *
 * Three variants matching the HTML prototype's .btn hierarchy:
 *   primary  — full gradient fill with coloured glow  (.btn-f)
 *   outline  — white bg, violet hairline border        (.btn-o)
 *   disabled — muted violet tint, no interaction       (.btn-d)
 *
 * Text buttons (.btn-t) are handled inline in each screen since they
 * carry screen-specific rich text (e.g. "Already have an account? Sign in").
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Colors, GradientColors } from '../../theme/colors';
import { busyLabelFor } from '../../utils/busyLabel';

export type ButtonVariant = 'primary' | 'outline' | 'disabled';

interface GradientButtonProps {
  label: string;
  variant?: ButtonVariant;
  onPress?: () => void;
  loading?: boolean;
  /**
   * What the button says while `loading`. Defaults to wording derived from
   * `label` — see `busyLabelFor`. Set this for a dynamic or unusual label.
   */
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Spinner plus wording, so a busy button still says what it is doing. */
function BusyContent({ text, color, textStyle }: {
  text: string;
  color: string;
  textStyle: StyleProp<TextStyle>;
}) {
  return (
    <View style={styles.busyRow}>
      <ActivityIndicator size="small" color={color} />
      <Text style={textStyle} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export function GradientButton({
  label,
  variant = 'primary',
  onPress,
  loading = false,
  loadingLabel,
  style,
}: GradientButtonProps) {
  const isDisabled = variant === 'disabled' || loading;
  const busyText = loadingLabel ?? busyLabelFor(label);

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.shadow,
          { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.984 : 1 }] },
          style,
        ]}>
        <LinearGradient
          colors={[...GradientColors.primary]}
          locations={[...GradientColors.primaryLocations]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.btn}>
          {loading ? (
            <BusyContent text={busyText} color="#fff" textStyle={styles.primaryLabel} />
          ) : (
            <Text style={styles.primaryLabel}>{label}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'outline') {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.btn,
          styles.outlineBtn,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.984 : 1 }] },
          style,
        ]}>
        {/* The outline variant accepted `loading` but only ever disabled itself,
            so a press on it looked like nothing had happened while its request
            ran — and on screens with two buttons the spinner appeared on the
            primary one instead. */}
        {loading ? (
          <BusyContent text={busyText} color={Colors.vioInk} textStyle={styles.outlineLabel} />
        ) : (
          <Text style={styles.outlineLabel}>{label}</Text>
        )}
      </Pressable>
    );
  }

  // disabled
  return (
    <View style={[styles.btn, styles.disabledBtn, style]}>
      {loading ? (
        <BusyContent text={busyText} color={Colors.vioInk} textStyle={styles.disabledLabel} />
      ) : (
        <Text style={styles.disabledLabel}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  // Outer wrapper for primary — carries the drop shadow so it sits
  // *outside* the gradient (LinearGradient can't have shadow on Android)
  shadow: {
    borderRadius: 19,
    shadowColor: '#B469CD',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 10,
  },
  btn: {
    width: '100%',
    minHeight: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryLabel: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.1,
    color: '#fff',
  },
  outlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.28)',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  outlineLabel: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.1,
    color: Colors.vioInk,
  },
  disabledBtn: {
    backgroundColor: 'rgba(155,123,240,0.13)',
  },
  disabledLabel: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.1,
    color: '#A79EC6',
  },
});
