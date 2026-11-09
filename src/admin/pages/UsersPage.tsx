import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Plus, MoreVertical, Eye, Edit2, Ban, Trash2, CheckCircle,
  ChevronUp, ChevronDown, Download, Clock, Shield, Sparkles, Filter,
  RotateCw, RefreshCw, Phone, Mail, MapPin, Copy, ExternalLink, MessageCircle,
  Building, Droplets, Users as UsersIcon, X, Check, ArrowRight, UserCheck, AlertCircle,
  CreditCard, Gift, Tag, DollarSign, TrendingUp, Package, FileText, Layers, Fish, Activity,
  Calendar, RotateCcw, Wrench
} from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC, DateInput, ToggleCard, ToggleSwitch, toDateInputValue, getTodayDateStr, addDurationToDate } from "../../app/shared";
import type { AdminUser, AdminPlan, AccountStatus } from "../types";
import { fmtDate, trialDaysLeft, subscriptionDaysLeft, fmtMoney, computeSubscriptionStatus, effectivePrice } from "../types";
import { getLagosTodayStr, getLagosDateParts } from "../../app/data";
import { supabase } from "../../lib/supabase";
import { isStaffUser } from "../../lib/userSync";
import { getUserReferralStats, markReferralRewardsPaid, clearUserReferralBalance, syncReferralOnUserPayment, deleteReferralPayout, type ReferralPayoutRecord, type ReferralStats } from "../../lib/referralStore";
import { toast } from "sonner";

// Format date into Nigeria/Lagos YYYY-MM-DD
function toLocalYMD(dateVal: string | Date | undefined | null): string {
  if (!dateVal) return "";
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "";
  return getLagosTodayStr(d);
}

function getWhatsAppUrl(phone?: string, name?: string): string | null {
  if (!phone) return null;
  let clean = phone.replace(/[^0-9]/g, "");
  if (!clean) return null;
  if (clean.startsWith("0")) {
    clean = "234" + clean.slice(1);
  } else if (!clean.startsWith("234") && clean.length === 10) {
    clean = "234" + clean;
  }
  const msg = `Hello ${name || "there"}, this is Pondtora Support reaching out regarding your fish farm management account. How can we assist you today?`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

function copyToClipboard(text: string, label: string) {
  try {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  } catch {
    toast.error(`Could not copy ${label}`);
  }
}

function copyUserDossier(u: AdminUser, extra?: { farms: any[]; ponds: any[]; staff: any[]; revenues?: any[]; expenses?: any[] }) {
  if (!u) return;
  const totalFish = extra?.ponds && extra.ponds.length > 0
    ? extra.ponds.reduce((s, p) => s + (Number(p?.current_count ?? p?.currentCount ?? p?.initial_stock ?? p?.initialStock) || 0), 0)
    : (u.totalFishStocked || 0);
  const totalRev = extra?.revenues && extra.revenues.length > 0
    ? extra.revenues.reduce((s, r) => s + (Number(r?.amount) || 0), 0)
    : (u.totalRevenue || 0);
  const totalExp = extra?.expenses && extra.expenses.length > 0
    ? extra.expenses.reduce((s, e) => s + (Number(e?.amount) || 0), 0)
    : (u.totalExpenses || 0);
  const netProfit = totalRev - totalExp;

  const lines = [
    `*Pondtora Farmer Dossier*`,
    `----------------------------------------`,
    `Name: ${u.name || "Farmer"}`,
    `Email: ${u.email || "No email"}`,
    `Phone: ${u.phone || "Not provided"}`,
    `Farm Name: ${u.farmName || "Primary Farm"}`,
    `Location: ${[u.city, u.state, u.country].filter(Boolean).join(", ") || "Nigeria"}`,
    `Role: ${u.role || "Farm Owner"}`,
    `Account Status: ${u.accountStatus || "Active"}`,
    `Registration Date: ${fmtDate(u.createdAt)}`,
    ``,
    `*Subscription & Billing*`,
    `Plan: ${u.activePlan || "No Plan"} (${u.billingFrequency || "monthly"})`,
    `Status: ${u.subscriptionStatus || "Trial"}${u.freeAccess ? " (Complimentary VIP)" : ""}`,
    `Price Override: ${fmtMoney(u.subscriptionAmount)}`,
    `Trial Start: ${fmtDate(u.trialStartDate)} (${trialDaysLeft(u.trialStartDate)} days left)`,
    `Subscription Start: ${fmtDate(u.subscriptionStart)}`,
    `Subscription Expiry: ${fmtDate(u.subscriptionExpiry)}`,
    `Paystack Reference: ${u.paystackReference || "None"}`,
    `Last Payment Date: ${fmtDate(u.lastPaymentDate)}`,
    ``,
    `*Farm Operations & Financials*`,
    `Total Farms: ${extra?.farms?.length ?? u.farmCount ?? 1}`,
    `Total Ponds: ${extra?.ponds?.length ?? u.pondCount ?? 0}`,
    `Total Fish Stocked: ${totalFish.toLocaleString()}`,
    `Staff Members Added: ${extra?.staff?.length ?? u.staffCount ?? 0}`,
    `Total Revenue: ${fmtMoney(totalRev)}`,
    `Total Expenses: ${fmtMoney(totalExp)}`,
    `Net Profit: ${netProfit >= 0 ? fmtMoney(netProfit) : `-${fmtMoney(Math.abs(netProfit))}`}`,
  ];

  if (extra?.staff && extra.staff.length > 0) {
    lines.push(``, `*Staff Members Added:*`);
    extra.staff.forEach((s, idx) => {
      lines.push(`  ${idx + 1}. ${s?.name || "Staff"} (${s?.email || ""}) - ${s?.role || "Staff"} [${s?.status || "Active"}]`);
    });
  }

  if (extra?.farms && extra.farms.length > 0) {
    lines.push(``, `*Farms List:*`);
    extra.farms.forEach((f, idx) => {
      lines.push(`  ${idx + 1}. ${f?.name || "Farm"} - ${[f?.city, f?.state].filter(Boolean).join(", ") || "Nigeria"}`);
    });
  }

  if (extra?.ponds && extra.ponds.length > 0) {
    lines.push(``, `*Ponds Configured:*`);
    extra.ponds.forEach((p, idx) => {
      const cnt = Number(p?.current_count ?? p?.currentCount ?? p?.initial_stock ?? p?.initialStock) || 0;
      lines.push(`  ${idx + 1}. ${p?.name || `Pond #${idx + 1}`} — ${cnt.toLocaleString()} fish (${p?.species || "Catfish"})${p?.size_m2 || p?.sizeM2 ? ` [${p.size_m2 || p.sizeM2} m²]` : ""}`);
    });
  }

  const text = lines.join("\n");
  copyToClipboard(text, "User details dossier");
}

interface Props {
  users: AdminUser[];
  plans: AdminPlan[];
  onAdd: (u: Omit<AdminUser, "id">) => void;
  onUpdate: (u: AdminUser) => void;
  onDelete: (id: string) => void;
  onExportCSV?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  initialViewUser?: AdminUser | null;
  onClearInitialViewUser?: () => void;
}

type SortKey = "name" | "email" | "activePlan" | "subscriptionStatus" | "createdAt" | "subscriptionExpiry";

const STATUS_COLOR: Record<string, "green" | "amber" | "red" | "gray"> = {
  Active: "green",
  Trial: "amber",
  Expired: "red",
  Suspended: "gray",
  Cancelled: "gray",
};

const BLANK: Omit<AdminUser, "id"> = {
  name: "",
  email: "",
  farmName: "",
  phone: "",
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  activePlan: "Starter",
  trialStartDate: new Date().toISOString().slice(0, 10),
  billingFrequency: "monthly",
  subscriptionAmount: null,
  hasPaid: false,
  subscriptionStatus: "Trial",
  subscriptionStart: null,
  subscriptionExpiry: null,
  accountStatus: "Active",
  freeAccess: false,
};

function UserForm({
  f,
  setF,
  err,
  planNames,
}: {
  f: Partial<AdminUser>;
  setF: (x: Partial<AdminUser>) => void;
  err: Record<string, string>;
  planNames: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <F label="Full Name">
          <input
            value={f.name || ""}
            onChange={e => setF({ ...f, name: e.target.value })}
            className={IC + (err.name ? " !border-red-400" : "")}
            placeholder="e.g. John Doe"
          />
          {err.name && <p className="text-red-500 text-[11px] mt-0.5">{err.name}</p>}
        </F>
        <F label="Email Address">
          <input
            type="email"
            value={f.email || ""}
            onChange={e => setF({ ...f, email: e.target.value })}
            className={IC + (err.email ? " !border-red-400" : "")}
            placeholder="farmer@example.com"
          />
          {err.email && <p className="text-red-500 text-[11px] mt-0.5">{err.email}</p>}
        </F>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Farm Name">
          <input
            value={f.farmName || ""}
            onChange={e => setF({ ...f, farmName: e.target.value })}
            className={IC}
            placeholder="e.g. Green Valley Farm"
          />
        </F>
        <F label="Phone Number">
          <input
            value={f.phone || ""}
            onChange={e => setF({ ...f, phone: e.target.value })}
            className={IC}
            placeholder="+234 800 000 0000"
          />
        </F>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Active Plan">
          <select
            value={f.activePlan || ""}
            onChange={e => setF({ ...f, activePlan: e.target.value || null })}
            className={SC}
          >
            <option value="">— No Plan / Free —</option>
            {planNames.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </F>
        <F label="Billing Frequency">
          <select
            value={f.billingFrequency || "monthly"}
            onChange={e => setF({ ...f, billingFrequency: e.target.value as any })}
            className={SC}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </F>
      </div>

      {/* Free access toggle */}
      <ToggleCard
        checked={Boolean(f.freeAccess)}
        onChange={val => setF({ ...f, freeAccess: val })}
        title="Complimentary VIP / Free Access"
        description="Exempt user from all billing while keeping active status permanently."
        activeBadge="VIP Active"
        inactiveBadge="Standard"
        icon={<Sparkles size={15} />}
        activeColor="emerald"
      />

      <div className="grid grid-cols-2 gap-3">
        <F label="Special / Personal Price (₦ Override)">
          <input
            type="number"
            value={f.subscriptionAmount ?? ""}
            onChange={e => setF({ ...f, subscriptionAmount: e.target.value ? Number(e.target.value) : null })}
            className={IC}
            placeholder="Plan default"
          />
        </F>
        <F label="Trial Start Date">
          <DateInput
            value={f.trialStartDate}
            onChange={val => setF({ ...f, trialStartDate: val || null })}
            placeholder="Select trial start"
            presets={[
              { label: "Today", onClick: () => setF({ ...f, trialStartDate: getTodayDateStr() }) },
            ]}
          />
        </F>
      </div>

      {/* Paystack Payment & Reference */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <CreditCard size={13} className="text-emerald-600" /> Paystack Transaction &amp; Verification
        </p>
        <div className="grid grid-cols-2 gap-3">
          <F label="Paystack Reference">
            <input
              type="text"
              value={f.paystackReference || ""}
              onChange={e => setF({ ...f, paystackReference: e.target.value || undefined })}
              className={IC}
              placeholder="e.g. PND_1727720934"
            />
          </F>
          <F label="Last Payment Date">
            <DateInput
              value={f.lastPaymentDate}
              onChange={val => setF({ ...f, lastPaymentDate: val || undefined })}
              placeholder="Payment date"
              presets={[
                { label: "Today", onClick: () => setF({ ...f, lastPaymentDate: getTodayDateStr() }) },
                { label: "Clear", onClick: () => setF({ ...f, lastPaymentDate: undefined }) },
              ]}
            />
          </F>
        </div>
        <div
          onClick={() => setF({ ...f, hasPaid: !f.hasPaid })}
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
            f.hasPaid ? "bg-emerald-50/70 border-emerald-300" : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <div>
            <p className={`text-xs font-semibold ${f.hasPaid ? "text-emerald-950 font-bold" : "text-slate-700"}`}>
              Mark as Verified Paid
            </p>
            <p className="text-[10px] text-slate-400">
              Activates paid subscriber status immediately
            </p>
          </div>
          <ToggleSwitch
            checked={Boolean(f.hasPaid)}
            onChange={val => setF({ ...f, hasPaid: val })}
            size="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Subscription Start">
          <DateInput
            value={f.subscriptionStart}
            onChange={val => setF({ ...f, subscriptionStart: val || null })}
            placeholder="Start date"
            presets={[
              { label: "Today", onClick: () => setF({ ...f, subscriptionStart: getTodayDateStr() }) },
            ]}
          />
        </F>
        <F label="Subscription Expiry">
          <DateInput
            value={f.subscriptionExpiry}
            onChange={val => setF({ ...f, subscriptionExpiry: val || null })}
            placeholder="Expiry date"
            presets={[
              { label: "+1 Mo", onClick: () => setF({ ...f, subscriptionExpiry: addDurationToDate(f.subscriptionStart || getTodayDateStr(), "1month") }) },
              { label: "+1 Yr", onClick: () => setF({ ...f, subscriptionExpiry: addDurationToDate(f.subscriptionStart || getTodayDateStr(), "1year") }) },
            ]}
          />
        </F>
      </div>

      <F label="Account Status">
        <select
          value={f.accountStatus || "Active"}
          onChange={e => setF({ ...f, accountStatus: e.target.value as any })}
          className={SC}
        >
          <option value="Active">Active</option>
          <option value="Suspended">Suspended (Block Login)</option>
        </select>
      </F>
    </div>
  );
}

interface ActiveMenu {
  user: AdminUser;
  top?: number;
  bottom?: number;
  right: number;
}

function ClearanceHistorySection({
  payouts,
  paidOutEarnings,
  onDeletePayout,
}: {
  payouts?: ReferralPayoutRecord[];
  paidOutEarnings: number;
  onDeletePayout?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mt-3.5 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-amber-600" />
          <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            Clearance History
            {payouts && payouts.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full font-mono">
                {payouts.length}
              </span>
            )}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {paidOutEarnings > 0 && (
            <span className="text-[11px] font-semibold text-slate-500">
              Total Settled: <strong className="text-emerald-700 font-bold font-mono">₦{paidOutEarnings.toLocaleString()}</strong>
            </span>
          )}
          {payouts && payouts.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-medium ml-1"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>

      {!payouts || payouts.length === 0 ? (
        <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-xl p-3 text-center">
          <p className="text-xs font-semibold text-slate-600">No clearance history yet</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            When you click &ldquo;Clear Balance (Paid)&rdquo;, payouts will be recorded here with settlement timestamps and audit trails.
          </p>
        </div>
      ) : (
        expanded && (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100 bg-white">
            <div className="bg-slate-50/80 px-3 py-1.5 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              <span className="col-span-4 sm:col-span-3">Date & Time</span>
              <span className="col-span-3 sm:col-span-2 text-right">Amount</span>
              <span className="col-span-2 text-center hidden sm:block">Method</span>
              <span className="col-span-2 hidden sm:block">Cleared By</span>
              <span className="col-span-3 sm:col-span-2 text-center">Status</span>
              <span className="col-span-2 sm:col-span-1 text-center">Action</span>
            </div>
            {payouts.map((p) => {
              const formattedDate = (() => {
                try {
                  const d = new Date(p.clearedAt);
                  return d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                } catch {
                  return p.clearedAt;
                }
              })();

              return (
                <div key={p.id} className="px-3 py-2 grid grid-cols-12 gap-2 items-center text-xs hover:bg-slate-50/60 transition-colors">
                  <div className="col-span-4 sm:col-span-3 min-w-0">
                    <span className="font-semibold text-slate-700 text-[11px] block truncate">
                      {formattedDate}
                    </span>
                    {p.notes && (
                      <span className="text-[10px] text-slate-400 block truncate" title={p.notes}>
                        {p.notes}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right font-bold text-emerald-700 font-mono text-xs">
                    ₦{p.amount.toLocaleString()}
                  </div>
                  <div className="col-span-2 text-center hidden sm:block">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {p.paymentMethod || "Bank Transfer"}
                    </span>
                  </div>
                  <div className="col-span-2 truncate text-[11px] text-slate-600 hidden sm:block">
                    {p.clearedBy || "Admin"}
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-center">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle size={10} className="text-emerald-600" />
                      {p.status || "Paid"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-center">
                    {onDeletePayout && (
                      <button
                        type="button"
                        onClick={() => onDeletePayout(p.id)}
                        className="text-slate-300 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove clearance record (reverts available balance)"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

export default function UsersPage({ users, plans, onAdd, onUpdate, onDelete, onExportCSV, onRefresh, isRefreshing, initialViewUser, onClearInitialViewUser }: Props) {
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterRole, setFilterRole] = useState("All");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [menu, setMenu] = useState<ActiveMenu | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [delUser, setDelUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<Partial<AdminUser>>({ ...BLANK });
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [farmerDataTab, setFarmerDataTab] = useState<
    "summary" | "ponds" | "feed" | "feeding" | "sales" | "finance" | "health_equipment" | "staff_investors"
  >("summary");
  const [farmDateFilter, setFarmDateFilter] = useState<"all" | "today" | "month" | "year" | "custom">("all");
  const [farmCustomStart, setFarmCustomStart] = useState("");
  const [farmCustomEnd, setFarmCustomEnd] = useState("");
  const [selectedFarmFilterId, setSelectedFarmFilterId] = useState<string>("all");
  const [referralRefreshNonce, setReferralRefreshNonce] = useState(0);

  useEffect(() => {
    if (initialViewUser) {
      setViewUser(initialViewUser);
      setFarmerDataTab("summary");
      setSelectedFarmFilterId("all");
      onClearInitialViewUser?.();
    }
  }, [initialViewUser, onClearInitialViewUser]);

  useEffect(() => {
    const onRefUpdated = () => setReferralRefreshNonce(n => n + 1);
    window.addEventListener("pondtora:referrals_updated", onRefUpdated);
    window.addEventListener("pondtora:payouts_updated", onRefUpdated);
    return () => {
      window.removeEventListener("pondtora:referrals_updated", onRefUpdated);
      window.removeEventListener("pondtora:payouts_updated", onRefUpdated);
    };
  }, []);

  const handleClearReferralBalance = async (rStats: ReferralStats) => {
    if (!viewUser) return;
    if (window.confirm(`Clear available referral balance of ₦${rStats.availableEarnings.toLocaleString()} for ${viewUser.name || viewUser.email} (paid via bank transfer)?`)) {
      const res = await clearUserReferralBalance(
        rStats.referralCode || viewUser.email || "",
        viewUser.id,
        "Admin",
        rStats.availableEarnings
      );
      setReferralRefreshNonce(n => n + 1);
      toast.success(`Cleared ₦${res.amount.toLocaleString()} available referral balance and recorded clearance history!`);
    }
  };

  const handleDeleteReferralPayout = async (payoutId: string) => {
    if (window.confirm("Are you sure you want to delete this clearance record? This will revert the cleared amount back to Available Payout.")) {
      await deleteReferralPayout(payoutId);
      setReferralRefreshNonce(n => n + 1);
      toast.success("Clearance record removed and balance reverted.");
    }
  };

  const [userExtra, setUserExtra] = useState<{
    loading: boolean;
    farms: any[];
    ponds: any[];
    stockEvents: any[];
    mortalityEntries: any[];
    feedInventory: any[];
    feedingRecords: any[];
    bagOpenLogs: any[];
    feedRemainingLogs: any[];
    salesCalculations: any[];
    salesPayments: any[];
    revenues: any[];
    expenses: any[];
    invoices: any[];
    treatments: any[];
    pondReports: any[];
    generalReports: any[];
    equipment: any[];
    staff: any[];
    investors: any[];
    investments: any[];
  }>({
    loading: false,
    farms: [],
    ponds: [],
    stockEvents: [],
    mortalityEntries: [],
    feedInventory: [],
    feedingRecords: [],
    bagOpenLogs: [],
    feedRemainingLogs: [],
    salesCalculations: [],
    salesPayments: [],
    revenues: [],
    expenses: [],
    invoices: [],
    treatments: [],
    pondReports: [],
    generalReports: [],
    equipment: [],
    staff: [],
    investors: [],
    investments: [],
  });

  // Fast in-memory cache to make re-opening or switching users instant
  const userExtraCacheRef = useRef<Map<string, any>>(new Map());

  // Synchronous extractor for instant data display
  const getSynchronousUserExtra = (u: AdminUser | null) => {
    if (!u) {
      return {
        loading: false,
        farms: [],
        ponds: [],
        stockEvents: [],
        mortalityEntries: [],
        feedInventory: [],
        feedingRecords: [],
        bagOpenLogs: [],
        feedRemainingLogs: [],
        salesCalculations: [],
        salesPayments: [],
        revenues: [],
        expenses: [],
        invoices: [],
        treatments: [],
        pondReports: [],
        generalReports: [],
        equipment: [],
        staff: [],
        investors: [],
        investments: [],
      };
    }

    if (userExtraCacheRef.current.has(u.id)) {
      return { ...userExtraCacheRef.current.get(u.id), loading: false };
    }
    if (u.email && userExtraCacheRef.current.has(u.email)) {
      return { ...userExtraCacheRef.current.get(u.email), loading: false };
    }

    // 1. Check unified localStorage cache written by api.loadAll() (`pondtora_${uid}_cache`)
    let cachedBundle: any = null;
    try {
      const rawCache = localStorage.getItem(`pondtora_${u.id}_cache`);
      if (rawCache) cachedBundle = JSON.parse(rawCache);
    } catch {}

    let localFarms: any[] = Array.isArray(cachedBundle?.farms) ? [...cachedBundle.farms] : [];
    let localPonds: any[] = Array.isArray(cachedBundle?.ponds) ? [...cachedBundle.ponds] : [];
    let localStockEvents: any[] = Array.isArray(cachedBundle?.stockEvents) ? [...cachedBundle.stockEvents] : [];
    let localMortalityEntries: any[] = Array.isArray(cachedBundle?.mortalityEntries) ? [...cachedBundle.mortalityEntries] : [];
    let localStaff: any[] = Array.isArray(cachedBundle?.staffMembers) ? [...cachedBundle.staffMembers] : [];
    let localFeed: any[] = Array.isArray(cachedBundle?.feedInventory) ? [...cachedBundle.feedInventory] : [];
    let localFeeding: any[] = Array.isArray(cachedBundle?.feedingRecords) ? [...cachedBundle.feedingRecords] : [];
    let localBagOpenLogs: any[] = Array.isArray(cachedBundle?.bagOpenLogs) ? [...cachedBundle.bagOpenLogs] : [];
    let localFeedRemainingLogs: any[] = Array.isArray(cachedBundle?.feedRemainingLogs) ? [...cachedBundle.feedRemainingLogs] : [];
    let localSalesCalculations: any[] = Array.isArray(cachedBundle?.salesCalculations) ? [...cachedBundle.salesCalculations] : [];
    let localSalesPayments: any[] = [];
    let localRevenues: any[] = Array.isArray(cachedBundle?.revenues) ? [...cachedBundle.revenues] : [];
    let localExpenses: any[] = Array.isArray(cachedBundle?.expenses) ? [...cachedBundle.expenses] : [];
    let localInvoices: any[] = Array.isArray(cachedBundle?.invoices) ? [...cachedBundle.invoices] : [];
    let localTreatments: any[] = Array.isArray(cachedBundle?.treatmentRecords) ? [...cachedBundle.treatmentRecords] : [];
    let localPondReports: any[] = Array.isArray(cachedBundle?.pondReports) ? [...cachedBundle.pondReports] : [];
    let localGeneralReports: any[] = Array.isArray(cachedBundle?.reports) ? [...cachedBundle.reports] : [];
    let localEquipment: any[] = Array.isArray(cachedBundle?.farmEquipment) ? [...cachedBundle.farmEquipment] : [];
    let localInvestors: any[] = Array.isArray(cachedBundle?.investors) ? [...cachedBundle.investors] : [];
    let localInvestments: any[] = Array.isArray(cachedBundle?.investments) ? [...cachedBundle.investments] : [];

    const matchesUser = (item: any) => {
      if (!item) return false;
      return item.user_id === u.id || item.userId === u.id || item.owner_id === u.id ||
             (u.email && (item.user_email === u.email || item.email === u.email));
    };

    const getItemsFromScopedAndSharedKeys = (sharedKeys: string[], scopedKeys: string[]) => {
      let combined: any[] = [];
      for (const k of scopedKeys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) combined.push(...parsed);
          }
        } catch {}
      }
      for (const k of sharedKeys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) combined.push(...parsed.filter(matchesUser));
          }
        } catch {}
      }
      return combined;
    };

    if (localFarms.length === 0) {
      localFarms = getItemsFromScopedAndSharedKeys(["pondtora_farms"], [`pondtora_${u.id}_farms`, ...(u.email ? [`pondtora_${u.email}_farms`] : [])]);
    }
    if (localPonds.length === 0) {
      localPonds = getItemsFromScopedAndSharedKeys(["pondtora_ponds"], [`pondtora_${u.id}_ponds`, ...(u.email ? [`pondtora_${u.email}_ponds`] : [])]);
    }
    if (localStaff.length === 0) {
      localStaff = getItemsFromScopedAndSharedKeys(["pondtora_staff"], [`pondtora_${u.id}_staff`, ...(u.email ? [`pondtora_${u.email}_staff`] : [])]);
    }
    if (localFeed.length === 0) {
      localFeed = getItemsFromScopedAndSharedKeys(["pondtora_feed_inventory", "pondtora_feeds"], [`pondtora_${u.id}_feed_inventory`, ...(u.email ? [`pondtora_${u.email}_feed_inventory`] : [])]);
    }
    if (localFeeding.length === 0) {
      localFeeding = getItemsFromScopedAndSharedKeys(["pondtora_feeding_records"], [`pondtora_${u.id}_feeding_records`, ...(u.email ? [`pondtora_${u.email}_feeding_records`] : [])]);
    }
    if (localSalesCalculations.length === 0) {
      localSalesCalculations = getItemsFromScopedAndSharedKeys(["pondtora_sales_calculations"], [`pondtora_${u.id}_sales_calculations`, ...(u.email ? [`pondtora_${u.email}_sales_calculations`] : [])]);
    }
    if (localInvoices.length === 0) {
      localInvoices = getItemsFromScopedAndSharedKeys(["pondtora_invoices"], [`pondtora_${u.id}_invoices`, ...(u.email ? [`pondtora_${u.email}_invoices`] : [])]);
    }
    if (localRevenues.length === 0) {
      localRevenues = getItemsFromScopedAndSharedKeys(["pondtora_revenues"], [`pondtora_${u.id}_revenues`, ...(u.email ? [`pondtora_${u.email}_revenues`] : [])]);
    }
    if (localExpenses.length === 0) {
      localExpenses = getItemsFromScopedAndSharedKeys(["pondtora_expenses"], [`pondtora_${u.id}_expenses`, ...(u.email ? [`pondtora_${u.email}_expenses`] : [])]);
    }

    if (localFarms.length === 0 && (u.farmCount || u.farmName)) {
      const resolvedName = (u.farmName && u.farmName.trim().toLowerCase() !== "primary farm")
        ? u.farmName.trim()
        : (u.name ? `${u.name}'s Farm` : "Fish Farm");
      localFarms = [{ id: `farm-${u.id}`, name: resolvedName, city: u.city, state: u.state, country: u.country }];
    }

    return {
      loading: false,
      farms: localFarms,
      ponds: localPonds,
      stockEvents: localStockEvents,
      mortalityEntries: localMortalityEntries,
      feedInventory: localFeed,
      feedingRecords: localFeeding,
      bagOpenLogs: localBagOpenLogs,
      feedRemainingLogs: localFeedRemainingLogs,
      salesCalculations: localSalesCalculations,
      salesPayments: localSalesPayments,
      revenues: localRevenues,
      expenses: localExpenses,
      invoices: localInvoices,
      treatments: localTreatments,
      pondReports: localPondReports,
      generalReports: localGeneralReports,
      equipment: localEquipment,
      staff: localStaff,
      investors: localInvestors,
      investments: localInvestments,
    };
  };

  useEffect(() => {
    if (!viewUser?.id) {
      setUserExtra(getSynchronousUserExtra(null));
      return;
    }

    // 1. Immediately provide cached/seeded data so modal opens in 0ms with non-zero counts
    const initialSync = getSynchronousUserExtra(viewUser);
    setUserExtra({ ...initialSync, loading: true });

    let isSubscribed = true;

    const pickArray = (...candidates: any[][]) => {
      for (const c of candidates) {
        if (Array.isArray(c) && c.length > 0) return c;
      }
      return [];
    };

    const mergeById = (arrA: any[], arrB: any[]) => {
      const a = Array.isArray(arrA) ? arrA : [];
      const b = Array.isArray(arrB) ? arrB : [];
      if (a.length === 0) return b;
      if (b.length === 0) return a;
      const map = new Map<string, any>();
      b.forEach((item, idx) => map.set(String(item?.id || `b-${idx}`), item));
      a.forEach((item, idx) => map.set(String(item?.id || `a-${idx}`), item));
      return Array.from(map.values());
    };

    // 2. Fetch live data in background combining RPC + direct farm-aware table queries
    const fetchLiveData = async () => {
      let rpcBundle: any = null;

      // Try security-definer RPC first (using correct p_user_id parameter, with fallback to target_user_id)
      try {
        const res1 = await (supabase.rpc as any)("get_user_full_records_for_admin", {
          p_user_id: viewUser.id,
        });
        if (!res1.error && res1.data && typeof res1.data === "object") {
          rpcBundle = res1.data;
        } else {
          const res2 = await (supabase.rpc as any)("get_user_full_records_for_admin", {
            target_user_id: viewUser.id,
            target_email: viewUser.email || null,
          });
          if (!res2.error && res2.data && typeof res2.data === "object") {
            rpcBundle = res2.data;
          }
        }
      } catch (e) {
        console.warn("RPC get_user_full_records_for_admin note:", e);
      }

      if (rpcBundle && isSubscribed) {
        const fastFromRpc = {
          loading: true,
          farms: pickArray(rpcBundle.farms, initialSync.farms),
          ponds: pickArray(rpcBundle.ponds, initialSync.ponds),
          stockEvents: pickArray(rpcBundle.stock_events, rpcBundle.stockEvents, initialSync.stockEvents),
          mortalityEntries: pickArray(rpcBundle.mortality_entries, rpcBundle.mortalityEntries, initialSync.mortalityEntries),
          feedInventory: pickArray(rpcBundle.feed_inventory, rpcBundle.feedInventory, initialSync.feedInventory),
          feedingRecords: pickArray(rpcBundle.feeding_records, rpcBundle.feedingRecords, initialSync.feedingRecords),
          bagOpenLogs: pickArray(rpcBundle.bag_open_logs, rpcBundle.bagOpenLogs, initialSync.bagOpenLogs),
          feedRemainingLogs: pickArray(rpcBundle.feed_remaining_logs, rpcBundle.feedRemainingLogs, initialSync.feedRemainingLogs),
          salesCalculations: pickArray(rpcBundle.sales_calculations, rpcBundle.salesCalculations, initialSync.salesCalculations),
          salesPayments: pickArray(rpcBundle.sales_payments, rpcBundle.salesPayments, initialSync.salesPayments),
          revenues: pickArray(rpcBundle.revenues, initialSync.revenues),
          expenses: pickArray(rpcBundle.expenses, initialSync.expenses),
          invoices: pickArray(rpcBundle.invoices, initialSync.invoices),
          treatments: pickArray(rpcBundle.treatment_records, rpcBundle.treatments, initialSync.treatments),
          pondReports: pickArray(rpcBundle.pond_reports, rpcBundle.pondReports, initialSync.pondReports),
          generalReports: pickArray(rpcBundle.reports, rpcBundle.generalReports, initialSync.generalReports),
          equipment: pickArray(rpcBundle.farm_equipment, rpcBundle.equipment, initialSync.equipment),
          staff: pickArray(rpcBundle.staff_members, rpcBundle.staff, initialSync.staff),
          investors: pickArray(rpcBundle.investors, initialSync.investors),
          investments: pickArray(rpcBundle.investments, initialSync.investments),
        };
        setUserExtra(fastFromRpc);
      }

      // Also run direct table queries (scoped to both user_id AND all of the user's farm_ids so staff-logged records are included)
      const timeoutPromise = new Promise<{ isTimeout: true }>(resolve =>
        setTimeout(() => resolve({ isTimeout: true }), 12000)
      );

      const directWorkPromise = (async () => {
        const farmsRes = await supabase
          .from("farms")
          .select("*")
          .eq("user_id", viewUser.id)
          .order("created_at", { ascending: true });

        const knownFarms = mergeById(farmsRes.data || [], rpcBundle?.farms || []);
        const farmIds = knownFarms
          .map((f: any) => f?.id)
          .filter((id: any) => typeof id === "string" && id.length > 0 && !id.startsWith("farm-"));

        const userOrFarmFilter = farmIds.length > 0
          ? `user_id.eq.${viewUser.id},farm_id.in.(${farmIds.join(",")})`
          : `user_id.eq.${viewUser.id}`;

        const settled = await Promise.allSettled([
          supabase.from("ponds").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("stock_events").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("mortality_entries").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("feed_inventory").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("feeding_records").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("bag_open_logs").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("feed_remaining_logs").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("sales_calculations").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("sales_calculation_payments").select("*").order("created_at", { ascending: false }),
          supabase.from("revenues").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("expenses").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("invoices").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("treatment_records").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("pond_reports").select("*").or(userOrFarmFilter).order("report_date", { ascending: false }),
          supabase.from("reports").select("*").or(userOrFarmFilter).order("date", { ascending: false }),
          supabase.from("farm_equipment").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("staff_members").select("*").eq("user_id", viewUser.id).order("created_at", { ascending: false }),
          supabase.from("investors").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
          supabase.from("investments").select("*").or(userOrFarmFilter).order("created_at", { ascending: false }),
        ]);

        return { farmsRes, settled };
      })();

      const result = await Promise.race([directWorkPromise, timeoutPromise]);
      if (!isSubscribed) return;

      if ("isTimeout" in result) {
        setUserExtra(prev => ({ ...prev, loading: false }));
        return;
      }

      const { farmsRes, settled } = result;
      const [
        pondsRes, stockRes, mortRes, feedRes, feedingRes, bagRes, remRes,
        salesRes, paymentsRes, revRes, expRes, invRes, treatRes, repRes, genRepRes, equipRes, staffRes, investRes, investmentRes
      ] = settled;

      const extract = (res: PromiseSettledResult<any>, rpcArr: any[], fallback: any[]) => {
        const directRows = (res.status === "fulfilled" && Array.isArray(res.value?.data)) ? res.value.data : [];
        const merged = mergeById(directRows, rpcArr || []);
        return merged.length > 0 ? merged : fallback;
      };

      const mergedSales = extract(salesRes, rpcBundle?.sales_calculations || rpcBundle?.salesCalculations, initialSync.salesCalculations);
      const userCalcIds = new Set(mergedSales.map((s: any) => s?.id).filter(Boolean));
      const rawPayments = extract(paymentsRes, rpcBundle?.sales_payments || rpcBundle?.salesPayments, initialSync.salesPayments);
      const filteredPayments = rawPayments.filter(
        (p: any) => p?.user_id === viewUser.id || (p?.calculation_id && userCalcIds.has(p.calculation_id))
      );

      const updated = {
        loading: false,
        farms: mergeById(farmsRes.data || [], rpcBundle?.farms || []).length > 0
          ? mergeById(farmsRes.data || [], rpcBundle?.farms || [])
          : initialSync.farms,
        ponds: extract(pondsRes, rpcBundle?.ponds, initialSync.ponds),
        stockEvents: extract(stockRes, rpcBundle?.stock_events || rpcBundle?.stockEvents, initialSync.stockEvents),
        mortalityEntries: extract(mortRes, rpcBundle?.mortality_entries || rpcBundle?.mortalityEntries, initialSync.mortalityEntries),
        feedInventory: extract(feedRes, rpcBundle?.feed_inventory || rpcBundle?.feedInventory, initialSync.feedInventory),
        feedingRecords: extract(feedingRes, rpcBundle?.feeding_records || rpcBundle?.feedingRecords, initialSync.feedingRecords),
        bagOpenLogs: extract(bagRes, rpcBundle?.bag_open_logs || rpcBundle?.bagOpenLogs, initialSync.bagOpenLogs),
        feedRemainingLogs: extract(remRes, rpcBundle?.feed_remaining_logs || rpcBundle?.feedRemainingLogs, initialSync.feedRemainingLogs),
        salesCalculations: mergedSales,
        salesPayments: filteredPayments,
        revenues: extract(revRes, rpcBundle?.revenues, initialSync.revenues),
        expenses: extract(expRes, rpcBundle?.expenses, initialSync.expenses),
        invoices: extract(invRes, rpcBundle?.invoices, initialSync.invoices),
        treatments: extract(treatRes, rpcBundle?.treatment_records || rpcBundle?.treatments, initialSync.treatments),
        pondReports: extract(repRes, rpcBundle?.pond_reports || rpcBundle?.pondReports, initialSync.pondReports),
        generalReports: extract(genRepRes, rpcBundle?.reports || rpcBundle?.generalReports, initialSync.generalReports),
        equipment: extract(equipRes, rpcBundle?.farm_equipment || rpcBundle?.equipment, initialSync.equipment),
        staff: extract(staffRes, rpcBundle?.staff_members || rpcBundle?.staff, initialSync.staff),
        investors: extract(investRes, rpcBundle?.investors, initialSync.investors),
        investments: extract(investmentRes, rpcBundle?.investments, initialSync.investments),
      };

      userExtraCacheRef.current.set(viewUser.id, updated);
      if (viewUser.email) userExtraCacheRef.current.set(viewUser.email, updated);

      setUserExtra(updated);
    };

    fetchLiveData().catch(err => {
      if (!isSubscribed) return;
      console.warn("Could not load full user records:", err);
      setUserExtra(prev => ({ ...prev, loading: false }));
    });

    return () => {
      isSubscribed = false;
    };
  }, [viewUser?.id, viewUser?.email]);

  useEffect(() => {
    const handleClose = () => setMenu(null);
    if (menu) {
      document.addEventListener("click", handleClose);
      window.addEventListener("scroll", handleClose, true);
      window.addEventListener("resize", handleClose);
      return () => {
        document.removeEventListener("click", handleClose);
        window.removeEventListener("scroll", handleClose, true);
        window.removeEventListener("resize", handleClose);
      };
    }
  }, [menu]);

  const planNames = useMemo(() => plans.filter(p => p.status === "Active").map(p => p.name), [plans]);

  const customerUsers = useMemo(() => (users || []).filter(u => !isStaffUser(u)), [users]);

  const filtered = useMemo(() => {
    let list = [...customerUsers];

    if (filterStatus !== "All") {
      list = list.filter(u => u.subscriptionStatus === filterStatus || (filterStatus === "Suspended" && u.accountStatus === "Suspended"));
    }

    if (filterRole !== "All") {
      list = list.filter(u => {
        const r = (u.role || "owner").toLowerCase().trim();
        if (filterRole === "owner") return r === "owner" || r === "farm owner";
        if (filterRole === "admin") return r === "admin" || r === "superadmin";
        return true;
      });
    }

    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(
        u =>
          (u?.name || "").toLowerCase().includes(lq) ||
          (u?.email || "").toLowerCase().includes(lq) ||
          (u?.phone || "").toLowerCase().includes(lq) ||
          (u?.farmName || "").toLowerCase().includes(lq) ||
          (u?.city || "").toLowerCase().includes(lq) ||
          (u?.state || "").toLowerCase().includes(lq) ||
          (u?.role || "").toLowerCase().includes(lq) ||
          (u?.activePlan || "").toLowerCase().includes(lq)
      );
    }

    list.sort((a, b) => {
      const av = String(a[sortKey] || "");
      const bv = String(b[sortKey] || "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [users, q, filterStatus, filterRole, sortKey, sortDir]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    return (
      <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-slate-700 transition-colors font-bold">
        {label}
        {sortKey === k ? (
          sortDir === "asc" ? (
            <ChevronUp size={12} className="text-green-600" />
          ) : (
            <ChevronDown size={12} className="text-green-600" />
          )
        ) : (
          <ChevronUp size={12} className="text-slate-300" />
        )}
      </button>
    );
  }

  function validate(f: Partial<AdminUser>) {
    const e: Record<string, string> = {};
    if (!f.name?.trim()) e.name = "Full name is required.";
    if (!f.email?.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Invalid email format.";
    return e;
  }

  function handleAdd() {
    const e = validate(form);
    setFErr(e);
    if (Object.keys(e).length) return;

    onAdd({
      ...BLANK,
      ...form,
      subscriptionStatus: computeSubscriptionStatus({
        accountStatus: "Active",
        activePlan: form.activePlan || null,
        trialStartDate: form.trialStartDate || null,
        subscriptionStart: form.subscriptionStart || null,
        subscriptionExpiry: form.subscriptionExpiry || null,
        ...form,
      }),
    } as Omit<AdminUser, "id">);

    setShowAdd(false);
    setForm({ ...BLANK });
    setFErr({});
  }

  function handleEdit() {
    if (!editUser) return;
    const e = validate(form);
    setFErr(e);
    if (Object.keys(e).length) return;

    const isExplicitlyPaid = Boolean(!form.freeAccess && (form.hasPaid || form.paystackReference?.trim() || form.lastPaymentDate?.trim()));
    const todayStr = getTodayDateStr();
    const cleanRef = form.paystackReference?.trim() || (isExplicitlyPaid ? (editUser.paystackReference || `admin_paid_${(editUser.id || editUser.email.split("@")[0]).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}_${todayStr.replace(/-/g, "")}`) : editUser.paystackReference || null);

    const updated = {
      ...editUser,
      ...form,
      paystackReference: cleanRef,
      lastPaymentDate: form.lastPaymentDate?.trim() || (isExplicitlyPaid ? (editUser.lastPaymentDate || todayStr) : null),
      hasPaid: isExplicitlyPaid,
    } as AdminUser;
    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
    if (isExplicitlyPaid) {
      syncReferralOnUserPayment(updated).then(reward => {
        if (reward) {
          toast.success(`Referral reward of ₦${reward.commissionAmount.toLocaleString()} credited to referring user`);
        }
      }).catch(console.warn);
    }
    setEditUser(null);
    setFErr({});
  }

  function toggleSuspend(u: AdminUser) {
    const next: AccountStatus = u.accountStatus === "Suspended" ? "Active" : "Suspended";
    const updated: AdminUser = { ...u, accountStatus: next };
    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
    setMenu(null);
  }

  function handleExtendTrial(u: AdminUser) {
    const now = new Date();
    const updated: AdminUser = {
      ...u,
      hasPaid: false,
      trialStartDate: now.toISOString().slice(0, 10),
      subscriptionStatus: "Trial",
      subscriptionStart: null,
      subscriptionExpiry: null,
    };
    onUpdate(updated);
    setMenu(null);
  }

  function handleMarkPaid(u: AdminUser) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + (u.billingFrequency === "yearly" ? 365 : 30));
    const cleanRef = (u.paystackReference && u.paystackReference.trim()) || `admin_paid_${(u.id || u.email.split("@")[0]).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}_${todayStr.replace(/-/g, "")}`;
    const updated: AdminUser = {
      ...u,
      hasPaid: true,
      paystackReference: cleanRef,
      lastPaymentDate: todayStr,
      subscriptionStatus: "Active",
      subscriptionStart: todayStr,
      subscriptionExpiry: expDate.toISOString().slice(0, 10),
      trialStartDate: null,
    };
    onUpdate(updated);
    syncReferralOnUserPayment(updated).then(reward => {
      if (reward) {
        toast.success(`Referral reward of ₦${reward.commissionAmount.toLocaleString()} credited to referring user (${reward.referrerEmail})`);
      }
    }).catch(console.warn);
    setMenu(null);
    toast.success(`Marked ${u.name || u.email} as verified paid`);
  }

  function handleSwitchToTrial(u: AdminUser) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updated: AdminUser = {
      ...u,
      hasPaid: false,
      trialStartDate: todayStr,
      subscriptionStatus: "Trial",
      subscriptionStart: null,
      subscriptionExpiry: null,
    };
    onUpdate(updated);
    setMenu(null);
  }

  const exportCSV = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }
    const headers = ["ID", "Name", "Email", "Farm", "Phone", "Plan", "Status", "Joined", "Expiry"];
    const rows = users.map(u => [
      u.id,
      `"${u.name}"`,
      u.email,
      `"${u.farmName || ""}"`,
      `"${u.phone || ""}"`,
      u.activePlan || "None",
      u.subscriptionStatus,
      u.createdAt || "",
      u.subscriptionExpiry || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pondtora_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLS = [
    { label: "User / Contact", key: "name" as SortKey },
    { label: "Farm & Location", key: "farmName" as SortKey },
    { label: "Assets / Team", key: null },
    { label: "Referrals", key: null },
    { label: "Active Plan", key: "activePlan" as SortKey },
    { label: "Sub Status", key: "subscriptionStatus" as SortKey },
    { label: "Trial / Expiry", key: "subscriptionExpiry" as SortKey },
    { label: "Account", key: null },
    { label: "Joined", key: "createdAt" as SortKey },
    { label: "Actions", key: null },
  ];

  return (
    <div className="space-y-4" onClick={() => menu && setMenu(null)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
            User Accounts Management
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Monitor, regulate, and view details for all {customerUsers.length} registered farm owner accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCw size={13} className={isRefreshing ? "animate-spin text-green-600" : "text-slate-500"} />
              {isRefreshing ? "Syncing…" : "Sync Database"}
            </button>
          )}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Download size={13} /> Export CSV
          </button>
          <PBtn
            onClick={() => {
              setForm({ ...BLANK, trialStartDate: new Date().toISOString().slice(0, 10) });
              setFErr({});
              setShowAdd(true);
            }}
          >
            <Plus size={14} /> Add User
          </PBtn>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200/80">
        {/* Search & Filters */}
        <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, email, farm, phone, location or plan…"
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400/40 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter Selector */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-lg border border-slate-200/80">
              {[
                { id: "All", label: "All Accounts" },
                { id: "owner", label: "Farm Owners" },
                { id: "admin", label: "Admins" },
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setFilterRole(r.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    filterRole === r.id
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Status Filter Selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {["All", "Active", "Trial", "Expired", "Suspended"].map(st => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    filterStatus === st
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {COLS.map((col, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-400 font-bold whitespace-nowrap ${
                      i === 0 ? "sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]" : ""
                    }`}
                  >
                    {col.key ? <SortBtn k={col.key} label={col.label} /> : col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isRefreshing && users.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-20 text-slate-400 text-xs">
                    <div className="max-w-md mx-auto space-y-3">
                      <RotateCw className="mx-auto text-emerald-500 animate-spin" size={32} />
                      <p className="font-semibold text-slate-700">Connecting to Supabase Database…</p>
                      <p className="text-[11px] text-slate-400">Retrieving live registered farm accounts.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isRefreshing && paged.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 text-xs">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="mx-auto text-slate-300" size={32} />
                      <p className="font-semibold text-slate-600">
                        {users.length === 0 ? "No registered users found in the database yet." : "No matching users found."}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {users.length === 0
                          ? "Users who sign up or create farm accounts in the app will automatically appear here."
                          : "Try adjusting your search terms or filter criteria."}
                      </p>
                      {onRefresh && users.length === 0 && (
                        <button
                          onClick={onRefresh}
                          disabled={isRefreshing}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          <RotateCw size={12} className={isRefreshing ? "animate-spin" : ""} />
                          {isRefreshing ? "Syncing…" : "Sync from Database"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {paged.map((u) => {
                const rStats = getUserReferralStats(u);
                return (
                  <tr
                    key={u.id}
                    onClick={() => setViewUser(u)}
                    className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                    title="Click to view full user details and reach out"
                  >
                    {/* 1. User / Contact */}
                    <td className="px-4 py-3 max-w-[220px] sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {(u.name || u.email || "Farmer").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                              {u.name}
                            </p>
                            {u.role === "admin" || u.role === "superadmin" ? (
                              <span className="text-[9px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                                Admin
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                Farm Owner
                              </span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] truncate">{u.email}</p>
                          {u.phone ? (
                            <p className="text-[10.5px] font-semibold text-emerald-700 flex items-center gap-1 mt-0.5 truncate">
                              <Phone size={10} className="text-emerald-600 shrink-0" />
                              {u.phone}
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-300 italic mt-0.5">No phone</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Farm & Location */}
                    <td className="px-4 py-3 max-w-[190px]">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 flex items-center gap-1 text-xs truncate">
                          <Building size={11} className="text-emerald-600 shrink-0" />
                          {u.farmName || "Primary Farm"}
                        </p>
                        <p className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          {[u.city, u.state, u.country].filter(Boolean).join(", ") || "Nigeria"}
                        </p>
                      </div>
                    </td>

                    {/* 3. Assets / Team */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Farms count">
                            🏡 {u.farmCount ?? 1} Farm{((u.farmCount ?? 1) !== 1) ? "s" : ""}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Ponds count">
                            <Droplets size={10} className="text-blue-500" /> {u.pondCount ?? 0} Ponds ({(u.totalFishStocked || 0).toLocaleString()} fish)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-1.5 py-0.5 rounded w-fit flex items-center gap-0.5" title="Staff added">
                            <UsersIcon size={10} className="text-emerald-600" /> {u.staffCount ?? 0} Staff
                          </span>
                          <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded" title="Recorded Revenue & Expenses">
                            Rev: ₦{(u.totalRevenue || 0).toLocaleString()} · Exp: ₦{(u.totalExpenses || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 4. Referrals */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${rStats.totalReferralsCount > 0 ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-500"}`}>
                            🎁 {rStats.totalReferralsCount} referred
                          </span>
                        </div>
                        {rStats.totalEarnings > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-emerald-700 font-bold">
                              ₦{rStats.totalEarnings.toLocaleString()} earned
                            </span>
                            {rStats.availableEarnings > 0 && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded" title="Available to cash out">
                                ₦{rStats.availableEarnings.toLocaleString()} avail.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {rStats.referralCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. Active Plan & Amount */}
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {u.activePlan ? (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-bold text-[11px]">
                              {u.activePlan}
                            </span>
                            {u.freeAccess ? (
                              <span className="text-green-600 font-bold text-[11px]">Free ✦</span>
                            ) : (
                              <span className="text-slate-900 font-extrabold text-[12px]">
                                {effectivePrice(u, plans) !== null ? fmtMoney(effectivePrice(u, plans) as number) : "—"}
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-400 capitalize mt-0.5">
                            {u.billingFrequency || "monthly"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* 6. Sub Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                          {Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                              Paid ✓
                            </span>
                          )}
                          {u.freeAccess && (
                            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">
                              Free ✦
                            </span>
                          )}
                        </div>
                        {u.paystackReference && (
                          <span className="inline-block font-mono text-[9px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 mt-0.5 max-w-[130px] truncate" title={`Paystack Ref: ${u.paystackReference}`}>
                            Ref: {u.paystackReference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 7. Trial / Expiry */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {u.subscriptionStatus === "Trial" && !u.hasPaid && !u.subscriptionExpiry ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <Clock size={11} className="text-amber-500" /> {trialDaysLeft(u.trialStartDate)}d trial left
                        </span>
                      ) : u.subscriptionExpiry ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                            <Clock size={11} className="text-emerald-600" /> {subscriptionDaysLeft(u.subscriptionExpiry)}d remaining
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Expires {fmtDate(u.subscriptionExpiry)}
                          </span>
                        </div>
                      ) : u.subscriptionStart ? (
                        <span className="text-xs text-slate-600">Started {fmtDate(u.subscriptionStart)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* 8. Account */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Bdg
                        label={u.accountStatus || "Active"}
                        color={u.accountStatus === "Active" ? "green" : "gray"}
                      />
                    </td>

                    {/* 9. Joined */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {fmtDate(u.createdAt)}
                    </td>

                    {/* 10. Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setViewUser(u)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                          title="View user details popup"
                        >
                          <Eye size={12} /> Details
                        </button>
                        <button
                          onClick={e => {
                            if (menu?.user.id === u.id) {
                              setMenu(null);
                              return;
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const isNearBottom = spaceBelow < 230;
                            setMenu({
                              user: u,
                              top: isNearBottom ? undefined : rect.bottom + 4,
                              bottom: isNearBottom ? window.innerHeight - rect.top + 4 : undefined,
                              right: Math.max(16, window.innerWidth - rect.right),
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            menu?.user.id === u.id
                              ? "bg-slate-200 text-slate-800 shadow-sm"
                              : "hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                          }`}
                          title="More actions"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Users Cards View (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100">
          {paged.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              No matching farm accounts found.
            </div>
          ) : (
            paged.map((u) => {
              const rStats = getUserReferralStats(u);
              return (
                <div
                  key={u.id}
                  onClick={() => setViewUser(u)}
                  className="p-3.5 space-y-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {(u.name || u.email || "Farmer").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{u.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setViewUser(u)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        Details
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100 flex-wrap gap-1">
                    <span className="flex items-center gap-1 font-medium truncate">
                      <Building size={12} className="text-emerald-600 shrink-0" />
                      {u.farmName || "Primary Farm"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {[u.city, u.state].filter(Boolean).join(", ") || "Nigeria"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                        {u.activePlan || "Starter"}
                      </span>
                      <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span>🏡 {u.farmCount ?? 1} Farm{((u.farmCount ?? 1) !== 1) ? "s" : ""}</span>
                      <span>💧 {u.pondCount ?? 0} Ponds ({(u.totalFishStocked || 0).toLocaleString()} fish)</span>
                    </div>
                  </div>

                  {/* Financial summary row on mobile */}
                  <div className="flex items-center justify-between text-[11px] bg-emerald-50/60 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                    <span className="font-semibold text-emerald-800">
                      Rev: ₦{(u.totalRevenue || 0).toLocaleString()}
                    </span>
                    <span className="font-semibold text-rose-700">
                      Exp: ₦{(u.totalExpenses || 0).toLocaleString()}
                    </span>
                    <span className="font-bold text-slate-800">
                      Net: ₦{((u.totalRevenue || 0) - (u.totalExpenses || 0)).toLocaleString()}
                    </span>
                  </div>

                  {/* Referral summary row on mobile */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-50/90 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      🎁 Referrals: <strong className="text-purple-800">{rStats.totalReferralsCount}</strong> ({rStats.paidReferralsCount} paid)
                    </span>
                    <span className={`font-bold ${rStats.totalEarnings > 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      ₦{rStats.totalEarnings.toLocaleString()} earned
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
          </div>
        </Card>

      {/* Add User Modal */}
      {showAdd && (
        <Modal
          title="Add New Farm User"
          onClose={() => {
            setShowAdd(false);
            setFErr({});
          }}
          wide
        >
          <UserForm f={form} setF={setForm} err={fErr} planNames={planNames} />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <PBtn
              outline
              onClick={() => {
                setShowAdd(false);
                setFErr({});
              }}
            >
              Cancel
            </PBtn>
            <PBtn onClick={handleAdd}>Create User</PBtn>
          </div>
        </Modal>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <Modal
          title={`Edit User Account — ${editUser.name}`}
          onClose={() => {
            setEditUser(null);
            setFErr({});
          }}
          wide
        >
          <UserForm f={form} setF={setForm} err={fErr} planNames={planNames} />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <PBtn
              outline
              onClick={() => {
                setEditUser(null);
                setFErr({});
              }}
            >
              Cancel
            </PBtn>
            <PBtn onClick={handleEdit}>Save User Changes</PBtn>
          </div>
        </Modal>
      )}

      {/* View User Details Modal */}
      {viewUser && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={e => e.target === e.currentTarget && setViewUser(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20 shrink-0">
                  {(viewUser.name || "Farmer").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] leading-tight truncate">
                      {viewUser.name || "Farmer Account"}
                    </h2>
                    <Bdg label={viewUser.accountStatus || "Active"} color={viewUser.accountStatus === "Active" ? "green" : "gray"} />
                    <Bdg label={viewUser.subscriptionStatus || "Trial"} color={STATUS_COLOR[viewUser.subscriptionStatus] || "gray"} />
                    {viewUser.freeAccess && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                        Free VIP ✦
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {viewUser.email || "No email"} • {viewUser.role || "Farm Owner"} • Registered {fmtDate(viewUser.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewUser(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Direct Reach-Out Action Bar */}
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {viewUser.phone ? (
                  <a
                    href={getWhatsAppUrl(viewUser.phone, viewUser.name) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title={`Open WhatsApp chat with ${viewUser.phone}`}
                  >
                    <MessageCircle size={14} /> WhatsApp Farmer
                  </a>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed"
                    title="Farmer did not enter a phone number"
                  >
                    <MessageCircle size={14} /> No WhatsApp
                  </span>
                )}

                {viewUser.email && (
                  <a
                    href={`mailto:${viewUser.email}?subject=${encodeURIComponent("Pondtora Farm Management Support")}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title={`Send an email to ${viewUser.email}`}
                  >
                    <Mail size={14} /> Send Email
                  </a>
                )}

                {viewUser.phone && (
                  <a
                    href={`tel:${viewUser.phone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    title={`Call ${viewUser.phone}`}
                  >
                    <Phone size={14} /> Call
                  </a>
                )}
              </div>

              <button
                onClick={() => copyUserDossier(viewUser, userExtra)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl shadow-xs transition-colors ml-auto"
                title="Copy all farmer details to clipboard"
              >
                <Copy size={13} /> Copy Details
              </button>
            </div>

            {/* Farm Scoping, Date Filter & Navigation Toolbar */}
            {(() => {
              const lagosTodayStr = getLagosTodayStr();
              const lagosDateParts = getLagosDateParts();
              const curMonthPrefix = `${lagosDateParts.year}-${String(lagosDateParts.month).padStart(2, "0")}`;
              const curYearPrefix = `${lagosDateParts.year}-`;

              const passesDateFilter = (rawDate: any) => {
                if (farmDateFilter === "all") return true;
                if (!rawDate) return false;
                const ymd = toLocalYMD(rawDate);
                if (!ymd) return false;
                if (farmDateFilter === "today") return ymd === lagosTodayStr;
                if (farmDateFilter === "month") return ymd.startsWith(curMonthPrefix);
                if (farmDateFilter === "year") return ymd.startsWith(curYearPrefix);
                if (farmDateFilter === "custom") {
                  if (farmCustomStart && ymd < farmCustomStart) return false;
                  if (farmCustomEnd && ymd > farmCustomEnd) return false;
                  return true;
                }
                return true;
              };

              const passesFarmFilter = (rawFarmId: any) => {
                if (selectedFarmFilterId === "all") return true;
                if (!rawFarmId) return true;
                return String(rawFarmId) === String(selectedFarmFilterId);
              };

              // Filtered datasets for active tab views & totals
              const allFarms = userExtra?.farms || [];
              const farmNameById = new Map<string, string>();
              allFarms.forEach((f: any) => {
                if (f?.id) farmNameById.set(String(f.id), f.name || "Farm");
              });

              const allPonds = (userExtra?.ponds || []).filter((p: any) => passesFarmFilter(p.farm_id || p.farmId));
              const allStockEvents = (userExtra?.stockEvents || []).filter((s: any) => passesFarmFilter(s.farm_id || s.farmId) && passesDateFilter(s.date || s.event_date || s.created_at || s.createdAt));
              const allMortalityEntries = (userExtra?.mortalityEntries || []).filter((m: any) => passesFarmFilter(m.farm_id || m.farmId) && passesDateFilter(m.date || m.created_at || m.createdAt));
              const allFeed = (userExtra?.feedInventory || []).filter((f: any) => passesFarmFilter(f.farm_id || f.farmId));
              const allFeeding = (userExtra?.feedingRecords || []).filter((r: any) => passesFarmFilter(r.farm_id || r.farmId) && passesDateFilter(r.date || r.created_at || r.createdAt));
              const allBagLogs = (userExtra?.bagOpenLogs || []).filter((b: any) => passesFarmFilter(b.farm_id || b.farmId) && passesDateFilter(b.date || b.created_at || b.createdAt));
              const allFeedRem = (userExtra?.feedRemainingLogs || []).filter((b: any) => passesFarmFilter(b.farm_id || b.farmId) && passesDateFilter(b.date || b.created_at || b.createdAt));
              const allSales = (userExtra?.salesCalculations || []).filter((s: any) => passesFarmFilter(s.farm_id || s.farmId) && passesDateFilter(s.calc_date || s.created_at || s.createdAt));
              const allPayments = (userExtra?.salesPayments || []).filter((p: any) => passesDateFilter(p.payment_date || p.created_at || p.createdAt));
              const allRev = (userExtra?.revenues || []).filter((r: any) => passesFarmFilter(r.farm_id || r.farmId) && passesDateFilter(r.date || r.created_at || r.createdAt));
              const allExp = (userExtra?.expenses || []).filter((e: any) => passesFarmFilter(e.farm_id || e.farmId) && passesDateFilter(e.date || e.created_at || e.createdAt));
              const allInvoices = (userExtra?.invoices || []).filter((i: any) => passesFarmFilter(i.farm_id || i.farmId) && passesDateFilter(i.invoice_date || i.invoiceDate || i.created_at || i.createdAt));
              const allTreatments = (userExtra?.treatments || []).filter((t: any) => passesFarmFilter(t.farm_id || t.farmId) && passesDateFilter(t.date || t.created_at || t.createdAt));
              const allPondReports = (userExtra?.pondReports || []).filter((p: any) => passesFarmFilter(p.farm_id || p.farmId) && passesDateFilter(p.report_date || p.reportDate || p.date || p.created_at || p.createdAt));
              const allGeneralReports = (userExtra?.generalReports || []).filter((r: any) => passesFarmFilter(r.farm_id || r.farmId) && passesDateFilter(r.date || r.created_at || r.createdAt));
              const allEquipment = (userExtra?.equipment || []).filter((eq: any) => passesFarmFilter(eq.farm_id || eq.farmId));
              const allStaff = userExtra?.staff || [];
              const allInvestors = (userExtra?.investors || []).filter((inv: any) => passesFarmFilter(inv.farm_id || inv.farmId));
              const allInvestments = (userExtra?.investments || []).filter((inv: any) => passesFarmFilter(inv.farm_id || inv.farmId));

              // Financial & operational aggregations
              const periodRevenue = allRev.reduce((s: number, r: any) => s + (Number(r?.amount) || 0), 0);
              const periodExpenses = allExp.reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0);
              const periodNetProfit = periodRevenue - periodExpenses;
              const periodFeedKg = allFeeding.reduce((s: number, r: any) => s + (Number(r?.total ?? ((Number(r?.morning) || 0) + (Number(r?.evening) || 0))) || 0), 0);
              const totalSalesAmount = allSales.reduce((s: number, sc: any) => s + (Number(sc?.total_amount ?? sc?.totalAmount) || 0), 0);
              const totalSalesPaid = allSales.reduce((s: number, sc: any) => s + (Number(sc?.amount_paid ?? sc?.amountPaid) || 0), 0);
              const totalSalesOutstanding = Math.max(0, totalSalesAmount - totalSalesPaid);

              // Lifetime / current stock totals
              const lifetimeFish = allPonds.reduce(
                (s: number, p: any) => s + (Number(p?.current_count ?? p?.currentCount ?? p?.initial_stock ?? p?.initialStock) || 0),
                0
              );
              const totalPurchasedBags = allFeed.reduce((s: number, f: any) => s + (Number(f?.bags ?? f?.bags_in_stock) || 0), 0);
              const totalOpenedBags = (userExtra?.bagOpenLogs || [])
                .filter((b: any) => passesFarmFilter(b.farm_id || b.farmId))
                .reduce((s: number, b: any) => s + (Number(b?.bags_opened ?? b?.bagsOpened ?? b?.bags) || 0), 0);
              const lifetimeFeedBags = Math.max(0, totalPurchasedBags - totalOpenedBags);

              const tabsList = [
                { id: "summary", label: "📊 Farm Overview", count: null },
                { id: "ponds", label: "💧 Ponds & Stocking", count: allPonds.length },
                { id: "feed", label: "🌾 Feed Inventory", count: allFeed.length },
                { id: "feeding", label: "🍽️ Feeding Records", count: allFeeding.length },
                { id: "sales", label: "🏷️ Sales Management", count: allSales.length },
                { id: "finance", label: "💰 Financials & Invoices", count: allRev.length + allExp.length + allInvoices.length },
                { id: "health_equipment", label: "🩺 Health & Equipment", count: allTreatments.length + allPondReports.length + allGeneralReports.length + allEquipment.length },
                { id: "staff_investors", label: "👥 Staff & Investors", count: allStaff.length + allInvestors.length + allInvestments.length },
              ];

              return (
                <>
                  {/* Top Farm Scoping & Date Filter Controls */}
                  <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Farm Selector */}
                      {allFarms.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                          <Building size={13} className="text-emerald-600 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-500">Farm:</span>
                          <select
                            value={selectedFarmFilterId}
                            onChange={(e) => setSelectedFarmFilterId(e.target.value)}
                            aria-label="Filter by farm"
                            className="text-xs font-semibold text-slate-800 bg-transparent border-0 outline-none cursor-pointer pr-1"
                          >
                            <option value="all">All User Farms ({allFarms.length})</option>
                            {allFarms.map((f: any) => (
                              <option key={f.id} value={f.id}>{f.name || "Farm"}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Date Filter Badges */}
                      <div className="inline-flex items-center bg-slate-200/70 p-0.5 rounded-lg">
                        {[
                          { id: "all", label: "All Time (Lifetime)" },
                          { id: "today", label: "Today" },
                          { id: "month", label: "This Month" },
                          { id: "year", label: "This Year" },
                          { id: "custom", label: "Custom Range" },
                        ].map((df) => (
                          <button
                            key={df.id}
                            onClick={() => setFarmDateFilter(df.id as any)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                              farmDateFilter === df.id
                                ? "bg-white text-emerald-700 shadow-2xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {df.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Range Inputs */}
                      {farmDateFilter === "custom" && (
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <Calendar size={12} className="text-slate-400" />
                          <input
                            type="date"
                            value={farmCustomStart}
                            onChange={(e) => setFarmCustomStart(e.target.value)}
                            aria-label="Start date filter"
                            className="text-[11px] font-semibold text-slate-700 outline-none border-b border-slate-200 focus:border-emerald-500"
                          />
                          <span className="text-slate-400 text-[10px]">to</span>
                          <input
                            type="date"
                            value={farmCustomEnd}
                            onChange={(e) => setFarmCustomEnd(e.target.value)}
                            aria-label="End date filter"
                            className="text-[11px] font-semibold text-slate-700 outline-none border-b border-slate-200 focus:border-emerald-500"
                          />
                          {(farmCustomStart || farmCustomEnd) && (
                            <button
                              onClick={() => { setFarmCustomStart(""); setFarmCustomEnd(""); }}
                              className="text-slate-400 hover:text-slate-600 text-[10px] ml-0.5"
                              title="Clear range"
                            >
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-500">
                        {farmDateFilter === "all" ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Lifetime Records
                          </span>
                        ) : farmDateFilter === "today" ? (
                          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Today (WAT): {lagosTodayStr}
                          </span>
                        ) : farmDateFilter === "month" ? (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                            Month: {curMonthPrefix}
                          </span>
                        ) : farmDateFilter === "year" ? (
                          <span className="text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Year: {lagosDateParts.year}
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Range: {farmCustomStart || "..."} - {farmCustomEnd || "..."}
                          </span>
                        )}
                      </span>

                      {userExtra?.loading && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium px-2 py-0.5 animate-pulse">
                          <RefreshCw size={11} className="animate-spin text-emerald-600" />
                          <span>Syncing...</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Tabs for Farmer Data */}
                  <div className="px-5 pt-2 border-b border-slate-200 flex items-center justify-between gap-1.5 overflow-x-auto bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {tabsList.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setFarmerDataTab(t.id as any)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                            farmerDataTab === t.id
                              ? "border-emerald-600 text-emerald-700 bg-white shadow-2xs"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {t.label}
                          {t.count !== null && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              farmerDataTab === t.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                            }`}>
                              {t.count}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal Body with Tab Content */}
                  <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
                    {/* Tab 1: Summary & Operations Overview */}
                    {farmerDataTab === "summary" && (
                      <div className="space-y-4">
                        {/* Account & Contact Summary */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Building size={13} className="text-emerald-600" /> Farm Identity & Contact Details
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Primary Farm Name</p>
                              <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">{viewUser.farmName || "Primary Farm"}</p>
                            </div>
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Account Owner</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="font-bold text-slate-800 text-xs truncate">{viewUser.name || "—"}</p>
                                <button onClick={() => copyToClipboard(viewUser.name || "", "Name")} className="text-slate-400 hover:text-slate-600 p-0.5"><Copy size={11} /></button>
                              </div>
                            </div>
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="font-semibold text-slate-800 text-xs truncate" title={viewUser.email}>{viewUser.email || "—"}</p>
                                <button onClick={() => copyToClipboard(viewUser.email || "", "Email")} className="text-slate-400 hover:text-slate-600 p-0.5"><Copy size={11} /></button>
                              </div>
                            </div>
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Phone Number</p>
                              <p className={`font-semibold text-xs mt-0.5 truncate ${viewUser.phone ? "text-emerald-700 font-mono" : "text-slate-400 italic"}`}>
                                {viewUser.phone || "Not provided"}
                              </p>
                            </div>
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Location</p>
                              <p className="font-semibold text-slate-800 text-xs mt-0.5 truncate">
                                {[viewUser.city, viewUser.state, viewUser.country].filter(Boolean).join(", ") || "Nigeria"}
                              </p>
                            </div>
                            <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Registered Date</p>
                              <p className="font-semibold text-slate-800 text-xs mt-0.5">{fmtDate(viewUser.createdAt)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Configured Farms Breakdown */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Building size={13} className="text-emerald-600" /> Configured Farms ({allFarms.length})
                            </h3>
                          </div>
                          {allFarms.length === 0 ? (
                            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-400 text-center">
                              No separate farm rows configured yet.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {allFarms.map((f: any, idx: number) => {
                                const fPonds = (userExtra?.ponds || []).filter((p: any) => String(p.farm_id || p.farmId) === String(f.id) || allFarms.length === 1);
                                const fFish = fPonds.reduce((s: number, p: any) => s + (Number(p?.current_count ?? p?.currentCount ?? p?.initial_stock ?? p?.initialStock) || 0), 0);
                                const fRev = (userExtra?.revenues || []).filter((r: any) => String(r.farm_id || r.farmId) === String(f.id) || allFarms.length === 1).reduce((s: number, r: any) => s + (Number(r?.amount) || 0), 0);
                                const fExp = (userExtra?.expenses || []).filter((e: any) => String(e.farm_id || e.farmId) === String(f.id) || allFarms.length === 1).reduce((s: number, e: any) => s + (Number(e?.amount) || 0), 0);
                                return (
                                  <div key={f.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-slate-900 text-xs truncate">{f.name || `Farm #${idx + 1}`}</p>
                                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                        {fPonds.length} Pond{fPonds.length === 1 ? "" : "s"}
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-500 mt-0.5">
                                      {[f.city || viewUser.city, f.state || viewUser.state, f.country || viewUser.country].filter(Boolean).join(", ") || "Nigeria"}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-100 text-[10.5px]">
                                      <div>
                                        <span className="text-slate-400 block text-[9.5px]">Fish Stocked</span>
                                        <span className="font-bold text-blue-700">{fFish.toLocaleString()}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9.5px]">Revenue</span>
                                        <span className="font-bold text-emerald-700">₦{fRev.toLocaleString()}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 block text-[9.5px]">Expenses</span>
                                        <span className="font-bold text-rose-700">₦{fExp.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Filtered Period Operations Snapshot */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers size={13} className="text-emerald-600" /> Operational & Financial Snapshot ({farmDateFilter === "all" ? "Lifetime Total" : "Selected Period"})
                            </h3>
                            {farmDateFilter !== "all" && (
                              <button
                                onClick={() => setFarmDateFilter("all")}
                                className="text-[10px] text-emerald-700 hover:underline font-bold"
                              >
                                Reset to Lifetime
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <div
                              onClick={() => setFarmerDataTab("ponds")}
                              className="bg-blue-50/60 border border-blue-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-blue-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-blue-500">Ponds Active</p>
                              <p className="text-lg font-extrabold text-blue-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                {allPonds.length}
                              </p>
                              <p className="text-[10px] text-blue-600">{lifetimeFish.toLocaleString()} fish stocked</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("feeding")}
                              className="bg-amber-50/60 border border-amber-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-amber-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-amber-700">Feed Consumed</p>
                              <p className="text-lg font-extrabold text-amber-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                {periodFeedKg.toLocaleString()} kg
                              </p>
                              <p className="text-[10px] text-amber-600">{allFeeding.length} feeding entries</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("finance")}
                              className="bg-emerald-50/60 border border-emerald-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-emerald-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-emerald-700">Recorded Revenue</p>
                              <p className="text-lg font-extrabold text-emerald-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                ₦{periodRevenue.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-emerald-600">{allRev.length} revenue records</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("finance")}
                              className="bg-rose-50/60 border border-rose-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-rose-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-rose-700">Recorded Expenses</p>
                              <p className="text-lg font-extrabold text-rose-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                ₦{periodExpenses.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-rose-600">{allExp.length} expense records</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("finance")}
                              className="bg-purple-50/60 border border-purple-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-purple-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-purple-700">Net Profit (Period)</p>
                              <p className={`text-lg font-extrabold font-['Barlow_Condensed',sans-serif] mt-0.5 ${periodNetProfit >= 0 ? "text-purple-900" : "text-rose-700"}`}>
                                {periodNetProfit >= 0 ? `₦${periodNetProfit.toLocaleString()}` : `-₦${Math.abs(periodNetProfit).toLocaleString()}`}
                              </p>
                              <p className="text-[10px] text-purple-600">{allInvoices.length} invoices</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("sales")}
                              className="bg-teal-50/60 border border-teal-200/70 p-2.5 rounded-xl text-center cursor-pointer hover:border-teal-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-teal-700">Sales Calculations</p>
                              <p className="text-lg font-extrabold text-teal-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                ₦{totalSalesAmount.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-teal-600">₦{totalSalesPaid.toLocaleString()} paid • ₦{totalSalesOutstanding.toLocaleString()} balance</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("feed")}
                              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center cursor-pointer hover:border-slate-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-slate-500">Feed in Stock</p>
                              <p className="text-lg font-extrabold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                {lifetimeFeedBags} Bags
                              </p>
                              <p className="text-[10px] text-slate-500">{totalPurchasedBags} purchased • {totalOpenedBags} opened</p>
                            </div>
                            <div
                              onClick={() => setFarmerDataTab("staff_investors")}
                              className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center cursor-pointer hover:border-slate-400 transition-colors"
                            >
                              <p className="text-[10px] uppercase font-bold text-slate-500">Farm Team</p>
                              <p className="text-lg font-extrabold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                                {allStaff.length} Staff
                              </p>
                              <p className="text-[10px] text-slate-500">{allInvestors.length} Investors ({allInvestments.length} deals)</p>
                            </div>
                          </div>
                        </div>

                        {/* Subscription & Account Status */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <CreditCard size={13} className="text-emerald-600" /> Subscription & Plan Status
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Current Plan</p>
                              <p className="font-bold text-slate-900 text-xs mt-0.5">{viewUser.activePlan || "Starter"}</p>
                            </div>
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Billing Frequency</p>
                              <p className="font-semibold text-slate-800 text-xs mt-0.5 capitalize">{viewUser.billingFrequency || "monthly"}</p>
                            </div>
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Subscription Amount</p>
                              <p className={`font-bold text-xs mt-0.5 ${typeof viewUser.subscriptionAmount === "number" ? "text-emerald-700" : "text-slate-500"}`}>
                                {typeof viewUser.subscriptionAmount === "number" ? `₦${viewUser.subscriptionAmount.toLocaleString()}` : "Standard Plan"}
                              </p>
                            </div>
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Subscription / Trial Status</p>
                              {viewUser.subscriptionStatus === "Trial" && !viewUser.hasPaid && !viewUser.subscriptionExpiry ? (
                                <p className="font-semibold text-xs mt-0.5 text-amber-700">
                                  {trialDaysLeft(viewUser.trialStartDate)} days trial left (started {fmtDate(viewUser.trialStartDate)})
                                </p>
                              ) : viewUser.subscriptionExpiry ? (
                                <p className="font-semibold text-xs mt-0.5 text-emerald-700">
                                  {subscriptionDaysLeft(viewUser.subscriptionExpiry)} days remaining (expires {fmtDate(viewUser.subscriptionExpiry)})
                                </p>
                              ) : (
                                <p className="font-semibold text-xs mt-0.5 text-slate-700">Active Account</p>
                              )}
                            </div>
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Payment Status</p>
                              <p className="font-semibold text-xs mt-0.5">
                                {viewUser.hasPaid || viewUser.paystackReference ? (
                                  <span className="text-emerald-600 font-bold">Paid & Active</span>
                                ) : (
                                  <span className="text-slate-500">Unpaid / Trial</span>
                                )}
                              </p>
                            </div>
                            <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Subscription Expiry</p>
                              <p className="font-semibold text-slate-800 text-xs mt-0.5">{fmtDate(viewUser.subscriptionExpiry)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Ponds & Fish Batches */}
                    {farmerDataTab === "ponds" && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Droplets size={14} className="text-blue-500" />
                              Ponds & Current Fish Populations ({allPonds.length})
                            </h3>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Total Current Fish: <strong className="text-blue-700">{lifetimeFish.toLocaleString()}</strong>
                            </span>
                          </div>

                          {allPonds.length === 0 ? (
                            <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                              No ponds found for this farm.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {allPonds.map((p: any, idx: number) => {
                                const fishCount = Number(p.current_count ?? p.currentCount ?? p.initial_stock ?? p.initialStock) || 0;
                                const initCount = Number(p.initial_stock ?? p.initialStock ?? fishCount) || 0;
                                const mortCount = Math.max(0, initCount - fishCount);
                                const pondSize = p.size_m2 ?? p.sizeM2;
                                const avgWeight = p.avg_weight ?? p.avgWeight;
                                const stockingDate = p.stocking_date || p.stockingDate;
                                const totalCost = Number(p.total_cost ?? p.totalCost) || 0;
                                const fId = p.farm_id || p.farmId;
                                const pondFarmName = (fId && farmNameById.get(String(fId))) || viewUser.farmName || "Primary Farm";
                                return (
                                  <div key={p.id || idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-xs truncate">{p.name || `Pond #${idx + 1}`}</p>
                                        <p className="text-[10px] text-emerald-700 font-medium truncate">
                                          {pondFarmName} {p.type ? `• ${p.type}` : ""} {p.category ? `• ${p.category}` : ""}
                                        </p>
                                      </div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        (p.status || "active").toLowerCase() === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                                      }`}>
                                        {p.status || "Active"}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
                                      <div>
                                        <p className="text-[10px] text-slate-400">Current Fish</p>
                                        <p className="font-extrabold text-blue-700 font-['Barlow_Condensed',sans-serif] text-base">{fishCount.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-400">Initial Stock</p>
                                        <p className="font-bold text-slate-700 font-['Barlow_Condensed',sans-serif] text-base">{initCount.toLocaleString()}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-400">Species</p>
                                        <p className="font-semibold text-slate-700 truncate">{p.species || "Catfish"}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-400">Size / Avg Wt</p>
                                        <p className="font-semibold text-slate-700">
                                          {pondSize ? `${pondSize}m²` : ""}{pondSize && avgWeight ? " • " : ""}{avgWeight ? `${avgWeight}g` : (!pondSize ? "—" : "")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-slate-50 text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
                                      <span>Stocked: {fmtDate(stockingDate)}</span>
                                      {mortCount > 0 && <span className="text-rose-600 font-semibold">Mortality/Removed: {mortCount.toLocaleString()}</span>}
                                      {totalCost > 0 && <span className="text-emerald-700 font-semibold">Stock Cost: ₦{totalCost.toLocaleString()}</span>}
                                      {(p.fish_stock || p.fishStock) && <span className="bg-slate-100 px-1.5 py-0.2 rounded">Batch: {p.fish_stock || p.fishStock}</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Fish Stock Events & Transfers */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Layers size={13} className="text-slate-600" />
                            Fish Stock Events & Movements ({allStockEvents.length})
                          </h3>
                          {allStockEvents.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                              No stock movement events recorded in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                              {allStockEvents.map((evt: any, i: number) => {
                                const evtType = evt.type || evt.event_type || "Stock Event";
                                const evtQty = Number(evt.count ?? evt.quantity) || 0;
                                const evtCost = Number(evt.total_cost ?? evt.totalCost) || 0;
                                return (
                                  <div key={evt.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                    <div>
                                      <span className="font-bold text-slate-800 capitalize">{evtType}</span>
                                      <span className="text-slate-400 text-[11px] ml-1.5">
                                        Pond: {evt.pond_name || evt.pondName || evt.pond_id || "—"} • {fmtDate(evt.date || evt.event_date || evt.created_at)}
                                      </span>
                                      {(evt.notes || evt.reason || evt.supplier) && (
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          {[evt.species, evt.supplier ? `Supplier: ${evt.supplier}` : "", evt.reason, evt.notes].filter(Boolean).join(" • ")}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`font-bold font-['Barlow_Condensed',sans-serif] text-sm ${
                                        evtType.toLowerCase().includes("mortality") ? "text-rose-600" : "text-blue-700"
                                      }`}>
                                        {evtQty > 0 ? evtQty.toLocaleString() : "—"} fish
                                      </span>
                                      {evtCost > 0 && <p className="text-[10px] text-emerald-700 font-semibold">₦{evtCost.toLocaleString()}</p>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Mortality Records */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-rose-600" />
                            Mortality Records ({allMortalityEntries.length})
                          </h3>
                          {allMortalityEntries.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                              No mortality records logged in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allMortalityEntries.map((m: any, i: number) => (
                                <div key={m.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">{m.pond || "Pond"}</span>
                                    <span className="text-slate-400 text-[11px] ml-1.5">{fmtDate(m.date || m.created_at)}</span>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Cause: {m.cause || "Unspecified"} {m.action ? `• Action: ${m.action}` : ""} {m.notes ? `• ${m.notes}` : ""}
                                    </p>
                                  </div>
                                  <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-['Barlow_Condensed',sans-serif] text-sm shrink-0">
                                    -{Number(m.count || 0).toLocaleString()} fish
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Feed Stock & Inventory */}
                    {farmerDataTab === "feed" && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Package size={14} className="text-emerald-600" />
                              Feed Inventory Purchased & In Stock ({allFeed.length})
                            </h3>
                            <span className="text-[11px] text-slate-500 font-medium">
                              Available Stock: <strong className="text-emerald-700">{lifetimeFeedBags} bags</strong> ({totalPurchasedBags} purchased, {totalOpenedBags} opened)
                            </span>
                          </div>

                          {allFeed.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No feed inventory registered.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {allFeed.map((f: any, i: number) => {
                                const bagsCount = Number(f.bags ?? f.bags_in_stock) || 0;
                                const wtPerBag = Number(f.weight_per_bag ?? f.weightPerBag) || 15;
                                const costPerBag = Number(f.cost_per_bag ?? f.costPerBag) || 0;
                                const totalKg = Number(f.total_kg ?? f.totalKg) || (bagsCount * wtPerBag);
                                return (
                                  <div key={f.id || i} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                    <div className="flex items-center justify-between">
                                      <p className="font-bold text-slate-900 text-xs truncate">{f.brand || "Feed"}</p>
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                        {f.size || "Standard"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 mt-0.5">{wtPerBag}kg/bag • Cost: ₦{costPerBag.toLocaleString()}/bag</p>
                                    {(f.supplier || f.purchase_date || f.purchaseDate) && (
                                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        {f.supplier ? `${f.supplier} • ` : ""}{fmtDate(f.purchase_date || f.purchaseDate)}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/60">
                                      <span className="text-[10px] text-slate-400">Batch:</span>
                                      <span className="text-emerald-700 font-bold text-xs">{bagsCount} bags ({totalKg} kg)</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Daily Bag Open Logs */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-600" />
                            Daily Bag Open Logs ({allBagLogs.length})
                          </h3>
                          {allBagLogs.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No daily bags opened recorded in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allBagLogs.map((log: any, i: number) => (
                                <div key={log.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">{log.feed_brand || log.brand || "Feed"} ({log.feed_size || log.size || "—"})</span>
                                    <span className="text-slate-400 text-[11px] ml-1.5">{fmtDate(log.date || log.created_at)}</span>
                                    {log.notes && <p className="text-[10px] text-slate-500 mt-0.5">{log.notes}</p>}
                                  </div>
                                  <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                                    {log.bags_opened ?? log.bagsOpened ?? log.bags ?? 1} bags opened
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Daily Leftover / Feed Remaining Logs */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Package size={13} className="text-teal-600" />
                            Daily Feed Leftover / Remaining Logs ({allFeedRem.length})
                          </h3>
                          {allFeedRem.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No leftover records logged in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allFeedRem.map((log: any, i: number) => (
                                <div key={log.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">{log.feed_brand || log.brand || "Feed"} ({log.size || "—"})</span>
                                    <span className="text-slate-400 text-[11px] ml-1.5">{fmtDate(log.date || log.created_at)}</span>
                                  </div>
                                  <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                                    {log.remaining_kg ?? log.remainingKg ?? 0} kg remaining
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Feeding Records */}
                    {farmerDataTab === "feeding" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Clock size={14} className="text-amber-600" />
                            Feeding Activity & Records ({allFeeding.length})
                          </h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Period Distributed: <strong className="text-amber-800">{periodFeedKg.toLocaleString()} kg</strong>
                          </span>
                        </div>

                        {allFeeding.length === 0 ? (
                          <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                            No feeding records found for this period.
                          </div>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                            {allFeeding.map((r: any, i: number) => {
                              const morning = Number(r.morning) || 0;
                              const evening = Number(r.evening) || 0;
                              const totalKg = Number(r.total ?? (morning + evening)) || 0;
                              const mTime = r.morning_time || r.morningTime;
                              const eTime = r.evening_time || r.eveningTime;
                              const recBy = r.recorded_by || r.recordedBy;
                              return (
                                <div key={r.id || i} className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-slate-800">{r.pond || "Pond"}</span>
                                      <span className="text-slate-400 text-[11px]">{r.date || fmtDate(r.created_at || r.createdAt)}</span>
                                      {r.brand && <span className="bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded font-semibold">{r.brand}</span>}
                                      {r.size && <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.2 rounded font-semibold">{r.size}</span>}
                                      {recBy && <span className="text-[10px] text-slate-400">By: {recBy}</span>}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Morning: <strong className="text-slate-700">{morning} kg</strong>{mTime ? ` (${mTime})` : ""} • Evening: <strong className="text-slate-700">{evening} kg</strong>{eTime ? ` (${eTime})` : ""}
                                      {r.notes && ` • Notes: ${r.notes}`}
                                    </p>
                                  </div>
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded text-xs shrink-0 font-['Barlow_Condensed',sans-serif]">
                                    {totalKg} kg
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 5: Sales Management & Payments */}
                    {farmerDataTab === "sales" && (
                      <div className="space-y-4">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-emerald-700">Total Sales Value</p>
                            <p className="text-xl font-extrabold text-emerald-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                              ₦{totalSalesAmount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-emerald-600">{allSales.length} calculations</p>
                          </div>
                          <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-blue-700">Total Collected</p>
                            <p className="text-xl font-extrabold text-blue-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                              ₦{totalSalesPaid.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-blue-600">Payments recorded</p>
                          </div>
                          <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-amber-700">Outstanding Balance</p>
                            <p className="text-xl font-extrabold text-amber-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                              ₦{totalSalesOutstanding.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-amber-600">Unsettled sales</p>
                          </div>
                        </div>

                        {/* Sales Records List */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <DollarSign size={14} className="text-emerald-600" />
                            Sales Calculations & Records ({allSales.length})
                          </h3>
                          {allSales.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No sales calculation records found in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                              {allSales.map((sc: any, idx: number) => {
                                const totalAmt = Number(sc.total_amount ?? sc.totalAmount) || 0;
                                const amtPaid = Number(sc.amount_paid ?? sc.amountPaid) || 0;
                                const balance = Math.max(0, totalAmt - amtPaid);
                                const rawStatus = sc.payment_status || sc.paymentStatus;
                                const status = rawStatus
                                  ? (String(rawStatus).toLowerCase() === "paid" ? "Paid" : String(rawStatus).toLowerCase().includes("part") ? "Partially Paid" : "Unpaid")
                                  : (amtPaid >= totalAmt && totalAmt > 0 ? "Paid" : amtPaid > 0 ? "Partially Paid" : "Unpaid");
                                const itemsArr = Array.isArray(sc.items) ? sc.items : [];
                                const computedWeight = Number(sc.total_weight_kg ?? sc.weight) || itemsArr.reduce((s: number, it: any) => s + (Number(it.quantityKg ?? it.quantity_kg) || 0), 0);
                                const custName = sc.customer_name || sc.customerName || "Direct Customer";
                                const custPhone = sc.customer_phone || sc.customerPhone;

                                return (
                                  <div key={sc.id || idx} className="p-3 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-bold text-slate-900 truncate">{custName}</p>
                                        {custPhone && <span className="text-[10px] text-slate-500 font-mono">{custPhone}</span>}
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                          status === "Paid"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : status === "Partially Paid"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-rose-100 text-rose-800"
                                        }`}>
                                          {status}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                        {fmtDate(sc.calc_date || sc.created_at || sc.createdAt)} • Total Weight: {computedWeight}kg
                                        {itemsArr.length > 0 && ` • ${itemsArr.map((it: any) => `${it.priceGroupName || "Fish"}: ${it.quantityKg ?? it.quantity_kg ?? 0}kg @ ₦${Number(it.unitPrice ?? it.unit_price ?? 0).toLocaleString()}`).join(", ")}`}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">₦{totalAmt.toLocaleString()}</p>
                                      <p className="text-[10px] text-slate-500">
                                        Paid: <strong className="text-emerald-700">₦{amtPaid.toLocaleString()}</strong>
                                        {balance > 0 && <span className="text-amber-700 ml-1">(Bal: ₦{balance.toLocaleString()})</span>}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Payment Transactions & Audit History */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Clock size={13} className="text-blue-600" />
                            Payment Transactions & Audit Trail ({allPayments.length})
                          </h3>
                          {allPayments.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No separate payment entries recorded.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-44 overflow-y-auto">
                              {allPayments.map((p: any, i: number) => (
                                <div key={p.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">Payment: ₦{Number(p.amount || 0).toLocaleString()}</span>
                                    <span className="text-slate-400 text-[11px] ml-1.5">{fmtDate(p.payment_date || p.created_at)}</span>
                                    {p.notes && <p className="text-[10px] text-slate-500 mt-0.5">{p.notes}</p>}
                                  </div>
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                    {p.calculation_id ? `Ref: ${String(p.calculation_id).slice(0, 8)}` : "Direct"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 6: Financials & Invoices */}
                    {farmerDataTab === "finance" && (
                      <div className="space-y-4">
                        {/* Summary Metric Cards */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-emerald-700">Recorded Revenue</p>
                            <p className="text-xl font-bold text-emerald-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                              ₦{periodRevenue.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{allRev.length} Entries</p>
                          </div>
                          <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl text-center">
                            <p className="text-[10px] uppercase font-bold text-rose-700">Recorded Expenses</p>
                            <p className="text-xl font-bold text-rose-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                              ₦{periodExpenses.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-rose-600 font-medium mt-0.5">{allExp.length} Entries</p>
                          </div>
                          <div className={`p-3 rounded-xl text-center border ${periodNetProfit >= 0 ? "bg-blue-50/80 border-blue-200" : "bg-amber-50/80 border-amber-200"}`}>
                            <p className={`text-[10px] uppercase font-bold ${periodNetProfit >= 0 ? "text-blue-700" : "text-amber-700"}`}>Net Profit</p>
                            <p className={`text-xl font-bold font-['Barlow_Condensed',sans-serif] mt-0.5 ${periodNetProfit >= 0 ? "text-blue-900" : "text-amber-900"}`}>
                              {periodNetProfit < 0 ? "-₦" + Math.abs(periodNetProfit).toLocaleString() : "₦" + periodNetProfit.toLocaleString()}
                            </p>
                            <p className={`text-[10px] font-medium mt-0.5 ${periodNetProfit >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                              {allInvoices.length} Invoices
                            </p>
                          </div>
                        </div>

                        {/* Section 1: Recent Revenues */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <TrendingUp size={14} className="text-emerald-600" />
                              Recorded Revenues ({allRev.length})
                            </span>
                          </h3>
                          {allRev.length === 0 ? (
                            <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No revenue records logged in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allRev.map((rev: any, i: number) => (
                                <div key={rev.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate">
                                      {rev.source || rev.category || "Fish Sales"} {rev.pond ? `• Pond: ${rev.pond}` : (rev.customer ? `• ${rev.customer}` : "")}
                                      {(rev.fish_stock || rev.fishStock || rev.stock_batch || rev.stockBatch) ? ` • Batch: ${rev.fish_stock || rev.fishStock || rev.stock_batch || rev.stockBatch}` : ""}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {fmtDate(rev.date || rev.created_at)} {rev.notes || rev.description ? `• ${rev.notes || rev.description}` : ""}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-sm">
                                      +₦{(Number(rev.amount) || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 2: Recent Expenses */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-rose-700">
                              <CreditCard size={14} className="text-rose-600" />
                              Recorded Expenses ({allExp.length})
                            </span>
                          </h3>
                          {allExp.length === 0 ? (
                            <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No expense records logged in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allExp.map((exp: any, i: number) => (
                                <div key={exp.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 truncate">
                                      {exp.category || "Operational"} {exp.pond ? `• Pond: ${exp.pond}` : (exp.vendor ? `• ${exp.vendor}` : "")}
                                      {(exp.fish_stock || exp.fishStock) ? ` • Batch: ${exp.fish_stock || exp.fishStock}` : ""}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {fmtDate(exp.date || exp.created_at)} {exp.desc || exp.description || exp.notes ? `• ${exp.desc || exp.description || exp.notes}` : ""}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="font-bold text-rose-700 font-['Barlow_Condensed',sans-serif] text-sm">
                                      -₦{(Number(exp.amount) || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Section 3: Invoices */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <FileText size={14} className="text-purple-600" />
                            Sales Invoices ({allInvoices.length})
                          </h3>
                          {allInvoices.length === 0 ? (
                            <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No sales invoices created in this period.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allInvoices.map((inv: any, i: number) => {
                                const custName = (typeof inv.customer === "object" ? inv.customer?.name : inv.customer) || inv.customer_name || "Customer";
                                const invTotal = Number(inv.grand_total ?? inv.grandTotal ?? inv.subtotal) || 0;
                                const invPaid = Number(inv.amount_paid ?? inv.amountPaid) || 0;
                                return (
                                  <div key={inv.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                                    <div>
                                      <p className="font-bold text-slate-800">{inv.inv_number || inv.invNumber || inv.invoice_number || `Invoice #${i + 1}`} • {custName}</p>
                                      <p className="text-[10px] text-slate-400">
                                        {fmtDate(inv.invoice_date || inv.invoiceDate || inv.created_at || inv.due_date)}
                                        {invPaid > 0 && ` • Paid: ₦${invPaid.toLocaleString()}`}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">₦{invTotal.toLocaleString()}</p>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${inv.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                        {inv.status || "Pending"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 7: Health, Water Reports & Equipment */}
                    {farmerDataTab === "health_equipment" && (
                      <div className="space-y-4">
                        {/* Treatments */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Layers size={13} className="text-teal-600" />
                            Fish Health & Medication Treatments ({allTreatments.length})
                          </h3>
                          {allTreatments.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No fish treatments recorded.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-44 overflow-y-auto">
                              {allTreatments.map((tr: any, i: number) => (
                                <div key={tr.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      {tr.cause || tr.disease || tr.diagnosis || "Treatment"} • Pond: {tr.pond_name || tr.pondName || tr.pond || tr.pond_id || "—"}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Medication: {tr.medicine || tr.medication || tr.drug || "—"} {tr.dosage ? `• Dosage: ${tr.dosage}` : ""} {tr.remarks ? `• ${tr.remarks}` : ""} • {fmtDate(tr.date || tr.created_at)}
                                    </p>
                                  </div>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    (tr.status || "").toLowerCase() === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                  }`}>
                                    {tr.status || "Recorded"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Pond Reports & Water / Issue Reports */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Droplets size={13} className="text-blue-600" />
                            Pond Reports & Water Quality Logs ({allPondReports.length + allGeneralReports.length})
                          </h3>
                          {allPondReports.length === 0 && allGeneralReports.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No pond or farm reports logged.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                              {allPondReports.map((rep: any, i: number) => (
                                <div key={rep.id || `pr-${i}`} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      {rep.pond_name || rep.pondName || rep.pond_id || "Pond"} — {rep.report_type || rep.reportType || rep.issue || "Report"} • {fmtDate(rep.report_date || rep.reportDate || rep.date || rep.created_at)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {[
                                        rep.description || rep.issue,
                                        rep.cause ? `Cause: ${rep.cause}` : "",
                                        rep.medicine ? `Medicine: ${rep.medicine}` : "",
                                        rep.action_taken || rep.actionTaken ? `Action: ${rep.action_taken || rep.actionTaken}` : "",
                                        rep.remarks,
                                        rep.ph !== undefined ? `pH: ${rep.ph}` : "",
                                        rep.temp !== undefined ? `Temp: ${rep.temp}°C` : "",
                                        rep.recorded_by || rep.recordedBy ? `By: ${rep.recorded_by || rep.recordedBy}` : "",
                                      ].filter(Boolean).join(" • ") || "Logged report"}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded shrink-0">
                                    {rep.report_type || rep.reportType || "Logged"}
                                  </span>
                                </div>
                              ))}
                              {allGeneralReports.map((rep: any, i: number) => (
                                <div key={rep.id || `gr-${i}`} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50">
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      {rep.title || "Farm Report"} • {fmtDate(rep.date || rep.created_at)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {rep.content || "—"} {rep.author ? `• Author: ${rep.author}` : ""}
                                    </p>
                                  </div>
                                  <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded shrink-0">
                                    {rep.type || rep.status || "Report"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Farm Equipment */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Wrench size={13} className="text-slate-600" />
                            Farm Machinery & Equipment ({allEquipment.length})
                          </h3>
                          {allEquipment.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No farm equipment registered.
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {allEquipment.map((eq: any, i: number) => {
                                const eqCost = Number(eq.total_cost ?? eq.totalCost ?? eq.cost_per_unit ?? eq.costPerUnit) || 0;
                                return (
                                  <div key={eq.id || i} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                                    <p className="font-bold text-slate-900 text-xs truncate">{eq.name || "Equipment"}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {eq.category || "General"} • Qty: {eq.quantity || 1} {eqCost > 0 ? `• ₦${eqCost.toLocaleString()}` : ""}
                                    </p>
                                    <div className="flex items-center justify-between mt-1 text-[10px]">
                                      <span className="text-slate-400">Condition:</span>
                                      <span className="font-semibold text-slate-700">{eq.condition || eq.status || "Good"}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 8: Staff Team & Investors */}
                    {farmerDataTab === "staff_investors" && (
                      <div className="space-y-4">
                        {/* Staff */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <UsersIcon size={14} className="text-emerald-600" />
                            Farm Staff Accounts ({allStaff.length})
                          </h3>
                          {allStaff.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No staff members added by this farmer yet.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                              {allStaff.map((st: any, idx: number) => (
                                <div key={st.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-800 text-xs truncate">{st.name || "Staff Member"}</p>
                                    <p className="text-[11px] text-slate-500 font-mono truncate">
                                      {st.email} {st.phone ? `• ${st.phone}` : ""} {(st.assigned_pond || st.assignedPond) ? `• Pond: ${st.assigned_pond || st.assignedPond}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {Number(st.salary) > 0 && (
                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        ₦{Number(st.salary).toLocaleString()}/mo
                                      </span>
                                    )}
                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                      {st.role || "Staff"}
                                    </span>
                                    <Bdg label={st.status || "Active"} color={st.status === "Pending" ? "amber" : "green"} />
                                    {st.email && (
                                      <button
                                        onClick={() => copyToClipboard(st.email, `Staff email (${st.email})`)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                        title="Copy email"
                                      >
                                        <Copy size={11} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Investors & Capital */}
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                            <Building size={14} className="text-purple-600" />
                            Farm Investors & Capital Partners ({allInvestors.length})
                          </h3>
                          {allInvestors.length === 0 ? (
                            <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                              No investors registered for this farm.
                            </div>
                          ) : (
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                              {allInvestors.map((inv: any, idx: number) => {
                                const invName = inv.full_name || inv.fullName || inv.name || "Investor";
                                const linkedDeals = allInvestments.filter(
                                  (d: any) => String(d.investor_id || d.investorId) === String(inv.id)
                                );
                                const totalInvested = linkedDeals.reduce(
                                  (s: number, d: any) => s + (Number(d.amount_invested ?? d.amountInvested) || 0),
                                  Number(inv.amount) || 0
                                );
                                return (
                                  <div key={inv.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 text-xs truncate">{invName}</p>
                                      <p className="text-[11px] text-slate-500 truncate">{[inv.email, inv.phone, inv.notes].filter(Boolean).join(" • ") || "Partner"}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-purple-800 font-['Barlow_Condensed',sans-serif] text-sm">
                                        {totalInvested > 0 ? `₦${totalInvested.toLocaleString()}` : (inv.share ? `${inv.share}%` : "Partner")}
                                      </p>
                                      <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-semibold">
                                        {inv.status || "Active"} {linkedDeals.length > 0 ? `(${linkedDeals.length} deal${linkedDeals.length === 1 ? "" : "s"})` : ""}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Investment Deals */}
                        {allInvestments.length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                              <DollarSign size={14} className="text-emerald-600" />
                              Active & Past Investment Deals ({allInvestments.length})
                            </h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                              {allInvestments.map((deal: any, idx: number) => {
                                const amtInv = Number(deal.amount_invested ?? deal.amountInvested) || 0;
                                const totalDue = Number(deal.total_amount_due ?? deal.totalAmountDue) || 0;
                                const pct = Number(deal.investor_percentage ?? deal.investorPercentage) || 0;
                                return (
                                  <div key={deal.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 text-xs truncate">
                                        {deal.investment_name || deal.investmentName || `Investment Deal #${idx + 1}`}
                                      </p>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        ROI: {pct}% • Start: {fmtDate(deal.start_date || deal.startDate)} • Maturity: {fmtDate(deal.maturity_date || deal.maturityDate)}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] text-sm">
                                        ₦{amtInv.toLocaleString()}
                                      </p>
                                      {totalDue > 0 && (
                                        <p className="text-[10px] text-purple-700 font-semibold">Due: ₦{totalDue.toLocaleString()}</p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {/* Modal Footer / Direct Admin Controls */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setForm({ ...viewUser });
                    setFErr({});
                    setEditUser(viewUser);
                    setViewUser(null);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Edit2 size={13} className="text-slate-500" /> Edit Details & Plan
                </button>

                {viewUser.hasPaid || viewUser.paystackReference ? (
                  <button
                    onClick={() => {
                      handleSwitchToTrial(viewUser);
                      setViewUser(null);
                    }}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    <Clock size={13} className="text-amber-600" /> Switch to Trial
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleMarkPaid(viewUser);
                      setViewUser(null);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle size={13} /> Mark as Paid (Activate)
                  </button>
                )}

                <button
                  onClick={() => {
                    handleExtendTrial(viewUser);
                    setViewUser(null);
                  }}
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Clock size={13} className="text-slate-500" /> Reset 40-Day Trial
                </button>

                <button
                  onClick={() => {
                    toggleSuspend(viewUser);
                    setViewUser(null);
                  }}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
                    viewUser.accountStatus === "Suspended"
                      ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                      : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                  }`}
                >
                  {viewUser.accountStatus === "Suspended" ? (
                    <><CheckCircle size={13} /> Reactivate Account</>
                  ) : (
                    <><Ban size={13} /> Suspend Account</>
                  )}
                </button>
              </div>

              <PBtn onClick={() => setViewUser(null)}>Done</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {delUser && (
        <Modal title="Confirm Account Deletion" onClose={() => setDelUser(null)}>
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently delete <strong>{delUser.name}</strong> ({delUser.email})?
            This will remove all linked farm data and cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <PBtn outline onClick={() => setDelUser(null)}>
              Cancel
            </PBtn>
            <PBtn
              danger
              onClick={() => {
                onDelete(delUser.id);
                setDelUser(null);
              }}
            >
              Delete Account
            </PBtn>
          </div>
        </Modal>
      )}

      {/* Floating Actions Dropdown Menu — rendered outside table scroll boundaries */}
      {menu && (
        <div
          style={{
            position: "fixed",
            top: menu.top,
            bottom: menu.bottom,
            right: menu.right,
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl py-1.5 w-52 text-left animate-fadeIn ring-1 ring-black/5"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setViewUser(menu.user);
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <Eye size={13} className="text-slate-400" /> View User Details
          </button>
          <button
            onClick={() => {
              setForm({
                ...menu.user,
                trialStartDate: toDateInputValue(menu.user.trialStartDate),
                lastPaymentDate: toDateInputValue(menu.user.lastPaymentDate),
                subscriptionStart: toDateInputValue(menu.user.subscriptionStart),
                subscriptionExpiry: toDateInputValue(menu.user.subscriptionExpiry),
              });
              setFErr({});
              setEditUser(menu.user);
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <Edit2 size={13} className="text-slate-400" /> Edit Details & Plan
          </button>
          {menu.user.hasPaid || menu.user.paystackReference ? (
            <button
              onClick={() => {
                handleSwitchToTrial(menu.user);
              }}
              className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 font-medium transition-colors"
            >
              <Clock size={13} className="text-amber-500" /> Switch to On Trial
            </button>
          ) : (
            <button
              onClick={() => {
                handleMarkPaid(menu.user);
              }}
              className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-medium transition-colors"
            >
              <CheckCircle size={13} className="text-emerald-500" /> Mark as Paid (Activate)
            </button>
          )}
          <button
            onClick={() => {
              handleExtendTrial(menu.user);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            <Clock size={13} className="text-slate-400" /> Reset 40-Day Trial
          </button>
          <button
            onClick={() => {
              toggleSuspend(menu.user);
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            {menu.user.accountStatus === "Suspended" ? (
              <>
                <CheckCircle size={13} className="text-green-500" /> Reactivate Account
              </>
            ) : (
              <>
                <Ban size={13} className="text-amber-500" /> Suspend Account
              </>
            )}
          </button>
          <div className="my-1 border-t border-slate-100" />
          <button
            onClick={() => {
              setDelUser(menu.user);
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors"
          >
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      )}
    </div>
  );
}
