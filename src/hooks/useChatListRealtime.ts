/**
 * useChatListRealtime
 *
 * Subscribes to the Supabase Realtime notifications channel and calls
 * `onStale` whenever the server broadcasts 'chats:stale' — which happens
 * when any conversation the user participates in receives a new message.
 *
 * Rapid-fire events (e.g. 4 participants all notified at once) are debounced
 * into a single listConversations() call.
 */
import { useEffect, useRef } from 'react';
import { subscribeToNotification } from '../lib/notificationChannel';

export function useChatListRealtime(userId: string, onStale: () => void): void {
  const onStaleRef = useRef(onStale);
  useEffect(() => { onStaleRef.current = onStale; }, [onStale]);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = subscribeToNotification(userId, 'chats:stale', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { onStaleRef.current(); }, 300);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [userId]);
}
