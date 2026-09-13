import React, { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowRight, Star, CheckCircle, ChevronDown, Fish,
  Droplets, Package, BookOpen, Receipt, LayoutDashboard, TrendingUp,
  Users, ShieldCheck, Waves, Sparkles, ExternalLink, Calendar, Plus,
  Clock, Activity, AlertTriangle, ArrowUpRight, Check, ChevronRight,
  TrendingDown, Search, Filter, RefreshCw, Eye, Printer, Download,
  FileText, ClipboardList, Crown, Settings, MoreVertical, ArrowDownRight,
  Layers, Calculator, Pencil, Trash2, History, AlertCircle
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
   FULL APPLICATION UI SHOWCASE PREVIEWS
   Realistic, complete views of Pondtora with full topbars, sidebars,
   farm dropdowns, live charts, data tables, and badges.
   ═══════════════════════════════════════════════════════════════════════════ */

interface AppShowcaseChromeProps {
  activeNav: string;
  activeFarmName?: string;
  children: React.ReactNode;
}

function AppWindowShell({ activeNav, activeFarmName = "Crown Fisheries", children }: AppShowcaseChromeProps) {
  const navItems = [
    { id: "financial", label: "Financial Dashboard", icon: LayoutDashboard },
    { id: "ponds", label: "Pond Management", icon: Droplets },
    { id: "inventory", label: "Feed Stock", icon: Package },
    { id: "documentation", label: "Feeding Records", icon: BookOpen },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "staff", label: "Staff", icon: Users },
    { id: "assessments", label: "Staff Assessments", icon: ClipboardList },
    { id: "pricing", label: "Subscription", icon: Crown },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900 text-slate-100 font-['Barlow',sans-serif]">
      {/* Window Title Bar */}
      <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-slate-500 text-[11px] font-mono hidden sm:inline">app.pondtora.com</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#00bb58] animate-pulse" />
          <span className="font-semibold text-[#00bb58]">Live System Online</span>
        </div>
      </div>

      {/* Main App Frame */}
      <div className="flex min-h-[500px] md:min-h-[560px] bg-[#f5f7fa] text-slate-800">
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
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = item.id === activeNav;
              const isDivider = item.id === "pricing";
              return (
                <React.Fragment key={item.id}>
                  {isDivider && <div className="mx-2 my-2 border-t border-slate-800" />}
                  <div
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-default ${
                      isActive
                        ? "bg-[#00bb58] text-white shadow-md shadow-[#00bb58]/20 font-bold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </React.Fragment>
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
              <p className="text-slate-400 text-[10px] capitalize">Farm Owner</p>
            </div>
          </div>
        </div>

        {/* Center / Right Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f5f7fa]">
          {/* Topbar */}
          <div className="h-12 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">Crown Fisheries</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 text-xs">Epe Farm, Lagos</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                <Calendar size={12} className="text-slate-400" /> Today, 13 Sep 2026
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
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

/* 1. Pond Management Preview (Exact App Layout) */
function PondManagementFullPreview() {
  return (
    <AppWindowShell activeNav="ponds">
      <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
        {/* Sticky Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Pond Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">View and manage all ponds — stock details, feeding history, and operational costs.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              <History size={12} /> Fish Stock History
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
              <Plus size={12} /> Add Pond
            </span>
          </div>
        </div>

        {/* 3 Top StatCards (Exact App Components) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ponds</p>
              <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Droplets size={18} />
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">6</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Fish</p>
              <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">48,250</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Fish size={18} />
            </div>
          </div>
        </div>

        {/* Search and Filters Strip */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <span className="inline-block pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-400 w-36">
              Search…
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Status:</span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold">Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">Type:</span>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold">All</span>
          </div>
        </div>

        {/* List of Ponds Card (Exact App Table) */}
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">List of Ponds</p>
            <p className="text-[11px] text-slate-400 mt-0.5">After creating a pond, open it to add Fish Stock, manage feeding records, transfer fish, and view all activities related to that pond.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5 w-8">#</th>
                  <th className="px-3.5 py-2.5">Pond Name</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Species</th>
                  <th className="px-3.5 py-2.5">Fish Count</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">1</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 01</p>
                    <p className="text-[10px] text-slate-400">800 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Concrete</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">8,500</p>
                    <p className="text-[10px] text-slate-400">Mort: 0.6%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Nursery</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">2</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 02</p>
                    <p className="text-[10px] text-slate-400">1,500 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Earthen</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">14,200</p>
                    <p className="text-[10px] text-slate-400">Mort: 0.8%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Production</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">3</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 03</p>
                    <p className="text-[10px] text-slate-400">600 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Tarpaulin</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">4,200</p>
                    <p className="text-[10px] text-slate-400">Mort: 0.5%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Production</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">4</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 04</p>
                    <p className="text-[10px] text-slate-400">1,200 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Earthen</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Tilapia</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">9,600</p>
                    <p className="text-[10px] text-slate-400">Mort: 1.1%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Production</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">5</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 05</p>
                    <p className="text-[10px] text-slate-400">800 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Concrete</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">7,100</p>
                    <p className="text-[10px] text-slate-400">Mort: 0.4%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Nursery</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">6</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer">Pond 06</p>
                    <p className="text-[10px] text-slate-400">1,800 ft²</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600 font-medium">Earthen</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">4,650</p>
                    <p className="text-[10px] text-slate-400">Mort: 0.9%</p>
                  </td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Production</span></td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#00bb58] hover:underline cursor-pointer"><Eye size={12} /> View</span>
                      <span className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><Pencil size={12} /></span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 border-t border-slate-50 bg-slate-50/50">
            <p className="text-[11px] text-slate-400"><span className="font-semibold text-slate-600">Tip:</span> Open any pond to add Fish Stock, manage feeding records, and view the Fish Stock currently assigned to that pond.</p>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 2. Feeding Records & Pallet Limits Preview (Exact App Layout) */
function FeedingDocumentationFullPreview() {
  return (
    <AppWindowShell activeNav="documentation">
      <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
        {/* Sticky Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Feeding Records</h1>
            <p className="text-xs text-slate-400 mt-0.5">Record and review daily feeding sessions across all active ponds.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              <Calendar size={12} className="text-[#00bb58]" /> 13 Sep 2026
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
              <Plus size={12} /> Log Feeding
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              <Package size={12} /> Log Opened Bags
            </span>
          </div>
        </div>

        {/* Pallet Limit Alert Notice Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-amber-800">
          <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">!</div>
          <div className="flex-1">
            <p className="font-bold text-amber-900">Pallet Limit Warning: Pond 03 (Tarpaulin Vat) at 88%</p>
            <p className="text-amber-700 mt-0.5">Pond 03 has consumed 440 kg of its 500 kg 2.0mm maximum feed limit. Prepare to grade and step up to 3.0mm pallet.</p>
          </div>
        </div>

        {/* 4 StatCards matching FeedDocumentationPage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ponds</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8 <span className="text-[10px] text-slate-400 font-normal">active</span></p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ponds Fed</p>
            <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">6 <span className="text-[10px] text-emerald-600 font-normal">today</span></p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ponds Remaining</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">2 <span className="text-[10px] text-slate-400 font-normal">pending</span></p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bags Opened</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">3 <span className="text-[10px] text-slate-400 font-normal">45 kg</span></p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-fit text-xs font-semibold">
          <span className="px-3 py-1.5 bg-white text-emerald-800 rounded-lg shadow-xs font-bold">Daily Feed</span>
          <span className="px-3 py-1.5 text-slate-600 cursor-pointer">Opened Bags (3)</span>
          <span className="px-3 py-1.5 text-slate-600 cursor-pointer">Reconciliation</span>
        </div>

        {/* Table of Daily Feeding */}
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5">Pond</th>
                  <th className="px-3.5 py-2.5">Fish Stock</th>
                  <th className="px-3.5 py-2.5">Brand & Size</th>
                  <th className="px-3.5 py-2.5 text-right">Morning</th>
                  <th className="px-3.5 py-2.5 text-right">Evening</th>
                  <th className="px-3.5 py-2.5 text-right">Total Feed</th>
                  <th className="px-3.5 py-2.5">Recorded By</th>
                  <th className="px-3.5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 01</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish (12 Aug)</td>
                  <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Coppens</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">1.2mm</span></td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">4.0 kg</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">4.5 kg</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">8.5 kg</td>
                  <td className="px-3.5 py-2.5 text-slate-500">Sola Bello</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logged</span></td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 02</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish (15 May)</td>
                  <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Vital Feed</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">3.0mm</span></td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">8.0 kg</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">8.0 kg</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">16.0 kg</td>
                  <td className="px-3.5 py-2.5 text-slate-500">Ibrahim Musa</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logged</span></td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 03</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Catfish (01 Jul)</td>
                  <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Durante</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">2.0mm</span></td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">3.5 kg</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">3.5 kg</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">7.0 kg</td>
                  <td className="px-3.5 py-2.5 text-slate-500">Emeka Eze</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Near Limit</span></td>
                </tr>
                <tr className="hover:bg-slate-50/80">
                  <td className="px-3.5 py-2.5 font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 04</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Tilapia (20 Jun)</td>
                  <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Aller Aqua</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">2.0mm</span></td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">5.5 kg</td>
                  <td className="px-3.5 py-2.5 text-right text-slate-600 font-medium">5.5 kg</td>
                  <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">11.0 kg</td>
                  <td className="px-3.5 py-2.5 text-slate-500">Ibrahim Musa</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logged</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 3. Financial Dashboard Preview (Exact App Layout) */
function FinancialDashboardFullPreview() {
  return (
    <AppWindowShell activeNav="financial">
      <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
        {/* Sticky Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Financial Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Track revenue, expenses, and profitability across all farm operations.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              <Download size={12} /> Export CSV
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              <FileText size={12} /> PDF
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
              <Plus size={12} /> Add Expense
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
              <ArrowUpRight size={12} /> Add Revenue
            </span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-slate-400 font-bold uppercase text-[10px]">Year:</span>
          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold">2026</span>
          <span className="text-slate-400 font-bold uppercase text-[10px] ml-2">Month:</span>
          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold">All Months</span>
          <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-600 font-medium ml-2">Custom Range</span>
        </div>

        {/* 4 StatCards Row 1 (Exact App Dashboard Metrics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <ArrowUpRight size={14} className="text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦14,850,000</p>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">24 entries · 61% margin</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
              <ArrowDownRight size={14} className="text-rose-500" />
            </div>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦5,720,000</p>
            <p className="text-[10px] text-slate-400 mt-0.5">48 entries</p>
          </div>
          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Net Profit</p>
              <TrendingUp size={14} className="text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-1">₦9,130,000</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">61% margin</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Feed Costs</p>
              <Layers size={14} className="text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦3,850,000</p>
            <p className="text-[10px] text-slate-400 mt-0.5">67% of total expenses</p>
          </div>
        </div>

        {/* Cost vs Revenue Chart & Expense Breakdown (App Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Cost vs Revenue</p>
              <span className="text-[11px] text-slate-400">Year 2026</span>
            </div>
            <div className="h-32 flex items-end gap-3 pt-3 border-b border-slate-100 px-2">
              {[
                { m: "Jan", rev: 35, exp: 20 },
                { m: "Feb", rev: 42, exp: 25 },
                { m: "Mar", rev: 55, exp: 30 },
                { m: "Apr", rev: 68, exp: 35 },
                { m: "May", rev: 72, exp: 38 },
                { m: "Jun", rev: 80, exp: 40 },
                { m: "Jul", rev: 92, exp: 45 },
                { m: "Aug", rev: 95, exp: 48 },
                { m: "Sep", rev: 100, exp: 50 },
              ].map((bar, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1 h-full">
                    <div className="w-1/2 bg-[#00bb58] rounded-t-sm" style={{ height: `${bar.rev}%` }} />
                    <div className="w-1/2 bg-[#f43f5e] rounded-t-sm" style={{ height: `${bar.exp}%` }} />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400">{bar.m}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-[11px]">
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-[#00bb58]" /> Revenue</span>
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" /> Expenses</span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Expense Breakdown</p>
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Feed</span><span className="font-bold text-slate-800">67.3% · ₦3.85M</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-[#00bb58] h-full" style={{ width: "67.3%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Fuel & Pumping</span><span className="font-bold text-slate-800">14.2% · ₦810K</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{ width: "14.2%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Fingerlings / Stock</span><span className="font-bold text-slate-800">11.0% · ₦630K</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: "11%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Medication</span><span className="font-bold text-slate-800">4.5% · ₦260K</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-lime-500 h-full" style={{ width: "4.5%" }} /></div>
              </div>
              <div>
                <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Labor & Attendants</span><span className="font-bold text-slate-800">3.0% · ₦170K</span></div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-slate-400 h-full" style={{ width: "3%" }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 4. Customer Invoices Preview (Exact App Layout) */
function InvoicesFullPreview() {
  return (
    <AppWindowShell activeNav="invoices">
      <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
        {/* Sticky Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Customer Invoices</h1>
            <p className="text-xs text-slate-400 mt-0.5">Create invoices, track fish sales payments, and manage buyer balances.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs">
              <Plus size={12} /> Create Invoice
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs">
              Price Groups
            </span>
          </div>
        </div>

        {/* 4 StatCards matching InvoicesPage */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoices</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">18</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Revenue Invoiced</p>
            <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦14,850,000</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Amount Collected</p>
            <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦12,900,000</p>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding</p>
            <p className="text-xl font-bold text-rose-600 font-['Barlow_Condensed',sans-serif] mt-0.5">₦1,950,000</p>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">All Invoices</p>
            <span className="text-[11px] text-slate-400">18 invoices</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-2.5 w-8">#</th>
                  <th className="px-3.5 py-2.5">Invoice #</th>
                  <th className="px-3.5 py-2.5">Customer</th>
                  <th className="px-3.5 py-2.5">Pond</th>
                  <th className="px-3.5 py-2.5">Fish Groups</th>
                  <th className="px-3.5 py-2.5">Total Wt.</th>
                  <th className="px-3.5 py-2.5">Grand Total</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">1</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-[#00bb58] cursor-pointer hover:underline">INV-2026-084</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900">Bodija Fresh Fish Market</p>
                    <p className="text-[10px] text-slate-400">Ibadan, Oyo State</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600">Pond 02</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Large Catfish (1kg+)</td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-800">740 kg</td>
                  <td className="px-3.5 py-2.5 font-bold font-['Barlow_Condensed',sans-serif] text-sm text-slate-900">₦1,850,000</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Paid</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1 text-slate-400">
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Eye size={12} /></span>
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Printer size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">2</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-[#00bb58] cursor-pointer hover:underline">INV-2026-083</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900">Alaba Fish Wholesalers Ltd</p>
                    <p className="text-[10px] text-slate-400">Lagos State</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600">Pond 04</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Table Size Catfish</td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-800">1,280 kg</td>
                  <td className="px-3.5 py-2.5 font-bold font-['Barlow_Condensed',sans-serif] text-sm text-slate-900">₦3,200,000</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Paid</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1 text-slate-400">
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Eye size={12} /></span>
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Printer size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">3</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-[#00bb58] cursor-pointer hover:underline">INV-2026-082</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900">Mama Grace Fish Depot</p>
                    <p className="text-[10px] text-slate-400">Warri, Delta State</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600">Pond 03</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Medium Melange</td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-800">420 kg</td>
                  <td className="px-3.5 py-2.5 font-bold font-['Barlow_Condensed',sans-serif] text-sm text-slate-900">₦950,000</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1 text-slate-400">
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Eye size={12} /></span>
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Printer size={12} /></span>
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-3.5 py-2.5 text-slate-400 font-mono">4</td>
                  <td className="px-3.5 py-2.5 font-mono font-bold text-[#00bb58] cursor-pointer hover:underline">INV-2026-081</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-bold text-slate-900">Epe Waterfront Coldroom</p>
                    <p className="text-[10px] text-slate-400">Lagos State</p>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600">Pond 02</td>
                  <td className="px-3.5 py-2.5 text-slate-600">Premium Catfish</td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-800">960 kg</td>
                  <td className="px-3.5 py-2.5 font-bold font-['Barlow_Condensed',sans-serif] text-sm text-slate-900">₦2,400,000</td>
                  <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Paid</span></td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1 text-slate-400">
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Eye size={12} /></span>
                      <span className="p-1 hover:text-slate-600 cursor-pointer"><Printer size={12} /></span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage({ onLogin, onSignup, onAdmin }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSolutionTab, setActiveSolutionTab] = useState<"ponds" | "feeding" | "financial" | "invoices">("ponds");
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

  const solutions = [
    {
      id: "ponds" as const,
      title: "Pond & Fish Stock Lifecycle Management",
      subtitle: "Track stocking dates, fish count, species, daily mortality, pallet limits, and pond transfers — built for concrete, earthen, and tarpaulin setups.",
      component: <PondManagementFullPreview />,
    },
    {
      id: "feeding" as const,
      title: "Daily Feeding Documentation & Pallet Limits",
      subtitle: "Log morning and evening feeds, monitor pallet sizes (2mm to 9mm), track opened bags against inventory, and enforce maximum kg limits per pond.",
      component: <FeedingDocumentationFullPreview />,
    },
    {
      id: "financial" as const,
      title: "Farm Financials & Profit Analytics",
      subtitle: "Track feed purchases, pumping fuel, labor, and medication costs against fish sales revenue with live ROI and gross profit calculations.",
      component: <FinancialDashboardFullPreview />,
    },
    {
      id: "invoices" as const,
      title: "Customer Invoicing & Sales Receipts",
      subtitle: "Issue branded fish sales invoices, configure customer price groups (kg or pieces), track partial payments, and generate printable receipts.",
      component: <InvoicesFullPreview />,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-['Barlow',sans-serif] selection:bg-emerald-500 selection:text-white">
      {/* ─── 1. NAVBAR ────────────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-slate-950/95 backdrop-blur-md py-3 shadow-lg border-b border-slate-800" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <img src={pondtoraLogo} alt="Pondtora" className="h-9 w-auto object-contain shrink-0" />
            <span className="text-2xl font-black text-white font-['Barlow_Condensed',sans-serif] tracking-wider leading-none">
              Pondtora
            </span>
          </div>

          {/* Desktop Navigation Links */}
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

          {/* Auth Action Buttons */}
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

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
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
        {/* Background Image of Clean Nigerian Fish Farm with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroFarmImg}
            alt="Commercial African Fish Farm"
            className="w-full h-full object-cover object-center opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062319] via-[#062319]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#062319] via-[#062319]/80 to-transparent" />
        </div>

        {/* Hero Content Area */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full my-auto py-12">
          <div className="max-w-3xl space-y-6">
            <FadeIn delay={100}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs uppercase tracking-widest font-bold">
                <Sparkles size={13} />
                <span>#1 Fish Farm Management System in Nigeria</span>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-['Barlow_Condensed',sans-serif] leading-[0.95] tracking-tight text-white">
                Stop Managing Your Fish Farm <br />
                On <span className="font-['Barlow_Condensed',sans-serif] text-emerald-400 font-bold">Exercise Books & WhatsApp</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-base sm:text-xl text-slate-200/90 font-normal leading-relaxed max-w-2xl font-['Barlow',sans-serif]">
                Pondtora replaces lost paper notebooks, messy records, and chaotic WhatsApp chats with one complete system built for Nigerian fish farmers — normal family farms and commercial operations alike. Track daily morning & evening feedings, enforce feed pallet limits, monitor pond stock & mortality, and bill buyers right from your phone.
              </p>
            </FadeIn>

            <FadeIn delay={400}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onSignup}
                  className="px-8 py-3.5 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95"
                >
                  Start 30 Days Free Trial
                </button>
                <button
                  onClick={() => scrollTo("solutions")}
                  className="px-7 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold uppercase tracking-wider border border-white/20 backdrop-blur-xs transition-all"
                >
                  Explore System
                </button>
              </div>
            </FadeIn>

            {/* Social proof floating pill */}
            <FadeIn delay={500}>
              <div className="pt-4 flex items-center gap-3 text-xs text-slate-300">
                <div className="flex -space-x-2">
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                </div>
                <span>Trusted by <strong>20+</strong> fish farms across Nigeria</span>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Hero Bottom Dark Stats Strip */}
        <div className="relative z-10 bg-[#062319] border-t border-emerald-950/80 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">20+ Farms</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Active Fish Farms</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">150+ Ponds</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Ponds Monitored</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">85K+ Fish</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Fish Tracked Daily</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">99.2%</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Record Accuracy</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. FISH FARM MANAGEMENT SYSTEM STATEMENT BANNER ───────────────────── */}
      <section className="py-16 sm:py-24 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-widest font-black text-emerald-700 mb-3">
              [ FISH FARM MANAGEMENT SYSTEM ]
            </p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-['Barlow_Condensed',sans-serif] leading-tight text-slate-900">
              Built For Normal, Medium, And Commercial Fish Farms — Pondtora Gives You Complete Control Over Daily Feeding, Feed Stock, Mortality, Expenses, And Customer Invoices.
            </h2>
          </FadeIn>
        </div>
      </section>

      {/* ─── 4. CORE SOLUTIONS & FULL APP SHOWCASE ───────────────────────────── */}
      <section id="solutions" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-12 sm:mb-16">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ OUR PLATFORM SOLUTIONS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight leading-tight">
                Transforming Fish Farm Management, One Feature At A Time
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                Everything you need to run your fish farm smoothly. Track ponds, enforce pallet max kg limits, balance daily feed logs, and bill buyers — built for normal and commercial farms.
              </p>
            </div>
          </FadeIn>

          {/* Tab Selection Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
            {solutions.map(sol => {
              const isSelected = activeSolutionTab === sol.id;
              return (
                <button
                  key={sol.id}
                  onClick={() => setActiveSolutionTab(sol.id)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    isSelected
                      ? "bg-[#062319] text-white border-[#062319] shadow-lg scale-[1.01]"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <p className={`text-xs uppercase tracking-wider font-extrabold ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
                    Solution {solutions.indexOf(sol) + 1}
                  </p>
                  <p className="text-sm font-bold mt-1 font-['Barlow_Condensed',sans-serif] leading-tight">
                    {sol.title}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Solution Full Page Application Screen Showcase */}
          <div className="mt-6">
            <FadeIn key={activeSolutionTab}>
              <div className="mb-4">
                <p className="text-slate-600 text-sm max-w-2xl">
                  {solutions.find(s => s.id === activeSolutionTab)?.subtitle}
                </p>
              </div>
              {solutions.find(s => s.id === activeSolutionTab)?.component}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 5. FULL-WIDTH PANORAMIC AFRICAN FISH FARM BANNER ─────────────────── */}
      <section className="relative h-[400px] sm:h-[480px] flex items-center justify-center overflow-hidden">
        <img
          src={panoFarmImg}
          alt="Panoramic African Fish Farm Aerial View"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#062319]/90 via-[#062319]/60 to-[#062319]/90" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white space-y-4">
          <FadeIn>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest border border-emerald-400/30">
              Modern Farm Infrastructure
            </span>
            <h2 className="text-3xl sm:text-5xl font-black font-['Barlow_Condensed',sans-serif] mt-3">
              Built For Normal & Commercial Fish Cultivation
            </h2>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed font-['Barlow',sans-serif]">
              Engineered to support concrete nursery tanks, earthen production ponds, mobile tarpaulin vats, and flow-through systems.
            </p>
            <div className="pt-2">
              <button
                onClick={() => scrollTo("fields")}
                className="px-6 py-2.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-xs font-black uppercase tracking-wider transition-all"
              >
                See All Pond Types →
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── 6. SEE ALL OUR POND TYPES ───────────────────────────────────────── */}
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
            {/* Field 1 */}
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
                  <span className="text-xs font-bold text-emerald-700 mt-4 inline-flex items-center gap-1">
                    Grading & Mortality Tracking →
                  </span>
                </div>
              </div>
            </FadeIn>

            {/* Field 2 */}
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
                  <span className="text-xs font-bold text-emerald-700 mt-4 inline-flex items-center gap-1">
                    Biomass & Max Kg Limits →
                  </span>
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
                      Designed for backyard and urban fish farming. Track water aeration, feeding schedules, and multi-vat inventory.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 mt-4 inline-flex items-center gap-1">
                    Vat Inventory Tracking →
                  </span>
                </div>
              </div>
            </FadeIn>

            {/* Field 4 */}
            <FadeIn delay={200}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={nurseryPondImg} alt="Flow-Through Systems" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    04
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Flow-Through & Recirculating
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Water exchange schedules, treatment and medication logging, and continuous water circulation tracking.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 mt-4 inline-flex items-center gap-1">
                    Water Exchange Tracking →
                  </span>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>



      {/* ─── 8. TESTIMONIALS (NIGERIAN FARMERS) ───────────────────────────────── */}
      <section id="testimonials" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ FARMER TESTIMONIALS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Trusted By 20+ Fish Farms Across Nigeria
              </h2>
              <p className="text-slate-500 text-sm sm:text-base mt-2 font-['Barlow',sans-serif]">
                Hear from normal and commercial fish farmers who replaced disorganized notebooks with Pondtora.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                quote: "Setting max kg per pallet changed everything for us. Our farm hands used to overfeed 4mm pallets into grow-out ponds. Now the system alerts us the moment a limit is reached.",
                name: "Babatunde Adeleke",
                role: "Managing Director, Opebi Catfish Farms",
                location: "Lagos, Nigeria",
                avatar: "https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=200&q=80",
              },
              {
                quote: "The stock transfer feature is flawless. When we grade fingerlings from our concrete nursery into production earthen ponds, the feed history and biomass follow automatically.",
                name: "Dr. Amina Bello",
                role: "Chief Aquaculturist, Sahel Fisheries",
                location: "Abuja, Nigeria",
                avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80",
              },
              {
                quote: "Direct invoicing for our hotel and cold room buyers in Port Harcourt saves us hours each harvest. Our customers get instant professional receipts on their WhatsApp.",
                name: "Chief Emeka Nwankwo",
                role: "Proprietor, Niger Delta Ponds",
                location: "Port Harcourt, Rivers",
                avatar: "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=200&q=80",
              },
              {
                quote: "Pondtora showed us that feed was eating 72% of our harvest revenue. By tracking our FCR with daily morning and evening feeding logs, we cut our feed costs by ₦1.8M in one cycle.",
                name: "Engr. Kayode Ogundipe",
                role: "Lead Farmer, Crown Tilapia Estate",
                location: "Ibadan, Oyo State",
                avatar: "https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=200&q=80",
              },
            ].map((t, idx) => (
              <FadeIn key={idx} delay={idx * 80}>
                <div className="bg-[#f8fafc] rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between h-full shadow-xs hover:shadow-md transition-shadow">
                  <div className="space-y-3">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} fill="#00bb58" stroke="none" />
                      ))}
                    </div>
                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed italic">
                      "{t.quote}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-200/60">
                    <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{t.name}</p>
                      <p className="text-slate-500 text-[11px] truncate">{t.role}</p>
                      <p className="text-emerald-700 text-[10px] font-semibold">{t.location}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. PRICING SECTION ──────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28 bg-[#f8fafc] border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ SUBSCRIPTION PLANS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                Simple Pricing For Normal & Commercial Farms
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-['Barlow',sans-serif]">
                Start with a 30-day free trial. Flexible plans for family setups and commercial multi-pond operations.
              </p>

              {/* Single / Multi Farm Toggle */}
              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="bg-slate-200/70 p-1 rounded-xl flex text-xs font-bold">
                  <button
                    onClick={() => setPlanType("single")}
                    className={`px-4 py-1.5 rounded-lg transition-all ${planType === "single" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
                  >
                    Single Farm
                  </button>
                  <button
                    onClick={() => setPlanType("multi")}
                    className={`px-4 py-1.5 rounded-lg transition-all ${planType === "multi" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
                  >
                    Multiple Farms
                  </button>
                </div>
              </div>

              {/* Monthly / Yearly Toggle */}
              <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                <span className={planBilling === "monthly" ? "font-bold text-slate-900" : "text-slate-500"}>Monthly</span>
                <button
                  onClick={() => setPlanBilling(b => (b === "monthly" ? "yearly" : "monthly"))}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors ${planBilling === "yearly" ? "bg-emerald-600" : "bg-slate-300"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${planBilling === "yearly" ? "translate-x-5" : ""}`} />
                </button>
                <span className={planBilling === "yearly" ? "font-bold text-slate-900" : "text-slate-500"}>
                  Yearly <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">Save 20%</span>
                </span>
              </div>
            </div>
          </FadeIn>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {currentPlans.map((plan, idx) => {
              const isPopular = plan.badge === "Popular" || idx === 1;
              const displayPrice = planBilling === "yearly" ? (plan.yearlyPrice || yearlyPrice(plan.monthlyPrice)) : plan.monthlyPrice;
              return (
                <div
                  key={plan.id || plan.name}
                  className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                    isPopular
                      ? "bg-[#062319] text-white shadow-2xl border-2 border-emerald-500 scale-[1.02]"
                      : "bg-white text-slate-900 border border-slate-200 shadow-sm"
                  }`}
                >
                  <div>
                    {plan.badge && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-widest inline-block mb-3">
                        {plan.badge}
                      </span>
                    )}
                    <h3 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif]">{plan.name}</h3>
                    <p className={`text-xs mt-1 ${isPopular ? "text-slate-300" : "text-slate-500"}`}>{plan.desc || plan.limit}</p>
                    <div className="mt-4 pb-4 border-b border-slate-100/20">
                      <span className="text-3xl sm:text-4xl font-black font-['Barlow_Condensed',sans-serif]">₦{displayPrice.toLocaleString()}</span>
                      <span className={`text-xs ml-1 ${isPopular ? "text-emerald-300" : "text-slate-400"}`}>
                        / {planBilling === "yearly" ? "year" : "month"}
                      </span>
                      {planBilling === "yearly" && (
                        <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                          Save ₦{(plan.yearlySaving || Math.round(plan.monthlyPrice * 12 * 0.2)).toLocaleString()} per year
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mt-6 text-xs">
                      <li className="flex items-start gap-2">
                        <Check size={14} className={`shrink-0 mt-0.5 ${isPopular ? "text-emerald-400" : "text-emerald-600"}`} />
                        <span className={`font-semibold ${isPopular ? "text-white" : "text-slate-900"}`}>{plan.limit}</span>
                      </li>
                      {EVERY_PLAN_INCLUDES.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={14} className={`shrink-0 mt-0.5 ${isPopular ? "text-emerald-400" : "text-emerald-600"}`} />
                          <span className={isPopular ? "text-slate-200" : "text-slate-700"}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={onSignup}
                      className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                        isPopular
                          ? "bg-[#00bb58] hover:bg-[#00a84e] text-white shadow-emerald-900/40"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      Start 30 Days Free Trial
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 10. FAQ SECTION ─────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-1">
                [ FREQUENTLY ASKED QUESTIONS ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
                Got Questions? We Have Answers.
              </h2>
            </div>
          </FadeIn>

          <div className="divide-y divide-slate-200">
            {[
              {
                q: "Is Pondtora for commercial farms only, or can normal/family farms use it?",
                a: "Pondtora is built for both normal family fish farms (even with just 1 to 5 ponds or tarpaulin tanks) and large commercial multi-pond operations. You can start with our Starter plan and manage your ponds, daily feeding, and expenses with complete ease.",
              },
              {
                q: "How does the maximum kg limit per pallet work?",
                a: "When you restock or edit a pond, you can specify the maximum cumulative feed limit (in kg) for specific pallet sizes like 2mm, 3mm, or 4mm. As your staff logs daily morning and evening feedings, Pondtora tracks the total. When a pond reaches 80% or 100% of the limit, instant notifications alert you so you don't waste expensive starter feed on fish ready for larger pallets.",
              },
              {
                q: "Does stock data follow fish during pond transfers?",
                a: "Yes! When performing a full stock transfer or a nursery grading transfer, Pondtora automatically remaps cumulative feeding records, treatments, stocking dates, and proportional pallet limits to the destination pond. The source pond is automatically cleared if fully emptied.",
              },
              {
                q: "Can I use Pondtora offline at my farm location?",
                a: "Yes. Pondtora caches all active farm ponds, feeding records, and inventory locally on your phone, tablet, or computer. You can log feedings, mortality, and stock events without an active internet connection, and they will automatically sync to your database once network is restored.",
              },
              {
                q: "Can my staff log feedings without seeing our financial profits?",
                a: "Absolutely. With staff permission roles, you can assign your attendants access solely to Feeding Records or Pond Management, while keeping Financial Dashboards, Invoices, and Revenue restricted to the Farm Owner and Manager.",
              },
              {
                q: "What payment methods are supported in Nigeria?",
                a: "We support seamless payment via Paystack, including Nigerian Naira debit cards (Mastercard, Visa, Verve), direct bank transfer, USSD, and Apple Pay.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-sm sm:text-base font-bold text-slate-900 hover:text-emerald-700 transition-colors py-2"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-emerald-600" : "text-slate-400"}`} />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pr-6 font-['Barlow',sans-serif]">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 11. FINAL CTA BANNER ────────────────────────────────────────────── */}
      <section className="py-20 bg-[#f8fafc]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 p-8 sm:p-14 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <img
              src={panoFarmImg}
              alt="Fish Farm Background"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#062319] via-[#062319]/90 to-transparent" />
            
            <div className="relative z-10 max-w-xl space-y-3 text-left">
              <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">
                Start Today
              </span>
              <h2 className="text-3xl sm:text-5xl font-black font-['Barlow_Condensed',sans-serif] leading-tight">
                Start Growing Smarter Today. We're Here To Help.
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-['Barlow',sans-serif]">
                Join 20+ forward-thinking normal and commercial fish farms across Nigeria scaling their production yields with Pondtora.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <button
                onClick={onSignup}
                className="px-8 py-4 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Start 30 Days Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. RICH DARK GREEN FOOTER ──────────────────────────────────────── */}
      <footer className="bg-[#062319] text-white pt-16 pb-12 border-t border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-emerald-900/60">
            {/* Left brand column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <img src={pondtoraLogo} alt="Pondtora" className="h-10 w-auto object-contain shrink-0" />
                <div>
                  <p className="text-2xl font-black font-['Barlow_Condensed',sans-serif] tracking-wider leading-none">
                    Pondtora
                  </p>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mt-0.5">
                    Fish Farm Management System
                  </p>
                </div>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm max-w-sm leading-relaxed font-['Barlow',sans-serif]">
                The dedicated farm management system built for normal and commercial catfish and tilapia farmers across Nigeria and Sub-Saharan Africa.
              </p>

            </div>

            {/* Quick Links Column 1 */}
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Platform</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Pond Management</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Feeding Records</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Feed Stock</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Financial Dashboard</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Customer Invoicing</button></li>
              </ul>
            </div>

            {/* Quick Links Column 2 */}
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">System</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => scrollTo("fields")} className="hover:text-white">Pond Types</button></li>
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
