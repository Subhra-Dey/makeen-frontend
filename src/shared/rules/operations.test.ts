// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

import {
  contractEndingSoon,
  effectiveTargetDate,
  licenceCategoryOf,
  licenceStatus,
  observationUrgency,
  reviewCheckStatus,
} from './operations';

const TODAY = '2026-10-16';

describe('licenceStatus (LIC-S1) — mockup rows on 16-10-2026', () => {
  const lic = (
    startDate: string | null,
    endDate: string | null,
    frequency: 'YEARLY' | 'NA' | 'MONTHLY' = 'YEARLY',
    remindBeforeDays = 30,
  ) => licenceStatus({ startDate, endDate, frequency, remindBeforeDays }, TODAY);

  it('NA wins over everything', () => {
    expect(lic(null, null, 'NA', 0)).toBe('NA');
    expect(lic('2020-01-01', '2021-01-01', 'NA')).toBe('NA');
  });
  it('no start date → Not yet initiated', () => {
    expect(lic(null, null)).toBe('NOT_INITIATED');
    expect(lic(null, '2027-01-01')).toBe('NOT_INITIATED');
  });
  it('end before today → Expired (Fire NOC IOCL Motihari ended 14-10-2026)', () => {
    expect(lic('2025-10-15', '2026-10-14')).toBe('EXPIRED');
    expect(lic('2026-01-01', '2025-12-31')).toBe('EXPIRED');
  });
  it('inside the remind window → Due; the end date itself is still Due', () => {
    expect(lic('2021-11-15', '2026-11-14')).toBe('DUE'); // PESO BPCL Bokaro, 29 days left
    expect(lic('2025-11-15', '2026-11-15')).toBe('DUE'); // exactly 30 days left
    expect(lic('2025-10-17', '2026-10-16')).toBe('DUE'); // ends today
  });
  it('before the window → Active; no end date → Active', () => {
    expect(lic('2025-11-16', '2026-11-16')).toBe('ACTIVE'); // 31 days left
    expect(lic('2025-04-01', '2030-03-31')).toBe('ACTIVE');
    expect(lic('2026-01-01', null)).toBe('ACTIVE');
    expect(lic('2026-10-01', '2026-10-31', 'MONTHLY', 7)).toBe('ACTIVE');
  });
  it('remind 0 days → Due only on the end date', () => {
    expect(lic('2026-01-01', '2026-10-17', 'YEARLY', 0)).toBe('ACTIVE');
    expect(lic('2026-01-01', '2026-10-16', 'YEARLY', 0)).toBe('DUE');
  });
  it('tab of each type (LIC-1)', () => {
    expect(licenceCategoryOf('STATUTORY')).toBe('STATUTORY');
    expect(licenceCategoryOf('SAFETY_CALIBRATION')).toBe('STATUTORY');
    expect(licenceCategoryOf('ELECTRICAL_CALIBRATION')).toBe('INTERNAL');
    expect(licenceCategoryOf('MAINTENANCE_CALIBRATION')).toBe('INTERNAL');
  });
});

describe('observationUrgency (AUD-3, AUD-4) — mockup OB-0141…0144', () => {
  const ob = (
    status: 'PENDING' | 'COMPLIED',
    targetDate: string | null,
    revisedTargetDate: string | null = null,
  ) => observationUrgency({ status, targetDate, revisedTargetDate }, TODAY);

  it('uses the revised target date when entered', () => {
    expect(effectiveTargetDate({ targetDate: '2026-09-30', revisedTargetDate: '2026-10-10' })).toBe(
      '2026-10-10',
    );
    expect(ob('PENDING', '2026-09-30', '2026-10-10')).toBe('OVERDUE'); // OB-0142
    expect(ob('PENDING', '2026-09-30', '2026-10-20')).toBe('DUE_SOON');
  });
  it('Due in 7 days or less, Pending beyond, Overdue once passed', () => {
    expect(ob('PENDING', '2026-10-20')).toBe('DUE_SOON'); // OB-0143
    expect(ob('PENDING', '2026-10-23')).toBe('DUE_SOON'); // day 7
    expect(ob('PENDING', '2026-10-24')).toBe('PENDING');
    expect(ob('PENDING', '2026-11-15')).toBe('PENDING'); // OB-0144
    expect(ob('PENDING', '2026-10-16')).toBe('DUE_SOON'); // today is not overdue yet
    expect(ob('PENDING', '2026-10-15')).toBe('OVERDUE');
  });
  it('Complied is green whatever the dates; no target date is plain Pending', () => {
    expect(ob('COMPLIED', '2026-09-22', '2026-09-25')).toBe('COMPLIED'); // OB-0141
    expect(ob('PENDING', null)).toBe('PENDING');
  });
});

describe('reviewCheckStatus (D-27) and contracts ending (CARD-8)', () => {
  const base = {
    contractEnd: '2028-09-30',
    observationsOverdue: 0,
    observationsDueSoon: 0,
    licencesExpired: 0,
    licencesDue: 0,
  };
  it('Critical: an overdue observation, an expired licence or an ended contract', () => {
    expect(reviewCheckStatus({ ...base, observationsOverdue: 1 }, TODAY)).toBe('CRITICAL');
    expect(reviewCheckStatus({ ...base, licencesExpired: 1 }, TODAY)).toBe('CRITICAL');
    expect(reviewCheckStatus({ ...base, contractEnd: '2025-07-31' }, TODAY)).toBe('CRITICAL');
  });
  it('Attention: due soon, a Due licence, or the contract ends within 90 days', () => {
    expect(reviewCheckStatus({ ...base, observationsDueSoon: 2 }, TODAY)).toBe('ATTENTION');
    expect(reviewCheckStatus({ ...base, licencesDue: 1 }, TODAY)).toBe('ATTENTION');
    expect(reviewCheckStatus({ ...base, contractEnd: '2026-12-31' }, TODAY)).toBe('ATTENTION');
  });
  it('OK otherwise', () => {
    expect(reviewCheckStatus(base, TODAY)).toBe('OK');
  });
  it('contract ending window is today … today + 90', () => {
    expect(contractEndingSoon('2026-10-16', TODAY)).toBe(true);
    expect(contractEndingSoon('2027-01-14', TODAY)).toBe(true);
    expect(contractEndingSoon('2027-01-15', TODAY)).toBe(false);
    expect(contractEndingSoon('2026-10-15', TODAY)).toBe(false);
  });
});
