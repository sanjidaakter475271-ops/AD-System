import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List withdrawn PCs pending/completed upgradation
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const baseUnit = searchParams.get('baseUnit') || '';
    const isUpgraded = searchParams.get('isUpgraded') || '';
    const isDistributed = searchParams.get('isDistributed') || '';

    const where: any = {};

    if (isUpgraded === 'true') where.isUpgraded = true;
    if (isUpgraded === 'false') where.isUpgraded = false;
    if (isDistributed === 'true') where.isDistributed = true;
    if (isDistributed === 'false') where.isDistributed = false;

    // Filter by base via withdrawal record
    if (user && user.role !== 'admin' && user.baseUnit) {
      where.withdrawal = { withdrawnBase: user.baseUnit };
    } else if (baseUnit) {
      where.withdrawal = { withdrawnBase: baseUnit };
    }

    const upgradations = await prisma.upgradationRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        equipment: true,
        withdrawal: {
          include: {
            issueRecord: {
              include: {
                equipment: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(upgradations);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch upgradation records' }, { status: 500 });
  }
}

// POST: Mark a withdrawn PC as upgraded and/or distribute to new office
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      upgradationId,
      isUpgraded,
      upgradedBy,
      isDistributed,
      distributedTo,
      distributedBase,
      remarks,
    } = body;

    if (!upgradationId) {
      return NextResponse.json({ error: 'upgradationId is required' }, { status: 400 });
    }

    const existing = await prisma.upgradationRecord.findUnique({
      where: { id: parseInt(upgradationId) },
    });
    if (!existing) return NextResponse.json({ error: 'Upgradation record not found' }, { status: 404 });

    const updateData: any = {};
    if (typeof isUpgraded === 'boolean') {
      updateData.isUpgraded = isUpgraded;
      if (isUpgraded) updateData.upgradedAt = new Date();
    }
    if (upgradedBy) updateData.upgradedBy = upgradedBy;
    if (typeof isDistributed === 'boolean') {
      updateData.isDistributed = isDistributed;
      if (isDistributed) updateData.distributedAt = new Date();
    }
    if (distributedTo) updateData.distributedTo = distributedTo;
    if (distributedBase) updateData.distributedBase = distributedBase;

    // Build remarks: original location + upgrade + new office
    const existingRemarks = existing.remarks || '';
    if (remarks) {
      updateData.remarks = remarks;
    } else if (isDistributed && distributedTo) {
      const parts = [existingRemarks];
      if (isUpgraded) parts.push('Upgraded ✓');
      parts.push(`Distributed to ${distributedTo}${distributedBase ? ' (' + distributedBase + ')' : ''}`);
      updateData.remarks = parts.filter(Boolean).join(' | ');
    }

    const updated = await prisma.upgradationRecord.update({
      where: { id: parseInt(upgradationId) },
      data: updateData,
      include: {
        equipment: true,
        withdrawal: true,
      },
    });

    // If distributed, update equipment's directorate and baseUnit
    if (isDistributed && distributedTo) {
      await prisma.equipment.update({
        where: { id: existing.equipmentId },
        data: {
          directorate: distributedTo,
          baseUnit: distributedBase || undefined,
          issueStatus: 'Issued',
          adStatus: 'Pending', // Not joined to AD since it's a normal (non-AD) PC
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update upgradation' }, { status: 500 });
  }
}
