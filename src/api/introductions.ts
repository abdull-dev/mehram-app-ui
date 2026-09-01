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
  /**
   * The wire name is `religiosityLevel`, matching the DB column. Declared as
   * `religiosity` here, which the server has never sent — so it read
   * `undefined` and the Religiosity row never appeared on any profile.
   */
  religiosityLevel?: string | null;
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
  /**
   * "There is a photo here that is not for you" — the one bit a viewer is owed.
   *
   * Was declared as `blurPhotos`, a name the server has never sent, so it read
   * `undefined` everywhere and every profile looked like it had no withheld
   * photos. `apiRequest` asserts rather than validates, so nothing caught it.
   */
  photosWithheld: boolean;
}

/** Full shape returned by GET /matches/candidates/:id — profile detail screen */
export interface FullIntroduction extends Introduction {
  /**
   * This viewer's standing photo request on this person, or null if none.
   *
   * Server-owned, because the app cannot know it: the state used to live in
   * component state only and was forgotten on every remount, so the button
   * offered a request the server had already recorded and refused.
   */
  photoRequestStatus?: 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVOKED' | null;
  /** Which approval a PENDING request is waiting on. */
  photoRequestWaitingOn?: 'owner' | 'wali' | null;
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

/**
 * Home hero stats, counted under the same criteria as the feed.
 *
 * `filters` must be whatever was passed to `getIntroductions`, or the "N match
 * your criteria" figure describes a different query from the one that produced
 * the cards — which is how a count of 1 ended up above an empty feed.
 */
export async function getHomeStats(
  filters?: IntroductionFilters,
): Promise<HomeStats> {
  const { count, reviewedThisWeek = 0 } = await apiRequest<{
    count: number;
    reviewedThisWeek?: number;
  }>(`/matches/count?${criteriaParams(filters).toString()}`);
  return { matchCriteria: count, reviewedThisWeek };
}

/**
 * The subset of a filter set the server understands as criteria overrides.
 *
 * `city` is only sent when the caller opted into a single city and not into
 * overseas results. It is deliberately *not* derived from a default: the city
 * list has no server column, so its fallback is a hard-coded 'Lahore', and
 * sending that as an override filters the feed by a city the user never picked.
 * Callers pass session filters here, never stored preferences — the server
 * already holds those.
 */
function criteriaParams(filters?: IntroductionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (!filters) return params;
  if (filters.ageMin != null) params.set('ageMin', String(filters.ageMin));
  if (filters.ageMax != null) params.set('ageMax', String(filters.ageMax));
  if (!filters.includeOverseas && filters.cities?.length === 1) {
    params.set('city', filters.cities[0]);
  }
  return params;
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

/**
 * Today's introductions, optionally narrowed by the session's filters.
 *
 * `filters` are the "Your filters" screen's values — session-only overrides for
 * the stored preference, which the server applies for this request and does not
 * write back. Omitted fields fall through to the stored preference, so calling
 * this with no filters is the plain feed.
 *
 * Only the criteria the endpoint understands are sent: age, and city as a single
 * value. `heightMinCm`, `sects`, `minReligiosity`, `educationLevels` and
 * `maritalStatuses` have no override on `GET /matches/discover` yet, so sending
 * them would be rejected by `forbidNonWhitelisted` — they still shape the stored
 * preference, just not a session filter.
 */
export async function getIntroductions(
  limit = 10,
  filters?: IntroductionFilters,
): Promise<Introduction[]> {
  const capped = Math.min(Math.max(limit, 1), MAX_DISCOVER_LIMIT);
  const params = criteriaParams(filters);
  params.set('limit', String(capped));
  return apiRequest<Introduction[]>(`/matches/discover?${params.toString()}`);
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
