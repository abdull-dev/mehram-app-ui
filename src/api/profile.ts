/**
 * Profile API
 *
 * Covers all profile-building steps during onboarding:
 *   F6  CountryScreen       → held in app state, sent on F8 PUT
 *   F7  CityScreen          → updateLocation(lat, lng) when GPS exists
 *   F8  EssentialsScreen    → updateEssentials + updateSect
 *   F11 FamilyAndHomeScreen → updateFamilyBackground
 *   F12 GuidedPromptScreen  → updatePrompts
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

export type PhotoVisibilityMode =
  | 'NOBODY'
  | 'WALI_APPROVED'
  | 'MUTUAL_ACCEPTED'
  | 'OPEN';

export interface PrivacySettings {
  photoVisibilityMode: PhotoVisibilityMode;
  photoRequestsPaused: boolean;
  hideLocation?: boolean;
  hideFromDiscovery?: boolean;
  hideDistance?: boolean;
}

export const PHOTO_PRIVACY_OPTIONS: Array<{
  mode: PhotoVisibilityMode;
  chipLabel: string;
  title: string;
  subtitle: string;
}> = [
  {
    mode: 'NOBODY',
    chipLabel: 'Nobody without my approval',
    title: 'Nobody until I approve each request',
    subtitle: 'You are asked every time. You and he see each other at the same moment.',
  },
  {
    mode: 'WALI_APPROVED',
    chipLabel: 'My wali decides',
    title: 'Anyone my wali has approved',
    subtitle: 'Imran decides on your behalf. You are still told each time.',
  },
  {
    mode: 'MUTUAL_ACCEPTED',
    chipLabel: 'Mutual proposals only',
    title: 'Anyone I have accepted a proposal from',
    subtitle: 'Shared automatically once a proposal is mutual.',
  },
  {
    mode: 'OPEN',
    chipLabel: 'Anyone who matches me',
    title: 'Everyone who matches my criteria',
    subtitle: 'Shown on your card straight away. Fewer steps, less privacy.',
  },
];

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
  privacySettings?: PrivacySettings | null;
}

// ─── F7 — Location (lat/lng only; country + city go on PUT /profile/me) ───────

/** Save GPS coordinates. Country and city are not accepted on this endpoint. */
export async function updateLocation(
  latitude: number,
  longitude: number,
): Promise<void> {
  return apiRequest('/profile/me/location', {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude }),
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
  gender: Gender;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
  maritalStatus: MaritalStatus;
  countryCode: string;
  city?: string;
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

/** Kept for the later backend pass. F8 must not call this until prayerFrequency + religiosityLevel are optional or collected. */
export async function updateSect(sect: SectEnum): Promise<void> {
  return apiRequest('/profile/me/religious', {
    method: 'PUT',
    body: JSON.stringify({ sect }),
  });
}

// ─── F11 — Family & Home ──────────────────────────────────────────────────────

export type FamilyTypeEnum = 'NUCLEAR' | 'JOINT';

const FAMILY_TYPE_MAP: Record<string, FamilyTypeEnum> = {
  Nuclear: 'NUCLEAR',
  Joint: 'JOINT',
  Extended: 'JOINT',
  NUCLEAR: 'NUCLEAR',
  JOINT: 'JOINT',
};

/** Map screen family-type label to Prisma FamilyType. Extended → JOINT. */
export function toFamilyType(label: string): FamilyTypeEnum {
  return FAMILY_TYPE_MAP[label] ?? 'NUCLEAR';
}

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
    body: JSON.stringify({
      ...data,
      familyType: toFamilyType(data.familyType),
    }),
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

// ─── F12 — Guided Prompt ──────────────────────────────────────────────────────

/** Save "In your words" prompts (F12). PATCH so an omitted key is left alone. */
export async function updatePrompts(data: {
  familyDescription?: string;
  partnerDescription?: string;
}): Promise<void> {
  return apiRequest('/profile/me/prompts', {
    method: 'PATCH',
    body: JSON.stringify(data),
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

/** Update who can see the user's photos, and optionally pause new requests. */
export async function updatePhotoPrivacy(data: {
  photoVisibilityMode?: PhotoVisibilityMode;
  photoRequestsPaused?: boolean;
}): Promise<void> {
  return apiRequest('/profile/me/privacy', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── General ──────────────────────────────────────────────────────────────────

/** Fetch own full profile (used by HomeScreen / ProgressHub). */
export async function getMyProfile(): Promise<MyProfile> {
  return apiRequest<MyProfile>('/profile/me');
}
