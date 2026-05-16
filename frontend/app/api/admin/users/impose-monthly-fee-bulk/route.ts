import { NextRequest } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

/** POST /api/admin/users/impose-monthly-fee-bulk */
export async function POST(request: NextRequest) {
  return proxyToBackendApi(request, 'admin/users/impose-monthly-fee-bulk', 'POST');
}
