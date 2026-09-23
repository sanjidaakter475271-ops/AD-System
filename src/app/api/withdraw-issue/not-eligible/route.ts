import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

function mapEquipmentRow(r: any) {
  return {
    id: r.id.toString(),
    sn: Number(r.sn),
    baseUnit: r.base_unit,
    directorate: r.directorate,
    equipmentType: r.equipment_type,
    brandModel: r.brand_model,
    serialNo: r.serial_no,
    processor: r.processor,
    generation: r.generation ? Number(r.generation) : null,
    ramGb: r.ram_gb ? Number(r.ram_gb) : null,
    ssdGb: Number(r.ssd_gb || 0),
    hddGb: Number(r.hdd_gb || 0),
    storageType: r.storage_type,
    status: r.status,
    location: r.location,
    issueStatus: r.issue_status,
    isNewPc: Boolean(r.is_new_pc),
    intendedOffice: r.intended_office,
    intendedBase: r.intended_base,
    adStatus: r.ad_status,
    adRemark: r.ad_remark,
    win10Remark: r.win10_remark,
    win11Eligible: r.win11_eligible,
    win10Eligible: r.win10_eligible_ver,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// GET: Not-eligible PCs inventory (isNewPc=false, win10Eligible="Not Eligible")
// Also returns available new PCs (isNewPc=true, issueStatus=Not Issued)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const baseUnit = searchParams.get('baseUnit') || '';
    const directorate = searchParams.get('directorate') || '';
    const mode = searchParams.get('mode') || 'inventory'; // 'inventory' | 'new-pcs'

    if (mode === 'new-pcs') {
      const conditions: Prisma.Sql[] = [
        Prisma.sql`"is_new_pc" = true`,
        Prisma.sql`"issue_status" = 'Not Issued'`,
      ];

      if (user && user.role !== 'admin' && user.baseUnit) {
        conditions.push(Prisma.sql`("intended_base" = ${user.baseUnit} OR "base_unit" = ${user.baseUnit})`);
      } else if (baseUnit) {
        conditions.push(Prisma.sql`("intended_base" = ${baseUnit} OR "base_unit" = ${baseUnit})`);
      }

      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM "public"."equipment"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY "sn" ASC
      `;

      return NextResponse.json(rows.map(mapEquipmentRow));
    }

    // Default: inventory mode — not-eligible old PCs
    const conditions: Prisma.Sql[] = [
      Prisma.sql`"win10_eligible_ver" = 'Not Eligible'`,
      Prisma.sql`"is_new_pc" = false`,
    ];

    if (user && user.role !== 'admin' && user.baseUnit) {
      conditions.push(Prisma.sql`"base_unit" = ${user.baseUnit}`);
    } else if (baseUnit) {
      conditions.push(Prisma.sql`"base_unit" = ${baseUnit}`);
    }

    if (directorate) {
      conditions.push(Prisma.sql`"directorate" = ${directorate}`);
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "sn" ASC
    `;

    // Map equipment rows and attach latest issueRecords if any
    const equipmentList = await Promise.all(rows.map(async (row) => {
      const mapped = mapEquipmentRow(row);
      const safeId = row.id.toString();
      const issueRecords: any[] = await prisma.$queryRaw`
        SELECT
          i."id", i."issued_to" as "issuedTo", i."issued_office" as "issuedOffice",
          i."issued_base" as "issuedBase", i."issued_at" as "issuedAt",
          i."section_label" as "sectionLabel", i."pc_number" as "pcNumber",
          i."letter_ref" as "letterRef", i."letter_authority" as "letterAuthority",
          e."sn", e."equipment_type" as "equipmentType", e."brand_model" as "brandModel",
          e."processor", e."generation", e."ram_gb" as "ramGb", e."storage_type" as "storageType"
        FROM "public"."issue_records" i
        LEFT JOIN "public"."equipment" e ON e."id" = i."equipment_id"
        WHERE i."equipment_id" = ${safeId}::int8
        ORDER BY i."issued_at" DESC
        LIMIT 1
      `;
      return {
        ...mapped,
        issueRecords: issueRecords.map(r => ({
          ...r,
          id: r.id?.toString(),
          equipment: r.sn ? {
            sn: Number(r.sn),
            equipmentType: r.equipmentType,
            brandModel: r.brandModel,
            processor: r.processor,
            generation: r.generation ? Number(r.generation) : null,
            ramGb: r.ramGb ? Number(r.ramGb) : null,
            storageType: r.storageType,
          } : null
        })),
        withdrawalRecords: [],
      };
    }));

    return NextResponse.json(equipmentList);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch not-eligible equipment' }, { status: 500 });
  }
}
