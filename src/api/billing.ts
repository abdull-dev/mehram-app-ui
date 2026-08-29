/**
 * Billing API
 *
 * F17 PaymentScreen:
 *  - verifyPurchase()    → verify in-app purchase receipt, activates membership
 *  - getEntitlement()    → check if the user has paid access (for HomeScreen gating)
 */
import { apiRequest } from './client';

export type PurchaseSource = 'ios_iap' | 'android_iap' | 'card' | 'local_wallet';

export interface EntitlementResponse {
  isEntitled: boolean;
}

export interface PurchaseResponse {
  isEntitled: boolean;
  plan: string | null;
}

/**
 * Verify a completed in-app purchase with the server.
 *
 * @param purchaseToken  Store receipt / purchase token.
 * @param productId      The product ID purchased (e.g. 'mehram_membership_pkr4000').
 * @param source         'ios_iap' | 'android_iap' | …
 */
export async function verifyPurchase(
  purchaseToken: string,
  productId: string,
  source: PurchaseSource = 'ios_iap',
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>('/billing/verify-purchase', {
    method: 'POST',
    body: JSON.stringify({ purchaseToken, productId, source }),
  });
}

/**
 * Check whether the current user is entitled (has paid access).
 * Used by HomeScreen to decide which state block to show.
 */
export async function getEntitlement(): Promise<EntitlementResponse> {
  return apiRequest<EntitlementResponse>('/billing/entitlement');
}
