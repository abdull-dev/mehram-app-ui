/**
 * Notification feed.
 *
 * The server has carried this since the notifications module landed — list,
 * unread count, mark one read, mark all read — and no client code called any of
 * it. `NotificationsScreen` is the *preferences* screen (which types to send);
 * nothing ever showed the notifications themselves.
 */
import { apiRequest } from './client';

export type NotificationType =
  | 'MATCH_CREATED'
  | 'MESSAGE_RECEIVED'
  | 'INTEREST_RECEIVED'
  | 'INVITE_ACCEPTED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'WALI_APPROVAL_NEEDED'
  | 'WALI_APPROVAL_GRANTED'
  | 'PROFILE_VIEW'
  | 'WEEKLY_REMINDER'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Free-form payload the server attaches; shape varies by type. */
  data?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * Newest first. `before` takes the id of the oldest row you already have.
 *
 * No `unreadOnly`: the query DTO accepts only `limit` and `before`, and the app
 * validates with `forbidNonWhitelisted`, so any extra parameter is a 400 rather
 * than something quietly ignored.
 */
export async function getNotifications(opts?: {
  limit?: number;
  before?: string;
}): Promise<AppNotification[]> {
  const q = new URLSearchParams();
  if (opts?.limit) q.set('limit', String(opts.limit));
  if (opts?.before) q.set('before', opts.before);
  const qs = q.toString();
  return apiRequest<AppNotification[]>(`/notifications${qs ? `?${qs}` : ''}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
  // The route returns a small object rather than a bare number.
  const res = await apiRequest<{ count: number } | number>('/notifications/unread-count');
  return typeof res === 'number' ? res : (res?.count ?? 0);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest<void>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiRequest<void>('/notifications/read-all', { method: 'PATCH' });
}

/**
 * Which notifications the server may send.
 *
 * The names are the server's, which predate the app's proposal vocabulary:
 * `newInterest` is a proposal arriving and `interestAccepted` is its status
 * changing. Renaming the columns is a migration; the labels are the app's job.
 */
export interface NotificationPreferences {
  newInterest: boolean;
  interestAccepted: boolean;
  newMessage: boolean;
  waliApproval: boolean;
  /** Opt-in weekly nudge; the server has a job behind it. */
  weeklyReminder: boolean;
  systemUpdates: boolean;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>('/notifications/preferences');
}

/**
 * Send only what changed.
 *
 * The DTO whitelists exactly these five keys and the app validates with
 * `forbidNonWhitelisted`, so an extra field is a 400 rather than a no-op.
 */
export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>('/notifications/preferences', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
