-- Church reports: initial schema (single church, admin + submitter roles)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'submitter');
CREATE TYPE finance_type AS ENUM ('income', 'expense');

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'submitter',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

CREATE TABLE sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- Lookup tables managed by admins
CREATE TABLE services (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL UNIQUE,            -- e.g. "Sunday First Service"
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE departments (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL UNIQUE,            -- e.g. "Choir", "Ushers"
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE finance_categories (
  id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name   text NOT NULL,                   -- e.g. "Tithes", "Building fund"
  type   finance_type NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (name, type)
);

-- Reports
CREATE TABLE attendance_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id   uuid NOT NULL REFERENCES services(id),
  service_date date NOT NULL,
  men          integer NOT NULL DEFAULT 0 CHECK (men >= 0),
  women        integer NOT NULL DEFAULT 0 CHECK (women >= 0),
  children     integer NOT NULL DEFAULT 0 CHECK (children >= 0),
  first_timers integer NOT NULL DEFAULT 0 CHECK (first_timers >= 0),
  notes        text,
  submitted_by uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, service_date)
);

-- Amounts stored in minor units (kobo/cents) to avoid float errors
CREATE TABLE finance_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  uuid NOT NULL REFERENCES finance_categories(id),
  service_id   uuid REFERENCES services(id),
  entry_date   date NOT NULL,
  amount_minor bigint NOT NULL CHECK (amount_minor > 0),
  note         text,
  submitted_by uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_entries_date_idx ON finance_entries (entry_date);

CREATE TABLE membership_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   date NOT NULL UNIQUE,      -- Monday of the reporting week
  new_converts integer NOT NULL DEFAULT 0 CHECK (new_converts >= 0),
  baptisms     integer NOT NULL DEFAULT 0 CHECK (baptisms >= 0),
  new_members  integer NOT NULL DEFAULT 0 CHECK (new_members >= 0),
  notes        text,
  submitted_by uuid NOT NULL REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ministry_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id),
  report_date   date NOT NULL,
  title         text NOT NULL,
  summary       text NOT NULL,
  submitted_by  uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ministry_reports_dept_date_idx ON ministry_reports (department_id, report_date);
