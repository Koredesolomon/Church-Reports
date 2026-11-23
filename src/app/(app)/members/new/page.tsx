import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { departmentsForMembers } from "@/lib/members";
import { PageHeader } from "@/components/ui";
import MemberForm from "@/components/member-form";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function NewMember() {
  await requireAdmin();
  const depts = (await departmentsForMembers()).filter((d) => !["Treasury", "Membership office"].includes(d.name));
  return (
    <div className="flex flex-col gap-6">
      <Link href="/members" className="text-sm font-medium">Back to members</Link>
      <PageHeader title="Add member" sub="The member number is created automatically when you save." />
      <MemberForm depts={depts} />
    </div>
  );
}
