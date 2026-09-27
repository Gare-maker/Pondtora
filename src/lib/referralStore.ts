import { supabase } from "./supabase";
import type { AdminUser } from "../admin/types";
import { loadAllAdminUsers, saveAllAdminUsers, logActivity } from "./userSync";

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
  totalCommission: number;
  paymentCount: number;
}

export interface ReferralStats {
  referralCode: string;
  referralLink: string;
  totalReferralsCount: number;
  paidReferralsCount: number;
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
  if (user.referralCode) return user.referralCode;

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
export function getReferralLink(code: string): string {
  if (typeof window === "undefined") return `https://app.pondtora.com/?ref=${code}`;
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
    const ref = urlParams.get("ref") || urlParams.get("referral") || urlParams.get("referrer");
    if (ref && ref.trim()) {
      const cleanRef = ref.trim().toUpperCase();
      localStorage.setItem(PENDING_REF_KEY, cleanRef);
      return cleanRef;
    }
  } catch {}
  return null;
}

export function getPendingReferrerCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PENDING_REF_KEY) || null;
  } catch {}
  return null;
}

export function clearPendingReferrerCode() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_REF_KEY);
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
  const code = referrerCode || getPendingReferrerCode();
  if (!code || !newUser.email) return;

  const cleanUserEmail = newUser.email.toLowerCase().trim();
  const allUsers = loadAllAdminUsers();

  const userIdx = allUsers.findIndex(u => (u.email || "").toLowerCase().trim() === cleanUserEmail);
  if (userIdx >= 0) {
    (allUsers[userIdx] as any).referredBy = code.toUpperCase();
    saveAllAdminUsers(allUsers);
  }

  // Clear pending referral after assigning
  clearPendingReferrerCode();
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

  const referrerCode = (payerUser as any)?.referredBy || getPendingReferrerCode();
  if (!referrerCode) return null;

  const cleanRefCode = referrerCode.trim().toUpperCase();

  // Find the referrer account
  const referrerUser = allUsers.find(u => {
    const uCode = ((u as any).referralCode || generateReferralCode(u.name, u.email, u.id)).toUpperCase();
    return uCode === cleanRefCode || (u.id && u.id.toUpperCase() === cleanRefCode);
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

  const allUsers = loadAllAdminUsers();
  const allRewards = loadAllReferralRewards();

  // Find all users referred by this user
  const referredUsersList = allUsers.filter(u => {
    const refBy = ((u as any).referredBy || "").trim().toUpperCase();
    return refBy === cleanCode || (user?.email && refBy === user.email.toUpperCase());
  });

  // Rewards for this user
  const myRewards = allRewards.filter(r => {
    return (
      r.referrerCode.toUpperCase() === cleanCode ||
      (cleanEmail && (r.referrerEmail || "").toLowerCase().trim() === cleanEmail)
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

    return {
      id: u.id,
      name: u.name || uEmail.split("@")[0],
      email: u.email,
      farmName: u.farmName,
      createdAt: u.createdAt || "Recently",
      subscriptionStatus: u.subscriptionStatus || "Trial",
      hasPaid: Boolean(u.hasPaid || userRewards.length > 0),
      totalCommission: commTotal,
      paymentCount: userRewards.length,
    };
  });

  const paidReferralsCount = referredUsers.filter(u => u.hasPaid || u.totalCommission > 0).length;

  return {
    referralCode: code,
    referralLink: getReferralLink(code),
    totalReferralsCount: referredUsers.length,
    paidReferralsCount,
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
