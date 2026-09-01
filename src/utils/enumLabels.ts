/**
 * Server enum → the words a person reads.
 *
 * One table per enum, and one `labelFor` to read them. Five screens each carried
 * their own copies of these maps and they had drifted badly:
 *
 *   • `ProposalDetailScreen` had no `HIGH_SCHOOL` key at all, so the proposal
 *     card printed the raw enum. Its marital map was keyed on `SINGLE` and
 *     `SEPARATED`, which are not `MaritalStatus` members, so `NEVER_MARRIED`
 *     printed raw too.
 *   • Sect was keyed on `AHMADIYYA`/`IBADI` in two screens and `AHMADI`/`ISMAILI`
 *     in two others. Only the second pair exists.
 *   • Madhhab was keyed on `SHAFII`/`ZAIDI` in one screen; the enum has `SHAFI`
 *     and no `ZAIDI`.
 *   • `BACHELORS` read "Bachelor's" in one place and "Bachelor's degree" in
 *     another, on screens a user moves between in two taps.
 *
 * Keys are the Prisma enums verbatim. Values that are *not* current members are
 * kept where a build or a fixture may still emit them — they cost a line and
 * save a raw enum leaking to a user.
 *
 * Nothing here throws or returns a raw value: `labelFor` title-cases whatever it
 * does not recognise, so a member added on the server tomorrow reads as
 * "Higher secondary" rather than `HIGHER_SECONDARY`.
 */

type Labels = Record<string, string>;

/** `EducationLevel`. */
export const EDUCATION_LABELS: Labels = {
  HIGH_SCHOOL: 'High school',
  DIPLOMA: 'Diploma',
  BACHELORS: "Bachelor's degree",
  MASTERS: "Master's degree",
  DOCTORATE: 'PhD',
  OTHER: 'Other',
  // Not current members. Older rows and seed data still carry them.
  NO_FORMAL: 'No formal education',
  PRIMARY: 'Primary school',
  SECONDARY: 'Secondary / O-Level',
  HIGHER_SECONDARY: 'A-levels / FSc',
  PHD: 'PhD',
};

/** `MaritalStatus`. */
export const MARITAL_LABELS: Labels = {
  NEVER_MARRIED: 'Single',
  DIVORCED: 'Divorced',
  WIDOWED: 'Widowed',
  // Not current members.
  SINGLE: 'Single',
  SEPARATED: 'Separated',
};

/** `Sect`. */
export const SECT_LABELS: Labels = {
  SUNNI: 'Sunni',
  SHIA: 'Shia',
  AHMADI: 'Ahmadi',
  ISMAILI: 'Ismaili',
  OTHER: 'Other',
  PREFER_NOT_SAY: 'Prefer not to say',
  // Not current members.
  AHMADIYYA: 'Ahmadi',
  IBADI: 'Ibadi',
};

/** `Madhhab`. NONE is a real member and means "not followed", not "unknown". */
export const MADHHAB_LABELS: Labels = {
  HANAFI: 'Hanafi',
  SHAFI: "Shafi'i",
  MALIKI: 'Maliki',
  HANBALI: 'Hanbali',
  JAFARI: "Ja'fari",
  NONE: 'No specific madhhab',
  // Not current members.
  SHAFII: "Shafi'i",
  ZAIDI: 'Zaidi',
};

/** `ReligiosityLevel`. */
export const RELIGIOSITY_LABELS: Labels = {
  VERY_PRACTICING: 'Very practicing',
  PRACTICING: 'Practicing',
  MODERATE: 'Moderate',
  CULTURAL: 'Cultural',
  // Not a current member.
  MODERATELY_PRACTICING: 'Moderately practicing',
};

/** `PrayerFrequency`. */
export const PRAYER_LABELS: Labels = {
  FIVE_DAILY: 'Five daily prayers',
  MOST_PRAYERS: 'Most prayers',
  SOMETIMES: 'Sometimes',
  RARELY: 'Rarely',
  NEVER: 'Never',
};

/** `FieldOfStudy`. */
export const FIELD_OF_STUDY_LABELS: Labels = {
  ENGINEERING: 'Engineering',
  MEDICINE: 'Medicine',
  IT: 'IT / Computer Science',
  BUSINESS: 'Business',
  LAW: 'Law',
  ARTS: 'Arts & Humanities',
  OTHER: 'Other',
};

/** `EmploymentStatus`. */
export const EMPLOYMENT_LABELS: Labels = {
  EMPLOYED: 'Employed',
  SELF_EMPLOYED: 'Self-employed',
  STUDENT: 'Student',
  HOMEMAKER: 'Homemaker',
  UNEMPLOYED: 'Not employed',
};

/**
 * `FamilyType`. The enum has these two members and no more, which is why F11
 * offers exactly these two chips — an "Extended" option there was saved as
 * JOINT and came back as "Joint family".
 */
export const FAMILY_TYPE_LABELS: Labels = {
  JOINT: 'Joint family',
  NUCLEAR: 'Nuclear family',
};

/** `Gender`. */
export const GENDER_LABELS: Labels = {
  MALE: 'Man',
  FEMALE: 'Woman',
};

/** `FamilyRelationship` — a guardian's kinship to their ward. */
export const KINSHIP_LABELS: Labels = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  BROTHER: 'Brother',
  SISTER: 'Sister',
  WALI: 'Guardian',
  OTHER: 'Other',
};

/**
 * `SCREAMING_SNAKE` as a sentence: `HIGHER_SECONDARY` → "Higher secondary".
 *
 * The fallback for any value the tables above have not caught. Deliberately not
 * Title Case On Every Word — these read as prose in a value column, and "Never
 * Married" looks like a proper noun.
 */
export function humanizeEnum(value: string): string {
  const words = value.replace(/_+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The label for an enum value, or `null` when there is nothing to show.
 *
 * Callers can render the result directly: it is never a raw enum and never the
 * string "undefined". An unmapped value is humanized rather than dropped, so a
 * new server member degrades to readable text instead of vanishing from the row.
 */
export function labelFor(labels: Labels, value?: string | null): string | null {
  if (value == null) return null;
  const key = value.trim();
  if (key === '') return null;
  return labels[key] ?? humanizeEnum(key);
}
