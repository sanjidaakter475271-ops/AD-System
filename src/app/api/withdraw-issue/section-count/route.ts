import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Count active (Issued) & Withdrawn PCs in a given section/issuedTo within an office, OR full breakdown if no section provided
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || '';
    const office = searchParams.get('office') || '';
    const base = searchParams.get('base') || '';

    // Standard specific check for single section
    if (section && office && base) {
      const count = await prisma.issueRecord.count({
        where: {
          issuedTo: section,
          issuedOffice: office,
          issuedBase: base,
          equipment: {
            issueStatus: 'Issued',
          },
        },
      });

      const withdrawnCount = await prisma.equipment.count({
        where: {
          baseUnit: base,
          directorate: office,
          location: section,
          issueStatus: 'Withdrawn',
        },
      });

      return NextResponse.json({ count, withdrawnCount });
    }

    // 3-Level Breakdown: base -> office -> section
    const where: any = {};
    if (base) where.baseUnit = base;
    if (office) where.directorate = office;

    const equipments = await prisma.equipment.findMany({
      where,
      select: {
        baseUnit: true,
        directorate: true,
        location: true,
        issueStatus: true,
      },
    });

    const hierarchy: Record<string, Record<string, Record<string, { total: number; issued: number; withdrawn: number }>>> = {};

    equipments.forEach(eq => {
      const b = eq.baseUnit || 'Air HQ';
      const o = eq.directorate || 'General';
      const s = eq.location || 'Unassigned Section';

      if (!hierarchy[b]) hierarchy[b] = {};
      if (!hierarchy[b][o]) hierarchy[b][o] = {};
      if (!hierarchy[b][o][s]) {
        hierarchy[b][o][s] = { total: 0, issued: 0, withdrawn: 0 };
      }

      hierarchy[b][o][s].total += 1;
      if (eq.issueStatus === 'Issued') hierarchy[b][o][s].issued += 1;
      if (eq.issueStatus === 'Withdrawn') hierarchy[b][o][s].withdrawn += 1;
    });

    return NextResponse.json(hierarchy);
  } catch (error) {
    console.error('section-count API error:', error);
    return NextResponse.json({ error: 'Failed to fetch section count breakdown' }, { status: 500 });
  }
}
