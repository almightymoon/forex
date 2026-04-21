import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    console.log(`DELETE /api/progress/${courseId}/reset-all - Request received`);
    
    // Get authorization token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);
    
    // Proxy to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/progress/${courseId}/reset-all`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    console.log('All progress reset successfully');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resetting all progress:', error);
    return NextResponse.json(
      { error: 'Failed to reset all progress' },
      { status: 500 }
    );
  }
}
