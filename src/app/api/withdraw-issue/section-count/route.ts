import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Count active (Issued) PCs in a given section/issuedTo within an office
// Used to preview PC-N label before submitting the issue form
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section') || '';
    const office = searchParams.get('office') || '';
    const base = searchParams.get('base') || '';

    if (!section || !office || !base) {
      return NextResponse.json({ count: 0 });
    }

    // Count active issue records (equipment still Issued) for this section/office/base
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

    return NextResponse.json({ count });
  } catch (error) {
    console.error('section-count API error:', error);
    return NextResponse.json({ count: 0 });
  }
}
