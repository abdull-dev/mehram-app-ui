/**
 * useHomeSocket
 *
 * Subscribes to the Supabase Realtime notifications channel and calls
 * `onStale` whenever the server broadcasts 'stats:stale' — which happens
 * after a profile view or when a match is created.
 *
 * The hook is a no-op until `userId` is non-empty (i.e. user is signed in).
 * The `onStale` callback is kept in a ref so changing it never triggers a
 * channel reconnect.
 */
import { useEffect, useRef } from 'react';
import { subscribeToNotification } from '../lib/notificationChannel';

export function useHomeSocket(userId: string, onStale: () => void): void {
  const onStaleRef = useRef(onStale);
  useEffect(() => { onStaleRef.current = onStale; }, [onStale]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToNotification(userId, 'stats:stale', () => onStaleRef.current());
  }, [userId]);
}
