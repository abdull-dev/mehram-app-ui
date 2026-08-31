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

export interface HomeStateResponse {
  state: HomeState;
  data: {
    matchCount: number;
    city: string | null;
    deletionScheduledAt: string | null;
    completionPercent: number;
    isPaid: boolean;
    hasIncomingPhotoRequest: boolean;
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
