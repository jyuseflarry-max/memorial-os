-- Enforce one category per drill
-- Step 1: Remove duplicates — keep the assignment with the smallest category_id per drill
DELETE FROM drill_category_assignments
WHERE (drill_id, category_id) NOT IN (
  SELECT DISTINCT ON (drill_id) drill_id, category_id
  FROM drill_category_assignments
  ORDER BY drill_id, category_id
);

-- Step 2: Add unique constraint so only one category row per drill is ever allowed
ALTER TABLE drill_category_assignments
  ADD CONSTRAINT uq_drill_single_category UNIQUE (drill_id);
