import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';
import { Prisma } from '@prisma/client';
import { serverCache, invalidateEquipmentCache } from '@/lib/cache';

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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const directorate = searchParams.get('directorate') || '';
    const baseUnit = searchParams.get('baseUnit') || '';
    const status = searchParams.get('status') || '';
    const equipmentType = searchParams.get('type') || '';
    const adStatus = searchParams.get('adStatus') || '';
    const isNewPc = searchParams.get('isNewPc') || '';
    const issueStatus = searchParams.get('issueStatus') || '';
    const win11Eligible = searchParams.get('win11Eligible') || '';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : null;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

    // Secure cache key scoped to user session and role
    const userId = user?.id || user?.username || 'anon';
    const userBase = user?.baseUnit || 'all';
    const cacheKey = `equipment:${userId}:${userBase}:${search}:${directorate}:${baseUnit}:${status}:${equipmentType}:${adStatus}:${isNewPc}:${issueStatus}:${win11Eligible}:${limit}:${offset}`;

    const cached = serverCache.get<{ data: any[]; totalCount: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached.data, {
        headers: {
          'X-Cache': 'HIT',
          'X-Total-Count': cached.totalCount.toString(),
        },
      });
    }

    const conditions: Prisma.Sql[] = [];

    // Role-based Access Control (RBAC): Non-admin users can ONLY see equipment belonging to their assigned baseUnit
    if (user && user.role !== 'admin' && user.baseUnit) {
      conditions.push(Prisma.sql`"base_unit" = ${user.baseUnit}`);
    } else if (baseUnit) {
      conditions.push(Prisma.sql`"base_unit" = ${baseUnit}`);
    }

    if (directorate) conditions.push(Prisma.sql`"directorate" = ${directorate}`);
    if (status) conditions.push(Prisma.sql`"status" = ${status}`);
    if (equipmentType) conditions.push(Prisma.sql`"equipment_type" = ${equipmentType}`);
    if (adStatus) conditions.push(Prisma.sql`"ad_status" = ${adStatus}`);
    if (isNewPc === 'true') conditions.push(Prisma.sql`"is_new_pc" = true`);
    if (isNewPc === 'false') conditions.push(Prisma.sql`"is_new_pc" = false`);
    if (issueStatus) conditions.push(Prisma.sql`"issue_status" = ${issueStatus}`);
    if (win11Eligible) conditions.push(Prisma.sql`"win11_eligible" LIKE ${'%' + win11Eligible + '%'}`);

    if (search) {
      const searchPattern = '%' + search + '%';
      conditions.push(Prisma.sql`(
        "directorate" ILIKE ${searchPattern} OR
        "base_unit" ILIKE ${searchPattern} OR
        "equipment_type" ILIKE ${searchPattern} OR
        "brand_model" ILIKE ${searchPattern} OR
        "serial_no" ILIKE ${searchPattern} OR
        "processor" ILIKE ${searchPattern} OR
        "location" ILIKE ${searchPattern} OR
        "status" ILIKE ${searchPattern} OR
        "ad_status" ILIKE ${searchPattern} OR
        "ad_remark" ILIKE ${searchPattern}
      )`);
    }

    const whereClause = conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

    const countRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "public"."equipment"
      ${whereClause}
    `;
    const totalCount = countRows[0]?.count || 0;

    let paginationClause = Prisma.empty;
    if (limit && limit > 0) {
      paginationClause = Prisma.sql`LIMIT ${limit} OFFSET ${offset}`;
    }

    const rows: any[] = await prisma.$queryRaw`
      SELECT * FROM "public"."equipment"
      ${whereClause}
      ORDER BY "sn" ASC
      ${paginationClause}
    `;

    const equipment = rows.map(mapEquipmentRow);

    // Save in secure server cache for 60 seconds
    serverCache.set(cacheKey, { data: equipment, totalCount }, 60000);

    return NextResponse.json(equipment, {
      headers: {
        'X-Cache': 'MISS',
        'X-Total-Count': totalCount.toString(),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Assign baseUnit based on user role
    const assignedBaseUnit = user.role === 'admin' ? (body.baseUnit || 'Air HQ') : user.baseUnit;

    const processor = body.processor || null;
    const generation = body.generation ? parseInt(body.generation) : null;
    const ramGb = body.ramGb ? parseInt(body.ramGb) : null;
    const ssdGb = body.ssdGb ? parseInt(body.ssdGb) : 0;
    const hddGb = body.hddGb ? parseInt(body.hddGb) : 0;

    const win10Eligible = body.win10Eligible || calcWin10(processor, generation, ramGb);
    const win11Eligible = body.win11Eligible || calcWin11(processor, generation, ramGb, ssdGb, hddGb);
    const storageType = body.storageType || calcStorageType(ssdGb, hddGb);

    let sn = body.sn ? parseInt(body.sn) : 0;
    if (!sn) {
      const maxItem = await prisma.equipment.findFirst({ orderBy: { sn: 'desc' } });
      sn = maxItem ? maxItem.sn + 1 : 1;
    }

    const isNew = Boolean(body.isNewPc);

    const equipment = await prisma.equipment.create({
      data: {
        sn,
        baseUnit: assignedBaseUnit,
        directorate: isNew 
          ? (body.intendedOffice || body.directorate || 'General') 
          : (body.directorate || 'General'),
        equipmentType: body.equipmentType || 'Desktop',
        brandModel: body.brandModel || null,
        serialNo: body.serialNo || null,
        processor,
        generation,
        ramGb,
        ssdGb,
        hddGb,
        storageType,
        status: isNew ? 'Svc' : (body.status || 'Svc'),
        location: body.location || null,
        issueStatus: isNew ? 'Not Issued' : (body.issueStatus || 'Issued'),
        isNewPc: isNew,
        intendedOffice: isNew ? (body.intendedOffice || null) : null,
        intendedBase: isNew ? (body.intendedBase || null) : null,
        adStatus: body.adStatus || 'Pending',
        adRemark: body.adRemark || null,
        win10Remark: body.win10Remark || null,
        win10Eligible,
        win11Eligible,
      },
    });

    invalidateEquipmentCache();

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create equipment' }, { status: 500 });
  }
}
