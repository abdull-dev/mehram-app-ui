/**
 * Introductions API
 *
 * Two shapes:
 *  - Introduction      → GET /matches/discover (list, slim fields for home card)
 *  - FullIntroduction  → GET /matches/candidates/:id (full profile, all fields)
 */
import { apiRequest } from './client';

/** Slim shape returned by GET /matches/discover — home card only */
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

/** Full shape returned by GET /matches/candidates/:id — profile detail screen */
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

export async function getHomeStats(): Promise<HomeStats> {
  const { count, reviewedThisWeek = 0 } = await apiRequest<{
    count: number;
    reviewedThisWeek?: number;
  }>('/matches/count');
  return { matchCriteria: count, reviewedThisWeek };
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
 * Today's curated introduction profiles (slim, for the home card).
 * Discover uses stored partner preferences on the server — not client query filters.
 */
/**
 * The most `/matches/discover` will return.
 *
 * Mirrors the server's `DiscoverQueryDto` (`@Max(30)`) and `MAX_DISCOVER_LIMIT`.
 * Asking for more is not clamped — the request is rejected outright with a 400,
 * so a larger number returns nothing at all rather than fewer results.
 */
export const MAX_DISCOVER_LIMIT = 30;

export async function getIntroductions(limit = 10): Promise<Introduction[]> {
  const capped = Math.min(Math.max(limit, 1), MAX_DISCOVER_LIMIT);
  return apiRequest<Introduction[]>(`/matches/discover?limit=${capped}`);
}

/**
 * Get the full profile for a specific introduction (all fields).
 * Used by ProfileDetailScreen (P2).
 */
export async function getIntroduction(id: string): Promise<FullIntroduction> {
  return apiRequest<FullIntroduction>(`/matches/candidates/${id}`);
}

/**
 * Mark an introduction as "not suitable".
 */
export async function skipIntroduction(id: string): Promise<void> {
  return apiRequest<void>(`/matches/skip/${id}`, { method: 'POST' });
}
