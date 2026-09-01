/**
 * ConfirmDialog — the app's confirmation step for an action that cannot be
 * undone.
 *
 *   ┌────────────────────────────────────┐
 *   │              ⚠                     │  tone-coloured icon
 *   │        Remove Bilal Ahmed?         │
 *   │  They review every proposal…       │
 *   │  ┌──────────────────────────────┐  │
 *   │  │ • Your profile stops being…  │  │  consequences, one per line
 *   │  │ • Proposals waiting are…     │  │
 *   │  └──────────────────────────────┘  │
 *   │  ⓘ  Could not remove — retry       │  error, in place
 *   │  [    Keep    ] [   Remove    ]    │
 *   └────────────────────────────────────┘
 *
 * Three things this does that the hand-rolled dialog it replaces did not, each
 * of which mattered for a destructive action:
 *
 *   - Spells out the consequences rather than describing the action. "This will
 *     unlink your wali" restates the button; what the user needs to know is that
 *     their profile leaves discovery and pending proposals are dropped.
 *   - Keeps a failure inside the dialog. The old one closed on `finally`
 *     whether the request succeeded or threw, so a failed removal looked
 *     exactly like a successful one.
 *   - Names the safe choice. "Cancel" describes dismissing a dialog; "Keep
 *     Bilal as my wali" describes what the user gets, which is the thing they
 *     are actually choosing between.
 *
 * The card animates in on its own rather than relying on `Modal`'s fade: at
 * this size a cross-fade with no movement reads as a flicker.
 */

import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';

/** How the confirming action is coloured, and which icon it gets. */
export type ConfirmTone = 'destructive' | 'caution';

const TONES = {
  destructive: {
    accent: Colors.roseD,
    soft: Colors.roseSoft,
  },
  caution: {
    accent: Colors.goldInk,
    soft: Colors.goldSoft,
  },
} as const;

const IN_DURATION = 190;
const OUT_DURATION = 130;

function WarningIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <Path d="M12 9v4M12 17h.01" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
      stroke={Colors.roseInk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />
    </Svg>
  );
}

export interface ConfirmDialogProps {
  visible: boolean;
  /** Question form — the user is answering it, e.g. "Remove Bilal Ahmed?" */
  title: string;
  /** One or two sentences of context, above the consequences. */
  body?: string;
  /**
   * What will actually happen, one item per line. This is the part that earns
   * the dialog; without it a confirmation only asks the question twice.
   */
  consequences?: string[];
  /** Names the destructive outcome, e.g. "Remove wali". Not "OK". */
  confirmLabel: string;
  /** Names what the user keeps, e.g. "Keep Bilal". Not "Cancel". */
  cancelLabel: string;
  tone?: ConfirmTone;
  /** The confirmed action is running: buttons lock and the dialog stays put. */
  busy?: boolean;
  /** Shown in place, so a failure does not read as a success. */
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  body,
  consequences,
  confirmLabel,
  cancelLabel,
  tone = 'destructive',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const palette = TONES[tone];

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? IN_DURATION : OUT_DURATION,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  // While the request is running, neither the backdrop nor Android's back
  // button may dismiss: the dialog is the only place the result is reported.
  const dismiss = () => {
    if (!busy) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      // The card runs its own entrance, so the platform must not add a second.
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}>
      <Animated.View style={[styles.overlay, { opacity: anim }]}>
        {/* Backdrop. A separate layer from the card so a press on the card
            never counts as a press outside it. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel={cancelLabel}
        />

        <Animated.View
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={[
            styles.card,
            {
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.94, 1],
                  }),
                },
              ],
            },
          ]}>
          <View style={[styles.iconWrap, { backgroundColor: palette.soft }]}>
            <WarningIcon color={palette.accent} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          {consequences && consequences.length > 0 ? (
            <View style={styles.consequences}>
              {consequences.map(item => (
                <View key={item} style={styles.consequenceRow}>
                  <View style={[styles.bullet, { backgroundColor: palette.accent }]} />
                  <Text style={styles.consequenceText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorRow}>
              <AlertIcon />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Cancel first, and wider: on a destructive dialog the safe choice
              is the one a thumb should reach without aiming. */}
          <View style={styles.buttons}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
                busy && styles.btnDisabled,
              ]}>
              <Text style={styles.cancelText} numberOfLines={1}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy }}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: palette.accent },
                pressed && styles.confirmBtnPressed,
              ]}>
              {busy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText} numberOfLines={1}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(16,12,38,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26,
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 26,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: 'rgba(27,22,48,1)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 14,
  },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.45,
    lineHeight: 25,
    color: Colors.ink,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: Colors.ink2,
    textAlign: 'center',
  },

  // Consequences sit in their own tinted block: they are the part of the
  // dialog the user has to read, not a footnote to the sentence above.
  consequences: {
    width: '100%',
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.page,
    gap: 9,
  },
  consequenceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6.5,
  },
  consequenceText: {
    flex: 1,
    fontSize: 12.8,
    lineHeight: 18.5,
    color: Colors.ink2,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    width: '100%',
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: Colors.roseSoft,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: Colors.roseInk,
  },

  buttons: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    width: '100%',
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1.25,
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  cancelBtnPressed: {
    backgroundColor: Colors.page,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  confirmBtnPressed: {
    opacity: 0.88,
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
