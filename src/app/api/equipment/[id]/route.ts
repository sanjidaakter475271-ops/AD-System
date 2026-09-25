import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// CockroachDB `sequence()` IDs are 64-bit values that exceed both
// Number.MAX_SAFE_INTEGER and Prisma's `Int` (32-bit) field type.
// Converting with parseInt() loses precision (false 404), and passing a
// BigInt fails Prisma validation ("Expected Int, provided BigInt").
// So we look up / mutate these rows through raw, parameterized SQL, which
// transmits the id as an exact numeric string.

function parseId(id: string): string | null {
  // Only digits, so it cannot be used for SQL injection; still passed as a
  // parameterized value to the driver.
  return /^\d+$/.test(id) ? id : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { id } = await params;

    const safeId = parseId(id);
    if (!safeId) return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });

    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment" WHERE "id" = ${safeId}::int8 LIMIT 1
    `;
    const equipment = rows[0];
    if (!equipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin check
    if (user && user.role !== 'admin' && equipment.base_unit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this Base Unit item' }, { status: 403 });
    }

    // Normalize raw snake_case columns to the camelCase shape the UI expects.
    const normalized = {
      ...equipment,
      id: equipment.id?.toString(),
      baseUnit: equipment.base_unit,
      equipmentType: equipment.equipment_type,
      brandModel: equipment.brand_model,
      serialNo: equipment.serial_no,
      ramGb: equipment.ram_gb,
      ssdGb: equipment.ssd_gb,
      hddGb: equipment.hdd_gb,
      storageType: equipment.storage_type,
      issueStatus: equipment.issue_status,
      isNewPc: equipment.is_new_pc,
      intendedOffice: equipment.intended_office,
      intendedBase: equipment.intended_base,
      adStatus: equipment.ad_status,
      adRemark: equipment.ad_remark,
      win10Remark: equipment.win10_remark,
      win11Eligible: equipment.win11_eligible,
      win10Eligible: equipment.win10_eligible_ver,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
    };

    return NextResponse.json(normalized);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { id } = await params;

    const safeId = parseId(id);
    if (!safeId) return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });

    const existingRows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment" WHERE "id" = ${safeId}::int8 LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin check
    if (user && user.role !== 'admin' && existing.base_unit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: You can only modify equipment in your base unit' }, { status: 403 });
    }

    const body = await request.json();

    const baseUnit = user.role === 'admin' ? (body.baseUnit || existing.base_unit) : existing.base_unit;
    const generation = body.generation ? parseInt(body.generation) : (body.generation === null ? null : existing.generation);
    const ramGb = body.ramGb ? parseInt(body.ramGb) : (body.ramGb === null ? null : existing.ram_gb);
    const ssdGb = body.ssdGb ? parseInt(body.ssdGb) : (body.ssdGb === 0 ? 0 : existing.ssd_gb);
    const hddGb = body.hddGb ? parseInt(body.hddGb) : (body.hddGb === 0 ? 0 : existing.hdd_gb);

    const rows: any[] = await prisma.$queryRaw`
      UPDATE "public"."equipment"
      SET
        "base_unit" = ${baseUnit},
        "directorate" = ${body.directorate ?? existing.directorate},
        "equipment_type" = ${body.equipmentType ?? existing.equipment_type},
        "brand_model" = ${body.brandModel ?? existing.brand_model},
        "serial_no" = ${body.serialNo ?? existing.serial_no},
        "processor" = ${body.processor ?? existing.processor},
        "generation" = ${generation},
        "ram_gb" = ${ramGb},
        "ssd_gb" = ${ssdGb},
        "hdd_gb" = ${hddGb},
        "storage_type" = ${body.storageType ?? existing.storage_type},
        "status" = ${body.status ?? existing.status},
        "location" = ${body.location ?? existing.location},
        "issue_status" = ${body.issueStatus ?? existing.issue_status},
        "is_new_pc" = ${body.isNewPc ?? existing.is_new_pc},
        "intended_office" = ${body.intendedOffice ?? existing.intended_office},
        "intended_base" = ${body.intendedBase ?? existing.intended_base},
        "ad_status" = ${body.adStatus ?? existing.ad_status},
        "ad_remark" = ${body.adRemark ?? existing.ad_remark},
        "win10_remark" = ${body.win10Remark ?? existing.win10_remark},
        "win11_eligible" = ${body.win11Eligible ?? existing.win11_eligible},
        "win10_eligible_ver" = ${body.win10Eligible ?? existing.win10_eligible_ver},
        "updated_at" = now()
      WHERE "id" = ${safeId}::int8
      RETURNING *
    `;
    const equipment = rows[0];
    const normalized = {
      ...equipment,
      id: equipment.id?.toString(),
      baseUnit: equipment.base_unit,
      equipmentType: equipment.equipment_type,
      brandModel: equipment.brand_model,
      serialNo: equipment.serial_no,
      ramGb: equipment.ram_gb,
      ssdGb: equipment.ssd_gb,
      hddGb: equipment.hdd_gb,
      storageType: equipment.storage_type,
      issueStatus: equipment.issue_status,
      isNewPc: equipment.is_new_pc,
      intendedOffice: equipment.intended_office,
      intendedBase: equipment.intended_base,
      adStatus: equipment.ad_status,
      adRemark: equipment.ad_remark,
      win10Remark: equipment.win10_remark,
      win11Eligible: equipment.win11_eligible,
      win10Eligible: equipment.win10_eligible_ver,
      createdAt: equipment.created_at,
      updatedAt: equipment.updated_at,
    };
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { id } = await params;

    const safeId = parseId(id);
    if (!safeId) return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });

    const existingRows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment" WHERE "id" = ${safeId}::int8 LIMIT 1
    `;
    const existing = existingRows[0];
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user && user.role !== 'admin' && existing.base_unit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: You can only delete equipment in your base unit' }, { status: 403 });
    }

    // Delete dependent records first to prevent orphan rows when foreign key CASCADE is absent in DB
    await prisma.$executeRaw`DELETE FROM "public"."upgradation_records" WHERE "equipment_id" = ${safeId}::int8`;
    await prisma.$executeRaw`DELETE FROM "public"."withdrawal_records" WHERE "equipment_id" = ${safeId}::int8`;
    await prisma.$executeRaw`DELETE FROM "public"."issue_records" WHERE "equipment_id" = ${safeId}::int8`;
    await prisma.$executeRaw`DELETE FROM "public"."issue_records" WHERE "replaced_equipment_id" = ${safeId}::int8`;

    await prisma.$executeRaw`
      DELETE FROM "public"."equipment" WHERE "id" = ${safeId}::int8
    `;
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
  }
}
