/**
 * Demo-only "Xem với vai trò" switch. The prototype has one signed-in persona; to demo the
 * approval flow end to end (Builder sends → another Admin decides → notifications on both sides)
 * the presenter can switch between two real org members. The choice lives in localStorage and a
 * switch reloads the app, so every store that reads CURRENT_USER picks it up; sessionStorage
 * (requests, notifications…) is kept, so both personas see the same data.
 */
export interface DemoPersona { key: string; id: string; name: string; email: string; initials: string; title: string }

export const DEMO_PERSONAS: DemoPersona[] = [
  { key: "nam", id: "m-fsoft-ceo", name: "Tran Nam", email: "tran.nam@fpt.com", initials: "TN", title: "Workspace Admin" },
  { key: "linh", id: "m-fsoft-coo", name: "Linh Phan", email: "linh.phan@fpt.com", initials: "LP", title: "Org Admin" },
  // Viewer role — shows what a member without Build/Export rights sees (e.g. the disabled
  // Export button on Insights → History).
  { key: "chi", id: "m-plat-7", name: "Kim Chi", email: "kim.chi@fpt.com", initials: "KC", title: "Viewer" },
];

const KEY = "demo_persona";

export function currentPersona(): DemoPersona {
  let k: string | null = null;
  try { k = localStorage.getItem(KEY); } catch { /* ignore */ }
  return DEMO_PERSONAS.find(p => p.key === k) ?? DEMO_PERSONAS[0];
}

export function switchPersona(key: string) {
  try { localStorage.setItem(KEY, key); } catch { /* ignore */ }
  window.location.reload();
}
