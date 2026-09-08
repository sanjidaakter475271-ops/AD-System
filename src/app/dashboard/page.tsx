import { prisma } from '@/lib/prisma';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  Monitor,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Building2,
  Laptop,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Server,
  ArrowLeftRight,
  PackageMinus,
  Cpu,
  ClipboardList,
  Repeat2,
  PackageOpen,
  Clock,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function DashboardPage() {
  let stats: any = {
    total: 0, svc: 0, unsvc: 0, repair: 0, rs: 0,
    adJoined: 0, adNotJoined: 0, adPending: 0,
    totalNewPc: 0, newPcIssued: 0, newPcAdJoined: 0, newPcAdNotJoined: 0,
    win10: 0, win10NotEligible: 0, win11: 0, win11Rec: 0,
    totalIssued: 0, totalReplacement: 0, totalWithoutReplacement: 0,
    totalWithdrawals: 0,
    totalUpgradation: 0, upgraded: 0, distributed: 0, pendingUpgrade: 0,
    recentIssues: [],
    byType: [], byBaseUnit: [], byDirectorate: [], withdrawalsByBase: [],
    recentEquipment: [],
  };

  try {
    const res = await fetch('http://localhost:3000/api/dashboard', { cache: 'no-store' }).catch(() => null);
    if (res && res.ok) {
      stats = await res.json();
    } else {
      // Fallback: direct DB queries
      const [
        total, svc, unsvc, repair, rs,
        adJoined, adNotJoined, adPending,
        totalNewPc, newPcIssued, newPcAdJoined, newPcAdNotJoined,
        win10, win10NotEligible, win11Rec,
        totalIssued, totalReplacement, totalWithoutReplacement,
        totalWithdrawals,
        totalUpgradation, upgraded, distributed, pendingUpgrade,
        recentIssues, byTypeRaw, byBaseUnitRaw, byDirectorateRaw, recentEquipment,
        win11Eligible,
      ] = await Promise.all([
        prisma.equipment.count(),
        prisma.equipment.count({ where: { status: 'Svc' } }),
        prisma.equipment.count({ where: { status: 'U/S' } }),
        prisma.equipment.count({ where: { status: 'Repair' } }),
        prisma.equipment.count({ where: { status: 'R/S' } }),
        prisma.equipment.count({ where: { adStatus: 'Joined' } }),
        prisma.equipment.count({ where: { adStatus: 'Not Joined' } }),
        prisma.equipment.count({ where: { adStatus: 'Pending' } }),
        prisma.equipment.count({ where: { isNewPc: true } }),
        prisma.equipment.count({ where: { isNewPc: true, issueStatus: 'Issued' } }),
        prisma.equipment.count({ where: { isNewPc: true, adStatus: 'Joined' } }),
        prisma.equipment.count({ where: { isNewPc: true, adStatus: 'Not Joined' } }),
        prisma.equipment.count({ where: { win10Eligible: 'Eligible' } }),
        prisma.equipment.count({ where: { win10Eligible: 'Not Eligible' } }),
        prisma.equipment.count({ where: { win11Eligible: 'Recommended for Win 11' } }),
        prisma.issueRecord.count(),
        prisma.issueRecord.count({ where: { isReplacement: true } }),
        prisma.issueRecord.count({ where: { isReplacement: false } }),
        prisma.withdrawalRecord.count(),
        prisma.upgradationRecord.count(),
        prisma.upgradationRecord.count({ where: { isUpgraded: true } }),
        prisma.upgradationRecord.count({ where: { isDistributed: true } }),
        prisma.upgradationRecord.count({ where: { isUpgraded: false } }),
        prisma.issueRecord.findMany({
          take: 5, orderBy: { issuedAt: 'desc' },
          include: {
            equipment: { select: { sn: true, equipmentType: true, brandModel: true } },
            replacedEquipment: { select: { sn: true } },
          },
        }),
        prisma.equipment.groupBy({ by: ['equipmentType'], _count: { id: true } }),
        prisma.equipment.groupBy({ by: ['baseUnit'], _count: { id: true } }),
        prisma.equipment.groupBy({ by: ['directorate'], _count: { id: true } }),
        prisma.equipment.findMany({ take: 6, orderBy: { updatedAt: 'desc' } }),
        prisma.equipment.count({ where: { OR: [{ win11Eligible: 'Eligible' }, { win11Eligible: 'Recommended for Win 11' }] } }),
      ]);

      stats = {
        total, svc, unsvc, repair, rs,
        adJoined, adNotJoined, adPending,
        totalNewPc, newPcIssued, newPcAdJoined, newPcAdNotJoined,
        win10, win10NotEligible, win11: win11Eligible, win11Rec,
        totalIssued, totalReplacement, totalWithoutReplacement,
        totalWithdrawals,
        totalUpgradation, upgraded, distributed, pendingUpgrade,
        recentIssues,
        byType: byTypeRaw.map((i) => ({ name: i.equipmentType, count: i._count.id })),
        byBaseUnit: byBaseUnitRaw.map((i) => ({ name: i.baseUnit || 'Air HQ', count: i._count.id })),
        byDirectorate: byDirectorateRaw.map((i) => ({ name: i.directorate, count: i._count.id })),
        recentEquipment,
      };
    }
  } catch (error) {
    console.error('Dashboard error:', error);
  }

  const adJoinedPct = stats.total > 0 ? Math.round((stats.adJoined / stats.total) * 100) : 0;
  const svcPct = stats.total > 0 ? Math.round((stats.svc / stats.total) * 100) : 0;
  const upgradedPct = stats.totalUpgradation > 0 ? Math.round((stats.upgraded / stats.totalUpgradation) * 100) : 0;

  return (
    <div className="space-y-8">

      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-8 border border-indigo-800/40 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Active Directory &amp; Inventory Dashboard
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Base / Unit &amp; AD System Overview
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Real-time equipment, AD status, Windows eligibility, and full withdraw &amp; issue management across all Base/Units.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Link href="/equipment/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all">
              <Plus className="w-4 h-4" /> Add Equipment
            </Link>
            <Link href="/withdraw-issue" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all">
              <ArrowLeftRight className="w-4 h-4" /> Withdraw &amp; Issue
            </Link>
            <Link href="/upgradation" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all">
              <Cpu className="w-4 h-4" /> Upgradation
            </Link>
          </div>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block opacity-20 pointer-events-none">
          <Server className="w-64 h-64 text-sky-400" />
        </div>
      </div>

      {/* ── Section 1: Equipment KPIs ─────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Equipment Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Equipment"
            value={stats.total}
            description={`${svcPct}% Serviceable`}
            icon={Monitor}
            gradient="from-slate-900 to-indigo-950"
            borderColor="border-indigo-800/60"
            textColor="text-sky-400"
          />
          <KPICard
            title="Serviceable"
            value={stats.svc}
            description={`U/S: ${stats.unsvc} | Repair: ${stats.repair} | R/S: ${stats.rs}`}
            icon={CheckCircle2}
            gradient="from-slate-900 to-emerald-950"
            borderColor="border-emerald-800/60"
            textColor="text-emerald-400"
          />
          <KPICard
            title="AD Joined"
            value={stats.adJoined}
            description={`${adJoinedPct}% Compliance | Pending: ${stats.adPending}`}
            icon={ShieldCheck}
            gradient="from-slate-900 to-blue-950"
            borderColor="border-blue-800/60"
            textColor="text-blue-400"
          />
          <KPICard
            title="Win 10 Not Eligible"
            value={stats.win10NotEligible}
            description={`Eligible: ${stats.win10} | Win11 Rec: ${stats.win11Rec}`}
            icon={AlertTriangle}
            gradient="from-slate-900 to-rose-950"
            borderColor="border-rose-800/60"
            textColor="text-rose-400"
          />
        </div>
      </div>

      {/* ── Section 2: Issue / Withdrawal / Upgradation KPIs ─────────────── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Withdraw &amp; Issue Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Issued"
            value={stats.totalIssued}
            description={`Replacement: ${stats.totalReplacement} | Direct: ${stats.totalWithoutReplacement}`}
            icon={ClipboardList}
            gradient="from-slate-900 to-purple-950"
            borderColor="border-purple-800/60"
            textColor="text-purple-400"
          />
          <KPICard
            title="Total Withdrawals"
            value={stats.totalWithdrawals}
            description={`Pending Upgrade: ${stats.pendingUpgrade}`}
            icon={PackageMinus}
            gradient="from-slate-900 to-amber-950"
            borderColor="border-amber-800/60"
            textColor="text-amber-400"
          />
          <KPICard
            title="Upgraded"
            value={stats.upgraded}
            description={`${upgradedPct}% of ${stats.totalUpgradation} withdrawn PCs`}
            icon={Wrench}
            gradient="from-slate-900 to-teal-950"
            borderColor="border-teal-800/60"
            textColor="text-teal-400"
          />
          <KPICard
            title="Distributed"
            value={stats.distributed}
            description={`Normal PCs (not joined to AD)`}
            icon={Cpu}
            gradient="from-slate-900 to-sky-950"
            borderColor="border-sky-800/60"
            textColor="text-sky-400"
          />
        </div>
      </div>

      {/* ── Section 3: Breakdown + Status Panels ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Directorate Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-sky-400" /> Directorate Breakdown
            </h2>
            <Link href="/equipment" className="text-xs text-sky-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {stats.byDirectorate.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No equipment data available.</p>
            ) : (
              stats.byDirectorate.map((item: any) => {
                const pct = stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0;
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300">{item.name}</span>
                      <span className="text-sky-400 font-bold">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AD Status + New PC panel */}
        <div className="space-y-4">
          {/* AD Status */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> AD Status
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Joined</span>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">{stats.adJoined}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Not Joined</span>
                <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">{stats.adNotJoined}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50">
                <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending</span>
                <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">{stats.adPending}</span>
              </div>
            </div>
          </div>

          {/* New PC Summary */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
              <Laptop className="w-4 h-4 text-blue-400" /> New PCs
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700">
                <span className="text-xs text-slate-300">Total New PCs</span>
                <span className="text-xs font-bold text-white">{stats.totalNewPc}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-sky-950/40 border border-sky-800/50">
                <span className="text-xs text-sky-300">Issued</span>
                <span className="text-xs font-bold text-sky-300">{stats.newPcIssued}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                <span className="text-xs text-emerald-300">AD Joined</span>
                <span className="text-xs font-bold text-emerald-300">{stats.newPcAdJoined}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Withdraw & Issue Overview ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Issues */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-400" /> Recent Issues
            </h2>
            <Link href="/records" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats.recentIssues.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No issues recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {stats.recentIssues.map((rec: any) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                  <div>
                    <div className="text-xs font-bold text-white">
                      SN #{rec.equipment?.sn} → {rec.issuedTo}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {rec.issuedOffice} · {new Date(rec.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {rec.isReplacement ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                      <Repeat2 className="w-3 h-3" /> Replace
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      <PackageOpen className="w-3 h-3" /> Direct
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgradation Progress */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" /> Upgradation Progress
            </h2>
            <Link href="/upgradation" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-4">
            {/* Upgrade progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Upgraded</span>
                <span className="text-emerald-400 font-bold">{stats.upgraded} / {stats.totalUpgradation}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                  style={{ width: `${upgradedPct}%` }}
                />
              </div>
            </div>

            {/* Distributed progress bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium">Distributed</span>
                <span className="text-sky-400 font-bold">{stats.distributed} / {stats.totalUpgradation}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-400 rounded-full transition-all"
                  style={{ width: `${stats.totalUpgradation > 0 ? Math.round((stats.distributed / stats.totalUpgradation) * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* Status grid */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="text-center p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/50">
                <p className="text-lg font-extrabold text-amber-300">{stats.pendingUpgrade}</p>
                <p className="text-[10px] text-amber-400 font-semibold">Pending</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50">
                <p className="text-lg font-extrabold text-emerald-300">{stats.upgraded}</p>
                <p className="text-[10px] text-emerald-400 font-semibold">Upgraded</p>
              </div>
              <div className="text-center p-2.5 rounded-xl bg-sky-950/40 border border-sky-800/50">
                <p className="text-lg font-extrabold text-sky-300">{stats.distributed}</p>
                <p className="text-[10px] text-sky-400 font-semibold">Distributed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 5: Windows Eligibility ───────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4 mb-5">
          <Sparkles className="w-4 h-4 text-purple-400" /> Windows Eligibility Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/50">
            <p className="text-2xl font-extrabold text-emerald-300">{stats.win10}</p>
            <p className="text-[11px] text-emerald-400 font-semibold mt-1">Win 10 Eligible</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50">
            <p className="text-2xl font-extrabold text-rose-300">{stats.win10NotEligible}</p>
            <p className="text-[11px] text-rose-400 font-semibold mt-1">Win 10 Not Eligible</p>
            <Link href="/withdraw-issue" className="text-[10px] text-rose-300 hover:underline mt-1 inline-block">→ Issue These</Link>
          </div>
          <div className="text-center p-4 rounded-2xl bg-blue-950/40 border border-blue-800/50">
            <p className="text-2xl font-extrabold text-blue-300">{stats.win11}</p>
            <p className="text-[11px] text-blue-400 font-semibold mt-1">Win 11 Eligible</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-purple-950/40 border border-purple-800/50">
            <p className="text-2xl font-extrabold text-purple-300">{stats.win11Rec}</p>
            <p className="text-[11px] text-purple-400 font-semibold mt-1">Win 11 Recommended</p>
          </div>
        </div>
      </div>

    </div>
  );
}
