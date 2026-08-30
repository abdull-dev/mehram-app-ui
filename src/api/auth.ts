/**
 * Auth API — phone-based OTP flow
 *
 * Flow:
 *  1. sendOtp(phone)          → triggers SMS to phone
 *  2. verifyOtp(phone, otp)   → validates code, returns tokens + user
 *  3. resendOtp(phone)        → re-sends SMS when timer expires
 *
 * Wali flow:
 *  - verifyInviteCode(code)   → wali submits 6-character invite code
 */
import { apiRequest } from './client';
import { API_BASE_URL } from './config';
import { saveTokens, clearTokens } from '../storage/authStorage';

// ─── types ────────────────────────────────────────────────────────────────────

/** Shape returned by GET /auth/me */
export interface MeResponse {
  user: {
    id: string;
    email: string;
    role: string;
    authProvider: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  profile: {
    fullName: string;
    phone: string | null;
    language: string | null;
    onboardingCompleted: boolean;
    onboardingStep: number;
  };
  /** Populated for wali users — contains their linked dependent's basic profile. */
  family: {
    dependentUserId?: string;
    dependentName?: string;
    dependentAge?: number;
    dependentCity?: string;
    dependentSect?: string;
    dependentEducationLevel?: string;
    dependentOccupation?: string;
    dependentBio?: string;
    dependentOnboardingCompleted?: boolean;
    dependentIdVerified?: boolean;
    memberSince?: string;
  } | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    authProvider: string;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  profile: {
    fullName: string;
    phone: string | null;
    language: string;
    onboardingCompleted: boolean;
  };
  session: AuthSession;
}

// ─── phone OTP ────────────────────────────────────────────────────────────────

/** Send a 6-digit OTP to the given phone number via SMS. */
export async function sendOtp(phone: string): Promise<void> {
  return apiRequest('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

/**
 * Verify the OTP received via SMS.
 * On success, tokens are persisted to secure storage.
 */
export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/verify-phone-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

/** Re-send the OTP — called when the countdown reaches zero. */
export async function resendOtp(phone: string): Promise<void> {
  return apiRequest('/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

// ─── session ──────────────────────────────────────────────────────────────────

/** Fetch the current user from the server (for session restore on app open). */
export async function getMe(): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me');
}

/** Persist the furthest onboarding screen (0–40) so the app can resume after a restart. */
export async function saveOnboardingStep(step: number): Promise<void> {
  return apiRequest('/auth/onboarding-step', {
    method: 'PATCH',
    body: JSON.stringify({ step }),
  });
}

/** Log out and clear stored tokens. */
export async function logout(): Promise<void> {
  await apiRequest('/auth/logout', { method: 'POST' });
  await clearTokens();
}

/** Refresh the access token using the stored refresh token. */
export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

// ─── wali registration ────────────────────────────────────────────────────────

// ─── wali invite redemption ───────────────────────────────────────────────────

/**
 * Validates the invite code and registers the wali account in one step.
 * On success, tokens are persisted to secure storage.
 */
export async function verifyInviteCode(
  inviteCode: string,
  credentials: { email: string; password: string; fullName: string },
): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/parent/redeem', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, ...credentials }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

// ─── email+password registration ─────────────────────────────────────────────

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;   // E.164
  password: string;
}

interface PendingConfirmation {
  status: 'pending_confirmation';
  email: string;
}

/** Register with email + password. Backend sends email OTP. */
export async function registerUser(payload: RegisterPayload): Promise<PendingConfirmation> {
  return apiRequest<PendingConfirmation>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Verify the 6-digit email OTP. Returns auth tokens on success. */
export async function verifyEmailOtp(email: string, otp: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

/** Resend the email OTP. */
export async function resendEmailOtp(email: string): Promise<void> {
  return apiRequest('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Verify phone OTP inline without creating an account. */
export async function verifyPhoneOnly(phone: string, otp: string): Promise<{ verified: true }> {
  return apiRequest<{ verified: true }>('/auth/verify-phone-only', {
    method: 'POST',
    body: JSON.stringify({ phone, otp }),
  });
}

// ─── email+password sign-in ───────────────────────────────────────────────────

/** Sign in with email + password. Tokens are persisted on success.
 *  Uses raw fetch (not apiRequest) to avoid the 401-refresh middleware
 *  misinterpreting wrong-credentials as "Session expired". */
export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = (body as any)?.message ?? (body as any)?.error ?? 'Invalid credentials. Please try again.';
    throw new Error(Array.isArray(msg) ? msg.join('; ') : msg);
  }
  const result = body as AuthResponse;
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}
