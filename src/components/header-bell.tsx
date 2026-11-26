import { Suspense } from "react";
import NotificationBellLoader from "./notification-bell-loader";

/** The notification bell for a page header (placed beside that page's month dropdown). */
export default function HeaderBell() {
  return (
    <Suspense fallback={<span className="block size-11 shrink-0 rounded-xl bg-[#eceef4]" />}>
      <div className="no-print shrink-0"><NotificationBellLoader /></div>
    </Suspense>
  );
}
