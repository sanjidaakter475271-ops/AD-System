import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        baseUnit: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('User Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { name, username, password, role, baseUnit } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const userRole = role === 'admin' ? 'admin' : 'user';

    const existing = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name ? name.trim() : username.trim(),
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        role: userRole,
        baseUnit: baseUnit || 'Air HQ',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        baseUnit: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser);
  } catch (error: any) {
    console.error('User Create Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create user' }, { status: 500 });
  }
}
