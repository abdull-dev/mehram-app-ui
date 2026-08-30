import { apiRequest } from './client';

export interface ChatListItem {
  id: string;            // conversationId
  matchId: string;
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

export function listConversations(): Promise<ChatListItem[]> {
  return apiRequest<ChatListItem[]>('/matches');
}

export function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 40,
): Promise<ChatMessagePayload[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  // New backend uses 'before' (message UUID) instead of 'cursor'
  if (cursor) params.set('before', cursor);
  return apiRequest<ChatMessagePayload[]>(`/matches/${conversationId}/messages?${params}`);
}

export function sendMessage(
  conversationId: string,
  text: string,
): Promise<ChatMessagePayload> {
  return apiRequest<ChatMessagePayload>(`/matches/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function editMessage(
  conversationId: string,
  messageId: string,
  text: string,
): Promise<ChatMessagePayload> {
  return apiRequest<ChatMessagePayload>(`/matches/${conversationId}/messages/${messageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ text }),
  });
}

export function deleteMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  return apiRequest<void>(`/matches/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
  });
}

export function markMessageSeen(
  conversationId: string,
  messageId: string,
): Promise<void> {
  return apiRequest<void>(`/matches/${conversationId}/messages/${messageId}/seen`, {
    method: 'POST',
  });
}
