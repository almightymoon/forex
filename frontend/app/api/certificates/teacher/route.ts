import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    console.log('Frontend API route - Token:', token ? `${token.substring(0, 20)}...` : 'No token');
    console.log('Frontend API route - Backend URL:', `${BACKEND_URL}/api/certificates/teacher/courses`);
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/certificates/teacher/courses`, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    console.log('Frontend API route - Backend response status:', response.status);
    const data = await response.json();
    console.log('Frontend API route - Backend response data:', data);
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching teacher certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}
