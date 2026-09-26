import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';
import { invalidateEquipmentCache } from '@/lib/cache';

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

    // Validate required fields per item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.baseUnit || !item.directorate || !item.equipmentType) {
        return NextResponse.json(
          { error: `Row ${i + 1}: baseUnit, directorate, and equipmentType are required` },
          { status: 400 }
        );
      }
      if (item.issueImmediately) {
        if (!item.issuedTo) {
          return NextResponse.json(
            { error: `Row ${i + 1}: issuedTo (section) is required when issueImmediately is true` },
            { status: 400 }
          );
        }
        if (!item.issuedOffice || !item.issuedBase) {
          return NextResponse.json(
            { error: `Row ${i + 1}: issuedOffice and issuedBase are required when issueImmediately is true` },
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
    }

    // Get current max sn to auto-increment
    const maxSnRows: any[] = await prisma.$queryRaw`
      SELECT MAX("sn") as "maxSn" FROM "public"."equipment"
    `;
    let nextSn = (Number(maxSnRows[0]?.maxSn) || 0) + 1;

    const created = [];

    for (const item of items) {
      const ssdGb = item.ssdGb ?? 0;
      const hddGb = item.hddGb ?? 0;
      const ramGb = item.ramGb ?? 8;
      const processor = item.processor ?? 'I5';
      const generation = item.generation ?? 7;

      const win10Eligible = calcWin10(processor, generation, ramGb);
      const win11Eligible = calcWin11(processor, generation, ramGb, ssdGb, hddGb);
      const storageType = calcStorageType(ssdGb, hddGb);

      const directorate = item.isNewPc && item.intendedOffice
        ? item.intendedOffice
        : item.directorate;

      const baseUnit = item.isNewPc && item.intendedBase ? item.intendedBase : item.baseUnit;

      const eqRows: any[] = await prisma.$queryRaw`
        INSERT INTO "public"."equipment"
        ("sn", "base_unit", "directorate", "equipment_type", "brand_model", "serial_no", "processor", "generation", "ram_gb", "ssd_gb", "hdd_gb", "storage_type", "status", "location", "issue_status", "is_new_pc", "intended_office", "intended_base", "ad_status", "ad_remark", "win10_eligible_ver", "win11_eligible", "created_at", "updated_at")
        VALUES
        (${nextSn++}, ${baseUnit}, ${directorate}, ${item.equipmentType}, ${item.brandModel || null}, ${item.serialNo || null}, ${processor}, ${generation}, ${ramGb}, ${ssdGb}, ${hddGb}, ${storageType}, ${item.isNewPc ? 'Svc' : (item.status || 'Svc')}, ${item.location || null}, ${item.isNewPc ? 'Not Issued' : (item.issueStatus || 'Not Issued')}, ${Boolean(item.isNewPc)}, ${item.isNewPc ? (item.intendedOffice || null) : null}, ${item.isNewPc ? (item.intendedBase || null) : null}, ${item.adStatus || 'Pending'}, ${item.adRemark || null}, ${win10Eligible}, ${win11Eligible}, NOW(), NOW())
        RETURNING *
      `;
      const equipment = eqRows[0];
      const eqIdStr = equipment.id.toString();

      let issueRecord = null;
      let withdrawalRecord = null;

      // Issue immediately if requested
      if (item.issueImmediately) {
        const issuedTo = item.issuedTo;
        const issuedOffice = item.issuedOffice;
        const issuedBase = item.issuedBase;
        const oldPcIdStr = parseId(item.oldPcId);
        const isReplacement = item.issueMode === 'replace-old' && Boolean(oldPcIdStr);

        const sectionRows: any[] = await prisma.$queryRaw`
          SELECT "pc_number" as "pcNumber" FROM "public"."issue_records"
          WHERE "issued_to" = ${issuedTo}
            AND "issued_office" = ${issuedOffice}
            AND "issued_base" = ${issuedBase}
        `;
        const usedNumbers = sectionRows.map(r => Number(r.pcNumber ?? 0)).filter(n => n > 0);
        const nextPcNumber = usedNumbers.length === 0 ? 1 : Math.max(...usedNumbers) + 1;
        const sectionLabel = `PC-${nextPcNumber}`;

        const issueRecordRows: any[] = await prisma.$queryRaw`
          INSERT INTO "public"."issue_records"
          ("equipment_id", "issued_to", "issued_office", "issued_base", "section_label", "pc_number", "letter_ref", "letter_authority", "is_replacement", "replaced_equipment_id", "created_at")
          VALUES
          (${eqIdStr}::int8, ${issuedTo}, ${issuedOffice}, ${issuedBase}, ${sectionLabel}, ${nextPcNumber}, ${letterRef || null}, ${letterAuthority || null}, ${isReplacement}, ${isReplacement ? `${oldPcIdStr}::int8` : null}, NOW())
          RETURNING *
        `;
        issueRecord = issueRecordRows[0];

        await prisma.$executeRaw`
          UPDATE "public"."equipment"
          SET "issue_status" = 'Issued',
              "directorate" = ${issuedOffice},
              "base_unit" = ${issuedBase},
              "location" = ${issuedTo},
              "updated_at" = NOW()
          WHERE "id" = ${eqIdStr}::int8
        `;

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
      }

      created.push({ equipment: { ...equipment, id: eqIdStr }, issueRecord, withdrawalRecord });
    }

    invalidateEquipmentCache();

    return NextResponse.json({
      message: `${created.length} equipment record(s) created successfully`,
      count: created.length,
      results: created,
    });
  } catch (error: any) {
    console.error('Bulk Create API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to bulk create equipment' }, { status: 500 });
  }
}
