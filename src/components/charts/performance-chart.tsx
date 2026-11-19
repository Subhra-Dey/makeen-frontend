'use client';

import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { Segmented } from '@/components/ui/segmented';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { usePerformance } from '@/lib/insights';
import { PERFORMANCE_RANGES, formatDate, formatNumber, type PerformanceRange } from '@/shared';
import { AXIS, GRID, Legend, NumbersTable, TipBox, seriesColor, showNumber } from './chart-kit';

/** Recharts tooltip props (names are strings or numbers). */
type TipProps = TooltipContentProps<TooltipValueType, string | number>;
const SERIES = [
  { key: 'achieved', label: 'Bottling achieved (MT)' },
  { key: 'target', label: 'Projected bottling (MT)' },
] as const;

/**
 * Plant Performance (DASH-10, D-124): bottling achieved (Approved Daily MIS 11 + 13) against the
 * plant master's projected bottling, for the plants and Daily MIS access of this login.
 */
export function PerformanceChart({ plantId }: { plantId: string | undefined }) {
  const [range, setRange] = useState<PerformanceRange>('30D');
  const q = usePerformance(range, plantId);
  const p = q.data;
  const data = (p?.points ?? []).map((pt) => ({
    label: pt.label,
    achieved: Number(pt.achieved),
    target: Number(pt.target),
    text: pt,
  }));
  return (
    <Panel className="min-w-0">
      <PanelHeader
        title="Plant Performance"
        sub="Bottling achieved vs projected bottling · from Approved Daily MIS"
        actions={
          <div className="flex flex-wrap items-center gap-3.5">
            <Segmented
              label="Period"
              options={PERFORMANCE_RANGES.map((r) => ({ value: r, label: r }))}
              value={range}
              onChange={setRange}
            />
            <Legend series={SERIES} />
          </div>
        }
      />
      <div className="px-4 pt-3 pb-3" aria-busy={q.isFetching || undefined}>
        <div
          role="img"
          aria-label={`Plant Performance, ${range}: bottling achieved ${showNumber(p?.totals.achieved)} MT against projected ${showNumber(p?.totals.target)} MT.`}
        >
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
              accessibilityLayer={false}
            >
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: AXIS.stroke }}
                tick={AXIS.tick}
                minTickGap={16}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={AXIS.tick}
                width={64}
                tickFormatter={(v: number) => formatNumber(v, 0)}
              />
              <Tooltip
                cursor={{ stroke: '#9FB1C2' }}
                content={({ active, payload }: TipProps) => {
                  const row = payload[0]?.payload as (typeof data)[number] | undefined;
                  if (!active || !row) return null;
                  const t = row.text;
                  return (
                    <TipBox
                      title={
                        t.from === t.to
                          ? formatDate(t.from)
                          : `${formatDate(t.from)} to ${formatDate(t.to)}`
                      }
                      items={SERIES.map((s, i) => ({
                        label: s.label,
                        value: showNumber(t[s.key]),
                        color: seriesColor(i),
                      }))}
                    />
                  );
                }}
              />
              {SERIES.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={seriesColor(i)}
                  strokeWidth={2}
                  strokeDasharray={s.key === 'target' ? '6 4' : undefined}
                  dot={range === '7D' ? { r: 4, strokeWidth: 2, fill: '#fff' } : false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="m-0 mt-1.5 text-[12.5px] text-muted num">
          Total {range}: achieved {showNumber(p?.totals.achieved)} MT · projected{' '}
          {showNumber(p?.totals.target)} MT
        </p>
      </div>
      <details className="border-t border-line">
        <summary className="cursor-pointer px-5 py-3 text-[13px] font-semibold text-teal-ink">
          Show the numbers
        </summary>
        <NumbersTable
          caption="Plant Performance — numbers"
          columns={['Period', ...SERIES.map((s) => s.label)]}
          rows={(p?.points ?? []).map((pt) => [
            pt.from === pt.to
              ? formatDate(pt.from)
              : `${formatDate(pt.from)} to ${formatDate(pt.to)}`,
            pt.achieved,
            pt.target,
          ])}
        />
      </details>
    </Panel>
  );
}
