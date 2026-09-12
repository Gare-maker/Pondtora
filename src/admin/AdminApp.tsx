import React, { useState, useEffect } from "react";
import {
  Fish,
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  CheckCircle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  RotateCw,
} from "lucide-react";
import AdminLogin from "./AdminLogin";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import PlansPage from "./pages/PlansPage";
import type { AdminUser, AdminPlan, AdminActivityLog } from "./types";
import { DEFAULT_PLANS } from "./types";
import { projectId } from "../../utils/supabase/info";
import { loadPaystackConfig, savePaystackConfig, PaystackConfig } from "../lib/paystack";
import {
  fetchLiveAdminUsers,
  updateAdminUserInDb,
  deleteAdminUserInDb,
  isDummyUser,
  saveAllAdminUsers,
} from "../lib/userSync";
import { Toaster, toast } from "sonner";

type Page = "dashboard" | "users" | "subscriptions" | "plans" | "logs" | "settings";

const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users & Farms", icon: Users },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
  { id: "plans", label: "Pricing & Plans", icon: Package },
  { id: "logs", label: "Activity Logs", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

const INITIAL_LOGS: AdminActivityLog[] = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    action: "Admin Portal Accessed",
    category: "auth",
    details: "Authenticated as Master Admin (edafejesugarec@gmail.com)",
    adminEmail: "edafejesugarec@gmail.com",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    action: "New User Registered",
    category: "user",
    details: "Adebayo Okafor registered Sunshine Farms on Commercial Plan",
    adminEmail: "system",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    action: "Trial Started",
    category: "subscription",
    details: "Fatima Bello (AquaFarm North) started 30-day Starter trial",
    adminEmail: "system",
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    action: "Pricing Initialized",
    category: "plan",
    details: "Configured 6 default subscription plans for single and multi-farm operations",
    adminEmail: "edafejesugarec@gmail.com",
  },
];

// Seed users for demonstration and live testing
const DUMMY_USERS: AdminUser[] = [
  {
    id: "1",
    name: "Adebayo Okafor",
    email: "adebayo@example.com",
    farmName: "Sunshine Farms",
    phone: "+234 802 123 4567",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
    activePlan: "Commercial",
    trialStartDate: null,
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Active",
    subscriptionStart: "2025-01-15",
    subscriptionExpiry: "2026-01-15",
    accountStatus: "Active",
    farmCount: 1,
    role: "owner",
    createdAt: "2025-01-15",
  },
  {
    id: "2",
    name: "Ngozi Eze",
    email: "ngozi@freshpond.ng",
    farmName: "FreshPond Nigeria",
    phone: "+234 803 234 5678",
    city: "Enugu",
    state: "Enugu",
    country: "Nigeria",
    activePlan: "3-Farm Plan",
    trialStartDate: null,
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Active",
    subscriptionStart: "2025-02-03",
    subscriptionExpiry: "2026-02-03",
    accountStatus: "Active",
    farmCount: 3,
    role: "owner",
    createdAt: "2025-02-03",
  },
  {
    id: "3",
    name: "Emeka Chukwu",
    email: "emeka@catfish.com",
    farmName: "Delta Catfish Co.",
    phone: "+234 805 345 6789",
    city: "Warri",
    state: "Delta",
    country: "Nigeria",
    activePlan: "Growth",
    trialStartDate: null,
    billingFrequency: "monthly",
    subscriptionAmount: 4500, // Custom negotiated discount
    subscriptionStatus: "Active",
    subscriptionStart: "2025-03-10",
    subscriptionExpiry: "2026-03-10",
    accountStatus: "Active",
    farmCount: 1,
    role: "owner",
    createdAt: "2025-03-10",
  },
  {
    id: "4",
    name: "Fatima Bello",
    email: "fatima@aquafarm.ng",
    farmName: "AquaFarm North",
    phone: "+234 809 456 7890",
    city: "Kaduna",
    state: "Kaduna",
    country: "Nigeria",
    activePlan: "Starter",
    trialStartDate: new Date().toISOString().slice(0, 10),
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Trial",
    subscriptionStart: null,
    subscriptionExpiry: null,
    accountStatus: "Active",
    farmCount: 1,
    role: "owner",
    createdAt: new Date().toISOString().slice(0, 10),
  },
  {
    id: "5",
    name: "Tunde Adeyemi",
    email: "tunde@pondfresh.com",
    farmName: "PondFresh Lagos",
    phone: "+234 801 567 8901",
    city: "Epe",
    state: "Lagos",
    country: "Nigeria",
    activePlan: "Starter",
    trialStartDate: "2025-06-01",
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Expired",
    subscriptionStart: null,
    subscriptionExpiry: "2025-07-01",
    accountStatus: "Active",
    farmCount: 1,
    role: "owner",
    createdAt: "2025-06-01",
  },
  {
    id: "6",
    name: "Chidinma Obi",
    email: "chidinma@tilapia.ng",
    farmName: "Tilapia Gold Farm",
    phone: "+234 808 678 9012",
    city: "Asaba",
    state: "Delta",
    country: "Nigeria",
    activePlan: "5-Farm Plan",
    trialStartDate: null,
    billingFrequency: "yearly",
    subscriptionAmount: null,
    subscriptionStatus: "Active",
    subscriptionStart: "2024-11-01",
    subscriptionExpiry: "2025-11-01",
    accountStatus: "Active",
    freeAccess: true, // Complimentary VIP access
    farmCount: 5,
    role: "owner",
    createdAt: "2024-11-01",
  },
  {
    id: "7",
    name: "Segun Badmus",
    email: "segun@riverfish.com",
    farmName: "RiverFish Estate",
    phone: "+234 807 789 0123",
    city: "Abeokuta",
    state: "Ogun",
    country: "Nigeria",
    activePlan: "Commercial",
    trialStartDate: null,
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Suspended",
    subscriptionStart: "2024-09-05",
    subscriptionExpiry: "2025-09-05",
    accountStatus: "Suspended",
    farmCount: 1,
    role: "owner",
    createdAt: "2024-09-05",
  },
  {
    id: "8",
    name: "Amaka Nwosu",
    email: "amaka@pondfarm.ng",
    farmName: "Amaka Pond Farm",
    phone: "+234 810 890 1234",
    city: "Owerri",
    state: "Imo",
    country: "Nigeria",
    activePlan: "Starter",
    trialStartDate: new Date().toISOString().slice(0, 10),
    billingFrequency: "monthly",
    subscriptionAmount: null,
    subscriptionStatus: "Trial",
    subscriptionStart: null,
    subscriptionExpiry: null,
    accountStatus: "Active",
    farmCount: 1,
    role: "owner",
    createdAt: new Date().toISOString().slice(0, 10),
  },
  {
    id: "9",
    name: "Yusuf Ibrahim",
    email: "yusuf@northfish.ng",
    farmName: "Northern Fisheries",
    phone: "+234 812 901 2345",
    city: "Kano",
    state: "Kano",
    country: "Nigeria",
    activePlan: "Unlimited Farms",
    trialStartDate: null,
    billingFrequency: "yearly",
    subscriptionAmount: null,
    subscriptionStatus: "Active",
    subscriptionStart: "2024-07-20",
    subscriptionExpiry: "2025-07-20",
    accountStatus: "Active",
    farmCount: 8,
    role: "owner",
    createdAt: "2024-07-20",
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminApp({ onExit }: { onExit?: () => void } = {}) {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("pondtora_admin_auth") === "true";
  });
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem("pondtora_admin_email") || "edafejesugarec@gmail.com";
  });
  const [page, setPage] = useState<Page>("dashboard");
  const [sideOpen, setSideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLiveDb, setIsLiveDb] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Persistent Admin State (Live Supabase users only, no dummy mock accounts)
  const [users, setUsers] = useState<AdminUser[]>(() => {
    const loaded = loadLocal("pondtora_admin_users", []);
    return loaded.filter(u => !isDummyUser(u));
  });
  const [plans, setPlans] = useState<AdminPlan[]>(() => {
    const loaded = loadLocal("pondtora_admin_plans", []);
    return loaded.length > 0 ? loaded : DEFAULT_PLANS;
  });
  const [logs, setLogs] = useState<AdminActivityLog[]>(() => {
    const loaded = loadLocal("pondtora_admin_logs", []);
    return loaded.length > 0 ? loaded : INITIAL_LOGS;
  });

  async function handleSyncLiveUsers(showToast = true) {
    setIsSyncing(true);
    try {
      const res = await fetchLiveAdminUsers();
      setUsers(res.users);
      setIsLiveDb(res.isLiveFromDb);
      setLastSynced(new Date());
      if (showToast) {
        if (res.isLiveFromDb) {
          toast.success(`Synced ${res.users.length} live user account${res.users.length === 1 ? "" : "s"} from Supabase`);
        } else {
          toast.info(`Database returned ${res.count} account${res.count === 1 ? "" : "s"}`);
        }
      }
    } catch (err: any) {
      if (showToast) {
        toast.error("Database sync failed: " + (err?.message || "Check network connection"));
      }
    } finally {
      setIsSyncing(false);
    }
  }

  // Automatically fetch live registered users from Supabase upon admin authentication
  useEffect(() => {
    if (loggedIn) {
      handleSyncLiveUsers(false);
    }
  }, [loggedIn]);

  // Listen for live cross-window or inter-component user and plan updates
  useEffect(() => {
    const onUsersUpdate = (e: any) => {
      if (e.detail) setUsers(e.detail.filter((u: AdminUser) => !isDummyUser(u)));
      else setUsers(loadLocal("pondtora_admin_users", []).filter((u: AdminUser) => !isDummyUser(u)));
    };
    const onLogsUpdate = (e: any) => {
      if (e.detail) setLogs(e.detail);
      else setLogs(loadLocal("pondtora_admin_logs", INITIAL_LOGS));
    };
    const onPlansUpdate = (e: any) => {
      if (e.detail) setPlans(e.detail);
      else setPlans(loadLocal("pondtora_admin_plans", DEFAULT_PLANS));
    };

    window.addEventListener("pondtora:users_updated", onUsersUpdate);
    window.addEventListener("pondtora:logs_updated", onLogsUpdate);
    window.addEventListener("pondtora:plans_updated", onPlansUpdate);

    return () => {
      window.removeEventListener("pondtora:users_updated", onUsersUpdate);
      window.removeEventListener("pondtora:logs_updated", onLogsUpdate);
      window.removeEventListener("pondtora:plans_updated", onPlansUpdate);
    };
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem("pondtora_admin_users", JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem("pondtora_admin_plans", JSON.stringify(plans));
      localStorage.setItem("pondtora_custom_plans", JSON.stringify(plans));
      window.dispatchEvent(new CustomEvent("pondtora:plans_updated", { detail: plans }));
    } catch {}
  }, [plans]);

  useEffect(() => {
    try {
      localStorage.setItem("pondtora_admin_logs", JSON.stringify(logs));
    } catch {}
  }, [logs]);

  function logAction(action: string, category: AdminActivityLog["category"], details: string) {
    const newLog: AdminActivityLog = {
      id: uid(),
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      adminEmail,
    };
    setLogs(prev => [newLog, ...prev]);
  }

  function handleLoginSuccess(info?: { email: string; role: string }) {
    if (info?.email) {
      setAdminEmail(info.email);
    }
    setLoggedIn(true);
    logAction("Admin Sign In", "auth", `Successfully signed into admin panel`);
  }

  if (!loggedIn) {
    return <AdminLogin onLogin={handleLoginSuccess} onExit={onExit} />;
  }

  function handleUpdateUser(u: AdminUser) {
    setUsers(prev => {
      const next = prev.map(x => (x.id === u.id ? u : x));
      saveAllAdminUsers(next);
      return next;
    });
    updateAdminUserInDb(u).catch(console.warn);
    logAction("User Profile Updated", "user", `Updated account details for ${u.name} (${u.email})`);
  }

  function handleDeleteUser(id: string) {
    const u = users.find(x => x.id === id);
    setUsers(prev => {
      const next = prev.filter(x => x.id !== id);
      saveAllAdminUsers(next);
      return next;
    });
    deleteAdminUserInDb(id).catch(console.warn);
    logAction("User Deleted", "user", `Permanently deleted user ${u?.name || id}`);
  }

  async function handleAddUser(u: Omit<AdminUser, "id">) {
    const created: AdminUser = {
      ...u,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setUsers(prev => [created, ...prev]);
    saveAllAdminUsers([created, ...users]);
    logAction("User Created", "user", `Manually created user ${u.name} (${u.email})`);
    try {
      await updateAdminUserInDb(created);
      toast.success("User added and synced to database");
    } catch (err) {
      console.warn("Failed to persist user to Supabase:", err);
    }
  }

  function handleAddPlan(p: Omit<AdminPlan, "id">) {
    const created = { ...p, id: uid() };
    setPlans(prev => [...prev, created]);
    logAction("Plan Created", "plan", `Created new plan: ${p.name} at ₦${p.monthlyPrice.toLocaleString()}/mo`);
  }

  function handleUpdatePlan(p: AdminPlan) {
    setPlans(prev => prev.map(x => (x.id === p.id ? p : x)));
    logAction(
      "Plan Modified",
      "plan",
      `Updated plan ${p.name} rates: ₦${p.monthlyPrice.toLocaleString()}/mo (₦${p.yearlyPrice.toLocaleString()}/yr)`
    );
  }

  function handleResetDefaultPlans() {
    setPlans(DEFAULT_PLANS);
    logAction("Plans Reset", "plan", `Reset all plans to standard default rates`);
  }

  function handleLogout() {
    logAction("Admin Sign Out", "auth", `Logged out from admin console`);
    localStorage.removeItem("pondtora_admin_auth");
    setLoggedIn(false);
    setPage("dashboard");
  }

  function handleReturnToApp() {
    if (onExit) {
      onExit();
    } else {
      localStorage.removeItem("pondtora_admin_mode");
      window.location.href = window.location.origin + window.location.pathname;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-['Barlow',sans-serif]">
      <Toaster position="top-right" richColors duration={2500} />
      {/* Mobile Backdrop */}
      {sideOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSideOpen(false)} />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sideOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
            <Fish size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-base font-bold font-['Barlow_Condensed',sans-serif] leading-tight truncate">
              Pondtora Admin
            </p>
            <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold">Master Console</p>
          </div>
          <button
            onClick={() => setSideOpen(false)}
            className="ml-auto text-slate-500 hover:text-white lg:hidden p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Admin Badge */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2.5">
          <ShieldCheck size={16} className="text-green-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Administrator</p>
            <p className="text-xs text-white truncate font-mono font-medium">{adminEmail}</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setSideOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  active
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md shadow-green-600/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer Navigation */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <button
            onClick={handleReturnToApp}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={14} className="shrink-0 text-slate-400" />
            Return to User App
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={14} className="shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3 lg:px-7 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSideOpen(true)}
              className="lg:hidden text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                {NAV.find(n => n.id === page)?.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSyncLiveUsers(true)}
              disabled={isSyncing}
              title="Refresh and sync user accounts from Supabase"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              <RotateCw size={13} className={isSyncing ? "animate-spin text-green-600" : "text-slate-600"} />
              <span className="hidden sm:inline">{isSyncing ? "Syncing…" : "Sync Users"}</span>
            </button>
            <button
              onClick={handleReturnToApp}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <ExternalLink size={12} /> View Customer App
            </button>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1 text-xs text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              {isLiveDb ? "Live DB Connected" : "Owner Portal Active"}
            </div>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-7">
          {page === "dashboard" && (
            <DashboardPage
              users={users}
              plans={plans}
              logs={logs}
              onNavigate={p => setPage(p as Page)}
              onRefresh={() => handleSyncLiveUsers(true)}
              isRefreshing={isSyncing}
              isLiveDb={isLiveDb}
              lastSynced={lastSynced}
            />
          )}
          {page === "users" && (
            <UsersPage
              users={users}
              plans={plans}
              onAdd={handleAddUser}
              onUpdate={handleUpdateUser}
              onDelete={handleDeleteUser}
              onRefresh={() => handleSyncLiveUsers(true)}
              isRefreshing={isSyncing}
            />
          )}
          {page === "subscriptions" && (
            <SubscriptionsPage
              users={users}
              plans={plans}
              onUpdate={handleUpdateUser}
            />
          )}
          {page === "plans" && (
            <PlansPage
              plans={plans}
              onAdd={handleAddPlan}
              onUpdate={handleUpdatePlan}
              onResetDefaults={handleResetDefaultPlans}
            />
          )}
          {page === "logs" && <ActivityLogsPage logs={logs} onClear={() => setLogs([])} />}
          {page === "settings" && (
            <SettingsPage
              adminEmail={adminEmail}
              userCount={users.length}
              planCount={plans.length}
              isSyncing={isSyncing}
              isLiveDb={isLiveDb}
              onSyncLiveUsers={() => handleSyncLiveUsers(true)}
              onClearDemoUsers={() => {
                const realUsers = users.filter(u => !isDummyUser(u));
                setUsers(realUsers);
                saveAllAdminUsers(realUsers);
                setLogs(prev => prev.filter(l => !l.id.startsWith("log-")));
                logAction("Demo Data Cleared", "system", "Cleared demo sample users — system is in live production mode");
                handleSyncLiveUsers(true);
              }}
              onResetAll={() => {
                setUsers([]);
                saveAllAdminUsers([]);
                setPlans(DEFAULT_PLANS);
                setLogs(INITIAL_LOGS);
                logAction("System Reset", "system", "Reset local state and synced with live database");
                handleSyncLiveUsers(true);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ActivityLogsPage({ logs, onClear }: { logs: AdminActivityLog[]; onClear: () => void }) {
  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
            System & Activity Logs
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit history of all administrative changes, logins, and subscriber events.
          </p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClear}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors"
          >
            Clear Log History
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-12">No activity records logged.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      log.category === "plan"
                        ? "bg-purple-100 text-purple-700"
                        : log.category === "user"
                        ? "bg-blue-100 text-blue-700"
                        : log.category === "subscription"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <Activity size={14} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-800">{log.action}</p>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.2 rounded">
                        {log.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{log.details}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Initiator: {log.adminEmail}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPage({
  adminEmail,
  userCount,
  planCount,
  isSyncing,
  isLiveDb,
  onSyncLiveUsers,
  onClearDemoUsers,
  onResetAll,
}: {
  adminEmail: string;
  userCount: number;
  planCount: number;
  isSyncing?: boolean;
  isLiveDb?: boolean;
  onSyncLiveUsers?: () => void;
  onClearDemoUsers: () => void;
  onResetAll: () => void;
}) {
  const [paystackCfg, setPaystackCfg] = useState<PaystackConfig>(loadPaystackConfig());
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePaystack = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    savePaystackConfig(paystackCfg);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Paystack gateway configuration updated successfully!");
    }, 300);
  };

  const handleToggleMode = (mode: "test" | "live") => {
    const updated = { ...paystackCfg, mode };
    setPaystackCfg(updated);
    savePaystackConfig(updated);
    toast.success(`Paystack switched to ${mode === "live" ? "🟢 LIVE Mode" : "🟡 TEST Mode"}`);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
          Admin Settings & Platform Info
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Configuration details, payment gateway settings, and database controls.</p>
      </div>

      {/* Paystack Payment Gateway Configuration */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Paystack Payment Gateway
              </h2>
              <p className="text-xs text-slate-400">Manage client-side Public API keys and toggle between Test and Live processing.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleMode("test")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                paystackCfg.mode === "test"
                  ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
            >
              🟡 Test Mode
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode("live")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                paystackCfg.mode === "live"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:text-slate-800"
              }`}
            >
              🟢 Live Mode
            </button>
          </div>
        </div>

        <form onSubmit={handleSavePaystack} className="space-y-4 text-xs">
          {/* Active Mode Notice */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              paystackCfg.mode === "live"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                paystackCfg.mode === "live" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <p className="font-medium leading-relaxed">
              {paystackCfg.mode === "live"
                ? "Live Mode is active. Real Paystack charges and transactions will be processed using your Live Public Key."
                : "Test Mode is active. Test transactions are processed using your Test Public Key without charging real money."}
            </p>
          </div>

          {/* Key Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Live Key */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-600" /> Live Environment
                </span>
                {paystackCfg.mode === "live" && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Public Live Key</label>
                <input
                  type="text"
                  value={paystackCfg.livePublicKey}
                  onChange={e => setPaystackCfg({ ...paystackCfg, livePublicKey: e.target.value })}
                  placeholder="pk_live_..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Test Key */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Key size={12} className="text-amber-600" /> Test Environment
                </span>
                {paystackCfg.mode === "test" && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Public Test Key</label>
                <input
                  type="text"
                  value={paystackCfg.testPublicKey}
                  onChange={e => setPaystackCfg({ ...paystackCfg, testPublicKey: e.target.value })}
                  placeholder="pk_test_..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-slate-700 flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-[11px]">
              <p className="font-bold text-slate-900">Security Best Practice Enforced</p>
              <p className="text-slate-600 leading-relaxed">
                Paystack Secret Keys (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">sk_live_...</code>, <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">sk_test_...</code>) are server-only credentials and are NEVER exposed to or stored in frontend code or browser storage.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Save size={14} /> {isSaving ? "Saving…" : "Save Paystack Settings"}
            </button>
          </div>
        </form>
      </div>

      {/* Admin Profile Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck size={16} className="text-green-600" /> Authorized Admin Account
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Master Email</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5 font-mono">{adminEmail}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Access Privileges</p>
            <p className="text-sm font-bold text-green-700 mt-0.5">Full Site Owner & Pricing Regulator</p>
          </div>
        </div>
      </div>

      {/* Platform & Database Status */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Package size={16} className="text-green-600" /> Platform Infrastructure
        </h2>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Supabase Connected Project</span>
            <span className="font-mono text-slate-800 font-bold">{projectId}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Total Registered Users in State</span>
            <span className="font-bold text-slate-800">{userCount} accounts</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-500">Total Regulated Plans</span>
            <span className="font-bold text-slate-800">{planCount} subscription tiers</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-500">Direct Admin Portal URL</span>
            <span className="font-mono text-slate-800 font-semibold">
              {typeof window !== "undefined" ? `${window.location.origin}/admin` : "/admin"}
            </span>
          </div>
        </div>
      </div>

      {/* Production Mode & Demo Data Controls */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400" /> Database Synchronization & Production Mode
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pull genuine user accounts and registered farms straight from Supabase, or remove sample demo accounts.
            </p>
          </div>
          {onSyncLiveUsers && (
            <button
              onClick={onSyncLiveUsers}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5 shrink-0"
            >
              <RotateCw size={13} className={isSyncing ? "animate-spin" : ""} />
              {isSyncing ? "Syncing Database…" : "Sync All Users from Supabase"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            onClick={() => {
              if (window.confirm("Clear all dummy/sample accounts and switch to Clean Live Production Mode? (Real registered users will be preserved)")) {
                onClearDemoUsers();
              }
            }}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-1.5"
          >
            <CheckCircle size={14} /> Clear Demo Data (Go 100% Live)
          </button>
          <button
            onClick={() => {
              if (window.confirm("Restore sample demo users and sample activity logs for demonstration?")) {
                onResetAll();
              }
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-700"
          >
            <RotateCcw size={13} /> Restore Sample Demo Data
          </button>
        </div>
      </div>
    </div>
  );
}
