import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: channelId } = await params;
    const backendUrl = `${BACKEND_URL}/api/community/channels/${channelId}/pinned`;
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') headers.set(key, value);
    });
    const response = await fetch(backendUrl, { method: 'GET', headers });
    const responseBody = await response.text();
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') newResponse.headers.set(key, value);
    });
    return newResponse;
  } catch (error) {
    console.error('Community pinned API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
