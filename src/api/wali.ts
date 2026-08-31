/**
 * Wali (guardian / family) API
 *
 * Seeker-side:
 *  - createWaliInvite()      → POST /family/invitations
 *  - getFamilyStatus()       → GET /family/status (wali + stats in one call)
 *  - removeWali()            → DELETE /family/memberships/:id
 *
 * Wali-side:
 *  - submitInvitationCode()  → POST /family/invitations/redeem-code
 *  - getWaliQueue()          → GET /family/wali/queue
 *  - approveMatch()          → POST /family/wali/proposals/:id/approve
 *  - rejectMatch()           → POST /family/wali/proposals/:id/decline
 */
import { apiRequest } from './client';
import type { ProposalStage } from '../lib/proposalSteps';
import type { Introduction } from './introductions';

function whatsappShareUrl(code: string): string {
  return `https://wa.me/?text=${encodeURIComponent(code)}`;
}

// ─── shapes ───────────────────────────────────────────────────────────────────

/** Response from POST /family/invitations, mapped to the UI shape */
export interface WaliInvite {
  invitationCode: string;
  inviteLink: string;
  expiresAt: string;
}

/** Linked wali from GET /family/status when state is ACTIVE */
export interface WaliMember {
  membershipId: string;
  relationship: string;
  joinedAt: string;
  wali: {
    id: string;
    fullName: string;
  };
  proposalsAwaitingReview: number;
}

/**
 * Item in the wali queue (GET /family/wali/queue).
 *
 * Mirrors WaliReviewService.queue(). `reviewing` is the server telling us which
 * of the wali's two roles applies, so we never re-derive it from the stage:
 * 'outgoing' is a ward's proposal awaiting this wali, 'incoming' is one their
 * ward received that the suitor's wali already cleared.
 */
export interface WaliQueueItem {
  proposalId: string;
  stage: ProposalStage;
  wardUserId: string;
  reviewing: 'outgoing' | 'incoming';
  proposedAt: string;
  waliNote: string | null;
  /** Null when the suitor has no wali, which is itself worth showing. */
  suitorWaliName: string | null;
  /** True when the counterpart's wali sent it rather than the counterpart. */
  sentByWali?: boolean;
  counterpart: {
    userId: string;
    fullName: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    city: string | null;
    countryCode: string | null;
    occupation: string | null;
    educationLevel: string | null;
    maritalStatus: string | null;
    bio: string | null;
  };
}

interface FamilyStatusResponse {
  state: 'NONE' | 'INVITED' | 'ACTIVE' | 'EXPIRED';
  wali: {
    userId: string;
    membershipId: string;
    name: string;
    relationship: string;
    joinedAt: string;
    stats: {
      proposalsAwaiting: number;
      proposalsReviewed: number;
      conversationsActive: number;
    };
  } | null;
}

interface InvitationRow {
  inviteCode: string;
  expiresAt: string;
}

/** Response from GET /auth/me — used for wali's own profile */
export interface WaliMeResponse {
  fullName: string;
  onboardingCompleted: boolean;
  onboardingStep: string | null;
  ward: {
    membershipId: string;
    userId: string;
    email: string | null;
    // core
    fullName: string | null;
    gender: string | null;
    age: number | null;
    dateOfBirth: string | null;
    maritalStatus: string | null;
    bio: string | null;
    occupation: string | null;
    educationLevel: string | null;
    employmentStatus: string | null;
    fieldOfStudy: string | null;
    heightCm: number | null;
    hasChildren: boolean | null;
    willingToRelocate: boolean | null;
    languagesSpoken: string[];
    // location
    countryCode: string | null;
    city: string | null;
    // religious
    sect: string | null;
    madhhab: string | null;
    religiosityLevel: string | null;
    prayerFrequency: string | null;
    wearsHijab: boolean | null;
    keepsBeard: boolean | null;
    halalStrict: boolean | null;
    quranMemorization: string | null;
    // family background
    housingStatus: string | null;
    livingArrangement: string | null;
    familyType: string | null;
    siblingsSummary: string | null;
    fatherOccupation: string | null;
    motherOccupation: string | null;
    hasVehicle: boolean | null;
    // status
    onboardingCompleted: boolean;
    idVerified: boolean;
    memberSince: string;
    photos: Array<{ id: string; url: string; position?: number }>;
  } | null;
}

// ─── seeker-side ──────────────────────────────────────────────────────────────

/**
 * Create a wali invitation.
 * Returns the invitation code and a WhatsApp share URL (pre-filled with the code).
 * Errors with 409 if the seeker already has an active wali.
 *
 * `relationship` is always WALI and is not the guardian's kinship — the wali
 * states whether he is a father, brother and so on during his own onboarding.
 * It is load-bearing on the server: `redeem` grants UserRole.WALI only when the
 * invitation says WALI (anything else becomes a PARENT, which the app does not
 * route to the wali screens), and `assertWaliSlotAvailable` counts pending wali
 * invites by this same value. Sending FATHER here, as the relationship picker
 * used to, produced a guardian who landed on the seeker layout.
 */
export async function createWaliInvite(): Promise<WaliInvite> {
  const row = await apiRequest<InvitationRow>('/family/invitations', {
    method: 'POST',
    body: JSON.stringify({ relationship: 'WALI', method: 'LINK' }),
  });
  return {
    invitationCode: row.inviteCode,
    inviteLink: whatsappShareUrl(row.inviteCode),
    expiresAt: row.expiresAt,
  };
}

/**
 * Family tab state. Returns the linked wali (with awaiting-review count) or null.
 */
export async function getFamilyStatus(): Promise<WaliMember | null> {
  const status = await apiRequest<FamilyStatusResponse>('/family/status');
  if (status.state !== 'ACTIVE' || !status.wali) return null;
  return {
    membershipId: status.wali.membershipId,
    relationship: status.wali.relationship,
    joinedAt: status.wali.joinedAt,
    wali: {
      id: status.wali.userId,
      fullName: status.wali.name,
    },
    proposalsAwaitingReview: status.wali.stats.proposalsAwaiting,
  };
}

/**
 * Remove the current wali. Pass membershipId from getFamilyStatus().
 */
export async function removeWali(memberId: string): Promise<void> {
  return apiRequest(`/family/memberships/${memberId}`, { method: 'DELETE' });
}

// ─── wali-side ────────────────────────────────────────────────────────────────

/**
 * Fetch the wali's own profile.
 * Uses GET /auth/me — ward details are fetched separately via /matches/wards.
 */
export async function getWaliMe(): Promise<WaliMeResponse> {
  return apiRequest<WaliMeResponse>('/auth/me');
}

/**
 * Wali submits the invitation code shared by the seeker to link their accounts.
 */
export async function submitInvitationCode(
  invitationCode: string,
): Promise<{ membershipId: string; seekerName: string }> {
  return apiRequest('/family/invitations/redeem-code', {
    method: 'POST',
    body: JSON.stringify({ inviteCode: invitationCode }),
  });
}

/**
 * Fetch the wali's review queue (active ward matches).
 */
export async function getWaliQueue(): Promise<WaliQueueItem[]> {
  return apiRequest<WaliQueueItem[]>('/family/wali/queue');
}

/**
 * Wali approves a match on behalf of their ward.
 * When both sides approve, chat unlocks automatically.
 */
export async function approveMatch(matchId: string): Promise<void> {
  return apiRequest(`/family/wali/proposals/${matchId}/approve`, { method: 'POST' });
}

/**
 * Wali rejects a match on behalf of their ward.
 */
export async function rejectMatch(matchId: string): Promise<void> {
  return apiRequest(`/family/wali/proposals/${matchId}/decline`, { method: 'POST' });
}

// ─── ward surface (used by WaliHomeScreen) ────────────────────────────────────
//
// NOTE: this block is retained from the pre-merge client so WaliHomeScreen keeps
// compiling. It is NOT contract-correct yet — see plan items C and H:
//   - /auth/me returns { user, profile, family:{seekerCount,parentCount} }, so
//     WaliMeResponse.ward is never populated. No endpoint exposes a ward's full
//     profile to their wali (backend ask).
//   - RESOLVED: getWardReceivedProposals() now reads GET /family/wali/queue
//     filtered on reviewing === 'incoming'. /matches/wards/interests still
//     returns SENT interests only, which is what getWardProposals() wants.

/** Wali removes their linked ward (dependent). Both sides lose the link. */
export async function removeWard(membershipId: string): Promise<void> {
  return apiRequest(`/family/memberships/${membershipId}`, { method: 'DELETE' });
}

/** Active ward matches, rendered as the wali's discovery feed. */
export async function getWardIntroductions(_limit = 50): Promise<Introduction[]> {
  return apiRequest<Introduction[]>('/matches/wards');
}

/** Shape returned by GET /matches/wards/interests */
export interface WardProposal {
  id: string;
  toUserId: string;
  recipientName: string | null;
  recipientAge: number | null;
  recipientCity: string | null;
  recipientOccupation: string | null;
  stage: ProposalStage;
  /** True when the wali sent this on the ward's behalf. See SentProposal. */
  sentByWali?: boolean;
  /** Whether each side has a guardian at all. See SentProposal. */
  suitorHasWali?: boolean;
  recipientHasWali?: boolean;
  /** The counterpart's gender. See SentProposal. */
  gender?: string | null;
  createdAt: string;
}

/** All proposals the wali's ward has sent, newest first. */
export async function getWardProposals(): Promise<WardProposal[]> {
  return apiRequest<WardProposal[]>('/matches/wards/interests');
}

/** Shape returned by ward received proposals */
export interface WardReceivedProposal {
  id: string;
  fromUserId: string;
  senderName: string | null;
  senderAge: number | null;
  senderCity: string | null;
  senderOccupation: string | null;
  stage: ProposalStage;
  /**
   * True when the *sender's* wali sent it on the sender's behalf — the mirror
   * of the flag on WardProposal, which is about our own ward's wali.
   */
  sentByWali?: boolean;
  /** Whether each side has a guardian at all. See SentProposal. */
  suitorHasWali?: boolean;
  recipientHasWali?: boolean;
  /** The counterpart's gender. See SentProposal. */
  gender?: string | null;
  createdAt: string;
}

/** Years between an ISO date and today; null when the server sent no date. */
function ageFrom(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Proposals the ward has *received* that now need this wali's decision.
 *
 * Sourced from the wali queue, not /matches/wards/interests: that endpoint
 * returns the ward's SENT interests, so filtering it for incoming proposals
 * returned the ward's own outgoing ones. Since a wali-sent proposal opens at
 * HER_WALI_REVIEWING, that mis-source put every proposal a wali sent straight
 * into his own "needs your review" queue.
 */
export async function getWardReceivedProposals(): Promise<WardReceivedProposal[]> {
  const queue = await apiRequest<WaliQueueItem[]>('/family/wali/queue');
  return queue
    .filter(item => item.reviewing === 'incoming')
    .map(item => ({
      id: item.proposalId,
      fromUserId: item.counterpart.userId,
      senderName: item.counterpart.fullName,
      senderAge: ageFrom(item.counterpart.dateOfBirth),
      senderCity: item.counterpart.city,
      senderOccupation: item.counterpart.occupation,
      stage: item.stage,
      sentByWali: item.sentByWali,
      createdAt: item.proposedAt,
    }));
}

/** Wali sends a proposal on behalf of their ward. */
export async function sendWardProposal(
  introductionId: string,
  seekerUserId: string,
  _note?: string,
): Promise<void> {
  return apiRequest<void>(`/matches/suggest/${introductionId}`, {
    method: 'POST',
    body: JSON.stringify({ seekerUserId }),
  });
}

/** Wali withdraws a proposal their ward sent, on the ward's behalf. */
export async function withdrawWardProposal(toUserId: string): Promise<void> {
  return apiRequest<void>(`/matches/interest/${toUserId}`, { method: 'DELETE' });
}

/**
 * The guardian's own onboarding details (W4).
 *
 * `fullName` had no update path before this: it could only be set at
 * registration, so a wali who redeemed an invite kept the placeholder that flow
 * derived from his email. `kinship` is his relationship to the ward — distinct
 * from the membership's `relationship`, which stays WALI so the server keeps
 * treating him as a guardian.
 */
export type WaliKinship = 'FATHER' | 'MOTHER' | 'WALI' | 'BROTHER' | 'SISTER' | 'OTHER';

const KINSHIP_MAP: Record<string, WaliKinship> = {
  Father: 'FATHER',
  Brother: 'BROTHER',
  // The enum has no UNCLE or GRANDFATHER member, so both record as OTHER.
  Uncle: 'OTHER',
  Grandfather: 'OTHER',
  Other: 'OTHER',
};

/** Maps a picker label to the server enum. Unknown labels fall back to OTHER. */
export function toKinship(label: string): WaliKinship {
  return KINSHIP_MAP[label] ?? 'OTHER';
}

export async function updateWaliDetails(input: {
  fullName?: string;
  kinship?: WaliKinship;
}): Promise<{ fullName: string; kinship: WaliKinship | null }> {
  return apiRequest('/family/wali/details', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
