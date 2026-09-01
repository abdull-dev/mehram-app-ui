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

/**
 * A store failure with something worth telling the user.
 *
 * The paywall used to render one sentence — "Could not complete the purchase.
 * Please try again." — for every non-`ApiError` thrown out of here, which threw
 * away the three cases this file works out precisely and where the generic
 * advice is actively wrong:
 *
 *   - A deferred payment is *being processed*. Retrying starts a second
 *     purchase attempt for money the user has already committed.
 *   - A purchase Play never confirmed may have been charged. "Try again" invites
 *     a double payment where the honest answer is that a restore will catch it.
 *   - A device with no Play Billing cannot buy anything, ever. Retrying is the
 *     one thing guaranteed not to work.
 *
 * `retryable` says whether pressing the button again could plausibly change the
 * outcome, so the caller can offer a retry only where one makes sense.
 */
export class StoreError extends Error {
  constructor(
    /** Shown to the user verbatim. Written for them, not for a log. */
    readonly userMessage: string,
    readonly retryable: boolean,
    /**
     * The store's own code, carried through.
     *
     * Not decoration: `isUserCancelled` and `isAlreadyOwned` read it, and the
     * caller checks both *before* showing any message. Dropping it here would
     * make backing out of Play's sheet render an error, and would send a user
     * who already owns the membership to a retry instead of a restore.
     */
    readonly code?: string,
  ) {
    super(userMessage);
    this.name = 'StoreError';
  }
}

export function isStoreError(error: unknown): error is StoreError {
  return error instanceof StoreError;
}

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

/** How long to leave the restore pass alone after it fails. See below. */
const QUERY_BACKOFF_MS = 5 * 60 * 1000;

let connected = false;
/** 0 when the last purchase query succeeded, otherwise when it failed. */
let lastQueryFailureAt = 0;

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
 * Notice that Play hung up, so the next call reconnects instead of trusting a
 * stale flag.
 *
 * Play's billing client disconnects on its own — the Store updating itself, the
 * service being reclaimed while the app is backgrounded — and it does not tell
 * us; we only find out from the error on the next call. Without this,
 * `connected` stays true forever after the first successful connect and every
 * subsequent billing call fails for the rest of the session, which is the exact
 * failure `ensureConnected` exists to avoid.
 */
function noteConnectionState(error: unknown): void {
  const code = codeOf(error);
  if (
    code === ErrorCode.ServiceDisconnected ||
    code === ErrorCode.NotPrepared
  ) {
    connected = false;
  }
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
  } catch (error) {
    noteConnectionState(error);
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
    throw new StoreError(
      SUPPORTED
        ? 'Google Play is not responding on this device. Check that the Play ' +
            'Store is up to date, then try again.'
        : 'In-app purchase is not available on this device.',
      // Where Play exists at all this is usually transient — the Store mid-
      // update, or Play Services restarting. Where it does not, nothing the
      // user does here will help.
      SUPPORTED,
      SUPPORTED ? ErrorCode.NotPrepared : ErrorCode.IapNotAvailable,
    );
  }

  // Tokens Play is already holding before this flow starts. The purchase
  // listener also receives these when Play flushes its queue, and a redelivered
  // membership carries the SAME productId as the one being bought — so matching
  // on product alone would let `buyMembership` resolve with an old purchase and
  // its stale token. Identity is the token; nothing else distinguishes them.
  const preExisting = new Set(
    (await queryPurchases()).map(p => p.purchaseToken),
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
        new StoreError(
          'Google Play did not confirm the purchase. If you were charged, ' +
            'reopen the app and your membership will be restored.',
          // Not retryable: the money may already have moved, and the restore
          // pass is what recovers it. Another purchase attempt is the wrong
          // next step.
          false,
          ErrorCode.ServiceTimeout,
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
          new StoreError(
            'Your payment is still being processed. You will get access as ' +
              'soon as it completes — there is nothing more to do.',
            false,
            ErrorCode.DeferredPayment,
          ),
        );
        return;
      }

      succeed(purchase);
    });

    const errorSub = purchaseErrorListener((error: PurchaseError) => {
      noteConnectionState(error);
      fail(classifyForDisplay(error));
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
      noteConnectionState(error);
      // `requestPurchase` rejects instead of emitting when Play refuses the
      // request outright — a missing product or a misconfigured build shows up
      // here, not in the listener above.
      fail(classifyForDisplay(error));
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
  // Backs off after a failure instead of retrying on every single foreground.
  //
  // Two reasons. The library's own logger calls `console.error` unconditionally
  // — there is no flag to silence it — so a Play service that keeps refusing
  // puts a red box on screen every time the app is foregrounded, which buries
  // real errors during development. And where billing simply cannot work (an
  // emulator, a build installed outside Play) retrying forever achieves nothing.
  //
  // Backing off is safe: the window this protects is Google's three-day
  // auto-refund of unacknowledged purchases, so retrying minutes later rather
  // than seconds later costs nothing. A success clears the backoff immediately.
  if (Date.now() - lastQueryFailureAt < QUERY_BACKOFF_MS) return [];
  return queryPurchases();
}

/**
 * The same query with no backoff, for when the user is waiting on the answer.
 *
 * `buyMembership` must not be governed by the backoff: it uses this to learn
 * which tokens Play already holds, and silently substituting an empty list would
 * drop the protection against resolving with a redelivered purchase — at the one
 * moment correctness matters more than log noise.
 */
async function queryPurchases(): Promise<Purchase[]> {
  if (!(await ensureConnected())) {
    lastQueryFailureAt = Date.now();
    return [];
  }
  try {
    const purchases = await getAvailablePurchases();
    lastQueryFailureAt = 0;
    return (purchases ?? []).filter(
      p =>
        p.productId === MEMBERSHIP_PRODUCT_ID &&
        !!p.purchaseToken &&
        p.purchaseState === 'purchased',
    );
  } catch (error) {
    noteConnectionState(error);
    lastQueryFailureAt = Date.now();
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

/**
 * Turn a store error code into something the user — or, in a dev build, the
 * developer — can act on.
 *
 * Every code except cancel and already-owned used to arrive at the paywall as
 * one sentence, which is why "still cannot pay" had no next step: the three
 * setup failures below are indistinguishable from a flat network blip once the
 * code is thrown away, and they need completely different fixes.
 *
 * `retryable` is false wherever pressing the button again cannot change the
 * outcome — a missing product or a misconfigured build stays missing.
 */
function classify(error: unknown): StoreError {
  const code = codeOf(error);

  switch (code) {
    // Play cannot see the product. In practice: the id does not match Play
    // Console, the product is not Active, or this build is not on a track Play
    // will serve products for.
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
    case ErrorCode.QueryProduct:
    case ErrorCode.SkuOfferMismatch:
      return new StoreError(
        'This build cannot take payments yet — Google Play does not recognise ' +
          'the membership product.',
        false,
        code,
      );

    // Play's catch-all for a mismatch between the app and the Console entry:
    // signing key, package name, or a product that belongs to another app.
    case ErrorCode.DeveloperError:
      return new StoreError(
        'This build is not set up for payments. Install the app from Google ' +
          'Play to buy a membership.',
        false,
        code,
      );

    // No Play Billing on the device at all — an emulator without Play
    // Services, a sideloaded APK, or a Play Store too old to serve billing.
    case ErrorCode.BillingUnavailable:
    case ErrorCode.IapNotAvailable:
    case ErrorCode.FeatureNotSupported:
    case ErrorCode.ActivityUnavailable:
      return new StoreError(
        'Google Play billing is not available on this device, so a membership ' +
          'cannot be bought here.',
        false,
        code,
      );

    // The money has not moved and Google will refuse the token, so this is not
    // a purchase to retry — it completes on its own.
    case ErrorCode.DeferredPayment:
    case ErrorCode.Pending:
      return new StoreError(
        'Your payment is still being processed. You will get access as soon ' +
          'as it completes — there is nothing more to do.',
        false,
        code,
      );

    // Play is there but did not answer. These genuinely do pass.
    case ErrorCode.NetworkError:
    case ErrorCode.ServiceError:
    case ErrorCode.ServiceTimeout:
    case ErrorCode.ServiceDisconnected:
    case ErrorCode.ConnectionClosed:
    case ErrorCode.RemoteError:
    case ErrorCode.InitConnection:
    case ErrorCode.NotPrepared:
    case ErrorCode.Interrupted:
      return new StoreError(
        'Google Play did not respond. Check your connection and try again.',
        true,
        code,
      );

    default:
      return new StoreError(
        'The membership did not activate. If you were charged, reopen the app ' +
          'in a moment and it will be restored.',
        true,
        code,
      );
  }
}

/**
 * The same, with the raw code attached in a dev build.
 *
 * The classified sentences above are written for a user and deliberately do not
 * name Play's code — but during development that code is the whole diagnosis,
 * and reading it off a device's logcat while testing a purchase flow is slow.
 * `__DEV__` is false in every release build, so this never reaches a user.
 */
function classifyForDisplay(error: unknown): StoreError {
  const classified = classify(error);
  if (!__DEV__) return classified;

  const code = codeOf(error) ?? 'no-code';
  const detail = (error as { message?: string } | null)?.message;
  return new StoreError(
    `${classified.userMessage}\n\n[dev] ${code}${detail ? `: ${detail}` : ''}`,
    classified.retryable,
    classified.code,
  );
}

function codeOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

