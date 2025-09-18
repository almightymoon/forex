import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Define protected routes and their required roles
const protectedRoutes = {
  '/teacher': ['teacher', 'admin'],
  '/admin': ['admin'],
  '/dashboard': ['student', 'teacher', 'admin']
};

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/about',
  '/community',
  '/payment',
  '/not-found',
  '/404'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // For now, let client-side handle authentication
  // This prevents middleware from interfering with login flow
  // The layout components will handle the actual authentication and role checking
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, register, forgot-password (public auth pages)
     * - about, community (public pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|forgot-password|about|community).*)',
  ],
};
