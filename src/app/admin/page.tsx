import { redirect } from "next/navigation";
import { lookupUser } from "@/lib/session";
import LoginScreen from "@/components/login-screen";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export const metadata = { title: "Admin sign in" };

/** Sign-in for administrators only, at /admin. Department heads and leadership use /login. */
export default async function AdminLoginPage() {
  if (await lookupUser()) redirect("/");
  return <LoginScreen audience="admin" />;
}
