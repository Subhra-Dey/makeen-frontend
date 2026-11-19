// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/**
 * Domain enums. The Prisma schema declares the same values; an API test asserts they match,
 * so the database, the API and the screens can never disagree on a status name.
 */

export const REPORT_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'RETURNED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const EXCEPTION_STATUSES = ['PARTIAL', 'PENDING', 'COMPLETED'] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const PLANT_OPERATING_STATUSES = ['OPERATIONAL', 'NON_OPERATIONAL'] as const;
export type PlantOperatingStatus = (typeof PLANT_OPERATING_STATUSES)[number];

export const YES_NO = ['YES', 'NO'] as const;
export type YesNo = (typeof YES_NO)[number];

export const WORKING_STATUSES = ['WORKING', 'RESIGNED'] as const;
export type WorkingStatus = (typeof WORKING_STATUSES)[number];

export const LOGIN_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type LoginStatus = (typeof LOGIN_STATUSES)[number];

export const PLANT_STATUSES = ['NEW', 'WORKING'] as const;
export type PlantStatus = (typeof PLANT_STATUSES)[number];

export const VOLUME_TYPES = ['PROJECTED', 'MINIMUM'] as const;
export type VolumeType = (typeof VOLUME_TYPES)[number];

export const AUDIT_TYPES = ['ISA', 'OISD', 'MEIPL'] as const;
export type AuditType = (typeof AUDIT_TYPES)[number];

/** Spec: 3 Months / 12 Months / 5 Years. */
export const AUDIT_FREQUENCIES = ['MONTHS_3', 'MONTHS_12', 'YEARS_5'] as const;
export type AuditFrequency = (typeof AUDIT_FREQUENCIES)[number];

export const OBSERVATION_STATUSES = ['PENDING', 'COMPLIED'] as const;
export type ObservationStatus = (typeof OBSERVATION_STATUSES)[number];

/** Licence screens (tabs): Statutory & Mandatory, Internal testing. */
export const LICENCE_CATEGORIES = ['STATUTORY', 'INTERNAL'] as const;
export type LicenceCategory = (typeof LICENCE_CATEGORIES)[number];

export const LICENCE_TYPES = [
  'STATUTORY',
  'SAFETY_CALIBRATION',
  'ELECTRICAL_CALIBRATION',
  'MAINTENANCE_CALIBRATION',
] as const;
export type LicenceType = (typeof LICENCE_TYPES)[number];

/** Which licence types belong to which tab (spec: Licences — two screens). */
export const LICENCE_TYPES_BY_CATEGORY: Readonly<Record<LicenceCategory, readonly LicenceType[]>> =
  {
    STATUTORY: ['STATUTORY', 'SAFETY_CALIBRATION'],
    INTERNAL: ['ELECTRICAL_CALIBRATION', 'MAINTENANCE_CALIBRATION'],
  };

export const RENEWAL_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'NA'] as const;
export type RenewalFrequency = (typeof RENEWAL_FREQUENCIES)[number];

export const OTP_CHANNELS = ['SMS', 'EMAIL'] as const;
export type OtpChannel = (typeof OTP_CHANNELS)[number];

export const NOTIFICATION_CATEGORIES = ['SYSTEM', 'CUSTOM', 'PERSON'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

/** Spec “The user cycle — events” 1–8. */
export const NOTIFICATION_EVENTS = [
  'REPORT_SUBMITTED', // 1 Daily MIS or Daily Exception saved → Plant Manager
  'EXCEPTION_RAISED', // 2 Daily Exception Yes line / incident → Plant Manager
  'REPORT_DECIDED', // 3 Approved or Returned → person who entered it
  'LICENCE_DUE', // 4 Licence Due or Expired → remind list
  'AUDIT_OVERDUE', // 5 Audit observation past target → Plant Manager
  'ACCESS_CHANGED', // 6 Plant or access assigned / turned off → person + Plant Manager
  'PASSWORD_OTP', // 7 Password OTP → chosen method
  'PERSON_NOTE', // 8 Written note → named person
] as const;
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export const SEND_CHANNELS = ['IN_APP', 'EMAIL', 'SMS'] as const;
export type SendChannel = (typeof SEND_CHANNELS)[number];

/** QUEUED = an email waiting in the outbox (sent after the change commits). */
export const SEND_STATES = ['QUEUED', 'SENT', 'FAILED', 'SKIPPED'] as const;
export type SendState = (typeof SEND_STATES)[number];

/** Records that can carry files (spec “File uploads”). */
export const ATTACHMENT_OWNERS = [
  'DAILY_EXCEPTION',
  'AUDIT',
  'LICENCE',
  'PLANT_CONTRACT',
  'PLANT_ACTIVITY',
] as const;
export type AttachmentOwner = (typeof ATTACHMENT_OWNERS)[number];

export const SCAN_STATUSES = ['PENDING', 'CLEAN', 'INFECTED', 'SKIPPED'] as const;
export type ScanStatus = (typeof SCAN_STATUSES)[number];

/**
 * Cylinder sizes for the Monthly MIS matrices. Both 35 kg columns are separate numbers and are
 * never merged (spec: “Keep both 35 kg columns wherever they appear”). Order = spec order.
 */
export const CYLINDER_SIZES = [
  'KG5',
  'KG14_2',
  'KG19',
  'KG35_A',
  'KG47_5',
  'KG35_B',
  'KG425',
] as const;
export type CylinderSize = (typeof CYLINDER_SIZES)[number];

export const CYLINDER_SIZE_LABELS: Readonly<Record<CylinderSize, string>> = {
  KG5: '5 kg',
  KG14_2: '14.2 kg',
  KG19: '19 kg',
  KG35_A: '35 kg',
  KG47_5: '47.5 kg',
  KG35_B: '35 kg (2nd)',
  KG425: '425 kg',
};

/** Monthly MIS cylinder rows 70–104 (7 sizes each). */
export const CYLINDER_STAT_CATEGORIES = [
  'DUE_TESTING', // 70–76 Due for pressure testing (generated)
  'TESTED_DESPATCHED', // 77–83 Testing done & despatched for filling
  'CLOSING_DUE_TESTING', // 84–90 Closing inventory, due for pressure testing
  'CLOSING_HOT_REPAIR', // 91–97 Closing inventory, hot repair
  'CLOSING_SCRAP', // 98–104 Closing inventory, scrap CVR
] as const;
export type CylinderStatCategory = (typeof CYLINDER_STAT_CATEGORIES)[number];

/** Monthly MIS inventory items 105–121. */
export const INVENTORY_ITEMS = [
  'SCRAP_SC_VALVE', // 105
  'SCRAP_REGULATOR', // 106
  'NEW_SC_VALVE', // 107
  'NEW_REGULATOR', // 108
  'NEW_O_RINGS', // 109
  'NEW_TE_SEALS', // 110
  'NEW_SAFETY_CAPS', // 111
  'NEW_NYLON_THREAD', // 112
  'NEW_SS_CLIP', // 113
  'NEW_TEFLON_TAPE', // 114
  'DPT_ZINC_CHROMATE_PRIMER', // 115
  'DPT_SIGNAL_RED', // 116
  'DPT_OXFORD_BLUE', // 117
  'DPT_WHITE', // 118
  'DPT_YELLOW', // 119
  'DPT_BLACK', // 120
  'DPT_STENCIL', // 121
] as const;
export type InventoryItem = (typeof INVENTORY_ITEMS)[number];

/** Plant details equipment rows 5–18 (spec order). */
export const EQUIPMENT_TYPES = [
  'PUMPS',
  'COMPRESSOR',
  'FIRE_ENGINE',
  'WATER_PUMPS',
  'CAPPING_MACHINE',
  'VALVE_OPENING_MACHINE',
  'REPAIR_MACHINE',
  'PURGING_MACHINE',
  'PNEUMATIC_TESTING',
  'HYDROTESTING',
  'PAINTING_BOOTH',
  'CYLINDER_RETESTING',
  'CCTV_CAMERAS',
  'CHAIN_CONVEYOR',
] as const;
export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_LABELS: Readonly<Record<EquipmentType, string>> = {
  PUMPS: 'Pumps',
  COMPRESSOR: 'Compressor',
  FIRE_ENGINE: 'Fire engine',
  WATER_PUMPS: 'Water pumps',
  CAPPING_MACHINE: 'Capping machine',
  VALVE_OPENING_MACHINE: 'Valve opening machine',
  REPAIR_MACHINE: 'Repair machine',
  PURGING_MACHINE: 'Purging machine',
  PNEUMATIC_TESTING: 'Pneumatic testing',
  HYDROTESTING: 'Hydrotesting',
  PAINTING_BOOTH: 'Painting booth',
  CYLINDER_RETESTING: 'Cylinder re-testing',
  CCTV_CAMERAS: 'CCTV cameras',
  CHAIN_CONVEYOR: 'Chain conveyor',
};

export const KEKA_IMPORT_SOURCES = ['CSV', 'API'] as const;
export type KekaImportSource = (typeof KEKA_IMPORT_SOURCES)[number];
