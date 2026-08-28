import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '';

async function proxy(request: NextRequest, messageId: string) {
  const backendUrl = `${BACKEND_URL}/api/community/messages/${messageId}/reaction`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') headers.set(key, value);
  });
  const body = request.method === 'POST' ? await request.text() : undefined;
  const response = await fetch(backendUrl, { method: request.method, headers, body });
  const responseBody = await response.text();
  const newResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
  });
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'content-encoding') newResponse.headers.set(key, value);
  });
  return newResponse;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return proxy(request, id);
  } catch (error) {
    console.error('Community reaction API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
