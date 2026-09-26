import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { invalidateEquipmentCache } from '@/lib/cache';

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

function mapRow(equipment: any) {
  return {
    id: equipment.id?.toString(),
    sn: equipment.sn ? Number(equipment.sn) : 0,
    baseUnit: equipment.base_unit,
    directorate: equipment.directorate,
    equipmentType: equipment.equipment_type,
    brandModel: equipment.brand_model,
    serialNo: equipment.serial_no,
    processor: equipment.processor,
    generation: equipment.generation ? Number(equipment.generation) : null,
    ramGb: equipment.ram_gb ? Number(equipment.ram_gb) : null,
    ssdGb: Number(equipment.ssd_gb || 0),
    hddGb: Number(equipment.hdd_gb || 0),
    storageType: equipment.storage_type,
    status: equipment.status,
    location: equipment.location,
    issueStatus: equipment.issue_status,
    isNewPc: Boolean(equipment.is_new_pc),
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
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { id } = await params;

    const safeId = parseId(id);
    if (!safeId) return NextResponse.json({ error: 'Invalid equipment id' }, { status: 400 });

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "public"."equipment" WHERE "id" = ${safeId} LIMIT 1`
    );
    const equipment = rows[0];
    if (!equipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin check
    if (user && user.role !== 'admin' && equipment.base_unit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this Base Unit item' }, { status: 403 });
    }

    return NextResponse.json(mapRow(equipment));
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

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "public"."equipment" WHERE "id" = ${safeId} LIMIT 1`
    );
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

    const rows: any[] = await prisma.$queryRawUnsafe(
      `UPDATE "public"."equipment"
      SET
        "base_unit" = $1,
        "directorate" = $2,
        "equipment_type" = $3,
        "brand_model" = $4,
        "serial_no" = $5,
        "processor" = $6,
        "generation" = $7,
        "ram_gb" = $8,
        "ssd_gb" = $9,
        "hdd_gb" = $10,
        "storage_type" = $11,
        "status" = $12,
        "location" = $13,
        "issue_status" = $14,
        "is_new_pc" = $15,
        "intended_office" = $16,
        "intended_base" = $17,
        "ad_status" = $18,
        "ad_remark" = $19,
        "win10_remark" = $20,
        "win11_eligible" = $21,
        "win10_eligible_ver" = $22,
        "updated_at" = now()
      WHERE "id" = $23
      RETURNING *`,
      baseUnit,
      body.directorate ?? existing.directorate,
      body.equipmentType ?? existing.equipment_type,
      body.brandModel ?? existing.brand_model,
      body.serialNo ?? existing.serial_no,
      body.processor ?? existing.processor,
      generation,
      ramGb,
      ssdGb,
      hddGb,
      body.storageType ?? existing.storage_type,
      body.status ?? existing.status,
      body.location ?? existing.location,
      body.issueStatus ?? existing.issue_status,
      body.isNewPc ?? existing.is_new_pc,
      body.intendedOffice ?? existing.intended_office,
      body.intendedBase ?? existing.intended_base,
      body.adStatus ?? existing.ad_status,
      body.adRemark ?? existing.ad_remark,
      body.win10Remark ?? existing.win10_remark,
      body.win11Eligible ?? existing.win11_eligible,
      body.win10Eligible ?? existing.win10_eligible_ver,
      safeId
    );
    const equipment = rows[0];
    invalidateEquipmentCache();
    return NextResponse.json(mapRow(equipment));
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

    const existingRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM "public"."equipment" WHERE "id" = ${safeId} LIMIT 1`
    );
    const existing = existingRows[0];
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user && user.role !== 'admin' && existing.base_unit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: You can only delete equipment in your base unit' }, { status: 403 });
    }

    // Delete dependent records first to prevent orphan rows when foreign key CASCADE is absent in DB
    await prisma.$executeRawUnsafe(`DELETE FROM "public"."upgradation_records" WHERE "equipment_id" = ${safeId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM "public"."withdrawal_records" WHERE "equipment_id" = ${safeId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM "public"."issue_records" WHERE "equipment_id" = ${safeId}`);
    await prisma.$executeRawUnsafe(`DELETE FROM "public"."issue_records" WHERE "replaced_equipment_id" = ${safeId}`);

    await prisma.$executeRawUnsafe(
      `DELETE FROM "public"."equipment" WHERE "id" = ${safeId}`
    );
    invalidateEquipmentCache();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
  }
}
