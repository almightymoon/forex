import { NextRequest } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyToBackendApi(request, 'certificates/my-certificates', 'GET');
}
