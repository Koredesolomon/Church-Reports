-- Roles: admin, head (department head), leadership (view only)
ALTER TYPE user_role RENAME VALUE 'submitter' TO 'head';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'leadership';
