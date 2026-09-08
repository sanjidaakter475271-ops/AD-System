import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ 
    req, 
    secret: process.env.NEXTAUTH_SECRET || 'air-hq-inventory-super-secret-key-2026-baf-secure' 
  });

  const { pathname } = req.nextUrl;

  // Protected paths
  const isProtectedPath = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/equipment') ||
    pathname.startsWith('/analysis') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/import') ||
    pathname.startsWith('/export') ||
    pathname.startsWith('/users');

  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if logged in user visits /login
  if (pathname === '/login' && token) {
    const dashboardUrl = new URL('/dashboard', req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/equipment/:path*',
    '/analysis/:path*',
    '/search/:path*',
    '/import/:path*',
    '/export/:path*',
    '/users/:path*',
    '/login',
  ],
};
