/**
 * Wali (guardian) API
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
 * Wali submits the invitation code shared by the seeker to link their accounts.
 * Returns { membershipId, seekerName } on success.
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
 * Fetch the wali's review queue.
 * Returns MATCH items (active matches needing approval) and
 * PENDING_INTEREST items (received proposals not yet converted to matches),
 * sorted by createdAt descending.
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
 * This is permanent — the match is set to UNMATCHED.
 */
export async function rejectMatch(matchId: string): Promise<void> {
  return apiRequest(`/family/wali/proposals/${matchId}/decline`, { method: 'POST' });
}
