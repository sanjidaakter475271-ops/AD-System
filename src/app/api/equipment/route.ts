import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calcWin10, calcWin11, calcStorageType } from '@/lib/eligibility';

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

    const where: any = {};

    // Role-based Access Control (RBAC): Non-admin users can ONLY see equipment belonging to their assigned baseUnit
    if (user && user.role !== 'admin' && user.baseUnit) {
      where.baseUnit = user.baseUnit;
    } else if (baseUnit) {
      where.baseUnit = baseUnit;
    }

    if (directorate) where.directorate = directorate;
    if (status) where.status = status;
    if (equipmentType) where.equipmentType = equipmentType;
    if (adStatus) where.adStatus = adStatus;
    if (isNewPc === 'true') where.isNewPc = true;
    if (isNewPc === 'false') where.isNewPc = false;
    if (issueStatus) where.issueStatus = issueStatus;
    if (win11Eligible) where.win11Eligible = { contains: win11Eligible };

    if (search) {
      where.OR = [
        { directorate: { contains: search } },
        { baseUnit: { contains: search } },
        { equipmentType: { contains: search } },
        { brandModel: { contains: search } },
        { serialNo: { contains: search } },
        { processor: { contains: search } },
        { location: { contains: search } },
        { status: { contains: search } },
        { adStatus: { contains: search } },
        { adRemark: { contains: search } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where,
      orderBy: { sn: 'asc' },
    });

    return NextResponse.json(equipment);
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

    const equipment = await prisma.equipment.create({
      data: {
        sn,
        baseUnit: assignedBaseUnit,
        directorate: body.directorate || 'General',
        equipmentType: body.equipmentType || 'Desktop',
        brandModel: body.brandModel || null,
        serialNo: body.serialNo || null,
        processor,
        generation,
        ramGb,
        ssdGb,
        hddGb,
        storageType,
        status: body.status || 'Svc',
        location: body.location || null,
        issueStatus: body.issueStatus || 'Not Issued',
        isNewPc: Boolean(body.isNewPc),
        intendedOffice: body.isNewPc ? (body.intendedOffice || null) : null,
        intendedBase: body.isNewPc ? (body.intendedBase || null) : null,
        adStatus: body.adStatus || 'Pending',
        adRemark: body.adRemark || null,
        win10Remark: body.win10Remark || null,
        win10Eligible,
        win11Eligible,
      },
    });

    return NextResponse.json(equipment);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create equipment' }, { status: 500 });
  }
}
