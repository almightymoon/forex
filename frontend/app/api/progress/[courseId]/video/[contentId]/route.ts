import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; contentId: string }> }
) {
  try {
    const { courseId, contentId } = await params;
    console.log(`PUT /api/progress/${courseId}/video/${contentId} - Request received`);
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Get request body
    const body = await request.json();
    
    // Proxy to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/progress/${courseId}/video/${contentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      return new NextResponse(errorText, {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await backendResponse.json();
    console.log('Video progress updated successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating video progress:', error);
    return NextResponse.json(
      { error: 'Failed to update video progress' },
      { status: 500 }
    );
  }
}
