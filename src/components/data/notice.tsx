'use client';

import { Check, CheckCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { useNoticeActions } from '@/lib/notifications';
import { formatDateTimeIst, noticeHref, type NoticeView } from '@/shared';

const CATEGORY: Record<NoticeView['category'], string> = {
  SYSTEM: 'System',
  CUSTOM: 'Custom',
  PERSON: 'Person',
};

export function NoticeCategory({ n }: { n: NoticeView }) {
  return (
    <Pill
      tone={n.category === 'SYSTEM' ? 'neutral' : n.category === 'CUSTOM' ? 'info' : 'approved'}
    >
      {n.category === 'CUSTOM' && n.customCategory ? n.customCategory : CATEGORY[n.category]}
    </Pill>
  );
}

/** “Asha Nair · 16-10-2026 09:12” (IST). */
export function noticeMeta(n: NoticeView): string {
  return `${n.sender?.name ?? 'System'} · ${formatDateTimeIst(new Date(n.createdAt))}`;
}

/** “Daily MIS · HPCL Yediyur” — what Open row leads to. */
function rowLabel(n: NoticeView): string {
  const what: Record<string, string> = {
    daily_mis: 'Daily MIS',
    monthly_mis: 'Monthly MIS',
    daily_exception: 'Daily Exception',
    licence: 'Licence',
    audit: 'Audit',
    plant: 'Plant',
    notification: 'Original note',
  };
  const kind = n.link ? (what[n.link.entity] ?? 'Row') : 'Row';
  return n.plant ? `${kind} · ${n.plant.name}` : kind;
}

/**
 * The buttons of one notice (NOTIF-3): Read while unread; Acknowledge as its own click when the
 * notice has it; Open row goes to the exact row and marks the notice Read (NOTIF-2).
 */
export function NoticeButtons({
  n,
  compact = false,
  onOpen,
}: {
  n: NoticeView;
  compact?: boolean;
  onOpen?: () => void;
}) {
  const { read, acknowledge } = useNoticeActions();
  const href = noticeHref(n.link?.entity ?? null, n.link?.id ?? null);
  const size = compact ? 'sm' : 'md';
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!n.readAt && (
        <Button
          size={size}
          busy={read.isPending && read.variables === n.id}
          icon={<Check aria-hidden="true" className="size-4" />}
          aria-label={`Mark read: ${n.title}`}
          onClick={() => {
            read.mutate(n.id);
          }}
        >
          Read
        </Button>
      )}
      {n.canAcknowledge &&
        (n.acknowledgedAt ? (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-teal-ink">
            <CheckCheck aria-hidden="true" className="size-4" /> Acknowledged
          </span>
        ) : (
          <Button
            size={size}
            variant="primary"
            busy={acknowledge.isPending && acknowledge.variables === n.id}
            aria-label={`Acknowledge: ${n.title}`}
            onClick={() => {
              acknowledge.mutate(n.id);
            }}
          >
            Acknowledge
          </Button>
        ))}
      {href && (
        <Link
          href={href}
          className="inline-flex min-h-touch items-center gap-1.5 text-[13px] font-semibold text-teal-ink"
          onClick={() => {
            if (!n.readAt) read.mutate(n.id);
            onOpen?.();
          }}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          Open row{compact ? '' : `: ${rowLabel(n)}`}
        </Link>
      )}
    </div>
  );
}
