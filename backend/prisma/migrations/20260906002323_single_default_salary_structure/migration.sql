-- A-09: enforce a single default salary structure.
-- Step 1: reconcile existing data - keep only the OLDEST default, demote others.
UPDATE salary_structures
SET is_default = false
WHERE is_default = true
  AND id NOT IN (
    SELECT id
    FROM salary_structures
    WHERE is_default = true
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Step 2: partial unique index - the database now rejects any second default,
-- protecting against application races and direct writes.
CREATE UNIQUE INDEX salary_structures_single_default_idx
  ON salary_structures ((1))
  WHERE is_default = true;
