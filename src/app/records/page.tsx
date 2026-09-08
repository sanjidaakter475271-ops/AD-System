'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Building,
  RefreshCw,
  FileText,
  ShieldCheck,
  Repeat2,
  PackageOpen,
  AlertTriangle,
  Info,
  X,
  Monitor,
  PackageMinus,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { BASE_UNITS, DIRECTORATES } from '@/lib/constants';

type IssueRecord = {
  id: number;
  equipment: any;
  issuedTo: string;
  issuedOffice: string;
  issuedBase: string;
  issuedAt: string;
  sectionLabel?: string;
  pcNumber?: number;
  letterRef?: string;
  letterAuthority?: string;
  isReplacement: boolean;
  replacedEquipment?: any;
  withdrawalRecord?: {
    id: number;
    withdrawnFrom: string;
    withdrawnBase: string;
    withdrawnAt: string;
    withdrawnBy?: string;
    reason?: string;
    upgradation?: any;
  };
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function RecordDetailModal({
  record,
  onClose,
}: {
  record: IssueRecord;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            Issue Record Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Issued PC (New PC) */}
          <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1">
              <Monitor className="w-3 h-3" /> Issued PC (New)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-400">SN:</span> <span className="text-sky-300 font-bold">#{record.equipment?.sn}</span></div>
              <div><span className="text-slate-400">Type:</span> <span className="text-white">{record.equipment?.equipmentType}</span></div>
              <div><span className="text-slate-400">Brand:</span> <span className="text-white">{record.equipment?.brandModel || '—'}</span></div>
              <div><span className="text-slate-400">Serial:</span> <span className="font-mono text-white">{record.equipment?.serialNo || '—'}</span></div>
              <div><span className="text-slate-400">Processor:</span> <span className="text-white">{record.equipment?.processor ? `${record.equipment.processor} (${record.equipment.generation}th)` : '—'}</span></div>
              <div><span className="text-slate-400">RAM:</span> <span className="text-white">{record.equipment?.ramGb ? `${record.equipment.ramGb}GB` : '—'}</span></div>
              <div><span className="text-slate-400">Storage:</span> <span className="text-white">{record.equipment?.storageType || '—'}</span></div>
              <div><span className="text-slate-400">Status:</span> <span className="text-emerald-300 font-semibold">{record.equipment?.issueStatus || '—'}</span></div>
            </div>
          </div>

          {/* Issue Details */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
              <Users className="w-3 h-3" /> Issued To / Location
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex gap-2">
                <span className="text-slate-400 w-28 shrink-0">Section:</span>
                <span className="text-white font-semibold">{record.issuedTo}</span>
              </div>
              {record.sectionLabel && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">PC Label:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    {record.sectionLabel}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-slate-400 w-28 shrink-0">Office:</span>
                <span className="text-white">{record.issuedOffice}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-28 shrink-0">Base:</span>
                <span className="text-white">{record.issuedBase}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 w-28 shrink-0">Date:</span>
                <span className="text-white">{new Date(record.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              {record.letterRef && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Letter Ref:</span>
                  <span className="text-amber-300 font-mono">{record.letterRef}</span>
                </div>
              )}
              {record.letterAuthority && (
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Authority:</span>
                  <span className="text-purple-300">{record.letterAuthority}</span>
                </div>
              )}
            </div>
          </div>

          {/* Replaced (Old) PC — if replacement */}
          {record.isReplacement && record.replacedEquipment && (
            <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Old PC (Replaced)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">SN:</span> <span className="text-rose-300 font-bold">#{record.replacedEquipment.sn}</span></div>
                <div><span className="text-slate-400">Type:</span> <span className="text-white">{record.replacedEquipment.equipmentType}</span></div>
                <div><span className="text-slate-400">Brand:</span> <span className="text-white">{record.replacedEquipment.brandModel || '—'}</span></div>
                <div><span className="text-slate-400">Processor:</span> <span className="text-white">{record.replacedEquipment.processor ? `${record.replacedEquipment.processor} (${record.replacedEquipment.generation}th)` : '—'}</span></div>
              </div>
            </div>
          )}

          {/* Withdrawal Info */}
          {record.withdrawalRecord && (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4 space-y-2">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                <PackageMinus className="w-3 h-3" /> Withdrawal Info
              </p>
              <div className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Withdrawn From:</span>
                  <span className="text-white font-semibold">{record.withdrawalRecord.withdrawnFrom}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Base:</span>
                  <span className="text-white">{record.withdrawalRecord.withdrawnBase}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-28 shrink-0">Withdrawn At:</span>
                  <span className="text-white">{new Date(record.withdrawalRecord.withdrawnAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                {record.withdrawalRecord.withdrawnBy && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-28 shrink-0">Withdrawn By:</span>
                    <span className="text-white">{record.withdrawalRecord.withdrawnBy}</span>
                  </div>
                )}
                {record.withdrawalRecord.reason && (
                  <div className="flex gap-2">
                    <span className="text-slate-400 w-28 shrink-0">Reason:</span>
                    <span className="text-slate-300 italic">{record.withdrawalRecord.reason}</span>
                  </div>
                )}
                {record.withdrawalRecord.upgradation && (
                  <div className="flex gap-2 mt-1">
                    <span className="text-slate-400 w-28 shrink-0">Upgradation:</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      record.withdrawalRecord.upgradation.isDistributed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : record.withdrawalRecord.upgradation.isUpgraded
                        ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {record.withdrawalRecord.upgradation.isDistributed
                        ? '✓ Distributed'
                        : record.withdrawalRecord.upgradation.isUpgraded
                        ? '✓ Upgraded'
                        : 'Pending Upgrade'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RecordsPage() {
  const [records, setRecords] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBase, setFilterBase] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterReplacement, setFilterReplacement] = useState('');
  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);
  const [detailRecord, setDetailRecord] = useState<IssueRecord | null>(null);

  const allBaseUnits = Array.from(new Set([...BASE_UNITS, ...customBaseUnits.map((b) => b.name)]));
  const activeBaseObj = customBaseUnits.find((b) => b.name === filterBase);
  const offices =
    activeBaseObj?.offices?.length > 0
      ? activeBaseObj.offices.map((o: any) => o.name)
      : filterBase === 'Air HQ' || !filterBase
      ? DIRECTORATES
      : [];

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterBase) q.append('baseUnit', filterBase);
      if (filterOffice) q.append('directorate', filterOffice);
      if (filterReplacement) q.append('isReplacement', filterReplacement);
      const res = await fetch(`/api/records?${q.toString()}`);
      if (res.ok) setRecords(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [filterBase, filterOffice, filterReplacement]);

  useEffect(() => {
    fetch('/api/base-units').then(r => r.json()).then(setCustomBaseUnits).catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Summary stats
  const totalIssued = records.length;
  const totalReplacement = records.filter((r) => r.isReplacement).length;
  const totalWithoutReplacement = totalIssued - totalReplacement;
  const pendingWithdrawal = records.filter((r) => r.isReplacement && !r.withdrawalRecord?.upgradation?.isDistributed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-400" />
            Issue Records
          </h1>
          <p className="text-sm text-slate-400">Complete history of PC issues — who, when, letter authority, withdrawn info</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Total Issued</p>
          <p className="text-2xl font-bold text-white">{totalIssued}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-sky-400 uppercase font-semibold tracking-wide">With Replacement</p>
          <p className="text-2xl font-bold text-sky-300">{totalReplacement}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-emerald-400 uppercase font-semibold tracking-wide">Without Replacement</p>
          <p className="text-2xl font-bold text-emerald-300">{totalWithoutReplacement}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-amber-400 uppercase font-semibold tracking-wide">Withdrawal Pending</p>
          <p className="text-2xl font-bold text-amber-300">{pendingWithdrawal}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterBase}
          onChange={(e) => { setFilterBase(e.target.value); setFilterOffice(''); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Base / Units</option>
          {allBaseUnits.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filterOffice}
          onChange={(e) => setFilterOffice(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Offices</option>
          {offices.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select
          value={filterReplacement}
          onChange={(e) => setFilterReplacement(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Issue Types</option>
          <option value="true">With Replacement</option>
          <option value="false">Without Replacement</option>
        </select>
        <button
          onClick={fetchRecords}
          className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Records Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            <div className="animate-spin w-7 h-7 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No records found</p>
            <p className="text-xs text-slate-500">Issue a PC from the Withdraw &amp; Issue page to see records here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Issued PC (New)</th>
                  <th className="p-3.5">Section / PC#</th>
                  <th className="p-3.5">Office / Base</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Letter Ref</th>
                  <th className="p-3.5">Letter Authority</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Replaced PC</th>
                  <th className="p-3.5">Withdrawn From</th>
                  <th className="p-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {records.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-sky-400">SN #{rec.equipment?.sn}</div>
                      <div className="text-[10px] text-slate-400">{rec.equipment?.equipmentType} | {rec.equipment?.brandModel || 'N/A'}</div>
                      <div className="text-[10px] text-slate-500">{rec.equipment?.processor} ({rec.equipment?.generation}th)</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{rec.issuedTo}</div>
                      {rec.sectionLabel && (
                        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                          {rec.sectionLabel}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{rec.issuedOffice}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-500" /> {rec.issuedBase}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-300 whitespace-nowrap">
                      {new Date(rec.issuedAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="p-3.5">
                      {rec.letterRef ? (
                        <div className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                          <FileText className="w-3 h-3 shrink-0" /> {rec.letterRef}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {rec.letterAuthority ? (
                        <div className="flex items-center gap-1 text-purple-300 text-[11px]">
                          <ShieldCheck className="w-3 h-3 shrink-0" /> {rec.letterAuthority}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {rec.isReplacement ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                          <Repeat2 className="w-3 h-3" /> Replacement
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <PackageOpen className="w-3 h-3" /> Direct Issue
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {rec.replacedEquipment ? (
                        <div>
                          <div className="font-bold text-rose-400">SN #{rec.replacedEquipment.sn}</div>
                          <div className="text-[10px] text-slate-400">{rec.replacedEquipment.brandModel || 'N/A'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {/* Withdrawn From column — shows where old PC was taken from */}
                    <td className="p-3.5">
                      {rec.withdrawalRecord ? (
                        <div className="space-y-1">
                          <div className="text-[10px] text-slate-300 font-semibold">{rec.withdrawalRecord.withdrawnFrom}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Building className="w-3 h-3" /> {rec.withdrawalRecord.withdrawnBase}
                          </div>
                          {rec.withdrawalRecord.upgradation ? (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${
                              rec.withdrawalRecord.upgradation.isDistributed
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : rec.withdrawalRecord.upgradation.isUpgraded
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {rec.withdrawalRecord.upgradation.isDistributed
                                ? '✓ Distributed'
                                : rec.withdrawalRecord.upgradation.isUpgraded
                                ? '✓ Upgraded'
                                : 'Pending'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold">
                              <AlertTriangle className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    {/* Details Button */}
                    <td className="p-3.5">
                      <button
                        onClick={() => setDetailRecord(rec)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 text-[11px] font-bold transition-all whitespace-nowrap"
                      >
                        <Info className="w-3 h-3" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailRecord && (
        <RecordDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
        />
      )}
    </div>
  );
}
