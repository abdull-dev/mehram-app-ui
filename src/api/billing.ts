/**
 * Billing API
 *
 * F17 PaymentScreen:
 *  - verifyPurchase()    → verify a store purchase, activates membership
 *  - getEntitlement()    → check if the user has paid access (for HomeScreen gating)
 */
import { Platform } from 'react-native';
import { apiRequest } from './client';

/**
 * Who sold the purchase. This decides how the server verifies it, so the
 * payload below has to match: each provider proves a purchase differently.
 */
export type PaymentProvider = 'google_play' | 'apple_app_store' | 'stripe';

/**
 * Whether a store purchase can complete on this platform at all.
 *
 * Only Google Play has a verifier server-side. An `apple_app_store` purchase
 * passes validation and is then refused as unsupported, so there is nothing to
 * gain from sending one — and StoreKit's signed transaction is not a purchase
 * token, so it could not be sent in Play's shape anyway.
 */
export const STORE_PURCHASES_SUPPORTED = Platform.OS === 'android';

/** Play Console / App Store product id for the one-off membership. */
export const MEMBERSHIP_PRODUCT_ID = 'mehram_membership';

/**
 * A purchase to verify: who sold it, and the proof they issued for it.
 *
 * Provider and payload are one discriminated argument rather than two, because
 * they are not independent — Google Play gives a purchase token, Apple
 * StoreKit 2 gives a signed JWS transaction, which is not a token and does not
 * belong in a field called one. Pairing them makes a mismatch a compile error
 * instead of a 400 discovered at runtime.
 */
export type StorePurchase =
  | { provider: 'google_play'; payload: { purchaseToken: string } }
  | { provider: 'apple_app_store'; payload: { signedTransaction: string } }
  | { provider: 'stripe'; payload: { sessionId: string } };

export interface EntitlementResponse {
  isEntitled: boolean;
}

export interface PurchaseResponse {
  isEntitled: boolean;
  /** 'ONE_TIME' for the membership; a plan name for the legacy subscriptions. */
  plan: string | null;
  /** null for the membership — a one-time purchase does not expire. */
  expiresAt: string | null;
}

/**
 * Older builds of the server answered with the raw Subscription row, which has
 * no `isEntitled`. Tolerated so the app works either side of that deploy.
 */
interface VerifyPurchaseResponse {
  isEntitled?: boolean;
  plan?: string | null;
  expiresAt?: string | null;
}

/** The single proof value in a payload, whatever the provider calls it. */
function proofValue(purchase: StorePurchase): string {
  const [value] = Object.values(purchase.payload);
  return typeof value === 'string' ? value : '';
}

/**
 * Verify a completed store purchase with the server.
 *
 * The payload must carry what the store actually issued for *this* purchase —
 * the server records it against the buyer, so a value already seen on another
 * account is refused, and a fixed string would work exactly once.
 */
export async function verifyPurchase(
  purchase: StorePurchase,
  productId: string = MEMBERSHIP_PRODUCT_ID,
): Promise<PurchaseResponse> {
  // Refuse an empty proof here rather than letting the server decide. A real
  // verifier rejects it, but a host running the stub verifier (any non-production
  // deploy without Play credentials) accepts every token — including '' — and
  // would grant a permanent entitlement for a purchase that never happened.
  if (!proofValue(purchase)) {
    throw new Error('verifyPurchase: the store issued no proof of purchase');
  }

  const res = await apiRequest<VerifyPurchaseResponse>(
    '/billing/verify-purchase',
    {
      method: 'POST',
      body: JSON.stringify({ ...purchase, productId }),
    },
  );

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
  // the purchase verified, so this only resolves *what it granted*.
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

/**
 * Asks support to review a refund.
 *
 * The endpoint records the request and notifies an admin; it does not refund
 * money or revoke entitlement, both of which happen after dual approval. So the
 * app should tell the user it has been submitted, not that it is done.
 */
export async function requestRefund(): Promise<void> {
  await apiRequest<void>('/billing/request-refund', { method: 'POST' });
}
