import type { AdminUser } from "../admin/types";
import { loadAllAdminUsers, saveAllAdminUsers, logActivity } from "./userSync";
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
 * Generates a clean, readable referral code from user name or email and ID
 */
export function generateReferralCode(name?: string, email?: string, id?: string): string {
  const base = (name || email?.split("@")[0] || "USER")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
  const suffix = (id || Math.random().toString(36).slice(2, 6))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-4)
    .toUpperCase();
  return `${base || "FARM"}-${suffix || "1001"}`;
}

/**
 * Gets or sets the referral code for a user
 */
export function getUserReferralCode(user: { id?: string; name?: string; email?: string; referralCode?: string } | null): string {
  if (!user) return "PONDTORA-REF";
  if (user.referralCode && user.referralCode.trim()) return user.referralCode.trim().toUpperCase();

  // Check in AdminUsers list
  const cleanEmail = (user.email || "").toLowerCase().trim();
  const allUsers = loadAllAdminUsers();
  const found = allUsers.find(u => (u.email || "").toLowerCase().trim() === cleanEmail);
  if ((found as any)?.referralCode) {
    return (found as any).referralCode;
  }

  const generated = generateReferralCode(user.name, user.email, user.id);
  // Persist code if admin user exists
  if (found) {
    (found as any).referralCode = generated;
    saveAllAdminUsers(allUsers);
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
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveAllReferralRewards(rewards: ReferralReward[]) {
  try {
    localStorage.setItem(REFERRALS_STORAGE_KEY, JSON.stringify(rewards));
    window.dispatchEvent(new CustomEvent("pondtora:referrals_updated", { detail: rewards }));
  } catch {}
}

/**
 * Records a new user signup with their referring code
 */
export function attachReferralToNewUser(newUser: { id?: string; email: string; name?: string }, referrerCode?: string | null) {
  const code = (referrerCode || getPendingReferrerCode() || "").trim().toUpperCase();
  if (!code || !newUser.email) return;

  const cleanUserEmail = newUser.email.toLowerCase().trim();
  const allUsers = loadAllAdminUsers();

  const userIdx = allUsers.findIndex(u => (u.email || "").toLowerCase().trim() === cleanUserEmail);
  if (userIdx >= 0) {
    (allUsers[userIdx] as any).referredBy = code;
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

  // Clear pending referral after assigning
  clearPendingReferrerCode();
}

/**
 * Calculates standard plan price fallback if not stored
 */
function getStandardPlanPrice(planName: string): number {
  const clean = (planName || "").toLowerCase();
  if (clean.includes("commercial")) return 50000;
  if (clean.includes("growth") || clean.includes("pro")) return 25000;
  if (clean.includes("starter") || clean.includes("basic")) return 15000;
  return 15000;
}

/**
 * Processes commission when a payment occurs
 * - 30% for First Payment
 * - 10% for Recurring Payments
 */
export function processReferralCommission(params: {
  payerEmail: string;
  payerName?: string;
  planName: string;
  amount: number;
  reference: string;
}): ReferralReward | null {
  if (!params.payerEmail || params.amount <= 0) return null;

  const cleanPayerEmail = params.payerEmail.toLowerCase().trim();
  const allUsers = loadAllAdminUsers();
  const payerUser = allUsers.find(u => (u.email || "").toLowerCase().trim() === cleanPayerEmail);

  const referrerCode = (payerUser as any)?.referredBy || (payerUser as any)?.referred_by || getPendingReferrerCode();
  if (!referrerCode) return null;

  const cleanRefCode = referrerCode.trim().toUpperCase();

  // Find the referrer account
  const referrerUser = allUsers.find(u => {
    const uCode = ((u as any).referralCode || generateReferralCode(u.name, u.email, u.id)).toUpperCase();
    const uEmail = (u.email || "").toUpperCase();
    const uId = (u.id || "").toUpperCase();
    return uCode === cleanRefCode || uId === cleanRefCode || uEmail === cleanRefCode;
  });

  const allRewards = loadAllReferralRewards();

  // Check how many times this referred user has already generated commission
  const previousRewardsForPayer = allRewards.filter(
    r => (r.referredUserEmail || "").toLowerCase().trim() === cleanPayerEmail
  );

  const isFirstPayment = previousRewardsForPayer.length === 0;
  const commissionRate = isFirstPayment ? 0.30 : 0.10; // 30% 1st payment, 10% recurring
  const commissionAmount = Math.round(params.amount * commissionRate);

  const reward: ReferralReward = {
    id: "ref-rew-" + Math.random().toString(36).slice(2, 10),
    referrerCode: cleanRefCode,
    referrerEmail: referrerUser?.email || (cleanRefCode.includes("@") ? cleanRefCode : "referrer"),
    referredUserId: payerUser?.id,
    referredUserEmail: cleanPayerEmail,
    referredUserName: params.payerName || payerUser?.name || cleanPayerEmail.split("@")[0],
    paymentReference: params.reference,
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

  logActivity(
    "Referral Commission Earned",
    "subscription",
    `${referrerUser?.email || cleanRefCode} earned ₦${commissionAmount.toLocaleString()} (${isFirstPayment ? "30% 1st payment" : "10% recurring"}) from ${cleanPayerEmail}'s ${params.planName} payment (₦${params.amount.toLocaleString()})`,
    referrerUser?.email || "system"
  );

  return reward;
}

/**
 * Calculates user's referral summary & list of referred farmers
 */
export function getUserReferralStats(user: { id?: string; name?: string; email?: string; referralCode?: string } | null): ReferralStats {
  const code = getUserReferralCode(user);
  const cleanCode = code.toUpperCase();
  const cleanEmail = (user?.email || "").toLowerCase().trim();
  const userId = (user?.id || "").toUpperCase();

  const allUsers = loadAllAdminUsers();
  const allRewards = loadAllReferralRewards();

  // Find all users referred by this user
  const referredUsersList = allUsers.filter(u => {
    const refBy = (((u as any).referredBy || (u as any).referred_by || "") as string).trim().toUpperCase();
    if (!refBy) return false;
    return (
      refBy === cleanCode ||
      (cleanEmail && refBy === cleanEmail.toUpperCase()) ||
      (userId && refBy === userId)
    );
  });

  // Rewards for this user
  const myRewards = allRewards.filter(r => {
    const rRef = (r.referrerCode || "").toUpperCase();
    const rEmail = (r.referrerEmail || "").toLowerCase().trim();
    return (
      rRef === cleanCode ||
      (userId && rRef === userId) ||
      (cleanEmail && rEmail === cleanEmail)
    );
  });

  const totalEarnings = myRewards.reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const availableEarnings = myRewards
    .filter(r => r.status === "Available")
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);
  const paidOutEarnings = myRewards
    .filter(r => r.status === "Paid")
    .reduce((sum, r) => sum + (r.commissionAmount || 0), 0);

  const referredUsers: ReferredUserRecord[] = referredUsersList.map(u => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const userRewards = myRewards.filter(r => (r.referredUserEmail || "").toLowerCase().trim() === uEmail);
    const commTotal = userRewards.reduce((s, r) => s + (r.commissionAmount || 0), 0);

    const hasPaid = Boolean(
      u.hasPaid ||
      u.paystackReference ||
      u.lastPaymentDate ||
      userRewards.length > 0 ||
      (u.subscriptionStatus && u.subscriptionStatus.toLowerCase() === "active" && !u.freeAccess)
    );

    // Calculate trial days left (30-day free trial window)
    let trialDaysLeft = 0;
    let trialStatusText = "Trial Expired";

    if (!hasPaid) {
      const startRef = u.trialStartDate || u.createdAt;
      if (startRef) {
        const startDate = new Date(startRef);
        const now = new Date();
        const diffMs = now.getTime() - startDate.getTime();
        const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        trialDaysLeft = Math.max(0, 30 - daysElapsed);
        if (trialDaysLeft > 0) {
          trialStatusText = `Free Trial (${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left)`;
        } else {
          trialStatusText = "Free Trial (Ended)";
        }
      } else {
        trialDaysLeft = 30;
        trialStatusText = "Free Trial (30 days left)";
      }
    }

    // Payment Amount
    let paymentAmount = 0;
    if (userRewards.length > 0) {
      paymentAmount = userRewards.reduce((sum, r) => sum + (r.paymentAmount || 0), 0);
    } else if (hasPaid) {
      paymentAmount = u.subscriptionAmount || getStandardPlanPrice(u.activePlan || "Starter");
    }

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
    } else if (hasPaid && commTotal === 0) {
      const estimated = Math.round(paymentAmount * 0.30);
      commissionBreakdown = `30% 1st (₦${estimated.toLocaleString()})`;
    }

    return {
      id: u.id,
      name: u.name || uEmail.split("@")[0],
      email: u.email,
      farmName: u.farmName,
      createdAt: u.createdAt || "Recently",
      subscriptionStatus: hasPaid ? "Active" : (trialDaysLeft > 0 ? "Trial" : "Expired"),
      hasPaid,
      activePlan: u.activePlan || "Starter Plan",
      paymentAmount,
      trialDaysLeft,
      trialStatusText,
      totalCommission: commTotal,
      paymentCount: userRewards.length || (hasPaid ? 1 : 0),
      commissionBreakdown,
    };
  });

  const paidReferralsCount = referredUsers.filter(u => u.hasPaid || u.totalCommission > 0).length;
  const trialReferralsCount = referredUsers.filter(u => !u.hasPaid && u.totalCommission === 0).length;

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
 * Admin action: marks rewards as paid out to the user
 */
export function markReferralRewardsPaid(referrerCodeOrEmail: string): number {
  const clean = referrerCodeOrEmail.trim().toUpperCase();
  const cleanEmail = referrerCodeOrEmail.toLowerCase().trim();
  const allRewards = loadAllReferralRewards();

  let count = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  const updated = allRewards.map(r => {
    if (
      (r.referrerCode.toUpperCase() === clean || (r.referrerEmail || "").toLowerCase().trim() === cleanEmail) &&
      r.status === "Available"
    ) {
      count++;
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
    logActivity(
      "Referral Payout Completed",
      "system",
      `Paid out ${count} referral rewards for ${referrerCodeOrEmail}`,
      "admin"
    );
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
