-- ── Drill Category & Objective Junction Tables ───────────────────────────────
-- Converts drills.categories (text[]) and drills.objectives (text[]) into
-- proper relational junction tables with foreign key constraints.
--
-- ON DELETE CASCADE on drill_id and category_id/objective_id means:
--   • Delete a drill        → its assignments vanish automatically
--   • Delete a category     → every drill that used it loses that assignment
--   • Delete an objective   → same
--
-- Run this ONCE in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Junction table: drills ↔ drill_categories
CREATE TABLE IF NOT EXISTS drill_category_assignments (
  drill_id    UUID NOT NULL REFERENCES drills(id)          ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES drill_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (drill_id, category_id)
);

-- 2. Junction table: drills ↔ drill_objectives
CREATE TABLE IF NOT EXISTS drill_objective_assignments (
  drill_id     UUID NOT NULL REFERENCES drills(id)           ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES drill_objectives(id)  ON DELETE CASCADE,
  PRIMARY KEY (drill_id, objective_id)
);

-- 3. Indexes for reverse-lookup (e.g. "which drills use category X?")
CREATE INDEX IF NOT EXISTS idx_dca_category ON drill_category_assignments (category_id);
CREATE INDEX IF NOT EXISTS idx_doa_objective ON drill_objective_assignments (objective_id);

-- 4. RLS — scope reads through the parent drill's tenant
ALTER TABLE drill_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_objective_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drill_category_assignments_tenant" ON drill_category_assignments;
CREATE POLICY "drill_category_assignments_tenant"
  ON drill_category_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drills d
      JOIN users  u ON u.id = auth.uid()
      WHERE d.id = drill_id
        AND d.tenant_id = u.tenant_id
    )
  );

DROP POLICY IF EXISTS "drill_objective_assignments_tenant" ON drill_objective_assignments;
CREATE POLICY "drill_objective_assignments_tenant"
  ON drill_objective_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drills d
      JOIN users  u ON u.id = auth.uid()
      WHERE d.id = drill_id
        AND d.tenant_id = u.tenant_id
    )
  );

-- 5. Migrate existing data from the old text[] columns
--    Skip rows where the name no longer matches any live category/objective.
INSERT INTO drill_category_assignments (drill_id, category_id)
SELECT d.id, dc.id
FROM   drills d
CROSS  JOIN LATERAL unnest(COALESCE(d.categories, ARRAY[]::text[])) AS cat_name
JOIN   drill_categories dc
       ON  dc.name      = cat_name
       AND dc.tenant_id = d.tenant_id
ON CONFLICT DO NOTHING;

INSERT INTO drill_objective_assignments (drill_id, objective_id)
SELECT d.id, dobj.id
FROM   drills d
CROSS  JOIN LATERAL unnest(COALESCE(d.objectives, ARRAY[]::text[])) AS obj_name
JOIN   drill_objectives dobj
       ON  dobj.name      = obj_name
       AND dobj.tenant_id = d.tenant_id
ON CONFLICT DO NOTHING;

-- 6. Drop the old text[] columns from drills
--    (data is now safely in the junction tables above)
ALTER TABLE drills DROP COLUMN IF EXISTS categories;
ALTER TABLE drills DROP COLUMN IF EXISTS objectives;
