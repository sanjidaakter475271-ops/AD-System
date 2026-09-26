import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateEquipmentCache } from '@/lib/cache';

function parseBigInt(id: any): bigint | null {
  if (!id) return null;
  const s = id.toString();
  if (/^\d+$/.test(s)) {
    try {
      return BigInt(s);
    } catch {
      return null;
    }
  }
  return null;
}

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInt(obj[key]);
    }
    return res;
  }
  return obj;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      newPcId,            // new PC being issued as replacement
      oldPcId,            // old not-eligible PC being replaced (withdrawn)
      issuedTo,           // Section/person name
      issuedOffice,
      issuedBase,
      letterRef,
      letterAuthority,
      isReplacement,      // false = direct issue without withdrawing old PC
      withdrawnBy,
      withdrawalReason,
    } = body;

    if (!issuedTo || !issuedOffice || !issuedBase) {
      return NextResponse.json({ error: 'issuedTo, issuedOffice and issuedBase are required' }, { status: 400 });
    }
    const newPcIdBig = parseBigInt(newPcId);
    const oldPcIdBig = parseBigInt(oldPcId);

    if (!newPcIdBig) {
      return NextResponse.json({ error: 'Valid newPcId is required' }, { status: 400 });
    }

    // Auto-number PC within section
    const sectionRows: any[] = await prisma.$queryRaw`
      SELECT "pc_number" as "pcNumber" FROM "public"."issue_records"
      WHERE "issued_to" = ${issuedTo}
        AND "issued_office" = ${issuedOffice}
        AND "issued_base" = ${issuedBase}
    `;
    const usedNumbers = sectionRows.map(r => Number(r.pcNumber ?? 0)).filter(n => n > 0);
    const nextPcNumber = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
    const sectionLabel = `PC-${nextPcNumber}`;

    const isRep = Boolean(isReplacement) && Boolean(oldPcIdBig);

    const issueRecordRows: any[] = await prisma.$queryRaw`
      INSERT INTO "public"."issue_records"
      ("equipment_id", "issued_to", "issued_office", "issued_base", "section_label", "pc_number", "letter_ref", "letter_authority", "is_replacement", "replaced_equipment_id", "created_at")
      VALUES
      (${newPcIdBig}, ${issuedTo}, ${issuedOffice}, ${issuedBase}, ${sectionLabel}, ${nextPcNumber}, ${letterRef || null}, ${letterAuthority || null}, ${isRep}, ${oldPcIdBig}, NOW())
      RETURNING *
    `;
    const issueRecord = serializeBigInt(issueRecordRows[0]);

    await prisma.$executeRaw`
      UPDATE "public"."equipment"
      SET "issue_status" = 'Issued',
          "directorate" = ${issuedOffice},
          "base_unit" = ${issuedBase},
          "location" = ${issuedTo},
          "updated_at" = NOW()
      WHERE "id" = ${newPcIdBig}
    `;

    let withdrawalRecord = null;
    if (isRep && oldPcIdBig) {
      const oldPcRows: any[] = await prisma.$queryRaw`
        SELECT * FROM "public"."equipment" WHERE "id" = ${oldPcIdBig} LIMIT 1
      `;
      const oldPc = oldPcRows[0];

      const wdRows: any[] = await prisma.$queryRaw`
        INSERT INTO "public"."withdrawal_records"
        ("equipment_id", "withdrawn_from", "withdrawn_base", "withdrawn_by", "reason", "issue_record_id", "created_at", "withdrawn_at")
        VALUES
        (${oldPcIdBig}, ${oldPc?.directorate || issuedOffice}, ${oldPc?.base_unit || issuedBase}, ${withdrawnBy || user.name || user.username}, ${withdrawalReason || 'Replaced with new PC (Pending Withdrawal Letter)'}, ${parseBigInt(issueRecord.id)}, NOW(), NOW())
        RETURNING *
      `;
      withdrawalRecord = serializeBigInt(wdRows[0]);

      // Mark old PC as Pending Withdrawal
      await prisma.$executeRaw`
        UPDATE "public"."equipment"
        SET "issue_status" = 'Pending Withdrawal',
            "updated_at" = NOW()
        WHERE "id" = ${oldPcIdBig}
      `;

      await prisma.$executeRaw`
        INSERT INTO "public"."upgradation_records"
        ("equipment_id", "withdrawal_id", "remarks", "created_at", "updated_at")
        VALUES
        (${oldPcIdBig}, ${parseBigInt(withdrawalRecord.id)}, ${`Withdrawn from ${oldPc?.directorate || issuedOffice} (${oldPc?.base_unit || issuedBase})`}, NOW(), NOW())
      `;
    }

    invalidateEquipmentCache();

    return NextResponse.json({ issueRecord, withdrawalRecord });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to issue equipment' }, { status: 500 });
  }
}
