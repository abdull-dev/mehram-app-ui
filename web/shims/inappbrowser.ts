/**
 * `react-native-inappbrowser-reborn` for the web.
 *
 * The native flow opens an in-app browser and resolves with the redirect URL.
 * A browser cannot hand control back to itself that way, so OAuth becomes a
 * full-page redirect: this navigates away and never resolves. The page that
 * comes back carries the tokens in its URL, which is where the web build reads
 * them from.
 */

interface AuthResult {
  type: "success" | "cancel" | "dismiss";
  url?: string;
}

const InAppBrowser = {
  async isAvailable(): Promise<boolean> {
    return true;
  },

  async openAuth(url: string): Promise<AuthResult> {
    window.location.assign(url);
    // Navigation has been handed to the browser; nothing after this runs.
    return new Promise<AuthResult>(() => {});
  },

  async open(url: string): Promise<AuthResult> {
    window.open(url, "_blank", "noopener,noreferrer");
    return { type: "dismiss" };
  },

  async close(): Promise<void> {},
  async closeAuth(): Promise<void> {},
};

export default InAppBrowser;
