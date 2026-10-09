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

function getFallbackPlanPrice(planTarget: string, freq: BillingFrequency): number {
  const t = (planTarget || "starter").toLowerCase().trim();
  const list = (DEFAULT_PLANS && Array.isArray(DEFAULT_PLANS) && DEFAULT_PLANS.length > 0)
    ? DEFAULT_PLANS
    : [
        { name: "Starter", monthlyPrice: 3000, yearlyPrice: 28800 },
        { name: "Growth", monthlyPrice: 5000, yearlyPrice: 48000 },
        { name: "Commercial", monthlyPrice: 10000, yearlyPrice: 96000 },
        { name: "3-Farm Plan", monthlyPrice: 24000, yearlyPrice: 230400 },
        { name: "5-Farm Plan", monthlyPrice: 40000, yearlyPrice: 384000 },
        { name: "Unlimited Farms", monthlyPrice: 70000, yearlyPrice: 672000 },
      ];
  const matched = list.find(p => p.name.toLowerCase().trim() === t) || list[0];
  return freq === "yearly" ? matched.yearlyPrice : matched.monthlyPrice;
}

export function isValidPaystackRef(ref: any): boolean {
  if (!ref || typeof ref !== "string") return false;
  const cleaned = ref.trim();
  if (!cleaned) return false;
  const lower = cleaned.toLowerCase();
  // Live admin/system verified payment markers are explicitly valid
  if (lower === "live-confirmed" || lower === "live-payment") {
    return true;
  }
  if (
    lower === "verified offline/admin" ||
    lower === "offline" ||
    lower === "admin" ||
    lower === "test" ||
    lower === "null" ||
    lower === "undefined" ||
    lower === "none" ||
    lower === "mock" ||
    lower === "pending" ||
    lower === "unverified" ||
    lower === "manual" ||
    lower === "placeholder" ||
    lower.startsWith("test-") ||
    lower.startsWith("mock-")
  ) {
    return false;
  }
  return cleaned.length >= 6;
}

/**
 * Resolves a complete, accurate UserProfile from Supabase user_profiles and staff_members.
 * Self-heals missing user_profile rows from auth metadata if necessary.
 */
export async function resolveFullUserProfile(user: any): Promise<UserProfile> {
  if (!user) throw new Error("No user provided");
  const cleanEmail = (user.email || "").trim().toLowerCase();
  const userId = user.id;

  // 1. Query user_profiles table
  let dbProf: any = null;
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data) {
      dbProf = data;
    }
  } catch (err) {
    console.warn("Error querying user_profiles:", err);
  }

  // 2. Query staff_members table to check if this user is a staff account
  let staffRecord: any = null;
  try {
    const { data: staffRow, error: staffErr } = await supabase
      .from("staff_members")
      .select("id, name, role, permissions, farms, user_id, status")
      .or(`staff_auth_id.eq.${userId},email.ilike.${cleanEmail}`)
      .maybeSingle();
    if (!staffErr && staffRow) {
      staffRecord = staffRow;
      if (staffRow.id) {
        supabase
          .from("staff_members")
          .update({ staff_auth_id: userId, status: "Active" })
          .eq("id", staffRow.id)
          .then(() => {})
          .catch(() => {});
      }
    }
  } catch (err) {
    console.warn("Error querying staff_members:", err);
  }

  const meta = user.user_metadata ?? {};
  const isStaff = Boolean(staffRecord || meta.role === "staff" || meta.owner_id || dbProf?.role === "staff");

  // 3. Self-heal user_profile if missing
  if (!dbProf) {
    const defaultName = meta.name || staffRecord?.name || cleanEmail.split("@")[0] || "User";
    const defaultFarmName = meta.farm_name || "Primary Farm";
    const defaultRole = isStaff ? "staff" : (cleanEmail === "edafejesugarec@gmail.com" ? "admin" : "owner");

    try {
      const { data: healed } = await supabase
        .from("user_profiles")
        .upsert({
          id: userId,
          name: defaultName,
          farm_name: defaultFarmName,
          city: meta.city || "Lagos",
          state: meta.state || "Lagos",
          country: meta.country || "Nigeria",
          email: cleanEmail,
          phone: meta.phone || "",
          currency_symbol: meta.currency_symbol || "₦",
          currency_code: meta.currency_code || "NGN",
          active_plan: meta.active_plan || "Starter",
          trial_start_date: meta.trial_start_date || new Date().toISOString(),
          role: defaultRole,
          status: "Active",
          referred_by: meta.referred_by || meta.referredBy || null,
          referral_code: meta.referral_code || meta.referralCode || null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();
      if (healed) dbProf = healed;
    } catch (healErr) {
      console.warn("Self-heal error:", healErr);
    }

    if (!isStaff) {
      try {
        const { data: existingFarms } = await supabase.from("farms").select("id").eq("user_id", userId).limit(1);
        if (!existingFarms || existingFarms.length === 0) {
          await supabase.from("farms").insert({
            user_id: userId,
            name: defaultFarmName,
            city: meta.city || "Lagos",
            state: meta.state || "Lagos",
            country: meta.country || "Nigeria",
          });
        }
      } catch (farmErr) {
        console.warn("Farm creation error:", farmErr);
      }
    }
  }

  const staffPerms: string[] = staffRecord?.permissions || meta.permissions || [];
  const staffOwnerId: string = staffRecord?.user_id || meta.owner_id || "";
  const staffRole: string = staffRecord?.role || meta.role || dbProf?.role || (isStaff ? "staff" : "owner");
  const staffFarms: string[] = staffRecord?.farms || meta.farms || [];

  const profile: UserProfile = {
    id: userId,
    name: dbProf?.name || meta.name || staffRecord?.name || cleanEmail.split("@")[0] || "User",
    farmName: dbProf?.farm_name || meta.farm_name || "",
    city: dbProf?.city || meta.city || "",
    state: dbProf?.state || meta.state || "",
    country: dbProf?.country || meta.country || "Nigeria",
    email: cleanEmail,
    phone: dbProf?.phone || meta.phone || "",
    currencySymbol: dbProf?.currency_symbol || meta.currency_symbol || "₦",
    currencyCode: dbProf?.currency_code || meta.currency_code || "NGN",
    activePlan: dbProf?.active_plan || meta.active_plan || "Starter",
    trialStartDate: dbProf?.trial_start_date || meta.trial_start_date,
    role: staffRole,
    permissions: staffPerms,
    ownerId: staffOwnerId,
    farms: staffFarms,
    referralCode: dbProf?.referral_code || meta.referral_code || meta.referralCode,
    referredBy: dbProf?.referred_by || meta.referred_by || meta.referredBy,
    status: dbProf?.status || "Active",
    freeAccess: dbProf?.free_access || meta.free_access,
    paystackReference: dbProf?.paystack_reference,
    subscriptionAmount: dbProf?.subscription_amount,
    subscriptionExpiry: dbProf?.subscription_expiry,
    subscriptionStart: dbProf?.subscription_start,
    billingFrequency: dbProf?.billing_frequency || meta.plan_billing || "monthly",
  };

  return profile;
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

  // Fetch global admin user overrides from platform_settings
  let globalOverrides: Record<string, any> = {};
  try {
    const { data: setRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_user_overrides")
      .maybeSingle();
    if (setRow?.value && typeof setRow.value === "object") {
      globalOverrides = setRow.value;
    }
  } catch {}

  // Helper to parse numeric subscription amount
  const parseAmount = (val: any): number | null => {
    if (typeof val === "number" && !isNaN(val) && val > 0) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
    return null;
  };

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
        const override = globalOverrides[pEmail] || (p.id ? globalOverrides[p.id] : null);

        const hasValidRef = isValidPaystackRef(p.paystack_reference) || isValidPaystackRef(override?.paystackReference);
        const isFree = Boolean(p.free_access || override?.freeAccess);
        const hasPaid = Boolean(!isFree && hasValidRef);

        const roleStr = (p.role || override?.role || local?.role || "owner").toLowerCase().trim();
        const activePlan = override?.activePlan || p.active_plan || local?.activePlan || "Starter";
        const billingFreq = (override?.billingFrequency || p.billing_frequency || local?.billingFrequency || "monthly") as BillingFrequency;

        let subAmount = hasPaid ? (parseAmount(override?.subscriptionAmount) ??
          parseAmount(p.subscription_amount) ??
          parseAmount(p.raw_data?.subscription_amount) ??
          parseAmount(local?.subscriptionAmount)) : null;

        // If user is paid but amount not explicitly in DB, resolve from plan price
        if (hasPaid && (!subAmount || subAmount <= 0)) {
          const planTarget = activePlan.toLowerCase().trim();
          subAmount = getFallbackPlanPrice(planTarget, billingFreq);
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        const subStart = p.subscription_start ? String(p.subscription_start).slice(0, 10) :
          (override?.subscriptionStart || local?.subscriptionStart || (hasPaid ? (p.last_payment_date || String(p.created_at || "").slice(0, 10) || todayStr) : null));

        let subExpiry = p.subscription_expiry ? String(p.subscription_expiry).slice(0, 10) :
          (override?.subscriptionExpiry || local?.subscriptionExpiry || null);

        if (hasPaid && !subExpiry && subStart) {
          const d = new Date(subStart);
          if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + (billingFreq === "yearly" ? 365 : 30));
            subExpiry = d.toISOString().slice(0, 10);
          }
        }

        const u: AdminUser = {
          id: p.id,
          name: p.name || override?.name || (p.email ? p.email.split("@")[0] : "Farmer"),
          email: p.email || "",
          farmName: p.farm_name || override?.farmName || local?.farmName || "Primary Farm",
          phone: p.phone || override?.phone || local?.phone || "",
          city: p.city || local?.city || "Lagos",
          state: p.state || local?.state || "Lagos",
          country: p.country || local?.country || "Nigeria",
          role: roleStr,
          activePlan: activePlan,
          trialStartDate: hasPaid ? null : (p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : (local?.trialStartDate || (p.created_at ? String(p.created_at).slice(0, 10) : todayStr))),
          billingFrequency: billingFreq,
          subscriptionAmount: subAmount,
          hasPaid: hasPaid,
          subscriptionStatus: "Trial",
          subscriptionStart: subStart,
          subscriptionExpiry: subExpiry,
          accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
          freeAccess: Boolean(p.free_access || p.raw_data?.free_access || override?.freeAccess || local?.freeAccess),
          farmCount: Number(p.farm_count) > 0 ? Number(p.farm_count) : (local?.farmCount || 1),
          pondCount: Number(p.pond_count) || local?.pondCount || 0,
          staffCount: Number(p.staff_count) || local?.staffCount || 0,
          paystackReference: local?.paystackReference || p.paystack_reference || override?.paystackReference,
          lastPaymentDate: local?.lastPaymentDate || p.last_payment_date || override?.lastPaymentDate,
          referralCode: p.referral_code || p.referralCode || local?.referralCode,
          referredBy: p.referred_by || p.referredBy || local?.referredBy || (p.raw_user_meta_data?.referred_by),
          createdAt: p.created_at ? String(p.created_at).slice(0, 10) : (local?.createdAt || todayStr),
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
          const override = globalOverrides[pEmail] || (p.id ? globalOverrides[p.id] : null);

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

          const hasValidRef = isValidPaystackRef(p.paystack_reference) || isValidPaystackRef(override?.paystackReference);
          const isFree = Boolean(p.free_access || p.raw_data?.free_access || override?.freeAccess || local?.freeAccess);
          const hasPaid = Boolean(!isFree && hasValidRef);

          const activePlan = override?.activePlan || p.active_plan || local?.activePlan || "Starter";
          const billingFreq = (override?.billingFrequency || p.billing_frequency || local?.billingFrequency || "monthly") as BillingFrequency;

          let subAmount = hasPaid ? (parseAmount(override?.subscriptionAmount) ??
            parseAmount(p.subscription_amount) ??
            parseAmount(p.raw_data?.subscription_amount) ??
            parseAmount(local?.subscriptionAmount)) : null;

          if (hasPaid && (!subAmount || subAmount <= 0)) {
            const planTarget = activePlan.toLowerCase().trim();
            subAmount = getFallbackPlanPrice(planTarget, billingFreq);
          }

          const todayStr = new Date().toISOString().slice(0, 10);
          const subStart = p.subscription_start ? String(p.subscription_start).slice(0, 10) :
            (override?.subscriptionStart || local?.subscriptionStart || (hasPaid ? (p.last_payment_date || String(p.created_at || "").slice(0, 10) || todayStr) : null));

          let subExpiry = p.subscription_expiry ? String(p.subscription_expiry).slice(0, 10) :
            (override?.subscriptionExpiry || local?.subscriptionExpiry || null);

          if (hasPaid && !subExpiry && subStart) {
            const d = new Date(subStart);
            if (!isNaN(d.getTime())) {
              d.setDate(d.getDate() + (billingFreq === "yearly" ? 365 : 30));
              subExpiry = d.toISOString().slice(0, 10);
            }
          }

          const u: AdminUser = {
            id: p.id,
            name: p.name || override?.name || (p.email ? p.email.split("@")[0] : "Farmer"),
            email: p.email || "",
            farmName: farmName,
            phone: p.phone || override?.phone || local?.phone || "",
            city: p.city || local?.city || "Lagos",
            state: p.state || local?.state || "Lagos",
            country: p.country || local?.country || "Nigeria",
            role: pRole,
            activePlan: activePlan,
            trialStartDate: hasPaid ? null : (p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : (local?.trialStartDate || (p.created_at ? String(p.created_at).slice(0, 10) : todayStr))),
            billingFrequency: billingFreq,
            subscriptionAmount: subAmount,
            hasPaid: hasPaid,
            subscriptionStatus: "Trial",
            subscriptionStart: subStart,
            subscriptionExpiry: subExpiry,
            accountStatus: (p.status === "Suspended" || local?.accountStatus === "Suspended") ? "Suspended" : "Active",
            freeAccess: Boolean(p.free_access || p.raw_data?.free_access || override?.freeAccess || local?.freeAccess),
            farmCount: farmCount,
            pondCount: pondCount,
            staffCount: staffCount,
            invoicesCount: invoicesCount,
            totalFishStocked: userPonds.reduce((s: number, pd: any) => s + (Number(pd.current_count ?? pd.initial_stock) || 0), 0),
            paystackReference: local?.paystackReference || p.paystack_reference || override?.paystackReference,
            lastPaymentDate: local?.lastPaymentDate || p.last_payment_date || override?.lastPaymentDate,
            referralCode: p.referral_code || p.referralCode || local?.referralCode,
            referredBy: p.referred_by || p.referredBy || local?.referredBy || (p.raw_user_meta_data?.referred_by),
            createdAt: p.created_at ? String(p.created_at).slice(0, 10) : (local?.createdAt || todayStr),
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

  // Fetch remote overrides and remote referral registry from platform_settings
  let remoteOverrides: Record<string, any> = {};
  let remoteReferrals: any[] = [];
  try {
    const [overrideRes, refDataRes] = await Promise.all([
      supabase.from("platform_settings").select("value").eq("key", "admin_user_overrides").maybeSingle(),
      supabase.from("platform_settings").select("value").eq("key", "referral_registry").maybeSingle(),
    ]);

    if (overrideRes.data?.value && typeof overrideRes.data.value === "object") {
      remoteOverrides = overrideRes.data.value;
      try {
        localStorage.setItem("pondtora_admin_user_overrides", JSON.stringify(remoteOverrides));
      } catch {}
    }

    if (refDataRes.data?.value && Array.isArray(refDataRes.data.value)) {
      remoteReferrals = refDataRes.data.value;
    }
  } catch {}

  if (dbUsers.length > 0 || remoteReferrals.length > 0 || existingLocal.length > 0) {
    const userMap = new Map<string, AdminUser>();

    // Start with existing cached users (strictly farm owners!)
    existingLocal.filter(u => !isStaffUser(u)).forEach(u => {
      if (u && (u.id || u.email)) {
        userMap.set((u.email || u.id).toLowerCase(), u);
      }
    });

    // Merge in remote referrals from platform_settings
    remoteReferrals.forEach((ref: any) => {
      if (ref && (ref.id || ref.email)) {
        const key = (ref.email || ref.id).toLowerCase();
        const existing = userMap.get(key) || (ref.id ? userMap.get(ref.id.toLowerCase()) : null);
        const refPayRef = (ref.paystackReference || existing?.paystackReference || "").trim();
        const isFree = Boolean(ref.freeAccess || existing?.freeAccess);
        const hasPaid = Boolean(!isFree && refPayRef !== "");
        const merged: AdminUser = {
          id: ref.id || existing?.id || "usr-" + Math.random().toString(36).slice(2, 8),
          name: ref.name || existing?.name || (ref.email ? ref.email.split("@")[0] : "Farmer"),
          email: ref.email || existing?.email || "",
          farmName: ref.farmName || existing?.farmName || "Primary Farm",
          phone: existing?.phone || "",
          city: existing?.city || "Lagos",
          state: existing?.state || "Lagos",
          country: existing?.country || "Nigeria",
          role: existing?.role || "owner",
          activePlan: ref.activePlan || existing?.activePlan || "Starter",
          trialStartDate: hasPaid ? null : (ref.trialStartDate || existing?.trialStartDate || new Date().toISOString().slice(0, 10)),
          billingFrequency: ref.billingFrequency || existing?.billingFrequency || "monthly",
          subscriptionAmount: hasPaid ? (ref.paymentAmount || existing?.subscriptionAmount || null) : null,
          hasPaid: hasPaid,
          subscriptionStatus: hasPaid ? "Active" : (isFree ? "Active" : "Trial"),
          subscriptionStart: hasPaid ? (existing?.subscriptionStart || null) : null,
          subscriptionExpiry: hasPaid ? (existing?.subscriptionExpiry || null) : null,
          accountStatus: "Active",
          freeAccess: isFree,
          farmCount: existing?.farmCount || 1,
          pondCount: existing?.pondCount || 0,
          staffCount: existing?.staffCount || 0,
          paystackReference: hasPaid ? refPayRef : null,
          lastPaymentDate: hasPaid ? (existing?.lastPaymentDate || null) : null,
          referralCode: existing?.referralCode,
          referredBy: ref.referrerCode || existing?.referredBy,
          createdAt: ref.createdAt || existing?.createdAt || new Date().toISOString().slice(0, 10),
        };
        merged.subscriptionStatus = computeSubscriptionStatus(merged);
        userMap.set(key, merged);
      }
    });

    // Merge in newly fetched db users (updating or inserting)
    dbUsers.filter(u => !isStaffUser(u)).forEach(u => {
      if (u && (u.id || u.email)) {
        const key = (u.email || u.id).toLowerCase();
        const existing = userMap.get(key) || userMap.get(u.id.toLowerCase());
        const merged: AdminUser = {
          ...existing,
          ...u,
        };

        // Apply remote overrides if present
        const override = remoteOverrides[key] || (u.id ? remoteOverrides[u.id.toLowerCase()] : null);
        if (override) {
          if (override.subscriptionAmount !== undefined) merged.subscriptionAmount = override.subscriptionAmount;
          if (override.freeAccess !== undefined) merged.freeAccess = override.freeAccess;
          if (override.activePlan) merged.activePlan = override.activePlan;
          if (override.billingFrequency) merged.billingFrequency = override.billingFrequency;
        }

        merged.subscriptionStatus = computeSubscriptionStatus(merged);
        userMap.set(key, merged);
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
  let debounceTimer: any = null;
  const debouncedUpdate = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      onUpdate();
    }, 1200);
  };

  let channel: any = null;
  try {
    channel = supabase.channel("pondtora_admin_realtime_" + Math.random().toString(36).slice(2, 8))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "farms" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponds" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_members" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoices" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, debouncedUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_settings" }, debouncedUpdate)
      .subscribe();
  } catch (e) {
    console.warn("Supabase realtime subscription:", e);
  }

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (channel) {
      try { supabase.removeChannel(channel); } catch {}
    }
  };
}

/**
 * Persists an admin user modification to Supabase user_profiles, farms, and staff_members
 */
/**
 * Fetch remote user overrides from Supabase platform_settings
 */
export async function fetchRemoteUserOverrides(): Promise<Record<string, any>> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_user_overrides")
      .maybeSingle();

    if (!error && data?.value && typeof data.value === "object") {
      const overrides = data.value;
      try {
        localStorage.setItem("pondtora_admin_user_overrides", JSON.stringify(overrides));
      } catch {}
      return overrides;
    }
  } catch (err) {
    console.warn("fetchRemoteUserOverrides error:", err);
  }
  try {
    const raw = localStorage.getItem("pondtora_admin_user_overrides");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Background initial fetch
if (typeof window !== "undefined") {
  fetchRemoteUserOverrides().catch(() => {});
}

/**
 * Updates a user in the database, platform_settings overrides, and local caches
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
    const cleanEmail = (u.email || "").trim().toLowerCase();
    const isTargetUuid = Boolean(u.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u.id.trim()));

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

    // 1. Direct Supabase user_profiles update (by UUID ID if valid, or by email)
    if (isTargetUuid) {
      try {
        const { data: updateData, error: updateErr } = await supabase
          .from("user_profiles")
          .update(profilePayload)
          .eq("id", u.id)
          .select();

        if (!updateErr && updateData && updateData.length > 0) {
          profSuccess = true;
        }
      } catch {}
    }

    if (cleanEmail) {
      try {
        const { data: emailData, error: emailErr } = await supabase
          .from("user_profiles")
          .update(profilePayload)
          .ilike("email", cleanEmail)
          .select();

        if (!emailErr && emailData && emailData.length > 0) {
          profSuccess = true;
        }
      } catch {}
    }

    if (!profSuccess && isTargetUuid) {
      // Upsert full row if record did not previously exist
      const upsertPayload: Record<string, any> = {
        ...profilePayload,
        id: u.id,
        email: cleanEmail,
      };
      try {
        const { data: upsertData, error: upsertErr } = await supabase
          .from("user_profiles")
          .upsert(upsertPayload, { onConflict: "id" })
          .select();
        if (!upsertErr && upsertData && upsertData.length > 0) {
          profSuccess = true;
        }
      } catch (upsertCatch) {
        console.warn("user_profiles upsert note:", upsertCatch);
      }
    }

    // 2. Persist override directly to Supabase platform_settings (admin_user_overrides)
    try {
      const { data: existingSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_user_overrides")
        .maybeSingle();

      const currentOverrides = (existingSetting?.value && typeof existingSetting.value === "object") ? existingSetting.value : {};
      
      const overrideRecord = {
        userId: u.id,
        email: cleanEmail,
        name: u.name,
        farmName: u.farmName,
        subscriptionAmount: finalAmount,
        freeAccess: isFree,
        activePlan: u.activePlan,
        billingFrequency: u.billingFrequency || "monthly",
        subscriptionStatus: u.subscriptionStatus,
        subscriptionExpiry: u.subscriptionExpiry || null,
        subscriptionStart: u.subscriptionStart || null,
        paystackReference: u.paystackReference || null,
        lastPaymentDate: u.lastPaymentDate || null,
        updatedAt: new Date().toISOString(),
      };

      if (cleanEmail) {
        currentOverrides[cleanEmail] = overrideRecord;
      }
      if (u.id) {
        currentOverrides[u.id.toLowerCase()] = overrideRecord;
      }

      try {
        localStorage.setItem("pondtora_admin_user_overrides", JSON.stringify(currentOverrides));
      } catch {}

      await supabase
        .from("platform_settings")
        .upsert({
          key: "admin_user_overrides",
          value: currentOverrides,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
    } catch (overrideErr) {
      console.warn("Could not persist admin_user_overrides to platform_settings:", overrideErr);
    }

    // 3. Try RPC admin_update_user_profile (SECURITY DEFINER)
    try {
      const { error: rpcErr } = await supabase.rpc("admin_update_user_profile", {
        target_user_id: isTargetUuid ? u.id : null,
        target_email: cleanEmail || null,
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
        new_billing_frequency: u.billingFrequency || "monthly",
        new_subscription_start: u.subscriptionStart || null,
        new_subscription_expiry: u.subscriptionExpiry || null,
        new_paystack_reference: u.paystackReference || null,
        new_last_payment_date: u.lastPaymentDate || null,
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
    const resolvedFreeAccess = profileFreeAccess || Boolean(current.freeAccess);
    const hasPaid = Boolean(
      !resolvedFreeAccess &&
      (isValidPaystackRef(profile.paystackReference) ||
       isValidPaystackRef((profile as any).paystack_reference) ||
       isValidPaystackRef(current.paystackReference))
    );

    let resolvedCustomAmount = profileCustomAmount !== null ? profileCustomAmount : (typeof current.subscriptionAmount === "number" ? current.subscriptionAmount : null);
    const resolvedPlan = activePlan || profile.activePlan || current.activePlan || "Starter";
    const resolvedFreq = (profile.billingFrequency || (profile as any).billing_frequency || current.billingFrequency || "monthly") as BillingFrequency;

    if (hasPaid && (!resolvedCustomAmount || resolvedCustomAmount <= 0) && !resolvedFreeAccess) {
      const planTarget = resolvedPlan.toLowerCase().trim();
      resolvedCustomAmount = getFallbackPlanPrice(planTarget, resolvedFreq);
    }

    const subStart = hasPaid ? (profile.subscriptionStart || (profile as any).subscription_start || current.subscriptionStart || new Date().toISOString().slice(0, 10)) : null;
    let subExpiry = hasPaid ? (profile.subscriptionExpiry || (profile as any).subscription_expiry || current.subscriptionExpiry || null) : null;
    if (hasPaid && !subExpiry && subStart) {
      const d = new Date(subStart);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (resolvedFreq === "yearly" ? 365 : 30));
        subExpiry = d.toISOString().slice(0, 10);
      }
    }

    userObj = {
      ...current,
      name: profile.name || current.name || targetEmail.split("@")[0],
      farmName: profile.farmName || current.farmName || "Primary Farm",
      phone: profile.phone || current.phone || "",
      city: profile.city || current.city || "Lagos",
      state: profile.state || current.state || "Lagos",
      country: profile.country || current.country || "Nigeria",
      role: profile.role || current.role || "owner",
      activePlan: resolvedPlan,
      billingFrequency: resolvedFreq,
      subscriptionAmount: resolvedCustomAmount,
      freeAccess: resolvedFreeAccess,
      hasPaid: hasPaid,
      trialStartDate: hasPaid ? null : (profile.trialStartDate || current.trialStartDate || new Date().toISOString().slice(0, 10)),
      farmCount: Math.max(farmCount || 1, current.farmCount || 1),
      subscriptionStart: subStart,
      subscriptionExpiry: subExpiry,
      paystackReference: current.paystackReference || profile.paystackReference || (profile as any).paystack_reference,
      lastPaymentDate: current.lastPaymentDate || profile.lastPaymentDate || (profile as any).last_payment_date,
      referralCode: profile.referralCode || current.referralCode || (profile as any).referral_code,
      referredBy: profile.referredBy || current.referredBy || (profile as any).referred_by,
    };
    userObj.subscriptionStatus = computeSubscriptionStatus(userObj);
    users[existingIdx] = userObj;
  } else {
    const hasPaid = Boolean(
      !profileFreeAccess &&
      (isValidPaystackRef(profile.paystackReference) ||
       isValidPaystackRef((profile as any).paystack_reference))
    );

    const resolvedPlan = activePlan || profile.activePlan || "Starter";
    const resolvedFreq = (profile.billingFrequency || (profile as any).billing_frequency || "monthly") as BillingFrequency;
    let resolvedAmount = profileCustomAmount;

    if (hasPaid && (!resolvedAmount || resolvedAmount <= 0) && !profileFreeAccess) {
      const planTarget = resolvedPlan.toLowerCase().trim();
      resolvedAmount = getFallbackPlanPrice(planTarget, resolvedFreq);
    }

    const subStart = hasPaid ? (profile.subscriptionStart || (profile as any).subscription_start || new Date().toISOString().slice(0, 10)) : null;
    let subExpiry = hasPaid ? (profile.subscriptionExpiry || (profile as any).subscription_expiry || null) : null;
    if (hasPaid && !subExpiry && subStart) {
      const d = new Date(subStart);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + (resolvedFreq === "yearly" ? 365 : 30));
        subExpiry = d.toISOString().slice(0, 10);
      }
    }

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
      activePlan: resolvedPlan,
      trialStartDate: hasPaid ? null : (profile.trialStartDate || new Date().toISOString().slice(0, 10)),
      billingFrequency: resolvedFreq,
      subscriptionAmount: resolvedAmount,
      hasPaid: hasPaid,
      subscriptionStatus: "Trial",
      subscriptionStart: subStart,
      subscriptionExpiry: subExpiry,
      accountStatus: "Active",
      freeAccess: profileFreeAccess,
      farmCount: farmCount || 1,
      pondCount: 0,
      staffCount: 0,
      paystackReference: profile.paystackReference || (profile as any).paystack_reference,
      lastPaymentDate: profile.lastPaymentDate || (profile as any).last_payment_date,
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
  billingFrequency: BillingFrequency;
  subscriptionStart: string | null;
  subscriptionExpiry: string | null;
  hasPaid: boolean;
  subscriptionStatus: string;
} {
  const parseAmount = (val: any): number | null => {
    if (typeof val === "number" && !isNaN(val) && val > 0) return val;
    if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
    return null;
  };

  const cleanEmail = (email || profile?.email || "").trim().toLowerCase();
  const profileId = (profile?.id || "").trim().toLowerCase();

  // 1. Check platform_settings stored overrides in localStorage first (Top Authority from Admin Control Center)
  let hasOverrideEntry = false;
  let overrideFreeAccess: boolean | undefined = undefined;
  let overrideAmount: number | null | undefined = undefined;
  let overridePlan: string | null | undefined = undefined;
  let overrideFreq: BillingFrequency | null | undefined = undefined;
  let overrideSuspended: boolean | undefined = undefined;

  try {
    const rawOverrides = localStorage.getItem("pondtora_admin_user_overrides");
    if (rawOverrides) {
      const parsed = JSON.parse(rawOverrides);
      const entry = (cleanEmail ? parsed[cleanEmail] : null) || (profileId ? parsed[profileId] : null);
      if (entry && typeof entry === "object") {
        hasOverrideEntry = true;
        if (entry.freeAccess !== undefined) {
          overrideFreeAccess = Boolean(entry.freeAccess);
        }
        if (entry.subscriptionAmount !== undefined) {
          overrideAmount = parseAmount(entry.subscriptionAmount);
        }
        if (entry.activePlan !== undefined) {
          overridePlan = entry.activePlan || null;
        }
        if (entry.billingFrequency !== undefined) {
          overrideFreq = entry.billingFrequency;
        }
        if (entry.accountStatus !== undefined || entry.status !== undefined) {
          overrideSuspended = entry.accountStatus === "Suspended" || entry.status === "Suspended";
        }
      }
    }
  } catch {}

  // 2. Direct profile properties
  const directCustomAmount =
    parseAmount(profile?.subscriptionAmount) !== null
      ? parseAmount(profile?.subscriptionAmount)
      : parseAmount(profile?.subscription_amount) !== null
      ? parseAmount(profile?.subscription_amount)
      : parseAmount(profile?.raw_data?.subscription_amount) !== null
      ? parseAmount(profile?.raw_data?.subscription_amount)
      : parseAmount(profile?.raw_data?.subscriptionAmount) !== null
      ? parseAmount(profile?.raw_data?.subscriptionAmount)
      : parseAmount(profile?.customAmount) !== null
      ? parseAmount(profile?.customAmount)
      : null;

  const directFreeAccess =
    profile?.freeAccess !== undefined
      ? Boolean(profile.freeAccess)
      : profile?.free_access !== undefined
      ? Boolean(profile.free_access)
      : profile?.raw_data?.free_access !== undefined
      ? Boolean(profile.raw_data.free_access)
      : profile?.raw_data?.freeAccess !== undefined
      ? Boolean(profile.raw_data.freeAccess)
      : undefined;

  const directSuspended = profile?.status === "Suspended" || profile?.accountStatus === "Suspended";
  const directPlan = profile?.activePlan || profile?.active_plan || profile?.raw_data?.active_plan || null;
  const directFreq: BillingFrequency = profile?.billingFrequency || profile?.billing_frequency || "monthly";

  // 3. Admin user cache
  let adminCachedUser: AdminUser | undefined;
  try {
    const allUsers = loadAllAdminUsers();
    adminCachedUser = allUsers.find(
      u => (cleanEmail && (u.email || "").trim().toLowerCase() === cleanEmail) ||
           (profileId && (u.id || "").trim().toLowerCase() === profileId)
    );
  } catch {}

  // 4. Local scoped storage
  let localScopedAmount: number | null = null;
  let localScopedPlan: string | null = null;
  if (cleanEmail || profileId) {
    try {
      const scopedKey = cleanEmail ? `pondtora_${cleanEmail}_user_profile` : (profileId ? `pondtora_${profileId}_user_profile` : "");
      if (scopedKey) {
        const raw = localStorage.getItem(scopedKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          localScopedAmount = parseAmount(parsed.subscriptionAmount) || parseAmount(parsed.subscription_amount);
          localScopedPlan = parsed.activePlan || parsed.active_plan;
        }
      }
    } catch {}
  }

  // Master admin email always has free access
  const isMasterAdmin = cleanEmail === "edafejesugarec@gmail.com";

  // Resolve Free Access
  let finalFreeAccess = false;
  if (isMasterAdmin) {
    finalFreeAccess = true;
  } else if (overrideFreeAccess !== undefined) {
    finalFreeAccess = overrideFreeAccess;
  } else if (directFreeAccess !== undefined) {
    finalFreeAccess = directFreeAccess;
  } else if (adminCachedUser?.freeAccess !== undefined) {
    finalFreeAccess = Boolean(adminCachedUser.freeAccess);
  }

  // Resolve Custom Pricing
  let finalCustomAmount: number | null = null;
  if (finalFreeAccess) {
    // Free VIP accounts do not require custom payment
    finalCustomAmount = null;
  } else if (overrideAmount !== undefined) {
    finalCustomAmount = overrideAmount;
  } else if (directCustomAmount !== null) {
    finalCustomAmount = directCustomAmount;
  } else if (parseAmount(adminCachedUser?.subscriptionAmount) !== null) {
    finalCustomAmount = parseAmount(adminCachedUser?.subscriptionAmount);
  } else if (localScopedAmount !== null) {
    finalCustomAmount = localScopedAmount;
  }

  // Resolve Suspended
  const finalSuspended =
    overrideSuspended !== undefined
      ? overrideSuspended
      : (directSuspended || adminCachedUser?.accountStatus === "Suspended");

  // Resolve Plan & Frequency
  const finalPlan =
    overridePlan !== undefined
      ? overridePlan
      : (directPlan || adminCachedUser?.activePlan || localScopedPlan || null);

  const finalFreq: BillingFrequency =
    overrideFreq !== undefined
      ? overrideFreq
      : (directFreq || adminCachedUser?.billingFrequency || "monthly");

  return {
    isSuspended: finalSuspended,
    hasFreeAccess: finalFreeAccess,
    customAmount: finalCustomAmount,
    activePlan: finalPlan,
    billingFrequency: finalFreq,
    subscriptionStart: profile?.subscriptionStart || profile?.subscription_start || adminCachedUser?.subscriptionStart || null,
    subscriptionExpiry: profile?.subscriptionExpiry || profile?.subscription_expiry || adminCachedUser?.subscriptionExpiry || null,
    hasPaid: Boolean(
      profile?.hasPaid ||
      isValidPaystackRef((profile as any)?.paystack_reference) ||
      isValidPaystackRef((profile as any)?.paystackReference) ||
      adminCachedUser?.hasPaid ||
      isValidPaystackRef(adminCachedUser?.paystackReference)
    ),
    subscriptionStatus: adminCachedUser?.subscriptionStatus || profile?.subscriptionStatus || profile?.subscription_status || "Trial",
  };
}

export interface FarmSubscriptionDetails {
  status: "Active" | "Trial" | "Expired" | "Suspended";
  isExpired: boolean;
  isTrial: boolean;
  isPaidActive: boolean;
  hasFreeAccess: boolean;
  trialDaysLeft: number;
  expiryDate: string | null;
  formattedExpiryDate: string | null;
  activePlan: string;
  isStaff: boolean;
  ownerName?: string;
  ownerEmail?: string;
}

/**
 * Computes the unified, farm-based subscription details for either an Admin/Owner or Staff member.
 * If the user is staff, subscription status is strictly governed by the farm owner's account.
 */
export function getFarmSubscriptionDetails(
  userProfile?: UserProfile | Partial<AdminUser> | null,
  allUsers?: AdminUser[]
): FarmSubscriptionDetails {
  const users = allUsers && allUsers.length > 0 ? allUsers : loadAllAdminUsers();

  const isStaff = Boolean(
    (userProfile as any)?.role === "staff" ||
    ((userProfile as any)?.ownerId && (userProfile as any)?.ownerId !== userProfile?.id)
  );

  let targetUser: any = userProfile;
  if (isStaff && (userProfile as any)?.ownerId) {
    const ownerId = (userProfile as any).ownerId;
    const foundOwner = users.find(
      u => (u?.id && u.id === ownerId) ||
           (u?.email && (userProfile as any).ownerEmail && u.email.toLowerCase() === (userProfile as any).ownerEmail.toLowerCase())
    );
    if (foundOwner) {
      targetUser = foundOwner;
    } else {
      try {
        const raw = localStorage.getItem(`pondtora_${ownerId}_user_profile`);
        if (raw) targetUser = JSON.parse(raw);
      } catch {}
    }
  }

  const email = targetUser?.email || "";
  const override = getUserAdminOverride(email, targetUser);

  if (override.hasFreeAccess) {
    return {
      status: "Active",
      isExpired: false,
      isTrial: false,
      isPaidActive: true,
      hasFreeAccess: true,
      trialDaysLeft: 999,
      expiryDate: null,
      formattedExpiryDate: "Lifetime Access",
      activePlan: override.activePlan || targetUser?.activePlan || "Commercial",
      isStaff,
      ownerName: targetUser?.name,
      ownerEmail: targetUser?.email,
    };
  }

  if (override.isSuspended) {
    return {
      status: "Suspended",
      isExpired: true,
      isTrial: false,
      isPaidActive: false,
      hasFreeAccess: false,
      trialDaysLeft: 0,
      expiryDate: null,
      formattedExpiryDate: "Account Suspended",
      activePlan: override.activePlan || targetUser?.activePlan || "Starter",
      isStaff,
      ownerName: targetUser?.name,
      ownerEmail: targetUser?.email,
    };
  }

  // Real payment check: has the owner/user completed payment with valid reference
  const hasPaid = Boolean(
    override.hasPaid ||
    targetUser?.hasPaid ||
    isValidPaystackRef(targetUser?.paystackReference) ||
    isValidPaystackRef(targetUser?.paystack_reference)
  );

  const expiryRaw =
    targetUser?.subscriptionExpiry ||
    targetUser?.subscription_expiry ||
    override.subscriptionExpiry ||
    null;

  if (hasPaid) {
    if (expiryRaw) {
      try {
        const exp = new Date(expiryRaw);
        if (!isNaN(exp.getTime())) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expDay = new Date(exp);
          expDay.setHours(23, 59, 59, 999);

          const isExp = expDay.getTime() < today.getTime();
          const formatted = exp.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

          return {
            status: isExp ? "Expired" : "Active",
            isExpired: isExp,
            isTrial: false,
            isPaidActive: !isExp,
            hasFreeAccess: false,
            trialDaysLeft: 0,
            expiryDate: expiryRaw,
            formattedExpiryDate: formatted,
            activePlan: override.activePlan || targetUser?.activePlan || "Starter",
            isStaff,
            ownerName: targetUser?.name,
            ownerEmail: targetUser?.email,
          };
        }
      } catch {}
    }

    return {
      status: "Active",
      isExpired: false,
      isTrial: false,
      isPaidActive: true,
      hasFreeAccess: false,
      trialDaysLeft: 0,
      expiryDate: null,
      formattedExpiryDate: null,
      activePlan: override.activePlan || targetUser?.activePlan || "Starter",
      isStaff,
      ownerName: targetUser?.name,
      ownerEmail: targetUser?.email,
    };
  }

  // User is on 30-Day Free Trial
  const trialStart =
    targetUser?.trialStartDate ||
    targetUser?.trial_start_date ||
    targetUser?.createdAt ||
    null;

  let daysRemaining = 30;
  let trialExpiryStr: string | null = null;
  let formattedTrialExp: string | null = null;

  if (trialStart) {
    try {
      const start = new Date(trialStart);
      if (!isNaN(start.getTime())) {
        const exp = new Date(start);
        exp.setDate(exp.getDate() + 30);
        trialExpiryStr = exp.toISOString().slice(0, 10);
        formattedTrialExp = exp.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const now = Date.now();
        daysRemaining = Math.max(0, Math.ceil((exp.getTime() - now) / 86400000));
      }
    } catch {}
  } else {
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    trialExpiryStr = exp.toISOString().slice(0, 10);
    formattedTrialExp = exp.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  const isTrialExpired = daysRemaining <= 0;

  return {
    status: isTrialExpired ? "Expired" : "Trial",
    isExpired: isTrialExpired,
    isTrial: true,
    isPaidActive: false,
    hasFreeAccess: false,
    trialDaysLeft: daysRemaining,
    expiryDate: trialExpiryStr,
    formattedExpiryDate: formattedTrialExp,
    activePlan: override.activePlan || targetUser?.activePlan || "Starter",
    isStaff,
    ownerName: targetUser?.name,
    ownerEmail: targetUser?.email,
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
  if (!params?.email || !isValidPaystackRef(params?.reference)) return null;

  const cleanEmail = (params.email || "").trim().toLowerCase();
  if (!cleanEmail) return null;

  try {
    localStorage.removeItem("pondtora_pending_paystack_tx");
    sessionStorage.removeItem("pondtora_pending_paystack_tx");
  } catch {}

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

  const payload: Record<string, any> = {
    active_plan: params.planName,
    subscription_status: "Active",
    subscription_amount: params.amount,
    paystack_reference: params.reference,
    last_payment_date: todayStr,
    subscription_expiry: expiryStr,
    subscription_start: todayStr,
    billing_frequency: params.billingFrequency,
    trial_start_date: null,
    status: "Active",
    raw_data: {
      subscription_status: "Active",
      subscription_amount: params.amount,
      subscriptionAmount: params.amount,
      active_plan: params.planName,
      billing_frequency: params.billingFrequency,
      paystack_reference: params.reference,
      last_payment_date: todayStr,
      subscription_start: todayStr,
      subscription_expiry: expiryStr,
    },
    updated_at: new Date().toISOString(),
  };

  // 1. Update Supabase user_profiles table safely by email
  supabase
    .from("user_profiles")
    .update(payload)
    .ilike("email", cleanEmail)
    .then(() => {})
    .catch(console.warn);

  // 2. Also update by id if id is a valid UUID
  const isUuid = Boolean(userObj.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userObj.id));
  if (isUuid) {
    supabase
      .from("user_profiles")
      .update(payload)
      .eq("id", userObj.id)
      .then(() => {})
      .catch(console.warn);
  }

  // 3. Persist to platform_settings admin_user_overrides so all admin dashboards immediately reflect payment
  (async () => {
    try {
      const { data: existingSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_user_overrides")
        .maybeSingle();

      const currentOverrides = (existingSetting?.value && typeof existingSetting.value === "object") ? existingSetting.value : {};
      currentOverrides[cleanEmail] = {
        userId: userObj.id,
        email: cleanEmail,
        name: userObj.name,
        farmName: userObj.farmName,
        subscriptionAmount: params.amount,
        hasPaid: true,
        freeAccess: false,
        activePlan: params.planName,
        billingFrequency: params.billingFrequency,
        subscriptionStatus: "Active",
        paystackReference: params.reference,
        lastPaymentDate: todayStr,
        subscriptionStart: todayStr,
        subscriptionExpiry: expiryStr,
        trialStartDate: null,
        updatedAt: new Date().toISOString(),
      };

      if (isUuid) {
        currentOverrides[userObj.id] = currentOverrides[cleanEmail];
      }

      await supabase
        .from("platform_settings")
        .upsert({
          key: "admin_user_overrides",
          value: currentOverrides,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
    } catch (overrideErr) {
      console.warn("Could not save payment to platform_settings:", overrideErr);
    }
  })();

  // 4. Update scoped user profile in localStorage if present on this device
  const localKeys = [
    `pondtora_${cleanEmail}_user_profile`,
    userObj.id ? `pondtora_${userObj.id}_user_profile` : null,
  ].filter(Boolean) as string[];

  for (const lk of localKeys) {
    try {
      const raw = localStorage.getItem(lk);
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(lk, JSON.stringify({
        ...parsed,
        activePlan: params.planName,
        trialStartDate: null,
        subscriptionStatus: "Active",
        subscriptionAmount: params.amount,
        subscriptionExpiry: expiryStr,
        subscriptionStart: todayStr,
        paystackReference: params.reference,
        lastPaymentDate: todayStr,
        billingFrequency: params.billingFrequency,
      }));
    } catch {}
  }

  try {
    window.dispatchEvent(new CustomEvent("pondtora:payment_successful", { detail: { ...params, name: userObj.name } }));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated", { detail: users }));
    window.dispatchEvent(new CustomEvent("pondtora:user_profile_updated", { detail: userObj }));
  } catch {}

  logActivity(
    "Subscription Paid (Paystack)",
    "subscription",
    `${cleanEmail} paid ₦${(params.amount || 0).toLocaleString()} for ${params.planName} (${params.billingFrequency}) — Ref: ${params.reference}`,
    cleanEmail
  );

  return userObj;
}

/**
 * Purges all historical payment records, Paystack references, and referral ledger entries
 * from both Supabase and local caches, restoring all accounts to clean initial trial state.
 */
export async function clearAllPaymentDataInDbAndStorage(): Promise<boolean> {
  try {
    // 1. Reset all non-admin user profiles in Supabase
    try {
      await supabase
        .from("user_profiles")
        .update({
          paystack_reference: null,
          last_payment_date: null,
          subscription_amount: null,
          subscription_start: null,
          subscription_expiry: null,
          subscription_status: "Trial",
          billing_frequency: "monthly",
          updated_at: new Date().toISOString(),
        })
        .neq("role", "admin")
        .neq("role", "superadmin");
    } catch (profErr) {
      console.warn("user_profiles reset warning:", profErr);
    }

    // 2. Clear referral rewards table
    try {
      await supabase
        .from("referral_rewards")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (refErr) {
      console.warn("referral_rewards delete warning:", refErr);
    }

    // 3. Clear platform_settings payment records
    try {
      await supabase
        .from("platform_settings")
        .upsert({
          key: "admin_user_overrides",
          value: {},
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      await supabase
        .from("platform_settings")
        .delete()
        .in("key", ["admin_referral_rewards", "paystack_payments"]);

      // Reset referral_registry payment states in platform_settings
      const { data: refReg } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "referral_registry")
        .maybeSingle();

      if (refReg?.value && Array.isArray(refReg.value)) {
        const cleanedRegistry = refReg.value.map((r: any) => ({
          ...r,
          hasPaid: false,
          paymentAmount: 0,
          paystackReference: null,
          paidDate: null,
        }));
        await supabase
          .from("platform_settings")
          .upsert({
            key: "referral_registry",
            value: cleanedRegistry,
            updated_at: new Date().toISOString(),
          }, { onConflict: "key" });
      }
    } catch (setErr) {
      console.warn("platform_settings reset warning:", setErr);
    }

    // 4. Clear all payment-related local and session storage caches
    try {
      localStorage.removeItem("pondtora_admin_user_overrides");
      localStorage.removeItem("pondtora_admin_platform_stats");
      localStorage.removeItem("pondtora_pending_paystack_tx");
      sessionStorage.removeItem("pondtora_pending_paystack_tx");

      // Clean scoped localStorage keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.endsWith("_user_profile") || k.includes("admin_user"))) {
          try {
            const raw = localStorage.getItem(k);
            if (raw) {
              const obj = JSON.parse(raw);
              if (obj && typeof obj === "object") {
                if (obj.hasPaid !== undefined || obj.paystackReference !== undefined || obj.lastPaymentDate !== undefined) {
                  obj.hasPaid = false;
                  obj.paystackReference = null;
                  obj.lastPaymentDate = null;
                  obj.subscriptionAmount = null;
                  obj.subscriptionExpiry = null;
                  if (!obj.freeAccess && obj.subscriptionStatus === "Active") {
                    obj.subscriptionStatus = "Trial";
                  }
                  localStorage.setItem(k, JSON.stringify(obj));
                }
              }
            }
          } catch {}
        }
      }

      const users = loadAllAdminUsers().map(u => ({
        ...u,
        hasPaid: false,
        paystackReference: null,
        lastPaymentDate: null,
        subscriptionAmount: null,
        subscriptionExpiry: null,
        subscriptionStatus: u.freeAccess ? "Active" : "Trial",
      }));
      saveAllAdminUsers(users);

      window.dispatchEvent(new CustomEvent("pondtora:users_updated", { detail: users }));
      window.dispatchEvent(new CustomEvent("pondtora:referrals_updated", { detail: {} }));
    } catch (locErr) {
      console.warn("local storage cleanup warning:", locErr);
    }

    return true;
  } catch (err) {
    console.error("clearAllPaymentDataInDbAndStorage error:", err);
    return false;
  }
}

