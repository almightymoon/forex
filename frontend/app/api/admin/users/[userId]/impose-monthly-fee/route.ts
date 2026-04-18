import { NextRequest } from 'next/server';
import { proxyToBackendApi } from '@/lib/apiBackendProxy';

/**
 * Explicit route so POST always resolves in the App Router (some setups were 404ing on the
 * generic `api/[...path]` catch-all for this path). Forwards to Express:
 * POST /api/admin/users/:id/impose-monthly-fee
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> | { userId: string } }
) {
  const { userId } = await Promise.resolve(context.params);
  return proxyToBackendApi(request, `admin/users/${userId}/impose-monthly-fee`, 'POST');
}
