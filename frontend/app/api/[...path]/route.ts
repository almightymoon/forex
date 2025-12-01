import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    let path = params.path.join('/');
    
    // Strip 'api/' prefix if it exists to prevent duplication
    if (path.startsWith('api/')) {
      path = path.slice(4); // Remove 'api/' (4 characters)
    }
    
    // Skip community routes - they have dedicated handlers
    if (path.startsWith('community/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    // Skip certificate routes - they have dedicated handlers
    if (path.startsWith('certificates/')) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    const url = new URL(request.url);
    // Build backend URL - BACKEND_URL already includes /api
    const backendUrl = BACKEND_URL.includes('/api') 
      ? `${BACKEND_URL}/${path}${url.search}`
      : `${BACKEND_URL}/api/${path}${url.search}`;
    
    console.log(`Catch-all API proxy: ${method} ${path} -> ${backendUrl}`);

    // Get the request body if it exists
    let body = null;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await request.text();
        // Log request body for debugging (truncated)
        if (path.includes('register')) {
          console.log(`Register request body (first 200 chars):`, body.substring(0, 200));
        }
      } catch (error) {
        console.error('Error reading request body:', error);
        // No body to read
      }
    }

    // Forward headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Don't forward host header
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });
    
    // Ensure Content-Type is set for POST/PUT/PATCH requests with body
    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Make request to backend
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();
    
    // Log error responses for debugging
    if (!response.ok) {
      console.error(`Backend error (${response.status}):`, {
        url: backendUrl,
        method,
        status: response.status,
        body: responseBody.substring(0, 500) // First 500 chars
      });
    }

    // Create new response with same status and headers
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers from backend response
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });

    return newResponse;
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: 'See server logs' },
      { status: 500 }
    );
  }
}
