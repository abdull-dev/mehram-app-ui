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
import type { Introduction } from './introductions';

// Relationship label shown in UI (not stored server-side — mapped to FamilyRelationship)
export type WaliRelationship = 'Father' | 'Brother' | 'Uncle' | 'Grandfather' | 'Other';

type FamilyRelationship = 'FATHER' | 'MOTHER' | 'WALI' | 'BROTHER' | 'SISTER' | 'OTHER';

const RELATIONSHIP_MAP: Record<WaliRelationship, FamilyRelationship> = {
  Father: 'FATHER',
  Brother: 'BROTHER',
  Uncle: 'OTHER',
  Grandfather: 'OTHER',
  Other: 'OTHER',
};

function toFamilyRelationship(label?: WaliRelationship): FamilyRelationship {
  return label ? RELATIONSHIP_MAP[label] : 'FATHER';
}

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

/** Item in the wali queue (GET /family/wali/queue) */
export type WaliQueueItem =
  | {
      type: 'MATCH';
      matchId: string;
      seekerUserId: string;
      seekerName: string;
      wardApproved: boolean;
      chatUnlocked: boolean;
      createdAt: string;
      compatibility: number;
      counterpart: WaliQueueProfile;
    }
  | {
      type: 'PENDING_INTEREST';
      matchId: null;
      seekerUserId: string;
      createdAt: string;
      sender: WaliQueueProfile;
    };

export interface WaliQueueProfile {
  userId: string;
  fullName: string;
  age: number;
  city: string;
  occupation: string | null;
  photoUrl: string | null;
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
 */
export async function createWaliInvite(
  relationship: WaliRelationship = 'Father',
): Promise<WaliInvite> {
  const row = await apiRequest<InvitationRow>('/family/invitations', {
    method: 'POST',
    body: JSON.stringify({
      relationship: toFamilyRelationship(relationship),
      method: 'LINK',
    }),
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
//   - /matches/wards/interests returns SENT interests only, so
//     getWardReceivedProposals() cannot work; incoming proposals come from
//     GET /family/wali/queue filtered on reviewing === 'incoming'.
//   - WardProposal.stage still uses the retired PENDING_MY_WALI vocabulary.

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
  stage: 'PENDING_MY_WALI' | 'MY_WALI_APPROVED' | 'HER_WALI_APPROVED' | 'MATCHED';
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
  stage: 'PENDING_MY_WALI' | 'MY_WALI_APPROVED' | 'HER_WALI_APPROVED' | 'MATCHED';
  createdAt: string;
}

/** All proposals received by the wali's ward. See note above — currently returns sent. */
export async function getWardReceivedProposals(): Promise<WardReceivedProposal[]> {
  return apiRequest<WardReceivedProposal[]>('/matches/wards/interests');
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
