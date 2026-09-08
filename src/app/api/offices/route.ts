import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, baseUnitId } = body;

    if (!name || !name.trim() || !baseUnitId) {
      return NextResponse.json({ error: 'Office name and Base Unit ID are required' }, { status: 400 });
    }

    // Target Base Unit check
    const targetBase = await prisma.baseUnit.findUnique({
      where: { id: parseInt(baseUnitId) },
    });

    if (!targetBase) {
      return NextResponse.json({ error: 'Target Base Unit not found' }, { status: 404 });
    }

    // Permission Check: Admin can add office anywhere; Users can only add offices to their assigned Base Unit
    if (user.role !== 'admin' && user.baseUnit !== targetBase.name) {
      return NextResponse.json({ 
        error: `Forbidden: You can only add offices to your assigned base unit (${user.baseUnit})` 
      }, { status: 403 });
    }

    const office = await prisma.office.create({
      data: {
        name: name.trim(),
        baseUnitId: parseInt(baseUnitId),
      },
    });

    return NextResponse.json(office);
  } catch (error: any) {
    console.error('API Error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Office already exists in this Base Unit' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create office' }, { status: 500 });
  }
}
