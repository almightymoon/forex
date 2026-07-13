import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl } from '@/lib/apiBackendProxy';

// Force dynamic rendering since we use headers
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const backendUrl = buildBackendApiUrl(request, 'certificates/teacher/courses');
    const response = await fetch(backendUrl, {
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
