/**
 * Test environment setup.
 *
 * Native modules have no implementation under Jest, so anything that reaches
 * for one has to be stubbed here or the import chain throws before the tests
 * run. `App.test.tsx` was failing this way, which is why the client had one
 * live suite instead of two.
 */

// Ships with @react-native-async-storage/async-storage for this purpose.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Reanimated-style native calls in react-native-svg and linear-gradient are
// harmless in tests, but their warnings drown real output.
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
