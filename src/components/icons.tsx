const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export const Icons = {
  dashboard: () => <svg {...base}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></svg>,
  users: () => <svg {...base}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2.2.6 3.5 2.6 3.5 5.6" /></svg>,
  building: () => <svg {...base}><path d="M12 3 3 8v2h18V8l-9-5Z" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" /></svg>,
  calendar: () => <svg {...base}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>,
  coins: () => <svg {...base}><circle cx="12" cy="12" r="9" /><path d="M14.8 9.2c-.5-.8-1.5-1.2-2.8-1.2-1.7 0-2.8.8-2.8 2s1 1.7 2.8 2c1.8.3 2.8.8 2.8 2s-1.1 2-2.8 2c-1.3 0-2.4-.4-2.9-1.3M12 6.5V8m0 8v1.5" /></svg>,
  logout: () => <svg {...base}><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" /></svg>,
  arrow: () => <svg {...base} width={16} height={16}><path d="M7 17 17 7M8 7h9v9" /></svg>,
  chevron: () => <svg {...base} width={16} height={16}><path d="m9 6 6 6-6 6" /></svg>,
  plus: () => <svg {...base} width={16} height={16}><path d="M12 5v14M5 12h14" /></svg>,
};
