/**
 * WaliDetailsScreen — W4
 *
 * "A little about you" — name input + relationship chips.
 * Progress bar at 85% — "Step 3 of 3".
 * Indigo banner "Families on the other side see this too".
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, GRAD } from '../../theme/colors';

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  );
}

function PeopleIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={3.5} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </Svg>
  );
}

const RELATIONSHIP_OPTIONS = ['Father', 'Brother', 'Uncle', 'Grandfather', 'Other'] as const;
type Relationship = (typeof RELATIONSHIP_OPTIONS)[number];

// ─── props ────────────────────────────────────────────────────────────────────
interface WaliDetailsScreenProps {
  dependentName?: string;
  onContinue?: (name: string, relationship: string) => void;
  onBack?: () => void;
}

// ─── component ────────────────────────────────────────────────────────────────
export function WaliDetailsScreen({
  dependentName = 'Sana',
  onContinue,
  onBack,
}: WaliDetailsScreenProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [nameFocused, setNameFocused] = useState(false);

  const canContinue = name.trim().length > 0 && relationship !== null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.progressFill}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>Step 3 of 3</Text>
          </View>
          <Text style={styles.heading}>A little{'\n'}about you</Text>
          <Text style={styles.subheading}>
            {dependentName} will see your name and relationship. Nothing else.
          </Text>
        </View>

        {/* Name field */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Your name</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputFocused]}>
            <TextInput
              value={name}
              onChangeText={setName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              placeholder="e.g. Imran Mian"
              placeholderTextColor={Colors.ink3}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Relationship chips */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Your relationship to {dependentName}</Text>
          <View style={styles.chipWrap}>
            {RELATIONSHIP_OPTIONS.map(rel => {
              const active = relationship === rel;
              return active ? (
                <Pressable key={rel} onPress={() => setRelationship(rel)}>
                  <LinearGradient
                    colors={[...GRAD]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.chipActive}>
                    <Text style={styles.chipActiveText}>{rel}</Text>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  key={rel}
                  onPress={() => setRelationship(rel)}
                  style={({ pressed }) => [styles.chip, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                  <Text style={styles.chipText}>{rel}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Indigo banner */}
        <View style={styles.indBanner}>
          <PeopleIcon />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Families on the other side see this too</Text>
            <Text style={styles.bannerBody}>
              When you approve a proposal, they see that {dependentName}'s{' '}
              {relationship?.toLowerCase() ?? 'wali'} reviewed it. That is what builds their confidence.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={() => canContinue && onContinue?.(name.trim(), relationship!)}
          disabled={!canContinue}
          style={({ pressed }) => [{ opacity: !canContinue ? 0.5 : pressed ? 0.9 : 1 }]}>
          <LinearGradient
            colors={[...GRAD]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.btnFilled}>
            <Text style={styles.btnFilledText}>Continue</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.page,
    paddingHorizontal: 20,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    width: '85%',
    height: 7,
    borderRadius: 5,
  },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 16,
    gap: 14,
  },
  header: {},
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 30,
    color: Colors.ink,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 13,
    color: Colors.ink2,
    lineHeight: 20,
  },
  field: { gap: 8 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },
  inputWrap: {
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.86)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    paddingHorizontal: 15,
    justifyContent: 'center',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  inputFocused: {
    borderColor: Colors.vio,
    shadowColor: Colors.vio,
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  input: {
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBase: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  chipActive: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
    overflow: 'hidden',
  },
  chipActiveText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1.6,
    borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C287A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  chipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.ink2,
  },
  indBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F3EEFE',
    borderRadius: 18,
    padding: 14,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.vioInk,
    marginBottom: 2,
  },
  bannerBody: {
    fontSize: 11.5,
    lineHeight: 17,
    color: '#584A93',
  },
  footer: {
    paddingTop: 8,
  },
  btnFilled: {
    height: 54,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFilledText: {
    fontSize: 15.5,
    fontWeight: '800',
    color: '#fff',
  },
});
