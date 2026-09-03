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
import { ApiError, apiRequest, PROVIDER_TIMEOUT_MS } from './client';
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
    timeoutMs: PROVIDER_TIMEOUT_MS,
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
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ phone, otp }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

/** Re-send the OTP — called when the countdown reaches zero. */
export async function resendOtp(phone: string): Promise<void> {
  return apiRequest('/auth/resend-otp', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
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
 *
 * Two possible outcomes, and the caller must handle both. With email
 * confirmation on (the default), Supabase creates an *unconfirmed* identity and
 * emails a code, so the response is `pending_confirmation` and carries no
 * session — the wali finishes on WaliEmailVerify. With it off, a session comes
 * back immediately and is persisted here.
 *
 * Reading `result.session` unconditionally is what used to crash this flow.
 */
export async function verifyInviteCode(
  inviteCode: string,
  credentials: { email: string; password: string; fullName: string },
): Promise<AuthResponse | PendingConfirmation> {
  const result = await apiRequest<AuthResponse | PendingConfirmation>('/auth/parent/redeem', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ inviteCode, ...credentials }),
  });
  if (isPendingConfirmation(result)) return result;
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

/** Narrows a redeem/register result to the "check your email" branch. */
export function isPendingConfirmation(
  result: AuthResponse | PendingConfirmation,
): result is PendingConfirmation {
  return (result as PendingConfirmation).status === 'pending_confirmation';
}

// ─── email+password registration ─────────────────────────────────────────────

interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;   // E.164
  password: string;
}

/** Returned when the account exists but its email is not confirmed yet. */
export interface PendingConfirmation {
  status: 'pending_confirmation';
  email: string;
  /**
   * The number the account was registered with. Echoed back because no local
   * profile exists to read it from until the email is confirmed, and the
   * verification screen needs it to show the phone row at all.
   */
  phone: string | null;
}

/** Register with email + password. Backend sends email OTP. */
export async function registerUser(payload: RegisterPayload): Promise<PendingConfirmation> {
  return apiRequest<PendingConfirmation>('/auth/register', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify(payload),
  });
}

/** Verify the 6-digit email OTP. Returns auth tokens on success. */
export async function verifyEmailOtp(email: string, otp: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/auth/verify-otp', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ email, otp }),
  });
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

/** Resend the email OTP. */
export async function resendEmailOtp(email: string): Promise<void> {
  return apiRequest('/auth/resend-verification', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ email }),
  });
}

/**
 * Verification state for a signup that has not been confirmed yet.
 *
 * The two verifications leave different evidence — confirming the email mints a
 * session, verifying the phone does not — so between them there is no token and
 * /auth/me cannot answer. This is the durable source for both.
 */
export async function getPendingStatus(email: string): Promise<{
  emailVerified: boolean;
  phoneVerified: boolean;
  phone: string | null;
}> {
  return apiRequest(
    `/auth/pending-status?email=${encodeURIComponent(email)}`,
  );
}

/**
 * Whether a `getPendingStatus` rejection actually means "this address has no
 * unconfirmed signup" — it is confirmed already, or was never registered.
 *
 * Only the endpoint's deliberate 400 says that. Every other failure says
 * nothing about the address at all: offline, a timeout, the per-IP rate limiter
 * (20/min), a 5xx, an API too old to carry the route. Reading those the same way
 * meant a backend that was merely unreachable answered every brand-new signup
 * with "you already have an account. This email is verified" and sent the user
 * off to sign in to an account that did not exist.
 *
 * The web client draws the same line — it renders the verification screen with
 * unverified defaults for any failure rather than refusing it.
 */
export function meansNoPendingSignup(error: unknown): boolean {
  return error instanceof ApiError && error.status === 400;
}

/**
 * Correct the email and/or phone on a signup that has not been confirmed yet.
 *
 * Not a re-register: re-registering needs the password, which the client no
 * longer holds after a reload or a restored pending signup. The server edits
 * the pending identity in place and re-sends the code when the address moves.
 */
export async function updatePendingContact(payload: {
  currentEmail: string;
  email?: string;
  phone?: string;
}): Promise<PendingConfirmation> {
  return apiRequest<PendingConfirmation>('/auth/pending-contact', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify(payload),
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
export async function login(
  payload: { email: string; password: string },
): Promise<AuthResponse | PendingConfirmation> {
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
  // An unconfirmed address signs in to the verification screen rather than to a
  // session: Supabase issues no token until the email is confirmed, so there is
  // nothing to persist here.
  if (isPendingConfirmation(body as AuthResponse | PendingConfirmation)) {
    return body as PendingConfirmation;
  }
  const result = body as AuthResponse;
  await saveTokens(result.session.accessToken, result.session.refreshToken);
  return result;
}

// ─── password recovery ────────────────────────────────────────────────────────
//
// Two routes to the same outcome, because the app collects both a phone and an
// email at signup and a user may have lost access to either.
//
//   email  →  forgotPassword()        sends a Supabase recovery OTP
//             resetPassword()         verifies it and sets the password
//   phone  →  sendOtp()               reuses the signup SMS OTP
//             resetPasswordByPhone()  verifies it and sets the password

/** Sends a recovery code to the address, if an account has it. */
export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<void>('/auth/forgot-password', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ email }),
  });
}

/** Completes the email route. Throws on a wrong or expired code. */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<void>('/auth/reset-password', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ email, otp, newPassword }),
  });
}

/**
 * Completes the phone route.
 *
 * The code comes from `sendOtp`, the same one signup uses — there is no
 * separate "recovery" SMS, so the send step is shared.
 */
export async function resetPasswordByPhone(
  phone: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  await apiRequest<void>('/auth/reset-password-phone', {
    method: 'POST',
    timeoutMs: PROVIDER_TIMEOUT_MS,
    body: JSON.stringify({ phone, otp, newPassword }),
  });
}
