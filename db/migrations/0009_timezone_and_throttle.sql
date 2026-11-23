-- 1) Nigerian time. The database's own clock zone differs between hosts (UTC on Neon), so queries convert
--    explicitly instead of relying on the session timezone. Keep in sync with APP_TIMEZONE in src/lib/config.ts.
CREATE FUNCTION lagos(ts timestamptz) RETURNS timestamp
  LANGUAGE sql IMMUTABLE PARALLEL SAFE
  AS $$ SELECT ts AT TIME ZONE 'Africa/Lagos' $$;

-- 2) Failed sign-in tracking, so repeated wrong passwords lock further attempts for a while.
CREATE TABLE login_throttle (
  key          text PRIMARY KEY,            -- "u:<username>", "ip:<address>" or "pw:<user id>"
  failures     integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz
);
