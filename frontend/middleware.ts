import { NextRequest, NextResponse } from 'next/server';

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
  '/404',
  '/f',
  '/e',
];

/** Block scanner POSTs that trigger "Failed to find Server Action" noise (this app has no Server Actions). */
function isBogusServerActionProbe(request: NextRequest): boolean {
  const actionId = request.headers.get('next-action') || request.headers.get('Next-Action');
  if (!actionId) return false;
  const id = actionId.trim();
  return id.length < 12 || id === 'x';
}

export function middleware(request: NextRequest) {
  if (request.method === 'POST' && isBogusServerActionProbe(request)) {
    return new NextResponse(null, { status: 400 });
  }

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

  // Check if this is a protected route
  const protectedRoute = Object.keys(protectedRoutes).find(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (protectedRoute) {
    const requiredRoles = protectedRoutes[protectedRoute];
    
    // Get token from cookies or Authorization header
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('Middleware - Protected route:', protectedRoute);
    console.log('Middleware - Required roles:', requiredRoles);
    console.log('Middleware - Token found:', !!token);

    if (!token) {
      // Redirect to login with error message
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('error', 'not_authenticated');
      return NextResponse.redirect(loginUrl);
    }

    // For now, skip JWT verification in middleware due to Edge runtime limitations
    // The backend will handle JWT verification for API calls
    // The admin layout will handle client-side authentication checks
    console.log('Middleware - Skipping JWT verification (Edge runtime limitation)');
    console.log('Middleware - Allowing access to:', protectedRoute);
    return NextResponse.next();
  }

  // Not a protected route, allow access
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
