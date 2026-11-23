import Link from "next/link";
import ActionForm from "@/components/action-form";
import { GENDERS, MARITAL, STATUSES, type DeptRef } from "@/lib/members";
import { saveMember } from "@/app/(app)/members/actions";

export type MemberFormValues = Partial<{
  id: string; first_name: string; last_name: string; gender: string | null; date_of_birth: string | null; marital_status: string | null;
  phone: string; email: string | null; address: string | null; kin_name: string | null; kin_phone: string | null;
  date_joined: string | null; status: keyof typeof STATUSES; baptised: boolean | null; notes: string | null; dept_ids: string[];
}>;

export default function MemberForm({ depts, v = {} }: { depts: (DeptRef)[]; v?: MemberFormValues }) {
  return (
    <ActionForm action={saveMember} className="card flex max-w-3xl flex-col gap-7 p-6 sm:p-8">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      <div className="flex flex-col gap-4">
        <h2 className="grp">PERSONAL</h2>
        <div className="flex flex-wrap gap-5">
          <div className="field"><label htmlFor="fn">First name</label><input id="fn" name="first_name" defaultValue={v.first_name} required /></div>
          <div className="field"><label htmlFor="ln">Last name</label><input id="ln" name="last_name" defaultValue={v.last_name} required /></div>
        </div>
        <div className="flex flex-wrap gap-5">
          <div className="field"><label htmlFor="g">Gender</label><select id="g" name="gender" defaultValue={v.gender ?? ""}><option value="">Not set</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select></div>
          <div className="field"><label htmlFor="dob">Date of birth</label><input id="dob" name="date_of_birth" type="date" defaultValue={v.date_of_birth ?? ""} /></div>
          <div className="field"><label htmlFor="ms">Marital status</label><select id="ms" name="marital_status" defaultValue={v.marital_status ?? ""}><option value="">Not set</option>{MARITAL.map((g) => <option key={g}>{g}</option>)}</select></div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="grp">CONTACT</h2>
        <div className="flex flex-wrap gap-5">
          <div className="field"><label htmlFor="ph">Phone</label><input id="ph" name="phone" inputMode="tel" placeholder="0803 000 0000" defaultValue={v.phone} required /></div>
          <div className="field"><label htmlFor="em">Email (optional)</label><input id="em" name="email" type="email" placeholder="name@example.com" defaultValue={v.email ?? ""} /></div>
        </div>
        <div className="field"><label htmlFor="ad">Home address</label><input id="ad" name="address" defaultValue={v.address ?? ""} /></div>
        <div className="flex flex-wrap gap-5">
          <div className="field"><label htmlFor="nk">Next of kin name</label><input id="nk" name="kin_name" defaultValue={v.kin_name ?? ""} /></div>
          <div className="field"><label htmlFor="nkp">Next of kin phone</label><input id="nkp" name="kin_phone" inputMode="tel" defaultValue={v.kin_phone ?? ""} /></div>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="grp">CHURCH</h2>
        <div className="flex flex-wrap gap-5">
          <div className="field"><label htmlFor="dj">Date joined</label><input id="dj" name="date_joined" type="date" defaultValue={v.date_joined ?? ""} /></div>
          <div className="field"><label htmlFor="st">Status</label>
            <select id="st" name="status" defaultValue={STATUSES[v.status ?? "active"]}>{Object.values(STATUSES).map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          <div className="field"><label htmlFor="bp">Baptised</label>
            <select id="bp" name="baptised" defaultValue={v.baptised === true ? "Yes" : v.baptised === false ? "No" : ""}><option value="">Not set</option><option>Yes</option><option>No</option></select>
          </div>
        </div>
        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="lbl mb-1 p-0">Departments</legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {depts.map((d) => (
              <label key={d.id} className="flex min-h-11 items-center gap-2.5 text-[15px]">
                <input type="checkbox" name="dept" value={d.id} defaultChecked={v.dept_ids?.includes(d.id)} className="size-5 accent-brand" /> {d.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field"><label htmlFor="nt">Notes (optional)</label><textarea id="nt" name="notes" defaultValue={v.notes ?? ""} /><span className="hint">Visible to the admin only.</span></div>
      </div>
      <div className="flex flex-wrap gap-3 border-t border-line-soft pt-5">
        <button className="btn">Save member</button>
        <Link href={v.id ? `/members?id=${v.id}` : "/members"} className="btn ghost">Cancel</Link>
      </div>
    </ActionForm>
  );
}
