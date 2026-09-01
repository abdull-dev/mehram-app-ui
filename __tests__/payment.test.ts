/**
 * The paywall's two dishonest moments.
 *
 * `iap.ts` works out precisely why a purchase failed and writes a sentence for
 * each case; the paywall replaced all of them with "Could not complete the
 * purchase. Please try again." So a payment that was still being processed, and
 * one that may already have been charged, both told the user to pay again — the
 * one instruction that risks paying twice.
 *
 * And the heading was the literal string "142 people are waiting", shown to
 * every user on the screen that asks them for money.
 */
// jest.setup.js mocks this module for the whole suite, so App.test.tsx can
// mount the app without a billing library. This file is testing the real thing.
jest.unmock('../src/lib/iap');

import {
  StoreError,
  isAlreadyOwned,
  isStoreError,
  isUserCancelled,
} from '../src/lib/iap';

jest.mock('react-native-iap', () => ({
  ErrorCode: {
    UserCancelled: 'user-cancelled',
    AlreadyOwned: 'already-owned',
    ServiceDisconnected: 'service-disconnected',
    NotPrepared: 'not-prepared',
  },
  fetchProducts: jest.fn(),
  finishTransaction: jest.fn(),
  getAvailablePurchases: jest.fn(),
  initConnection: jest.fn(),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  requestPurchase: jest.fn(),
}));

describe('StoreError', () => {
  it('carries a message meant for the user', () => {
    const err = new StoreError('Your payment is still being processed.', false);
    expect(isStoreError(err)).toBe(true);
    expect(err.userMessage).toBe('Your payment is still being processed.');
    // Also the Error message, so a log or a rethrow says the same thing.
    expect(err.message).toBe('Your payment is still being processed.');
  });

  it('says whether pressing the button again could help', () => {
    expect(new StoreError('Play is not responding.', true).retryable).toBe(true);
    expect(new StoreError('Payment is processing.', false).retryable).toBe(false);
  });

  it('is not mistaken for an ordinary failure', () => {
    expect(isStoreError(new Error('boom'))).toBe(false);
    expect(isStoreError(null)).toBe(false);
    expect(isStoreError('nope')).toBe(false);
  });
});

describe('the predicates the paywall branches on first', () => {
  // Both read the store's code off the thrown error. Classifying failures into
  // StoreError has to carry that code through, or backing out of Play's sheet
  // renders an error and a user who already owns the membership is sent to a
  // retry instead of a restore.
  it('still recognises a cancelled purchase', () => {
    expect(isUserCancelled(new StoreError('...', true, 'user-cancelled'))).toBe(true);
    expect(isUserCancelled(new StoreError('...', true, 'item-unavailable'))).toBe(false);
    expect(isUserCancelled(new StoreError('...', true))).toBe(false);
  });

  it('still recognises a membership this account already owns', () => {
    expect(isAlreadyOwned(new StoreError('...', false, 'already-owned'))).toBe(true);
    expect(isAlreadyOwned(new StoreError('...', false, 'developer-error'))).toBe(false);
  });

  it('reads a plain store error object too', () => {
    // Play's own error objects reach these before any wrapping.
    expect(isUserCancelled({ code: 'user-cancelled' })).toBe(true);
    expect(isAlreadyOwned({ code: 'already-owned' })).toBe(true);
    expect(isUserCancelled(new Error('no code'))).toBe(false);
  });
});

describe('paywall heading', () => {
  // Imported here rather than at the top: the screen pulls in the whole RN
  // component tree, and the StoreError tests above need none of it.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { headingFor } = require('../src/screens/onboarding/PaymentScreen');

  it('uses the count the server actually reported', () => {
    expect(headingFor(142)).toBe('142 people\nare waiting');
    expect(headingFor(7)).toBe('7 people\nare waiting');
  });

  it('invents no number when there is none', () => {
    // This is the bug: the heading was the literal string "142 people are
    // waiting" for every user, on the screen that asks them to pay.
    for (const value of [undefined, null]) {
      expect(headingFor(value)).not.toMatch(/\d/);
      expect(headingFor(value)).toBe('Your introductions\nstart here');
    }
  });

  it('does not argue against the membership it is selling', () => {
    // "0 people are waiting" makes the case not to buy, and "1 person is
    // waiting" undersells a membership that is not sold on today's pool.
    expect(headingFor(0)).not.toMatch(/\d/);
    expect(headingFor(1)).not.toMatch(/\d/);
    // Never the wrong plural, either.
    expect(headingFor(1)).not.toMatch(/1 people/);
  });
});

describe('the quoted price', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MEMBERSHIP_PRICE_FALLBACK, MEMBERSHIP_PRODUCT_ID } = require('../src/api/billing');

  it('falls back to the price the product is actually sold at', () => {
    // Must match MEMBERSHIP_PRODUCT_ID's price in Play Console. This is the
    // figure a user is quoted before being charged.
    expect(MEMBERSHIP_PRICE_FALLBACK).toBe('PKR 4,500');
    expect(MEMBERSHIP_PRODUCT_ID).toBe('mehram_membership');
  });

  it('is stated in one place, not copied into every screen that quotes it', () => {
    // It was a literal in four files, so a price change had four places to
    // miss — and any one of them would then misquote the charge.
    const { execSync } = require('child_process');
    const hits = execSync(
      "grep -rn \"'PKR 4,500'\" src App.tsx || true",
      { encoding: 'utf8' },
    )
      .split('\n')
      .filter(Boolean)
      // The definition itself is the one permitted occurrence.
      .filter((line: string) => !line.includes('MEMBERSHIP_PRICE_FALLBACK ='));

    expect(hits).toEqual([]);
  });

  it('prefers the store price wherever one is known', () => {
    // Every surface that quotes a price takes `priceLabel` and only falls back
    // when it is null — including the membership page, which used to have the
    // number written into it with no way for the store's answer to reach it.
    const { execSync } = require('child_process');
    const quoting = [
      'src/screens/onboarding/PaymentScreen.tsx',
      'src/screens/home/MembershipScreen.tsx',
      'src/components/review/UnderReviewUnpaidBlock.tsx',
      'src/components/matches/MatchesFoundUnpaidBlock.tsx',
    ];
    for (const file of quoting) {
      const src = execSync(`cat ${file}`, { encoding: 'utf8' });
      expect(src).toMatch(/priceLabel \?\? MEMBERSHIP_PRICE_FALLBACK/);
    }
  });
});

describe('no client-side way to be paid', () => {
  // A "Simulate payment" button used to sit under the real one, backed by
  // `src/lib/devMembership.ts` — a persisted AsyncStorage flag that the home
  // state OR-ed into `isPaid`. It was `__DEV__`-gated and could not reach a
  // release build, but it is gone now, and the paywall work that depends on
  // `isPaid` (the wali card, the Family tab's invite lock) is only as honest as
  // that field. These guard the removal rather than the old behaviour.
  const read = (file: string): string => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { readFileSync } = require('fs');
    return readFileSync(file, 'utf8');
  };

  it('has no dev-membership module left to import', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { existsSync } = require('fs');
    expect(existsSync('src/lib/devMembership.ts')).toBe(false);
  });

  it('offers no simulated purchase on the paywall', () => {
    const src = read('src/screens/onboarding/PaymentScreen.tsx');
    expect(src).not.toMatch(/simulate/i);
    expect(src).not.toMatch(/devPayment/);
  });

  it('resolves paid state from the server alone', () => {
    const app = read('App.tsx');
    expect(app).not.toMatch(/devMembership|isDevMembershipActive/);
    // The one assignment the home state's branches all read.
    expect(app).toMatch(/const isPaid = data\.isPaid;/);
  });
});
