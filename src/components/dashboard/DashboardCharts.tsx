'use me';
// SVG based light custom interactive chart components to avoid extra heavy bundles
'use client';

import React from 'react';

interface DonutChartProps {
  data: { name: string; value: number; color: string }[];
  total: number;
}

export function ADComplianceChart({ data, total }: DonutChartProps) {
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  const slices = data.map((slice) => {
    const percent = total > 0 ? slice.value / total : 0;
    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
    cumulativePercent += percent;
    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = total > 0 && percent > 0
      ? percent >= 0.999
        ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0`
        : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`
      : '';

    return {
      ...slice,
      percent: Math.round(percent * 100),
      pathData,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="-1.15 -1.15 2.3 2.3" className="w-full h-full -rotate-90">
          {slices.map((slice, i) => (
            slice.pathData ? (
              <path
                key={i}
                d={slice.pathData}
                fill="none"
                stroke={slice.color}
                strokeWidth="0.32"
                className="transition-all duration-500 hover:opacity-80 cursor-pointer"
              />
            ) : null
          ))}
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-2xl font-black text-white">{total}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total AD</span>
        </div>
      </div>

      <div className="flex-1 space-y-2.5 w-full">
        {data.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">{item.value}</span>
                <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { name: string; count: number }[];
  total: number;
}

export function BaseUnitChart({ data, total }: BarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-xs text-slate-500 italic p-4 text-center">No distribution data available.</div>;
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="space-y-3 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80">
      {data.slice(0, 5).map((item) => {
        const percent = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.name} className="space-y-1 group cursor-default">
            <div className="flex justify-between text-xs transition-colors group-hover:text-sky-300">
              <span className="font-medium text-slate-200">{item.name}</span>
              <span className="font-bold text-sky-400">{item.count} units</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 group-hover:scale-x-105"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
