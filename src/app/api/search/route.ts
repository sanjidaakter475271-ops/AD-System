import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const { searchParams } = new URL(request.url);
    const directorate = searchParams.get('directorate');

    let rows: any[];
    if (directorate) {
      rows = await prisma.$queryRaw`
        SELECT * FROM "public"."equipment" WHERE "directorate" = ${directorate}
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT * FROM "public"."equipment"
      `;
    }

    return NextResponse.json(rows.map(mapEquipmentRow));
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to search equipment' }, { status: 500 });
  }
}
