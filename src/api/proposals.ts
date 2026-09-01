/**
 * Proposals API
 *
 * Candidate count, send/list/withdraw map to /matches/interest(s) and /matches/count.
 *
 * HomeScreen (H12):
 *  - getProposalStats() → candidate count for the "become a member" gate
 *
 * HomeScreen (H16):
 *  - sendProposal()     → express interest in an introduction
 *
 * Future (proposal history screen):
 *  - getProposals()     → list of sent proposals with profile snapshot + status
 */
import { apiRequest } from './client';
import type { ProposalStage } from '../lib/proposalSteps';

export interface ProposalStats {
  /** Number of candidate profiles matching the user's criteria. Shown on H12. */
  candidateCount: number;
}

/**
 * Result of sending a proposal.
 * matched = true when both parties have now expressed interest (a match was created).
 */
export interface ProposalResult {
  matched: boolean;
  matchId: string | null;
}

/**
 * A sent proposal returned by GET /matches/interests?direction=sent.
 * Extends the Introduction profile snapshot with proposal-specific fields.
 */
/**
 * The server's stage vocabulary (`ProposalStage` in prisma/schema.prisma).
 *
 * Re-exported from the shared step model so there is one definition: the app
 * previously carried its own set — PENDING_MY_WALI, MY_WALI_APPROVED,
 * HER_WALI_APPROVED, MATCHED — that shared no member with what the server sends,
 * so every stage lookup in the UI silently fell through to a default.
 */
export type { ProposalStage } from '../lib/proposalSteps';

export interface SentProposal {
  userId: string;
  /**
   * The ward who sent it, when a wali is viewing.
   *
   * Only the wali screens set this, and only they need it: withdrawing on a
   * ward's behalf is a ward-scoped endpoint, so the detail screen has to know
   * whose proposal it is rather than assuming the viewer sent it.
   */
  wardUserId?: string;
  fullName: string | null;
  sentAt: string;
  matchId: string | null;
  stage: ProposalStage;
  /** Viewer-aware copy computed by the server; prefer it over local chip text. */
  stageLabel?: string;
  /**
   * True when the seeker's wali sent this on their behalf. Drives the step
   * tracker's ordering and copy — a wali-sent proposal carries the ward's
   * approval implicitly. Optional: older servers omit it, and absent reads as
   * self-sent, which is the common case.
   */
  sentByWali?: boolean;
  /**
   * Whether each side has a guardian at all.
   *
   * `stage` cannot answer this: a proposal opens at HER_DECISION_PENDING both
   * when two walis cleared it and when neither party has one, so the tracker
   * drew two approvals nobody had given. Optional — older servers omit them,
   * and absent keeps the full four-step flow.
   */
  suitorHasWali?: boolean;
  recipientHasWali?: boolean;
  /**
   * The counterpart's gender ('MALE' / 'FEMALE'), so the proposal copy can name
   * a real person instead of assuming the suitor is a man. Absent falls back to
   * they/them.
   */
  gender?: string | null;
  status: 'pending' | 'matched';
  age: number | null;
  city: string | null;
  countryCode: string | null;
  educationLevel: string | null;
  occupation: string | null;
  heightCm: number | null;
  maritalStatus: string | null;
  familyType: string | null;
  sect: string | null;
  madhhab: string | null;
  idVerified: boolean;
  waliRegistered: boolean;  /**
   * Free-text note the sender attached when proposing. Named `waliNote` on the
   * wire for both sources — a seeker's own note and a wali-sent one share the
   * column — so attribute it from `sentByWali`, not from the field name.
   *
   * Was absent from this type while the server had been returning it all
   * along: `apiRequest` asserts rather than validates, so the note was parsed
   * and then silently dropped before any screen could read it.
   */
  waliNote?: string | null;

}

export interface ReceivedProposal {
  userId: string;
  fullName: string | null;
  sentAt: string;
  matchId: string | null;
  stage: ProposalStage;
  /** Viewer-aware copy computed by the server; prefer it over local chip text. */
  stageLabel?: string;
  /**
   * True when the seeker's wali sent this on their behalf. Drives the step
   * tracker's ordering and copy — a wali-sent proposal carries the ward's
   * approval implicitly. Optional: older servers omit it, and absent reads as
   * self-sent, which is the common case.
   */
  sentByWali?: boolean;
  /**
   * Whether each side has a guardian at all.
   *
   * `stage` cannot answer this: a proposal opens at HER_DECISION_PENDING both
   * when two walis cleared it and when neither party has one, so the tracker
   * drew two approvals nobody had given. Optional — older servers omit them,
   * and absent keeps the full four-step flow.
   */
  suitorHasWali?: boolean;
  recipientHasWali?: boolean;
  /**
   * The counterpart's gender ('MALE' / 'FEMALE'), so the proposal copy can name
   * a real person instead of assuming the suitor is a man. Absent falls back to
   * they/them.
   */
  gender?: string | null;
  status: 'pending' | 'matched';
  age: number | null;
  city: string | null;
  countryCode: string | null;
  educationLevel: string | null;
  occupation: string | null;
  heightCm: number | null;
  maritalStatus: string | null;
  familyType: string | null;
  sect: string | null;
  madhhab: string | null;
  idVerified: boolean;
  waliRegistered: boolean;  /**
   * Free-text note the sender attached when proposing. Named `waliNote` on the
   * wire for both sources — a seeker's own note and a wali-sent one share the
   * column — so attribute it from `sentByWali`, not from the field name.
   *
   * Was absent from this type while the server had been returning it all
   * along: `apiRequest` asserts rather than validates, so the note was parsed
   * and then silently dropped before any screen could read it.
   */
  waliNote?: string | null;

}

/**
 * Get proposal statistics for the current user.
 * Used on HomeScreen H12 to show "X profiles are waiting".
 * Maps to GET /matches/count.
 */
export async function getProposalStats(): Promise<ProposalStats> {
  const { count } = await apiRequest<{ count: number }>('/matches/count');
  return { candidateCount: count };
}

/**
 * Send a proposal to express interest in an introduction.
 * Used on HomeScreen H16 when "Send proposal" is tapped.
 */
export async function sendProposal(introductionId: string, note?: string): Promise<ProposalResult> {
  return apiRequest<ProposalResult>(`/matches/interest/${introductionId}`, {
    method: 'POST',
    body: JSON.stringify(note?.trim() ? { waliNote: note.trim() } : {}),
  });
}

/**
 * List all proposals sent by the current user.
 */
export async function getProposals(): Promise<SentProposal[]> {
  return apiRequest<SentProposal[]>('/matches/interests?direction=sent');
}

/**
 * List all proposals received by the current user.
 */
export async function getReceivedProposals(): Promise<ReceivedProposal[]> {
  return apiRequest<ReceivedProposal[]>('/matches/interests?direction=received');
}

/**
 * Silently withdraw a pending sent proposal.
 * Only works while status is 'pending'. No notification is sent to the other party.
 * After withdrawal, their profile reappears in the discovery pool.
 */
export async function withdrawProposal(toUserId: string): Promise<void> {
  return apiRequest<void>(`/matches/interest/${toUserId}`, { method: 'DELETE' });
}

/**
 * Accept a proposal that has reached you — the recipient's own decision, and the
 * only thing that creates a match.
 *
 * Keyed on the sender, because that is how the interest row is addressed. Only
 * valid at HER_DECISION_PENDING; earlier stages belong to the guardians and the
 * server refuses them. Requires the accepter's paid membership: accepting is
 * initiating contact.
 *
 * Neither this nor `declineReceivedProposal` existed before — the Accept and
 * Decline buttons on the received-proposal screen had no handler to call, so
 * tapping them fired no request at all.
 */
export async function acceptProposal(fromUserId: string): Promise<void> {
  return apiRequest<void>(`/matches/interest/${fromUserId}/accept`, {
    method: 'POST',
  });
}

/**
 * Decline a proposal that has reached you. Terminal.
 *
 * Silent by design: the sender is told only that it was not taken forward.
 */
export async function declineReceivedProposal(
  fromUserId: string,
): Promise<void> {
  return apiRequest<void>(`/matches/interest/${fromUserId}/decline`, {
    method: 'POST',
  });
}
