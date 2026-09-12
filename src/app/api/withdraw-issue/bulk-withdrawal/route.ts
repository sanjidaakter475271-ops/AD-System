import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST: Perform bulk withdrawal with letter authority
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { letterRef, letterAuthority, withdrawnBy, reason, items } = body;

    if (!letterRef || !letterAuthority || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Execute within a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create the Batch
      const batch = await tx.withdrawalBatch.create({
        data: {
          letterRef,
          letterAuthority,
          withdrawnBy,
          reason,
        },
      });

      // 2. Process items
      const equipmentIds = items.map((item: any) => item.equipmentId);

      // Create WithdrawalRecords for each item linked to the batch
      await tx.withdrawalRecord.createMany({
        data: items.map((item: any) => ({
          equipmentId: item.equipmentId,
          withdrawnFrom: item.location, // Keeping original section/location
          withdrawnBase: item.baseUnit,
          reason: reason,
          withdrawnBy: withdrawnBy,
          batchId: batch.id,
        })),
      });

      // 3. Update Equipment issueStatus
      await tx.equipment.updateMany({
        where: { id: { in: equipmentIds } },
        data: {
          issueStatus: 'Withdrawn',
        },
      });

      return batch;
    });

    return NextResponse.json({ message: 'Bulk withdrawal completed successfully', batchId: result.id });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process bulk withdrawal' }, { status: 500 });
  }
}
