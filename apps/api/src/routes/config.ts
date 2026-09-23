// ──────────────────────────────────────────────
// TradeMind — Public Configuration Routes
// Exposes safe, public configuration values to the frontend
// (e.g. system announcement banners, fee defaults, public limits)
// ──────────────────────────────────────────────

import { Hono } from 'hono';
import { configManager } from '@trademind/config';

export const configRouter = new Hono();

/**
 * GET /config/public
 * Returns all public configuration settings
 */
configRouter.get('/public', async (c) => {
  try {
    const publicConfigs = await configManager.getPublicConfigs();
    return c.json({
      success: true,
      data: publicConfigs,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { message: 'Failed to retrieve public configuration' },
      },
      500,
    );
  }
});

/**
 * GET /config/banner
 * Returns the currently active announcement banner and system status
 */
configRouter.get('/banner', async (c) => {
  try {
    const publicConfigs = await configManager.getPublicConfigs();
    return c.json({
      success: true,
      data: {
        enabled: Boolean(publicConfigs['system.announcement_banner_enabled']),
        text: String(publicConfigs['system.announcement_banner_text'] ?? ''),
        type: String(publicConfigs['system.announcement_banner_type'] ?? 'info'),
        link: String(publicConfigs['system.announcement_banner_link'] ?? ''),
        linkText: String(publicConfigs['system.announcement_banner_link_text'] ?? 'Learn More'),
        maintenanceMode: Boolean(publicConfigs['system.maintenance_mode']),
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: { message: 'Failed to retrieve announcement banner' },
      },
      500,
    );
  }
});
