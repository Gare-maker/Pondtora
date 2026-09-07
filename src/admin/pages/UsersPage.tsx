import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Plus, MoreVertical, Eye, Edit2, Ban, Trash2, CheckCircle, ChevronUp, ChevronDown, Download, Clock, Shield, Sparkles, Filter } from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC } from "../../app/shared";
import type { AdminUser, AdminPlan } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, computeSubscriptionStatus } from "../types";

interface Props {
  users: AdminUser[];
  plans: AdminPlan[];
  onAdd: (u: Omit<AdminUser, "id">) => void;
  onUpdate: (u: AdminUser) => void;
  onDelete: (id: string) => void;
  onExportCSV?: () => void;
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

export default function UsersPage({ users, plans, onAdd, onUpdate, onDelete, onExportCSV }: Props) {
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
    const next = u.accountStatus === "Suspended" ? "Active" : ("Suspended" as const);
    const updated = { ...u, accountStatus: next };
    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
    setMenu(null);
  }

  function handleExtendTrial(u: AdminUser) {
    const now = new Date();
    const updated: AdminUser = {
      ...u,
      trialStartDate: now.toISOString().slice(0, 10),
      subscriptionStatus: "Trial",
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
    { label: "Active Plan", key: "activePlan" as SortKey },
    { label: "Sub Status", key: "subscriptionStatus" as SortKey },
    { label: "Trial / Expiry", key: "subscriptionExpiry" as SortKey },
    { label: "Account", key: null },
    { label: "Joined", key: "createdAt" as SortKey },
    { label: "", key: null },
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
            Monitor, regulate, and manage all {users.length} registered farm accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
              placeholder="Search by name, email, farm or plan…"
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
          <table className="w-full text-xs min-w-[850px]">
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
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    No matching users found.
                  </td>
                </tr>
              )}
              {paged.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors">
                          {u.name}
                        </p>
                        <p className="text-slate-400 text-[11px] truncate">{u.email}</p>
                        {u.farmName && (
                          <p className="text-[10px] text-emerald-600 truncate font-medium">{u.farmName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                    {u.activePlan ? (
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                        {u.activePlan}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                      {u.freeAccess && (
                        <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">
                          Free ✦
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {u.subscriptionStatus === "Trial" ? (
                      <span className="text-amber-600 font-bold">
                        {trialDaysLeft(u.trialStartDate)} days left
                      </span>
                    ) : u.subscriptionExpiry ? (
                      fmtDate(u.subscriptionExpiry)
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <Bdg
                      label={u.accountStatus}
                      color={u.accountStatus === "Active" ? "green" : "gray"}
                    />
                  </td>

                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[11px]">
                    {fmtDate(u.createdAt)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={e => {
                        e.stopPropagation();
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
                      title="Actions"
                    >
                      <MoreVertical size={15} />
                    </button>
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

      {/* View User Modal */}
      {viewUser && (
        <Modal title="User Account Overview" onClose={() => setViewUser(null)}>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <p className="text-lg font-bold text-slate-900">{viewUser.name}</p>
              <p className="text-xs text-slate-500">{viewUser.email}</p>
              {viewUser.phone && <p className="text-xs text-slate-500 mt-0.5">{viewUser.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Farm Name", viewUser.farmName || "—"],
                ["Active Plan", viewUser.activePlan || "No Plan"],
                ["Billing Frequency", viewUser.billingFrequency],
                ["Price Override", fmtMoney(viewUser.subscriptionAmount)],
                ["Subscription Status", viewUser.subscriptionStatus],
                ["Free Access", viewUser.freeAccess ? "Yes (Complimentary)" : "No"],
                ["Trial Start Date", fmtDate(viewUser.trialStartDate)],
                ["Subscription Start", fmtDate(viewUser.subscriptionStart)],
                ["Subscription Expiry", fmtDate(viewUser.subscriptionExpiry)],
                ["Paystack Reference", viewUser.paystackReference || "—"],
                ["Last Payment Date", fmtDate(viewUser.lastPaymentDate)],
                ["Account Status", viewUser.accountStatus],
                ["Registration Date", fmtDate(viewUser.createdAt)],
              ].map(([l, v]) => (
                <div key={l} className="bg-white border border-slate-100 p-2.5 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{l}</p>
                  <p className="text-slate-800 font-semibold mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <PBtn onClick={() => setViewUser(null)}>Close</PBtn>
            </div>
          </div>
        </Modal>
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
          <button
            onClick={() => {
              handleExtendTrial(menu.user);
              setMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 font-medium transition-colors"
          >
            <Clock size={13} className="text-amber-500" /> Reset 30-Day Trial
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
