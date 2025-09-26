import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    console.log(`GET /api/progress/${params.courseId} - Request received`);
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Proxy to backend
    const backendResponse = await fetch(`http://localhost:4000/api/progress/${params.courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const result = await backendResponse.json();
    console.log('Progress retrieved successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting progress:', error);
    return NextResponse.json(
      { error: `Failed to get progress: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
