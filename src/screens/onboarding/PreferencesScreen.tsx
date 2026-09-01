/**
 * PreferencesScreen  (F13)
 *
 * Preferences — asks the full partner-preference set during onboarding:
 *
 *   ┌─────────────────────────────────┐
 *   │  ████████████████░░░░  [Save]   │  ← 80 % progress nav
 *   │                                 │
 *   │  PREFERENCES                    │
 *   │  Who are you                    │
 *   │  hoping to meet?                │
 *   │  Narrow is fine…                │
 *   │                                 │
 *   │  ┌─ Age range ───────────────┐  │  at least / at most
 *   │  ┌─ Height ──────────────────┐  │  at least / at most (cm + ft)
 *   │  ┌─ Cities ──────────────────┐  │
 *   │  ┌─ Sect ────────────────────┐  │
 *   │  ┌─ Min religiosity ─────────┐  │
 *   │  ┌─ Education ───────────────┐  │
 *   │  ┌─ Marital status ──────────┐  │
 *   ├─────────────────────────────────┤
 *   │  [Continue]                     │
 *   └─────────────────────────────────┘
 *
 * The cards are `PreferenceFields`, the same component PartnerPreferencesScreen
 * renders, so whatever is answered here is exactly what that screen shows later
 * — no second shape to map between.
 *
 * This replaced an age-only version topped with a dark gradient card showing a
 * "live count" of matches. That number came from a hard-coded formula over the
 * two ages (`(max−min)×7.4 …`), not from the server, so it was a decorative
 * invention that also drove routing: a count of 0 sent the user to the fine-tune
 * screen instead of on to photos. Both the card and that branch are gone.
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
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import {
  AGE_CEIL,
  AGE_FLOOR,
  PreferenceFields,
  PreferenceValues,
  preferencesFromApi,
  withPreferenceDefaults, PreferenceFieldsSkeleton } from '../../components/preferences/PreferenceFields';
import { OnboardingExit } from '../../components/ui/OnboardingExit';
import { Colors, GradientColors } from '../../theme/colors';
import { getMyProfile } from '../../api/profile';

/**
 * How far either side of the user's own age the range opens by default.
 *
 * The fixed 24–34 this used to start from is a hard filter on the server, not a
 * hint: `PreferenceFilterService.criteriaWhere` turns the saved ageMin/ageMax
 * into a `dateOfBirth` bound and excludes everyone outside it. So an 18-year-old
 * who tapped through this step was invisible to every account still on the
 * default, and could not see anyone under 24 either — two new accounts of the
 * same age never appeared to one another. Bracketing their own age instead means
 * the default at least includes their own cohort.
 */
const AGE_SPAN_BELOW = 3;
const AGE_SPAN_ABOVE = 6;

/** Whole years between a date of birth and today. */
function ageFromDob(iso: string): number | null {
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// ─── animation helpers ────────────────────────────────────────────────────────
const RISE_DURATION = 550;
const RISE_EASING = Easing.bezier(0.2, 0.7, 0.3, 1);

function useRise(delay: number) {
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
          outputRange: [15, 0],
        }),
      },
    ],
  };
}

// ─── component ────────────────────────────────────────────────────────────────
interface PreferencesScreenProps {
  /** Called with the full preference set the user chose. */
  onContinue?: (values: PreferenceValues) => void;
  onSave?: () => void;
  /**
   * Leave the flow, shown as an ✕ in place of "Save".
   *
   * Set when this screen was entered from Home to finish a profile section: it
   * is then the first step of its own trip, and the user needs a way back to
   * where they came from.
   */
  onClose?: () => void;
  /** Abandon the signup, shown as "Log out". */
  onLogout?: () => void;
  /** Seeds the form — e.g. the city picked at F7, or a previous visit's answers. */
  initialValues?: Partial<PreferenceValues>;
  continueLoading?: boolean;
}

export function PreferencesScreen({
  onContinue,
  onSave,
  onClose,
  onLogout,
  initialValues,
  continueLoading,
}: PreferencesScreenProps) {
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<PreferenceValues>(() =>
    withPreferenceDefaults(initialValues),
  );
  /**
   * The stored preference has not been read yet.
   *
   * The fields are withheld until it has. They used to render immediately on the
   * built-in defaults and then rewrite themselves when the fetch landed — the
   * age range visibly changed under the user a moment after the screen opened,
   * which reads as the app overriding a choice rather than finishing loading.
   */
  const [loading, setLoading] = useState(true);

  const patch = (next: Partial<PreferenceValues>) =>
    setValues(prev => ({ ...prev, ...next }));

  // Pre-populate the saved age range when navigating back. Only age is on the
  // profile today — `PUT /profile/me/preferences` takes nothing else — so the
  // rest keeps whatever `initialValues` carried in.
  useEffect(() => {
    getMyProfile()
      .then(profile => {
        const pref = profile.partnerPreference;
        if (pref?.ageMin != null || pref?.ageMax != null) {
          // Something is stored, so the server is the answer — the whole set,
          // not just the ages.
          setValues(prev => ({ ...prev, ...preferencesFromApi(pref) }));
          return;
        }
        // Nothing saved yet, so this is the first visit: open the range around
        // the user's own age rather than leaving the fixed default, which can
        // exclude their whole cohort. Still only a default — the steppers below
        // are the answer, and this is what they start from.
        const own = profile.dateOfBirth ? ageFromDob(profile.dateOfBirth) : null;
        if (own == null) return;
        setValues(prev => ({
          ...prev,
          ageMin: Math.max(AGE_FLOOR, own - AGE_SPAN_BELOW),
          ageMax: Math.min(AGE_CEIL, own + AGE_SPAN_ABOVE),
        }));
      })
      .catch(() => {
        // Nothing stored, or the read failed: the defaults stand either way.
      })
      .finally(() => setLoading(false));
  }, []);

  // ── entrance animations (.an .d1/.d2) ──────────────────────────────────────
  const heading = useRise(70);
  const fields = useRise(150);

  useEffect(() => {
    const rise = ({ anim, delay }: ReturnType<typeof useRise>) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: RISE_DURATION,
        delay,
        easing: RISE_EASING,
        useNativeDriver: true,
      });
    Animated.parallel([rise(heading), rise(fields)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16) }]}>

        {/* ── Progress nav bar ─────────────────────────────────────────── */}
        <View style={styles.nb}>
          <View style={styles.nbp}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.nbb}
            />
          </View>
          {onClose || onLogout ? (
            <OnboardingExit onClose={onClose} onLogout={onLogout} />
          ) : (
            <Pressable
              onPress={onSave}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <Text style={styles.nbs}>Save</Text>
            </Pressable>
          )}
        </View>

        {/* ── Body — scrolls, the field set is taller than a phone ──────── */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          {/* ── Question header (.q .an) ─────────────────────────────── */}
          <Animated.View style={[styles.q, riseStyle(heading.anim)]}
            needsOffscreenAlphaCompositing>
            <Text style={styles.qk}>Preferences</Text>
            <Text style={styles.qh}>Who are you{'\n'}hoping to meet?</Text>
            <Text style={styles.qs}>
              Narrow is fine. It just means fewer introductions.
            </Text>
          </Animated.View>

          {/* ── The preference cards (.an .d2) ───────────────────────── */}
          <Animated.View style={[styles.fields, riseStyle(fields.anim)]}
            needsOffscreenAlphaCompositing>
            {loading ? (
              // The same stand-in the settings copy of this form uses, so the
              // two screens breathe identically.
              <PreferenceFieldsSkeleton />
            ) : (
              <PreferenceFields values={values} onChange={patch} />
            )}
          </Animated.View>
        </ScrollView>

        {/* ── Footer (.foot) ────────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <GradientButton
            label="Continue"
            // Inert until the stored preference has been read: continuing on the
            // placeholder values would save the defaults over whatever the user
            // had actually chosen.
            variant={loading ? 'disabled' : 'primary'}
            // Shown as busy, not merely dead. A greyed-out button with no
            // explanation reads as a broken screen when the read is slow — the
            // spinner says the same "not yet" that the skeleton above does.
            loading={continueLoading || loading}
            loadingLabel={loading ? 'Loading your preferences…' : undefined}
            onPress={loading ? undefined : () => onContinue?.(values)}
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
    flexDirection: 'column',
  },

  // ── Nav bar (.nb / .nbp / .nbb / .nbs) ──────────────────────────────────
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 14,
  },
  nbp: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(155,123,240,0.18)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  nbb: {
    // 80 % progress for F13
    width: '80%',
    height: '100%',
    borderRadius: 3,
  },
  nbs: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // ── Question header (.q / .qk / .qh / .qs) ───────────────────────────────
  q: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  qk: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.vioSoft,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    marginBottom: 10,
    overflow: 'hidden',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.vioInk,
  },
  qh: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    marginTop: 5,
    color: Colors.ink,
  },
  qs: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 7,
    lineHeight: 20,
  },

  loading: { paddingTop: 72, alignItems: 'center' },

  // ── Field stack ───────────────────────────────────────────────────────────
  fields: {
    marginTop: 16,
    gap: 12,
  },

  // ── Footer (.foot) ────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
    backgroundColor: Colors.page,
  },
});
