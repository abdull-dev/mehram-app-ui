import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Web-first, the way Metro resolves for `platform=web`.
 *
 * Several React Native libraries ship `.web.js` files beside their native ones
 * and import them without an extension. Whichever resolver is in play has to
 * try the web extension first or it silently loads the native implementation.
 */
const WEB_FIRST_EXTENSIONS = [
  ".web.tsx", ".web.ts", ".web.jsx", ".web.js",
  ".tsx", ".ts", ".jsx", ".js", ".json",
];
const shim = (p: string) => path.resolve(here, "web/shims", p);

/**
 * The web build of the Mehram app.
 *
 * It compiles the same source the iOS and Android builds do — 59 screens, one
 * codebase — by aliasing `react-native` to react-native-web and standing in for
 * the six modules that genuinely need a browser implementation. Nothing here
 * forks a screen; a fix to a screen ships to all three platforms at once.
 */
export default defineConfig({
  plugins: [react()],

  /**
   * Where the app is served from.
   *
   * The build sets VITE_BASE=/app/ so the bundle can be dropped into the
   * marketing site's `public/app` and served from the same origin — one server,
   * one domain, and no CORS or mixed-content problem to solve. The dev server
   * leaves it at the root.
   */
  base: process.env.VITE_BASE ?? "/",

  resolve: {
    alias: [
      // RNW, plus the one runtime API it does not implement.
      { find: /^react-native$/, replacement: shim("react-native.ts") },
      { find: /^react-native-linear-gradient$/, replacement: shim("linear-gradient.tsx") },
      { find: /^react-native-iap$/, replacement: shim("iap.ts") },
      { find: /^react-native-maps$/, replacement: shim("maps.tsx") },
      { find: /^react-native-image-picker$/, replacement: shim("image-picker.ts") },
      { find: /^@react-native-community\/geolocation$/, replacement: shim("geolocation.ts") },
      { find: /^react-native-inappbrowser-reborn$/, replacement: shim("inappbrowser.ts") },
      // Flow-typed React Native source, reached by two libraries' Fabric specs.
      {
        find: /^react-native\/Libraries\/Utilities\/codegenNativeComponent$/,
        replacement: shim("codegen-native-component.tsx"),
      },
      // Pulled in only for React Native's URL polyfill, which the browser has.
      { find: /^react-native-url-polyfill\/auto$/, replacement: shim("noop.ts") },
    ],

    extensions: WEB_FIRST_EXTENSIONS,
  },

  optimizeDeps: {
    // Pre-bundling has its own resolver, so the web-first extensions have to be
    // handed to it separately. Without this react-native-svg is pre-bundled
    // against its *native* implementation, and safe-area-context gets the
    // native provider — whose codegen component renders null and silently drops
    // the entire app tree beneath it.
    rolldownOptions: { resolve: { extensions: WEB_FIRST_EXTENSIONS } },

    // Left as source instead: it is plain ESM that needs no interop shimming,
    // and Vite's own resolver then applies the extension order above.
    exclude: ["react-native-safe-area-context"],
  },

  define: {
    // React Native's build-time flag. Vite has no notion of it.
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
    global: "globalThis",
  },

  server: {
    port: 5173,
    // The API is served over plain HTTP with no domain, which a browser will
    // not let an HTTPS page reach. Proxying it under this origin sidesteps
    // mixed content and CORS in one move — and is the same shape production
    // needs until the API gets TLS.
    proxy: {
      "/v1": { target: "http://localhost:3000", changeOrigin: true },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
    },
  },

  // `index.html` sits at the project root because that is where Vite looks for
  // it, and it keeps App.tsx and src/ inside the root so nothing needs an fs
  // allowance to be imported.
  // `vite preview` needs the same API proxy the dev server has, or the built
  // app cannot reach the backend when checked locally.
  preview: {
    port: 5174,
    proxy: {
      "/v1": { target: "http://localhost:3000", changeOrigin: true },
      "/uploads": { target: "http://localhost:3000", changeOrigin: true },
    },
  },

  build: {
    // VITE_OUT_DIR lets the marketing site build straight into its own
    // `public/app`; on its own the app builds beside its source.
    outDir: process.env.VITE_OUT_DIR ?? "web-dist",
    emptyOutDir: true,
  },
});
