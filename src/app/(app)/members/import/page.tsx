import Link from "next/link";
import { requireAdmin } from "@/lib/dal";
import { PageHeader } from "@/components/ui";
import ImportWizard from "./wizard";

// Reads the session cookie, so this route renders per request (opts out of the static shell under Cache Components).
export const instant = false;

export default async function ImportPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <Link href="/members" className="text-sm font-medium">Back to members</Link>
      <PageHeader title="Import members from a CSV file" sub="Check the preview first. Nothing is saved until you confirm." />
      <ImportWizard />
    </div>
  );
}
