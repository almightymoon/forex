import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl } from '@/lib/apiBackendProxy';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Simple in-memory cache (public / unauthenticated lists only)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // Max 100 requests per minute (increased for production)

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }
  
  const requests = requestCounts.get(ip);
  // Remove old requests outside the window
  const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  requestCounts.set(ip, recentRequests);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  recentRequests.push(now);
  return false;
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/courses - Request received');
    
    // Get client IP for rate limiting (NextRequest has no `ip` in Next 15)
    const forwarded = request.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(',')[0]?.trim() || 'unknown';
    
    // Check rate limiting
    if (isRateLimited(ip)) {
      console.log('Rate limited for IP:', ip);
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const level = searchParams.get('level');
    const search = searchParams.get('search');
    const bust = searchParams.get('bust');
    const authHeader = request.headers.get('authorization');
    
    // Build backend URL with query parameters
    let backendUrl = buildBackendApiUrl(request, 'courses');
    const params = new URLSearchParams();
    
    if (category) params.append('category', category);
    if (level) params.append('level', level);
    if (search) params.append('search', search);
    
    if (params.toString()) {
      backendUrl += `?${params.toString()}`;
    }

    // Authenticated lists are package-scoped — never serve a shared public cache entry
    if (!authHeader) {
      const cacheKey = `courses:${category || 'all'}:${level || 'all'}:${search || 'all'}`;
      if (bust) {
        cache.clear();
      } else {
        const cached = cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('Returning cached courses data');
          return NextResponse.json(cached.data);
        }
      }
    }
    
    console.log('Fetching from backend:', backendUrl);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    // Proxy to backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      // Return error directly without wrapping to prevent recursion
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      return new NextResponse(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const courses = await backendResponse.json();
    console.log('Courses fetched successfully:', Array.isArray(courses) ? courses.length : 0);
    
    // Cache only unauthenticated public responses
    if (!authHeader) {
      const cacheKey = `courses:${category || 'all'}:${level || 'all'}:${search || 'all'}`;
      cache.set(cacheKey, {
        data: courses,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
