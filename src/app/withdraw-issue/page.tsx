'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight, PackageOpen, PackageMinus, Building,
  RefreshCw, AlertTriangle, CheckCircle2, Send, X,
  FileText, ShieldCheck, ChevronRight, Monitor,
  Clock, Layers, Info, Users,
} from 'lucide-react';
import { BASE_UNITS, DIRECTORATES } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
type PC = {
  id: number; sn: number; baseUnit: string; directorate: string;
  equipmentType: string; brandModel?: string; serialNo?: string;
  processor?: string; generation?: number; ramGb?: number;
  ssdGb: number; hddGb: number; storageType?: string;
  location?: string;
  win10Eligible?: string; win11Eligible?: string; status: string;
  issueStatus?: string; isNewPc?: boolean;
  intendedOffice?: string; intendedBase?: string;
  issueRecords?: any[];
  withdrawalRecords?: any[];
};

type Withdrawal = {
  id: number; equipment: PC; withdrawnFrom: string; withdrawnBase: string;
  withdrawnAt: string; withdrawnBy?: string; reason?: string;
  issueRecord?: any; upgradation?: any;
};

// ─── Issue Details Panel (right side drawer) ──────────────────────────────────
function IssueDetailPanel({
  pc,
  onClose,
}: {
  pc: PC;
  onClose: () => void;
}) {
  const lastIssue = pc.issueRecords?.[0];
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" /> Issue Details
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Old PC info */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
          <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wide">Old PC (Replaced)</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">SN:</span> <span className="text-white font-bold">#{pc.sn}</span></div>
            <div><span className="text-slate-400">Type:</span> <span className="text-white">{pc.equipmentType}</span></div>
            <div><span className="text-slate-400">Brand:</span> <span className="text-white">{pc.brandModel || '—'}</span></div>
            <div><span className="text-slate-400">Serial:</span> <span className="font-mono text-white">{pc.serialNo || '—'}</span></div>
            <div><span className="text-slate-400">Processor:</span> <span className="text-white">{pc.processor ? `${pc.processor} (${pc.generation}th)` : '—'}</span></div>
            <div><span className="text-slate-400">RAM:</span> <span className="text-white">{pc.ramGb ? `${pc.ramGb}GB` : '—'}</span></div>
            <div><span className="text-slate-400">Storage:</span> <span className="text-white">{pc.storageType || '—'}</span></div>
            <div><span className="text-slate-400">Office:</span> <span className="text-white">{pc.directorate}</span></div>
            <div className="col-span-2"><span className="text-slate-400">Base:</span> <span className="text-white">{pc.baseUnit}</span></div>
          </div>
        </div>

        {/* Issue info */}
        {lastIssue ? (
          <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-4 space-y-2">
            <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wide">Issue Record</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">New PC (SN):</span><span className="text-sky-300 font-bold">#{lastIssue.equipment?.sn}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Section:</span><span className="text-white font-semibold">{lastIssue.issuedTo}</span></div>
              {lastIssue.sectionLabel && (
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">PC Label:</span><span className="text-emerald-300 font-bold">{lastIssue.sectionLabel}</span></div>
              )}
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Office:</span><span className="text-white">{lastIssue.issuedOffice}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Base:</span><span className="text-white">{lastIssue.issuedBase}</span></div>
              <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Date:</span><span className="text-white">{new Date(lastIssue.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
              {lastIssue.letterRef && (
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Letter Ref:</span><span className="text-amber-300 font-mono">{lastIssue.letterRef}</span></div>
              )}
              {lastIssue.letterAuthority && (
                <div className="flex gap-2"><span className="text-slate-400 w-28 shrink-0">Authority:</span><span className="text-purple-300">{lastIssue.letterAuthority}</span></div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 text-xs text-slate-500 text-center">No issue record found</div>
        )}
      </div>
    </div>
  );
}

// ─── New PC Side Panel (replacement picker) ────────────────────────────────────
function NewPcPanel({
  oldPc,
  newPcs,
  onClose,
  onSuccess,
}: {
  oldPc: PC;
  newPcs: PC[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'pick' | 'form'>('pick');
  const [selectedNewPc, setSelectedNewPc] = useState<PC | null>(null);
  const [section, setSection] = useState('');          // Which section/place (e.g. "CO Room", "IT Section")
  const [issuedOffice, setIssuedOffice] = useState(oldPc.directorate);
  const [issuedBase, setIssuedBase] = useState(oldPc.baseUnit);
  const [letterRef, setLetterRef] = useState('');
  const [letterAuthority, setLetterAuthority] = useState('');
  const [withdrawnBy, setWithdrawnBy] = useState('');
  const [withdrawalReason, setWithdrawalReason] = useState('Replaced with new PC (Not Eligible)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Preview: how many PCs already in this section
  const [sectionPcCount, setSectionPcCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Fetch count of active PCs in this section
  useEffect(() => {
    if (!section.trim() || !issuedOffice || !issuedBase) {
      setSectionPcCount(null);
      return;
    }
    const controller = new AbortController();
    setLoadingCount(true);
    fetch(`/api/withdraw-issue/section-count?section=${encodeURIComponent(section)}&office=${encodeURIComponent(issuedOffice)}&base=${encodeURIComponent(issuedBase)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => { setSectionPcCount(d.count ?? 0); setLoadingCount(false); })
      .catch(() => { setLoadingCount(false); });
    return () => controller.abort();
  }, [section, issuedOffice, issuedBase]);

  const nextPcLabel = sectionPcCount !== null ? `PC-${sectionPcCount + 1}` : null;

  // Filter: new PCs intended for same office or same base
  const sameOffice = newPcs.filter(p => p.intendedOffice === oldPc.directorate && p.intendedBase === oldPc.baseUnit);
  const sameBase = newPcs.filter(p => p.intendedBase === oldPc.baseUnit && p.intendedOffice !== oldPc.directorate);
  const otherPcs = newPcs.filter(p => !p.intendedBase || (p.intendedBase !== oldPc.baseUnit));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!section.trim()) { setError('Section / Issued To is required'); return; }
    if (!selectedNewPc) { setError('Select a new PC first'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/withdraw-issue/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPcId: selectedNewPc.id,
          oldPcId: oldPc.id,
          issuedTo: section,
          issuedOffice, issuedBase,
          letterRef, letterAuthority,
          isReplacement: true,
          withdrawnBy, withdrawalReason,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      onSuccess(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const PcCard = ({ pc, label }: { pc: PC; label?: string }) => (
    <div
      onClick={() => { setSelectedNewPc(pc); setStep('form'); }}
      className={`cursor-pointer p-3.5 rounded-xl border transition-all hover:border-sky-500/60 hover:bg-sky-950/30 ${
        selectedNewPc?.id === pc.id ? 'border-sky-500 bg-sky-950/40' : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      {label && <span className="text-[10px] font-bold text-emerald-400 uppercase">{label}</span>}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs font-bold text-sky-300">SN #{pc.sn}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
      </div>
      <div className="text-[11px] text-slate-300 mt-0.5">{pc.equipmentType} | {pc.brandModel || 'N/A'}</div>
      <div className="text-[10px] text-slate-400">{pc.processor} ({pc.generation}th) | {pc.ramGb}GB | {pc.storageType}</div>
      {pc.intendedOffice && (
        <div className="text-[10px] text-amber-400 mt-0.5">Intended for: {pc.intendedOffice}</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-400" />
              {step === 'pick' ? 'Select New PC for Replacement' : 'Issue Details'}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Replacing SN #{oldPc.sn} — {oldPc.directorate} ({oldPc.baseUnit})
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Pick new PC */}
        {step === 'pick' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {newPcs.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Monitor className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm text-slate-300 font-semibold">No new PCs available</p>
                <p className="text-xs text-slate-500">Add new PCs first from Equipment → Add New Item</p>
              </div>
            ) : (
              <>
                {sameOffice.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Same Office ({oldPc.directorate})
                    </p>
                    {sameOffice.map(pc => <PcCard key={pc.id} pc={pc} />)}
                  </div>
                )}
                {sameBase.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1">
                      <Building className="w-3 h-3" /> Same Base ({oldPc.baseUnit})
                    </p>
                    {sameBase.map(pc => <PcCard key={pc.id} pc={pc} />)}
                  </div>
                )}
                {otherPcs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Other Available
                    </p>
                    {otherPcs.map(pc => <PcCard key={pc.id} pc={pc} />)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 2: Issue form */}
        {step === 'form' && selectedNewPc && (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Back */}
            <button type="button" onClick={() => setStep('pick')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
              ← Back to PC list
            </button>

            {/* Selected new PC summary */}
            <div className="bg-sky-950/40 border border-sky-800/50 rounded-xl p-3 space-y-1">
              <p className="text-[10px] font-bold text-sky-400 uppercase">New PC to Issue</p>
              <p className="text-xs font-bold text-white">SN #{selectedNewPc.sn} | {selectedNewPc.equipmentType} | {selectedNewPc.brandModel || 'N/A'}</p>
              <p className="text-[10px] text-slate-400">{selectedNewPc.processor} ({selectedNewPc.generation}th) | {selectedNewPc.ramGb}GB | {selectedNewPc.storageType}</p>
            </div>

            {/* Section (Issued To) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3 h-3 text-sky-400" /> Section / Issued To *
              </label>
              <input
                type="text"
                value={section}
                onChange={e => setSection(e.target.value)}
                placeholder="e.g. CO Room, IT Section, Admin Section..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
              {/* Preview next PC label */}
              {section.trim() && (
                <div className="flex items-center gap-2 mt-1">
                  {loadingCount ? (
                    <span className="text-[10px] text-slate-400 italic">Checking section...</span>
                  ) : nextPcLabel ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                      Will be assigned: {nextPcLabel}
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            {/* Office & Base */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Office *</label>
                <input type="text" value={issuedOffice} onChange={e => setIssuedOffice(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Base *</label>
                <input type="text" value={issuedBase} onChange={e => setIssuedBase(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" required />
              </div>
            </div>

            {/* Letter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-400" /> Letter Ref
                </label>
                <input type="text" value={letterRef} onChange={e => setLetterRef(e.target.value)}
                  placeholder="AHQ/AD/1234/2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-purple-400" /> Authority
                </label>
                <input type="text" value={letterAuthority} onChange={e => setLetterAuthority(e.target.value)}
                  placeholder="Air Cdre Md. Kamal"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </div>

            {/* Withdrawal details optional note */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300">
              Note: Old PC (SN #{oldPc.sn}) will be marked as replaced and moved to Withdrawal tab for batch processing.
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold hover:from-sky-400 hover:to-indigo-500 transition-all disabled:opacity-50">
              {submitting ? 'Processing...' : 'Confirm Issue & Withdraw Old PC'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WithdrawIssuePage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'withdrawal'>('inventory');

  // Inventory tab
  const [inventory, setInventory] = useState<PC[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [filterBase, setFilterBase] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'not-issued' | 'issued'>('all');

  // New PCs for replacement
  const [newPcs, setNewPcs] = useState<PC[]>([]);

  // Panels
  const [issuePanel, setIssuePanel] = useState<PC | null>(null);    // open NewPcPanel for this old PC
  const [detailPanel, setDetailPanel] = useState<PC | null>(null);  // open IssueDetailPanel

  // Withdrawal tab
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wdLoading, setWdLoading] = useState(true);
  const [wdFilterBase, setWdFilterBase] = useState('');
  const [wdFilterOffice, setWdFilterOffice] = useState('');

  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);

  const allBaseUnits = Array.from(new Set([...BASE_UNITS, ...customBaseUnits.map(b => b.name)]));

  const activeBaseObj = customBaseUnits.find(b => b.name === filterBase);
  const offices = activeBaseObj?.offices?.length > 0
    ? activeBaseObj.offices.map((o: any) => o.name)
    : (filterBase === 'Air HQ' || !filterBase) ? DIRECTORATES : [];

  const wdBaseObj = customBaseUnits.find(b => b.name === wdFilterBase);
  const wdOffices = wdBaseObj?.offices?.length > 0
    ? wdBaseObj.offices.map((o: any) => o.name)
    : (wdFilterBase === 'Air HQ' || !wdFilterBase) ? DIRECTORATES : [];

  const fetchInventory = useCallback(async () => {
    setInvLoading(true);
    try {
      const q = new URLSearchParams();
      if (filterBase) q.append('baseUnit', filterBase);
      if (filterOffice) q.append('directorate', filterOffice);
      const res = await fetch(`/api/withdraw-issue/not-eligible?${q.toString()}`);
      if (res.ok) setInventory(await res.json());
    } catch {} finally { setInvLoading(false); }
  }, [filterBase, filterOffice]);

  const fetchNewPcs = useCallback(async () => {
    try {
      const q = new URLSearchParams();
      q.append('mode', 'new-pcs');
      if (filterBase) q.append('baseUnit', filterBase);
      const res = await fetch(`/api/withdraw-issue/not-eligible?${q.toString()}`);
      if (res.ok) setNewPcs(await res.json());
    } catch {}
  }, [filterBase]);

  const fetchWithdrawals = useCallback(async () => {
    setWdLoading(true);
    try {
      const q = new URLSearchParams();
      if (wdFilterBase) q.append('baseUnit', wdFilterBase);
      if (wdFilterOffice) q.append('directorate', wdFilterOffice);
      const res = await fetch(`/api/withdraw-issue/withdrawal?${q.toString()}`);
      if (res.ok) setWithdrawals(await res.json());
    } catch {} finally { setWdLoading(false); }
  }, [wdFilterBase, wdFilterOffice]);

  // Selection for Batch Withdrawal
  const [selectedWdIds, setSelectedWdIds] = useState<number[]>([]);

  const toggleSelectAllWd = () => {
    if (selectedWdIds.length === withdrawals.length) {
      setSelectedWdIds([]);
    } else {
      setSelectedWdIds(withdrawals.map(w => w.id));
    }
  };

  const toggleSelectWd = (id: number) => {
    if (selectedWdIds.includes(id)) {
      setSelectedWdIds(selectedWdIds.filter(i => i !== id));
    } else {
      setSelectedWdIds([...selectedWdIds, id]);
    }
  };

  useEffect(() => { fetch('/api/base-units').then(r => r.json()).then(setCustomBaseUnits).catch(() => {}); }, []);
  useEffect(() => { fetchInventory(); fetchNewPcs(); }, [fetchInventory, fetchNewPcs]);
  useEffect(() => { fetchWithdrawals(); }, [fetchWithdrawals]);

  // Filtered inventory: NEVER show withdrawn PCs here
  const filteredInventory = inventory.filter(pc => {
    // Exclude withdrawn PCs from inventory view
    if (pc.issueStatus === 'Withdrawn & Issued' || pc.issueStatus === 'Withdrawn') return false;
    if (filterStatus === 'not-issued') return !pc.issueStatus || pc.issueStatus === 'Not Issued';
    if (filterStatus === 'issued') return pc.issueStatus === 'Issued';
    return true;
  });

  const countNotIssued = inventory.filter(p => !p.issueStatus || p.issueStatus === 'Not Issued').length;
  const countIssued = inventory.filter(p => p.issueStatus === 'Issued').length;
  // withdrawn PCs are NOT counted in inventory sub-tabs

  const handleProcessBatchWithdrawal = async () => {
    if (selectedWdIds.length === 0) return;
    try {
      const res = await fetch('/api/withdraw-issue/withdrawal/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalIds: selectedWdIds }),
      });
      if (!res.ok) throw new Error('Failed to process batch withdrawal');
      setSelectedWdIds([]);
      fetchWithdrawals();
      fetchInventory();
      alert('Batch withdrawal processed! Old PCs moved to Old PC Store.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const statusBadge = (issueStatus?: string) => {
    if (issueStatus === 'Issued') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Issued</span>;
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600">Not Issued</span>;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-amber-400" /> Withdraw &amp; Issue
          </h1>
          <p className="text-sm text-slate-400">Manage not-eligible PC inventory, issues and withdrawals</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
            activeTab === 'inventory' ? 'bg-rose-600/15 border border-b-0 border-rose-500/40 text-rose-300' : 'text-slate-400 hover:text-white'
          }`}>
          <Monitor className="w-4 h-4" /> Inventory
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">{countNotIssued + countIssued}</span>
        </button>
        <button onClick={() => setActiveTab('withdrawal')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
            activeTab === 'withdrawal' ? 'bg-amber-600/15 border border-b-0 border-amber-500/40 text-amber-300' : 'text-slate-400 hover:text-white'
          }`}>
          <PackageMinus className="w-4 h-4" /> Withdrawal
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">{withdrawals.length}</span>
        </button>
      </div>

      {/* ── INVENTORY TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterBase} onChange={e => { setFilterBase(e.target.value); setFilterOffice(''); }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Base / Units</option>
              {allBaseUnits.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterOffice} onChange={e => setFilterOffice(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Offices</option>
              {offices.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={() => { fetchInventory(); fetchNewPcs(); }}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Status sub-tabs — no "withdrawn" here, they're in records */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All', count: countNotIssued + countIssued, color: 'slate' },
              { key: 'not-issued', label: 'Not Issued', count: countNotIssued, color: 'slate' },
              { key: 'issued', label: 'Issued', count: countIssued, color: 'emerald' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilterStatus(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  filterStatus === tab.key
                    ? tab.color === 'emerald' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-700 border-slate-600 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}>
                {tab.label}
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-rose-500/5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">Not Eligible PCs — Inventory</span>
              {newPcs.length > 0 && (
                <span className="ml-auto text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {newPcs.length} new PC{newPcs.length > 1 ? 's' : ''} available for replacement
                </span>
              )}
            </div>

            {invLoading ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin w-7 h-7 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No PCs found</p>
                <p className="text-xs text-slate-500">Try changing the filter. Withdrawn PCs are visible in Records page.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">SN</th>
                      <th className="p-3.5">Office / Base</th>
                      <th className="p-3.5">Section / Location</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Brand / Serial</th>
                      <th className="p-3.5">Specs</th>
                      <th className="p-3.5">Win10</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredInventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-rose-400">#{item.sn}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{item.directorate}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" /> {item.baseUnit}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="text-slate-200 font-medium">{item.location || '—'}</div>
                          {/* Show PC label from latest issue record */}
                          {item.issueRecords?.[0]?.sectionLabel && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold border border-sky-500/30">
                              {item.issueRecords[0].sectionLabel}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-indigo-300 font-semibold">{item.equipmentType}</td>
                        <td className="p-3.5">
                          <div className="text-slate-200">{item.brandModel || '—'}</div>
                          <div className="font-mono text-[10px] text-slate-400">{item.serialNo || '—'}</div>
                        </td>
                        <td className="p-3.5 text-slate-300">
                          <div>{item.processor ? `${item.processor} (${item.generation}th)` : '—'}</div>
                          <div className="text-[10px] text-slate-400">{item.ramGb ? `${item.ramGb}GB` : ''} {item.storageType ? `| ${item.storageType}` : ''}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="text-rose-400 font-bold text-[10px]">{item.win10Eligible || 'N/A'}</span>
                          <div className="text-[10px] text-slate-400">W11: {item.win11Eligible || 'N/A'}</div>
                        </td>
                        <td className="p-3.5">{statusBadge(item.issueStatus)}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Detail button — only for issued */}
                            {item.issueStatus === 'Issued' && (
                              <button onClick={() => setDetailPanel(item)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/40 text-purple-300 text-[11px] font-bold transition-all">
                                <Info className="w-3 h-3" /> Details
                              </button>
                            )}
                            {/* Issue button — only for not-issued */}
                            {(!item.issueStatus || item.issueStatus === 'Not Issued') && (
                              <button onClick={() => setIssuePanel(item)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/40 border border-sky-500/40 text-sky-300 text-[11px] font-bold transition-all">
                                <Send className="w-3 h-3" /> Issue
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WITHDRAWAL TAB ────────────────────────────────────────────────── */}
      {activeTab === 'withdrawal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select value={wdFilterBase} onChange={e => { setWdFilterBase(e.target.value); setWdFilterOffice(''); }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Base / Units</option>
              {allBaseUnits.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={wdFilterOffice} onChange={e => setWdFilterOffice(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              <option value="">All Offices</option>
              {wdOffices.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
            <button onClick={fetchWithdrawals}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <PackageMinus className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">Withdrawn PCs Log</span>
              </div>
              {selectedWdIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-300 font-semibold">{selectedWdIds.length} Selected</span>
                  <button
                    onClick={handleProcessBatchWithdrawal}
                    className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md">
                    Process Batch Withdrawal
                  </button>
                </div>
              )}
            </div>

            {wdLoading ? (
              <div className="p-10 text-center text-slate-400">
                <div className="animate-spin w-7 h-7 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="p-10 text-center text-slate-400 space-y-2">
                <PackageMinus className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No withdrawals found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200">
                  <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 w-8">
                        <input
                          type="checkbox"
                          checked={withdrawals.length > 0 && selectedWdIds.length === withdrawals.length}
                          onChange={toggleSelectAllWd}
                          className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                        />
                      </th>
                      <th className="p-3.5">Old PC (SN)</th>
                      <th className="p-3.5">Withdrawn From</th>
                      <th className="p-3.5">New PC Issued</th>
                      <th className="p-3.5">Withdrawn At</th>
                      <th className="p-3.5">Withdrawn By</th>
                      <th className="p-3.5">Reason</th>
                      <th className="p-3.5">Upgradation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {withdrawals.map(wd => (
                      <tr key={wd.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <input
                            type="checkbox"
                            checked={selectedWdIds.includes(wd.id)}
                            onChange={() => toggleSelectWd(wd.id)}
                            className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-amber-400">#{wd.equipment.sn}</div>
                          <div className="text-[10px] text-slate-400">{wd.equipment.equipmentType} | {wd.equipment.brandModel || 'N/A'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{wd.withdrawnFrom}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" /> {wd.withdrawnBase}
                          </div>
                        </td>
                        <td className="p-3.5">
                          {wd.issueRecord?.equipment ? (
                            <div>
                              <div className="text-sky-300 font-bold">SN #{wd.issueRecord.equipment.sn}</div>
                              <div className="text-[10px] text-slate-400">Section: {wd.issueRecord.issuedTo}</div>
                              {wd.issueRecord.sectionLabel && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold border border-sky-500/30">
                                  {wd.issueRecord.sectionLabel}
                                </span>
                              )}
                            </div>
                          ) : '—'}
                        </td>
                        <td className="p-3.5 text-slate-300 whitespace-nowrap">
                          {new Date(wd.withdrawnAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3.5 text-slate-300">{wd.withdrawnBy || '—'}</td>
                        <td className="p-3.5 text-slate-400 max-w-[160px] truncate" title={wd.reason || ''}>{wd.reason || '—'}</td>
                        <td className="p-3.5">
                          {wd.upgradation ? (
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                              wd.upgradation.isDistributed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : wd.upgradation.isUpgraded ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                              : 'bg-slate-700 text-slate-300 border-slate-600'
                            }`}>
                              {wd.upgradation.isDistributed ? '✓ Distributed' : wd.upgradation.isUpgraded ? '✓ Upgraded' : 'Pending'}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issue side panel */}
      {issuePanel && (
        <NewPcPanel
          oldPc={issuePanel}
          newPcs={newPcs}
          onClose={() => setIssuePanel(null)}
          onSuccess={() => { fetchInventory(); fetchNewPcs(); fetchWithdrawals(); setActiveTab('inventory'); setFilterStatus('issued'); }}
        />
      )}

      {/* Detail side panel */}
      {detailPanel && (
        <IssueDetailPanel pc={detailPanel} onClose={() => setDetailPanel(null)} />
      )}
    </div>
  );
}
