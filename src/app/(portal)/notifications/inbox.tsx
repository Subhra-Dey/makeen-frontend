'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Inbox as InboxIcon,
  Mail,
  MailOpen,
  MessageSquareReply,
  PenLine,
  Search,
  Stamp,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { KpiCard, KpiStrip } from '@/components/data/kpi-card';
import { NoticeButtons, NoticeCategory, noticeMeta } from '@/components/data/notice';
import { Pagination } from '@/components/data/data-table';
import { Button, Spinner } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field';
import { EmptyState, MessageBox, Panel } from '@/components/ui/panel';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { useInbox, useNoticeActions } from '@/lib/notifications';
import { queryString } from '@/lib/queries';
import {
  NOTIFICATION_MESSAGES,
  formatDateTimeIst,
  type InboxFilter,
  type NoticeView,
  type PersonOption,
} from '@/shared';

const FILTERS: readonly [InboxFilter, string][] = [
  ['ALL', 'All'],
  ['UNREAD', 'Unread'],
  ['TO_ACKNOWLEDGE', 'To acknowledge'],
  ['REPLIES', 'Replies'],
  ['CUSTOM', 'Custom'],
];

/**
 * Notifications tab (NOTIF-6): works like email — list on the left, the selected notice on the
 * right. Selecting a notice opens it and so marks it Read (NOTIF-2); nothing is marked Read
 * without being opened (NOTIF-4). The reply box shows only where Reply applies.
 */
export function Inbox() {
  const params = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [draftQ, setDraftQ] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<string | null>(params.get('open'));
  const [writing, setWriting] = useState(false);
  const list = useInbox(filter, q, page);
  const { read, readAll } = useNoticeActions();
  const rows = list.data?.rows ?? [];
  const selected = rows.find((r) => r.id === chosen) ?? null;
  const opened = useQuery({
    queryKey: ['notifications', 'one', chosen],
    queryFn: ({ signal }) => api<NoticeView>(`/api/notifications/${chosen ?? ''}`, { signal }),
    enabled: chosen !== null && !selected,
  });
  const notice = selected ?? opened.data ?? null;

  // Opening a notice marks it Read (NOTIF-2) — once per notice.
  const marked = useRef(new Set<string>());
  const markRead = read.mutate;
  useEffect(() => {
    if (!notice || notice.readAt || marked.current.has(notice.id)) return;
    marked.current.add(notice.id);
    markRead(notice.id);
  }, [notice, markRead]);

  function open(id: string): void {
    setChosen(id);
    router.replace(`/notifications${queryString({ open: id })}`, { scroll: false });
  }

  const c = list.data?.cards;
  const card = (
    label: string,
    value: number | undefined,
    f: InboxFilter | null,
    icon: React.ReactNode,
    sub?: string,
  ) => (
    <KpiCard
      label={label}
      value={value ?? null}
      sub={sub}
      tone={f === 'UNREAD' ? 'red' : f === 'TO_ACKNOWLEDGE' ? 'amber' : 'teal'}
      icon={icon}
      selected={f !== null && filter === f}
      onSelect={() => {
        setFilter(f ?? 'ALL');
        setPage(1);
      }}
    />
  );

  return (
    <>
      <KpiStrip>
        {card('All', c?.all, 'ALL', <InboxIcon className="size-[26px]" strokeWidth={1.9} />)}
        {card(
          'Unread',
          c?.unread,
          'UNREAD',
          <Mail className="size-[26px]" strokeWidth={1.9} />,
          'Stay Unread until opened',
        )}
        {card(
          'To acknowledge',
          c?.toAcknowledge,
          'TO_ACKNOWLEDGE',
          <Stamp className="size-[26px]" strokeWidth={1.9} />,
        )}
        {card(
          'Awaiting reply',
          c?.awaitingReply,
          null,
          <MessageSquareReply className="size-[26px]" strokeWidth={1.9} />,
        )}
      </KpiStrip>

      <Panel>
        <form
          className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(draftQ.trim());
            setPage(1);
          }}
        >
          <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
            {FILTERS.map(([f, label]) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
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
          <div className="flex min-w-0 flex-[1_1_240px] items-center gap-2">
            <TextInput
              aria-label="Search notices"
              placeholder="Search notices…"
              value={draftQ}
              onChange={(e) => {
                setDraftQ(e.target.value);
              }}
            />
            <Button
              type="submit"
              variant="dark"
              icon={<Search aria-hidden="true" className="size-4" />}
            >
              Search
            </Button>
          </div>
          <Button
            busy={readAll.isPending}
            disabled={!c?.unread}
            icon={<MailOpen aria-hidden="true" className="size-4" />}
            onClick={() => {
              readAll.mutate();
            }}
          >
            Mark all as Read
          </Button>
          <Button
            variant="primary"
            icon={<PenLine aria-hidden="true" className="size-4" />}
            onClick={() => {
              setWriting(true);
            }}
          >
            Write a note
          </Button>
        </form>

        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="min-w-0 border-line lg:border-r">
            {list.error && (
              <div className="p-4">
                <MessageBox tone="error" role="alert">
                  {list.error.message}
                </MessageBox>
              </div>
            )}
            {list.isLoading && (
              <div className="flex items-center gap-2 p-5 text-muted" role="status">
                <Spinner /> Loading…
              </div>
            )}
            {!list.isLoading && rows.length === 0 && <EmptyState>No notices</EmptyState>}
            <ul className="m-0 list-none p-0" aria-label="Notices">
              {rows.map((n) => (
                <li key={n.id} className="border-b border-[#EDF1F6]">
                  <button
                    type="button"
                    aria-current={n.id === notice?.id ? 'true' : undefined}
                    onClick={() => {
                      open(n.id);
                    }}
                    className={cn(
                      'flex w-full min-w-0 cursor-pointer flex-col gap-1 px-4 py-3 text-left',
                      n.id === notice?.id
                        ? 'bg-info-bg shadow-[inset_3px_0_0_var(--color-teal-ink)]'
                        : !n.readAt
                          ? 'bg-[#F4FAFB] hover:bg-[#EAF5F6]'
                          : 'hover:bg-[#F5F8FA]',
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {!n.readAt && (
                        <span
                          aria-hidden="true"
                          className="mt-1.5 size-2 flex-none rounded-full bg-teal-ink"
                        />
                      )}
                      <span
                        className={cn('min-w-0 text-[14px] text-navy', !n.readAt && 'font-bold')}
                      >
                        {n.title}
                        {!n.readAt && <span className="sr-only"> (unread)</span>}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-[12px] text-[#5B6576]">
                      {noticeMeta(n)} <NoticeCategory n={n} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {list.data && (
              <Pagination
                page={list.data.page}
                pageSize={list.data.pageSize}
                total={list.data.total}
                onPage={setPage}
              />
            )}
          </div>
          <div className="min-w-0 p-5">
            {notice ? (
              <NoticeDetail key={notice.id} n={notice} />
            ) : (
              <p className="m-0 text-muted">Select a notice to read it.</p>
            )}
          </div>
        </div>
      </Panel>

      {writing && (
        <NoteDialog
          onClose={() => {
            setWriting(false);
          }}
        />
      )}
    </>
  );
}

function NoticeDetail({ n }: { n: NoticeView }) {
  const { reply } = useNoticeActions();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <article className="flex min-w-0 flex-col gap-4" aria-label={n.title}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[18px] font-bold text-navy">{n.title}</h2>
          <p className="m-0 mt-1 text-[13px] text-[#5B6576]">
            From {n.sender?.name ?? 'System'} · {formatDateTimeIst(new Date(n.createdAt))} IST
            {n.readAt ? ' · Read' : ''}
          </p>
        </div>
        <NoticeCategory n={n} />
      </div>
      <p className="m-0 leading-relaxed whitespace-pre-line">{n.body}</p>
      <NoticeButtons n={n} />
      {n.canReply &&
        (n.repliedAt ? (
          <MessageBox tone="success">
            You replied on {formatDateTimeIst(new Date(n.repliedAt))}: {n.reply}
          </MessageBox>
        ) : (
          <div className="flex flex-col gap-2">
            <Field label="Reply" error={error ?? undefined}>
              {({ id, describedBy, invalid }) => (
                <TextArea
                  id={id}
                  placeholder="Write a reply…"
                  maxLength={2000}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                  }}
                />
              )}
            </Field>
            <div>
              <Button
                variant="primary"
                busy={reply.isPending}
                onClick={() => {
                  if (text.trim() === '') {
                    setError(NOTIFICATION_MESSAGES.replyRequired);
                    return;
                  }
                  setError(null);
                  reply.mutate(
                    { id: n.id, text },
                    {
                      onSuccess: () => {
                        toast.success('Reply sent.');
                      },
                      onError: (e) => {
                        setError(e.message);
                      },
                    },
                  );
                }}
              >
                Send reply
              </Button>
            </div>
          </div>
        ))}
    </article>
  );
}

/** Event 8: a written note to a named person (Read, Reply). */
function NoteDialog({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const people = useQuery({
    queryKey: ['notifications', 'people', search],
    queryFn: ({ signal }) =>
      api<PersonOption[]>(`/api/notifications/people${queryString({ q: search || undefined })}`, {
        signal,
      }),
  });
  const send = useMutation({
    mutationFn: () =>
      api<{ state: string }>('/api/notifications/notes', {
        method: 'POST',
        body: { toUserId: to, message },
      }),
    onSuccess: (r) => {
      toast.success(
        r.state === 'SENT' ? 'Note sent.' : 'Notes are switched off — nothing was sent.',
      );
      onClose();
    },
    onError: (e) => {
      setErrors(e instanceof ApiError ? e.fieldErrors() : { message: e.message });
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title="Write a note"
      description="The person can read it and reply."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            busy={send.isPending}
            onClick={() => {
              const out: Record<string, string> = {};
              if (!to) out['toUserId'] = NOTIFICATION_MESSAGES.personRequired;
              if (message.trim() === '') out['message'] = NOTIFICATION_MESSAGES.messageRequired;
              setErrors(out);
              if (Object.keys(out).length === 0) send.mutate();
            }}
          >
            Send note
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <Field label="Find a person">
          {({ id }) => (
            <TextInput
              id={id}
              placeholder="Type a name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          )}
        </Field>
        <Field label="To" required error={errors['toUserId']}>
          {({ id, describedBy, invalid }) => (
            <SelectInput
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
              }}
            >
              <option value="">Select person</option>
              {(people.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.designation}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Message" required error={errors['message']}>
          {({ id, describedBy, invalid }) => (
            <TextArea
              id={id}
              placeholder="Enter message"
              maxLength={2000}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
              }}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
