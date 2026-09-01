/**
 * useNotificationsRealtime
 *
 * Calls `onNew` whenever the server broadcasts 'notifications:new' — emitted
 * the moment a notification row is created, so the bell badge and the feed
 * update without a poll or a manual refresh.
 *
 * Shares the one Supabase channel with the other notification hooks (see
 * notificationChannel.ts), so this adds no extra connection.
 */
import { useEffect, useRef } from 'react';
import { subscribeToNotification } from '../lib/notificationChannel';

export function useNotificationsRealtime(userId: string, onNew: () => void): void {
  const onNewRef = useRef(onNew);
  useEffect(() => { onNewRef.current = onNew; }, [onNew]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToNotification(userId, 'notifications:new', () => onNewRef.current());
  }, [userId]);
}
