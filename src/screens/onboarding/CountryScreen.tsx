/**
 * CountryScreen  (F6)
 *
 * Searchable country picker — Step 3 of 5.
 *
 *   ┌──────────────────────────────────────┐
 *   │  ←  ████████░░░░░░░░░░░░░  Save      │  28 % progress
 *   │  Step 3 of 5                         │
 *   │  Which country                       │
 *   │  do you live in?                     │
 *   │  ┌────────────────────────────────┐  │
 *   │  │ 🔍  Search any country…        │  │
 *   │  ├────────────────────────────────┤  │
 *   │  │  📍  Use my location            │  │
 *   │  │  MOST CHOSEN                   │  │
 *   │  │  🇵🇰  Pakistan                  │  │
 *   │  │  🇦🇪  United Arab Emirates      │  │
 *   │  │  …                             │  │
 *   │  │  ALL                           │  │
 *   │  │  🇦🇫  Afghanistan               │  │
 *   │  └────────────────────────────────┘  │
 *   ├──────────────────────────────────────┤
 *   │  [Continue]                          │
 *   └──────────────────────────────────────┘
 *
 * Countries sourced from `countries-list` (252 entries).
 * Pinned group: Pakistan · UAE · Saudi Arabia · UK · US · Canada · Australia.
 * Real-time filtering: the list rebuilds on every keystroke.
 *
 * Rows are fixed-height and memoised, and the list is measured up front
 * (`getItemLayout`), so scrolling never has to guess and a tap only re-renders
 * the two rows whose selection changed.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { getCountryDataList, getEmojiFlag } from 'countries-list';
import { requestLocation, reverseGeocodeCountry } from '../../utils/location';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { OnboardingExit } from '../../components/ui/OnboardingExit';
import { Colors, GradientColors } from '../../theme/colors';

// ─── types ────────────────────────────────────────────────────────────────────

type CountryEntry = {
  iso2: string;
  name: string;
  emoji: string;
  pinned: boolean;
};

type ListRow =
  | { type: 'header'; label: string; key: string }
  | ({ type: 'country'; key: string } & CountryEntry);

/** `getItemLayout` needs both, and both are known before the list mounts. */
type RowLayout = { length: number; offset: number };

// ─── static data ──────────────────────────────────────────────────────────────

const PINNED_CODES = ['PK', 'AE', 'SA', 'GB', 'US', 'CA', 'AU'];

const ALL_COUNTRIES: CountryEntry[] = getCountryDataList()
  .filter(c => c.iso2 && c.name)          // drop partOf entries without a clean code
  .map(c => ({
    iso2: c.iso2,
    name: c.name,
    emoji: getEmojiFlag(c.iso2 as any),
    pinned: PINNED_CODES.includes(c.iso2),
  }))
  .sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned)
      return PINNED_CODES.indexOf(a.iso2) - PINNED_CODES.indexOf(b.iso2);
    return a.name.localeCompare(b.name);
  });

// Row geometry is fixed so the whole list can be measured without laying it out.
const COUNTRY_ROW_HEIGHT = 50;
const HEADER_ROW_HEIGHT = 34;
const SEPARATOR_HEIGHT = StyleSheet.hairlineWidth;

function buildRows(query: string): ListRow[] {
  const q = query.toLowerCase().trim();
  const rows: ListRow[] = [];

  if (!q) {
    // No query → show "Most chosen" pinned group then "All" rest
    const pinned = ALL_COUNTRIES.filter(c => c.pinned);
    const rest   = ALL_COUNTRIES.filter(c => !c.pinned);

    rows.push({ type: 'header', label: 'Most chosen', key: 'h-pinned' });
    pinned.forEach(c => rows.push({ type: 'country', key: c.iso2, ...c }));
    rows.push({ type: 'header', label: 'All', key: 'h-all' });
    rest.forEach(c => rows.push({ type: 'country', key: c.iso2, ...c }));
  } else {
    const filtered = ALL_COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q),
    );
    if (filtered.length === 0) {
      rows.push({ type: 'header', label: `No results for "${query}"`, key: 'h-empty' });
    } else {
      filtered.forEach(c => rows.push({ type: 'country', key: c.iso2, ...c }));
    }
  }

  return rows;
}

/**
 * Rows plus their measurements. Separators only appear between two country
 * rows, so the offsets have to be accumulated rather than multiplied out.
 */
function buildList(query: string): { rows: ListRow[]; layout: RowLayout[] } {
  const rows = buildRows(query);
  const layout: RowLayout[] = new Array(rows.length);
  let offset = 0;

  for (let i = 0; i < rows.length; i++) {
    const isHeader = rows[i].type === 'header';
    const prevIsHeader = i === 0 || rows[i - 1].type === 'header';
    if (i > 0 && !isHeader && !prevIsHeader) offset += SEPARATOR_HEIGHT;
    const length = isHeader ? HEADER_ROW_HEIGHT : COUNTRY_ROW_HEIGHT;
    layout[i] = { length, offset };
    offset += length;
  }

  return { rows, layout };
}

// ─── animation ────────────────────────────────────────────────────────────────

const RISE_DURATION = 550;
const RISE_EASING   = Easing.bezier(0.2, 0.7, 0.3, 1);

function useFadeRise(delay: number) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: RISE_DURATION,
      delay,
      easing: RISE_EASING,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return anim;
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

// ─── sub-components ───────────────────────────────────────────────────────────


function SearchIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none"
      stroke={Colors.vioD} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

function CheckMark({ size = 12 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#fff" strokeWidth={3}
      strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.5l5 5 9-10" />
    </Svg>
  );
}

/**
 * One country row. Memoised on `isActive` alone, so selecting a country
 * re-renders two rows instead of the whole visible list — which is what made
 * repeated taps feel like they were being dropped.
 */
const CountryRow = React.memo(function CountryRowInner({
  item,
  isActive,
  onSelect,
}: {
  item: ListRow & { type: 'country' };
  isActive: boolean;
  onSelect: (c: CountryEntry) => void;
}) {
  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={({ pressed }) => [
        styles.sit,
        isActive && styles.sitActive,
        pressed && !isActive && styles.sitPressed,
      ]}>
      <Text style={styles.fl}>{item.emoji}</Text>
      <Text
        style={[styles.sitName, isActive && styles.sitNameActive]}
        numberOfLines={1}>
        {item.name}
      </Text>
      {isActive && (
        <View style={styles.checkDot}>
          <CheckMark />
        </View>
      )}
    </Pressable>
  );
});

const SectionHeader = React.memo(function SectionHeaderInner({ label }: { label: string }) {
  return (
    <View style={styles.sph}>
      <Text style={styles.sphText} numberOfLines={1}>{label}</Text>
    </View>
  );
});

/** Hoisted out of render so its identity never changes — an inline separator
 *  component remounts every cell on every keystroke. */
function RowSeparator({ leadingItem, trailingItem }: { leadingItem: ListRow; trailingItem?: ListRow }) {
  if (leadingItem.type === 'header' || trailingItem?.type === 'header') return null;
  return <View style={styles.sep} />;
}

// ─── location row ─────────────────────────────────────────────────────────────

/**
 * What the location row can be showing. The failure states are the reasons
 * `requestLocation` reports, plus `nomatch` for the case where a fix came back
 * but its country is not one this picker offers.
 */
type LocStatus =
  | 'idle'
  | 'loading'
  | 'detected'
  | 'permission'
  | 'unavailable'
  | 'timeout'
  | 'nomatch';

const LOC_ERRORS: LocStatus[] = ['permission', 'unavailable', 'timeout', 'nomatch'];

/** Retrying only helps where the next attempt could plausibly go differently. */
const LOC_RETRYABLE: LocStatus[] = ['idle', 'permission', 'unavailable', 'timeout'];

function locLabel(status: LocStatus, countryName?: string): string {
  switch (status) {
    case 'loading':     return 'Detecting your location…';
    case 'detected':    return `Country detected — ${countryName ?? ''}`.trim();
    case 'permission':  return 'Location is off for Wisal. Enable it in Settings, then tap to retry.';
    case 'unavailable': return 'No location fix yet. Turn on Location, then tap to retry.';
    case 'timeout':     return 'That took too long. Tap to try again.';
    case 'nomatch':     return 'Could not match your country — pick it from the list.';
    default:            return 'Use my location';
  }
}

const LocationRow = React.memo(function LocationRowInner({
  status,
  countryName,
  onPress,
}: {
  status: LocStatus;
  countryName?: string;
  onPress: () => void;
}) {
  const isError = LOC_ERRORS.includes(status);
  const canRetry = LOC_RETRYABLE.includes(status);

  return (
    <Pressable
      onPress={canRetry ? onPress : undefined}
      disabled={!canRetry}
      accessibilityRole="button"
      accessibilityLabel={locLabel(status, countryName)}
      style={({ pressed }) => [
        styles.locRow,
        status === 'detected' && styles.locRowDetected,
        pressed && canRetry && styles.locRowPressed,
      ]}>
      {status === 'loading' ? (
        <ActivityIndicator size="small" color={Colors.vioD} />
      ) : (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill={status === 'detected' ? Colors.mintInk : isError ? Colors.ink3 : Colors.vioD}
          />
        </Svg>
      )}
      <Text style={[
        styles.locRowText,
        status === 'detected' && styles.locRowTextDetected,
        isError && styles.locRowTextDenied,
      ]}>
        {locLabel(status, countryName)}
      </Text>
      {status === 'idle' && (
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path d="M9 18l6-6-6-6" stroke={Colors.vioD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      )}
      {status === 'detected' && (
        <View style={styles.locCheckDot}>
          <CheckMark size={10} />
        </View>
      )}
    </Pressable>
  );
});

// ─── main component ───────────────────────────────────────────────────────────

interface CountryScreenProps {
  /** Called when the user taps "Continue" with the selected country */
  onContinue?: (country: { iso2: string; name: string; emoji: string }) => void;
  /** Called when the user taps the back arrow */
  /** Called when the user taps "Save" (top-right skip) */
  /**
   * Leave the flow.
   *
   * Two different exits, because the screen has two entry points. Reached from
   * Home to finish a profile, there is somewhere to return to — `onClose` shows
   * an X. Reached during signup there is not: the only way out is to abandon the
   * account, so `onLogout` shows "Log out" instead. Exactly one is passed.
   */
  onClose?: () => void;
  onLogout?: () => void;
  /** Fired as soon as GPS coords are obtained — lets the parent pre-seed CityScreen */
  onLocationDetected?: (coords: { latitude: number; longitude: number }) => void;
  continueLoading?: boolean;
}

export function CountryScreen({ onContinue, onClose, onLogout, onLocationDetected, continueLoading }: CountryScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState<CountryEntry | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');
  /** Set when a country is detected, so the list can scroll to it. */
  const [revealIso2, setRevealIso2] = useState<string | null>(null);
  const listRef = useRef<FlatList<ListRow>>(null);

  // Entrance animations — d1/.d2 delays matching the prototype
  const qAnim    = useFadeRise(70);
  const listAnim = useFadeRise(150);

  const { rows, layout } = useMemo(() => buildList(query), [query]);
  const selectedIso2 = selected?.iso2 ?? null;

  // Nothing on this screen touches the 8MB city dataset — not on mount, not on
  // selection. It used to be loaded here deliberately, to spare the next
  // screen, and that load is what stopped the list from responding for the
  // first seconds of a fresh sign-up. The city step loads it behind a skeleton
  // instead, where there is something to look at while it happens.

  const handleSelect = useCallback((c: CountryEntry) => {
    setSelected(c);
    setQuery('');
    Keyboard.dismiss();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    onContinue?.(selected);
  };

  // Bring a detected country into view — otherwise the only sign that anything
  // happened is a highlight somewhere down a 250-row list.
  useEffect(() => {
    if (!revealIso2) return;
    const index = rows.findIndex(r => r.type === 'country' && r.iso2 === revealIso2);
    if (index < 0) {
      setRevealIso2(null);
      return;
    }
    // Cleared after the scroll, not before: clearing it here would re-run this
    // effect and its own cleanup would cancel the timer it just scheduled.
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
      setRevealIso2(null);
    }, 250);
    return () => clearTimeout(t);
  }, [revealIso2, rows]);

  // ── Use my location ────────────────────────────────────────────────────────
  const handleUseLocation = useCallback(async () => {
    setLocStatus('loading');

    // Permission, the fix itself and its staged retries all live in
    // `requestLocation`, which reports *why* it failed — the row used to blame
    // Settings for every failure, including the ones a retry would have fixed.
    const result = await requestLocation();
    if (!result.ok) {
      setLocStatus(result.reason);
      return;
    }

    // Share coords with parent so CityScreen can pre-select city
    onLocationDetected?.(result.coords);

    // Offline lookup against a 93KB grid — no network, and no dataset load
    const iso2 = reverseGeocodeCountry(result.coords);
    const match = iso2 ? ALL_COUNTRIES.find(c => c.iso2 === iso2) : undefined;
    if (!match) {
      setLocStatus('nomatch');
      return;
    }

    handleSelect(match);
    setLocStatus('detected');
    setRevealIso2(match.iso2);
  }, [handleSelect, onLocationDetected]);

  // ── List plumbing ──────────────────────────────────────────────────────────
  const getItemLayout = useCallback(
    (_data: ArrayLike<ListRow> | null | undefined, index: number) => ({
      length: layout[index]?.length ?? COUNTRY_ROW_HEIGHT,
      offset: layout[index]?.offset ?? index * COUNTRY_ROW_HEIGHT,
      index,
    }),
    [layout],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListRow }) =>
      item.type === 'header' ? (
        <SectionHeader label={item.label} />
      ) : (
        <CountryRow
          item={item}
          isActive={selectedIso2 === item.iso2}
          onSelect={handleSelect}
        />
      ),
    [selectedIso2, handleSelect],
  );

  const listHeader = useMemo(
    () => (
      <LocationRow
        status={locStatus}
        countryName={selected?.name}
        onPress={handleUseLocation}
      />
    ),
    [locStatus, selected?.name, handleUseLocation],
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <AmbientBackground />

      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}>

        {/* ── Nav bar ──────────────────────────────────────────────────── */}
        <View style={styles.nb}>
          {/* No back control on this step: the bar runs the full width instead.
              Android's hardware back still works — the app's own history handles
              it, so nothing here is the only way out. */}

          {/* Progress bar — 28% */}
          <View style={styles.prg}>
            <LinearGradient
              colors={[...GradientColors.primary]}
              locations={[...GradientColors.primaryLocations]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.prgFill, { width: '28%' }]}
            />
          </View>

          <OnboardingExit onClose={onClose} onLogout={onLogout} />
        </View>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Question header — d1 */}
          <Animated.View style={[styles.q, riseStyle(qAnim)]}
            needsOffscreenAlphaCompositing>
            <Text style={styles.qh}>
              Which country{'\n'}do you live in?
            </Text>
          </Animated.View>

          {/* Sheet (search + list) — d2.
              No `needsOffscreenAlphaCompositing` here: it buys nothing for an
              opaque card and costs an offscreen buffer on every scroll frame
              for as long as the screen is mounted. */}
          <Animated.View style={[styles.sheetWrap, riseStyle(listAnim)]}>
            {/* Sheet container */}
            <View style={styles.sheet}>

              {/* Search box */}
              <View style={styles.sbox}>
                <SearchIcon />
                <TextInput
                  style={styles.sinput}
                  placeholder={selected ? selected.name : 'Search any country…'}
                  placeholderTextColor={selected ? Colors.ink : Colors.ink3}
                  value={query}
                  onChangeText={setQuery}
                  autoCorrect={false}
                  autoCapitalize="words"
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={styles.searchDivider} />

              {/* Country list */}
              <FlatList
                ref={listRef}
                data={rows}
                keyExtractor={keyExtractor}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={listHeader}
                ItemSeparatorComponent={RowSeparator}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                extraData={selectedIso2}
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                updateCellsBatchingPeriod={50}
                windowSize={9}
              />
            </View>
          </Animated.View>
        </View>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={styles.foot}>
          <GradientButton
            label="Continue"
            variant={selected ? 'primary' : 'disabled'}
            onPress={handleContinue}
            loading={continueLoading}
          />
        </View>
      </View>
    </View>
  );
}

function keyExtractor(item: ListRow): string {
  return item.key;
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

  // Nav bar — .nb
  nb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
    paddingBottom: 8,
    flexShrink: 0,
  },
  prg: {
    flex: 1,
    height: 7,
    borderRadius: 5,
    backgroundColor: 'rgba(155,123,240,0.16)',
    overflow: 'hidden',
  },
  prgFill: {
    height: '100%',
    borderRadius: 5,
  },
  skip: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioD,
  },

  // Body fills remaining space
  body: {
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'column',
  },

  // Question block — .q
  q: {
    paddingTop: 18,
    paddingBottom: 2,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  qh: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  // Sheet wrapper takes remaining flex
  sheetWrap: {
    flex: 1,
    marginTop: 14,
    marginBottom: 8,
    minHeight: 0,
  },

  // White card — .sheet
  sheet: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(155,123,240,0.15)',
    overflow: 'hidden',
  },

  // Search box — .sbox
  sbox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 0,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 13,
    gap: 9,
    flexShrink: 0,
  },
  searchDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginTop: 12,
  },
  sinput: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
    paddingVertical: 0,
    backgroundColor: 'transparent',
  },

  // Selected country banner (shows above list when country chosen and no query)
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: Colors.vioSoft,
    flexShrink: 0,
  },
  selectedEmoji: {
    fontSize: 17,
    width: 22,
    textAlign: 'center',
  },
  selectedName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  selectedCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.vio,
    alignItems: 'center',
    justifyContent: 'center',
  },

  listContent: {
    paddingBottom: 16,
  },

  // Inset separator between country rows
  sep: {
    height: SEPARATOR_HEIGHT,
    backgroundColor: Colors.line,
    marginLeft: 47,
    marginRight: 0,
  },

  // Section header — .sph. Fixed height, so the list can be measured up front.
  sph: {
    height: HEADER_ROW_HEIGHT,
    justifyContent: 'flex-start',
    paddingHorizontal: 15,
    paddingTop: 14,
    backgroundColor: '#fff',
  },
  sphText: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },

  // List row — .sit. Fixed height (was 13px padding either side of a 24px
  // line), so scroll position never has to be estimated.
  sit: {
    height: COUNTRY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
  },
  sitActive: {
    backgroundColor: Colors.vioSoft,
  },
  sitPressed: {
    backgroundColor: 'rgba(240,235,254,0.5)',
  },
  fl: {
    fontSize: 20,
    lineHeight: 24,
    width: 26,
    textAlign: 'center',
    flexShrink: 0,
  },
  sitName: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.ink,
  },
  sitNameActive: {
    fontWeight: '700',
    color: Colors.vioInk,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.vio,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Footer — .foot
  foot: {
    paddingTop: 12,
    flexShrink: 0,
  },

  // Use my location row — first item in the list
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 15,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  locRowPressed: {
    backgroundColor: Colors.vioSoft,
  },
  locRowDetected: {
    backgroundColor: Colors.mintSoft,
  },
  locRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vioInk,
  },
  locRowTextDetected: {
    color: Colors.mintInk,
  },
  locRowTextDenied: {
    color: Colors.ink3,
    fontWeight: '400',
    fontSize: 13,
  },
  locCheckDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
