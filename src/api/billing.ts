/**
 * Billing API
 *
 * F17 PaymentScreen:
 *  - verifyPurchase()    → verify in-app purchase receipt, activates membership
 *  - getEntitlement()    → check if the user has paid access (for HomeScreen gating)
 */
import { apiRequest } from './client';

export type StorePlatform = 'ios' | 'android';

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
 * @param receipt    The receipt string from the App Store / Play Store.
 * @param platform   'ios' | 'android'
 * @param productId  The product ID purchased (e.g. 'mehram_membership_pkr4000').
 */
export async function verifyPurchase(
  receipt: string,
  platform: StorePlatform,
  productId: string,
): Promise<PurchaseResponse> {
  return apiRequest<PurchaseResponse>('/billing/verify-purchase', {
    method: 'POST',
    body: JSON.stringify({ receipt, platform, productId }),
  });
}

/**
 * Check whether the current user is entitled (has paid access).
 * Used by HomeScreen to decide which state block to show.
 */
export async function getEntitlement(): Promise<EntitlementResponse> {
  return apiRequest<EntitlementResponse>('/billing/entitlement');
}
