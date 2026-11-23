-- Sign in with a username instead of an email. Email becomes optional contact info.
ALTER TABLE users ADD COLUMN username text;
UPDATE users SET username = email;
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
