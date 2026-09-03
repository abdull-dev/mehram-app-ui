/**
 * The verification screen asks `pending-status` what is already confirmed, and
 * used to read *any* failure of that call as "this address is confirmed". Right
 * after a signup there is no session yet, so an unreachable backend produced
 * "You already have an account. This email is verified. Sign in to continue."
 * on every brand-new account — sending the user to sign in to an account that
 * did not exist.
 */
import { ApiError } from '../src/api/client';
import { meansNoPendingSignup } from '../src/api/auth';

it('reads the deliberate 400 as "no unconfirmed signup"', () => {
  expect(
    meansNoPendingSignup(
      new ApiError(400, {
        message: 'No pending signup found for that email address',
      }),
    ),
  ).toBe(true);
});

it.each([
  ['offline', new ApiError(0, { message: 'You appear to be offline.' })],
  ['a timeout', new ApiError(408, { message: 'The connection timed out.' })],
  ['the rate limiter', new ApiError(429, { message: 'Too many requests' })],
  ['a server error', new ApiError(500, { message: 'Internal server error' })],
  ['a route the API does not have', new ApiError(404, { message: 'Not Found' })],
  ['a non-HTTP failure', new Error('Network request failed')],
  ['nothing recognisable', undefined],
])('does not read %s as a confirmed account', (_label, error) => {
  expect(meansNoPendingSignup(error)).toBe(false);
});
