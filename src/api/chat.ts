import { apiRequest } from './client';

export interface ChatListItem {
  id: string;            // conversationId
  matchId: string;
  /** The other seeker's user id — lets the thread open their profile. */
  partnerUserId: string;
  partnerName: string;
  partnerAge?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageSenderId?: string;
  participantCount: number;
  unreadCount: number;
}

export interface ChatMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderIsWali: boolean;
  seekerIdOfWali?: string;
  text: string;
  blocked: boolean;
  deleted?: boolean;
  editedAt?: string;
  sentAt: string;
  reads: { userId: string; readAt: string }[];
}

export interface ParticipantPresence {
  userId: string;
  displayName: string;
  isWali: boolean;
  seekerIdOfWali?: string;
  isOnline: boolean;
  lastSeenAt?: string;
  isTyping: boolean;
}

/**
 * The chats list.
 *
 * `GET /chat` returns `ChatListItem` field for field — the server was ported
 * from the implementation this client was written against, so nothing needs
 * remapping here any more.
 */
export function listConversations(): Promise<ChatListItem[]> {
  return apiRequest<ChatListItem[]>('/chat');
}

/**
 * A page of history, oldest-first.
 *
 * The server pages backwards from `cursor` (a message id) and already returns
 * chronological order, so the client neither reverses nor remaps.
 */
export function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 40,
): Promise<ChatMessagePayload[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  return apiRequest<ChatMessagePayload[]>(
    `/chat/${conversationId}/messages?${params.toString()}`,
  );
}

export function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessagePayload> {
  return apiRequest<ChatMessagePayload>(`/chat/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

/** Edit one of your own messages. Broadcasts `chat:edit` to the thread. */
export function editMessage(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<ChatMessagePayload> {
  return apiRequest<ChatMessagePayload>(
    `/chat/${conversationId}/messages/${messageId}`,
    { method: 'PATCH', body: JSON.stringify({ text }) },
  );
}

/** Soft-delete one of your own messages. Broadcasts `chat:delete`. */
export function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  return apiRequest<void>(
    `/chat/${conversationId}/messages/${messageId}`,
    { method: 'DELETE' },
  );
}

/**
 * Mark this message and everything before it as seen.
 *
 * Broadcasts `chat:seen` to the thread with the rows that actually changed, so
 * re-reporting a message already read says nothing.
 */
export function markMessageSeen(
  conversationId: string,
  messageId: string,
): Promise<void> {
  return apiRequest<void>(
    `/chat/${conversationId}/messages/${messageId}/seen`,
    { method: 'POST' },
  );
}
