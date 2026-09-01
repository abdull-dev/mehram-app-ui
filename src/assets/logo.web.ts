import type { ImageSourcePropType } from 'react-native';
import logoUrl from './logo.png';

/** See ./logo.ts — the browser gets a URL where a device gets an asset id. */
export const LOGO_SOURCE: ImageSourcePropType = { uri: logoUrl };
