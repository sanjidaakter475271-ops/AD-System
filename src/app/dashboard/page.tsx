import { prisma } from '@/lib/prisma';
import { KPICard } from '@/components/dashboard/KPICard';
import { 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Building2, 
  Laptop, 
  Plus, 
  FileSpreadsheet, 
  ArrowRight,
  ShieldCheck,
  Server
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function DashboardPage() {
  let stats = {
    total: 0,
    svc: 0,
    unsvc: 0,
    adJoined: 0,
    adNotJoined: 0,
    adPending: 0,
    totalNewPc: 0,
    newPcIssued: 0,
    newPcAdJoined: 0,
    win10: 0,
    win11: 0,
    win11Rec: 0,
    byType: [] as { name: string; count: number }[],
    byBaseUnit: [] as { name: string; count: number }[],
    byDirectorate: [] as { name: string; count: number }[],
    recentEquipment: [] as any[],
  };

  try {
    const res = await fetch('http://localhost:3000/api/dashboard', { cache: 'no-store' }).catch(() => null);
    if (res && res.ok) {
      stats = await res.json();
    } else {
      const total = await prisma.equipment.count();
      const svc = await prisma.equipment.count({ where: { status: 'Svc' } });
      const unsvc = await prisma.equipment.count({ where: { status: { in: ['U/S', 'Unsvc'] } } });
      const adJoined = await prisma.equipment.count({ where: { adStatus: 'Joined' } });
      const adNotJoined = await prisma.equipment.count({ where: { adStatus: 'Not Joined' } });
      const adPending = await prisma.equipment.count({ where: { adStatus: 'Pending' } });

      const totalNewPc = await prisma.equipment.count({ where: { isNewPc: true } });
      const newPcIssued = await prisma.equipment.count({ where: { isNewPc: true, issueStatus: 'Issued' } });
      const newPcAdJoined = await prisma.equipment.count({ where: { isNewPc: true, adStatus: 'Joined' } });

      const win10 = await prisma.equipment.count({ where: { win10Eligible: 'Eligible' } });
      const win11Rec = await prisma.equipment.count({ where: { win11Eligible: 'Recommended for Win 11' } });
      const win11Eligible = await prisma.equipment.count({ 
        where: { 
          OR: [
            { win11Eligible: 'Eligible' },
            { win11Eligible: 'Recommended for Win 11' }
          ]
        } 
      });

      const byTypeRaw = await prisma.equipment.groupBy({
        by: ['equipmentType'],
        _count: { id: true }
      });
      const byType = byTypeRaw.map(item => ({ name: item.equipmentType, count: item._count.id }));

      const byBaseUnitRaw = await prisma.equipment.groupBy({
        by: ['baseUnit'],
        _count: { id: true }
      });
      const byBaseUnit = byBaseUnitRaw.map(item => ({ name: item.baseUnit || 'Air HQ', count: item._count.id }));

      const byDirectorateRaw = await prisma.equipment.groupBy({
        by: ['directorate'],
        _count: { id: true }
      });
      const byDirectorate = byDirectorateRaw.map(item => ({ name: item.directorate, count: item._count.id }));

      const recentEquipment = await prisma.equipment.findMany({
        take: 6,
        orderBy: { updatedAt: 'desc' }
      });

      stats = { 
        total, svc, unsvc, 
        adJoined, adNotJoined, adPending,
        totalNewPc, newPcIssued, newPcAdJoined,
        win10, win11: win11Eligible, win11Rec, 
        byType, byBaseUnit, byDirectorate, recentEquipment 
      };
    }
  } catch (error) {
    console.error('Dashboard Data Fetch Error:', error);
  }

  const svcPercentage = stats.total > 0 ? Math.round((stats.svc / stats.total) * 100) : 0;
  const adJoinedPct = stats.total > 0 ? Math.round((stats.adJoined / stats.total) * 100) : 0;

  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-8 border border-indigo-800/40 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Active Directory & Inventory Dashboard
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Base / Unit & AD System Overview
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Monitor real-time equipment Active Directory status, new PC issuance, Windows 11 recommendation (SSD + 8th Gen+ HDD), and multi-unit directory distribution.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link
              href="/equipment/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Equipment
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all"
            >
              Search & Filter
            </Link>
          </div>
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
          <Server className="w-64 h-64 text-sky-400" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Total Equipment"
          value={stats.total}
          description="Across all Base/Units & Directorates"
          icon={Monitor}
          gradient="from-slate-900 to-indigo-950"
          borderColor="border-indigo-800/60"
          textColor="text-sky-400"
        />

        <KPICard
          title="AD Joined PCs"
          value={stats.adJoined}
          description={`${adJoinedPct}% Active Directory Compliance`}
          icon={ShieldCheck}
          gradient="from-slate-900 to-emerald-950"
          borderColor="border-emerald-800/60"
          textColor="text-emerald-400"
        />

        <KPICard
          title="New PCs Issued"
          value={stats.totalNewPc}
          description={`${stats.newPcAdJoined} Joined Active Directory`}
          icon={Laptop}
          gradient="from-slate-900 to-blue-950"
          borderColor="border-blue-800/60"
          textColor="text-blue-400"
        />

        <KPICard
          title="Recommended for Win 11"
          value={stats.win11Rec}
          description="SSD + Gen 8th+ & HDD Modern Spec"
          icon={Sparkles}
          gradient="from-slate-900 to-purple-950"
          borderColor="border-purple-800/60"
          textColor="text-purple-400"
        />
      </div>

      {/* Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Equipment by Directorate */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" />
              Directorate Breakdown
            </h2>
            <Link href="/equipment" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats.byDirectorate.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No equipment data available.</p>
            ) : (
              stats.byDirectorate.map((item) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-sky-400 font-bold">{item.count} items ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Equipment Types */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Laptop className="w-5 h-5 text-purple-400" />
            Active Directory Status Summary
          </h2>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">AD Joined</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                {stats.adJoined} units
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300">AD Not Joined</span>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                {stats.adNotJoined} units
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">AD Pending Verification</span>
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                {stats.adPending} units
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
