'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Monitor, Filter, Edit, Trash2, Building, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { BASE_UNITS, DIRECTORATES, EQUIPMENT_TYPES, AD_STATUS_OPTIONS, STATUS_OPTIONS } from '@/lib/constants';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [selectedBaseUnit, setSelectedBaseUnit] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedAdStatus, setSelectedAdStatus] = useState('');
  const [selectedNewPcFilter, setSelectedNewPcFilter] = useState('');
  const [selectedWin11Filter, setSelectedWin11Filter] = useState('');

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const performSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const searchUrlParams = new URLSearchParams();
      if (query.trim()) searchUrlParams.append('search', query.trim());
      if (selectedBaseUnit) searchUrlParams.append('baseUnit', selectedBaseUnit);
      if (selectedDirectorate) searchUrlParams.append('directorate', selectedDirectorate);
      if (selectedType) searchUrlParams.append('type', selectedType);
      if (selectedAdStatus) searchUrlParams.append('adStatus', selectedAdStatus);
      if (selectedNewPcFilter) searchUrlParams.append('isNewPc', selectedNewPcFilter);
      if (selectedWin11Filter) searchUrlParams.append('win11Eligible', selectedWin11Filter);

      const res = await fetch(`/api/equipment?${searchUrlParams.toString()}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch();
  }, [selectedBaseUnit, selectedDirectorate, selectedType, selectedAdStatus, selectedNewPcFilter, selectedWin11Filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-amber-400" />
            Optimized Active Directory & Equipment Search
          </h1>
          <p className="text-sm text-slate-400">Multi-criteria filtering across Base/Units, AD status, New PCs, specs, and Win 11 recommendations</p>
        </div>
      </div>

      {/* Search Input & Advanced Filters Box */}
      <form onSubmit={handleSubmit} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by serial number, brand model, directorate, processor, AD remarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-28 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all"
          >
            Search
          </button>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Base / Unit</label>
            <select
              value={selectedBaseUnit}
              onChange={(e) => setSelectedBaseUnit(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Bases/Units</option>
              {BASE_UNITS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Directorate</label>
            <select
              value={selectedDirectorate}
              onChange={(e) => setSelectedDirectorate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Directorates</option>
              {DIRECTORATES.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">AD Status</label>
            <select
              value={selectedAdStatus}
              onChange={(e) => setSelectedAdStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All AD Statuses</option>
              {AD_STATUS_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">PC Age / Type</label>
            <select
              value={selectedNewPcFilter}
              onChange={(e) => setSelectedNewPcFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All PC Types</option>
              <option value="true">New PC Only</option>
              <option value="false">Existing Stock Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Win 11 Status</label>
            <select
              value={selectedWin11Filter}
              onChange={(e) => setSelectedWin11Filter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Win 11 Statuses</option>
              <option value="Recommended for Win 11">Recommended for Win 11</option>
              <option value="Eligible">Eligible</option>
              <option value="Not Eligible">Not Eligible</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Equipment Category</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Categories</option>
              {EQUIPMENT_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Search Results Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            Searching active directory & inventory database...
          </div>
        ) : searched && results.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Search className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-base font-semibold text-slate-300">No equipment found matching criteria</p>
            <p className="text-xs text-slate-500">Try broadening your filters or searching by serial number.</p>
          </div>
        ) : results.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="p-4 bg-slate-800/60 border-b border-slate-800 text-xs font-semibold text-amber-400 flex items-center justify-between">
              <span>Found {results.length} matching equipment records:</span>
            </div>
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3.5">SN</th>
                  <th className="p-3.5">Base Unit & Directorate</th>
                  <th className="p-3.5">Type & PC Status</th>
                  <th className="p-3.5">Brand / Serial</th>
                  <th className="p-3.5">Processor / Storage</th>
                  <th className="p-3.5">AD Status & Remarks</th>
                  <th className="p-3.5">Win 11 Recommendation</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-amber-400">#{item.sn}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-white">{item.directorate}</div>
                      <div className="text-[10px] text-slate-400">{item.baseUnit || 'Air HQ'}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-indigo-300 font-medium">{item.equipmentType}</div>
                      {item.isNewPc && (
                        <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">
                          NEW PC
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div>{item.brandModel || '—'}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.serialNo || '—'}</div>
                    </td>
                    <td className="p-3.5 text-slate-300">
                      <div>{item.processor ? `${item.processor} (${item.generation || '?'}th Gen)` : '—'}</div>
                      <div className="text-[10px] text-slate-400">{item.storageType || 'N/A'}</div>
                    </td>
                    <td className="p-3.5 space-y-1">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                        item.adStatus === 'Joined'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.adStatus === 'Not Joined'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        AD: {item.adStatus || 'Pending'}
                      </span>
                      {item.adRemark && (
                        <div className="text-[10px] text-rose-300 italic max-w-xs truncate" title={item.adRemark}>
                          Reason: {item.adRemark}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={
                        item.win11Eligible?.includes('Recommended')
                          ? 'text-emerald-300 font-extrabold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 inline-block text-[10px]'
                          : item.win11Eligible?.includes('Eligible')
                            ? 'text-blue-400 font-semibold text-[10px]'
                            : 'text-rose-400 text-[10px]'
                      }>
                        {item.win11Eligible || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/equipment/${item.id}/edit`}
                        className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
