'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { FilterBar } from '@/components/data/filter-bar';
import { StatusPill } from '@/components/data/status';
import { ReviewActions } from '@/components/forms/review-actions';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { Field, SelectInput } from '@/components/ui/field';
import { EmptyState, MessageBox, Panel, PanelHeader } from '@/components/ui/panel';
import { cn } from '@/lib/cn';
import { useApprovalQueue, useDailyMis, useMonthlyMis, type QueueModule } from '@/lib/queries';
import { useMe } from '@/lib/session';
import {
  formatDate,
  formatDateTimeIst,
  formatMonthYear,
  formatNumber,
  sumDecimals,
  type ApprovalQueueItem,
  type DailyMisDetail,
  type MonthlyMisDetail,
} from '@/shared';

const MODULE_LABEL: Record<QueueModule, string> = {
  DAILY_MIS: 'Daily MIS',
  MONTHLY_MIS: 'Monthly MIS',
};

const periodOf = (it: { module: QueueModule; period: string }): string =>
  it.module === 'DAILY_MIS' ? formatDate(it.period) : formatMonthYear(it.period);

const COLS = 'grid-cols-[48px_1.4fr_1fr_1fr_1fr_1.3fr_110px_110px]';

/**
 * Approval queue (APPR-Q1…Q4): Pending Daily and Monthly MIS rows, oldest first. Selecting a row
 * loads its key figures read only below; Approve and Return act only on that row, in any order.
 */
export function ApprovalQueue() {
  const me = useMe().data;
  const allowed = (['DAILY_MIS'] as const).filter(
    (m) => me?.access.modules[m].includes('APPROVE') ?? false,
  );
  const [draft, setDraft] = useState<{ plant?: string; module?: QueueModule }>({});
  const [applied, setApplied] = useState<{ plant?: string; module?: QueueModule }>({});
  const modules = applied.module ? allowed.filter((m) => m === applied.module) : allowed;
  const queue = useApprovalQueue(applied.plant, modules);
  const items = queue.data ?? [];
  const [chosen, setChosen] = useState<string | null>(null);
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === chosen),
  );
  const selected = items[index] ?? null;

  function move(step: number): void {
    const next = items[index + step];
    if (next) setChosen(next.id);
  }

  function after(): void {
    const next = items[index + 1] ?? items[index - 1];
    setChosen(next ? next.id : null);
  }

  return (
    <PageBody>
      <PageHeader
        crumb="Daily MIS › Pending approval"
        title="Approval queue"
        sub="Plant Manager / Admin · Daily and Monthly MIS in Pending status"
      />
      <FilterBar
        onSearch={() => {
          setApplied(draft);
          setChosen(null);
        }}
        actions={
          <Button
            type="submit"
            variant="dark"
            icon={<Search aria-hidden="true" className="size-[17px]" />}
          >
            Search
          </Button>
        }
      >
        <Field label="Plant" className="flex-[1_1_240px]">
          {({ id }) => (
            <SelectInput
              id={id}
              value={draft.plant ?? ''}
              onChange={(e) => {
                setDraft({ ...draft, plant: e.target.value || undefined });
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
        {allowed.length > 1 && (
          <Field label="Module" className="flex-[0_1_220px]">
            {({ id }) => (
              <SelectInput
                id={id}
                value={draft.module ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({
                    ...draft,
                    module: v === 'DAILY_MIS' || v === 'MONTHLY_MIS' ? v : undefined,
                  });
                }}
              >
                <option value="">Daily and Monthly MIS</option>
                {allowed.map((m) => (
                  <option key={m} value={m}>
                    {MODULE_LABEL[m]}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        )}
      </FilterBar>

      <Panel>
        <PanelHeader
          title="Pending queue · oldest first"
          sub="Select a row to load its figures below. Approve and Return act only on the selected row."
        />
        {queue.error && (
          <div className="px-5 pt-4">
            <MessageBox tone="error" role="alert">
              {queue.error.message}
            </MessageBox>
          </div>
        )}
        <div className="overflow-x-auto">
          <div className="min-w-[860px]" role="listbox" aria-label="Pending rows">
            <div
              className={cn(
                'grid border-b border-line bg-table-head text-[12.5px] font-semibold text-[#3E5266]',
                COLS,
              )}
            >
              {[
                '#',
                'Plant',
                'Date / month',
                'Module',
                'Entered by',
                'Last saved (IST)',
                'Waiting',
                'Status',
              ].map((h, i) => (
                <span key={h} className={cn('px-4 py-3', i === 6 && 'text-right')}>
                  {h}
                </span>
              ))}
            </div>
            {queue.isLoading && (
              <div className="flex items-center gap-2 px-5 py-8 text-muted" role="status">
                <Spinner /> Loading…
              </div>
            )}
            {!queue.isLoading && items.length === 0 && <EmptyState />}
            {items.map((it, i) => {
              const on = it.id === selected?.id;
              return (
                <button
                  key={it.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setChosen(it.id);
                  }}
                  className={cn(
                    'grid min-h-[46px] w-full cursor-pointer items-center border-b border-[#EDF1F6] text-left text-[13.5px] text-navy',
                    COLS,
                    on
                      ? 'bg-info-bg shadow-[inset_0_0_0_2px_var(--color-teal-ink)]'
                      : 'bg-pending-row hover:bg-[#FFF3DD]',
                  )}
                >
                  <span className="px-4 py-3 num">{i + 1}</span>
                  <span className="px-4 py-3 font-bold">{it.plant.name}</span>
                  <span className="px-4 py-3 num">{periodOf(it)}</span>
                  <span className="px-4 py-3">{MODULE_LABEL[it.module]}</span>
                  <span className="px-4 py-3">{it.enteredBy}</span>
                  <span className="px-4 py-3 num">
                    {formatDateTimeIst(new Date(it.lastSavedAt))}
                  </span>
                  <span className="px-4 py-3 text-right num">
                    {formatNumber(it.waitingHours, 1)} h
                  </span>
                  <span className="px-4 py-2.5">
                    <StatusPill status="PENDING" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {selected && (
        <Panel>
          <PanelHeader
            title={`${selected.plant.name} · ${periodOf(selected)} · ${MODULE_LABEL[selected.module]}`}
            sub={`Entered by ${selected.enteredBy} · read only · row ${index + 1} of ${items.length}`}
            actions={
              <>
                <Button
                  size="sm"
                  disabled={index === 0}
                  icon={<ChevronLeft aria-hidden="true" className="size-4" />}
                  onClick={() => {
                    move(-1);
                  }}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  disabled={index >= items.length - 1}
                  onClick={() => {
                    move(1);
                  }}
                >
                  Next <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
                <ButtonLink
                  size="sm"
                  href={
                    selected.module === 'DAILY_MIS'
                      ? `/daily-mis/${selected.id}`
                      : `/monthly-mis/${selected.id}`
                  }
                >
                  {selected.module === 'DAILY_MIS'
                    ? 'Open full form (60 fields)'
                    : 'Open full form (122 items)'}
                </ButtonLink>
              </>
            }
          />
          <div className="flex flex-col gap-[18px] p-5">
            {selected.module === 'DAILY_MIS' ? (
              <DailySelected item={selected} onDone={after} />
            ) : (
              <MonthlySelected item={selected} onDone={after} />
            )}
          </div>
        </Panel>
      )}
    </PageBody>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 text-muted" role="status">
      <Spinner /> Loading…
    </div>
  );
}

function DailySelected({ item, onDone }: { item: ApprovalQueueItem; onDone: () => void }) {
  const row = useDailyMis(item.id);
  if (!row.data) return <Loading />;
  return (
    <>
      <DailyKeyFigures row={row.data} />
      <ReviewActions
        row={row.data}
        module="DAILY_MIS"
        period={formatDate(row.data.reportDate)}
        onDone={onDone}
      />
    </>
  );
}

function MonthlySelected({ item, onDone }: { item: ApprovalQueueItem; onDone: () => void }) {
  const row = useMonthlyMis(item.id);
  if (!row.data) return <Loading />;
  return (
    <>
      <MonthlyKeyFigures row={row.data} />
      <ReviewActions
        row={row.data}
        module="MONTHLY_MIS"
        period={formatMonthYear(row.data.month)}
        onDone={onDone}
      />
    </>
  );
}

function Figures({ items }: { items: readonly [string, string][] }) {
  return (
    <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {items.map(([k, val]) => (
        <div key={k} className="rounded-[10px] border border-[#E7EEF3] bg-[#F5F8FA] px-3 py-2.5">
          <dt className="text-[12px] text-[#5B6576]">{k}</dt>
          <dd className="m-0 text-[15px] font-bold num">{val}</dd>
        </div>
      ))}
    </dl>
  );
}

const n = (x: string | number | null, dp: number): string =>
  x === null ? '—' : formatNumber(x, dp);

function DailyKeyFigures({ row }: { row: DailyMisDetail }) {
  const v = row.values;
  const despatch =
    v.normalCylinderDespatch === null && v.otCylinderDespatch === null
      ? '—'
      : formatNumber(sumDecimals([v.normalCylinderDespatch, v.otCylinderDespatch], 3), 3);
  return (
    <Figures
      items={[
        ['Physical stock (MT)', n(v.physicalStock, 3)],
        ['Bottling despatches (MT)', despatch],
        ['Cylinders filled — 14.2 kg', n(v.cylFilled142, 0)],
        ['Cylinders filled — 19 kg', n(v.cylFilled19, 0)],
        ['Stock loss / gain (MT)', n(row.derived.stockGainLoss, 3)],
        ['Accuracy — 0 gms (%)', n(v.accuracyZero, 2)],
        ['Mechanical time loss (min)', n(row.derived.lossMechanicalTotal, 0)],
        ['Electrical time loss (min)', n(row.derived.lossElectricalTotal, 0)],
        ['Market returns (cyl)', n(row.derived.mrTotal, 0)],
      ]}
    />
  );
}

function MonthlyKeyFigures({ row }: { row: MonthlyMisDetail }) {
  const s = row.summary.items;
  const v = row.values;
  const pair = (a: string | number | null, b: string | number | null): string =>
    a === null && b === null ? '—' : formatNumber(sumDecimals([a, b], 2), 2);
  return (
    <Figures
      items={[
        [
          'Approved days counted',
          `${String(row.summary.approvedDays)} of ${String(row.summary.daysInMonth)}`,
        ],
        ['Total production (MT)', n(s.totalProduction, 3)],
        ['Cylinder despatches (MT)', n(s.totalCylinderDespatch, 3)],
        ['TT loading (MT)', n(s.totalTtLoading, 3)],
        ['Total normal shifts', n(s.totalShifts, 0)],
        ['Electricity units (kW)', pair(v.ebUnits, v.dgUnits)],
        ['Diesel consumed (litres)', pair(v.dieselDg, v.dieselFireEngine)],
        [
          'Penalties incurred',
          v.penaltyIncurred === 'YES' ? 'Yes' : v.penaltyIncurred ? 'No' : '—',
        ],
        ['Total trainings', formatNumber(row.trainingTotal, 0)],
      ]}
    />
  );
}
