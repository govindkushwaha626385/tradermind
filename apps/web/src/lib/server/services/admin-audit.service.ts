// ──────────────────────────────────────────────
// TradeMind — Admin Audit Service
// ──────────────────────────────────────────────

import { adminAuditLogs, getDatabase } from '@trademind/database';

export async function recordAdminAudit(params: {
  actor: { id: string; email: string };
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  const db = getDatabase();
  await db.insert(adminAuditLogs).values({
    actorId: params.actor.id,
    actorEmail: params.actor.email,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    ipAddress: params.ipAddress,
  });
}
