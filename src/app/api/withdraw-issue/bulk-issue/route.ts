import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function parseId(id: any): string | null {
  if (!id) return null;
  const s = id.toString();
  return /^\d+$/.test(s) ? s : null;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { items, letterRef, letterAuthority } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
    }

    // Validate
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.newPcId) {
        return NextResponse.json({ error: `Row ${i + 1}: newPcId is required` }, { status: 400 });
      }
      if (!item.issuedTo || !item.issuedOffice || !item.issuedBase) {
        return NextResponse.json(
          { error: `Row ${i + 1}: issuedTo, issuedOffice, and issuedBase are required` },
          { status: 400 }
        );
      }
      if (item.issueMode === 'replace-old' && !item.oldPcId) {
        return NextResponse.json(
          { error: `Row ${i + 1}: oldPcId is required when issueMode is replace-old` },
          { status: 400 }
        );
      }
    }

    const issued = [];

    for (const item of items) {
      const newPcIdStr = parseId(item.newPcId);
      const oldPcIdStr = parseId(item.oldPcId);

      if (!newPcIdStr) {
        return NextResponse.json({ error: `Invalid newPcId` }, { status: 400 });
      }

      const issuedTo = item.issuedTo;
      const issuedOffice = item.issuedOffice;
      const issuedBase = item.issuedBase;
      const isReplacement = item.issueMode === 'replace-old' && Boolean(oldPcIdStr);

      // Auto-number PC within section using raw SQL
      const sectionRows: any[] = await prisma.$queryRaw`
        SELECT "pc_number" as "pcNumber" FROM "public"."issue_records"
        WHERE "issued_to" = ${issuedTo}
          AND "issued_office" = ${issuedOffice}
          AND "issued_base" = ${issuedBase}
      `;
      const usedNumbers = sectionRows.map(r => Number(r.pcNumber ?? 0)).filter(n => n > 0);
      const nextPcNumber = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
      const sectionLabel = `PC-${nextPcNumber}`;

      // Create issue record via raw SQL
      const issueRecordRows: any[] = await prisma.$queryRaw`
        INSERT INTO "public"."issue_records"
        ("equipment_id", "issued_to", "issued_office", "issued_base", "section_label", "pc_number", "letter_ref", "letter_authority", "is_replacement", "replaced_equipment_id", "created_at")
        VALUES
        (${newPcIdStr}::int8, ${issuedTo}, ${issuedOffice}, ${issuedBase}, ${sectionLabel}, ${nextPcNumber}, ${letterRef || null}, ${letterAuthority || null}, ${isReplacement}, ${isReplacement ? `${oldPcIdStr}::int8` : null}, NOW())
        RETURNING *
      `;
      const issueRecord = issueRecordRows[0];

      // Mark new PC as Issued
      await prisma.$executeRaw`
        UPDATE "public"."equipment"
        SET "issue_status" = 'Issued',
            "directorate" = ${issuedOffice},
            "base_unit" = ${issuedBase},
            "location" = ${issuedTo},
            "updated_at" = NOW()
        WHERE "id" = ${newPcIdStr}::int8
      `;

      let withdrawalRecord = null;

      // If replacing old PC
      if (isReplacement && oldPcIdStr) {
        const oldPcRows: any[] = await prisma.$queryRaw`
          SELECT * FROM "public"."equipment" WHERE "id" = ${oldPcIdStr}::int8 LIMIT 1
        `;
        const oldPc = oldPcRows[0];

        const wdRows: any[] = await prisma.$queryRaw`
          INSERT INTO "public"."withdrawal_records"
          ("equipment_id", "withdrawn_from", "withdrawn_base", "withdrawn_by", "reason", "issue_record_id", "created_at", "withdrawn_at")
          VALUES
          (${oldPcIdStr}::int8, ${oldPc?.directorate || issuedOffice}, ${oldPc?.base_unit || issuedBase}, ${item.withdrawnBy || user.name || user.username}, ${item.withdrawalReason || 'Replaced with new PC (Not Eligible)'}, ${issueRecord.id?.toString()}::int8, NOW(), NOW())
          RETURNING *
        `;
        withdrawalRecord = wdRows[0];

        await prisma.$executeRaw`
          UPDATE "public"."equipment"
          SET "issue_status" = 'Withdrawn & Issued',
              "updated_at" = NOW()
          WHERE "id" = ${oldPcIdStr}::int8
        `;

        await prisma.$executeRaw`
          INSERT INTO "public"."upgradation_records"
          ("equipment_id", "withdrawal_id", "remarks", "created_at", "updated_at")
          VALUES
          (${oldPcIdStr}::int8, ${withdrawalRecord.id?.toString()}::int8, ${`Withdrawn from ${oldPc?.directorate || issuedOffice} (${oldPc?.base_unit || issuedBase})`}, NOW(), NOW())
        `;
      }

      issued.push({ issueRecord, withdrawalRecord });
    }

    return NextResponse.json({
      message: `${issued.length} PC(s) issued successfully`,
      count: issued.length,
      results: issued,
    });
  } catch (error: any) {
    console.error('Bulk Issue API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk issue equipment' }, { status: 500 });
  }
}
