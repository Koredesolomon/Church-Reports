-- Deleting a user who has reports or other history keeps a hidden record, so old reports still show who did what.
ALTER TABLE users ADD COLUMN deleted_at timestamptz;

-- A deleted account gives up its department, so a new head can be registered for it.
ALTER TABLE users DROP CONSTRAINT users_role_department_chk;
ALTER TABLE users ADD CONSTRAINT users_role_department_chk
  CHECK ((deleted_at IS NOT NULL AND department_id IS NULL)
      OR (deleted_at IS NULL AND role = 'head' AND department_id IS NOT NULL)
      OR (deleted_at IS NULL AND role IN ('admin', 'leadership') AND department_id IS NULL));

-- ...and its username can be used again.
DROP INDEX users_username_key;
CREATE UNIQUE INDEX users_username_key ON users (lower(username)) WHERE deleted_at IS NULL;
