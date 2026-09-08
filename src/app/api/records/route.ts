import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Full issue history with letter authority details
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const baseUnit = searchParams.get('baseUnit') || '';
    const directorate = searchParams.get('directorate') || '';
    const isReplacement = searchParams.get('isReplacement') || '';

    const where: any = {};

    if (user && user.role !== 'admin' && user.baseUnit) {
      where.issuedBase = user.baseUnit;
    } else if (baseUnit) {
      where.issuedBase = baseUnit;
    }

    if (directorate) where.issuedOffice = directorate;
    if (isReplacement === 'true') where.isReplacement = true;
    if (isReplacement === 'false') where.isReplacement = false;

    const records = await prisma.issueRecord.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      include: {
        equipment: true,
        replacedEquipment: true,
        withdrawalRecord: {
          include: {
            upgradation: true,
          },
        },
      },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 });
  }
}
