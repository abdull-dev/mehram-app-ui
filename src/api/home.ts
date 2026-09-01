/**
 * Home screen state, resolved by the server.
 *
 * The app used to decide this itself from `isEntitled` plus a candidate count,
 * with "ID still under review" held in a local ref. That ref died with the
 * process, so relaunching a paid-but-unverified account showed "Search active"
 * — the app claiming a profile was verified when nothing had verified it.
 *
 * The server resolves all of it in one pass (verification, billing, profile
 * completeness, matching, photo requests) and is the only place that can, so
 * the client asks rather than guesses.
 */
import { apiRequest } from './client';

/** Mirrors `HomeState` in the backend's home-state resolver. */
export type HomeState =
  | 'SUSPENDED'
  | 'DELETION_PENDING'
  | 'VERIFICATION_FAILED'
  | 'RESUBMIT_REQUIRED'
  | 'PAYMENT_FAILED'
  | 'PROFILE_INCOMPLETE'
  | 'VERIFICATION_NOT_STARTED'
  | 'WALI_REQUIRED'
  | 'UNDER_REVIEW_UNPAID'
  | 'UNDER_REVIEW_PAID'
  | 'NO_MATCHES_IN_CITY'
  | 'CRITERIA_TOO_NARROW'
  | 'MATCHES_FOUND_UNPAID'
  | 'SEARCH_JUST_STARTED'
  | 'AWAITING_WALI_APPROVAL'
  | 'INTRO_AVAILABLE'
  | 'PHOTO_REQUEST_SENT'
  | 'PHOTO_SHARED'
  | 'PHOTO_REQUEST_DECLINED'
  | 'INCOMING_PHOTO_REQUEST'
  | 'NO_MATCHES_TODAY'
  | 'FALLBACK';

/** Mirrors the server's `VerificationStatus` enum. */
export type VerificationReviewStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface VerificationSummary {
  /**
   * Worst status across the user's verification types, matching what the home
   * state was resolved from. **Null means nothing has been submitted** — which
   * is not the same as being under review, though both used to render the same
   * card.
   */
  status: VerificationReviewStatus | null;
  /** Most recent submission across types, or null when there are none. */
  submittedAt: string | null;
  types: Array<{
    type: string;
    status: VerificationReviewStatus;
    submittedAt: string;
    reviewNote: string | null;
  }>;
}

/**
 * The verification types the app collects on F16. A profile is only genuinely
 * "under review" once every one of these has been submitted — a single pending
 * row is not enough, or someone who scanned their face but never added their ID
 * would be told a review had started while a step was still outstanding.
 */
export const REQUIRED_VERIFICATION_TYPES = [
  'SELFIE_LIVENESS',
  'GOVERNMENT_ID',
] as const;

/** True when every required type has been submitted. */
export function hasSubmittedAllVerifications(
  types: VerificationSummary['types'],
): boolean {
  const submitted = new Set(types.map(t => t.type));
  return REQUIRED_VERIFICATION_TYPES.every(t => submitted.has(t));
}

export interface HomeStateResponse {
  state: HomeState;
  data: {
    matchCount: number;
    city: string | null;
    deletionScheduledAt: string | null;
    completionPercent: number;
    isPaid: boolean;
    verification: VerificationSummary;
    hasIncomingPhotoRequest: boolean;
    /**
     * Photo requests waiting on this user's own answer.
     *
     * Excludes ones their wali decides — the badge means "needs you", and the
     * server resolves who that is from the owner's photo-visibility mode.
     */
    incomingPhotoRequests?: number;
    introduction: {
      counterpartUserId: string | null;
      stage: string;
      photoRequestStatus: string | null;
    } | null;
  };
}

export async function getHomeState(): Promise<HomeStateResponse> {
  return apiRequest<HomeStateResponse>('/matches/home-state');
}
