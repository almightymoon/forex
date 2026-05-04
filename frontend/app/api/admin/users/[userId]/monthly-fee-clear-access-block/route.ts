import { NextRequest } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

/**
 * POST /api/admin/users/:id/monthly-fee-clear-access-block
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  return proxyToBackendApi(request, `admin/users/${userId}/monthly-fee-clear-access-block`, 'POST');
}
