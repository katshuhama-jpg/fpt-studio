export type OrgMember = { id: string; name: string; role: string; initials: string };
export type OrgUnit = { id: string; name: string; lead?: string; members: OrgMember[]; units: OrgUnit[] };

export const orgTree: OrgUnit = {
  id: "fpt",
  name: "FPT Corporation",
  lead: "Truong Gia Binh",
  members: [
    { id: "m-chair", name: "Truong Gia Binh", role: "Chairman", initials: "TB" },
  ],
  units: [
    {
      id: "fsoft",
      name: "FPT Software",
      lead: "Tran Nam",
      members: [
        { id: "m-fsoft-ceo", name: "Tran Nam", role: "CEO", initials: "TN" },
        { id: "m-fsoft-coo", name: "Linh Phan", role: "COO", initials: "LP" },
      ],
      units: [
        {
          id: "fsoft-vn",
          name: "Vietnam Delivery",
          lead: "Duy Nguyen",
          members: [{ id: "m-fsoft-vn-1", name: "Duy Nguyen", role: "Delivery Director", initials: "DN" }],
          units: [
            {
              id: "fsoft-vn-platform",
              name: "Platform Engineering",
              lead: "Mai Hoang",
              members: [
                { id: "m-plat-1", name: "Mai Hoang", role: "Engineering Manager", initials: "MH" },
                { id: "m-plat-2", name: "Huy Le", role: "Senior Engineer", initials: "HL" },
                { id: "m-plat-3", name: "Bao Tran", role: "Engineer", initials: "BT" },
                { id: "m-plat-4", name: "Ngoc Anh", role: "Engineer", initials: "NA" },
                { id: "m-plat-5", name: "Phuc Le", role: "Engineer", initials: "PL" },
                { id: "m-plat-6", name: "Thanh Tung", role: "Engineer", initials: "TT" },
                { id: "m-plat-7", name: "Kim Chi", role: "QA Engineer", initials: "KC" },
                { id: "m-plat-8", name: "Anh Dung", role: "QA Engineer", initials: "AD" },
                { id: "m-plat-9", name: "Hai Yen", role: "DevOps Engineer", initials: "HY" },
                { id: "m-plat-10", name: "Trong Nghia", role: "Engineer", initials: "TN3" },
                { id: "m-plat-11", name: "Bich Ngoc", role: "Engineer", initials: "BN" },
                { id: "m-plat-12", name: "Quoc Bao", role: "Intern", initials: "QB" },
              ],
              units: [],
            },
            {
              id: "fsoft-vn-aiml",
              name: "AI/ML",
              lead: "Quang Vu",
              members: [
                { id: "m-aiml-1", name: "Quang Vu", role: "AI Lead", initials: "QV" },
                { id: "m-aiml-2", name: "Thao Nguyen", role: "ML Engineer", initials: "TH2" },
              ],
              units: [],
            },
          ],
        },
        {
          id: "fsoft-jp",
          name: "Japan Delivery",
          lead: "Kenji Sato",
          members: [{ id: "m-fsoft-jp-1", name: "Kenji Sato", role: "Country Director", initials: "KS" }],
          units: [
            {
              id: "fsoft-jp-delivery",
              name: "Delivery Team",
              lead: "Yuki Tanaka",
              members: [
                { id: "m-jpd-1", name: "Yuki Tanaka", role: "Delivery Manager", initials: "YT" },
                { id: "m-jpd-2", name: "Hana Ito", role: "Business Analyst", initials: "HI" },
              ],
              units: [],
            },
          ],
        },
      ],
    },
    {
      id: "ftel",
      name: "FPT Telecom",
      lead: "Hoang Anh",
      members: [{ id: "m-ftel-1", name: "Hoang Anh", role: "CEO", initials: "HA" }],
      units: [
        {
          id: "ftel-noc",
          name: "Network Operations",
          lead: "Minh Duc",
          members: [
            { id: "m-noc-1", name: "Minh Duc", role: "NOC Manager", initials: "MD" },
            { id: "m-noc-2", name: "Thu Ha", role: "Network Engineer", initials: "TH" },
          ],
          units: [],
        },
        {
          id: "ftel-cs",
          name: "Customer Service",
          lead: "Kim Ngan",
          members: [{ id: "m-cs-1", name: "Kim Ngan", role: "CS Manager", initials: "KN" }],
          units: [],
        },
      ],
    },
    {
      id: "fsc",
      name: "FPT Smart Cloud",
      lead: "Le Hong Viet",
      members: [{ id: "m-fsc-1", name: "Le Hong Viet", role: "CEO", initials: "LV" }],
      units: [
        {
          id: "fsc-agents",
          name: "AI Agents Platform",
          lead: "Tran Nam",
          members: [
            { id: "m-agents-1", name: "Tran Nam", role: "Product Owner", initials: "TN" },
            { id: "m-agents-2", name: "Linh Phan", role: "Builder", initials: "LP2" },
            { id: "m-agents-3", name: "Mai Hoang", role: "Viewer", initials: "MH2" },
          ],
          units: [],
        },
        {
          id: "fsc-infra",
          name: "Cloud Infrastructure",
          lead: "Van Anh",
          members: [{ id: "m-infra-1", name: "Van Anh", role: "Infra Lead", initials: "VA" }],
          units: [],
        },
      ],
    },
    {
      id: "fe",
      name: "FPT Education",
      lead: "Nguyen Khai",
      members: [{ id: "m-fe-1", name: "Nguyen Khai", role: "Director", initials: "NK" }],
      units: [],
    },
  ],
};

export function countDirect(unit: OrgUnit): number {
  return unit.members.length;
}

export function countAll(unit: OrgUnit): number {
  return unit.members.length + unit.units.reduce((sum, u) => sum + countAll(u), 0);
}

export function findUnit(root: OrgUnit, id: string): OrgUnit | null {
  if (root.id === id) return root;
  for (const u of root.units) {
    const found = findUnit(u, id);
    if (found) return found;
  }
  return null;
}

export function findPath(root: OrgUnit, id: string): OrgUnit[] | null {
  if (root.id === id) return [root];
  for (const u of root.units) {
    const sub = findPath(u, id);
    if (sub) return [root, ...sub];
  }
  return null;
}

export function unitMatches(unit: OrgUnit, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (unit.name.toLowerCase().includes(q)) return true;
  if (unit.members.some(m => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q))) return true;
  return unit.units.some(u => unitMatches(u, q));
}
