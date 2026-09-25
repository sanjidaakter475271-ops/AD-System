import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';

export async function POST(request: Request) {
  try {
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No valid data provided for import' }, { status: 400 });
    }

    const maxItem = await prisma.equipment.findFirst({ orderBy: { sn: 'desc' } });
    let currentSn = maxItem ? maxItem.sn : 0;

    const recordsToInsert = [];

    for (const raw of items) {
      currentSn += 1;
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

      const sn = raw.sn ? parseInt(raw.sn) : currentSn;
      const processor = cleanString(raw.processor);
      const generation = parseGen(raw.generation || raw.processor);
      const ramGb = parseNum(raw.ramGb) || null;
      const ssdGb = parseNum(raw.ssdGb);
      const hddGb = parseNum(raw.hddGb);

      const win10Eligible = raw.win10Eligible || calcWin10(processor, generation, ramGb);
      const win11Eligible = raw.win11Eligible || calcWin11(processor, generation, ramGb, ssdGb, hddGb);
      const storageType = raw.storageType || calcStorageType(ssdGb, hddGb);

      recordsToInsert.push({
        sn,
        directorate: cleanString(raw.directorate) || 'General',
        equipmentType: cleanString(raw.equipmentType || raw.type) || 'Desktop',
        brandModel: cleanString(raw.brandModel || raw.model),
        serialNo: cleanString(raw.serialNo || raw.sn_serial),
        processor,
        generation,
        ramGb,
        ssdGb,
        hddGb,
        storageType,
        status: cleanString(raw.status) || 'Svc',
        location: cleanString(raw.location),
        issueStatus: cleanString(raw.issueStatus) || 'Not Issued',
        win10Remark: cleanString(raw.win10Remark),
        win10Eligible,
        win11Eligible,
      });
    }

    // Insert individually or in transaction to handle potential duplicate SNs gracefully
    let insertedCount = 0;
    for (const record of recordsToInsert) {
      await prisma.equipment.upsert({
        where: { sn: record.sn },
        update: record,
        create: record,
      });
      insertedCount++;
    }

    return NextResponse.json({
      message: `Successfully imported ${insertedCount} equipment items!`,
      count: insertedCount,
    });
  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to import equipment' }, { status: 500 });
  }
}
