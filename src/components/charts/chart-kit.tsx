'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/data/data-table';
import { formatNumber } from '@/shared';

/**
 * Categorical chart colours, in fixed order (never cycled, D-128). Brand teal first, then blue,
 * orange and purple: the four pass the dataviz checks on white (lightness band, chroma floor,
 * colour-blind separation ΔE ≥ 15, 3:1 against the surface). A chart never has more than four.
 */
export const SERIES_COLORS = ['#1B9AA0', '#2E64A8', '#D9691C', '#8A5FB0'] as const;

export const AXIS = { stroke: '#D5DEE6', tick: { fill: '#5B6B7C', fontSize: 11.5 } } as const;
export const GRID = '#E6EDF2';

export function seriesColor(i: number): string {
  return SERIES_COLORS[i] ?? SERIES_COLORS[SERIES_COLORS.length - 1] ?? '#1B9AA0';
}

/** A fixed-decimal string shown with its own decimals in en-IN grouping. */
export function showNumber(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return formatNumber(s, (s.split('.')[1] ?? '').length);
}

/** Legend for ≥ 2 series: identity is never colour alone (swatch + text in ink colour). */
export function Legend({ series }: { series: readonly { key: string; label: string }[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[12.5px] text-[#3E5266]">
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-[3px]"
            style={{ background: seriesColor(i) }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/** The chart's numbers as a table (GR-0): the same values, already fixed-decimal strings. */
export function NumbersTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly (string | null)[])[];
}) {
  const defs: ColumnDef<readonly (string | null)[]>[] = columns.map((h, i) => ({
    id: `c${String(i)}`,
    header: h,
    meta: { numeric: i > 0 },
    cell: ({ row }) => {
      const v = row.original[i] ?? null;
      return i === 0 ? <span className="num">{v ?? '—'}</span> : showNumber(v);
    },
  }));
  return <DataTable caption={caption} columns={defs} rows={rows} getRowId={(r) => r[0] ?? ''} />;
}

/** Tooltip box in the portal style (Recharts content renderer). */
export function TipBox({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; value: string; color: string }[];
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-3 py-2 text-[12.5px] shadow-card">
      <b className="block text-navy">{title}</b>
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[#3E5266]">
          <span
            aria-hidden="true"
            className="inline-block size-2 rounded-full"
            style={{ background: it.color }}
          />
          {it.label}: <b className="text-navy num">{it.value}</b>
        </span>
      ))}
    </div>
  );
}
