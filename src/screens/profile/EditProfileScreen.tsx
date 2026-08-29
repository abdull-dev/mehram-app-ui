/**
 * EditProfileScreen — M6
 *
 * Edit biodata — step 1 of 8 (Basic identity).
 * Fields: full name, gender (locked), date of birth, height, marital status.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

// ─── design tokens ────────────────────────────────────────────────────────────
const C = {
  rose:      '#E6396E',
  indSoft:   '#EEECF8',
  indInk:    '#332C66',
  page:      '#F6F5FA',
  line:      '#E7E5F0',
  ink:       '#17171F',
  ink2:      '#5F5E70',
  ink3:      '#9695A5',
  fieldBg:   '#FBFAFD',
  lockedBg:  '#F2F1F7',
} as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function ChevLeft() {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none"
      stroke={C.indInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={C.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={4} y={11} width={16} height={10} rx={2.5} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </Svg>
  );
}

function ChevDown() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={C.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

// ─── form field components ────────────────────────────────────────────────────
function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function InputField({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.ink3}
    />
  );
}

function LockedField({ value }: { value: string }) {
  return (
    <View style={styles.lockedField}>
      <Text style={styles.lockedText}>{value}</Text>
      <LockIcon />
    </View>
  );
}

function DropdownField({ value, onPress }: { value: string; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.input, styles.dropdownField, pressed && { opacity: 0.8 }]}>
      <Text style={styles.dropdownText}>{value}</Text>
      <ChevDown />
    </Pressable>
  );
}

function HelperText({ text }: { text: string }) {
  return <Text style={styles.helperText}>{text}</Text>;
}

// ─── props ────────────────────────────────────────────────────────────────────
interface EditProfileScreenProps {
  onBack?: () => void;
  onCancel?: () => void;
  onContinue?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function EditProfileScreen({ onBack, onCancel, onContinue }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('Mian Haseeb');
  const [dob, setDob] = useState('21 January 1999');
  const [height, setHeight] = useState('5 ft 4 in');
  const [maritalStatus, setMaritalStatus] = useState('Single');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
          <ChevLeft />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topBarTitle}>Edit biodata</Text>
          <Text style={styles.topBarSub}>Basic identity · 1 of 8</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 32, 40) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.formPad}>

            <FieldLabel label="FULL NAME" />
            <InputField value={fullName} onChangeText={setFullName} />

            <View style={styles.fieldGap} />

            <FieldLabel label="GENDER" />
            <LockedField value="Male" />
            <HelperText text="Locked once your profile is verified." />

            <View style={styles.fieldGap} />

            <FieldLabel label="DATE OF BIRTH" />
            <InputField value={dob} onChangeText={setDob} />

            <View style={styles.fieldGap} />

            <FieldLabel label="HEIGHT" />
            <DropdownField value={height} />

            <View style={styles.fieldGap} />

            <FieldLabel label="MARITAL STATUS" />
            <DropdownField value={maritalStatus} />

          </View>
        </View>

        {/* Action card */}
        <View style={styles.card}>
          <View style={styles.acts}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.btnG, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: '#5F5E70' }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.btn, styles.btnF, pressed && { opacity: 0.85 }]}>
              <Text style={[styles.btnText, { color: '#fff' }]}>Continue</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.page,
  },

  // TopBar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    flexShrink: 0,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: C.ink,
  },
  topBarSub: {
    fontSize: 11.5,
    color: C.ink3,
    marginTop: 1,
  },

  // Scroll
  scroll: {
    paddingHorizontal: 15,
    paddingTop: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 3,
    marginBottom: 13,
    overflow: 'hidden',
  },

  // Form padding
  formPad: {
    padding: 18,
    paddingBottom: 10,
  },
  fieldGap: {
    height: 14,
  },

  // Field label
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.9,
    color: C.ink3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },

  // Input
  input: {
    height: 46,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.fieldBg,
    paddingHorizontal: 14,
    fontSize: 14,
    color: C.ink,
  },

  // Locked field
  lockedField: {
    height: 46,
    backgroundColor: C.lockedBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lockedText: {
    fontSize: 14,
    color: C.ink2,
  },

  // Dropdown field
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 14,
    color: C.ink,
  },

  // Helper text
  helperText: {
    fontSize: 11.5,
    color: C.ink3,
    marginTop: 5,
  },

  // Action buttons
  acts: {
    flexDirection: 'row',
    gap: 9,
    padding: 15,
    paddingBottom: 16,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnG: {
    backgroundColor: '#F2F1F7',
  },
  btnF: {
    backgroundColor: C.rose,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
