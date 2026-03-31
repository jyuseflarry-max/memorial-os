-- ── Add 'school_event' to practice_attendance status ─────────────────────
-- School events are player-reported absences with no consequence.
-- They appear in the attendance report for planning but are not reviewed.

ALTER TABLE practice_attendance
  DROP CONSTRAINT IF EXISTS practice_attendance_status_check;

ALTER TABLE practice_attendance
  ADD CONSTRAINT practice_attendance_status_check
    CHECK (status IN ('excused', 'unexcused', 'school_event'));
