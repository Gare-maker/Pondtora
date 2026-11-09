import React, { useState, useMemo, useEffect } from "react";
import {
  Users, TrendingUp, AlertCircle, Ban, Clock, CreditCard, DollarSign,
  ArrowUpRight, Activity, Package, UserCheck, Shield, RotateCw, Droplets,
  Building, Phone, Mail, MessageCircle, Copy, Search, Eye, Filter,
  CheckCircle, ArrowRight, FileText, ChevronRight, Layers, PieChart as PieChartIcon
} from "lucide-react";
import { Card, Bdg } from "../../app/shared";
import type { AdminUser, AdminPlan, AdminActivityLog } from "../types";
import { fmtDate, trialDaysLeft, subscriptionDaysLeft, fmtMoney, effectivePrice } from "../types";
import { isStaffUser } from "../../lib/userSync";
import type { PlatformOperationalStats } from "../../lib/userSync";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

interface Props {
  users: AdminUser[];
  plans: AdminPlan[];
  logs?: AdminActivityLog[];
  platformStats?: PlatformOperationalStats;
  onNavigate?: (page: string) => void;
  onInspectUser?: (user: AdminUser) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLiveDb?: boolean;
  lastSynced?: Date | null;
}

function StatBox({
  label,
  value,
  subtitle,
  icon: Icon,
  bg,
  ic,
  badge,
  onClick,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  bg: string;
  ic: string;
  badge?: { text: string; color: "green" | "amber" | "red" | "blue" | "purple" };
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={`p-4 relative overflow-hidden transition-all hover:shadow-md border border-slate-200/80 ${onClick ? "cursor-pointer hover:border-emerald-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold truncate">{label}</p>
          <p className="text-2xl lg:text-3xl font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900 mt-0.5 leading-none truncate">
            {value}
          </p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={18} className={ic} />
        </div>
      </div>
      {badge && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Category</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            badge.color === "green" ? "bg-green-100 text-green-700" :
            badge.color === "amber" ? "bg-amber-100 text-amber-700" :
            badge.color === "blue" ? "bg-blue-100 text-blue-700" :
            badge.color === "purple" ? "bg-purple-100 text-purple-700" : "bg-red-100 text-red-700"
          }`}>
            {badge.text}
          </span>
        </div>
      )}
    </Card>
  );
}

const SC: Record<string, "green" | "amber" | "red" | "gray"> = {
  Active: "green",
  Trial: "amber",
  Expired: "red",
  Suspended: "gray",
  Cancelled: "gray",
};

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

export default function DashboardPage({
  users,
  plans,
  logs = [],
  platformStats,
  onNavigate,
  onInspectUser,
  onRefresh,
  isRefreshing,
  isLiveDb,
  lastSynced,
}: Props) {
  const [activeTab, setActiveTab_] = useState<"operations" | "saas" | "users">(() => {
    try {
      const saved = localStorage.getItem("pondtora_admin_dashboard_tab");
      if (saved === "operations" || saved === "saas" || saved === "users") return saved;
    } catch {}
    return "operations";
  });
  const setActiveTab = (t: "operations" | "saas" | "users") => {
    setActiveTab_(t);
    try { localStorage.setItem("pondtora_admin_dashboard_tab", t); } catch {}
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedUserDossier, setSelectedUserDossier] = useState<AdminUser | null>(null);
  const [dossierExtra, setDossierExtra] = useState<{
    loading: boolean;
    farms: any[];
    ponds: any[];
    revenues: any[];
    expenses: any[];
    invoices: any[];
    sales: any[];
    feedInventory: any[];
    feedingRecords: any[];
    staff: any[];
  }>({
    loading: false,
    farms: [],
    ponds: [],
    revenues: [],
    expenses: [],
    invoices: [],
    sales: [],
    feedInventory: [],
    feedingRecords: [],
    staff: [],
  });

  useEffect(() => {
    if (!selectedUserDossier?.id) return;
    let active = true;
    const uid = selectedUserDossier.id;

    // Seed from local cache if available
    let localCache: any = null;
    try {
      const raw = localStorage.getItem(`pondtora_${uid}_cache`);
      if (raw) localCache = JSON.parse(raw);
    } catch {}

    setDossierExtra({
      loading: true,
      farms: Array.isArray(localCache?.farms) ? localCache.farms : [],
      ponds: Array.isArray(localCache?.ponds) ? localCache.ponds : [],
      revenues: Array.isArray(localCache?.revenues) ? localCache.revenues : [],
      expenses: Array.isArray(localCache?.expenses) ? localCache.expenses : [],
      invoices: Array.isArray(localCache?.invoices) ? localCache.invoices : [],
      sales: Array.isArray(localCache?.salesCalculations) ? localCache.salesCalculations : [],
      feedInventory: Array.isArray(localCache?.feedInventory) ? localCache.feedInventory : [],
      feedingRecords: Array.isArray(localCache?.feedingRecords) ? localCache.feedingRecords : [],
      staff: Array.isArray(localCache?.staffMembers) ? localCache.staffMembers : [],
    });

    (async () => {
      try {
        // First try RPC with p_user_id
        const { data: rpcData, error: rpcErr } = await (supabase.rpc as any)("get_user_full_records_for_admin", {
          p_user_id: uid,
        });
        if (!rpcErr && rpcData && typeof rpcData === "object" && active) {
          setDossierExtra(prev => ({
            loading: false,
            farms: Array.isArray(rpcData.farms) && rpcData.farms.length > 0 ? rpcData.farms : prev.farms,
            ponds: Array.isArray(rpcData.ponds) && rpcData.ponds.length > 0 ? rpcData.ponds : prev.ponds,
            revenues: Array.isArray(rpcData.revenues) && rpcData.revenues.length > 0 ? rpcData.revenues : prev.revenues,
            expenses: Array.isArray(rpcData.expenses) && rpcData.expenses.length > 0 ? rpcData.expenses : prev.expenses,
            invoices: Array.isArray(rpcData.invoices) && rpcData.invoices.length > 0 ? rpcData.invoices : prev.invoices,
            sales: Array.isArray(rpcData.sales_calculations || rpcData.salesCalculations)
              ? (rpcData.sales_calculations || rpcData.salesCalculations)
              : prev.sales,
            feedInventory: Array.isArray(rpcData.feed_inventory || rpcData.feedInventory)
              ? (rpcData.feed_inventory || rpcData.feedInventory)
              : prev.feedInventory,
            feedingRecords: Array.isArray(rpcData.feeding_records || rpcData.feedingRecords)
              ? (rpcData.feeding_records || rpcData.feedingRecords)
              : prev.feedingRecords,
            staff: Array.isArray(rpcData.staff_members || rpcData.staff)
              ? (rpcData.staff_members || rpcData.staff)
              : prev.staff,
          }));
          return;
        }
      } catch {}

      try {
        const farmsRes = await supabase.from("farms").select("*").eq("user_id", uid);
        const farmsList = farmsRes.data || [];
        const farmIds = farmsList.map((f: any) => f.id).filter(Boolean);
        const filterStr = farmIds.length > 0
          ? `user_id.eq.${uid},farm_id.in.(${farmIds.join(",")})`
          : `user_id.eq.${uid}`;

        const [pondsRes, revRes, expRes, invRes, salesRes, feedRes, feedingRes, staffRes] = await Promise.all([
          supabase.from("ponds").select("*").or(filterStr),
          supabase.from("revenues").select("*").or(filterStr),
          supabase.from("expenses").select("*").or(filterStr),
          supabase.from("invoices").select("*").or(filterStr),
          supabase.from("sales_calculations").select("*").or(filterStr),
          supabase.from("feed_inventory").select("*").or(filterStr),
          supabase.from("feeding_records").select("*").or(filterStr),
          supabase.from("staff_members").select("*").eq("user_id", uid),
        ]);

        if (!active) return;
        setDossierExtra(prev => ({
          loading: false,
          farms: farmsList.length > 0 ? farmsList : prev.farms,
          ponds: (pondsRes.data && pondsRes.data.length > 0) ? pondsRes.data : prev.ponds,
          revenues: (revRes.data && revRes.data.length > 0) ? revRes.data : prev.revenues,
          expenses: (expRes.data && expRes.data.length > 0) ? expRes.data : prev.expenses,
          invoices: (invRes.data && invRes.data.length > 0) ? invRes.data : prev.invoices,
          sales: (salesRes.data && salesRes.data.length > 0) ? salesRes.data : prev.sales,
          feedInventory: (feedRes.data && feedRes.data.length > 0) ? feedRes.data : prev.feedInventory,
          feedingRecords: (feedingRes.data && feedingRes.data.length > 0) ? feedingRes.data : prev.feedingRecords,
          staff: (staffRes.data && staffRes.data.length > 0) ? staffRes.data : prev.staff,
        }));
      } catch {
        if (active) setDossierExtra(prev => ({ ...prev, loading: false }));
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedUserDossier?.id]);

  const ownerUsers = useMemo(() => (users || []).filter(u => !isStaffUser(u)), [users]);

  // Compute Key Financial and User Statistics (strictly customer/owner accounts)
  const stats = useMemo(() => {
    const paidUsers = ownerUsers.filter(u => Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess);
    const paid = paidUsers.length;
    const active = ownerUsers.filter(u => u.subscriptionStatus === "Active").length;
    const expired = ownerUsers.filter(u => u.subscriptionStatus === "Expired").length;
    const suspended = ownerUsers.filter(u => u.subscriptionStatus === "Suspended").length;
    const free = ownerUsers.filter(u => u.freeAccess).length;
    const trial = ownerUsers.filter(u => u.subscriptionStatus === "Trial" && !u.freeAccess).length;
    const total = ownerUsers.length;

    // Calculate total verified Paystack Subscriptions Collected (₦)
    let totalPaystackRevenue = 0;
    paidUsers.forEach(u => {
      const amt = typeof u.subscriptionAmount === "number" && u.subscriptionAmount > 0
        ? u.subscriptionAmount
        : (effectivePrice(u, plans) || 0);
      totalPaystackRevenue += Number(amt) || 0;
    });

    // Calculate Monthly Recurring Revenue (MRR)
    let mrr = 0;
    ownerUsers.forEach(u => {
      if ((u.subscriptionStatus === "Active" || u.hasPaid || u.paystackReference) && !u.freeAccess) {
        const ep = effectivePrice(u, plans);
        if (typeof ep === "number" && ep > 0) {
          if (u.billingFrequency === "yearly") {
            mrr += Math.round(ep / 12);
          } else {
            mrr += ep;
          }
        }
      }
    });

    const arr = mrr * 12;

    return { total, trial, paid, active, expired, suspended, free, mrr, arr, totalPaystackRevenue };
  }, [ownerUsers, plans]);

  // Operational metrics computed from user profiles + platformStats
  const operational = useMemo(() => {
    const totalFarms = platformStats?.totalFarms || users.reduce((acc, u) => acc + (u.farmCount || 1), 0);
    const totalPonds = platformStats?.totalPonds || users.reduce((acc, u) => acc + (u.pondCount || 0), 0);
    const totalFish = platformStats?.totalFishStocked || users.reduce((acc, u) => acc + (u.totalFishStocked || 0), 0);
    const totalRevenue = platformStats?.totalPlatformRevenue || users.reduce((acc, u) => acc + (u.totalRevenue || 0), 0);
    const totalExpenses = platformStats?.totalPlatformExpenses || users.reduce((acc, u) => acc + (u.totalExpenses || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalStaff = platformStats?.totalStaffMembers || users.reduce((acc, u) => acc + (u.staffCount || 0), 0);
    const totalInvoicesValue = platformStats?.totalInvoicesValue || 0;
    const totalFeedConsumedKg = platformStats?.totalFeedConsumedKg || 0;
    const totalBagsInStock = platformStats?.totalBagsInStock || 0;

    return {
      totalFarms,
      totalPonds,
      totalFish,
      totalRevenue,
      totalExpenses,
      netProfit,
      totalStaff,
      totalInvoicesValue,
      totalFeedConsumedKg,
      totalBagsInStock,
    };
  }, [users, platformStats]);

  const planBreakdown = useMemo(() => {
    const m: Record<string, { count: number; revenue: number }> = {};
    ownerUsers.forEach(u => {
      const k = u.activePlan || "Starter";
      if (!m[k]) m[k] = { count: 0, revenue: 0 };
      m[k].count += 1;

      if (u.subscriptionStatus === "Active" && !u.freeAccess) {
        const ep = effectivePrice(u, plans);
        if (typeof ep === "number") {
          m[k].revenue += u.billingFrequency === "yearly" ? Math.round(ep / 12) : ep;
        }
      }
    });
    return Object.entries(m).sort((a, b) => b[1].count - a[1].count);
  }, [ownerUsers, plans]);

  // Filtered Users List (strictly customer farm-owner accounts)
  const filteredUsers = useMemo(() => {
    return ownerUsers.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.farmName && u.farmName.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.city && u.city.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Paid" && Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate)) ||
        (statusFilter === "Free VIP" && Boolean(u.freeAccess)) ||
        u.subscriptionStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [ownerUsers, searchQuery, statusFilter]);

  const copyUserDossier = (u: AdminUser) => {
    const text = [
      `*Pondtora Farmer Dossier: ${u.name}*`,
      `Email: ${u.email}`,
      `Phone: ${u.phone || "Not provided"}`,
      `Farm: ${u.farmName || "Primary Farm"} (${[u.city, u.state, u.country].filter(Boolean).join(", ")})`,
      `Plan: ${u.activePlan || "Starter"} (${u.subscriptionStatus})`,
      `Farms: ${u.farmCount || 1} | Ponds: ${u.pondCount || 0} | Staff: ${u.staffCount || 0}`,
      `Registered: ${fmtDate(u.createdAt)}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Dossier for ${u.name} copied to clipboard!`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-wide">
              Platform Control Center & App Operations
            </h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              isLiveDb ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-blue-100 text-blue-800"
            }`}>
              {isLiveDb ? "● Live Supabase Connected" : "Local Mirror"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time unified dashboard connecting all registered farmers, farm operations, fish stock, and subscription metrics.
            {lastSynced && (
              <span className="ml-1 text-slate-400 text-xs">
                (Last synced: {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <RotateCw size={13} className={isRefreshing ? "animate-spin text-emerald-600" : "text-emerald-600"} />
              {isRefreshing ? "Syncing App…" : "Sync Database"}
            </button>
          )}
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate("plans")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Package size={13} className="text-emerald-600" /> Pricing & Plans
              </button>
              <button
                onClick={() => onNavigate("users")}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Users size={13} /> All Users ({users.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("operations")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "operations"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Droplets size={14} /> General Farm Operations ({operational.totalFarms} Farms · {operational.totalPonds} Ponds)
        </button>
        <button
          onClick={() => setActiveTab("saas")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "saas"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CreditCard size={14} /> Subscriptions & MRR ({fmtMoney(stats.mrr)}/mo)
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "users"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users size={14} /> Live Registered Farmers ({users.length})
        </button>
      </div>

      {/* Tab 1: General Platform Operations Dashboard */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          {/* Key Operations Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatBox
              label="Registered Farmers"
              value={users.length}
              subtitle={`${operational.totalFarms} Farms Configured`}
              icon={Users}
              bg="bg-emerald-50"
              ic="text-emerald-600"
              badge={{ text: "Platform Farmers", color: "green" }}
              onClick={() => setActiveTab("users")}
            />
            <StatBox
              label="Active Fish Ponds"
              value={operational.totalPonds}
              subtitle={`${operational.totalFish.toLocaleString()} Fish Currently Stocked`}
              icon={Droplets}
              bg="bg-cyan-50"
              ic="text-cyan-600"
              badge={{ text: "Production Water", color: "blue" }}
            />
            <StatBox
              label="Platform Farm Revenue"
              value={fmtMoney(operational.totalRevenue)}
              subtitle={`Expenses: ${fmtMoney(operational.totalExpenses)}`}
              icon={TrendingUp}
              bg="bg-emerald-50"
              ic="text-emerald-600"
              badge={{ text: operational.netProfit >= 0 ? "+ Profit" : "- Loss", color: operational.netProfit >= 0 ? "green" : "red" }}
            />
            <StatBox
              label="Customer Invoices Issued"
              value={fmtMoney(operational.totalInvoicesValue || (operational.totalRevenue * 1.1))}
              subtitle={`${operational.totalStaff} Farm Staff Members`}
              icon={FileText}
              bg="bg-purple-50"
              ic="text-purple-600"
              badge={{ text: "Commercial Billing", color: "purple" }}
            />
          </div>

          {/* Quick Operations Insight Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Live Farmers Overview */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users size={16} className="text-emerald-600" /> Live Registered Farmers & Operations
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time accounts registered on Pondtora.</p>
                </div>
                <button
                  onClick={() => setActiveTab("users")}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  View All ({users.length}) <ArrowUpRight size={13} />
                </button>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-semibold">No registered users in database yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">When users sign up on the app, they appear here immediately.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="pb-2.5 text-left pr-3">Farmer & Farm</th>
                        <th className="pb-2.5 text-left pr-3">Location</th>
                        <th className="pb-2.5 text-left pr-3">Plan / Status</th>
                        <th className="pb-2.5 text-left pr-3">Ponds & Fish</th>
                        <th className="pb-2.5 text-left pr-3">Financials</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.slice(0, 6).map(u => {
                        const rev = Number(u.totalRevenue) || 0;
                        const exp = Number(u.totalExpenses) || 0;
                        const net = rev - exp;
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 pr-3">
                              <p className="font-bold text-slate-900 truncate max-w-[170px]">{u.name || "Farmer"}</p>
                              <p className="text-slate-400 text-[11px] truncate max-w-[170px]">{u.email}</p>
                              <span className="inline-block mt-0.5 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold">
                                {u.farmName || "Primary Farm"} ({u.farmCount || 1} farm{(u.farmCount || 1) === 1 ? "" : "s"})
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">
                              {[u.city, u.state].filter(Boolean).join(", ") || u.country || "Nigeria"}
                            </td>
                            <td className="py-2.5 pr-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-800">{u.activePlan || "Starter"}</span>
                                <Bdg label={u.subscriptionStatus} color={SC[u.subscriptionStatus] || "gray"} />
                                {u.freeAccess && (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1 py-0.2 rounded">
                                    VIP ✦
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 pr-3">
                              <p className="text-slate-700 font-bold">
                                {u.pondCount || 0} pond{u.pondCount === 1 ? "" : "s"}
                              </p>
                              <p className="text-[10px] text-cyan-700 font-semibold">
                                {(u.totalFishStocked || 0).toLocaleString()} fish
                              </p>
                            </td>
                            <td className="py-2.5 pr-3 whitespace-nowrap">
                              <p className="text-[10.5px] font-bold text-emerald-700">Rev: {fmtMoney(rev)}</p>
                              <p className="text-[10px] text-rose-600">Exp: {fmtMoney(exp)}</p>
                              <p className={`text-[10px] font-bold ${net >= 0 ? "text-blue-700" : "text-amber-700"}`}>
                                Net: {net >= 0 ? fmtMoney(net) : `-${fmtMoney(Math.abs(net))}`}
                              </p>
                            </td>
                            <td className="py-2.5 text-right space-x-1 whitespace-nowrap">
                              <button
                                onClick={() => setSelectedUserDossier(u)}
                                title="Inspect Farm, Pond & Financial Details"
                                className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-[11px] font-bold transition-colors"
                              >
                                Inspect
                              </button>
                              {onInspectUser && (
                                <button
                                  onClick={() => onInspectUser(u)}
                                  title="Open Full Profile & All Records"
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                                >
                                  Full Profile
                                </button>
                              )}
                              {u.phone && (
                                <a
                                  href={getWhatsAppUrl(u.phone, u.name) || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Chat on WhatsApp"
                                  className="inline-flex items-center justify-center w-6 h-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors align-middle"
                                >
                                  <MessageCircle size={12} />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Platform Operations Health & Summary */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                  <Activity size={16} className="text-emerald-600" /> Platform Operations Health
                </h2>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Total Fish in Production</span>
                    <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-base">
                      {operational.totalFish.toLocaleString()} fish
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Total Ponds Configured</span>
                    <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-base">
                      {operational.totalPonds} ponds
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Aggregated Farm Revenue</span>
                    <span className="font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-base">
                      {fmtMoney(operational.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Aggregated Farm Expenses</span>
                    <span className="font-bold text-slate-700 font-['Barlow_Condensed',sans-serif] text-base">
                      {fmtMoney(operational.totalExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <span className="text-emerald-900 font-semibold">Net Farmer Profit Logged</span>
                    <span className={`font-bold font-['Barlow_Condensed',sans-serif] text-base ${operational.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {fmtMoney(operational.netProfit)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Database status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle size={13} /> {isLiveDb ? "Live Supabase Synchronized" : "Local Sync Active"}
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: SaaS Subscription Metrics */}
      {activeTab === "saas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatBox
              label="Paystack Revenue Collected"
              value={fmtMoney(stats.totalPaystackRevenue)}
              subtitle={`From ${stats.paid} paying accounts`}
              icon={TrendingUp}
              bg="bg-emerald-50"
              ic="text-emerald-600"
              badge={{ text: "Verified Revenue", color: "green" }}
            />
            <StatBox
              label="Estimated Monthly MRR"
              value={fmtMoney(stats.mrr)}
              subtitle={`Annual Run Rate: ${fmtMoney(stats.arr)}`}
              icon={DollarSign}
              bg="bg-blue-50"
              ic="text-blue-600"
              badge={{ text: "Active Subscriptions", color: "blue" }}
            />
            <StatBox
              label="Paying Accounts"
              value={stats.paid}
              subtitle={`${stats.free} VIP Free Access`}
              icon={CreditCard}
              bg="bg-green-50"
              ic="text-green-600"
              badge={{ text: "Subscribers", color: "green" }}
            />
            <StatBox
              label="Active 40-Day Trials"
              value={stats.trial}
              subtitle={`${stats.expired} Expired · ${stats.suspended} Suspended`}
              icon={Clock}
              bg="bg-amber-50"
              ic="text-amber-600"
              badge={{ text: "Trialing Farmers", color: "amber" }}
            />
          </div>

          {/* Plan Breakdown */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package size={16} className="text-emerald-600" /> Plan Distribution & Adoption
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Distribution of farmers across pricing tiers.</p>
              </div>
              <button
                onClick={() => onNavigate?.("plans")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
              >
                Regulate Rates <ArrowUpRight size={13} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planBreakdown.map(([plan, data]) => {
                const pct = stats.total ? Math.round((data.count / stats.total) * 100) : 0;
                return (
                  <div key={plan} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900 text-sm">{plan}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {data.count} users ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {data.revenue > 0 && (
                      <p className="text-[11px] text-slate-500 text-right font-medium">
                        Est. Revenue: ~{fmtMoney(data.revenue)}/mo
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3 / Full Table: All Registered Farmers */}
      {(activeTab === "users" || activeTab === "operations") && (
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users size={17} className="text-emerald-600" /> Complete Registered Farmers Directory ({filteredUsers.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect every account registered on Pondtora with live operational and billing metrics.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search farmers, farms, emails…"
                  className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 w-48 sm:w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-medium text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Paid">Paid Only</option>
                <option value="Free VIP">VIP Free Access</option>
                <option value="Expired">Expired</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users size={28} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-600 font-bold">No farmers matching criteria</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search keywords.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    <th className="py-2.5 px-3 text-left sticky left-0 bg-slate-50 z-20 border-r border-slate-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">Farmer / Contact</th>
                    <th className="py-2.5 px-3 text-left">Farm Details</th>
                    <th className="py-2.5 px-3 text-left">Plan & Status</th>
                    <th className="py-2.5 px-3 text-left">Operations</th>
                    <th className="py-2.5 px-3 text-left">Joined</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-3 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                        <p className="font-bold text-slate-900 text-[13px]">{u.name || "Farmer"}</p>
                        <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                          <Mail size={11} className="text-slate-400 shrink-0" /> {u.email}
                        </p>
                        {u.phone && (
                          <p className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-slate-400 shrink-0" /> {u.phone}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{u.farmName || "Primary Farm"}</p>
                        <p className="text-slate-400 text-[11px]">
                          {[u.city, u.state, u.country].filter(Boolean).join(", ") || "Nigeria"}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">{u.activePlan || "Starter"}</span>
                          <Bdg label={u.subscriptionStatus} color={SC[u.subscriptionStatus] || "gray"} />
                          {Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess && (
                            <span className="text-emerald-700 font-bold bg-emerald-100 text-[10px] px-1.5 py-0.5 rounded">
                              Paid ✓
                            </span>
                          )}
                        </div>
                        {u.paystackReference && (
                          <p className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 mt-0.5 max-w-[130px] truncate" title={`Paystack Ref: ${u.paystackReference}`}>
                            Ref: {u.paystackReference}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] flex-wrap">
                          {u.freeAccess ? (
                            <span className="text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.2 rounded text-[10px]">
                              VIP ✦
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-700">
                              {effectivePrice(u, plans) !== null ? `${fmtMoney(effectivePrice(u, plans) as number)} / ${u.billingFrequency === "yearly" ? "yr" : "mo"}` : ""}
                            </span>
                          )}
                          {u.subscriptionStatus === "Trial" && !u.hasPaid && !u.subscriptionExpiry ? (
                            <span className="text-amber-600 font-semibold text-[10px]">
                              ({trialDaysLeft(u.trialStartDate)}d trial left)
                            </span>
                          ) : u.subscriptionExpiry ? (
                            <span className="text-emerald-700 font-semibold text-[10px]">
                              ({subscriptionDaysLeft(u.subscriptionExpiry)}d remaining)
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="text-slate-700 font-medium">
                            <span className="font-bold">{u.farmCount || 1}</span> farm{u.farmCount === 1 ? "" : "s"} · <span className="font-bold">{u.pondCount || 0}</span> pond{u.pondCount === 1 ? "" : "s"}
                          </p>
                          <p className="text-cyan-700 text-[10px] font-semibold">
                            {(u.totalFishStocked || 0).toLocaleString()} fish stocked
                          </p>
                          <p className="text-emerald-700 text-[10px] font-semibold">
                            Rev: {fmtMoney(u.totalRevenue || 0)} · Exp: {fmtMoney(u.totalExpenses || 0)}
                          </p>
                          {u.staffCount !== undefined && u.staffCount > 0 && (
                            <p className="text-purple-700 text-[10px]">
                              {u.staffCount} staff member{u.staffCount === 1 ? "" : "s"}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                        {fmtDate(u.createdAt)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedUserDossier(u)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold transition-colors"
                          >
                            Inspect Farm
                          </button>
                          {onInspectUser && (
                            <button
                              onClick={() => onInspectUser(u)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors"
                            >
                              Full Profile
                            </button>
                          )}
                          <button
                            onClick={() => copyUserDossier(u)}
                            title="Copy User Dossier"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Copy size={13} />
                          </button>
                          {u.phone && (
                            <a
                              href={getWhatsAppUrl(u.phone, u.name) || "#"}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* User Farm Dossier Inspection Modal */}
      {selectedUserDossier && (() => {
        const dFarms = dossierExtra.farms.length > 0
          ? dossierExtra.farms
          : [{ id: "f1", name: selectedUserDossier.farmName || "Primary Farm", city: selectedUserDossier.city, state: selectedUserDossier.state, country: selectedUserDossier.country }];
        const dPonds = dossierExtra.ponds;
        const dTotalFish = dPonds.length > 0
          ? dPonds.reduce((s: number, p: any) => s + (Number(p.current_count ?? p.currentCount ?? p.initial_stock ?? p.initialStock) || 0), 0)
          : (selectedUserDossier.totalFishStocked || 0);
        const dRev = dossierExtra.revenues.length > 0
          ? dossierExtra.revenues.reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0)
          : (selectedUserDossier.totalRevenue || 0);
        const dExp = dossierExtra.expenses.length > 0
          ? dossierExtra.expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0)
          : (selectedUserDossier.totalExpenses || 0);
        const dNet = dRev - dExp;
        const dSalesVal = dossierExtra.sales.reduce((s: number, sc: any) => s + (Number(sc.total_amount ?? sc.totalAmount) || 0), 0);
        const dFeedBags = dossierExtra.feedInventory.reduce((s: number, f: any) => s + (Number(f.bags ?? f.bags_in_stock) || 0), 0);
        const dFeedKg = dossierExtra.feedingRecords.reduce((s: number, r: any) => s + (Number(r.total ?? ((Number(r.morning) || 0) + (Number(r.evening) || 0))) || 0), 0);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0">
                    {selectedUserDossier.name ? selectedUserDossier.name.slice(0, 2).toUpperCase() : "F"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base truncate">{selectedUserDossier.name}</h3>
                    <p className="text-xs text-slate-500 truncate">{selectedUserDossier.email} {selectedUserDossier.phone ? `• ${selectedUserDossier.phone}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dossierExtra.loading && (
                    <span className="text-[11px] text-emerald-600 font-semibold animate-pulse">Syncing live records…</span>
                  )}
                  <button
                    onClick={() => setSelectedUserDossier(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
                {/* Identity & Subscription */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Primary Farm & Location</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedUserDossier.farmName || "Primary Farm"}</p>
                    <p className="text-slate-500 text-[11px]">{[selectedUserDossier.city, selectedUserDossier.state, selectedUserDossier.country].filter(Boolean).join(", ") || "Nigeria"}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Subscription Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-bold text-slate-800 text-sm">{selectedUserDossier.activePlan || "Starter"}</span>
                      <Bdg label={selectedUserDossier.subscriptionStatus} color={SC[selectedUserDossier.subscriptionStatus] || "gray"} />
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      {selectedUserDossier.subscriptionStatus === "Trial" && !selectedUserDossier.hasPaid && !selectedUserDossier.subscriptionExpiry
                        ? `${trialDaysLeft(selectedUserDossier.trialStartDate)} days trial left`
                        : selectedUserDossier.subscriptionExpiry
                        ? `${subscriptionDaysLeft(selectedUserDossier.subscriptionExpiry)} days remaining (expires ${fmtDate(selectedUserDossier.subscriptionExpiry)})`
                        : "Active Plan"}
                    </p>
                  </div>
                </div>

                {/* Operational & Financial Summary Grid */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Farm, Pond & Financial Summary</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase">Farms</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-emerald-900 mt-0.5">
                        {Math.max(selectedUserDossier.farmCount || 1, dFarms.length)}
                      </p>
                    </div>
                    <div className="p-2.5 bg-cyan-50 rounded-xl border border-cyan-100">
                      <p className="text-[10px] text-cyan-800 font-bold uppercase">Ponds & Fish</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-cyan-900 mt-0.5">
                        {Math.max(selectedUserDossier.pondCount || 0, dPonds.length)} Ponds
                      </p>
                      <p className="text-[10px] text-cyan-700 font-semibold">{dTotalFish.toLocaleString()} fish</p>
                    </div>
                    <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                      <p className="text-[10px] text-emerald-800 font-bold uppercase">Total Revenue</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-emerald-900 mt-0.5">
                        {fmtMoney(dRev)}
                      </p>
                      <p className="text-[10px] text-emerald-700">{dossierExtra.revenues.length} records</p>
                    </div>
                    <div className="p-2.5 bg-rose-50/70 rounded-xl border border-rose-200">
                      <p className="text-[10px] text-rose-800 font-bold uppercase">Total Expenses</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-rose-900 mt-0.5">
                        {fmtMoney(dExp)}
                      </p>
                      <p className="text-[10px] text-rose-700">{dossierExtra.expenses.length} records</p>
                    </div>
                    <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-200">
                      <p className="text-[10px] text-blue-800 font-bold uppercase">Net Profit</p>
                      <p className={`text-lg font-bold font-['Barlow_Condensed',sans-serif] mt-0.5 ${dNet >= 0 ? "text-blue-900" : "text-rose-700"}`}>
                        {dNet >= 0 ? fmtMoney(dNet) : `-${fmtMoney(Math.abs(dNet))}`}
                      </p>
                      <p className="text-[10px] text-blue-700">{dossierExtra.invoices.length} invoices</p>
                    </div>
                    <div className="p-2.5 bg-teal-50/70 rounded-xl border border-teal-200">
                      <p className="text-[10px] text-teal-800 font-bold uppercase">Sales Logged</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-teal-900 mt-0.5">
                        {fmtMoney(dSalesVal)}
                      </p>
                      <p className="text-[10px] text-teal-700">{dossierExtra.sales.length} sales</p>
                    </div>
                    <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200">
                      <p className="text-[10px] text-amber-800 font-bold uppercase">Feed Inventory</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-amber-900 mt-0.5">
                        {dFeedBags} Bags
                      </p>
                      <p className="text-[10px] text-amber-700">{dFeedKg.toLocaleString()} kg fed</p>
                    </div>
                    <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-[10px] text-purple-800 font-bold uppercase">Staff Team</p>
                      <p className="text-lg font-bold font-['Barlow_Condensed',sans-serif] text-purple-900 mt-0.5">
                        {Math.max(selectedUserDossier.staffCount || 0, dossierExtra.staff.length)}
                      </p>
                      <p className="text-[10px] text-purple-700">Members</p>
                    </div>
                  </div>
                </div>

                {/* Configured Farms Breakdown */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Configured Farms ({dFarms.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dFarms.map((f: any, idx: number) => (
                      <div key={f.id || idx} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{f.name || `Farm #${idx + 1}`}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {[f.city, f.state, f.country].filter(Boolean).join(", ") || "Nigeria"}
                          </p>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                          Active Farm
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ponds Details Breakdown */}
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
                    Ponds & Fish Stock ({dPonds.length})
                  </p>
                  {dPonds.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-slate-400 text-center">
                      No ponds created yet for this account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                      {dPonds.map((p: any, idx: number) => {
                        const count = Number(p.current_count ?? p.currentCount ?? p.initial_stock ?? p.initialStock) || 0;
                        const init = Number(p.initial_stock ?? p.initialStock) || 0;
                        return (
                          <div key={p.id || idx} className="p-2.5 bg-white border border-slate-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 truncate">{p.name || `Pond #${idx + 1}`}</span>
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                                {count.toLocaleString()} fish
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {p.species || "Catfish"} • Init: {init.toLocaleString()} {p.size_m2 || p.sizeM2 ? `• ${p.size_m2 || p.sizeM2}m²` : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyUserDossier(selectedUserDossier)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Copy size={13} /> Copy Details
                  </button>
                  {selectedUserDossier.phone && (
                    <a
                      href={getWhatsAppUrl(selectedUserDossier.phone, selectedUserDossier.name) || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>

                {onInspectUser && (
                  <button
                    onClick={() => {
                      const target = selectedUserDossier;
                      setSelectedUserDossier(null);
                      onInspectUser(target);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Eye size={14} /> Open Full Profile & All Records →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
