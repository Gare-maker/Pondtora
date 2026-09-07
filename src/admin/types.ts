export type SubscriptionStatus = "Trial" | "Active" | "Expired" | "Cancelled" | "Suspended";
export type BillingFrequency = "monthly" | "yearly";
export type AccountStatus = "Active" | "Suspended";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  farmName?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  role?: string;
  activePlan: string | null;
  trialStartDate: string | null;
  billingFrequency: BillingFrequency;
  subscriptionAmount: number | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStart: string | null;
  subscriptionExpiry: string | null;
  accountStatus: AccountStatus;
  freeAccess?: boolean;
  farmCount?: number;
  paystackReference?: string;
  lastPaymentDate?: string;
  createdAt?: string;
}

export interface AdminActivityLog {
  id: string;
  timestamp: string;
  action: string;
  category: "auth" | "user" | "subscription" | "plan" | "system";
  details: string;
  adminEmail: string;
}

/** Effective price for a user — respects priority: freeAccess > custom amount > plan default */
export function effectivePrice(u: AdminUser, plans: { name: string; monthlyPrice: number; yearlyPrice: number }[]): number | "free" | null {
  if (u.freeAccess) return "free";
  if (u.subscriptionAmount !== null) return u.subscriptionAmount;
  if (u.activePlan) {
    const p = plans.find(x => x.name === u.activePlan);
    if (p) return u.billingFrequency === "yearly" ? p.yearlyPrice : p.monthlyPrice;
  }
  return null;
}

export interface AdminPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  status: "Active" | "Inactive";
  farmLimit: number | null;
  pondLimit: number | null;
}

export const DEFAULT_PLANS: AdminPlan[] = [
  { id: "starter",    name: "Starter",        monthlyPrice: 3000,  yearlyPrice: 28800,  description: "Up to 5 ponds, 1 farm",       status: "Active", farmLimit: 1,    pondLimit: 5    },
  { id: "growth",     name: "Growth",          monthlyPrice: 5000,  yearlyPrice: 48000,  description: "Up to 15 ponds, 1 farm",      status: "Active", farmLimit: 1,    pondLimit: 15   },
  { id: "commercial", name: "Commercial",      monthlyPrice: 10000, yearlyPrice: 96000,  description: "Unlimited ponds, 1 farm",     status: "Active", farmLimit: 1,    pondLimit: null },
  { id: "3farm",      name: "3-Farm Plan",     monthlyPrice: 24000, yearlyPrice: 230400, description: "Unlimited ponds, 3 farms",    status: "Active", farmLimit: 3,    pondLimit: null },
  { id: "5farm",      name: "5-Farm Plan",     monthlyPrice: 40000, yearlyPrice: 384000, description: "Unlimited ponds, 5 farms",    status: "Active", farmLimit: 5,    pondLimit: null },
  { id: "unlimited",  name: "Unlimited Farms", monthlyPrice: 70000, yearlyPrice: 672000, description: "Unlimited ponds & farms",     status: "Active", farmLimit: null, pondLimit: null },
];

export function computeSubscriptionStatus(
  u: Partial<Pick<AdminUser, "accountStatus" | "activePlan" | "trialStartDate" | "subscriptionStart" | "subscriptionExpiry">>
): SubscriptionStatus {
  if (!u) return "Trial";
  if (u.accountStatus === "Suspended") return "Suspended";
  if (u.subscriptionExpiry) {
    try {
      const exp = new Date(u.subscriptionExpiry);
      if (!isNaN(exp.getTime())) {
        return exp < new Date() ? "Expired" : "Active";
      }
    } catch {}
  }
  if (u.subscriptionStart) return "Active";
  if (u.trialStartDate) {
    try {
      const end = new Date(u.trialStartDate);
      if (!isNaN(end.getTime())) {
        end.setDate(end.getDate() + 30);
        return end > new Date() ? "Trial" : "Expired";
      }
    } catch {}
  }
  return "Trial";
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return String(d);
    return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

export function trialDaysLeft(trialStart: string | null | undefined): number {
  if (!trialStart) return 0;
  try {
    const end = new Date(trialStart);
    if (isNaN(end.getTime())) return 0;
    end.setDate(end.getDate() + 30);
    return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
  } catch {
    return 0;
  }
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return "₦" + n.toLocaleString();
}


