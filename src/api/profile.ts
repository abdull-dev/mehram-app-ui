/**
 * Profile API
 *
 * Covers all profile-building steps during onboarding:
 *   F6  CountryScreen       → updateLocation
 *   F7  CityScreen          → updateLocation
 *   F8  EssentialsScreen    → updateEssentials + updateSect
 *   F11 FamilyAndHomeScreen → updateFamilyBackground
 *   F12 GuidedPromptScreen  → updateBio
 *   F13 PreferencesScreen   → updatePreferences
 *   F14 PhotosScreen        → uploadPhoto + deletePhoto + updatePhotoPrivacy
 */
import { apiRequest, apiUpload } from './client';

// ─── types ────────────────────────────────────────────────────────────────────

export interface ProfilePhoto {
  id: string;
  url: string;
  position?: number;
}

export interface FamilyBackground {
  housingStatus?: string | null;
  livingArrangement?: string | null;
  familyType?: string | null;
  siblingsSummary?: string | null;
  fatherOccupation?: string | null;
  motherOccupation?: string | null;
  hasVehicle?: boolean | null;
}

export interface ReligiousProfile {
  sect?: string | null;
  prayerFrequency?: string | null;
  religiosityLevel?: string | null;
}

export interface MyProfile {
  id: string;
  fullName?: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  occupation?: string | null;
  educationLevel?: string | null;
  heightCm?: number | null;
  countryCode: string;
  city?: string | null;
  bio?: string | null;
  photoVisibility?: string | null;
  onboardingCompletedAt?: string;
  photos: ProfilePhoto[];
  familyBackground?: FamilyBackground | null;
  religiousProfile?: ReligiousProfile | null;
  partnerPreference?: { ageMin?: number | null; ageMax?: number | null } | null;
}

// ─── F6/F7 — Location ─────────────────────────────────────────────────────────

/** Save country (and optionally city + GPS coordinates) to the user's profile. */
export async function updateLocation(
  countryCode: string,
  city?: string,
  latitude?: number,
  longitude?: number,
): Promise<void> {
  return apiRequest('/profile/me/location', {
    method: 'PATCH',
    body: JSON.stringify({
      countryCode,
      ...(city ? { city } : {}),
      ...(latitude != null ? { latitude } : {}),
      ...(longitude != null ? { longitude } : {}),
    }),
  });
}

// ─── F8 — Essentials ──────────────────────────────────────────────────────────

export type Gender = 'MALE' | 'FEMALE';
export type MaritalStatus = 'NEVER_MARRIED' | 'DIVORCED' | 'WIDOWED';

const GENDER_MAP: Record<'man' | 'woman', Gender> = {
  man:   'MALE',
  woman: 'FEMALE',
};

const MARITAL_MAP: Record<string, MaritalStatus> = {
  'Never married': 'NEVER_MARRIED',
  'Divorced':      'DIVORCED',
  'Widowed':       'WIDOWED',
};

/** Map screen label (e.g. "Never married") to Prisma enum (e.g. "NEVER_MARRIED"). */
export function toMaritalStatus(label: string): MaritalStatus {
  return MARITAL_MAP[label] ?? 'NEVER_MARRIED';
}

/** Map screen gender ("man"|"woman") to Prisma enum ("MALE"|"FEMALE"). */
export function toGender(g: 'man' | 'woman'): Gender {
  return GENDER_MAP[g];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Parse EssentialsScreen DOB string "1 January 2000" → ISO "2000-01-01".
 *  Avoids new Date(string) which fails on Hermes (Android) for non-ISO formats. */
export function parseDob(dobLabel: string): string {
  const [dayStr, monthStr, yearStr] = dobLabel.split(' ');
  const day = parseInt(dayStr, 10);
  const month = MONTH_NAMES.indexOf(monthStr) + 1;
  const year = parseInt(yearStr, 10);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface EssentialsPayload {
  fullName?: string;
  gender: Gender;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
  maritalStatus: MaritalStatus;
  occupation: string;
  educationLevel: string;
  heightCm: number;
}

/** Patch only the full name — used by wali who skips the seeker essentials step. */
export async function updateProfileName(fullName: string): Promise<void> {
  return apiRequest('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify({ fullName }),
  });
}

/** Save gender, DOB, marital status (F8 — Essentials). */
export async function updateEssentials(data: EssentialsPayload): Promise<void> {
  return apiRequest('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Update basic identity fields from the Edit Biodata screen (M6). */
export async function updateBasicIdentity(data: {
  fullName?: string;
  dateOfBirth?: string; // ISO "YYYY-MM-DD"
  maritalStatus?: MaritalStatus;
  heightCm?: number;
}): Promise<void> {
  return apiRequest('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── F8 — Sect (religious profile) ───────────────────────────────────────────

export type SectEnum = 'SUNNI' | 'SHIA' | 'AHMADI' | 'ISMAILI' | 'OTHER' | 'PREFER_NOT_SAY';

const SECT_MAP: Record<string, SectEnum> = {
  'Sunni':          'SUNNI',
  'Sunni (Hanafi)': 'SUNNI',
  'Deobandi':       'SUNNI',
  'Barelvi':        'SUNNI',
  'Ahle Hadith':    'SUNNI',
  'Shia':           'SHIA',
  'Ismaili':        'ISMAILI',
  'Other':          'OTHER',
};

/** Map screen sect label to Prisma Sect enum value. */
export function toSect(label: string): SectEnum {
  return SECT_MAP[label] ?? 'OTHER';
}

/** Save sect from EssentialsScreen (F8) → religious profile endpoint. */
export async function updateSect(sect: SectEnum): Promise<void> {
  return apiRequest('/profile/me/religious', {
    method: 'PUT',
    body: JSON.stringify({ sect }),
  });
}

// ─── F11 — Family & Home ──────────────────────────────────────────────────────

interface FamilyBackgroundPayload {
  housingStatus: string;
  livingArrangement: string;
  familyType: string;
  siblingsSummary: string;
  fatherOccupation: string;
  motherOccupation: string;
  hasVehicle: boolean;
}

/** Save family & home info (F11). */
export async function updateFamilyBackground(
  data: FamilyBackgroundPayload,
): Promise<void> {
  return apiRequest('/profile/me/family-background', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Build a siblings summary string from brothers + sisters inputs. */
export function buildSiblingsSummary(brothers: string, sisters: string): string {
  const b = parseInt(brothers, 10) || 0;
  const s = parseInt(sisters, 10) || 0;
  const parts: string[] = [];
  if (b > 0) parts.push(`${b} ${b === 1 ? 'brother' : 'brothers'}`);
  if (s > 0) parts.push(`${s} ${s === 1 ? 'sister' : 'sisters'}`);
  return parts.join(', ') || '0 siblings';
}

// ─── F12 — Guided Prompt (bio) ────────────────────────────────────────────────

/** Save bio text from GuidedPromptScreen (F12). */
export async function updateBio(bio: string): Promise<void> {
  return apiRequest('/profile/me', {
    method: 'PUT',
    body: JSON.stringify({ bio }),
  });
}

// ─── F13 — Preferences ────────────────────────────────────────────────────────

/** Save age range preferences (F13). */
export async function updatePreferences(
  ageMin: number,
  ageMax: number,
): Promise<void> {
  return apiRequest('/profile/me/preferences', {
    method: 'PUT',
    body: JSON.stringify({ ageMin, ageMax }),
  });
}

// ─── F14 — Photos ─────────────────────────────────────────────────────────────

export type PhotoVisibility =
  | 'APPROVAL_REQUIRED'   // Nobody without my approval
  | 'WALI_ONLY'           // My wali decides
  | 'MUTUAL_ONLY'         // Mutual proposals only
  | 'PUBLIC';             // Anyone who matches me

const PRIVACY_MAP: Record<string, PhotoVisibility> = {
  'Nobody without my approval': 'APPROVAL_REQUIRED',
  'My wali decides':            'WALI_ONLY',
  'Mutual proposals only':      'MUTUAL_ONLY',
  'Anyone who matches me':      'PUBLIC',
};

/** Map the privacy chip label (F14) to the API enum value. */
export function toPhotoVisibility(label: string): PhotoVisibility {
  return PRIVACY_MAP[label] ?? 'APPROVAL_REQUIRED';
}

/** Upload a photo file from the device (F14). Returns the saved photo record. */
export async function uploadPhoto(
  uri: string,
  fileName: string,
  mimeType: string,
): Promise<ProfilePhoto> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  return apiUpload<ProfilePhoto>('/profile/me/photos/upload', formData);
}

/** Remove a photo by its ID. */
export async function deletePhoto(photoId: string): Promise<void> {
  return apiRequest(`/profile/me/photos/${photoId}`, { method: 'DELETE' });
}

/** Update who can see the user's photos. */
export async function updatePhotoPrivacy(
  photoVisibility?: PhotoVisibility,
  pausePhotoRequests?: boolean,
): Promise<void> {
  const body: Record<string, unknown> = {};
  if (photoVisibility !== undefined) body.photoVisibility = photoVisibility;
  if (pausePhotoRequests !== undefined) body.pausePhotoRequests = pausePhotoRequests;
  return apiRequest('/profile/me/privacy', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ─── General ──────────────────────────────────────────────────────────────────

/** Fetch own full profile (used by HomeScreen / ProgressHub). */
export async function getMyProfile(): Promise<MyProfile> {
  return apiRequest<MyProfile>('/profile/me');
}
