/**
 * useChatRealtime
 *
 * Manages real-time chat for a single conversation using Supabase Realtime.
 *
 * Receive path (Supabase Broadcast):
 *   chat:message  → new/confirmed message
 *   chat:system   → system/blocked notice
 *   chat:seen     → read-receipt updates
 *
 * Presence (Supabase Presence on the same channel):
 *   - Tracks each participant's isTyping + isOnline state
 *   - Participant displayNames are derived from received message senderName fields
 *
 * Send path (REST API — server persists then broadcasts back):
 *   sendMessage → POST /chat/{id}/messages
 *   markSeen    → POST /chat/{id}/messages/{msgId}/seen
 *   sendTyping  → Supabase Presence track()
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  markMessageSeen,
} from '../api/chat';
import type { ChatMessagePayload, ParticipantPresence } from '../api/chat';

export type { ChatMessagePayload, ParticipantPresence };

export interface SystemMessage {
  id: string;
  conversationId: string;
  text: string;
  sentAt: string;
}

export type AnyMessage =
  | (ChatMessagePayload & { __kind: 'message' })
  | (SystemMessage    & { __kind: 'system'  });

export interface Typer {
  userId: string;
  displayName: string;
}

export interface UseChatRealtime {
  messages: AnyMessage[];
  participants: ParticipantPresence[];
  typers: Typer[];
  isConnected: boolean;
  /** True once the Supabase channel subscription is confirmed. Safe to send. */
  isReady: boolean;
  sendMessage: (text: string) => void;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  sendTyping: (isTyping: boolean) => void;
  markSeen: (messageId: string) => void;
  /** Prepend older messages from REST load-more */
  prependMessages: (msgs: ChatMessagePayload[]) => void;
  /** Set initial messages from HTTP pre-load (only if not already seeded) */
  setInitialMessages: (msgs: ChatMessagePayload[]) => void;
}

interface PresencePayload {
  userId: string;
  displayName?: string;
  isWali?: boolean;
  isTyping: boolean;
  isOnline: boolean;
}

// ─── module-level message cache ───────────────────────────────────────────────
// Persists messages across component mounts so reopening a chat is instant.
const messageCache = new Map<string, AnyMessage[]>();

export function useChatRealtime(
  conversationId: string | null,
  myUserId: string | null,
  myDisplayName?: string,
): UseChatRealtime {
  // Seed from cache immediately — no blank flash when reopening.
  // Strip any optimistic entries that were never confirmed (e.g. navigated away before echo).
  const [messages, setMessages] = useState<AnyMessage[]>(() => {
    if (!conversationId) return [];
    const cached = messageCache.get(conversationId) ?? [];
    return cached.filter(m => !m.id.startsWith('optimistic-'));
  });
  const [participants, setParticipants] = useState<ParticipantPresence[]>([]);
  const [typers, setTypers]           = useState<Typer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReady, setIsReady]         = useState(false);

  const channelRef       = useRef<RealtimeChannel | null>(null);
  const typingTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Temp IDs of optimistically-added messages replaced once the server echoes back.
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  // True once initial messages have been seeded (from cache or REST fetch).
  const initialSeededRef = useRef(false);
  // displayName/isWali info derived from received messages, used to enrich presence.
  const nameMapRef = useRef<Map<string, { displayName: string; isWali: boolean; seekerIdOfWali?: string }>>(
    new Map(),
  );

  // ── helpers ────────────────────────────────────────────────────────────────

  const toAnyMessage = useCallback(
    (msg: ChatMessagePayload): AnyMessage => ({ ...msg, __kind: 'message' }),
    [],
  );

  const toSystemMsg = useCallback(
    (msg: SystemMessage): AnyMessage => ({ ...msg, __kind: 'system' }),
    [],
  );

  // ── keep cache in sync (exclude unconfirmed optimistic messages) ─────────
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      messageCache.set(conversationId, messages.filter(m => !m.id.startsWith('optimistic-')));
    }
  }, [conversationId, messages]);

  // ── sync Supabase Presence state → participants + typers ──────────────────
  const syncPresence = useCallback(() => {
    const channel = channelRef.current;
    if (!channel) return;

    const state = channel.presenceState<PresencePayload>();
    const presences = Object.values(state).flat();

    const newParticipants: ParticipantPresence[] = presences.map(p => {
      const known = nameMapRef.current.get(p.userId);
      return {
        userId:         p.userId,
        displayName:    p.displayName ?? known?.displayName ?? p.userId,
        isWali:         p.isWali ?? known?.isWali ?? false,
        seekerIdOfWali: known?.seekerIdOfWali,
        isOnline:       p.isOnline,
        isTyping:       p.isTyping,
        lastSeenAt:     p.isOnline ? undefined : new Date().toISOString(),
      };
    });

    setParticipants(newParticipants);
    setTypers(
      newParticipants
        .filter(p => p.isTyping && p.userId !== myUserId)
        .map(p => ({ userId: p.userId, displayName: p.displayName })),
    );
  }, [myUserId]);

  // ── connect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !myUserId) return;
    let mounted = true;

    const channel = supabase.channel(`conversation:${conversationId}`);
    channelRef.current = channel;

    channel
      // ── new message (broadcast from server after DB save) ──
      .on('broadcast', { event: 'chat:message' }, ({ payload }: { payload: ChatMessagePayload }) => {
        if (!mounted) return;

        // Store sender info for presence enrichment
        if (payload.senderName) {
          nameMapRef.current.set(payload.senderId, {
            displayName:    payload.senderName,
            isWali:         payload.senderIsWali,
            seekerIdOfWali: payload.seekerIdOfWali,
          });
        }

        setMessages(prev => {
          // Own message echoed back → replace the optimistic entry
          if (payload.senderId === myUserId) {
            const idx = prev.findIndex(
              m => m.__kind === 'message' &&
                   optimisticIdsRef.current.has(m.id) &&
                   m.text === payload.text,
            );
            if (idx !== -1) {
              optimisticIdsRef.current.delete(prev[idx].id);
              const next = [...prev];
              next[idx] = toAnyMessage(payload);
              return next;
            }
          }
          return [...prev, toAnyMessage(payload)];
        });
      })

      // ── system / blocked notice ──
      .on('broadcast', { event: 'chat:system' }, ({ payload }: { payload: SystemMessage }) => {
        if (!mounted) return;
        setMessages(prev => [...prev, toSystemMsg(payload)]);
      })

      // ── message edited ──
      .on('broadcast', { event: 'chat:edit' }, ({ payload }: {
        payload: { messageId: string; text: string; editedAt: string };
      }) => {
        if (!mounted) return;
        setMessages(prev =>
          prev.map(m =>
            m.__kind === 'message' && m.id === payload.messageId
              ? { ...m, text: payload.text, editedAt: payload.editedAt }
              : m,
          ),
        );
      })

      // ── message deleted ──
      .on('broadcast', { event: 'chat:delete' }, ({ payload }: {
        payload: { messageId: string };
      }) => {
        if (!mounted) return;
        setMessages(prev =>
          prev.map(m =>
            m.__kind === 'message' && m.id === payload.messageId
              ? { ...m, text: '', deleted: true }
              : m,
          ),
        );
      })

      // ── read receipts ──
      .on('broadcast', { event: 'chat:seen' }, ({ payload }: {
        payload: { reads: { messageId: string; userId: string; readAt: string }[] };
      }) => {
        if (!mounted) return;
        setMessages(prev =>
          prev.map(m => {
            if (m.__kind !== 'message') return m;
            const newReads = payload.reads.filter(r => r.messageId === m.id);
            if (newReads.length === 0) return m;
            const existingIds = new Set(m.reads.map(r => r.userId));
            const merged = [...m.reads, ...newReads.filter(r => !existingIds.has(r.userId))];
            return { ...m, reads: merged };
          }),
        );
      })

      // ── presence: typing + online/offline ──
      .on('presence', { event: 'sync' },  () => { if (mounted) syncPresence(); })
      .on('presence', { event: 'join' },  () => { if (mounted) syncPresence(); })
      .on('presence', { event: 'leave' }, () => { if (mounted) syncPresence(); })

      .subscribe(async (status) => {
        if (!mounted) return;
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setIsReady(true);
          // Announce our presence to all other participants
          await channel.track({ userId: myUserId, displayName: myDisplayName, isTyping: false, isOnline: true });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setIsReady(false);
        }
      });

    return () => {
      mounted = false;
      initialSeededRef.current = false;
      optimisticIdsRef.current.clear();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      // Don't clear messages — cache seeds the next mount instantly.
      setParticipants([]);
      setTypers([]);
      setIsConnected(false);
      setIsReady(false);
    };
  }, [conversationId, myUserId, myDisplayName, toAnyMessage, toSystemMsg, syncPresence]);

  // ── actions ────────────────────────────────────────────────────────────────

  const sendMessage = useCallback((text: string) => {
    if (!conversationId || !myUserId) return;

    // Optimistically show the message — don't wait for server echo.
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    optimisticIdsRef.current.add(tempId);
    const optimistic: AnyMessage = {
      __kind:       'message',
      id:           tempId,
      conversationId,
      senderId:     myUserId,
      senderName:   '',
      senderIsWali: false,
      text,
      blocked:      false,
      sentAt:       new Date().toISOString(),
      reads:        [],
    };
    setMessages(prev => [...prev, optimistic]);

    // POST to REST API — server saves to DB then broadcasts 'chat:message' back
    apiSendMessage(conversationId, text).catch(() => {
      // Remove the optimistic message if the request failed
      optimisticIdsRef.current.delete(tempId);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    });

    // Clear typing indicator on send
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    channelRef.current?.track({ userId: myUserId, displayName: myDisplayName, isTyping: false, isOnline: true });
  }, [conversationId, myUserId, myDisplayName]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (!myUserId) return;
    if (!isTyping) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      channelRef.current?.track({ userId: myUserId, displayName: myDisplayName, isTyping: false, isOnline: true });
      return;
    }
    // Debounce: only push typing=true once per 2 seconds
    if (typingTimerRef.current) return;
    channelRef.current?.track({ userId: myUserId, displayName: myDisplayName, isTyping: true, isOnline: true });
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 2000);
  }, [myUserId, myDisplayName]);

  const editMessage = useCallback((messageId: string, text: string) => {
    if (!conversationId) return;
    // Optimistic update
    const editedAt = new Date().toISOString();
    setMessages(prev =>
      prev.map(m =>
        m.__kind === 'message' && m.id === messageId ? { ...m, text, editedAt } : m,
      ),
    );
    apiEditMessage(conversationId, messageId, text).catch(() => {
      // Revert optimistic update on failure — server will not broadcast chat:edit
    });
  }, [conversationId]);

  const deleteMessage = useCallback((messageId: string) => {
    if (!conversationId) return;
    // Optimistic update
    setMessages(prev =>
      prev.map(m =>
        m.__kind === 'message' && m.id === messageId ? { ...m, text: '', deleted: true } : m,
      ),
    );
    apiDeleteMessage(conversationId, messageId).catch(() => {
      // Revert — mark as not deleted
      setMessages(prev =>
        prev.map(m =>
          m.__kind === 'message' && m.id === messageId ? { ...m, deleted: false } : m,
        ),
      );
    });
  }, [conversationId]);

  const markSeen = useCallback((messageId: string) => {
    if (!conversationId || !myUserId) return;
    // Never mark own messages or optimistic (not-yet-confirmed) messages as seen
    const msg = messageCache.get(conversationId)?.find(m => m.id === messageId);
    if (msg && (msg.__kind !== 'message' || (msg as ChatMessagePayload & { __kind: 'message' }).senderId === myUserId)) return;
    if (messageId.startsWith('optimistic-')) return;
    // POST to REST API — server records the read and broadcasts 'chat:seen' back
    markMessageSeen(conversationId, messageId).catch(() => {});
  }, [conversationId, myUserId]);

  const prependMessages = useCallback((msgs: ChatMessagePayload[]) => {
    setMessages(prev => [...msgs.map(toAnyMessage), ...prev]);
  }, [toAnyMessage]);

  const setInitialMessages = useCallback((msgs: ChatMessagePayload[]) => {
    // Only seed once — prevents REST response from overwriting messages that
    // arrived via broadcast before the HTTP request completed.
    if (!initialSeededRef.current) {
      initialSeededRef.current = true;
      setMessages(msgs.map(toAnyMessage));
    }
  }, [toAnyMessage]);

  return {
    messages, participants, typers,
    isConnected, isReady,
    sendMessage, editMessage, deleteMessage,
    sendTyping, markSeen,
    prependMessages, setInitialMessages,
  };
}
