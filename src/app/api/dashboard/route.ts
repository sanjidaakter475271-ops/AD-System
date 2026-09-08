import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const total = await prisma.equipment.count();
    const svc = await prisma.equipment.count({ where: { status: 'Svc' } });
    const unsvc = await prisma.equipment.count({ where: { status: 'U/S' } });
    const repair = await prisma.equipment.count({ where: { status: 'Repair' } });
    const rs = await prisma.equipment.count({ where: { status: 'R/S' } });

    // AD Joining Statistics
    const adJoined = await prisma.equipment.count({ where: { adStatus: 'Joined' } });
    const adNotJoined = await prisma.equipment.count({ where: { adStatus: 'Not Joined' } });
    const adPending = await prisma.equipment.count({ where: { adStatus: 'Pending' } });

    // New PCs Issued Statistics & AD Status
    const totalNewPc = await prisma.equipment.count({ where: { isNewPc: true } });
    const newPcIssued = await prisma.equipment.count({ where: { isNewPc: true, issueStatus: 'Issued' } });
    const newPcAdJoined = await prisma.equipment.count({ where: { isNewPc: true, adStatus: 'Joined' } });
    const newPcAdNotJoined = await prisma.equipment.count({ where: { isNewPc: true, adStatus: 'Not Joined' } });

    const win10 = await prisma.equipment.count({ where: { win10Eligible: 'Eligible' } });
    const win11Rec = await prisma.equipment.count({ where: { win11Eligible: 'Recommended for Win 11' } });
    const win11Eligible = await prisma.equipment.count({ 
      where: { 
        OR: [
          { win11Eligible: 'Eligible' },
          { win11Eligible: 'Recommended for Win 11' }
        ]
      } 
    });

    const byTypeRaw = await prisma.equipment.groupBy({
      by: ['equipmentType'],
      _count: { id: true }
    });
    const byType = byTypeRaw.map(item => ({ name: item.equipmentType, count: item._count.id }));

    const byBaseUnitRaw = await prisma.equipment.groupBy({
      by: ['baseUnit'],
      _count: { id: true }
    });
    const byBaseUnit = byBaseUnitRaw.map(item => ({ name: item.baseUnit || 'Air HQ', count: item._count.id }));

    const byDirectorateRaw = await prisma.equipment.groupBy({
      by: ['directorate'],
      _count: { id: true }
    });
    const byDirectorate = byDirectorateRaw.map(item => ({ name: item.directorate, count: item._count.id }));

    const recentEquipment = await prisma.equipment.findMany({
      take: 6,
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({
      total,
      svc,
      unsvc,
      repair,
      rs,
      adJoined,
      adNotJoined,
      adPending,
      totalNewPc,
      newPcIssued,
      newPcAdJoined,
      newPcAdNotJoined,
      win10,
      win11: win11Eligible,
      win11Rec,
      byType,
      byBaseUnit,
      byDirectorate,
      recentEquipment
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
