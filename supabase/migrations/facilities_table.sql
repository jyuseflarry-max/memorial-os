-- ── On-campus facilities (used for practice scheduling) ───────────────────
-- Separate from the `locations` table which holds off-campus venues for games.

CREATE TABLE IF NOT EXISTS facilities (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON facilities
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Add facility_id to practice_schedule
ALTER TABLE practice_schedule
  ADD COLUMN IF NOT EXISTS facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL;
