/**
 * notificationChannel — shared Supabase Realtime channel singleton
 *
 * All three notification hooks (useHomeRealtime, useProposalsRealtime,
 * useChatListRealtime) subscribe to the same backend channel
 * `notifications:{userId}` but listen for different broadcast events.
 * This module maintains one Supabase channel for all three, rebuilding
 * it only when the userId changes.
 *
 * Usage:
 *   const unsub = subscribeToNotification(userId, 'stats:stale', handler);
 *   // call unsub() on cleanup
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type NotifEvent =
  | 'stats:stale'
  | 'proposals:stale'
  | 'chats:stale'
  | 'notifications:new';

// ─── module-level singleton ───────────────────────────────────────────────────
let _channel: RealtimeChannel | null = null;
let _channelUserId: string | null = null;
let _refCount = 0;

const _handlers: Record<NotifEvent, Set<() => void>> = {
  'stats:stale':     new Set(),
  'proposals:stale': new Set(),
  'chats:stale':     new Set(),
  'notifications:new': new Set(),
};

function _createChannel(userId: string): RealtimeChannel {
  return supabase
    .channel(`notifications:${userId}`)
    .on('broadcast', { event: 'stats:stale' }, () => {
      _handlers['stats:stale'].forEach(h => h());
    })
    .on('broadcast', { event: 'proposals:stale' }, () => {
      _handlers['proposals:stale'].forEach(h => h());
    })
    .on('broadcast', { event: 'notifications:new' }, () => {
      _handlers['notifications:new'].forEach(h => h());
    })
    .on('broadcast', { event: 'chats:stale' }, () => {
      _handlers['chats:stale'].forEach(h => h());
    })
    .subscribe();
}

/**
 * Subscribe a handler to a notification event on the shared channel.
 * Returns an unsubscribe function — call it on hook cleanup.
 */
export function subscribeToNotification(
  userId: string,
  event: NotifEvent,
  handler: () => void,
): () => void {
  // Rebuild the channel if the userId changed (e.g. user switched accounts).
  if (_channelUserId !== userId) {
    if (_channel) supabase.removeChannel(_channel);
    _channelUserId = userId;
    _refCount = 0;
    _handlers['stats:stale'].clear();
    _handlers['proposals:stale'].clear();
    _handlers['chats:stale'].clear();
    _channel = _createChannel(userId);
  }

  _handlers[event].add(handler);
  _refCount++;

  return function unsubscribe() {
    _handlers[event].delete(handler);
    _refCount--;
    if (_refCount <= 0) {
      if (_channel) supabase.removeChannel(_channel);
      _channel = null;
      _channelUserId = null;
      _refCount = 0;
    }
  };
}
