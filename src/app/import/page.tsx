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
  Sparkles,
  RefreshCw,
  Tag
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
        'PC Condition': 'New', // New or Existing
        IntendedBase: 'Air HQ',
        IntendedOffice: 'ADOC',
        Type: 'Desktop',
        BrandModel: 'Dell OptiPlex 7090',
        SerialNo: 'SN-DELL-101',
        Processor: 'I7',
        Generation: 11,
        RAM_GB: 16,
        SSD_GB: 512,
        HDD_GB: 0,
        Status: 'Svc',
        Location: 'HQ Store'
      },
      {
        SN: 102,
        'PC Condition': 'Existing',
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
        const formatted = rawJson
          .filter((row) => {
            const snVal = row['S/N'] || row.SN || row.sn || row.Serial;
            const dteVal = row.Dte || row.Directorate || row.directorate || row.IntendedOffice || row.Office;
            const typeVal = row['Types of Eqpt'] || row.Type || row.type;
            return snVal || dteVal || typeVal;
          })
          .map((row, idx) => {
            const parseNum = (val: any) => {
              if (!val || typeof val === 'object' || String(val).includes('[object')) return 0;
              const strVal = String(val).trim();
              if (strVal.toLowerCase().includes('tb')) {
                const match = strVal.match(/([\d.]+)/);
                return match ? Math.round(parseFloat(match[1]) * 1024) : 0;
              }
              const match = strVal.match(/([\d.]+)/);
              return match ? parseInt(match[1]) : 0;
            };

            const parseGen = (val: any) => {
              if (!val) return null;
              const str = String(val);
              const match = str.match(/(\d+)(?:st|nd|rd|th)?\s*gen/i) || str.match(/gen\s*(\d+)/i) || str.match(/(\d+)/);
              return match ? parseInt(match[1]) : null;
            };

            const cleanString = (val: any) => {
              if (!val || typeof val === 'object' || String(val).includes('[object')) return null;
              const str = String(val).trim();
              if (['na', 'n/a', 'u/s', 'none', '-'].includes(str.toLowerCase())) return null;
              return str;
            };

            const rawSn = row['S/N'] || row.SN || row.sn || row.Serial;
            const snParsed = parseNum(rawSn);

            const rawCpu = row.CPU || row.Processor || row.processor || row['Processor, RAM & HDD/SSD'];
            const processor = cleanString(rawCpu);
            const generation = parseGen(row.Generation || row.generation || row.Gen || rawCpu);

            const ramGb = parseNum(row.RAM || row.RAM_GB || row.ram);
            const hddGb = parseNum(row.HDD || row.HDD_GB || row.hdd);
            const ssdGb = parseNum(row.SSD || row.SSD_GB || row.ssd);

            const baseUnit = cleanString(row.Base || row['Base Unit'] || row.baseUnit || row.base_unit || row.IntendedBase) || 'Air HQ';
            const directorate = cleanString(row.Dte || row.Directorate || row.directorate || row.Dir || row.IntendedOffice || row.Office) || 'General';
            const location = cleanString(row['Present Loc'] || row.Location || row.location);

            // PC Condition Detection (New vs Existing)
            const typeCol = String(
              row['PC Condition'] || row['PC_Condition'] || row.Condition || row['New or Existing'] || row['New/Existing'] || row.IsNew || row.isNewPc || row.Type || row.type || ''
            ).trim().toLowerCase();

            let isNewPc = false;
            if (['new', 'brand new', 'fresh', 'yes', 'true', '1'].includes(typeCol)) {
              isNewPc = true;
            } else if (['existing', 'old', 'issued', 'no', 'false', '0'].includes(typeCol)) {
              isNewPc = false;
            } else {
              // Fallback check on remarks if condition column is missing
              const remarks = String(row.Remarks || row.remarks || '').toLowerCase();
              if (remarks.includes('fresh issue') || remarks.includes('new pc')) {
                isNewPc = true;
              }
            }

            // AD Status mapping (e.g. 'ok' -> 'Joined', 'pending' -> 'Pending')
            const rawAdStatus = String(row['AD Status'] || row.adStatus || row.ad_status || '').trim().toLowerCase();
            let adStatus = 'Pending';
            if (['ok', 'joined', 'yes', 'true'].includes(rawAdStatus)) {
              adStatus = 'Joined';
            } else if (['not joined', 'failed', 'no'].includes(rawAdStatus)) {
              adStatus = 'Not Joined';
            }

            return {
              sn: snParsed || (idx + 1),
              isNewPc,
              baseUnit,
              directorate,
              intendedBase: baseUnit,
              intendedOffice: directorate,
              equipmentType: cleanString(row['Types of Eqpt'] || row.Type || row.type || row['Equipment Type'] || row.equipmentType) || 'Desktop',
              brandModel: cleanString(row['Brand & Model'] || row.BrandModel || row.model || row.brandModel),
              serialNo: cleanString(row['Serial No'] || row.SerialNo || row.serial || row.serialNo),
              processor,
              generation,
              ramGb: ramGb > 0 ? ramGb : null,
              ssdGb,
              hddGb,
              status: cleanString(row.Status || row.status) || 'Svc',
              location, // Optional suggestion for New PCs
              issueStatus: isNewPc ? 'Not Issued' : (cleanString(row.IssueStatus || row.issueStatus) || 'Issued'),
              adStatus,
              win10Remark: cleanString(row['Win 10 RMK'] || row.win10Remark),
            };
          });

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

  // Toggle IsNewPc per row in preview table
  const toggleRowCondition = (idx: number) => {
    setParsedData(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const nextIsNew = !item.isNewPc;
      return {
        ...item,
        isNewPc: nextIsNew,
        issueStatus: nextIsNew ? 'Not Issued' : 'Issued',
      };
    }));
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
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
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
              Smart Excel &amp; CSV Import
            </h1>
            <p className="text-sm text-slate-400">Import bulk equipment data with automatic condition detection (New vs Existing Stock)</p>
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
          <h3 className="text-lg font-bold text-white">Upload Equipment Excel / CSV File</h3>
          <p className="text-xs text-slate-400 mt-1">
            Supports columns: <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">PC Condition</code> (New / Existing), <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">SN</code>, <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">Directorate</code>, <code className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">Type</code>, Specs, etc.
          </p>
        </div>

        <div className="flex justify-center">
          <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all">
            <FileSpreadsheet className="w-5 h-5" />
            <span>Select Excel / CSV File</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Parsed Records Preview ({parsedData.length} items found)
              </h2>
              <p className="text-xs text-slate-400">
                Tip: Click on <span className="text-emerald-400 font-semibold">[NEW PC]</span> or <span className="text-slate-400 font-semibold">[EXISTING]</span> badges to switch condition per row before uploading.
              </p>
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
              <thead className="bg-slate-800 text-slate-400 uppercase font-semibold text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="p-3">SN</th>
                  <th className="p-3">PC Condition (Click to Toggle)</th>
                  <th className="p-3">Base Unit</th>
                  <th className="p-3">Directorate / Intended Office</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Brand &amp; Model</th>
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
                    
                    {/* Interactive Condition Toggle Badge */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => toggleRowCondition(idx)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                          item.isNewPc
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                        }`}
                        title="Click to toggle between New PC and Existing Stock"
                      >
                        <Tag className="w-3 h-3" />
                        {item.isNewPc ? 'NEW PC (Not Issued)' : 'EXISTING STOCK'}
                      </button>
                    </td>

                    <td className="p-3 text-slate-300">{item.baseUnit}</td>
                    <td className="p-3 font-medium text-white">{item.directorate}</td>
                    <td className="p-3 font-semibold text-indigo-300">{item.equipmentType}</td>
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
