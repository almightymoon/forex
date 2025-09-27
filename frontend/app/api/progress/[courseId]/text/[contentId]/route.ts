import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

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
    
    const response = await fetch(`${BACKEND_URL}/api/progress/${courseId}/text/${contentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Text progress API error:', error);
    return NextResponse.json(
      { error: 'Failed to update text progress' },
      { status: 500 }
    );
  }
}

