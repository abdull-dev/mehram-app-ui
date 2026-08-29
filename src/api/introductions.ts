/**
 * Introductions API
 *
 * Two shapes:
 *  - Introduction      → GET /introductions (list, slim fields for home card)
 *  - FullIntroduction  → GET /introductions/:id (full profile, all fields)
 */
import { apiRequest } from './client';

/** Slim shape returned by GET /introductions — home card only */
export interface Introduction {
  userId: string;
  fullName: string;
  age: number;
  city: string;
  // Coordinates — used client-side for distance fallback when distanceKm is null
  latitude: number | null;
  longitude: number | null;
  // Religious subtitle
  sect?: string | null;
  madhhab?: string | null;
  religiosity?: string | null;
  // Card detail rows
  educationLevel: string | null;
  occupation: string | null;
  maritalStatus: string;
  heightCm: number | null;
  familyType: string | null;
  // Short bio teaser shown on the home card
  bio: string | null;
  // Verification badges
  idVerified: boolean;
  waliRegistered: boolean;
  // Distance / photo privacy
  distanceKm: number | null;
  hideDistance: boolean;
  blurPhotos: boolean;
}

/** Full shape returned by GET /introductions/:id — profile detail screen */
export interface FullIntroduction extends Introduction {
  // Photos
  photoUrl: string | null;
  photoUrls: string[];
  // Education & work detail
  fieldOfStudy?: string | null;
  employmentStatus?: string | null;
  languagesSpoken?: string[];
  // Demographics
  gender?: string | null;
  hasChildren?: boolean | null;
  willingToRelocate?: boolean | null;
  // Religious detail
  prayerFrequency?: string | null;
  wearsHijab?: boolean | null;
  keepsBeard?: boolean | null;
  halalStrict?: boolean | null;
  quranMemorization?: string | null;
  // Family background detail
  housingStatus?: string | null;
  livingArrangement?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  siblingsSummary?: string | null;
  hasVehicle?: boolean | null;
  // Country (admin/display use only — not shown on home card)
  countryCode?: string | null;
}

/** Stats for the H16 hero card — fetched once when the user reaches H16. */
export interface HomeStats {
  /** Profiles in the active discovery pool matching the user's criteria */
  matchCriteria: number;
  /** Distinct users who viewed this user's full profile in the last 7 days */
  reviewedThisWeek: number;
}

export async function getHomeStats(filters?: IntroductionFilters): Promise<HomeStats> {
  const params = new URLSearchParams();
  if (filters) {
    if (filters.ageMin != null) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax != null) params.set('ageMax', String(filters.ageMax));
    if (filters.heightMinCm != null) params.set('heightMinCm', String(filters.heightMinCm));
    if (filters.heightMaxCm != null) params.set('heightMaxCm', String(filters.heightMaxCm));
    if (filters.includeOverseas != null) params.set('includeOverseas', String(filters.includeOverseas));
    (filters.cities ?? []).forEach(c => params.append('cities', c));
    (filters.sects ?? []).filter(s => s !== 'Any').forEach(s => params.append('sects', s));
    (filters.educationLevels ?? []).filter(e => e !== 'Any').forEach(e => params.append('educationLevels', e));
    (filters.maritalStatuses ?? []).filter(m => m !== 'Any').forEach(m => params.append('maritalStatuses', m));
    if (filters.minReligiosity && filters.minReligiosity !== 'Any') params.set('minReligiosity', filters.minReligiosity);
  }
  const qs = params.toString();
  return apiRequest<HomeStats>(qs ? `/introductions/stats?${qs}` : '/introductions/stats');
}

export interface IntroductionFilters {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  cities?: string[];
  includeOverseas?: boolean;
  sects?: string[];
  minReligiosity?: string;
  educationLevels?: string[];
  maritalStatuses?: string[];
}

/**
 * Get today's curated introduction profiles (slim, for the home card).
 * Pass filters to narrow results; 'Any' values are ignored (no-op filter).
 */
export async function getIntroductions(limit = 10, filters?: IntroductionFilters): Promise<Introduction[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (filters) {
    if (filters.ageMin != null) params.set('ageMin', String(filters.ageMin));
    if (filters.ageMax != null) params.set('ageMax', String(filters.ageMax));
    if (filters.heightMinCm != null) params.set('heightMinCm', String(filters.heightMinCm));
    if (filters.heightMaxCm != null) params.set('heightMaxCm', String(filters.heightMaxCm));
    if (filters.includeOverseas != null) params.set('includeOverseas', String(filters.includeOverseas));
    (filters.cities ?? []).forEach(c => params.append('cities', c));
    (filters.sects ?? []).filter(s => s !== 'Any').forEach(s => params.append('sects', s));
    (filters.educationLevels ?? []).filter(e => e !== 'Any').forEach(e => params.append('educationLevels', e));
    (filters.maritalStatuses ?? []).filter(m => m !== 'Any').forEach(m => params.append('maritalStatuses', m));
    if (filters.minReligiosity && filters.minReligiosity !== 'Any') params.set('minReligiosity', filters.minReligiosity);
  }
  return apiRequest<Introduction[]>(`/introductions?${params.toString()}`);
}

/**
 * Get the full profile for a specific introduction (all fields).
 * Used by ProfileDetailScreen (P2).
 */
export async function getIntroduction(id: string): Promise<FullIntroduction> {
  return apiRequest<FullIntroduction>(`/introductions/${id}`);
}

/**
 * Mark an introduction as "not suitable".
 */
export async function skipIntroduction(id: string): Promise<void> {
  return apiRequest<void>(`/introductions/${id}/skip`, { method: 'POST' });
}
