/**
 * Auth token storage — persists access + refresh tokens across app restarts.
 *
 * Uses @react-native-async-storage/async-storage.
 * Install: npm install @react-native-async-storage/async-storage
 *          cd ios && pod install
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY  = '@mehram_access_token';
const REFRESH_TOKEN_KEY = '@mehram_refresh_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function saveTokens(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY,  accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

const PENDING_EMAIL_KEY = '@mehram_pending_email';
const PENDING_PHONE_KEY = '@mehram_pending_phone';

export async function savePendingEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_EMAIL_KEY, email);
}

export async function getPendingEmail(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_EMAIL_KEY);
}

export async function clearPendingEmail(): Promise<void> {
  await AsyncStorage.multiRemove([PENDING_EMAIL_KEY, PENDING_PHONE_KEY]);
}

export async function savePendingPhone(e164: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_PHONE_KEY, e164);
}

export async function getPendingPhone(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_PHONE_KEY);
}


