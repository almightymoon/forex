import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for settings

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/settings/public - Request received');
    
    // Check cache first
    const cacheKey = 'public-settings';
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Returning cached settings data');
      return NextResponse.json(cached.data);
    }
    
    const host = request.nextUrl.hostname;
    const defaultBackend =
      host === 'localhost' || host === '127.0.0.1'
        ? 'http://localhost:4000'
        : 'https://thefxnavigators.com';
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || defaultBackend;
    const backendUrl = BACKEND_URL.includes('/api')
      ? `${BACKEND_URL}/settings/public`
      : `${BACKEND_URL}/api/settings/public`;
    
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
      // Return backend error directly without wrapping to prevent recursion
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      return new NextResponse(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const settings = await backendResponse.json();
    console.log('Settings fetched successfully');
    
    // Cache the response
    cache.set(cacheKey, {
      data: settings,
      timestamp: Date.now()
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

