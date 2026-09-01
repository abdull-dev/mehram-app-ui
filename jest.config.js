module.exports = {
  preset: '@react-native/jest-preset',
  // AsyncStorage is a native module with no JS fallback, so importing anything
  // that touches it threw "NativeModule: AsyncStorage is null" and took the
  // whole suite down before a single assertion ran. The package ships a mock
  // for exactly this.
  setupFiles: ['<rootDir>/jest.setup.js'],
};
