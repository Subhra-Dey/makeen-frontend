'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowRight,
  CalendarX2,
  Clock,
  Download,
  FileWarning,
  Plus,
  Search,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { PerformanceChart } from '@/components/charts/performance-chart';
import { DataTable } from '@/components/data/data-table';
import { FilterBar } from '@/components/data/filter-bar';
import { KpiCard, KpiStrip } from '@/components/data/kpi-card';
import {
  ExceptionPill,
  StatusPill,
  exceptionRowClass,
  statusRowClass,
} from '@/components/data/status';
import { ReviewActions } from '@/components/forms/review-actions';
import { PageBody } from '@/components/layout/page-header';
import { Button, ButtonLink } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Dialog } from '@/components/ui/dialog';
import { Field, SelectInput } from '@/components/ui/field';
import { MonthInput } from '@/components/ui/month-input';
import { MessageBox, Panel, PanelHeader } from '@/components/ui/panel';
import { Segmented } from '@/components/ui/segmented';
import { downloadFile } from '@/lib/api/download';
import { useDashboard, type DashboardFilters } from '@/lib/insights';
import { queryString } from '@/lib/queries';
import { useMe } from '@/lib/session';
import {
  DASHBOARD_MODULES,
  DASHBOARD_MODULE_LABEL,
  FIELD_MESSAGES,
  formatDate,
  formatMonthYear,
  formatNumber,
  type DashboardExceptionRow,
  type DashboardModule,
  type DashboardPendingRow,
} from '@/shared';
import { HomeHeader } from '../home-header';

const EMPTY: DashboardFilters = { module: 'ALL' };
const periodText = (p: string): string => (p.length === 7 ? formatMonthYear(p) : formatDate(p));

/** Where Submit leads for the chosen module (only forms the role may enter). */
const SUBMIT_HREF: Partial<
  Record<
    DashboardModule,
    {
      href: string;
      module: 'DAILY_MIS' | 'MONTHLY_MIS' | 'DAILY_EXCEPTIONS' | 'LICENCES' | 'AUDIT';
    }
  >
> = {
  ALL: { href: '/daily-mis/new', module: 'DAILY_MIS' },
  DAILY_MIS: { href: '/daily-mis/new', module: 'DAILY_MIS' },
};

/**
 * Dashboard tab (spec “Dashboard”, DASH-1…10). One layout for every role: the API counts only the
 * login's plants and modules not Hidden (CARD-0); Approve / Return show only where the role on
 * that plant may (DASH-5). Search is Module → Plant → Date or Month (BTN-D1…D4).
 */
export function DashboardView() {
  const me = useMe().data;
  const router = useRouter();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<DashboardFilters>(EMPTY);
  const [applied, setApplied] = useState<DashboardFilters>(EMPTY);
  const [kind, setKind] = useState<'DATE' | 'MONTH'>('DATE');
  const [dateInvalid, setDateInvalid] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);
  const [reviewing, setReviewing] = useState<DashboardPendingRow | null>(null);
  const q = useDashboard(applied, me !== undefined && me.access.modules.DASHBOARD.length > 0);
  const v = q.data;
  const modules = me?.access.modules;
  const canDownload = modules?.DASHBOARD.includes('DOWNLOAD') ?? false;
  const submit = SUBMIT_HREF[applied.module];
  const canSubmit = submit ? (modules?.[submit.module].includes('SUBMIT') ?? false) : false;

  function apply(): void {
    if (dateInvalid) {
      setDateError(FIELD_MESSAGES.dateInvalid);
      return;
    }
    setDateError(null);
    setApplied(draft);
  }

  function reset(): void {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setKind('DATE');
    setDateInvalid(false);
    setDateError(null);
  }

  async function download(format: 'xlsx' | 'pdf'): Promise<void> {
    setBusy(format);
    try {
      await downloadFile(
        `/api/dashboard/export${queryString({ ...applied, format })}`,
        `dashboard.${format}`,
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'The download failed.');
    } finally {
      setBusy(null);
    }
  }

  const pendingColumns: ColumnDef<DashboardPendingRow>[] = [
    { id: 'plant', header: 'Plant', cell: ({ row }) => <b>{row.original.plant.name}</b> },
    {
      id: 'period',
      header: 'Date / Month',
      cell: ({ row }) => <span className="num">{periodText(row.original.period)}</span>,
    },
    {
      id: 'module',
      header: 'Module',
      cell: ({ row }) => (row.original.module === 'DAILY_MIS' ? 'Daily MIS' : 'Monthly MIS'),
    },
    { id: 'by', header: 'Entered by', cell: ({ row }) => row.original.enteredBy },
    { id: 'status', header: 'Status', cell: () => <StatusPill status="PENDING" /> },
    {
      id: 'hours',
      header: 'Waiting hours',
      meta: { numeric: true },
      cell: ({ row }) => `${formatNumber(Math.round(row.original.waitingHours), 0)} h`,
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const r = row.original;
        const what = `${r.plant.name} ${periodText(r.period)}`;
        const href = r.module === 'DAILY_MIS' ? `/daily-mis/${r.id}` : null;
        if (!href) return null;
        if (!r.can.approve && !r.can.return)
          return (
            <ButtonLink size="sm" href={href} aria-label={`Open ${what}`}>
              Open
            </ButtonLink>
          );
        return (
          <div className="flex gap-1.5">
            {r.can.approve && (
              <Button
                size="sm"
                variant="primary"
                aria-label={`Approve ${what}`}
                onClick={() => {
                  setReviewing(r);
                }}
              >
                Approve
              </Button>
            )}
            {r.can.return && (
              <Button
                size="sm"
                variant="danger"
                aria-label={`Return ${what}`}
                onClick={() => {
                  setReviewing(r);
                }}
              >
                Return
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const exceptionColumns: ColumnDef<DashboardExceptionRow>[] = [
    { id: 'plant', header: 'Plant', cell: ({ row }) => <b>{row.original.plant.name}</b> },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => <span className="num">{formatDate(row.original.reportDate)}</span>,
    },
    {
      id: 'highlight',
      header: 'Problem highlight',
      meta: { wrap: true },
      cell: ({ row }) => {
        const r = row.original;
        if (r.problemHighlight) return <span className="block min-w-56">{r.problemHighlight}</span>;
        return (
          <span className="block min-w-56 text-muted">
            {r.answered >= r.lineTotal
              ? 'All lines answered'
              : `Lines ${String(r.answered + 1)}–${String(r.lineTotal)} not yet answered`}
          </span>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <ExceptionPill status={row.original.status} />,
    },
    {
      id: 'open',
      header: 'Open',
      cell: () => <span className="text-muted">Shown here</span>,
    },
  ];

  const c = v?.cards;
  const appliedPeriod = applied.date
    ? formatDate(applied.date)
    : applied.month
      ? formatMonthYear(applied.month)
      : null;

  return (
    <PageBody>
      <HomeHeader tab="dashboard" />
      <FilterBar
        onSearch={apply}
        actions={
          <>
            {canSubmit && submit && (
              <ButtonLink
                href={submit.href}
                variant="primary"
                icon={<Plus aria-hidden="true" className="size-[17px]" />}
              >
                Submit
              </ButtonLink>
            )}
            {canDownload && (
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
        <Field label="Module" n={1} className="flex-[1_1_180px]">
          {({ id }) => (
            <SelectInput
              id={id}
              value={draft.module}
              onChange={(e) => {
                setDraft({ ...draft, module: e.target.value as DashboardModule });
              }}
            >
              {DASHBOARD_MODULES.map((m) => (
                <option key={m} value={m}>
                  {DASHBOARD_MODULE_LABEL[m]}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label="Plant" n={2} className="flex-[1_1_240px]">
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
          label="Date or Month"
          n={3}
          error={dateError ?? undefined}
          className="flex-[0_1_330px]"
        >
          {({ id, describedBy }) => (
            <div className="flex min-w-0 items-center gap-1.5">
              <Segmented
                label="Date or Month"
                options={[
                  { value: 'DATE', label: 'Date' },
                  { value: 'MONTH', label: 'Month' },
                ]}
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setDateInvalid(false);
                  setDraft({ ...draft, date: undefined, month: undefined });
                }}
              />
              {kind === 'DATE' ? (
                <DateInput
                  id={id}
                  aria-label="Date"
                  aria-describedby={describedBy}
                  className="min-w-0"
                  value={draft.date ?? ''}
                  onChange={(d) => {
                    setDateInvalid(d === null);
                    if (d !== null) setDraft({ ...draft, date: d || undefined, month: undefined });
                  }}
                />
              ) : (
                <MonthInput
                  id={id}
                  describedBy={describedBy}
                  className="min-w-0 flex-1"
                  value={draft.month ?? ''}
                  onChange={(m) => {
                    setDraft({ ...draft, month: m || undefined, date: undefined });
                  }}
                />
              )}
            </div>
          )}
        </Field>
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="dark"
            icon={<Search aria-hidden="true" className="size-[17px]" />}
          >
            Apply search
          </Button>
          <Button onClick={reset}>Reset</Button>
        </div>
      </FilterBar>

      {q.error && (
        <MessageBox tone="error" role="alert">
          {q.error.message}
        </MessageBox>
      )}

      <KpiStrip>
        {c?.waiting && (
          <KpiCard
            label="Days waiting approval"
            value={c.waiting.daily + c.waiting.monthly}
            sub={`Daily ${String(c.waiting.daily)} · Monthly ${String(c.waiting.monthly)}`}
            tone="amber"
            icon={<Clock className="size-[26px]" strokeWidth={1.9} />}
            onSelect={() => {
              router.push('/daily-mis/approvals');
            }}
          />
        )}
        {c?.openExceptions && (
          <KpiCard
            label="Exceptions still open"
            value={c.openExceptions.pending + c.openExceptions.partial}
            sub={`Pending ${String(c.openExceptions.pending)} · Partial ${String(c.openExceptions.partial)}`}
            tone="amber"
            icon={<TriangleAlert className="size-[26px]" strokeWidth={1.9} />}
          />
        )}
        {c?.licences && (
          <KpiCard
            label="Licences due"
            value={c.licences.due + c.licences.expired}
            sub={`Due ${String(c.licences.due)} · Expired ${String(c.licences.expired)}`}
            tone="teal"
            icon={<FileWarning className="size-[26px]" strokeWidth={1.9} />}
          />
        )}
        {c && c.auditOverdue !== null && (
          <KpiCard
            label="Audit observations overdue"
            value={c.auditOverdue}
            sub="Past the (revised) target date"
            tone="red"
            icon={<ShieldAlert className="size-[26px]" strokeWidth={1.9} />}
          />
        )}
        {c && c.notInitiated !== null && (
          <KpiCard
            label={
              applied.date
                ? `Reports not initiated · ${formatDate(c.notInitiatedDate)}`
                : 'Reports not initiated today'
            }
            value={c.notInitiated}
            sub="No Daily MIS and no Exception"
            tone="slate"
            icon={<CalendarX2 className="size-[26px]" strokeWidth={1.9} />}
            onSelect={() => {
              router.push('/daily-mis');
            }}
          />
        )}
      </KpiStrip>

      <div className="grid min-w-0 gap-[18px] min-[1100px]:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <PerformanceChart plantId={applied.plantId} />
        <div
          className="flex min-h-[240px] items-center rounded-card border border-line bg-[#EAF4F8] bg-cover bg-right p-7 shadow-card"
          style={{
            backgroundImage:
              'linear-gradient(90deg, #EAF4F8 48%, rgba(234,244,248,0) 78%), url(/images/dashboard-banner.jpg)',
          }}
        >
          <div className="max-w-[300px]">
            <p className="m-0 text-[12px] font-bold tracking-[0.12em] text-teal-ink">
              MAKEEN ENERGY INDIA
            </p>
            <h2 className="m-0 mt-1.5 font-heading text-[24px] leading-tight font-bold text-navy">
              Driving Operational Excellence Together
            </h2>
            <p className="m-0 mt-2 text-[13.5px] text-[#3E5266]">
              LPG plants · HPCL · BPCL · IOCL · CPCL
            </p>
          </div>
        </div>
      </div>

      {v?.pending && (
        <Panel>
          <PanelHeader
            title="Pending approval"
            sub={`Oldest first · waiting hours run from first save to Approve (IST)${appliedPeriod ? ` · ${appliedPeriod}` : ''}`}
            actions={
              <ButtonLink
                size="sm"
                href="/daily-mis/approvals"
                icon={<ArrowRight aria-hidden="true" className="size-4" />}
              >
                Open approval queue
              </ButtonLink>
            }
          />
          <DataTable
            caption="Pending approval"
            columns={pendingColumns}
            rows={v.pending}
            getRowId={(r) => `${r.module}-${r.id}`}
            rowClass={() => statusRowClass('PENDING')}
            loading={q.isFetching}
          />
        </Panel>
      )}

      {v?.openExceptions && (
        <Panel>
          <PanelHeader
            title="Open exceptions"
            sub={`Pending or Partial Daily Exceptions${appliedPeriod ? ` · ${appliedPeriod}` : ''}`}
          />
          <DataTable
            caption="Open exceptions"
            columns={exceptionColumns}
            rows={v.openExceptions}
            getRowId={(r) => r.id}
            rowClass={(r) => exceptionRowClass(r.status)}
            loading={q.isFetching}
          />
        </Panel>
      )}

      <MessageBox tone="info">
        One layout for every role. Numbers cover only assigned plants and modules not Hidden. Plant
        Manager and Admin see Approve / Return; entry roles see the same page without them.
      </MessageBox>

      {reviewing && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setReviewing(null);
          }}
          title={`${reviewing.plant.name} · ${periodText(reviewing.period)}`}
          description={`${reviewing.module === 'DAILY_MIS' ? 'Daily MIS' : 'Monthly MIS'} · entered by ${reviewing.enteredBy} · waiting ${formatNumber(Math.round(reviewing.waitingHours), 0)} h`}
          footer={
            reviewing.module === 'DAILY_MIS' ? (
              <ButtonLink href={`/daily-mis/${reviewing.id}`}>Open full form</ButtonLink>
            ) : null
          }
        >
          <ReviewActions
            row={{
              ...reviewing,
              can: { edit: false, reopen: false, download: false, ...reviewing.can },
            }}
            module={reviewing.module}
            period={periodText(reviewing.period)}
            onDone={() => {
              setReviewing(null);
              void qc.invalidateQueries({ queryKey: ['dashboard'] });
            }}
          />
        </Dialog>
      )}
    </PageBody>
  );
}
