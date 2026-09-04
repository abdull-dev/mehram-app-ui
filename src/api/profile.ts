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

/**
 * The photo-visibility choices offered to a user, strictest first.
 *
 * `OPEN` is a real mode but deliberately not offered here: the server sets it
 * as the default for men, and there is no screen on which someone opts into
 * showing their photos to everyone. It is excluded rather than hidden, so
 * anything reading this list is reading the full set of *choices*.
 */
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
    subtitle:
      'You are asked every time. You and they see each other at the same moment.',
  },
  {
    // `viewer.matched` — and a match exists only once a proposal has cleared
    // both guardians and been accepted in person, so "my wali and I" is what
    // this rule actually requires, not a paraphrase of it.
    mode: 'MUTUAL_ACCEPTED',
    chipLabel: 'After my wali and I both approve',
    title: 'Anyone my wali and I have both approved',
    subtitle:
      'Shared once a proposal has passed your wali and you have accepted it.',
  },
  {
    // `viewer.waliCleared || viewer.matched` — the wali alone can grant this,
    // which is what makes it wider than the option above.
    mode: 'WALI_APPROVED',
    chipLabel: 'My wali decides',
    title: 'Anyone my wali has approved',
    subtitle: 'Your wali decides on your behalf. You are still told each time.',
  },
];

/**
 * What the photos step starts on when nothing is stored.
 *
 * The strictest option. A default that shares more than the user has chosen is
 * not a default worth having, and this screen exists precisely to let them widen
 * it deliberately.
 */
export const DEFAULT_PHOTO_PRIVACY: PhotoVisibilityMode = 'NOBODY';

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
  partnerPreference?: PartnerPreference | null;
  privacySettings?: PrivacySettings | null;
}

// ─── F6/F7 — Location ─────────────────────────────────────────────────────────

/**
 * Save any part of the user's location.
 *
 * This endpoint has always accepted `countryCode` and `city`; the client simply
 * never sent them, so the country and city steps persisted nothing and the
 * answers lived in memory until F8's full profile PUT — and were lost if the
 * app closed before reaching it. Every field is optional, and omitted ones
 * leave the stored value untouched.
 */
export async function updateLocation(data: {
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  city?: string;
}): Promise<void> {
  return apiRequest('/profile/me/location', {
    method: 'PATCH',
    body: JSON.stringify(data),
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
  /**
   * The name the user typed at F8.
   *
   * F8 collected and validated it, then dropped it: `updateEssentials` never
   * sent it, so the account kept the placeholder registration put there — the
   * local part of the email address. The name looked right for the rest of that
   * session, because the screen also set it in memory, and came back as
   * `wowarej751` on the next launch when `getMe` supplied the stored value.
   */
  fullName: string;
  gender: Gender;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
  maritalStatus: MaritalStatus;
  countryCode: string;
  city?: string;
  occupation: string;
  educationLevel: string;
  heightCm: number;
}

/** Save name, gender, DOB, marital status (F8 — Essentials). */
export async function updateEssentials(data: EssentialsPayload): Promise<void> {
  return apiRequest('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Update basic identity fields from the Edit Biodata screen (M6).
 *
 * `PUT /profile/me` is a full replace, not a patch: `gender`, `dateOfBirth`,
 * `maritalStatus` and `countryCode` are all required, and the endpoint rejects
 * the request outright if any is missing. This used to send only the four fields
 * the screen edits — so gender and countryCode were absent and the save could
 * never have succeeded. Callers pass the stored values for the rest; every
 * screen that reaches here has already loaded the profile.
 */
export async function updateBasicIdentity(data: {
  fullName?: string;
  gender: Gender;
  dateOfBirth: string; // ISO "YYYY-MM-DD"
  maritalStatus: MaritalStatus;
  countryCode: string;
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
  // What F11 offers.
  'Joint family': 'JOINT',
  'Separate family': 'NUCLEAR',
  // Older labels, in case one is still held in a screen's state or a draft.
  // "Nuclear family" was renamed to "Separate family" — the wording families
  // here use — and still saves as NUCLEAR, so drafts holding it are unchanged.
  // "Extended" was dropped: Pakistani families call that arrangement joint, and
  // it had no FamilyType of its own to be saved as anyway.
  'Nuclear family': 'NUCLEAR',
  Joint: 'JOINT',
  Nuclear: 'NUCLEAR',
  Separate: 'NUCLEAR',
  Extended: 'JOINT',
  // Already an enum value — the profile endpoint returns these.
  JOINT: 'JOINT',
  NUCLEAR: 'NUCLEAR',
};

/** Map a screen family-type label to the Prisma FamilyType. */
export function toFamilyType(label: string): FamilyTypeEnum {
  return FAMILY_TYPE_MAP[label] ?? 'JOINT';
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

export type SectEnumValue = SectEnum;
export type ReligiosityEnum =
  | 'VERY_PRACTICING'
  | 'PRACTICING'
  | 'MODERATE'
  | 'CULTURAL';
export type EducationEnum =
  | 'HIGH_SCHOOL'
  | 'DIPLOMA'
  | 'BACHELORS'
  | 'MASTERS'
  | 'DOCTORATE'
  | 'OTHER';

/**
 * The stored partner preference, exactly as `GET /profile/me` returns it.
 *
 * Every field here is a real column on `PartnerPreference`, and `PUT
 * /profile/me/preferences` accepts all of them. The client used to model this as
 * `{ ageMin, ageMax }` and send only those two, so the rest of the preferences
 * screen lived in memory and was lost on every relaunch — while the server's own
 * copy stayed at its defaults and kept filtering the feed by them.
 */
export interface PartnerPreference {
  ageMin?: number | null;
  ageMax?: number | null;
  heightMinCm?: number | null;
  heightMaxCm?: number | null;
  /** ISO-3166 alpha-2. Empty means "anywhere". */
  countryCodes?: string[];
  /**
   * City names, matched case-insensitively against a profile's own city. Empty
   * means any city; the countries above widen it rather than narrowing it.
   */
  preferredCities?: string[];
  sects?: SectEnum[];
  minReligiosity?: ReligiosityEnum | null;
  educationLevels?: EducationEnum[];
  maritalStatuses?: MaritalStatus[];
  acceptsChildren?: boolean;
  willingToRelocatePartner?: boolean;
  lookingFor?: string | null;
}

/**
 * Replace the stored preference set (F13 and the Partner preferences screen).
 *
 * Omitted keys keep their stored value server-side, so callers send the whole
 * set rather than a patch — otherwise clearing a choice back to "any" would be
 * indistinguishable from not mentioning it. Empty arrays are the way to say
 * "no constraint", which is what the UI's "Any" chip means.
 */
export async function updatePreferences(
  data: PartnerPreference,
): Promise<void> {
  return apiRequest('/profile/me/preferences', {
    method: 'PUT',
    body: JSON.stringify(data),
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

// ─── Section-by-section completion ────────────────────────────────────────────

/** Mirrors `SectionKey` in the backend's profile-completion module. */
export type ProfileSectionKey =
  | 'basicInfo'
  | 'religious'
  | 'location'
  | 'family'
  | 'prompts'
  | 'photos'
  | 'preferences'
  | 'wali';

export interface ProfileSectionStatus {
  complete: boolean;
  fieldsTotal: number;
  fieldsDone: number;
}

export interface ProfileCompletion {
  /** Field-weighted percentage across every section. */
  overallPercent: number;
  sections: Record<ProfileSectionKey, ProfileSectionStatus>;
  /** Incomplete sections that actually block matching. */
  missingCore: ProfileSectionKey[];
  coreComplete: boolean;
}

/**
 * Which profile sections are actually finished.
 *
 * H6 used to infer this from the onboarding screen the user would resume at,
 * which is not the same question: the verification and payment steps move that
 * marker past every profile section, so a profile the server still considers
 * incomplete read as fully done and H6 rendered nothing at all.
 */
export async function getProfileCompletion(): Promise<ProfileCompletion> {
  return apiRequest<ProfileCompletion>('/profile/me/completion');
}
