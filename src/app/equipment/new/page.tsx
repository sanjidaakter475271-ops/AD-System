'use client';

import { useState, useEffect } from 'react';
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
import { Monitor, ArrowLeft, Save, Sparkles, CheckCircle2, AlertCircle, Plus, Building } from 'lucide-react';
import Link from 'next/link';

export default function NewEquipmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Base unit & office dynamic state
  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);
  const [showAddBaseModal, setShowAddBaseModal] = useState(false);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [newBaseName, setNewBaseName] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');

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
    location: '',
    issueStatus: ISSUE_STATUS_OPTIONS[0],
    isNewPc: false,
    adStatus: 'Pending',
    adRemark: '',
    win10Remark: '',
  });

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

  useEffect(() => {
    loadBaseUnits();
    if (user?.baseUnit && user?.role !== 'admin') {
      setFormData(prev => ({ ...prev, baseUnit: user.baseUnit }));
    }
  }, [user]);

  // Active base unit object from DB
  const activeBaseObject = customBaseUnits.find(b => b.name === formData.baseUnit);
  
  // Dynamic offices: if offices exist for this base in DB, use them; otherwise fallback to defaults or empty array
  const availableOffices = (activeBaseObject?.offices && activeBaseObject.offices.length > 0)
    ? activeBaseObject.offices.map((o: any) => o.name)
    : (formData.baseUnit === 'Air HQ' ? DIRECTORATES : ['General Office', 'Admin Branch']);

  // Update selected directorate when base unit changes or available offices change
  useEffect(() => {
    if (availableOffices.length > 0 && !availableOffices.includes(formData.directorate)) {
      setFormData(prev => ({ ...prev, directorate: availableOffices[0] }));
    }
  }, [formData.baseUnit, customBaseUnits]);

  const handleAddBaseUnit = async () => {
    if (!newBaseName.trim()) return;
    try {
      const res = await fetch('/api/base-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBaseName }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to add Base Unit');
        return;
      }
      setNewBaseName('');
      setShowAddBaseModal(false);
      loadBaseUnits();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddOffice = async () => {
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
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to add office');
        return;
      }
      setNewOfficeName('');
      setShowAddOfficeModal(false);
      await loadBaseUnits();
      setFormData(prev => ({ ...prev, directorate: newOfficeName.trim() }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const allBaseUnits = Array.from(new Set([
    ...BASE_UNITS,
    ...customBaseUnits.map(b => b.name)
  ]));

  const win10Eligible = calcWin10(formData.processor, formData.generation, formData.ramGb);
  const win11Eligible = calcWin11(formData.processor, formData.generation, formData.ramGb, formData.ssdGb, formData.hddGb);
  const storageType = calcStorageType(formData.ssdGb, formData.hddGb);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          win10Eligible,
          win11Eligible,
          storageType,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create equipment');
      }

      setSuccess('Equipment record created successfully!');
      setTimeout(() => {
        router.push('/equipment');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
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
              Add New Equipment
            </h1>
            <p className="text-sm text-slate-400">Register new IT asset in Active Directory & Inventory database</p>
          </div>
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

      {/* Modal for adding custom base unit (Admin Only) */}
      {showAddBaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-sky-400" />
              Add New Base / Unit (Admin Permission)
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Base / Unit Name</label>
              <input
                type="text"
                placeholder="e.g. BAF Base Cox's Bazar"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBaseModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddBaseUnit}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold"
              >
                Save Base / Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for adding new Office to Base Unit */}
      {showAddOfficeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Add New Office under {formData.baseUnit}
            </h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Office Name</label>
              <input
                type="text"
                placeholder="e.g. Flight Safety Office, Signal Branch..."
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddOfficeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddOffice}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save Office
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Section 1: Base / Unit & Directorate Info */}
        <div>
          <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>1. Location, Base/Unit & Office Info</span>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddBaseModal(true)}
                  className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 capitalize"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Base/Unit
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAddOfficeModal(true)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 capitalize"
              >
                <Plus className="w-3.5 h-3.5" /> Add Office to {formData.baseUnit}
              </button>
            </div>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Base / Unit *</label>
              {isAdmin ? (
                <select
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  required
                >
                  {allBaseUnits.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.baseUnit}
                  disabled
                  className="w-full bg-slate-800/50 border border-slate-700/60 rounded-xl px-3 py-2 text-sm text-slate-300 font-semibold cursor-not-allowed"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Directorate / Office *</label>
              <select
                value={formData.directorate}
                onChange={(e) => setFormData({ ...formData, directorate: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                {availableOffices.map((dir: string) => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Equipment Type *</label>
              <select
                value={formData.equipmentType}
                onChange={(e) => setFormData({ ...formData, equipmentType: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                {EQUIPMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Brand & Model</label>
              <input
                type="text"
                placeholder="e.g. Dell OptiPlex 7080"
                value={formData.brandModel}
                onChange={(e) => setFormData({ ...formData, brandModel: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Serial Number</label>
              <input
                type="text"
                placeholder="e.g. SN-987654321"
                value={formData.serialNo}
                onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Is this a New PC / Equipment?</label>
              <div className="flex items-center gap-4 py-2">
                <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="isNewPc"
                    checked={formData.isNewPc === true}
                    onChange={() => setFormData({ ...formData, isNewPc: true })}
                    className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                  />
                  <span>Yes (New PC Issued)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="isNewPc"
                    checked={formData.isNewPc === false}
                    onChange={() => setFormData({ ...formData, isNewPc: false })}
                    className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                  />
                  <span>No (Existing Stock)</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Active Directory Status & Remarks */}
        <div className="p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-4">
          <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Active Directory (AD) Status & Verification
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">AD Status *</label>
              <select
                value={formData.adStatus}
                onChange={(e) => setFormData({ ...formData, adStatus: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {AD_STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>{st} ({st === 'Joined' ? 'Active Directory Joined' : st === 'Not Joined' ? 'Not Joined AD' : 'Pending Verification'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">AD Remarks / Problem (Why AD not done?)</label>
              <input
                type="text"
                placeholder="e.g. Network IP pending, Domain user not created..."
                value={formData.adRemark}
                onChange={(e) => setFormData({ ...formData, adRemark: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

          </div>
        </div>

        {/* Section 3: Hardware Specifications */}
        <div>
          <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            3. Hardware Specifications
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
                {storageType}
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
                win10Eligible.includes('Eligible') 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {win10Eligible}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-300">Windows 11 Status:</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                win11Eligible.includes('Recommended') 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold'
                  : win11Eligible.includes('Eligible') 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {win11Eligible}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Operational Status & Location */}
        <div>
          <h2 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
            4. Operational Status & Location
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Equipment Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {ISSUE_STATUS_OPTIONS.map((iss) => (
                  <option key={iss} value={iss}>{iss}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Physical Location / Room</label>
              <input
                type="text"
                placeholder="e.g. Room 302, Building A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/equipment"
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Equipment'}
          </button>
        </div>

      </form>
    </div>
  );
}
