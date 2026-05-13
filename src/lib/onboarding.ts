// Lightweight localStorage-backed user + onboarding state for the mock auth flow.

export type LovUser = {
  email: string;
  firstTime: boolean;
  welcomeSeen?: boolean;
};

export type OnboardingState = {
  industry?: string;
  role?: string;
  companySize?: string;
  prompt?: string;
  completed?: boolean;
};

const USER_KEY = "lov_user";
const ONB_KEY = "lov_onboarding";

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const getUser = () => read<LovUser>(USER_KEY);
export const setUser = (u: LovUser) => write(USER_KEY, u);
export const updateUser = (patch: Partial<LovUser>) => {
  const cur = getUser();
  if (!cur) return;
  setUser({ ...cur, ...patch });
};
export const clearUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ONB_KEY);
  } catch {
    /* ignore */
  }
};

export const getOnboarding = () => read<OnboardingState>(ONB_KEY) ?? {};
export const setOnboarding = (s: OnboardingState) => write(ONB_KEY, s);
export const updateOnboarding = (patch: Partial<OnboardingState>) => {
  const cur = getOnboarding();
  setOnboarding({ ...cur, ...patch });
};

export const ONBOARDING_STEPS = [
  "industry",
  "role",
  "company",
  "workspace",
  "prompt",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
