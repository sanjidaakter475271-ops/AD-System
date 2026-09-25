import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No item IDs provided for deletion' }, { status: 400 });
    }

    const safeIds = ids.map(id => String(id)).filter(id => /^\d+$/.test(id));
    if (safeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid item IDs provided' }, { status: 400 });
    }

    const sqlIds = safeIds.map(id => Prisma.sql`${id}::int8`);
    const inClause = Prisma.join(sqlIds, ', ');

    // Non-admin check: check if any items belong to another base unit
    if (user.role !== 'admin' && user.baseUnit) {
      const unauthorized: any[] = await prisma.$queryRaw`
        SELECT "id" FROM "public"."equipment" 
        WHERE "id" IN (${inClause}) AND "base_unit" != ${user.baseUnit}
        LIMIT 1
      `;
      if (unauthorized.length > 0) {
        return NextResponse.json({ error: 'Forbidden: You can only delete equipment in your assigned base unit' }, { status: 403 });
      }
    }

    // Delete dependent child records first to avoid orphan rows / foreign key constraints
    await prisma.$executeRaw`DELETE FROM "public"."upgradation_records" WHERE "equipment_id" IN (${inClause})`;
    await prisma.$executeRaw`DELETE FROM "public"."withdrawal_records" WHERE "equipment_id" IN (${inClause})`;
    await prisma.$executeRaw`DELETE FROM "public"."issue_records" WHERE "equipment_id" IN (${inClause})`;
    await prisma.$executeRaw`DELETE FROM "public"."issue_records" WHERE "replaced_equipment_id" IN (${inClause})`;

    // Delete equipment records
    const deletedCount: any = await prisma.$executeRaw`
      DELETE FROM "public"."equipment" WHERE "id" IN (${inClause})
    `;

    return NextResponse.json({
      message: `Successfully deleted ${safeIds.length} equipment item(s)`,
      count: safeIds.length
    });
  } catch (error: any) {
    console.error('Bulk Delete Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk delete equipment' }, { status: 500 });
  }
}
