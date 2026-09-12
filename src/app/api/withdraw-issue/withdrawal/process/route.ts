import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Batch process withdrawal for selected withdrawal records
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { withdrawalIds } = body;

    if (!Array.isArray(withdrawalIds) || withdrawalIds.length === 0) {
      return NextResponse.json({ error: 'withdrawalIds array is required' }, { status: 400 });
    }

    const ids = withdrawalIds.map(id => parseInt(id));

    // Get withdrawal records to find equipment IDs
    const records = await prisma.withdrawalRecord.findMany({
      where: { id: { in: ids } },
      select: { equipmentId: true },
    });

    const equipmentIds = records.map(r => r.equipmentId);

    // Update equipment issueStatus to "Withdrawn"
    // Do NOT change directorate and location - keep them as they are to know where it was withdrawn from
    await prisma.equipment.updateMany({
      where: { id: { in: equipmentIds } },
      data: { 
        issueStatus: 'Withdrawn',
      },
    });

    return NextResponse.json({ message: 'Batch withdrawal completed successfully', count: ids.length });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process batch withdrawal' }, { status: 500 });
  }
}
