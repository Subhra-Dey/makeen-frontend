'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/shared';
import { Button, Spinner } from '../ui/button';
import { EmptyState } from '../ui/panel';

declare module '@tanstack/react-table' {
  // Column options our tables understand (TanStack's documented extension point).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Right-aligned tabular numbers. */
    numeric?: boolean;
    /** Allow wrapping (long text). */
    wrap?: boolean;
  }
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  rows: readonly T[];
  getRowId: (row: T) => string;
  /** Status row tint (e.g. `bg-pending-row`). */
  rowClass?: (row: T) => string | undefined;
  loading?: boolean;
  caption: string;
  /** Totals row, one cell per column (the same totals the download prints). */
  footer?: readonly ReactNode[];
}

/**
 * Table in the mockup style (`table.t`): sticky-feel header, 12/16 padding, status row tints,
 * “No rows” under the headers when empty. Data paging/sorting is server-side (the same query
 * object drives the export — CLAUDE.md conventions), so the table itself only renders.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  rowClass,
  loading,
  caption,
  footer,
}: DataTableProps<T>) {
  // TanStack Table returns fresh functions each render; the React Compiler is not enabled here.
  // eslint-disable-next-line react-hooks/incompatible-library -- documented TanStack/Compiler caveat
  const table = useReactTable({
    data: rows as T[],
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });
  const colCount = table.getAllLeafColumns().length;
  return (
    // A focusable region, so keyboard users can scroll a wide table even when no cell is focusable.
    <div
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-teal-ink"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table
        className="w-full border-separate border-spacing-0 text-[13.5px]"
        aria-busy={loading || undefined}
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const meta = h.column.columnDef.meta;
                return (
                  <th
                    key={h.id}
                    scope="col"
                    className={cn(
                      'border-b border-line bg-table-head px-4 py-3 text-left text-[12.5px] font-semibold whitespace-nowrap text-[#3E5266]',
                      meta?.numeric && 'text-right',
                    )}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-5 py-10 text-center text-muted">
                <Spinner className="mr-2 align-[-3px]" />
                Loading…
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="p-0">
                <EmptyState />
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((r) => (
              <tr key={r.id} className={cn('[&:last-child>td]:border-b-0', rowClass?.(r.original))}>
                {r.getVisibleCells().map((c) => {
                  const meta = c.column.columnDef.meta;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        'border-b border-[#EEF2F6] px-4 py-3 align-middle',
                        meta?.wrap ? 'whitespace-normal' : 'whitespace-nowrap',
                        meta?.numeric && 'text-right num',
                      )}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        {footer && rows.length > 0 && (
          <tfoot>
            <tr className="bg-[#EAF6F6]">
              {table.getAllLeafColumns().map((col, i) => (
                <td
                  key={col.id}
                  className={cn(
                    'border-t border-[#BFE3E3] px-4 py-3 font-bold whitespace-nowrap text-[#0C6E72]',
                    col.columnDef.meta?.numeric && 'text-right num',
                  )}
                >
                  {footer[i]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/** “1–50 of 412” with previous / next (server-side paging). */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const last = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-[13px] text-muted">
      <span className="num">
        {formatNumber(from, 0)}–{formatNumber(to, 0)} of {formatNumber(total, 0)}
      </span>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPage(page - 1);
          }}
          icon={<ChevronLeft aria-hidden="true" className="size-4" />}
        >
          Previous
        </Button>
        <Button
          size="sm"
          disabled={page >= last}
          onClick={() => {
            onPage(page + 1);
          }}
        >
          Next
          <ChevronRight aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </div>
  );
}
