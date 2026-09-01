/**
 * `react-native-iap` for the web.
 *
 * There is no store billing in a browser, so this reports "no products, no
 * purchases" rather than pretending. Every call site already handles an empty
 * store — that is the path a device with Play Services unavailable takes — so
 * the app runs and the payment step is the one thing that cannot complete here.
 * A web checkout is a separate piece of work, not something a shim can fake.
 */

export const ErrorCode = {
  Unknown: "unknown",
  UserCancelled: "user-cancelled",
  ItemUnavailable: "item-unavailable",
  ServiceError: "service-error",
  NotPrepared: "not-prepared",
} as const;

export interface Purchase {
  id?: string;
  productId: string;
  transactionId?: string;
  purchaseToken?: string;
  transactionDate?: number;
  platform?: string;
}

export interface PurchaseError {
  code: string;
  message: string;
}

interface Subscription {
  remove(): void;
}

const NOOP_SUBSCRIPTION: Subscription = { remove() {} };

/** Resolves false: nothing to connect to. */
export async function initConnection(): Promise<boolean> {
  return false;
}

export async function endConnection(): Promise<void> {}

export async function fetchProducts(): Promise<never[]> {
  return [];
}

export async function getAvailablePurchases(): Promise<Purchase[]> {
  return [];
}

export async function finishTransaction(): Promise<void> {}

export async function requestPurchase(): Promise<never> {
  throw Object.assign(
    new Error("In-app purchases are not available in a browser."),
    { code: ErrorCode.ServiceError },
  );
}

export function purchaseUpdatedListener(): Subscription {
  return NOOP_SUBSCRIPTION;
}

export function purchaseErrorListener(): Subscription {
  return NOOP_SUBSCRIPTION;
}
