import React, { useState, useMemo } from "react";
import { Search, Edit2, Gift, CreditCard, Sparkles, CheckCircle, Clock, DollarSign, Calendar } from "lucide-react";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, Modal, F, IC, SC } from "../../app/shared";
import type { AdminUser, AdminPlan } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, computeSubscriptionStatus, effectivePrice } from "../types";

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

const STATUSES = ["All", "Active", "Trial", "Expired", "Suspended", "Free Access"];

export default function SubscriptionsPage({ users, plans, onUpdate }: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    activePlan: "",
    billingFrequency: "monthly",
    subscriptionAmount: "",
    subscriptionStart: "",
    subscriptionExpiry: "",
    freeAccess: false,
  });

  const filtered = useMemo(() => {
    let list = [...users];

    if (filter === "Free Access") {
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
          (u?.activePlan || "").toLowerCase().includes(lq)
      );
    }

    return list;
  }, [users, q, filter]);

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
      billingFrequency: u.billingFrequency,
      subscriptionAmount: u.subscriptionAmount !== null ? String(u.subscriptionAmount) : "",
      subscriptionStart: u.subscriptionStart || "",
      subscriptionExpiry: u.subscriptionExpiry || "",
      freeAccess: !!u.freeAccess,
    });
    setEditing(u);
  }

  function handleSave() {
    if (!editing) return;
    const updated: AdminUser = {
      ...editing,
      activePlan: form.activePlan || null,
      billingFrequency: form.billingFrequency as "monthly" | "yearly",
      subscriptionAmount: !form.freeAccess && form.subscriptionAmount ? Number(form.subscriptionAmount) : null,
      subscriptionStart: form.subscriptionStart || null,
      subscriptionExpiry: form.subscriptionExpiry || null,
      freeAccess: form.freeAccess,
    };
    updated.subscriptionStatus = computeSubscriptionStatus(updated);
    onUpdate(updated);
    setEditing(null);
  }

  function fmtEffective(u: AdminUser) {
    if (u.freeAccess) return <span className="text-green-600 font-bold">Free ✦</span>;
    const ep = effectivePrice(u, plans);
    if (ep === null) return <span className="text-slate-300">—</span>;
    if (ep === "free") return <span className="text-green-600 font-bold">Free ✦</span>;
    return <span className="font-semibold text-slate-800">{fmtMoney(ep)}</span>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
            Subscriptions & Pricing Overrides
          </h1>
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            Revenue Regulator
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-0.5">
          Regulate individual subscriber fees, configure custom price overrides, or grant lifetime complimentary access.
        </p>
      </div>

      <Card className="overflow-hidden border border-slate-200/80">
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
              placeholder="Search by subscriber name, email, or plan…"
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400/40 bg-white"
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
                    ? "bg-green-600 text-white shadow-sm"
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
          <table className="w-full text-xs min-w-[850px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-4 py-3 text-left">Subscriber</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Effective Rate</th>
                <th className="px-4 py-3 text-left">Billing Cadence</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Trial Days</th>
                <th className="px-4 py-3 text-left">Sub Start</th>
                <th className="px-4 py-3 text-left">Sub Expiry</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                    No subscriptions match your query.
                  </td>
                </tr>
              )}
              {paged.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-4 py-3 max-w-[180px]">
                    <p className="font-bold text-slate-800 truncate flex items-center gap-1.5 group-hover:text-green-700 transition-colors">
                      {u.name}
                      {u.freeAccess && (
                        <Gift size={13} className="text-green-600 shrink-0" title="Complimentary Free Access" />
                      )}
                    </p>
                    <p className="text-slate-400 text-[11px] truncate">{u.email}</p>
                    {u.paystackReference && (
                      <span className="inline-block font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 mt-0.5" title={`Paystack Reference: ${u.paystackReference}`}>
                        Ref: {u.paystackReference}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                    {u.activePlan || <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">{fmtEffective(u)}</td>

                  <td className="px-4 py-3 text-slate-600 capitalize whitespace-nowrap font-medium">
                    {u.billingFrequency}
                  </td>

                  <td className="px-4 py-3 whitespace-nowrap">
                    <Bdg label={u.subscriptionStatus} color={STATUS_COLOR[u.subscriptionStatus] || "gray"} />
                  </td>

                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {u.subscriptionStatus === "Trial" ? (
                      <span className="text-amber-600 font-bold">
                        {trialDaysLeft(u.trialStartDate)}d remaining
                      </span>
                    ) : (
                      fmtDate(u.trialStartDate)
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(u.subscriptionStart)}</td>

                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(u.subscriptionExpiry)}</td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-700 transition-colors text-xs font-semibold flex items-center gap-1 ml-auto"
                      title="Adjust Subscription Pricing"
                    >
                      <Edit2 size={12} /> Adjust
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

      {/* Edit Subscription Modal */}
      {editing && (
        <Modal title={`Regulate Subscription — ${editing.name}`} onClose={() => setEditing(null)} wide>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-200/80">
              <span className="font-bold text-slate-900">{editing.name}</span> · <span>{editing.email}</span>
            </div>

            {/* Free Access Switch */}
            <div
              className={`rounded-2xl border p-4 flex items-center justify-between transition-colors ${
                form.freeAccess ? "bg-green-50/90 border-green-300" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div>
                <p className={`text-sm font-bold ${form.freeAccess ? "text-green-800" : "text-slate-800"}`}>
                  {form.freeAccess ? "✦ Complimentary VIP / 100% Free Access" : "Complimentary Access"}
                </p>
                <p className={`text-xs mt-0.5 ${form.freeAccess ? "text-green-700" : "text-slate-500"}`}>
                  {form.freeAccess
                    ? "Billing is fully bypassed. Account is treated as permanently active."
                    : "Toggle ON to grant this subscriber full access without requiring payments."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, freeAccess: !f.freeAccess }))}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  form.freeAccess ? "bg-green-600" : "bg-slate-300"
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
                      onChange={e => setForm({ ...form, billingFrequency: e.target.value })}
                      className={SC}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </F>
                </div>

                <F label={`Custom Price Override (₦)${planHint ? ` · ${planHint}` : ""}`}>
                  <input
                    type="number"
                    value={form.subscriptionAmount}
                    onChange={e => setForm({ ...form, subscriptionAmount: e.target.value })}
                    className={IC}
                    placeholder="Leave blank to use default plan rate"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Entering an amount here overrides standard pricing for this user.
                  </p>
                </F>

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
              <PBtn onClick={handleSave}>Save Subscription Rates</PBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
