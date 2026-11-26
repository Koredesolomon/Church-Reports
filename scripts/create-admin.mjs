// Creates or updates the admin account from environment variables (.env.local):
//   ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD
// Run:  npm run db:admin
// Safe to re-run: if an admin exists, its username, name and password are set to match the env values.
import postgres from "postgres";
import { hash } from "@node-rs/argon2";

const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL; // direct connection preferred
const missing = Object.entries({ DATABASE_URL, ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD }).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Set these in .env.local first: ${missing.join(", ")}`);
  process.exit(1);
}
if (!/^[A-Za-z0-9._@-]{3,40}$/.test(ADMIN_USERNAME)) {
  console.error("ADMIN_USERNAME must be 3-40 characters: letters, numbers and . _ @ - only.");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1 });
try {
  const passwordHash = await hash(ADMIN_PASSWORD);
  const [existing] = await sql`SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL ORDER BY created_at LIMIT 1`;
  if (existing) {
    await sql`UPDATE users SET name = ${ADMIN_NAME}, username = ${ADMIN_USERNAME}, password_hash = ${passwordHash},
              must_change_password = false, active = true WHERE id = ${existing.id}`;
    await sql`DELETE FROM sessions WHERE user_id = ${existing.id}`;
    console.log(`Admin updated: sign in with username "${ADMIN_USERNAME}".`);
  } else {
    await sql`INSERT INTO users (name, username, role, password_hash, must_change_password)
              VALUES (${ADMIN_NAME}, ${ADMIN_USERNAME}, 'admin', ${passwordHash}, false)`;
    console.log(`Admin created: sign in with username "${ADMIN_USERNAME}".`);
  }
} catch (e) {
  if (e.code === "23505") console.error("That username is already used by another user.");
  else throw e;
  process.exitCode = 1;
} finally {
  await sql.end();
}
