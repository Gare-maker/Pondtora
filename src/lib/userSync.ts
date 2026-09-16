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
        return parsed
          .filter(u => {
            if (!u || typeof u !== "object" || typeof u.id !== "string") return false;
            const r = (u.role || "").toLowerCase();
            return r !== "staff" && r !== "staff member";
          })
          .map(u => ({
            ...u,
            subscriptionStatus: computeSubscriptionStatus(u),
          }));
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

    // Collect all staff emails to strictly exclude invited staff from the Business Admin users list
    const staffEmails = new Set(
      rawStaff
        .map((s: any) => (s.email || "").toLowerCase().trim())
        .filter(Boolean)
    );

    const dbUsers: AdminUser[] = [];

    // 1. Process user profiles (farm owners only - excluding staff)
    rawProfiles.forEach((p: any) => {
      const pEmail = (p.email || "").toLowerCase().trim();
      const pRole = (p.role || "").toLowerCase().trim();
      if (pRole === "staff" || pRole === "staff member" || staffEmails.has(pEmail)) {
        return;
      }

      const local = existingLocal.find(
        x => x.id === p.id || (x.email && x.email.toLowerCase() === pEmail)
      );

      const userFarms = rawFarms.filter((f: any) => f.user_id === p.id);
      const farmCount = userFarms.length > 0 ? userFarms.length : (p.farm_name ? 1 : (local?.farmCount || 1));
      const farmName = p.farm_name || userFarms[0]?.name || local?.farmName || "Primary Farm";

      const userFarmIds = new Set(userFarms.map((f: any) => f.id));
      const userPonds = rawPonds.filter((pd: any) => pd.user_id === p.id || (pd.farm_id && userFarmIds.has(pd.farm_id)));
      const pondCount = userPonds.length || local?.pondCount || 0;

      const userStaff = rawStaff.filter((s: any) => s.user_id === p.id);
      const staffCount = userStaff.length || local?.staffCount || 0;

      const hasPaid = Boolean(
        local?.hasPaid ||
        local?.paystackReference ||
        local?.lastPaymentDate ||
        p.paystack_reference ||
        p.last_payment_date
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
        trialStartDate: p.trial_start_date ? p.trial_start_date.slice(0, 10) : (local?.trialStartDate || (p.created_at ? p.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10))),
        billingFrequency: local?.billingFrequency || "monthly",
        subscriptionAmount: typeof local?.subscriptionAmount === "number" ? local.subscriptionAmount : null,
        hasPaid: hasPaid,
        subscriptionStatus: "Trial",
        subscriptionStart: hasPaid ? (local?.subscriptionStart || null) : null,
        subscriptionExpiry: hasPaid ? (local?.subscriptionExpiry || null) : null,
        accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
        freeAccess: Boolean(local?.freeAccess),
        farmCount: farmCount,
        pondCount: pondCount,
        staffCount: staffCount,
        paystackReference: local?.paystackReference || p.paystack_reference,
        lastPaymentDate: local?.lastPaymentDate || p.last_payment_date,
        createdAt: p.created_at ? p.created_at.slice(0, 10) : (local?.createdAt || new Date().toISOString().slice(0, 10)),
      };
      u.subscriptionStatus = computeSubscriptionStatus(u);
      dbUsers.push(u);
    });

    const existingEmails = new Set(dbUsers.map(u => (u.email || "").toLowerCase().trim()));

    // 2. Scan localStorage for any cached profiles (farm owners only)
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.endsWith("_user_profile") || key === "pondtora_user_profile") {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const prof = JSON.parse(raw);
              const profRole = (prof?.role || "").toLowerCase().trim();
              if (prof?.email && profRole !== "staff" && profRole !== "staff member") {
                const em = prof.email.toLowerCase().trim();
                if (!existingEmails.has(em) && !staffEmails.has(em)) {
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
      u => !isDummyUser(u) &&
           !dbIds.has(u.id) &&
           !existingEmails.has((u.email || "").toLowerCase().trim()) &&
           (u.role || "").toLowerCase() !== "staff" &&
           (u.role || "").toLowerCase() !== "staff member" &&
           !staffEmails.has((u.email || "").toLowerCase().trim())
    );

    const finalUsers = [...dbUsers, ...extraLocal];
    saveAllAdminUsers(finalUsers);
    return { users: finalUsers, isLiveFromDb: rawProfiles.length > 0, count: finalUsers.length };
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
 * Completely and permanently deletes a user from:
 * 1. Supabase auth.users (so credentials are removed and they cannot log in again)
 * 2. Supabase user_profiles, staff_members, farms, and all related tables
 * 3. Supabase Edge Function admin endpoint with service-role privileges
 * 4. LocalStorage keys for this user
 */
export async function deleteAdminUserInDb(id: string, email?: string): Promise<boolean> {
  const cleanEmail = (email || "").trim().toLowerCase();
  let anySuccess = false;

  // 1. Try Supabase Edge Function (has service-role key to delete from auth.admin)
  try {
    const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://make-server-1da59a07.supabase.co"}/functions/v1/make-server-1da59a07/admin/delete-user`;
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
      },
      body: JSON.stringify({ userId: id, email: cleanEmail }),
    });
    if (res.ok) {
      anySuccess = true;
    }
  } catch (e) {
    console.warn("Edge function delete-user attempt:", e);
  }

  // 2. Try Postgres RPC: delete_user_completely (SECURITY DEFINER with direct auth.users access)
  try {
    const { error: rpcErr } = await supabase.rpc("delete_user_completely", { target_user_id: id });
    if (!rpcErr) anySuccess = true;
  } catch (e) {
    console.warn("RPC delete_user_completely attempt:", e);
  }

  // 3. Try Postgres RPC: delete_user_by_email if email is available
  if (cleanEmail) {
    try {
      const { error: emailRpcErr } = await supabase.rpc("delete_user_by_email", { target_email: cleanEmail });
      if (!emailRpcErr) anySuccess = true;
    } catch (e) {
      console.warn("RPC delete_user_by_email attempt:", e);
    }
  }

  // 4. Direct Supabase table cascading deletes
  try {
    await supabase.from("pond_reports").delete().eq("user_id", id);
    await supabase.from("investment_payments").delete().eq("user_id", id);
    await supabase.from("investments").delete().eq("user_id", id);
    await supabase.from("investors").delete().eq("user_id", id);
    await supabase.from("invoices").delete().eq("user_id", id);
    await supabase.from("invoice_settings").delete().eq("user_id", id);
    await supabase.from("treatment_records").delete().eq("user_id", id);
    await supabase.from("mortality_entries").delete().eq("user_id", id);
    await supabase.from("reports").delete().eq("user_id", id);
    await supabase.from("revenues").delete().eq("user_id", id);
    await supabase.from("expenses").delete().eq("user_id", id);
    await supabase.from("feed_remaining_logs").delete().eq("user_id", id);
    await supabase.from("bag_open_logs").delete().eq("user_id", id);
    await supabase.from("feeding_records").delete().eq("user_id", id);
    await supabase.from("feed_inventory").delete().eq("user_id", id);
    await supabase.from("stock_events").delete().eq("user_id", id);
    await supabase.from("ponds").delete().eq("user_id", id);
    await supabase.from("farms").delete().eq("user_id", id);
    await supabase.from("staff_invitations").delete().eq("invited_by", id);
    await supabase.from("staff_members").delete().or(`user_id.eq.${id},id.eq.${id}`);
    const { error: profErr } = await supabase.from("user_profiles").delete().eq("id", id);
    if (!profErr) anySuccess = true;

    if (cleanEmail) {
      await supabase.from("user_profiles").delete().ilike("email", cleanEmail);
      await supabase.from("staff_members").delete().ilike("email", cleanEmail);
    }
  } catch (e) {
    console.warn("Direct table delete attempt:", e);
  }

  // 5. Clean up local storage in the active browser for this user
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(`pondtora_${id}_`) || (cleanEmail && k.includes(cleanEmail))) {
        localStorage.removeItem(k);
      }
    }
  } catch {}

  return anySuccess;
}

/**
 * Deletes all non-admin users and their data from the database and local storage,
 * strictly preserving the Master Admin (edafejesugarec@gmail.com and any account with role='admin').
 */
export async function deleteAllNonAdminUsersInDb(preserveAdminEmail = "edafejesugarec@gmail.com"): Promise<{
  deletedCount: number;
  preservedAdmins: string[];
}> {
  const cleanAdminEmail = preserveAdminEmail.trim().toLowerCase();
  let deletedCount = 0;
  const preservedAdmins: string[] = [cleanAdminEmail];

  try {
    // 1. Fetch all user profiles and staff members
    const [profRes, staffRes] = await Promise.all([
      supabase.from("user_profiles").select("id, email, role, name"),
      supabase.from("staff_members").select("id, email, name, user_id, staff_auth_id"),
    ]);

    const profiles = profRes.data || [];
    const staff = staffRes.data || [];

    // Filter non-admin users
    const nonAdminProfiles = profiles.filter((p: any) => {
      const email = (p.email || "").trim().toLowerCase();
      const role = (p.role || "").trim().toLowerCase();
      if (email === cleanAdminEmail || role === "admin" || role === "superadmin") {
        if (!preservedAdmins.includes(email)) preservedAdmins.push(email);
        return false;
      }
      return true;
    });

    for (const p of nonAdminProfiles) {
      await deleteAdminUserInDb(p.id, p.email);
      deletedCount++;
    }

    // Also clean up any non-admin staff members
    for (const s of staff) {
      const email = (s.email || "").trim().toLowerCase();
      if (email !== cleanAdminEmail) {
        if (s.id) await supabase.from("staff_members").delete().eq("id", s.id);
        if (s.staff_auth_id) {
          await supabase.from("user_profiles").delete().eq("id", s.staff_auth_id);
          try {
            await supabase.rpc("delete_user_completely", { target_user_id: s.staff_auth_id });
          } catch {}
        }
      }
    }

    // Clean up local storage admin user lists except admin
    try {
      const raw = localStorage.getItem("pondtora_admin_users");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const kept = parsed.filter((u: any) => {
            const e = (u.email || "").trim().toLowerCase();
            return e === cleanAdminEmail || u.role === "admin" || u.role === "superadmin";
          });
          localStorage.setItem("pondtora_admin_users", JSON.stringify(kept));
        }
      }
    } catch {}

  } catch (err) {
    console.warn("deleteAllNonAdminUsersInDb error:", err);
  }

  return { deletedCount, preservedAdmins };
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
  const profRole = (profile.role || "").toLowerCase().trim();
  if (profRole === "staff" || profRole === "staff member") return null;

  const targetEmail = (profile.email || "").trim().toLowerCase();
  if (!targetEmail) return null;

  const users = loadAllAdminUsers();
  const existingIdx = users.findIndex(u => (u?.email || "").trim().toLowerCase() === targetEmail);

  let userObj: AdminUser;

  if (existingIdx >= 0) {
    const current = users[existingIdx];
    const hasPaid = Boolean(current.hasPaid || current.paystackReference || current.lastPaymentDate);
    userObj = {
      ...current,
      name: profile.name || current.name || targetEmail.split("@")[0],
      farmName: profile.farmName || current.farmName || "Primary Farm",
      phone: profile.phone || current.phone || "",
      city: profile.city || current.city || "Lagos",
      state: profile.state || current.state || "Lagos",
      country: profile.country || current.country || "Nigeria",
      activePlan: activePlan || profile.activePlan || current.activePlan || "Starter",
      hasPaid: hasPaid,
      trialStartDate: hasPaid ? null : (profile.trialStartDate || current.trialStartDate || new Date().toISOString().slice(0, 10)),
      farmCount: Math.max(farmCount || 1, current.farmCount || 1),
      subscriptionStart: hasPaid ? current.subscriptionStart : null,
      subscriptionExpiry: hasPaid ? current.subscriptionExpiry : null,
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
      hasPaid: false,
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
      hasPaid: true,
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
      hasPaid: true,
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


