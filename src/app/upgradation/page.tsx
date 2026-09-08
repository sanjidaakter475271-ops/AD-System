'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Building,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRightCircle,
  X,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { BASE_UNITS, DIRECTORATES } from '@/lib/constants';

type UpgradationRecord = {
  id: number;
  equipmentId: number;
  equipment: any;
  isUpgraded: boolean;
  upgradedAt?: string;
  upgradedBy?: string;
  isDistributed: boolean;
  distributedTo?: string;
  distributedBase?: string;
  distributedAt?: string;
  remarks?: string;
  createdAt: string;
  withdrawal: {
    id: number;
    withdrawnFrom: string;
    withdrawnBase: string;
    withdrawnAt: string;
    withdrawnBy?: string;
    reason?: string;
    issueRecord?: {
      equipment?: any;
      issuedTo?: string;
      issuedOffice?: string;
    };
  };
};

// ─── Distribute / Upgrade Modal ───────────────────────────────────────────────
function UpgradeModal({
  record,
  onClose,
  onSuccess,
  customBaseUnits,
}: {
  record: UpgradationRecord;
  onClose: () => void;
  onSuccess: () => void;
  customBaseUnits: any[];
}) {
  const [isUpgraded, setIsUpgraded] = useState(record.isUpgraded);
  const [upgradedBy, setUpgradedBy] = useState(record.upgradedBy || '');
  const [isDistributed, setIsDistributed] = useState(record.isDistributed);
  const [distributedTo, setDistributedTo] = useState(record.distributedTo || '');
  const [distributedBase, setDistributedBase] = useState(record.distributedBase || '');
  const [remarks, setRemarks] = useState(record.remarks || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const allBaseUnits = Array.from(new Set([...BASE_UNITS, ...customBaseUnits.map((b) => b.name)]));
  const activeBaseObj = customBaseUnits.find((b) => b.name === distributedBase);
  const offices =
    activeBaseObj?.offices?.length > 0
      ? activeBaseObj.offices.map((o: any) => o.name)
      : distributedBase === 'Air HQ' || !distributedBase
      ? DIRECTORATES
      : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDistributed && !distributedTo) { setError('Select the office to distribute to'); return; }
    if (isDistributed && !distributedBase) { setError('Select the base unit to distribute to'); return; }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/upgradation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upgradationId: record.id,
          isUpgraded,
          upgradedBy,
          isDistributed,
          distributedTo,
          distributedBase,
          remarks,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" /> Upgrade &amp; Distribute PC
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              SN #{record.equipment.sn} — Withdrawn from {record.withdrawal.withdrawnFrom} ({record.withdrawal.withdrawnBase})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* PC Info */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs space-y-1">
            <div className="text-slate-400">PC: <span className="text-white font-semibold">{record.equipment.equipmentType} | {record.equipment.brandModel || 'N/A'} | SN #{record.equipment.sn}</span></div>
            <div className="text-slate-400">Specs: <span className="text-white">{record.equipment.processor} ({record.equipment.generation}th) | {record.equipment.ramGb}GB RAM | {record.equipment.storageType}</span></div>
            <div className="text-slate-400">Withdrawn: <span className="text-amber-300 font-semibold">{record.withdrawal.withdrawnFrom} ({record.withdrawal.withdrawnBase})</span></div>
          </div>

          {/* Upgrade toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <button
              type="button"
              onClick={() => setIsUpgraded(!isUpgraded)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isUpgraded ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isUpgraded ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-xs font-bold text-white">Upgrade PC (Optional)</p>
              <p className="text-[10px] text-slate-400">Mark if hardware/software was upgraded (can distribute without upgrade too)</p>
            </div>
            {isUpgraded && <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto" />}
          </div>

          {isUpgraded && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Upgraded By</label>
              <input
                type="text"
                value={upgradedBy}
                onChange={(e) => setUpgradedBy(e.target.value)}
                placeholder="e.g. Sgt Md. Rana"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Distribute toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
            <button
              type="button"
              onClick={() => setIsDistributed(!isDistributed)}
              className={`relative w-11 h-6 rounded-full transition-colors ${isDistributed ? 'bg-sky-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isDistributed ? 'translate-x-5' : ''}`} />
            </button>
            <div>
              <p className="text-xs font-bold text-white">Distribute to New Office / Section</p>
              <p className="text-[10px] text-slate-400">Normal Non-AD PC (This PC will NOT be added to Active Directory)</p>
            </div>
            {isDistributed && <ArrowRightCircle className="w-5 h-5 text-sky-400 ml-auto" />}
          </div>

          {isDistributed && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-400" /> Base Unit
                </label>
                <select
                  value={distributedBase}
                  onChange={(e) => { setDistributedBase(e.target.value); setDistributedTo(''); }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required={isDistributed}
                >
                  <option value="">— Select Base —</option>
                  {allBaseUnits.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">New Office</label>
                {offices.length > 0 ? (
                  <select
                    value={distributedTo}
                    onChange={(e) => setDistributedTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required={isDistributed}
                  >
                    <option value="">— Select Office —</option>
                    {offices.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={distributedTo}
                    onChange={(e) => setDistributedTo(e.target.value)}
                    placeholder="Office name"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    required={isDistributed}
                  />
                )}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder={`e.g. Withdrawn from ${record.withdrawal.withdrawnFrom}, upgraded RAM to 8GB`}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-600 text-white text-xs font-bold hover:from-emerald-400 hover:to-sky-500 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UpgradationPage() {
  const [records, setRecords] = useState<UpgradationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBase, setFilterBase] = useState('');
  const [filterUpgraded, setFilterUpgraded] = useState('');
  const [filterDistributed, setFilterDistributed] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<UpgradationRecord | null>(null);
  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);

  const allBaseUnits = Array.from(new Set([...BASE_UNITS, ...customBaseUnits.map((b) => b.name)]));

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterBase) q.append('baseUnit', filterBase);
      if (filterUpgraded) q.append('isUpgraded', filterUpgraded);
      if (filterDistributed) q.append('isDistributed', filterDistributed);
      const res = await fetch(`/api/upgradation?${q.toString()}`);
      if (res.ok) setRecords(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [filterBase, filterUpgraded, filterDistributed]);

  useEffect(() => {
    fetch('/api/base-units').then(r => r.json()).then(setCustomBaseUnits).catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const totalRecords = records.length;
  const upgraded = records.filter((r) => r.isUpgraded).length;
  const distributed = records.filter((r) => r.isDistributed).length;
  const pending = records.filter((r) => !r.isUpgraded).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-400" />
            Upgradation
          </h1>
          <p className="text-sm text-slate-400">Withdrawn PCs ready for upgrade and redistribution to new offices</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">Total Withdrawn</p>
          <p className="text-2xl font-bold text-white">{totalRecords}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-amber-400 uppercase font-semibold tracking-wide">Pending Upgrade</p>
          <p className="text-2xl font-bold text-amber-300">{pending}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-emerald-400 uppercase font-semibold tracking-wide">Upgraded</p>
          <p className="text-2xl font-bold text-emerald-300">{upgraded}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-1">
          <p className="text-[11px] text-sky-400 uppercase font-semibold tracking-wide">Distributed</p>
          <p className="text-2xl font-bold text-sky-300">{distributed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterBase}
          onChange={(e) => setFilterBase(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Base / Units</option>
          {allBaseUnits.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select
          value={filterUpgraded}
          onChange={(e) => setFilterUpgraded(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Upgrade Status</option>
          <option value="true">Upgraded</option>
          <option value="false">Pending Upgrade</option>
        </select>
        <select
          value={filterDistributed}
          onChange={(e) => setFilterDistributed(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">All Distribution Status</option>
          <option value="true">Distributed</option>
          <option value="false">Not Distributed</option>
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
            <div className="animate-spin w-7 h-7 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading upgradation records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-2">
            <Cpu className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No upgradation records found</p>
            <p className="text-xs text-slate-500">Withdrawn PCs from replacement issues appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">SN (Old PC)</th>
                  <th className="p-3.5">Withdrawn From</th>
                  <th className="p-3.5">Specs</th>
                  <th className="p-3.5">Upgrade</th>
                  <th className="p-3.5">Distribution</th>
                  <th className="p-3.5">Remarks</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-amber-400">#{rec.equipment.sn}</div>
                      <div className="text-[10px] text-slate-400">{rec.equipment.equipmentType}</div>
                      <div className="text-[10px] text-slate-500">{rec.equipment.brandModel || 'N/A'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{rec.withdrawal.withdrawnFrom}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-500" /> {rec.withdrawal.withdrawnBase}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(rec.withdrawal.withdrawnAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <div>{rec.equipment.processor ? `${rec.equipment.processor} (${rec.equipment.generation}th)` : '—'}</div>
                      <div className="text-[10px] text-slate-400">{rec.equipment.ramGb ? `${rec.equipment.ramGb}GB RAM` : ''} {rec.equipment.storageType ? `| ${rec.equipment.storageType}` : ''}</div>
                    </td>
                    <td className="p-3.5">
                      {rec.isUpgraded ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Upgraded
                          </span>
                          {rec.upgradedBy && <div className="text-[10px] text-slate-400">By: {rec.upgradedBy}</div>}
                          {rec.upgradedAt && <div className="text-[10px] text-slate-500">{new Date(rec.upgradedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {rec.isDistributed ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold">
                            <ArrowRightCircle className="w-3 h-3" /> Distributed
                          </span>
                          <div className="text-[10px] text-white font-semibold">{rec.distributedTo}</div>
                          {rec.distributedBase && <div className="text-[10px] text-slate-400 flex items-center gap-1"><Building className="w-3 h-3 text-slate-500" /> {rec.distributedBase}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Not Distributed</span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-[200px]">
                      <div className="text-[10px] text-slate-400 break-words">{rec.remarks || '—'}</div>
                    </td>
                    <td className="p-3.5 text-right">
                      {!rec.isDistributed && (
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all ml-auto"
                        >
                          <Wrench className="w-3 h-3" /> Process / Distribute
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRecord && (
        <UpgradeModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSuccess={fetchRecords}
          customBaseUnits={customBaseUnits}
        />
      )}
    </div>
  );
}
