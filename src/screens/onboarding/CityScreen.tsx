/**
 * CityScreen  (F7)
 *
 * Searchable city picker, filtered by the country chosen in F6.
 * Uses `country-state-city` for the city dataset.
 * Shows the user's exact GPS location on a map with coordinates.
 *
 *   ┌─────────────────────────────────┐
 *   │ [←]  [====34%====]  Save       │  NavBar
 *   │                                 │
 *   │  Step 3 of 5                    │
 *   │  Which city?                    │
 *   │  Shown as a city only…          │
 *   │                                 │
 *   │ ┌─────────────────────────────┐ │  Location card
 *   │ │ 📍  Use my location        →│ │  (idle)
 *   │ └─────────────────────────────┘ │
 *   │  — or —                         │
 *   │  CITY IN UNITED ARAB EMIRATES   │  field label
 *   │ ┌─────────────────────────────┐ │
 *   │ │ 🔍  Search cities in UAE…   │ │  .sbox
 *   │ │─────────────────────────────│ │
 *   │ │  MOST CHOSEN                │ │  .sph
 *   │ │  Dubai                      │ │  .sit
 *   │ │  Abu Dhabi                  │ │
 *   │ └─────────────────────────────┘ │
 *   │                                 │
 *   │  [      Continue      ]         │
 *   └─────────────────────────────────┘
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { findNearestCityInCountry } from '../../utils/cityData';
import { useCityNames } from '../../hooks/useCities';
import { Bone } from '../../components/ui/Skeleton';
import { LocationFailure, requestLocation } from '../../utils/location';
import { AmbientBackground } from '../../components/ui/AmbientBackground';
import { GradientButton } from '../../components/ui/GradientButton';
import { NavBar } from '../../components/onboarding/NavBar';
import { Colors } from '../../theme/colors';

// ─── Popular (pinned) cities per ISO-2 country code ──────────────────────────
const POPULAR: Record<string, string[]> = {
  AE: ['Dubai', 'Sharjah', 'Abu Dhabi Municipality'],
  PK: ['Karachi', 'Lahore', 'Islamabad'],
  SA: ['Riyadh', 'Jeddah', 'Mecca'],
  GB: ['London', 'Birmingham', 'Manchester'],
  US: ['New York City', 'Los Angeles', 'Chicago'],
  CA: ['Toronto', 'Vancouver', 'Montreal'],
  AU: ['Sydney', 'Melbourne', 'Brisbane'],
  QA: ['Doha', 'Al Wakrah', 'Al Khor'],
  OM: ['Muscat', 'Salalah', 'Sohar'],
  KW: ['Kuwait City', 'Hawalli', 'Farwaniya'],
  BH: ['Manama', 'Riffa', 'Muharraq'],
  MY: ['Kuala Lumpur', 'George Town', 'Johor Bahru'],
  DE: ['Berlin', 'Hamburg', 'Munich'],
  NO: ['Oslo', 'Bergen', 'Stavanger'],
  DK: ['Copenhagen', 'Aarhus', 'Odense'],
  IT: ['Rome', 'Milan', 'Naples'],
  ES: ['Madrid', 'Barcelona', 'Valencia'],
  TR: ['Istanbul', 'Ankara', 'İzmir'],
  ZA: ['Johannesburg', 'Cape Town', 'Durban'],
  NZ: ['Auckland', 'Wellington', 'Christchurch'],
  IE: ['Dublin', 'Cork', 'Limerick'],
  FR: ['Paris', 'Marseille', 'Lyon'],
};

// ─── List item discriminated union ───────────────────────────────────────────
type HeaderItem = { type: 'header'; title: string };
type CityItem = { type: 'city'; name: string };
type ListItem = HeaderItem | CityItem;

// ─── Location state ───────────────────────────────────────────────────────────
/**
 * `denied` is not one state but three: the fix can be refused, unavailable, or
 * simply slow, and only the first is anything to do with Settings.
 */
type LocationStatus = 'idle' | 'loading' | 'success' | LocationFailure;

const LOCATION_FAILURES: LocationStatus[] = ['permission', 'unavailable', 'timeout'];

function locationFailureLabel(status: LocationStatus): string {
  switch (status) {
    case 'permission':  return 'Location is off for Wisal. Enable it in Settings, then tap to retry.';
    case 'unavailable': return 'No location fix yet. Turn on Location, then tap to retry.';
    default:            return 'That took too long. Tap to try again.';
  }
}

interface Coords { latitude: number; longitude: number }

// ─── Props ────────────────────────────────────────────────────────────────────
interface CityScreenProps {
  /** ISO-2 country code from F6, e.g. 'AE' */
  countryCode: string;
  /** Full country name for the field label, e.g. 'United Arab Emirates' */
  countryName: string;
  /**
   * Short country name / abbreviation used in the search placeholder,
   * e.g. 'UAE'. Falls back to the last word of countryName.
   */
  countryShort?: string;
  /**
   * GPS coordinates captured on the previous screen (CountryScreen).
   * When provided the city is pre-selected automatically on mount.
   */
  initialCoords?: Coords;
  onBack?: () => void;
  /** Called with the chosen city name (and GPS coords if available) when the user taps Continue */
  onContinue?: (city: string, coords?: Coords) => void;
  onSave?: () => void;
  /**
   * How to leave the flow — an ✕ back to Home when this screen was opened from
   * there, or "Log out" while walking the signup. Exactly one is set.
   */
  onClose?: () => void;
  onLogout?: () => void;
  continueLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCoords(coords: Coords): string {
  const lat = Math.abs(coords.latitude).toFixed(5);
  const lng = Math.abs(coords.longitude).toFixed(5);
  const ns = coords.latitude >= 0 ? 'N' : 'S';
  const ew = coords.longitude >= 0 ? 'E' : 'W';
  return `${lat}° ${ns},  ${lng}° ${ew}`;
}

// ─── Loading state ────────────────────────────────────────────────────────────

/** Widths vary so the placeholder reads as a list of names, not a loading bar. */
const SKELETON_WIDTHS = ['58%', '41%', '67%', '49%', '62%', '36%', '54%', '45%'];

/**
 * Stands in for the city list while the dataset loads. Same row rhythm as the
 * real list, so nothing shifts when the names arrive.
 */
function CityListSkeleton() {
  return (
    <View
      style={styles.skeleton}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading cities">
      {SKELETON_WIDTHS.map((width, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Bone w={width} h={13} />
        </View>
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CityScreen({
  countryCode,
  countryName,
  countryShort,
  initialCoords,
  onBack,
  onContinue,
  onSave,
  onClose,
  onLogout,
  continueLoading,
}: CityScreenProps) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // ── Location state ────────────────────────────────────────────────────────
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [coords, setCoords] = useState<Coords | null>(null);

  // Derive a short placeholder label
  const shortName = countryShort ?? countryName.split(' ').pop() ?? countryName;

  // City names for this country. The dataset behind them is 8MB and loads in
  // one blocking chunk the first time any screen asks, so this screen waits for
  // it behind a skeleton rather than freezing on its first render.
  const { names: allCities, loading: citiesLoading } = useCityNames(countryCode);

  const popularNames = useMemo<string[]>(() => {
    const citySet = new Set(allCities);
    return (POPULAR[countryCode] ?? []).filter(n => citySet.has(n));
  }, [countryCode, allCities]);

  const listData = useMemo<ListItem[]>(() => {
    const q = search.toLowerCase().trim();
    if (q) {
      const matches = allCities.filter(n => n.toLowerCase().includes(q));
      return matches.map(n => ({ type: 'city', name: n }));
    }
    const popularSet = new Set(popularNames);
    const rest = allCities.filter(n => !popularSet.has(n));
    const items: ListItem[] = [];
    if (popularNames.length > 0) {
      items.push({ type: 'header', title: 'Most chosen' });
      popularNames.forEach(n => items.push({ type: 'city', name: n }));
    }
    items.push({ type: 'header', title: popularNames.length > 0 ? 'All' : 'Cities' });
    rest.forEach(n => items.push({ type: 'city', name: n }));
    return items;
  }, [search, allCities, popularNames]);

  const listRef = useRef<FlatList<ListItem>>(null);

  const handleSelect = useCallback((name: string) => {
    setSelectedCity(prev => (prev === name ? null : name));
  }, []);

  // If coords were passed from CountryScreen, auto-apply them on mount
  useEffect(() => {
    if (!initialCoords) return;
    setCoords(initialCoords);
    setLocationStatus('success');
    let live = true;
    findNearestCity(initialCoords).then(nearest => {
      if (live && nearest) setSelectedCity(nearest);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally only runs once on mount

  // Scroll the list to the auto-detected city after location resolves
  useEffect(() => {
    if (locationStatus !== 'success' || !selectedCity) return;
    const idx = listData.findIndex(
      item => item.type === 'city' && item.name === selectedCity,
    );
    if (idx < 0) return;
    // Slight delay so the list has fully rendered before scrolling
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: idx,
        animated: true,
        viewPosition: 0.35,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [locationStatus, selectedCity, listData]);

  // ── Nearest city from GPS coords ──────────────────────────────────────────
  const findNearestCity = useCallback(
    async (gpsCoords: Coords): Promise<string | null> =>
      (await findNearestCityInCountry(gpsCoords, countryCode))?.name ?? null,
    [countryCode],
  );

  // ── Location handler ──────────────────────────────────────────────────────
  const handleUseLocation = useCallback(async () => {
    setLocationStatus('loading');

    // Permission, retries and the reason for any failure all live in
    // `requestLocation`: a single high-accuracy attempt reports the provider as
    // unavailable the moment it subscribes indoors, which read here as a denial.
    const result = await requestLocation();
    if (!result.ok) {
      setLocationStatus(result.reason);
      return;
    }

    setCoords(result.coords);
    setLocationStatus('success');
    // Auto-select the nearest city in the chosen country
    const nearest = await findNearestCity(result.coords);
    if (nearest) setSelectedCity(nearest);
  }, [findNearestCity]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{item.title}</Text>
          </View>
        );
      }
      const selected = selectedCity === item.name;
      return (
        <Pressable
          onPress={() => handleSelect(item.name)}
          style={({ pressed }) => [
            styles.cityRow,
            pressed && !selected && styles.cityRowPressed,
            selected && styles.cityRowSelected,
          ]}>
          <Text style={[styles.cityName, selected && styles.cityNameSelected]}>
            {item.name}
          </Text>
          {selected && (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5 12.5l5 5 9-10"
                stroke={Colors.vioD}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </Pressable>
      );
    },
    [selectedCity, handleSelect],
  );

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.type === 'header') return `header-${item.title}`;
    return `city-${item.name}-${index}`;
  }, []);

  // ── Location card render ──────────────────────────────────────────────────
  const renderLocationCard = () => {
    if (locationStatus === 'success' && coords) {
      return (
        <View style={styles.locationCard}>
          <MapView
            style={styles.locationMap}
            region={{
              latitude: coords.latitude,
              longitude: coords.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={false}
            showsScale={false}
            toolbarEnabled={false}
          >
            {/* OSM tiles — no API key required on any platform */}
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
              tileSize={256}
            />
            <Marker coordinate={coords} pinColor={Colors.vioD} />
          </MapView>
          <View style={styles.coordsBar}>
            <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                fill={Colors.vioD}
              />
            </Svg>
            <Text style={styles.coordsText}>{formatCoords(coords)}</Text>
            {selectedCity ? (
              <View style={styles.detectedCityBadge}>
                <Text style={styles.detectedCityText}>{selectedCity}</Text>
                <View style={styles.detectedCityCheck}>
                  <Svg width={9} height={9} viewBox="0 0 24 24" fill="none"
                    stroke="#fff" strokeWidth={3.5}
                    strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12.5l5 5 9-10" />
                  </Svg>
                </View>
              </View>
            ) : (
              <View style={styles.coordsDot} />
            )}
          </View>
        </View>
      );
    }

    if (LOCATION_FAILURES.includes(locationStatus)) {
      return (
        <Pressable
          onPress={handleUseLocation}
          style={({ pressed }) => [
            styles.locationBtn,
            styles.locationBtnDenied,
            pressed && styles.locationBtnPressed,
          ]}>
          <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill={Colors.ink3}
            />
          </Svg>
          <Text style={styles.locationBtnDeniedText}>
            {locationFailureLabel(locationStatus)}
          </Text>
        </Pressable>
      );
    }

    return (
      <Pressable
        onPress={locationStatus === 'idle' ? handleUseLocation : undefined}
        style={({ pressed }) => [
          styles.locationBtn,
          pressed && styles.locationBtnPressed,
        ]}>
        {locationStatus === 'loading' ? (
          <>
            <ActivityIndicator size="small" color={Colors.vioD} />
            <Text style={styles.locationBtnText}>Getting your location…</Text>
          </>
        ) : (
          <>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                fill={Colors.vioD}
              />
            </Svg>
            <Text style={styles.locationBtnText}>Use my location</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={styles.chevron}>
              <Path
                d="M9 18l6-6-6-6"
                stroke={Colors.vioD}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </>
        )}
      </Pressable>
    );
  };

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

        {/* ── NavBar ───────────────────────────────────────────────────── */}
        <NavBar progress={34} onBack={onBack} skipLabel="Save" onSkip={onSave} onClose={onClose} onLogout={onLogout} />

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <View style={styles.body}>

          {/* Question block */}
          <View style={styles.question}>
            <Text style={styles.questionTitle}>Which city?</Text>
            <Text style={styles.questionSub}>
              Shown as a city only. Never your area.
            </Text>
          </View>

          {/* ── Location map card ─────────────────────────────────────── */}
          <View style={styles.locationSection}>
            {renderLocationCard()}
          </View>

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or choose below</Text>
            <View style={styles.orLine} />
          </View>

          {/* Picker field */}
          <View style={styles.pickerField}>
            <Text style={styles.fieldLabel}>City in {countryName}</Text>

            <View style={styles.sheet}>
              {/* Search box */}
              <View style={styles.searchBox}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Circle cx={11} cy={11} r={7} stroke={Colors.vioD} strokeWidth={2} />
                  <Path
                    d="M20 20l-3.5-3.5"
                    stroke={Colors.vioD}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                </Svg>
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search cities in ${shortName}…`}
                  placeholderTextColor={Colors.ink3}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                />
              </View>
              <View style={styles.searchDivider} />

              {citiesLoading ? (
                <CityListSkeleton />
              ) : listData.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {`Nothing matches "${search}".\nTry another spelling.`}
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={listData}
                  renderItem={renderItem}
                  keyExtractor={keyExtractor}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={20}
                  maxToRenderPerBatch={30}
                  onScrollToIndexFailed={info => {
                    // Retry after the list has rendered more items
                    setTimeout(() => {
                      listRef.current?.scrollToIndex({
                        index: info.index,
                        animated: true,
                        viewPosition: 0.35,
                      });
                    }, 300);
                  }}
                  ItemSeparatorComponent={({ leadingItem, trailingItem }: { leadingItem: ListItem; trailingItem: ListItem }) =>
                    leadingItem.type === 'header' || trailingItem?.type === 'header'
                      ? null
                      : <View style={styles.sep} />
                  }
                />
              )}
            </View>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <GradientButton
            label="Continue"
            variant={selectedCity ? 'primary' : 'disabled'}
            onPress={selectedCity ? () => onContinue?.(selectedCity, coords ?? undefined) : undefined}
            loading={continueLoading}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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

  body: {
    flex: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },

  question: {
    paddingTop: 18,
    paddingHorizontal: 2,
    paddingBottom: 2,
    flexShrink: 0,
  },

  questionTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
    lineHeight: 29,
    color: Colors.ink,
  },

  questionSub: {
    fontSize: 13,
    color: Colors.ink2,
    marginTop: 8,
    lineHeight: 20,
  },

  // ── Location section ────────────────────────────────────────────────────
  locationSection: {
    marginTop: 14,
    flexShrink: 0,
  },

  // Idle / loading button row
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(155,123,240,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  locationBtnPressed: {
    backgroundColor: Colors.vioSoft,
  },
  locationBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.vioInk,
  },
  chevron: {},

  locationBtnDenied: {
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  locationBtnDeniedText: {
    flex: 1,
    fontSize: 13,
    color: Colors.ink3,
  },

  // Expanded map card
  locationCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(155,123,240,0.22)',
    backgroundColor: '#fff',
  },
  locationMap: {
    height: 160,
    width: '100%',
  },
  coordsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  coordsText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.vioInk,
    letterSpacing: 0.2,
  },
  coordsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.vioD,
    opacity: 0.7,
  },

  detectedCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.mintSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 1,
    maxWidth: 160,
  },
  detectedCityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.mintInk,
    flexShrink: 1,
  },
  detectedCityCheck: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Divider between location and city list
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 2,
    paddingHorizontal: 2,
    flexShrink: 0,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  orText: {
    fontSize: 11,
    color: Colors.ink3,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── City picker ─────────────────────────────────────────────────────────
  pickerField: {
    marginTop: 10,
    flex: 1,
    flexDirection: 'column',
    minHeight: 0,
  },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.ink3,
    marginBottom: 8,
  },

  sheet: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(155,123,240,0.15)',
    overflow: 'hidden',
    minHeight: 0,
    marginBottom: 8,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    margin: 12,
    marginBottom: 0,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#fff',
    paddingHorizontal: 13,
    flexShrink: 0,
  },

  searchDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginTop: 12,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.ink,
    minWidth: 0,
    backgroundColor: 'transparent',
  },

  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },

  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginLeft: 15,
  },

  sectionHeader: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 7,
    backgroundColor: '#fff',
  },
  sectionHeaderText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.ink3,
  },

  // Loading placeholder — rows match .sit's 13px padding either side.
  skeleton: {
    paddingTop: 6,
  },
  skeletonRow: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 15,
  },
  cityRowPressed: {
    backgroundColor: 'rgba(240,235,254,0.5)',
  },
  cityRowSelected: {
    backgroundColor: Colors.vioSoft,
  },

  cityName: {
    flex: 1,
    fontSize: 15,
    color: Colors.ink,
  },
  cityNameSelected: {
    fontWeight: '700',
    color: Colors.vioInk,
  },

  emptyState: {
    flex: 1,
    padding: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.ink3,
    lineHeight: 20,
    textAlign: 'center',
  },

  footer: {
    paddingTop: 12,
    flexShrink: 0,
  },
});
