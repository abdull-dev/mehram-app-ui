/**
 * Photo requests (H16 / H17b).
 *
 * The server has carried this whole flow since the photos module landed —
 * create, incoming, outgoing, approve, decline — but no client code ever called
 * it: "Request photo" was wired to `console.log`.
 */
import { apiRequest } from './client';

export type PhotoRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'REVOKED';

/** Mirrors PhotoVisibilityMode — who may see the owner's photos by default. */
export type PhotoVisibilityMode = 'NOBODY' | 'WALI_APPROVED' | 'MUTUAL_ACCEPTED' | 'OPEN';

/** Which approval a request is waiting on. */
export type PhotoApprover = 'owner' | 'wali';

interface PhotoRequestUser {
  id: string;
  fullName: string | null;
}

/**
 * A pending request I can see: one sent to me, or one sent to my ward.
 *
 * The server resolves who must answer from the owner's photo-visibility mode,
 * so the app never has to re-derive it — and never offers a button the server
 * would refuse.
 */
export interface IncomingPhotoRequest {
  id: string;
  status: PhotoRequestStatus;
  requestedAt: string;
  fromUser: PhotoRequestUser;
  /** Whose photos were asked for — the ward, when a wali is reading. */
  ownerUser: PhotoRequestUser;
  /** True when the requester's wali sent it for them. */
  sentByWali: boolean;
  /** How the reader relates to this request. */
  viewerRole: PhotoApprover;
  /** The approval still outstanding; null once every one is in. */
  waitingOn: PhotoApprover | null;
  /** Whether the reader is the one being waited on. */
  canAnswer: boolean;
  /** The owner's mode, so the app can explain why and point at Settings. */
  photoVisibilityMode: PhotoVisibilityMode;
  waliApprovedAt: string | null;
  ownerApprovedAt: string | null;
}

/** A request I sent. */
export interface OutgoingPhotoRequest {
  id: string;
  status: PhotoRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  toUser: PhotoRequestUser;
  /** True when this went out from the reader's wali, not the reader. */
  sentByWali: boolean;
}

/**
 * Ask to see someone's photos. Paid — the server enforces it.
 *
 * `seekerUserId` sends it as a guardian for their ward; the server verifies the
 * family link rather than taking the client's word for it.
 */
export async function requestPhoto(
  targetUserId: string,
  seekerUserId?: string,
): Promise<void> {
  await apiRequest<void>('/photos/requests', {
    method: 'POST',
    body: JSON.stringify({ targetUserId, ...(seekerUserId ? { seekerUserId } : {}) }),
  });
}

/** Only PENDING rows: the server does not return ones already answered. */
export async function getIncomingPhotoRequests(): Promise<IncomingPhotoRequest[]> {
  return apiRequest<IncomingPhotoRequest[]>('/photos/requests/incoming');
}

export async function getOutgoingPhotoRequests(): Promise<OutgoingPhotoRequest[]> {
  return apiRequest<OutgoingPhotoRequest[]>('/photos/requests/outgoing');
}

export async function approvePhotoRequest(id: string): Promise<void> {
  await apiRequest<void>(`/photos/requests/${id}/approve`, { method: 'POST' });
}

/**
 * Declining is silent by design — the server answers 204 with no body so the
 * requester cannot tell a decline from an unanswered request.
 */
export async function declinePhotoRequest(id: string): Promise<void> {
  await apiRequest<void>(`/photos/requests/${id}/decline`, { method: 'POST' });
}
