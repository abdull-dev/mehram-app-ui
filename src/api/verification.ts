/**
 * Verification API
 *
 * F16 VerificationScreen:
 *  - submitFaceVerification()  → submit face scan result
 *  - submitCnicVerification()  → submit CNIC / passport document
 *  - getVerificationStatus()   → check current verification state
 */
import { apiRequest } from './client';

export type VerificationType =
  | 'SELFIE_LIVENESS'
  | 'GOVERNMENT_ID'
  | 'FAMILY'
  | 'SCHOLAR_REFERENCE';
/**
 * Uppercase to match the server's enum, and `EXPIRED` is a real value it
 * returns — the lowercase union here never matched a single response.
 */
export type VerificationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

export interface VerificationRecord {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  createdAt: string;
}

/** Submit a face scan verification. Evidence upload is a later pass. */
export async function submitFaceVerification(): Promise<VerificationRecord> {
  return apiRequest<VerificationRecord>('/verifications', {
    method: 'POST',
    body: JSON.stringify({ type: 'SELFIE_LIVENESS' }),
  });
}

/** Submit a CNIC / passport document. Evidence upload is a later pass. */
export async function submitCnicVerification(): Promise<VerificationRecord> {
  return apiRequest<VerificationRecord>('/verifications', {
    method: 'POST',
    body: JSON.stringify({ type: 'GOVERNMENT_ID' }),
  });
}

/** Get all verifications for the current user. */
export async function getVerificationStatus(): Promise<VerificationRecord[]> {
  return apiRequest<VerificationRecord[]>('/verifications');
}
