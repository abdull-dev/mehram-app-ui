/**
 * useHomeSocket
 *
 * Connects to the /notifications Socket.io namespace and calls `onStale`
 * whenever the server signals that home-screen stats have changed:
 *   - 'stats:stale'  → emitted after a profile view or a match is created
 *
 * The hook connects once on mount (with the stored access token) and
 * disconnects on unmount. The `onStale` callback is kept in a ref so
 * changing it never triggers a reconnect.
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { getAccessToken } from '../storage/authStorage';

/** Base host — no path, no /v1 */
const SOCKET_HOST =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

export function useHomeSocket(onStale: () => void): void {
  const onStaleRef = useRef(onStale);
  useEffect(() => { onStaleRef.current = onStale; }, [onStale]);

  useEffect(() => {
    let socket: Socket | null = null;
    let mounted = true;

    async function connect() {
      const token = await getAccessToken();
      if (!token || !mounted) return;

      socket = io(`${SOCKET_HOST}/notifications`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
      });

      socket.on('stats:stale', () => onStaleRef.current());
    }

    connect();

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, []); // connect once; callback updates via ref
}
