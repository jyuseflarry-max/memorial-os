-- ── Add 'Family' to users role check constraint ───────────────────────────
-- The original users_role_check did not include 'Family', causing inserts
-- from the family registration flow to fail.

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('Admin', 'Coach', 'Manager', 'Player', 'Family'));
