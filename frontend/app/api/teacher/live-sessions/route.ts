import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { buildBackendApiUrl } from '@/lib/apiBackendProxy';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token directly
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decodedToken || (decodedToken.role !== 'teacher' && decodedToken.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Only teachers and admins can access this route' }, { status: 403 });
    }

    const backendResponse = await fetch(buildBackendApiUrl(request, 'teacher/live-sessions'), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new NextResponse(errorText || JSON.stringify({ error: 'Backend error' }), {
        status: backendResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const backendData = await backendResponse.json();
    return NextResponse.json(backendData);
  } catch (error) {
    console.error('Error fetching teacher live sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
