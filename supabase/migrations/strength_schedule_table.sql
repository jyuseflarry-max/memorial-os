-- ── Strength schedule ─────────────────────────────────────────────────────
-- Scheduled lifting sessions with optional program assignment.

CREATE TABLE IF NOT EXISTS strength_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id      uuid REFERENCES teams(id) ON DELETE SET NULL,
  schedule_date date NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  program_id   uuid REFERENCES strength_programs(id) ON DELETE SET NULL,
  facility_id  uuid REFERENCES facilities(id) ON DELETE SET NULL,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE strength_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON strength_schedule
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS strength_schedule_tenant_date
  ON strength_schedule(tenant_id, schedule_date);
