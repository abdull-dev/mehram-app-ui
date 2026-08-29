/**
 * API Configuration — mehram-backend
 *
 * Android emulator routes "localhost" to itself, not the host Mac.
 * Use 10.0.2.2 for Android emulator, localhost for iOS simulator.
 *
 * Physical device on the same Wi-Fi: replace with your Mac's local IP,
 * e.g. 'http://192.168.1.42:3001'
 */
import { Platform } from 'react-native';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001/v1'
    : 'http://localhost:3001/v1';
