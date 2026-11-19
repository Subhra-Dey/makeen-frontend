'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { CircleCheck, Clock, Download, Plus, Search, Undo2, CalendarX2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { DataTable, Pagination } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import { KpiCard, KpiStrip } from '@/components/data/kpi-card';
import { StatusLegend, StatusPill, statusRowClass } from '@/components/data/status';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Field, SelectInput } from '@/components/ui/field';
import { MessageBox, Panel, PanelHeader } from '@/components/ui/panel';
import { downloadFile } from '@/lib/api/download';
import { queryString, useDailyMisList, type DailyMisFilters } from '@/lib/queries';
import { useMe } from '@/lib/session';
import {
  DAILY_MIS_MESSAGES,
  FIELD_MESSAGES,
  formatDate,
  formatDateTimeIst,
  formatNumber,
  type DailyMisListRow,
  type ReportStatus,
} from '@/shared';

const num = (v: string | number | null, dp: number): string =>
  v === null ? '—' : formatNumber(v, dp);

/**
 * Daily MIS table (DMIS-T0…T11, CARD-2, BTN-P1). One row = one plant + one date, tinted by
 * status. The Download buttons send exactly the applied filter, so file numbers equal these.
 */
export function DailyMisTable({ returnedOnly = false }: { returnedOnly?: boolean }) {
  const me = useMe().data;
  const caps = me?.access.modules.DAILY_MIS ?? [];
  const fixed: DailyMisFilters = returnedOnly ? { status: 'RETURNED' } : {};
  const [draft, setDraft] = useState<DailyMisFilters>(fixed);
  const [applied, setApplied] = useState<DailyMisFilters>(fixed);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState({ from: false, to: false });
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const list = useDailyMisList(applied, page);
  const data = list.data;

  function search(next: DailyMisFilters = draft): void {
    if (invalid.from || invalid.to) {
      setRangeError(FIELD_MESSAGES.dateInvalid);
      return;
    }
    if (next.from && next.to && next.to < next.from) {
      setRangeError(DAILY_MIS_MESSAGES.rangeOrder);
      return;
    }
    setRangeError(null);
    setApplied({ ...next, ...fixed });
    setPage(1);
  }

  function byStatus(s: ReportStatus): void {
    if (returnedOnly) return;
    const next = { ...applied, status: applied.status === s ? undefined : s };
    setDraft(next);
    search(next);
  }

  async function download(format: 'xlsx' | 'pdf'): Promise<void> {
    setBusy(format);
    try {
      const f = { ...applied, from: data?.from ?? applied.from, to: data?.to ?? applied.to };
      await downloadFile(
        `/api/daily-mis/export${queryString({ ...f, format })}`,
        `daily-mis.${format}`,
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'The download failed.');
    } finally {
      setBusy(null);
    }
  }

  const columns: ColumnDef<DailyMisListRow>[] = [
    { id: 'plant', header: 'Plant', cell: ({ row }) => <b>{row.original.plant.name}</b> },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => <span className="num">{formatDate(row.original.reportDate)}</span>,
    },
    {
      id: 'physical',
      header: 'Physical stock (MT)',
      meta: { numeric: true },
      cell: ({ row }) => num(row.original.physicalStock, 3),
    },
    {
      id: 'despatch',
      header: 'Bottling despatches (MT)',
      meta: { numeric: true },
      cell: ({ row }) => num(row.original.bottlingDespatches, 3),
    },
    {
      id: 'c142',
      header: 'Cyl. filled 14.2 kg',
      meta: { numeric: true },
      cell: ({ row }) => num(row.original.cylFilled142, 0),
    },
    {
      id: 'c19',
      header: 'Cyl. filled 19 kg',
      meta: { numeric: true },
      cell: ({ row }) => num(row.original.cylFilled19, 0),
    },
    {
      id: 'gain',
      header: 'Stock loss / gain (MT)',
      meta: { numeric: true },
      cell: ({ row }) => {
        const v = row.original.stockGainLoss;
        return (
          <span className={v?.startsWith('-') ? 'text-danger-text' : undefined}>{num(v, 3)}</span>
        );
      },
    },
    {
      id: 'acc',
      header: 'Accuracy (%)',
      meta: { numeric: true },
      cell: ({ row }) => num(row.original.accuracyZero, 2),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusPill status={row.original.status} />,
    },
    {
      id: 'modified',
      header: 'Last modified (IST)',
      cell: ({ row }) => (
        <span className="num">{formatDateTimeIst(new Date(row.original.updatedAt))}</span>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const r = row.original;
        const edit = caps.includes('SUBMIT') && r.status !== 'APPROVED';
        return (
          <ButtonLink
            href={`/daily-mis/${r.id}`}
            size="sm"
            aria-label={`${edit ? 'Edit' : 'Open'} ${r.plant.name} ${formatDate(r.reportDate)}`}
          >
            {edit ? 'Edit' : 'Open'}
          </ButtonLink>
        );
      },
    },
  ];

  const t = data?.totals;
  const footer = t
    ? [
        `Total · ${formatNumber(t.rows, 0)} rows`,
        '',
        '',
        formatNumber(t.bottlingDespatches, 3),
        formatNumber(t.cylFilled142, 0),
        formatNumber(t.cylFilled19, 0),
        formatNumber(t.stockGainLoss, 3),
        t.accuracyZeroAverage === null ? '—' : `avg ${formatNumber(t.accuracyZeroAverage, 2)}`,
        '',
        '',
        '',
      ]
    : undefined;
  const period = data ? `${formatDate(data.from)} to ${formatDate(data.to)}` : '';

  return (
    <PageBody>
      <PageHeader
        crumb={returnedOnly ? 'Daily MIS › Returned' : 'Daily MIS'}
        title={returnedOnly ? 'Returned MIS' : 'Daily MIS'}
        sub={
          returnedOnly
            ? 'Rows the Plant Manager sent back for correction'
            : 'Daily plant report — one plant, one calendar day'
        }
      />
      <FilterBar
        onSearch={() => {
          search();
        }}
        actions={
          <>
            <Button
              type="submit"
              variant="dark"
              icon={<Search aria-hidden="true" className="size-[17px]" />}
            >
              Search
            </Button>
            {caps.includes('SUBMIT') && (
              <ButtonLink
                href="/daily-mis/new"
                variant="primary"
                icon={<Plus aria-hidden="true" className="size-[17px]" />}
              >
                Submit
              </ButtonLink>
            )}
            {caps.includes('DOWNLOAD') && (
              <>
                <Button
                  busy={busy === 'xlsx'}
                  icon={<Download aria-hidden="true" className="size-[17px]" />}
                  onClick={() => void download('xlsx')}
                >
                  Download Excel
                </Button>
                <Button
                  busy={busy === 'pdf'}
                  icon={<Download aria-hidden="true" className="size-[17px]" />}
                  onClick={() => void download('pdf')}
                >
                  PDF
                </Button>
              </>
            )}
          </>
        }
      >
        <Field label="Plant" className="flex-[1_1_240px]">
          {({ id }) => (
            <SelectInput
              id={id}
              value={draft.plantId ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, plantId: e.target.value || undefined });
              }}
            >
              <option value="">All plants this login may see</option>
              {me?.plants.map((p) => (
                <option key={p.plantId} value={p.plantId}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field
          label="Date or date range"
          error={rangeError ?? undefined}
          className="flex-[1_1_300px]"
        >
          {({ id, describedBy }) => (
            <div className="flex items-center gap-1.5">
              <DateInput
                id={id}
                aria-label="From date"
                aria-describedby={describedBy}
                value={draft.from ?? data?.from ?? ''}
                onChange={(v) => {
                  setInvalid({ ...invalid, from: v === null });
                  if (v !== null) setDraft({ ...draft, from: v || undefined });
                }}
              />
              <span className="text-muted">to</span>
              <DateInput
                aria-label="To date"
                aria-describedby={describedBy}
                value={draft.to ?? data?.to ?? ''}
                onChange={(v) => {
                  setInvalid({ ...invalid, to: v === null });
                  if (v !== null) setDraft({ ...draft, to: v || undefined });
                }}
              />
            </div>
          )}
        </Field>
      </FilterBar>

      <KpiStrip>
        <KpiCard
          label="Pending"
          value={data?.cards.pending ?? null}
          sub="Waiting for Approve"
          tone="amber"
          icon={<Clock className="size-[26px]" strokeWidth={1.9} />}
          selected={applied.status === 'PENDING'}
          onSelect={
            returnedOnly
              ? undefined
              : () => {
                  byStatus('PENDING');
                }
          }
        />
        <KpiCard
          label="Approved"
          value={data?.cards.approved ?? null}
          sub="Locked rows"
          tone="teal"
          icon={<CircleCheck className="size-[26px]" strokeWidth={1.9} />}
          selected={applied.status === 'APPROVED'}
          onSelect={
            returnedOnly
              ? undefined
              : () => {
                  byStatus('APPROVED');
                }
          }
        />
        <KpiCard
          label="Returned"
          value={data?.cards.returned ?? null}
          sub="Back with the entry person"
          tone="red"
          icon={<Undo2 className="size-[26px]" strokeWidth={1.9} />}
          selected={applied.status === 'RETURNED'}
          onSelect={
            returnedOnly
              ? undefined
              : () => {
                  byStatus('RETURNED');
                }
          }
        />
        <KpiCard
          label="Not initiated"
          value={data?.cards.notInitiated ?? null}
          sub="Plant-days with no Daily MIS"
          tone="slate"
          icon={<CalendarX2 className="size-[26px]" strokeWidth={1.9} />}
        />
      </KpiStrip>

      <Panel>
        <PanelHeader
          title={`Daily MIS${period ? ` · ${period}` : ''}`}
          sub="One row = one plant + one calendar date. Two Drafts for the same plant and date are both shown."
          actions={<StatusLegend />}
        />
        {list.error && (
          <div className="px-5 pt-4">
            <MessageBox tone="error" role="alert">
              {list.error.message}
            </MessageBox>
          </div>
        )}
        <DataTable
          caption="Daily MIS"
          columns={columns}
          rows={data?.rows ?? []}
          getRowId={(r) => r.id}
          rowClass={(r) => statusRowClass(r.status)}
          loading={list.isFetching}
          footer={footer}
        />
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[13px] text-muted">
            <span className="num">
              Showing {formatNumber(data.rows.length, 0)} of {formatNumber(data.total, 0)} rows ·
              Download uses this same filter
            </span>
          </div>
        )}
        {data && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={setPage}
          />
        )}
      </Panel>
    </PageBody>
  );
}
