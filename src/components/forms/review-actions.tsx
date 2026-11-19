'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/field';
import { MessageBox } from '@/components/ui/panel';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { dailyKeys, monthlyKeys, type QueueModule } from '@/lib/queries';
import { DAILY_MIS_MESSAGES, type DailyMisPermissions, type PlantRef } from '@/shared';

/** What Approve / Return needs from a Daily or Monthly MIS row. */
export interface Reviewable {
  id: string;
  version: number;
  plant: PlantRef;
  can: DailyMisPermissions;
}

const BASE: Record<QueueModule, string> = {
  DAILY_MIS: '/api/daily-mis',
  MONTHLY_MIS: '/api/monthly-mis',
};

/**
 * Approve & lock / Return with a mandatory reason (APPR-1…3, UXV-8) on one Pending Daily or
 * Monthly MIS. Used on the approval queue and on both forms; rendered only for people who may
 * approve or return.
 */
export function ReviewActions<T extends Reviewable>({
  row,
  module,
  period,
  onDone,
}: {
  row: T;
  module: QueueModule;
  /** Shown in the confirmation, e.g. “16-10-2026” or “September 2026”. */
  period: string;
  onDone?: (updated: T) => void;
}) {
  const qc = useQueryClient();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const keys = module === 'DAILY_MIS' ? dailyKeys : monthlyKeys;

  async function refresh(): Promise<void> {
    await qc.invalidateQueries({ queryKey: keys.all });
    await qc.invalidateQueries({ queryKey: ['approval-queue'] });
  }

  const act = useMutation({
    mutationFn: (kind: 'approve' | 'return') =>
      api<T>(`${BASE[module]}/${row.id}/${kind}`, {
        method: 'POST',
        body: kind === 'approve' ? { version: row.version } : { version: row.version, reason },
      }),
    onSuccess: async (updated, kind) => {
      toast.success(
        `${row.plant.name} · ${period} — ${kind === 'approve' ? 'Approved and locked' : 'Returned'}`,
      );
      setReason('');
      qc.setQueryData(keys.row(updated.id), updated);
      await refresh();
      onDone?.(updated);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') {
        setError(e.fieldErrors()['reason'] ?? e.message);
      } else if (e instanceof ApiError && e.status === 409) {
        toast.error(e.message);
        void refresh();
      } else if (e instanceof Error) setError(e.message);
    },
  });

  function doReturn(): void {
    if (reason.trim() === '') {
      setError(DAILY_MIS_MESSAGES.returnReasonRequired);
      document.getElementById(reasonId)?.focus();
      return;
    }
    setError(null);
    act.mutate('return');
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      {row.can.return && (
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-1.5 text-[12.5px] font-semibold text-[#2A3E52]">
          <label htmlFor={reasonId}>
            Reason for Return{' '}
            <span className="font-normal text-[#5B6576]">Mandatory when returning</span>
          </label>
          <TextArea
            id={reasonId}
            placeholder={DAILY_MIS_MESSAGES.returnReasonPlaceholder}
            value={reason}
            maxLength={1000}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${reasonId}-err` : undefined}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
          {error && (
            <span
              id={`${reasonId}-err`}
              role="alert"
              className="text-[12px] font-medium text-danger-text"
            >
              {error}
            </span>
          )}
        </div>
      )}
      <div className="flex gap-2.5 self-end">
        {row.can.return && (
          <Button
            variant="danger"
            busy={act.isPending && act.variables === 'return'}
            onClick={doReturn}
          >
            Return
          </Button>
        )}
        {row.can.approve && (
          <Button
            variant="primary"
            busy={act.isPending && act.variables === 'approve'}
            icon={<Check aria-hidden="true" className="size-4" />}
            onClick={() => {
              setError(null);
              act.mutate('approve');
            }}
          >
            Approve &amp; lock
          </Button>
        )}
      </div>
      {error && !row.can.return && (
        <MessageBox tone="error" role="alert" className="w-full">
          {error}
        </MessageBox>
      )}
    </div>
  );
}
