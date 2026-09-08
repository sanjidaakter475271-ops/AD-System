'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Monitor, 
  PlusCircle, 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Edit, 
  Trash2,
  RefreshCw,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Save
} from 'lucide-react';
import { BASE_UNITS, DIRECTORATES, EQUIPMENT_TYPES, STATUS_OPTIONS, AD_STATUS_OPTIONS } from '@/lib/constants';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [customBaseUnits, setCustomBaseUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedAdStatus, setSelectedAdStatus] = useState('');
  const [selectedNewPcFilter, setSelectedNewPcFilter] = useState('');

  // Quick edit state
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [editingAdStatus, setEditingAdStatus] = useState('');
  const [editingAdRemark, setEditingAdRemark] = useState('');

  const loadBaseUnits = async () => {
    try {
      const res = await fetch('/api/base-units');
      if (res.ok) {
        const data = await res.json();
        setCustomBaseUnits(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEquipment = async () => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedBaseUnit) query.append('baseUnit', selectedBaseUnit);
      if (selectedDirectorate) query.append('directorate', selectedDirectorate);
      if (selectedStatus) query.append('status', selectedStatus);
      if (selectedType) query.append('type', selectedType);
      if (selectedAdStatus) query.append('adStatus', selectedAdStatus);
      if (selectedNewPcFilter) query.append('isNewPc', selectedNewPcFilter);

      const res = await fetch(`/api/equipment?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to load equipment list');
      const data = await res.json();
      setEquipment(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching equipment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseUnits();
    fetchEquipment();
  }, [selectedBaseUnit, selectedDirectorate, selectedStatus, selectedType, selectedAdStatus, selectedNewPcFilter]);

  // Combine static and DB base units
  const allBaseUnits = Array.from(new Set([
    ...BASE_UNITS,
    ...customBaseUnits.map(b => b.name)
  ]));

  // Active base unit object from DB
  const activeBaseObject = customBaseUnits.find(b => b.name === selectedBaseUnit);
  const availableOffices = (activeBaseObject?.offices && activeBaseObject.offices.length > 0)
    ? activeBaseObject.offices.map((o: any) => o.name)
    : (selectedBaseUnit === 'Air HQ' || !selectedBaseUnit ? DIRECTORATES : []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEquipment();
  };

  const handleQuickSaveAd = async (id: number) => {
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adStatus: editingAdStatus, adRemark: editingAdRemark }),
      });
      if (!res.ok) throw new Error('Failed to update AD status');
      setEquipment(equipment.map(item => item.id === id ? { ...item, adStatus: editingAdStatus, adRemark: editingAdRemark } : item));
      setEditingAdId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this equipment item?')) return;
    try {
      const res = await fetch(`/api/equipment/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
      setEquipment(equipment.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-indigo-400" />
            Equipment & Active Directory Inventory
          </h1>
          <p className="text-sm text-slate-400">Total {equipment.length} items registered across all Base/Units & Directorates</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Import Excel
          </Link>

          <Link
            href="/export"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold transition-all"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            Export Reports
          </Link>

          <Link
            href="/equipment/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Add Equipment
          </Link>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by SN, Base Unit, Directorate, Model, Serial, AD status, AD remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60">
            <select
              value={selectedBaseUnit}
              onChange={(e) => {
                setSelectedBaseUnit(e.target.value);
                setSelectedDirectorate('');
              }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Base / Units</option>
              {allBaseUnits.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <select
              value={selectedDirectorate}
              onChange={(e) => setSelectedDirectorate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Offices / Directorates</option>
              {availableOffices.map((dir: string) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Types</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={selectedAdStatus}
              onChange={(e) => setSelectedAdStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All AD Statuses</option>
              {AD_STATUS_OPTIONS.map((ad) => (
                <option key={ad} value={ad}>AD: {ad}</option>
              ))}
            </select>

            <select
              value={selectedNewPcFilter}
              onChange={(e) => setSelectedNewPcFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">New / Existing Filter</option>
              <option value="true">New PC Only</option>
              <option value="false">Existing Only</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={fetchEquipment}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Refresh List"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </form>
      </div>

      {/* Equipment Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Loading equipment inventory...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
        ) : equipment.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Monitor className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No equipment found matching criteria</p>
            <p className="text-xs text-slate-500">Try clearing filters or add a new record.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">SN</th>
                  <th className="p-3.5">Base & Directorate</th>
                  <th className="p-3.5">Type & PC Status</th>
                  <th className="p-3.5">Brand / Serial</th>
                  <th className="p-3.5">Specs / Storage</th>
                  <th className="p-3.5">AD Status & Remarks</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Win10 / Win11 Recommendation</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {equipment.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-sky-400">#{item.sn}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{item.directorate}</div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-500" />
                        {item.baseUnit || 'Air HQ'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-indigo-300">{item.equipmentType}</div>
                      {item.isNewPc && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                          NEW PC
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-200">{item.brandModel || '—'}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.serialNo || '—'}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <div>{item.processor ? `${item.processor} (${item.generation || '?'}th Gen)` : '—'}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.ramGb ? `${item.ramGb}GB RAM` : ''} 
                        <span className="text-slate-500 ml-1">({item.storageType || 'N/A'})</span>
                      </div>
                    </td>
                    <td className="p-3.5 space-y-1">
                      {editingAdId === item.id ? (
                        <div className="space-y-1 bg-slate-800 p-2 rounded-lg border border-slate-700 min-w-[140px]">
                          <select
                            value={editingAdStatus}
                            onChange={(e) => setEditingAdStatus(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            {AD_STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                          <input
                            type="text"
                            placeholder="Add remark..."
                            value={editingAdRemark}
                            onChange={(e) => setEditingAdRemark(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <div className="flex gap-1.5 justify-end pt-1">
                            <button 
                              type="button" 
                              onClick={() => setEditingAdId(null)} 
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleQuickSaveAd(item.id)} 
                              className="text-[10px] px-2 py-0.5 rounded bg-sky-600 text-white font-bold hover:bg-sky-500 flex items-center gap-1"
                            >
                              <Save className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setEditingAdId(item.id);
                            setEditingAdStatus(item.adStatus || 'Pending');
                            setEditingAdRemark(item.adRemark || '');
                          }}
                          title="Click to quick edit AD status & remarks"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] hover:opacity-80 transition-all cursor-pointer ${
                            item.adStatus === 'Joined'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.adStatus === 'Not Joined'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {item.adStatus === 'Joined' && <CheckCircle2 className="w-3 h-3" />}
                          {item.adStatus === 'Not Joined' && <XCircle className="w-3 h-3" />}
                          {item.adStatus === 'Pending' && <AlertCircle className="w-3 h-3" />}
                          AD: {item.adStatus || 'Pending'}
                        </button>
                      )}
                      {item.adRemark && editingAdId !== item.id && (
                        <div className="text-[10px] text-rose-300 italic max-w-xs truncate" title={item.adRemark}>
                          Reason: {item.adRemark}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.status === 'Svc' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 space-y-1">
                      <div className="text-[10px]">
                        <span className="text-slate-500">W10: </span>
                        <span className={item.win10Eligible?.includes('Eligible') ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                          {item.win10Eligible || 'N/A'}
                        </span>
                      </div>
                      <div className="text-[10px]">
                        <span className="text-slate-500">W11: </span>
                        <span className={
                          item.win11Eligible?.includes('Recommended')
                            ? 'text-emerald-300 font-extrabold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 inline-block'
                            : item.win11Eligible?.includes('Eligible')
                              ? 'text-blue-400 font-semibold'
                              : 'text-rose-400'
                        }>
                          {item.win11Eligible || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/equipment/${item.id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-800 text-sky-400 hover:bg-sky-500/20 hover:text-sky-300 transition-colors"
                          title="Edit Equipment"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                          title="Delete Equipment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
}
