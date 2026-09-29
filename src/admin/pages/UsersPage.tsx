import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Plus, MoreVertical, Eye, Edit2, Ban, Trash2, CheckCircle,
  ChevronUp, ChevronDown, Download, Clock, Shield, Sparkles, Filter,
  RotateCw, RefreshCw, Phone, Mail, MapPin, Copy, ExternalLink, MessageCircle,
  Building, Droplets, Users as UsersIcon, X, Check, ArrowRight, UserCheck, AlertCircle,
  CreditCard, Gift, Tag, DollarSign, TrendingUp, Package, FileText, Layers, Fish, Activity
} from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC } from "../../app/shared";
import type { AdminUser, AdminPlan, AccountStatus } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, computeSubscriptionStatus } from "../types";
import { supabase } from "../../lib/supabase";
import { isStaffUser } from "../../lib/userSync";
import { getUserReferralStats, markReferralRewardsPaid } from "../../lib/referralStore";
import { toast } from "sonner";

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

function copyUserDossier(u: AdminUser, extra?: { farms: any[]; ponds: any[]; staff: any[] }) {
  if (!u) return;
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
    `*Farm Operations*`,
    `Total Farms: ${extra?.farms?.length ?? u.farmCount ?? 1}`,
    `Total Ponds: ${extra?.ponds?.length ?? u.pondCount ?? 0}`,
    `Staff Members Added: ${extra?.staff?.length ?? u.staffCount ?? 0}`,
  ];

  try {
    const rStats = getUserReferralStats(u);
    lines.push(
      ``,
      `*Referral Program*`,
      `Referral Code: ${rStats.referralCode}`,
      `Total Registered Referrals: ${rStats.totalReferralsCount}`,
      `Subscribed / Paid Referrals: ${rStats.paidReferralsCount}`,
      `Total Referral Earnings: ₦${rStats.totalEarnings.toLocaleString()}`,
      `Available to Redeem: ₦${rStats.availableEarnings.toLocaleString()}`,
    );
  } catch {}

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
      lines.push(`  ${idx + 1}. ${p?.name || `Pond #${idx + 1}`}${p?.size_m2 ? ` (${p.size_m2} m²)` : ""}`);
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
      <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
        f.freeAccess ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
      }`}>
        <div>
          <p className="text-xs font-bold text-slate-800">Complimentary / Free Access</p>
          <p className="text-[11px] text-slate-500">Exempt user from all billing while keeping active status.</p>
        </div>
        <button
          type="button"
          onClick={() => setF({ ...f, freeAccess: !f.freeAccess })}
          className={`w-10 h-5 rounded-full relative transition-colors ${
            f.freeAccess ? "bg-green-600" : "bg-slate-300"
          }`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            f.freeAccess ? "translate-x-5" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Custom Price (₦ Override)">
          <input
            type="number"
            value={f.subscriptionAmount ?? ""}
            onChange={e => setF({ ...f, subscriptionAmount: e.target.value ? Number(e.target.value) : null })}
            className={IC}
            placeholder="Plan default"
          />
        </F>
        <F label="Trial Start Date">
          <input
            type="date"
            value={f.trialStartDate || ""}
            onChange={e => setF({ ...f, trialStartDate: e.target.value || null })}
            className={IC}
          />
        </F>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Subscription Start">
          <input
            type="date"
            value={f.subscriptionStart || ""}
            onChange={e => setF({ ...f, subscriptionStart: e.target.value || null })}
            className={IC}
          />
        </F>
        <F label="Subscription Expiry">
          <input
            type="date"
            value={f.subscriptionExpiry || ""}
            onChange={e => setF({ ...f, subscriptionExpiry: e.target.value || null })}
            className={IC}
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

export default function UsersPage({ users, plans, onAdd, onUpdate, onDelete, onExportCSV, onRefresh, isRefreshing }: Props) {
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
  const [farmerDataTab, setFarmerDataTab] = useState<"summary" | "ponds" | "feed" | "finance" | "staff" | "farms">("summary");

  const [userExtra, setUserExtra] = useState<{
    loading: boolean;
    farms: { id: string; name: string; city?: string; state?: string; country?: string; created_at?: string }[];
    ponds: { id: string; name?: string; size_m2?: number; farm_id?: string; current_count?: number; initial_stock?: number; species?: string; stocking_date?: string }[];
    staff: { id: string; name: string; email: string; role: string; status: string }[];
    feedInventory: { id: string; brand?: string; size?: string; bags_in_stock?: number; weight_per_bag?: number; total_kg?: number }[];
    feedingRecords: { id: string; pond?: string; date?: string; total?: number; size?: string; morning?: number; evening?: number }[];
    revenues: { id: string; category?: string; amount?: number; date?: string; customer?: string }[];
    expenses: { id: string; category?: string; amount?: number; date?: string; description?: string }[];
    invoices: { id: string; invoice_number?: string; customer_name?: string; grand_total?: number; status?: string; created_at?: string }[];
    investors: { id: string; name?: string; email?: string; phone?: string; total_invested?: number }[];
  }>({
    loading: false,
    farms: [],
    ponds: [],
    staff: [],
    feedInventory: [],
    feedingRecords: [],
    revenues: [],
    expenses: [],
    invoices: [],
    investors: [],
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
        staff: [],
        feedInventory: [],
        feedingRecords: [],
        revenues: [],
        expenses: [],
        invoices: [],
        investors: [],
      };
    }

    if (userExtraCacheRef.current.has(u.id)) {
      return { ...userExtraCacheRef.current.get(u.id), loading: false };
    }
    if (u.email && userExtraCacheRef.current.has(u.email)) {
      return { ...userExtraCacheRef.current.get(u.email), loading: false };
    }

    let localFarms: any[] = [];
    let localPonds: any[] = [];
    let localStaff: any[] = [];
    let localFeed: any[] = [];
    let localFeeding: any[] = [];
    let localRevenues: any[] = [];
    let localExpenses: any[] = [];
    let localInvoices: any[] = [];
    let localInvestors: any[] = [];

    const matchesUser = (item: any) => {
      if (!item) return false;
      return item.user_id === u.id || item.userId === u.id || item.owner_id === u.id ||
             (u.email && (item.user_email === u.email || item.email === u.email));
    };

    const getItemsFromKeys = (keys: string[]) => {
      let combined: any[] = [];
      for (const k of keys) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) combined.push(...parsed);
          }
        } catch {}
      }
      return combined;
    };

    try {
      const farms = getItemsFromKeys(["pondtora_farms", `pondtora_${u.id}_farms`, ...(u.email ? [`pondtora_${u.email}_farms`] : [])]);
      localFarms = farms.filter(matchesUser);
    } catch {}

    try {
      const ponds = getItemsFromKeys(["pondtora_ponds", `pondtora_${u.id}_ponds`, ...(u.email ? [`pondtora_${u.email}_ponds`] : [])]);
      localPonds = ponds.filter(matchesUser);
    } catch {}

    try {
      const staff = getItemsFromKeys(["pondtora_staff", `pondtora_${u.id}_staff`, ...(u.email ? [`pondtora_${u.email}_staff`] : [])]);
      localStaff = staff.filter(matchesUser);
    } catch {}

    try {
      const feed = getItemsFromKeys(["pondtora_feed_inventory", "pondtora_feeds", `pondtora_${u.id}_feed_inventory`, ...(u.email ? [`pondtora_${u.email}_feed_inventory`] : [])]);
      localFeed = feed.filter(matchesUser);
    } catch {}

    try {
      const feeding = getItemsFromKeys(["pondtora_feeding_records", `pondtora_${u.id}_feeding_records`, ...(u.email ? [`pondtora_${u.email}_feeding_records`] : [])]);
      localFeeding = feeding.filter(matchesUser);
    } catch {}

    try {
      const invoices = getItemsFromKeys(["pondtora_invoices", `pondtora_${u.id}_invoices`, ...(u.email ? [`pondtora_${u.email}_invoices`] : [])]);
      localInvoices = invoices.filter(matchesUser);
    } catch {}

    try {
      const revenues = getItemsFromKeys(["pondtora_revenues", `pondtora_${u.id}_revenues`, ...(u.email ? [`pondtora_${u.email}_revenues`] : [])]);
      localRevenues = revenues.filter(matchesUser);
    } catch {}

    try {
      const expenses = getItemsFromKeys(["pondtora_expenses", `pondtora_${u.id}_expenses`, ...(u.email ? [`pondtora_${u.email}_expenses`] : [])]);
      localExpenses = expenses.filter(matchesUser);
    } catch {}

    if (localFarms.length === 0 && (u.farmCount || u.farmName)) {
      localFarms = [{ id: `farm-${u.id}`, name: u.farmName || "Primary Farm", city: u.city, state: u.state, country: u.country }];
    }

    return {
      loading: false,
      farms: localFarms,
      ponds: localPonds,
      staff: localStaff,
      feedInventory: localFeed,
      feedingRecords: localFeeding,
      revenues: localRevenues,
      expenses: localExpenses,
      invoices: localInvoices,
      investors: localInvestors,
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

    // 2. Fetch live data in background with RPC priority and direct query fallback
    const fetchLiveData = async () => {
      // First try the security definer RPC function which bypasses user RLS restrictions for admins
      try {
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_user_full_records_for_admin", {
          target_user_id: viewUser.id,
          target_email: viewUser.email || null,
        });

        if (!rpcErr && rpcData && typeof rpcData === "object" && isSubscribed) {
          const updated = {
            loading: false,
            farms: Array.isArray(rpcData.farms) && rpcData.farms.length > 0 ? rpcData.farms : initialSync.farms,
            ponds: Array.isArray(rpcData.ponds) && rpcData.ponds.length > 0 ? rpcData.ponds : initialSync.ponds,
            staff: Array.isArray(rpcData.staff) && rpcData.staff.length > 0 ? rpcData.staff : initialSync.staff,
            feedInventory: Array.isArray(rpcData.feedInventory) && rpcData.feedInventory.length > 0 ? rpcData.feedInventory : initialSync.feedInventory,
            feedingRecords: Array.isArray(rpcData.feedingRecords) && rpcData.feedingRecords.length > 0 ? rpcData.feedingRecords : initialSync.feedingRecords,
            revenues: Array.isArray(rpcData.revenues) && rpcData.revenues.length > 0 ? rpcData.revenues : initialSync.revenues,
            expenses: Array.isArray(rpcData.expenses) && rpcData.expenses.length > 0 ? rpcData.expenses : initialSync.expenses,
            invoices: Array.isArray(rpcData.invoices) && rpcData.invoices.length > 0 ? rpcData.invoices : initialSync.invoices,
            investors: Array.isArray(rpcData.investors) && rpcData.investors.length > 0 ? rpcData.investors : initialSync.investors,
          };

          userExtraCacheRef.current.set(viewUser.id, updated);
          if (viewUser.email) userExtraCacheRef.current.set(viewUser.email, updated);

          setUserExtra(updated);
          return;
        }
      } catch (e) {
        console.warn("RPC fetch fallback to direct queries:", e);
      }

      // Fallback: direct table queries with timeout
      const timeoutPromise = new Promise<{ isTimeout: true }>(resolve =>
        setTimeout(() => resolve({ isTimeout: true }), 3000)
      );

      const queriesPromise = Promise.allSettled([
        supabase.from("farms").select("id, name, city, state, country, created_at").eq("user_id", viewUser.id).order("created_at", { ascending: true }),
        supabase.from("ponds").select("id, name, size_m2, farm_id, current_count, initial_stock, species, stocking_date").eq("user_id", viewUser.id).order("created_at", { ascending: false }),
        supabase.from("staff_members").select("id, name, email, role, status").eq("user_id", viewUser.id).order("created_at", { ascending: false }),
        supabase.from("feed_inventory").select("id, brand, size, bags_in_stock, weight_per_bag, total_kg").eq("user_id", viewUser.id),
        supabase.from("feeding_records").select("id, pond, date, total, size, morning, evening").eq("user_id", viewUser.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("revenues").select("id, category, amount, date, customer, description").eq("user_id", viewUser.id).order("date", { ascending: false }).limit(40),
        supabase.from("expenses").select("id, category, amount, date, description, vendor").eq("user_id", viewUser.id).order("date", { ascending: false }).limit(40),
        supabase.from("invoices").select("id, invoice_number, customer_name, grand_total, status, created_at").eq("user_id", viewUser.id).order("created_at", { ascending: false }).limit(40),
        supabase.from("investors").select("id, name, email, phone, total_invested").eq("user_id", viewUser.id),
      ]);

      const result = await Promise.race([queriesPromise, timeoutPromise]);
      if (!isSubscribed) return;

      if ("isTimeout" in result) {
        setUserExtra(prev => ({ ...prev, loading: false }));
        return;
      }

      const [farmsRes, pondsRes, staffRes, feedRes, feedingRes, revRes, expRes, invRes, investRes] = result;

      const extract = (res: PromiseSettledResult<any>, fallback: any[]) => {
        if (res.status === "fulfilled" && res.value?.data && Array.isArray(res.value.data) && res.value.data.length > 0) {
          return res.value.data;
        }
        return fallback;
      };

      const updated = {
        loading: false,
        farms: extract(farmsRes, initialSync.farms),
        ponds: extract(pondsRes, initialSync.ponds),
        staff: extract(staffRes, initialSync.staff),
        feedInventory: extract(feedRes, initialSync.feedInventory),
        feedingRecords: extract(feedingRes, initialSync.feedingRecords),
        revenues: extract(revRes, initialSync.revenues),
        expenses: extract(expRes, initialSync.expenses),
        invoices: extract(invRes, initialSync.invoices),
        investors: extract(investRes, initialSync.investors),
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

    const updated = { ...editUser, ...form } as AdminUser;
    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
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
    const updated: AdminUser = {
      ...u,
      hasPaid: true,
      subscriptionStatus: "Active",
      subscriptionStart: todayStr,
      subscriptionExpiry: expDate.toISOString().slice(0, 10),
      trialStartDate: null,
    };
    onUpdate(updated);
    setMenu(null);
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
                      className="px-4 py-3 text-left text-[10px] uppercase tracking-wider text-slate-400 font-bold whitespace-nowrap"
                    >
                      {col.key ? <SortBtn k={col.key} label={col.label} /> : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isRefreshing && users.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-20 text-slate-400 text-xs">
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
                    <td colSpan={9} className="text-center py-16 text-slate-400 text-xs">
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
                {paged.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setViewUser(u)}
                    className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                    title="Click to view full user details and reach out"
                  >
                    {/* 1. User / Contact */}
                    <td className="px-4 py-3 max-w-[220px]">
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
                            <Droplets size={10} className="text-blue-500" /> {u.pondCount ?? 0} Ponds
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-semibold px-1.5 py-0.5 rounded w-fit flex items-center gap-0.5" title="Staff added">
                          <UsersIcon size={10} className="text-emerald-600" /> {u.staffCount ?? 0} Staff Member{(u.staffCount !== 1) ? "s" : ""}
                        </span>
                      </div>
                    </td>

                    {/* 4. Active Plan */}
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                      {u.activePlan ? (
                        <div>
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                            {u.activePlan}
                          </span>
                          <span className="block text-[10px] text-slate-400 capitalize mt-0.5">
                            {u.billingFrequency || "monthly"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* 5. Sub Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                        {u.subscriptionStatus === "Active" && (u.hasPaid || u.paystackReference) && !u.freeAccess && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            Paid
                          </span>
                        )}
                        {u.freeAccess && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">
                            Free ✦
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. Trial / Expiry */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {u.subscriptionStatus === "Trial" ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <Clock size={11} className="text-amber-500" /> {trialDaysLeft(u.trialStartDate)}d left
                        </span>
                      ) : u.subscriptionExpiry ? (
                        fmtDate(u.subscriptionExpiry)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* 7. Account */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Bdg
                        label={u.accountStatus}
                        color={u.accountStatus === "Active" ? "green" : "gray"}
                      />
                    </td>

                    {/* 8. Joined */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                      {fmtDate(u.createdAt)}
                    </td>

                    {/* 9. Actions */}
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
                ))}
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
              paged.map((u) => (
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
                      <span>💧 {u.pondCount ?? 0} Ponds</span>
                    </div>
                  </div>
                </div>
              ))
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

            {/* Navigation Tabs for Farmer Data */}
            <div className="px-5 pt-3 border-b border-slate-200 flex items-center justify-between gap-1.5 overflow-x-auto bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: "summary", label: "📊 Overview", count: null },
                  { id: "ponds", label: "💧 Ponds & Fish", count: (userExtra?.ponds || []).length > 0 ? userExtra.ponds.length : (viewUser.pondCount ?? 0) },
                  { id: "feed", label: "🌾 Feed & Stock", count: (userExtra?.feedInventory || []).length },
                  { id: "finance", label: "💰 Financials & Invoices", count: (userExtra?.revenues?.length || 0) + (userExtra?.expenses?.length || 0) + (userExtra?.invoices?.length || 0) },
                  { id: "staff", label: "👥 Staff Team", count: (userExtra?.staff || []).length > 0 ? userExtra.staff.length : (viewUser.staffCount ?? 0) },
                  { id: "farms", label: "🏡 Farms", count: (userExtra?.farms || []).length > 0 ? userExtra.farms.length : (viewUser.farmCount ?? 1) },
                ].map(t => (
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
              {userExtra?.loading && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium px-2 py-1 shrink-0 animate-pulse">
                  <RefreshCw size={11} className="animate-spin text-emerald-600" />
                  <span>Syncing data...</span>
                </div>
              )}
            </div>

            {/* Modal Body with Tab Content */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Tab 1: Summary & Operations Overview */}
              {farmerDataTab === "summary" && (
                <div className="space-y-4">
                  {/* Account & Contact Summary */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building size={13} className="text-emerald-600" /> Account, Contact & Location
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Full Name</p>
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
                        <p className="text-[10px] uppercase font-bold text-slate-400">Primary Farm</p>
                        <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">{viewUser.farmName || "Primary Farm"}</p>
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

                  {/* All Farmer Assets Overview Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers size={13} className="text-emerald-600" /> Farm Records & Assets Summary
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Farms</p>
                        <p className="text-lg font-extrabold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.farms || []).length > 0 ? userExtra.farms.length : (viewUser.farmCount || 1)}
                        </p>
                      </div>
                      <div className="bg-blue-50/50 border border-blue-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-blue-500">Ponds Active</p>
                        <p className="text-lg font-extrabold text-blue-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.ponds || []).length > 0 ? userExtra.ponds.length : (viewUser.pondCount || 0)}
                        </p>
                      </div>
                      <div className="bg-cyan-50/50 border border-cyan-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-cyan-600">Fish Stocked</p>
                        <p className="text-lg font-extrabold text-cyan-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.ponds || []).length > 0
                            ? userExtra.ponds.reduce((s, p) => s + (Number(p?.current_count ?? p?.initial_stock) || 0), 0).toLocaleString()
                            : (viewUser.totalFishStocked ? Number(viewUser.totalFishStocked).toLocaleString() : "0")}
                        </p>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-emerald-600">Feed in Stock</p>
                        <p className="text-lg font-extrabold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.feedInventory || []).reduce((s, f) => s + (Number(f?.bags_in_stock) || 0), 0)} Bags
                        </p>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-amber-700">Feed Consumed</p>
                        <p className="text-lg font-extrabold text-amber-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.feedingRecords || []).reduce((s, r) => s + (Number(r?.total) || 0), 0)} kg
                        </p>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-emerald-700">Total Revenue</p>
                        <p className="text-lg font-extrabold text-emerald-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          ₦{(userExtra?.revenues || []).reduce((s, r) => s + (Number(r?.amount) || 0), 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-purple-50/50 border border-purple-200/70 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-purple-600">Sales Invoices</p>
                        <p className="text-lg font-extrabold text-purple-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.invoices || []).length > 0 ? userExtra.invoices.length : (viewUser.invoicesCount || 0)}
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Staff Team</p>
                        <p className="text-lg font-extrabold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                          {(userExtra?.staff || []).length > 0 ? userExtra.staff.length : (viewUser.staffCount || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subscription & Rate Override */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <CreditCard size={13} className="text-emerald-600" /> Subscription, Plan & Rate Override
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
                        <p className="text-[10px] uppercase font-bold text-slate-400">Custom Price Override</p>
                        <p className={`font-bold text-xs mt-0.5 ${viewUser.subscriptionAmount !== null ? "text-emerald-700" : "text-slate-500"}`}>
                          {viewUser.subscriptionAmount !== null ? `₦${viewUser.subscriptionAmount.toLocaleString()} (Custom)` : "Plan standard"}
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Trial Period</p>
                        <p className="font-semibold text-xs mt-0.5 text-amber-700">
                          {trialDaysLeft(viewUser.trialStartDate)} days left (started {fmtDate(viewUser.trialStartDate)})
                        </p>
                      </div>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Payment Status</p>
                        <p className="font-semibold text-xs mt-0.5">
                          {viewUser.hasPaid || viewUser.paystackReference ? (
                            <span className="text-emerald-600 font-bold">Paid & Verified</span>
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Droplets size={14} className="text-blue-500" />
                      All Registered Ponds ({(userExtra?.ponds || []).length})
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Total Fish: <strong className="text-blue-700">{(userExtra?.ponds || []).reduce((s, p) => s + (Number(p?.current_count ?? p?.initial_stock) || 0), 0).toLocaleString()}</strong>
                    </span>
                  </div>

                  {(userExtra?.ponds || []).length === 0 ? (
                    <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400">
                      No ponds created by this farmer yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-slate-100">
                      {(userExtra?.ponds || []).map((p, idx) => (
                        <div key={p.id || idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate">{p.name || `Pond #${idx + 1}`}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Species: <strong className="text-slate-700">{p.species || "Catfish"}</strong> • Stock Date: {fmtDate(p.stocking_date)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-blue-700 text-sm font-['Barlow_Condensed',sans-serif]">
                              {(p.current_count ?? p.initial_stock ?? 0).toLocaleString()} fish
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {p.size_m2 ? `${p.size_m2} m²` : "Configured"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Feed Stock & Feeding Logs */}
              {farmerDataTab === "feed" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Package size={14} className="text-emerald-600" />
                      Feed Inventory in Stock ({(userExtra?.feedInventory || []).length})
                    </h3>
                    {(userExtra?.feedInventory || []).length === 0 ? (
                      <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        No feed items currently added to inventory.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(userExtra?.feedInventory || []).map((f, i) => (
                          <div key={f.id || i} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                            <p className="font-bold text-slate-900 text-xs truncate">{f.brand || "Feed"}</p>
                            <p className="text-[11px] text-slate-600 mt-0.5">{f.size || "Standard"} • {f.weight_per_bag || 15}kg/bag</p>
                            <p className="text-emerald-700 font-bold text-xs mt-1">{f.bags_in_stock ?? 0} bags ({f.total_kg ?? 0} kg)</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600" />
                      Recent Feeding Logs ({(userExtra?.feedingRecords || []).length})
                    </h3>
                    {(userExtra?.feedingRecords || []).length === 0 ? (
                      <div className="p-4 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        No feeding records logged yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {(userExtra?.feedingRecords || []).map((r, i) => (
                          <div key={r.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-800">{r.pond}</span>
                              <span className="text-slate-400 text-[11px] ml-1.5">{r.date} ({r.size || "—"})</span>
                            </div>
                            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                              {r.total || ((r.morning || 0) + (r.evening || 0))} kg
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Financials & Invoices */}
              {farmerDataTab === "finance" && (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl text-center">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Recorded Revenue</p>
                      <p className="text-xl font-bold text-emerald-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                        ₦{(userExtra?.revenues || []).reduce((s, r) => s + (Number(r?.amount) || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{(userExtra?.revenues || []).length} Entries</p>
                    </div>
                    <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl text-center">
                      <p className="text-[10px] uppercase font-bold text-rose-700">Recorded Expenses</p>
                      <p className="text-xl font-bold text-rose-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
                        ₦{(userExtra?.expenses || []).reduce((s, e) => s + (Number(e?.amount) || 0), 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-rose-600 font-medium mt-0.5">{(userExtra?.expenses || []).length} Entries</p>
                    </div>
                    {(() => {
                      const totalRev = (userExtra?.revenues || []).reduce((s, r) => s + (Number(r?.amount) || 0), 0);
                      const totalExp = (userExtra?.expenses || []).reduce((s, e) => s + (Number(e?.amount) || 0), 0);
                      const net = totalRev - totalExp;
                      return (
                        <div className={`p-3 rounded-xl text-center border ${net >= 0 ? "bg-blue-50/80 border-blue-200" : "bg-amber-50/80 border-amber-200"}`}>
                          <p className={`text-[10px] uppercase font-bold ${net >= 0 ? "text-blue-700" : "text-amber-700"}`}>Net Profit</p>
                          <p className={`text-xl font-bold font-['Barlow_Condensed',sans-serif] mt-0.5 ${net >= 0 ? "text-blue-900" : "text-amber-900"}`}>
                            {net < 0 ? "-₦" + Math.abs(net).toLocaleString() : "₦" + net.toLocaleString()}
                          </p>
                          <p className={`text-[10px] font-medium mt-0.5 ${net >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                            {(userExtra?.invoices || []).length} Invoices
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Section 1: Recent Revenues */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-emerald-700">
                        <TrendingUp size={14} className="text-emerald-600" />
                        Recorded Revenues ({(userExtra?.revenues || []).length})
                      </span>
                    </h3>
                    {(userExtra?.revenues || []).length === 0 ? (
                      <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        No revenue records logged yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {(userExtra?.revenues || []).map((rev, i) => (
                          <div key={rev.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {rev.category || "Fish Sales"} {rev.customer ? `• ${rev.customer}` : ""}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {fmtDate(rev.date || rev.created_at)} {rev.description ? `• ${rev.description}` : ""}
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
                        Recorded Expenses ({(userExtra?.expenses || []).length})
                      </span>
                    </h3>
                    {(userExtra?.expenses || []).length === 0 ? (
                      <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        No expense records logged yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {(userExtra?.expenses || []).map((exp, i) => (
                          <div key={exp.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">
                                {exp.category || "Operational"} {exp.vendor ? `• ${exp.vendor}` : ""}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                {fmtDate(exp.date || exp.created_at)} {exp.description ? `• ${exp.description}` : ""}
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
                      Sales Invoices ({(userExtra?.invoices || []).length})
                    </h3>
                    {(userExtra?.invoices || []).length === 0 ? (
                      <div className="p-3 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        No sales invoices created yet.
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {(userExtra?.invoices || []).map((inv, i) => (
                          <div key={inv.id || i} className="p-2.5 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 transition-colors">
                            <div>
                              <p className="font-bold text-slate-800">{inv.invoice_number || `Invoice #${i + 1}`} • {inv.customer_name || "Customer"}</p>
                              <p className="text-[10px] text-slate-400">{fmtDate(inv.created_at || inv.due_date)}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-slate-900">₦{(Number(inv.grand_total || inv.subtotal) || 0).toLocaleString()}</p>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${inv.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {inv.status || "Pending"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Staff Team */}
              {farmerDataTab === "staff" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UsersIcon size={14} className="text-emerald-600" />
                    Staff Accounts Added by Farmer ({(userExtra?.staff || []).length})
                  </h3>
                  {(userExtra?.staff || []).length === 0 ? (
                    <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                      No staff members invited yet.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {(userExtra?.staff || []).map((st) => (
                        <div key={st.id} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{st.name || "Staff Member"}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{st.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {st.role || "Staff"}
                            </span>
                            <Bdg label={st.status || "Active"} color={st.status === "Pending" ? "amber" : "green"} />
                            <button
                              onClick={() => copyToClipboard(st.email, `Staff email (${st.email})`)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded"
                              title="Copy email"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Farms List */}
              {farmerDataTab === "farms" && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building size={14} className="text-emerald-600" />
                    Farms Owned by Farmer ({(userExtra?.farms || []).length})
                  </h3>
                  {(userExtra?.farms || []).length === 0 ? (
                    <div className="p-6 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                      Primary Farm: {viewUser.farmName || "Primary Farm"}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {(userExtra?.farms || []).map((f, idx) => (
                        <div key={f.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-slate-50">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{f.name}</p>
                            <p className="text-[11px] text-slate-500">{[f.city, f.state, f.country].filter(Boolean).join(", ") || "Nigeria"}</p>
                          </div>
                          <span className="text-[10px] text-slate-400">{fmtDate(f.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
                  <Clock size={13} className="text-slate-500" /> Reset 30-Day Trial
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
              setForm({ ...menu.user });
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
            <Clock size={13} className="text-slate-400" /> Reset 30-Day Trial
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
