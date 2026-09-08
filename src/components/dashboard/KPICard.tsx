import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: LucideIcon;
  gradient?: string;
  textColor?: string;
  borderColor?: string;
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  gradient = 'from-slate-900 via-slate-850 to-slate-900',
  textColor = 'text-white',
  borderColor = 'border-slate-800',
}: KPICardProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 border ${borderColor} shadow-xl hover:shadow-2xl transition-all duration-300 group`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <h3 className={`text-3xl font-extrabold tracking-tight mt-1.5 ${textColor}`}>
            {value}
          </h3>
          {description && (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Decorative accent background line */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
    </div>
  );
}
