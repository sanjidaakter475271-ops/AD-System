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
      const sn = raw.sn ? parseInt(raw.sn) : currentSn;
      const processor = raw.processor ? String(raw.processor) : null;
      const generation = raw.generation ? parseInt(raw.generation) : null;
      const ramGb = raw.ramGb ? parseInt(raw.ramGb) : null;
      const ssdGb = raw.ssdGb ? parseInt(raw.ssdGb) : 0;
      const hddGb = raw.hddGb ? parseInt(raw.hddGb) : 0;

      const win10Eligible = raw.win10Eligible || calcWin10(processor, generation, ramGb);
      const win11Eligible = raw.win11Eligible || calcWin11(processor, generation, ramGb, ssdGb, hddGb);
      const storageType = raw.storageType || calcStorageType(ssdGb, hddGb);

      recordsToInsert.push({
        sn,
        directorate: raw.directorate || 'General',
        equipmentType: raw.equipmentType || raw.type || 'Desktop',
        brandModel: raw.brandModel || raw.model || null,
        serialNo: raw.serialNo || raw.sn_serial || null,
        processor,
        generation,
        ramGb,
        ssdGb,
        hddGb,
        storageType,
        status: raw.status || 'Svc',
        location: raw.location || null,
        issueStatus: raw.issueStatus || 'Not Issued',
        win10Remark: raw.win10Remark || null,
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
