import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  var __sql: Sql | undefined;
}

function client(): Sql {
  if (!globalThis.__sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    // Reuse one client across dev hot reloads to avoid exhausting connections.
    globalThis.__sql = postgres(url, {
      // Serverless platforms run many short-lived instances, so each keeps only a couple of connections
      // (use the provider's pooled connection string) and lets idle ones go quickly.
      max: process.env.VERCEL ? 2 : 10,
      idle_timeout: process.env.VERCEL ? 20 : 0,
      // Return `date` columns as "YYYY-MM-DD" strings instead of Date objects (no timezone shifts).
      types: { date: { to: 1082, from: [1082], serialize: (x: unknown) => String(x), parse: (x: string) => x } },
    });
  }
  return globalThis.__sql;
}

// Created lazily on first query, so importing this module (e.g. during `next build`) needs no database.
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply: (_t, _this, args) => Reflect.apply(client() as never, _this, args),
  get: (_t, prop) => Reflect.get(client(), prop),
});
