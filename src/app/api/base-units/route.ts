import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BASE_UNITS } from '@/lib/constants';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    let dbBaseUnits = await prisma.baseUnit.findMany({
      include: { offices: true },
      orderBy: { name: 'asc' },
    });

    // If database has no BaseUnits yet, seed default ones
    if (dbBaseUnits.length === 0) {
      for (const bName of BASE_UNITS) {
        await prisma.baseUnit.create({
          data: { name: bName },
        }).catch(() => {});
      }
      dbBaseUnits = await prisma.baseUnit.findMany({
        include: { offices: true },
        orderBy: { name: 'asc' },
      });
    }

    // Role-based filtering for base units
    let result = dbBaseUnits;
    if (user && user.role !== 'admin' && user.baseUnit) {
      result = dbBaseUnits.filter((b) => b.name === user.baseUnit);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch base units' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // Only admin can add new Base Units
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only system admins can create new Base / Units' }, { status: 403 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Base unit name is required' }, { status: 400 });
    }

    const baseUnit = await prisma.baseUnit.create({
      data: { name: name.trim() },
      include: { offices: true },
    });

    return NextResponse.json(baseUnit);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Base Unit already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create Base Unit' }, { status: 500 });
  }
}
