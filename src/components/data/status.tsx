import {
  CHECK_STATUS_LABEL,
  LICENCE_STATUS_LABEL,
  OBSERVATION_URGENCY_LABEL,
  type CheckStatus,
  type ExceptionRowStatus,
  type LicenceStatus,
  type ObservationUrgency,
  type ReportStatus,
} from '@/shared';
import { Pill, ROW_TINT, type Tone } from '../ui/pill';

export const STATUS_LABEL: Readonly<Record<ReportStatus, string>> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  APPROVED: 'Approved',
  RETURNED: 'Returned',
};

const TONE: Readonly<Record<ReportStatus, Tone>> = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  RETURNED: 'returned',
};

/** Whole-row tint by status (DMIS-T0): Draft grey, Pending amber, Approved green, Returned red. */
export function statusRowClass(status: ReportStatus): string {
  return ROW_TINT[TONE[status]];
}

export function StatusPill({ status }: { status: ReportStatus }) {
  return <Pill tone={TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

function Legend({ items }: { items: readonly [string, string][] }) {
  return (
    <ul
      className="m-0 flex list-none flex-wrap items-center gap-3.5 p-0 text-[12px] text-[#475569]"
      aria-label="Row colours"
    >
      {items.map(([label, swatch]) => (
        <li key={label} className="flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className={`inline-block size-3.5 rounded-[4px] border border-black/8 ${swatch || 'bg-surface'}`}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Colour key above a tinted table (mockup `.legend`). */
export function StatusLegend() {
  return (
    <Legend
      items={(['DRAFT', 'PENDING', 'APPROVED', 'RETURNED'] as const).map((s) => [
        STATUS_LABEL[s],
        statusRowClass(s),
      ])}
    />
  );
}

/** Audit observation colours (AUD-3): red Overdue, amber Due in 7 days, light amber Pending, green. */
const URGENCY_TONE: Readonly<Record<ObservationUrgency, Tone>> = {
  OVERDUE: 'returned',
  DUE_SOON: 'pending',
  PENDING: 'pending',
  COMPLIED: 'approved',
};
const URGENCY_ROW: Readonly<Record<ObservationUrgency, string>> = {
  OVERDUE: 'bg-returned-row',
  DUE_SOON: 'bg-pending-row',
  PENDING: 'bg-[#FFFBF2]',
  COMPLIED: 'bg-approved-row',
};

export function urgencyRowClass(u: ObservationUrgency | null): string {
  return u ? URGENCY_ROW[u] : '';
}

export function UrgencyPill({ urgency }: { urgency: ObservationUrgency }) {
  return <Pill tone={URGENCY_TONE[urgency]}>{OBSERVATION_URGENCY_LABEL[urgency]}</Pill>;
}

export function UrgencyLegend() {
  return (
    <Legend
      items={(['OVERDUE', 'DUE_SOON', 'PENDING', 'COMPLIED'] as const).map((u) => [
        OBSERVATION_URGENCY_LABEL[u],
        URGENCY_ROW[u],
      ])}
    />
  );
}

/** Licence statuses (LIC-S1): Expired red, Due amber at the top. */
const LICENCE_TONE: Readonly<Record<LicenceStatus, Tone>> = {
  EXPIRED: 'returned',
  DUE: 'pending',
  ACTIVE: 'approved',
  NOT_INITIATED: 'neutral',
  NA: 'draft',
};
const LICENCE_ROW: Readonly<Record<LicenceStatus, string>> = {
  EXPIRED: 'bg-returned-row',
  DUE: 'bg-pending-row',
  ACTIVE: '',
  NOT_INITIATED: '',
  NA: '',
};

export function licenceRowClass(s: LicenceStatus): string {
  return LICENCE_ROW[s];
}

export function LicencePill({ status }: { status: LicenceStatus }) {
  return <Pill tone={LICENCE_TONE[status]}>{LICENCE_STATUS_LABEL[status]}</Pill>;
}

/** Review Check (D-27): Critical red, Attention amber, OK green. */
const CHECK_TONE: Readonly<Record<CheckStatus, Tone>> = {
  CRITICAL: 'returned',
  ATTENTION: 'pending',
  OK: 'approved',
};

export function checkRowClass(s: CheckStatus): string {
  return s === 'CRITICAL' ? 'bg-returned-row' : s === 'ATTENTION' ? 'bg-pending-row' : '';
}

export function CheckPill({ status }: { status: CheckStatus }) {
  return <Pill tone={CHECK_TONE[status]}>{CHECK_STATUS_LABEL[status]}</Pill>;
}

/** Daily Exception statuses (DEX-T0): Completed green, Pending amber, Partial grey. */
export const EXCEPTION_STATUS_LABEL: Readonly<Record<ExceptionRowStatus, string>> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  PARTIAL: 'Partial',
  NOT_INITIATED: 'Not initiated',
};

const EXCEPTION_TONE: Readonly<Record<ExceptionRowStatus, Tone>> = {
  COMPLETED: 'approved',
  PENDING: 'pending',
  PARTIAL: 'draft',
  NOT_INITIATED: 'neutral',
};

export function exceptionRowClass(status: ExceptionRowStatus): string {
  return ROW_TINT[EXCEPTION_TONE[status]];
}

export function ExceptionPill({ status }: { status: ExceptionRowStatus }) {
  return <Pill tone={EXCEPTION_TONE[status]}>{EXCEPTION_STATUS_LABEL[status]}</Pill>;
}

export function ExceptionLegend() {
  return (
    <Legend
      items={(['COMPLETED', 'PENDING', 'PARTIAL', 'NOT_INITIATED'] as const).map((s) => [
        EXCEPTION_STATUS_LABEL[s],
        exceptionRowClass(s),
      ])}
    />
  );
}
