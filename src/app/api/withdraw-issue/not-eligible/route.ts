import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Not-eligible PCs inventory (isNewPc=false, win10Eligible="Not Eligible")
// Also returns available new PCs (isNewPc=true, issueStatus=Not Issued)
// filtered by same base for replacement picking
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const baseUnit = searchParams.get('baseUnit') || '';
    const directorate = searchParams.get('directorate') || '';
    const mode = searchParams.get('mode') || 'inventory'; // 'inventory' | 'new-pcs'

    if (mode === 'new-pcs') {
      // Return available new PCs (not yet issued) — for replacement picker
      // Filter by intendedBase OR base, prefer same office match
      const where: any = {
        isNewPc: true,
        issueStatus: 'Not Issued',
      };
      if (user && user.role !== 'admin' && user.baseUnit) {
        where.OR = [
          { intendedBase: user.baseUnit },
          { baseUnit: user.baseUnit },
        ];
      } else if (baseUnit) {
        where.OR = [
          { intendedBase: baseUnit },
          { baseUnit: baseUnit },
        ];
      }
      const newPcs = await prisma.equipment.findMany({
        where,
        orderBy: { sn: 'asc' },
      });
      return NextResponse.json(newPcs);
    }

    // Default: inventory mode — not-eligible old PCs
    const where: any = {
      win10Eligible: 'Not Eligible',
      isNewPc: false,
    };

    if (user && user.role !== 'admin' && user.baseUnit) {
      where.baseUnit = user.baseUnit;
    } else if (baseUnit) {
      where.baseUnit = baseUnit;
    }

    if (directorate) where.directorate = directorate;

    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { sn: 'asc' },
      include: {
        issueRecords: {
          orderBy: { issuedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            issuedTo: true,
            issuedOffice: true,
            issuedBase: true,
            issuedAt: true,
            sectionLabel: true,
            pcNumber: true,
            letterRef: true,
            letterAuthority: true,
            equipment: { select: { sn: true, equipmentType: true, brandModel: true, processor: true, generation: true, ramGb: true, storageType: true, intendedOffice: true, intendedBase: true } },
          },
        },
        withdrawalRecords: {
          orderBy: { withdrawnAt: 'desc' },
          take: 1,
        },
      },
    });

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch not-eligible equipment' }, { status: 500 });
  }
}
