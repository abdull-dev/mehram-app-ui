/**
 * useProposalsSocket
 *
 * Connects to the /notifications Socket.io namespace and calls `onStale`
 * whenever the server emits 'proposals:stale' — which happens when a
 * proposal is sent, withdrawn, or its stage changes.
 *
 * Shares the same namespace as useHomeSocket but listens to a different event,
 * so both hooks can coexist without opening duplicate connections (each hook
 * manages its own socket instance; a shared singleton could be added later).
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { getAccessToken } from '../storage/authStorage';

const SOCKET_HOST =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';

export function useProposalsSocket(onStale: () => void): void {
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

      socket.on('proposals:stale', () => onStaleRef.current());
    }

    connect();

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, []); // connect once; callback updates via ref
}
