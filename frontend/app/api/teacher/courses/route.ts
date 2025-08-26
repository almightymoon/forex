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
      console.log('GET - Token decoded successfully');
      console.log('Full decoded token:', JSON.stringify(decodedToken, null, 2));
      console.log('Role from token:', decodedToken?.role);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decodedToken || (decodedToken.role !== 'teacher' && decodedToken.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden - Only teachers and admins can access this route' }, { status: 403 });
    }

    // Proxy to your actual backend
    const backendResponse = await fetch('http://localhost:4000/api/teacher/courses', {
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
    console.error('Error fetching teacher courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/teacher/courses - Request received');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);

    // Verify JWT token directly
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      console.log('POST - Token decoded successfully');
      console.log('Full decoded token:', JSON.stringify(decodedToken, null, 2));
      console.log('Role from token:', decodedToken?.role);
      console.log('User ID from token:', decodedToken?.userId);
      console.log('Email from token:', decodedToken?.email);
    } catch (error) {
      console.log('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decodedToken || (decodedToken.role !== 'teacher' && decodedToken.role !== 'admin')) {
      console.log('User not authorized:', decodedToken?.role);
      return NextResponse.json({ error: 'Forbidden - Only teachers and admins can access this route' }, { status: 403 });
    }

    const courseData = await request.json();
    console.log('Course data received:', JSON.stringify(courseData, null, 2));

    // Check if backend is accessible
    console.log('Attempting to connect to backend at http://localhost:4000/api/teacher/courses');
    
    // Proxy to your actual backend
    const backendResponse = await fetch('http://localhost:4000/api/teacher/courses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(courseData)
    });

    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend success response:', backendData);
    return NextResponse.json(backendData);
  } catch (error) {
    console.error('Error creating teacher course:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('PUT /api/teacher/courses - Request received');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);

    // Verify JWT token directly
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      console.log('PUT - Token decoded successfully');
      console.log('Full decoded token:', JSON.stringify(decodedToken, null, 2));
      console.log('Role from token:', decodedToken?.role);
      console.log('User ID from token:', decodedToken?.userId);
      console.log('Email from token:', decodedToken?.email);
    } catch (error) {
      console.log('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decodedToken || (decodedToken.role !== 'teacher' && decodedToken.role !== 'admin')) {
      console.log('User not authorized:', decodedToken?.role);
      return NextResponse.json({ error: 'Forbidden - Only teachers and admins can access this route' }, { status: 403 });
    }

    const courseData = await request.json();
    console.log('Course update data received:', JSON.stringify(courseData, null, 2));

    // Check if backend is accessible
    console.log('Attempting to connect to backend at http://localhost:4000/api/teacher/courses');
    
    // Proxy to your actual backend
    const backendResponse = await fetch('http://localhost:4000/api/teacher/courses', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(courseData)
    });

    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend success response:', backendData);
    return NextResponse.json(backendData);
  } catch (error) {
    console.error('Error updating teacher course:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('DELETE /api/teacher/courses - Request received');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      console.log('No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Token received, length:', token.length);

    // Verify JWT token directly
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      console.log('DELETE - Token decoded successfully');
      console.log('Full decoded token:', JSON.stringify(decodedToken, null, 2));
      console.log('Role from token:', decodedToken?.role);
      console.log('User ID from token:', decodedToken?.userId);
      console.log('Email from token:', decodedToken?.email);
    } catch (error) {
      console.log('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!decodedToken || (decodedToken.role !== 'teacher' && decodedToken.role !== 'admin')) {
      console.log('User not authorized:', decodedToken?.role);
      return NextResponse.json({ error: 'Forbidden - Only teachers and admins can access this route' }, { status: 403 });
    }

    // Get course ID from URL
    const url = new URL(request.url);
    const courseId = url.searchParams.get('id');
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    console.log('Deleting course with ID:', courseId);

    // Check if backend is accessible
    console.log('Attempting to connect to backend at http://localhost:4000/api/teacher/courses');
    
    // Proxy to your actual backend
    const backendResponse = await fetch(`http://localhost:4000/api/teacher/courses?id=${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Backend response status:', backendResponse.status);
    console.log('Backend response headers:', Object.fromEntries(backendResponse.headers.entries()));

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend error response:', errorText);
      throw new Error(`Backend responded with ${backendResponse.status}: ${errorText}`);
    }

    const backendData = await backendResponse.json();
    console.log('Backend success response:', backendData);
    return NextResponse.json(backendData);
  } catch (error) {
    console.error('Error deleting teacher course:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
