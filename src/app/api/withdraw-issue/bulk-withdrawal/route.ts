import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { letterRef, letterAuthority, withdrawnBy, reason, items } = body;

    if (!letterRef || !letterAuthority || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: Letter Ref & Authority are required' }, { status: 400 });
    }

    // 1. Create withdrawal batch
    const batchRows: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO "public"."withdrawal_batches" ("letter_ref", "letter_authority", "withdrawn_by", "reason", "withdrawn_at")
       VALUES ($1, $2, $3, $4, now())
       RETURNING "id"`,
      letterRef,
      letterAuthority,
      withdrawnBy || null,
      reason || 'Not Eligible for Win 10'
    );
    const batchId = batchRows[0]?.id?.toString();

    // 2. Process each equipment item
    for (const item of items) {
      const safeId = String(item.equipmentId || item.id).replace(/[^\d]/g, '');
      if (!safeId) continue;

      const location = item.location || item.directorate || 'General Section';
      const baseUnit = item.baseUnit || 'Air HQ';

      await prisma.$executeRawUnsafe(
        `INSERT INTO "public"."withdrawal_records" ("equipment_id", "withdrawn_from", "withdrawn_base", "reason", "withdrawn_by", "batch_id", "withdrawn_at", "created_at")
         VALUES (${safeId}, $1, $2, $3, $4, ${batchId}, now(), now())`,
        location,
        baseUnit,
        reason || 'Not Eligible for Win 10',
        withdrawnBy || null
      );

      await prisma.$executeRawUnsafe(
        `UPDATE "public"."equipment" SET "issue_status" = 'Withdrawn', "updated_at" = now() WHERE "id" = ${safeId}`
      );
    }

    return NextResponse.json({ message: 'Bulk withdrawal completed successfully', batchId });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to process bulk withdrawal' }, { status: 500 });
  }
}
