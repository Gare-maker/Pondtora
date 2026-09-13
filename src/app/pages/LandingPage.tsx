import React, { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowRight, Star, CheckCircle, ChevronDown, Fish,
  Droplets, Package, BookOpen, Receipt, LayoutDashboard, TrendingUp,
  Users, ShieldCheck, Waves, Sparkles, ExternalLink, Calendar, Plus,
  Clock, Activity, AlertTriangle, ArrowUpRight, Check, ChevronRight,
  TrendingDown, Search, Filter, RefreshCw, Eye, Printer, Download,
  FileText, ClipboardList, Crown, Settings, MoreVertical, ArrowDownRight,
  Layers, Calculator, Pencil, Trash2, History, AlertCircle, Smartphone,
  Monitor, Columns, Send, Lock, Power, Award, HelpCircle, Phone,
  Mail, CheckSquare, DollarSign, SlidersHorizontal
} from "lucide-react";
import pondtoraLogo from "../../imports/loo-2.svg";
import heroFarmImg from "../../assets/images/african_fish_farm_hero.jpg";
import panoFarmImg from "../../assets/images/commercial_catfish_farm.jpg";
import nurseryPondImg from "../../assets/images/african_nursery_ponds.jpg";
import {
  EVERY_PLAN_INCLUDES,
  useDynamicPlans,
  yearlyPrice,
} from "../pricingData";

interface Props {
  onLogin: () => void;
  onSignup: () => void;
  onAdmin?: () => void;
}

const NAV_LINKS = [
  { label: "Solutions", href: "solutions" },
  { label: "Pond Types", href: "fields" },
  { label: "App Showcase", href: "solutions" },
  { label: "Testimonials", href: "testimonials" },
  { label: "Pricing", href: "pricing" },
  { label: "FAQ", href: "faq" },
];

/* ── Smooth Fade-in on scroll hook ── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        transition: `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
      }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FULL APPLICATION UI SHOWCASE PREVIEWS & DEVICE FRAMES
   Exact Desktop Window & Authentic Mobile Smartphone Shell
   ═══════════════════════════════════════════════════════════════════════════ */

interface AppWindowShellProps {
  activeNav: string;
  activeFarmName?: string;
  onSelectNav?: (id: string) => void;
  children: React.ReactNode;
}

function AppWindowShell({ activeNav, activeFarmName = "Crown Fisheries", onSelectNav, children }: AppWindowShellProps) {
  const navItems = [
    { id: "ponds", label: "Pond Management", icon: Droplets },
    { id: "documentation", label: "Feeding Records", icon: BookOpen },
    { id: "inventory", label: "Feed Stock", icon: Package },
    { id: "staff", label: "Staff Management", icon: Users },
    { id: "reports", label: "Daily Reports", icon: FileText },
    { id: "assessments", label: "Staff Assessment", icon: ClipboardList },
    { id: "financial", label: "Financial Dashboard", icon: LayoutDashboard },
    { id: "invoices", label: "Invoices", icon: Receipt },
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900 text-slate-100 font-['Barlow',sans-serif]">
      {/* Window Title Bar */}
      <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-slate-400 text-[11px] font-mono hidden sm:inline">app.pondtora.com</span>
        </div>
        <div className="flex items-center gap-2 text-slate-300 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#00bb58] animate-pulse" />
          <span className="font-semibold text-[#00bb58]">Live Application UI</span>
        </div>
      </div>

      {/* Main App Frame */}
      <div className="flex min-h-[520px] md:min-h-[580px] bg-[#f5f7fa] text-slate-800">
        {/* Left Sidebar (Exact Pondtora App Sidebar) */}
        <div className="hidden lg:flex flex-col w-56 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0 select-none">
          {/* Header */}
          <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-800/80 bg-slate-950/40">
            <img src={pondtoraLogo} alt="Pondtora" className="h-8 w-auto object-contain shrink-0" />
            <div>
              <p className="text-base font-bold text-white font-['Barlow_Condensed',sans-serif] leading-none tracking-wide">Pondtora</p>
            </div>
          </div>

          {/* Farm Switcher in Sidebar (Exact App Layout) */}
          <div className="px-3 py-2.5 border-b border-slate-800/80">
            <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/40 border border-slate-800 text-left">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2 h-2 rounded-full bg-[#00bb58] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate leading-tight font-['Barlow_Condensed',sans-serif]">{activeFarmName}</p>
                  <p className="text-[10px] text-slate-400 truncate">Epe, Lagos State</p>
                </div>
              </div>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Nav Links */}
          <div className="p-2.5 space-y-0.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeNav;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectNav && onSelectNav(item.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[#00bb58] text-white shadow-md shadow-[#00bb58]/20 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User profile at bottom */}
          <div className="p-3 border-t border-slate-800/80 flex items-center gap-2.5 bg-slate-950/30">
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              BA
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-semibold text-white truncate">Babatunde Adeleke</p>
              <p className="text-slate-400 text-[10px] capitalize">Farm Owner (Admin)</p>
            </div>
          </div>
        </div>

        {/* Center / Right Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f7fa]">
          {/* Topbar */}
          <div className="h-12 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">{activeFarmName}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 text-xs">Epe Station</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                <Calendar size={12} className="text-slate-400" /> Today, 13 Sep 2026
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                ₦ NGN
              </span>
            </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#f5f7fa]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Mobile Smartphone Shell ── */
interface MobilePhoneShellProps {
  activeNav: string;
  activeFarmName?: string;
  onSelectNav?: (id: string) => void;
  children: React.ReactNode;
}

function MobilePhoneShell({ activeNav, activeFarmName = "Crown Fisheries", onSelectNav, children }: MobilePhoneShellProps) {
  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[360px] rounded-[42px] p-3 bg-slate-950 shadow-2xl border-4 border-slate-800 text-slate-800 font-['Barlow',sans-serif] select-none">
      {/* Dynamic Island / Speaker Notch */}
      <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
        <div className="w-2 h-2 rounded-full bg-blue-900/40" />
      </div>

      {/* Screen Area */}
      <div className="rounded-[32px] overflow-hidden bg-[#f5f7fa] flex flex-col h-[560px] border border-slate-200/40">
        {/* Mobile App Topbar (Exact Pondtora Mobile Header) */}
        <div className="bg-slate-900 px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Menu size={16} className="text-slate-400" />
            <img src={pondtoraLogo} alt="Pondtora" className="h-6 w-auto object-contain shrink-0" />
            <span className="text-sm font-bold tracking-wide font-['Barlow_Condensed',sans-serif]">Pondtora</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700">
            <span className="truncate max-w-[90px]">{activeFarmName}</span>
            <ChevronDown size={10} />
          </div>
        </div>

        {/* Mobile Page Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar (Exact Pondtora Mobile Bottom Nav) */}
        <div className="bg-white border-t border-slate-200/90 px-2 py-1.5 flex items-center justify-around shrink-0 text-[9px] font-semibold text-slate-500">
          <button
            onClick={() => onSelectNav && onSelectNav("ponds")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              activeNav === "ponds" ? "text-[#00bb58] font-bold" : "hover:text-slate-800"
            }`}
          >
            <Droplets size={16} />
            <span>Ponds</span>
          </button>
          <button
            onClick={() => onSelectNav && onSelectNav("documentation")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              activeNav === "documentation" ? "text-[#00bb58] font-bold" : "hover:text-slate-800"
            }`}
          >
            <BookOpen size={16} />
            <span>Feeding</span>
          </button>
          <button
            onClick={() => onSelectNav && onSelectNav("inventory")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              activeNav === "inventory" ? "text-[#00bb58] font-bold" : "hover:text-slate-800"
            }`}
          >
            <Package size={16} />
            <span>Stock</span>
          </button>
          <button
            onClick={() => onSelectNav && onSelectNav("reports")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              activeNav === "reports" ? "text-[#00bb58] font-bold" : "hover:text-slate-800"
            }`}
          >
            <FileText size={16} />
            <span>Reports</span>
          </button>
          <button
            onClick={() => onSelectNav && onSelectNav("staff")}
            className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-colors ${
              activeNav === "staff" ? "text-[#00bb58] font-bold" : "hover:text-slate-800"
            }`}
          >
            <Users size={16} />
            <span>Staff</span>
          </button>
        </div>
      </div>

      {/* Home Gesture Bar */}
      <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-2" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 PURE PRESENTATION PREVIEWS (AUTHENTIC REAL APP UI, ZERO HOOKS)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 1. Pond Management Preview */
function renderPondManagementShowcase() {
  const ponds = [
    { id: 1, name: "Pond 01", type: "Concrete", species: "Catfish", count: 8500, status: "Active", date: "12 May 2026", cat: "Nursery" },
    { id: 2, name: "Pond 02", type: "Earthen", species: "Catfish", count: 14200, status: "Active", date: "18 Apr 2026", cat: "Production" },
    { id: 3, name: "Pond 03", type: "Tarpaulin", species: "Catfish", count: 4200, status: "Active", date: "02 Jun 2026", cat: "Production" },
    { id: 4, name: "Pond 04", type: "Earthen", species: "Tilapia", count: 9600, status: "Active", date: "10 May 2026", cat: "Production" },
    { id: 5, name: "Pond 05", type: "Concrete", species: "Catfish", count: 12000, status: "Active", date: "24 Jun 2026", cat: "Production" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Pond Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">View and manage all ponds — stock details, feeding history, and operational costs.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <History size={13} className="text-slate-500" /> Fish Stock History
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <Plus size={13} /> Add Pond
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ponds</p>
            <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><Droplets size={18} /></div>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">7</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700"><CheckCircle size={18} /></div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fish</p>
            <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">48,500</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><Fish size={18} /></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input readOnly value="Search…" className="w-44 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-500" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
          <span>Status:</span>
          <span className="font-semibold text-slate-800">All</span>
          <ChevronDown size={12} className="text-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
          <span>Type:</span>
          <span className="font-semibold text-slate-800">All Ponds</span>
          <ChevronDown size={12} className="text-slate-400" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">List of Ponds</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Open any pond to view fish stock, manage feeding, record mortality, and track transfers.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Pond Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Species</th>
                <th className="py-2.5 px-3">Fish Count</th>
                <th className="py-2.5 px-3">Stocking Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ponds.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    {p.name}
                    <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{p.cat}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{p.type}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{p.species}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-sm">{p.count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-slate-500">{p.date}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> {p.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="text-emerald-700 font-bold hover:text-emerald-800 text-xs">View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Pond Management</h2>
          <p className="text-[10px] text-slate-500">8 Ponds · 48,500 Total Fish</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Add
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
          <p className="text-base font-bold text-slate-900">8</p>
        </div>
        <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-center">
          <p className="text-[9px] text-emerald-700 font-bold uppercase">Active</p>
          <p className="text-base font-bold text-emerald-700">7</p>
        </div>
        <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
          <p className="text-[9px] text-slate-400 font-bold uppercase">Fish</p>
          <p className="text-base font-bold text-slate-900">48.5k</p>
        </div>
      </div>

      <div className="space-y-2">
        {ponds.slice(0, 3).map((p) => (
          <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-900 text-xs">{p.name}</p>
                <p className="text-[10px] text-slate-500">{p.type} · {p.cat}</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-slate-500">Count: <strong className="text-slate-900">{p.count.toLocaleString()}</strong></span>
              <span className="text-slate-500">{p.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 2. Daily Feeding & Pallet Limits Preview */
function renderFeedingDocumentationShowcase() {
  const feedingRows = [
    { id: 1, pond: "Pond 01", stock: "Catfish (Nursery)", count: 8500, brand: "Coppens", size: "1.5 mm", morning: 4.5, amTime: "08:15 AM", evening: 4.5, pmTime: "05:30 PM", total: 9.0, by: "Ibrahim Musa", status: "OK" },
    { id: 2, pond: "Pond 02", stock: "Catfish (Batch A)", count: 14200, brand: "Durante", size: "4.0 mm", morning: 18.0, amTime: "08:30 AM", evening: 18.0, pmTime: "05:45 PM", total: 36.0, by: "Emmanuel Okafor", status: "OK" },
    { id: 3, pond: "Pond 03", stock: "Catfish (Batch B)", count: 4200, brand: "Aller Aqua", size: "2.0 mm", morning: 6.0, amTime: "08:45 AM", evening: 6.0, pmTime: "06:00 PM", total: 12.0, by: "Emmanuel Okafor", status: "Pallet Alert" },
    { id: 4, pond: "Pond 04", stock: "Tilapia (Batch C)", count: 9600, brand: "Vital Feed", size: "3.0 mm", morning: 10.0, amTime: "09:00 AM", evening: 10.0, pmTime: "06:15 PM", total: 20.0, by: "Blessing Adeyemi", status: "OK" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Feeding Records</h1>
          <p className="text-xs text-slate-500 mt-0.5">Record morning and evening feeding amounts (kg) and monitor pallet limit warnings.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <Package size={13} className="text-blue-600" /> Log Opened Bags
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <Plus size={13} /> Bulk Log Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ponds</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8</p>
          <p className="text-[10px] text-slate-400">active ponds</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Ponds Fed</p>
          <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">6</p>
          <p className="text-[10px] text-emerald-600 font-medium">today</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">2</p>
          <p className="text-[10px] text-slate-400">not yet fed</p>
        </div>
        <div className="bg-blue-50/70 border border-blue-300 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Bags Opened</p>
          <p className="text-2xl font-bold text-blue-800 font-['Barlow_Condensed',sans-serif] mt-0.5">5</p>
          <p className="text-[10px] text-blue-600 font-medium">reconciled</p>
        </div>
      </div>

      {/* Quick bar for opened bags */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-blue-900 flex items-center gap-1.5"><Package size={13} className="text-blue-600" /> Opened Bags Today:</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-medium text-[11px]">
            Coppens 2.0mm (Catfish Nursery): <strong>2 bags</strong>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white border border-blue-200 text-blue-800 font-medium text-[11px]">
            Durante 4.0mm (General Stock): <strong>3 bags</strong>
          </span>
        </div>
        <span className="text-blue-700 font-bold text-[11px]">Reconciled with Store ✓</span>
      </div>

      {/* Daily Feeding Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Today's Feeding Records</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Morning and evening feeding breakdown per pond.</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Total Today: 77.0 kg
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Pond</th>
                <th className="py-2.5 px-3">Fish Stock</th>
                <th className="py-2.5 px-3">Brand & Size</th>
                <th className="py-2.5 px-3">Morning (kg)</th>
                <th className="py-2.5 px-3">Evening (kg)</th>
                <th className="py-2.5 px-3">Total (kg)</th>
                <th className="py-2.5 px-3">Recorded By</th>
                <th className="py-2.5 px-3">Pallet Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feedingRows.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{r.pond}</td>
                  <td className="py-2.5 px-3 text-slate-700">
                    <p>{r.stock}</p>
                    <p className="text-[10px] text-slate-400">{r.count.toLocaleString()} fish</p>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800">
                    {r.brand} <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-mono">{r.size}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">{r.morning} kg</td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">{r.evening} kg</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-sm">{r.total} kg</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.by}</td>
                  <td className="py-2.5 px-3">
                    {r.status === "Pallet Alert" ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} className="text-amber-700" /> Max Kg Reached (150kg)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Check size={11} className="text-emerald-700" /> Normal
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Feeding Records</h2>
          <p className="text-[10px] text-slate-500">6 of 8 Ponds Fed Today</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Log Feed
        </button>
      </div>

      <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between text-[11px]">
        <span className="text-blue-900 font-bold flex items-center gap-1"><Package size={12} /> Bags Opened Today:</span>
        <strong className="text-blue-700">5 Bags</strong>
      </div>

      <div className="space-y-2">
        {feedingRows.slice(0, 3).map((r) => (
          <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{r.pond}</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">{r.brand} {r.size}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div>Morning: <strong className="text-slate-800">{r.morning} kg</strong></div>
              <div>Evening: <strong className="text-slate-800">{r.evening} kg</strong></div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-emerald-700 font-bold">Total: {r.total} kg</span>
              <span className="text-slate-400">{r.by.split(" ")[0]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 3. Feed Stock Inventory Preview */
function renderFeedStockInventoryShowcase() {
  const stockItems = [
    { id: 1, brand: "Coppens", size: "1.5 mm", bags: 24, wpb: 15, totalKg: 360, cost: 38500, supplier: "Agric Depot Lagos", status: "In Stock" },
    { id: 2, brand: "Aller Aqua", size: "2.0 mm", bags: 30, wpb: 15, totalKg: 450, cost: 36000, supplier: "Premier Feeds Ibadan", status: "In Stock" },
    { id: 3, brand: "Durante", size: "3.0 mm", bags: 45, wpb: 15, totalKg: 675, cost: 32500, supplier: "Crown Feeds Epe", status: "In Stock" },
    { id: 4, brand: "Vital Feed", size: "4.0 mm", bags: 43, wpb: 15, totalKg: 645, cost: 31000, supplier: "Grand Cereals Jos", status: "In Stock" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Feed Stock</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage purchased feed stock, track daily bags opened, and view warehouse balance.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <Layers size={13} className="text-slate-500" /> Feed Requirement Calculator
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <Plus size={13} /> Buy Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bags in Stock</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">142</p>
          <p className="text-[10px] text-slate-400">across 4 brands</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Kg in Stock</p>
          <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">2,130 kg</p>
          <p className="text-[10px] text-emerald-600 font-medium">available biomass feed</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feed Value (Cost)</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦4,850,000</p>
          <p className="text-[10px] text-slate-400">current warehouse value</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bags Opened</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">38</p>
          <p className="text-[10px] text-slate-400">this cycle</p>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <span className="px-3 py-1 bg-white text-emerald-800 rounded-lg shadow-2xs font-bold">Active Stock</span>
        <span className="px-3 py-1 text-slate-500">Daily Bags Opened</span>
        <span className="px-3 py-1 text-slate-500">Purchase History</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Brand</th>
                <th className="py-2.5 px-3">Pallet Size</th>
                <th className="py-2.5 px-3">Bags in Stock</th>
                <th className="py-2.5 px-3">Weight / Bag</th>
                <th className="py-2.5 px-3">Total Weight</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Cost / Bag</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stockItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.brand}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-700">{item.size}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{item.bags} bags</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.wpb} kg</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-sm">{item.totalKg} kg</td>
                  <td className="py-2.5 px-3 text-slate-600">{item.supplier}</td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">₦{item.cost.toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      In Stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Feed Stock</h2>
          <p className="text-[10px] text-slate-500">142 Bags · 2,130 kg in Store</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Buy Feed
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Total Stock</p>
          <p className="text-base font-bold text-slate-900">142 Bags</p>
        </div>
        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
          <p className="text-[9px] text-emerald-700 uppercase font-bold">Total Weight</p>
          <p className="text-base font-bold text-emerald-700">2,130 kg</p>
        </div>
      </div>

      <div className="space-y-2">
        {stockItems.slice(0, 3).map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{item.brand} ({item.size})</span>
              <span className="font-bold text-emerald-700">{item.bags} bags</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Total: {item.totalKg} kg</span>
              <span>₦{item.cost.toLocaleString()}/bag</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 4. Staff Management Preview */
function renderStaffManagementShowcase() {
  const staffList = [
    { id: "1", name: "Emmanuel Okafor", role: "Farm Manager", status: "Active", phone: "0803 234 5678", email: "emmanuel@farm.ng", perms: ["Feeding Records", "Feed Stock", "Reports"], color: "bg-emerald-100 text-emerald-800" },
    { id: "2", name: "Ibrahim Musa", role: "Feeding Staff", status: "Active", phone: "0802 876 5432", email: "ibrahim@farm.ng", perms: ["Feeding Records"], color: "bg-blue-100 text-blue-800" },
    { id: "3", name: "Blessing Adeyemi", role: "Feeding Staff", status: "Active", phone: "0814 112 3344", email: "blessing@farm.ng", perms: ["Feeding Records"], color: "bg-purple-100 text-purple-800" },
    { id: "4", name: "Adeleke Ojo", role: "Store Keeper", status: "Pending", phone: "0805 998 8776", email: "adeleke@farm.ng", perms: ["Feed Stock"], color: "bg-amber-100 text-amber-800" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Staff</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage team members with access to Feeding Records and Feed Stock.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
          <Mail size={13} /> Invite Staff
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">4</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Active</p>
          <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">3</p>
        </div>
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Invite</p>
          <p className="text-2xl font-bold text-amber-800 font-['Barlow_Condensed',sans-serif] mt-0.5">1</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {staffList.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-start gap-3 shadow-2xs">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${s.color}`}>
              {s.name.split(" ").map(w => w[0]).join("")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{s.role}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {s.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{s.phone} · {s.email}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {s.perms.map(p => (
                  <span key={p} className="text-[10px] font-medium bg-slate-50 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Staff</h2>
          <p className="text-[10px] text-slate-500">3 Active · 1 Pending</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Invite
        </button>
      </div>

      <div className="space-y-2">
        {staffList.slice(0, 3).map((s) => (
          <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${s.color}`}>
              {s.name.split(" ").map(w => w[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 text-xs truncate">{s.name}</p>
              <p className="text-[10px] text-slate-500">{s.role}</p>
            </div>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              Active
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 5. Daily Reports Preview */
function renderDailyReportsShowcase() {
  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Daily Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">Submit and review daily farm handover reports and security checklists.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
          <Plus size={13} /> Submit Daily Report
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <span className="px-3 py-1 text-slate-500">All</span>
        <span className="px-3 py-1 bg-white text-emerald-800 rounded-lg shadow-2xs font-bold">Daily (Checklists)</span>
        <span className="px-3 py-1 text-slate-500">Weekly</span>
        <span className="px-3 py-1 text-slate-500">Monthly</span>
      </div>

      {/* Daily Handover Report Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base font-['Barlow_Condensed',sans-serif]">
              Evening Handover & Pond Security Inspection
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Author: <strong>Emmanuel Okafor</strong> · Today, 6:15 PM</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
            <CheckCircle size={12} className="text-emerald-700" /> Verified by Admin
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Fed fish today?</p>
              <p className="text-slate-600 text-[11px]">Yes — Morning & evening sessions completed on all 8 ponds.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Locked all pond outlets/inlets?</p>
              <p className="text-slate-600 text-[11px]">Yes — Monk gates and drainage standpipes confirmed locked.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Pumping machines & electrical devices off?</p>
              <p className="text-slate-600 text-[11px]">Yes — Borehole pump switched off; generator isolated.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Equipment properly stored?</p>
              <p className="text-slate-600 text-[11px]">Yes — Scoop nets, buckets, and weighing scales stored in room.</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
          <strong>Additional Notes: </strong>
          <span>Pond 02 water is looking dark green. Recommend a 30% water flush tomorrow morning after breakfast.</span>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Daily Reports</h2>
          <p className="text-[10px] text-slate-500">Mandatory Handover Checklist</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Report
        </button>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-900 text-xs">Evening Handover</p>
            <p className="text-[10px] text-slate-500">Emmanuel Okafor · 6:15 PM</p>
          </div>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
            Verified
          </span>
        </div>

        <div className="space-y-1.5 text-[11px] text-slate-700">
          <p className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Fed fish morning & evening</p>
          <p className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Outlets & inlets locked</p>
          <p className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Pumps & generator switched off</p>
          <p className="flex items-center gap-1.5"><Check size={13} className="text-emerald-600" /> Equipment stored in tool room</p>
        </div>
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 6. Staff Assessment Preview */
function renderStaffAssessmentsShowcase() {
  const candidates = [
    { id: 1, name: "Chinedu Eze", email: "chinedu@farm.ng", phone: "0803 234 5678", score: 88, rec: "Strong Hire", color: "bg-emerald-100 text-emerald-800", date: "12 Sep 2026" },
    { id: 2, name: "Ibrahim Musa", email: "ibrahim@farm.ng", phone: "0802 876 5432", score: 74, rec: "Good Candidate", color: "bg-blue-100 text-blue-800", date: "10 Sep 2026" },
    { id: 3, name: "Blessing Adeyemi", email: "blessing@farm.ng", phone: "0814 112 3344", score: 52, rec: "Needs Training", color: "bg-amber-100 text-amber-800", date: "08 Sep 2026" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Staff Assessments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage assessment questions, distribute test links, and review candidate results.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <ClipboardList size={13} className="text-slate-500" /> Test Questions ▾
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <ExternalLink size={13} /> Copy Test Link ▾
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit text-xs font-semibold">
        <span className="px-3 py-1 text-slate-500">Compatibility Test</span>
        <span className="px-3 py-1 bg-white text-emerald-800 rounded-lg shadow-2xs font-bold">Knowledge Test</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-64">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input readOnly value="Search by name, email, phone..." className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500" />
          </div>
          <span className="text-xs text-slate-500">Showing 3 candidate results</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Candidate Name</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Overall Score</th>
                <th className="py-2.5 px-3">Recommendation</th>
                <th className="py-2.5 px-3">Date Taken</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.map((c, idx) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{c.email}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.phone}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-base font-['Barlow_Condensed',sans-serif] text-slate-900">{c.score}%</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.color}`}>
                      {c.rec}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{c.date}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button className="text-emerald-700 font-bold hover:text-emerald-800 text-xs">View Report →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Staff Assessments</h2>
          <p className="text-[10px] text-slate-500">Applicant Test Results</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          Copy Link
        </button>
      </div>

      <div className="space-y-2">
        {candidates.map((c) => (
          <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{c.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.color}`}>{c.rec}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Score: <strong className="text-slate-900">{c.score}%</strong></span>
              <span className="text-slate-400">{c.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 7. Financial Dashboard Preview */
function renderFinancialDashboardShowcase() {
  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Financial Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track fish sales, feed costs, overhead expenses, and farm net profit.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <Download size={13} /> Export CSV
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <Plus size={13} /> Add Expense
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <ArrowUpRight size={13} /> Add Revenue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦18,450,000</p>
          <p className="text-[10px] text-emerald-700 font-bold">+34% margin</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦12,180,000</p>
          <p className="text-[10px] text-slate-400">24 entries</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Net Profit</p>
          <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦6,270,000</p>
          <p className="text-[10px] text-emerald-700 font-bold">34% profit margin</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Feed Costs</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦8,400,000</p>
          <p className="text-[10px] text-slate-400">69% of expenses</p>
        </div>
      </div>

      {/* Cost vs Revenue Comparison Bar Graphic */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Cost vs Revenue (Monthly Breakdown)</p>
          <span className="text-[11px] text-slate-500 font-medium">Year 2026</span>
        </div>
        <div className="grid grid-cols-6 gap-2 pt-2 text-center text-xs">
          {[
            { m: "Apr", r: "₦2.8M", e: "₦1.9M", hR: "h-20", hE: "h-14" },
            { m: "May", r: "₦3.4M", e: "₦2.1M", hR: "h-24", hE: "h-16" },
            { m: "Jun", r: "₦2.9M", e: "₦2.0M", hR: "h-20", hE: "h-15" },
            { m: "Jul", r: "₦3.8M", e: "₦2.3M", hR: "h-28", hE: "h-18" },
            { m: "Aug", r: "₦4.1M", e: "₦2.5M", hR: "h-32", hE: "h-20" },
            { m: "Sep", r: "₦4.8M", e: "₦2.8M", hR: "h-36", hE: "h-22" },
          ].map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="flex items-end gap-1 h-36">
                <div className={`w-4 sm:w-6 bg-[#00bb58] rounded-t ${bar.hR}`} title={`Revenue: ${bar.r}`} />
                <div className={`w-4 sm:w-6 bg-slate-300 rounded-t ${bar.hE}`} title={`Expense: ${bar.e}`} />
              </div>
              <span className="text-[11px] font-bold text-slate-700">{bar.m}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#00bb58]" /> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-300" /> Expenses</span>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Financial Dashboard</h2>
          <p className="text-[10px] text-slate-500">Net Profit: ₦6,270,000</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Exp/Rev
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <p className="text-[9px] text-slate-400 uppercase font-bold">Revenue</p>
          <p className="text-sm font-bold text-slate-900">₦18.45M</p>
        </div>
        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
          <p className="text-[9px] text-emerald-700 uppercase font-bold">Net Profit</p>
          <p className="text-sm font-bold text-emerald-700">₦6.27M</p>
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
        <p className="text-[10px] font-bold uppercase text-slate-500">Expenses Breakdown</p>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between"><span>Feed (69%)</span><strong>₦8,400,000</strong></div>
          <div className="flex justify-between"><span>Labor (13%)</span><strong>₦1,550,000</strong></div>
          <div className="flex justify-between"><span>Fish Stock (10%)</span><strong>₦1,250,000</strong></div>
        </div>
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 8. Invoices Preview */
function renderInvoicesShowcase() {
  const invoices = [
    { id: 1, inv: "INV-0104", customer: "Alh. Danladi Fish Depot", pond: "Pond 02", weight: "1,450 kg", total: "₦4,350,000", status: "Paid", date: "12 Sep 2026" },
    { id: 2, inv: "INV-0105", customer: "Madam Grace Smoked Fish", pond: "Pond 04", weight: "620 kg", total: "₦1,860,000", status: "Paid", date: "11 Sep 2026" },
    { id: 3, inv: "INV-0106", customer: "Mama Nkechi Catering", pond: "Pond 01", weight: "350 kg", total: "₦980,000", status: "Partial", date: "09 Sep 2026" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Invoices</h1>
          <p className="text-xs text-slate-500 mt-0.5">Create invoices for fish buyers, print receipts, and manage outstanding balances.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-2xs">
            <Layers size={13} className="text-slate-500" /> Price Groups
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
            <Plus size={13} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">24</p>
          <p className="text-[10px] text-slate-400">generated</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Revenue Invoiced</p>
          <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦14,820,000</p>
          <p className="text-[10px] text-slate-400">total sales</p>
        </div>
        <div className="bg-emerald-50/70 border border-emerald-300 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Amount Collected</p>
          <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦13,420,000</p>
          <p className="text-[10px] text-emerald-700 font-medium">21 paid in full</p>
        </div>
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-2xl font-bold text-amber-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦1,400,000</p>
          <p className="text-[10px] text-amber-700 font-medium">pending collection</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-8">#</th>
                <th className="py-2.5 px-3">Invoice #</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Pond</th>
                <th className="py-2.5 px-3">Total Wt.</th>
                <th className="py-2.5 px-3">Grand Total</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv, idx) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{inv.inv}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900">{inv.customer}</td>
                  <td className="py-2.5 px-3 text-slate-600">{inv.pond}</td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">{inv.weight}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">{inv.total}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">{inv.date}</td>
                  <td className="py-2.5 px-3 text-right space-x-2">
                    <button className="text-emerald-700 font-bold hover:text-emerald-800">Print</button>
                    <button className="text-slate-600 hover:text-slate-900">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3 text-slate-800 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">Invoices</h2>
          <p className="text-[10px] text-slate-500">₦13.4M Collected · ₦1.4M Due</p>
        </div>
        <button className="px-2.5 py-1 rounded-lg bg-[#00bb58] text-white font-bold text-[11px]">
          + Invoice
        </button>
      </div>

      <div className="space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{inv.customer}</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {inv.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-mono text-emerald-700 font-bold">{inv.inv}</span>
              <span>{inv.weight}</span>
              <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-xs">{inv.total}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage({ onLogin, onSignup, onAdmin }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSolutionTab, setActiveSolutionTab] = useState<
    "ponds" | "feeding" | "inventory" | "staff" | "reports" | "assessments" | "financial" | "invoices"
  >("ponds");
  const [deviceMode, setDeviceMode] = useState<"dual" | "desktop" | "mobile">("dual");

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [planBilling, setPlanBilling] = useState<"monthly" | "yearly">("monthly");
  const [planType, setPlanType] = useState<"single" | "multi">("single");

  const { singleFarmPlans = [], multiFarmPlans = [] } = useDynamicPlans();
  const currentPlans = (planType === "single" ? singleFarmPlans : multiFarmPlans) || [];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  /* 8 Complete Features with Boiled-Down, Straightforward English Explanations */
  const solutions = [
    {
      id: "ponds" as const,
      navId: "ponds",
      title: "Pond Management",
      subtitle: "See all your ponds in one place. Know how many fish are inside, how many died, and when they were stocked.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Stop losing fish silently",
            desc: "Write down dead fish every day. If dirty water, low oxygen, or sickness enters your pond, you will notice immediately before more fish die."
          },
          {
            title: "Know your real fish count",
            desc: "Whenever you sort your fish into big and small, or move them to another pond, the app updates your count so you know the exact harvest quantity."
          },
          {
            title: "Works for all pond types",
            desc: "Manage concrete nursery tanks, big earthen ponds, and tarpaulin tanks on the same farm without any confusion."
          }
        ]
      },
      renderer: renderPondManagementShowcase,
    },
    {
      id: "feeding" as const,
      navId: "documentation",
      title: "Daily Feeding & Pallet Limits",
      subtitle: "Record morning and evening feeding in kg. Make sure workers do not waste expensive feed or feed the wrong size.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Stop feed theft and waste",
            desc: "Feed is 70% of your farm expenses. Recording morning and evening feeding stops attendants from stealing bags or overfeeding your fish."
          },
          {
            title: "Do not waste expensive small feed",
            desc: "Set the maximum kg of small feed (like 2mm or 3mm) for each pond. The app alerts you when it is time to move to bigger feed so you save money."
          },
          {
            title: "Count opened bags every evening",
            desc: "Compare the number of bags opened in your store with the exact kg thrown into the water. Zero missing bags."
          }
        ]
      },
      renderer: renderFeedingDocumentationShowcase,
    },
    {
      id: "inventory" as const,
      navId: "inventory",
      title: "Feed Stock Inventory Management",
      subtitle: "Keep an eye on your feed store. Know how many bags you bought, how many are remaining, and how much you paid.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Never run out of feed mid-cycle",
            desc: "See live bag counts for Coppens, Durante, Vital, and Aller Aqua. Know when your stock is low so you buy before prices go up in the market."
          },
          {
            title: "Automatic warehouse deduction",
            desc: "Once workers log feeding at the pond side, the app automatically deducts that feed from your warehouse. No bag goes missing."
          },
          {
            title: "Compare supplier prices",
            desc: "See which feed dealer gave you the best price per bag so you always buy from the cheapest genuine supplier."
          }
        ]
      },
      renderer: renderFeedStockInventoryShowcase,
    },
    {
      id: "staff" as const,
      navId: "staff",
      title: "Staff Management & Permissions",
      subtitle: "Add your farm workers to the app. Give each worker access to only the pages they need to do their work.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Workers help you enter farm records",
            desc: "Your feeding attendant can log daily feeding on their phone at the pond, while your storekeeper enters new feed bags."
          },
          {
            title: "Protect your farm secrets",
            desc: "Workers cannot see your farm profit, fish selling prices, or delete your data. They only see what you allow them to see."
          },
          {
            title: "Know who did the work",
            desc: "Every feeding record and report shows the name of the worker who entered it and the time, so no one can deny their mistake."
          }
        ]
      },
      renderer: renderStaffManagementShowcase,
    },
    {
      id: "reports" as const,
      navId: "reports",
      title: "Daily Handover Reports & Security",
      subtitle: "Workers must submit a checklist report before going home. Confirm ponds are locked and water pumps are switched off.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Daily closing checklist",
            desc: "Workers confirm on their phone before going home: Did you feed? Did you lock the water outlets? Did you turn off the generator and pumping machine?"
          },
          {
            title: "Prevent flooded ponds and fish escape",
            desc: "Forgetfulness causes fish to escape overnight. The mandatory checklist ensures monk gates and standpipes are locked tight."
          },
          {
            title: "Monitor your farm from anywhere",
            desc: "Even when you are traveling or in town, open your phone in the evening to see if your farm is safe and well looked after."
          }
        ]
      },
      renderer: renderDailyReportsShowcase,
    },
    {
      id: "assessments" as const,
      navId: "assessments",
      title: "Staff Knowledge & Honesty Assessment",
      subtitle: "Test farm workers before hiring them. Check if they truly understand catfish farming and if they will be honest and diligent.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Test their practical farming knowledge",
            desc: "Send a test link to job applicants. Pondtora asks 20 real farm questions on water quality, feeding, and fish diseases."
          },
          {
            title: "Check honesty and work attitude",
            desc: "Our farm compatibility test shows you whether the applicant is patient, truthful, and hardworking before you bring them to your farm."
          },
          {
            title: "Hire the right worker",
            desc: "Get instant test scores and clear hiring advice (Strong Hire, Good Candidate, or Do Not Hire) so you don't employ someone who kills your fish."
          }
        ]
      },
      renderer: renderStaffAssessmentsShowcase,
    },
    {
      id: "financial" as const,
      navId: "financial",
      title: "Financial Dashboard & Net Profit",
      subtitle: "See total fish sales, total farm expenses, and your take-home net profit. Know if your cycle made money or lost money.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Know your real take-home profit",
            desc: "No complex mathematics needed. Pondtora subtracts your feed, fingerlings, fuel, and wages from your fish sales to show your exact profit in Naira."
          },
          {
            title: "See where your money is going",
            desc: "Visual charts show what percentage of your money went into feed, fuel, electricity, and medications so you can reduce waste."
          },
          {
            title: "Print reports for partners and banks",
            desc: "Download neat PDF statements with one click to show your business partners or bank when applying for farm loans."
          }
        ]
      },
      renderer: renderFinancialDashboardShowcase,
    },
    {
      id: "invoices" as const,
      navId: "invoices",
      title: "Invoices & Customer Sales Receipts",
      subtitle: "Create invoices for fish buyers (mama put, market women, restaurants). Print receipts and track customers owing you money.",
      farmBenefit: {
        headline: "How This Helps Your Fish Farm:",
        points: [
          {
            title: "Fast invoicing on harvest day",
            desc: "Weigh your fish in groups (Big size, Melange, Small). The app calculates the total money instantly so buyers cannot cheat you."
          },
          {
            title: "Track customers owing you money",
            desc: "Never forget who bought fish on credit. The app lists unpaid balances and reminds you who to collect money from."
          },
          {
            title: "Print or WhatsApp receipts on the spot",
            desc: "Send clean professional receipts with your farm name and bank account details so buyers pay directly into your account."
          }
        ]
      },
      renderer: renderInvoicesShowcase,
    },
  ];

  const currentSolution = solutions.find(s => s.id === activeSolutionTab) || solutions[0];
  const { desktopContent, mobileContent } = currentSolution.renderer();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-['Barlow',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* ─── 1. NAVBAR ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-slate-950/95 backdrop-blur-md py-3 shadow-lg border-b border-slate-800" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src={pondtoraLogo} alt="Pondtora" className="h-9 w-auto object-contain shrink-0" />
            <span className="text-2xl font-black text-white font-['Barlow_Condensed',sans-serif] tracking-wider leading-none">
              Pondtora
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-7">
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-xs uppercase tracking-wider font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-xs uppercase tracking-wider font-bold text-white px-4 py-2 hover:text-emerald-400 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onSignup}
              className="px-5 py-2.5 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-95"
            >
              Start 30 Days Free Trial
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-6 py-6 space-y-4">
            {NAV_LINKS.map(link => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="block w-full text-left text-sm uppercase tracking-wider font-bold text-slate-300 hover:text-emerald-400"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <button
                onClick={() => { setMobileMenuOpen(false); onLogin(); }}
                className="w-full py-2.5 text-center text-xs uppercase tracking-wider font-bold text-white border border-slate-700 rounded-xl"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onSignup(); }}
                className="w-full py-2.5 text-center text-xs uppercase tracking-wider font-black bg-[#00bb58] text-white rounded-xl shadow-lg"
              >
                Start 30 Days Free Trial
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] lg:min-h-screen flex flex-col justify-between bg-slate-950 text-white overflow-hidden pt-28 sm:pt-36">
        <div className="absolute inset-0 z-0">
          <img
            src={heroFarmImg}
            alt="African Fish Farm"
            className="w-full h-full object-cover opacity-35 filter saturate-125 brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 my-auto text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs uppercase tracking-widest font-bold mb-6 backdrop-blur-md">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Tailored for African Catfish & Tilapia Farmers</span>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold font-['Barlow_Condensed',sans-serif] tracking-tight uppercase max-w-5xl mx-auto leading-[1.05] text-white">
              Stop Fish Mortality. <br />
              <span className="text-[#00bb58] underline decoration-emerald-500/30">Stop Feed Waste.</span> <br />
              Grow Your Farm Profit.
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
              Pondtora is the complete fish farm operating software for commercial and family farms. Track stocking dates, feed pallet limits, warehouse inventory, staff permissions, daily checklists, and customer receipts.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onSignup}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white font-bold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group"
              >
                <span>Start 30-Day Free Trial</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => scrollTo("solutions")}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider border border-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Monitor size={16} className="text-emerald-400" />
                <span>Explore App Showcase</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4">No credit card required. Works on computer and smartphone.</p>
          </FadeIn>
        </div>

        {/* Hero Bottom Stats Strip */}
        <div className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-black font-['Barlow_Condensed',sans-serif] text-emerald-400">70%+</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Feed Cost Control</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-['Barlow_Condensed',sans-serif] text-emerald-400">100%</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Offline Pond-Side Ready</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-['Barlow_Condensed',sans-serif] text-emerald-400">₦0 Waste</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Store Bag Reconciliation</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black font-['Barlow_Condensed',sans-serif] text-emerald-400">30 Days</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider mt-0.5">Free Unlimited Trial</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. CORE FARM PAIN POINTS WE SOLVE ────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ WHY NIGERIAN & AFRICAN FISH FARMS LOSE MONEY ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Designed specifically for where fish farms leak profits
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                Most fish farmers use paper notebooks or WhatsApp messages. Records get wet, workers make mistakes, and expensive feed disappears without accountability.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FadeIn delay={100}>
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl mb-6">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
                    Feed Stealing & Waste
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed">
                    Feed accounts for over 70% of total operational costs. Without daily bag counts and pallet limits, staff overfeed ponds, discard expensive starter pellets, or sell feed bags behind your back.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle size={15} /> Fixed by Pondtora Feeding Limits
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl mb-6">
                    <Droplets size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
                    Silent Fish Mortality & Escape
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed">
                    Staff forget to record dead fish, miss water quality distress signals, or fail to lock drainage monks at closing time, causing whole ponds of fingerlings or table-size fish to escape overnight.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle size={15} /> Fixed by Daily Handover Checklists
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl mb-6">
                    <Receipt size={24} />
                  </div>
                  <h3 className="text-xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
                    Harvest Shortages & Unpaid Debts
                  </h3>
                  <p className="text-slate-600 text-xs sm:text-sm mt-3 leading-relaxed">
                    On harvest day, fish buyers negotiate arbitrary lump-sums, mix up fish weight categories, or leave huge unpaid balances written on scrap paper that are never recovered.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle size={15} /> Fixed by Group Weighing & Invoices
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 4. COMPLETE PLATFORM SOLUTIONS & APP SHOWCASE ───────────────────── */}
      <section id="solutions" className="py-20 sm:py-28 bg-slate-100/70 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-10">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ COMPLETE PLATFORM SOLUTIONS & APP SHOWCASE ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight leading-tight">
                Every Tool Needed To Run Your Fish Farm Smoothly
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
                Click any feature below to see exactly how Pondtora looks and works on desktop computers and on mobile phones at the pond side.
              </p>
            </div>
          </FadeIn>

          {/* Solution Tabs Grid (8 Complete Features) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
            {solutions.map((sol, idx) => {
              const isSelected = activeSolutionTab === sol.id;
              return (
                <button
                  key={sol.id}
                  onClick={() => setActiveSolutionTab(sol.id)}
                  className={`p-3.5 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-[#062319] text-white border-[#062319] shadow-lg scale-[1.01]"
                      : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200"
                  }`}
                >
                  <p className={`text-[10px] uppercase tracking-wider font-extrabold ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                    Feature 0{idx + 1}
                  </p>
                  <p className="text-xs sm:text-sm font-bold mt-1 font-['Barlow_Condensed',sans-serif] leading-tight">
                    {sol.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Solution Headline & Plain English Explanation: "How This Helps Your Fish Farm" */}
          <div className="mb-8">
            <FadeIn key={`expl-${activeSolutionTab}`}>
              <div className="bg-white rounded-2xl p-6 sm:p-7 border-2 border-slate-200 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider mb-2">
                      <Sparkles size={13} className="text-emerald-700" />
                      {currentSolution.farmBenefit.headline}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black font-['Barlow_Condensed',sans-serif] text-slate-900">
                      {currentSolution.title}
                    </h3>
                    <p className="text-slate-700 text-sm sm:text-base mt-1.5 max-w-3xl font-medium leading-relaxed">
                      {currentSolution.subtitle}
                    </p>
                  </div>

                  {/* Device Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto shrink-0">
                    <button
                      onClick={() => setDeviceMode("dual")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        deviceMode === "dual" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Show Desktop & Mobile Phone Side-by-Side"
                    >
                      <Columns size={13} />
                      <span className="hidden sm:inline">Dual View (Desktop + Phone)</span>
                      <span className="sm:hidden">Dual</span>
                    </button>
                    <button
                      onClick={() => setDeviceMode("desktop")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        deviceMode === "desktop" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Desktop View"
                    >
                      <Monitor size={13} />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setDeviceMode("mobile")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        deviceMode === "mobile" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Mobile Phone View"
                    >
                      <Smartphone size={13} />
                      <span>Phone</span>
                    </button>
                  </div>
                </div>

                {/* 3 High-Contrast Benefit Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentSolution.farmBenefit.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-3.5 bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 shadow-2xs hover:border-emerald-400 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 leading-snug">{pt.title}</p>
                        <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">{pt.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Screen Display Area (Desktop, Mobile, or Dual Side-by-Side) */}
          <div className="mt-4">
            <FadeIn key={`${activeSolutionTab}-${deviceMode}`}>
              {deviceMode === "dual" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Desktop Frame (8 cols) */}
                  <div className="lg:col-span-8 w-full">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5"><Monitor size={14} className="text-emerald-600" /> Desktop Web View</span>
                      <span className="text-[11px] font-normal text-slate-500">Live Application UI</span>
                    </div>
                    <AppWindowShell
                      activeNav={currentSolution.navId}
                      onSelectNav={(id) => {
                        const match = solutions.find(s => s.navId === id);
                        if (match) setActiveSolutionTab(match.id);
                      }}
                    >
                      {desktopContent}
                    </AppWindowShell>
                  </div>

                  {/* Mobile Phone Mockup (4 cols) */}
                  <div className="lg:col-span-4 w-full">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5"><Smartphone size={14} className="text-emerald-600" /> Mobile App View</span>
                      <span className="text-[11px] font-normal text-emerald-700 font-bold">Pond-Side Ready</span>
                    </div>
                    <MobilePhoneShell
                      activeNav={currentSolution.navId}
                      onSelectNav={(id) => {
                        const match = solutions.find(s => s.navId === id);
                        if (match) setActiveSolutionTab(match.id);
                      }}
                    >
                      {mobileContent}
                    </MobilePhoneShell>
                  </div>
                </div>
              )}

              {deviceMode === "desktop" && (
                <div className="w-full">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                    <Monitor size={14} className="text-emerald-600" /> Desktop Web View
                  </div>
                  <AppWindowShell
                    activeNav={currentSolution.navId}
                    onSelectNav={(id) => {
                      const match = solutions.find(s => s.navId === id);
                      if (match) setActiveSolutionTab(match.id);
                    }}
                  >
                    {desktopContent}
                  </AppWindowShell>
                </div>
              )}

              {deviceMode === "mobile" && (
                <div className="w-full max-w-md mx-auto">
                  <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                    <Smartphone size={14} className="text-emerald-600" /> Mobile Smartphone View (Use At Pond-Side)
                  </div>
                  <MobilePhoneShell
                    activeNav={currentSolution.navId}
                    onSelectNav={(id) => {
                      const match = solutions.find(s => s.navId === id);
                      if (match) setActiveSolutionTab(match.id);
                    }}
                  >
                    {mobileContent}
                  </MobilePhoneShell>
                </div>
              )}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 5. PANORAMIC AFRICAN FISH FARM BANNER ─────────────────────────────── */}
      <section className="relative h-[400px] sm:h-[480px] flex items-center justify-center overflow-hidden">
        <img
          src={panoFarmImg}
          alt="Panoramic African Fish Farm Aerial View"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="relative z-10 text-center px-4 max-w-3xl text-white">
          <FadeIn>
            <span className="text-xs uppercase tracking-widest font-black text-emerald-400 block">
              Modern Aquaculture Systems
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-['Barlow_Condensed',sans-serif] mt-3">
              Built For Normal & Commercial Fish Cultivation
            </h2>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-['Barlow',sans-serif]">
              Engineered to support concrete nursery tanks, earthen production ponds, mobile tarpaulin vats, and fingerling grading systems.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── 6. POND TYPES & SYSTEMS ───────────────────────────────────────────── */}
      <section id="fields" className="py-20 sm:py-28 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-1">
                  [ POND TYPES & SYSTEMS ]
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                  Built For All Your Ponds & Systems
                </h2>
              </div>
              <p className="text-slate-500 text-sm max-w-md font-['Barlow',sans-serif]">
                Specialized tracking workflows designed for each stage of catfish and tilapia development across normal and commercial setups.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Field 1: Concrete Tanks */}
            <FadeIn delay={50}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={nurseryPondImg} alt="Concrete Nursery Tanks" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    01
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Concrete Nursery Tanks
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Grading, starter feeds (0.5mm - 2mm), daily mortality monitoring, and partial transfers into grow-out ponds.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Grading & Mortality Tracking
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Field 2: Earthen Grow-Out Ponds */}
            <FadeIn delay={100}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={panoFarmImg} alt="Earthen Grow-Out Ponds" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    02
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Earthen Grow-Out Ponds
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Biomass calculations, maximum feed kg limits per pallet size, and table-size harvesting management.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Biomass & Max Kg Limits
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Field 3: Tarpaulin & Mobile Ponds */}
            <FadeIn delay={150}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={heroFarmImg} alt="Tarpaulin & Mobile Ponds" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    03
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Tarpaulin & Mobile Ponds
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Urban setups, intensive backyard fish rearing, and mobile circular tanks with localized aeration tracking.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      High-Density Rearing
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Field 4: Fingerling Nursery & Grading Tanks */}
            <FadeIn delay={200}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={nurseryPondImg} alt="Fingerling Nursery & Grading Tanks" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    04
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Fingerling Nursery & Grading Tanks
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Multi-tank size sorting, cannibalism prevention, starter feed management, and batch transfer logs into grow-out ponds.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Batch Sorting & Transfers
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 7. TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ PROVEN RESULTS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Trusted by Commercial Aquaculture Producers
              </h2>
              <p className="text-slate-500 text-sm mt-3">
                See how commercial catfish and tilapia farms eliminated feed theft and scaled production with Pondtora.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FadeIn delay={100}>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 flex flex-col justify-between h-full">
                <div>
                  <div className="flex text-amber-400 gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm italic leading-relaxed">
                    "Before Pondtora, my attendants would open 10 bags of feed and record 7. The missing feed cost me over ₦1.8 million every harvest cycle. Now with opened bags reconciliation, zero bags go unaccounted for."
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                    KA
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">
                      Kunle Adebayo
                    </p>
                    <p className="text-[11px] text-slate-500">Owner, Oceanic Catfish Estate (18 Ponds)</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 flex flex-col justify-between h-full">
                <div>
                  <div className="flex text-amber-400 gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm italic leading-relaxed">
                    "The pallet size limit feature is pure genius. In the past, my farm boys kept feeding expensive 2mm Coppens to 400g fish because they were too lazy to open a new pallet size. Pondtora flags this immediately."
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">
                    FN
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">
                      Folake Nnamdi
                    </p>
                    <p className="text-[11px] text-slate-500">Managing Director, Green Valley Aquaculture</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={300}>
              <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200/80 flex flex-col justify-between h-full">
                <div>
                  <div className="flex text-amber-400 gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm italic leading-relaxed">
                    "The employee knowledge assessment saved us from hiring two attendants who claimed 5 years experience but didn't even know normal mortality thresholds. The candidate test filtered them out instantly."
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-sm">
                    TI
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">
                      Tariq Ibrahim
                    </p>
                    <p className="text-[11px] text-slate-500">Operations Manager, Niger Delta Fisheries</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 8. PRICING SECTION ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#f8fafc] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ TRANSPARENT INVESTMENT ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Simple Pricing for Farms of Any Size
              </h2>
              <p className="text-slate-500 text-sm mt-3">
                All plans include full platform access, staff accounts, opened bags reconciliation, and automated invoice receipts.
              </p>

              {/* Single / Multi Farm Toggle */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="bg-slate-200/80 p-1 rounded-xl inline-flex">
                  <button
                    onClick={() => setPlanType("single")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      planType === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Single Farm Plans
                  </button>
                  <button
                    onClick={() => setPlanType("multi")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      planType === "multi" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Multi-Farm / Commercial
                  </button>
                </div>

                <div className="bg-slate-200/80 p-1 rounded-xl inline-flex">
                  <button
                    onClick={() => setPlanBilling("monthly")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      planBilling === "monthly" ? "bg-[#062319] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setPlanBilling("yearly")}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      planBilling === "yearly" ? "bg-[#062319] text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Yearly</span>
                    <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-black">2 Months Free</span>
                  </button>
                </div>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {currentPlans.map((plan, i) => {
              const price = planBilling === "yearly" ? yearlyPrice(plan.price) : plan.price;
              const isPopular = plan.badge || i === 1;

              return (
                <FadeIn key={plan.name} delay={i * 100}>
                  <div
                    className={`h-full rounded-2xl p-8 flex flex-col justify-between transition-all ${
                      isPopular
                        ? "bg-[#062319] text-white shadow-2xl scale-[1.03] ring-2 ring-emerald-500 relative"
                        : "bg-white text-slate-900 border border-slate-200 shadow-sm hover:shadow-md"
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black shadow-md flex items-center gap-1">
                        <Crown size={12} /> Most Popular For Commercial Farms
                      </div>
                    )}

                    <div>
                      <h3 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif]">{plan.name}</h3>
                      <p className={`text-xs mt-1 ${isPopular ? "text-slate-300" : "text-slate-500"}`}>{plan.desc}</p>

                      <div className="my-6">
                        <span className="text-4xl font-extrabold font-['Barlow_Condensed',sans-serif]">
                          ₦{price.toLocaleString()}
                        </span>
                        <span className={`text-xs ml-1 ${isPopular ? "text-slate-400" : "text-slate-500"}`}>
                          /{planBilling === "yearly" ? "year" : "month"}
                        </span>
                      </div>

                      <div className={`space-y-3 pt-6 border-t ${isPopular ? "border-slate-800" : "border-slate-100"}`}>
                        <p className={`text-[11px] uppercase tracking-wider font-extrabold ${isPopular ? "text-emerald-400" : "text-slate-400"}`}>
                          Included Features:
                        </p>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs">
                            <Check
                              size={15}
                              className={`shrink-0 mt-0.5 ${isPopular ? "text-emerald-400" : "text-emerald-600"}`}
                            />
                            <span className={isPopular ? "text-slate-200" : "text-slate-700"}>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-6">
                      <button
                        onClick={onSignup}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                          isPopular
                            ? "bg-[#00bb58] hover:bg-[#00a84e] text-white shadow-lg shadow-emerald-500/30"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        Start 30-Day Free Trial
                      </button>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <div className="mt-12 text-center text-xs text-slate-500">
            Need a custom enterprise deployment for government aquaculture programs or cooperative federations?{" "}
            <span className="text-emerald-700 font-bold underline cursor-pointer">Contact our enterprise team</span>
          </div>
        </div>
      </section>

      {/* ─── 9. FAQ SECTION ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ FREQUENTLY ASKED QUESTIONS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Everything You Need To Know
              </h2>
            </div>
          </FadeIn>

          <div className="space-y-4">
            {[
              {
                q: "Can I use Pondtora if I don't have constant internet on the farm?",
                a: "Yes! Pondtora is designed for rural and semi-urban aquaculture setups. You can enter feeding records, mortality logs, and daily handover checklists offline right by the pond side. Once your phone detects internet or WiFi, all entries automatically sync to the cloud."
              },
              {
                q: "How does the feed pallet limit prevent feed waste?",
                a: "When stocking a pond, you configure the maximum kg of each feed size (e.g. 150 kg of 2mm Coppens) that the fish should consume before graduating to the next size. When your attendants approach or cross this threshold, Pondtora triggers clear alert banners to stop small-feed overfeeding."
              },
              {
                q: "Can my attendants see our farm profit and fish selling prices?",
                a: "No. Pondtora gives you strict role-based access control. You can assign attendants permission to only log feeding or only view specific nursery ponds. They will never see financial dashboard numbers, expenses, or buyer invoice totals."
              },
              {
                q: "How does the candidate assessment test work?",
                a: "From the Staff Assessment tab, you generate a 6-hour expiring link and send it via WhatsApp or SMS to job candidates. Candidates answer 20 practical aquaculture and compatibility questions. You receive an automatic score breakdown and hiring recommendation before interviewing them."
              },
              {
                q: "What happens after the 30-day free trial?",
                a: "You can use all features free for 30 days without any credit card. At the end of the trial, you choose the subscription plan that fits your pond count. Your farm records, pond history, and staff accounts remain completely safe and intact."
              },
            ].map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <FadeIn key={i} delay={i * 50}>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full text-left px-6 py-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base font-['Barlow_Condensed',sans-serif] transition-colors"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        size={18}
                        className={`text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-6 py-4 bg-white text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200">
                        {faq.a}
                      </div>
                    )}
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 10. FINAL CALL TO ACTION ────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#062319] text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20">
          <img src={nurseryPondImg} alt="Fish Farm" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-emerald-950/80" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <span className="text-xs uppercase tracking-widest font-black text-emerald-400 block mb-3">
              TRANSFORM YOUR AQUACULTURE OPERATIONS
            </span>
            <h2 className="text-4xl sm:text-6xl font-bold font-['Barlow_Condensed',sans-serif] tracking-tight uppercase">
              Ready to eliminate feed waste and secure your farm profits?
            </h2>
            <p className="mt-4 text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-light">
              Join commercial fish farmers who rely on Pondtora every single day. Start your 30-day free trial right now.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onSignup}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white font-bold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
              >
                Start 30-Day Free Trial
              </button>
              <button
                onClick={onLogin}
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-sm uppercase tracking-wider border border-slate-700"
              >
                Sign In To Existing Account
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-4">30 days unlimited access · Zero risk · Cancel anytime</p>
          </FadeIn>
        </div>
      </section>

      {/* ─── 11. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src={pondtoraLogo} alt="Pondtora" className="h-8 w-auto object-contain" />
                <span className="text-xl font-bold text-white font-['Barlow_Condensed',sans-serif]">Pondtora</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                The modern aquaculture operating software for catfish and tilapia producers across Africa.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Farm Operations</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => { setActiveSolutionTab("ponds"); scrollTo("solutions"); }} className="hover:text-white">Pond Management</button></li>
                <li><button onClick={() => { setActiveSolutionTab("feeding"); scrollTo("solutions"); }} className="hover:text-white">Feeding Documentation</button></li>
                <li><button onClick={() => { setActiveSolutionTab("financial"); scrollTo("solutions"); }} className="hover:text-white">Financial Dashboard</button></li>
                <li><button onClick={() => { setActiveSolutionTab("invoices"); scrollTo("solutions"); }} className="hover:text-white">Harvest Invoicing</button></li>
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Staff & Security</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => { setActiveSolutionTab("inventory"); scrollTo("solutions"); }} className="hover:text-white">Feed Stock Inventory</button></li>
                <li><button onClick={() => { setActiveSolutionTab("staff"); scrollTo("solutions"); }} className="hover:text-white">Staff Management</button></li>
                <li><button onClick={() => { setActiveSolutionTab("reports"); scrollTo("solutions"); }} className="hover:text-white">Daily Operational Reports</button></li>
                <li><button onClick={() => { setActiveSolutionTab("assessments"); scrollTo("solutions"); }} className="hover:text-white">Staff Assessments</button></li>
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">System & Ponds</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => scrollTo("fields")} className="hover:text-white">Pond Types & Systems</button></li>
                <li><button onClick={() => scrollTo("testimonials")} className="hover:text-white">Farmer Stories</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-white">Pricing & Plans</button></li>
                <li><button onClick={() => scrollTo("faq")} className="hover:text-white">FAQ</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 Pondtora. All rights reserved. Built for African Aquaculture.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-200 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-200 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-200 cursor-pointer">Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
