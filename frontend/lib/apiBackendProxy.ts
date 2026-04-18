import { NextRequest, NextResponse } from 'next/server';

function isThisProjectProductionApiHost(hostname: string): boolean {
  const h = (hostname || '').toLowerCase();
  return h === 'thefxnavigators.com' || h.endsWith('.thefxnavigators.com');
}

/**
 * Backend origin for the Next `/api/*` proxy. Local UI must not accidentally use a production
 * BACKEND_URL (newer Express routes then 404 on prod).
 */
export function getBackendOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || '';
  const isLocalUi =
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]') ||
    host.startsWith('::1');

  if (isLocalUi) {
    const raw = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
    if (raw) {
      try {
        const origin = raw.includes('://') ? raw : `http://${raw}`;
        const u = new URL(origin);
        if (isThisProjectProductionApiHost(u.hostname)) {
          console.warn(
            '[API Proxy] BACKEND_URL points at production while the UI host is local; using http://localhost:4000 so new routes resolve against your dev API.'
          );
          return 'http://localhost:4000';
        }
      } catch {
        // Invalid BACKEND_URL — fall through to default
      }
      return raw;
    }
    return 'http://localhost:4000';
  }

  const fromEnv = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '').trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'https://thefxnavigators.com';
}

/**
 * @param relativeApiPath e.g. `admin/users/<id>/impose-monthly-fee` (no `api/` prefix)
 */
export async function proxyToBackendApi(
  request: NextRequest,
  relativeApiPath: string,
  method: string
): Promise<NextResponse> {
  let path = relativeApiPath.replace(/^\//, '');
  if (path.startsWith('api/')) {
    path = path.slice(4);
  }

  const url = new URL(request.url);
  const base = getBackendOrigin(request);
  const backendUrl = base.includes('/api')
    ? `${base}/${path}${url.search}`
    : `${base}/api/${path}${url.search}`;

  console.log(`[API Proxy] ${method} ${path} -> ${backendUrl}`);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'connection') return;
    // Let undici set length from the actual forwarded body (text vs binary differs from client).
    if (lower === 'content-length') return;
    headers.set(key, value);
  });

  const contentType = request.headers.get('content-type') || '';

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.toLowerCase().includes('multipart/form-data')) {
      try {
        const buf = await request.arrayBuffer();
        body = buf.byteLength ? buf : undefined;
      } catch (error) {
        console.error('Error reading multipart body for proxy:', error);
      }
    } else {
      try {
        const text = await request.text();
        if (text.length > 0) {
          body = text;
          if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
          }
        }
      } catch (error) {
        console.error('Error reading request body:', error);
      }
    }
  }

  const response = await fetch(backendUrl, {
    method,
    headers,
    body
  });

  const responseBody = await response.text();

  if (!response.ok) {
    console.error(`Backend error (${response.status}):`, {
      url: backendUrl,
      method,
      status: response.status,
      body: responseBody.substring(0, 500)
    });
  }

  const newResponse = new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText
  });
  response.headers.forEach((value, key) => {
    newResponse.headers.set(key, value);
  });
  return newResponse;
}
