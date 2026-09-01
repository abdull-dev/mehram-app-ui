# Mehram on the web (superseded)

> **This target is no longer how the app ships on the web.** The web app is now
> a purpose-built Next.js UI in `../mehram-web` under `/app`, because a phone
> layout in a browser window — even framed and centred — does not read as a web
> app. This is kept because it still builds and runs, and it is a fast way to
> exercise a screen outside a simulator.
>
> Do not build it into `../mehram-web/public/app`: a file there shadows the real
> `/app` routes. `npm run web` and `npm run web:build` are standalone and safe.

The same app the iOS and Android builds ship — 59 screens, one source tree —
compiled for the browser with [react-native-web] and Vite.

```bash
npm run web              # http://localhost:5173, hot reload
npm run web:build        # -> web-dist/
npm run web:preview      # serves that build, with the same API proxy
```

Deep links: `?start=login` and `?start=signup` open the sign-in and
create-account role pickers instead of the welcome carousel. The marketing site
uses them for its header buttons.

## Why not a second implementation

An audit before starting: of the 39 React Native APIs the app imports, exactly
one has no react-native-web equivalent at runtime (`PermissionsAndroid`); the
rest of the gaps are TypeScript types, which are erased before anything runs.
Six third-party modules genuinely need a browser implementation, and they are
imported from a total of six files. Everything else — 48,500 lines of `View`,
`Text`, `StyleSheet` and `Pressable` — renders as-is.

So a hand-written web UI would have meant reimplementing 59 screens to reach
where an alias and six shims already arrive, and then maintaining two of
everything forever. The app already carries one parallel implementation (the
wali screens), and every fix there has to land twice; a third was not worth
adding.

## The web shell

The screens are laid out for a phone. Stretched across a desktop window that
reads as a broken page — 1400px-wide text inputs, a button the width of the
screen, a column of content stranded on the left and half the viewport empty.

So from 760px up, `index.html` keeps the app at the measure it was designed for
(460px) and turns the window around it into the page: the marketing site's two
washes of colour as ground, the wordmark and a link back to the site, and the
app in a centred card whose ground matches its own so there is no seam. Below
that breakpoint none of it applies and the app fills the viewport exactly as it
does on a device.

It is plain HTML and CSS wrapped around the mount point, so it costs the React
Native tree nothing and cannot affect iOS or Android.

What it does *not* do is make the screens themselves desktop layouts — a real
web design would use the width, with a persistent sidebar in place of the bottom
tab bar and multi-column list/detail on the home and chat screens. That is 59
screens of work and it forks them away from the mobile app; a centred column is
the honest stopping point until that trade is worth making.

## What is in here

| | |
|---|---|
| `main.tsx` | Entry point. The counterpart of `index.js`. |
| `shims/react-native.ts` | RNW, plus the native-bridge APIs it does not implement. |
| `shims/linear-gradient.tsx` | The most-used native module, at 49 call sites. |
| `shims/image-picker.ts` | A file input behind the picker's promise contract. |
| `shims/geolocation.ts` | The browser's own geolocation, in the module's shape. |
| `shims/inappbrowser.ts` | OAuth as a full-page redirect. |
| `shims/maps.tsx` | A static map tile — one call site, the city picker. |
| `shims/iap.ts` | Reports no store. See "Not working yet". |
| `types/react-native-web.d.ts` | RNW ships no types; React Native's describe it. |

Platform forks follow React Native's own convention — `foo.web.ts` beside
`foo.ts`, picked by extension order. `src/assets/logo` and
`src/lib/safeAreaMetrics` use it.

## Things that will bite

Four of these cost real debugging time. They are all load-bearing.

**`#root` must be `display: flex`.** RNW's root container is `flex: 1`, which
does nothing inside a block parent: the whole app collapses to zero height and
every screen is clipped to nothing. The DOM looks correct while the page renders
blank.

**Pre-bundling needs the web-first extension order too.** Several React Native
libraries ship `.web.js` files beside their native ones and import them without
an extension. `resolve.extensions` handles the app's own imports but does *not*
apply inside dependency pre-bundling, which has its own resolver — so
safe-area-context silently got its *native* provider, whose codegen component
renders `null` and dropped the entire app tree beneath it, with no error. See
`optimizeDeps.rolldownOptions` in `vite.config.mts`.

**`SafeAreaProvider` renders nothing until it knows its insets**, and
`initialWindowMetrics` is hard-coded to `null` on web. `src/lib/safeAreaMetrics.web.ts`
seeds it; the library's own measurement takes over a frame later.

**The API is reached at this origin, not directly.** A browser will not let an
HTTPS page fetch `http://`, and there is no cleartext exemption to grant the way
`network_security_config.xml` grants one on Android. `src/api/config.ts` returns
an empty origin for web and the host proxies `/v1` and `/uploads` through — the
dev and preview proxies are in `vite.config.mts`. Production needs the same
shape until the API has TLS.

## Not working yet

- **Payment.** `react-native-iap` has no browser equivalent; the shim reports an
  empty store, which is the path a device without Play Services takes. A web
  checkout is separate work.
- **Browser back.** `BackHandler` is a no-op on web, so the back *button* does
  not drive in-app navigation. The in-screen back controls work.
- **First load is heavy.** ~2.7 MB gzipped, most of it the 8 MB bundled city
  dataset that `country-state-city` imports eagerly. Loading it on demand from
  the country and city screens is the single biggest win available.

[react-native-web]: https://necolas.github.io/react-native-web/
