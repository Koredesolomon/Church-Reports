-- Admin-provisioned accounts: no self-signup. Admin sets a temporary password,
-- and the user must change it on first login.
ALTER TABLE users
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN created_by uuid REFERENCES users(id);
