import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`POST /api/courses/${id}/enroll - Request received`);
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Get request body if it exists (enroll endpoint might not need a body)
    let body = null;
    try {
      const bodyText = await request.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch (error) {
      // Body is optional, continue without it
      console.log('No request body or invalid JSON, continuing without body');
    }
    
    // Build backend URL
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://thefxnavigators.com';
    const backendUrl = BACKEND_URL.includes('/api') 
      ? `${BACKEND_URL}/courses/${id}/enroll`
      : `${BACKEND_URL}/api/courses/${id}/enroll`;
    
    console.log('Fetching from backend:', backendUrl);
    
    // Proxy to backend
    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(errorJson, {
          status: backendResponse.status
        });
      } catch {
        return new NextResponse(errorText || 'Enrollment failed', {
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Check if response has content before parsing
    const responseText = await backendResponse.text();
    if (!responseText || responseText.trim() === '') {
      console.log('Backend returned empty response, returning success');
      return NextResponse.json({ 
        message: 'Enrolled successfully',
        success: true 
      });
    }

    try {
      const result = JSON.parse(responseText);
      console.log('Course enrollment successful');
      return NextResponse.json(result);
    } catch (parseError) {
      console.log('Response is not JSON, returning as success');
      return NextResponse.json({ 
        message: responseText || 'Enrolled successfully',
        success: true 
      });
    }
  } catch (error) {
    console.error('Error enrolling in course:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
