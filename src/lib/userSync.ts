import type { AdminUser, AdminActivityLog, AdminPlan, BillingFrequency } from "../admin/types";
import { DEFAULT_PLANS, computeSubscriptionStatus } from "../admin/types";
import type { UserProfile } from "../app/types";
import { supabase } from "./supabase";

const USERS_STORAGE_KEY = "pondtora_admin_users";
const LOGS_STORAGE_KEY = "pondtora_admin_logs";
const STATS_STORAGE_KEY = "pondtora_admin_platform_stats";

export interface PlatformOperationalStats {
  totalUsers: number;
  totalFarms: number;
  totalPonds: number;
  totalFishStocked: number;
  totalFeedConsumedKg: number;
  totalBagsInStock: number;
  totalPlatformRevenue: number;
  totalPlatformExpenses: number;
  netPlatformProfit: number;
  totalInvoicesValue: number;
  paidInvoicesValue: number;
  totalInvoicesCount: number;
  totalStaffMembers: number;
}

export const DEFAULT_PLATFORM_STATS: PlatformOperationalStats = {
  totalUsers: 0,
  totalFarms: 0,
  totalPonds: 0,
  totalFishStocked: 0,
  totalFeedConsumedKg: 0,
  totalBagsInStock: 0,
  totalPlatformRevenue: 0,
  totalPlatformExpenses: 0,
  netPlatformProfit: 0,
  totalInvoicesValue: 0,
  paidInvoicesValue: 0,
  totalInvoicesCount: 0,
  totalStaffMembers: 0,
};

export function isDummyUser(u: any): boolean {
  if (!u) return false;
  const email = (u.email || "").toLowerCase();
  return email.includes("dummy") || email.includes("test@") || email.includes("example.com");
}

/**
 * Accurately determines whether an account is a farm staff member (employee)
 * rather than a product farm owner / customer account.
 */
export function isStaffUser(u: any): boolean {
  if (!u) return false;
  const role = (u.role || "").toLowerCase().trim();
  return (
    role === "staff" ||
    role === "staff member" ||
    role === "farm manager" ||
    role === "feeding staff" ||
    role === "inventory staff" ||
    role === "feeding & inventory staff" ||
    role === "general staff" ||
    Boolean(u.owner_id || u.ownerId)
  );
}

export function loadAllAdminUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(u => u && typeof u === "object" && typeof u.id === "string" && !isStaffUser(u))
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
    // Enforce strict separation: never persist staff accounts to the Admin customer list
    const validOwners = (users || []).filter(u => !isStaffUser(u));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(validOwners));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated", { detail: validOwners }));
  } catch {}
}

export function loadCachedPlatformStats(): PlatformOperationalStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_PLATFORM_STATS, ...parsed };
      }
    }
  } catch {}
  return DEFAULT_PLATFORM_STATS;
}

export function savePlatformStats(stats: PlatformOperationalStats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent("pondtora:platform_updated", { detail: stats }));
  } catch {}
}

/**
 * Fetches all real registered farm-owner customer accounts and operational statistics.
 * Strictly separates farm owners (customers) from staff accounts (employees).
 */
export async function fetchLiveAdminUsers(): Promise<{
  users: AdminUser[];
  stats: PlatformOperationalStats;
  isLiveFromDb: boolean;
  count: number;
}> {
  const existingLocal = loadAllAdminUsers().filter(u => !isStaffUser(u));
  let dbUsers: AdminUser[] = [];
  let fetchedStats: PlatformOperationalStats | null = null;
  let isLive = false;

  // ── 1. Priority 1: Postgres RPC get_all_users_for_admin ──
  try {
    const { data: rpcUsers, error: rpcErr } = await supabase.rpc("get_all_users_for_admin");
    if (!rpcErr && Array.isArray(rpcUsers) && rpcUsers.length > 0) {
      // Strictly exclude any staff accounts that might match
      const validOwners = rpcUsers.filter((p: any) => !isStaffUser(p));
      dbUsers = validOwners.map((p: any) => {
        const pEmail = (p.email || "").toLowerCase().trim();
        const local = existingLocal.find(
          x => x.id === p.id || (x.email && x.email.toLowerCase().trim() === pEmail)
        );

        const hasPaid = Boolean(
          local?.hasPaid ||
          local?.paystackReference ||
          local?.lastPaymentDate ||
          p.paystack_reference ||
          p.last_payment_date
        );

        const roleStr = (p.role || local?.role || "owner").toLowerCase().trim();

        const u: AdminUser = {
          id: p.id,
          name: p.name || (p.email ? p.email.split("@")[0] : "Farmer"),
          email: p.email || "",
          farmName: p.farm_name || local?.farmName || "Primary Farm",
          phone: p.phone || local?.phone || "",
          city: p.city || local?.city || "Lagos",
          state: p.state || local?.state || "Lagos",
          country: p.country || local?.country || "Nigeria",
          role: roleStr,
          activePlan: p.active_plan || local?.activePlan || "Starter",
          trialStartDate: p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : (local?.trialStartDate || (p.created_at ? String(p.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10))),
          billingFrequency: local?.billingFrequency || "monthly",
          subscriptionAmount: typeof local?.subscriptionAmount === "number" ? local.subscriptionAmount : null,
          hasPaid: hasPaid,
          subscriptionStatus: "Trial",
          subscriptionStart: hasPaid ? (local?.subscriptionStart || null) : null,
          subscriptionExpiry: hasPaid ? (local?.subscriptionExpiry || null) : null,
          accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
          freeAccess: Boolean(local?.freeAccess || p.free_access),
          farmCount: Math.max(Number(p.farm_count) || 1, local?.farmCount || 1),
          pondCount: Number(p.pond_count) || local?.pondCount || 0,
          staffCount: Number(p.staff_count) || local?.staffCount || 0,
          paystackReference: local?.paystackReference || p.paystack_reference,
          lastPaymentDate: local?.lastPaymentDate || p.last_payment_date,
          createdAt: p.created_at ? String(p.created_at).slice(0, 10) : (local?.createdAt || new Date().toISOString().slice(0, 10)),
        };
        u.subscriptionStatus = computeSubscriptionStatus(u);
        return u;
      });
      isLive = true;
    } else if (rpcErr) {
      console.warn("RPC get_all_users_for_admin note:", rpcErr.message || rpcErr);
    }
  } catch (rpcEx) {
    console.warn("RPC get_all_users_for_admin fallback:", rpcEx);
  }

  // ── 2. Priority 2: Direct Supabase database tables query ──
  if (dbUsers.length === 0) {
    try {
      const [profilesRes, staffRes, farmsRes, pondsRes, invoicesRes] = await Promise.all([
        supabase.from("user_profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("staff_members").select("*").order("created_at", { ascending: false }),
        supabase.from("farms").select("id, user_id, name, city, state, country"),
        supabase.from("ponds").select("id, user_id, farm_id, current_count, initial_stock"),
        supabase.from("invoices").select("id, user_id, grand_total, status"),
      ]);

      const rawProfiles = profilesRes.data || [];
      const rawStaff = staffRes.data || [];
      const rawFarms = farmsRes.data || [];
      const rawPonds = pondsRes.data || [];
      const rawInvoices = invoicesRes.data || [];

      const processedEmails = new Set<string>();
      const processedIds = new Set<string>();

      // Build quick lookup for staff accounts to strictly exclude them from Admin Users list
      const staffEmails = new Set(rawStaff.map((s: any) => (s.email || "").toLowerCase().trim()).filter(Boolean));
      const staffAuthIds = new Set(rawStaff.map((s: any) => s.staff_auth_id).filter(Boolean));

      // 2a. Process ONLY farm-owner customer profiles (strictly exclude staff members)
      const ownerProfiles = rawProfiles.filter((p: any) => {
        const pEmail = (p.email || "").toLowerCase().trim();
        if (isStaffUser(p)) return false;
        if (p.id && staffAuthIds.has(p.id)) return false;
        if (pEmail && staffEmails.has(pEmail)) {
          const sm = rawStaff.find((s: any) => (s.email || "").toLowerCase().trim() === pEmail);
          if (sm && sm.user_id !== p.id) return false;
        }
        return true;
      });

      if (ownerProfiles.length > 0) {
        ownerProfiles.forEach((p: any) => {
          const pEmail = (p.email || "").toLowerCase().trim();
          const pRole = (p.role || "owner").toLowerCase().trim();
          if (pEmail) processedEmails.add(pEmail);
          if (p.id) processedIds.add(p.id);

          const local = existingLocal.find(
            x => x.id === p.id || (x.email && x.email.toLowerCase().trim() === pEmail)
          );

          const userFarms = rawFarms.filter((f: any) => f.user_id === p.id);
          const farmCount = userFarms.length > 0 ? userFarms.length : (p.farm_name ? 1 : (local?.farmCount || 1));
          const farmName = p.farm_name || userFarms[0]?.name || local?.farmName || "Primary Farm";

          const userFarmIds = new Set(userFarms.map((f: any) => f.id));
          const userPonds = rawPonds.filter((pd: any) => pd.user_id === p.id || (pd.farm_id && userFarmIds.has(pd.farm_id)));
          const pondCount = userPonds.length || local?.pondCount || 0;

          // Count only staff belonging to this farm owner
          const userStaff = rawStaff.filter((s: any) => s.user_id === p.id);
          const staffCount = userStaff.length || local?.staffCount || 0;

          const userInvoices = rawInvoices.filter((inv: any) => inv.user_id === p.id);
          const invoicesCount = userInvoices.length || local?.invoicesCount || 0;

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
            role: pRole,
            activePlan: p.active_plan || local?.activePlan || "Starter",
            trialStartDate: p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : (local?.trialStartDate || (p.created_at ? String(p.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10))),
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
            invoicesCount: invoicesCount,
            totalFishStocked: userPonds.reduce((s: number, pd: any) => s + (Number(pd.current_count ?? pd.initial_stock) || 0), 0),
            paystackReference: local?.paystackReference || p.paystack_reference,
            lastPaymentDate: local?.lastPaymentDate || p.last_payment_date,
            createdAt: p.created_at ? String(p.created_at).slice(0, 10) : (local?.createdAt || new Date().toISOString().slice(0, 10)),
          };
          u.subscriptionStatus = computeSubscriptionStatus(u);
          dbUsers.push(u);
        });
        isLive = true;
      }

      // NOTE: Staff accounts from rawStaff are NEVER pushed to dbUsers!
      // They are employees under a farm, not platform customers.

      // 2b. If current active session user is not yet in dbUsers and is NOT staff, include them
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const sessEmail = session.user.email.toLowerCase().trim();
        const sessRole = (session.user.user_metadata?.role || "").toLowerCase().trim();
        const isStaff = isStaffUser({ role: sessRole }) || Boolean(session.user.user_metadata?.owner_id) || staffEmails.has(sessEmail);
        if (!isStaff && !processedEmails.has(sessEmail)) {
          const sessUser: AdminUser = {
            id: session.user.id,
            name: session.user.user_metadata?.name || sessEmail.split("@")[0],
            email: session.user.email,
            farmName: session.user.user_metadata?.farm_name || "Primary Farm",
            phone: session.user.user_metadata?.phone || "",
            city: session.user.user_metadata?.city || "Lagos",
            state: session.user.user_metadata?.state || "Lagos",
            country: session.user.user_metadata?.country || "Nigeria",
            role: session.user.user_metadata?.role || (sessEmail === "edafejesugarec@gmail.com" ? "admin" : "owner"),
            activePlan: session.user.user_metadata?.active_plan || "Starter",
            trialStartDate: new Date().toISOString().slice(0, 10),
            billingFrequency: "monthly",
            subscriptionAmount: null,
            hasPaid: false,
            subscriptionStatus: "Trial",
            subscriptionStart: null,
            subscriptionExpiry: null,
            accountStatus: "Active",
            freeAccess: sessEmail === "edafejesugarec@gmail.com",
            farmCount: 1,
            pondCount: 0,
            staffCount: rawStaff.filter((s: any) => s.user_id === session.user.id).length,
            createdAt: session.user.created_at ? String(session.user.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
          };
          dbUsers.push(sessUser);
          isLive = true;
        }
      }

      fetchedStats = calculateAggregatedStats(dbUsers, rawStaff.length);
    } catch (tblErr) {
      console.warn("Direct table fallback error:", tblErr);
    }
  }

  // ── 3. Intelligent Non-Destructive Merge (Guaranteed Zero Data Loss) ──
  if (dbUsers.length > 0) {
    const userMap = new Map<string, AdminUser>();

    // Start with existing cached users (strictly farm owners!)
    existingLocal.filter(u => !isStaffUser(u)).forEach(u => {
      if (u && (u.id || u.email)) {
        userMap.set((u.email || u.id).toLowerCase(), u);
      }
    });

    // Merge in newly fetched db users (updating or inserting)
    dbUsers.filter(u => !isStaffUser(u)).forEach(u => {
      if (u && (u.id || u.email)) {
        const key = (u.email || u.id).toLowerCase();
        const existing = userMap.get(key) || userMap.get(u.id.toLowerCase());
        userMap.set(key, {
          ...existing,
          ...u,
          subscriptionStatus: computeSubscriptionStatus({ ...existing, ...u }),
        });
      }
    });

    const finalUsers = Array.from(userMap.values()).filter(u => !isStaffUser(u));
    saveAllAdminUsers(finalUsers);

    const finalStats = fetchedStats || calculateAggregatedStats(finalUsers);
    savePlatformStats(finalStats);

    return {
      users: finalUsers,
      stats: finalStats,
      isLiveFromDb: isLive,
      count: finalUsers.length,
    };
  } else {
    // Database query returned 0 rows (e.g. RLS restrictions or network timeout)
    // CRITICAL: Filter out any legacy staff members and preserve genuine customer accounts
    const validLocal = existingLocal.filter(u => !isStaffUser(u));
    const finalStats = calculateAggregatedStats(validLocal);
    return {
      users: validLocal,
      stats: finalStats,
      isLiveFromDb: false,
      count: validLocal.length,
    };
  }
}

function calculateAggregatedStats(users: AdminUser[], directStaffCount?: number): PlatformOperationalStats {
  const cached = loadCachedPlatformStats();
  const validUsers = users.filter(u => !isStaffUser(u));
  const totalUsers = validUsers.length;
  const totalFarms = validUsers.reduce((s, u) => s + (u.farmCount || 1), 0);
  const totalPonds = validUsers.reduce((s, u) => s + (u.pondCount || 0), 0);
  const totalFish = validUsers.reduce((s, u) => s + (u.totalFishStocked || 0), 0);
  const totalStaffFromUsers = validUsers.reduce((s, u) => s + (u.staffCount || 0), 0);
  const totalStaff = typeof directStaffCount === "number" ? Math.max(directStaffCount, totalStaffFromUsers) : (totalStaffFromUsers || cached.totalStaffMembers);
  const totalRev = validUsers.reduce((s, u) => s + (u.totalRevenue || 0), 0);
  const totalExp = validUsers.reduce((s, u) => s + (u.totalExpenses || 0), 0);

  return {
    ...cached,
    totalUsers,
    totalFarms,
    totalPonds,
    totalFishStocked: totalFish || cached.totalFishStocked,
    totalStaffMembers: totalStaff,
    totalPlatformRevenue: totalRev || cached.totalPlatformRevenue,
    totalPlatformExpenses: totalExp || cached.totalPlatformExpenses,
    netPlatformProfit: (totalRev || cached.totalPlatformRevenue) - (totalExp || cached.totalPlatformExpenses),
  };
}

/**
 * Fetches platform-wide operational stats from database
 */
export async function fetchPlatformOperationalStats(): Promise<PlatformOperationalStats> {
  try {
    const res = await fetchLiveAdminUsers();
    return res.stats;
  } catch {
    return loadCachedPlatformStats();
  }
}

/**
 * Subscribes to real-time changes in Supabase and window events
 */
export function subscribeToPlatformUpdates(onUpdate: () => void): () => void {
  const handleEvent = () => {
    onUpdate();
  };

  window.addEventListener("pondtora:users_updated", handleEvent);
  window.addEventListener("pondtora:platform_updated", handleEvent);
  window.addEventListener("pondtora:logs_updated", handleEvent);
  window.addEventListener("pondtora:plans_updated", handleEvent);

  let channel: any = null;
  try {
    channel = supabase.channel("pondtora_admin_realtime_" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "farms" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponds" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_members" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, handleEvent)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, handleEvent)
      .subscribe();
  } catch (e) {
    console.warn("Supabase realtime subscription:", e);
  }

  return () => {
    window.removeEventListener("pondtora:users_updated", handleEvent);
    window.removeEventListener("pondtora:platform_updated", handleEvent);
    window.removeEventListener("pondtora:logs_updated", handleEvent);
    window.removeEventListener("pondtora:plans_updated", handleEvent);
    if (channel) {
      try { supabase.removeChannel(channel); } catch {}
    }
  };
}

/**
 * Persists an admin user modification to Supabase user_profiles, farms, and staff_members
 */
export async function updateAdminUserInDb(u: AdminUser): Promise<boolean> {
  try {
    const profilePayload: Record<string, any> = {
      name: u.name,
      farm_name: u.farmName,
      phone: u.phone,
      city: u.city,
      state: u.state,
      country: u.country,
      active_plan: u.activePlan,
      status: u.accountStatus,
      role: u.role || "owner",
      trial_start_date: u.trialStartDate,
      subscription_status: u.subscriptionStatus,
      paystack_reference: u.paystackReference || null,
      last_payment_date: u.lastPaymentDate || null,
      updated_at: new Date().toISOString(),
    };

    // 1. Direct Supabase user_profiles update
    let profSuccess = false;
    const { error: profError } = await supabase
      .from("user_profiles")
      .update(profilePayload)
      .eq("id", u.id);

    if (!profError) {
      profSuccess = true;
    }

    // 2. Try RPC admin_update_user_profile if present in schema
    try {
      const { error: rpcErr } = await supabase.rpc("admin_update_user_profile", {
        target_user_id: u.id,
        new_name: u.name,
        new_farm_name: u.farmName,
        new_phone: u.phone,
        new_city: u.city,
        new_state: u.state,
        new_country: u.country,
        new_role: u.role || "owner",
        new_active_plan: u.activePlan,
        new_status: u.accountStatus,
        new_subscription_status: u.subscriptionStatus,
        new_free_access: Boolean(u.freeAccess),
      });
      if (!rpcErr) profSuccess = true;
    } catch {}

    // 3. Update farms table
    if (u.farmName) {
      await supabase
        .from("farms")
        .update({
          name: u.farmName,
          city: u.city,
          state: u.state,
          country: u.country,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", u.id);
    }

    // 4. Update staff_members table if applicable
    if (u.role && u.role !== "owner") {
      await supabase
        .from("staff_members")
        .update({
          name: u.name,
          role: u.role,
          status: u.accountStatus === "Suspended" ? "Inactive" : "Active",
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${u.id},staff_auth_id.eq.${u.id},email.ilike.${u.email}`);
    }

    // 5. Update shared admin local cache
    const existing = loadAllAdminUsers();
    const idx = existing.findIndex(
      x => x.id === u.id || (x.email && x.email.toLowerCase() === (u.email || "").toLowerCase())
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...u, subscriptionStatus: computeSubscriptionStatus(u) };
    } else {
      existing.unshift({ ...u, subscriptionStatus: computeSubscriptionStatus(u) });
    }
    saveAllAdminUsers(existing);

    return profSuccess;
  } catch (e) {
    console.warn("updateAdminUserInDb error:", e);
    return false;
  }
}

/**
 * Completely and permanently deletes a user
 */
export async function deleteAdminUserInDb(id: string, email?: string): Promise<boolean> {
  const cleanEmail = (email || "").trim().toLowerCase();
  let anySuccess = false;

  // 1. Try Postgres RPC: delete_user_completely (SECURITY DEFINER with direct auth.users access)
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
 * Deletes all non-admin users and their data from the database and local storage
 */
export async function deleteAllNonAdminUsersInDb(preserveAdminEmail = "edafejesugarec@gmail.com"): Promise<{
  deletedCount: number;
  preservedAdmins: string[];
}> {
  const cleanAdminEmail = preserveAdminEmail.trim().toLowerCase();
  let deletedCount = 0;
  const preservedAdmins: string[] = [cleanAdminEmail];

  try {
    const [profRes, staffRes] = await Promise.all([
      supabase.from("user_profiles").select("id, email, role, name"),
      supabase.from("staff_members").select("id, email, name, user_id, staff_auth_id"),
    ]);

    const profiles = profRes.data || [];
    const staff = staffRes.data || [];

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
 * Synchronizes a user profile from the Main App into the database and Admin's registered users list
 */
export function syncUserProfileToAdmin(
  profile: UserProfile | null,
  activePlan: string | null = null,
  farmCount: number = 1
): AdminUser | null {
  if (!profile || !profile.email) return null;

  // STRICT REQUIREMENT: Staff members must NOT be added to the Admin customer list!
  if (isStaffUser(profile)) {
    return null;
  }

  const targetEmail = (profile.email || "").trim().toLowerCase();
  if (!targetEmail) return null;

  const users = loadAllAdminUsers().filter(u => !isStaffUser(u));
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
      role: profile.role || current.role || "owner",
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
      id: profile.id || Math.random().toString(36).slice(2, 10),
      name: profile.name || targetEmail.split("@")[0],
      email: targetEmail,
      farmName: profile.farmName || "Primary Farm",
      phone: profile.phone || "",
      city: profile.city || "Lagos",
      state: profile.state || "Lagos",
      country: profile.country || "Nigeria",
      role: profile.role || "owner",
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
      pondCount: 0,
      staffCount: 0,
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

  // Self-heal profile directly to Supabase user_profiles
  if (profile.id) {
    supabase.from("user_profiles").upsert({
      id: profile.id,
      name: userObj.name,
      farm_name: userObj.farmName,
      phone: userObj.phone,
      city: userObj.city,
      state: userObj.state,
      country: userObj.country,
      email: userObj.email,
      role: userObj.role || "owner",
      active_plan: userObj.activePlan,
      status: userObj.accountStatus,
      updated_at: new Date().toISOString(),
    }).then(() => {}).catch(() => {});
  }

  return userObj;
}

/**
 * Check if the active user has special admin overrides
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
 * Records a successful Paystack payment
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
