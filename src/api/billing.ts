/**
 * Billing API
 *
 * F17 PaymentScreen:
 *  - verifyPurchase()    → verify in-app purchase receipt, activates membership
 *  - getEntitlement()    → check if the user has paid access (for HomeScreen gating)
 */
import { Platform } from 'react-native';
import { apiRequest } from './client';

export type PurchaseSource = 'ios_iap' | 'android_iap' | 'card' | 'local_wallet';

/** The store source matching the platform this build runs on. */
export const PLATFORM_PURCHASE_SOURCE: PurchaseSource =
  Platform.OS === 'android' ? 'android_iap' : 'ios_iap';

/** Play Console / App Store product id for the one-off membership. */
export const MEMBERSHIP_PRODUCT_ID = 'mehram_membership';

export interface EntitlementResponse {
  isEntitled: boolean;
}

/**
 * POST /billing/verify-purchase currently answers with the raw Subscription
 * row it wrote; the backend is switching it to `{ isEntitled, plan, expiresAt }`.
 * Both shapes are accepted here so the app keeps working across that deploy.
 */
interface VerifyPurchaseResponse {
  isEntitled?: boolean;
  plan?: string | null;
  expiresAt?: string | null;
  status?: string;
}

export interface PurchaseResponse {
  isEntitled: boolean;
  plan: string | null;
  expiresAt: string | null;
}

/**
 * Verify a completed in-app purchase with the server.
 *
 * The body is exactly what VerifyPurchaseDto validates:
 *   purchaseToken  non-empty, ≤1024 chars — the Play/App Store token
 *   productId      non-empty, ≤255 chars
 *   source         optional, one of PurchaseSource
 * An empty purchaseToken is a 400, so it is rejected here rather than sent.
 *
 * The token is unique across users server-side: one that already belongs to
 * someone else is refused, so it must be the token the store actually issued
 * for this purchase, never a fixed string.
 */
export async function verifyPurchase(
  purchaseToken: string,
  productId: string = MEMBERSHIP_PRODUCT_ID,
  source: PurchaseSource = PLATFORM_PURCHASE_SOURCE,
): Promise<PurchaseResponse> {
  if (!purchaseToken) {
    throw new Error('verifyPurchase: purchaseToken is required');
  }
  const res = await apiRequest<VerifyPurchaseResponse>('/billing/verify-purchase', {
    method: 'POST',
    body: JSON.stringify({ purchaseToken, productId, source }),
  });

  if (typeof res?.isEntitled === 'boolean') {
    return {
      isEntitled: res.isEntitled,
      plan: res.plan ?? null,
      expiresAt: res.expiresAt ?? null,
    };
  }

  // Older shape: the Subscription row. Its `status` is the legacy subscription
  // coupling the backend is removing, so ask the entitlement endpoint — the one
  // authority on paid access — instead of reading it. A 2xx above already means
  // the token verified, so this only resolves *what it granted*.
  const { isEntitled } = await getEntitlement();
  return {
    isEntitled,
    plan: res?.plan ?? null,
    expiresAt: res?.expiresAt ?? null,
  };
}

/**
 * Check whether the current user is entitled (has paid access).
 * Used by HomeScreen to decide which state block to show.
 */
export async function getEntitlement(): Promise<EntitlementResponse> {
  return apiRequest<EntitlementResponse>('/billing/entitlement');
}
