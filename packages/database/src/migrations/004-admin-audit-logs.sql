-- TradeMind — Migration: immutable admin audit log

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_email varchar(255) NOT NULL,
  action varchar(100) NOT NULL,
  entity_type varchar(100) NOT NULL,
  entity_id varchar(255),
  metadata jsonb,
  ip_address varchar(64),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
  ON admin_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_entity_idx
  ON admin_audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx
  ON admin_audit_logs (created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id::text = auth.uid()::text AND users.role = 'ADMIN'
  ));
