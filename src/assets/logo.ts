import type { ImageSourcePropType } from 'react-native';

/**
 * The boot logo, as each platform needs it.
 *
 * Metro turns `require` of an image into an asset id and picks the @2x/@3x
 * variant that matches the device. A browser bundler has no equivalent — and
 * `require` does not exist in an ES module at all — so `logo.web.ts` imports
 * the file as a URL instead. The bundler resolves whichever of the two matches
 * the platform it is building for.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const LOGO_SOURCE = require('./logo.png') as ImageSourcePropType;
