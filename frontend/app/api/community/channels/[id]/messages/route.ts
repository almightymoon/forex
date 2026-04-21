import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const backendUrl = `${BACKEND_URL}/api/community/channels/${channelId}/messages`;
    
    console.log(`Community messages API: GET ${backendUrl}`);

    // Forward headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    // Make request to backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
    });

    // Get response body
    const responseBody = await response.text();

    console.log(`Community messages response: ${response.status} ${response.statusText}`);

    // Create new response with same status and headers
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers from backend response, but skip content-encoding to avoid gzip issues
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        newResponse.headers.set(key, value);
      }
    });

    return newResponse;
  } catch (error) {
    console.error('Community messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: 'See server logs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const backendUrl = `${BACKEND_URL}/api/community/channels/${channelId}/messages`;
    
    console.log(`Community messages API: POST ${backendUrl}`);

    // Get the request body
    const body = await request.text();

    // Forward headers
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.set(key, value);
      }
    });

    // Make request to backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();

    console.log(`Community messages response: ${response.status} ${response.statusText}`);

    // Create new response with same status and headers
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy headers from backend response, but skip content-encoding to avoid gzip issues
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        newResponse.headers.set(key, value);
      }
    });

    return newResponse;
  } catch (error) {
    console.error('Community messages API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: 'See server logs' },
      { status: 500 }
    );
  }
}
