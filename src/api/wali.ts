/**
 * Wali (guardian) API
 *
 * Seeker-side:
 *  - createWaliInvite()      → POST /wali/invite — generates invitation code + deep link
 *  - getLinkedWali()         → GET /wali/members — returns linked wali or null
 *  - getWaliStats()          → GET /wali/members/:id/stats — proposalsAwaitingReview, longestWaitDays
 *  - removeWali()            → DELETE /wali/members/:id — removes current wali
 *
 * Wali-side:
 *  - submitInvitationCode()  → POST /wali/invitation-code — wali enters the code to link
 *  - getWaliQueue()          → GET /wali/queue — matches + pending interests to review
 *  - approveMatch()          → POST /wali/queue/:matchId/approve
 *  - rejectMatch()           → POST /wali/queue/:matchId/reject
 */
import { apiRequest } from './client';

// Relationship label shown in UI (not stored server-side — server always uses WALI role)
export type WaliRelationship = 'Father' | 'Brother' | 'Uncle' | 'Grandfather' | 'Other';

// ─── shapes ───────────────────────────────────────────────────────────────────

/** Response from POST /wali/invite */
export interface WaliInvite {
  invitationCode: string;   // 10-char code to share with the wali
  inviteLink: string;       // Deep link — opens the wali onboarding screen with code pre-filled
  expiresAt: string;        // ISO timestamp
}

/** Response from GET /wali/members */
export interface WaliMember {
  membershipId: string;
  relationship: string;
  joinedAt: string;         // ISO timestamp
  wali: {
    id: string;
    fullName: string;
  };
}

/** Response from GET /wali/members/:id/stats */
export interface WaliStats {
  proposalsAwaitingReview: number;
  longestWaitDays: number;
}

/** Item in the wali queue (GET /wali/queue) */
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

// ─── seeker-side ──────────────────────────────────────────────────────────────

/**
 * Create a wali invitation.
 * Returns the invitation code (to share with the wali) and a deep link.
 * Errors with 409 if the seeker already has an active wali.
 */
export async function createWaliInvite(): Promise<WaliInvite> {
  return apiRequest<WaliInvite>('/wali/invite', {
    method: 'POST',
    body: JSON.stringify({ relationship: 'WALI', method: 'LINK' }),
  });
}

/**
 * Get the seeker's currently linked wali.
 * Returns null if no wali is linked yet.
 */
export async function getLinkedWali(): Promise<WaliMember | null> {
  return apiRequest<WaliMember | null>('/wali/members');
}

/**
 * Get stats for the seeker's wali card.
 * Call after getLinkedWali() succeeds — pass the membershipId from its response.
 */
export async function getWaliStats(memberId: string): Promise<WaliStats> {
  return apiRequest<WaliStats>(`/wali/members/${memberId}/stats`);
}

/**
 * Remove the current wali. Must call getLinkedWali() first to obtain memberId.
 * After this, getLinkedWali() will return null and a new wali can be invited.
 */
export async function removeWali(memberId: string): Promise<void> {
  return apiRequest(`/wali/members/${memberId}`, { method: 'DELETE' });
}

// ─── wali-side ────────────────────────────────────────────────────────────────

/**
 * Wali submits the invitation code shared by the seeker to link their accounts.
 * Returns { membershipId, seekerName } on success.
 */
export async function submitInvitationCode(
  invitationCode: string,
): Promise<{ membershipId: string; seekerName: string }> {
  return apiRequest('/wali/invitation-code', {
    method: 'POST',
    body: JSON.stringify({ invitationCode }),
  });
}

/**
 * Fetch the wali's review queue.
 * Returns MATCH items (active matches needing approval) and
 * PENDING_INTEREST items (received proposals not yet converted to matches),
 * sorted by createdAt descending.
 */
export async function getWaliQueue(): Promise<WaliQueueItem[]> {
  return apiRequest<WaliQueueItem[]>('/wali/queue');
}

/**
 * Wali approves a match on behalf of their ward.
 * When both sides approve, chat unlocks automatically.
 */
export async function approveMatch(matchId: string): Promise<void> {
  return apiRequest(`/wali/queue/${matchId}/approve`, { method: 'POST' });
}

/**
 * Wali rejects a match on behalf of their ward.
 * This is permanent — the match is set to UNMATCHED.
 */
export async function rejectMatch(matchId: string): Promise<void> {
  return apiRequest(`/wali/queue/${matchId}/reject`, { method: 'POST' });
}
