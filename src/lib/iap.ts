/**
 * Google Play Billing bridge.
 *
 * The only file in the app that imports `react-native-iap`. Everything else
 * talks to these functions, which is what keeps the native dependency swappable
 * and lets the Jest suite mock one module instead of a native library.
 *
 * The division of labour with the server matters and is easy to get wrong:
 * Play takes the money and issues a `purchaseToken` here on the device; the
 * server calls Google separately to decide whether to believe that token, and
 * acknowledges it. This file never decides whether a purchase is valid — it
 * only obtains the proof and hands it over.
 */
import { Platform } from 'react-native';
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { MEMBERSHIP_PRODUCT_ID } from '../api/billing';

/**
 * A purchase as the store reported it, re-exported so callers can name the type
 * without importing `react-native-iap` themselves — which would put the library
 * back on App.tsx's import graph and undo the single-mock-point above.
 */
export type StorePurchaseRecord = Purchase;

/** Play Billing is Android-only; every entry point no-ops elsewhere. */
const SUPPORTED = Platform.OS === 'android';

/**
 * How long to wait for Play to report the outcome of a purchase.
 *
 * Generous on purpose: the sheet can sit open through card entry and a bank
 * OTP. It exists only so the flow cannot hang forever if neither listener ever
 * fires — a service disconnect while the sheet is open, say. A purchase that
 * completes after this gives up is not lost; the restore pass collects it.
 */
const PURCHASE_TIMEOUT_MS = 10 * 60 * 1000;

let connected = false;

/**
 * Open the billing connection, retrying if a previous attempt failed.
 *
 * Every entry point goes through this rather than trusting `connected`. A first
 * attempt can fail for reasons that pass — Play Store mid-update, Play Services
 * restarting — and a flag latched to false at launch would otherwise disable
 * purchasing for the rest of the session with no way back.
 */
async function ensureConnected(): Promise<boolean> {
  if (!SUPPORTED) return false;
  if (connected) return true;
  try {
    connected = await initConnection();
  } catch {
    connected = false;
  }
  return connected;
}

/**
 * Warm the billing connection at launch.
 *
 * Never throws: a device with no Play Services, or a build sideloaded outside
 * Play, simply has no billing. That must not take the app down on launch, so
 * the failure surfaces later at the one place the user asked for a purchase.
 *
 * There is deliberately no `endIap`. Play's client is meant to stay connected
 * for the life of the process, and tearing it down on a screen or auth change
 * would only break the next purchase.
 */
export function initIap(): Promise<boolean> {
  return ensureConnected();
}

/**
 * Google's own localised price for the membership, e.g. "Rs 4,500.00".
 *
 * Deliberately the pre-formatted `displayPrice` string rather than the numeric
 * `price`: the currency, symbol placement and separators differ per region and
 * Google has already done that work. Returns null if the product cannot be
 * read, so callers can fall back rather than render an empty price.
 */
export async function getMembershipPrice(): Promise<string | null> {
  if (!(await ensureConnected())) return null;
  try {
    const products = await fetchProducts({
      skus: [MEMBERSHIP_PRODUCT_ID],
      type: 'in-app',
    });
    const product = products?.find(p => p.id === MEMBERSHIP_PRODUCT_ID);
    return product?.displayPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Launch Play's purchase sheet and resolve with the purchase it creates.
 *
 * `requestPurchase` is event-based — the result arrives through the listeners,
 * not the returned promise — so this wraps both into one awaitable call and
 * guarantees the listeners are removed on every path.
 *
 * `obfuscatedAccountId` binds the purchase to the app account. The server reads
 * it back as `externalAccountId`; it currently logs a mismatch rather than
 * refusing, but it cannot start enforcing until the client actually sets it.
 */
export async function buyMembership(appUserId: string): Promise<Purchase> {
  // Not a formality: if the launch-time connection failed, `requestPurchase`
  // throws a raw "not prepared" error instead of retrying.
  if (!(await ensureConnected())) {
    throw new Error('Google Play is unavailable on this device right now');
  }

  // Tokens Play is already holding before this flow starts. The purchase
  // listener also receives these when Play flushes its queue, and a redelivered
  // membership carries the SAME productId as the one being bought — so matching
  // on product alone would let `buyMembership` resolve with an old purchase and
  // its stale token. Identity is the token; nothing else distinguishes them.
  const preExisting = new Set(
    (await getUnfinishedPurchases()).map(p => p.purchaseToken),
  );

  return new Promise<Purchase>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      updateSub.remove();
      errorSub.remove();
    };

    const succeed = (purchase: Purchase) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(purchase);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const timer = setTimeout(() => {
      fail(
        new Error(
          'Google Play did not confirm the purchase. If you were charged, ' +
            'reopen the app and your membership will be restored.',
        ),
      );
    }, PURCHASE_TIMEOUT_MS);

    const updateSub = purchaseUpdatedListener(purchase => {
      if (purchase.productId !== MEMBERSHIP_PRODUCT_ID) return;
      // A purchase Play was already holding — not the one being made now.
      // Left in the queue for the restore pass to deal with.
      if (purchase.purchaseToken && preExisting.has(purchase.purchaseToken)) {
        return;
      }

      // 'pending' is a deferred payment method — the money has not moved and
      // Google will reject the token. Failing here is clearer than letting the
      // server return an opaque "could not be verified".
      if (purchase.purchaseState === 'pending') {
        fail(
          new Error(
            'Your payment is still being processed. You will get access once it completes.',
          ),
        );
        return;
      }

      succeed(purchase);
    });

    const errorSub = purchaseErrorListener((error: PurchaseError) => {
      fail(toPurchaseError(error));
    });

    requestPurchase({
      request: {
        google: {
          skus: [MEMBERSHIP_PRODUCT_ID],
          obfuscatedAccountId: appUserId,
        },
      },
      type: 'in-app',
    }).catch((error: unknown) => {
      fail(error instanceof Error ? error : new Error(String(error)));
    });
  });
}

/**
 * Tell Play we are done with the purchase.
 *
 * The server acknowledges independently — it is the party that survives the app
 * being killed mid-purchase, and Google auto-refunds anything unacknowledged
 * after three days. This call does something different and still necessary: it
 * clears the purchase from Play's local queue on the device. Skip it and the
 * purchase is redelivered on every launch.
 *
 * `isConsumable: false` because the membership is a permanent, one-time
 * entitlement — consuming it would let the same account buy it again.
 *
 * Errors are swallowed by design: the server has usually acknowledged already,
 * so this second call routinely fails, and that is not a failed purchase.
 */
export async function finishMembershipPurchase(
  purchase: Purchase,
): Promise<void> {
  if (!SUPPORTED) return;
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch {
    // Already acknowledged, or Play is unreachable. Neither is actionable.
  }
}

/**
 * Purchases Play is still holding that were never finished — an app killed
 * mid-flow, or a verify call that failed. Re-posting these is what stops Google
 * refunding a real payment after three days, and is also what restores a
 * membership after a reinstall.
 *
 * Excludes `pending`, which `getAvailablePurchases` includes: a deferred payment
 * has moved no money, so the server will refuse it, so it is never finished, so
 * it stays in this list — one pointless verify request per foreground, forever.
 * It becomes 'purchased' on its own if the payment clears.
 */
export async function getUnfinishedPurchases(): Promise<Purchase[]> {
  if (!(await ensureConnected())) return [];
  try {
    const purchases = await getAvailablePurchases();
    return (purchases ?? []).filter(
      p =>
        p.productId === MEMBERSHIP_PRODUCT_ID &&
        !!p.purchaseToken &&
        p.purchaseState === 'purchased',
    );
  } catch {
    return [];
  }
}

/**
 * Whether the user backed out of Play's sheet. Cancelling is not a failure —
 * it must leave the paywall exactly as it was, not show an error or navigate
 * away, so callers need to tell it apart from a genuine problem.
 */
export function isUserCancelled(error: unknown): boolean {
  return codeOf(error) === ErrorCode.UserCancelled;
}

/**
 * Play refusing a second purchase because this account already owns the item.
 *
 * Means the user has paid and the purchase was never finished — so the answer is
 * to restore it, never to ask them to buy again. Without this the paywall is a
 * dead end: they are told "you already own this" and offered only the button
 * that produced it.
 */
export function isAlreadyOwned(error: unknown): boolean {
  return codeOf(error) === ErrorCode.AlreadyOwned;
}

function codeOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** A PurchaseError carrying its code, so the predicates above still work. */
function toPurchaseError(error: PurchaseError): Error {
  const wrapped = new Error(
    error.message || 'The purchase could not be completed',
  );
  (wrapped as Error & { code?: string }).code = error.code;
  return wrapped;
}
