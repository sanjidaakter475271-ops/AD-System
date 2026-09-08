import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const { id } = await params;

    const equipment = await prisma.equipment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!equipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin check
    if (user && user.role !== 'admin' && equipment.baseUnit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this Base Unit item' }, { status: 403 });
    }

    return NextResponse.json(equipment);
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

    const existing = await prisma.equipment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Non-admin check
    if (user && user.role !== 'admin' && existing.baseUnit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: You can only modify equipment in your base unit' }, { status: 403 });
    }

    const body = await request.json();
    
    const sanitizedData = {
      ...body,
      baseUnit: user.role === 'admin' ? (body.baseUnit || existing.baseUnit) : existing.baseUnit,
      sn: typeof body.sn === 'string' ? parseInt(body.sn) : body.sn,
      generation: body.generation ? parseInt(body.generation) : null,
      ramGb: body.ramGb ? parseInt(body.ramGb) : null,
      ssdGb: body.ssdGb ? parseInt(body.ssdGb) : 0,
      hddGb: body.hddGb ? parseInt(body.hddGb) : 0,
    };

    const equipment = await prisma.equipment.update({
      where: { id: parseInt(id) },
      data: sanitizedData,
    });
    return NextResponse.json(equipment);
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

    const existing = await prisma.equipment.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user && user.role !== 'admin' && existing.baseUnit !== user.baseUnit) {
      return NextResponse.json({ error: 'Forbidden: You can only delete equipment in your base unit' }, { status: 403 });
    }

    await prisma.equipment.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
  }
}
