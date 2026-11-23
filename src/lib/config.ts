/** Shown in the sidebar and sign-in screen. Change this to your church's name. */
export const CHURCH_NAME = "Data Base";

/** Reports are due on this day of the month after the one being reported. */
export const DUE_DAY = 5;

export type DeptLike = { name: string; full_name: string | null };
/** e.g. "FWI (Foursquare Women International)" */
export const deptLabel = (d: DeptLike) => (d.full_name ? `${d.name} (${d.full_name})` : d.name);

/** Opened by the Instagram icon on the sign-in screens. Set this to your church's Instagram page. */
export const INSTAGRAM_URL = "https://www.instagram.com/";
