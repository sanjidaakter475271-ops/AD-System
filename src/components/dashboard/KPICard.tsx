import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  gradient?: string;
  textColor?: string;
  borderColor?: string;
  progress?: number; // 0 to 100 optional progress percentage
  progressColor?: string;
  badge?: string;
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  gradient = 'from-slate-900/90 via-slate-900/60 to-slate-950/90',
  textColor = 'text-white',
  borderColor = 'border-slate-800/80',
  progress,
  progressColor = 'bg-sky-500',
  badge,
}: KPICardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 border ${borderColor} backdrop-blur-md shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between`}
    >
      {/* Background ambient glow - Added animation on hover */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 group-hover:scale-110 transition-all duration-500" />

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          {badge && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              {badge}
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <h3 className={`text-3xl font-black tracking-tight ${textColor} drop-shadow-sm group-hover:tracking-wider transition-all duration-300`}>
            {value}
          </h3>
          {Icon && (
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 shadow-inner">
              <Icon className="w-5 h-5 group-hover:rotate-3 transition-transform duration-300" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-2 border-t border-white/5">
        {progress !== undefined && (
          <div className="mb-2">
            <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400 mb-1">
              <span>Ratio</span>
              <span>{Math.min(100, Math.max(0, progress))}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full ${progressColor} transition-all duration-700 shadow-sm group-hover:scale-x-105 origin-left`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          </div>
        )}

        {description && (
          <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center justify-between group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

