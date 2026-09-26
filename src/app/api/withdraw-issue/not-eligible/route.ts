import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { serverCache } from '@/lib/cache';

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
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    const userId = user?.id || user?.username || 'anon';
    const userBase = user?.baseUnit || 'all';
    const cacheKey = `not-eligible:${userId}:${userBase}:${baseUnit}:${directorate}:${mode}:${limit}:${offset}`;

    const cached = serverCache.get<{ data: any[]; totalCount: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'X-Total-Count': cached.totalCount.toString(),
        },
      });
    }

    let paginationClause = Prisma.empty;
    if (limit && limit > 0) {
      paginationClause = Prisma.sql`LIMIT ${limit} OFFSET ${offset}`;
    }

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

      const countRows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "public"."equipment"
        WHERE ${Prisma.join(conditions, ' AND ')}
      `;
      const totalCount = countRows[0]?.count || 0;

      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM "public"."equipment"
        WHERE ${Prisma.join(conditions, ' AND ')}
        ORDER BY "sn" ASC
        ${paginationClause}
      `;

      const result = rows.map(mapEquipmentRow);
      serverCache.set(cacheKey, { data: result, totalCount }, 60000);

      return NextResponse.json(result, {
        headers: {
          'X-Cache': 'MISS',
          'X-Total-Count': totalCount.toString(),
        },
      });
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

    const countRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "public"."equipment"
      WHERE ${Prisma.join(conditions, ' AND ')}
    `;
    const totalCount = countRows[0]?.count || 0;

    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment"
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY "sn" ASC
      ${paginationClause}
    `;

    // Fast Single-Query Issue Record Resolution (Eliminates N+1 DB Queries)
    const eqIds = rows.map(r => BigInt(r.id));
    const issueRecordMap = new Map<string, any>();

    if (eqIds.length > 0) {
      const allIssueRecords: any[] = await prisma.$queryRaw`
        SELECT DISTINCT ON (i."equipment_id")
          i."id", i."equipment_id", i."issued_to" as "issuedTo", i."issued_office" as "issuedOffice",
          i."issued_base" as "issuedBase", i."issued_at" as "issuedAt",
          i."section_label" as "sectionLabel", i."pc_number" as "pcNumber",
          i."letter_ref" as "letterRef", i."letter_authority" as "letterAuthority",
          e."sn", e."equipment_type" as "equipmentType", e."brand_model" as "brandModel",
          e."processor", e."generation", e."ram_gb" as "ramGb", e."storage_type" as "storageType"
        FROM "public"."issue_records" i
        LEFT JOIN "public"."equipment" e ON e."id" = i."equipment_id"
        WHERE i."equipment_id" IN (${Prisma.join(eqIds)})
        ORDER BY i."equipment_id", i."issued_at" DESC
      `;

      allIssueRecords.forEach(r => {
        issueRecordMap.set(r.equipment_id.toString(), {
          id: r.id?.toString(),
          issuedTo: r.issuedTo,
          issuedOffice: r.issuedOffice,
          issuedBase: r.issuedBase,
          issuedAt: r.issuedAt,
          sectionLabel: r.sectionLabel,
          pcNumber: r.pcNumber,
          letterRef: r.letterRef,
          letterAuthority: r.letterAuthority,
          equipment: r.sn ? {
            sn: Number(r.sn),
            equipmentType: r.equipmentType,
            brandModel: r.brandModel,
            processor: r.processor,
            generation: r.generation ? Number(r.generation) : null,
            ramGb: r.ramGb ? Number(r.ramGb) : null,
            storageType: r.storageType,
          } : null
        });
      });
    }

    const equipmentList = rows.map((row) => {
      const mapped = mapEquipmentRow(row);
      const safeId = row.id.toString();
      const latestIssue = issueRecordMap.get(safeId);
      return {
        ...mapped,
        issueRecords: latestIssue ? [latestIssue] : [],
        withdrawalRecords: [],
      };
    });

    serverCache.set(cacheKey, { data: equipmentList, totalCount }, 60000);

    return NextResponse.json(equipmentList, {
      headers: {
        'X-Cache': 'MISS',
        'X-Total-Count': totalCount.toString(),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch not-eligible equipment' }, { status: 500 });
  }
}
