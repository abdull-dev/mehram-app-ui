module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // The preset only transforms react-native and @react-native* packages. Several
  // dependencies App.tsx pulls in ship untranspiled ESM, which Jest cannot parse
  // as-is, so the whole suite failed at import time before any test ran.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?' +
      '|react-native-url-polyfill|react-native-iap|react-native-nitro-modules' +
      '|react-native-linear-gradient|react-native-safe-area-context|react-native-svg' +
      '|react-native-maps|react-native-image-picker|@supabase|whatwg-url-without-unicode)/)',
  ],
};
