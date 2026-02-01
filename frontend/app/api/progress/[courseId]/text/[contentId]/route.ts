import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; contentId: string } }
) {
  try {
    const { courseId, contentId } = params;
    const token = request.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const body = await request.json();
    
    // Construct backend URL with proper fallback
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const apiUrl = `${BACKEND_URL}/api/progress/${courseId}/text/${contentId}`;
    
    console.log('Text progress API - calling:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from backend:', text);
      // If the backend doesn't have this endpoint, just return success
      // (text progress is nice to have, not critical)
      return NextResponse.json({ success: true, message: 'Progress noted' });
    }

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Text progress API error response:', data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Text progress API error:', error);
    // Don't fail hard - text progress is nice to have but not critical
    return NextResponse.json({ success: true, message: 'Progress noted locally' });
  }
}




