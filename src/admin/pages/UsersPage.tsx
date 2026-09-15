import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search, Plus, MoreVertical, Eye, Edit2, Ban, Trash2, CheckCircle,
  ChevronUp, ChevronDown, Download, Clock, Shield, Sparkles, Filter,
  RotateCw, Phone, Mail, MapPin, Copy, ExternalLink, MessageCircle,
  Building, Droplets, Users as UsersIcon, X, Check, ArrowRight, UserCheck, AlertCircle
} from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC } from "../../app/shared";
import type { AdminUser, AdminPlan, AccountStatus } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, computeSubscriptionStatus } from "../types";
import { supabase } from "../../lib/supabase";
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
  const lines = [
    `*Pondtora Farmer Dossier*`,
    `----------------------------------------`,
    `Name: ${u.name}`,
    `Email: ${u.email}`,
    `Phone: ${u.phone || "Not provided"}`,
    `Farm Name: ${u.farmName || "Primary Farm"}`,
    `Location: ${[u.city, u.state, u.country].filter(Boolean).join(", ") || "Nigeria"}`,
    `Role: ${u.role || "Farm Owner"}`,
    `Account Status: ${u.accountStatus}`,
    `Registration Date: ${fmtDate(u.createdAt)}`,
    ``,
    `*Subscription & Billing*`,
    `Plan: ${u.activePlan || "No Plan"} (${u.billingFrequency || "monthly"})`,
    `Status: ${u.subscriptionStatus}${u.freeAccess ? " (Complimentary VIP)" : ""}`,
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

  if (extra?.staff && extra.staff.length > 0) {
    lines.push(``, `*Staff Members Added:*`);
    extra.staff.forEach((s, idx) => {
      lines.push(`  ${idx + 1}. ${s.name} (${s.email}) - ${s.role} [${s.status}]`);
    });
  }

  if (extra?.farms && extra.farms.length > 0) {
    lines.push(``, `*Farms List:*`);
    extra.farms.forEach((f, idx) => {
      lines.push(`  ${idx + 1}. ${f.name} - ${[f.city, f.state].filter(Boolean).join(", ") || "Nigeria"}`);
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

  const [userExtra, setUserExtra] = useState<{
    loading: boolean;
    farms: { id: string; name: string; city?: string; state?: string }[];
    ponds: { id: string; name?: string; size?: string; farm_id?: string }[];
    staff: { id: string; name: string; email: string; role: string; status: string }[];
  }>({ loading: false, farms: [], ponds: [], staff: [] });

  useEffect(() => {
    if (!viewUser?.id) {
      setUserExtra({ loading: false, farms: [], ponds: [], staff: [] });
      return;
    }
    let isSubscribed = true;
    setUserExtra(prev => ({ ...prev, loading: true }));
    Promise.all([
      supabase.from("farms").select("id, name, city, state").eq("user_id", viewUser.id),
      supabase.from("ponds").select("id, name, size, farm_id").eq("user_id", viewUser.id),
      supabase.from("staff_members").select("id, name, email, role, status").eq("user_id", viewUser.id),
    ]).then(([farmsRes, pondsRes, staffRes]) => {
      if (!isSubscribed) return;
      setUserExtra({
        loading: false,
        farms: farmsRes.data || [],
        ponds: pondsRes.data || [],
        staff: staffRes.data || [],
      });
    }).catch(err => {
      if (!isSubscribed) return;
      console.warn("Could not load user extra details:", err);
      setUserExtra(prev => ({ ...prev, loading: false }));
    });
    return () => { isSubscribed = false; };
  }, [viewUser?.id]);

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

  const filtered = useMemo(() => {
    let list = [...users];

    if (filterStatus !== "All") {
      list = list.filter(u => u.subscriptionStatus === filterStatus || (filterStatus === "Suspended" && u.accountStatus === "Suspended"));
    }

    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(
        u =>
          (u?.name || "").toLowerCase().includes(lq) ||
          (u?.email || "").toLowerCase().includes(lq) ||
          (u?.farmName || "").toLowerCase().includes(lq) ||
          (u?.activePlan || "").toLowerCase().includes(lq)
      );
    }

    list.sort((a, b) => {
      const av = String(a[sortKey] || "");
      const bv = String(b[sortKey] || "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  }, [users, q, filterStatus, sortKey, sortDir]);

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
            Monitor, regulate, and view details for all {users.length} registered farm accounts.
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

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {["All", "Active", "Trial", "Expired", "Suspended"].map(st => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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

        {/* Users Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs min-w-[980px]">
            <thead className="bg-slate-50 border-b border-slate-100">
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
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                    No matching users found.
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
                  <td className="px-4 py-3 max-w-[210px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {u.name}
                        </p>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 shrink-0">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20 shrink-0">
                  {viewUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] leading-tight truncate">
                      {viewUser.name}
                    </h2>
                    <Bdg label={viewUser.accountStatus} color={viewUser.accountStatus === "Active" ? "green" : "gray"} />
                    <Bdg label={viewUser.subscriptionStatus} color={STATUS_COLOR[viewUser.subscriptionStatus] || "gray"} />
                    {viewUser.freeAccess && (
                      <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
                        Free VIP ✦
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {viewUser.email} • {viewUser.role || "Farm Owner"} • Registered {fmtDate(viewUser.createdAt)}
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
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
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

                <a
                  href={`mailto:${viewUser.email}?subject=${encodeURIComponent("Pondtora Farm Management Support")}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                  title={`Send an email to ${viewUser.email}`}
                >
                  <Mail size={14} /> Send Email
                </a>

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

            {/* Modal Body */}
            <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* 1. Contact & Location Details */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building size={13} className="text-emerald-600" /> Contact & Location Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Full Name</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-bold text-slate-800 text-xs truncate">{viewUser.name}</p>
                      <button onClick={() => copyToClipboard(viewUser.name, "Name")} className="text-slate-400 hover:text-slate-600 p-0.5" title="Copy name">
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Email Address</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="font-semibold text-slate-800 text-xs truncate" title={viewUser.email}>{viewUser.email}</p>
                      <button onClick={() => copyToClipboard(viewUser.email, "Email")} className="text-slate-400 hover:text-slate-600 p-0.5" title="Copy email">
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Phone Number</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className={`font-semibold text-xs truncate ${viewUser.phone ? "text-emerald-700 font-mono" : "text-slate-400 italic"}`}>
                        {viewUser.phone || "Not provided"}
                      </p>
                      {viewUser.phone && (
                        <button onClick={() => copyToClipboard(viewUser.phone!, "Phone")} className="text-slate-400 hover:text-slate-600 p-0.5" title="Copy phone">
                          <Copy size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Farm Name</p>
                    <p className="font-bold text-slate-800 text-xs mt-0.5 truncate">{viewUser.farmName || "Primary Farm"}</p>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/70 p-2.5 rounded-xl sm:col-span-2">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Full Location</p>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                      <MapPin size={12} className="text-emerald-600 shrink-0" />
                      {[viewUser.city, viewUser.state, viewUser.country].filter(Boolean).join(", ") || "Nigeria"}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Operations & Staff Added (The exact request: "the number of, email that they have added") */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <UsersIcon size={13} className="text-emerald-600" /> Operational Assets & Staff Team
                  </h3>
                  {userExtra.loading && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <RotateCw size={11} className="animate-spin text-green-600" /> Loading details…
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Farms</p>
                    <p className="text-xl font-extrabold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                      {userExtra.farms.length || viewUser.farmCount || 1}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 border border-blue-200/70 p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-bold text-blue-500">Ponds Configured</p>
                    <p className="text-xl font-extrabold text-blue-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
                      {userExtra.ponds.length || viewUser.pondCount || 0}
                    </p>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-200/70 p-3 rounded-xl text-center">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Staff Members</p>
                    <p className="text-xl font-extrabold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">
                      {userExtra.staff.length || viewUser.staffCount || 0}
                    </p>
                  </div>
                </div>

                {/* Staff Members List with Emails */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <UsersIcon size={12} className="text-slate-500" />
                      Staff Accounts Added ({userExtra.staff.length})
                    </span>
                    <span className="text-[10px] text-slate-400">Invited by this farmer</span>
                  </div>

                  {userExtra.staff.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      <p className="text-xs">No staff members added yet by this farmer.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {userExtra.staff.map((st) => (
                        <div key={st.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{st.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate">{st.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                              {st.role}
                            </span>
                            <Bdg label={st.status || "Active"} color={st.status === "Pending" ? "amber" : "green"} />
                            <button
                              onClick={() => copyToClipboard(st.email, `Staff email (${st.email})`)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              title="Copy staff email"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Farms List */}
                {userExtra.farms.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden mt-2.5">
                    <div className="bg-slate-100/70 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <Building size={12} className="text-slate-500" />
                        Farms Registered ({userExtra.farms.length})
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                      {userExtra.farms.map((f) => (
                        <div key={f.id} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-800">{f.name}</span>
                          <span className="text-slate-500 text-[11px]">
                            {[f.city, f.state].filter(Boolean).join(", ") || "Nigeria"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Subscription & Billing Overview */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-emerald-600" /> Subscription & Plan Details
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Current Plan</p>
                    <p className="font-bold text-slate-900 text-xs mt-0.5">{viewUser.activePlan || "Free / No Plan"}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Billing Cycle</p>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5 capitalize">{viewUser.billingFrequency || "monthly"}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Price Override</p>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">{fmtMoney(viewUser.subscriptionAmount)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Trial Period</p>
                    <p className="font-semibold text-xs mt-0.5 text-amber-700">
                      {trialDaysLeft(viewUser.trialStartDate)} days left (started {fmtDate(viewUser.trialStartDate)})
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Subscription Expiry</p>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">{fmtDate(viewUser.subscriptionExpiry)}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Payment Status</p>
                    <p className="font-semibold text-xs mt-0.5">
                      {viewUser.hasPaid || viewUser.paystackReference ? (
                        <span className="text-emerald-600 font-bold">Paid & Verified</span>
                      ) : (
                        <span className="text-slate-500">Unpaid / On Trial</span>
                      )}
                    </p>
                  </div>
                  {viewUser.paystackReference && (
                    <div className="bg-white border border-slate-200 p-2.5 rounded-xl sm:col-span-2">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Paystack Reference</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="font-mono text-xs text-slate-700 truncate">{viewUser.paystackReference}</p>
                        <button onClick={() => copyToClipboard(viewUser.paystackReference!, "Paystack Reference")} className="text-slate-400 hover:text-slate-600 p-0.5">
                          <Copy size={11} />
                        </button>
                      </div>
                    </div>
                  )}
                  {viewUser.lastPaymentDate && (
                    <div className="bg-white border border-slate-200 p-2.5 rounded-xl">
                      <p className="text-[10px] uppercase font-bold text-slate-400">Last Payment Date</p>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5">{fmtDate(viewUser.lastPaymentDate)}</p>
                    </div>
                  )}
                </div>
              </div>
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
