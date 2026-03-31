-- ── Attendance Reporting Extension ──────────────────────────────────────────
-- Adds makeup workflow, proof upload tracking, and coach review columns
-- to the existing practice_attendance table.
-- Run this ONCE in Supabase SQL Editor.

-- 1. Add new columns (idempotent via ADD COLUMN IF NOT EXISTS)
ALTER TABLE practice_attendance
  ADD COLUMN IF NOT EXISTS makeup_required    BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS makeup_proof_url   TEXT,
  ADD COLUMN IF NOT EXISTS makeup_proof_name  TEXT,
  ADD COLUMN IF NOT EXISTS makeup_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID          REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at        TIMESTAMPTZ;

-- 2. Index: quickly find all records requiring makeup for a tenant/team
CREATE INDEX IF NOT EXISTS idx_attendance_makeup
  ON practice_attendance (tenant_id, makeup_required)
  WHERE makeup_required = true;

-- 3. Index: coach review queue (unreviewed absences)
CREATE INDEX IF NOT EXISTS idx_attendance_unreviewed
  ON practice_attendance (tenant_id, reviewed_at)
  WHERE reviewed_at IS NULL;

-- 4. Storage bucket for attendance proof uploads
-- (Run this separately in the Supabase Dashboard → Storage if the SQL editor
--  does not support storage.buckets INSERT for your plan)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attendance-proof',
  'attendance-proof',
  false,
  10485760,   -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: players can upload to their own folder only
--    Path convention: {tenant_id}/{player_id}/{filename}
--    CREATE POLICY has no IF NOT EXISTS; use DROP IF EXISTS first to stay idempotent.
DROP POLICY IF EXISTS "Players can upload their own proof" ON storage.objects;
CREATE POLICY "Players can upload their own proof"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attendance-proof'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Players can view their own proof" ON storage.objects;
CREATE POLICY "Players can view their own proof"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-proof'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Staff can view all proof in their tenant" ON storage.objects;
CREATE POLICY "Staff can view all proof in their tenant"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attendance-proof'
    AND EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin','coach','manager')
        AND u.tenant_id::text = (storage.foldername(name))[1]
    )
  );
