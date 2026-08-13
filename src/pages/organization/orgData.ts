export type OrgMember = { id: string; name: string; role: string; initials: string; roleId?: string; email?: string };

/** Mock timestamp for the auto-sync banner on the Structure page — Unit/Member data is
 * synced from the business's own system, via FPT Identity, into FPT AI Agent. */
export const ORG_LAST_SYNCED_AT = "08:00, 13/08/2026";
export type OrgUnit = { id: string; name: string; members: OrgMember[]; units: OrgUnit[] };

/**
 * Deterministic Vietnamese-name generator + team builder — used to bulk out
 * rank-and-file headcount to a realistic corporation scale (hundreds of
 * people) without hand-authoring every single row. Named individuals higher
 * up the tree stay hand-written; this only backfills bulk team rosters.
 */
const SURNAMES = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Huynh", "Phan", "Vu", "Vo", "Dang", "Bui", "Do", "Ho", "Ngo", "Duong"];
const MALE_MIDDLE = ["Van", "Duc", "Quang", "Minh", "Huu", "Cong"];
const FEMALE_MIDDLE = ["Thi", "Ngoc", "Kim", "Thu", "My", "Hong"];
const MALE_GIVEN = ["Anh", "Bao", "Cuong", "Dat", "Duc", "Hai", "Hung", "Khang", "Khoi", "Long", "Minh", "Nam", "Phong", "Quan", "Quang", "Son", "Tai", "Thang", "Tien", "Tuan", "Vinh", "Phat", "Kiet"];
const FEMALE_GIVEN = ["Anh", "Chi", "Dung", "Giang", "Ha", "Hoa", "Huong", "Lan", "Linh", "Mai", "My", "Ngan", "Ngoc", "Nhi", "Phuong", "Quyen", "Thao", "Thu", "Trang", "Van", "Vy", "Yen", "Trinh"];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function generateName(seed: number): { name: string; initials: string } {
  const isMale = seed % 2 === 0;
  const surname = SURNAMES[seed % SURNAMES.length];
  const middlePool = isMale ? MALE_MIDDLE : FEMALE_MIDDLE;
  const givenPool = isMale ? MALE_GIVEN : FEMALE_GIVEN;
  const middle = middlePool[Math.floor(seed / 5) % middlePool.length];
  const given = givenPool[Math.floor(seed / 3) % givenPool.length];
  return { name: `${surname} ${middle} ${given}`, initials: `${surname[0]}${given[0]}`.toUpperCase() };
}

function makeLeader(prefix: string, title: string, roleId = "admin"): OrgMember {
  const { name, initials } = generateName(hashSeed(`${prefix}-lead`));
  return { id: `${prefix}-lead`, name, role: title, initials, roleId };
}

/** Builds `count` members with a seniority-ordered title pool (first entries
 * are the most senior; the last title repeats for everyone after it) and a
 * simple realistic role spread: first person leads (builder), most are
 * viewer, and every 6th is left unassigned to keep that bucket populated. */
function makeTeam(prefix: string, count: number, titles: string[], startIndex = 1): OrgMember[] {
  const members: OrgMember[] = [];
  for (let i = 0; i < count; i++) {
    const seed = hashSeed(prefix) + i * 13;
    const { name, initials } = generateName(seed);
    const title = titles[Math.min(i, titles.length - 1)];
    let roleId: string | undefined;
    if (i === 0 && startIndex === 1) roleId = "builder";
    else if (i % 6 === 5) roleId = undefined;
    else roleId = "viewer";
    members.push({ id: `${prefix}-${startIndex + i}`, name, role: title, initials, roleId });
  }
  return members;
}

const ENGINEERING_TITLES = ["Engineering Manager", "Tech Lead", "Senior Engineer", "Engineer"];
const MOBILE_TITLES = ["Mobile Team Lead", "Senior Mobile Engineer", "Mobile Engineer"];
const QA_TITLES = ["QA Lead", "Senior QA Engineer", "QA Engineer"];
const DEVOPS_TITLES = ["DevOps Lead", "DevOps Engineer", "Site Reliability Engineer"];
const DELIVERY_TITLES = ["Delivery Manager", "Business Analyst", "Project Coordinator"];
const SALES_TITLES = ["Sales Manager", "Account Manager", "Sales Executive"];
const MARKETING_TITLES = ["Marketing Manager", "Content Specialist", "Marketing Specialist"];
const NETWORK_TITLES = ["Senior Network Engineer", "Network Engineer"];
const CS_TITLES = ["Senior Support Specialist", "Support Specialist"];
const MEDIA_TITLES = ["Content Manager", "Media Producer", "Content Specialist"];
const IT_TITLES = ["IT Manager", "System Administrator", "IT Support"];
const DATA_TITLES = ["Data Platform Lead", "Data Engineer", "Data Analyst"];
const CLOUD_SALES_TITLES = ["Cloud Sales Manager", "Account Executive", "Sales Executive"];
const CS_SUCCESS_TITLES = ["Customer Success Lead", "Customer Success Manager", "Support Specialist"];
const ACADEMIC_TITLES = ["Department Head", "Senior Lecturer", "Lecturer"];
const ADMISSIONS_TITLES = ["Admissions Manager", "Admissions Officer"];
const CAMPUS_TITLES = ["Campus Manager", "Student Affairs Officer", "Facilities Staff"];
const STORE_TITLES = ["Store Manager", "Assistant Store Manager", "Store Staff"];
const SUPPLY_TITLES = ["Supply Chain Manager", "Logistics Coordinator", "Procurement Officer"];
const HR_TITLES = ["HR Manager", "People Partner", "Recruiter", "HR Specialist"];
const FINANCE_TITLES = ["Finance Manager", "Financial Analyst", "Accountant"];
const LEGAL_TITLES = ["Legal Counsel", "Compliance Officer"];
const CORP_IT_TITLES = ["IT Manager", "System Administrator", "IT Support"];

export const orgTree: OrgUnit = {
  id: "fpt",
  name: "FPT Corporation",
  members: [
    { id: "m-chair", name: "Truong Gia Binh", role: "Chairman", initials: "TB", roleId: "admin" },
    makeLeader("fpt-ceo", "Group CEO"),
    makeLeader("fpt-cfo", "Group CFO"),
    makeLeader("fpt-cto", "Group CTO"),
    makeLeader("fpt-chro", "Group CHRO"),
    makeLeader("fpt-cso", "Group Chief Strategy Officer"),
  ],
  units: [
    {
      id: "fsoft",
      name: "FPT Software",
      members: [
        { id: "m-fsoft-ceo", name: "Tran Nam", role: "CEO", initials: "TN", roleId: "admin" },
        { id: "m-fsoft-coo", name: "Linh Phan", role: "COO", initials: "LP", roleId: "admin" },
        makeLeader("fsoft-cfo", "CFO"),
      ],
      units: [
        {
          id: "fsoft-vn",
          name: "Vietnam Delivery",
          members: [{ id: "m-fsoft-vn-1", name: "Duy Nguyen", role: "Delivery Director", initials: "DN", roleId: "builder" }],
          units: [
            {
              id: "fsoft-vn-platform",
              name: "Platform Engineering",
              members: [
                { id: "m-plat-1", name: "Mai Hoang", role: "Engineering Manager", initials: "MH", roleId: "builder" },
                { id: "m-plat-2", name: "Huy Le", role: "Senior Engineer", initials: "HL", roleId: "builder" },
                { id: "m-plat-3", name: "Bao Tran", role: "Engineer", initials: "BT", roleId: "viewer" },
                { id: "m-plat-4", name: "Ngoc Anh", role: "Engineer", initials: "NA", roleId: "viewer" },
                { id: "m-plat-5", name: "Phuc Le", role: "Engineer", initials: "PL" },
                { id: "m-plat-6", name: "Thanh Tung", role: "Engineer", initials: "TT", roleId: "viewer" },
                { id: "m-plat-7", name: "Kim Chi", role: "QA Engineer", initials: "KC", roleId: "viewer" },
                { id: "m-plat-8", name: "Anh Dung", role: "QA Engineer", initials: "AD" },
                { id: "m-plat-9", name: "Hai Yen", role: "DevOps Engineer", initials: "HY", roleId: "viewer" },
                { id: "m-plat-10", name: "Trong Nghia", role: "Engineer", initials: "TN3", roleId: "viewer" },
                { id: "m-plat-11", name: "Bich Ngoc", role: "Engineer", initials: "BN" },
                { id: "m-plat-12", name: "Quoc Bao", role: "Intern", initials: "QB" },
              ],
              units: [],
            },
            {
              id: "fsoft-vn-aiml",
              name: "AI/ML",
              members: [
                { id: "m-aiml-1", name: "Quang Vu", role: "AI Lead", initials: "QV", roleId: "builder" },
                { id: "m-aiml-2", name: "Thao Nguyen", role: "ML Engineer", initials: "TH2", roleId: "viewer" },
                ...makeTeam("fsoft-vn-aiml", 6, ["Senior ML Engineer", "ML Engineer", "Data Scientist"], 3),
              ],
              units: [],
            },
            {
              id: "fsoft-vn-mobile",
              name: "Mobile Engineering",
              members: makeTeam("fsoft-vn-mobile", 10, MOBILE_TITLES),
              units: [],
            },
            {
              id: "fsoft-vn-qa",
              name: "QA & Testing",
              members: makeTeam("fsoft-vn-qa", 8, QA_TITLES),
              units: [],
            },
            {
              id: "fsoft-vn-devops",
              name: "DevOps & Infrastructure",
              members: makeTeam("fsoft-vn-devops", 6, DEVOPS_TITLES),
              units: [],
            },
          ],
        },
        {
          id: "fsoft-jp",
          name: "Japan Delivery",
          members: [{ id: "m-fsoft-jp-1", name: "Kenji Sato", role: "Country Director", initials: "KS", roleId: "admin" }],
          units: [
            {
              id: "fsoft-jp-delivery",
              name: "Delivery Team",
              members: [
                { id: "m-jpd-1", name: "Yuki Tanaka", role: "Delivery Manager", initials: "YT", roleId: "builder" },
                { id: "m-jpd-2", name: "Hana Ito", role: "Business Analyst", initials: "HI", roleId: "viewer" },
                ...makeTeam("fsoft-jp-delivery", 6, DELIVERY_TITLES, 3),
              ],
              units: [],
            },
            {
              id: "fsoft-jp-sales",
              name: "Sales Japan",
              members: makeTeam("fsoft-jp-sales", 5, SALES_TITLES),
              units: [],
            },
          ],
        },
        {
          id: "fsoft-kr",
          name: "Korea Delivery",
          members: [makeLeader("fsoft-kr", "Country Director")],
          units: [
            {
              id: "fsoft-kr-delivery",
              name: "Delivery Team Korea",
              members: makeTeam("fsoft-kr-delivery", 8, DELIVERY_TITLES),
              units: [],
            },
          ],
        },
        {
          id: "fsoft-us",
          name: "US Delivery",
          members: [makeLeader("fsoft-us", "Country Director")],
          units: [
            {
              id: "fsoft-us-delivery",
              name: "Delivery Team US",
              members: makeTeam("fsoft-us-delivery", 8, DELIVERY_TITLES),
              units: [],
            },
          ],
        },
        {
          id: "fsoft-sales",
          name: "Global Sales & Marketing",
          members: [makeLeader("fsoft-sales", "VP Sales & Marketing")],
          units: [
            {
              id: "fsoft-sales-enterprise",
              name: "Enterprise Sales",
              members: makeTeam("fsoft-sales-enterprise", 8, SALES_TITLES),
              units: [],
            },
            {
              id: "fsoft-marketing",
              name: "Marketing",
              members: makeTeam("fsoft-marketing", 6, MARKETING_TITLES),
              units: [],
            },
          ],
        },
      ],
    },
    {
      id: "ftel",
      name: "FPT Telecom",
      members: [
        { id: "m-ftel-1", name: "Hoang Anh", role: "CEO", initials: "HA", roleId: "admin" },
        makeLeader("ftel-coo", "COO"),
        makeLeader("ftel-cfo", "CFO"),
      ],
      units: [
        {
          id: "ftel-noc",
          name: "Network Operations",
          members: [
            { id: "m-noc-1", name: "Minh Duc", role: "NOC Manager", initials: "MD", roleId: "builder" },
            { id: "m-noc-2", name: "Thu Ha", role: "Network Engineer", initials: "TH", roleId: "viewer" },
            ...makeTeam("ftel-noc", 6, NETWORK_TITLES, 3),
          ],
          units: [],
        },
        {
          id: "ftel-cs",
          name: "Customer Service",
          members: [
            { id: "m-cs-1", name: "Kim Ngan", role: "CS Manager", initials: "KN", roleId: "builder" },
            ...makeTeam("ftel-cs", 9, CS_TITLES, 2),
          ],
          units: [],
        },
        {
          id: "ftel-sales",
          name: "Broadband Sales",
          members: makeTeam("ftel-sales", 10, SALES_TITLES),
          units: [],
        },
        {
          id: "ftel-media",
          name: "Content & Media",
          members: makeTeam("ftel-media", 6, MEDIA_TITLES),
          units: [],
        },
        {
          id: "ftel-it",
          name: "IT Infrastructure",
          members: makeTeam("ftel-it", 6, IT_TITLES),
          units: [],
        },
      ],
    },
    {
      id: "fsc",
      name: "FPT Smart Cloud",
      members: [
        { id: "m-fsc-1", name: "Le Hong Viet", role: "CEO", initials: "LV", roleId: "admin" },
        makeLeader("fsc-cto", "CTO"),
      ],
      units: [
        {
          id: "fsc-agents",
          name: "AI Agents Platform",
          members: [
            { id: "m-agents-1", name: "Tran Nam", role: "Product Owner", initials: "TN", roleId: "admin" },
            { id: "m-agents-2", name: "Linh Phan", role: "Builder", initials: "LP2", roleId: "builder" },
            { id: "m-agents-3", name: "Mai Hoang", role: "Viewer", initials: "MH2", roleId: "viewer" },
            ...makeTeam("fsc-agents", 5, ["Senior Engineer", "Engineer"], 4),
          ],
          units: [],
        },
        {
          id: "fsc-infra",
          name: "Cloud Infrastructure",
          members: [
            { id: "m-infra-1", name: "Van Anh", role: "Infra Lead", initials: "VA", roleId: "builder" },
            ...makeTeam("fsc-infra", 7, ["Senior Infra Engineer", "Infra Engineer"], 2),
          ],
          units: [],
        },
        {
          id: "fsc-data",
          name: "Data Platform",
          members: makeTeam("fsc-data", 6, DATA_TITLES),
          units: [],
        },
        {
          id: "fsc-sales",
          name: "Cloud Sales",
          members: makeTeam("fsc-sales", 5, CLOUD_SALES_TITLES),
          units: [],
        },
        {
          id: "fsc-cs",
          name: "Customer Success",
          members: makeTeam("fsc-cs", 6, CS_SUCCESS_TITLES),
          units: [],
        },
      ],
    },
    {
      id: "fe",
      name: "FPT Education",
      members: [
        { id: "m-fe-1", name: "Nguyen Khai", role: "Director", initials: "NK", roleId: "admin" },
        makeLeader("fe-deputy", "Deputy Director"),
      ],
      units: [
        {
          id: "fe-academic",
          name: "Academic Affairs",
          members: makeTeam("fe-academic", 8, ACADEMIC_TITLES),
          units: [],
        },
        {
          id: "fe-admissions",
          name: "Admissions",
          members: makeTeam("fe-admissions", 6, ADMISSIONS_TITLES),
          units: [],
        },
        {
          id: "fe-campus-hn",
          name: "Campus Operations - Hanoi",
          members: makeTeam("fe-campus-hn", 10, CAMPUS_TITLES),
          units: [],
        },
        {
          id: "fe-campus-hcm",
          name: "Campus Operations - HCMC",
          members: makeTeam("fe-campus-hcm", 10, CAMPUS_TITLES),
          units: [],
        },
      ],
    },
    {
      id: "fr",
      name: "FPT Retail",
      members: [makeLeader("fr", "CEO")],
      units: [
        {
          id: "fr-store-north",
          name: "Store Operations North",
          members: makeTeam("fr-store-north", 10, STORE_TITLES),
          units: [],
        },
        {
          id: "fr-store-south",
          name: "Store Operations South",
          members: makeTeam("fr-store-south", 10, STORE_TITLES),
          units: [],
        },
        {
          id: "fr-supply",
          name: "Supply Chain",
          members: makeTeam("fr-supply", 6, SUPPLY_TITLES),
          units: [],
        },
      ],
    },
    {
      id: "corp",
      name: "Corporate Functions",
      members: [makeLeader("corp", "Head of Corporate Functions")],
      units: [
        {
          id: "corp-hr",
          name: "Human Resources",
          members: makeTeam("corp-hr", 8, HR_TITLES),
          units: [],
        },
        {
          id: "corp-finance",
          name: "Finance & Accounting",
          members: makeTeam("corp-finance", 8, FINANCE_TITLES),
          units: [],
        },
        {
          id: "corp-legal",
          name: "Legal & Compliance",
          members: makeTeam("corp-legal", 5, LEGAL_TITLES),
          units: [],
        },
        {
          id: "corp-it",
          name: "Corporate IT",
          members: makeTeam("corp-it", 6, CORP_IT_TITLES),
          units: [],
        },
      ],
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

export function collectMembers(unit: OrgUnit): OrgMember[] {
  return [...unit.members, ...unit.units.flatMap(collectMembers)];
}

export function collectUnits(root: OrgUnit): OrgUnit[] {
  return root.units.flatMap(u => [u, ...collectUnits(u)]);
}

/** Same traversal as collectUnits, but keeps each unit's depth relative to root (root's direct children = 1). */
export function collectUnitsWithDepth(root: OrgUnit, depth = 1): { unit: OrgUnit; depth: number }[] {
  return root.units.flatMap(u => [{ unit: u, depth }, ...collectUnitsWithDepth(u, depth + 1)]);
}

export function findMember(root: OrgUnit, id: string): OrgMember | null {
  const direct = root.members.find(m => m.id === id);
  if (direct) return direct;
  for (const u of root.units) {
    const found = findMember(u, id);
    if (found) return found;
  }
  return null;
}

export function findMemberUnit(root: OrgUnit, memberId: string): OrgUnit | null {
  if (root.members.some(m => m.id === memberId)) return root;
  for (const u of root.units) {
    const found = findMemberUnit(u, memberId);
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
