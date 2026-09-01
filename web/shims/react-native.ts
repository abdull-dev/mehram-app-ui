/**
 * The `react-native` module, as the web build sees it.
 *
 * `react-native` is aliased here rather than straight to `react-native-web` so
 * the handful of APIs RNW does not implement can be filled in. An audit of the
 * app found exactly one runtime gap across all 39 React Native APIs it uses —
 * everything else missing from RNW is a TypeScript type, which is erased before
 * this file ever runs.
 */
import type React from "react";
export * from "react-native-web";

/**
 * The native bridge, which has no browser equivalent.
 *
 * react-native-svg's Fabric modules ask for these at import time even in their
 * web build, and RNW does not implement any of them. Every method is inert
 * rather than throwing: the web renderer draws DOM SVG and never calls through,
 * so the only requirement is that resolving and importing succeed.
 */
const inert: unknown = new Proxy(
  {},
  {
    get: () => () => undefined,
  },
);

export const TurboModuleRegistry = {
  get<T>(_name: string): T | null {
    return inert as T;
  },
  getEnforcing<T>(_name: string): T {
    return inert as T;
  },
};

export function requireNativeComponent<T>(name: string): React.ComponentType<T> {
  const Inert = () => null;
  Inert.displayName = `NativeComponent(${name})`;
  return Inert as unknown as React.ComponentType<T>;
}

export function codegenNativeCommands<T>(): T {
  return inert as T;
}

/**
 * React Native's asset table. `@react-native/assets-registry` — pulled in by
 * react-native-svg for its `<Image>` element — imports this from
 * `react-native`, and RNW does not provide it. This is the same one-array
 * implementation React Native itself ships.
 */
const assets: unknown[] = [];

export const AssetRegistry = {
  registerAsset(asset: unknown): number {
    assets.push(asset);
    return assets.length;
  },
  getAssetByID(assetId: number): unknown {
    return assets[assetId - 1];
  },
};

type PermissionStatus = "granted" | "denied" | "never_ask_again";

/**
 * Android's permission gate. Every call site is already behind
 * `Platform.OS === 'android'`, so on the web this exists only so the import
 * resolves. The browser asks for location itself, at the point of use.
 */
export const PermissionsAndroid = {
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION",
    ACCESS_COARSE_LOCATION: "android.permission.ACCESS_COARSE_LOCATION",
    CAMERA: "android.permission.CAMERA",
    READ_MEDIA_IMAGES: "android.permission.READ_MEDIA_IMAGES",
    POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
  },
  RESULTS: {
    GRANTED: "granted" as PermissionStatus,
    DENIED: "denied" as PermissionStatus,
    NEVER_ASK_AGAIN: "never_ask_again" as PermissionStatus,
  },
  async request(): Promise<PermissionStatus> {
    return "granted";
  },
  async check(): Promise<boolean> {
    return true;
  },
  async requestMultiple(
    permissions: string[],
  ): Promise<Record<string, PermissionStatus>> {
    return Object.fromEntries(permissions.map((p) => [p, "granted"]));
  },
};
