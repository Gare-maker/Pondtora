import React, { useState, useMemo } from "react";
import { Search, Edit2, Gift, CreditCard, Sparkles, CheckCircle, Clock, DollarSign, Calendar, TrendingUp, ShieldCheck, Check, RotateCcw } from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC } from "../../app/shared";
import type { AdminUser, AdminPlan } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, computeSubscriptionStatus, effectivePrice } from "../types";
import { isStaffUser } from "../../lib/userSync";

interface Props {
  users: AdminUser[];
  plans: AdminPlan[];
  onUpdate: (u: AdminUser) => void;
}

const STATUS_COLOR: Record<string, "green" | "amber" | "red" | "gray"> = {
  Active: "green",
  Trial: "amber",
  Expired: "red",
  Suspended: "gray",
  Cancelled: "gray",
};

const STATUSES = ["All", "Paid", "Trial", "Active", "Free Access", "Expired", "Suspended"];

export default function SubscriptionsPage({ users, plans, onUpdate }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    activePlan: "",
    billingFrequency: "monthly" as "monthly" | "yearly",
    subscriptionAmount: "",
    subscriptionStart: "",
    subscriptionExpiry: "",
    paystackReference: "",
    lastPaymentDate: "",
    hasPaid: false,
    freeAccess: false,
  });

  const customerUsers = useMemo(() => (users || []).filter(u => !isStaffUser(u)), [users]);

  // Financial & Subscription Stats
  const stats = useMemo(() => {
    let totalRevenueCollected = 0;
    let paidCount = 0;
    let trialCount = 0;
    let freeCount = 0;

    customerUsers.forEach(u => {
      const isPaid = Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess;
      if (isPaid) {
        paidCount++;
        const amt = typeof u.subscriptionAmount === "number" && u.subscriptionAmount > 0
          ? u.subscriptionAmount
          : (effectivePrice(u, plans) || 0);
        totalRevenueCollected += Number(amt) || 0;
      } else if (u.freeAccess) {
        freeCount++;
      } else if (u.subscriptionStatus === "Trial") {
        trialCount++;
      }
    });

    return {
      totalRevenueCollected,
      paidCount,
      trialCount,
      freeCount,
      totalSubscribers: customerUsers.length,
    };
  }, [customerUsers, plans]);

  const filtered = useMemo(() => {
    let list = [...customerUsers];

    if (filter === "Paid") {
      list = list.filter(u => (u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess);
    } else if (filter === "Free Access") {
      list = list.filter(u => u.freeAccess);
    } else if (filter !== "All") {
      list = list.filter(u => u.subscriptionStatus === filter);
    }

    if (q.trim()) {
      const lq = q.toLowerCase();
      list = list.filter(
        u =>
          (u?.name || "").toLowerCase().includes(lq) ||
          (u?.email || "").toLowerCase().includes(lq) ||
          (u?.farmName || "").toLowerCase().includes(lq) ||
          (u?.paystackReference || "").toLowerCase().includes(lq) ||
          (u?.activePlan || "").toLowerCase().includes(lq)
      );
    }

    return list;
  }, [customerUsers, q, filter]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const planNames = useMemo(() => plans.filter(p => p.status === "Active").map(p => p.name), [plans]);

  const planHint = useMemo(() => {
    if (form.freeAccess) return "Free / Complimentary Access — Payment bypassed";
    if (!form.activePlan) return null;
    const p = plans.find(x => x.name === form.activePlan);
    if (!p) return null;
    const price = form.billingFrequency === "yearly" ? p.yearlyPrice : p.monthlyPrice;
    return price > 0
      ? `Plan default: ₦${price.toLocaleString()}/${form.billingFrequency === "yearly" ? "yr" : "mo"}`
      : "Free tier plan";
  }, [form.activePlan, form.billingFrequency, form.freeAccess, plans]);

  function openEdit(u: AdminUser) {
    setForm({
      activePlan: u.activePlan || "",
      billingFrequency: u.billingFrequency || "monthly",
      subscriptionAmount: u.subscriptionAmount !== null && u.subscriptionAmount !== undefined ? String(u.subscriptionAmount) : "",
      subscriptionStart: u.subscriptionStart || "",
      subscriptionExpiry: u.subscriptionExpiry || "",
      paystackReference: u.paystackReference || "",
      lastPaymentDate: u.lastPaymentDate || "",
      hasPaid: Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate),
      freeAccess: Boolean(u.freeAccess),
    });
    setEditing(u);
  }

  function handleSave() {
    if (!editing) return;
    
    // Explicit payment verification: only mark hasPaid if user has verified payment or admin explicitly checked paid
    const isExplicitlyPaid = Boolean(!form.freeAccess && (form.hasPaid || form.paystackReference.trim() !== "" || form.lastPaymentDate.trim() !== ""));
    const customAmt = !form.freeAccess && form.subscriptionAmount.trim() !== "" ? Number(form.subscriptionAmount) : null;

    const updated: AdminUser = {
      ...editing,
      activePlan: form.activePlan || null,
      billingFrequency: form.billingFrequency as "monthly" | "yearly",
      subscriptionAmount: customAmt,
      subscriptionStart: form.subscriptionStart || editing.subscriptionStart || null,
      subscriptionExpiry: form.subscriptionExpiry || editing.subscriptionExpiry || null,
      paystackReference: form.paystackReference.trim() || editing.paystackReference || null,
      lastPaymentDate: form.lastPaymentDate.trim() || editing.lastPaymentDate || (isExplicitlyPaid ? new Date().toISOString().slice(0, 10) : null),
      freeAccess: form.freeAccess,
      hasPaid: isExplicitlyPaid,
    };

    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
    setEditing(null);
  }

  function fmtEffective(u: AdminUser) {
    if (u.freeAccess) return <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold text-xs">Free VIP ✦</span>;
    if (typeof u.subscriptionAmount === "number" && !isNaN(u.subscriptionAmount)) {
      return (
        <div>
          <span className="font-bold text-emerald-700">{fmtMoney(u.subscriptionAmount)}</span>
          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded font-semibold ml-1">
            Custom
          </span>
        </div>
      );
    }
    const ep = effectivePrice(u, plans);
    if (ep === null) return <span className="text-slate-300">—</span>;
    if (ep === "free") return <span className="text-emerald-700 font-bold">Free ✦</span>;
    return <span className="font-semibold text-slate-800">{fmtMoney(ep)}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
              Subscriptions & Paystack Revenue
            </h1>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Revenue & Pricing
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage subscriber pricing overrides, view real-time Paystack payments, and configure subscription access.
          </p>
        </div>
      </div>

      {/* Top Stat Boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Paystack Revenue Collected</span>
            <span className="p-1.5 bg-emerald-200/60 text-emerald-800 rounded-lg"><TrendingUp size={14} /></span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-900 font-['Barlow_Condensed',sans-serif]">
            {fmtMoney(stats.totalRevenueCollected)}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">From {stats.paidCount} verified paid accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Paying Subscribers</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><CreditCard size={14} /></span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
            {stats.paidCount}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Active Paystack billing accounts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Active 30-Day Trials</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Clock size={14} /></span>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 font-['Barlow_Condensed',sans-serif]">
            {stats.trialCount}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Users currently exploring platform</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Free VIP Access</span>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Sparkles size={14} /></span>
          </div>
          <p className="text-2xl font-extrabold text-purple-700 font-['Barlow_Condensed',sans-serif]">
            {stats.freeCount}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">Complimentary lifetime access</p>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
        {/* Search & Status Filter */}
        <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search subscriber, email, farm, or Paystack ref…"
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/40 bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filter === s
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[920px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-4 py-3 text-left">Subscriber & Farm</th>
                <th className="px-4 py-3 text-left">Assigned Plan</th>
                <th className="px-4 py-3 text-left">Price Rate</th>
                <th className="px-4 py-3 text-left">Payment & Paystack Ref</th>
                <th className="px-4 py-3 text-left">Cadence</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Trial / Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No subscriptions match your query.
                  </td>
                </tr>
              )}
              {paged.map(u => {
                const isPaid = Boolean(u.hasPaid || u.paystackReference || u.lastPaymentDate) && !u.freeAccess;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {u.name || "Farmer"}
                      </p>
                      <p className="text-slate-400 text-[11px] truncate">{u.email}</p>
                      <p className="text-slate-500 text-[10px] font-semibold mt-0.5 truncate">{u.farmName || "Primary Farm"}</p>
                    </td>

                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap font-bold">
                      {u.activePlan || <span className="text-slate-300 font-normal">—</span>}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">{fmtEffective(u)}</td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {isPaid ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-emerald-800 text-xs">
                              {fmtMoney(u.subscriptionAmount || effectivePrice(u, plans))}
                            </span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                              Paid ✓
                            </span>
                          </div>
                          {u.paystackReference ? (
                            <span className="inline-block font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 mt-0.5" title={`Paystack Reference: ${u.paystackReference}`}>
                              Ref: {u.paystackReference}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 block mt-0.5">Verified offline/admin</span>
                          )}
                          {u.lastPaymentDate && (
                            <span className="text-[10px] text-slate-400 block">{fmtDate(u.lastPaymentDate)}</span>
                          )}
                        </div>
                      ) : u.freeAccess ? (
                        <span className="text-emerald-700 font-semibold text-xs">VIP Free Access</span>
                      ) : (
                        <span className="text-amber-600 font-medium text-xs">Unpaid (Trial)</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-600 capitalize whitespace-nowrap font-medium">
                      {u.billingFrequency || "monthly"}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                        {u.freeAccess && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            VIP ✦
                          </span>
                        )}
                      </div>
                    </td>

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

                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors text-xs font-bold inline-flex items-center gap-1"
                        title="Adjust Pricing & Subscription"
                      >
                        <Edit2 size={12} /> Adjust Pricing
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <Pagination total={filtered.length} page={page} perPage={PER_PAGE} onPage={setPage} />
        </div>
      </Card>

      {/* Edit Subscription Modal */}
      {editing && (
        <Modal title={`Regulate Pricing & Subscription — ${editing.name}`} onClose={() => setEditing(null)} wide>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900">{editing.name}</span> · <span>{editing.email}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{editing.farmName || "Primary Farm"}</p>
              </div>
              <div className="text-right">
                <Bdg label={editing.subscriptionStatus} color={STATUS_COLOR[editing.subscriptionStatus] || "gray"} />
                {editing.hasPaid && <span className="block text-[10px] text-emerald-700 font-bold mt-0.5">Paid Verified ✓</span>}
              </div>
            </div>

            {/* Free Access Switch */}
            <div
              className={`rounded-2xl border p-4 flex items-center justify-between transition-colors ${
                form.freeAccess ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${form.freeAccess ? "text-emerald-900" : "text-slate-800"}`}>
                  {form.freeAccess ? "✦ Complimentary VIP / 100% Free Access" : "Complimentary Access"}
                </p>
                <p className={`text-xs mt-0.5 ${form.freeAccess ? "text-emerald-700" : "text-slate-500"}`}>
                  {form.freeAccess
                    ? "Billing is fully bypassed. Account is treated as permanently active."
                    : "Toggle ON to grant this subscriber full VIP access without requiring payments."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, freeAccess: !f.freeAccess }))}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  form.freeAccess ? "bg-emerald-600" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                    form.freeAccess ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {!form.freeAccess && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <F label="Assigned Plan">
                    <select
                      value={form.activePlan}
                      onChange={e => setForm({ ...form, activePlan: e.target.value })}
                      className={SC}
                    >
                      <option value="">— None —</option>
                      {planNames.map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </F>

                  <F label="Billing Cadence">
                    <select
                      value={form.billingFrequency}
                      onChange={e => setForm({ ...form, billingFrequency: e.target.value as any })}
                      className={SC}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </F>
                </div>

                <F label={`Special / Personal Price Override (₦)${planHint ? ` · ${planHint}` : ""}`}>
                  <input
                    type="number"
                    value={form.subscriptionAmount}
                    onChange={e => setForm({ ...form, subscriptionAmount: e.target.value })}
                    className={IC}
                    placeholder="Leave blank to use default plan rate"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Setting a special price gives this user a custom discounted rate. <strong>This does NOT automatically mark them as paid.</strong>
                  </p>
                </F>

                {/* Paystack Payment Details */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CreditCard size={13} className="text-emerald-600" /> Paystack Payment &amp; Verification
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Paystack Reference">
                      <input
                        type="text"
                        value={form.paystackReference}
                        onChange={e => setForm({ ...form, paystackReference: e.target.value })}
                        className={IC}
                        placeholder="e.g. PND_1727720934"
                      />
                    </F>
                    <F label="Payment Date">
                      <input
                        type="date"
                        value={form.lastPaymentDate}
                        onChange={e => setForm({ ...form, lastPaymentDate: e.target.value })}
                        className={IC}
                      />
                    </F>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.hasPaid}
                        onChange={e => setForm({ ...form, hasPaid: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <span>Mark this account as Verified Paid</span>
                    </label>

                    {form.hasPaid && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                        Active Paid Status
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <F label="Subscription Start Date">
                    <input
                      type="date"
                      value={form.subscriptionStart}
                      onChange={e => setForm({ ...form, subscriptionStart: e.target.value })}
                      className={IC}
                    />
                  </F>
                  <F label="Subscription Expiry Date">
                    <input
                      type="date"
                      value={form.subscriptionExpiry}
                      onChange={e => setForm({ ...form, subscriptionExpiry: e.target.value })}
                      className={IC}
                    />
                  </F>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <PBtn outline onClick={() => setEditing(null)}>
                Cancel
              </PBtn>
              <PBtn onClick={handleSave}>Save Changes</PBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
