'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { InboxFilter, InboxPage, NoticeView, UnreadCount } from '@/shared';
import { api } from './api/client';
import { queryString } from './queries';

export const noticeKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread'] as const,
  inbox: (filter: InboxFilter, q: string, page: number, size: number) =>
    ['notifications', 'inbox', filter, q, page, size] as const,
};

/** Fallback refresh when the stream is not connected (NOTIF-J2). */
export const UNREAD_POLL_MS = 30_000;

/**
 * Unread count for the bell and the Notifications tab (NOTIF-1). Live through server-sent events
 * (`/api/notifications/stream`); polled every 30 s as well, so a dropped stream (proxy, expired
 * session) never leaves a stale count for long. Each push also refreshes open inbox lists.
 */
export function useUnreadCount(enabled = true) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: noticeKeys.unread,
    queryFn: ({ signal }) => api<UnreadCount>('/api/notifications/unread-count', { signal }),
    refetchInterval: UNREAD_POLL_MS,
    enabled,
  });
  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') return;
    const source = new EventSource('/api/notifications/stream', { withCredentials: true });
    const onUnread = (ev: MessageEvent<string>): void => {
      try {
        const data = JSON.parse(ev.data) as UnreadCount;
        const before = qc.getQueryData<UnreadCount>(noticeKeys.unread);
        qc.setQueryData(noticeKeys.unread, data);
        if (before && before.unread !== data.unread)
          void qc.invalidateQueries({ queryKey: [...noticeKeys.all, 'inbox'] });
      } catch {
        /* ignore a malformed event; polling keeps the count right */
      }
    };
    source.addEventListener('unread', onUnread);
    return () => {
      source.removeEventListener('unread', onUnread);
      source.close();
    };
  }, [enabled, qc]);
  return q.data?.unread ?? null;
}

export function useInbox(filter: InboxFilter, q: string, page: number, pageSize = 30) {
  return useQuery({
    queryKey: noticeKeys.inbox(filter, q, page, pageSize),
    queryFn: ({ signal }) =>
      api<InboxPage>(
        `/api/notifications${queryString({ filter, q: q || undefined, page, pageSize })}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

/** Read / Acknowledge / Reply / Mark all as Read — every change refreshes the inbox and count. */
export function useNoticeActions() {
  const qc = useQueryClient();
  const refresh = async (): Promise<void> => {
    await qc.invalidateQueries({ queryKey: noticeKeys.all });
  };
  const read = useMutation({
    mutationFn: (id: string) =>
      api<NoticeView>(`/api/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const acknowledge = useMutation({
    mutationFn: (id: string) =>
      api<NoticeView>(`/api/notifications/${id}/acknowledge`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const reply = useMutation({
    mutationFn: (v: { id: string; text: string }) =>
      api<NoticeView>(`/api/notifications/${v.id}/reply`, {
        method: 'POST',
        body: { text: v.text },
      }),
    onSuccess: refresh,
  });
  const readAll = useMutation({
    mutationFn: () => api<UnreadCount>('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: refresh,
  });
  return { read, acknowledge, reply, readAll };
}
