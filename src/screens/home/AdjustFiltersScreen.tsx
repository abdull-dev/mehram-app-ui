/**
 * AdjustFiltersScreen
 *
 * Lets the user fine-tune partner search filters without touching profile data.
 * Opened from H11 "Adjust". All fields mirror the PartnerPreference schema:
 *   age range · height range · cities (modal) · include overseas ·
 *   sect · madhhab · min religiosity · education · marital status ·
 *   accepts children
 */

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { City } from 'country-state-city';
import { Colors } from '../../theme/colors';

// ─── gradients ────────────────────────────────────────────────────────────────
const ROSE_GRADIENT = ['#F2559A', '#E6396E'] as const;

// ─── city data ────────────────────────────────────────────────────────────────
const POPULAR_PK_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad',
];

const OVERSEAS_CITIES = [
  { name: 'London', country: 'United Kingdom' },
  { name: 'Birmingham', country: 'United Kingdom' },
  { name: 'Manchester', country: 'United Kingdom' },
  { name: 'Dubai', country: 'UAE' },
  { name: 'Abu Dhabi', country: 'UAE' },
  { name: 'Sharjah', country: 'UAE' },
  { name: 'New York', country: 'USA' },
  { name: 'Chicago', country: 'USA' },
  { name: 'Houston', country: 'USA' },
  { name: 'Toronto', country: 'Canada' },
  { name: 'Vancouver', country: 'Canada' },
  { name: 'Sydney', country: 'Australia' },
  { name: 'Melbourne', country: 'Australia' },
  { name: 'Riyadh', country: 'Saudi Arabia' },
  { name: 'Jeddah', country: 'Saudi Arabia' },
];

// ─── filter options ───────────────────────────────────────────────────────────
const SECT_OPTIONS        = ['Any', 'Sunni', 'Shia', 'Ismaili', 'Other'];
const RELIGIOSITY_OPTIONS = ['Any', 'Practicing', 'Moderate', 'Cultural'];
const EDUCATION_OPTIONS  = ['Any', 'High School', "Bachelor's", "Master's", 'PhD'];
const MARITAL_OPTIONS    = ['Any', 'Never married', 'Divorced', 'Widowed'];

// ─── icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={Colors.ink}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke={Colors.ink3}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={Colors.ink}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function AgeStepper({
  label, value, min, max,
  onDecrement, onIncrement,
}: {
  label: string; value: number; min: number; max: number;
  onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <View style={styles.stepperCol}>
      <Text style={styles.stepCaption}>{label}</Text>
      <View style={styles.stepBox}>
        <Pressable
          onPress={onDecrement}
          disabled={value <= min}
          hitSlop={8}
          style={[styles.stepBtn, value <= min && styles.stepBtnDisabled]}>
          <Text style={[styles.stepBtnTxt, value <= min && styles.stepBtnTxtDisabled]}>−</Text>
        </Pressable>
        <Text style={styles.stepVal}>{value}</Text>
        <Pressable
          onPress={onIncrement}
          disabled={value >= max}
          hitSlop={8}
          style={[styles.stepBtn, value >= max && styles.stepBtnDisabled]}>
          <Text style={[styles.stepBtnTxt, value >= max && styles.stepBtnTxtDisabled]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChipMulti({
  options, selected, onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    if (opt === 'Any') {
      onChange(['Any']);
      return;
    }
    const without = selected.filter(s => s !== 'Any');
    if (without.includes(opt)) {
      const next = without.filter(s => s !== opt);
      onChange(next.length === 0 ? ['Any'] : next);
    } else {
      onChange([...without, opt]);
    }
  }
  return (
    <View style={styles.chipWrap}>
      {options.map(opt => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipTxt, active && styles.chipTxtActive]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function RadioList({
  options, selected, onChange,
}: {
  options: string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      {options.map((opt, i) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={[styles.radioRow, i > 0 && styles.radioRowBorder]}>
          <View style={[styles.radioOuter, selected === opt && styles.radioOuterSel]}>
            {selected === opt && <View style={styles.radioInner} />}
          </View>
          <Text style={[styles.radioLbl, selected === opt && styles.radioLblSel]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ToggleRow({
  label, subtitle, value, onChange,
}: {
  label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLabels}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle ? <Text style={styles.toggleSub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.line, true: '#C3B4F5' }}
        thumbColor={value ? '#7C5AE0' : '#fff'}
      />
    </View>
  );
}

// ─── City Picker Modal ────────────────────────────────────────────────────────

interface CityPickerProps {
  visible: boolean;
  selected: string[];
  includeOverseas: boolean;
  onClose: () => void;
  onDone: (cities: string[]) => void;
}

function CityPickerModal({ visible, selected, includeOverseas, onClose, onDone }: CityPickerProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');

  // All PK cities from country-state-city, minus popular ones (shown separately)
  const allPkCities = useMemo(() => {
    const raw = City.getCitiesOfCountry('PK') ?? [];
    return raw
      .map(c => c.name)
      .filter(n => !POPULAR_PK_CITIES.includes(n))
      .sort();
  }, []);

  function toggle(name: string) {
    setDraft(prev =>
      prev.includes(name) ? (prev.length > 1 ? prev.filter(c => c !== name) : prev) : [...prev, name],
    );
  }

  // Build sections: popular PK → all other PK → overseas (if enabled)
  type Section = { title: string; data: string[] };
  const sections = useMemo<Section[]>(() => {
    const q = query.toLowerCase();
    const filterList = (list: string[]) =>
      q ? list.filter(n => n.toLowerCase().includes(q)) : list;
    const filterOverseas = (list: typeof OVERSEAS_CITIES) =>
      q ? list.filter(n => n.name.toLowerCase().includes(q) || n.country.toLowerCase().includes(q)) : list;

    const result: Section[] = [];

    const pop = filterList(POPULAR_PK_CITIES);
    if (pop.length) result.push({ title: 'Popular cities', data: pop });

    const rest = filterList(allPkCities);
    if (rest.length) result.push({ title: 'All Pakistan cities', data: rest });

    if (includeOverseas) {
      const ov = filterOverseas(OVERSEAS_CITIES).map(c => `${c.name} (${c.country})`);
      if (ov.length) result.push({ title: 'Overseas', data: ov });
    }

    return result;
  }, [query, allPkCities, includeOverseas]);

  // Flatten for FlatList
  type FlatItem = { type: 'header'; title: string } | { type: 'city'; name: string };
  const flatData = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = [];
    sections.forEach(s => {
      items.push({ type: 'header', title: s.title });
      s.data.forEach(d => items.push({ type: 'city', name: d }));
    });
    return items;
  }, [sections]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.pickerRoot, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select cities</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <CloseIcon />
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <SearchIcon />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search cities…"
            placeholderTextColor={Colors.ink3}
            style={styles.searchInput}
            autoCapitalize="words"
            clearButtonMode="while-editing"
          />
        </View>

        {/* City list */}
        <FlatList
          data={flatData}
          keyExtractor={(item, i) => `${item.type}-${i}`}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.pickerSection}>{item.title}</Text>;
            }
            const active = draft.includes(item.name);
            return (
              <Pressable
                onPress={() => toggle(item.name)}
                style={({ pressed }) => [styles.cityRow, pressed && styles.cityRowPressed]}>
                <Text style={[styles.cityName, active && styles.cityNameActive]}>{item.name}</Text>
                <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                  {active && <CheckIcon />}
                </View>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />

        {/* Done button */}
        <View style={[styles.pickerFooter, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={() => { onDone(draft); onClose(); }}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
            <LinearGradient
              colors={[...ROSE_GRADIENT]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.pickerDoneBtn}>
              <Text style={styles.pickerDoneTxt}>
                Done · {draft.length} {draft.length === 1 ? 'city' : 'cities'} selected
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export interface FilterValues {
  ageMin: number;
  ageMax: number;
  heightMinCm: number | null;
  heightMaxCm: number | null;
  cities: string[];
  includeOverseas: boolean;
  sects: string[];
  madhhabs: string[];
  minReligiosity: string;
  educationLevels: string[];
  maritalStatuses: string[];
}

interface AdjustFiltersScreenProps {
  /** Pre-populate filters from onboarding values — falls back to built-in defaults */
  initialFilters?: Partial<FilterValues>;
  onApply?: (filters: FilterValues) => void;
  onBack?: () => void;
}

/**
 * A complete FilterValues, exported so callers holding a Partial can fill the
 * gaps from the same source this screen uses. Re-declaring the shape at each
 * call site is how the two drift apart.
 */
export const BASE_DEFAULTS: FilterValues = {
  ageMin: 24,
  ageMax: 34,
  heightMinCm: null,
  heightMaxCm: null,
  cities: ['Lahore'],
  includeOverseas: false,
  sects: ['Any'],
  madhhabs: ['Any'],
  minReligiosity: 'Any',
  educationLevels: ['Any'],
  maritalStatuses: ['Any'],
};

export function AdjustFiltersScreen({ initialFilters, onApply, onBack }: AdjustFiltersScreenProps) {
  const DEFAULTS: FilterValues = { ...BASE_DEFAULTS, ...initialFilters };
  const insets = useSafeAreaInsets();

  const [ageMin, setAgeMin]                 = useState(DEFAULTS.ageMin);
  const [ageMax, setAgeMax]                 = useState(DEFAULTS.ageMax);
  const [heightMinCm, setHeightMinCm]       = useState(DEFAULTS.heightMinCm ?? 150);
  const [heightMaxCm, setHeightMaxCm]       = useState(DEFAULTS.heightMaxCm ?? 185);
  const [heightEnabled, setHeightEnabled]   = useState(
    DEFAULTS.heightMinCm !== null || DEFAULTS.heightMaxCm !== null,
  );
  const [cities, setCities]                 = useState(DEFAULTS.cities);
  const [includeOverseas, setIncludeOverseas] = useState(DEFAULTS.includeOverseas);
  const [sects, setSects]                   = useState(DEFAULTS.sects);
  const [minReligiosity, setMinReligiosity] = useState(DEFAULTS.minReligiosity);
  const [educationLevels, setEducationLevels] = useState(DEFAULTS.educationLevels);
  const [maritalStatuses, setMaritalStatuses] = useState(DEFAULTS.maritalStatuses);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  function resetAll() {
    setAgeMin(BASE_DEFAULTS.ageMin);
    setAgeMax(BASE_DEFAULTS.ageMax);
    setHeightMinCm(150);
    setHeightMaxCm(185);
    setHeightEnabled(false);
    setCities(BASE_DEFAULTS.cities);
    setIncludeOverseas(BASE_DEFAULTS.includeOverseas);
    setSects(BASE_DEFAULTS.sects);
    setMinReligiosity(BASE_DEFAULTS.minReligiosity);
    setEducationLevels(BASE_DEFAULTS.educationLevels);
    setMaritalStatuses(BASE_DEFAULTS.maritalStatuses);
  }

  function handleApply() {
    onApply?.({
      ageMin,
      ageMax,
      heightMinCm: heightEnabled ? heightMinCm : null,
      heightMaxCm: heightEnabled ? heightMaxCm : null,
      cities,
      includeOverseas,
      sects,
      madhhabs: ['Any'],
      minReligiosity,
      educationLevels,
      maritalStatuses,
    });
  }

  const cityLabel = cities.length <= 3
    ? cities.join(', ')
    : `${cities.slice(0, 2).join(', ')} +${cities.length - 2} more`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Your filters</Text>
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

        {/* ── Age range ────────────────────────────────────────────────── */}
        <SectionCard title="Age range">
          <View style={styles.rangeRow}>
            <AgeStepper
              label="MIN"
              value={ageMin}
              min={18}
              max={ageMax - 1}
              onDecrement={() => setAgeMin(v => Math.max(18, v - 1))}
              onIncrement={() => setAgeMin(v => Math.min(ageMax - 1, v + 1))}
            />
            <View style={styles.rangeDash} />
            <AgeStepper
              label="MAX"
              value={ageMax}
              min={ageMin + 1}
              max={60}
              onDecrement={() => setAgeMax(v => Math.max(ageMin + 1, v - 1))}
              onIncrement={() => setAgeMax(v => Math.min(60, v + 1))}
            />
          </View>
        </SectionCard>

        {/* ── Height preference ─────────────────────────────────────────── */}
        <SectionCard title="Height preference">
          <ToggleRow
            label="Set height range"
            value={heightEnabled}
            onChange={setHeightEnabled}
          />
          {heightEnabled && (
            <View style={[styles.rangeRow, { marginTop: 14 }]}>
              <AgeStepper
                label="MIN (cm)"
                value={heightMinCm}
                min={140}
                max={heightMaxCm - 1}
                onDecrement={() => setHeightMinCm(v => Math.max(140, v - 1))}
                onIncrement={() => setHeightMinCm(v => Math.min(heightMaxCm - 1, v + 1))}
              />
              <View style={styles.rangeDash} />
              <AgeStepper
                label="MAX (cm)"
                value={heightMaxCm}
                min={heightMinCm + 1}
                max={220}
                onDecrement={() => setHeightMaxCm(v => Math.max(heightMinCm + 1, v - 1))}
                onIncrement={() => setHeightMaxCm(v => Math.min(220, v + 1))}
              />
            </View>
          )}
        </SectionCard>

        {/* ── Cities ───────────────────────────────────────────────────── */}
        <SectionCard title="Cities">
          <Text style={styles.hint}>Select all that apply</Text>
          <Pressable
            onPress={() => setCityPickerOpen(true)}
            style={({ pressed }) => [styles.cityPickerBtn, pressed && styles.cityPickerBtnPressed]}>
            <Text style={styles.cityPickerTxt} numberOfLines={1}>{cityLabel}</Text>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M9 18l6-6-6-6" stroke={Colors.vio} strokeWidth={2} strokeLinecap="round" />
            </Svg>
          </Pressable>
          <ToggleRow
            label="Include overseas"
            subtitle="London, Dubai, Toronto…"
            value={includeOverseas}
            onChange={setIncludeOverseas}
          />
        </SectionCard>

        {/* ── Sect ─────────────────────────────────────────────────────── */}
        <SectionCard title="Sect">
          <ChipMulti options={SECT_OPTIONS} selected={sects} onChange={setSects} />
        </SectionCard>

        {/* ── Min religiosity ───────────────────────────────────────────── */}
        <SectionCard title="Min religiosity">
          <RadioList
            options={RELIGIOSITY_OPTIONS}
            selected={minReligiosity}
            onChange={setMinReligiosity}
          />
        </SectionCard>

        {/* ── Education ────────────────────────────────────────────────── */}
        <SectionCard title="Education">
          <ChipMulti options={EDUCATION_OPTIONS} selected={educationLevels} onChange={setEducationLevels} />
        </SectionCard>

        {/* ── Marital status ────────────────────────────────────────────── */}
        <SectionCard title="Marital status">
          <ChipMulti options={MARITAL_OPTIONS} selected={maritalStatuses} onChange={setMaritalStatuses} />
        </SectionCard>

      </ScrollView>

      {/* ── Apply button ────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
        <Pressable
          onPress={handleApply}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
          <LinearGradient
            colors={[...ROSE_GRADIENT]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.applyBtn}>
            <Text style={styles.applyBtnTxt}>Apply filters</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* ── City picker modal ────────────────────────────────────────────── */}
      <CityPickerModal
        visible={cityPickerOpen}
        selected={cities}
        includeOverseas={false}
        onClose={() => setCityPickerOpen(false)}
        onDone={next => { setCities(next); setCityPickerOpen(false); }}
      />
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.page },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
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

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16,
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.055, shadowRadius: 14, elevation: 2,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.ink,
    letterSpacing: -0.2, marginBottom: 12,
  },
  hint: { fontSize: 12, color: Colors.ink3, marginTop: -6, marginBottom: 10 },

  // ── Steppers ─────────────────────────────────────────────────────────────
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rangeDash: { width: 16, height: 2, borderRadius: 1, backgroundColor: Colors.line, marginTop: 16 },
  stepperCol: { flex: 1, alignItems: 'center', gap: 6 },
  stepCaption: {
    fontSize: 10, fontWeight: '700', color: Colors.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  stepBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.page, borderRadius: 14,
    paddingHorizontal: 4, paddingVertical: 4, gap: 8,
  },
  stepBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#3C287A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 1,
  },
  stepBtnDisabled: { opacity: 0.35 },
  stepBtnTxt: { fontSize: 18, fontWeight: '300', color: Colors.ink, lineHeight: 22 },
  stepBtnTxtDisabled: { color: Colors.ink3 },
  stepVal: {
    fontSize: 20, fontWeight: '700', color: Colors.ink,
    letterSpacing: -0.5, minWidth: 32, textAlign: 'center',
  },

  clearBtn: { marginTop: 10, alignSelf: 'flex-start' },
  clearBtnTxt: { fontSize: 12.5, color: Colors.vio, fontWeight: '600' },

  // ── City picker button ────────────────────────────────────────────────────
  cityPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.page, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: Colors.line, marginBottom: 10,
  },
  cityPickerBtnPressed: { opacity: 0.7 },
  cityPickerTxt: { flex: 1, fontSize: 13.5, color: Colors.ink, fontWeight: '500' },

  // ── Toggle row ────────────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, gap: 12,
  },
  toggleLabels: { flex: 1 },
  toggleLabel: { fontSize: 13.5, color: Colors.ink, fontWeight: '500' },
  toggleSub: { fontSize: 11.5, color: Colors.ink3, marginTop: 2, lineHeight: 16 },

  // ── Chips ─────────────────────────────────────────────────────────────────
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.line, backgroundColor: Colors.page,
  },
  chipActive: { borderColor: '#7C5AE0', backgroundColor: Colors.vioSoft },
  chipTxt: { fontSize: 13, fontWeight: '500', color: Colors.ink2 },
  chipTxtActive: { color: Colors.vioInk, fontWeight: '700' },

  // ── Radio ─────────────────────────────────────────────────────────────────
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12 },
  radioRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSel: { borderColor: '#7C5AE0' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C5AE0' },
  radioLbl: { fontSize: 13.5, color: Colors.ink2 },
  radioLblSel: { color: Colors.ink, fontWeight: '600' },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: Colors.page,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line,
  },
  applyBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  applyBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // ── City picker modal ─────────────────────────────────────────────────────
  pickerRoot: { flex: 1, backgroundColor: '#fff' },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: Colors.ink },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: Colors.page, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.line,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.ink, padding: 0 },
  pickerSection: {
    fontSize: 11, fontWeight: '700', color: Colors.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  cityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.line,
  },
  cityRowPressed: { backgroundColor: Colors.page },
  cityName: { fontSize: 14, color: Colors.ink2 },
  cityNameActive: { color: Colors.ink, fontWeight: '600' },
  checkBox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: Colors.line,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkBoxActive: { backgroundColor: '#7C5AE0', borderColor: '#7C5AE0' },
  pickerFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.line,
  },
  pickerDoneBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pickerDoneTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
