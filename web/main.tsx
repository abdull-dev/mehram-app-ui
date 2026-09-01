import { AppRegistry } from "react-native-web";
import App from "../App";

/**
 * Web entry point — the counterpart of `index.js`, which registers the same
 * `App` with React Native's own AppRegistry.
 *
 * `AppRegistry.runApplication` is used rather than rendering `<App />` into a
 * root directly: it is what installs react-native-web's style sheet into the
 * document head, and without it every `StyleSheet.create` rule resolves to
 * nothing and the app renders unstyled.
 */

/**
 * `?start=` deep links, so the marketing site's Log in and Sign up buttons
 * arrive somewhere useful instead of at the welcome carousel. The app owns its
 * own navigation, so this only seeds the first screen.
 */
const START: Record<string, string> = {
  login: "SignInRole",
  signup: "WhoIsFor",
};

const requested = new URLSearchParams(window.location.search).get("start");
const initialScreen = requested ? START[requested] : undefined;

AppRegistry.registerComponent("Mehram", () => App);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from the document.");

AppRegistry.runApplication("Mehram", {
  rootTag: root,
  initialProps: initialScreen ? { initialScreen } : {},
});
