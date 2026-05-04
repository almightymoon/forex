import { NextRequest } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

/**
 * PUT /api/admin/users/:id/monthly-fee-billing-anchor
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  return proxyToBackendApi(request, `admin/users/${userId}/monthly-fee-billing-anchor`, 'PUT');
}
