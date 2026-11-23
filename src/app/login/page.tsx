import { redirect } from "next/navigation";
import { lookupUser } from "@/lib/session";
import LoginScreen from "@/components/login-screen";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

/** Sign-in for department heads and leadership. Administrators use /admin. */
export default async function LoginPage() {
  if (await lookupUser()) redirect("/");
  return <LoginScreen audience="user" />;
}
