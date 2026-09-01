/**
 * PartnerPreferencesScreen
 *
 * Edit partner preferences stored on the user's profile.
 * Changes here persist to the profile via API and auto-update
 * the filter defaults in App.tsx — NOT a session-only filter.
 *
 * The form itself is `PreferenceFields`, shared with onboarding's F13. This
 * screen used to redeclare every card as an "exact copy" of AdjustFiltersScreen,
 * which meant onboarding could not ask the same questions without a third copy.
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { getMyProfile, updatePreferences } from '../../api/profile';
import {
  PREFERENCE_DEFAULTS,
  PreferenceFields,
  PreferenceValues,
  preferencesFromApi,
  preferencesToApi,
  withPreferenceDefaults, PreferenceFieldsSkeleton } from '../../components/preferences/PreferenceFields';

export type { PreferenceValues } from '../../components/preferences/PreferenceFields';

// ─── gradient (matches AdjustFiltersScreen) ───────────────────────────────────
const ROSE_GRADIENT = ['#F2559A', '#E6396E'] as const;

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6"
        stroke={Colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── screen ───────────────────────────────────────────────────────────────────
interface PartnerPreferencesScreenProps {
  onBack?: () => void;
  onSave?: (values: PreferenceValues) => void;
}

export function PartnerPreferencesScreen({
  onBack,
  onSave,
}: PartnerPreferencesScreenProps) {
  const insets = useSafeAreaInsets();

  const [values, setValues] = useState<PreferenceValues>(PREFERENCE_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /**
   * The stored preference could not be read, so what is on screen is the
   * built-in defaults rather than this user's saved answers.
   *
   * Worth saying out loud: the two look identical, and a user who cannot tell
   * them apart will "correct" a value that was never loaded.
   */
  const [loadFailed, setLoadFailed] = useState(false);

  /**
   * Loaded from the server, not handed in by the caller.
   *
   * This screen used to open on whatever the last in-session edit had left in
   * App state, so a relaunch showed the built-in defaults while the server held
   * something else — and the age range is a hard filter on the feed, so the two
   * disagreeing is the difference between seeing profiles and not.
   */
  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then(profile => {
        if (cancelled) return;
        setValues(withPreferenceDefaults(preferencesFromApi(profile.partnerPreference)));
      })
      .catch(() => {
        // The defaults stand, and a save will write them — but say so, because
        // silently showing defaults is indistinguishable from showing what was
        // stored.
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const patch = (next: Partial<PreferenceValues>) =>
    setValues(prev => ({ ...prev, ...next }));

  function resetAll() {
    setValues(PREFERENCE_DEFAULTS);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      // The whole set, not just the age range. Cities and "include overseas"
      // are the exception — `PartnerPreference` has no city column, so they stay
      // client-side until it does.
      await updatePreferences(preferencesToApi(values));
    } catch (err: any) {
      // Not "non-blocking" — this is the only part of this screen the server
      // ever sees, and the age range is a hard filter on who reaches the feed.
      // Swallowing the failure closed the screen showing the new range while
      // the server kept the old one, so the user had every reason to believe a
      // change had been saved that had not.
      setSaveError(
        err?.message ?? 'Could not save your preferences. Please try again.',
      );
      setSaving(false);
      return;
    }
    setSaving(false);
    onSave?.(values);
    onBack?.();
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* Header — identical layout to AdjustFiltersScreen */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Partner preferences</Text>
        <Pressable onPress={resetAll} hitSlop={10}>
          <Text style={styles.resetTxt}>Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 90, 100) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {loading ? (
          // The form's own shape, not a spinner: the sections are the same
          // every time, so there is no reason to hide them behind a circle.
          <PreferenceFieldsSkeleton />
        ) : (
          <PreferenceFields values={values} onChange={patch} />
        )}
      </ScrollView>

      {/* Save button — same style as "Apply filters" */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
        {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}
        {loadFailed && !saveError && (
          <Text style={styles.loadWarning}>
            Could not load your saved preferences — these are the defaults.
            Saving will overwrite what is stored.
          </Text>
        )}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({ opacity: pressed || saving ? 0.8 : 1 })}>
          <LinearGradient
            colors={[...ROSE_GRADIENT]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.saveBtn}>
            <Text style={styles.saveBtnTxt}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: Colors.page,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 16, fontWeight: '700', color: Colors.ink, letterSpacing: -0.3,
  },
  resetTxt: { fontSize: 13.5, fontWeight: '600', color: Colors.vio },

  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },

  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.page,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line,
  },
  loading: { paddingTop: 80, alignItems: 'center' },
  saveError: {
    fontSize: 13,
    lineHeight: 18,
    color: '#C2264B',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  loadWarning: {
    fontSize: 12.5,
    lineHeight: 17,
    color: '#B5820D',
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  saveBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
