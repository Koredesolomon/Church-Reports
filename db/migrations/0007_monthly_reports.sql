-- Rebuild around monthly department reports with a review workflow.
-- The earlier per-type report tables, services and finance categories are replaced.

DROP VIEW IF EXISTS report_feed;
DROP TABLE IF EXISTS attendance_reports, finance_entries, membership_reports, ministry_reports,
                     finance_categories, services CASCADE;
DROP TYPE IF EXISTS finance_type;

-- Users: heads belong to a department; admins and leadership do not
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_department_chk;
ALTER TABLE users ADD CONSTRAINT users_role_department_chk
  CHECK ((role = 'head' AND department_id IS NOT NULL)
      OR (role IN ('admin', 'leadership') AND department_id IS NULL));

-- Departments: a fixed list; each one files one kind of monthly report
CREATE TYPE report_kind AS ENUM ('department', 'financial', 'new_members');
ALTER TABLE departments DROP COLUMN IF EXISTS report_types;
ALTER TABLE departments ADD COLUMN report_kind report_kind NOT NULL DEFAULT 'department';
ALTER TABLE departments ADD COLUMN full_name text;
ALTER TABLE departments ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

INSERT INTO departments (name, full_name, report_kind, sort_order) VALUES
  ('Treasury', NULL, 'financial', 1),
  ('Membership office', NULL, 'new_members', 2),
  ('FWI', 'Foursquare Women International', 'department', 3),
  ('CFM', 'Council of Foursquare Men', 'department', 4),
  ('Youth', NULL, 'department', 5),
  ('Teens', NULL, 'department', 6),
  ('Children', NULL, 'department', 7),
  ('Welfare', NULL, 'department', 8),
  ('Choir', NULL, 'department', 9),
  ('Media', NULL, 'department', 10),
  ('Usher', NULL, 'department', 11),
  ('Evangelism', NULL, 'department', 12),
  ('Intercessory', NULL, 'department', 13),
  ('Maintenance', NULL, 'department', 14),
  ('Sunday School', NULL, 'department', 15)
ON CONFLICT (name) DO UPDATE
  SET full_name = EXCLUDED.full_name, report_kind = EXCLUDED.report_kind, sort_order = EXCLUDED.sort_order;

-- Monthly reports (one per department per month)
CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'returned', 'approved');

CREATE TABLE reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id  uuid NOT NULL REFERENCES departments(id),
  period         date NOT NULL CHECK (period = date_trunc('month', period)::date), -- first day of the reported month
  kind           report_kind NOT NULL,
  status         report_status NOT NULL DEFAULT 'draft',
  data           jsonb NOT NULL DEFAULT '{}',
  created_by     uuid NOT NULL REFERENCES users(id),
  submitted_by   uuid REFERENCES users(id),
  submitted_at   timestamptz,
  reviewed_by    uuid REFERENCES users(id),
  reviewed_at    timestamptz,
  review_comment text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, period)
);
CREATE INDEX reports_period_idx ON reports (period, status);

CREATE TABLE report_attachments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  filename     text NOT NULL,
  content_type text NOT NULL,
  size         integer NOT NULL,
  data         bytea NOT NULL,
  uploaded_by  uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX report_attachments_report_idx ON report_attachments (report_id);

CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      text NOT NULL,
  body       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);
CREATE INDEX notifications_user_idx ON notifications (user_id, created_at DESC);

-- Members
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'transferred_out');
CREATE SEQUENCE member_no_seq START 1;

CREATE TABLE members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_no      text NOT NULL UNIQUE DEFAULT ('M-' || lpad(nextval('member_no_seq')::text, 4, '0')),
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  gender         text CHECK (gender IN ('Female', 'Male')),
  date_of_birth  date,
  marital_status text CHECK (marital_status IN ('Single', 'Married', 'Widowed', 'Divorced')),
  phone          text NOT NULL,
  email          text,
  address        text,
  kin_name       text,
  kin_phone      text,
  date_joined    date,
  status         member_status NOT NULL DEFAULT 'active',
  baptised       boolean,
  notes          text,                      -- visible to the admin only
  created_by     uuid REFERENCES users(id),
  updated_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX members_phone_key ON members (regexp_replace(phone, '\D', '', 'g'));
CREATE INDEX members_name_idx ON members (lower(last_name), lower(first_name));

CREATE TABLE member_departments (
  member_id     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id),
  PRIMARY KEY (member_id, department_id)
);
CREATE INDEX member_departments_dept_idx ON member_departments (department_id);
