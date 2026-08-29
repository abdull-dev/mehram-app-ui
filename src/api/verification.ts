/**
 * Verification API
 *
 * F16 VerificationScreen:
 *  - submitFaceVerification()  → submit face scan result
 *  - submitCnicVerification()  → submit CNIC / passport document
 *  - getVerificationStatus()   → check current verification state
 */
import { apiRequest } from './client';

export type VerificationType = 'face' | 'cnic';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationRecord {
  id: string;
  type: VerificationType;
  status: VerificationStatus;
  createdAt: string;
}

/**
 * Submit a face scan verification.
 * Pass the scan data / image URI returned by your face-scan SDK.
 */
export async function submitFaceVerification(
  scanData: string,
): Promise<VerificationRecord> {
  return apiRequest<VerificationRecord>('/verifications', {
    method: 'POST',
    body: JSON.stringify({ type: 'face', scanData }),
  });
}

/**
 * Submit a CNIC / passport document.
 * Pass the document image URI or a base64 string.
 */
export async function submitCnicVerification(
  documentUri: string,
): Promise<VerificationRecord> {
  return apiRequest<VerificationRecord>('/verifications', {
    method: 'POST',
    body: JSON.stringify({ type: 'cnic', documentUri }),
  });
}

/** Get all verifications for the current user. */
export async function getVerificationStatus(): Promise<VerificationRecord[]> {
  return apiRequest<VerificationRecord[]>('/verifications');
}
