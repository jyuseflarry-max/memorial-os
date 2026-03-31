-- ── Attendance Consequences ───────────────────────────────────────────────
-- Stores per-tenant makeup-work descriptions for each absence combination.
-- 4 rows per tenant: (practice|game) × (excused|unexcused).
-- Coaches configure these in Settings → Attendance.

CREATE TABLE IF NOT EXISTS attendance_consequences (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL CHECK (event_type IN ('practice', 'game')),
  status       TEXT        NOT NULL CHECK (status IN ('excused', 'unexcused')),
  makeup_work  TEXT        NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   UUID        REFERENCES users(id),
  UNIQUE (tenant_id, event_type, status)
);

CREATE INDEX IF NOT EXISTS idx_attendance_consequences_tenant
  ON attendance_consequences(tenant_id);

-- Seed one row per combination for every existing tenant with default consequences.
-- ON CONFLICT DO NOTHING makes this idempotent.
INSERT INTO attendance_consequences (tenant_id, event_type, status, makeup_work)
SELECT t.id, c.event_type, c.status, c.makeup_work
FROM tenants t
CROSS JOIN (
  VALUES
    ('practice', 'excused',   '.5 Mile @ 10 Minute Mile Pace or Better'),
    ('practice', 'unexcused', '1 Mile @ 10 Minute Mile Pace or Better'),
    ('game',     'excused',   '.5 Mile @ 8 Minute Mile Pace or Better'),
    ('game',     'unexcused', '1 Mile @ 8 Minute Mile Pace or Better')
) AS c(event_type, status, makeup_work)
ON CONFLICT (tenant_id, event_type, status) DO NOTHING;

-- ── Add event_type to practice_attendance ────────────────────────────────
-- Tracks whether the absence was for a practice or a game.
-- Existing rows default to 'practice'.

ALTER TABLE practice_attendance
  ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'practice'
    CHECK (event_type IN ('practice', 'game'));
