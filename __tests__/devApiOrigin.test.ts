/**
 * The dev API address used to be a hardcoded LAN address, which is only correct
 * until DHCP renews the lease. When it went stale every request left the device
 * for an address with nothing on it and hung until the client's deadline, so
 * a signup reported "the connection timed out" having never reached the server.
 */
function loadConfig(
  os: 'android' | 'ios',
  scriptURL?: string,
): typeof import('../src/api/config') {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: os },
    // `getConstants()`, matching what the app actually gets. Under the New
    // Architecture `NativeModules` is `global.nativeModuleProxy`, and only the
    // legacy bridge flattened a module's constants onto it — so the flat
    // `SourceCode.scriptURL` this used to mock is `undefined` on a real
    // bridgeless device, and every handset silently took the emulator alias.
    NativeModules: scriptURL
      ? { SourceCode: { getConstants: () => ({ scriptURL }) } }
      : {},
  }));
  return require('../src/api/config');
}

afterEach(() => {
  jest.dontMock('react-native');
  jest.resetModules();
});

/**
 * The dev port, read from the config rather than written down again.
 *
 * Every assertion here is about which *host* the origin resolves to; the port
 * is only along for the ride. Pinning it meant moving the API back to 3000 —
 * which the config's own note said to do once that port was free — failed five
 * tests that have nothing to do with ports.
 */
const PORT = loadConfig('ios').API_BASE_URL.replace(/^.*:(\d+)\/v1$/, '$1');

it('takes the host from the address the bundle was served from', () => {
  const { API_BASE_URL } = loadConfig(
    'android',
    'http://192.168.1.7:8081/index.bundle?platform=android&dev=true',
  );

  expect(API_BASE_URL).toBe(`http://192.168.1.7:${PORT}/v1`);
});

it('follows the machine to a new address without an edit', () => {
  const before = loadConfig('android', 'http://192.168.1.3:8081/index.bundle');
  const after = loadConfig('android', 'http://192.168.1.7:8081/index.bundle');

  expect(before.API_BASE_URL).toContain('192.168.1.3');
  expect(after.API_BASE_URL).toContain('192.168.1.7');
});

/**
 * `react-native run-android` serves the bundle through `adb reverse`, so the
 * bundle's own host is loopback — which on the device means the device.
 */
it('uses the emulator host alias when the bundle came over loopback', () => {
  expect(
    loadConfig('android', 'http://localhost:8081/index.bundle').API_BASE_URL,
  ).toBe(`http://10.0.2.2:${PORT}/v1`);
  expect(
    loadConfig('android', 'http://127.0.0.1:8081/index.bundle').API_BASE_URL,
  ).toBe(`http://10.0.2.2:${PORT}/v1`);
});

it('falls back to the emulator host alias when there is no bundle URL', () => {
  expect(loadConfig('android').API_BASE_URL).toBe(`http://10.0.2.2:${PORT}/v1`);
});

it('leaves the iOS simulator on the host loopback it shares', () => {
  expect(loadConfig('ios', 'http://192.168.1.7:8081/index.bundle').API_BASE_URL)
    .toBe(`http://localhost:${PORT}/v1`);
});
