import "server-only";
import { headers } from "next/headers";
import { sql } from "./db";

// Failed sign-ins are counted in the database (serverless instances share no memory).
// Too many wrong passwords in a short window lock that username, and separately that network address, for a while.
export const WINDOW_MINUTES = 15;
export const LOCK_MINUTES = 15;
export const MAX_PER_USERNAME = 5;
export const MAX_PER_ADDRESS = 30; // higher: a whole office can share one address

type Rule = { key: string; max: number };

export async function clientAddress(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

/** Rules for a sign-in attempt. The username is counted whether or not the account exists, so a lockout doesn't reveal which usernames are real. */
export async function loginRules(username: string): Promise<Rule[]> {
  return [
    { key: `u:${username.toLowerCase().slice(0, 100)}`, max: MAX_PER_USERNAME },
    { key: `ip:${await clientAddress()}`, max: MAX_PER_ADDRESS },
  ];
}

/** Minutes until the next attempt is allowed, or 0 when not locked. */
export async function lockedForMinutes(rules: Rule[]): Promise<number> {
  const [r] = await sql<{ mins: number | null }[]>`
    SELECT ceil(extract(epoch FROM (max(locked_until) - now())) / 60)::int AS mins
    FROM login_throttle WHERE key = ANY(${rules.map((x) => x.key)}) AND locked_until > now()`;
  return Math.max(r?.mins ?? 0, 0);
}

/** Counts one failure per rule, starting a lock when a rule's limit is reached. */
export async function recordFailure(rules: Rule[]): Promise<void> {
  for (const { key, max } of rules) {
    await sql`
      INSERT INTO login_throttle (key, failures, window_start, locked_until)
      VALUES (${key}, 1, now(), CASE WHEN ${max} <= 1 THEN now() + make_interval(mins => ${LOCK_MINUTES}) END)
      ON CONFLICT (key) DO UPDATE SET
        failures = CASE WHEN login_throttle.window_start < now() - make_interval(mins => ${WINDOW_MINUTES}) THEN 1 ELSE login_throttle.failures + 1 END,
        window_start = CASE WHEN login_throttle.window_start < now() - make_interval(mins => ${WINDOW_MINUTES}) THEN now() ELSE login_throttle.window_start END,
        locked_until = CASE
          WHEN (CASE WHEN login_throttle.window_start < now() - make_interval(mins => ${WINDOW_MINUTES}) THEN 1 ELSE login_throttle.failures + 1 END) >= ${max}
            THEN now() + make_interval(mins => ${LOCK_MINUTES})
          ELSE login_throttle.locked_until END`;
  }
  // Tidy up old, unlocked rows now and then.
  await sql`DELETE FROM login_throttle WHERE window_start < now() - make_interval(hours => 24) AND (locked_until IS NULL OR locked_until < now())`;
}

/** A correct password clears that username's count. */
export async function clearFailures(key: string): Promise<void> {
  await sql`DELETE FROM login_throttle WHERE key = ${key}`;
}

export const lockedMessage = (mins: number) =>
  `Too many failed attempts. Try again in ${mins} ${mins === 1 ? "minute" : "minutes"}.`;
