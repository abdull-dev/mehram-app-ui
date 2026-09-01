/**
 * react-native-web ships no type declarations.
 *
 * It is an implementation of React Native's public API for the DOM, so React
 * Native's own types describe it exactly — including the props of every
 * component the shims wrap. Re-pointing them here is more accurate than
 * hand-writing a second set that would drift.
 */
declare module "react-native-web" {
  export * from "react-native";

  /**
   * The one place the web implementation genuinely differs: React Native mounts
   * into a numeric root handle, react-native-web mounts into a DOM element.
   */
  export const AppRegistry: Omit<
    typeof import("react-native").AppRegistry,
    "runApplication"
  > & {
    runApplication(
      appKey: string,
      appParameters: { rootTag: Element; initialProps?: Record<string, unknown> },
    ): void;
  };
}
