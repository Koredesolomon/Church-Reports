import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/dal";
import { sql } from "@/lib/db";
import { UUID } from "@/lib/action-utils";
import { departmentsForMembers, type MemberStatus } from "@/lib/members";
import { PageHeader } from "@/components/ui";
import MemberForm from "@/components/member-form";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function EditMember({ params }: PageProps<"/members/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [m] = await sql<{ id: string; member_no: string; first_name: string; last_name: string; gender: string | null; date_of_birth: string | null; marital_status: string | null;
    phone: string; email: string | null; address: string | null; kin_name: string | null; kin_phone: string | null; date_joined: string | null; status: MemberStatus; baptised: boolean | null; notes: string | null }[]>`
    SELECT id, member_no, first_name, last_name, gender, date_of_birth, marital_status, phone, email, address, kin_name, kin_phone, date_joined, status, baptised, notes
    FROM members WHERE id = ${id}`;
  if (!m) notFound();
  const [ids, all] = await Promise.all([
    sql<{ department_id: string }[]>`SELECT department_id FROM member_departments WHERE member_id = ${id}`,
    departmentsForMembers(),
  ]);
  const depts = all.filter((d) => !["Treasury", "Membership office"].includes(d.name));
  return (
    <div className="flex flex-col gap-6">
      <Link href={`/members?id=${m.id}`} className="text-sm font-medium">Back to members</Link>
      <PageHeader title="Edit member" sub={`${m.first_name} ${m.last_name} · ${m.member_no}`} />
      <MemberForm depts={depts} v={{ ...m, dept_ids: ids.map((r) => r.department_id) }} />
    </div>
  );
}
