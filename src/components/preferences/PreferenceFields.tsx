/**
 * PreferenceFields
 *
 * The partner-preference form, in one place.
 *
 * These cards used to exist twice — once in AdjustFiltersScreen and again,
 * comment-annotated as an "exact copy", in PartnerPreferencesScreen. Onboarding
 * needs the same set a third time (F13 asks the question first, and whatever the
 * user answers there is what Partner preferences should already show), so the
 * fields live here and every screen renders the same ones.
 *
 * The component is uncontrolled-parent style: it owns no state, takes the whole
 * `PreferenceValues` and reports patches. That keeps "what onboarding collected"
 * and "what the settings screen edits" the same object rather than two shapes
 * that have to be mapped into each other.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useCityNames } from '../../hooks/useCities';
import { Colors } from '../../theme/colors';
import { formatHeight } from '../../utils/height';
import type {
  EducationEnum,
  MaritalStatus,
  PartnerPreference,
  ReligiosityEnum,
  SectEnum,
} from '../../api/profile';
import { Bone } from '../ui/Skeleton';

// ─── gradient (matches AdjustFiltersScreen) ───────────────────────────────────
const ROSE_GRADIENT = ['#F2559A', '#E6396E'] as const;

// ─── city data ────────────────────────────────────────────────────────────────
const POPULAR_PK_CITIES = [
  'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi',
  'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad',
];

const OVERSEAS_CITIES = [
  { name: 'London',      country: 'United Kingdom' },
  { name: 'Birmingham',  country: 'United Kingdom' },
  { name: 'Manchester',  country: 'United Kingdom' },
  { name: 'Dubai',       country: 'UAE' },
  { name: 'Abu Dhabi',   country: 'UAE' },
  { name: 'Sharjah',     country: 'UAE' },
  { name: 'New York',    country: 'USA' },
  { name: 'Chicago',     country: 'USA' },
  { name: 'Houston',     country: 'USA' },
  { name: 'Toronto',     country: 'Canada' },
  { name: 'Vancouver',   country: 'Canada' },
  { name: 'Sydney',      country: 'Australia' },
  { name: 'Melbourne',   country: 'Australia' },
  { name: 'Riyadh',      country: 'Saudi Arabia' },
  { name: 'Jeddah',      country: 'Saudi Arabia' },
];

// ─── options ──────────────────────────────────────────────────────────────────
const SECT_OPTIONS        = ['Any', 'Sunni', 'Shia', 'Ismaili', 'Other'];
const RELIGIOSITY_OPTIONS = ['Any', 'Practicing', 'Moderate', 'Cultural'];
const EDUCATION_OPTIONS   = ['Any', 'High School', "Bachelor's", "Master's", 'PhD'];
const MARITAL_OPTIONS     = ['Any', 'Never married', 'Divorced', 'Widowed'];

// ─── bounds ───────────────────────────────────────────────────────────────────
export const AGE_FLOOR  = 18;
export const AGE_CEIL   = 60;
/** Narrower than the profile's own 120–250cm: nobody filters for a toddler. */
const HEIGHT_FLOOR_CM = 140;
const HEIGHT_CEIL_CM  = 220;

// ─── types ────────────────────────────────────────────────────────────────────
export interface PreferenceValues {
  ageMin: number;
  ageMax: number;
  /** `null` on both means "no height preference" — the toggle is off. */
  heightMinCm: number | null;
  heightMaxCm: number | null;
  cities: string[];
  includeOverseas: boolean;
  sects: string[];
  minReligiosity: string;
  educationLevels: string[];
  maritalStatuses: string[];
}

export const PREFERENCE_DEFAULTS: PreferenceValues = {
  ageMin: 24,
  ageMax: 34,
  heightMinCm: null,
  heightMaxCm: null,
  /*
   * Empty, not Lahore.
   *
   * This was `['Lahore']` back when cities went nowhere — a decorative
   * preselection on a control the server never saw. `preferredCities` is a hard
   * filter now, so that same default would quietly restrict a woman in Karachi
   * who never opened the picker to introductions from a city she has no
   * connection to. Empty means any city, which is the only safe thing to filter
   * by on somebody's behalf.
   */
  cities: [],
  includeOverseas: false,
  sects: ['Any'],
  minReligiosity: 'Any',
  educationLevels: ['Any'],
  maritalStatuses: ['Any'],
};

/** Height defaults used the moment the toggle is switched on. */
const HEIGHT_ON_DEFAULT = { min: 150, max: 185 };

/** Fill the gaps in a partial set — used for both screens' initial state. */
export function withPreferenceDefaults(
  partial?: Partial<PreferenceValues> | null,
): PreferenceValues {
  return { ...PREFERENCE_DEFAULTS, ...(partial ?? {}) };
}

// ─── server round-trip ────────────────────────────────────────────────────────
//
// The UI works in the labels on its own chips; `PartnerPreference` works in the
// server's enums. These two functions are the only place the two vocabularies
// meet, so a new chip is one entry rather than a hunt through the screens.
//
// "Any" is the UI's way of saying "no constraint", which on the server is an
// empty array (or null for the single-valued `minReligiosity`) — not a member of
// the enum. Sending `['Any']` would be rejected outright.

const SECT_TO_API: Record<string, SectEnum> = {
  Sunni: 'SUNNI',
  Shia: 'SHIA',
  Ismaili: 'ISMAILI',
  Other: 'OTHER',
};
const SECT_FROM_API: Partial<Record<SectEnum, string>> = {
  SUNNI: 'Sunni',
  SHIA: 'Shia',
  ISMAILI: 'Ismaili',
  OTHER: 'Other',
  // The enum carries two more the picker does not offer. Both read back as the
  // closest chip it has rather than vanishing from a set the user did choose.
  AHMADI: 'Other',
  PREFER_NOT_SAY: 'Other',
};

const RELIGIOSITY_TO_API: Record<string, ReligiosityEnum> = {
  Practicing: 'PRACTICING',
  Moderate: 'MODERATE',
  Cultural: 'CULTURAL',
};
const RELIGIOSITY_FROM_API: Record<ReligiosityEnum, string> = {
  VERY_PRACTICING: 'Practicing',
  PRACTICING: 'Practicing',
  MODERATE: 'Moderate',
  CULTURAL: 'Cultural',
};

const EDUCATION_TO_API: Record<string, EducationEnum> = {
  'High School': 'HIGH_SCHOOL',
  "Bachelor's": 'BACHELORS',
  "Master's": 'MASTERS',
  PhD: 'DOCTORATE',
};
const EDUCATION_FROM_API: Record<EducationEnum, string> = {
  HIGH_SCHOOL: 'High School',
  DIPLOMA: 'High School',
  BACHELORS: "Bachelor's",
  MASTERS: "Master's",
  DOCTORATE: 'PhD',
  OTHER: 'High School',
};

const MARITAL_TO_API: Record<string, MaritalStatus> = {
  'Never married': 'NEVER_MARRIED',
  Divorced: 'DIVORCED',
  Widowed: 'WIDOWED',
};
const MARITAL_FROM_API: Record<MaritalStatus, string> = {
  NEVER_MARRIED: 'Never married',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
};

/** Chips → enums, dropping "Any" and anything unmapped. */
function toEnums<T>(labels: string[], map: Record<string, T>): T[] {
  const out: T[] = [];
  labels.forEach(label => {
    const value = map[label];
    if (value !== undefined && !out.includes(value)) out.push(value);
  });
  return out;
}

/** Enums → chips, collapsing an empty result back to "Any". */
function toLabels<T extends string>(
  values: T[] | undefined,
  map: Partial<Record<T, string>>,
): string[] {
  const out: string[] = [];
  (values ?? []).forEach(value => {
    const label = map[value];
    if (label && !out.includes(label)) out.push(label);
  });
  return out.length > 0 ? out : ['Any'];
}

/**
 * A picker row as the city name the server stores.
 *
 * The overseas rows read "London (United Kingdom)" so one list can hold two
 * Birminghams without either looking like a mistake. That parenthesis is for
 * the eye only — `Profile.city` holds "London" — so it comes off at the
 * boundary, or every overseas city would be saved as a filter matching nobody.
 */
export function cityNameForApi(row: string): string {
  return row.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

/**
 * The form's values as the preferences endpoint wants them.
 *
 * Nulls are sent deliberately, not omitted: an omitted key keeps whatever the
 * server already has, so clearing a height range back to "no preference" has to
 * say so explicitly. The same goes for an empty `preferredCities`: it is how
 * "any city" is said, and omitting it would leave yesterday's cities filtering.
 *
 * `includeOverseas` is still absent. It is the one field with nowhere to go —
 * it would have to become `countryCodes`, and the app has no country shortlist
 * to turn a switch into.
 */
export function preferencesToApi(values: PreferenceValues): PartnerPreference {
  return {
    ageMin: values.ageMin,
    ageMax: values.ageMax,
    heightMinCm: values.heightMinCm,
    heightMaxCm: values.heightMaxCm,
    preferredCities: values.cities.map(cityNameForApi).filter(Boolean),
    sects: toEnums(values.sects, SECT_TO_API),
    minReligiosity: RELIGIOSITY_TO_API[values.minReligiosity] ?? null,
    educationLevels: toEnums(values.educationLevels, EDUCATION_TO_API),
    maritalStatuses: toEnums(values.maritalStatuses, MARITAL_TO_API),
  };
}

/** The stored preference as the form's values. Unset fields keep the defaults. */
export function preferencesFromApi(
  pref?: PartnerPreference | null,
): Partial<PreferenceValues> {
  if (!pref) return {};
  return {
    ...(pref.ageMin != null ? { ageMin: pref.ageMin } : {}),
    ...(pref.ageMax != null ? { ageMax: pref.ageMax } : {}),
    // Both halves or neither: a lone bound is not a range the steppers can show.
    ...(pref.heightMinCm != null && pref.heightMaxCm != null
      ? { heightMinCm: pref.heightMinCm, heightMaxCm: pref.heightMaxCm }
      : { heightMinCm: null, heightMaxCm: null }),
    // Whatever is stored, including nothing: an empty list is "any city" and
    // has to win over the defaults, or clearing the picker would not survive
    // reopening the screen.
    cities: pref.preferredCities ?? [],
    sects: toLabels(pref.sects, SECT_FROM_API),
    minReligiosity: pref.minReligiosity
      ? RELIGIOSITY_FROM_API[pref.minReligiosity] ?? 'Any'
      : 'Any',
    educationLevels: toLabels(pref.educationLevels, EDUCATION_FROM_API),
    maritalStatuses: toLabels(pref.maritalStatuses, MARITAL_FROM_API),
  };
}

// ─── icons ────────────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
        stroke={Colors.ink3} strokeWidth={2} strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={Colors.ink} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── building blocks ──────────────────────────────────────────────────────────
function SectionCard({
  title, children,
}: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RangeStepper({
  label, value, min, max, caption, onDecrement, onIncrement,
}: {
  label: string; value: number; min: number; max: number;
  /** Optional secondary readout under the value, e.g. the height in feet. */
  caption?: string | null;
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
      {!!caption && <Text style={styles.stepSubVal}>{caption}</Text>}
    </View>
  );
}

function ChipMulti({
  options, selected, onChange,
}: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    if (opt === 'Any') { onChange(['Any']); return; }
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
}: { options: string[]; selected: string; onChange: (v: string) => void }) {
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
}: { label: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
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

// ─── City picker modal ────────────────────────────────────────────────────────
/** Stand-in for the tail of the city list while the dataset loads. */
function CityRowsSkeleton() {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading cities">
      <Text style={styles.pickerSection}>All Pakistan cities</Text>
      {[132, 96, 148, 110, 124, 88].map((w, i) => (
        <View key={i} style={styles.cityRow}>
          <Bone w={w} h={14} radius={7} />
        </View>
      ))}
    </View>
  );
}

interface CityPickerProps {
  visible: boolean;
  selected: string[];
  includeOverseas: boolean;
  onClose: () => void;
  onDone: (cities: string[]) => void;
}

function CityPickerModal({
  visible, selected, includeOverseas, onClose, onDone,
}: CityPickerProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<string[]>(selected);
  const [query, setQuery] = useState('');

  // The modal stays mounted between openings, so `useState(selected)` alone kept
  // whatever the draft was on first mount and reopening showed stale ticks.
  useEffect(() => {
    if (visible) { setDraft(selected); setQuery(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Only while the picker is open, and never during render: the city dataset is
  // 8MB and arrives in one blocking chunk. This modal stays mounted while
  // closed, so loading it eagerly froze whichever screen rendered the form —
  // long enough for the preferences step to swallow a tap on Continue.
  const { names, loading: citiesLoading } = useCityNames('PK', visible);
  const allPkCities = useMemo(
    () => names.filter(n => !POPULAR_PK_CITIES.includes(n)),
    [names],
  );

  function toggle(name: string) {
    setDraft(prev =>
      prev.includes(name) ? (prev.length > 1 ? prev.filter(c => c !== name) : prev) : [...prev, name],
    );
  }

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
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select cities</Text>
          <Pressable onPress={onClose} hitSlop={10}><CloseIcon /></Pressable>
        </View>
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
          ListFooterComponent={
            // Popular cities are a static list and show at once; the full list
            // follows, so the wait belongs at the bottom of it.
            citiesLoading ? <CityRowsSkeleton /> : undefined
          }
        />
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

/** Human-readable summary of the chosen cities, for the picker button. */
function cityLabelFor(cities: string[]): string {
  if (cities.length === 0) return 'Any city';
  return cities.length <= 3
    ? cities.join(', ')
    : `${cities.slice(0, 2).join(', ')} +${cities.length - 2} more`;
}

// ─── the whole form ───────────────────────────────────────────────────────────
interface PreferenceFieldsProps {
  values: PreferenceValues;
  /** Reports only what changed; the parent merges it into its own state. */
  onChange: (patch: Partial<PreferenceValues>) => void;
}

export function PreferenceFields({ values, onChange }: PreferenceFieldsProps) {
  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  // "No height preference" is the absence of a range, not a separate flag, so
  // the toggle reads off the values and there is no third state to get wrong.
  const heightEnabled = values.heightMinCm != null && values.heightMaxCm != null;
  const heightMin = values.heightMinCm ?? HEIGHT_ON_DEFAULT.min;
  const heightMax = values.heightMaxCm ?? HEIGHT_ON_DEFAULT.max;

  return (
    <>
      {/* Age range */}
      <SectionCard title="Age range">
        <Text style={styles.hint}>
          How old should they be? {values.ageMin} to {values.ageMax} years.
        </Text>
        <View style={styles.rangeRow}>
          <RangeStepper
            label="At least"
            value={values.ageMin}
            min={AGE_FLOOR}
            max={values.ageMax - 1}
            onDecrement={() => onChange({ ageMin: Math.max(AGE_FLOOR, values.ageMin - 1) })}
            onIncrement={() => onChange({ ageMin: Math.min(values.ageMax - 1, values.ageMin + 1) })}
          />
          <View style={styles.rangeDash} />
          <RangeStepper
            label="At most"
            value={values.ageMax}
            min={values.ageMin + 1}
            max={AGE_CEIL}
            onDecrement={() => onChange({ ageMax: Math.max(values.ageMin + 1, values.ageMax - 1) })}
            onIncrement={() => onChange({ ageMax: Math.min(AGE_CEIL, values.ageMax + 1) })}
          />
        </View>
      </SectionCard>

      {/* Height */}
      <SectionCard title="Height">
        <Text style={styles.hint}>
          {heightEnabled
            ? `Between ${formatHeight(heightMin)} and ${formatHeight(heightMax)}.`
            : 'Leave this off and height will not narrow your introductions.'}
        </Text>
        <ToggleRow
          label="Set a height range"
          value={heightEnabled}
          onChange={on =>
            onChange(
              on
                ? { heightMinCm: HEIGHT_ON_DEFAULT.min, heightMaxCm: HEIGHT_ON_DEFAULT.max }
                : { heightMinCm: null, heightMaxCm: null },
            )
          }
        />
        {heightEnabled && (
          <View style={[styles.rangeRow, styles.rangeRowSpaced]}>
            <RangeStepper
              label="At least (cm)"
              value={heightMin}
              min={HEIGHT_FLOOR_CM}
              max={heightMax - 1}
              caption={formatHeight(heightMin)}
              onDecrement={() => onChange({ heightMinCm: Math.max(HEIGHT_FLOOR_CM, heightMin - 1) })}
              onIncrement={() => onChange({ heightMinCm: Math.min(heightMax - 1, heightMin + 1) })}
            />
            <View style={styles.rangeDash} />
            <RangeStepper
              label="At most (cm)"
              value={heightMax}
              min={heightMin + 1}
              max={HEIGHT_CEIL_CM}
              caption={formatHeight(heightMax)}
              onDecrement={() => onChange({ heightMaxCm: Math.max(heightMin + 1, heightMax - 1) })}
              onIncrement={() => onChange({ heightMaxCm: Math.min(HEIGHT_CEIL_CM, heightMax + 1) })}
            />
          </View>
        )}
      </SectionCard>

      {/* Cities */}
      <SectionCard title="Cities">
        <Text style={styles.hint}>Select all that apply</Text>
        <Pressable
          onPress={() => setCityPickerOpen(true)}
          style={({ pressed }) => [styles.cityPickerBtn, pressed && styles.cityPickerBtnPressed]}>
          <Text style={styles.cityPickerTxt} numberOfLines={1}>{cityLabelFor(values.cities)}</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path d="M9 18l6-6-6-6" stroke={Colors.vio} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <ToggleRow
          label="Include overseas"
          subtitle="London, Dubai, Toronto…"
          value={values.includeOverseas}
          onChange={v => onChange({ includeOverseas: v })}
        />
      </SectionCard>

      {/* Sect */}
      <SectionCard title="Sect">
        <ChipMulti
          options={SECT_OPTIONS}
          selected={values.sects}
          onChange={v => onChange({ sects: v })}
        />
      </SectionCard>

      {/* Min religiosity */}
      <SectionCard title="Min religiosity">
        <RadioList
          options={RELIGIOSITY_OPTIONS}
          selected={values.minReligiosity}
          onChange={v => onChange({ minReligiosity: v })}
        />
      </SectionCard>

      {/* Education */}
      <SectionCard title="Education">
        <ChipMulti
          options={EDUCATION_OPTIONS}
          selected={values.educationLevels}
          onChange={v => onChange({ educationLevels: v })}
        />
      </SectionCard>

      {/* Marital status */}
      <SectionCard title="Marital status">
        <ChipMulti
          options={MARITAL_OPTIONS}
          selected={values.maritalStatuses}
          onChange={v => onChange({ maritalStatuses: v })}
        />
      </SectionCard>

      <CityPickerModal
        visible={cityPickerOpen}
        selected={values.cities}
        includeOverseas={values.includeOverseas}
        onClose={() => setCityPickerOpen(false)}
        onDone={next => { onChange({ cities: next }); setCityPickerOpen(false); }}
      />
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
  hint: { fontSize: 12, color: Colors.ink3, marginTop: -6, marginBottom: 10, lineHeight: 17 },

  rangeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rangeRowSpaced: { marginTop: 14 },
  rangeDash: { width: 16, height: 2, borderRadius: 1, backgroundColor: Colors.line, marginTop: 34 },
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
  stepSubVal: { fontSize: 11.5, fontWeight: '600', color: Colors.ink3 },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, gap: 12,
  },
  toggleLabels: { flex: 1 },
  toggleLabel: { fontSize: 13.5, color: Colors.ink, fontWeight: '500' },
  toggleSub: { fontSize: 11.5, color: Colors.ink3, marginTop: 2, lineHeight: 16 },

  cityPickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.page, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1.5, borderColor: Colors.line, marginBottom: 10,
  },
  cityPickerBtnPressed: { opacity: 0.7 },
  cityPickerTxt: { flex: 1, fontSize: 13.5, color: Colors.ink, fontWeight: '500' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.line, backgroundColor: Colors.page,
  },
  chipActive: { borderColor: '#7C5AE0', backgroundColor: Colors.vioSoft },
  chipTxt: { fontSize: 13, fontWeight: '500', color: Colors.ink2 },
  chipTxtActive: { color: Colors.vioInk, fontWeight: '700' },

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

/**
 * Stands in for `PreferenceFields` while saved preferences load.
 *
 * Mirrors the real form: a titled card per section, with a row of chips or a
 * slider track inside. Exported because two screens render the form and a
 * second hand-built stand-in is how two loading states drift apart.
 */
export function PreferenceFieldsSkeleton() {
  // Section title width, then the shape of that section's control.
  const SECTIONS: Array<{ w: number; kind: 'track' | 'chips' }> = [
    { w: 84,  kind: 'track' },   // Age range
    { w: 62,  kind: 'track' },   // Height
    { w: 54,  kind: 'chips' },   // Cities
    { w: 44,  kind: 'chips' },   // Sect
    { w: 108, kind: 'chips' },   // Min religiosity
    { w: 82,  kind: 'chips' },   // Education
    { w: 106, kind: 'chips' },   // Marital status
  ];
  return (
    <>
      {SECTIONS.map((sec, i) => (
        <View key={i} style={styles.card}>
          <Bone w={sec.w} h={15} radius={6} />
          {sec.kind === 'track' ? (
            <Bone w={'100%'} h={34} radius={10} style={{ marginTop: 14 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[86, 64, 102, 74, 92].map((w, j) => (
                <Bone key={j} w={w} h={34} radius={17} />
              ))}
            </View>
          )}
        </View>
      ))}
    </>
  );
}
