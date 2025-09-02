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
    
    console.log('Fetching from backend: http://localhost:4000/api/settings/public');
    
    // Proxy to backend
    const backendResponse = await fetch('http://localhost:4000/api/settings/public', {
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
      { error: `Failed to fetch settings: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

