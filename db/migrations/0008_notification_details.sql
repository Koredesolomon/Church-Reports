-- Notifications get a destination, a kind (for the icon) and can be archived.
ALTER TABLE notifications ADD COLUMN href text;
ALTER TABLE notifications ADD COLUMN kind text NOT NULL DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN archived_at timestamptz;
CREATE INDEX notifications_inbox_idx ON notifications (user_id, archived_at, read_at);
