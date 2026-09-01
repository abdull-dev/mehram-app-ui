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
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { warmCities, warmCityDataset } from '../../utils/cityData';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import LinearGradient from 'react-native-linear-gradient';
import { getCountryDataList, getEmojiFlag } from 'countries-list';
import { captureCurrentLocation, reverseGeocodeCountry } from '../../utils/location';
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

type LocStatus = 'idle' | 'loading' | 'detected' | 'denied';

/** Long enough for the entrance animation to finish before the parse blocks. */
const WARM_DELAY_MS = 600;

export function CountryScreen({ onContinue, onClose, onLogout, onLocationDetected, continueLoading }: CountryScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery]       = useState('');
  const [selected, setSelected] = useState<CountryEntry | null>(null);
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');

  // Entrance animations — d1/.d2 delays matching the prototype
  const qAnim    = useFadeRise(70);
  const listAnim = useFadeRise(150);

  const rows = useMemo(() => buildRows(query), [query]);

  // Pay the city dataset's one-time parse here, not on selection. Reading this
  // list takes the user seconds; the gap between picking a country and pressing
  // Continue takes a few hundred milliseconds, and the parse used to still be
  // running inside it — which stalled Continue's loader on a first sign-up.
  // The delay clears the entrance animation, which the parse would otherwise
  // stutter. (InteractionManager would be the natural fit but was removed from
  // react-native core in 0.87.)
  useEffect(() => {
    const t = setTimeout(warmCityDataset, WARM_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const handleSelect = (c: CountryEntry) => {
    setSelected(c);
    setQuery('');
    Keyboard.dismiss();
    // Parse this country's cities now, while the user is still on this screen.
    // The next screen needs them on its first render, and paying for it there
    // froze the Continue press until the parse finished.
    warmCities(c.iso2);
  };

  const handleContinue = () => {
    if (!selected) return;
    onContinue?.(selected);
  };

  // ── Use my location ────────────────────────────────────────────────────────
  const handleUseLocation = useCallback(async () => {
    setLocStatus('loading');
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access',
            message: 'Wisal needs your location to detect your country.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLocStatus('denied');
          return;
        }
      }
      const coords = await captureCurrentLocation();
      if (!coords) { setLocStatus('denied'); return; }

      // Share coords with parent so CityScreen can pre-select city
      onLocationDetected?.(coords);

      // Offline centroid lookup — no network needed
      const iso2 = reverseGeocodeCountry(coords);
      if (!iso2) { setLocStatus('denied'); return; }

      const match = ALL_COUNTRIES.find(c => c.iso2 === iso2);
      if (match) {
        handleSelect(match);
        setLocStatus('detected');
      } else {
        setLocStatus('denied');
      }
    } catch {
      setLocStatus('denied');
    }
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

          {/* Sheet (search + list) — d2 */}
          <Animated.View style={[styles.sheetWrap, riseStyle(listAnim)]}
            needsOffscreenAlphaCompositing>
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
                data={rows}
                keyExtractor={item => item.key}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                  <Pressable
                    onPress={locStatus === 'idle' || locStatus === 'denied' ? handleUseLocation : undefined}
                    style={({ pressed }) => [
                      styles.locRow,
                      locStatus === 'detected' && styles.locRowDetected,
                      pressed && locStatus === 'idle' && styles.locRowPressed,
                    ]}>
                    {locStatus === 'loading' ? (
                      <ActivityIndicator size="small" color={Colors.vioD} />
                    ) : (
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                          fill={locStatus === 'detected' ? Colors.mintInk : locStatus === 'denied' ? Colors.ink3 : Colors.vioD}
                        />
                      </Svg>
                    )}
                    <Text style={[
                      styles.locRowText,
                      locStatus === 'detected' && styles.locRowTextDetected,
                      locStatus === 'denied' && styles.locRowTextDenied,
                    ]}>
                      {locStatus === 'loading'  ? 'Detecting your location…' :
                       locStatus === 'detected' ? `Country detected — ${selected?.name}` :
                       locStatus === 'denied'   ? 'Location unavailable. Enable in Settings.' :
                                                  'Use my location'}
                    </Text>
                    {locStatus === 'idle' && (
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 18l6-6-6-6" stroke={Colors.vioD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    )}
                    {locStatus === 'detected' && (
                      <View style={styles.locCheckDot}>
                        <Svg width={10} height={10} viewBox="0 0 24 24" fill="none"
                          stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M5 12.5l5 5 9-10" />
                        </Svg>
                      </View>
                    )}
                  </Pressable>
                }
                ItemSeparatorComponent={({ leadingItem, trailingItem }: { leadingItem: ListRow; trailingItem: ListRow }) =>
                  leadingItem.type === 'header' || trailingItem?.type === 'header'
                    ? null
                    : <View style={styles.sep} />
                }
                renderItem={({ item }) => {
                  if (item.type === 'header') {
                    return (
                      <View style={styles.sph}>
                        <Text style={styles.sphText}>{item.label}</Text>
                      </View>
                    );
                  }
                  const isActive = selected?.iso2 === item.iso2;
                  return (
                    <Pressable
                      onPress={() => handleSelect(item)}
                      style={({ pressed }) => [
                        styles.sit,
                        isActive && styles.sitActive,
                        pressed && !isActive && styles.sitPressed,
                      ]}>
                      <Text style={styles.fl}>{item.emoji}</Text>
                      <Text style={[styles.sitName, isActive && styles.sitNameActive]}>
                        {item.name}
                      </Text>
                      {isActive && (
                        <View style={styles.checkDot}>
                          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                            stroke="#fff" strokeWidth={3}
                            strokeLinecap="round" strokeLinejoin="round">
                            <Path d="M5 12.5l5 5 9-10" />
                          </Svg>
                        </View>
                      )}
                    </Pressable>
                  );
                }}
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
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginLeft: 47,
    marginRight: 0,
  },

  // Section header — .sph
  sph: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 7,
    backgroundColor: '#fff',
  },
  sphText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },

  // List row — .sit
  sit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  sitActive: {
    backgroundColor: Colors.vioSoft,
  },
  sitPressed: {
    backgroundColor: 'rgba(240,235,254,0.5)',
  },
  fl: {
    fontSize: 20,
    width: 26,
    textAlign: 'center',
    flexShrink: 0,
  },
  sitName: {
    flex: 1,
    fontSize: 15,
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
