-- ============================================================
-- INVENTORY MODULE — Database Migration
-- Run in Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- ── 1. Condition ENUM ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE inventory_condition AS ENUM ('New', 'Good', 'Fair', 'Poor', 'Retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Categories ─────────────────────────────────────────────────────────
-- tenant_id = NULL → global seed visible to all tenants
CREATE TABLE IF NOT EXISTS inventory_categories (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  useful_life_years    NUMERIC     NOT NULL DEFAULT 3,
  depreciation_method  TEXT        NOT NULL DEFAULT 'straight_line'
                       CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'none')),
  UNIQUE NULLS NOT DISTINCT (tenant_id, name)
);

-- ── 3. Parent Item Catalog ────────────────────────────────────────────────
-- One row per item TYPE. Physical units are in inventory_instances.
CREATE TABLE IF NOT EXISTS inventory_items (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  description       TEXT,
  category_id       UUID        NOT NULL REFERENCES inventory_categories(id),
  purchase_price    NUMERIC(10,2),
  useful_life_years NUMERIC     NOT NULL DEFAULT 3,
  purchased_at      DATE,       -- when this batch was bought; drives depreciation clock
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── 4. Physical Instances ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_instances (
  id                    UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID                NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id               UUID                NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  instance_number       TEXT,               -- barcode / serial / tag number
  size                  TEXT,
  condition             inventory_condition NOT NULL DEFAULT 'New',
  team_id               UUID                REFERENCES teams(id) ON DELETE SET NULL,
  assigned_player_id    UUID                REFERENCES players(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ,        -- server-set on assign
  purchased_at          DATE,               -- overrides parent item purchased_at if set
  receipt_confirmed_at  TIMESTAMPTZ,        -- server-set on player confirmation
  receipt_confirmed_by  UUID                REFERENCES users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ         DEFAULT now()
);

-- ── 5. Kit Templates ─────────────────────────────────────────────────────
-- items JSONB: [{ "item_id": "<uuid>", "size": "10.5" }, ...]
CREATE TABLE IF NOT EXISTS inventory_kit_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  team_id     UUID        REFERENCES teams(id) ON DELETE SET NULL,
  items       JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 6. Settings (one row per tenant, upsert pattern) ─────────────────────
CREATE TABLE IF NOT EXISTS inventory_settings (
  tenant_id               UUID        PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  recovery_valuation      TEXT        NOT NULL DEFAULT 'depreciated'
                          CHECK (recovery_valuation IN ('original', 'depreciated', 'fixed_pct')),
  recovery_pct            NUMERIC(5,2) DEFAULT 100.00,
  alumni_buyback_enabled  BOOLEAN     NOT NULL DEFAULT false,
  alumni_buyback_pct      NUMERIC(5,2) DEFAULT 50.00,
  updated_at              TIMESTAMPTZ  DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_instances_player
  ON inventory_instances(tenant_id, assigned_player_id);

CREATE INDEX IF NOT EXISTS idx_inv_instances_team
  ON inventory_instances(tenant_id, team_id);

CREATE INDEX IF NOT EXISTS idx_inv_instances_condition
  ON inventory_instances(tenant_id, condition);

-- Partial index: fast unconfirmed-receipt queries
CREATE INDEX IF NOT EXISTS idx_inv_instances_unconfirmed
  ON inventory_instances(tenant_id, receipt_confirmed_at)
  WHERE receipt_confirmed_at IS NULL AND assigned_player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_items_tenant
  ON inventory_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inv_items_category
  ON inventory_items(tenant_id, category_id);

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE inventory_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_instances     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_kit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_settings      ENABLE ROW LEVEL SECURITY;

-- Categories: own rows + global seeds (tenant_id IS NULL)
CREATE POLICY "inv_categories_select" ON inventory_categories
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "inv_categories_insert" ON inventory_categories
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "inv_categories_update" ON inventory_categories
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
CREATE POLICY "inv_categories_delete" ON inventory_categories
  FOR DELETE USING (
    tenant_id IS NOT NULL
    AND tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

-- Standard tenant isolation for the remaining tables
CREATE POLICY "inv_items_tenant" ON inventory_items
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "inv_instances_tenant" ON inventory_instances
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "inv_kit_templates_tenant" ON inventory_kit_templates
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "inv_settings_tenant" ON inventory_settings
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- ── Seed: Global Categories ───────────────────────────────────────────────
INSERT INTO inventory_categories (tenant_id, name, useful_life_years, depreciation_method) VALUES
  (NULL, 'Footwear',           2, 'straight_line'),
  (NULL, 'Uniform Top',        3, 'straight_line'),
  (NULL, 'Uniform Bottom',     3, 'straight_line'),
  (NULL, 'Practice Shorts',    2, 'straight_line'),
  (NULL, 'Warm-Up Jacket',     4, 'straight_line'),
  (NULL, 'Warm-Up Pants',      4, 'straight_line'),
  (NULL, 'Helmet',             5, 'declining_balance'),
  (NULL, 'Shoulder Pads',      5, 'declining_balance'),
  (NULL, 'Gloves',             1, 'straight_line'),
  (NULL, 'Backpack / Bag',     4, 'straight_line'),
  (NULL, 'Compression',        2, 'straight_line'),
  (NULL, 'Accessories',        2, 'none')
ON CONFLICT DO NOTHING;
