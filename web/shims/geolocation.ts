/**
 * `@react-native-community/geolocation` for the web.
 *
 * The community module's signature is the browser's own, so this is a thin
 * pass-through — the only real work is failing cleanly where the API is absent
 * (an insecure origin, or a browser with it switched off) instead of throwing
 * into a caller that expects an error callback.
 */

type Success = (position: GeolocationPosition) => void;
type Failure = (error: { code: number; message: string }) => void;

const UNAVAILABLE = { code: 2, message: "Geolocation is unavailable." };

const Geolocation = {
  getCurrentPosition(
    success: Success,
    error?: Failure,
    options?: PositionOptions,
  ) {
    if (!navigator.geolocation) return error?.(UNAVAILABLE);
    navigator.geolocation.getCurrentPosition(success, error, options);
  },

  watchPosition(success: Success, error?: Failure, options?: PositionOptions) {
    if (!navigator.geolocation) {
      error?.(UNAVAILABLE);
      return -1;
    }
    return navigator.geolocation.watchPosition(success, error, options);
  },

  clearWatch(id: number) {
    if (id >= 0) navigator.geolocation?.clearWatch(id);
  },

  stopObserving() {},

  /** Android-only on native; the browser prompts at the point of use. */
  requestAuthorization(success?: () => void) {
    success?.();
  },

  setRNConfiguration() {},
};

export default Geolocation;
