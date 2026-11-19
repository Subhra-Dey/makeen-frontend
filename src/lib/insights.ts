'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
  Comparison,
  DashboardModule,
  DashboardView,
  GraphsView,
  PerformanceRange,
  PlantPerformance,
  ReviewPack,
  SearchHit,
} from '@/shared';
import { api } from './api/client';
import { queryString } from './queries';

/** Dashboard search (BTN-D1…D3): Module → Plant → Date or Month. */
export interface DashboardFilters {
  module: DashboardModule;
  plantId?: string | undefined;
  date?: string | undefined;
  month?: string | undefined;
}

export interface ReviewFilters {
  plantId?: string | undefined;
  date?: string | undefined;
  month?: string | undefined;
}

export interface ComparisonFilters {
  mode: 'PLANTS' | 'DATES';
  date?: string | undefined;
  plantId?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export const insightKeys = {
  dashboard: (f: DashboardFilters) => ['dashboard', f] as const,
  performance: (range: PerformanceRange, plantId: string | undefined) =>
    ['dashboard', 'performance', range, plantId] as const,
  review: (f: ReviewFilters) => ['management-review', f] as const,
  comparison: (f: ComparisonFilters) => ['management-review', 'comparison', f] as const,
  graphs: (plantId: string, month: string | undefined) => ['graphs', plantId, month] as const,
  search: (q: string) => ['search', q] as const,
};

export function useDashboard(f: DashboardFilters, enabled = true) {
  return useQuery({
    queryKey: insightKeys.dashboard(f),
    queryFn: () => api<DashboardView>(`/api/dashboard${queryString({ ...f })}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function usePerformance(range: PerformanceRange, plantId: string | undefined) {
  return useQuery({
    queryKey: insightKeys.performance(range, plantId),
    queryFn: () =>
      api<PlantPerformance>(`/api/dashboard/performance${queryString({ range, plantId })}`),
    placeholderData: keepPreviousData,
  });
}

export function useReviewPack(f: ReviewFilters) {
  return useQuery({
    queryKey: insightKeys.review(f),
    queryFn: () => api<ReviewPack>(`/api/management-review${queryString({ ...f })}`),
    placeholderData: keepPreviousData,
  });
}

export function useComparison(f: ComparisonFilters, enabled: boolean) {
  return useQuery({
    queryKey: insightKeys.comparison(f),
    queryFn: () => api<Comparison>(`/api/management-review/comparison${queryString({ ...f })}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useGraphs(plantId: string, month: string | undefined) {
  return useQuery({
    queryKey: insightKeys.graphs(plantId, month),
    queryFn: () => api<GraphsView>(`/api/graphs${queryString({ plantId, month })}`),
    placeholderData: keepPreviousData,
    enabled: plantId !== '',
  });
}

/** Command palette: searched once at least 2 characters are typed. */
export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: insightKeys.search(term),
    queryFn: () => api<SearchHit[]>(`/api/search${queryString({ q: term })}`),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });
}
