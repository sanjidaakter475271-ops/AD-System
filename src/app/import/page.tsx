'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Database,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ExcelImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Download Sample Excel Template
  const downloadTemplate = () => {
    const sampleRows = [
      {
        SN: 101,
        Directorate: 'ADOC',
        Type: 'Desktop',
        BrandModel: 'Dell OptiPlex 7090',
        SerialNo: 'SN-DELL-101',
        Processor: 'I7',
        Generation: 11,
        RAM_GB: 16,
        SSD_GB: 512,
        HDD_GB: 0,
        Status: 'Svc',
        Location: 'HQ Room 102'
      },
      {
        SN: 102,
        Directorate: 'Air HQ (U)',
        Type: 'Laptop',
        BrandModel: 'HP ProBook 450 G8',
        SerialNo: 'SN-HP-102',
        Processor: 'I5',
        Generation: 11,
        RAM_GB: 8,
        SSD_GB: 256,
        HDD_GB: 0,
        Status: 'Svc',
        Location: 'Command Section'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'Air_HQ_Equipment_Import_Template.xlsx');
  };

  // Handle File Upload and Read with SheetJS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          throw new Error('The selected Excel file contains no data.');
        }

        // Map flexible Excel column names to internal fields
        const formatted = rawJson.map((row, idx) => ({
          sn: row.SN || row.sn || row.Serial || (idx + 1),
          directorate: row.Directorate || row.directorate || row.Dir || 'General',
          equipmentType: row.Type || row.type || row['Equipment Type'] || row.equipmentType || 'Desktop',
          brandModel: row.BrandModel || row.model || row['Brand & Model'] || row.brandModel || null,
          serialNo: row.SerialNo || row.serial || row['Serial No'] || row.serialNo || null,
          processor: row.Processor || row.processor || null,
          generation: row.Generation || row.generation || row.Gen ? parseInt(row.Generation || row.generation || row.Gen) : null,
          ramGb: row.RAM_GB || row.ram || row.RAM ? parseInt(row.RAM_GB || row.ram || row.RAM) : null,
          ssdGb: row.SSD_GB || row.ssd || row.SSD ? parseInt(row.SSD_GB || row.ssd || row.SSD) : 0,
          hddGb: row.HDD_GB || row.hdd || row.HDD ? parseInt(row.HDD_GB || row.hdd || row.HDD) : 0,
          status: row.Status || row.status || 'Svc',
          location: row.Location || row.location || null,
        }));

        setParsedData(formatted);
      } catch (err: any) {
        setError(err.message || 'Failed to parse Excel file.');
        setParsedData([]);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(uploadedFile);
  };

  // Submit to Database API
  const handleImportSubmit = async () => {
    if (parsedData.length === 0) return;

    setImporting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/equipment/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedData }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }

      const result = await res.json();
      setSuccess(result.message || 'Import successful!');
      setTimeout(() => {
        router.push('/equipment');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
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
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              Excel Data Import (ইমপোর্ট)
            </h1>
            <p className="text-sm text-slate-400">Import bulk equipment data directly from .xlsx, .xls or .csv spreadsheet</p>
          </div>
        </div>

        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-sm"
        >
          <Download className="w-4 h-4 text-sky-400" />
          Download Sample Template (.xlsx)
        </button>
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

      {/* File Upload Zone */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <Upload className="w-8 h-8" />
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-white">Upload Equipment Excel File</h3>
          <p className="text-xs text-slate-400 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV spreadsheet files</p>
        </div>

        <div className="flex justify-center">
          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Select Excel File</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {file && (
          <p className="text-xs text-emerald-400 font-medium">
            Selected file: <span className="underline">{file.name}</span>
          </p>
        )}
      </div>

      {/* Preview Section */}
      {parsedData.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Parsed Records Preview ({parsedData.length} items found)
              </h2>
              <p className="text-xs text-slate-400">Review data below before saving to Air HQ database</p>
            </div>

            <button
              onClick={handleImportSubmit}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all"
            >
              <Database className="w-4 h-4" />
              {importing ? 'Importing to Database...' : 'Upload & Save to Database'}
            </button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] sticky top-0">
                <tr>
                  <th className="p-3">SN</th>
                  <th className="p-3">Directorate</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Brand & Model</th>
                  <th className="p-3">Serial No</th>
                  <th className="p-3">Processor</th>
                  <th className="p-3">Gen</th>
                  <th className="p-3">RAM</th>
                  <th className="p-3">Storage</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parsedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-bold text-emerald-400">#{item.sn}</td>
                    <td className="p-3 font-medium text-white">{item.directorate}</td>
                    <td className="p-3">{item.equipmentType}</td>
                    <td className="p-3 text-slate-300">{item.brandModel || '—'}</td>
                    <td className="p-3 font-mono text-slate-400">{item.serialNo || '—'}</td>
                    <td className="p-3">{item.processor || '—'}</td>
                    <td className="p-3">{item.generation ? `${item.generation}th` : '—'}</td>
                    <td className="p-3">{item.ramGb ? `${item.ramGb}GB` : '—'}</td>
                    <td className="p-3">
                      {item.ssdGb > 0 ? `${item.ssdGb}GB SSD` : ''} {item.hddGb > 0 ? `${item.hddGb}GB HDD` : ''}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px]">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
