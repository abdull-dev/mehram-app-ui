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

// Geolocation is a native module too, and the country/city onboarding screens
// import it — so App.test.tsx, which mounts the whole App, fails at import time
// without this. Mocked to report a fixed position rather than left throwing:
// a test that mounts the tree should not depend on device location.
jest.mock('@react-native-community/geolocation', () => ({
  __esModule: true,
  default: {
    getCurrentPosition: jest.fn(success =>
      success({ coords: { latitude: 31.5204, longitude: 74.3587 } }),
    ),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

// react-native-maps registers a TurboModule that does not exist under Jest.
// The city screen renders a map, so mounting the App reaches it.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Stub = (props) => React.createElement(View, props, props.children);
  return {
    __esModule: true,
    default: Stub,
    Marker: Stub,
    Circle: Stub,
    PROVIDER_GOOGLE: 'google',
  };
});

// Image picker is native-only as well, and the photos step imports it.
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
  launchCamera: jest.fn(async () => ({ didCancel: true })),
}));

// The OAuth in-app browser: native on both platforms.
jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(async () => false),
    openAuth: jest.fn(async () => ({ type: 'cancel' })),
    close: jest.fn(),
    closeAuth: jest.fn(),
  },
}));
