'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  Header, 
  Footer,
  AlignmentType,
  HeadingLevel,
  BorderStyle
} from 'docx';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  ArrowLeft, 
  Filter, 
  CheckCircle2, 
  Sparkles,
  Building2,
  Printer
} from 'lucide-react';
import Link from 'next/link';
import { DIRECTORATES, EQUIPMENT_TYPES, STATUS_OPTIONS } from '@/lib/constants';

export default function ExportPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);

  // Filters
  const [selectedDirectorate, setSelectedDirectorate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const fetchFilteredData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (selectedDirectorate) query.append('directorate', selectedDirectorate);
      if (selectedStatus) query.append('status', selectedStatus);
      if (selectedType) query.append('type', selectedType);

      const res = await fetch(`/api/equipment?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      setEquipment(data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredData();
  }, [selectedDirectorate, selectedStatus, selectedType]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    setExportingExcel(true);
    try {
      const excelRows = equipment.map((item) => ({
        SN: item.sn,
        Directorate: item.directorate,
        'Equipment Type': item.equipmentType,
        'Brand & Model': item.brandModel || 'N/A',
        'Serial Number': item.serialNo || 'N/A',
        Processor: item.processor || 'N/A',
        Generation: item.generation ? `${item.generation}th Gen` : 'N/A',
        'RAM (GB)': item.ramGb || 'N/A',
        'SSD (GB)': item.ssdGb || 0,
        'HDD (GB)': item.hddGb || 0,
        'Storage Type': item.storageType || 'N/A',
        Status: item.status,
        Location: item.location || 'N/A',
        'Win 10 Status': item.win10Eligible || 'N/A',
        'Win 11 Status': item.win11Eligible || 'N/A',
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipment Inventory');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Air_HQ_Equipment_Inventory_${dateStr}.xlsx`);
    } catch (err) {
      alert('Error exporting Excel file');
    } finally {
      setExportingExcel(false);
    }
  };

  // Export to Word (.docx)
  const handleExportWord = async () => {
    setExportingWord(true);
    try {
      const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Build Document Table Header
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'SN', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Directorate', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Type', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Model / Serial', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Specs', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Status', style: 'TableHeader' })] }),
            new TableCell({ children: [new Paragraph({ text: 'Win10 / 11', style: 'TableHeader' })] }),
          ]
        }),
        ...equipment.map((item) =>
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: `#${item.sn}` })] }),
              new TableCell({ children: [new Paragraph({ text: item.directorate || '' })] }),
              new TableCell({ children: [new Paragraph({ text: item.equipmentType || '' })] }),
              new TableCell({ children: [new Paragraph({ text: `${item.brandModel || ''} (${item.serialNo || 'N/A'})` })] }),
              new TableCell({ children: [new Paragraph({ text: `${item.processor || ''} / ${item.ramGb || ''}GB RAM` })] }),
              new TableCell({ children: [new Paragraph({ text: item.status || '' })] }),
              new TableCell({ children: [new Paragraph({ text: `W10: ${item.win10Eligible || ''}` })] }),
            ]
          })
        )
      ];

      const doc = new Document({
        styles: {
          paragraphStyles: [
            {
              id: 'TableHeader',
              name: 'Table Header',
              run: { bold: true, color: '1E3A8A', size: 18 }
            }
          ]
        },
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                text: 'BANGLADESH AIR FORCE',
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.TITLE,
              }),
              new Paragraph({
                text: 'AIR HEADQUARTERS EQUIPMENT INVENTORY REPORT',
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_2,
              }),
              new Paragraph({
                text: `Generated Date: ${today} | Total Assets: ${equipment.length}`,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({ text: '' }), // Spacer
              new Table({
                rows: tableRows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
              new Paragraph({ text: '' }),
              new Paragraph({
                text: 'Confidential — For Official Air HQ Directorate Use Only',
                alignment: AlignmentType.CENTER,
              })
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Air_HQ_Equipment_Report_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Word export error:', err);
      alert('Error creating Word document report');
    } finally {
      setExportingWord(false);
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
              <FileText className="w-6 h-6 text-blue-400" />
              Export & Convert Records (এক্সপোর্ট/কনভার্ট)
            </h1>
            <p className="text-sm text-slate-400">Generate formatted Excel spreadsheets (.xlsx) or Word documents (.docx)</p>
          </div>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Excel Export Card */}
        <div className="bg-slate-900/90 border border-emerald-800/40 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Convert to Excel (.xlsx)</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Export all selected inventory records into a structured Microsoft Excel spreadsheet with full specifications, serial numbers, and OS status.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            disabled={exportingExcel || loading || equipment.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            {exportingExcel ? 'Generating Excel...' : `Export ${equipment.length} Items to Excel`}
          </button>
        </div>

        {/* Word Export Card */}
        <div className="bg-slate-900/90 border border-blue-800/40 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Convert to Word (.docx)</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate an official Air HQ printable report in Microsoft Word format, pre-styled with headers, date, asset count, and formatted tables.
            </p>
          </div>

          <button
            onClick={handleExportWord}
            disabled={exportingWord || loading || equipment.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            <Printer className="w-4 h-4" />
            {exportingWord ? 'Generating Word Doc...' : `Export ${equipment.length} Items to Word`}
          </button>
        </div>

      </div>

      {/* Filter Toolbar for Export Selection */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-sky-400 uppercase tracking-wider border-b border-slate-800 pb-3">
          <Filter className="w-4 h-4" />
          Filter Records Before Exporting ({equipment.length} items ready)
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Directorate</label>
            <select
              value={selectedDirectorate}
              onChange={(e) => setSelectedDirectorate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Directorates</option>
              {DIRECTORATES.map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Equipment Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Equipment Types</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}
