'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, TextArea } from '@/components/ui/field';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { dailyKeys, monthlyKeys, type QueueModule } from '@/lib/queries';
import { DAILY_MIS_MESSAGES } from '@/shared';
import type { Reviewable } from './review-actions';

const WHAT: Record<QueueModule, { base: string; label: string; note: string }> = {
  DAILY_MIS: { base: '/api/daily-mis', label: 'Daily MIS', note: '' },
  MONTHLY_MIS: {
    base: '/api/monthly-mis',
    label: 'Monthly MIS',
    note: ' The Cumulative Daily Summary is computed live again.',
  },
};

/** Reopen an Approved Daily or Monthly MIS with a mandatory reason (APPR-5, ACT-3). */
export function ReopenDialog({
  row,
  module,
  period,
  onClose,
}: {
  row: Reviewable;
  module: QueueModule;
  period: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const what = WHAT[module];
  const keys = module === 'DAILY_MIS' ? dailyKeys : monthlyKeys;
  const reopen = useMutation({
    mutationFn: () =>
      api<Reviewable>(`${what.base}/${row.id}/reopen`, {
        method: 'POST',
        body: { version: row.version, reason },
      }),
    onSuccess: async (updated) => {
      toast.success('Reopened — the row is Pending again.');
      qc.setQueryData(keys.row(updated.id), updated);
      await qc.invalidateQueries({ queryKey: [...keys.all, 'list'] });
      await qc.invalidateQueries({ queryKey: ['approval-queue'] });
      onClose();
    },
    onError: (e) => {
      setError(
        e instanceof ApiError ? (e.fieldErrors()['reason'] ?? e.message) : 'Something went wrong.',
      );
    },
  });
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={`Reopen this Approved ${what.label}`}
      description={`${row.plant.name} · ${period} — the row goes back to Pending and can be edited again.${what.note}`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            busy={reopen.isPending}
            icon={<RotateCcw aria-hidden="true" className="size-4" />}
            onClick={() => {
              if (reason.trim() === '') {
                setError(DAILY_MIS_MESSAGES.reopenReasonRequired);
                return;
              }
              reopen.mutate();
            }}
          >
            Reopen
          </Button>
        </>
      }
    >
      <Field label="Reason" required error={error ?? undefined}>
        {({ id, describedBy, invalid }) => (
          <TextArea
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            maxLength={1000}
            placeholder="Why does this approved report need to change?"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
            }}
          />
        )}
      </Field>
    </Dialog>
  );
}
