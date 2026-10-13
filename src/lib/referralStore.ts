import type { AdminUser } from "../admin/types";
import { loadAllAdminUsers, saveAllAdminUsers, logActivity, isValidPaystackRef } from "./userSync";
import { supabase } from "./supabase";

const REFERRALS_STORAGE_KEY = "pondtora_referral_rewards";
const PENDING_REF_KEY = "pondtora_pending_referrer_code";

export interface ReferralReward {
  id: string;
  referrerCode: string;
  referrerEmail: string;
  referredUserId?: string;
  referredUserEmail: string;
  referredUserName: string;
  paymentReference?: string;
  planName: string;
  paymentAmount: number;
  paymentType: "first" | "recurring";
  commissionRate: number; // 0.30 or 0.10
  commissionAmount: number;
  status: "Available" | "Paid";
  paidDate?: string;
  createdAt: string;
}

export interface ReferredUserRecord {
  id: string;
  name: string;
  email: string;
  farmName?: string;
  createdAt: string;
  subscriptionStatus: string;
  hasPaid: boolean;
  activePlan: string;
  paymentAmount: number;
  trialDaysLeft: number;
  trialStatusText: string;
  totalCommission: number;
  paymentCount: number;
  commissionBreakdown: string;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferralsCount: number;
  paidReferralsCount: number;
  trialReferralsCount: number;
  totalEarnings: number;
  availableEarnings: number;
  paidOutEarnings: number;
  referredUsers: ReferredUserRecord[];
  rewards: ReferralReward[];
}

/**
 * Generates a clean, readable referral code from user name or email and ID (deterministic)
 */
export function generateReferralCode(name?: string, email?: string, id?: string): string {
  const cleanEmail = (email || "").toLowerCase().trim();
  const emailPrefix = cleanEmail ? cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) : "";
  const namePrefix = (name || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  const base = emailPrefix || namePrefix || "FARM";

  // Use email or id as fixed seed so the code is 100% consistent across all devices & browsers
  const seed = (cleanEmail || id || name || "1001").toLowerCase();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 10000;
  }
  const suffix = (id ? id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() : String(Math.abs(hash)).padStart(4, "0"));
  return `${base || "FARM"}-${suffix || "1001"}`;
}

/**
 * Gets or sets the referral code for a user
 */
export function getUserReferralCode(user: { id?: string; name?: string; email?: string; referralCode?: string } | null): string {
  if (!user) return "PONDTORA-REF";
  if (user.referralCode && user.referralCode.trim()) return user.referralCode.trim().toUpperCase();
  if ((user as any)?.referral_code && String((user as any).referral_code).trim()) return String((user as any).referral_code).trim().toUpperCase();

  const cleanEmail = (user.email || "").toLowerCase().trim();
  
  // Check localStorage cache
  try {
    const cachedCode = (cleanEmail ? localStorage.getItem(`pondtora_${cleanEmail}_ref_code`) : null) || localStorage.getItem("pondtora_user_referral_code");
    if (cachedCode && cachedCode.trim()) return cachedCode.trim().toUpperCase();
  } catch {}

  // Check in AdminUsers list
  const allUsers = loadAllAdminUsers();
  const found = allUsers.find(u => (u.email || "").toLowerCase().trim() === cleanEmail || (user.id && u.id === user.id));
  if ((found as any)?.referralCode && String((found as any).referralCode).trim()) {
    return String((found as any).referralCode).trim().toUpperCase();
  }
  if ((found as any)?.referral_code && String((found as any).referral_code).trim()) {
    return String((found as any).referral_code).trim().toUpperCase();
  }

  const generated = generateReferralCode(user.name, user.email, user.id);
  
  try {
    if (cleanEmail) localStorage.setItem(`pondtora_${cleanEmail}_ref_code`, generated);
    localStorage.setItem("pondtora_user_referral_code", generated);
  } catch {}

  // Persist code if admin user exists
  if (found) {
    (found as any).referralCode = generated;
    saveAllAdminUsers(allUsers);
  }

  // Ensure code is synced to Supabase user_profiles if user.id is available
  if (user?.id) {
    try {
      supabase.from("user_profiles").update({ referral_code: generated }).eq("id", user.id).then(() => {}).catch(() => {});
    } catch {}
  }

  return generated;
}

/**
 * Builds the full referral share link
 */
export function getReferralLink(codeOrUser: string | { id?: string; name?: string; email?: string; referralCode?: string } | null): string {
  let code = "";
  if (typeof codeOrUser === "string") {
    code = codeOrUser.trim();
  } else {
    code = getUserReferralCode(codeOrUser);
  }
  if (!code) code = "PONDTORA-REF";

  if (typeof window === "undefined") return `https://app.pondtora.com/?ref=${encodeURIComponent(code)}`;
  const origin = window.location.origin;
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

/**
 * Stores pending referrer code from URL (?ref=... or ?referral=...)
 */
export function captureReferralParam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(hash.indexOf("?") + 1) : "");

    const ref =
      urlParams.get("ref") ||
      urlParams.get("referral") ||
      urlParams.get("referrer") ||
      hashParams.get("ref") ||
      hashParams.get("referral") ||
      hashParams.get("referrer");

    if (ref && ref.trim()) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem(PENDING_REF_KEY, cleanRef);
      sessionStorage.setItem(PENDING_REF_KEY, cleanRef);
      return cleanRef;
    }
  } catch {}
  return null;
}

export function getPendingReferrerCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (
      sessionStorage.getItem(PENDING_REF_KEY) ||
      localStorage.getItem(PENDING_REF_KEY) ||
      null
    );
  } catch {}
  return null;
}

export function clearPendingReferrerCode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_REF_KEY);
    sessionStorage.removeItem(PENDING_REF_KEY);
  } catch {}
}

/**
 * Loads all stored referral reward transactions
 */
export function loadAllReferralRewards(): ReferralReward[] {
  try {
    const raw = localStorage.getItem(REFERRALS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out unverified/fabricated references while preserving confirmed rewards
        return parsed.filter(r => r && typeof r === "object" && (isValidPaystackRef(r.paymentReference) || r.status === "Paid" || (typeof r.commissionAmount === "number" && r.commissionAmount > 0)));
      }
    }
  } catch {}
  return [];
}

export function saveAllReferralRewards(rewards: ReferralReward[]) {
  try {
    localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(rewards));
    window.dispatchEvent(new CustomEvent("pondtora:referrals_updated", { detail: rewards }));
  } catch {}

  // Asynchronously persist to Supabase platform_settings as central admin rewards backup
  try {
    supabase
      .from("platform_settings")
      .upsert({
        key: "admin_referral_rewards",
        value: rewards,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" })
      .then(() => {})
      .catch(() => {});
  } catch {}
}

export interface ReferralRegistryEntry {
  id: string;
  name: string;
  email: string;
  farmName?: string;
  referrerCode: string;
  referrerEmail: string;
  activePlan: string;
  billingFrequency?: "monthly" | "yearly";
  subscriptionStatus: string;
  hasPaid: boolean;
  paymentAmount?: number;
  totalCommission?: number;
  paystackReference?: string;
  trialStartDate?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Fetches the global referral registry from Supabase platform_settings
 */
export async function fetchRemoteReferralRegistry(): Promise<ReferralRegistryEntry[]> {
  try {
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "referral_registry")
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      try {
        localStorage.setItem("pondtora_cached_referral_registry", JSON.stringify(data.value));
      } catch {}
      return data.value as ReferralRegistryEntry[];
    }
  } catch (err) {
    console.warn("fetchRemoteReferralRegistry error:", err);
  }
  try {
    const cached = localStorage.getItem("pondtora_cached_referral_registry");
    if (cached) return JSON.parse(cached);
  } catch {}
  return [];
}

/**
 * Saves/merges entries in the global referral registry in Supabase platform_settings
 */
export async function saveRemoteReferralRegistry(entries: ReferralRegistryEntry[]): Promise<void> {
  if (!Array.isArray(entries) || entries.length === 0) return;
  try {
    localStorage.setItem("pondtora_cached_referral_registry", JSON.stringify(entries));
    await supabase
      .from("platform_settings")
      .upsert({
        key: "referral_registry",
        value: entries,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
  } catch (err) {
    console.warn("saveRemoteReferralRegistry error:", err);
  }
}

/**
 * Records a new user signup with their referring code
 */
export function attachReferralToNewUser(newUser: { id?: string; email: string; name?: string; farmName?: string }, referrerCode?: string | null) {
  const code = (referrerCode || getPendingReferrerCode() || "").trim().toUpperCase();
  if (!code || !newUser.email) return;

  const cleanUserEmail = newUser.email.toLowerCase().trim();
  const allUsers = loadAllAdminUsers();

  const userIdx = allUsers.findIndex(u => (u.email || "").toLowerCase().trim() === cleanUserEmail);
  const cleanFarm = (newUser.farmName || "").trim();
  const userName = newUser.name || cleanUserEmail.split("@")[0];
  const farmName = (cleanFarm && cleanFarm.toLowerCase() !== "primary farm")
    ? cleanFarm
    : (userName ? `${userName}'s Farm` : "Fish Farm");
  const userId = newUser.id || "usr-" + Math.random().toString(36).slice(2, 8);

  if (userIdx >= 0) {
    (allUsers[userIdx] as any).referredBy = code;
    if (cleanFarm && cleanFarm.toLowerCase() !== "primary farm") {
      allUsers[userIdx].farmName = cleanFarm;
    } else if (!allUsers[userIdx].farmName || allUsers[userIdx].farmName.toLowerCase() === "primary farm") {
      allUsers[userIdx].farmName = farmName;
    }
    saveAllAdminUsers(allUsers);
  } else {
    allUsers.push({
      id: userId,
      name: userName,
      email: cleanUserEmail,
      farmName: farmName,
      phone: "",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      role: "owner",
      activePlan: "Starter",
      billingFrequency: "monthly",
      subscriptionStatus: "Trial",
      trialStartDate: new Date().toISOString().slice(0, 10),
      referredBy: code,
      createdAt: new Date().toISOString().slice(0, 10),
    });
    saveAllAdminUsers(allUsers);
  }

  // Also sync to Supabase user_profiles if user ID is available
  if (newUser.id) {
    try {
      supabase
        .from("user_profiles")
        .update({ referred_by: code })
        .eq("id", newUser.id)
        .then(() => {})
        .catch(() => {});
    } catch {}
  }

  // Persist to platform_settings referral_registry asynchronously
  fetchRemoteReferralRegistry().then(remoteList => {
    const existingIdx = remoteList.findIndex(
      r => (r.email || "").toLowerCase().trim() === cleanUserEmail || (newUser.id && r.id === newUser.id)
    );
    const entry: ReferralRegistryEntry = {
      id: userId,
      name: userName,
      email: cleanUserEmail,
      farmName: farmName,
      referrerCode: code,
      referrerEmail: code.includes("@") ? code.toLowerCase() : "",
      activePlan: "Starter",
      billingFrequency: "monthly",
      subscriptionStatus: "Trial",
      hasPaid: false,
      paymentAmount: 0,
      totalCommission: 0,
      trialStartDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      remoteList[existingIdx] = { ...remoteList[existingIdx], ...entry };
    } else {
      remoteList.unshift(entry);
    }
    saveRemoteReferralRegistry(remoteList);
  }).catch(() => {});

  // Clear pending referral after assigning
  clearPendingReferrerCode();

  // Instantly notify any open referral stats / dashboards
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pondtora:referrals_updated"));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated"));
  }
}

/**
 * Calculates standard plan price fallback if not stored
 */
function getStandardPlanPrice(planName: string, freq?: string): number {
  const clean = (planName || "").toLowerCase();
  const isYearly = (freq || "").toLowerCase() === "yearly";
  if (clean.includes("unlimited")) return isYearly ? 672000 : 70000;
  if (clean.includes("5-farm")) return isYearly ? 384000 : 40000;
  if (clean.includes("3-farm")) return isYearly ? 230400 : 24000;
  if (clean.includes("commercial")) return isYearly ? 96000 : 10000;
  if (clean.includes("growth") || clean.includes("pro")) return isYearly ? 48000 : 5000;
  if (clean.includes("starter") || clean.includes("basic")) return isYearly ? 28800 : 3000;
  return 3000;
}

/**
 * Processes commission when a payment occurs
 * - 30% for First Payment
 * - 10% for Recurring Payments
 * - Idempotent: same payment reference will NEVER create duplicate rewards
 */
export function processReferralCommission(params: {
  payerEmail: string;
  payerName?: string;
  farmName?: string;
  planName: string;
  amount: number;
  reference: string;
  referrerCode?: string;
  referrerEmail?: string;
  referredUserId?: string;
}): ReferralReward | null {
  if (!params.payerEmail || params.amount <= 0 || !params.reference || !isValidPaystackRef(params.reference)) return null;

  const cleanRef = params.reference.trim();
  const cleanPayerEmail = params.payerEmail.toLowerCase().trim();
  const allRewards = loadAllReferralRewards();

  // 1. Strict Idempotency Check: if reward for this reference already exists, return it
  const existingReward = allRewards.find(r => r.paymentReference && r.paymentReference.trim().toUpperCase() === cleanRef.toUpperCase());
  if (existingReward) {
    return existingReward;
  }

  const allUsers = loadAllAdminUsers();
  const payerUser = allUsers.find(u => (u.email || "").toLowerCase().trim() === cleanPayerEmail);

  // Check passed referrerCode first, then payerUser, then pending
  let referrerCode = (params.referrerCode || (payerUser as any)?.referredBy || (payerUser as any)?.referred_by || getPendingReferrerCode() || "").trim().toUpperCase();

  // Check cached registry if still missing
  if (!referrerCode) {
    try {
      const rawReg = localStorage.getItem("pondtora_cached_referral_registry");
      if (rawReg) {
        const parsed = JSON.parse(rawReg);
        if (Array.isArray(parsed)) {
          const m = parsed.find((r: any) => (r.email || "").toLowerCase().trim() === cleanPayerEmail);
          if (m?.referrerCode) referrerCode = m.referrerCode.trim().toUpperCase();
        }
      }
    } catch {}
  }

  if (!referrerCode) return null;
  const cleanRefCode = referrerCode;

  // Find the referrer account by exact code, exact email, or exact user ID
  const referrerUser = allUsers.find(u => {
    const uCode = ((u as any).referralCode || (u as any).referral_code || generateReferralCode(u.name, u.email, u.id)).toUpperCase().trim();
    const uEmail = (u.email || "").toUpperCase().trim();
    const uId = (u.id || "").toUpperCase().trim();
    return uCode === cleanRefCode || uId === cleanRefCode || uEmail === cleanRefCode;
  });

  const finalReferrerEmail = params.referrerEmail || referrerUser?.email || (cleanRefCode.includes("@") ? cleanRefCode : "referrer");

  // Check how many times this referred user has already generated commission
  const previousRewardsForPayer = allRewards.filter(
    r => (r.referredUserEmail || "").toLowerCase().trim() === cleanPayerEmail
  );

  const isFirstPayment = previousRewardsForPayer.length === 0;
  const commissionRate = isFirstPayment ? 0.30 : 0.10; // 30% 1st payment, 10% recurring
  const commissionAmount = Math.round(params.amount * commissionRate);
  const rawFarm = (params.farmName || (payerUser as any)?.farmName || "").trim();
  const resolvedFarmName = (rawFarm && rawFarm.toLowerCase() !== "primary farm")
    ? rawFarm
    : (params.payerName || payerUser?.name ? `${params.payerName || payerUser?.name}'s Farm` : "Fish Farm");
  const resolvedUserName = params.payerName || payerUser?.name || cleanPayerEmail.split("@")[0];

  const rawUserId = params.referredUserId || payerUser?.id || null;
  const cleanUserId = (rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawUserId))
    ? rawUserId
    : null;

  const reward: ReferralReward = {
    id: "ref-rew-" + Math.random().toString(36).slice(2, 10),
    referrerCode: cleanRefCode,
    referrerEmail: finalReferrerEmail,
    referredUserId: cleanUserId || undefined,
    referredUserEmail: cleanPayerEmail,
    referredUserName: resolvedUserName,
    paymentReference: cleanRef,
    planName: params.planName,
    paymentAmount: params.amount,
    paymentType: isFirstPayment ? "first" : "recurring",
    commissionRate,
    commissionAmount,
    status: "Available",
    createdAt: new Date().toISOString().slice(0, 10),
  };

  allRewards.unshift(reward);
  saveAllReferralRewards(allRewards);

  // Asynchronously persist reward to Supabase referral_rewards table
  try {
    supabase.from("referral_rewards").insert({
      referrer_code: cleanRefCode,
      referrer_email: reward.referrerEmail,
      referred_user_id: cleanUserId,
      referred_user_email: cleanPayerEmail,
      referred_user_name: resolvedUserName,
      payment_reference: cleanRef,
      plan_name: params.planName,
      payment_amount: params.amount,
      payment_type: isFirstPayment ? "first" : "recurring",
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      status: "Available",
    }).then(() => {}).catch(err => console.warn("referral_rewards insert error:", err));
  } catch {}

  // Also update platform_settings referral_registry
  fetchRemoteReferralRegistry().then(remoteList => {
    const existingIdx = remoteList.findIndex(
      r => (r.email || "").toLowerCase().trim() === cleanPayerEmail || (payerUser?.id && r.id === payerUser.id)
    );
    const entry: ReferralRegistryEntry = {
      id: payerUser?.id || params.referredUserId || "usr-" + Math.random().toString(36).slice(2, 8),
      name: resolvedUserName,
      email: cleanPayerEmail,
      farmName: resolvedFarmName,
      referrerCode: cleanRefCode,
      referrerEmail: reward.referrerEmail,
      activePlan: params.planName,
      subscriptionStatus: "Active",
      hasPaid: true,
      paymentAmount: params.amount,
      totalCommission: commissionAmount,
      paystackReference: cleanRef,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      remoteList[existingIdx] = {
        ...remoteList[existingIdx],
        ...entry,
        hasPaid: true,
        subscriptionStatus: "Active",
        paymentAmount: (remoteList[existingIdx].paymentAmount || 0) + params.amount,
        totalCommission: (remoteList[existingIdx].totalCommission || 0) + commissionAmount,
        paystackReference: cleanRef,
      };
    } else {
      remoteList.unshift(entry);
    }
    saveRemoteReferralRegistry(remoteList);
  }).catch(() => {});

  logActivity(
    "Referral Commission Earned",
    "subscription",
    `${reward.referrerEmail || cleanRefCode} earned ₦${commissionAmount.toLocaleString()} (${isFirstPayment ? "30% 1st payment" : "10% recurring"}) from ${cleanPayerEmail}'s ${params.planName} payment (₦${params.amount.toLocaleString()}) — Ref: ${cleanRef}`,
    reward.referrerEmail || "system"
  );

  return reward;
}

/**
 * Ensures referral tracking is triggered when an admin marks a user as paid or updates payment records.
 * Deterministic reference guarantees complete idempotency: duplicate credits are prevented.
 */
export async function syncReferralOnUserPayment(u: AdminUser): Promise<ReferralReward | null> {
  const isPaid = Boolean(
    !u.freeAccess &&
    (u.hasPaid ||
     u.subscriptionStatus === "Paid" ||
     (u.paystackReference && isValidPaystackRef(u.paystackReference)) ||
     Boolean(u.lastPaymentDate))
  );
  if (!isPaid) return null;

  const cleanUserEmail = (u.email || "").toLowerCase().trim();
  const userId = u.id || "";
  if (!cleanUserEmail && !userId) return null;

  // 1. Identify referrer code
  let referrerCode = (u.referredBy || (u as any).referred_by || "").trim().toUpperCase();

  // If not on u, check cached referral registry
  if (!referrerCode) {
    try {
      const cached = localStorage.getItem("pondtora_cached_referral_registry");
      if (cached) {
        const reg = JSON.parse(cached);
        if (Array.isArray(reg)) {
          const match = reg.find((r: any) =>
            (cleanUserEmail && (r.email || "").toLowerCase().trim() === cleanUserEmail) ||
            (userId && r.id === userId)
          );
          if (match && match.referrerCode) {
            referrerCode = match.referrerCode.trim().toUpperCase();
          }
        }
      }
    } catch {}
  }

  // If still not found, check remote referral registry in platform_settings
  if (!referrerCode) {
    try {
      const remoteReg = await fetchRemoteReferralRegistry();
      const match = remoteReg.find((r: any) =>
        (cleanUserEmail && (r.email || "").toLowerCase().trim() === cleanUserEmail) ||
        (userId && r.id === userId)
      );
      if (match && match.referrerCode) {
        referrerCode = match.referrerCode.trim().toUpperCase();
      }
    } catch {}
  }

  // If still not found, check user_profiles in Supabase
  if (!referrerCode) {
    try {
      let query = supabase.from("user_profiles").select("referred_by");
      if (userId) query = query.eq("id", userId);
      else query = query.ilike("email", cleanUserEmail);
      const { data } = await query.maybeSingle();
      if (data?.referred_by) {
        referrerCode = data.referred_by.trim().toUpperCase();
      }
    } catch {}
  }

  if (!referrerCode) {
    // User was not referred by anyone
    return null;
  }

  // Ensure referredBy is attached to u
  (u as any).referredBy = referrerCode;

  // 2. Determine payment amount
  let paymentAmount = 0;
  if (typeof u.subscriptionAmount === "number" && u.subscriptionAmount > 0) {
    paymentAmount = u.subscriptionAmount;
  } else if ((u as any).subscription_amount && Number((u as any).subscription_amount) > 0) {
    paymentAmount = Number((u as any).subscription_amount);
  } else {
    paymentAmount = getStandardPlanPrice(u.activePlan || "Starter", u.billingFrequency);
  }

  // 3. Determine payment reference (idempotent across visits)
  const todayStr = u.lastPaymentDate || u.subscriptionStart || new Date().toISOString().slice(0, 10);
  const cleanToday = todayStr.replace(/[^0-9]/g, "").slice(0, 8) || "20261011";
  const userRefId = (u.id || cleanUserEmail.split("@")[0] || "user").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);

  const paymentRef = (u.paystackReference && isValidPaystackRef(u.paystackReference))
    ? u.paystackReference.trim()
    : `admin_paid_${userRefId}_${cleanToday}`;

  // 4. Find the referrer user info
  const allUsers = loadAllAdminUsers();
  let referrerUser = allUsers.find(ru => {
    const ruCode = ((ru as any).referralCode || (ru as any).referral_code || generateReferralCode(ru.name, ru.email, ru.id)).toUpperCase().trim();
    const ruEmail = (ru.email || "").toUpperCase().trim();
    const ruId = (ru.id || "").toUpperCase().trim();
    return ruCode === referrerCode || ruEmail === referrerCode || ruId === referrerCode;
  });

  let referrerEmail = referrerUser?.email || (referrerCode.includes("@") ? referrerCode.toLowerCase() : "");
  if (!referrerEmail) {
    try {
      const { data: refProf } = await supabase
        .from("user_profiles")
        .select("id, name, email, referral_code")
        .or(`referral_code.ilike.${referrerCode},email.ilike.${referrerCode},id.eq.${referrerCode}`)
        .maybeSingle();
      if (refProf?.email) {
        referrerEmail = refProf.email.toLowerCase().trim();
      }
    } catch {}
  }
  if (!referrerEmail) referrerEmail = referrerCode.toLowerCase();

  const cleanFarm = (u.farmName || "").trim();
  const payerFarmName = (cleanFarm && cleanFarm.toLowerCase() !== "primary farm")
    ? cleanFarm
    : (u.name ? `${u.name.trim()}'s Farm` : "Fish Farm");

  // Call admin_mark_user_paid RPC in Supabase if valid UUID
  if (u.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u.id)) {
    try {
      supabase.rpc("admin_mark_user_paid", {
        p_user_id: u.id,
        p_paystack_ref: paymentRef,
        p_payment_amount: paymentAmount,
      }).then(() => {}).catch(() => {});
    } catch {}
  }

  // 5. Process referral commission (idempotent)
  const result = processReferralCommission({
    payerEmail: cleanUserEmail,
    payerName: u.name || cleanUserEmail.split("@")[0],
    farmName: payerFarmName,
    planName: u.activePlan || "Starter",
    amount: paymentAmount,
    reference: paymentRef,
    referrerCode,
    referrerEmail,
    referredUserId: u.id,
  });

  // 6. Ensure platform_settings referral_registry & admin_user_overrides are updated
  try {
    const remoteList = await fetchRemoteReferralRegistry();
    const existingIdx = remoteList.findIndex(
      r => (r.email || "").toLowerCase().trim() === cleanUserEmail || (u.id && r.id === u.id)
    );
    const commAmt = result?.commissionAmount || Math.round(paymentAmount * 0.3);
    const entry: ReferralRegistryEntry = {
      id: u.id || "usr-" + Math.random().toString(36).slice(2, 8),
      name: u.name || cleanUserEmail.split("@")[0],
      email: cleanUserEmail,
      farmName: payerFarmName,
      referrerCode: referrerCode,
      referrerEmail: referrerEmail,
      activePlan: u.activePlan || "Starter",
      billingFrequency: u.billingFrequency || "monthly",
      subscriptionStatus: "Active",
      hasPaid: true,
      paymentAmount: paymentAmount,
      totalCommission: commAmt,
      paystackReference: paymentRef,
      createdAt: u.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      remoteList[existingIdx] = {
        ...remoteList[existingIdx],
        ...entry,
        farmName: payerFarmName,
        hasPaid: true,
        subscriptionStatus: "Active",
        paymentAmount: paymentAmount,
        totalCommission: Math.max(remoteList[existingIdx].totalCommission || 0, commAmt),
        paystackReference: paymentRef,
      };
    } else {
      remoteList.unshift(entry);
    }
    await saveRemoteReferralRegistry(remoteList);
  } catch (err) {
    console.warn("syncReferralOnUserPayment registry update error:", err);
  }

  // Also ensure admin_user_overrides reflects hasPaid: true in platform_settings
  try {
    const { data: setRow } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_user_overrides")
      .maybeSingle();
    const currentOverrides = (setRow?.value && typeof setRow.value === "object") ? setRow.value : {};
    const ovRecord = {
      userId: u.id,
      email: cleanUserEmail,
      name: u.name,
      farmName: payerFarmName,
      subscriptionAmount: paymentAmount,
      hasPaid: true,
      activePlan: u.activePlan || "Starter",
      billingFrequency: u.billingFrequency || "monthly",
      subscriptionStatus: "Active",
      paystackReference: paymentRef,
      lastPaymentDate: todayStr,
      referredBy: referrerCode,
      updatedAt: new Date().toISOString(),
    };
    if (cleanUserEmail) currentOverrides[cleanUserEmail] = { ...(currentOverrides[cleanUserEmail] || {}), ...ovRecord };
    if (u.id) currentOverrides[u.id.toLowerCase()] = { ...(currentOverrides[u.id.toLowerCase()] || {}), ...ovRecord };
    try {
      localStorage.setItem("pondtora_admin_user_overrides", JSON.stringify(currentOverrides));
    } catch {}
    await supabase.from("platform_settings").upsert({
      key: "admin_user_overrides",
      value: currentOverrides,
      updated_at: new Date().toISOString(),
    }, { onConflict: "key" });
  } catch {}

  // 7. Dispatch events to notify all active windows/components
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pondtora:referrals_updated", { detail: result }));
    window.dispatchEvent(new CustomEvent("pondtora:users_updated"));
  }

  return result;
}

/**
 * Calculates user's referral summary & list of referred farmers (strictly scoped to this user only)
 */
export function getUserReferralStats(user: { id?: string; name?: string; email?: string; referralCode?: string } | null): ReferralStats {
  if (!user || (!user.id && !user.email && !user.referralCode)) {
    return {
      referralCode: "PONDTORA-REF",
      referralLink: getReferralLink("PONDTORA-REF"),
      totalReferralsCount: 0,
      paidReferralsCount: 0,
      trialReferralsCount: 0,
      totalEarnings: 0,
      availableEarnings: 0,
      paidOutEarnings: 0,
      referredUsers: [],
      rewards: [],
    };
  }

  const code = getUserReferralCode(user);
  const cleanCode = code.toUpperCase().trim();
  const cleanEmail = (user?.email || "").toLowerCase().trim();
  const userId = (user?.id || "").trim();

  const allUsers = loadAllAdminUsers();
  const allRewards = loadAllReferralRewards();

  // ONLY collect specific, unique identifiers for THIS authenticated user (exact matches only)
  const userRefCodes = new Set<string>();
  if (cleanCode && cleanCode !== "PONDTORA-REF") userRefCodes.add(cleanCode);
  if (user?.referralCode && user.referralCode.trim()) userRefCodes.add(user.referralCode.trim().toUpperCase());
  if ((user as any)?.referral_code && String((user as any).referral_code).trim()) userRefCodes.add(String((user as any).referral_code).trim().toUpperCase());
  
  if (cleanEmail) {
    userRefCodes.add(cleanEmail.toUpperCase());
    userRefCodes.add(cleanEmail);
  }
  if (userId) {
    userRefCodes.add(userId);
    userRefCodes.add(userId.toUpperCase());
    userRefCodes.add(userId.toLowerCase());
  }

  const foundAdminUser = allUsers.find(u => (u.email || "").toLowerCase().trim() === cleanEmail || (userId && u.id && u.id.toLowerCase() === userId.toLowerCase()));
  if ((foundAdminUser as any)?.referralCode && String((foundAdminUser as any).referralCode).trim()) {
    userRefCodes.add(String((foundAdminUser as any).referralCode).trim().toUpperCase());
  }
  if ((foundAdminUser as any)?.referral_code && String((foundAdminUser as any).referral_code).trim()) {
    userRefCodes.add(String((foundAdminUser as any).referral_code).trim().toUpperCase());
  }

  // Strict reward matching for THIS user only
  const myRewards = allRewards.filter(r => {
    const rRef = (r.referrerCode || "").toUpperCase().trim();
    const rEmail = (r.referrerEmail || "").toLowerCase().trim();
    return (
      (rRef && userRefCodes.has(rRef)) ||
      (cleanEmail && rEmail === cleanEmail) ||
      (cleanEmail && rRef === cleanEmail.toUpperCase()) ||
      (userId && (rRef === userId || rRef === userId.toLowerCase() || rRef === userId.toUpperCase()))
    );
  });

  // Strict referred users matching from allUsers (a user cannot refer themselves)
  const referredUsersList = allUsers.filter(u => {
    const uEmail = (u.email || "").toLowerCase().trim();
    if (uEmail && cleanEmail && uEmail === cleanEmail) return false;
    if (u.id && userId && (u.id.toUpperCase() === userId.toUpperCase() || u.id.toLowerCase() === userId.toLowerCase())) return false;

    const refBy = (((u as any).referredBy || (u as any).referred_by || "") as string).trim().toUpperCase();
    if (!refBy) return false;

    return (
      userRefCodes.has(refBy) ||
      (cleanEmail && refBy === cleanEmail.toUpperCase()) ||
      (userId && (refBy === userId.toUpperCase() || refBy === userId.toLowerCase()))
    );
  });

  const existingReferredEmails = new Set(referredUsersList.map(u => (u.email || "").toLowerCase().trim()));

  // Also check pondtora_cached_referral_registry for immediate rendering before async fetch
  try {
    const rawReg = localStorage.getItem("pondtora_cached_referral_registry");
    if (rawReg) {
      const parsedReg: ReferralRegistryEntry[] = JSON.parse(rawReg);
      if (Array.isArray(parsedReg)) {
        parsedReg.forEach(reg => {
          const regRef = (reg.referrerCode || "").toUpperCase().trim();
          const regRefEmail = (reg.referrerEmail || "").toLowerCase().trim();
          const isMatch = (regRef && userRefCodes.has(regRef)) ||
            (cleanEmail && regRefEmail === cleanEmail) ||
            (cleanEmail && regRef === cleanEmail.toUpperCase()) ||
            (userId && (regRef === userId.toUpperCase() || regRef === userId.toLowerCase()));

          const regEmail = (reg.email || "").toLowerCase().trim();
          if (isMatch && regEmail && (!cleanEmail || regEmail !== cleanEmail) && !existingReferredEmails.has(regEmail)) {
            existingReferredEmails.add(regEmail);
            const regCleanFarm = (reg.farmName || "").trim();
            const regFarmName = (regCleanFarm && regCleanFarm.toLowerCase() !== "primary farm")
              ? regCleanFarm
              : (reg.name ? `${reg.name.trim()}'s Farm` : "Fish Farm");

            referredUsersList.push({
              id: reg.id || "usr-" + regEmail.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10),
              name: reg.name || regEmail.split("@")[0] || "Farmer",
              email: regEmail,
              farmName: regFarmName,
              phone: "",
              city: "Lagos",
              state: "Lagos",
              country: "Nigeria",
              role: "owner",
              activePlan: reg.activePlan || "Starter",
              billingFrequency: reg.billingFrequency || "monthly",
              subscriptionStatus: reg.hasPaid ? "Active" : "Trial",
              hasPaid: Boolean(reg.hasPaid),
              trialStartDate: reg.trialStartDate || reg.createdAt,
              paystackReference: reg.paystackReference,
              lastPaymentDate: reg.hasPaid ? reg.createdAt : undefined,
              referredBy: cleanCode,
              createdAt: reg.createdAt || new Date().toISOString().slice(0, 10),
            });
          }
        });
      }
    }
  } catch {}

  // Also add referred users from myRewards if not already in list
  myRewards.forEach(r => {
    const rEmail = (r.referredUserEmail || "").toLowerCase().trim();
    if (rEmail && cleanEmail && rEmail !== cleanEmail && !existingReferredEmails.has(rEmail)) {
      existingReferredEmails.add(rEmail);
      const rewFarmRaw = ((r as any).farmName || "").trim();
      const rewFarm = (rewFarmRaw && rewFarmRaw.toLowerCase() !== "primary farm")
        ? rewFarmRaw
        : (r.referredUserName ? `${r.referredUserName.trim()}'s Farm` : "Fish Farm");

      referredUsersList.push({
        id: r.referredUserId || "usr-" + rEmail.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10),
        name: r.referredUserName || rEmail.split("@")[0] || "Farmer",
        email: rEmail,
        farmName: rewFarm,
        phone: "",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        role: "owner",
        activePlan: r.planName || "Starter",
        billingFrequency: "monthly",
        subscriptionStatus: "Active",
        hasPaid: true,
        trialStartDate: r.createdAt,
        paystackReference: r.paymentReference,
        lastPaymentDate: r.createdAt,
        referredBy: cleanCode,
        createdAt: r.createdAt || new Date().toISOString().slice(0, 10),
      });
    }
  });

  // Check pondtora_admin_user_overrides in local cache for immediate paid reflection
  let localAdminOverrides: Record<string, any> = {};
  try {
    const ovRaw = localStorage.getItem("pondtora_admin_user_overrides");
    if (ovRaw) localAdminOverrides = JSON.parse(ovRaw);
  } catch {}

  const referredUsers: ReferredUserRecord[] = referredUsersList.map(u => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const userRewards = myRewards.filter(r => (r.referredUserEmail || "").toLowerCase().trim() === uEmail);
    const commTotal = userRewards.reduce((s, r) => s + (r.commissionAmount || 0), 0);
    const hasVerifiedReward = userRewards.length > 0;

    const userOv = localAdminOverrides[uEmail] || (u.id ? localAdminOverrides[u.id.toLowerCase()] : null) || (u.id ? localAdminOverrides[u.id] : null);
    const isOverridePaid = Boolean(
      userOv?.hasPaid ||
      userOv?.subscriptionStatus === "Paid" ||
      userOv?.subscriptionStatus === "Active" ||
      (userOv?.paystackReference && isValidPaystackRef(userOv.paystackReference)) ||
      Boolean(userOv?.lastPaymentDate)
    );

    const hasPaid = Boolean(hasVerifiedReward || u.hasPaid || isOverridePaid);

    // Resolve accurate farm name - never display Primary Farm
    const rawF = (u.farmName || userOv?.farmName || "").trim();
    const displayFarmName = (rawF && rawF.toLowerCase() !== "primary farm")
      ? rawF
      : (u.name ? `${u.name.trim()}'s Farm` : "Fish Farm");

    // Calculate trial days left (40-day free trial window)
    let trialDaysLeft = 0;
    let trialStatusText = "Trial Expired";

    if (!hasPaid) {
      const startRef = u.trialStartDate || u.createdAt;
      if (startRef) {
        const startDate = new Date(startRef);
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        trialDaysLeft = Math.max(0, 40 - daysElapsed);
        if (trialDaysLeft > 0) {
          trialStatusText = `Free Trial (${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left)`;
        } else {
          trialStatusText = "Free Trial (Ended)";
        }
      } else {
        trialDaysLeft = 40;
        trialStatusText = "Free Trial (40 days left)";
      }
    } else {
      trialStatusText = "Subscribed / Active";
      trialDaysLeft = 0;
    }

    // Payment Amount strictly from verified rewards or confirmed payment
    let paymentAmount = 0;
    if (userRewards.length > 0) {
      paymentAmount = userRewards.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
    } else if (hasPaid && typeof u.subscriptionAmount === "number" && u.subscriptionAmount > 0) {
      paymentAmount = u.subscriptionAmount;
    } else if (hasPaid && userOv?.subscriptionAmount && Number(userOv.subscriptionAmount) > 0) {
      paymentAmount = Number(userOv.subscriptionAmount);
    } else if (hasPaid && (u as any).paymentAmount && Number((u as any).paymentAmount) > 0) {
      paymentAmount = Number((u as any).paymentAmount);
    } else if (hasPaid) {
      paymentAmount = getStandardPlanPrice(userOv?.activePlan || u.activePlan || "Starter");
    }

    // Actual Commission Amount: from verified rewards or registry commission
    const calculatedCommission = userRewards.length > 0
      ? commTotal
      : (typeof (u as any).totalCommission === "number" && (u as any).totalCommission > 0
        ? (u as any).totalCommission
        : (hasPaid ? Math.round(paymentAmount * 0.3) : 0));

    // Breakdown text
    let commissionBreakdown = "";
    if (userRewards.length > 0) {
      const firstRew = userRewards.find(r => r.paymentType === "first");
      const recRews = userRewards.filter(r => r.paymentType === "recurring");
      const parts: string[] = [];
      if (firstRew) parts.push(`30% 1st (₦${firstRew.commissionAmount.toLocaleString()})`);
      if (recRews.length > 0) {
        const recTotal = recRews.reduce((s, r) => s + r.commissionAmount, 0);
        parts.push(`10% renewals (₦${recTotal.toLocaleString()})`);
      }
      commissionBreakdown = parts.join(" + ");
    } else if (hasPaid && calculatedCommission > 0) {
      commissionBreakdown = `30% 1st (₦${calculatedCommission.toLocaleString()})`;
    }

    return {
      id: u.id,
      name: u.name || uEmail.split("@")[0],
      email: u.email,
      farmName: displayFarmName,
      createdAt: u.createdAt || "Recently",
      subscriptionStatus: hasPaid ? "Active" : (trialDaysLeft > 0 ? "Trial" : "Expired"),
      hasPaid,
      activePlan: userOv?.activePlan || u.activePlan || "Starter Plan",
      paymentAmount: hasPaid ? paymentAmount : 0,
      trialDaysLeft,
      trialStatusText,
      totalCommission: calculatedCommission,
      paymentCount: Math.max(userRewards.length, hasPaid ? 1 : 0),
      commissionBreakdown,
    };
  });

  const paidReferralsCount = referredUsers.filter(u => u.hasPaid && (u.totalCommission > 0 || u.paymentAmount > 0)).length;
  const trialReferralsCount = referredUsers.filter(u => !u.hasPaid || (u.totalCommission === 0 && u.paymentAmount === 0)).length;

  const rewardTotalEarnings = myRewards.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const registryExtraEarnings = referredUsers
    .filter(u => u.hasPaid && myRewards.every(r => (r.referredUserEmail || "").toLowerCase().trim() !== (u.email || "").toLowerCase().trim()))
    .reduce((sum, u) => sum + (u.totalCommission || 0), 0);
  const totalEarnings = rewardTotalEarnings + registryExtraEarnings;
  const paidOutEarnings = myRewards
    .filter(r => r.status === "Paid")
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const availableEarnings = Math.max(0, totalEarnings - paidOutEarnings);

  return {
    referralCode: code,
    referralLink: getReferralLink(code),
    totalReferralsCount: referredUsers.length,
    paidReferralsCount,
    trialReferralsCount,
    totalEarnings,
    availableEarnings,
    paidOutEarnings,
    referredUsers,
    rewards: myRewards,
  };
}

/**
 * Asynchronously queries Supabase for live referred users and rewards, updating local cache
 */
export async function fetchLiveUserReferralStats(user: { id?: string; name?: string; email?: string; referralCode?: string } | null): Promise<ReferralStats> {
  const cleanEmail = (user?.email || "").toLowerCase().trim();
  const userId = (user?.id || "").trim();

  // 0. Ensure we have the user's latest referral code from Supabase user_profiles if id/email available
  let dbStoredCode: string | null = null;
  if (userId || cleanEmail) {
    try {
      let query = supabase.from("user_profiles").select("id, email, referral_code, referred_by");
      if (userId) query = query.eq("id", userId);
      else if (cleanEmail) query = query.ilike("email", cleanEmail);
      const { data: selfProf } = await query.maybeSingle();
      if (selfProf?.referral_code && typeof selfProf.referral_code === "string" && selfProf.referral_code.trim()) {
        dbStoredCode = selfProf.referral_code.trim().toUpperCase();
        try {
          if (cleanEmail) localStorage.setItem(`pondtora_${cleanEmail}_ref_code`, dbStoredCode);
          localStorage.setItem("pondtora_user_referral_code", dbStoredCode);
        } catch {}
      }
    } catch {}
  }

  const code = dbStoredCode || getUserReferralCode(user);
  const cleanCode = code.toUpperCase();

  const userRefCodes = new Set<string>();
  if (cleanCode) userRefCodes.add(cleanCode);
  if (dbStoredCode) userRefCodes.add(dbStoredCode);
  if (user?.referralCode && user.referralCode.trim()) userRefCodes.add(user.referralCode.trim().toUpperCase());
  if ((user as any)?.referral_code && String((user as any).referral_code).trim()) userRefCodes.add(String((user as any).referral_code).trim().toUpperCase());
  
  const codeFromEmail = generateReferralCode(undefined, cleanEmail, userId);
  if (codeFromEmail) userRefCodes.add(codeFromEmail.toUpperCase());
  if (user?.name) {
    const codeFromName = generateReferralCode(user.name, cleanEmail, userId);
    if (codeFromName) userRefCodes.add(codeFromName.toUpperCase());
  }

  if (cleanEmail) {
    userRefCodes.add(cleanEmail.toUpperCase());
    userRefCodes.add(cleanEmail);
  }
  if (userId) {
    userRefCodes.add(userId);
    userRefCodes.add(userId.toLowerCase());
    userRefCodes.add(userId.toUpperCase());
  }

  try {
    if (cleanEmail) {
      const c1 = localStorage.getItem(`pondtora_${cleanEmail}_ref_code`);
      if (c1 && c1.trim()) userRefCodes.add(c1.trim().toUpperCase());
    }
    const c2 = localStorage.getItem("pondtora_user_referral_code");
    if (c2 && c2.trim()) userRefCodes.add(c2.trim().toUpperCase());
  } catch {}

  try {
    // 1. Fetch rewards directly from Supabase referral_rewards
    let dbRewards: any[] = [];

    // Try RPC first
    try {
      const { data: rpcRewards, error: rpcRewardsErr } = await supabase.rpc("get_user_referral_rewards", {
        p_referrer_code: cleanCode,
        p_referrer_email: cleanEmail,
      });
      if (!rpcRewardsErr && Array.isArray(rpcRewards)) {
        dbRewards = rpcRewards;
      }
    } catch {}

    // Direct table query fallback / augmentation
    try {
      const rewardOrClauses: string[] = [];
      userRefCodes.forEach(c => {
        if (c && c.length > 1) {
          rewardOrClauses.push(`referrer_code.ilike.${c}`);
        }
      });
      if (cleanEmail) rewardOrClauses.push(`referrer_email.ilike.${cleanEmail}`);

      if (rewardOrClauses.length > 0) {
        const { data: directRewards } = await supabase
          .from("referral_rewards")
          .select("*")
          .or(rewardOrClauses.join(","));
        if (Array.isArray(directRewards) && directRewards.length > 0) {
          const seenRewardIds = new Set(dbRewards.map(r => r.id));
          directRewards.forEach(r => {
            if (!seenRewardIds.has(r.id)) {
              dbRewards.push(r);
              seenRewardIds.add(r.id);
            }
          });
        }
      }
    } catch {}

    // Central platform_settings admin_referral_rewards sync
    try {
      const { data: setRes } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_referral_rewards")
        .maybeSingle();
      if (setRes?.value && Array.isArray(setRes.value)) {
        const seenRewardIds = new Set(dbRewards.map(r => r.id || r.payment_reference || r.paymentReference));
        setRes.value.forEach((r: any) => {
          const rRef = (r.referrerCode || r.referrer_code || "").toUpperCase().trim();
          const rEmail = (r.referrerEmail || r.referrer_email || "").toLowerCase().trim();
          const isMatch = (rRef && userRefCodes.has(rRef)) ||
            (cleanEmail && rEmail === cleanEmail) ||
            (cleanEmail && rRef === cleanEmail.toUpperCase()) ||
            (userId && (rRef === userId.toUpperCase() || rRef === userId.toLowerCase()));
          if (isMatch) {
            const rKey = r.id || r.paymentReference || r.payment_reference;
            if (!seenRewardIds.has(rKey)) {
              dbRewards.push({
                id: r.id,
                referrer_code: r.referrerCode || r.referrer_code || cleanCode,
                referrer_email: r.referrerEmail || r.referrer_email || cleanEmail,
                referred_user_id: r.referredUserId || r.referred_user_id,
                referred_user_email: r.referredUserEmail || r.referred_user_email,
                referred_user_name: r.referredUserName || r.referred_user_name,
                payment_reference: r.paymentReference || r.payment_reference,
                plan_name: r.planName || r.plan_name || "Starter",
                payment_amount: Number(r.paymentAmount || r.payment_amount) || 0,
                payment_type: r.paymentType || r.payment_type || "first",
                commission_rate: Number(r.commissionRate || r.commission_rate) || 0.30,
                commission_amount: Number(r.commissionAmount || r.commission_amount) || 0,
                status: (r.status === "Paid" ? "Paid" : "Available"),
                paid_date: r.paidDate || r.paid_date,
                created_at: r.createdAt || r.created_at,
              });
              seenRewardIds.add(rKey);
            }
          }
        });
      }
    } catch {}

    if (Array.isArray(dbRewards) && dbRewards.length > 0) {
      const localRewards = loadAllReferralRewards();
      const mergedRewards: ReferralReward[] = [...localRewards];

      dbRewards.forEach(r => {
        const matchIdx = mergedRewards.findIndex(lr => lr.id === r.id || (lr.paymentReference && r.payment_reference && lr.paymentReference === r.payment_reference));
        const formatted: ReferralReward = {
          id: r.id,
          referrerCode: r.referrer_code || cleanCode,
          referrerEmail: r.referrer_email || cleanEmail,
          referredUserId: r.referred_user_id,
          referredUserEmail: r.referred_user_email,
          referredUserName: r.referred_user_name || r.referred_user_email?.split("@")[0] || "Farmer",
          paymentReference: r.payment_reference,
          planName: r.plan_name || "Starter",
          paymentAmount: Number(r.payment_amount) || 0,
          paymentType: r.payment_type || "first",
          commissionRate: Number(r.commission_rate) || 0.30,
          commissionAmount: Number(r.commission_amount) || 0,
          status: (r.status === "Paid" ? "Paid" : "Available"),
          paidDate: r.paid_date,
          createdAt: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
        };

        if (matchIdx >= 0) {
          mergedRewards[matchIdx] = formatted;
        } else {
          mergedRewards.unshift(formatted);
        }
      });

      saveAllReferralRewards(mergedRewards);
    }

    // 2. Fetch referred user profiles from Supabase & Remote Referral Registry
    let dbReferredProfiles: any[] = [];
    
    // First try SECURITY DEFINER RPC to bypass RLS
    try {
      const { data: rpcProfiles, error: rpcErr } = await supabase.rpc("get_user_referrals", {
        p_referrer_code: cleanCode,
        p_referrer_email: cleanEmail,
      });
      if (!rpcErr && Array.isArray(rpcProfiles)) {
        dbReferredProfiles = rpcProfiles;
      }
    } catch {}

    // Fallback or supplementary direct query on user_profiles
    try {
      const orClauses: string[] = [];
      userRefCodes.forEach(c => {
        if (c && c.length > 1) {
          orClauses.push(`referred_by.ilike.${c}`);
          orClauses.push(`referred_by.eq.${c}`);
        }
      });
      if (cleanEmail) orClauses.push(`referred_by.ilike.${cleanEmail}`);
      if (userId) orClauses.push(`referred_by.eq.${userId}`);

      if (orClauses.length > 0) {
        const { data: directProfiles } = await supabase
          .from("user_profiles")
          .select("*")
          .or(orClauses.join(","));
        if (Array.isArray(directProfiles) && directProfiles.length > 0) {
          const seenProfileIds = new Set(dbReferredProfiles.map(p => p.id || p.email));
          directProfiles.forEach(p => {
            const key = p.id || p.email;
            if (!seenProfileIds.has(key)) {
              dbReferredProfiles.push(p);
              seenProfileIds.add(key);
            }
          });
        }
      }
    } catch {}

    // Fetch remote referral registry from platform_settings
    const remoteRegistry = await fetchRemoteReferralRegistry();
    if (Array.isArray(remoteRegistry) && remoteRegistry.length > 0) {
      remoteRegistry.forEach(reg => {
        const regRef = (reg.referrerCode || "").toUpperCase().trim();
        const regRefEmail = (reg.referrerEmail || "").toLowerCase().trim();
        const isMatch = (regRef && userRefCodes.has(regRef)) ||
          (cleanEmail && regRefEmail === cleanEmail) ||
          (cleanEmail && regRef === cleanEmail.toUpperCase()) ||
          (userId && (regRef === userId.toUpperCase() || regRef === userId.toLowerCase()));

        if (isMatch) {
          const seenProfileIds = new Set(dbReferredProfiles.map(p => (p.email || p.id || "").toLowerCase()));
          const regKey = (reg.email || reg.id || "").toLowerCase();
          if (!seenProfileIds.has(regKey)) {
            dbReferredProfiles.push({
              id: reg.id,
              name: reg.name,
              email: reg.email,
              farm_name: reg.farmName || reg.name,
              active_plan: reg.activePlan,
              subscription_status: reg.subscriptionStatus,
              billing_frequency: reg.billingFrequency || "monthly",
              hasPaid: reg.hasPaid,
              subscription_amount: reg.paymentAmount,
              trial_start_date: reg.trialStartDate,
              paystack_reference: reg.paystackReference,
              referred_by: cleanCode,
              created_at: reg.createdAt,
            });
            seenProfileIds.add(regKey);
          }
        }
      });
    }

    // Fetch admin_user_overrides from platform_settings
    let adminOverrides: Record<string, any> = {};
    try {
      const { data: setRow } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "admin_user_overrides")
        .maybeSingle();
      if (setRow?.value && typeof setRow.value === "object") {
        adminOverrides = setRow.value;
      }
    } catch {}

    // Fetch actual farm names from farms table for all referred profiles
    const userFarmsMap = new Map<string, string>();
    const lookupUserIds = Array.from(new Set(dbReferredProfiles.map(p => p.id).filter(id => id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))));
    if (lookupUserIds.length > 0) {
      try {
        const { data: farmRows } = await supabase
          .from("farms")
          .select("user_id, name")
          .in("user_id", lookupUserIds)
          .order("created_at", { ascending: true });
        if (Array.isArray(farmRows)) {
          farmRows.forEach(f => {
            const fName = (f.name || "").trim();
            if (fName && fName.toLowerCase() !== "primary farm") {
              userFarmsMap.set(f.user_id, fName);
            } else if (!userFarmsMap.has(f.user_id) && fName) {
              userFarmsMap.set(f.user_id, fName);
            }
          });
        }
      } catch {}
    }

    const allLocalUsers = loadAllAdminUsers();
    let hasChanges = false;

    // A. Merge records from dbReferredProfiles
    if (Array.isArray(dbReferredProfiles) && dbReferredProfiles.length > 0) {
      dbReferredProfiles.forEach(p => {
        const pEmail = (p.email || "").toLowerCase().trim();
        // Prevent counting the user themselves as a referral
        if (pEmail && cleanEmail && pEmail === cleanEmail) return;
        if (p.id && userId && (p.id === userId || p.id.toLowerCase() === userId.toLowerCase())) return;

        const existingIdx = allLocalUsers.findIndex(u => (u.email || "").toLowerCase().trim() === pEmail || (p.id && u.id === p.id));
        const pOverride = (p.id && adminOverrides[p.id]) || (pEmail ? adminOverrides[pEmail] : null);
        
        const hasPaid = Boolean(
          pOverride?.hasPaid ||
          pOverride?.subscriptionStatus === "Active" ||
          p.hasPaid ||
          p.has_paid ||
          p.subscription_status === "Paid" ||
          p.subscription_status === "Active" ||
          (p.raw_data && (p.raw_data.hasPaid || p.raw_data.has_paid)) ||
          (p.paystack_reference && isValidPaystackRef(p.paystack_reference)) ||
          (p.paystackReference && isValidPaystackRef(p.paystackReference)) ||
          (p.last_payment_date && String(p.last_payment_date).trim() !== "") ||
          (p.lastPaymentDate && String(p.lastPaymentDate).trim() !== "")
        );

        if (hasPaid) {
          const userReward = mergedRewards.find(r => (r.referredUserEmail || "").toLowerCase().trim() === pEmail);
          if (!userReward) {
            const rawAmt = Number(p.subscription_amount || p.subscriptionAmount || pOverride?.subscriptionAmount);
            const price = rawAmt > 0 ? rawAmt : getStandardPlanPrice(p.active_plan || p.activePlan || pOverride?.activePlan || "Starter", p.billing_frequency || p.billingFrequency || pOverride?.billingFrequency);
            const commAmt = Math.round(price * 0.30);
            const pDate = p.last_payment_date || p.lastPaymentDate || pOverride?.lastPaymentDate || new Date().toISOString().slice(0, 10);
            const pRef = p.paystack_reference || p.paystackReference || pOverride?.paystackReference || `admin_paid_${(p.id || pEmail).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}_${pDate.replace(/[^0-9]/g, "").slice(0, 8)}`;
            const autoReward: ReferralReward = {
              id: "ref-rew-" + Math.random().toString(36).slice(2, 10),
              referrerCode: cleanCode,
              referrerEmail: cleanEmail,
              referredUserId: p.id,
              referredUserEmail: pEmail,
              referredUserName: p.name || pEmail.split("@")[0],
              paymentReference: pRef,
              planName: p.active_plan || p.activePlan || pOverride?.activePlan || "Starter",
              paymentAmount: price,
              paymentType: "first",
              commissionRate: 0.30,
              commissionAmount: commAmt,
              status: "Available",
              createdAt: pDate,
            };
            mergedRewards.unshift(autoReward);
            saveAllReferralRewards(mergedRewards);
            const cleanReferredId = p.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.id) ? p.id : null;
            supabase.from("referral_rewards").insert({
              referrer_code: cleanCode,
              referrer_email: cleanEmail,
              referred_user_id: cleanReferredId,
              referred_user_email: pEmail,
              referred_user_name: autoReward.referredUserName,
              payment_reference: pRef,
              plan_name: autoReward.planName,
              payment_amount: price,
              payment_type: "first",
              commission_rate: 0.30,
              commission_amount: commAmt,
              status: "Available",
            }).then(() => {}).catch(() => {});
          }
        }

        const rawFarmName = (p.id && userFarmsMap.get(p.id)) ||
          pOverride?.farmName ||
          p.farm_name ||
          p.farmName ||
          (existingIdx >= 0 ? allLocalUsers[existingIdx].farmName : null);

        const farmName = (!rawFarmName || rawFarmName.trim().toLowerCase() === "primary farm")
          ? (p.name ? `${p.name}'s Farm` : "Fish Farm")
          : rawFarmName.trim();

        if (existingIdx >= 0) {
          allLocalUsers[existingIdx] = {
            ...allLocalUsers[existingIdx],
            referredBy: cleanCode,
            name: p.name || allLocalUsers[existingIdx].name,
            farmName: farmName,
            activePlan: p.active_plan || p.activePlan || pOverride?.activePlan || allLocalUsers[existingIdx].activePlan,
            hasPaid: hasPaid || allLocalUsers[existingIdx].hasPaid,
            subscriptionStatus: (hasPaid || allLocalUsers[existingIdx].hasPaid) ? "Active" : allLocalUsers[existingIdx].subscriptionStatus,
            paystackReference: p.paystack_reference || p.paystackReference || pOverride?.paystackReference || allLocalUsers[existingIdx].paystackReference,
            lastPaymentDate: p.last_payment_date || p.lastPaymentDate || pOverride?.lastPaymentDate || allLocalUsers[existingIdx].lastPaymentDate,
          };
          hasChanges = true;
        } else {
          allLocalUsers.push({
            id: p.id || "usr-" + Math.random().toString(36).slice(2, 8),
            name: p.name || pEmail.split("@")[0] || "Farmer",
            email: pEmail,
            farmName: farmName,
            phone: p.phone || "",
            city: p.city || "Lagos",
            state: p.state || "Lagos",
            country: p.country || "Nigeria",
            role: p.role || "owner",
            activePlan: p.active_plan || p.activePlan || pOverride?.activePlan || "Starter",
            billingFrequency: p.billing_frequency || p.billingFrequency || pOverride?.billingFrequency || "monthly",
            subscriptionAmount: p.subscription_amount || p.subscriptionAmount || pOverride?.subscriptionAmount || null,
            hasPaid,
            subscriptionStatus: hasPaid ? "Active" : "Trial",
            trialStartDate: p.trial_start_date ? String(p.trial_start_date).slice(0, 10) : String(p.created_at || "").slice(0, 10),
            paystackReference: p.paystack_reference || p.paystackReference || pOverride?.paystackReference,
            lastPaymentDate: p.last_payment_date || p.lastPaymentDate || pOverride?.lastPaymentDate,
            referredBy: cleanCode,
            createdAt: p.created_at ? String(p.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
          });
          hasChanges = true;
        }
      });
    }

    // B. Also ensure any referred user found in dbRewards is represented in allLocalUsers
    if (Array.isArray(dbRewards) && dbRewards.length > 0) {
      dbRewards.forEach(r => {
        const rEmail = (r.referred_user_email || "").toLowerCase().trim();
        if (rEmail && cleanEmail && rEmail !== cleanEmail) {
          const existingIdx = allLocalUsers.findIndex(u => (u.email || "").toLowerCase().trim() === rEmail);
          const rOverride = (r.referred_user_id && adminOverrides[r.referred_user_id]) || (rEmail ? adminOverrides[rEmail] : null);
          const rawFarmName = (r.referred_user_id && userFarmsMap.get(r.referred_user_id)) ||
            rOverride?.farmName ||
            (existingIdx >= 0 ? allLocalUsers[existingIdx].farmName : null);
          const farmName = (!rawFarmName || rawFarmName.trim().toLowerCase() === "primary farm")
            ? (r.referred_user_name ? `${r.referred_user_name}'s Farm` : "Fish Farm")
            : rawFarmName.trim();

          if (existingIdx === -1) {
            allLocalUsers.push({
              id: r.referred_user_id || "usr-" + rEmail.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10),
              name: r.referred_user_name || rEmail.split("@")[0] || "Farmer",
              email: rEmail,
              farmName: farmName,
              phone: "",
              city: "Lagos",
              state: "Lagos",
              country: "Nigeria",
              role: "owner",
              activePlan: r.plan_name || "Starter",
              billingFrequency: "monthly",
              subscriptionStatus: "Active",
              hasPaid: true,
              trialStartDate: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
              paystackReference: r.payment_reference,
              lastPaymentDate: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
              referredBy: cleanCode,
              createdAt: r.created_at ? String(r.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10),
            });
            hasChanges = true;
          } else {
            let userUpdated = false;
            if (!allLocalUsers[existingIdx].hasPaid) {
              allLocalUsers[existingIdx].hasPaid = true;
              allLocalUsers[existingIdx].subscriptionStatus = "Active";
              userUpdated = true;
            }
            if (!allLocalUsers[existingIdx].farmName || allLocalUsers[existingIdx].farmName.toLowerCase() === "primary farm") {
              allLocalUsers[existingIdx].farmName = farmName;
              userUpdated = true;
            }
            if (userUpdated) hasChanges = true;
          }
        }
      });
    }

    // C. Re-sync local referred users to remote registry if missing
    const userReferredList = allLocalUsers.filter(u => {
      const uEmail = (u.email || "").toLowerCase().trim();
      if (uEmail && cleanEmail && uEmail === cleanEmail) return false;
      const refBy = (((u as any).referredBy || (u as any).referred_by || "") as string).trim().toUpperCase();
      return (
        userRefCodes.has(refBy) ||
        (cleanEmail && refBy === cleanEmail.toUpperCase()) ||
        (userId && (refBy === userId.toUpperCase() || refBy === userId.toLowerCase()))
      );
    });

    if (userReferredList.length > 0) {
      const mergedRemote = [...remoteRegistry];
      let remoteChanged = false;
      userReferredList.forEach(u => {
        const uEmail = (u.email || "").toLowerCase().trim();
        const existingRemIdx = mergedRemote.findIndex(
          r => (r.email || "").toLowerCase().trim() === uEmail || (u.id && r.id === u.id)
        );
        const remEntry: ReferralRegistryEntry = {
          id: u.id,
          name: u.name,
          email: uEmail,
          farmName: u.farmName,
          referrerCode: cleanCode,
          referrerEmail: user?.email || cleanCode,
          activePlan: u.activePlan,
          billingFrequency: u.billingFrequency,
          subscriptionStatus: u.subscriptionStatus,
          hasPaid: Boolean(u.hasPaid),
          paymentAmount: u.subscriptionAmount || undefined,
          paystackReference: u.paystackReference,
          trialStartDate: u.trialStartDate || undefined,
          createdAt: u.createdAt,
          updatedAt: new Date().toISOString(),
        };

        if (existingRemIdx >= 0) {
          mergedRemote[existingRemIdx] = { ...mergedRemote[existingRemIdx], ...remEntry };
          remoteChanged = true;
        } else {
          mergedRemote.push(remEntry);
          remoteChanged = true;
        }
      });

      if (remoteChanged) {
        saveRemoteReferralRegistry(mergedRemote).catch(() => {});
      }
    }

    if (hasChanges) {
      saveAllAdminUsers(allLocalUsers);
    }
  } catch (err) {
    console.warn("Live referral fetch from Supabase:", err);
  }

  return getUserReferralStats({ ...user, referralCode: cleanCode });
}

/**
 * Admin action: marks rewards as paid out to the user and clears their available balance
 */
export async function clearUserReferralBalance(referrerCodeOrEmail: string, referrerId?: string): Promise<{ count: number; amount: number }> {
  const clean = referrerCodeOrEmail.trim().toUpperCase();
  const cleanEmail = referrerCodeOrEmail.toLowerCase().trim();
  const cleanId = (referrerId || "").trim().toLowerCase();
  const allRewards = loadAllReferralRewards();

  let count = 0;
  let amount = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  const updated = allRewards.map(r => {
    const matchCode = (r.referrerCode || "").toUpperCase() === clean;
    const matchEmail = (r.referrerEmail || "").toLowerCase().trim() === cleanEmail;
    const matchId = cleanId && (r.referredUserId || "").toLowerCase() === cleanId;

    if ((matchCode || matchEmail || matchId) && r.status === "Available") {
      count++;
      amount += (r.commissionAmount || 0);
      return {
        ...r,
        status: "Paid" as const,
        paidDate: todayStr,
      };
    }
    return r;
  });

  if (count > 0) {
    saveAllReferralRewards(updated);
    
    // 1. Update Supabase via clear_user_referral_balance RPC
    try {
      await supabase.rpc("clear_user_referral_balance", {
        p_referrer_code: clean,
        p_referrer_email: cleanEmail,
      });
    } catch {}

    // 2. Fallback direct table update on Supabase referral_rewards table
    try {
      await supabase
        .from("referral_rewards")
        .update({ status: "Paid", paid_date: new Date().toISOString() })
        .or(`referrer_code.ilike.${clean},referrer_email.ilike.${cleanEmail}`)
        .eq("status", "Available");
    } catch {}

    logActivity(
      "Referral Payout Cleared",
      "system",
      `Paid out ₦${amount.toLocaleString()} (${count} rewards) to ${referrerCodeOrEmail}`,
      "admin"
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pondtora:referrals_updated"));
      window.dispatchEvent(new CustomEvent("pondtora:users_updated"));
    }
  }

  return { count, amount };
}

/**
 * Backward compatibility alias for marking rewards paid
 */
export function markReferralRewardsPaid(referrerCodeOrEmail: string, referrerId?: string): number {
  const clean = referrerCodeOrEmail.trim().toUpperCase();
  const cleanEmail = referrerCodeOrEmail.toLowerCase().trim();
  const allRewards = loadAllReferralRewards();

  let count = 0;
  let amount = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  const updated = allRewards.map(r => {
    if (
      ((r.referrerCode || "").toUpperCase() === clean || (r.referrerEmail || "").toLowerCase().trim() === cleanEmail) &&
      r.status === "Available"
    ) {
      count++;
      amount += (r.commissionAmount || 0);
      return {
        ...r,
        status: "Paid" as const,
        paidDate: todayStr,
      };
    }
    return r;
  });

  if (count > 0) {
    saveAllReferralRewards(updated);
    
    // Asynchronously sync to Supabase
    clearUserReferralBalance(referrerCodeOrEmail, referrerId).catch(() => {});
  }

  return count;
}

// Auto-listen for successful payments in browser
if (typeof window !== "undefined") {
  window.addEventListener("pondtora:payment_successful", ((e: CustomEvent) => {
    if (e.detail) {
      processReferralCommission({
        payerEmail: e.detail.email,
        payerName: e.detail.name,
        planName: e.detail.planName,
        amount: e.detail.amount,
        reference: e.detail.reference,
      });
    }
  }) as EventListener);
}

