import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function POST(
  request: NextRequest,
  { params }: { params: { certificateId: string } }
) {
  try {
    const token = request.headers.get('authorization');
    
    if (!token) {
      return NextResponse.json({ error: 'No authorization token' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/certificates/regenerate/${params.certificateId}`, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error regenerating certificate:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate certificate' },
      { status: 500 }
    );
  }
}
