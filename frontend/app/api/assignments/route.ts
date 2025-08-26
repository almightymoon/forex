import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/assignments - Request received');
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Get request body
    const body = await request.json();
    
    // Proxy to backend
    const backendResponse = await fetch('http://localhost:4000/api/assignments', {
      method: 'POST',
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
    console.log('Assignment created successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: `Failed to create assignment: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/assignments - Request received');
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    
    // Build backend URL with query parameters
    let backendUrl = 'http://localhost:4000/api/assignments';
    if (courseId) {
      backendUrl += `?courseId=${courseId}`;
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

    const assignments = await backendResponse.json();
    console.log('Assignments fetched successfully:', assignments.length);
    
    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: `Failed to fetch assignments: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
