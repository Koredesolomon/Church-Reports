-- Every non-admin user is the head of exactly one department, and each
-- department has at most one head. Reports belong to a department so each
-- head's dashboard is scoped to their own data.

ALTER TABLE users ADD COLUMN department_id uuid REFERENCES departments(id);

-- One head per department
CREATE UNIQUE INDEX users_department_id_key ON users (department_id) WHERE department_id IS NOT NULL;

-- Submitters (department heads) must have a department; admins must not
ALTER TABLE users ADD CONSTRAINT users_role_department_chk
  CHECK ((role = 'submitter' AND department_id IS NOT NULL)
      OR (role = 'admin' AND department_id IS NULL));

-- Which report types a department may submit (ministry activity is always allowed)
ALTER TABLE departments
  ADD COLUMN report_types text[] NOT NULL DEFAULT '{}'
  CHECK (report_types <@ ARRAY['attendance','finance','membership']);

-- Scope reports to departments (tables are empty at this stage)
ALTER TABLE attendance_reports ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id);
ALTER TABLE finance_entries    ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id);
ALTER TABLE membership_reports ADD COLUMN department_id uuid NOT NULL REFERENCES departments(id);

-- Uniqueness is now per department
ALTER TABLE attendance_reports DROP CONSTRAINT attendance_reports_service_id_service_date_key;
ALTER TABLE attendance_reports ADD UNIQUE (department_id, service_id, service_date);
ALTER TABLE membership_reports DROP CONSTRAINT membership_reports_week_start_key;
ALTER TABLE membership_reports ADD UNIQUE (department_id, week_start);

CREATE INDEX attendance_reports_dept_idx ON attendance_reports (department_id, service_date);
CREATE INDEX finance_entries_dept_idx    ON finance_entries (department_id, entry_date);
CREATE INDEX membership_reports_dept_idx ON membership_reports (department_id, week_start);
