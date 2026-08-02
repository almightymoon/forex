import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl } from '@/lib/apiBackendProxy';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('GET /api/courses/[id] - Request received for course ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }
    
    const backendUrl = buildBackendApiUrl(request, `courses/${id}`);
    
    console.log('Fetching from backend:', backendUrl);
    
    // Proxy to backend
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    console.log('Backend response status:', backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      
      // If backend returns 404, return 404
      if (backendResponse.status === 404) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
      
      // If backend returns 500 (likely invalid ObjectId), return 404 for consistency
      if (backendResponse.status === 500) {
        return NextResponse.json(
          { error: 'Course not found' },
          { status: 404 }
        );
      }
      
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const course = await backendResponse.json();
    console.log('Course fetched successfully:', course.title);
    
    return NextResponse.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}
