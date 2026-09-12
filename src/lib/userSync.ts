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
  // If user has a real UUID or long ID, they are definitely NOT a dummy user
  if (u.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)) {
    return false;
  }
  if (u.id && DUMMY_USER_IDS.has(String(u.id))) return true;
  if (u.email && DUMMY_USER_EMAILS.has(u.email.toLowerCase().trim()) && (!u.id || u.id.length < 10)) return true;
  return false;
}

export function loadAllAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
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
 * Fetches all real registered users, staff members, and farms directly from Supabase,
 * merges with existing administrative overrides and cached user profiles,
 * and updates the admin users local cache.
 */
export async function fetchLiveAdminUsers(): Promise<{
  users: AdminUser[];
  isLiveFromDb: boolean;
  count: number;
}> {
  try {
    const existingLocal = loadAllAdminUsers();

    // Query Supabase directly for user profiles, staff members, farms, and ponds
    const [profilesRes, staffRes, farmsRes, pondsRes] = await Promise.all([
      supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_members").select("*").order("created_at", { ascending: false }),
      supabase.from("farms").select("id, user_id, name"),
      supabase.from("ponds").select("id, user_id, farm_id"),
    ]);

    const rawProfiles = profilesRes.data || [];
    const rawStaff = staffRes.data || [];
    const rawFarms = farmsRes.data || [];
    const rawPonds = pondsRes.data || [];

    const dbUsers: AdminUser[] = [];

    // 1. Process user profiles (farm owners)
    rawProfiles.forEach((p: any) => {
      const userFarms = rawFarms.filter((f: any) => f.user_id === p.id);
      const farmCount = Math.max(userFarms.length, 1);
      const farmName = p.farm_name || userFarms[0]?.name || "Primary Farm";

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
      dbUsers.push(u);
    });

    // 2. Process staff members (include staff with logins/emails)
    const existingEmails = new Set(dbUsers.map(u => (u.email || "").toLowerCase().trim()));
    rawStaff.forEach((s: any) => {
      const sEmail = (s.email || "").toLowerCase().trim();
      if (!sEmail || existingEmails.has(sEmail)) return;
      existingEmails.add(sEmail);

      const ownerFarm = rawFarms.find((f: any) => f.id === s.farms?.[0]) || rawFarms.find((f: any) => f.user_id === s.user_id);
      const ownerProfile = rawProfiles.find((p: any) => p.id === s.user_id);
      const farmName = ownerFarm?.name || ownerProfile?.farm_name || "Assigned Farm";

      const local = existingLocal.find(
        x => x.id === s.id || (x.email && x.email.toLowerCase() === sEmail)
      );

      const u: AdminUser = {
        id: s.id || s.staff_auth_id || crypto.randomUUID(),
        name: s.name || sEmail.split("@")[0],
        email: sEmail,
        farmName: farmName,
        phone: s.phone || local?.phone || "",
        city: local?.city || "Lagos",
        state: local?.state || "Lagos",
        country: local?.country || "Nigeria",
        role: s.role || "Staff Member",
        activePlan: "Starter",
        trialStartDate: null,
        billingFrequency: "monthly",
        subscriptionAmount: null,
        subscriptionStatus: "Active",
        subscriptionStart: s.created_at ? s.created_at.slice(0, 10) : null,
        subscriptionExpiry: null,
        accountStatus: (s.status === "Active" && local?.accountStatus !== "Suspended") ? "Active" : "Suspended",
        freeAccess: true,
        farmCount: (s.farms && s.farms.length) ? s.farms.length : 1,
        createdAt: s.created_at ? s.created_at.slice(0, 10) : (local?.createdAt || new Date().toISOString().slice(0, 10)),
      };
      dbUsers.push(u);
    });

    // 3. Scan localStorage for any cached profiles
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.endsWith("_user_profile") || key === "pondtora_user_profile") {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const prof = JSON.parse(raw);
              if (prof?.email) {
                const em = prof.email.toLowerCase().trim();
                if (!existingEmails.has(em)) {
                  existingEmails.add(em);
                  const uObj = syncUserProfileToAdmin(prof);
                  if (uObj) dbUsers.push(uObj);
                }
              }
            }
          } catch {}
        }
      });
    } catch {}

    const dbIds = new Set(dbUsers.map(u => u.id));
    const extraLocal = existingLocal.filter(
      u => !isDummyUser(u) && !dbIds.has(u.id) && !existingEmails.has((u.email || "").toLowerCase().trim())
    );

    const finalUsers = [...dbUsers, ...extraLocal];
    saveAllAdminUsers(finalUsers);
    return { users: finalUsers, isLiveFromDb: rawProfiles.length > 0 || rawStaff.length > 0, count: finalUsers.length };
  } catch (err) {
    console.warn("fetchLiveAdminUsers error:", err);
    const cleanLocal = loadAllAdminUsers();
    return { users: cleanLocal, isLiveFromDb: false, count: cleanLocal.length };
  }
}

/**
 * Persists an admin user modification to Supabase user_profiles and staff_members
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

    if (u.role && u.role !== "owner") {
      await supabase
        .from("staff_members")
        .update({
          name: u.name,
          role: u.role,
          status: u.accountStatus === "Suspended" ? "Inactive" : "Active",
        })
        .or(`id.eq.${u.id},email.eq.${u.email}`);
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Deletes a user profile from Supabase user_profiles and staff_members
 */
export async function deleteAdminUserInDb(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from("user_profiles").delete().eq("id", id);
    await supabase.from("staff_members").delete().eq("id", id);
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


