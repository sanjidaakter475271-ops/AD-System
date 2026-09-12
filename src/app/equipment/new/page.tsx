'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  BASE_UNITS,
  DIRECTORATES, 
  EQUIPMENT_TYPES, 
  PROCESSORS, 
  GENERATIONS, 
  RAM_OPTIONS, 
  SSD_OPTIONS, 
  HDD_OPTIONS, 
  STATUS_OPTIONS, 
  ISSUE_STATUS_OPTIONS,
  AD_STATUS_OPTIONS
} from '@/lib/constants';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';
import { 
  Monitor, ArrowLeft, Save, Sparkles, CheckCircle2, AlertCircle, Plus, 
  Building, Copy, Trash2, Layers, Send, RefreshCw, FileText, ShieldCheck 
} from 'lucide-react';
import Link from 'next/link';

type MultipleRow = {
  id: string; // temp unique key for React
  baseUnit: string;
  directorate: string;
  equipmentType: string;
  brandModel: string;
  serialNo: string;
  processor: string;
  generation: number;
  ramGb: number;
  ssdGb: number;
  hddGb: number;
  status: string;
  location: string;
  isNewPc: boolean;
  intendedOffice: string;
  intendedBase: string;
  adStatus: string;
  adRemark: string;

  // Issue immediately options
  issueImmediately: boolean;
  issueMode: 'without-replace' | 'replace-old';
  issuedTo: string;       // Section name
  issuedOffice: string;
  issuedBase: string;
  oldPcId: string;        // ID of old PC being replaced
  withdrawnBy: string;
  withdrawalReason: string;
};

export default function NewEquipmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';

  // Mode: single or multiple
  const [entryMode, setEntryMode] = useState<'single' | 'multiple'>('single');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Base unit & office dynamic state
  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);
  const [showAddBaseModal, setShowAddBaseModal] = useState(false);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  const [newBaseName, setNewBaseName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newInventoryName, setNewInventoryName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');

  // Separate list for Inventory Names (Stores/Warehouses)
  const [customInventoryNames, setCustomInventoryNames] = useState<string[]>([
    'Main IT Store',
    'Central Warehouse',
    'Signal Reserve Store',
    'Air HQ Tech Store',
    'Emergency Backup Stock'
  ]);

  // Separate list for Sections (Physical Sections / Rooms)
  const [customSections, setCustomSections] = useState<string[]>([
    'CO Room',
    'IT Section',
    'Server Room A',
    'Admin Section',
    'Signal Section',
    'OC Desk'
  ]);

  // Not-eligible old PCs for replacement suggestions
  const [notEligiblePcs, setNotEligiblePcs] = useState<any[]>([]);

  // ---------------------------------------------------------------------------
  // Single Form State
  // ---------------------------------------------------------------------------
  const [formData, setFormData] = useState({
    baseUnit: user?.baseUnit && user?.role !== 'admin' ? user.baseUnit : 'Air HQ',
    directorate: DIRECTORATES[0],
    equipmentType: EQUIPMENT_TYPES[0],
    brandModel: '',
    serialNo: '',
    processor: PROCESSORS[0],
    generation: GENERATIONS[5], // 7th gen default
    ramGb: 8,
    ssdGb: 256,
    hddGb: 0,
    status: STATUS_OPTIONS[0],
    inventoryName: 'Main IT Store', // Separate Inventory Name field
    location: 'IT Section',        // Separate Section/Location field
    issueStatus: ISSUE_STATUS_OPTIONS[0],
    isNewPc: false,
    intendedOffice: '',
    intendedBase: '',
    adStatus: 'Pending',
    adRemark: '',
    win10Remark: '',
  });

  // ---------------------------------------------------------------------------
  // Multiple Form State
  // ---------------------------------------------------------------------------
  const [commonLetterRef, setCommonLetterRef] = useState('');
  const [commonLetterAuthority, setCommonLetterAuthority] = useState('');
  const [commonIssueImmediately, setCommonIssueImmediately] = useState(false);

  const createDefaultRow = (overrides?: Partial<MultipleRow>): MultipleRow => {
    const defaultBase = user?.baseUnit && user?.role !== 'admin' ? user.baseUnit : 'Air HQ';
    return {
      id: Math.random().toString(36).substring(2, 9),
      baseUnit: defaultBase,
      directorate: DIRECTORATES[0],
      equipmentType: EQUIPMENT_TYPES[0],
      brandModel: '',
      serialNo: '',
      processor: 'I5',
      generation: 7,
      ramGb: 8,
      ssdGb: 256,
      hddGb: 0,
      status: 'Svc',
      location: '',
      isNewPc: true,
      intendedOffice: DIRECTORATES[0],
      intendedBase: defaultBase,
      adStatus: 'Pending',
      adRemark: '',
      issueImmediately: commonIssueImmediately,
      issueMode: 'without-replace',
      issuedTo: '',
      issuedOffice: DIRECTORATES[0],
      issuedBase: defaultBase,
      oldPcId: '',
      withdrawnBy: '',
      withdrawalReason: 'Replaced with new PC (Not Eligible)',
      ...overrides,
    };
  };

  const [rows, setRows] = useState<MultipleRow[]>([
    createDefaultRow({ intendedOffice: 'Dte AD', directorate: 'Dte AD' }),
    createDefaultRow({ intendedOffice: 'Dte Plan', directorate: 'Dte Plan' }),
  ]);

  const loadBaseUnits = async () => {
    try {
      const res = await fetch('/api/base-units');
      if (res.ok) {
        const data = await res.json();
        setCustomBaseUnits(data);
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadNotEligiblePcs = useCallback(async () => {
    try {
      const res = await fetch('/api/withdraw-issue/not-eligible');
      if (res.ok) {
        const data = await res.json();
        setNotEligiblePcs(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Load cached settings, inventory names & sections from localStorage
  useEffect(() => {
    try {
      const savedInvs = localStorage.getItem('app_custom_inventory_names');
      if (savedInvs) setCustomInventoryNames(JSON.parse(savedInvs));

      const savedSecs = localStorage.getItem('app_custom_sections');
      if (savedSecs) setCustomSections(JSON.parse(savedSecs));

      const savedSingleForm = localStorage.getItem('app_last_single_form');
      if (savedSingleForm) {
        const parsed = JSON.parse(savedSingleForm);
        setFormData(prev => ({ ...prev, ...parsed }));
      }

      const savedLetterRef = localStorage.getItem('app_last_letter_ref');
      if (savedLetterRef) setCommonLetterRef(savedLetterRef);

      const savedLetterAuth = localStorage.getItem('app_last_letter_auth');
      if (savedLetterAuth) setCommonLetterAuthority(savedLetterAuth);
    } catch (e) {
      console.error('Error restoring cached form data:', e);
    }
  }, []);

  // Save single form choices to localStorage cache whenever formData changes
  useEffect(() => {
    try {
      localStorage.setItem('app_last_single_form', JSON.stringify({
        baseUnit: formData.baseUnit,
        directorate: formData.directorate,
        equipmentType: formData.equipmentType,
        processor: formData.processor,
        generation: formData.generation,
        ramGb: formData.ramGb,
        ssdGb: formData.ssdGb,
        hddGb: formData.hddGb,
        status: formData.status,
        inventoryName: formData.inventoryName,
        location: formData.location,
        isNewPc: formData.isNewPc,
        intendedBase: formData.intendedBase,
        intendedOffice: formData.intendedOffice,
        adStatus: formData.adStatus,
      }));
    } catch (e) {}
  }, [formData]);

  // Add custom Inventory Name handler
  const handleAddInventory = () => {
    if (!newInventoryName.trim()) return;
    const name = newInventoryName.trim();
    if (!customInventoryNames.includes(name)) {
      const updated = [...customInventoryNames, name];
      setCustomInventoryNames(updated);
      try { localStorage.setItem('app_custom_inventory_names', JSON.stringify(updated)); } catch (e) {}
    }
    setFormData(prev => ({ ...prev, inventoryName: name }));
    setNewInventoryName('');
    setShowAddInventoryModal(false);
  };

  // Add custom Section/Location handler
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    const name = newSectionName.trim();
    if (!customSections.includes(name)) {
      const updated = [...customSections, name];
      setCustomSections(updated);
      try { localStorage.setItem('app_custom_sections', JSON.stringify(updated)); } catch (e) {}
    }
    setFormData(prev => ({ ...prev, location: name }));
    setNewSectionName('');
    setShowAddSectionModal(false);
  };

  const allBaseUnits = Array.from(new Set([
    ...BASE_UNITS,
    ...customBaseUnits.map(b => b.name)
  ]));

  const getOfficesForBase = (baseName: string) => {
    const bObj = customBaseUnits.find(b => b.name === baseName);
    if (bObj?.offices && bObj.offices.length > 0) {
      return bObj.offices.map((o: any) => o.name);
    }
    return baseName === 'Air HQ' || !baseName ? DIRECTORATES : ['General Office', 'Admin Branch', 'Signal Section'];
  };

  // ---------------------------------------------------------------------------
  // Single mode handlers
  // ---------------------------------------------------------------------------
  const handleIsNewPcChange = (isNew: boolean) => {
    setFormData(prev => ({
      ...prev,
      isNewPc: isNew,
      status: isNew ? 'Svc' : prev.status,
      issueStatus: isNew ? 'Not Issued' : 'Issued',
      location: isNew ? '' : prev.location,
      directorate: isNew ? (prev.intendedOffice || prev.directorate) : prev.directorate,
      intendedOffice: isNew ? prev.intendedOffice : '',
      intendedBase: isNew ? prev.intendedBase : '',
    }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    const win10Eligible = calcWin10(formData.processor, formData.generation, formData.ramGb);
    const win11Eligible = calcWin11(formData.processor, formData.generation, formData.ramGb, formData.ssdGb, formData.hddGb);
    const storageType = calcStorageType(formData.ssdGb, formData.hddGb);

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, win10Eligible, win11Eligible, storageType }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create equipment'); }
      setSuccess('Equipment record created successfully!');
      setTimeout(() => router.push('/equipment'), 1200);
    } catch (err: any) { setError(err.message || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  // ---------------------------------------------------------------------------
  // Multiple mode handlers
  // ---------------------------------------------------------------------------
  const updateRow = (id: string, updates: Partial<MultipleRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };

      // Auto-match old PC when intended office/base or issueMode changes
      if (updated.issueMode === 'replace-old' && !updated.oldPcId) {
        const matchedPc = notEligiblePcs.find(
          p => p.baseUnit === (updated.issuedBase || updated.intendedBase || updated.baseUnit) &&
               p.directorate === (updated.issuedOffice || updated.intendedOffice || updated.directorate)
        ) || notEligiblePcs.find(
          p => p.baseUnit === (updated.issuedBase || updated.intendedBase || updated.baseUnit)
        );

        if (matchedPc) {
          updated.oldPcId = matchedPc.id.toString();
        }
      }

      return updated;
    }));
  };

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    setRows(prev => [...prev, createDefaultRow(lastRow ? {
      baseUnit: lastRow.baseUnit,
      intendedBase: lastRow.intendedBase,
      issuedBase: lastRow.issuedBase,
      directorate: lastRow.directorate,
      intendedOffice: lastRow.intendedOffice,
      issuedOffice: lastRow.issuedOffice,
      equipmentType: lastRow.equipmentType,
      brandModel: lastRow.brandModel,
      processor: lastRow.processor,
      generation: lastRow.generation,
      ramGb: lastRow.ramGb,
      ssdGb: lastRow.ssdGb,
      hddGb: lastRow.hddGb,
      issueImmediately: lastRow.issueImmediately,
    } : undefined)]);
  };

  const duplicateRow = (index: number) => {
    const rowToCopy = rows[index];
    const newRow = createDefaultRow({
      ...rowToCopy,
      id: Math.random().toString(36).substring(2, 9),
      serialNo: '',
      oldPcId: '',
    });
    const updated = [...rows];
    updated.splice(index + 1, 0, newRow);
    setRows(updated);
  };

  const deleteRow = (index: number) => {
    if (rows.length === 1) {
      alert('Must keep at least 1 row in multiple mode');
      return;
    }
    setRows(rows.filter((_, i) => i !== index));
  };

  const toggleCommonIssueImmediately = (val: boolean) => {
    setCommonIssueImmediately(val);
    setRows(prev => prev.map(r => ({ ...r, issueImmediately: val })));
  };

  const handleMultipleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    try {
      const itemsPayload = rows.map((r, idx) => {
        const baseUnit = r.intendedBase || r.baseUnit;
        const directorate = r.intendedOffice || r.directorate;

        return {
          baseUnit,
          directorate,
          equipmentType: r.equipmentType,
          brandModel: r.brandModel || undefined,
          serialNo: r.serialNo || undefined,
          processor: r.processor,
          generation: r.generation,
          ramGb: r.ramGb,
          ssdGb: r.ssdGb,
          hddGb: r.hddGb,
          status: 'Svc',
          location: r.location || undefined,
          isNewPc: true,
          intendedOffice: directorate,
          intendedBase: baseUnit,
          adStatus: r.adStatus,
          adRemark: r.adRemark || undefined,
          // Issue immediately options
          issueImmediately: r.issueImmediately,
          issueMode: r.issueMode,
          issuedTo: r.issuedTo || undefined,
          issuedOffice: r.issuedOffice || directorate,
          issuedBase: r.issuedBase || baseUnit,
          oldPcId: r.issueMode === 'replace-old' && r.oldPcId ? parseInt(r.oldPcId) : undefined,
          withdrawnBy: r.withdrawnBy || undefined,
          withdrawalReason: r.withdrawalReason || undefined,
        };
      });

      const res = await fetch('/api/equipment/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          letterRef: commonLetterRef || undefined,
          letterAuthority: commonLetterAuthority || undefined,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to bulk create equipment');
      }

      const resultData = await res.json();
      setSuccess(`${resultData.count} Equipment record(s) created & processed successfully!`);
      setTimeout(() => router.push('/equipment'), 1500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during bulk save');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBaseUnit = async () => {
    if (!newBaseName.trim()) return;
    try {
      const res = await fetch('/api/base-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBaseName }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed to add Base Unit'); return; }
      setNewBaseName(''); setShowAddBaseModal(false); loadBaseUnits();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddOffice = async () => {
    const activeBaseName = formData.baseUnit;
    const activeBaseObject = customBaseUnits.find(b => b.name === activeBaseName);
    if (!newOfficeName.trim() || !activeBaseObject) {
      alert('Please select a valid Base Unit first');
      return;
    }
    try {
      const res = await fetch('/api/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOfficeName, baseUnitId: activeBaseObject.id }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error || 'Failed to add office'); return; }
      setNewOfficeName(''); setShowAddOfficeModal(false); await loadBaseUnits();
    } catch (err: any) { alert(err.message); }
  };

  const win10EligibleSingle = calcWin10(formData.processor, formData.generation, formData.ramGb);
  const win11EligibleSingle = calcWin11(formData.processor, formData.generation, formData.ramGb, formData.ssdGb, formData.hddGb);
  const storageTypeSingle = calcStorageType(formData.ssdGb, formData.hddGb);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/equipment" 
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Monitor className="w-6 h-6 text-sky-400" />
              Add Equipment
            </h1>
            <p className="text-sm text-slate-400">Register single item or bulk issue multiple PCs across offices/bases</p>
          </div>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setEntryMode('single')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              entryMode === 'single'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> Single Equipment
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('multiple')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              entryMode === 'multiple'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> Multiple Equipment (Bulk)
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Modals */}
      {showAddBaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" /> Add New Base / Unit
            </h3>
            <input
              type="text"
              placeholder="e.g. BAF Base Cox's Bazar"
              value={newBaseName}
              onChange={(e) => setNewBaseName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddBaseModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button type="button" onClick={handleAddBaseUnit} className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold">Save Base</button>
            </div>
          </div>
        </div>
      )}

      {showAddOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" /> Add New Office
            </h3>
            <input
              type="text"
              placeholder="e.g. Signal Section, Admin Branch..."
              value={newOfficeName}
              onChange={(e) => setNewOfficeName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddOfficeModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button type="button" onClick={handleAddOffice} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold">Save Office</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding custom Inventory Name (Store / Warehouse) */}
      {showAddInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" /> Add New Inventory / Store Name
            </h3>
            <input
              type="text"
              placeholder="e.g. Main IT Store, Air HQ Warehouse..."
              value={newInventoryName}
              onChange={(e) => setNewInventoryName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddInventoryModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button type="button" onClick={handleAddInventory} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold">Save Inventory Name</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding custom Section Name (Room / Placement) */}
      {showAddSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-400" /> Add New Section Name
            </h3>
            <input
              type="text"
              placeholder="e.g. CO Room, IT Section, Server Room..."
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAddSectionModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold">Cancel</button>
              <button type="button" onClick={handleAddSection} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Save Section Name</button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: SINGLE EQUIPMENT FORM                                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {entryMode === 'single' && (
        <form onSubmit={handleSingleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>1. Location, Base/Unit & Office Info</span>
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button type="button" onClick={() => setShowAddBaseModal(true)} className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Base
                  </button>
                )}
                <button type="button" onClick={() => setShowAddOfficeModal(true)} className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Office
                </button>
              </div>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!formData.isNewPc && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Base / Unit *</label>
                    <select
                      value={formData.baseUnit}
                      onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    >
                      {allBaseUnits.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Directorate / Office *</label>
                    <select
                      value={formData.directorate}
                      onChange={(e) => setFormData({ ...formData, directorate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                      required
                    >
                      {getOfficesForBase(formData.baseUnit).map((dir: string) => <option key={dir} value={dir}>{dir}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Equipment Type *</label>
                <select
                  value={formData.equipmentType}
                  onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  required
                >
                  {EQUIPMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Brand & Model</label>
                <input
                  type="text" placeholder="e.g. Dell OptiPlex 7080"
                  value={formData.brandModel} onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Serial Number</label>
                <input
                  type="text" placeholder="e.g. SN-987654321"
                  value={formData.serialNo} onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Is this a New PC / Equipment?</label>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input type="radio" name="isNewPc" checked={formData.isNewPc === true} onChange={() => handleIsNewPcChange(true)} className="w-4 h-4 text-sky-500" />
                    <span>Yes (New PC Issued)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                    <input type="radio" name="isNewPc" checked={formData.isNewPc === false} onChange={() => handleIsNewPcChange(false)} className="w-4 h-4 text-sky-500" />
                    <span>No (Existing Stock)</span>
                  </label>
                </div>
              </div>

              {formData.isNewPc && (
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-amber-950/30 border border-amber-600/30">
                  <div className="col-span-full text-[11px] font-bold text-amber-400 uppercase">Intended Target Office & Base Unit</div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Intended Base Unit</label>
                    <select
                      value={formData.intendedBase || formData.baseUnit}
                      onChange={(e) => setFormData(prev => ({ ...prev, intendedBase: e.target.value, baseUnit: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {allBaseUnits.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Intended Office / Directorate</label>
                    <select
                      value={formData.intendedOffice || formData.directorate}
                      onChange={(e) => setFormData(prev => ({ ...prev, intendedOffice: e.target.value, directorate: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      {getOfficesForBase(formData.intendedBase || formData.baseUnit).map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Hardware Specifications */}
          <div>
            <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              2. Hardware Specifications
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Processor</label>
                <select
                  value={formData.processor}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {PROCESSORS.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Generation</label>
                <select
                  value={formData.generation}
                  onChange={(e) => setFormData({ ...formData, generation: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {GENERATIONS.map((gen) => (
                    <option key={gen} value={gen}>{gen}th Gen</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">RAM (GB)</label>
                <select
                  value={formData.ramGb}
                  onChange={(e) => setFormData({ ...formData, ramGb: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {RAM_OPTIONS.map((ram) => (
                    <option key={ram} value={ram}>{ram} GB</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">SSD Capacity (GB)</label>
                <select
                  value={formData.ssdGb}
                  onChange={(e) => setFormData({ ...formData, ssdGb: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {SSD_OPTIONS.map((ssd) => (
                    <option key={ssd} value={ssd}>{ssd === 0 ? 'None' : `${ssd} GB`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">HDD Capacity (GB)</label>
                <select
                  value={formData.hddGb}
                  onChange={(e) => setFormData({ ...formData, hddGb: parseInt(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {HDD_OPTIONS.map((hdd) => (
                    <option key={hdd} value={hdd}>{hdd === 0 ? 'None' : `${hdd} GB`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Storage Summary</label>
                <div className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-sky-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  {storageTypeSingle}
                </div>
              </div>
            </div>
          </div>

          {/* Live OS Compatibility Calculator Banner */}
          <div className="p-4 rounded-xl bg-slate-850 border border-indigo-900/60 bg-gradient-to-r from-indigo-950/40 via-purple-950/40 to-slate-900">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Auto-Calculated OS Eligibility
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-300">Windows 10 Status:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  win10EligibleSingle === 'Eligible' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {win10EligibleSingle}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-xs text-slate-300">Windows 11 Status:</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  win11EligibleSingle.startsWith('Recommended') 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold'
                    : win11EligibleSingle === 'Eligible' 
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {win11EligibleSingle}
                </span>
              </div>
            </div>
          </div>

          {/* Active Directory Status & Remarks */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-4">
            <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              3. Active Directory (AD) Status & Verification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">AD Status *</label>
                <select
                  value={formData.adStatus}
                  onChange={(e) => setFormData({ ...formData, adStatus: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {AD_STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st} ({st === 'Joined' ? 'Active Directory Joined' : st === 'Not Joined' ? 'Not Joined AD' : 'Pending Verification'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">AD Remarks / Problem</label>
                <input
                  type="text"
                  placeholder="e.g. Network IP pending, Domain user not created..."
                  value={formData.adRemark}
                  onChange={(e) => setFormData({ ...formData, adRemark: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          </div>
          {/* Section 4: Operational Status, Inventory Name & Section Location */}
          <div>
            <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              4. Operational Status, Inventory &amp; Section Location
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Equipment Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  required
                  disabled={formData.isNewPc}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st} ({st === 'Svc' ? 'Serviceable' : st === 'U/S' ? 'Unserviceable' : st})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Issue Status</label>
                <select
                  value={formData.issueStatus}
                  onChange={(e) => setFormData({ ...formData, issueStatus: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                  disabled={formData.isNewPc}
                >
                  {ISSUE_STATUS_OPTIONS.map((iss) => (
                    <option key={iss} value={iss}>{iss}</option>
                  ))}
                </select>
              </div>

              {/* Separate Inventory Name Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-amber-400">
                    Inventory Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddInventoryModal(true)}
                    className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Inventory
                  </button>
                </div>
                <select
                  value={formData.inventoryName}
                  onChange={(e) => setFormData({ ...formData, inventoryName: e.target.value })}
                  className="w-full bg-slate-800 border border-amber-600/50 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {customInventoryNames.map((inv) => (
                    <option key={inv} value={inv}>{inv}</option>
                  ))}
                </select>
              </div>

              {/* Separate Section / Location Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-emerald-400">
                    Section Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddSectionModal(true)}
                    className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> Add Section
                  </button>
                </div>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-800 border border-emerald-600/50 rounded-xl px-3 py-2 text-sm text-white"
                >
                  {customSections.map((sec) => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Link href="/equipment" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium">Cancel</Link>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold text-sm">
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: MULTIPLE / BULK ISSUE & ADD FORM                                 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {entryMode === 'multiple' && (
        <form onSubmit={handleMultipleSubmit} className="space-y-6">
          
          {/* Common Authorization & Options Box */}
          <div className="bg-slate-900/90 border border-indigo-900/50 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
              <FileText className="w-4 h-4 text-amber-400" /> Common Letter &amp; Issue Options
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" /> Letter Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. AHQ/AD/1025/2026"
                  value={commonLetterRef}
                  onChange={(e) => setCommonLetterRef(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Letter Authority
                </label>
                <input
                  type="text"
                  placeholder="e.g. Air Cdre Md. Kamal"
                  value={commonLetterAuthority}
                  onChange={(e) => setCommonLetterAuthority(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 cursor-pointer w-full">
                  <input
                    type="checkbox"
                    checked={commonIssueImmediately}
                    onChange={(e) => toggleCommonIssueImmediately(e.target.checked)}
                    className="w-4 h-4 text-indigo-500 rounded border-slate-700 bg-slate-800 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-indigo-300 block">Issue Immediately?</span>
                    <span className="text-[10px] text-slate-400 block">Automatically generate issue records upon save</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Dynamic Rows Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" /> PC Items to Register ({rows.length})
              </h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Row
              </button>
            </div>

            {rows.map((row, idx) => {
              const currentOffices = getOfficesForBase(row.intendedBase || row.baseUnit);
              const notEligibleFiltered = notEligiblePcs.filter(
                p => p.baseUnit === (row.issuedBase || row.intendedBase || row.baseUnit)
              );

              return (
                <div 
                  key={row.id} 
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg transition-all space-y-3"
                >
                  {/* Row Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2.5 py-0.5 rounded-full">
                      Item #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => duplicateRow(idx)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors"
                        title="Duplicate specs to new row"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-400" /> Copy Row
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRow(idx)}
                        className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Grid fields for item */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {/* Base */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Base Unit *</label>
                      <select
                        value={row.intendedBase || row.baseUnit}
                        onChange={(e) => updateRow(row.id, { intendedBase: e.target.value, baseUnit: e.target.value, issuedBase: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-sky-500"
                        required
                      >
                        {allBaseUnits.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>

                    {/* Office */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Target Office / Directorate *</label>
                      <select
                        value={row.intendedOffice || row.directorate}
                        onChange={(e) => updateRow(row.id, { intendedOffice: e.target.value, directorate: e.target.value, issuedOffice: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-sky-500"
                        required
                      >
                        {currentOffices.map((o: string) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    {/* Equipment Type */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Type *</label>
                      <select
                        value={row.equipmentType}
                        onChange={(e) => updateRow(row.id, { equipmentType: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                        required
                      >
                        {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Issue Type Selector (Always Visible in Row) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-400 mb-1">Issue Mode / Replacement</label>
                      <select
                        value={row.issueMode}
                        onChange={(e) => updateRow(row.id, { issueMode: e.target.value as any })}
                        className="w-full bg-slate-800 border border-amber-600/50 rounded-xl px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="without-replace">Without Replace (Fresh New PC)</option>
                        <option value="replace-old">Replace Old PC (Linked Issue)</option>
                      </select>
                    </div>

                    {/* Serial No */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Serial No (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. SN-098765"
                        value={row.serialNo}
                        onChange={(e) => updateRow(row.id, { serialNo: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Brand / Model */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Brand / Model</label>
                      <input
                        type="text"
                        placeholder="e.g. Dell OptiPlex 7080"
                        value={row.brandModel}
                        onChange={(e) => updateRow(row.id, { brandModel: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Processor & Gen */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Processor & Gen</label>
                      <div className="flex gap-1">
                        <select
                          value={row.processor}
                          onChange={(e) => updateRow(row.id, { processor: e.target.value })}
                          className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                        >
                          {PROCESSORS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <select
                          value={row.generation}
                          onChange={(e) => updateRow(row.id, { generation: parseInt(e.target.value) })}
                          className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                        >
                          {GENERATIONS.map(g => <option key={g} value={g}>{g}th</option>)}
                        </select>
                      </div>
                    </div>

                    {/* RAM & SSD */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">RAM & SSD</label>
                      <div className="flex gap-1">
                        <select
                          value={row.ramGb}
                          onChange={(e) => updateRow(row.id, { ramGb: parseInt(e.target.value) })}
                          className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                        >
                          {RAM_OPTIONS.map(r => <option key={r} value={r}>{r}GB</option>)}
                        </select>
                        <select
                          value={row.ssdGb}
                          onChange={(e) => updateRow(row.id, { ssdGb: parseInt(e.target.value) })}
                          className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white"
                        >
                          {SSD_OPTIONS.map(s => <option key={s} value={s}>{s === 0 ? 'No SSD' : `${s}G SSD`}</option>)}
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Immediate Issue Details & Old PC Suggestions */}
                  {row.issueImmediately && (
                    <div className="mt-2 p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        
                        {/* Section / Issued To */}
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-indigo-300 mb-1">
                            Section / Issued To *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Signal Section, CO Room..."
                            value={row.issuedTo}
                            onChange={(e) => updateRow(row.id, { issuedTo: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                            required={row.issueImmediately}
                          />
                        </div>

                        {/* Old PC Selector (Automatic matching or manual choice) */}
                        {row.issueMode === 'replace-old' ? (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-amber-400 mb-1">
                              Select / Auto-Matched Old PC to Replace ({row.intendedOffice}) *
                            </label>
                            <select
                              value={row.oldPcId}
                              onChange={(e) => updateRow(row.id, { oldPcId: e.target.value })}
                              className="w-full bg-slate-800 border border-amber-600/50 rounded-xl px-2.5 py-1.5 text-xs text-white"
                              required={row.issueMode === 'replace-old'}
                            >
                              <option value="">-- Choose Old PC (Not Eligible) --</option>
                              {notEligibleFiltered.map(p => (
                                <option key={p.id} value={p.id}>
                                  SN #{p.sn} | {p.directorate} ({p.location || 'No Sec'}) | {p.brandModel || p.equipmentType} | {p.processor || 'Specs N/A'}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="col-span-2 flex items-center">
                            <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-xl w-full">
                              ✓ Fresh equipment issue without replacing any old equipment.
                            </span>
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 bg-slate-950/60 p-4 rounded-2xl">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            >
              <Plus className="w-4 h-4 text-sky-400" /> Add Another Item
            </button>

            <div className="flex items-center gap-3">
              <Link href="/equipment" className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Processing Bulk Save...' : `Save & Issue All (${rows.length} Items)`}
              </button>
            </div>
          </div>

        </form>
      )}

    </div>
  );
}
