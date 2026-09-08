'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Building2, 
  Monitor, 
  Cpu,
  Layers
} from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';

export default function AnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAnalysis() {
      try {
        const res = await fetch('/api/analysis');
        if (!res.ok) throw new Error('Failed to fetch analysis data');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
        Generating inventory analytical insights...
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-center text-rose-400 font-semibold">{error || 'Failed to load analysis'}</div>;
  }

  const win10Pct = data.total > 0 ? Math.round((data.win10.eligible / data.total) * 100) : 0;
  const win11Pct = data.total > 0 ? Math.round((data.win11.eligible / data.total) * 100) : 0;

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-400" />
            Inventory Analytics & OS Readiness Report
          </h1>
          <p className="text-sm text-slate-400">Comprehensive hardware & operating system compatibility evaluation</p>
        </div>
      </div>

      {/* OS Eligibility Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Windows 10 Card */}
        <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Windows 10 Compatibility</h3>
                <p className="text-xs text-slate-400">6th Gen i3/i5/i7 or 8GB+ RAM threshold</p>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-emerald-400">{win10Pct}%</span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${win10Pct}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-300 font-medium pt-1">
              <span>Eligible: <strong className="text-emerald-400">{data.win10.eligible} items</strong></span>
              <span>Ineligible: <strong className="text-rose-400">{data.win10.ineligible} items</strong></span>
            </div>
          </div>
        </div>

        {/* Windows 11 Card */}
        <div className="bg-slate-900/90 border border-blue-800/40 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Windows 11 Compatibility</h3>
                <p className="text-xs text-slate-400">8th Gen+ Intel/AMD, 8GB+ RAM, 64GB+ Storage</p>
              </div>
            </div>
            <span className="text-2xl font-extrabold text-blue-400">{win11Pct}%</span>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${win11Pct}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-300 font-medium pt-1">
              <span>Eligible: <strong className="text-blue-400">{data.win11.eligible} items</strong></span>
              <span>Ineligible: <strong className="text-rose-400">{data.win11.ineligible} items</strong></span>
            </div>
          </div>
        </div>

      </div>

      {/* Processor & Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Processor Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Cpu className="w-5 h-5 text-indigo-400" />
            Processor Architecture Distribution
          </h3>

          <div className="space-y-3">
            {data.processorCounts?.map((p: any) => {
              const count = p._count._all;
              const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
              return (
                <div key={p.processor || 'Unknown'} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{p.processor || 'Unknown Processor'}</span>
                    <span className="text-indigo-400 font-bold">{count} units ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Status Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Layers className="w-5 h-5 text-emerald-400" />
            Operational Status Summary
          </h3>

          <div className="space-y-3">
            {data.statusCounts?.map((s: any) => {
              const count = s._count._all;
              const statusName = s.status;
              const isSvc = statusName === 'Svc';
              return (
                <div key={statusName} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {statusName} ({isSvc ? 'Serviceable' : 'Unserviceable / Repair'})
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    isSvc 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {count} assets
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
