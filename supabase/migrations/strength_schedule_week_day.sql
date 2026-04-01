-- Add program_week and program_day to strength_schedule
-- Allows a scheduled session to be pinned to a specific week/day within the program.

ALTER TABLE strength_schedule
  ADD COLUMN IF NOT EXISTS program_week integer,
  ADD COLUMN IF NOT EXISTS program_day  integer;
