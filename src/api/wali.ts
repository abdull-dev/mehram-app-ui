/**
 * Wali (guardian / family) API
 *
 * Seeker-side:
 *  - createWaliInvite()      → POST /family/invitations — generates invitation code
 *  - getLinkedWali()         → GET /family/memberships — returns linked wali or null
 *  - getWaliStats()          → no equivalent in new backend; returns stub zeros
 *  - removeWali()            → DELETE /family/memberships/:id
 *
 * Wali-side:
 *  - getWaliMe()             → GET /auth/me — wali's own profile
 *  - submitInvitationCode()  → POST /family/invitations/redeem-code
 *  - getWaliQueue()          → GET /matches/wards — active ward matches
 *  - approveMatch()          → POST /matches/:matchId/wali-approval { approved: true }
 *  - rejectMatch()           → POST /matches/:matchId/wali-approval { approved: false }
 */
import { apiRequest } from './client';
import type { Introduction } from './introductions';

export type WaliRelationship = 'Father' | 'Brother' | 'Uncle' | 'Grandfather' | 'Other';

// ─── shapes ───────────────────────────────────────────────────────────────────

/** Response from POST /family/invitations */
export interface WaliInvite {
  invitationCode: string;   // 10-char code to share with the wali
  inviteLink: string;       // Deep link — opens the wali onboarding screen with code pre-filled
  expiresAt: string;        // ISO timestamp
}

/** Response from GET /family/memberships */
export interface WaliMember {
  membershipId: string;
  relationship: string;
  joinedAt: string;         // ISO timestamp
  wali: {
    id: string;
    fullName: string;
  };
}

/** Response from GET /wali/members/:id/stats (stubbed — no equivalent in new backend) */
export interface WaliStats {
  proposalsAwaitingReview: number;
  longestWaitDays: number;
}

/** Item in the wali queue (GET /matches/wards) */
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
 * Returns the invitation code (to share with the wali) and a deep link.
 */
export async function createWaliInvite(): Promise<WaliInvite> {
  return apiRequest<WaliInvite>('/family/invitations', {
    method: 'POST',
    body: JSON.stringify({ relationship: 'WALI', method: 'LINK' }),
  });
}

/**
 * Get the seeker's currently linked wali.
 * Returns null if no wali is linked yet.
 */
export async function getLinkedWali(): Promise<WaliMember | null> {
  return apiRequest<WaliMember | null>('/family/memberships');
}

/**
 * Get stats for the seeker's wali card.
 * No equivalent in new backend — returns stub zeros.
 */
export async function getWaliStats(_memberId: string): Promise<WaliStats> {
  return { proposalsAwaitingReview: 0, longestWaitDays: 0 };
}

/**
 * Remove the current wali. Must call getLinkedWali() first to obtain memberId.
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
  return apiRequest<WaliQueueItem[]>('/matches/wards');
}

/**
 * Wali approves a match on behalf of their ward.
 * When both sides approve, chat unlocks automatically.
 */
export async function approveMatch(matchId: string): Promise<void> {
  return apiRequest(`/matches/${matchId}/wali-approval`, {
    method: 'POST',
    body: JSON.stringify({ approved: true }),
  });
}

/**
 * Wali rejects a match on behalf of their ward.
 */
export async function rejectMatch(matchId: string): Promise<void> {
  return apiRequest(`/matches/${matchId}/wali-approval`, {
    method: 'POST',
    body: JSON.stringify({ approved: false }),
  });
}

/**
 * Wali removes their linked ward (dependent). Both sides lose the link.
 */
export async function removeWard(membershipId: string): Promise<void> {
  return apiRequest(`/family/memberships/${membershipId}`, { method: 'DELETE' });
}

/**
 * Fetch the discovery feed as the ward would see it.
 * Uses GET /matches/wards — returns active ward matches as the discovery feed.
 */
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

/**
 * All proposals the wali's ward has sent, newest first.
 */
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

/**
 * All proposals received by the wali's ward (sent TO the ward), newest first.
 */
export async function getWardReceivedProposals(): Promise<WardReceivedProposal[]> {
  return apiRequest<WardReceivedProposal[]>('/matches/wards/interests');
}

/**
 * Wali sends a proposal on behalf of their ward.
 * seekerUserId must be provided — obtained from the family membership.
 */
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

/**
 * Wali withdraws a proposal their ward sent, on the ward's behalf.
 */
export async function withdrawWardProposal(toUserId: string): Promise<void> {
  return apiRequest<void>(`/matches/interest/${toUserId}`, { method: 'DELETE' });
}
