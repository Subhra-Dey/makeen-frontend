// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import type {
  AuditFrequency,
  LicenceCategory,
  LicenceType,
  ObservationStatus,
  RenewalFrequency,
} from '../enums';
import { addDays, type IsoDate } from '../ist';

// ───────────────────────────────────────────── labels (spec wording)

export const AUDIT_FREQUENCY_LABEL: Readonly<Record<AuditFrequency, string>> = {
  MONTHS_3: '3 Months',
  MONTHS_12: '12 Months',
  YEARS_5: '5 Years',
};

export const LICENCE_TYPE_LABEL: Readonly<Record<LicenceType, string>> = {
  STATUTORY: 'Statutory',
  SAFETY_CALIBRATION: 'Safety Calibration',
  ELECTRICAL_CALIBRATION: 'Electrical Calibration',
  MAINTENANCE_CALIBRATION: 'Maintenance Calibration',
};

export const RENEWAL_FREQUENCY_LABEL: Readonly<Record<RenewalFrequency, string>> = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'half yearly',
  YEARLY: 'yearly',
  NA: 'NA',
};

export const LICENCE_CATEGORY_LABEL: Readonly<Record<LicenceCategory, string>> = {
  STATUTORY: 'Statutory and Mandatory',
  INTERNAL: 'Internal testing',
};

// ───────────────────────────────────────────── licences (LIC-S1)

export const LICENCE_STATUSES = ['NA', 'NOT_INITIATED', 'EXPIRED', 'DUE', 'ACTIVE'] as const;
export type LicenceStatus = (typeof LICENCE_STATUSES)[number];

/** “Active” is also the spec's “Normal” (D-25). */
export const LICENCE_STATUS_LABEL: Readonly<Record<LicenceStatus, string>> = {
  NA: 'NA',
  NOT_INITIATED: 'Not yet initiated',
  EXPIRED: 'Expired',
  DUE: 'Due',
  ACTIVE: 'Active',
};

/**
 * Licence status, set by the system and never typed (LIC-S1, D-25). Checked in this order:
 *   NA              — renewal frequency is NA
 *   Not yet initiated — no start date
 *   Expired         — end date before today
 *   Due             — today ≥ end date − remind-before days (and before the end date)
 *   Active          — otherwise (also when there is no end date)
 */
export function licenceStatus(
  l: {
    frequency: RenewalFrequency;
    startDate: IsoDate | null;
    endDate: IsoDate | null;
    remindBeforeDays: number;
  },
  today: IsoDate,
): LicenceStatus {
  if (l.frequency === 'NA') return 'NA';
  if (l.startDate === null) return 'NOT_INITIATED';
  if (l.endDate === null) return 'ACTIVE';
  if (l.endDate < today) return 'EXPIRED';
  if (today >= addDays(l.endDate, -l.remindBeforeDays)) return 'DUE';
  return 'ACTIVE';
}

/** Expired and Due rows open at the top (LIC-3). */
export const LICENCE_STATUS_RANK: Readonly<Record<LicenceStatus, number>> = {
  EXPIRED: 0,
  DUE: 1,
  ACTIVE: 2,
  NOT_INITIATED: 3,
  NA: 4,
};

/** Statutory and Mandatory holds Statutory + Safety Calibration; Internal testing the rest (LIC-1). */
export function licenceCategoryOf(type: LicenceType): LicenceCategory {
  return type === 'STATUTORY' || type === 'SAFETY_CALIBRATION' ? 'STATUTORY' : 'INTERNAL';
}

// ───────────────────────────────────────────── audit observations (AUD-3, AUD-4)

export const OBSERVATION_URGENCIES = ['OVERDUE', 'DUE_SOON', 'PENDING', 'COMPLIED'] as const;
export type ObservationUrgency = (typeof OBSERVATION_URGENCIES)[number];

export const OBSERVATION_URGENCY_LABEL: Readonly<Record<ObservationUrgency, string>> = {
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due in 7 days',
  PENDING: 'Pending',
  COMPLIED: 'Complied',
};

/** “Due in 7 days or less” window. */
export const OBSERVATION_DUE_DAYS = 7;

/** The date that counts: the revised target date when entered, else the target date (AUD-4). */
export function effectiveTargetDate(o: {
  targetDate: IsoDate | null;
  revisedTargetDate: IsoDate | null;
}): IsoDate | null {
  return o.revisedTargetDate ?? o.targetDate;
}

/**
 * Row colour and order of an observation (AUD-3): Red Overdue (Pending, target passed) → Amber
 * Due in 7 days or less → Light amber Pending → Green Complied. A Pending row with no target date
 * is plain Pending.
 */
export function observationUrgency(
  o: { status: ObservationStatus; targetDate: IsoDate | null; revisedTargetDate: IsoDate | null },
  today: IsoDate,
): ObservationUrgency {
  if (o.status === 'COMPLIED') return 'COMPLIED';
  const target = effectiveTargetDate(o);
  if (target === null) return 'PENDING';
  if (target < today) return 'OVERDUE';
  if (target <= addDays(today, OBSERVATION_DUE_DAYS)) return 'DUE_SOON';
  return 'PENDING';
}

export const OBSERVATION_URGENCY_RANK: Readonly<Record<ObservationUrgency, number>> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  PENDING: 2,
  COMPLIED: 3,
};

// ───────────────────────────────────────────── plants (CARD-8) and Review Check (D-27)

/** Contracts ending in 90 days (CARD-8): end date from today up to today + 90. */
export const CONTRACT_ENDING_DAYS = 90;

export function contractEndingSoon(endDate: IsoDate, today: IsoDate): boolean {
  return endDate >= today && endDate <= addDays(today, CONTRACT_ENDING_DAYS);
}

export const CHECK_STATUSES = ['CRITICAL', 'ATTENTION', 'OK'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

export const CHECK_STATUS_LABEL: Readonly<Record<CheckStatus, string>> = {
  CRITICAL: 'Critical',
  ATTENTION: 'Attention',
  OK: 'OK',
};

/**
 * Review Check status (RC-2, D-27):
 *   Critical  — any Overdue observation, any Expired licence, or the contract already ended
 *   Attention — any observation due in 7 days, any Due licence, or the contract ends in ≤ 90 days
 *   OK        — otherwise
 */
export function reviewCheckStatus(
  p: {
    contractEnd: IsoDate;
    observationsOverdue: number;
    observationsDueSoon: number;
    licencesExpired: number;
    licencesDue: number;
  },
  today: IsoDate,
): CheckStatus {
  if (p.observationsOverdue > 0 || p.licencesExpired > 0 || p.contractEnd < today)
    return 'CRITICAL';
  if (p.observationsDueSoon > 0 || p.licencesDue > 0 || contractEndingSoon(p.contractEnd, today))
    return 'ATTENTION';
  return 'OK';
}

export const CHECK_STATUS_RANK: Readonly<Record<CheckStatus, number>> = {
  CRITICAL: 0,
  ATTENTION: 1,
  OK: 2,
};
