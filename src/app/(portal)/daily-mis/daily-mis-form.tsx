'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  History,
  ListChecks,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { StatusPill } from '@/components/data/status';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button, ButtonLink, Spinner } from '@/components/ui/button';
import { DateInput } from '@/components/ui/date-input';
import { Dialog } from '@/components/ui/dialog';
import { Field, ReadOnlyValue, SelectInput, SumBox } from '@/components/ui/field';
import { MessageBox, Panel, PanelHeader } from '@/components/ui/panel';
import { api } from '@/lib/api/client';
import { downloadFile } from '@/lib/api/download';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { dailyKeys, useDailyMis, useDailyMisRevision } from '@/lib/queries';
import { useMe } from '@/lib/session';
import {
  DAILY_MIS_FIELDS,
  DAILY_MIS_SECTIONS,
  DAILY_MIS_VALUE_FIELDS,
  FIELD_MESSAGES,
  accuracySumWarning,
  dailyMisSaveSchema,
  deriveDailyMis,
  formatDate,
  formatDateTimeIst,
  formatMonthYear,
  formatNumber,
  isFutureIstDate,
  isIsoDate,
  sumDecimals,
  type DailyMisDerived,
  type DailyMisDetail,
  type DailyMisValueKey,
  type FieldDef,
} from '@/shared';
import { FieldInput, labelOf } from '@/components/forms/field-input';
import { ReopenDialog } from '@/components/forms/reopen-dialog';
import { ReviewActions } from '@/components/forms/review-actions';

type Texts = Record<DailyMisValueKey, string>;
type Step = 1 | 2 | 3;

const VALUE_FIELDS = DAILY_MIS_VALUE_FIELDS as readonly FieldDef<DailyMisValueKey>[];
const ALL_FIELDS = DAILY_MIS_FIELDS as readonly FieldDef[];
const DERIVED_KEYS = new Set([
  'closingBookStock',
  'stockGainLoss',
  'lossMechanicalTotal',
  'lossElectricalTotal',
  'lossMiscTotal',
  'mrTotal',
]);
const HEADER_SHOWN = new Set([
  'plantId',
  'reportDate',
  'monthYear',
  'updatedAt',
  'enteredBy',
  'status',
]);

function textsOf(row: DailyMisDetail | undefined): Texts {
  const out = {} as Texts;
  for (const f of VALUE_FIELDS) {
    const v = row?.values[f.key];
    out[f.key] = v === null || v === undefined ? '' : String(v);
  }
  return out;
}

const SECTION_HINT: Record<string, string> = {
  [DAILY_MIS_SECTIONS.header]:
    'Plant and date sit at the top. Dashed fields are shown by the system.',
  [DAILY_MIS_SECTIONS.stock]: 'MT unless stated',
  [DAILY_MIS_SECTIONS.mechanical]: 'minutes',
  [DAILY_MIS_SECTIONS.electrical]: 'minutes',
  [DAILY_MIS_SECTIONS.misc]: 'minutes',
  [DAILY_MIS_SECTIONS.accuracy]: 'percentages as 0.00',
  [DAILY_MIS_SECTIONS.marketReturn]: 'cylinders',
};

function derivedText(def: FieldDef, d: DailyMisDerived): string {
  const v = (d as unknown as Record<string, string | number | null>)[def.key];
  if (v === null || v === undefined) return '—';
  const n = formatNumber(v, def.decimals);
  return def.unit === 'min' ? `${n} min` : n;
}

/** Page wrapper: loads an existing row, or starts a blank one (Submit). */
export function DailyMisFormPage({ id }: { id: string | null }) {
  const row = useDailyMis(id);
  if (id !== null && !row.data) {
    return (
      <PageBody>
        {row.error ? (
          <MessageBox tone="error" role="alert">
            {row.error.message}
          </MessageBox>
        ) : (
          <div className="flex items-center gap-2 text-muted" role="status">
            <Spinner /> Loading…
          </div>
        )}
      </PageBody>
    );
  }
  // Re-mount after every save so the form shows exactly what the API stored.
  return (
    <DailyMisEditor
      key={`${row.data?.id ?? 'new'}-${String(row.data?.version ?? 0)}`}
      row={row.data}
    />
  );
}

/**
 * Daily MIS form (spec “Daily MIS — form”, DMIS-F1…F60, DMIS-R1…R9). Three steps: plant & date,
 * the 60 fields, review & submit. Totals are previewed with the same shared function the API uses
 * to store them (they can never be typed). Approved rows are read only until reopened.
 */
function DailyMisEditor({ row }: { row: DailyMisDetail | undefined }) {
  const me = useMe().data;
  const router = useRouter();
  const qc = useQueryClient();
  const isNew = row === undefined;
  const canSubmit = me?.access.modules.DAILY_MIS.includes('SUBMIT') ?? false;
  const editable = isNew ? canSubmit : row.can.edit;
  const [step, setStep] = useState<Step>(isNew ? 1 : 2);
  const [plantId, setPlantId] = useState(
    row?.plant.id ?? (me?.plants.length === 1 ? (me.plants[0]?.plantId ?? '') : ''),
  );
  const [reportDate, setReportDate] = useState(row?.reportDate ?? '');
  const [dateText, setDateText] = useState<'ok' | 'invalid'>('ok');
  const [texts, setTexts] = useState<Texts>(() => textsOf(row));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [viewVersion, setViewVersion] = useState<number | null>(null);
  const [reopening, setReopening] = useState(false);
  const derived = deriveDailyMis(texts);
  const warning = accuracySumWarning(texts);
  const plantFixed = !isNew && row.status !== 'DRAFT';

  const save = useMutation({
    mutationFn: (body: unknown) =>
      isNew
        ? api<DailyMisDetail>('/api/daily-mis', { method: 'POST', body })
        : api<DailyMisDetail>(`/api/daily-mis/${row.id}`, { method: 'PUT', body }),
    onSuccess: async (saved, body) => {
      const submitted = (body as { action: string }).action === 'submit';
      toast.success(
        submitted
          ? `Submitted for approval — ${saved.plant.name}, ${formatDate(saved.reportDate)}`
          : saved.status === 'DRAFT'
            ? 'Draft saved. No notice was sent.'
            : 'Saved.',
      );
      qc.setQueryData(dailyKeys.row(saved.id), saved);
      await qc.invalidateQueries({ queryKey: ['daily-mis', 'list'] });
      await qc.invalidateQueries({ queryKey: ['approval-queue'] });
      if (isNew) router.replace(`/daily-mis/${saved.id}`);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'VALIDATION_FAILED') {
        setErrors(e.fieldErrors());
        setFailure('Some fields need attention — see the messages under them.');
      } else if (e instanceof ApiError && e.status === 409) {
        setFailure(e.message);
        if (!isNew) void qc.invalidateQueries({ queryKey: dailyKeys.row(row.id) });
      } else if (e instanceof Error) setFailure(e.message);
    },
  });

  function validate(action: 'draft' | 'submit'): unknown {
    if (dateText === 'invalid') {
      setErrors({ reportDate: FIELD_MESSAGES.dateInvalid });
      return null;
    }
    const body = {
      action,
      ...(isNew ? {} : { version: row.version }),
      plantId,
      reportDate,
      values: texts,
    };
    const parsed = dailyMisSaveSchema.safeParse(body);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[i.path.map(String).join('.')] ??= i.message;
      setErrors(out);
      setFailure('Some fields need attention — see the messages under them.');
      if (out['plantId'] || out['reportDate']) setStep(isNew ? 1 : 2);
      return null;
    }
    setErrors({});
    setFailure(null);
    return parsed.data;
  }

  function submit(action: 'draft' | 'submit'): void {
    const body = validate(action);
    if (body !== null) save.mutate(body);
  }

  function continueToFields(): void {
    const out: Record<string, string> = {};
    if (!plantId) out['plantId'] = FIELD_MESSAGES.plantRequired;
    if (dateText === 'invalid') out['reportDate'] = FIELD_MESSAGES.dateInvalid;
    else if (!reportDate) out['reportDate'] = FIELD_MESSAGES.dateRequired;
    else if (isIsoDate(reportDate) && isFutureIstDate(reportDate))
      out['reportDate'] = FIELD_MESSAGES.dateFuture;
    setErrors(out);
    if (Object.keys(out).length === 0) setStep(2);
  }

  async function downloadPdf(): Promise<void> {
    if (!row) return;
    try {
      await downloadFile(`/api/daily-mis/${row.id}/pdf`, 'daily-mis.pdf');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'The download failed.');
    }
  }

  const plantName = row?.plant.name ?? me?.plants.find((p) => p.plantId === plantId)?.name ?? '';
  const title =
    plantName && reportDate && isIsoDate(reportDate)
      ? `Daily MIS — ${plantName}, ${formatDate(reportDate)}`
      : 'Daily MIS — new report';
  const statusNode = row ? (
    <StatusPill status={row.status} />
  ) : (
    <span className="text-muted">New</span>
  );

  const header = (
    <Section
      title={DAILY_MIS_SECTIONS.header}
      hint={SECTION_HINT[DAILY_MIS_SECTIONS.header]}
      aside={statusNode}
    >
      <Field label={labelOf(ALL_FIELDS[0] as FieldDef)} n={1} required error={errors['plantId']}>
        {({ id, describedBy, invalid }) => (
          <SelectInput
            id={id}
            value={plantId}
            disabled={!editable || plantFixed}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              setPlantId(e.target.value);
            }}
          >
            <option value="">Select plant</option>
            {(row && !me?.plants.some((p) => p.plantId === row.plant.id)
              ? [{ plantId: row.plant.id, name: row.plant.name }]
              : []
            )
              .concat(me?.plants ?? [])
              .map((p) => (
                <option key={p.plantId} value={p.plantId}>
                  {p.name}
                </option>
              ))}
          </SelectInput>
        )}
      </Field>
      <Field
        label="Date"
        n={2}
        required
        error={errors['reportDate']}
        hint="Never a future India date"
      >
        {({ id, describedBy, invalid }) => (
          <DateInput
            id={id}
            value={reportDate}
            disabled={!editable || plantFixed}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(v) => {
              setDateText(v === null ? 'invalid' : 'ok');
              if (v !== null) setReportDate(v);
            }}
          />
        )}
      </Field>
      <Field label="Month and year" n={3} auto>
        {({ id }) => (
          <ReadOnlyValue
            id={id}
            value={isIsoDate(reportDate) ? formatMonthYear(reportDate) : '—'}
          />
        )}
      </Field>
      <Field label="Last updated on" n={4} auto>
        {({ id }) => (
          <ReadOnlyValue id={id} value={row ? formatDateTimeIst(new Date(row.updatedAt)) : '—'} />
        )}
      </Field>
      {VALUE_FIELDS.filter((f) => f.section === DAILY_MIS_SECTIONS.header).map((f) => (
        <FieldInput
          key={f.key}
          def={f}
          value={texts[f.key]}
          disabled={!editable}
          error={errors[`values.${f.key}`]}
          onChange={(v) => {
            setTexts({ ...texts, [f.key]: v });
          }}
        />
      ))}
      <Field label="Entered by" n={7} auto>
        {({ id }) => <ReadOnlyValue id={id} value={row?.enteredBy.name ?? me?.user.name ?? '—'} />}
      </Field>
      <Field label="Status" n={8} auto>
        {({ id }) => (
          <div id={id} className="flex h-input items-center">
            {statusNode}
          </div>
        )}
      </Field>
    </Section>
  );

  const sections = Object.values(DAILY_MIS_SECTIONS)
    .filter((s) => s !== DAILY_MIS_SECTIONS.header)
    .map((title) => (
      <Section
        key={title}
        title={title}
        hint={SECTION_HINT[title]}
        wide={title === DAILY_MIS_SECTIONS.notes}
      >
        {ALL_FIELDS.filter((f) => f.section === title && !HEADER_SHOWN.has(f.key)).map((f) =>
          DERIVED_KEYS.has(f.key) ? (
            <Field key={f.key} label={labelOf(f)} n={f.no} auto>
              {({ id }) =>
                f.kind === 'mt' ? (
                  <ReadOnlyValue
                    id={id}
                    value={derivedText(f, derived)}
                    className={cn(
                      f.key === 'stockGainLoss' &&
                        derived.stockGainLoss?.startsWith('-') &&
                        'text-danger-text',
                    )}
                  />
                ) : (
                  <SumBox label={f.label} value={derivedText(f, derived)} />
                )
              }
            </Field>
          ) : (
            <FieldInput
              key={f.key}
              def={f}
              value={texts[f.key as DailyMisValueKey]}
              disabled={!editable}
              error={errors[`values.${f.key}`]}
              onChange={(v) => {
                setTexts({ ...texts, [f.key]: v });
              }}
            />
          ),
        )}
      </Section>
    ));

  return (
    <PageBody>
      <PageHeader
        crumb={`Daily MIS${plantName ? ` › ${plantName}` : ''}${isIsoDate(reportDate) ? ` › ${formatDate(reportDate)}` : ''}`}
        title={title}
        sub="60 fields · entered by Maintenance / Operation officers · approved by Plant Manager"
        actions={
          row?.can.download ? (
            <Button
              icon={<Download aria-hidden="true" className="size-[17px]" />}
              onClick={() => void downloadPdf()}
            >
              Download PDF
            </Button>
          ) : undefined
        }
      />

      {row?.status === 'RETURNED' && <ReturnedBanner row={row} />}
      {row?.status === 'APPROVED' && (
        <MessageBox tone="success">
          Approved by {row.approvedBy?.name ?? '—'}
          {row.approvedAt ? ` on ${formatDateTimeIst(new Date(row.approvedAt))}` : ''} — this date
          is locked.
          {row.can.reopen && (
            <>
              {' '}
              <button
                type="button"
                className="cursor-pointer font-semibold underline"
                onClick={() => {
                  setReopening(true);
                }}
              >
                Reopen with a reason
              </button>
            </>
          )}
        </MessageBox>
      )}
      {row?.reopenReason && row.status !== 'APPROVED' && (
        <MessageBox tone="warn">
          Reopened by {row.reopenedBy?.name ?? '—'}
          {row.reopenedAt ? ` on ${formatDateTimeIst(new Date(row.reopenedAt))}` : ''}:{' '}
          {row.reopenReason}
        </MessageBox>
      )}

      {editable && (
        <Panel className="p-5">
          <Stepper step={step} />
        </Panel>
      )}

      {row && (row.can.approve || row.can.return) && (
        <Panel>
          <PanelHeader
            title="Approve or Return"
            sub={`Pending for ${formatNumber(row.waitingHours, 1)} h · entered by ${row.enteredBy.name}`}
          />
          <div className="p-5">
            <ReviewActions row={row} module="DAILY_MIS" period={formatDate(row.reportDate)} />
          </div>
        </Panel>
      )}

      <Panel>
        {header}
        {step === 1 && editable ? null : step === 3 && editable ? (
          <Review derived={derived} texts={texts} warning={warning} />
        ) : (
          sections
        )}
        {editable && (
          <div className="sticky bottom-0 flex flex-wrap justify-end gap-2.5 rounded-b-card border-t border-line bg-surface px-5 py-3.5">
            <span className="mr-auto self-center text-[12px] text-[#5B6576]">
              Totals are system sums — never typed. Save draft sends no notice.
            </span>
            {step === 1 ? (
              <>
                <ButtonLink href="/daily-mis">Cancel</ButtonLink>
                <Button variant="primary" onClick={continueToFields}>
                  Continue <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </>
            ) : (
              <>
                {step === 3 ? (
                  <Button
                    icon={<ArrowLeft aria-hidden="true" className="size-4" />}
                    onClick={() => {
                      setStep(2);
                    }}
                  >
                    Back to the fields
                  </Button>
                ) : (
                  <ButtonLink href="/daily-mis">Cancel</ButtonLink>
                )}
                {row?.status !== 'PENDING' && (
                  <Button
                    busy={
                      save.isPending &&
                      (save.variables as { action?: string } | undefined)?.action === 'draft'
                    }
                    onClick={() => {
                      submit('draft');
                    }}
                  >
                    Save draft
                  </Button>
                )}
                {step === 2 ? (
                  <Button
                    variant="primary"
                    onClick={() => {
                      if (validate('submit') !== null) setStep(3);
                    }}
                  >
                    Review &amp; submit <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    busy={
                      save.isPending &&
                      (save.variables as { action?: string } | undefined)?.action === 'submit'
                    }
                    icon={<Check aria-hidden="true" className="size-4" />}
                    onClick={() => {
                      submit('submit');
                    }}
                  >
                    {row?.status === 'RETURNED'
                      ? 'Edit & save again'
                      : row?.status === 'PENDING'
                        ? 'Save changes'
                        : 'Submit for approval'}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </Panel>

      {failure && (
        <MessageBox tone="error" role="alert">
          {failure}
        </MessageBox>
      )}

      {row && row.revisions.length > 0 && (
        <Panel>
          <PanelHeader title="Save history" sub="Every save is time-stamped (IST)" />
          <ul className="m-0 list-none p-0">
            {row.revisions.map((r) => (
              <li
                key={r.version}
                className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[#EEF2F6] px-5 py-3 last:border-b-0"
              >
                <b className="w-10">v{r.version}</b>
                <span className="min-w-44 num">{formatDateTimeIst(new Date(r.savedAt))}</span>
                <span className="min-w-36">{r.savedBy.name}</span>
                <StatusPill status={r.status} />
                <button
                  type="button"
                  className="ml-auto inline-flex min-h-touch cursor-pointer items-center gap-1.5 text-teal-ink"
                  onClick={() => {
                    setViewVersion(r.version);
                  }}
                >
                  <History aria-hidden="true" className="size-4" /> View
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {row && viewVersion !== null && (
        <RevisionDialog
          id={row.id}
          version={viewVersion}
          onClose={() => {
            setViewVersion(null);
          }}
        />
      )}
      {row && reopening && (
        <ReopenDialog
          row={row}
          module="DAILY_MIS"
          period={formatDate(row.reportDate)}
          onClose={() => {
            setReopening(false);
          }}
        />
      )}
    </PageBody>
  );
}

function Section({
  title,
  hint,
  aside,
  wide,
  children,
}: {
  title: string;
  hint?: string | undefined;
  aside?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line px-5 py-[18px] first:border-t-0" aria-label={title}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 className="text-[15px] font-bold text-navy">{title}</h3>
          {hint && <p className="m-0 text-[12.5px] text-[#5B6576]">{hint}</p>}
        </div>
        {aside}
      </div>
      <div
        className={cn(
          'grid gap-x-4 gap-y-3.5',
          wide
            ? 'grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))]'
            : 'grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))]',
        )}
      >
        {children}
      </div>
    </section>
  );
}

const STEPS = [
  'Select plant & date',
  'Fill report (60 fields)',
  'Review & submit for approval',
] as const;

/** DMIS-R8 stepper. */
function Stepper({ step }: { step: Step }) {
  return (
    <ol className="m-0 flex list-none flex-wrap items-center gap-3.5 p-0" aria-label="Steps">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const state = n < step ? 'done' : n === step ? 'on' : 'todo';
        return (
          <li
            key={label}
            className="flex flex-[1_1_auto] items-center gap-3.5"
            aria-current={state === 'on' ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex items-center gap-2.5',
                state === 'on' ? 'text-teal-ink' : 'text-muted',
              )}
            >
              <span
                className={cn(
                  'flex size-[34px] flex-none items-center justify-center rounded-full border-2 font-bold',
                  state === 'done' && 'border-teal-ink bg-teal-ink text-white',
                  state === 'on' &&
                    'border-teal-ink bg-teal-ink text-white shadow-[0_0_0_5px_#DDF1F1]',
                  state === 'todo' && 'border-[#C5D2DC] bg-surface',
                )}
              >
                {state === 'done' ? <Check aria-hidden="true" className="size-4" /> : n}
              </span>
              <b className="font-semibold">{label}</b>
              {state === 'done' && <span className="sr-only">(done)</span>}
            </span>
            {i < STEPS.length - 1 && (
              <i
                aria-hidden="true"
                className="hidden h-0.5 min-w-10 flex-1 bg-input-border sm:block"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Step 3: the figures the Plant Manager will look at first, plus soft warnings. */
function Review({
  derived,
  texts,
  warning,
}: {
  derived: DailyMisDerived;
  texts: Texts;
  warning: string | null;
}) {
  const n = (v: string, dp: number): string => {
    const t = v.replace(/,/g, '').trim();
    const plain = /^\d+$/.test(t) || /^\d+\.\d+$/.test(t);
    return t === '' || !plain ? '—' : formatNumber(t, dp);
  };
  const despatch = (() => {
    const a = texts.normalCylinderDespatch.replace(/,/g, '').trim();
    const b = texts.otCylinderDespatch.replace(/,/g, '').trim();
    if (a === '' && b === '') return '—';
    try {
      return formatNumber(sumDecimals([a || null, b || null], 3), 3);
    } catch {
      return '—';
    }
  })();
  const empty = DAILY_MIS_VALUE_FIELDS.filter(
    (f) => texts[f.key as DailyMisValueKey].trim() === '',
  ).length;
  const items: [string, string][] = [
    ['Physical stock (MT)', n(texts.physicalStock, 3)],
    ['Bottling despatches (MT)', despatch],
    ['Cylinders filled — 14.2 kg', n(texts.cylFilled142, 0)],
    ['Cylinders filled — 19 kg', n(texts.cylFilled19, 0)],
    [
      'Closing book stock (MT)',
      derived.closingBookStock === null ? '—' : formatNumber(derived.closingBookStock, 3),
    ],
    [
      'Stock loss / gain (MT)',
      derived.stockGainLoss === null ? '—' : formatNumber(derived.stockGainLoss, 3),
    ],
    ['Accuracy — 0 gms (%)', n(texts.accuracyZero, 2)],
    ['Mechanical time loss (min)', formatNumber(derived.lossMechanicalTotal, 0)],
    ['Electrical time loss (min)', formatNumber(derived.lossElectricalTotal, 0)],
    ['Market returns (cyl)', formatNumber(derived.mrTotal, 0)],
  ];
  return (
    <section
      className="flex flex-col gap-4 border-t border-line px-5 py-[18px]"
      aria-label="Review"
    >
      <div className="flex items-center gap-2.5 text-navy">
        <ListChecks aria-hidden="true" className="size-5" />
        <h3 className="text-[15px] font-bold">Review before you submit</h3>
      </div>
      <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-[10px] border border-[#E7EEF3] bg-[#F5F8FA] px-3 py-2.5">
            <dt className="text-[12px] text-[#5B6576]">{k}</dt>
            <dd className="m-0 text-[15px] font-bold num">{v}</dd>
          </div>
        ))}
      </dl>
      {warning && <MessageBox tone="warn">{warning}</MessageBox>}
      {empty > 0 && (
        <MessageBox tone="info">
          {empty} field{empty === 1 ? '' : 's'} left empty. Empty fields are saved as blank.
        </MessageBox>
      )}
    </section>
  );
}

/** Returned view (DMIS-R7, mockup “Returned for correction”). */
function ReturnedBanner({ row }: { row: DailyMisDetail }) {
  return (
    <>
      <div
        className="flex flex-wrap items-center gap-[18px] rounded-card border border-[#F5C2BE] bg-[#FDECEC] px-6 py-5"
        role="status"
      >
        <span
          aria-hidden="true"
          className="flex size-12 flex-none items-center justify-center rounded-full bg-danger text-white"
        >
          <TriangleAlert className="size-6" />
        </span>
        <div className="min-w-0 flex-[1_1_380px]">
          <h2 className="text-[19px] font-bold text-danger-text">Returned for correction</h2>
          <p className="m-0 mt-1 text-[#5E2A27]">
            Your Daily MIS for {row.plant.name} on {formatDate(row.reportDate)} was returned by the
            Plant Manager. Edit the fields below and save again — the status goes back to Pending.
          </p>
        </div>
        <dl className="m-0 flex flex-wrap gap-6 text-[#7A3A35]">
          <div>
            <dt className="text-[12px]">Returned on</dt>
            <dd className="m-0 font-bold text-[#3B1715] num">
              {row.returnedAt ? formatDateTimeIst(new Date(row.returnedAt)) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[12px]">By</dt>
            <dd className="m-0 font-bold text-[#3B1715]">{row.returnedBy?.name ?? '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-5">
        <Panel>
          <PanelHeader title="Reason for Return" />
          <div className="p-5">
            <div className="flex gap-3.5 rounded-[12px] border border-[#D7ECEE] bg-[#EEF7F8] p-4">
              <UserRound aria-hidden="true" className="size-6 flex-none text-navy" />
              <div>
                <b>{row.returnedBy?.name ?? '—'}</b>
                <p className="m-0 mt-2 leading-relaxed">{row.returnReason}</p>
              </div>
            </div>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="What you need to do" />
          <ol className="m-0 flex list-decimal flex-col gap-3 py-5 pr-5 pl-10">
            <li>Read the reason and correct the fields.</li>
            <li>Update Remarks / comments (field 60) if needed.</li>
            <li>
              Choose “Edit &amp; save again” — the status returns to Pending for the Plant Manager.
            </li>
          </ol>
        </Panel>
      </div>
    </>
  );
}

function RevisionDialog({
  id,
  version,
  onClose,
}: {
  id: string;
  version: number;
  onClose: () => void;
}) {
  const rev = useDailyMisRevision(id, version);
  return (
    <Dialog
      open
      wide
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={`Saved version v${version}`}
      description={
        rev.data
          ? `${formatDateTimeIst(new Date(rev.data.savedAt))} · ${rev.data.savedBy.name}`
          : undefined
      }
    >
      {!rev.data ? (
        <div className="flex items-center gap-2 text-muted" role="status">
          <Spinner /> Loading…
        </div>
      ) : (
        <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-6 gap-y-2">
          {VALUE_FIELDS.map((f) => {
            const v = rev.data.values[f.key];
            return (
              <div
                key={f.key}
                className="flex justify-between gap-3 border-b border-[#EEF2F6] py-1.5 text-[13px]"
              >
                <dt className="text-muted">
                  {f.no}. {f.label}
                </dt>
                <dd className="m-0 text-right font-semibold num">{v === null ? '—' : String(v)}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </Dialog>
  );
}
