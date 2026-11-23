-- One row per submitted report across all four report tables (dashboards, activity feeds).
CREATE VIEW report_feed AS
  SELECT 'attendance'::text AS kind, id, department_id, submitted_by, service_date AS report_date, created_at FROM attendance_reports
  UNION ALL
  SELECT 'finance', id, department_id, submitted_by, entry_date, created_at FROM finance_entries
  UNION ALL
  SELECT 'membership', id, department_id, submitted_by, week_start, created_at FROM membership_reports
  UNION ALL
  SELECT 'ministry', id, department_id, submitted_by, report_date, created_at FROM ministry_reports;
