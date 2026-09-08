import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const directorate = searchParams.get('directorate');
    
    const where: any = {};
    if (directorate) where.directorate = directorate;
    
    const results = await prisma.equipment.findMany({ where });
    return NextResponse.json(results);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to search equipment' }, { status: 500 });
  }
}
