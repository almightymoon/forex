import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute

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
    
    // Get client IP for rate limiting
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
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
    
    // Create cache key
    const cacheKey = `courses:${category || 'all'}:${level || 'all'}:${search || 'all'}`;
    
    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached courses data');
      return NextResponse.json(cached.data);
    }
    
    // Build backend URL with query parameters
    let backendUrl = 'http://localhost:4000/api/courses';
    const params = new URLSearchParams();
    
    if (category) params.append('category', category);
    if (level) params.append('level', level);
    if (search) params.append('search', search);
    
    if (params.toString()) {
      backendUrl += `?${params.toString()}`;
    }
    
    console.log('Fetching from backend:', backendUrl);
    
    // Proxy to backend
    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const courses = await backendResponse.json();
    console.log('Courses fetched successfully:', courses.length);
    
    // Cache the response
    cache.set(cacheKey, {
      data: courses,
      timestamp: Date.now()
    });
    
    return NextResponse.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: `Failed to fetch courses: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
