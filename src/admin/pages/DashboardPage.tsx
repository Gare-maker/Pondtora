import React, { useMemo } from "react";
import { Users, TrendingUp, AlertCircle, Ban, Clock, CreditCard, DollarSign, ArrowUpRight, Activity, Package, UserCheck, Shield } from "lucide-react";
import { Card, Bdg } from "../../app/shared";
import type { AdminUser, AdminPlan, AdminActivityLog } from "../types";
import { fmtDate, trialDaysLeft, fmtMoney, effectivePrice } from "../types";

interface Props {
  users: AdminUser[];
  plans: AdminPlan[];
  logs?: AdminActivityLog[];
  onNavigate?: (page: string) => void;
}

function StatBox({
  label,
  value,
  subtitle,
  icon: Icon,
  bg,
  ic,
  badge
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  bg: string;
  ic: string;
  badge?: { text: string; color: "green" | "amber" | "red" | "blue" };
}) {
  return (
    <Card className="p-4 relative overflow-hidden transition-all hover:shadow-md border border-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold truncate">{label}</p>
          <p className="text-2xl lg:text-3xl font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900 mt-0.5 leading-none truncate">
            {value}
          </p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
          <Icon size={18} className={ic} />
        </div>
      </div>
      {badge && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">Status</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            badge.color === "green" ? "bg-green-100 text-green-700" :
            badge.color === "amber" ? "bg-amber-100 text-amber-700" :
            badge.color === "blue" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
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

export default function DashboardPage({ users, plans, logs = [], onNavigate }: Props) {
  // Compute Key Financial and User Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const trial = users.filter(u => u.subscriptionStatus === "Trial").length;
    const active = users.filter(u => u.subscriptionStatus === "Active").length;
    const expired = users.filter(u => u.subscriptionStatus === "Expired").length;
    const suspended = users.filter(u => u.subscriptionStatus === "Suspended").length;
    const free = users.filter(u => u.freeAccess).length;

    // Calculate Monthly Recurring Revenue (MRR)
    let mrr = 0;
    users.forEach(u => {
      if (u.subscriptionStatus === "Active" && !u.freeAccess) {
        const ep = effectivePrice(u, plans);
        if (typeof ep === "number") {
          if (u.billingFrequency === "yearly") {
            mrr += Math.round(ep / 12);
          } else {
            mrr += ep;
          }
        }
      }
    });

    const arr = mrr * 12;

    return { total, trial, active, expired, suspended, free, mrr, arr };
  }, [users, plans]);

  const planBreakdown = useMemo(() => {
    const m: Record<string, { count: number; revenue: number }> = {};
    users.forEach(u => {
      const k = u.activePlan || "No Plan";
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
  }, [users, plans]);

  const recent = useMemo(() =>
    [...users].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 6),
    [users]
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
              Platform Overview & Monitoring
            </h1>
            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live Monitoring
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time analytics for user accounts, platform subscriptions, and financial metrics.
          </p>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("plans")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-green-400 hover:text-green-700 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Package size={13} className="text-green-600" /> Regulate Pricing
            </button>
            <button
              onClick={() => onNavigate("users")}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Users size={13} /> Manage Users
            </button>
          </div>
        )}
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatBox
          label="Estimated MRR"
          value={fmtMoney(stats.mrr)}
          subtitle={`Annual Run Rate: ${fmtMoney(stats.arr)}`}
          icon={DollarSign}
          bg="bg-emerald-50"
          ic="text-emerald-600"
          badge={{ text: "Active Run Rate", color: "green" }}
        />
        <StatBox
          label="Total Registered Users"
          value={stats.total}
          subtitle={`${stats.active} Paid · ${stats.trial} On Trial`}
          icon={Users}
          bg="bg-slate-100"
          ic="text-slate-700"
          badge={{ text: `${stats.total} Total`, color: "blue" }}
        />
        <StatBox
          label="Paid Subscriptions"
          value={stats.active}
          subtitle={`${stats.free} Free / Complimentary`}
          icon={TrendingUp}
          bg="bg-green-50"
          ic="text-green-600"
          badge={{ text: "Paying Accounts", color: "green" }}
        />
        <StatBox
          label="Trial Accounts"
          value={stats.trial}
          subtitle={`${stats.expired} Expired · ${stats.suspended} Suspended`}
          icon={Clock}
          bg="bg-amber-50"
          ic="text-amber-600"
          badge={{ text: "30-Day Trial", color: "amber" }}
        />
      </div>

      {/* Main Grid: Plan Breakdown & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Users by Plan Breakdown */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package size={15} className="text-green-600" /> Plan Distribution
              </h2>
              <span className="text-[11px] text-slate-400 font-semibold">{plans.length} Active Plans</span>
            </div>

            {planBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No users found.</p>
            ) : (
              <div className="space-y-4">
                {planBreakdown.map(([plan, data]) => {
                  const pct = stats.total ? Math.round((data.count / stats.total) * 100) : 0;
                  return (
                    <div key={plan} className="group">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
                          {plan}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-900">{data.count} users</span>
                          <span className="text-[10px] text-slate-400">({pct}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {data.revenue > 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5 text-right">
                          Est. ~{fmtMoney(data.revenue)}/mo
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Plan limits & pricing regulator</span>
            {onNavigate && (
              <button
                onClick={() => onNavigate("plans")}
                className="text-green-600 hover:text-green-700 font-bold flex items-center gap-1"
              >
                Edit Plans <ArrowUpRight size={12} />
              </button>
            )}
          </div>
        </Card>

        {/* Recent User Signups */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users size={15} className="text-green-600" /> Recent User Activity
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Latest registrations and farm account status.</p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("users")}
                className="text-xs text-green-600 hover:text-green-700 font-bold flex items-center gap-1"
              >
                View All ({users.length}) <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {recent.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No registered users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="pb-2.5 text-left pr-3">User / Farm</th>
                    <th className="pb-2.5 text-left pr-3">Active Plan</th>
                    <th className="pb-2.5 text-left pr-3">Subscription</th>
                    <th className="pb-2.5 text-left">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recent.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-800 truncate max-w-[160px]">{u.name}</p>
                        <p className="text-slate-400 text-[11px] truncate max-w-[160px]">{u.email}</p>
                        {u.farmName && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                            {u.farmName}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 font-medium">
                        {u.activePlan || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <Bdg label={u.subscriptionStatus} color={SC[u.subscriptionStatus] || "gray"} />
                          {u.freeAccess && (
                            <span className="text-[10px] text-green-700 bg-green-100 font-bold px-1.5 py-0.5 rounded">
                              Free ✦
                            </span>
                          )}
                          {u.subscriptionStatus === "Trial" && (
                            <span className="text-[10px] text-amber-600 font-semibold">
                              {trialDaysLeft(u.trialStartDate)}d left
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-400 whitespace-nowrap">
                        {fmtDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Activity Log Audit Trail */}
      {logs.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity size={15} className="text-green-600" /> Recent System Audit Logs
            </h2>
            <span className="text-[11px] text-slate-400">Admin Actions & Events</span>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs divide-y divide-slate-50">
            {logs.slice(0, 6).map(l => (
              <div key={l.id} className="pt-2 first:pt-0 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                    l.category === "plan" ? "bg-purple-500" :
                    l.category === "user" ? "bg-blue-500" :
                    l.category === "subscription" ? "bg-emerald-500" : "bg-slate-400"
                  }`} />
                  <div>
                    <p className="font-semibold text-slate-800">{l.action}</p>
                    <p className="text-[11px] text-slate-500">{l.details}</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(l.timestamp)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
