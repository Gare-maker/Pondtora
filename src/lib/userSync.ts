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

        const subAmount = typeof p.subscription_amount === "number" && !isNaN(p.subscription_amount)
          ? p.subscription_amount
          : typeof p.raw_data?.subscription_amount === "number" && !isNaN(p.raw_data.subscription_amount)
          ? p.raw_data.subscription_amount
          : (typeof local?.subscriptionAmount === "number" ? local.subscriptionAmount : null);

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
          subscriptionAmount: subAmount,
          hasPaid: hasPaid,
          subscriptionStatus: "Trial",
          subscriptionStart: hasPaid ? (local?.subscriptionStart || null) : null,
          subscriptionExpiry: hasPaid ? (local?.subscriptionExpiry || null) : null,
          accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
          freeAccess: Boolean(p.free_access || p.raw_data?.free_access || local?.freeAccess),
          farmCount: Number(p.farm_count) > 0 ? Number(p.farm_count) : (local?.farmCount || 1),
          pondCount: Number(p.pond_count) || local?.pondCount || 0,
          staffCount: Number(p.staff_count) || local?.staffCount || 0,
          paystackReference: local?.paystackReference || p.paystack_reference,
          lastPaymentDate: local?.lastPaymentDate || p.last_payment_date,
          referralCode: p.referral_code || p.referralCode || local?.referralCode,
          referredBy: p.referred_by || p.referredBy || local?.referredBy || (p.raw_user_meta_data?.referred_by),
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
          // De-duplicate duplicate farm rows by name
          const uniqueFarmNames = new Set<string>();
          const deduplicatedFarms = userFarms.filter((f: any) => {
            const normName = (f.name || "Primary Farm").toLowerCase().trim();
            if (uniqueFarmNames.has(normName)) return false;
            uniqueFarmNames.add(normName);
            return true;
          });
          const farmCount = deduplicatedFarms.length > 0 ? deduplicatedFarms.length : (p.farm_name ? 1 : (local?.farmCount || 1));
          const farmName = p.farm_name || deduplicatedFarms[0]?.name || userFarms[0]?.name || local?.farmName || "Primary Farm";

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

          const subAmount = typeof p.subscription_amount === "number" && !isNaN(p.subscription_amount)
            ? p.subscription_amount
            : typeof p.raw_data?.subscription_amount === "number" && !isNaN(p.raw_data.subscription_amount)
            ? p.raw_data.subscription_amount
            : (typeof local?.subscriptionAmount === "number" ? local.subscriptionAmount : null);

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
            subscriptionAmount: subAmount,
            hasPaid: hasPaid,
            subscriptionStatus: "Trial",
            subscriptionStart: hasPaid ? (local?.subscriptionStart || null) : null,
            subscriptionExpiry: hasPaid ? (local?.subscriptionExpiry || null) : null,
            accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
            freeAccess: Boolean(p.free_access || p.raw_data?.free_access || local?.freeAccess),
            farmCount: farmCount,
            pondCount: pondCount,
            staffCount: staffCount,
            invoicesCount: invoicesCount,
            totalFishStocked: userPonds.reduce((s: number, pd: any) => s + (Number(pd.current_count ?? pd.initial_stock) || 0), 0),
            paystackReference: local?.paystackReference || p.paystack_reference,
            lastPaymentDate: local?.lastPaymentDate || p.last_payment_date,
            referralCode: p.referral_code || p.referralCode || local?.referralCode,
            referredBy: p.referred_by || p.referredBy || local?.referredBy || (p.raw_user_meta_data?.referred_by),
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
    const cleanSubAmount =
      typeof u.subscriptionAmount === "number" && !isNaN(u.subscriptionAmount)
        ? u.subscriptionAmount
        : typeof (u as any).subscriptionAmount === "string" && !isNaN(Number((u as any).subscriptionAmount)) && (u as any).subscriptionAmount.trim() !== ""
        ? Number((u as any).subscriptionAmount)
        : null;

    const isFree = Boolean(u.freeAccess);
    const finalAmount = isFree ? null : cleanSubAmount;

    const profilePayload: Record<string, any> = {
      name: u.name,
      farm_name: u.farmName,
      phone: u.phone || "",
      city: u.city || "Lagos",
      state: u.state || "Lagos",
      country: u.country || "Nigeria",
      active_plan: u.activePlan,
      status: u.accountStatus || "Active",
      role: u.role || "owner",
      trial_start_date: u.trialStartDate || null,
      subscription_status: u.subscriptionStatus || "Trial",
      subscription_amount: finalAmount,
      free_access: isFree,
      paystack_reference: u.paystackReference || null,
      last_payment_date: u.lastPaymentDate || null,
      subscription_start: u.subscriptionStart || null,
      subscription_expiry: u.subscriptionExpiry || null,
      billing_frequency: u.billingFrequency || "monthly",
      raw_data: {
        subscription_amount: finalAmount,
        subscriptionAmount: finalAmount,
        free_access: isFree,
        freeAccess: isFree,
        subscription_status: u.subscriptionStatus,
        active_plan: u.activePlan,
        billing_frequency: u.billingFrequency || "monthly",
      },
      updated_at: new Date().toISOString(),
    };

    let profSuccess = false;

    // 1. Direct Supabase user_profiles upsert/update (by ID or email)
    if (u.id) {
      const { data: updateData, error: updateErr } = await supabase
        .from("user_profiles")
        .update(profilePayload)
        .eq("id", u.id)
        .select();

      if (!updateErr && updateData && updateData.length > 0) {
        profSuccess = true;
      }
    }

    if (!profSuccess && u.email) {
      const { data: emailData, error: emailErr } = await supabase
        .from("user_profiles")
        .update(profilePayload)
        .ilike("email", u.email.trim())
        .select();

      if (!emailErr && emailData && emailData.length > 0) {
        profSuccess = true;
      }
    }

    if (!profSuccess) {
      // Upsert full row if record did not previously exist
      const upsertPayload: Record<string, any> = {
        ...profilePayload,
        email: (u.email || "").trim().toLowerCase(),
      };
      if (u.id) upsertPayload.id = u.id;
      const { error: upsertErr } = await supabase
        .from("user_profiles")
        .upsert(upsertPayload, { onConflict: "id" });
      if (!upsertErr) profSuccess = true;
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
        new_subscription_amount: finalAmount,
        new_free_access: isFree,
      });
      if (!rpcErr) profSuccess = true;
    } catch {}

    // 3. Update farms table
    if (u.farmName && u.id) {
      await supabase
        .from("farms")
        .update({
          name: u.farmName,
          city: u.city,
          state: u.state,
          country: u.country,
          updated_at: new Date().toISOString(),
        })
        .or(`user_id.eq.${u.id}`);
    }

    // 4. Update shared admin local cache and individual user profile local storage
    const normalizedUser: AdminUser = {
      ...u,
      subscriptionAmount: finalAmount,
      freeAccess: isFree,
      subscriptionStatus: computeSubscriptionStatus({ ...u, subscriptionAmount: finalAmount, freeAccess: isFree }),
    };

    const existing = loadAllAdminUsers();
    const idx = existing.findIndex(
      x => x.id === u.id || (x.email && x.email.toLowerCase() === (u.email || "").toLowerCase())
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...normalizedUser };
    } else {
      existing.unshift(normalizedUser);
    }
    saveAllAdminUsers(existing);

    // Sync scoped local profile storage if present on this device
    const scopedKeys = [
      u.id ? `pondtora_${u.id}_user_profile` : null,
      u.email ? `pondtora_${u.email.trim().toLowerCase()}_user_profile` : null,
    ].filter(Boolean) as string[];

    for (const localKey of scopedKeys) {
      try {
        const localProfRaw = localStorage.getItem(localKey);
        const parsed = localProfRaw ? JSON.parse(localProfRaw) : {};
        localStorage.setItem(
          localKey,
          JSON.stringify({
            ...parsed,
            id: u.id,
            name: u.name,
            email: u.email,
            farmName: u.farmName,
            phone: u.phone,
            city: u.city,
            state: u.state,
            country: u.country,
            role: u.role || "owner",
            subscriptionAmount: finalAmount,
            freeAccess: isFree,
            activePlan: u.activePlan,
            subscriptionStatus: normalizedUser.subscriptionStatus,
            billingFrequency: u.billingFrequency || "monthly",
            subscriptionStart: u.subscriptionStart,
            subscriptionExpiry: u.subscriptionExpiry,
          })
        );
      } catch {}
    }

    window.dispatchEvent(new CustomEvent("pondtora:user_profile_updated", { detail: normalizedUser }));
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

  const profileCustomAmount =
    typeof profile.subscriptionAmount === "number" && !isNaN(profile.subscriptionAmount)
      ? profile.subscriptionAmount
      : typeof (profile as any).subscriptionAmount === "string" && !isNaN(Number((profile as any).subscriptionAmount)) && (profile as any).subscriptionAmount.trim() !== ""
      ? Number((profile as any).subscriptionAmount)
      : typeof (profile as any).subscription_amount === "number" && !isNaN((profile as any).subscription_amount)
      ? (profile as any).subscription_amount
      : typeof (profile as any).subscription_amount === "string" && !isNaN(Number((profile as any).subscription_amount)) && (profile as any).subscription_amount.trim() !== ""
      ? Number((profile as any).subscription_amount)
      : null;

  const profileFreeAccess = Boolean(profile.freeAccess || (profile as any).free_access);

  let userObj: AdminUser;

  if (existingIdx >= 0) {
    const current = users[existingIdx];
    const hasPaid = Boolean(current.hasPaid || current.paystackReference || current.lastPaymentDate);
    const resolvedCustomAmount = profileCustomAmount !== null ? profileCustomAmount : (typeof current.subscriptionAmount === "number" ? current.subscriptionAmount : null);
    const resolvedFreeAccess = profileFreeAccess || Boolean(current.freeAccess);

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
      subscriptionAmount: resolvedCustomAmount,
      freeAccess: resolvedFreeAccess,
      hasPaid: hasPaid,
      trialStartDate: hasPaid ? null : (profile.trialStartDate || current.trialStartDate || new Date().toISOString().slice(0, 10)),
      farmCount: Math.max(farmCount || 1, current.farmCount || 1),
      subscriptionStart: hasPaid ? current.subscriptionStart : null,
      subscriptionExpiry: hasPaid ? current.subscriptionExpiry : null,
      referralCode: profile.referralCode || current.referralCode || (profile as any).referral_code,
      referredBy: profile.referredBy || current.referredBy || (profile as any).referred_by,
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
      subscriptionAmount: profileCustomAmount,
      hasPaid: false,
      subscriptionStatus: "Trial",
      subscriptionStart: null,
      subscriptionExpiry: null,
      accountStatus: "Active",
      freeAccess: profileFreeAccess,
      farmCount: farmCount || 1,
      pondCount: 0,
      staffCount: 0,
      referralCode: profile.referralCode || (profile as any).referral_code,
      referredBy: profile.referredBy || (profile as any).referred_by,
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
    const payload: Record<string, any> = {
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
      referred_by: userObj.referredBy || null,
      referral_code: userObj.referralCode || null,
      updated_at: new Date().toISOString(),
    };
    if (userObj.subscriptionAmount !== null && userObj.subscriptionAmount !== undefined) {
      payload.subscription_amount = userObj.subscriptionAmount;
    }
    if (userObj.freeAccess) {
      payload.free_access = true;
    }
    supabase.from("user_profiles").upsert(payload).then(() => {}).catch(() => {});
  }

  return userObj;
}

/**
 * Check if the active user has special admin overrides
 */
export function getUserAdminOverride(
  email: string | undefined | null,
  profile?: any
): {
  isSuspended: boolean;
  hasFreeAccess: boolean;
  customAmount: number | null;
  activePlan: string | null;
} {
  const fallback = { isSuspended: false, hasFreeAccess: false, customAmount: null, activePlan: null };

  const parseAmount = (val: any): number | null => {
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) return Number(val);
    return null;
  };

  // 1. Direct profile object inspection
  const directCustomAmount =
    parseAmount(profile?.subscriptionAmount) !== null
      ? parseAmount(profile?.subscriptionAmount)
      : parseAmount(profile?.subscription_amount) !== null
      ? parseAmount(profile?.subscription_amount)
      : parseAmount(profile?.raw_data?.subscription_amount) !== null
      ? parseAmount(profile?.raw_data?.subscription_amount)
      : null;

  const directFreeAccess = Boolean(profile?.freeAccess || profile?.free_access || profile?.raw_data?.free_access);
  const directSuspended = profile?.status === "Suspended" || profile?.accountStatus === "Suspended";
  const directPlan = profile?.activePlan || profile?.active_plan || null;

  if (!email || typeof email !== "string") {
    if (directCustomAmount !== null || directFreeAccess) {
      return {
        isSuspended: directSuspended,
        hasFreeAccess: directFreeAccess,
        customAmount: directCustomAmount,
        activePlan: directPlan,
      };
    }
    return fallback;
  }

  const cleanEmail = email.trim().toLowerCase();
  const users = loadAllAdminUsers();
  const u = users.find(
    x =>
      (x?.email || "").trim().toLowerCase() === cleanEmail ||
      (profile?.id && x?.id === profile.id)
  );

  const localCustomAmount = parseAmount(u?.subscriptionAmount);
  const finalCustomAmount = directCustomAmount !== null ? directCustomAmount : localCustomAmount;

  return {
    isSuspended: directSuspended || (u ? u.accountStatus === "Suspended" : false),
    hasFreeAccess: directFreeAccess || Boolean(u?.freeAccess),
    customAmount: finalCustomAmount,
    activePlan: directPlan || u?.activePlan || null,
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

  // Directly update Supabase user_profiles table for persistence
  supabase
    .from("user_profiles")
    .update({
      active_plan: params.planName,
      subscription_status: "Active",
      subscription_amount: params.amount,
      paystack_reference: params.reference,
      last_payment_date: todayStr,
      subscription_expiry: expiryStr,
      subscription_start: todayStr,
      trial_start_date: null,
      updated_at: new Date().toISOString(),
    })
    .or(`email.ilike.${cleanEmail},id.eq.${userObj.id}`)
    .then(() => {})
    .catch(console.warn);

  try {
    window.dispatchEvent(new CustomEvent("pondtora:payment_successful", { detail: { ...params, name: userObj.name } }));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated", { detail: users }));
  } catch {}

  logActivity(
    "Subscription Paid (Paystack)",
    "subscription",
    `${cleanEmail} paid ₦${(params.amount || 0).toLocaleString()} for ${params.planName} (${params.billingFrequency}) — Ref: ${params.reference}`,
    cleanEmail
  );

  return userObj;
}
