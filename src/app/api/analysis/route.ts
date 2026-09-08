import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const total = await prisma.equipment.count();
    
    // Status Breakdown
    const statusCounts = await prisma.equipment.groupBy({
      by: ['status'],
      _count: { _all: true }
    });

    // Processor Breakdown
    const processorCounts = await prisma.equipment.groupBy({
      by: ['processor'],
      _count: { _all: true }
    });

    // Directorate Breakdown
    const directorateCounts = await prisma.equipment.groupBy({
      by: ['directorate'],
      _count: { _all: true }
    });

    // Win 10 & 11 eligibility counts
    const win10Eligible = await prisma.equipment.count({ where: { win10Eligible: 'Eligible' } });
    const win10Ineligible = await prisma.equipment.count({ where: { win10Eligible: 'Not Eligible' } });

    const win11Eligible = await prisma.equipment.count({ where: { win11Eligible: 'Eligible' } });
    const win11Ineligible = await prisma.equipment.count({ where: { win11Eligible: 'Ineligible' } });

    const allEquipment = await prisma.equipment.findMany({
      orderBy: { sn: 'asc' }
    });

    return NextResponse.json({
      total,
      statusCounts,
      processorCounts,
      directorateCounts,
      win10: { eligible: win10Eligible, ineligible: win10Ineligible },
      win11: { eligible: win11Eligible, ineligible: win11Ineligible },
      equipment: allEquipment
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch analysis' }, { status: 500 });
  }
}
