import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ label = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-9 h-9 border-3',
    lg: 'w-14 h-14 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className="relative">
        {/* Outer glowing aura */}
        <div className={`${sizeClasses[size]} rounded-full border-sky-500/20 border-t-sky-400 border-r-indigo-500 animate-spin shadow-lg shadow-sky-500/20`} />
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 m-auto w-2 h-2 bg-indigo-400 rounded-full animate-ping" />
      </div>
      {label && (
        <span className="text-xs font-semibold text-slate-400 tracking-wide animate-pulse">
          {label}
        </span>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2 p-4 animate-pulse">
      <div className="h-8 bg-slate-800/80 rounded-xl w-full mb-3" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 py-2 border-b border-slate-800/50">
          {Array.from({ length: cols }).map((_, c) => {
            // Deterministic width calculation to prevent SSR hydration mismatch (avoiding Math.random())
            const widthPct = ((r + c * 7) % 5) * 8 + 60;
            return (
              <div
                key={c}
                className="h-4 bg-slate-800/60 rounded-lg"
                style={{ width: `${widthPct}%` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
