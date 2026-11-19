'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  ApprovalQueueItem,
  AuditDetail,
  AuditPage,
  LicenceDetail,
  LicenceItemOption,
  LicencePage,
  PersonOption,
  PlantDetailView,
  PlantPage,
  ReviewCheckPage,
  DailyExceptionDetail,
  DailyExceptionPage,
  ExceptionLineDef,
  DailyMisDetail,
  DailyMisPage,
  ExceptionRowStatus,
  DailyMisRevision,
  ReportStatus,
  DesignationRow,
  ImportStatus,
  MonthlyMisDetail,
  MonthlyMisPage,
  MonthlySummaryView,
  Page,
  PeoplePage,
  PersonRow,
  RoleDetail,
  RoleSummary,
} from '@/shared';
import { api } from './api/client';

/** `?a=1&b=2` from defined values only. */
export function queryString(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export interface PeopleFilters {
  plantId?: string | undefined;
  roleId?: string | undefined;
  loginStatus?: 'ACTIVE' | 'INACTIVE' | undefined;
  workingStatus?: 'WORKING' | 'RESIGNED' | undefined;
  q?: string | undefined;
}

export const keys = {
  people: (f: PeopleFilters, page: number) => ['people', f, page] as const,
  logins: (loginStatus: string | undefined, q: string | undefined, page: number) =>
    ['people', 'logins', loginStatus, q, page] as const,
  roles: ['roles'] as const,
  role: (id: string) => ['roles', id] as const,
  designations: ['designations'] as const,
  importStatus: ['people', 'import-status'] as const,
};

export function usePeople(f: PeopleFilters, page: number) {
  return useQuery({
    queryKey: keys.people(f, page),
    queryFn: ({ signal }) =>
      api<PeoplePage>(`/api/people${queryString({ ...f, page, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useLogins(loginStatus: string | undefined, q: string | undefined, page: number) {
  return useQuery({
    queryKey: keys.logins(loginStatus, q, page),
    queryFn: ({ signal }) =>
      api<Page<PersonRow>>(
        `/api/people/logins${queryString({ loginStatus, q, page, pageSize: 50 })}`,
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: keys.roles,
    queryFn: ({ signal }) => api<RoleSummary[]>('/api/roles', { signal }),
    staleTime: 60_000,
  });
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: keys.role(id ?? ''),
    queryFn: ({ signal }) => api<RoleDetail>(`/api/roles/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

export function useDesignations() {
  return useQuery({
    queryKey: keys.designations,
    queryFn: ({ signal }) => api<DesignationRow[]>('/api/designations', { signal }),
  });
}

export interface DailyMisFilters {
  plantId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  status?: ReportStatus | undefined;
}

export const dailyKeys = {
  all: ['daily-mis'] as const,
  list: (f: DailyMisFilters, page: number) => ['daily-mis', 'list', f, page] as const,
  row: (id: string) => ['daily-mis', 'row', id] as const,
  revision: (id: string, v: number) => ['daily-mis', 'revision', id, v] as const,
};

export function useDailyMisList(f: DailyMisFilters, page: number) {
  return useQuery({
    queryKey: dailyKeys.list(f, page),
    queryFn: ({ signal }) =>
      api<DailyMisPage>(`/api/daily-mis${queryString({ ...f, page, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useDailyMis(id: string | null) {
  return useQuery({
    queryKey: dailyKeys.row(id ?? ''),
    queryFn: ({ signal }) => api<DailyMisDetail>(`/api/daily-mis/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

export type QueueModule = ApprovalQueueItem['module'];

/**
 * Approval queue (APPR-Q1): Pending Daily and Monthly MIS rows the person may approve, merged and
 * oldest first. Each module is asked only when the person has Approve on it.
 */
export function useApprovalQueue(plantId: string | undefined, modules: readonly QueueModule[]) {
  return useQuery({
    queryKey: ['approval-queue', plantId, [...modules].sort()] as const,
    queryFn: async ({ signal }) => {
      const q = queryString({ plantId });
      const lists = await Promise.all(
        modules.map((m) =>
          api<ApprovalQueueItem[]>(
            `${m === 'DAILY_MIS' ? '/api/daily-mis' : '/api/monthly-mis'}/queue${q}`,
            { signal },
          ),
        ),
      );
      return lists.flat().sort((a, b) => b.waitingHours - a.waitingHours);
    },
    enabled: modules.length > 0,
  });
}

export interface ExceptionFilters {
  plantId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  status?: ExceptionRowStatus | undefined;
}

export const exceptionKeys = {
  all: ['daily-exceptions'] as const,
  list: (f: ExceptionFilters, page: number) => ['daily-exceptions', 'list', f, page] as const,
  row: (id: string) => ['daily-exceptions', 'row', id] as const,
  form: ['daily-exceptions', 'form'] as const,
};

export function useExceptionList(f: ExceptionFilters, page: number) {
  return useQuery({
    queryKey: exceptionKeys.list(f, page),
    queryFn: ({ signal }) =>
      api<DailyExceptionPage>(`/api/daily-exceptions${queryString({ ...f, page, pageSize: 50 })}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useExceptionForm() {
  return useQuery({
    queryKey: exceptionKeys.form,
    queryFn: ({ signal }) => api<ExceptionLineDef[]>('/api/daily-exceptions/form', { signal }),
    staleTime: 5 * 60 * 1000,
  });
}

export function useException(id: string | null) {
  return useQuery({
    queryKey: exceptionKeys.row(id ?? ''),
    queryFn: ({ signal }) =>
      api<DailyExceptionDetail>(`/api/daily-exceptions/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

// ───────────────────────────── Plant Operations (Phase 9)

export const opsKeys = {
  plants: (f: object, page: number) => ['plants', 'list', f, page] as const,
  plant: (id: string) => ['plants', 'row', id] as const,
  peopleOptions: ['plants', 'people-options'] as const,
  audits: (f: object, page: number) => ['audits', 'list', f, page] as const,
  audit: (id: string) => ['audits', 'row', id] as const,
  licences: (f: object, page: number) => ['licences', 'list', f, page] as const,
  licence: (id: string) => ['licences', 'row', id] as const,
  licenceItems: ['licences', 'items'] as const,
  remindOptions: (plantId: string) => ['licences', 'remind', plantId] as const,
  reviewCheck: (f: object) => ['review-check', f] as const,
};

type Params = Record<string, string | number | undefined | null>;

export function usePlants(f: Params, page: number) {
  return useQuery({
    queryKey: opsKeys.plants(f, page),
    queryFn: ({ signal }) =>
      api<PlantPage>(`/api/plants${queryString({ ...f, page, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function usePlant(id: string) {
  return useQuery({
    queryKey: opsKeys.plant(id),
    queryFn: ({ signal }) => api<PlantDetailView>(`/api/plants/${id}`, { signal }),
  });
}

/** Admin only (manager / users pickers). */
export function usePeopleOptions(enabled: boolean) {
  return useQuery({
    queryKey: opsKeys.peopleOptions,
    queryFn: ({ signal }) => api<PersonOption[]>('/api/plants/people-options', { signal }),
    enabled,
    staleTime: 60_000,
  });
}

export function useAudits(f: Params, page: number) {
  return useQuery({
    queryKey: opsKeys.audits(f, page),
    queryFn: ({ signal }) =>
      api<AuditPage>(`/api/audits${queryString({ ...f, page, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useAudit(id: string | null) {
  return useQuery({
    queryKey: opsKeys.audit(id ?? ''),
    queryFn: ({ signal }) => api<AuditDetail>(`/api/audits/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

export function useLicences(f: Params, page: number) {
  return useQuery({
    queryKey: opsKeys.licences(f, page),
    queryFn: ({ signal }) =>
      api<LicencePage>(`/api/licences${queryString({ ...f, page, pageSize: 50 })}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export function useLicence(id: string | null) {
  return useQuery({
    queryKey: opsKeys.licence(id ?? ''),
    queryFn: ({ signal }) => api<LicenceDetail>(`/api/licences/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

export function useLicenceItems() {
  return useQuery({
    queryKey: opsKeys.licenceItems,
    queryFn: ({ signal }) => api<LicenceItemOption[]>('/api/licences/items', { signal }),
    staleTime: 300_000,
  });
}

export function useRemindOptions(plantId: string) {
  return useQuery({
    queryKey: opsKeys.remindOptions(plantId),
    queryFn: ({ signal }) =>
      api<PersonOption[]>(`/api/licences/remind-options${queryString({ plantId })}`, { signal }),
    enabled: plantId !== '',
  });
}

export function useReviewCheck(f: Params) {
  return useQuery({
    queryKey: opsKeys.reviewCheck(f),
    queryFn: ({ signal }) => api<ReviewCheckPage>(`/api/review-check${queryString(f)}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

export interface MonthlyMisFilters {
  plantId?: string | undefined;
  month?: string | undefined;
  status?: ReportStatus | undefined;
}

export const monthlyKeys = {
  all: ['monthly-mis'] as const,
  list: (f: MonthlyMisFilters, page: number) => ['monthly-mis', 'list', f, page] as const,
  row: (id: string) => ['monthly-mis', 'row', id] as const,
  summary: (plantId: string, month: string) => ['monthly-mis', 'summary', plantId, month] as const,
};

export function useMonthlyMisList(f: MonthlyMisFilters, page: number) {
  return useQuery({
    queryKey: monthlyKeys.list(f, page),
    queryFn: ({ signal }) =>
      api<MonthlyMisPage>(`/api/monthly-mis${queryString({ ...f, page, pageSize: 50 })}`, {
        signal,
      }),
    placeholderData: keepPreviousData,
  });
}

export function useMonthlyMis(id: string | null) {
  return useQuery({
    queryKey: monthlyKeys.row(id ?? ''),
    queryFn: ({ signal }) => api<MonthlyMisDetail>(`/api/monthly-mis/${id ?? ''}`, { signal }),
    enabled: id !== null,
  });
}

/** Live Section A for a plant + month (new form, before the first save). */
export function useMonthlySummary(plantId: string, month: string, enabled: boolean) {
  return useQuery({
    queryKey: monthlyKeys.summary(plantId, month),
    queryFn: ({ signal }) =>
      api<MonthlySummaryView>(`/api/monthly-mis/summary${queryString({ plantId, month })}`, {
        signal,
      }),
    enabled: enabled && plantId !== '' && month !== '',
  });
}

export function useDailyMisRevision(id: string, version: number | null) {
  return useQuery({
    queryKey: dailyKeys.revision(id, version ?? 0),
    queryFn: ({ signal }) =>
      api<DailyMisRevision>(`/api/daily-mis/${id}/revisions/${String(version ?? 0)}`, { signal }),
    enabled: version !== null,
  });
}

export function useImportStatus() {
  return useQuery({
    queryKey: keys.importStatus,
    queryFn: ({ signal }) => api<ImportStatus>('/api/people/import/status', { signal }),
  });
}
