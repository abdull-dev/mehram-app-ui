/**
 * `react-native/Libraries/Utilities/codegenNativeComponent`.
 *
 * React Native's own copy is Flow-typed source, which no web bundler will
 * parse. It is reached because react-native-svg and
 * react-native-safe-area-context both ship Fabric component specs that call it
 * at module scope; the web builds of those libraries render DOM instead, so the
 * components this returns are registered and never mounted. Returning an inert
 * component keeps the import side-effect-free rather than fatal.
 */
import type React from "react";
export default function codegenNativeComponent<T>(name: string) {
  const Inert = () => null;
  Inert.displayName = `NativeComponent(${name})`;
  return Inert as unknown as React.ComponentType<T>;
}
