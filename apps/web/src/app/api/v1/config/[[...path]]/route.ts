// ──────────────────────────────────────────────
// TradeMind — Public Configuration Routes
// GET /api/v1/config/public
// GET /api/v1/config/banner
// No auth required — public data only
// ──────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { configManager } from '@trademind/config';
import { ok, apiError } from '@/lib/server/response';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path } = await params;
    const action = path?.[0];

    if (action === 'banner') return handleBanner();
    return handlePublic();
  } catch (err: unknown) {
    console.error('[Config GET] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return apiError(message, 500);
  }
}

async function handlePublic() {
  try {
    const publicConfigs = await configManager.getPublicConfigs();
    return ok(publicConfigs);
  } catch {
    return apiError('Failed to retrieve public configuration', 500);
  }
}

async function handleBanner() {
  try {
    const publicConfigs = await configManager.getPublicConfigs();
    return ok({
      enabled: Boolean(publicConfigs['system.announcement_banner_enabled']),
      text: String(publicConfigs['system.announcement_banner_text'] ?? ''),
      type: String(publicConfigs['system.announcement_banner_type'] ?? 'info'),
      link: String(publicConfigs['system.announcement_banner_link'] ?? ''),
      linkText: String(publicConfigs['system.announcement_banner_link_text'] ?? 'Learn More'),
      maintenanceMode: Boolean(publicConfigs['system.maintenance_mode']),
    });
  } catch {
    return apiError('Failed to retrieve announcement banner', 500);
  }
}
