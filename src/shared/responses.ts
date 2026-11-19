// MAKEEN domain contract — identical copy in api/src/shared and web/src/shared.
// Edit both copies together; CI (contract.yml) fails if they differ. See DECISIONS D-49.

/**
 * Response shapes of the API, shared so the web app and the API cannot drift (the API's services
 * return exactly these types). Instants are ISO strings (UTC); display them with `shared/ist`.
 */
import type { Action, Capability, Module, ModuleSetting } from './access';
import type {
  AuditFrequency,
  AuditType,
  EquipmentType,
  ExceptionStatus,
  LicenceCategory,
  LicenceType,
  LOGIN_STATUSES,
  NotificationCategory,
  NotificationEvent,
  SendChannel,
  SendState,
  ObservationStatus,
  OTP_CHANNELS,
  PlantOperatingStatus,
  PlantStatus,
  RenewalFrequency,
  ReportStatus,
  VolumeType,
  WORKING_STATUSES,
} from './enums';
import type { CheckStatus, LicenceStatus, ObservationUrgency } from './rules/operations';
import type { ExceptionLines } from './rules/daily-exception';
import type { ExceptionRowStatus } from './schemas/daily-exception';
import type { DailyMisDerived } from './rules/daily-mis';
import type { DailyMisValues } from './schemas/daily-mis';
import type { CumulativeDailySummary } from './rules/monthly-summary';
import type { CylinderGrid, InventoryValues, MonthlyMisValues } from './schemas/monthly-mis';
import type { ImportOutcome } from './schemas/keka';

type LoginStatus = (typeof LOGIN_STATUSES)[number];
type WorkingStatus = (typeof WORKING_STATUSES)[number];
type OtpChannel = (typeof OTP_CHANNELS)[number];

export interface RoleRef {
  id: string;
  name: string;
}

export interface PlantAccess {
  plantId: string;
  name: string;
  code: string;
  role: RoleRef;
}

/** POST /api/auth/login */
export interface SignInResponse {
  user: { id: string; name: string; email: string };
}

/** POST /api/auth/password/options */
export interface OtpChannelOption {
  channel: OtpChannel;
  /** Masked KEKA destination, e.g. 98XXXXXX21 / an***@makeenenergy.com. */
  destination: string;
}

/** POST /api/auth/password/otp */
export interface OtpSent {
  channel: OtpChannel;
  sentTo: string;
  expiresAt: string;
  /** e.g. "16-10-2026, 10:42 IST" */
  expiresAtIst: string;
}

/** GET /api/me */
export interface MeResponse {
  user: {
    id: string;
    employeeCode: string;
    name: string;
    email: string;
    /** Masked (SEC-12): e.g. 98XXXXXX21. */
    phone: string | null;
    /** Masked (SEC-12): e.g. XXXX-XXXX-4821. */
    aadhaar: string | null;
    designation: string;
    photoUrl: string | null;
    loginStatus: string;
    workingStatus: string;
    lastLoginAt: string | null;
  };
  role: RoleRef | null;
  isAdmin: boolean;
  plants: PlantAccess[];
  /** What the UI may show; the API enforces the same matrix on every request. */
  access: { modules: Record<Module, Capability[]>; actions: Action[] };
}

export interface Page<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** One row of the People table (PPL-T1…T11) and the User logins table (ULG-T1…T7). */
export interface PersonRow {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  /** Masked (SEC-12). */
  phone: string | null;
  /** Masked (SEC-12). */
  aadhaar: string | null;
  designation: string;
  photoUrl: string | null;
  plants: { id: string; name: string; code: string; role: RoleRef }[];
  /** Base role (non-plant screens, D-11). */
  role: RoleRef | null;
  /** What the designation map offers for this person's designation (Assign dialog hint). */
  mappedRoles: RoleRef[];
  loginStatus: LoginStatus;
  workingStatus: WorkingStatus;
  lastLoginAt: string | null;
  /** False when the person has no role anywhere — an unmapped designation (PPL-4). */
  hasRole: boolean;
}

/** CARD-9 */
export interface PeopleCards {
  working: number;
  resigned: number;
  activeLogins: number;
  inactiveLogins: number;
}

export type PeoplePage = Page<PersonRow> & { cards: PeopleCards };

export interface RoleSummary {
  id: string;
  name: string;
  isStandard: boolean;
  isAdmin: boolean;
  /** People holding the role as base role or on any plant. */
  peopleCount: number;
  designations: string[];
}

export interface RoleDetail extends RoleSummary {
  version: number;
  modules: Record<Module, ModuleSetting>;
  actions: Record<Action, boolean>;
  /** “Logged with Admin name and time” (ROLE-8). */
  updatedBy: RoleRef | null;
  updatedAt: string;
}

export interface DesignationRow {
  designation: string;
  roles: RoleRef[];
  /** People in the KEKA data with this designation. */
  people: number;
}

export type ImportSource = 'CSV' | 'API';

export interface ImportRowResult {
  /** Row in the file (header = 1) or position in the API list. */
  row: number;
  employeeCode: string | null;
  name: string | null;
  outcome: ImportOutcome;
  /** Columns that change (labels as in the file). */
  changes: string[];
  errors: { field: string; message: string }[];
  notes: string[];
}

export interface ImportTotals {
  total: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
}

export interface ImportReport {
  batchId: string;
  source: ImportSource;
  fileName: string | null;
  dryRun: boolean;
  finishedAt: string;
  totals: ImportTotals;
  rows: ImportRowResult[];
}

export interface PlantRef {
  id: string;
  name: string;
  code: string;
}

export interface PersonRef {
  id: string;
  name: string;
}

/** One row of the Daily MIS table (DMIS-T1…T11). Decimals are fixed-decimal strings. */
export interface DailyMisListRow {
  id: string;
  plant: PlantRef;
  /** ISO date `yyyy-MM-dd`. */
  reportDate: string;
  /** F19 */
  physicalStock: string | null;
  /** F11 + F13 */
  bottlingDespatches: string | null;
  /** F15 */
  cylFilled142: number | null;
  /** F16 */
  cylFilled19: number | null;
  /** F20 */
  stockGainLoss: string | null;
  /** F39 */
  accuracyZero: string | null;
  status: ReportStatus;
  enteredBy: string;
  /** Last modified (instant). */
  updatedAt: string;
}

/**
 * Totals of every row in the filter (not just the page). The Excel / PDF download prints exactly
 * these (BEV-6 / Phase 6 exit criterion — export totals = list totals, D-87).
 */
export interface DailyMisTotals {
  rows: number;
  bottlingDespatches: string;
  cylFilled142: number;
  cylFilled19: number;
  stockGainLoss: string;
  /** Average of F39 over rows that have it; null when none. */
  accuracyZeroAverage: string | null;
}

/** CARD-2: counts in the filter; Not initiated = plant-days with no Daily MIS row (D-18). */
export interface DailyMisCards {
  pending: number;
  approved: number;
  returned: number;
  draft: number;
  notInitiated: number;
}

export interface DailyMisPage extends Page<DailyMisListRow> {
  from: string;
  to: string;
  cards: DailyMisCards;
  totals: DailyMisTotals;
}

/** What the signed-in person may do with this row (the API enforces the same rules). */
export interface DailyMisPermissions {
  edit: boolean;
  approve: boolean;
  return: boolean;
  reopen: boolean;
  download: boolean;
}

export interface DailyMisRevisionRef {
  version: number;
  status: ReportStatus;
  savedAt: string;
  savedBy: PersonRef;
}

/** GET /api/daily-mis/:id — the whole report with its workflow and save history. */
export interface DailyMisDetail {
  id: string;
  version: number;
  plant: PlantRef;
  reportDate: string;
  status: ReportStatus;
  values: DailyMisValues;
  derived: DailyMisDerived;
  enteredBy: PersonRef;
  lastModifiedBy: PersonRef | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedBy: PersonRef | null;
  approvedAt: string | null;
  returnedBy: PersonRef | null;
  returnedAt: string | null;
  returnReason: string | null;
  reopenedBy: PersonRef | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  /** Hours from first save to Approve (or now) — D-30. */
  waitingHours: number;
  revisions: DailyMisRevisionRef[];
  can: DailyMisPermissions;
}

/** One saved version, read only (save history “View”). */
export interface DailyMisRevision extends DailyMisRevisionRef {
  values: DailyMisValues;
  derived: DailyMisDerived;
}

/** Approval queue row (APPR-Q1): Pending, oldest first. */
export interface ApprovalQueueItem {
  id: string;
  module: 'DAILY_MIS' | 'MONTHLY_MIS';

  plant: PlantRef;
  /** ISO date `yyyy-MM-dd` (Daily) or month `yyyy-MM` (Monthly). */
  period: string;
  enteredBy: string;
  lastSavedAt: string;
  waitingHours: number;
  version: number;
}

/** One row of the Monthly MIS table (MMIS-T1…T11, D-16). */
export interface MonthlyMisListRow {
  id: string;
  plant: PlantRef;
  /** `yyyy-MM`. */
  month: string;
  /** S7 */
  totalProduction: string;
  /** S10 */
  totalShifts: number;
  /** F26 + F27 (kW) — null when neither is entered. */
  electricityUnits: string | null;
  /** F31 + F32 (litres) — null when neither is entered. */
  dieselConsumed: string | null;
  /** S8 */
  cylinderDespatches: string;
  /** S9 */
  ttLoading: string;
  status: ReportStatus;
  enteredBy: string;
  updatedAt: string;
}

/** Totals of the whole filter — the footer and the download print exactly these (D-87). */
export interface MonthlyMisTotals {
  rows: number;
  totalProduction: string;
  totalShifts: number;
  electricityUnits: string;
  dieselConsumed: string;
  cylinderDespatches: string;
  ttLoading: string;
}

/** CARD-3: Pending, Approved, Not started (plants with no row for the month). */
export interface MonthlyMisCards {
  pending: number;
  approved: number;
  returned: number;
  draft: number;
  notStarted: number;
}

export interface MonthlyMisPage extends Page<MonthlyMisListRow> {
  /** The month shown (`yyyy-MM`). */
  month: string;
  cards: MonthlyMisCards;
  totals: MonthlyMisTotals;
}

/** A. Cumulative Daily Summary (items 1–25) with how many days fed it. */
export interface MonthlySummaryView {
  items: CumulativeDailySummary;
  /** Approved Daily MIS rows counted. */
  approvedDays: number;
  daysInMonth: number;
  /** True once the Monthly MIS is Approved: the figures were frozen at approval (MMIS-R4). */
  frozen: boolean;
}

/** GET /api/monthly-mis/:id */
export interface MonthlyMisDetail {
  id: string;
  version: number;
  plant: PlantRef;
  month: string;
  status: ReportStatus;
  summary: MonthlySummaryView;
  values: MonthlyMisValues;
  /** Item 47 = Σ 44–46. */
  trainingTotal: number;
  cylinders: CylinderGrid;
  inventory: InventoryValues;
  enteredBy: PersonRef;
  lastModifiedBy: PersonRef | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedBy: PersonRef | null;
  approvedAt: string | null;
  returnedBy: PersonRef | null;
  returnedAt: string | null;
  returnReason: string | null;
  reopenedBy: PersonRef | null;
  reopenedAt: string | null;
  reopenReason: string | null;
  waitingHours: number;
  can: DailyMisPermissions;
}

/** One row of the Daily Exceptions table (DEX-T1…T6): a saved report or a Not initiated day. */
export interface DailyExceptionListRow {
  /** Null for a Not initiated plant-day (nothing saved). */
  id: string | null;
  plant: PlantRef;
  reportDate: string;
  problemHighlight: string | null;
  status: ExceptionRowStatus;
  enteredBy: string | null;
  updatedAt: string | null;
  /** Short plant note for a missed day (DEX-S7). */
  lapseNote: string | null;
}

/** CARD-4: in the filter; Submitted = Completed + Pending. */
export interface DailyExceptionCards {
  completed: number;
  submitted: number;
  pending: number;
  partial: number;
  notInitiated: number;
}

/** Lapse (DEX-S6, D-21): Not initiated, system counted — today, this month, this FY. */
export interface LapseCounts {
  /** Plants in scope with nothing saved for today (IST). */
  today: number;
  /** e.g. “November 2026” — days up to yesterday. */
  month: { label: string; days: number };
  /** e.g. “FY 2026-27” — days up to yesterday. */
  fy: { label: string; days: number };
}

export interface DailyExceptionPage extends Page<DailyExceptionListRow> {
  from: string;
  to: string;
  cards: DailyExceptionCards;
  lapse: LapseCounts;
}

/** A file that belongs to a record (FILE-1). Downloaded only through its record's endpoint. */
export interface AttachmentRef {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: PersonRef;
}

/** GET /api/daily-exceptions/:id */
export interface DailyExceptionDetail {
  id: string;
  version: number;
  plant: PlantRef;
  reportDate: string;
  plantStatus: PlantOperatingStatus | null;
  status: ExceptionStatus;
  problemHighlight: string | null;
  lines: ExceptionLines;
  attachments: AttachmentRef[];
  enteredBy: PersonRef;
  lastModifiedBy: PersonRef | null;
  createdAt: string;
  updatedAt: string;
  can: { edit: boolean; upload: boolean; download: boolean };
}

// ───────────────────────────────────────────── Plant Operations (Phase 9)

/** A person to pick (manager, users, remind list). */
export interface PersonOption {
  id: string;
  name: string;
  designation: string;
}

/** One row of the Plant master table (PLT-T1…T9). */
export interface PlantRow {
  id: string;
  name: string;
  address: string;
  code: string;
  contractDate: string;
  startDate: string;
  endDate: string;
  periodYears: number;
  extensionYears: number | null;
  status: PlantStatus;
  plantKey: string;
  manager: PersonRef;
}

/** CARD-8. */
export interface PlantCards {
  working: number;
  new: number;
  endingSoon: number;
  /** Names of the plants whose contract ends in 90 days (shown under the card). */
  endingSoonNames: string[];
}

export type PlantPage = Page<PlantRow> & { cards: PlantCards };

export interface PlantVolume {
  type: VolumeType;
  fy: string;
  volumeMt: string;
}

export interface PlantActivityView {
  id: string;
  heading: string;
  description: string | null;
  createdAt: string;
  createdBy: PersonRef | null;
  images: AttachmentRef[];
}

/** GET /api/plants/:id — the master record, its details, activities and contract files. */
export interface PlantDetailView {
  plant: PlantRow;
  users: PersonRef[];
  details: {
    capacity: string | null;
    production: string | null;
    volumes: PlantVolume[];
    equipment: Record<EquipmentType, { quantity: number; note: string | null }>;
    updatedBy: PersonRef | null;
    updatedAt: string | null;
  };
  activities: PlantActivityView[];
  contractFiles: AttachmentRef[];
  can: { editMaster: boolean; editDetails: boolean; delete: boolean };
}

export interface ObservationCounts {
  complied: number;
  /** Pending, not overdue (includes Due in 7 days). */
  pending: number;
  dueSoon: number;
  overdue: number;
}

/** One row of the Audit table (AUD-T1…T8). */
export interface AuditRow {
  id: string;
  plant: PlantRef;
  auditType: AuditType;
  fy: string;
  frequency: AuditFrequency;
  startDate: string;
  endDate: string;
  attachment: AttachmentRef | null;
  counts: ObservationCounts;
  /** Most urgent observation colour (AUD-3); null when there are none. */
  urgency: ObservationUrgency | null;
}

/** CARD-6. */
export interface AuditCards {
  totalRecommendations: number;
  complied: number;
  pending: number;
  overdue: number;
}

export type AuditPage = Page<AuditRow> & { cards: AuditCards };

export interface ObservationView {
  id: string;
  code: string;
  subGroupCode: string | null;
  checklistRef: string | null;
  particular: string | null;
  observation: string | null;
  recommendation: string | null;
  actionPlan: string | null;
  targetDate: string | null;
  revisedTargetDate: string | null;
  status: ObservationStatus;
  urgency: ObservationUrgency;
}

/** GET /api/audits/:id — observations sorted Overdue → Due → Pending → Complied (AUD-3). */
export interface AuditDetail {
  id: string;
  version: number;
  plant: PlantRef;
  auditType: AuditType;
  frequency: AuditFrequency;
  fy: string;
  totalRecommendations: number;
  startDate: string;
  endDate: string;
  files: AttachmentRef[];
  observations: ObservationView[];
  createdBy: PersonRef | null;
  updatedAt: string;
  can: { edit: boolean; upload: boolean };
}

export interface LicenceItemOption {
  id: string;
  licenceType: LicenceType;
  title: string;
}

/** One row of a Licences table (LIC-T1…T9). */
export interface LicenceRow {
  id: string;
  plant: PlantRef;
  category: LicenceCategory;
  licenceType: LicenceType;
  item: { id: string; title: string };
  docRef: string | null;
  startDate: string | null;
  endDate: string | null;
  frequency: RenewalFrequency;
  remindBeforeDays: number;
  status: LicenceStatus;
}

/** CARD-7. */
export interface LicenceCards {
  total: number;
  active: number;
  expired: number;
  due: number;
  na: number;
  notInitiated: number;
}

export type LicencePage = Page<LicenceRow> & { cards: LicenceCards };

export interface LicenceDetail extends LicenceRow {
  version: number;
  notes: string | null;
  remindUsers: PersonRef[];
  files: AttachmentRef[];
  updatedAt: string;
  can: { edit: boolean; upload: boolean };
}

export interface StatusCounts {
  active: number;
  due: number;
  expired: number;
}

/** One plant on Review Check (RC-2). */
export interface ReviewCheckRow {
  plant: PlantRef;
  contractEnd: string;
  audit: ObservationCounts;
  statutory: StatusCounts;
  internal: StatusCounts;
  status: CheckStatus;
}

export interface ReviewCheckPage {
  rows: ReviewCheckRow[];
  /** “As of” date used for every status (IST). */
  today: string;
}

// ───────────────────────────────────────────── Notifications (Phase 10)

/** One notice in the inbox, as the signed-in recipient sees it. */
export interface NoticeView {
  id: string;
  category: NotificationCategory;
  event: NotificationEvent | null;
  customCategory: string | null;
  title: string;
  body: string;
  sender: PersonRef | null;
  plant: PlantRef | null;
  /** The exact row the notice refers to (NOTIF-2). */
  link: { entity: string; id: string } | null;
  createdAt: string;
  readAt: string | null;
  acknowledgedAt: string | null;
  canAcknowledge: boolean;
  canReply: boolean;
  reply: string | null;
  repliedAt: string | null;
  /** A reply to a note I sent (the “Replies” filter). */
  isReply: boolean;
}

/** NOTIF-6 cards. */
export interface InboxCards {
  all: number;
  unread: number;
  toAcknowledge: number;
  awaitingReply: number;
}

export type InboxPage = Page<NoticeView> & { cards: InboxCards };

export interface UnreadCount {
  unread: number;
}

/** Notification control row (NOTIF-C1, C2). */
export interface EventConfigRow {
  event: NotificationEvent;
  label: string;
  enabled: boolean;
  emailEnabled: boolean;
  receives: string;
  channel: string;
  /** The password OTP cannot be switched off (sign-in depends on it). */
  locked: boolean;
  updatedBy: PersonRef | null;
  updatedAt: string | null;
}

/** “Last sends” (NOTIF-C3). */
export interface SendLogRow {
  id: string;
  at: string;
  category: NotificationCategory;
  title: string;
  sentTo: string;
  recipientCount: number;
  channel: SendChannel;
  state: SendState;
  error: string | null;
}

export type SendLogPage = Page<SendLogRow>;

/** NOTIF-S8 preview. */
export interface CustomNoticePreview {
  recipientCount: number;
  /** First names, so the sender can check the audience. */
  sample: string[];
}

/** Result of one run of the daily IST job (NOTIF-J1). */
export interface DailyNoticeRun {
  date: string;
  licenceDue: number;
  licenceExpired: number;
  auditOverdue: number;
  /** Already raised before (same dedupe key) — not sent again. */
  alreadyRaised: number;
}

// ───────────────────────────────────────────── Dashboard, Management Review, Graphs (Phase 11)

/** CARD-1; a card is null when the module filter or a Hidden module leaves it out (CARD-0). */
export interface DashboardCards {
  waiting: { daily: number; monthly: number } | null;
  openExceptions: { pending: number; partial: number } | null;
  licences: { due: number; expired: number } | null;
  /** Shown instead of Licences when the Module filter is Audit (D-123). */
  auditOverdue: number | null;
  notInitiated: number | null;
  /** The day “not initiated” is counted for (today, or the chosen date). */
  notInitiatedDate: string;
}

export interface DashboardPendingRow extends ApprovalQueueItem {
  can: { approve: boolean; return: boolean };
}

export interface DashboardExceptionRow {
  id: string;
  plant: PlantRef;
  reportDate: string;
  problemHighlight: string | null;
  status: 'PENDING' | 'PARTIAL';
  /** Lines answered so far (a Partial row's highlight says which are left). */
  answered: number;
  /** Active questions in the checklist. */
  lineTotal: number;
}

export interface DashboardView {
  cards: DashboardCards;
  pending: DashboardPendingRow[] | null;
  openExceptions: DashboardExceptionRow[] | null;
}

export interface PerformancePoint {
  label: string;
  from: string;
  to: string;
  /** Approved bottling despatches (MT): Daily 11 + 13. */
  achieved: string;
  /** Projected bottling for the FY spread evenly per day (MT). */
  target: string;
}

export interface PlantPerformance {
  range: '7D' | '30D' | '90D' | '1Y';
  points: PerformancePoint[];
  totals: { achieved: string; target: string };
}

/** Daily highlight of one plant (MR-4). Numbers are fixed-decimal strings. */
export interface DailyHighlight {
  stockGainLoss: string | null;
  eldPct: string | null;
  oldPct: string | null;
  breakdownMinutes: number | null;
  marketReturns: number | null;
  accuracyZero: string | null;
}

export interface MonthlyHighlight {
  production: string | null;
  electricity: string | null;
  diesel: string | null;
  costPerMt: string | null;
  tenderCostPerMt: string | null;
  status: ReportStatus | null;
}

export interface ReviewPackRow {
  plant: PlantRef;
  /** Status of the Daily MIS (day pack) or Monthly MIS (month pack); null = not filed. */
  status: ReportStatus | null;
  daily: DailyHighlight | null;
  exception: { text: string; status: ExceptionRowStatus; id: string | null };
  lapse: { day: number; month: number; year: number };
  monthly: MonthlyHighlight | null;
}

export interface ReviewFile {
  id: string;
  fileName: string;
  /** Where the record's file is downloaded (its own authorised endpoint). */
  url: string;
  plant: PlantRef;
  what: string;
}

export interface ReviewPack {
  kind: 'DAY' | 'MONTH';
  /** `yyyy-MM-dd` (day pack) or `yyyy-MM` (month pack). */
  period: string;
  cards: {
    filed: number;
    total: number;
    notFiled: number;
    openExceptions: number;
    licencesDue: number;
    licencesExpired: number;
  };
  rows: ReviewPackRow[];
  /** All-plants Cumulative Daily Summary from the 1st of the month up to the period (MR-7). */
  summary: { from: string; to: string; approvedDays: number; items: CumulativeDailySummary };
  files: ReviewFile[];
}

export interface Comparison {
  mode: 'PLANTS' | 'DATES';
  title: string;
  columns: { key: string; label: string }[];
  rows: { measure: string; values: (string | null)[] }[];
}

export type GraphKind = 'bar' | 'stacked' | 'line' | 'grouped' | 'stacked100';

export interface GraphChart {
  id: number;
  title: string;
  source: string;
  kind: GraphKind;
  unit: string;
  /**
   * `unit` set on a series = it is drawn in its own small panel with its own scale (never a
   * second y-axis on one chart, D-128); series without one share the chart's unit.
   */
  series: { key: string; label: string; unit?: string }[];
  /** One point per day or month; values are numbers as strings (null = no saved value). */
  points: { label: string; values: Record<string, string | null> }[];
  /** The same numbers as a small table under the chart (GR-0). */
  table: { columns: string[]; rows: (string | null)[][] };
  note: string | null;
}

export interface GraphsView {
  plant: PlantRef;
  month: string;
  /** The six months shown by trend charts, oldest first. */
  months: string[];
  charts: GraphChart[];
  manHour: { enabled: boolean; hoursPerShift: number | null };
}

export interface SearchHit {
  kind: 'PLANT' | 'DAILY_MIS' | 'MONTHLY_MIS' | 'EXCEPTION' | 'LICENCE' | 'AUDIT';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface ImportStatus {
  apiConfigured: boolean;
  /** Last applied (not dry-run) load — “Last KEKA load: … IST · CSV”. */
  last: {
    at: string;
    source: ImportSource;
    fileName: string | null;
    totals: ImportTotals;
  } | null;
}
