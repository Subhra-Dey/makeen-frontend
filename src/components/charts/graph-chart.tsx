'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from 'recharts';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { formatNumber, type GraphChart } from '@/shared';
import { AXIS, GRID, Legend, NumbersTable, TipBox, seriesColor, showNumber } from './chart-kit';

type Series = GraphChart['series'][number];
type Datum = Record<string, string | number | null>;

/** Recharts tooltip props (names are strings or numbers). */
type TipProps = TooltipContentProps<TooltipValueType, string | number>;
const HEIGHT = 240;

/** Draw values (display only — every stored and summed value stays a decimal string). */
function toData(chart: GraphChart): Datum[] {
  return chart.points.map((p) => {
    const d: Datum = { label: p.label };
    for (const s of chart.series) {
      const v = p.values[s.key] ?? null;
      d[s.key] = v === null ? null : Number(v);
      d[`${s.key}__text`] = v;
    }
    return d;
  });
}

function tick(v: number, percent: boolean): string {
  if (percent) return `${String(Math.round(v * 100))}%`;
  const abs = Math.abs(v);
  return formatNumber(v, abs !== 0 && abs < 10 && !Number.isInteger(v) ? 2 : 0);
}

/** Hover tooltip: every series of the panel at that point; colours follow the chart's order. */
function Tip({ chart, ...p }: TipProps & { chart: GraphChart; series: readonly Series[] }) {
  if (!p.active || p.payload.length === 0) return null;
  const row = p.payload[0]?.payload as Datum | undefined;
  return (
    <TipBox
      title={String(p.label)}
      items={p.series.map((s) => ({
        label: s.label,
        value: showNumber((row?.[`${s.key}__text`] as string | null | undefined) ?? null),
        color: seriesColor(chart.series.indexOf(s)),
      }))}
    />
  );
}

/** One plot (all series with one scale). */
function Plot({
  chart,
  series,
  data,
}: {
  chart: GraphChart;
  series: readonly Series[];
  data: Datum[];
}) {
  const percent = chart.kind === 'stacked100';
  // Colour follows the series (its place in the chart), never its panel or rank.
  const colorOf = (s: Series): string => seriesColor(chart.series.indexOf(s));
  const common = (
    <>
      <CartesianGrid vertical={false} stroke={GRID} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={{ stroke: AXIS.stroke }}
        tick={AXIS.tick}
        minTickGap={12}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        tick={AXIS.tick}
        width={56}
        tickFormatter={(v: number) => tick(v, percent)}
      />
      <Tooltip
        cursor={{ fill: 'rgba(13,43,69,0.05)', stroke: '#9FB1C2' }}
        content={(p: TipProps) => <Tip {...p} chart={chart} series={series} />}
      />
    </>
  );
  if (chart.kind === 'line') {
    return (
      <ResponsiveContainer width="100%" height={HEIGHT}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          accessibilityLayer={false}
        >
          {common}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorOf(s)}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }
  const stacked = chart.kind === 'stacked' || chart.kind === 'stacked100';
  return (
    <ResponsiveContainer width="100%" height={HEIGHT}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
        stackOffset={percent ? 'expand' : 'none'}
        barGap={2}
        accessibilityLayer={false}
      >
        {common}
        <ReferenceLine y={0} stroke="#9FB1C2" />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={colorOf(s)}
            stackId={stacked ? 'stack' : undefined}
            // Rounded data-end only on the top segment; a 2 px surface gap between fills.
            radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0}
            stroke="#fff"
            strokeWidth={stacked ? 2 : 0}
            maxBarSize={28}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * One Graphs chart (GR-1…GR-8) with the same numbers as a small table under it (GR-0).
 * Series with their own unit are drawn as separate small panels — never a second y-axis.
 */
export function GraphChartPanel({ chart }: { chart: GraphChart }) {
  const data = toData(chart);
  const empty = chart.points.every((p) => Object.values(p.values).every((v) => v === null));
  const groups: Series[][] = chart.series.some((s) => s.unit)
    ? chart.series.map((s) => [s])
    : [chart.series];
  return (
    <Panel className="min-w-0">
      <PanelHeader
        title={`${String(chart.id)}. ${chart.title}`}
        sub={`${chart.source} · ${chart.unit}`}
        actions={<Legend series={chart.series} />}
      />
      <div className="px-4 pt-3 pb-2">
        {empty ? (
          <p className="m-0 py-8 text-center text-[13px] text-muted">
            No Approved figures saved for this period.
          </p>
        ) : (
          <div
            role="img"
            aria-label={`${chart.title} chart. The table below lists the same numbers.`}
            className={groups.length > 1 ? 'grid gap-3 min-[900px]:grid-cols-2' : undefined}
          >
            {groups.map((g) => (
              <figure key={g.map((s) => s.key).join('-')} className="m-0 min-w-0">
                {groups.length > 1 && (
                  <figcaption className="px-1 pb-1 text-[12.5px] font-semibold text-[#3E5266]">
                    {g[0]?.label}
                  </figcaption>
                )}
                <Plot chart={chart} series={g} data={data} />
              </figure>
            ))}
          </div>
        )}
        {chart.note && <p className="m-0 mt-2 text-[12.5px] text-muted">{chart.note}</p>}
      </div>
      {/* A month of days is a long table: it scrolls inside the panel (the region is focusable). */}
      <div className="max-h-[330px] overflow-y-auto">
        <NumbersTable
          caption={`${chart.title} — numbers`}
          columns={chart.table.columns}
          rows={chart.table.rows}
        />
      </div>
    </Panel>
  );
}
