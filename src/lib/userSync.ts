import type { AdminUser, AdminActivityLog, AdminPlan, BillingFrequency } from "../admin/types";
import { DEFAULT_PLANS, computeSubscriptionStatus } from "../admin/types";
import type { UserProfile } from "../app/types";

const USERS_STORAGE_KEY = "pondtora_admin_users";
const LOGS_STORAGE_KEY = "pondtora_admin_logs";

export function loadAllAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(u => u && typeof u === "object" && typeof u.id === "string");
      }
    }
  } catch {}
  return [];
}

export function saveAllAdminUsers(users: AdminUser[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated", { detail: users }));
  } catch {}
}

export function logActivity(
  action: string,
  category: AdminActivityLog["category"],
  details: string,
  adminEmail = "system"
) {
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    const existing: AdminActivityLog[] = raw ? JSON.parse(raw) : [];
    const newLog: AdminActivityLog = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      adminEmail: adminEmail || "system",
    };
    const updated = [newLog, ...existing].slice(0, 100);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("pondtora:logs_updated", { detail: updated }));
  } catch {}
}

/**
 * Synchronizes the logged-in user profile from the Main App into the Admin's registered users list
 */
export function syncUserProfileToAdmin(
  profile: UserProfile | null,
  activePlan: string | null = null,
  farmCount: number = 1
): AdminUser | null {
  if (!profile || !profile.email) return null;

  const targetEmail = (profile.email || "").trim().toLowerCase();
  if (!targetEmail) return null;

  const users = loadAllAdminUsers();
  const existingIdx = users.findIndex(u => (u?.email || "").trim().toLowerCase() === targetEmail);

  let userObj: AdminUser;

  if (existingIdx >= 0) {
    const current = users[existingIdx];
    userObj = {
      ...current,
      name: profile.name || current.name || targetEmail.split("@")[0],
      farmName: profile.farmName || current.farmName || "Primary Farm",
      phone: profile.phone || current.phone || "",
      city: profile.city || current.city || "Lagos",
      state: profile.state || current.state || "Lagos",
      country: profile.country || current.country || "Nigeria",
      activePlan: activePlan || profile.activePlan || current.activePlan || "Starter",
      trialStartDate: profile.trialStartDate || current.trialStartDate || new Date().toISOString().slice(0, 10),
      farmCount: Math.max(farmCount || 1, current.farmCount || 1),
    };
    userObj.subscriptionStatus = computeSubscriptionStatus(userObj);
    users[existingIdx] = userObj;
  } else {
    userObj = {
      id: Math.random().toString(36).slice(2, 10),
      name: profile.name || targetEmail.split("@")[0],
      email: targetEmail,
      farmName: profile.farmName || "Primary Farm",
      phone: profile.phone || "",
      city: profile.city || "Lagos",
      state: profile.state || "Lagos",
      country: profile.country || "Nigeria",
      activePlan: activePlan || profile.activePlan || "Starter",
      trialStartDate: profile.trialStartDate || new Date().toISOString().slice(0, 10),
      billingFrequency: "monthly",
      subscriptionAmount: null,
      subscriptionStatus: "Trial",
      subscriptionStart: null,
      subscriptionExpiry: null,
      accountStatus: "Active",
      freeAccess: false,
      farmCount: farmCount || 1,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    userObj.subscriptionStatus = computeSubscriptionStatus(userObj);
    users.unshift(userObj);

    logActivity(
      "New User Registered",
      "user",
      `${userObj.name} registered account for ${userObj.farmName || "Farm"}`,
      userObj.email
    );
  }

  saveAllAdminUsers(users);
  return userObj;
}

/**
 * Check if the active user has special admin overrides (e.g. Free VIP Access, Suspended Account)
 */
export function getUserAdminOverride(email: string | undefined | null): {
  isSuspended: boolean;
  hasFreeAccess: boolean;
  customAmount: number | null;
  activePlan: string | null;
} {
  const fallback = { isSuspended: false, hasFreeAccess: false, customAmount: null, activePlan: null };
  if (!email || typeof email !== "string") {
    return fallback;
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return fallback;

  const users = loadAllAdminUsers();
  const u = users.find(x => (x?.email || "").trim().toLowerCase() === cleanEmail);

  if (!u) {
    return fallback;
  }

  return {
    isSuspended: u.accountStatus === "Suspended",
    hasFreeAccess: Boolean(u.freeAccess),
    customAmount: typeof u.subscriptionAmount === "number" && !isNaN(u.subscriptionAmount) ? u.subscriptionAmount : null,
    activePlan: u.activePlan || null,
  };
}

/**
 * Records a successful Paystack payment, updates the user's subscription to Active with proper expiry dates,
 * and adds an audit log entry.
 */
export function recordSuccessfulPayment(params: {
  email: string;
  planName: string;
  billingFrequency: BillingFrequency;
  amount: number;
  reference: string;
}): AdminUser | null {
  if (!params?.email) return null;

  const cleanEmail = (params.email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  const users = loadAllAdminUsers();
  const existingIdx = users.findIndex(u => (u?.email || "").trim().toLowerCase() === cleanEmail);

  const todayStr = new Date().toISOString().slice(0, 10);
  const expiryDate = new Date();
  if (params.billingFrequency === "yearly") {
    expiryDate.setDate(expiryDate.getDate() + 365);
  } else {
    expiryDate.setDate(expiryDate.getDate() + 30);
  }
  const expiryStr = expiryDate.toISOString().slice(0, 10);

  let userObj: AdminUser;
  if (existingIdx >= 0) {
    userObj = {
      ...users[existingIdx],
      activePlan: params.planName,
      billingFrequency: params.billingFrequency,
      subscriptionAmount: params.amount,
      subscriptionStatus: "Active",
      subscriptionStart: todayStr,
      subscriptionExpiry: expiryStr,
      paystackReference: params.reference,
      lastPaymentDate: todayStr,
      trialStartDate: null,
    };
    users[existingIdx] = userObj;
  } else {
    userObj = {
      id: Math.random().toString(36).slice(2, 10),
      name: cleanEmail.split("@")[0],
      email: cleanEmail,
      farmName: "Primary Farm",
      activePlan: params.planName,
      trialStartDate: null,
      billingFrequency: params.billingFrequency,
      subscriptionAmount: params.amount,
      subscriptionStatus: "Active",
      subscriptionStart: todayStr,
      subscriptionExpiry: expiryStr,
      accountStatus: "Active",
      freeAccess: false,
      paystackReference: params.reference,
      lastPaymentDate: todayStr,
      createdAt: todayStr,
    };
    users.unshift(userObj);
  }

  saveAllAdminUsers(users);

  logActivity(
    "Subscription Paid (Paystack)",
    "subscription",
    `${cleanEmail} paid ₦${(params.amount || 0).toLocaleString()} for ${params.planName} (${params.billingFrequency}) — Ref: ${params.reference}`,
    cleanEmail
  );

  return userObj;
}


