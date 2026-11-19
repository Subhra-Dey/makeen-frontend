'use client';

import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { NoticeButtons, noticeMeta } from '@/components/data/notice';
import { Button, Spinner } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useInbox, useNoticeActions, useUnreadCount } from '@/lib/notifications';
import type { InboxFilter } from '@/shared';

const FILTERS: readonly [InboxFilter, string][] = [
  ['ALL', 'All'],
  ['UNREAD', 'Unread'],
  ['TO_ACKNOWLEDGE', 'To acknowledge'],
  ['REPLIES', 'Replies'],
];

/**
 * Header bell (HDR-2, NOTIF-5): red Unread count; the drop-down has filters All / Unread / To
 * acknowledge / Replies, each notice with its buttons and an Open row link, and Mark all as Read.
 */
export function NotificationBell() {
  const unread = useUnreadCount();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const { readAll } = useNoticeActions();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={unread ? `Notifications, ${String(unread)} unread` : 'Notifications'}
        className="relative flex size-touch cursor-pointer items-center justify-center rounded-[10px] text-navy hover:bg-[#F1F4F8]"
      >
        <Bell aria-hidden="true" className="size-[23px]" strokeWidth={1.8} />
        {unread !== null && unread > 0 && (
          <span className="absolute top-[5px] right-1 h-[19px] min-w-[19px] rounded-[10px] bg-danger-text px-[5px] text-center text-[11px] leading-[19px] font-bold text-white num">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 flex max-h-[min(640px,80dvh)] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[0_16px_40px_rgba(11,39,66,0.18)]"
          aria-label="Notifications"
        >
          {open && (
            <BellBody
              filter={filter}
              setFilter={setFilter}
              close={() => {
                setOpen(false);
              }}
            />
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
            <Button
              size="sm"
              busy={readAll.isPending}
              disabled={!unread}
              onClick={() => {
                readAll.mutate();
              }}
            >
              Mark all as Read
            </Button>
            <Link
              href="/notifications"
              className="text-[13px] font-semibold text-teal-ink"
              onClick={() => {
                setOpen(false);
              }}
            >
              Open inbox
            </Link>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function BellBody({
  filter,
  setFilter,
  close,
}: {
  filter: InboxFilter;
  setFilter: (f: InboxFilter) => void;
  close: () => void;
}) {
  const list = useInbox(filter, '', 1, 8);
  const rows = list.data?.rows ?? [];
  return (
    <>
      <div
        className="flex flex-wrap gap-1 border-b border-line px-3 py-2"
        role="group"
        aria-label="Show"
      >
        {FILTERS.map(([f, label]) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => {
              setFilter(f);
            }}
            className={cn(
              'min-h-touch cursor-pointer rounded-[9px] px-3 text-[13px] font-semibold',
              filter === f ? 'bg-navy text-white' : 'text-[#334155] hover:bg-[#F1F4F8]',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.isLoading && (
          <div className="flex items-center gap-2 p-4 text-muted" role="status">
            <Spinner /> Loading…
          </div>
        )}
        {!list.isLoading && rows.length === 0 && <p className="m-0 p-4 text-muted">No notices</p>}
        <ul className="m-0 list-none p-0">
          {rows.map((n) => (
            <li
              key={n.id}
              className={cn(
                'border-b border-[#EDF1F6] px-4 py-3 last:border-b-0',
                !n.readAt && 'bg-[#F4FAFB]',
              )}
            >
              <p className="m-0 flex items-start gap-2 text-[13.5px] font-semibold text-navy">
                {!n.readAt && (
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2 flex-none rounded-full bg-teal-ink"
                  />
                )}
                <span className="min-w-0">
                  {n.title}
                  {!n.readAt && <span className="sr-only"> (unread)</span>}
                </span>
              </p>
              <p className="m-0 mt-0.5 text-[12px] text-[#5B6576]">{noticeMeta(n)}</p>
              <div className="mt-2">
                <NoticeButtons n={n} compact onOpen={close} />
              </div>
              {n.canReply && !n.repliedAt && (
                <Link
                  href={`/notifications?open=${n.id}`}
                  className="mt-1 inline-flex min-h-touch items-center text-[13px] font-semibold text-teal-ink"
                  onClick={close}
                >
                  Reply
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
