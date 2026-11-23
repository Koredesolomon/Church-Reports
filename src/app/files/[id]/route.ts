import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { UUID } from "@/lib/action-utils";

export async function GET(_: Request, ctx: RouteContext<"/files/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.must_change_password) return new Response("Sign in required", { status: 401 });
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const [f] = await sql<{ filename: string; content_type: string; data: Buffer; department_id: string; status: string }[]>`
    SELECT a.filename, a.content_type, a.data, r.department_id, r.status
    FROM report_attachments a JOIN reports r ON r.id = a.report_id WHERE a.id = ${id}`;
  // Admins see every file; leadership only files on approved reports; heads only their own department's.
  const allowed =
    f && (user.role === "admin" || (user.role === "leadership" && f.status === "approved") || (user.role === "head" && f.department_id === user.department_id));
  if (!f || !allowed) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.content_type,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
