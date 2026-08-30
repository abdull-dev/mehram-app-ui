/**
 * useProposalsSocket
 *
 * Subscribes to the Supabase Realtime notifications channel and calls
 * `onStale` whenever the server broadcasts 'proposals:stale' — which happens
 * when a proposal is sent, withdrawn, or its stage changes.
 *
 * Shares the same underlying Supabase channel as useHomeSocket and
 * useChatListSocket (see notificationChannel.ts) — no duplicate connections.
 */
import { useEffect, useRef } from 'react';
import { subscribeToNotification } from '../lib/notificationChannel';

export function useProposalsSocket(userId: string, onStale: () => void): void {
  const onStaleRef = useRef(onStale);
  useEffect(() => { onStaleRef.current = onStale; }, [onStale]);

  useEffect(() => {
    if (!userId) return;
    return subscribeToNotification(userId, 'proposals:stale', () => onStaleRef.current());
  }, [userId]);
}
