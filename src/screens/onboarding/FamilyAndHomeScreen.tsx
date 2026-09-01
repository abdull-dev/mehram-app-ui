/**
 * FamilyAndHomeScreen  (F11)
 *
 * Profile-building step for household details. Mirrors the HTML prototype F11:
 *
 *   ┌─────────────────────────────────┐
 *   │  ←  [━━━━━━━━━━━━━━━░░░░░░]  Save  │  62 % progress
 *   ├─────────────────────────────────┤
 *   │  FAMILY AND HOME                │
 *   │  Your household                 │
 *   │  Families read this…            │
 *   │                                 │
 *   │  HOUSING                        │
 *   │  [Owned house ✓] [Owned flat]…  │
 *   │                                 │
 *   │  AFTER MARRIAGE                 │
 *   │  [Joint family ✓] [Separate]…   │
 *   │                                 │
 *   │  SIBLINGS                       │
 *   │  [2 brothers, 1 sister       ▾] │
 *   │  Add how many are married…      │
 *   │                                 │
 *   │  FATHER'S OCCUPATION            │
 *   │  [Retired, Pakistan Railways  ] │
 *   │                                 │
 *   │  MOTHER'S OCCUPATION            │
 *   │  [Homemaker                   ] │
 *   │                                 │
 *   │  OWN A CAR                      │
 *   │  [Yes ✓]  [No]                  │
 *   │                                 │
 *   │  FAMILY TYPE                    │
 *   │  [Joint family ✓] [Nuclear…]    │
 *   ├─────────────────────────────────┤
 *   │  [        Continue        ]     │
 *   └─────────────────────────────────┘
 *
 * Entrance: staggered fade-rise for header and five field groups (d1–d5).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { ChipSelect } from '../../components/ui/ChipSelect';
import { FormTextInput } from '../../components/ui/FormTextInput';
import { GradientButton } from '../../components/ui/GradientButton';
import { NavBar } from '../../components/ui/NavBar';
import { Colors } from '../../theme/colors';
import { getMyProfile, buildSiblingsSummary } from '../../api/profile';

// ─── siblings parser ──────────────────────────────────────────────────────────
function parseSiblings(summary?: string | null): { brothers: string; sisters: string } {
  if (!summary || summary === '0 siblings') return { brothers: '', sisters: '' };
  const bMatch = summary.match(/(\d+)\s+brothers?/);
  const sMatch = summary.match(/(\d+)\s+sisters?/);
  return {
    brothers: bMatch ? bMatch[1] : '',
    sisters:  sMatch ? sMatch[1] : '',
  };
}

// ─── animation helpers ────────────────────────────────────────────────────────
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

// ─── option arrays (referenced by both the pre-populate effect and the save handler)
const HOUSING_OPTIONS      = ['Owned house', 'Owned flat', 'Rented', 'Family home'];
const MARRIAGE_OPTIONS     = ['Joint family', 'Separate home', 'Not decided'];

/**
 * Household setup, in the terms Pakistani families actually use.
 *
 * "Extended" used to sit between these two and meant nothing here: in Pakistan
 * the distinction families draw is joint or separate — a household shared with
 * parents and brothers' families, or one that is not — and "extended" is a
 * Western sociology term for the same joint arrangement. It also could not be
 * saved: the server's FamilyType is NUCLEAR or JOINT, so "Extended" was stored
 * as JOINT and the chip silently moved to "Joint" when the form was reopened.
 *
 * Joint leads because it is the more common arrangement here, matching the
 * default of "After marriage" directly above.
 */
export const FAMILY_TYPE_OPTIONS = ['Joint family', 'Nuclear family'];

const FAMILY_TYPE_HINT =
  'Joint — parents, brothers and their families in one household. ' +
  'Nuclear — parents and unmarried children only.';

/** Which chip a saved FamilyType corresponds to. */
const FAMILY_TYPE_FROM_API: Record<string, string> = {
  JOINT: 'Joint family',
  NUCLEAR: 'Nuclear family',
};

// ─── component ────────────────────────────────────────────────────────────────
export interface FamilyAndHomeData {
  housingStatus: string;
  livingArrangement: string;
  familyType: string;
  siblingsSummary: string;
  fatherOccupation: string;
  motherOccupation: string;
  hasVehicle: boolean;
}

interface FamilyAndHomeScreenProps {
  onBack?: () => void;
  onSave?: () => void;
  /**
   * How to leave the flow — an ✕ back to Home when this screen was opened from
   * there, or "Log out" while walking the signup. Exactly one is set.
   */
  onClose?: () => void;
  onLogout?: () => void;
  onContinue?: (data: FamilyAndHomeData) => void;
  continueLoading?: boolean;
}

export function FamilyAndHomeScreen({
  onBack,
  onSave,
  onClose,
  onLogout,
  onContinue,
  continueLoading,
}: FamilyAndHomeScreenProps) {
  const insets = useSafeAreaInsets();

  // ── form state ──────────────────────────────────────────────────────────────
  const [housing, setHousing] = useState(0);       // Owned house
  const [afterMarriage, setAfterMarriage] = useState(0); // Joint family
  const [familyType, setFamilyType] = useState(0); // Joint family
  const [brothers, setBrothers] = useState('');
  const [sisters, setSisters]   = useState('');
  const [fatherOcc, setFatherOcc] = useState('');
  const [motherOcc, setMotherOcc] = useState('');

  // Only allow letters and spaces in occupation fields
  const lettersOnly = (text: string) => text.replace(/[^a-zA-Z\s]/g, '');
  const [ownsCar, setOwnsCar] = useState(0);        // Yes
  const [errors, setErrors] = useState<{ fatherOcc?: string; motherOcc?: string }>({});

  // ── entrance animations — header + d1–d6 ───────────────────────────────────
  const hdr = useFadeRise(50);
  const d1  = useFadeRise(120);
  const d2  = useFadeRise(190);
  const d3  = useFadeRise(260);
  const d4  = useFadeRise(330);
  const d5  = useFadeRise(400);
  const d6  = useFadeRise(470);

  useEffect(() => {
    const make = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });

    Animated.parallel([
      make(hdr),
      make(d1),
      make(d2),
      make(d3),
      make(d4),
      make(d5),
      make(d6),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── pre-populate from API on mount ─────────────────────────────────────────
  useEffect(() => {
    getMyProfile().then(profile => {
      const fb = profile.familyBackground;
      if (!fb) return;
      if (fb.housingStatus) {
        const idx = HOUSING_OPTIONS.indexOf(fb.housingStatus);
        if (idx !== -1) setHousing(idx);
      }
      if (fb.livingArrangement) {
        const idx = MARRIAGE_OPTIONS.indexOf(fb.livingArrangement);
        if (idx !== -1) setAfterMarriage(idx);
      }
      const { brothers: b, sisters: s } = parseSiblings(fb.siblingsSummary);
      setBrothers(b);
      setSisters(s);
      if (fb.fatherOccupation) setFatherOcc(fb.fatherOccupation);
      if (fb.motherOccupation) setMotherOcc(fb.motherOccupation);
      if (fb.hasVehicle !== null && fb.hasVehicle !== undefined) {
        setOwnsCar(fb.hasVehicle ? 0 : 1);
      }
      if (fb.familyType) {
        const label = FAMILY_TYPE_FROM_API[fb.familyType] ?? fb.familyType;
        const idx = FAMILY_TYPE_OPTIONS.indexOf(label);
        if (idx !== -1) setFamilyType(idx);
      }
    }).catch(() => {});
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
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}>

        {/* ── Nav bar ──────────────────────────────────────────────────── */}
        <NavBar
          progress={62}
          onBack={onBack}
          actionLabel="Save"
          onAction={onSave}
          onClose={onClose}
          onLogout={onLogout}
        />

        {/* ── Scrollable body ──────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">

          {/* Section header — .q */}
          <Animated.View style={riseStyle(hdr.anim)}
            needsOffscreenAlphaCompositing>
            <View style={styles.qkWrap}>
              <Text style={styles.qkText}>Family and home</Text>
            </View>
            <Text style={styles.qh}>Your household</Text>
            <Text style={styles.qs}>
              Families read this section before anything else.
            </Text>
          </Animated.View>

          {/* d1 — Housing */}
          <Animated.View style={riseStyle(d1.anim)}
            needsOffscreenAlphaCompositing>
            <ChipSelect
              label="Housing"
              options={['Owned house', 'Owned flat', 'Rented', 'Family home']}
              value={housing}
              onChange={setHousing}
            />
          </Animated.View>

          {/* d2 — After marriage */}
          <Animated.View style={riseStyle(d2.anim)}
            needsOffscreenAlphaCompositing>
            <ChipSelect
              label="After marriage"
              options={['Joint family', 'Separate home', 'Not decided']}
              value={afterMarriage}
              onChange={setAfterMarriage}
            />
          </Animated.View>

          {/* d3 — Siblings */}
          <Animated.View style={riseStyle(d3.anim)}
            needsOffscreenAlphaCompositing>
            <View style={styles.siblingsRow}>
              <View style={styles.siblingsField}>
                <FormTextInput
                  label="Brothers"
                  value={brothers}
                  onChangeText={setBrothers}
                  placeholder="0"
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
              <View style={styles.siblingsField}>
                <FormTextInput
                  label="Sisters"
                  value={sisters}
                  onChangeText={setSisters}
                  placeholder="0"
                  keyboardType="number-pad"
                  maxLength={1}
                />
              </View>
            </View>
            <Text style={styles.siblingsHint}>Add how many are married — families always ask.</Text>
          </Animated.View>

          {/* d4 — Father & Mother occupations */}
          <Animated.View style={riseStyle(d4.anim)}
            needsOffscreenAlphaCompositing>
            <FormTextInput
              label="Father's occupation"
              value={fatherOcc}
              onChangeText={t => { setFatherOcc(lettersOnly(t)); if (errors.fatherOcc) setErrors(e => ({ ...e, fatherOcc: undefined })); }}
              error={errors.fatherOcc}
            />
            <FormTextInput
              label="Mother's occupation"
              value={motherOcc}
              onChangeText={t => { setMotherOcc(lettersOnly(t)); if (errors.motherOcc) setErrors(e => ({ ...e, motherOcc: undefined })); }}
              error={errors.motherOcc}
            />
          </Animated.View>

          {/* d5 — Own a car */}
          <Animated.View style={riseStyle(d5.anim)}
            needsOffscreenAlphaCompositing>
            <ChipSelect
              label="Own a car"
              options={['Yes', 'No']}
              value={ownsCar}
              onChange={setOwnsCar}
            />
          </Animated.View>

          {/* d6 — Family type */}
          <Animated.View style={riseStyle(d6.anim)}
            needsOffscreenAlphaCompositing>
            <ChipSelect
              label="Family type"
              options={FAMILY_TYPE_OPTIONS}
              value={familyType}
              onChange={setFamilyType}
              hint={FAMILY_TYPE_HINT}
            />
          </Animated.View>
        </ScrollView>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Continue"
            loading={continueLoading}
            onPress={() => {
              const e: { fatherOcc?: string; motherOcc?: string } = {};
              if (!fatherOcc.trim()) e.fatherOcc = "Please enter your father's occupation.";
              if (!motherOcc.trim()) e.motherOcc = "Please enter your mother's occupation.";
              if (Object.keys(e).length > 0) { setErrors(e); return; }
              onContinue?.({
                housingStatus: HOUSING_OPTIONS[housing],
                livingArrangement: MARRIAGE_OPTIONS[afterMarriage],
                familyType: FAMILY_TYPE_OPTIONS[familyType],
                siblingsSummary: buildSiblingsSummary(brothers, sisters),
                fatherOccupation: fatherOcc.trim(),
                motherOccupation: motherOcc.trim(),
                hasVehicle: ownsCar === 0,
              });
            }}
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

  // Scrollable area — flex:1 so footer stays pinned at bottom
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },

  // .qk pill — inline, vioSoft bg, vioInk text, uppercase 10.5px
  qkWrap: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 9,
    marginTop: 8,
    marginBottom: 10,
  },
  qkText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },

  // .qh — 24px 800, letter-spacing -.7, line-height 1.2
  qh: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // .qs — 13px ink2, margin-top 8, line-height 1.55
  qs: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // Siblings — two side-by-side number fields
  siblingsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  siblingsField: {
    flex: 1,
  },
  siblingsHint: {
    fontSize: 11.5,
    color: Colors.ink3,
    marginTop: 7,
    lineHeight: 17,
  },

  // .foot — padding-top 12
  footer: {
    paddingTop: 12,
  },
});
