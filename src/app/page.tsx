import { redirect } from "next/navigation";
import { HOME, requireUser } from "@/lib/dal";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function Home() {
  const user = await requireUser();
  redirect(HOME[user.role]);
}
