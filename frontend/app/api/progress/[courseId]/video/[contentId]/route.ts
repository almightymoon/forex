import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; contentId: string } }
) {
  try {
    console.log(`PUT /api/progress/${params.courseId}/video/${params.contentId} - Request received`);
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Get request body
    const body = await request.json();
    
    // Proxy to backend
    const backendResponse = await fetch(`http://localhost:4000/api/progress/${params.courseId}/video/${params.contentId}`, {
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
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const result = await backendResponse.json();
    console.log('Video progress updated successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating video progress:', error);
    return NextResponse.json(
      { error: `Failed to update video progress: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
