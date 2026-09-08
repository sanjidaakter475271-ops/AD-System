import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: List all withdrawn PCs, filterable by base & office
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const baseUnit = searchParams.get('baseUnit') || '';
    const directorate = searchParams.get('directorate') || '';

    const where: any = {};

    if (user && user.role !== 'admin' && user.baseUnit) {
      where.withdrawnBase = user.baseUnit;
    } else if (baseUnit) {
      where.withdrawnBase = baseUnit;
    }

    if (directorate) where.withdrawnFrom = directorate;

    const withdrawals = await prisma.withdrawalRecord.findMany({
      where,
      orderBy: { withdrawnAt: 'desc' },
      include: {
        equipment: true,
        issueRecord: {
          include: {
            equipment: true,
          },
        },
        upgradation: true,
      },
    });

    return NextResponse.json(withdrawals);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 });
  }
}
