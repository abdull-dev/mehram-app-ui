/**
 * FormTextInput
 *
 * Labelled text input field matching .field + .flab + .inp from the prototype:
 *
 *   LABEL
 *   ┌──────────────────────────────────────────┐
 *   │ value text                             ▾  │  ← chevron optional
 *   └──────────────────────────────────────────┘
 *   hint text (optional)
 *
 * Focus state: violet border + glow ring (mirrors .inp.focus CSS).
 */

import React, { useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors } from '../../theme/colors';

interface FormTextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  error?: string;
  /** Show a down-caret (▾) on the right — used for picker-style fields */
  hasChevron?: boolean;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
}

export function FormTextInput({
  label,
  value,
  onChangeText,
  hint,
  error,
  hasChevron,
  placeholder,
  keyboardType,
  maxLength,
}: FormTextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.flab}>{label}</Text>
      <View style={[styles.inp, focused && styles.inpFocus, !!error && styles.inpError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          placeholderTextColor={Colors.ink3}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {hasChevron ? <Text style={styles.chevron}>▾</Text> : null}
      </View>
      {error
        ? <Text style={styles.errorText}>{error}</Text>
        : hint ? <Text style={styles.fhint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // .field — margin-top 14
  field: {
    marginTop: 14,
  },

  // .flab — 11px 800, letter-spacing .8, uppercase, ink3
  flab: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },

  // .inp — 54px, rounded 18, white 86%, violet border, subtle shadow
  inp: {
    height: 54,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 10,
    shadowColor: '#3C2878',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  // .inp.focus — violet border, glow ring
  inpFocus: {
    borderColor: Colors.vio,
    shadowColor: 'rgba(155,123,240,0.16)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },

  inpError: {
    borderColor: '#D9304F',
  },

  errorText: {
    fontSize: 11.5,
    color: '#D9304F',
    marginTop: 7,
    lineHeight: 17,
  },

  // .inp input — flex:1, 15px, ink
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
    minWidth: 0,
    backgroundColor: 'transparent',
  },

  // Down-caret
  chevron: {
    fontSize: 16,
    color: Colors.ink3,
  },

  // .fhint — 11.5px ink3, margin-top 7, line-height 1.45
  fhint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 7,
    lineHeight: 17,
  },
});
