import type { AdminUser, AdminActivityLog, AdminPlan, BillingFrequency } from "../admin/types";
import { DEFAULT_PLANS, computeSubscriptionStatus } from "../admin/types";
import type { UserProfile } from "../app/types";
import { supabase } from "./supabase";

const USERS_STORAGE_KEY = "pondtora_admin_users";
const LOGS_STORAGE_KEY = "pondtora_admin_logs";

export const DUMMY_USER_IDS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
export const DUMMY_USER_EMAILS = new Set([
  "adebayo@example.com",
  "ngozi@freshpond.ng",
  "emeka@catfish.com",
  "fatima@aquafarm.ng",
  "tunde@pondfresh.com",
  "chidinma@tilapia.ng",
  "segun@riverfish.com",
  "amaka@pondfarm.ng",
  "yusuf@northfish.ng",
]);

export function isDummyUser(u: AdminUser | { id?: string; email?: string } | null | undefined): boolean {
  if (!u) return false;
  if (u.id && DUMMY_USER_IDS.has(String(u.id))) return true;
  if (u.email && DUMMY_USER_EMAILS.has(u.email.toLowerCase().trim())) return true;
  return false;
}

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

/**
 * Fetches all real registered users and farms directly from Supabase,
 * merges with existing administrative overrides, filters out dummy mock users,
 * and updates the admin users local cache.
 */
export async function fetchLiveAdminUsers(): Promise<{
  users: AdminUser[];
  isLiveFromDb: boolean;
  count: number;
}> {
  try {
    const existingLocal = loadAllAdminUsers();

    // Query Supabase directly for all user profiles, farms, and ponds
    const [profilesRes, farmsRes, pondsRes] = await Promise.all([
      supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("farms").select("id, user_id, name"),
      supabase.from("ponds").select("id, user_id, farm_id"),
    ]);

    const rawProfiles = profilesRes.data || [];
    const rawFarms = farmsRes.data || [];
    const rawPonds = pondsRes.data || [];

    if (rawProfiles.length > 0) {
      const dbUsers: AdminUser[] = rawProfiles.map((p: any) => {
        const userFarms = rawFarms.filter((f: any) => f.user_id === p.id);
        const farmCount = Math.max(userFarms.length, 1);
        const farmName = p.farm_name || userFarms[0]?.name || "Primary Farm";

        // Find existing local record to preserve custom overrides (custom pricing, free access, etc.)
        const local = existingLocal.find(
          x => x.id === p.id || (x.email && x.email.toLowerCase() === (p.email || "").toLowerCase())
        );

        const u: AdminUser = {
          id: p.id,
          name: p.name || (p.email ? p.email.split("@")[0] : "Farmer"),
          email: p.email || "",
          farmName: farmName,
          phone: p.phone || local?.phone || "",
          city: p.city || local?.city || "Lagos",
          state: p.state || local?.state || "Lagos",
          country: p.country || local?.country || "Nigeria",
          role: p.role || local?.role || "owner",
          activePlan: p.active_plan || local?.activePlan || "Starter",
          trialStartDate: p.trial_start_date ? p.trial_start_date.slice(0, 10) : (local?.trialStartDate || null),
          billingFrequency: local?.billingFrequency || "monthly",
          subscriptionAmount: typeof local?.subscriptionAmount === "number" ? local.subscriptionAmount : null,
          subscriptionStatus: "Trial",
          subscriptionStart: local?.subscriptionStart || (p.created_at ? p.created_at.slice(0, 10) : null),
          subscriptionExpiry: local?.subscriptionExpiry || null,
          accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
          freeAccess: Boolean(local?.freeAccess),
          farmCount: farmCount,
          paystackReference: local?.paystackReference,
          lastPaymentDate: local?.lastPaymentDate,
          createdAt: p.created_at ? p.created_at.slice(0, 10) : (local?.createdAt || new Date().toISOString().slice(0, 10)),
        };
        u.subscriptionStatus = computeSubscriptionStatus(u);
        return u;
      });

      // Filter out any dummy users completely
      const dbIds = new Set(dbUsers.map(u => u.id));
      const dbEmails = new Set(dbUsers.map(u => (u.email || "").toLowerCase()));
      const extraLocal = existingLocal.filter(
        u => !isDummyUser(u) && !dbIds.has(u.id) && !dbEmails.has((u.email || "").toLowerCase())
      );

      const finalUsers = [...dbUsers, ...extraLocal].filter(u => !isDummyUser(u));
      saveAllAdminUsers(finalUsers);
      return { users: finalUsers, isLiveFromDb: true, count: finalUsers.length };
    }

    // Fallback: If query returned 0 rows (e.g. offline or RLS restricted),
    // check if current active user profile exists in localStorage
    try {
      const activeProfRaw = localStorage.getItem("pondtora_user_profile");
      if (activeProfRaw) {
        const activeProf = JSON.parse(activeProfRaw);
        if (activeProf?.email && !isDummyUser(activeProf)) {
          syncUserProfileToAdmin(activeProf);
        }
      }
    } catch {}

    const currentUsers = loadAllAdminUsers().filter(u => !isDummyUser(u));
    return { users: currentUsers, isLiveFromDb: false, count: currentUsers.length };
  } catch (err) {
    console.warn("fetchLiveAdminUsers error:", err);
    const cleanLocal = loadAllAdminUsers().filter(u => !isDummyUser(u));
    return { users: cleanLocal, isLiveFromDb: false, count: cleanLocal.length };
  }
}

/**
 * Persists an admin user modification to Supabase user_profiles
 */
export async function updateAdminUserInDb(u: AdminUser): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("user_profiles")
      .update({
        name: u.name,
        farm_name: u.farmName,
        phone: u.phone,
        city: u.city,
        state: u.state,
        country: u.country,
        active_plan: u.activePlan,
        status: u.accountStatus,
        role: u.role || "owner",
      })
      .eq("id", u.id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletes a user profile from Supabase user_profiles
 */
export async function deleteAdminUserInDb(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_profiles").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
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


