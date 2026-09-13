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
   Interactive Desktop Window & Authentic Mobile Smartphone Shell
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
          <span className="ml-2 text-slate-500 text-[11px] font-mono hidden sm:inline">app.pondtora.com</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#00bb58] animate-pulse" />
          <span className="font-semibold text-[#00bb58]">Interactive Live Preview</span>
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
   INTERACTIVE WORKING MODALS (DUMMY DATA READY FOR DIRECT INTERACTION)
   ═══════════════════════════════════════════════════════════════════════════ */

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ShowcaseModal({ title, onClose, children }: ModalWrapperProps) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 text-slate-800 text-xs space-y-3.5 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   8 COMPLETE FEATURE PREVIEWS (DESKTOP & MOBILE VIEWS)
   ═══════════════════════════════════════════════════════════════════════════ */

/* 1. Pond Management Preview */
function PondManagementShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const [filterType, setFilterType] = useState<"All" | "Concrete" | "Earthen" | "Tarpaulin">("All");
  const ponds = [
    { id: 1, name: "Pond 01", type: "Concrete", species: "Catfish", count: 8500, mort: "0.6%", status: "Active", tag: "Nursery" },
    { id: 2, name: "Pond 02", type: "Earthen", species: "Catfish", count: 14200, mort: "0.8%", status: "Active", tag: "Production" },
    { id: 3, name: "Pond 03", type: "Tarpaulin", species: "Catfish", count: 4200, mort: "0.5%", status: "Active", tag: "Production" },
    { id: 4, name: "Pond 04", type: "Earthen", species: "Tilapia", count: 9600, mort: "1.1%", status: "Active", tag: "Production" },
  ];
  const filtered = ponds.filter(p => filterType === "All" || p.type === filterType);

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Pond Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track stocking dates, mortality, feeding history, and fish counts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("add_pond")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Add Pond
          </button>
        </div>
      </div>

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

      <div className="flex gap-2 items-center">
        {(["All", "Concrete", "Earthen", "Tarpaulin"] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              filterType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Pond Name</th>
              <th className="px-3.5 py-2.5">Type</th>
              <th className="px-3.5 py-2.5">Species</th>
              <th className="px-3.5 py-2.5">Fish Count</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5 font-bold text-slate-900">{p.name}</td>
                <td className="px-3.5 py-2.5 text-slate-600">{p.type}</td>
                <td className="px-3.5 py-2.5 text-slate-600">{p.species}</td>
                <td className="px-3.5 py-2.5">
                  <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{p.count.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block">Mort: {p.mort}</span>
                </td>
                <td className="px-3.5 py-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {p.status}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  <button
                    onClick={() => onOpenModal("pond_detail")}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00bb58] hover:underline"
                  >
                    <Eye size={12} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Pond Overview</h2>
          <p className="text-[10px] text-slate-400">8 ponds · 48,250 fish</p>
        </div>
        <button
          onClick={() => onOpenModal("add_pond")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Pond
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Active Ponds</p>
          <p className="text-lg font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">6 Ponds</p>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Total Stock</p>
          <p className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">48,250</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.slice(0, 3).map(p => (
          <div key={p.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{p.name} ({p.type})</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Active</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{p.species} · {p.tag}</span>
              <span className="font-bold text-slate-800">{p.count.toLocaleString()} pcs</span>
            </div>
            <div className="pt-1 flex justify-between items-center text-[10px] border-t border-slate-100">
              <span className="text-slate-400">Mortality: {p.mort}</span>
              <button onClick={() => onOpenModal("pond_detail")} className="font-bold text-emerald-600 flex items-center gap-0.5">
                <Eye size={10} /> Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 2. Feeding Records & Pallet Limits Preview */
function FeedingDocumentationShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Daily Feeding Records</h1>
          <p className="text-xs text-slate-400 mt-0.5">Log morning and evening feeds, pallet sizes, and enforce max kg limits.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("log_feeding")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Log Feeding
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-amber-800">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-amber-900">Pallet Limit Alert: Pond 03 (Tarpaulin Vat) at 88% of 2.0mm Limit</p>
          <p className="text-amber-700 mt-0.5">Pond 03 has consumed 440 kg of 500 kg maximum 2.0mm feed. Prepare to grade and transition to 3.0mm pallet.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Ponds</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">8 active</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Ponds Fed Today</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">6 logged</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Ponds Pending</p>
          <p className="text-xl font-bold text-amber-600 font-['Barlow_Condensed',sans-serif] mt-0.5">2 remaining</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Opened Bags</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">3 in use</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Pond</th>
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
              <td className="px-3.5 py-2.5 font-bold text-slate-900">Pond 01</td>
              <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Coppens</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">1.2mm</span></td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">4.0 kg</td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">4.5 kg</td>
              <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">8.5 kg</td>
              <td className="px-3.5 py-2.5 text-slate-500">Sola Bello</td>
              <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logged</span></td>
            </tr>
            <tr className="hover:bg-slate-50/80">
              <td className="px-3.5 py-2.5 font-bold text-slate-900">Pond 02</td>
              <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Vital Feed</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">3.0mm</span></td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">8.0 kg</td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">8.0 kg</td>
              <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">16.0 kg</td>
              <td className="px-3.5 py-2.5 text-slate-500">Ibrahim Musa</td>
              <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Logged</span></td>
            </tr>
            <tr className="hover:bg-slate-50/80">
              <td className="px-3.5 py-2.5 font-bold text-slate-900">Pond 03</td>
              <td className="px-3.5 py-2.5"><span className="font-semibold text-slate-800">Durante</span> <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">2.0mm</span></td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">3.5 kg</td>
              <td className="px-3.5 py-2.5 text-right text-slate-600">3.5 kg</td>
              <td className="px-3.5 py-2.5 text-right font-bold text-amber-700">7.0 kg</td>
              <td className="px-3.5 py-2.5 text-slate-500">Emeka Eze</td>
              <td className="px-3.5 py-2.5"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Near Limit</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Daily Feeding</h2>
          <p className="text-[10px] text-slate-400">6 of 8 ponds logged today</p>
        </div>
        <button
          onClick={() => onOpenModal("log_feeding")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Log
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p><strong>Pond 03:</strong> 88% of 2.0mm limit used. Prepare 3.0mm transition.</p>
      </div>

      <div className="space-y-2">
        {[
          { pond: "Pond 01", brand: "Coppens 1.2mm", kg: "8.5 kg", staff: "Sola Bello" },
          { pond: "Pond 02", brand: "Vital Feed 3.0mm", kg: "16.0 kg", staff: "Ibrahim Musa" },
          { pond: "Pond 03", brand: "Durante 2.0mm", kg: "7.0 kg", staff: "Emeka Eze" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{item.pond}</span>
              <span className="font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] text-sm">{item.kg}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{item.brand}</span>
              <span>By {item.staff}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 3. Feed Stock Inventory Management Preview */
function FeedStockInventoryShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const stockItems = [
    { brand: "Durante", size: "2.0 mm", bags: 15, wt: 30, totalKg: 450, cost: "₦8,500", supplier: "AgroVet Nig" },
    { brand: "Vital Feed", size: "4.0 mm", bags: 8, wt: 25, totalKg: 200, cost: "₦9,200", supplier: "Vital Feeds Ltd" },
    { brand: "Propac", size: "6.0 mm", bags: 22, wt: 25, totalKg: 550, cost: "₦7,800", supplier: "UAC Nigeria" },
    { brand: "Coppens", size: "1.2 mm", bags: 12, wt: 25, totalKg: 300, cost: "₦11,500", supplier: "Aqua Supplies" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Feed Stock Inventory</h1>
          <p className="text-xs text-slate-400 mt-0.5">Store warehouse feed bags, brands, pallet sizes, and monitor stock deductions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("add_stock")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Restock Feed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Feed Bags</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">57 bags</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Total Weight</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">1,500 kg</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Valuation</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">₦845,000</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-amber-600 uppercase">Low Stock Alert</p>
          <p className="text-xl font-bold text-amber-600 font-['Barlow_Condensed',sans-serif] mt-0.5">Vital 4mm (8 bags)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Feed Brand</th>
              <th className="px-3.5 py-2.5">Pallet Size</th>
              <th className="px-3.5 py-2.5 text-right">Bags In Store</th>
              <th className="px-3.5 py-2.5 text-right">Total Kg</th>
              <th className="px-3.5 py-2.5">Cost / Bag</th>
              <th className="px-3.5 py-2.5">Supplier</th>
              <th className="px-3.5 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stockItems.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5 font-bold text-slate-900">{s.brand}</td>
                <td className="px-3.5 py-2.5"><span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-[10px]">{s.size}</span></td>
                <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">{s.bags} bags</td>
                <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-700">{s.totalKg} kg</td>
                <td className="px-3.5 py-2.5 text-slate-700">{s.cost}</td>
                <td className="px-3.5 py-2.5 text-slate-500">{s.supplier}</td>
                <td className="px-3.5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bags <= 8 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                    {s.bags <= 8 ? "Reorder Soon" : "In Stock"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Inventory</h2>
          <p className="text-[10px] text-slate-400">57 bags · ₦845,000 value</p>
        </div>
        <button
          onClick={() => onOpenModal("add_stock")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Restock
        </button>
      </div>

      <div className="space-y-2">
        {stockItems.map((s, idx) => (
          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{s.brand} ({s.size})</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${s.bags <= 8 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {s.bags} bags
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{s.totalKg} kg in stock</span>
              <span className="font-bold text-slate-800">{s.cost} / bag</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 4. Staff Management & Remote Farm Delegation Preview */
function StaffManagementShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const staff = [
    { name: "Sola Bello", role: "Farm Manager", email: "sola@fisheries.ng", phone: "+234 802 345 6789", status: "Active", perms: ["Pond Management", "Feeding Records", "Feed Stock", "Reports"] },
    { name: "Ibrahim Musa", role: "Feeding Staff", email: "ibrahim@fisheries.ng", phone: "+234 803 123 4567", status: "Active", perms: ["Feeding Records", "Reports"] },
    { name: "Chidi Okonkwo", role: "General Staff", email: "chidi@fisheries.ng", phone: "+234 805 789 0123", status: "Active", perms: ["Reports", "Staff Assessment"] },
    { name: "Funmi Adeyemi", role: "Feeding Staff", email: "funmi@fisheries.ng", phone: "+234 807 456 7890", status: "Pending", perms: ["Feeding Records"] },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Staff Management & Delegation</h1>
          <p className="text-xs text-slate-400 mt-0.5">Invite workers, assign roles, and delegate daily farm routines while managing from anywhere.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("invite_staff")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Invite Staff Member
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Team</p>
            <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">5 Members</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Users size={18} />
          </div>
        </div>
        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Attendants</p>
            <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">4 Online</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle size={18} />
          </div>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assigned Farm</p>
            <p className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">Crown Fisheries</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Fish size={18} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Staff Name</th>
              <th className="px-3.5 py-2.5">Role</th>
              <th className="px-3.5 py-2.5">Permissions Granted</th>
              <th className="px-3.5 py-2.5">Phone Number</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5">
                  <p className="font-bold text-slate-900">{s.name}</p>
                  <p className="text-[10px] text-slate-400">{s.email}</p>
                </td>
                <td className="px-3.5 py-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {s.role}
                  </span>
                </td>
                <td className="px-3.5 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {s.perms.map(p => (
                      <span key={p} className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3.5 py-2.5 text-slate-600">{s.phone}</td>
                <td className="px-3.5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  <button onClick={() => onOpenModal("invite_staff")} className="text-[11px] font-bold text-slate-600 hover:text-emerald-700">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Farm Staff</h2>
          <p className="text-[10px] text-slate-400">4 active attendants</p>
        </div>
        <button
          onClick={() => onOpenModal("invite_staff")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Staff
        </button>
      </div>

      <div className="space-y-2">
        {staff.map((s, idx) => (
          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{s.name}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${s.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {s.role}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">{s.phone}</p>
            <div className="pt-1 flex flex-wrap gap-1">
              {s.perms.slice(0, 3).map(p => (
                <span key={p} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 5. Daily Operational Reports Preview */
function DailyReportsShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Daily Farm Operational Reports</h1>
          <p className="text-xs text-slate-400 mt-0.5">Staff daily checklist: fish feeding, locked drainage valves, pumps off, and stored tools.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("submit_report")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Submit Daily Report
          </button>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-3 text-xs text-orange-900">
        <AlertCircle size={16} className="text-orange-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-orange-950">Daily Reports Pending — 1 Attendant Outstanding</p>
          <p className="text-orange-800 mt-0.5">The following staff has not submitted today's daily operational checklist: <strong>Chidi Okonkwo</strong>.</p>
        </div>
      </div>

      <div className="space-y-3">
        {[
          {
            title: "Daily Operations Checklist — Epe Farm Station",
            author: "Sola Bello (Farm Manager)",
            time: "Today at 18:30",
            fed: "Yes (Morning & Evening)",
            locked: "Yes — All pond outlets & drainage valves confirmed locked",
            water: "Yes — Water flushed in Ponds 01 & 02",
            pumps: "Yes — Pumping machines & aerators turned off for the night",
            equip: "Yes — Feed scoops, nets, and DO meters locked in store",
            notes: "Fingerlings in Pond 01 showing high vigor. Borehole pump serviced at noon."
          },
          {
            title: "Evening Routine Report — Nursery Vats",
            author: "Ibrahim Musa (Feeding Staff)",
            time: "Today at 18:15",
            fed: "Yes (Evening Session)",
            locked: "Yes — Tarpaulin drain plugs tightly secured",
            water: "No — Next exchange due tomorrow morning",
            pumps: "Yes — Submersible pump switched off",
            equip: "Yes — Weighing scale cleaned and stored",
            notes: "Pallet limit alert noted for Pond 03."
          },
        ].map((r, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">{r.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Submitted by <strong className="text-slate-700">{r.author}</strong> · {r.time}</p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle size={11} /> Verified
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Fed Fish Today</span>
                <span className="font-semibold text-emerald-700">{r.fed}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Outlets Locked</span>
                <span className="font-semibold text-emerald-700">{r.locked}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Pumps Off</span>
                <span className="font-semibold text-emerald-700">{r.pumps}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Equipment Stored</span>
                <span className="font-semibold text-emerald-700">{r.equip}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-emerald-50/40 border border-emerald-100 rounded-lg p-2.5">
              <strong>Attendant Remarks:</strong> {r.notes}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Daily Reports</h2>
          <p className="text-[10px] text-orange-600 font-semibold">1 report pending</p>
        </div>
        <button
          onClick={() => onOpenModal("submit_report")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Submit
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-900 text-xs">Sola Bello</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">Today 18:30</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle size={12} /> Fish fed morning & evening
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle size={12} /> Pond drainage outlets locked
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle size={12} /> Pumping machines switched off
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle size={12} /> Nets & equipment locked in store
          </div>
        </div>
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 6. Staff Knowledge & Competency Assessments Preview */
function StaffAssessmentsShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const results = [
    { name: "Aminu Garba", role: "Farm Attendant", score: 86, pass: true, date: "2026-06-20", strength: "Fish Feeding, Water Quality", weakness: "Equipment Operation" },
    { name: "Funmi Adeyemi", role: "Feeding Staff", score: 71, pass: true, date: "2026-06-21", strength: "Fish Feeding, Hygiene", weakness: "Pond Maintenance" },
    { name: "Chidi Okonkwo", role: "Trainee Attendant", score: 57, pass: false, date: "2026-06-22", strength: "Safety & Hygiene", weakness: "Water Quality, DO Measurement" },
    { name: "Ngozi Eze", role: "Farm Manager", score: 100, pass: true, date: "2026-06-24", strength: "Master of All 12 Domains", weakness: "None" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Staff Competency & Exam Assessments</h1>
          <p className="text-xs text-slate-400 mt-0.5">Test attendants on 12 aquaculture domains (Feeding, Disease, DO levels, and Farm SOPs).</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("take_quiz")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <HelpCircle size={12} /> Sample Test Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tests Administered</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">14 Exams</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Average Score</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">78.5%</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">85.7%</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">SOP Categories</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">12 Domains</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Staff Candidate</th>
              <th className="px-3.5 py-2.5">Role</th>
              <th className="px-3.5 py-2.5 text-center">Score</th>
              <th className="px-3.5 py-2.5">Evaluation Status</th>
              <th className="px-3.5 py-2.5">Strengths</th>
              <th className="px-3.5 py-2.5">Needs Retraining</th>
              <th className="px-3.5 py-2.5 text-right">Scorecard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5 font-bold text-slate-900">{r.name}</td>
                <td className="px-3.5 py-2.5 text-slate-600">{r.role}</td>
                <td className="px-3.5 py-2.5 text-center">
                  <span className={`font-bold font-['Barlow_Condensed',sans-serif] text-sm ${r.pass ? "text-emerald-700" : "text-rose-600"}`}>
                    {r.score}%
                  </span>
                </td>
                <td className="px-3.5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.pass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}>
                    {r.pass ? "Passed (Certified)" : "Needs Retraining"}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-emerald-700 font-medium">{r.strength}</td>
                <td className="px-3.5 py-2.5 text-rose-600 font-medium">{r.weakness}</td>
                <td className="px-3.5 py-2.5 text-right">
                  <button onClick={() => onOpenModal("take_quiz")} className="text-[11px] font-bold text-emerald-600 hover:underline">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Staff Assessments</h2>
          <p className="text-[10px] text-slate-400">85.7% pass rate across farm team</p>
        </div>
        <button
          onClick={() => onOpenModal("take_quiz")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Award size={12} /> Test
        </button>
      </div>

      <div className="space-y-2">
        {results.map((r, idx) => (
          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{r.name}</span>
              <span className={`font-bold font-['Barlow_Condensed',sans-serif] text-sm ${r.pass ? "text-emerald-700" : "text-rose-600"}`}>
                {r.score}%
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{r.role}</span>
              <span className={`font-bold ${r.pass ? "text-emerald-600" : "text-rose-500"}`}>
                {r.pass ? "Passed" : "Retest Required"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 7. Financial Dashboard Preview */
function FinancialDashboardShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Financial Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track revenue, expenses, feed cost ratio, and gross profit margins.</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Revenue</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦14,850,000</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">61% Gross Margin</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Total Expenses</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦5,720,000</p>
          <p className="text-[10px] text-slate-400 mt-0.5">48 recorded entries</p>
        </div>
        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 uppercase">Net Profit</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-1">₦9,130,000</p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Profitable Cycle</p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase">Feed Costs</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-1">₦3,850,000</p>
          <p className="text-[10px] text-slate-400 mt-0.5">67% of expenses</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Cost vs Revenue (2026 Cycle)</p>
          </div>
          <div className="h-28 flex items-end gap-3 pt-3 border-b border-slate-100 px-2">
            {[
              { m: "Jan", rev: 40, exp: 25 },
              { m: "Feb", rev: 55, exp: 30 },
              { m: "Mar", rev: 68, exp: 35 },
              { m: "Apr", rev: 80, exp: 40 },
              { m: "May", rev: 92, exp: 45 },
              { m: "Jun", rev: 100, exp: 48 },
            ].map((b, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="w-full flex items-end justify-center gap-1 h-full">
                  <div className="w-1/2 bg-[#00bb58] rounded-t-sm" style={{ height: `${b.rev}%` }} />
                  <div className="w-1/2 bg-[#f43f5e] rounded-t-sm" style={{ height: `${b.exp}%` }} />
                </div>
                <span className="text-[9px] font-semibold text-slate-400">{b.m}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-2 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-[#00bb58]" /> Revenue</span>
            <span className="flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e]" /> Expenses</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Expense Drivers</p>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Feed</span><span className="font-bold">67.3% · ₦3.85M</span></div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-[#00bb58] h-full" style={{ width: "67.3%" }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Fuel & Generator</span><span className="font-bold">14.2% · ₦810K</span></div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-amber-500 h-full" style={{ width: "14.2%" }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-slate-600 text-[11px] mb-0.5"><span>Stock / Fingerlings</span><span className="font-bold">11.0% · ₦630K</span></div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden"><div className="bg-blue-500 h-full" style={{ width: "11%" }} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Financial Summary</h2>
      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
        <p className="text-[10px] text-emerald-800 font-bold uppercase">Net Profit</p>
        <p className="text-2xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif]">₦9,130,000</p>
        <p className="text-[10px] text-emerald-600">61% margin · ₦14.85M Revenue</p>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
        <p className="text-xs font-bold text-slate-800">Top Farm Expenses</p>
        <div className="flex justify-between text-xs"><span>Feed</span><strong>₦3,850,000 (67%)</strong></div>
        <div className="flex justify-between text-xs"><span>Pumping / Fuel</span><strong>₦810,000 (14%)</strong></div>
        <div className="flex justify-between text-xs"><span>Stock</span><strong>₦630,000 (11%)</strong></div>
      </div>
    </div>
  );

  return { desktopContent, mobileContent };
}

/* 8. Customer Invoices & Receipts Preview */
function InvoicesShowcase({ onOpenModal, onSelectNav }: { onOpenModal: (m: string) => void; onSelectNav: (id: string) => void }) {
  const invoices = [
    { num: "INV-2026-084", client: "Bodija Fresh Fish Market", pond: "Pond 02", wt: "740 kg", total: "₦1,850,000", status: "Paid" },
    { num: "INV-2026-083", client: "Alaba Fish Wholesalers", pond: "Pond 04", wt: "1,280 kg", total: "₦3,200,000", status: "Paid" },
    { num: "INV-2026-082", client: "Mama Grace Fish Depot", pond: "Pond 03", wt: "420 kg", total: "₦950,000", status: "Pending" },
  ];

  const desktopContent = (
    <div className="space-y-4 text-slate-800 font-['Barlow',sans-serif]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#f5f7fa] pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">Customer Invoices & Receipts</h1>
          <p className="text-xs text-slate-400 mt-0.5">Issue branded fish sale invoices, configure size price groups, and track payments.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenModal("create_invoice")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00bb58] text-white text-xs font-bold shadow-xs hover:bg-[#00a84e] transition-all"
          >
            <Plus size={12} /> Create Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</p>
          <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">18 Invoices</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Revenue Invoiced</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦14,850,000</p>
        </div>
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-700 uppercase">Collected</p>
          <p className="text-xl font-bold text-emerald-800 font-['Barlow_Condensed',sans-serif] mt-0.5">₦12,900,000</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase">Outstanding Balance</p>
          <p className="text-xl font-bold text-rose-600 font-['Barlow_Condensed',sans-serif] mt-0.5">₦1,950,000</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-3.5 py-2.5">Invoice #</th>
              <th className="px-3.5 py-2.5">Customer / Buyer</th>
              <th className="px-3.5 py-2.5">Pond Harvested</th>
              <th className="px-3.5 py-2.5 text-right">Total Wt.</th>
              <th className="px-3.5 py-2.5 text-right">Grand Total</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv, idx) => (
              <tr key={idx} className="hover:bg-slate-50/80">
                <td className="px-3.5 py-2.5 font-mono font-bold text-[#00bb58]">{inv.num}</td>
                <td className="px-3.5 py-2.5 font-bold text-slate-900">{inv.client}</td>
                <td className="px-3.5 py-2.5 text-slate-600">{inv.pond}</td>
                <td className="px-3.5 py-2.5 text-right font-medium text-slate-800">{inv.wt}</td>
                <td className="px-3.5 py-2.5 text-right font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{inv.total}</td>
                <td className="px-3.5 py-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  <button onClick={() => onOpenModal("invoice_preview")} className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700">
                    <Printer size={12} /> Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const mobileContent = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Sales Invoices</h2>
          <p className="text-[10px] text-slate-400">₦12.9M collected</p>
        </div>
        <button
          onClick={() => onOpenModal("create_invoice")}
          className="p-1.5 bg-[#00bb58] text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
        >
          <Plus size={12} /> Invoice
        </button>
      </div>

      <div className="space-y-2">
        {invoices.map((inv, idx) => (
          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">{inv.client}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {inv.status}
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>{inv.pond} · {inv.wt}</span>
              <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{inv.total}</span>
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
  const [activeModal, setActiveModal] = useState<string | null>(null);

  /* Modal form states */
  const [feedPond, setFeedPond] = useState("Pond 01");
  const [feedMorning, setFeedMorning] = useState("4.5");
  const [feedEvening, setFeedEvening] = useState("4.5");
  const [feedSize, setFeedSize] = useState("2.0 mm");

  const [reportFed, setReportFed] = useState("Yes");
  const [reportLocked, setReportLocked] = useState("Yes");
  const [reportPumps, setReportPumps] = useState("Yes");
  const [reportEquip, setReportEquip] = useState("Yes");
  const [reportNotes, setReportNotes] = useState("");

  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("Feeding Staff");

  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

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

  /* 8 Comprehensive Solutions with What This Does For Your Farm */
  const solutions = [
    {
      id: "ponds" as const,
      navId: "ponds",
      title: "Pond & Fish Stock Lifecycle",
      subtitle: "Track stocking dates, fish count, species, mortality logs, and pond-to-pond transfers for earthen, concrete, and tarpaulin setups.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Stops costly fish mortality: Tracks survival rate and daily mortality causes so disease or water stress is caught immediately.",
          "Accurate biomass tracking: Automatically updates fish count during size grading and transfers so you never miscalculate harvest yields.",
          "Multi-setup support: Unified oversight across concrete nursery tanks, commercial earthen ponds, and mobile tarpaulin vats."
        ]
      },
      renderer: PondManagementShowcase,
    },
    {
      id: "feeding" as const,
      navId: "documentation",
      title: "Daily Feeding & Pallet Limits",
      subtitle: "Log morning and evening feeds in kg, monitor feed sizes (0.2mm to 9.0mm), and enforce maximum pallet limits per pond.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Feed is 70%+ of farm expenses — stop the leakage: Daily logs prevent attendants from overfeeding, underfeeding, or stealing feed bags.",
          "Strict pallet size graduation: Automated threshold alerts warn you when a pond reaches its max kg limit so you don't waste expensive starter pallets on mature fish.",
          "Daily opened bags reconciliation: Compare opened bags in the store against recorded pond consumption to ensure zero bag shrinkage."
        ]
      },
      renderer: FeedingDocumentationShowcase,
    },
    {
      id: "inventory" as const,
      navId: "inventory",
      title: "Feed Stock Inventory Management",
      subtitle: "Warehouse bag tracking by brand, size, supplier, purchase cost, opened bags, and automatic deductions on feeding.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Never run out of feed mid-cycle: Real-time stock counts by brand (Coppens, Durante, Vital, Aller Aqua) let you reorder before prices surge.",
          "Automatic inventory deductions: When attendants record feeding, feed kg is deducted from stock, eliminating unaccounted warehouse loss.",
          "Historical supplier cost comparison: Compare prices per bag across different distributors to negotiate the highest profit margin."
        ]
      },
      renderer: FeedStockInventoryShowcase,
    },
    {
      id: "staff" as const,
      navId: "staff",
      title: "Staff Management & Remote Delegation",
      subtitle: "Add farm managers and pond attendants, assign granular permissions, and delegate farm routines without sharing bank or profit details.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Run your fish farm while at home or traveling: Attendants log feedings and operations directly from their phones while you oversee everything remotely.",
          "Role-based permission protection: Restrict sensitive financial profits and invoicing to the owner while giving attendants pond-side logging tools.",
          "100% staff accountability: Every feeding log, mortality report, and stock count is stamped with the exact staff member's name and timestamp."
        ]
      },
      renderer: StaffManagementShowcase,
    },
    {
      id: "reports" as const,
      navId: "reports",
      title: "Daily Operational Reports & Checklist",
      subtitle: "Mandatory staff end-of-day checklist: fed fish confirmation, locked pond outlets, water pumps turned off, and stored tools.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Prevent catastrophic farm disasters: Confirms that pond drainage outlets are locked and water pumps are switched off before workers leave.",
          "Attendant accountability audit: Immediate alert flags attendants who have not submitted their required daily operational checklist.",
          "Peace of mind for the farm owner: Verify from your phone at 7 PM that all ponds are secure, water flush was done, and equipment is locked away."
        ]
      },
      renderer: DailyReportsShowcase,
    },
    {
      id: "assessments" as const,
      navId: "assessments",
      title: "Staff Knowledge & Competency Exams",
      subtitle: "Pre-built aquaculture quizzes covering 12 vital farm domains: feeding best practices, disease control, DO levels, and farm SOPs.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Eliminate costly worker mistakes: Tests staff on dissolved oxygen, water flushing, and feeding ratios before they handle delicate fingerlings.",
          "Objective staff evaluation & promotions: Track scorecards and pass rates to know which attendants are qualified for managerial responsibilities.",
          "Standard operating procedure (SOP) training: Instills professional commercial fish farming habits across your entire team."
        ]
      },
      renderer: StaffAssessmentsShowcase,
    },
    {
      id: "financial" as const,
      navId: "financial",
      title: "Farm Financials & Profit Analytics",
      subtitle: "Track fish sales revenue against feed, fuel, fingerlings, labor, and medication with automated gross margin calculations.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "True pond profitability, not guesswork: Automatically factors in generator fuel, feed bags, and fingerling costs to show true net profits.",
          "Pinpoint rising operational expenses: Understand immediately if electricity or feed inflation is eating into cycle returns.",
          "Loan & investor ready records: Export professional CSV and PDF statements ready for agricultural grants and bank financing."
        ]
      },
      renderer: FinancialDashboardShowcase,
    },
    {
      id: "invoices" as const,
      navId: "invoices",
      title: "Customer Invoicing & Sales Receipts",
      subtitle: "Create branded customer invoices, configure size price groups (kg/pcs), track partial payments, and issue printable receipts.",
      farmBenefit: {
        headline: "What This Does For Your Farm:",
        points: [
          "Zero lost fish debts: Track every kilogram sold to market women and cold room wholesalers to stop forgotten customer balances.",
          "Instant professional receipts via WhatsApp: Send professional receipts with your farm logo, bank details, and harvest weights to customers.",
          "Custom size price groups: Standardize rates per kg across melange, table size, and export size fish for smooth harvest day sales."
        ]
      },
      renderer: InvoicesShowcase,
    },
  ];

  const currentSolution = solutions.find(s => s.id === activeSolutionTab) || solutions[0];
  const { desktopContent, mobileContent } = currentSolution.renderer({
    onOpenModal: (m: string) => setActiveModal(m),
    onSelectNav: (id: string) => {
      const match = solutions.find(s => s.navId === id);
      if (match) setActiveSolutionTab(match.id);
    },
  });

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
            alt="Commercial African Fish Farm"
            className="w-full h-full object-cover object-center opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062319] via-[#062319]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#062319] via-[#062319]/80 to-transparent" />
        </div>

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
                On <span className="text-emerald-400 font-bold">Exercise Books & WhatsApp</span>
              </h1>
            </FadeIn>

            <FadeIn delay={300}>
              <p className="text-base sm:text-xl text-slate-200/90 font-normal leading-relaxed max-w-2xl font-['Barlow',sans-serif]">
                Pondtora replaces lost paper notebooks, messy records, and chaotic WhatsApp chats with one complete system built for Nigerian fish farmers — normal family setups and commercial operations alike. Track daily feedings, add staff to record routines, monitor feed stock inventory, enforce pallet limits, and administer staff assessments from anywhere on your desktop or phone.
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
                  Explore Interactive App
                </button>
              </div>
            </FadeIn>

            <FadeIn delay={500}>
              <div className="pt-4 flex items-center gap-3 text-xs text-slate-300">
                <div className="flex -space-x-2">
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                  <img className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" src="https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?auto=format&fit=crop&w=100&q=80" alt="Farmer" />
                </div>
                <span>Trusted by <strong>20+</strong> commercial fish farms across Nigeria</span>
              </div>
            </FadeIn>
          </div>
        </div>

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

      {/* ─── 3. STATEMENT BANNER ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <p className="text-xs uppercase tracking-widest font-black text-emerald-700 mb-3">
              [ COMPLETE FISH FARM MANAGEMENT SYSTEM ]
            </p>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold font-['Barlow_Condensed',sans-serif] leading-tight text-slate-900">
              Built For Normal, Family, And Commercial Fish Farms — Pondtora Gives You Complete Control Over Daily Feeding, Feed Stock, Staff Delegation, Daily Reports, And Invoices.
            </h2>
          </FadeIn>
        </div>
      </section>

      {/* ─── 4. CORE SOLUTIONS & INTERACTIVE SHOWCASE ─────────────────────────── */}
      <section id="solutions" className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-10">
              <span className="text-xs uppercase tracking-widest font-black text-emerald-700 block mb-2">
                [ COMPLETE PLATFORM SOLUTIONS & LIVE SHOWCASE ]
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-tight leading-tight">
                Every Tool Needed To Run Your Fish Farm Smoothly
              </h2>
              <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed">
                Click any solution below to explore the actual application interface. Experience how Pondtora works seamlessly on desktop computers and on mobile smartphones at the pond side.
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
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
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

          {/* Active Solution Headline & Deep Explanation: "What This Does For Your Farm" */}
          <div className="mb-8">
            <FadeIn key={`expl-${activeSolutionTab}`}>
              <div className="bg-emerald-950 text-white rounded-2xl p-5 sm:p-6 border border-emerald-800 shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-900/80 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-black text-emerald-400 block mb-1">
                      {currentSolution.farmBenefit.headline}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold font-['Barlow_Condensed',sans-serif]">
                      {currentSolution.title}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
                      {currentSolution.subtitle}
                    </p>
                  </div>

                  {/* Device Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/80 self-start md:self-auto shrink-0">
                    <button
                      onClick={() => setDeviceMode("dual")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        deviceMode === "dual" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
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
                        deviceMode === "desktop" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                      }`}
                      title="Desktop View"
                    >
                      <Monitor size={13} />
                      <span>Desktop</span>
                    </button>
                    <button
                      onClick={() => setDeviceMode("mobile")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        deviceMode === "mobile" ? "bg-[#00bb58] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
                      }`}
                      title="Mobile Phone View"
                    >
                      <Smartphone size={13} />
                      <span>Phone</span>
                    </button>
                  </div>
                </div>

                {/* 3 Impact Points */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentSolution.farmBenefit.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/60">
                      <CheckCircle size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-200 leading-relaxed">{pt}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Interactive Screen Display Area (Desktop, Mobile, or Dual Side-by-Side) */}
          <div className="mt-4">
            <FadeIn key={`${activeSolutionTab}-${deviceMode}`}>
              {deviceMode === "dual" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Desktop Frame (7 cols) */}
                  <div className="lg:col-span-8 w-full">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1.5"><Monitor size={14} className="text-emerald-600" /> Desktop Web View</span>
                      <span className="text-[11px] font-normal lowercase text-slate-400">Click buttons to test live modals</span>
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
                      <span className="text-[11px] font-normal text-emerald-600 font-bold">Pond-Side Ready</span>
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#062319]/90 via-[#062319]/60 to-[#062319]/90" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center text-white space-y-4">
          <FadeIn>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-widest border border-emerald-400/30">
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

      {/* ─── 6. POND TYPES & SYSTEMS (ACTUAL APP SYSTEMS & NO DEAD LINKS) ───────── */}
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
                      Designed for backyard and urban fish farming. Track water aeration, feeding schedules, and multi-vat inventory.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Vat Inventory Tracking
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Field 4: Fingerling Nursery & Grading Tanks (REPLACING Flow-Through) */}
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
                      Dedicated staging tanks for sorting shooters, early-stage fry feeding (0.5mm - 1.2mm), and staging partial batch transfers into grow-out ponds.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                      Nursery & Batch Transfers
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── 7. TESTIMONIALS (NIGERIAN FARMERS) ───────────────────────────────── */}
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
                quote: "Adding my farm attendants to Pondtora allows them to record morning and evening feeds while I am at my main job in Ikeja. I review the daily operational checklist every night.",
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
                quote: "The staff assessment exam helped us discover that two new attendants didn't understand how to measure dissolved oxygen. We retrained them before stocking our high-value broodstock.",
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

      {/* ─── 8. PRICING SECTION ──────────────────────────────────────────────── */}
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

      {/* ─── 9. FAQ SECTION ──────────────────────────────────────────────────── */}
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
                q: "Can my staff record daily feeding and reports from their mobile phones?",
                a: "Yes! Pondtora is fully responsive and optimized for mobile smartphones. Your attendants can log daily morning and evening feeds, record mortality, and submit the daily operational safety checklist right beside the pond.",
              },
              {
                q: "Can I manage my fish farm while I am away or living in another state?",
                a: "Absolutely. Pondtora allows you to invite your farm manager and attendants, assign them specific roles, and see their feeding logs, feed deductions, and daily reports in real-time from anywhere in Nigeria or abroad.",
              },
              {
                q: "How does the maximum kg limit per pallet work?",
                a: "When you restock or edit a pond, you can specify the maximum cumulative feed limit (in kg) for specific pallet sizes like 2mm, 3mm, or 4mm. As your staff logs daily feeding, Pondtora tracks the total and triggers warning alerts so you don't waste expensive starter feed on mature fish.",
              },
              {
                q: "Can staff view our farm profits or customer invoice revenue?",
                a: "No, unless you explicitly grant them permission. With Pondtora's granular staff permissions, attendants only see Feeding Records or Reports, keeping all Financial Dashboards and Customer Invoices private to the farm owner.",
              },
              {
                q: "What is the Staff Assessment feature?",
                a: "Pondtora includes built-in aquaculture knowledge exams covering 12 vital domains including fish feeding, dissolved oxygen, disease symptoms, and SOPs. You can test your workers before assigning them to sensitive fingerling tanks.",
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

      {/* ─── 10. FINAL CTA BANNER ────────────────────────────────────────────── */}
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

      {/* ─── 11. FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[#062319] text-white pt-16 pb-12 border-t border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-emerald-900/60">
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

            <div>
              <p className="text-xs uppercase tracking-widest font-black text-emerald-400 mb-3">Platform Features</p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><button onClick={() => { setActiveSolutionTab("ponds"); scrollTo("solutions"); }} className="hover:text-white">Pond Management</button></li>
                <li><button onClick={() => { setActiveSolutionTab("feeding"); scrollTo("solutions"); }} className="hover:text-white">Feeding Records & Limits</button></li>
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

      {/* ─── INTERACTIVE WORKING MODALS ───────────────────────────────────────── */}
      {/* 1. Log Feeding Modal */}
      {activeModal === "log_feeding" && (
        <ShowcaseModal title="Log Daily Pond Feeding (Live Demo)" onClose={() => setActiveModal(null)}>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Select Pond</label>
            <select
              value={feedPond}
              onChange={e => setFeedPond(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option>Pond 01 (Concrete Nursery · 8,500 fish)</option>
              <option>Pond 02 (Earthen Grow-Out · 14,200 fish)</option>
              <option>Pond 03 (Tarpaulin Vat · 4,200 fish)</option>
              <option>Pond 04 (Earthen Tilapia · 9,600 fish)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Morning Feed (kg)</label>
              <input
                type="number"
                step="0.5"
                value={feedMorning}
                onChange={e => setFeedMorning(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Evening Feed (kg)</label>
              <input
                type="number"
                step="0.5"
                value={feedEvening}
                onChange={e => setFeedEvening(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Feed Brand & Pallet Size</label>
            <select
              value={feedSize}
              onChange={e => setFeedSize(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
            >
              <option>Coppens 1.2 mm Starter</option>
              <option>Durante 2.0 mm Floating</option>
              <option>Vital Feed 3.0 mm Grow-Out</option>
              <option>Propac 4.0 mm Commercial</option>
            </select>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center text-xs">
            <span className="text-emerald-800 font-medium">Calculated Daily Total:</span>
            <span className="font-bold text-emerald-900 font-['Barlow_Condensed',sans-serif] text-base">
              {(Number(feedMorning) + Number(feedEvening)).toFixed(1)} kg
            </span>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert(`Feeding record logged successfully! ${(Number(feedMorning) + Number(feedEvening)).toFixed(1)} kg recorded for ${feedPond}.`);
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Save Feeding Record
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}

      {/* 2. Submit Daily Report Modal */}
      {activeModal === "submit_report" && (
        <ShowcaseModal title="Submit Daily Operational Checklist" onClose={() => setActiveModal(null)}>
          <p className="text-[11px] text-slate-500">
            Attendants submit this routine checklist before leaving the farm each evening.
          </p>

          <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">1. Fed all assigned ponds today?</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReportFed("Yes")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportFed === "Yes" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReportFed("No")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportFed === "No" ? "bg-rose-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">2. All pond drainage outlets locked?</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReportLocked("Yes")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportLocked === "Yes" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReportLocked("Not Me")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportLocked === "Not Me" ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Not Me
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">3. Pumps & electrical devices off?</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReportPumps("Yes")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportPumps === "Yes" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReportPumps("No")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportPumps === "No" ? "bg-rose-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  No
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">4. Equipment properly locked in store?</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setReportEquip("Yes")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportEquip === "Yes" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setReportEquip("No")}
                  className={`px-2.5 py-1 rounded text-xs font-bold ${reportEquip === "No" ? "bg-rose-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}
                >
                  No
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Additional Attendant Notes (Optional)</label>
            <textarea
              value={reportNotes}
              onChange={e => setReportNotes(e.target.value)}
              placeholder="e.g. Pond 02 water flushed for 30 mins; all fish active."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800 h-16 resize-none"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert("Daily report submitted! Your farm supervisor can now view your checklist and verification timestamp.");
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Send size={13} /> Submit Checklist
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}

      {/* 3. Invite Staff Modal */}
      {activeModal === "invite_staff" && (
        <ShowcaseModal title="Invite Staff Member (Live Demo)" onClose={() => setActiveModal(null)}>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Staff Full Name</label>
            <input
              type="text"
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="e.g. Funmi Adeyemi"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Email Address</label>
            <input
              type="email"
              value={staffEmail}
              onChange={e => setStaffEmail(e.target.value)}
              placeholder="funmi@farm.ng"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Role Assignment</label>
            <select
              value={staffRole}
              onChange={e => setStaffRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800"
            >
              <option>Feeding Staff</option>
              <option>Farm Manager</option>
              <option>General Attendant</option>
              <option>Admin / Director</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Granular Permissions</label>
            <div className="border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs bg-slate-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                <span>Feeding Records (Pond-side logging)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded text-emerald-600" />
                <span>Daily Operational Reports</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-emerald-600" />
                <span>Feed Stock Inventory</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-emerald-600" />
                <span>Financial Dashboard & Invoices (Restricted)</span>
              </label>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert(`Invitation link created for ${staffName || "Staff Member"} as ${staffRole}! They will only access the assigned permissions.`);
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Mail size={13} /> Send Staff Invite
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}

      {/* 4. Add Feed Stock Modal */}
      {activeModal === "add_stock" && (
        <ShowcaseModal title="Restock Feed Inventory (Live Demo)" onClose={() => setActiveModal(null)}>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Feed Brand</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800">
              <option>Durante</option>
              <option>Vital Feed</option>
              <option>Coppens</option>
              <option>Propac</option>
              <option>Aller Aqua</option>
              <option>Raanan Fish Feed</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Pallet Size</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800">
                <option>2.0 mm</option>
                <option>3.0 mm</option>
                <option>4.0 mm</option>
                <option>6.0 mm</option>
                <option>1.2 mm Starter</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Bags Quantity</label>
              <input type="number" defaultValue="20" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Weight / Bag (kg)</label>
              <input type="number" defaultValue="25" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Cost / Bag (₦)</label>
              <input type="number" defaultValue="8500" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert("Feed stock recorded! 20 bags (500 kg) added to warehouse inventory.");
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Add To Stockroom
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}

      {/* 5. Take Aquaculture Quiz / Staff Assessment Modal */}
      {activeModal === "take_quiz" && (
        <ShowcaseModal title="Staff Aquaculture Competency Exam (Live Question)" onClose={() => { setActiveModal(null); setQuizSubmitted(false); setQuizAnswer(null); }}>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
            <span className="font-bold uppercase text-[10px] tracking-wider text-emerald-800 block mb-0.5">
              Category: Water Flow-Through & Quality Management
            </span>
            <p className="font-semibold text-sm">
              Question 4: What is the primary operational purpose of water flow-through in pond systems?
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {[
              "A. To cool the pond water on sunny afternoons",
              "B. To flush dissolved ammonia waste and replenish oxygen levels",
              "C. To increase water temperature during night cycles",
              "D. To force fish to feed more aggressively"
            ].map((opt, idx) => (
              <label
                key={idx}
                onClick={() => !quizSubmitted && setQuizAnswer(idx)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  quizAnswer === idx
                    ? "border-emerald-600 bg-emerald-50 font-bold text-emerald-900"
                    : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  quizAnswer === idx ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300"
                }`}>
                  {quizAnswer === idx && <Check size={10} />}
                </div>
                <span>{opt}</span>
              </label>
            ))}
          </div>

          {quizSubmitted && (
            <div className={`p-3 rounded-xl border text-xs ${
              quizAnswer === 1
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              <p className="font-bold">
                {quizAnswer === 1 ? "✓ Correct! (Score: 100%)" : "✗ Incorrect. The correct answer is B."}
              </p>
              <p className="mt-0.5 text-[11px]">
                Water flow-through and flushing flushes toxic ammonia spikes and replenishes critical dissolved oxygen for high-density stocking.
              </p>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            {!quizSubmitted ? (
              <button
                disabled={quizAnswer === null}
                onClick={() => setQuizSubmitted(true)}
                className="flex-1 py-2.5 bg-[#00bb58] disabled:opacity-50 hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={() => { setActiveModal(null); setQuizSubmitted(false); setQuizAnswer(null); }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Close Scorecard
              </button>
            )}
          </div>
        </ShowcaseModal>
      )}

      {/* 6. Pond Detail Modal */}
      {activeModal === "pond_detail" && (
        <ShowcaseModal title="Pond 01 — Concrete Nursery Detail" onClose={() => setActiveModal(null)}>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Stock</span>
              <span className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">8,500 pcs</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Species</span>
              <span className="text-base font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">Catfish</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Mortality</span>
              <span className="text-base font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif]">0.6%</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between"><span>Stocking Date:</span><strong>12 Aug 2026</strong></div>
            <div className="flex justify-between"><span>Pond Dimensions:</span><strong>60 ft × 40 ft (Concrete)</strong></div>
            <div className="flex justify-between"><span>Feed Assigned:</span><strong>Coppens 1.2 mm Starter</strong></div>
            <div className="flex justify-between"><span>Cumulative Feed:</span><strong>142.5 kg</strong></div>
          </div>

          <button
            onClick={() => setActiveModal(null)}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Close Overview
          </button>
        </ShowcaseModal>
      )}

      {/* 7. Invoice Receipt Modal */}
      {activeModal === "invoice_preview" && (
        <ShowcaseModal title="Receipt — INV-2026-084" onClose={() => setActiveModal(null)}>
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50 text-xs">
            <div className="flex justify-between items-start border-b border-slate-200 pb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900 font-['Barlow_Condensed',sans-serif]">Crown Fisheries Ltd</h4>
                <p className="text-[11px] text-slate-500">Epe Farm Station, Lagos</p>
              </div>
              <span className="font-mono font-bold text-emerald-700">INV-2026-084</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Billed To:</span>
              <strong className="text-slate-800">Bodija Fresh Fish Market</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Harvested From:</span>
              <strong className="text-slate-800">Pond 02 (Earthen Grow-Out)</strong>
            </div>
            <div className="flex justify-between text-[11px]">
              <span>Fish Sold:</span>
              <strong className="text-slate-800">740 kg @ ₦2,500/kg</strong>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
              <span>Grand Total:</span>
              <span className="text-emerald-700">₦1,850,000</span>
            </div>
          </div>

          <button
            onClick={() => {
              alert("Thermal receipt ready for WhatsApp sharing or printing.");
              setActiveModal(null);
            }}
            className="w-full py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer size={13} /> Print / Share Invoice
          </button>
        </ShowcaseModal>
      )}

      {/* 8. Add Pond Modal */}
      {activeModal === "add_pond" && (
        <ShowcaseModal title="Add New Pond to Farm" onClose={() => setActiveModal(null)}>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Pond Name / ID</label>
            <input type="text" defaultValue="Pond 05" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Pond Construction Type</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800">
              <option>Concrete Tank</option>
              <option>Earthen Pond</option>
              <option>Tarpaulin / Mobile Vat</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Fish Species</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800">
              <option>Catfish (Clarias / Heterobranchus)</option>
              <option>Tilapia (Oreochromis niloticus)</option>
              <option>Carp</option>
            </select>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert("New pond created successfully!");
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Create Pond
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}

      {/* 9. Create Invoice Modal */}
      {activeModal === "create_invoice" && (
        <ShowcaseModal title="Create Customer Sales Invoice" onClose={() => setActiveModal(null)}>
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">Buyer / Market Woman Name</label>
            <input type="text" placeholder="e.g. Mile 12 Fish Depot" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Weight Sold (kg)</label>
              <input type="number" defaultValue="500" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Price / Kg (₦)</label>
              <input type="number" defaultValue="2500" className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-800" />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                alert("Invoice generated! Total ₦1,250,000 billed.");
                setActiveModal(null);
              }}
              className="flex-1 py-2.5 bg-[#00bb58] hover:bg-[#00a84e] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Generate Invoice
            </button>
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </ShowcaseModal>
      )}
    </div>
  );
}
