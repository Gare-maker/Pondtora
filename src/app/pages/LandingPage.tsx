import React, { useState, useEffect, useRef } from "react";
import {
  Menu, X, ArrowRight, Star, CheckCircle, ChevronDown, Fish,
  Droplets, Package, BookOpen, Receipt, LayoutDashboard, TrendingUp,
  Users, ShieldCheck, Waves, Sparkles, ExternalLink, Calendar, Plus,
  Clock, Activity, AlertTriangle, ArrowUpRight, Check, ChevronRight,
  TrendingDown, Search, Filter, RefreshCw, Eye, Printer, Download
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
  { label: "Fields of Operation", href: "fields" },
  { label: "App Showcase", href: "showcase" },
  { label: "Forecasting", href: "forecasting" },
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

function AppWindowShell({ activeNav, activeFarmName = "Crown Fisheries — Epe Farm, Lagos", children }: AppShowcaseChromeProps) {
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);
  const navItems = [
    { id: "financial", label: "Financial Dashboard", icon: LayoutDashboard },
    { id: "ponds", label: "Pond Management", icon: Droplets },
    { id: "inventory", label: "Feed Stock", icon: Package },
    { id: "documentation", label: "Feeding Records", icon: BookOpen },
    { id: "invoices", label: "Invoices", icon: Receipt },
    { id: "staff", label: "Staff", icon: Users },
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900 text-slate-100 font-['Barlow',sans-serif]">
      {/* Browser / Window Header */}
      <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs select-none">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <span className="ml-2 text-slate-500 text-[11px] font-mono hidden sm:inline">app.pondtora.com/live-demo</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-emerald-400">Live System Online</span>
        </div>
      </div>

      {/* Main App Frame */}
      <div className="flex min-h-[460px] md:min-h-[520px] bg-[#f8fafc] text-slate-800">
        {/* Left Sidebar */}
        <div className="hidden lg:flex flex-col w-56 bg-slate-900 border-r border-slate-800 text-slate-300 shrink-0">
          <div className="h-14 px-4 flex items-center gap-2.5 border-b border-slate-800 bg-slate-950/40">
            <img src={pondtoraLogo} alt="Pondtora" className="h-7 w-auto object-contain shrink-0" />
            <div>
              <p className="text-sm font-bold text-white font-['Barlow_Condensed',sans-serif] leading-tight">Pondtora</p>
              <p className="text-[9px] text-emerald-400 font-semibold uppercase tracking-wider">FFM System</p>
            </div>
          </div>
          <div className="p-3 space-y-1 flex-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = item.id === activeNav;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-default ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Icon size={15} className={isActive ? "text-white" : "text-slate-400"} />
                  <span className="truncate">{item.label}</span>
                </div>
              );
            })}
          </div>
          {/* User profile snippet in sidebar */}
          <div className="p-3 border-t border-slate-800 flex items-center gap-2.5 bg-slate-950/30">
            <div className="w-8 h-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs">
              BA
            </div>
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-semibold text-white truncate">Babatunde Adeleke</p>
              <p className="text-slate-400 text-[10px]">Farm Owner · Lagos</p>
            </div>
          </div>
        </div>

        {/* Center / Right Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <div className="h-14 px-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            {/* Active Farm Switcher with Dropdown Simulation */}
            <div className="relative">
              <button
                onClick={() => setFarmDropdownOpen(v => !v)}
                className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors shadow-xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[170px] sm:max-w-[260px]">{activeFarmName}</span>
                <ChevronDown size={13} className={`text-slate-500 transition-transform ${farmDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {farmDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 text-xs text-slate-700">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Commercial Farms</div>
                  <div className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex items-center justify-between">
                    <span>Crown Fisheries — Epe, Lagos</span>
                    <Check size={12} className="text-emerald-600" />
                  </div>
                  <div className="px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 cursor-pointer">
                    <span>Niger Delta Mega Ponds — Port Harcourt</span>
                  </div>
                  <div className="px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-600 cursor-pointer">
                    <span>Oyo River Hatchery — Ibadan</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick status & action buttons */}
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200">
                <Calendar size={12} className="text-slate-400" /> 13 Sep 2026
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                ₦ NGN
              </span>
            </div>
          </div>

          {/* Body Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#f8fafc]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* 1. Pond Management Preview */
function PondManagementFullPreview() {
  return (
    <AppWindowShell activeNav="ponds">
      <div className="space-y-4 text-slate-800">
        {/* Top Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Active Ponds</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8 <span className="text-xs text-slate-400 font-normal">/ 10 Total</span></p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Stock</p>
            <p className="text-xl font-bold text-emerald-600 font-['Barlow_Condensed',sans-serif] mt-0.5">48,250 <span className="text-xs font-normal text-slate-400">fish</span></p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Est. Biomass</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">31.4 <span className="text-xs font-normal text-slate-400">Tons</span></p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Average Weight</p>
            <p className="text-xl font-bold text-blue-600 font-['Barlow_Condensed',sans-serif] mt-0.5">650g <span className="text-xs font-normal text-slate-400">(Table Size)</span></p>
          </div>
        </div>

        {/* Filter bar & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl text-xs font-semibold">
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg shadow-xs">All (8)</span>
            <span className="px-2.5 py-1 text-slate-500 hover:text-slate-800">Nursery (2)</span>
            <span className="px-2.5 py-1 text-slate-500 hover:text-slate-800">Production (6)</span>
            <span className="px-2.5 py-1 text-slate-500 hover:text-slate-800">Empty (2)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
              <Plus size={13} /> Add Pond
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
              Transfer Stock
            </span>
          </div>
        </div>

        {/* Pond Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 01 — Concrete Nursery A</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">African Catfish (Clarias) · Stocked 12 Aug 2026</p>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 font-mono">14,200 fish</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-center text-xs">
              <div><p className="text-[10px] text-slate-400">Initial Stock</p><p className="font-bold text-slate-800">15,000</p></div>
              <div><p className="text-[10px] text-slate-400">Avg. Weight</p><p className="font-bold text-slate-800">85g</p></div>
              <div><p className="text-[10px] text-slate-400">Mortality</p><p className="font-bold text-emerald-600">1.2%</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">Pallet Limit: <strong className="text-slate-800">2.0mm max 350kg</strong> (280kg fed)</span>
              <span className="text-xs font-bold text-emerald-600">View History →</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond 02 — Main Earthen Grow-out</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Active</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Table Catfish · Stocked 15 May 2026</p>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 font-mono">6,800 fish</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-center text-xs">
              <div><p className="text-[10px] text-slate-400">Est. Biomass</p><p className="font-bold text-slate-800">6,256 kg</p></div>
              <div><p className="text-[10px] text-slate-400">Avg. Weight</p><p className="font-bold text-slate-800">920g</p></div>
              <div><p className="text-[10px] text-slate-400">Batch Value</p><p className="font-bold text-emerald-600">₦14.0M</p></div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 text-[11px]">Pallet Limit: <strong className="text-slate-800">4.0mm max 1,800kg</strong></span>
              <span className="text-xs font-bold text-emerald-600">Log Feeding →</span>
            </div>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 2. Feeding Records & Pallet Limits Preview */
function FeedingDocumentationFullPreview() {
  return (
    <AppWindowShell activeNav="documentation">
      <div className="space-y-4 text-slate-800">
        {/* Today's Feed Overview banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Total Feed Disbursed</p>
              <p className="text-2xl font-black text-slate-900 font-['Barlow_Condensed',sans-serif]">
                144.5 kg <span className="text-xs font-medium text-emerald-600 ml-1.5">✓ Morning (68kg) + Evening (76.5kg)</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
              + Log Daily Feeding
            </span>
          </div>
        </div>

        {/* Max Kg Alert Notification Banner */}
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span><strong>Pallet Limit Alert:</strong> Pond 01 (Nursery A) reached <strong>280kg / 350kg (80%)</strong> of 2.0mm feed. Consider sizing up to 3.0mm soon.</span>
          </div>
          <span className="font-bold text-amber-900 shrink-0 ml-2 cursor-pointer underline">Review</span>
        </div>

        {/* Feeding Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Today's Feeding Records (13 Sep 2026)</span>
            <span className="text-xs text-slate-400">Showing 4 of 4 Ponds</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Pond Name</th>
                  <th className="px-4 py-2.5">Feed Brand</th>
                  <th className="px-4 py-2.5">Pallet Size</th>
                  <th className="px-4 py-2.5">Morning</th>
                  <th className="px-4 py-2.5">Evening</th>
                  <th className="px-4 py-2.5">Total Feed</th>
                  <th className="px-4 py-2.5">Pallet Limit Status</th>
                  <th className="px-4 py-2.5">Logged By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">Pond 01 — Nursery A</td>
                  <td className="px-4 py-3">Aller Aqua</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold">2.0mm</span></td>
                  <td className="px-4 py-3">14.0 kg</td>
                  <td className="px-4 py-3">16.0 kg</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">30.0 kg</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">80% of 350kg</span></td>
                  <td className="px-4 py-3 text-slate-500">Sola Bello (Staff)</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">Pond 02 — Grow-out 1</td>
                  <td className="px-4 py-3">Coppens</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold">4.0mm</span></td>
                  <td className="px-4 py-3">32.0 kg</td>
                  <td className="px-4 py-3">38.0 kg</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">70.0 kg</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">62% of 1,800kg</span></td>
                  <td className="px-4 py-3 text-slate-500">Ibrahim Musa</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">Pond 03 — Tilapia Tank</td>
                  <td className="px-4 py-3">Skretting</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-slate-100 font-mono font-bold">3.0mm</span></td>
                  <td className="px-4 py-3">22.0 kg</td>
                  <td className="px-4 py-3">22.5 kg</td>
                  <td className="px-4 py-3 font-bold text-emerald-700">44.5 kg</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">45% of 1,200kg</span></td>
                  <td className="px-4 py-3 text-slate-500">Emeka Eze</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 3. Financial Dashboard Preview */
function FinancialDashboardFullPreview() {
  return (
    <AppWindowShell activeNav="financial">
      <div className="space-y-4 text-slate-800">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Gross Fish Sales</p>
            <p className="text-xl font-black text-emerald-600 font-['Barlow_Condensed',sans-serif] mt-1">₦16,850,000</p>
            <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1"><ArrowUpRight size={10} /> +28% vs last cycle</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Total Feed Expenses</p>
            <p className="text-xl font-black text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦6,280,000</p>
            <p className="text-[10px] text-slate-400 mt-0.5">66.7% of total cost</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[11px] font-bold text-slate-400 uppercase">Operating Costs</p>
            <p className="text-xl font-black text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦3,140,000</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Pumping, fingerlings, labor</p>
          </div>
          <div className="bg-emerald-600 text-white p-4 rounded-xl shadow-md">
            <p className="text-[11px] font-bold text-emerald-100 uppercase">Net Farm Profit</p>
            <p className="text-2xl font-black font-['Barlow_Condensed',sans-serif] mt-1">₦7,430,000</p>
            <p className="text-[10px] text-emerald-100 font-medium mt-0.5">44.1% Operating Margin</p>
          </div>
        </div>

        {/* Financial Visual Chart Simulation */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Monthly Revenue vs Operating Costs (₦)</p>
              <p className="text-[11px] text-slate-400">Tracking continuous cycle margins across all 8 ponds</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Fish Revenue</span>
              <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Feed Costs</span>
            </div>
          </div>
          {/* Visual bar graph representation */}
          <div className="h-32 flex items-end gap-3 pt-4 border-b border-slate-100 px-2">
            {[
              { m: "Apr", rev: 45, exp: 28 },
              { m: "May", rev: 62, exp: 35 },
              { m: "Jun", rev: 55, exp: 32 },
              { m: "Jul", rev: 78, exp: 42 },
              { m: "Aug", rev: 85, exp: 46 },
              { m: "Sep (Current)", rev: 100, exp: 52 },
            ].map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div className="w-1/2 bg-emerald-600 rounded-t-sm" style={{ height: `${bar.rev}%` }} />
                  <div className="w-1/2 bg-slate-300 rounded-t-sm" style={{ height: `${bar.exp}%` }} />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{bar.m}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2.5 text-[11px] text-slate-500">
            <span>Cycle Feed Conversion Ratio (FCR): <strong className="text-slate-800">1.18 kg feed / kg fish</strong></span>
            <span className="text-emerald-700 font-bold">Highest monthly ROI recorded this season</span>
          </div>
        </div>
      </div>
    </AppWindowShell>
  );
}

/* 4. Commercial Invoicing Preview */
function InvoicesFullPreview() {
  return (
    <AppWindowShell activeNav="invoices">
      <div className="space-y-4 text-slate-800">
        {/* Metric strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Invoiced</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦22,400,000</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Amount Collected</p>
            <p className="text-xl font-bold text-emerald-600 font-['Barlow_Condensed',sans-serif] mt-0.5">₦19,250,000</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Pending Balance</p>
            <p className="text-xl font-bold text-amber-600 font-['Barlow_Condensed',sans-serif] mt-0.5">₦3,150,000</p>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Wholesale Buyers</p>
            <p className="text-xl font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] mt-0.5">28 Active</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-xs">+ Create Customer Invoice</span>
            <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-600">Print Receipt</span>
          </div>
          <span className="text-xs text-slate-400 font-medium">Automatic PDF Generation</span>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Customer / Distributor</th>
                  <th className="px-4 py-2.5">Fish Batch</th>
                  <th className="px-4 py-2.5">Weight (Kg)</th>
                  <th className="px-4 py-2.5">Unit Rate</th>
                  <th className="px-4 py-2.5">Total (₦)</th>
                  <th className="px-4 py-2.5">Payment</th>
                  <th className="px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">INV-2026-104</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Mama Chinyere Coldrooms (Lagos)</td>
                  <td className="px-4 py-3 text-slate-500">Pond 02 Table Catfish</td>
                  <td className="px-4 py-3 font-bold">2,800 kg</td>
                  <td className="px-4 py-3">₦2,250/kg</td>
                  <td className="px-4 py-3 font-extrabold text-emerald-700">₦6,300,000</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Paid</span></td>
                  <td className="px-4 py-3"><button className="text-slate-400 hover:text-slate-700"><Printer size={13} /></button></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">INV-2026-103</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Grand Ocean Hotels (Victoria Island)</td>
                  <td className="px-4 py-3 text-slate-500">Pond 03 Fresh Tilapia</td>
                  <td className="px-4 py-3 font-bold">950 kg</td>
                  <td className="px-4 py-3">₦2,700/kg</td>
                  <td className="px-4 py-3 font-extrabold text-emerald-700">₦2,565,000</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Paid</span></td>
                  <td className="px-4 py-3"><button className="text-slate-400 hover:text-slate-700"><Printer size={13} /></button></td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">INV-2026-102</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Alaba Central Fish Market</td>
                  <td className="px-4 py-3 text-slate-500">Pond 02 Table Catfish</td>
                  <td className="px-4 py-3 font-bold">3,500 kg</td>
                  <td className="px-4 py-3">₦2,200/kg</td>
                  <td className="px-4 py-3 font-extrabold text-amber-700">₦7,700,000</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Partially Paid</span></td>
                  <td className="px-4 py-3"><button className="text-slate-400 hover:text-slate-700"><Printer size={13} /></button></td>
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
      subtitle: "Track stocking dates, stocking density, daily mortality, biomass growth, and pond-to-pond stock transfers with automated audit history.",
      component: <PondManagementFullPreview />,
    },
    {
      id: "feeding" as const,
      title: "Precision Feeding Documentation & Pallet Limits",
      subtitle: "Log morning and evening feeds, monitor pallet sizes (2mm to 9mm), and enforce maximum kg limits per pond to eliminate overfeeding waste.",
      component: <FeedingDocumentationFullPreview />,
    },
    {
      id: "financial" as const,
      title: "Aquaculture Financials & Profit Analytics",
      subtitle: "Track feed purchases, energy, labor, and fingerling costs against commercial harvest revenue with live ROI and gross margin calculations.",
      component: <FinancialDashboardFullPreview />,
    },
    {
      id: "invoices" as const,
      title: "Commercial Buyer Invoicing & Direct Sales",
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
              Start Free Trial
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
                Start Free Trial
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
                <span>Commercial Aquaculture System</span>
              </div>
            </FadeIn>

            <FadeIn delay={200}>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold font-['Barlow_Condensed',sans-serif] leading-[0.95] tracking-tight text-white">
                Smart Fish Farming <br />
                For <span className="italic font-serif font-normal text-emerald-400">Higher Yields</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-base sm:text-xl text-slate-200/90 font-normal leading-relaxed max-w-2xl">
                The modern farm management system engineered specifically for commercial catfish and tilapia aquaculture in Nigeria and across Africa. Eliminate feed waste, prevent mortality spikes, and scale your harvest profits.
              </p>
            </FadeIn>

            <FadeIn delay={400}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={onSignup}
                  className="px-8 py-3.5 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => scrollTo("showcase")}
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
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-emerald-700 flex items-center justify-center font-bold text-[10px]">BA</div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-blue-700 flex items-center justify-center font-bold text-[10px]">KO</div>
                  <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-amber-700 flex items-center justify-center font-bold text-[10px]">EN</div>
                </div>
                <span>Trusted by <strong>10,000+</strong> commercial fish farmers across Nigeria & West Africa</span>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Hero Bottom Dark Stats Strip */}
        <div className="relative z-10 bg-[#062319] border-t border-emerald-950/80 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">30+ Years</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Aquaculture Experience</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">450+ Ponds</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Active Ponds Managed</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">160K+ Fish</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Fish Stocked Monthly</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-white font-['Barlow_Condensed',sans-serif]">10K+ Farmers</p>
              <p className="text-xs uppercase tracking-wider text-emerald-400/90 font-semibold mt-1">Commercial Farm Owners</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. COLLABORATIVE PLATFORM STATEMENT BANNER ───────────────────────── */}
      <section className="py-16 sm:py-24 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-widest font-black text-emerald-700 mb-3">
              [ CONNECTING AQUACULTURE ]
            </p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-['Barlow_Condensed',sans-serif] leading-tight text-slate-900">
              We Are A Collaborative Aquaculture Platform That Brings Fish Farmers, Feed Suppliers, And Wholesale Buyers Together To Create A Sustainable And High-Yield Fish Farming Ecosystem.
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
                Transforming Aquaculture, One Solution At A Time
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
                From stocking fingerlings and setting pallet limits to balancing feed logs and billing cold room distributors, Pondtora delivers a comprehensive operating system built for serious fish farming.
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
              Commercial Aquaculture & Fish Cultivation
            </h2>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
              Engineered to support concrete nursery tanks, earthen production ponds, tarpaulin vats, and high-density recirculating systems.
            </p>
            <div className="pt-2">
              <button
                onClick={() => scrollTo("fields")}
                className="px-6 py-2.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-xs font-black uppercase tracking-wider transition-all"
              >
                See All Fields Of Operation →
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── 6. SEE ALL OUR FIELDS OF OPERATION ──────────────────────────────── */}
      <section id="fields" className="py-20 sm:py-28 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-1">
                  [ OUR PRODUCTION UNITS ]
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight">
                  See All Our Fields Of Operation
                </h2>
              </div>
              <p className="text-slate-500 text-sm max-w-md">
                Specialized tracking workflows designed for each stage of commercial fish development in tropical climates.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Field 1 */}
            <FadeIn delay={50}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={nurseryPondImg} alt="Nursery & Fingerling Tanks" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    01
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Nursery & Fingerling Ponds
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
                  <img src={panoFarmImg} alt="Production & Grow-Out Ponds" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    02
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Production & Grow-Out
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

            {/* Field 3 */}
            <FadeIn delay={150}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80" alt="Hatchery & Spawning" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    03
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Hatchery & Spawning Units
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Broodstock pairing records, hormone induction logs, egg incubation batch counts, and fry nursing stages.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 mt-4 inline-flex items-center gap-1">
                    Broodstock Management →
                  </span>
                </div>
              </div>
            </FadeIn>

            {/* Field 4 */}
            <FadeIn delay={200}>
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                <div className="h-44 overflow-hidden relative">
                  <img src={heroFarmImg} alt="Flow-Through Systems" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-md">
                    04
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      Flow-Through & Tarpaulin
                    </h3>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      Water exchange schedules, treatment and medication logging, and multi-vat inventory tracking.
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

      {/* ─── 7. SMART FORECASTING SECTION (DARK GREEN) ───────────────────────── */}
      <section id="forecasting" className="py-20 sm:py-28 bg-[#062319] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-12">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-400 block mb-1">
                [ SMART FORECASTING ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] tracking-tight">
                Smart Production & Weather Forecasting For Fish Farms
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-2">
                Anticipate water oxygen changes, rainy season temperature shifts, and feed consumption curves to protect your stock.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Forecast Card 1 */}
            <FadeIn delay={100}>
              <div className="bg-[#0a2e22] rounded-2xl overflow-hidden border border-emerald-900/60 p-6 space-y-4">
                <div className="h-52 rounded-xl overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1516214104703-d870798883c5?auto=format&fit=crop&w=800&q=80"
                    alt="Pond water condition"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e22] via-transparent to-transparent" />
                </div>
                <div>
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Feed Optimization</span>
                  <h3 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] mt-1 text-white">
                    Optimize Feeding & Harvest Schedules
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mt-2">
                    Adjust feeding rations dynamically when sudden rain drops water temperatures. Forecast harvest dates when your fish reach target table weights for prime market pricing.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer">
                    Explore Harvest Forecasting →
                  </span>
                </div>
              </div>
            </FadeIn>

            {/* Forecast Card 2 */}
            <FadeIn delay={200}>
              <div className="bg-[#0a2e22] rounded-2xl overflow-hidden border border-emerald-900/60 p-6 space-y-4">
                <div className="h-52 rounded-xl overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
                    alt="Aquaculture ecosystem"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a2e22] via-transparent to-transparent" />
                </div>
                <div>
                  <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Biosecurity & Health</span>
                  <h3 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] mt-1 text-white">
                    Water Quality & Mortality Prevention
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mt-2">
                    Log treatment medications, track symptoms early, and pinpoint mortality spikes by pond before infections spread across your entire farm.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-bold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer">
                    Explore Biosecurity Logging →
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
                Trusted By Farmers Across Nigeria
              </h2>
              <p className="text-slate-500 text-sm sm:text-base mt-2">
                Hear from commercial fish farmers who replaced disorganized notebooks with Pondtora.
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
                role: "Chief Aquaculturist, Sahel Hatcheries",
                location: "Abuja, Nigeria",
                avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80",
              },
              {
                quote: "Direct invoicing for our hotel and cold room buyers in Port Harcourt saves us hours each harvest. Our customers get instant professional receipts on their WhatsApp.",
                name: "Chief Emeka Nwankwo",
                role: "Proprietor, Niger Delta Mega Ponds",
                location: "Port Harcourt, Rivers",
                avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
              },
              {
                quote: "Pondtora showed us that feed was eating 72% of our harvest revenue. By tracking our FCR with daily morning and evening feeding logs, we cut our feed costs by ₦1.8M in one cycle.",
                name: "Engr. Kayode Ogundipe",
                role: "Lead Farmer, Crown Tilapia Estate",
                location: "Ibadan, Oyo State",
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
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
                Simple, Transparent Pricing
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                Start with a 30-day free trial. No credit card required to begin.
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
                      Start 30-Day Free Trial
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
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed pr-6">
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
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Join thousands of forward-thinking African commercial fish farmers scaling their production yields with Pondtora.
              </p>
            </div>

            <div className="relative z-10 shrink-0">
              <button
                onClick={onSignup}
                className="px-8 py-4 rounded-full bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Create Your Free Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. RICH DARK GREEN FOOTER ──────────────────────────────────────── */}
      <footer className="bg-[#062319] text-white pt-16 pb-12 border-t border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-emerald-900/60">
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
              <p className="text-slate-300 text-xs sm:text-sm max-w-sm leading-relaxed">
                The leading software platform built specifically for commercial catfish and tilapia farmers across Nigeria and Sub-Saharan Africa.
              </p>
            </div>

            {/* Quick Links Column 1 */}
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Platform</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Pond Management</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Feeding Records</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Pallet Limits</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Financial Dashboard</button></li>
                <li><button onClick={() => scrollTo("solutions")} className="hover:text-white">Commercial Invoicing</button></li>
              </ul>
            </div>

            {/* Quick Links Column 2 */}
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Company</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => scrollTo("fields")} className="hover:text-white">Fields of Operation</button></li>
                <li><button onClick={() => scrollTo("testimonials")} className="hover:text-white">Farmer Stories</button></li>
                <li><button onClick={() => scrollTo("pricing")} className="hover:text-white">Pricing & Plans</button></li>
                <li><button onClick={() => scrollTo("faq")} className="hover:text-white">FAQ</button></li>
                <li><button onClick={onAdmin} className="text-emerald-400 hover:underline">Admin Portal</button></li>
              </ul>
            </div>

            {/* Newsletter Column */}
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Aquaculture Tips</p>
              <p className="text-xs text-slate-300 mb-3">Subscribe for monthly commercial fish farming tips and feed efficiency strategies.</p>
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="bg-emerald-950/60 border border-emerald-900 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 flex-1"
                />
                <button
                  type="button"
                  className="p-2 rounded-lg bg-[#00bb58] hover:bg-[#00a84e] text-white"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
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
