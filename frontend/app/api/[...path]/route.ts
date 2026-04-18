import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(params);
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(params);
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(params);
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(params);
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  const resolvedParams = await Promise.resolve(params);
  return handleRequest(request, resolvedParams, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    let path = (params.path || []).join('/');
    console.log(`[API Proxy] Received ${method} request for path:`, path);
    console.log(`[API Proxy] Params:`, params);

    if (path.startsWith('api/')) {
      path = path.slice(4);
    }

    if (path.startsWith('community/')) {
      console.log(`[API Proxy] Community route skipped`);
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (path.startsWith('certificates/')) {
      console.log(`[API Proxy] Certificate route skipped`);
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    if (path.includes('register') && method !== 'GET' && method !== 'HEAD') {
      try {
        const body = await request.clone().text();
        console.log(`Register request body (first 200 chars):`, body.substring(0, 200));
      } catch {
        // ignore
      }
    }

    return proxyToBackendApi(request, path, method);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: 'See server logs' },
      { status: 500 }
    );
  }
}
