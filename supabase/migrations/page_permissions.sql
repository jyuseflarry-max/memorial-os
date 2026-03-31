-- ── Page Permissions ─────────────────────────────────────────────────────
-- Stores per-tenant overrides to the default role-based page access matrix.
-- Hardcoded defaults live in the API layer; only overrides go here.

CREATE TABLE IF NOT EXISTS page_permissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_key     TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('Admin', 'Coach', 'Manager', 'Player', 'Family')),
  access_level TEXT NOT NULL DEFAULT 'none' CHECK (access_level IN ('none', 'view', 'edit', 'full')),
  UNIQUE (tenant_id, page_key, role)
);

CREATE INDEX IF NOT EXISTS idx_page_permissions_tenant_role ON page_permissions(tenant_id, role);

-- ── Seed defaults for all existing tenants ────────────────────────────────
-- Cross-join tenants × default permission matrix.
-- ON CONFLICT DO NOTHING makes this idempotent (safe to re-run).

INSERT INTO page_permissions (tenant_id, page_key, role, access_level)
SELECT
  t.id AS tenant_id,
  defaults.page_key,
  defaults.role,
  defaults.access_level
FROM tenants t
CROSS JOIN (
  VALUES
    -- messages
    ('messages', 'Admin',   'full'),
    ('messages', 'Coach',   'full'),
    ('messages', 'Manager', 'full'),
    ('messages', 'Player',  'full'),
    ('messages', 'Family',  'none'),
    -- roster
    ('roster', 'Admin',   'full'),
    ('roster', 'Coach',   'full'),
    ('roster', 'Manager', 'edit'),
    ('roster', 'Player',  'none'),
    ('roster', 'Family',  'none'),
    -- readiness
    ('readiness', 'Admin',   'full'),
    ('readiness', 'Coach',   'full'),
    ('readiness', 'Manager', 'edit'),
    ('readiness', 'Player',  'none'),
    ('readiness', 'Family',  'none'),
    -- player_groups
    ('player_groups', 'Admin',   'full'),
    ('player_groups', 'Coach',   'full'),
    ('player_groups', 'Manager', 'edit'),
    ('player_groups', 'Player',  'none'),
    ('player_groups', 'Family',  'none'),
    -- build_plan
    ('build_plan', 'Admin',   'full'),
    ('build_plan', 'Coach',   'full'),
    ('build_plan', 'Manager', 'edit'),
    ('build_plan', 'Player',  'none'),
    ('build_plan', 'Family',  'none'),
    -- view_plans
    ('view_plans', 'Admin',   'full'),
    ('view_plans', 'Coach',   'full'),
    ('view_plans', 'Manager', 'view'),
    ('view_plans', 'Player',  'view'),
    ('view_plans', 'Family',  'none'),
    -- drill_vault
    ('drill_vault', 'Admin',   'full'),
    ('drill_vault', 'Coach',   'full'),
    ('drill_vault', 'Manager', 'view'),
    ('drill_vault', 'Player',  'none'),
    ('drill_vault', 'Family',  'none'),
    -- reports
    ('reports', 'Admin',   'full'),
    ('reports', 'Coach',   'full'),
    ('reports', 'Manager', 'view'),
    ('reports', 'Player',  'none'),
    ('reports', 'Family',  'none'),
    -- attendance_report
    ('attendance_report', 'Admin',   'full'),
    ('attendance_report', 'Coach',   'edit'),
    ('attendance_report', 'Manager', 'view'),
    ('attendance_report', 'Player',  'edit'),
    ('attendance_report', 'Family',  'none'),
    -- game_schedule
    ('game_schedule', 'Admin',   'full'),
    ('game_schedule', 'Coach',   'full'),
    ('game_schedule', 'Manager', 'full'),
    ('game_schedule', 'Player',  'view'),
    ('game_schedule', 'Family',  'none'),
    -- practice_schedule
    ('practice_schedule', 'Admin',   'full'),
    ('practice_schedule', 'Coach',   'full'),
    ('practice_schedule', 'Manager', 'edit'),
    ('practice_schedule', 'Player',  'none'),
    ('practice_schedule', 'Family',  'none'),
    -- weekly_schedule
    ('weekly_schedule', 'Admin',   'full'),
    ('weekly_schedule', 'Coach',   'full'),
    ('weekly_schedule', 'Manager', 'full'),
    ('weekly_schedule', 'Player',  'view'),
    ('weekly_schedule', 'Family',  'none'),
    -- strength
    ('strength', 'Admin',   'full'),
    ('strength', 'Coach',   'full'),
    ('strength', 'Manager', 'edit'),
    ('strength', 'Player',  'edit'),
    ('strength', 'Family',  'none'),
    -- leaderboard
    ('leaderboard', 'Admin',   'full'),
    ('leaderboard', 'Coach',   'full'),
    ('leaderboard', 'Manager', 'view'),
    ('leaderboard', 'Player',  'view'),
    ('leaderboard', 'Family',  'none'),
    -- strength_programs
    ('strength_programs', 'Admin',   'full'),
    ('strength_programs', 'Coach',   'full'),
    ('strength_programs', 'Manager', 'edit'),
    ('strength_programs', 'Player',  'none'),
    ('strength_programs', 'Family',  'none'),
    -- inventory
    ('inventory', 'Admin',   'full'),
    ('inventory', 'Coach',   'edit'),
    ('inventory', 'Manager', 'full'),
    ('inventory', 'Player',  'none'),
    ('inventory', 'Family',  'none'),
    -- inventory_audit
    ('inventory_audit', 'Admin',   'full'),
    ('inventory_audit', 'Coach',   'edit'),
    ('inventory_audit', 'Manager', 'full'),
    ('inventory_audit', 'Player',  'none'),
    ('inventory_audit', 'Family',  'none'),
    -- settings
    ('settings', 'Admin',   'full'),
    ('settings', 'Coach',   'none'),
    ('settings', 'Manager', 'none'),
    ('settings', 'Player',  'none'),
    ('settings', 'Family',  'none'),
    -- family_schedule
    ('family_schedule', 'Admin',   'none'),
    ('family_schedule', 'Coach',   'none'),
    ('family_schedule', 'Manager', 'none'),
    ('family_schedule', 'Player',  'none'),
    ('family_schedule', 'Family',  'view'),
    -- family_games
    ('family_games', 'Admin',   'none'),
    ('family_games', 'Coach',   'none'),
    ('family_games', 'Manager', 'none'),
    ('family_games', 'Player',  'none'),
    ('family_games', 'Family',  'view'),
    -- family_messages
    ('family_messages', 'Admin',   'none'),
    ('family_messages', 'Coach',   'none'),
    ('family_messages', 'Manager', 'none'),
    ('family_messages', 'Player',  'none'),
    ('family_messages', 'Family',  'full')
) AS defaults(page_key, role, access_level)
ON CONFLICT (tenant_id, page_key, role) DO NOTHING;
