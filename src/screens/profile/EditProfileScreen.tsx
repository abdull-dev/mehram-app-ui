/**
 * EditProfileScreen — M6
 *
 * Edit biodata — step 1 of 8 (Basic identity).
 * Loads real profile data on mount, saves on Continue.
 * Fields: full name, gender (locked), date of birth, height, marital status.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { getMyProfile, updateBasicIdentity } from '../../api/profile';

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
  white:     '#FFFFFF',
} as const;

// ─── height helpers ───────────────────────────────────────────────────────────

const HEIGHT_OPTIONS: string[] = [];
for (let totalIn = 56; totalIn <= 84; totalIn++) {
  const ft = Math.floor(totalIn / 12);
  const inches = totalIn % 12;
  HEIGHT_OPTIONS.push(inches > 0 ? `${ft} ft ${inches} in` : `${ft} ft`);
}

function cmToDisplay(cm: number): string {
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return inches > 0 ? `${ft} ft ${inches} in` : `${ft} ft`;
}

function displayToCm(display: string): number {
  const m = display.match(/^(\d+) ft(?: (\d+) in)?/);
  if (!m) return 160;
  return Math.round((parseInt(m[1], 10) * 12 + parseInt(m[2] ?? '0', 10)) * 2.54);
}

// ─── date of birth helpers ────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, i) => THIS_YEAR - 18 - i);
const DAYS  = Array.from({ length: 31 }, (_, i) => i + 1);
const ITEM_H = 44;

/** Parse ISO date string safely — handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:…Z". */
function parseIso(iso: string): { day: number; month: number; year: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
}

function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const p = parseIso(iso);
  if (!p) return '';
  return `${p.day} ${MONTHS[p.month]} ${p.year}`;
}

function isoToParts(iso: string | null): { dayIdx: number; monthIdx: number; yearIdx: number } {
  if (!iso) return { dayIdx: 0, monthIdx: 0, yearIdx: 0 };
  const p = parseIso(iso);
  if (!p) return { dayIdx: 0, monthIdx: 0, yearIdx: 0 };
  const yearIdx = YEARS.indexOf(p.year);
  return {
    dayIdx:   Math.max(0, p.day - 1),
    monthIdx: p.month,
    yearIdx:  yearIdx >= 0 ? yearIdx : 0,
  };
}

function computeAge(dayIdx: number, monthIdx: number, yearIdx: number): number | null {
  const year = YEARS[yearIdx];
  if (!year) return null;
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < monthIdx || (now.getMonth() === monthIdx && now.getDate() < DAYS[dayIdx])) {
    age--;
  }
  return age > 0 ? age : null;
}

function partsToIso(dayIdx: number, monthIdx: number, yearIdx: number): string {
  const d = String(DAYS[dayIdx]).padStart(2, '0');
  const m = String(monthIdx + 1).padStart(2, '0');
  const y = YEARS[yearIdx];
  return `${y}-${m}-${d}`;
}

function partsToDisplay(dayIdx: number, monthIdx: number, yearIdx: number): string {
  return `${DAYS[dayIdx]} ${MONTHS[monthIdx]} ${YEARS[yearIdx]}`;
}

// ─── marital status helpers ───────────────────────────────────────────────────

const MARITAL_OPTIONS = ['Single', 'Divorced', 'Widowed'];
const MARITAL_TO_API: Record<string, 'NEVER_MARRIED' | 'DIVORCED' | 'WIDOWED'> = {
  Single:   'NEVER_MARRIED',
  Divorced: 'DIVORCED',
  Widowed:  'WIDOWED',
};
const API_TO_MARITAL: Record<string, string> = {
  NEVER_MARRIED: 'Single',
  DIVORCED:      'Divorced',
  WIDOWED:       'Widowed',
};

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

// ─── wheel column (for DOB picker) ───────────────────────────────────────────

function WheelColumn({ data, selectedIndex, onSelect }: {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const flatRef = useRef<FlatList>(null);
  const PADDING = ITEM_H * 2;

  useEffect(() => {
    const t = setTimeout(() => {
      flatRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={wStyles.col}>
      <FlatList
        ref={flatRef}
        data={data}
        keyExtractor={(_, i) => i.toString()}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: i * ITEM_H, index: i })}
        contentContainerStyle={{ paddingVertical: PADDING }}
        onMomentumScrollEnd={e => {
          const i = Math.max(0, Math.min(
            Math.round(e.nativeEvent.contentOffset.y / ITEM_H),
            data.length - 1,
          ));
          onSelect(i);
        }}
        renderItem={({ item, index }) => {
          const sel = index === selectedIndex;
          return (
            <Pressable
              style={wStyles.item}
              onPress={() => {
                flatRef.current?.scrollToOffset({ offset: index * ITEM_H, animated: true });
                onSelect(index);
              }}>
              <Text style={[wStyles.text, sel && wStyles.textSel]}>{item}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const wStyles = StyleSheet.create({
  col: { flex: 1, height: ITEM_H * 5, overflow: 'hidden' },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, color: C.ink3 },
  textSel: { fontSize: 16, fontWeight: '700', color: C.ink },
});

// ─── props ────────────────────────────────────────────────────────────────────
interface EditProfileScreenProps {
  onBack?: () => void;
  onCancel?: () => void;
  onContinue?: () => void;
}

// ─── screen ───────────────────────────────────────────────────────────────────
export function EditProfileScreen({ onBack, onCancel, onContinue }: EditProfileScreenProps) {
  const insets = useSafeAreaInsets();

  // ── state ─────────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const [fullName, setFullName]       = useState('');
  const [gender, setGender]           = useState('');

  // DOB stored as picker indices
  const [dobDayIdx, setDobDayIdx]     = useState(0);
  const [dobMonthIdx, setDobMonthIdx] = useState(0);
  const [dobYearIdx, setDobYearIdx]   = useState(0);
  const [dobDisplay, setDobDisplay]   = useState('');
  const [dobOpen, setDobOpen]         = useState(false);
  // Temp indices while the picker modal is open
  const [tempDayIdx, setTempDayIdx]   = useState(0);
  const [tempMonthIdx, setTempMonthIdx] = useState(0);
  const [tempYearIdx, setTempYearIdx] = useState(0);

  const [heightDisplay, setHeightDisplay] = useState('');
  const [heightOpen, setHeightOpen]   = useState(false);

  const [maritalDisplay, setMaritalDisplay] = useState('');
  const [maritalOpen, setMaritalOpen]   = useState(false);

  // ── load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    getMyProfile()
      .then(profile => {
        setFullName(profile.fullName ?? '');
        setGender(
          profile.gender === 'MALE' ? 'Male'
          : profile.gender === 'FEMALE' ? 'Female'
          : '',
        );

        const parts = isoToParts(profile.dateOfBirth);
        setDobDayIdx(parts.dayIdx);
        setDobMonthIdx(parts.monthIdx);
        setDobYearIdx(parts.yearIdx);
        setDobDisplay(profile.dateOfBirth ? isoToDisplay(profile.dateOfBirth) : '');

        setHeightDisplay(profile.heightCm ? cmToDisplay(profile.heightCm) : '');
        setMaritalDisplay(profile.maritalStatus ? (API_TO_MARITAL[profile.maritalStatus] ?? profile.maritalStatus) : '');
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  // ── save ──────────────────────────────────────────────────────────────────
  async function handleContinue() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateBasicIdentity({
        fullName: fullName.trim() || undefined,
        dateOfBirth: dobDisplay ? partsToIso(dobDayIdx, dobMonthIdx, dobYearIdx) : undefined,
        maritalStatus: maritalDisplay ? MARITAL_TO_API[maritalDisplay] : undefined,
        heightCm: heightDisplay ? displayToCm(heightDisplay) : undefined,
      });
      onContinue?.();
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── DOB modal handlers ────────────────────────────────────────────────────
  function openDobPicker() {
    setTempDayIdx(dobDayIdx);
    setTempMonthIdx(dobMonthIdx);
    setTempYearIdx(dobYearIdx);
    setDobOpen(true);
  }
  function confirmDob() {
    setDobDayIdx(tempDayIdx);
    setDobMonthIdx(tempMonthIdx);
    setDobYearIdx(tempYearIdx);
    setDobDisplay(partsToDisplay(tempDayIdx, tempMonthIdx, tempYearIdx));
    setDobOpen(false);
  }

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }, styles.center]}>
        <ActivityIndicator color={C.rose} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
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

        {/* ── Form card ────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.formPad}>

            {/* Full name */}
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={C.ink3}
            />

            <View style={styles.fieldGap} />

            {/* Gender (locked) */}
            <Text style={styles.fieldLabel}>GENDER</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedText}>{gender || '—'}</Text>
              <LockIcon />
            </View>
            <Text style={styles.helperText}>Locked once your profile is verified.</Text>

            <View style={styles.fieldGap} />

            {/* Date of birth */}
            <Text style={styles.fieldLabel}>DATE OF BIRTH</Text>
            <Pressable
              onPress={openDobPicker}
              style={({ pressed }) => [styles.input, styles.dropdownField, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.dropdownText, !dobDisplay && { color: C.ink3 }]}>
                {dobDisplay || 'Select date of birth'}
              </Text>
              <ChevDown />
            </Pressable>

            <View style={styles.fieldGap} />

            {/* Age (computed, read-only) */}
            <Text style={styles.fieldLabel}>AGE</Text>
            <View style={styles.lockedField}>
              <Text style={styles.lockedText}>
                {dobDisplay
                  ? (() => { const a = computeAge(dobDayIdx, dobMonthIdx, dobYearIdx); return a != null ? `${a} years old` : '—'; })()
                  : '—'}
              </Text>
              <LockIcon />
            </View>
            <Text style={styles.helperText}>Calculated automatically from date of birth.</Text>

            <View style={styles.fieldGap} />

            {/* Height */}
            <Text style={styles.fieldLabel}>HEIGHT</Text>
            <Pressable
              onPress={() => setHeightOpen(true)}
              style={({ pressed }) => [styles.input, styles.dropdownField, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.dropdownText, !heightDisplay && { color: C.ink3 }]}>
                {heightDisplay || 'Select height'}
              </Text>
              <ChevDown />
            </Pressable>

            <View style={styles.fieldGap} />

            {/* Marital status */}
            <Text style={styles.fieldLabel}>MARITAL STATUS</Text>
            <Pressable
              onPress={() => setMaritalOpen(true)}
              style={({ pressed }) => [styles.input, styles.dropdownField, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.dropdownText, !maritalDisplay && { color: C.ink3 }]}>
                {maritalDisplay || 'Select marital status'}
              </Text>
              <ChevDown />
            </Pressable>

          </View>
        </View>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* ── Action card ──────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.acts}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.btnG, pressed && { opacity: 0.8 }]}>
              <Text style={[styles.btnText, { color: C.ink2 }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleContinue}
              disabled={saving}
              style={({ pressed }) => [styles.btn, styles.btnF, (pressed || saving) && { opacity: 0.8 }]}>
              {saving
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={[styles.btnText, { color: C.white }]}>Continue</Text>}
            </Pressable>
          </View>
        </View>

      </ScrollView>

      {/* ── DOB picker modal ─────────────────────────────────────────────── */}
      <Modal visible={dobOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setDobOpen(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setDobOpen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Date of Birth</Text>
            <Pressable onPress={confirmDob}>
              <Text style={styles.modalDone}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.wheelRow}>
            <WheelColumn data={DAYS}   selectedIndex={tempDayIdx}   onSelect={setTempDayIdx} />
            <WheelColumn data={MONTHS} selectedIndex={tempMonthIdx} onSelect={setTempMonthIdx} />
            <WheelColumn data={YEARS}  selectedIndex={tempYearIdx}  onSelect={setTempYearIdx} />
          </View>
          <View style={styles.wheelHighlight} pointerEvents="none" />
        </View>
      </Modal>

      {/* ── Height picker modal ──────────────────────────────────────────── */}
      <Modal visible={heightOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setHeightOpen(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setHeightOpen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Height</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={HEIGHT_OPTIONS}
            keyExtractor={item => item}
            style={{ maxHeight: 280 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setHeightDisplay(item); setHeightOpen(false); }}
                style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: C.indSoft }]}>
                <Text style={[styles.listItemText, item === heightDisplay && styles.listItemSelected]}>
                  {item}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* ── Marital status modal ─────────────────────────────────────────── */}
      <Modal visible={maritalOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setMaritalOpen(false)} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setMaritalOpen(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Marital Status</Text>
            <View style={{ width: 60 }} />
          </View>
          {MARITAL_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              onPress={() => { setMaritalDisplay(opt); setMaritalOpen(false); }}
              style={({ pressed }) => [styles.listItem, pressed && { backgroundColor: C.indSoft }]}>
              <Text style={[styles.listItemText, opt === maritalDisplay && styles.listItemSelected]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </Modal>

    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.page },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(40,30,80,0.07)', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 8, elevation: 2, flexShrink: 0,
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: C.ink },
  topBarSub: { fontSize: 11.5, color: C.ink3, marginTop: 1 },

  scroll: { paddingHorizontal: 15, paddingTop: 4 },

  card: {
    backgroundColor: C.white, borderRadius: 24,
    shadowColor: 'rgba(40,30,80,1)', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 3,
    marginBottom: 13, overflow: 'hidden',
  },
  formPad: { padding: 18, paddingBottom: 10 },
  fieldGap: { height: 14 },

  fieldLabel: {
    fontSize: 11.5, fontWeight: '700', letterSpacing: 0.9,
    color: C.ink3, marginBottom: 6, textTransform: 'uppercase',
  },
  input: {
    height: 46, borderWidth: 1.5, borderColor: C.line, borderRadius: 12,
    backgroundColor: C.fieldBg, paddingHorizontal: 14, fontSize: 14, color: C.ink,
  },
  lockedField: {
    height: 46, backgroundColor: C.lockedBg, borderRadius: 12,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  lockedText: { fontSize: 14, color: C.ink2 },
  dropdownField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownText: { fontSize: 14, color: C.ink },
  helperText: { fontSize: 11.5, color: C.ink3, marginTop: 5 },
  errorText: { fontSize: 12.5, color: C.rose, textAlign: 'center', marginBottom: 8 },

  acts: { flexDirection: 'row', gap: 9, padding: 15, paddingBottom: 16 },
  btn: { flex: 1, minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  btnG: { backgroundColor: '#F2F1F7' },
  btnF: { backgroundColor: C.rose },
  btnText: { fontSize: 13.5, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: {
    backgroundColor: C.white, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 0,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  modalCancel: { fontSize: 14, color: C.ink3, width: 60 },
  modalDone: { fontSize: 14, fontWeight: '700', color: C.rose, textAlign: 'right', width: 60 },

  // DOB wheel
  wheelRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  wheelHighlight: {
    position: 'absolute',
    top: 72 + ITEM_H * 2, left: 12, right: 12, height: ITEM_H,
    borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.line,
  },

  // List picker items
  listItem: { paddingVertical: 14, paddingHorizontal: 20 },
  listItemText: { fontSize: 14, color: C.ink },
  listItemSelected: { color: C.rose, fontWeight: '700' },
});
