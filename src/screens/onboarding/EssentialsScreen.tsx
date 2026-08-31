/**
 * EssentialsScreen  (F8)
 *
 * Collects gender, date of birth, marital status, and sect.
 * All fields start empty — nothing is pre-filled.
 * Validation runs on "Continue": every field is required.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { Colors, GradientColors } from '../../theme/colors';
import { getMyProfile } from '../../api/profile';
import { cmToFeetInches, feetInchesToCm, isHeightInRange } from '../../utils/height';

// ─── date-picker constants ────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const THIS_YEAR = new Date().getFullYear();
// Only allow 18–100 year olds
const YEARS = Array.from({ length: 83 }, (_, i) => THIS_YEAR - 18 - i);
const DAYS  = Array.from({ length: 31 }, (_, i) => i + 1);
const ITEM_H = 44;
const COL_VISIBLE = 5; // rows visible in the wheel

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function formatDob(day: number, month: number, year: number): string {
  return `${day} ${MONTHS[month]} ${year}`;
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
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [RISE_OFFSET, 0] }) }],
  };
}

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={Colors.vioInk} strokeWidth={2.5}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
function UserIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} fill="none" />
      <Path d="M4 21v-1a7 7 0 0 1 16 0v1" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// ─── GenderButton ─────────────────────────────────────────────────────────────
function GenderButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const icon = selected ? (
    <LinearGradient colors={[...GradientColors.primary]} locations={[...GradientColors.primaryLocations]}
      start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sgbIc}>
      <UserIcon color="#fff" />
    </LinearGradient>
  ) : (
    <View style={[styles.sgbIc, { backgroundColor: Colors.vioSoft }]}>
      <UserIcon color={Colors.vioD} />
    </View>
  );

  if (selected) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.sgbPressable, styles.sgbShadowOn, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
        <LinearGradient colors={['#FEF0F6', '#F2ECFE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.sgbContentBase, styles.sgbContentOn]}>
          {icon}
          <Text style={styles.sgbLabel}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.sgbPressable, styles.sgbShadow, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
      <View style={[styles.sgbContentBase, styles.sgbContentOff]}>
        {icon}
        <Text style={styles.sgbLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  if (selected) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
        <LinearGradient colors={[...GradientColors.primary]} locations={[...GradientColors.primaryLocations]}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.chipOn}>
          <Text style={styles.chipLabelOn}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── ChipsField ───────────────────────────────────────────────────────────────
function ChipsField({ label, options, selected, onSelect, hint, error }: {
  label: string; options: string[]; selected: string;
  onSelect: (v: string) => void; hint?: string; error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.flab}>{label}</Text>
      <View style={styles.chipwrap}>
        {options.map(opt => (
          <Chip key={opt} label={opt} selected={selected === opt} onPress={() => onSelect(opt)} />
        ))}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text>
             : !!hint && <Text style={styles.fhint}>{hint}</Text>}
    </View>
  );
}

// ─── WheelColumn ─────────────────────────────────────────────────────────────
function WheelColumn({ data, selectedIndex, onSelect }: {
  data: (string | number)[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  const flatRef = useRef<FlatList>(null);
  const PADDING = ITEM_H * 2;

  useEffect(() => {
    const timer = setTimeout(() => {
      flatRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_H, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wheelCol}>
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
              style={styles.wheelItem}
              onPress={() => {
                flatRef.current?.scrollToOffset({ offset: index * ITEM_H, animated: true });
                onSelect(index);
              }}>
              <Text style={[styles.wheelText, sel && styles.wheelTextSel]}>
                {item}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── component ────────────────────────────────────────────────────────────────
// Education chips — label shown on screen, value sent to backend
const EDUCATION_OPTIONS = [
  { label: 'High school',   value: 'HIGH_SCHOOL' },
  { label: 'Diploma',       value: 'DIPLOMA' },
  { label: "Bachelor's",    value: 'BACHELORS' },
  { label: "Master's",      value: 'MASTERS' },
  { label: 'Doctorate',     value: 'DOCTORATE' },
  { label: 'Other',         value: 'OTHER' },
];

interface EssentialsScreenProps {
  onBack?: () => void;
  onContinue?: (data: {
    name: string;
    gender: 'man' | 'woman';
    dob: string;
    maritalStatus: string;
    sect: string;
    occupation: string;
    educationLevel: string;
    heightCm: number;
  }) => void;
  continueLoading?: boolean;
}

export function EssentialsScreen({ onBack, onContinue, continueLoading }: EssentialsScreenProps) {
  const insets = useSafeAreaInsets();

  // ── form state — nothing pre-filled ──────────────────────────────────────────
  const [name, setName]                   = useState('');
  const [gender, setGender]               = useState<'man' | 'woman' | null>(null);
  const [dobDay, setDobDay]               = useState(0);   // index into DAYS
  const [dobMonth, setDobMonth]           = useState(0);   // index into MONTHS
  const [dobYear, setDobYear]             = useState(0);   // index into YEARS
  const [dobSet, setDobSet]               = useState(false); // true once user confirms
  const [dobPickerOpen, setDobPickerOpen] = useState(false);

  /**
   * Sheet transition, run here rather than by the Modal.
   *
   * `animationType="slide"` moves the *whole* modal, dimmed backdrop included,
   * so the overlay appeared to slide up from the bottom with the sheet instead
   * of settling over the screen. Driving it manually lets the backdrop fade
   * while only the sheet travels, which is how a bottom sheet is expected to
   * behave.
   */
  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: dobPickerOpen ? 1 : 0,
      duration: dobPickerOpen ? 260 : 200,
      easing: dobPickerOpen ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [dobPickerOpen, sheetAnim]);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [sect, setSect]                   = useState('');
  const [occupation, setOccupation]       = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  // Collected as feet + inches; converted to heightCm at the API boundary.
  const [heightFt, setHeightFt]           = useState('');
  const [heightIn, setHeightIn]           = useState('');
  const [errors, setErrors]               = useState<{
    name?: string; gender?: string; dob?: string; marital?: string; sect?: string;
    occupation?: string; education?: string; height?: string;
  }>({});
  const nameRef = useRef<TextInput>(null);
  // computed DOB string for display + submission
  const dobLabel = dobSet
    ? formatDob(DAYS[dobDay], dobMonth, YEARS[dobYear])
    : null;

  // ── validation ───────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: typeof errors = {};
    if (!name.trim())        e.name       = 'Please enter your full name.';
    if (!gender)             e.gender     = 'Please select your gender.';
    if (!dobSet)             e.dob        = 'Please enter your date of birth.';
    if (!maritalStatus)      e.marital    = 'Please select your marital status.';
    if (!sect)               e.sect       = 'Please select your sect.';
    if (!occupation.trim())  e.occupation = 'Please enter your occupation.';
    if (!educationLevel)     e.education  = 'Please select your education level.';
    // Bounds mirror the server's heightCm rule (120-250cm), which the old
    // 100cm floor undershot — anything under 120 was accepted here and then
    // rejected by the API.
    const ft = parseInt(heightFt.trim(), 10);
    const inch = heightIn.trim() === '' ? 0 : parseInt(heightIn.trim(), 10);
    if (!heightFt.trim() || isNaN(ft) || isNaN(inch) || inch > 11) {
      e.height = 'Please enter your height in feet and inches.';
    } else if (!isHeightInRange(feetInchesToCm(ft, inch))) {
      e.height = "Please enter a height between 4ft and 8ft 2in.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    onContinue?.({
      name: name.trim(),
      gender: gender!,
      dob: dobLabel!,
      maritalStatus,
      sect,
      occupation: occupation.trim(),
      educationLevel,
      heightCm: feetInchesToCm(
        parseInt(heightFt.trim(), 10),
        heightIn.trim() === '' ? 0 : parseInt(heightIn.trim(), 10),
      ),
    });
  }

  // ── pre-populate from API on mount ────────────────────────────────────────────
  useEffect(() => {
    getMyProfile().then(profile => {
      if (profile.fullName) setName(profile.fullName);
      if (profile.gender === 'MALE') setGender('man');
      else if (profile.gender === 'FEMALE') setGender('woman');
      if (profile.dateOfBirth) {
        const [yearStr, monthStr, dayStr] = profile.dateOfBirth.split('T')[0].split('-');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10) - 1; // 0-indexed
        const day = parseInt(dayStr, 10);
        const yearIdx = YEARS.indexOf(year);
        if (yearIdx !== -1) {
          setDobYear(yearIdx);
          setDobMonth(month);
          setDobDay(day - 1); // DAYS[i] = i+1
          setDobSet(true);
        }
      }
      const MARITAL_REVERSE: Record<string, string> = {
        NEVER_MARRIED: 'Never married',
        DIVORCED: 'Divorced',
        WIDOWED: 'Widowed',
      };
      if (profile.maritalStatus && MARITAL_REVERSE[profile.maritalStatus]) {
        setMaritalStatus(MARITAL_REVERSE[profile.maritalStatus]);
      }
      const SECT_REVERSE: Record<string, string> = {
        SUNNI: 'Sunni', SHIA: 'Shia', ISMAILI: 'Ismaili',
        AHMADI: 'Other', OTHER: 'Other', PREFER_NOT_SAY: 'Other',
      };
      const s = profile.religiousProfile?.sect;
      if (s && SECT_REVERSE[s]) setSect(SECT_REVERSE[s]);
      if (profile.occupation) setOccupation(profile.occupation);
      if (profile.educationLevel) setEducationLevel(profile.educationLevel);
      if (profile.heightCm) {
        const { feet, inches } = cmToFeetInches(profile.heightCm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── entrance animations ───────────────────────────────────────────────────────
  const hdr = useFadeRise(0);
  const d0  = useFadeRise(70);
  const d1  = useFadeRise(150);
  const d2  = useFadeRise(230);
  const d3  = useFadeRise(310);
  const d4  = useFadeRise(390);
  const d5  = useFadeRise(460);
  const d6  = useFadeRise(530);
  const d7  = useFadeRise(600);

  useEffect(() => {
    const makeRise = ({ anim, delay }: ReturnType<typeof useFadeRise>) =>
      Animated.timing(anim, { toValue: 1, duration: RISE_DURATION, delay, easing: RISE_EASING, useNativeDriver: true });
    Animated.parallel([makeRise(hdr), makeRise(d0), makeRise(d1), makeRise(d2), makeRise(d3), makeRise(d4), makeRise(d5), makeRise(d6), makeRise(d7)]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── DOB picker: valid days for selected month/year ────────────────────────────
  const maxDays = daysInMonth(dobMonth, YEARS[dobYear]);
  const validDays = DAYS.slice(0, maxDays);
  const safeDobDay = Math.min(dobDay, maxDays - 1);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }]}>

        {/* ── Nav bar ─────────────────────────────────────────────────────── */}
        <View style={styles.nb}>
          {/* Omitted when there is nothing behind this screen: entering the
              flow straight from Home makes this its first step. */}
          {onBack ? (
            <Pressable onPress={onBack} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
              <BackIcon />
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <View style={styles.prgTrack}>
            <LinearGradient colors={[...GradientColors.primary]} locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.prgFill} />
          </View>
        </View>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <Animated.View style={riseStyle(hdr.anim)}>
            <View style={styles.q}>
              <View style={styles.qkWrap}><Text style={styles.qk}>Step 4 of 5</Text></View>
              <Text style={styles.qh}>A little{'\n'}about you</Text>
            </View>
          </Animated.View>

          {/* NAME — d0 */}
          <Animated.View style={riseStyle(d0.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>Full name</Text>
              <View style={[styles.inp, errors.name ? styles.inpError : null]}>
                <TextInput
                  ref={nameRef}
                  style={styles.inpText}
                  value={name}
                  onChangeText={v => { setName(v); if (errors.name) setErrors(e => ({ ...e, name: undefined })); }}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.ink3}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {errors.name
                ? <Text style={styles.errorText}>{errors.name}</Text>
                : <Text style={styles.fhint}>Shown to families reviewing your profile.</Text>}
            </View>
          </Animated.View>

          {/* GENDER — d1 */}
          <Animated.View style={riseStyle(d1.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>You are</Text>
              <View style={styles.seg}>
                <GenderButton label="Man"   selected={gender === 'man'}   onPress={() => { setGender('man');   setErrors(e => ({ ...e, gender: undefined })); }} />
                <GenderButton label="Woman" selected={gender === 'woman'} onPress={() => { setGender('woman'); setErrors(e => ({ ...e, gender: undefined })); }} />
              </View>
              {errors.gender
                ? <Text style={styles.errorText}>{errors.gender}</Text>
                : <Text style={styles.fhint}>Cannot be changed after verification.</Text>}
            </View>
          </Animated.View>

          {/* DATE OF BIRTH — d2 */}
          <Animated.View style={riseStyle(d2.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>Date of birth</Text>
              <Pressable
                style={({ pressed }) => [styles.inp, { opacity: pressed ? 0.9 : 1 }]}
                onPress={() => setDobPickerOpen(true)}>
                <Text style={[styles.inpText, !dobLabel && styles.placeholder]}>
                  {dobLabel ?? 'Select date of birth'}
                </Text>
                <Text style={styles.chevron}>▾</Text>
              </Pressable>
              {errors.dob
                ? <Text style={styles.errorText}>{errors.dob}</Text>
                : <Text style={styles.fhint}>You must be 18 or over.</Text>}
            </View>
          </Animated.View>

          {/* MARITAL STATUS — d3 */}
          <Animated.View style={riseStyle(d3.anim)}>
            <ChipsField
              label="Marital status"
              options={['Never married', 'Divorced', 'Widowed']}
              selected={maritalStatus}
              onSelect={v => { setMaritalStatus(v); setErrors(e => ({ ...e, marital: undefined })); }}
              hint="Families ask this first. Being upfront saves everyone time."
              error={errors.marital}
            />
          </Animated.View>

          {/* SECT — d4 */}
          <Animated.View style={riseStyle(d4.anim)}>
            <ChipsField
              label="Sect"
              options={['Sunni', 'Shia', 'Ismaili', 'Other']}
              selected={sect}
              onSelect={v => { setSect(v); setErrors(e => ({ ...e, sect: undefined })); }}
              error={errors.sect}
            />
          </Animated.View>

          {/* OCCUPATION — d5 */}
          <Animated.View style={riseStyle(d5.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>Occupation</Text>
              <View style={[styles.inp, errors.occupation ? styles.inpError : null]}>
                <TextInput
                  style={styles.inpText}
                  value={occupation}
                  onChangeText={v => { setOccupation(v); if (errors.occupation) setErrors(e => ({ ...e, occupation: undefined })); }}
                  placeholder="e.g. Doctor, Engineer, Teacher"
                  placeholderTextColor={Colors.ink3}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              {errors.occupation && <Text style={styles.errorText}>{errors.occupation}</Text>}
            </View>
          </Animated.View>

          {/* EDUCATION LEVEL — d6 */}
          <Animated.View style={riseStyle(d6.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>Education</Text>
              <View style={styles.chipwrap}>
                {EDUCATION_OPTIONS.map(opt => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={educationLevel === opt.value}
                    onPress={() => { setEducationLevel(opt.value); setErrors(e => ({ ...e, education: undefined })); }}
                  />
                ))}
              </View>
              {errors.education && <Text style={styles.errorText}>{errors.education}</Text>}
            </View>
          </Animated.View>

          {/* HEIGHT — d7 */}
          <Animated.View style={riseStyle(d7.anim)}>
            <View style={styles.field}>
              <Text style={styles.flab}>Height</Text>
              <View style={styles.heightRow}>
                <View style={[styles.inp, styles.heightCell, errors.height ? styles.inpError : null]}>
                  <TextInput
                    style={styles.inpText}
                    value={heightFt}
                    onChangeText={v => { setHeightFt(v.replace(/[^0-9]/g, '').slice(0, 1)); if (errors.height) setErrors(e => ({ ...e, height: undefined })); }}
                    placeholder="5"
                    placeholderTextColor={Colors.ink3}
                    keyboardType="numeric"
                    returnKeyType="done"
                    maxLength={1}
                  />
                  <Text style={styles.unit}>ft</Text>
                </View>
                <View style={[styles.inp, styles.heightCell, errors.height ? styles.inpError : null]}>
                  <TextInput
                    style={styles.inpText}
                    value={heightIn}
                    onChangeText={v => { setHeightIn(v.replace(/[^0-9]/g, '').slice(0, 2)); if (errors.height) setErrors(e => ({ ...e, height: undefined })); }}
                    placeholder="7"
                    placeholderTextColor={Colors.ink3}
                    keyboardType="numeric"
                    returnKeyType="done"
                    maxLength={2}
                  />
                  <Text style={styles.unit}>in</Text>
                </View>
              </View>
              {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <View style={styles.foot}>
          <GradientButton
            label="Continue"
            loading={continueLoading}
            onPress={handleContinue}
          />
        </View>
      </View>

      {/* ── Date picker modal ───────────────────────────────────────────────── */}
      <Modal visible={dobPickerOpen} animationType="none" transparent onRequestClose={() => setDobPickerOpen(false)}>
        <Animated.View style={[styles.backdropFill, { opacity: sheetAnim }]}>
          <Pressable style={styles.backdrop} onPress={() => setDobPickerOpen(false)}>
            <Animated.View
              style={{
                transform: [
                  {
                    translateY: sheetAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [SHEET_TRAVEL, 0],
                    }),
                  },
                ],
              }}>
              <Pressable style={styles.pickerSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerTitle}>Date of birth</Text>

            {/* Selection highlight bar */}
            <View style={styles.selectionBar} pointerEvents="none" />

            {/* Three wheel columns */}
            <View style={styles.wheelsRow}>
              <WheelColumn
                data={validDays}
                selectedIndex={safeDobDay}
                onSelect={i => setDobDay(i)}
              />
              <WheelColumn
                data={MONTHS}
                selectedIndex={dobMonth}
                onSelect={i => setDobMonth(i)}
              />
              <WheelColumn
                data={YEARS}
                selectedIndex={dobYear}
                onSelect={i => setDobYear(i)}
              />
            </View>

            <GradientButton
              label="Done"
              onPress={() => {
                setDobSet(true);
                setErrors(e => ({ ...e, dob: undefined }));
                setDobPickerOpen(false);
              }}
              style={styles.pickerDoneBtn}
            />
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}

/** How far the sheet travels in — comfortably taller than its content. */
const SHEET_TRAVEL = 420;

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page, overflow: 'hidden' },
  screen: { flex: 1, paddingHorizontal: 16, flexDirection: 'column' },

  nb: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 4 },
  // Holds the back button's place in the row when there is nothing behind this
  // screen. Dimensions only: reusing `backBtn` left its chip and shadow behind
  // as an empty white square where the button used to be.
  backSpacer: { width: 38, height: 38, flexShrink: 0 },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  prgTrack: { flex: 1, height: 7, borderRadius: 5, backgroundColor: 'rgba(155,123,240,0.16)', overflow: 'hidden' },
  prgFill:  { width: '80%', height: '100%' },

  q: { paddingTop: 18, paddingHorizontal: 2, paddingBottom: 2 },
  qkWrap: {
    alignSelf: 'flex-start', backgroundColor: Colors.vioSoft,
    borderRadius: 9, paddingHorizontal: 11, paddingVertical: 5, marginBottom: 10,
  },
  qk: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: Colors.vioInk },
  qh: { fontSize: 24, fontWeight: '800', letterSpacing: -0.7, lineHeight: 29, color: Colors.ink },

  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 12 },

  field: { marginTop: 14 },
  flab:  { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', color: Colors.ink3, marginBottom: 8 },
  optTag: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3, color: Colors.ink3, textTransform: 'none' },
  fhint: { fontSize: 11.5, color: Colors.ink3, marginTop: 7, lineHeight: 17 },
  errorText: { fontSize: 11.5, color: '#D9304F', marginTop: 7, lineHeight: 17 },

  inp: {
    height: 54, borderRadius: 18, backgroundColor: '#fff',
    borderWidth: 1.6, borderColor: 'rgba(155,123,240,0.2)',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10,
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  inpError: { borderColor: '#D9304F' },
  inpText:    { flex: 1, fontSize: 15, color: Colors.ink },
  heightRow:  { flexDirection: 'row', gap: 10 },
  heightCell: { flex: 1 },
  unit:       { fontSize: 13, fontWeight: '700', color: Colors.ink3 },
  placeholder:{ color: Colors.ink3 },
  chevron:    { fontSize: 14, color: Colors.ink3 },

  seg: { flexDirection: 'row', gap: 10 },
  sgbPressable: { flex: 1 },
  sgbShadow: { borderRadius: 20, shadowColor: '#3C287A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 7, elevation: 3 },
  sgbShadowOn: { borderRadius: 20, shadowColor: '#A06EDC', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 6 },
  sgbContentBase: { borderRadius: 20, borderWidth: 2, borderColor: 'transparent', paddingVertical: 15, paddingHorizontal: 8, alignItems: 'center' },
  sgbContentOff: { backgroundColor: '#fff' },
  sgbContentOn:  { borderColor: Colors.vio },
  sgbIc:  { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  sgbLabel: { fontSize: 14, fontWeight: '700', color: Colors.ink },

  chipwrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1.6, borderColor: 'rgba(155,123,240,0.2)',
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4.5, elevation: 1,
  },
  chipLabel:   { fontSize: 13.5, fontWeight: '700', color: Colors.ink2 },
  chipOn:      { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 15, shadowColor: '#B464C8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 5 },
  chipLabelOn: { fontSize: 13.5, fontWeight: '700', color: '#fff' },

  foot: { paddingTop: 12 },

  // ── Date picker modal ──────────────────────────────────────────────────────
  // The tint lives on the outer view so it can fade on its own; the inner
  // Pressable only handles tap-to-dismiss and the bottom alignment.
  backdropFill: { flex: 1, backgroundColor: 'rgba(27,22,48,0.45)' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: Colors.page, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(155,123,240,0.3)',
    alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.3, color: Colors.ink, marginBottom: 16, textAlign: 'center' },

  wheelsRow: { flexDirection: 'row', alignItems: 'center', position: 'relative' },

  // Highlight band in the middle of the wheel (selected row)
  selectionBar: {
    position: 'absolute',
    top: '50%',
    left: 0, right: 0,
    height: ITEM_H,
    marginTop: -(ITEM_H / 2),
    backgroundColor: Colors.vioSoft,
    borderRadius: 12,
    zIndex: -1,
  },

  wheelCol: {
    flex: 1,
    height: ITEM_H * COL_VISIBLE,
    overflow: 'hidden',
  },
  wheelItem: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  wheelText:    { fontSize: 14, color: Colors.ink2 },
  wheelTextSel: { fontSize: 16, fontWeight: '700', color: Colors.ink },

  pickerDoneBtn: { marginTop: 20 },
});
