import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

    // Proxy to your actual backend
    const backendResponse = await fetch('http://localhost:4000/api/teacher/live-sessions', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend responded with ${backendResponse.status}`);
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
