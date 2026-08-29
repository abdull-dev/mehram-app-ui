/**
 * Proposals API
 *
 * Replaces the old /matches/stats endpoint and adds proposal actions.
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
 * A sent proposal returned by GET /proposals.
 * Extends the Introduction profile snapshot with proposal-specific fields.
 */
export type ProposalStage =
  | 'PENDING_MY_WALI'
  | 'MY_WALI_APPROVED'
  | 'HER_WALI_APPROVED'
  | 'MATCHED';

export interface SentProposal {
  userId: string;
  fullName: string | null;
  sentAt: string;
  matchId: string | null;
  stage: ProposalStage;
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
  waliRegistered: boolean;
}

export interface ReceivedProposal {
  userId: string;
  fullName: string | null;
  receivedAt: string;
  matchId: string | null;
  stage: ProposalStage;
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
  waliRegistered: boolean;
}

/**
 * Get proposal statistics for the current user.
 * Used on HomeScreen H12 to show "X profiles are waiting".
 * Replaces GET /matches/stats.
 */
export async function getProposalStats(): Promise<ProposalStats> {
  return apiRequest<ProposalStats>('/proposals/stats');
}

/**
 * Send a proposal to express interest in an introduction.
 * Used on HomeScreen H16 when "Send proposal" is tapped.
 * @param note Optional personal note attached to the proposal (max 300 chars).
 */
export async function sendProposal(introductionId: string, note?: string): Promise<ProposalResult> {
  return apiRequest<ProposalResult>('/proposals', {
    method: 'POST',
    body: JSON.stringify({ introductionId, ...(note?.trim() ? { note: note.trim() } : {}) }),
  });
}

/**
 * List all proposals sent by the current user.
 */
export async function getProposals(): Promise<SentProposal[]> {
  return apiRequest<SentProposal[]>('/proposals');
}

/**
 * List all proposals received by the current user.
 */
export async function getReceivedProposals(): Promise<ReceivedProposal[]> {
  return apiRequest<ReceivedProposal[]>('/proposals/received');
}

/**
 * Silently withdraw a pending sent proposal.
 * Only works while status is 'pending'. No notification is sent to the other party.
 * After withdrawal, their profile reappears in the discovery pool.
 */
export async function withdrawProposal(toUserId: string): Promise<void> {
  return apiRequest<void>(`/proposals/${toUserId}`, { method: 'DELETE' });
}
