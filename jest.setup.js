/* eslint-env jest */
/**
 * Jest setup.
 *
 * `src/lib/iap.ts` is mocked rather than `react-native-iap` itself, for two
 * reasons: the library ships ESM that the preset's `transformIgnorePatterns`
 * does not transform, and mocking our own wrapper means this file does not need
 * changing if the underlying library is ever swapped.
 *
 * App.test.tsx mounts the whole App, which opens a billing connection and looks
 * for unfinished purchases on mount, so these have to resolve to something.
 */
// AsyncStorage's native module does not exist under Jest, so importing it threw
// before App.tsx could even be required — the suite was failing on this alone.
// The library ships its own mock for exactly this.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('./src/lib/iap', () => ({
  initIap: jest.fn().mockResolvedValue(false),
  isAlreadyOwned: jest.fn().mockReturnValue(false),
  getMembershipPrice: jest.fn().mockResolvedValue(null),
  buyMembership: jest.fn(),
  finishMembershipPurchase: jest.fn().mockResolvedValue(undefined),
  getUnfinishedPurchases: jest.fn().mockResolvedValue([]),
  isUserCancelled: jest.fn().mockReturnValue(false),
}));
