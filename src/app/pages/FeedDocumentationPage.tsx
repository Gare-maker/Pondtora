import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus, CheckCircle, X, Layers, Droplets,
  ChevronDown, ChevronLeft, ChevronRight,
  Package, BookOpen, Download, FileText, Pencil, Trash2, MoreVertical, Lock, History, Fish, Search, AlertTriangle, AlertCircle, Eye
} from "lucide-react";
import { toast } from "sonner";
import type { FeedingRecord, FeedEditEntry, Pond, FeedItem, BagOpenLog, FeedRemainingLog } from "../types";
import { TODAY, toMon, toYr, uid, downloadCSV, openPrintWindow, formatFishStockDate, formatFishStock, fmtStockingDate, isSameDate, FEED_SIZES, FEED_BRANDS, getPondFishStock } from "../data";
import { Card, PBtn, Pagination, PER_PAGE, StatCard, F, IC, SC, SearchableSelect, Bdg, DateInput, NumInput } from "../shared";

interface BulkRow {
  pondId: string;
  pondName: string;
  initialStock: number;
  currentCount: number;
  size: string;
  morning: string;
  evening: string;
  morningTime: string;
  eveningTime: string;
  fishStock: string;
  stockDate: string;
}

const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MIDX_GLOBAL: { [k: string]: number } = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
type ReconStatus = "matched" | "remaining_mismatch" | "bag_mismatch" | "feed_qty_mismatch" | "multiple_mismatches";
const STATUS_CFG: { [k: string]: { cls: string; label: string; rowBg: string } } = {
  matched: { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200/70", label: "Balanced", rowBg: "hover:bg-slate-50" },
  remaining_mismatch: { cls: "bg-amber-50 text-amber-700 border border-amber-200/70", label: "Remaining Discrepancy", rowBg: "hover:bg-slate-50" },
  bag_mismatch: { cls: "bg-orange-50 text-orange-700 border border-orange-200/70", label: "Bag Discrepancy", rowBg: "hover:bg-slate-50" },
  feed_qty_mismatch: { cls: "bg-red-50 text-red-700 border border-red-200/70", label: "Feed Qty Discrepancy", rowBg: "hover:bg-slate-50" },
  multiple_mismatches: { cls: "bg-red-50 text-red-700 border border-red-200/70", label: "Multiple Discrepancies", rowBg: "hover:bg-slate-50" },
};

const toDateLabel = (dStr: string): string => {
  if (!dStr) return "";
  const trimmed = dStr.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const mIdx = parseInt(iso[2], 10) - 1;
    const day = parseInt(iso[3], 10);
    return `${MON_NAMES[mIdx] || iso[2]} ${day}`;
  }
  return trimmed;
};

interface FishStockOption {
  id: string;
  name: string;
  stockDate: string;
  species: string;
  ponds: string[];
  label: string;
}

export type ReconRow = {
  fishStock: string;
  stockDate: string;
  brand: string;
  size: string;
  ponds: string[];
  totalFed: number;
  carryover: number;
  netNeeded: number;
  bagWeight: number;
  expectedBags: number;
  recordedBags: number;
  kgOpened: number;
  kgConsumed: number;
  remainingKg: number;
  expectedRemaining: number;
  recordedRemaining: number;
  status: ReconStatus;
  reason: string;
};

export type MergedBagRow = {
  brand: string;
  size: string;
  fishStock: string;
  stockDate: string;
  bagsOpened: number;
  totalKgOpened: number;
  remainingKg: number;
  lastBagLog: BagOpenLog | null;
};

export type BagRow = {
  id?: string;
  fishStock: string;
  brand: string;
  size: string;
  kgPerBag: number;
  qty: string;
  remainingKg: string;
};

export type RemainRow = {
  id?: string;
  brand: string;
  size: string;
  fishStock: string;
  remainingKg: string;
};

export type LogColKey = "size" | "morning" | "morningTime" | "evening" | "eveningTime" | "total";

function FeedDocumentation({
  feedingRecords = [],
  onAddRecord,
  onEditFeedRecord,
  onDeleteRecord,
  ponds = [],
  inventory = [],
  bagLogs = [],
  onAddBagLog,
  onEditBagLog,
  onEditInv,
  remainLogs = [],
  onAddRemainLog,
  onEditRemainLog,
  onReconMismatches,
  reconFocus,
  canEditLocked,
  currentUser,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  feedingRecords: FeedingRecord[];
  onAddRecord: (r: FeedingRecord) => void | Promise<void>;
  onEditFeedRecord: (r: FeedingRecord) => void | Promise<void>;
  onDeleteRecord?: (id: string) => void | Promise<void>;
  ponds: Pond[];
  inventory: FeedItem[];
  bagLogs: BagOpenLog[];
  onAddBagLog: (b: BagOpenLog) => void | Promise<void>;
  onEditBagLog?: (b: BagOpenLog) => void | Promise<void>;
  onEditInv?: (f: FeedItem) => void;
  remainLogs: FeedRemainingLog[];
  onAddRemainLog: (r: FeedRemainingLog) => void | Promise<void>;
  onEditRemainLog: (r: FeedRemainingLog) => void | Promise<void>;
  onReconMismatches?: (m: { date: string; brand: string; size: string; fishStock: string; key: string; status: string; reason: string }[]) => void;
  reconFocus?: { date: string; key: string } | null;
  canEditLocked?: boolean;
  currentUser?: { name: string; email: string };
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const realTodayLabel = (() => { const n = new Date(); return `${MON_NAMES[n.getMonth()]} ${n.getDate()}`; })();
  const isRecordEditable = (dateLabel?: string | null) => canEditLocked || (dateLabel ? isSameDate(dateLabel, TODAY) || isSameDate(dateLabel, realTodayLabel) : false);

  /* ── ui state ── */
  const [showLog, setShowLog] = useState(false);
  const [feedErr, setFeedErr] = useState<Record<string, string>>({});
  const [showCal, setShowCal] = useState(false);
  const [showBagsModal, setShowBagsModal] = useState(false);
  const [bagsErr, setBagsErr] = useState<Record<string, string>>({});
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<"daily" | "bags" | "reconciliation">("daily");
  const [bagsHighlight, setBagsHighlight] = useState<{
    stock: string;
    size: string;
    brand?: string;
    col?: "bags" | "remaining" | "all";
  } | null>(null);
  const [reconExpanded, setReconExpanded] = useState<string | null>(null);
  const [feedMobileMenuOpen, setFeedMobileMenuOpen] = useState(false);
  const [feedMenuPlacement, setFeedMenuPlacement] = useState<"left" | "right">("left");
  const feedMobileMenuRef = useRef<HTMLDivElement>(null);
  const [viewBagDetail, setViewBagDetail] = useState<MergedBagRow | null>(null);
  const [activeDailyMenuId, setActiveDailyMenuId] = useState<string | null>(null);
  const [activeBagMenuId, setActiveBagMenuId] = useState<string | null>(null);
  const [activeReconMenuId, setActiveReconMenuId] = useState<string | null>(null);

  /* ── Feeding Status Filter: all | fed | not_fed ── */
  const [feedStatusFilter, setFeedStatusFilter] = useState<"all" | "fed" | "not_fed">("all");

  /* ── helper to navigate from recon to bags tab with column highlight ── */
  const goToOpenedBags = (fishStock: string, size: string, brand?: string, col: "bags" | "remaining" | "all" = "all") => {
    setPopupRecon(null);
    setDocTab("bags");
    setBagsHighlight({ stock: fishStock, size, brand, col });
  };

  /* ── search state for tabs ── */
  const [dailySearch, setDailySearch] = useState("");
  const [bagsSearch, setBagsSearch] = useState("");
  const [reconSearch, setReconSearch] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (feedMobileMenuRef.current && !feedMobileMenuRef.current.contains(e.target as Node)) setFeedMobileMenuOpen(false);
      setActiveDailyMenuId(null);
      setActiveBagMenuId(null);
      setActiveReconMenuId(null);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, []);

  /* ── derived ── */
  const activePonds = (ponds || []).filter(p => p && p.status === "Active");
  const allBrands = [...new Set((inventory || []).map(f => f?.brand).filter(Boolean))];

  /* Available pellet sizes drawn from all pellets in Feed Stock (inventory & opened bags) */
  const availablePelletSizes = useMemo(() => {
    const fromInv = (inventory || []).map(f => f?.size).filter(Boolean);
    const fromBags = (bagLogs || []).map(b => b?.size).filter(Boolean);
    const combined = [...new Set([...fromInv, ...fromBags])];
    if (combined.length > 0) {
      return combined.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
    }
    return FEED_SIZES;
  }, [inventory, bagLogs]);

  /* Brand filtering based on Feed Stock inventory */
  const invBrands = useMemo(() => {
    const brandsFromInv = [...new Set((inventory || []).map(f => f?.brand).filter(Boolean))];
    return brandsFromInv.length > 0 ? brandsFromInv : (allBrands.length > 0 ? allBrands : FEED_BRANDS);
  }, [inventory, allBrands]);

  const invSizesForBrand = (brand: string) => {
    if (!brand) return availablePelletSizes;
    const brandItems = (inventory || []).filter(f => f && f.brand === brand);
    const sizesFromBrand = [...new Set(brandItems.map(f => f?.size).filter(Boolean))];
    if (sizesFromBrand.length > 0) return sizesFromBrand;
    return availablePelletSizes;
  };

  /* Helper to check current available stock for a Brand + Pellet Size */
  const getStockAvailable = (brand: string, size: string, excludeBagLogId?: string) => {
    const invItems = (inventory || []).filter(f => f && f.brand === brand && f.size === size);
    const totalPurchasedKg = invItems.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || 15))), 0);
    const totalPurchasedBags = invItems.reduce((s, f) => s + (Number(f.bags) || 0), 0);
    const weightPerBag = invItems[0]?.weightPerBag || 15;

    const openedLogs = (bagLogs || []).filter(b => b && b.brand === brand && b.size === size && (excludeBagLogId ? b.id !== excludeBagLogId : true));
    const totalOpenedBags = openedLogs.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
    const totalOpenedKg = openedLogs.reduce((s, b) => s + (Number(b.totalKg) || (Number(b.bagsOpened) * (Number(b.kgPerBag) || weightPerBag))), 0);

    const remainingBags = Math.max(0, totalPurchasedBags - totalOpenedBags);
    const remainingKg = Math.max(0, totalPurchasedKg - totalOpenedKg);

    return {
      weightPerBag,
      totalPurchasedKg,
      totalPurchasedBags,
      totalOpenedKg,
      totalOpenedBags,
      remainingBags,
      remainingKg,
      exists: invItems.length > 0
    };
  };

  /* Helper to check current available stock for a Pellet Size across inventory and feedings */
  const getPelletStock = (size: string, excludeRecordId?: string) => {
    if (!size) return { availableQty: 0, availableKg: 0, inStockBags: 0, totalPurchasedBags: 0, totalPurchasedKg: 0, totalFedKg: 0, exists: false };
    const invItems = (inventory || []).filter(f => f && f.size === size);
    const totalPurchasedBags = invItems.reduce((s, f) => s + (Number(f.bags) || 0), 0);
    const weightPerBag = invItems[0]?.weightPerBag || 15;
    const totalPurchasedKg = invItems.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || weightPerBag))), 0);
    const exists = invItems.length > 0 && (totalPurchasedBags > 0 || totalPurchasedKg > 0);

    const openedLogs = (bagLogs || []).filter(b => b && b.size === size);
    const totalOpenedBags = openedLogs.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
    const inStockBags = Math.max(0, totalPurchasedBags - totalOpenedBags);

    const relevantFeeding = (feedingRecords || []).filter(fr => fr && fr.size === size && (excludeRecordId ? fr.id !== excludeRecordId : true));
    const totalFedKg = relevantFeeding.reduce((s, fr) => s + (Number(fr.total) || ((Number(fr.morning) || 0) + (Number(fr.evening) || 0))), 0);
    const totalOpenedKg = openedLogs.reduce((s, b) => s + (Number(b.totalKg) || (Number(b.bagsOpened) * (Number(b.kgPerBag) || weightPerBag))), 0);
    const remainingOpenedKg = Math.max(0, totalOpenedKg - totalFedKg);
    const availableKg = Math.max(0, (inStockBags * weightPerBag) + remainingOpenedKg);

    // Available pallet quantity dynamically reflects actual Feed Stock inventory
    const availableQty = inStockBags;

    return {
      availableQty,
      availableKg,
      inStockBags,
      totalPurchasedBags,
      totalPurchasedKg,
      totalFedKg,
      exists
    };
  };

  /* ── calendar ── */
  const _td = new Date();
  const [viewYear, setViewYear] = useState(_td.getFullYear());
  const [viewMonth, setViewMonth] = useState(_td.getMonth());
  const [selDate, setSelDate] = useState(`${MON_NAMES[_td.getMonth()]} ${_td.getDate()}`);
  const navMonth = (dir: number) => { let m = viewMonth + dir, y = viewYear; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setViewMonth(m); setViewYear(y); };
  const curMonLabel = MON_NAMES[viewMonth];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const calCells = Array(42).fill(null).map((_, i) => { const d = i - firstDayOfWeek + 1; return (d >= 1 && d <= daysInMonth) ? d : null; });

  const daysWithRec = useMemo(() => {
    const set = new Set<number>();
    const processDate = (dStrRaw?: string | null, mStr?: string | null, yNum?: number | null) => {
      if (!dStrRaw) return;
      const dStr = String(dStrRaw).trim();
      if (mStr === curMonLabel && (!yNum || yNum === viewYear)) {
        const parts = dStr.split(" ");
        if (parts.length >= 2) {
          const d = parseInt(parts[1], 10);
          if (!isNaN(d)) { set.add(d); return; }
        }
      }
      const iso = dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) {
        const y = parseInt(iso[1], 10);
        const m = parseInt(iso[2], 10);
        const d = parseInt(iso[3], 10);
        if (y === viewYear && m === (viewMonth + 1) && !isNaN(d)) { set.add(d); return; }
      }
      const mon = dStr.match(/^([A-Za-z]{3})\s+(\d{1,2})/);
      if (mon) {
        const mName = mon[1];
        const d = parseInt(mon[2], 10);
        if (mName.toLowerCase() === curMonLabel.toLowerCase() && (!yNum || yNum === viewYear) && !isNaN(d)) {
          set.add(d); return;
        }
      }
    };
    (feedingRecords || []).forEach(r => r && processDate(r.date,r.month,r.year));
    (bagLogs || []).forEach(b => b && processDate(b.date,b.month,b.year));
    (remainLogs || []).forEach(rem => rem && processDate(rem.date,rem.month,rem.year));
    return set;
  }, [feedingRecords, bagLogs, remainLogs, curMonLabel, viewYear, viewMonth]);

  const { selMonLabel, selDay, selYear } = useMemo(() => {
    if (!selDate) return { selMonLabel: curMonLabel, selDay: 0, selYear: viewYear };
    const iso = selDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const y = parseInt(iso[1], 10);
      const m = parseInt(iso[2], 10) - 1;
      const d = parseInt(iso[3], 10);
      return { selMonLabel: MON_NAMES[m] || curMonLabel, selDay: d, selYear: y };
    }
    const parts = selDate.trim().split(" ");
    if (parts.length >= 2) {
      return { selMonLabel: parts[0], selDay: parseInt(parts[1], 10) || 0, selYear: viewYear };
    }
    return { selMonLabel: curMonLabel, selDay: 0, selYear: viewYear };
  }, [selDate, curMonLabel, viewYear]);
  const isSelInView = selMonLabel === curMonLabel && (!selYear || selYear === viewYear);

  /* ── pondToStock & normalizeFishStock helpers ── */
  const pondToStock = (pondName: string): string => {
    if (!pondName) return "General Stock";
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === pondName.toLowerCase().trim());
    if (!p) return pondName;
    return getPondFishStock(p);
  };

  const pondToStockDate = (pondName: string): string => {
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === (pondName || "").toLowerCase().trim());
    if (!p || !p.stockingDate || p.stockingDate === "—") return "—";
    return formatFishStockDate(p.stockingDate);
  };

  const normalizeFishStock = (stock?: string | null): string => {
    if (!stock || stock === "—" || typeof stock !== "string" || !stock.trim()) return "—";
    const trimmed = stock.trim();
    const matchingPond = (ponds || []).find(p => p && p.name && typeof p.name === "string" && p.name.toLowerCase().trim() === trimmed.toLowerCase());
    if (matchingPond) {
      return pondToStock(matchingPond.name);
    }
    const activeStock = (ponds || []).map(p => p ? getPondFishStock(p) : "").find(s => s && typeof s === "string" && s.toLowerCase().trim() === trimmed.toLowerCase());
    if (activeStock) {
      return activeStock;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const formatted = formatFishStockDate(trimmed);
      if (formatted && formatted !== "—") return formatted;
    }
    return formatFishStock(trimmed);
  };

  const isStockMatch = (stockA?: string | null, stockB?: string | null): boolean => {
    if (!stockA || !stockB) return false;
    if (stockA === "—" || stockB === "—") return false;
    const a = stockA.trim().toLowerCase();
    const b = stockB.trim().toLowerCase();
    if (a === b) return true;

    const na = normalizeFishStock(stockA).trim().toLowerCase();
    const nb = normalizeFishStock(stockB).trim().toLowerCase();
    if (na === nb && na !== "—") return true;

    const fa = formatFishStock(stockA).trim().toLowerCase();
    const fb = formatFishStock(stockB).trim().toLowerCase();
    if (fa === fb && fa !== "—") return true;

    const pA = (ponds || []).find(p => p && p.name && p.name.toLowerCase().trim() === a);
    if (pA) {
      const psA = getPondFishStock(pA).trim().toLowerCase();
      if (psA === b || psA === nb || psA === fb) return true;
      if (pA.stockingDate && formatFishStockDate(pA.stockingDate).trim().toLowerCase() === b) return true;
      if (pA.fishStock && pA.fishStock.trim().toLowerCase() === b) return true;
    }
    const pB = (ponds || []).find(p => p && p.name && p.name.toLowerCase().trim() === b);
    if (pB) {
      const psB = getPondFishStock(pB).trim().toLowerCase();
      if (psB === a || psB === na || psB === fa) return true;
      if (pB.stockingDate && formatFishStockDate(pB.stockingDate).trim().toLowerCase() === a) return true;
      if (pB.fishStock && pB.fishStock.trim().toLowerCase() === a) return true;
    }

    return false;
  };

  const getStockDisplayName = (fishStock?: string | null, stockDate?: string | null): string => {
    if (stockDate && stockDate !== "—" && stockDate !== "General Stock") {
      const fmt = formatFishStockDate(stockDate);
      if (fmt && fmt !== "—") return fmt;
      return stockDate;
    }
    if (!fishStock || fishStock === "—") return "—";
    if (/^\d{4}-\d{2}-\d{2}$/.test(fishStock)) {
      const fmt = formatFishStockDate(fishStock);
      if (fmt && fmt !== "—") return fmt;
    }
    const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fishStock || p.name === fishStock || isStockMatch(p.name, fishStock)));
    if (matchingPond?.stockingDate && matchingPond.stockingDate !== "—") {
      const fmt = formatFishStockDate(matchingPond.stockingDate);
      if (fmt && fmt !== "—") return fmt;
    }
    return formatFishStock(fishStock);
  };

  /* ── reconFocus effect ── */
  useEffect(() => {
    if (!reconFocus || !reconFocus.date) return;
    let m = viewMonth;
    if (/^\d{4}-\d{2}-\d{2}/.test(reconFocus.date)) {
      const parts = reconFocus.date.split("-");
      m = parseInt(parts[1], 10) - 1;
      setViewYear(parseInt(parts[0], 10));
    } else {
      const parts = reconFocus.date.split(" ");
      m = MIDX_GLOBAL[parts[0]] ?? viewMonth;
    }
    setViewMonth(m); setDocTab("reconciliation"); setSelDate(reconFocus.date); setReconExpanded(reconFocus.key);
  }, [reconFocus]);

  /* ── activeFishStockOptions for Bags Opened & Tracking ── */
  const activeFishStockOptions = useMemo((): FishStockOption[] => {
    const map = new Map<string, FishStockOption>();
    const pool = [...activePonds, ...(ponds || []).filter(p => p && !activePonds.some(ap => ap.id === p.id))];
    pool.forEach(p => {
      const stockName = getPondFishStock(p);
      const dStr = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "";
      const existing = map.get(stockName);
      if (existing) {
        if (!existing.ponds.includes(p.name)) existing.ponds.push(p.name);
      } else {
        map.set(stockName, {
          id: stockName,
          name: stockName,
          stockDate: dStr || "—",
          species: p.species || "—",
          ponds: [p.name],
          label: `${stockName} — ${p.name}`
        });
      }
    });
    return Array.from(map.values()).map(opt => ({
      ...opt,
      label: `${opt.name} — Ponds: ${opt.ponds.join(", ")}`
    }));
  }, [activePonds, ponds]);

  /* ── reconRows (selDate only, grouped strictly by Fish Stock + Pellet Size + Brand across all ponds in that stock) ── */
  const reconRows = useMemo((): ReconRow[] => {
    const mIdx = MIDX_GLOBAL[selMonLabel] ?? viewMonth;
    const prevDt = new Date(selYear || viewYear, mIdx, (selDay || 1) - 1);
    const prevDate = `${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`;
    const keySet = new Set<string>();

    (feedingRecords || []).filter(r => r && isSameDate(r.date, selDate)).forEach(r => {
      const fs = pondToStock(r.pond);
      const brand = r.brand || "—";
      const size = r.size || "—";
      keySet.add(`${fs}||${size}||${brand}`);
    });
    (bagLogs || []).filter(b => b && isSameDate(b.date, selDate)).forEach(b => {
      const fs = normalizeFishStock(b.fishStock);
      const brand = b.brand || "—";
      const size = b.size || "—";
      if (fs && fs !== "—") keySet.add(`${fs}||${size}||${brand}`);
    });
    (remainLogs || []).filter(r => r && isSameDate(r.date, selDate)).forEach(r => {
      const fs = normalizeFishStock(r.fishStock);
      const brand = r.brand || "—";
      const size = r.size || "—";
      if (fs && fs !== "—") keySet.add(`${fs}||${size}||${brand}`);
    });

    const rows: ReconRow[] = [];
    for (const compositeKey of Array.from(keySet)) {
      const parts = compositeKey.split("||");
      const fishStock = parts[0];
      const size = parts[1];
      let brand = parts[2] || "—";

      // If brand is "—" or empty, try to resolve from bagLogs or remainLogs or inventory
      if (!brand || brand === "—") {
        const brandFromBag = (bagLogs || []).find(b => isSameDate(b.date, selDate) && b.size === size && isStockMatch(b.fishStock, fishStock) && b.brand)?.brand;
        const brandFromRemain = (remainLogs || []).find(r => isSameDate(r.date, selDate) && r.size === size && isStockMatch(r.fishStock, fishStock) && r.brand)?.brand;
        const brandFromFeed = (feedingRecords || []).find(r => isSameDate(r.date, selDate) && r.size === size && isStockMatch(r.pond, fishStock) && r.brand)?.brand;
        const brandFromInv = (inventory || []).find(f => f && f.size === size && f.brand)?.brand;
        brand = brandFromBag || brandFromRemain || brandFromFeed || brandFromInv || "—";
      }

      const pondsForStock = (ponds || []).filter(p => p && (isStockMatch(pondToStock(p.name), fishStock) || isStockMatch(p.name, fishStock))).map(p => p.name);

      const fedRecords = (feedingRecords || []).filter(r => {
        if (!r || !isSameDate(r.date, selDate)) return false;
        if (r.size && size && r.size.toLowerCase().trim() !== size.toLowerCase().trim()) return false;
        const matchesStock = isStockMatch(fishStock, r.fishStock) ||
                             isStockMatch(fishStock, pondToStock(r.pond)) ||
                             isStockMatch(fishStock, r.pond) ||
                             pondsForStock.some(pn => pn.toLowerCase().trim() === (r.pond || "").toLowerCase().trim());
        if (!matchesStock) return false;
        return (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0);
      });
      const fedPonds = Array.from(new Set(fedRecords.map(r => r.pond).filter(Boolean)));

      const totalFed = (feedingRecords || []).filter(r => {
        if (!r || !isSameDate(r.date, selDate)) return false;
        if (r.size && size && r.size.toLowerCase().trim() !== size.toLowerCase().trim()) return false;
        return isStockMatch(fishStock, r.fishStock) ||
               isStockMatch(fishStock, pondToStock(r.pond)) ||
               isStockMatch(fishStock, r.pond) ||
               pondsForStock.some(pn => pn.toLowerCase().trim() === (r.pond || "").toLowerCase().trim());
      }).reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      const matchingBagLogs = (bagLogs || []).filter(b =>
        b && isSameDate(b.date, selDate) &&
        (size === "—" || (b.size || "").toLowerCase().trim() === size.toLowerCase().trim()) &&
        (brand === "—" || !b.brand || b.brand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (!b.fishStock || isStockMatch(b.fishStock, fishStock))
      );
      // If multiple duplicate bag logs exist for the same stock, brand, and pallet on this day, use the single session amount
      const recordedBags = matchingBagLogs.length > 0 ? (Number(matchingBagLogs[matchingBagLogs.length - 1].bagsOpened) || 0) : 0;

      const carryoverLogs = (remainLogs || []).filter(r =>
        r && isSameDate(r.date, prevDate) &&
        (size === "—" || (r.size || "").toLowerCase().trim() === size.toLowerCase().trim()) &&
        isStockMatch(r.fishStock, fishStock)
      );
      const carryover = carryoverLogs.length > 0 ? (Number(carryoverLogs[carryoverLogs.length - 1].remainingKg) || 0) : 0;

      const matchingRemainLogs = (remainLogs || []).filter(r =>
        r && isSameDate(r.date, selDate) &&
        (size === "—" || (r.size || "").toLowerCase().trim() === size.toLowerCase().trim()) &&
        isStockMatch(r.fishStock, fishStock)
      );
      const recordedRemaining = matchingRemainLogs.length > 0 ? (Number(matchingRemainLogs[matchingRemainLogs.length - 1].remainingKg) || 0) : 0;

      // If neither feed nor bags nor remaining was logged, skip
      if (totalFed === 0 && recordedBags === 0 && recordedRemaining === 0) continue;

      const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && f.size.toLowerCase().trim() === size.toLowerCase().trim()) || (inventory || []).find(f => f && f.size.toLowerCase().trim() === size.toLowerCase().trim());
      const bagWeight = invItem?.weightPerBag || 15;
      const kgOpened = recordedBags * bagWeight;
      const kgConsumed = totalFed;
      const netNeeded = Math.max(0, kgConsumed - carryover);
      const expectedBags = netNeeded === 0 ? 0 : Math.ceil(netNeeded / bagWeight);
      const totalAvailableFeed = carryover + kgOpened;
      const expectedRemaining = (carryover === 0 && recordedBags === 0)
        ? 0
        : (carryover === 0 && kgOpened === 0 && kgConsumed === 0 && recordedRemaining > 0)
        ? recordedRemaining
        : Math.max(0, totalAvailableFeed - kgConsumed);
      const remainingKg = (carryover === 0 && recordedBags === 0)
        ? 0
        : Math.max(0, totalAvailableFeed - kgConsumed);
      const bagsDiff = Math.abs(expectedBags - recordedBags);
      const remainDiff = Math.abs(expectedRemaining - recordedRemaining);
      const feedQtyIssue = recordedBags > 0 && kgConsumed > carryover + kgOpened + 0.01;

      let status: ReconStatus;
      let reason = "";
      if (feedQtyIssue) {
        status = "feed_qty_mismatch";
        reason = `Feed given (${kgConsumed}kg) exceeds opened (${carryover + kgOpened}kg) by ${(kgConsumed - (carryover + kgOpened)).toFixed(1)}kg.`;
      } else if (kgConsumed === 0 && recordedBags > 0) {
        status = "bag_mismatch";
        reason = `${recordedBags} bag${recordedBags > 1 ? "s" : ""} opened (${kgOpened}kg); daily feeding session pending.`;
      } else if (recordedBags === 0 && kgConsumed > 0 && carryover < kgConsumed) {
        status = "bag_mismatch";
        reason = `Feed given (${kgConsumed}kg) but 0 bags opened recorded. Expected ${expectedBags} bag${expectedBags > 1 ? "s" : ""}.`;
      } else if (bagsDiff > 0 && recordedRemaining > 0 && remainDiff >= 1) {
        status = "multiple_mismatches";
        reason = `Bags: expected ${expectedBags}, recorded ${recordedBags}. Remaining: expected ${expectedRemaining}kg, recorded ${recordedRemaining}kg.`;
      } else if (bagsDiff > 0 && recordedBags !== expectedBags) {
        status = "bag_mismatch";
        reason = `Expected ${expectedBags} bags opened (${expectedBags * bagWeight}kg), recorded ${recordedBags} bags (${kgOpened}kg). Difference: ${bagsDiff} bag${bagsDiff > 1 ? "s" : ""}.`;
      } else if (recordedRemaining > 0 && remainDiff >= 1) {
        status = "remaining_mismatch";
        reason = `Expected ${expectedRemaining}kg remaining, recorded ${recordedRemaining}kg.`;
      } else {
        status = "matched";
        reason = "Feed given matches bags opened.";
      }

      const stockDate = (ponds || []).find(p => p && (pondToStock(p.name) === fishStock || isStockMatch(p.name, fishStock)))?.stockingDate || fishStock;

      rows.push({
        fishStock,
        stockDate: formatFishStockDate(stockDate),
        brand,
        size,
        ponds: fedPonds.length > 0 ? fedPonds : (pondsForStock.length > 0 ? pondsForStock : []),
        totalFed,
        carryover,
        netNeeded,
        bagWeight,
        expectedBags,
        recordedBags,
        kgOpened,
        kgConsumed,
        remainingKg,
        expectedRemaining,
        recordedRemaining,
        status,
        reason
      });
    }
    return rows;
  }, [feedingRecords, bagLogs, inventory, remainLogs, selDate, selMonLabel, selDay, selYear, viewYear, viewMonth, ponds]);

  /* ── reconciliation notifications ── */
  const onReconMismatchesRef = useRef(onReconMismatches);
  onReconMismatchesRef.current = onReconMismatches;
  const prevMismatchKeyRef = useRef<string>("");
  useEffect(() => {
    if (!onReconMismatchesRef.current) return;
    const ms = reconRows.filter(r => r.status !== "matched").map(r => ({ date: selDate, brand: r.brand, size: r.size, fishStock: r.fishStock, key: `${r.fishStock}__${r.brand}__${r.size}`, status: r.status, reason: r.reason }));
    const key = ms.map(m => `${m.date}|${m.key}|${m.status}`).join(",");
    if (key === prevMismatchKeyRef.current) return;
    prevMismatchKeyRef.current = key;
    onReconMismatchesRef.current(ms);
  }, [reconRows, selDate]);

  const hasMismatchOnSelDate = reconRows.some(r => r.status !== "matched");

  /* ── popup recon ── */
  const [popupRecon, setPopupRecon] = useState<ReconRow | null>(null);

  /* ── day view ── */
  const dayRecords = (feedingRecords || []).filter(r => r && isSameDate(r.date, selDate));
  const dayGrand = dayRecords.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const dayRows = activePonds.map(pond => { const rec = dayRecords.find(r => r.pond === pond.name); return { pond, rec }; });
  const totalPonds = activePonds.length;
  const pondsFedToday = [...new Set(dayRecords.map(r => r.pond))].length;
  const pondsRemaining = Math.max(0, totalPonds - pondsFedToday);
  const bagsOpenedToday = (bagLogs || []).filter(b => b && isSameDate(b.date, selDate)).reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);

  const filteredDayRows = useMemo(() => {
    let list = dayRows;
    if (feedStatusFilter === "fed") {
      list = list.filter(({ rec }) => !!rec);
    } else if (feedStatusFilter === "not_fed") {
      list = list.filter(({ rec }) => !rec);
    }
    if (!dailySearch.trim()) return list;
    const q = dailySearch.toLowerCase().trim();
    return list.filter(({ pond, rec }) => {
      const fs = pondToStock(pond.name);
      return (
        pond.name.toLowerCase().includes(q) ||
        (pond.species && pond.species.toLowerCase().includes(q)) ||
        fs.toLowerCase().includes(q) ||
        (rec?.size && rec.size.toLowerCase().includes(q)) ||
        (rec?.recordedBy && rec.recordedBy.toLowerCase().includes(q))
      );
    });
  }, [dayRows, dailySearch, feedStatusFilter, ponds]);

  /* ── edit feed record state ── */
  const [editRec, setEditRec] = useState<FeedingRecord | null>(null);
  const [viewFeedRec, setViewFeedRec] = useState<FeedingRecord | null>(null);

  const openEditRec = (rec: FeedingRecord) => setEditRec({ ...rec });

  const handleSaveEditAll = () => {
    if (!editRec) return;
    const newM = Number(editRec.morning) || 0;
    const newE = Number(editRec.evening) || 0;
    const toFeed = newM + newE;
    if (toFeed > 0 && editRec.size) {
      const stock = getPelletStock(editRec.size, editRec.id);
      if (!stock.exists) {
        toast.error(`Pellet size "${editRec.size}" is not available in Feed Inventory.`);
        return;
      }
      if (stock.availableKg <= 0) {
        toast.error(`Pellet size "${editRec.size}" is empty (0 kg remaining in stock). Cannot log feeding.`);
        return;
      }
      if (toFeed > stock.availableKg) {
        toast.error(`Insufficient stock for pellet size "${editRec.size}". Available: ${Math.round(stock.availableKg * 10) / 10} kg, requested: ${toFeed} kg.`);
        return;
      }
    }
    const original = (feedingRecords || []).find(r => r.id === editRec.id);
    const hasChange = newM !== (original?.morning ?? 0) || newE !== (original?.evening ?? 0) || editRec.size !== original?.size;
    const now = new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const entry: FeedEditEntry = { originalMorning: original?.morning ?? 0, updatedMorning: newM, originalEvening: original?.evening ?? 0, updatedEvening: newE, editedAt: now, editedBy: currentUser?.name || "—", editedById: currentUser?.email || "" };
    onEditFeedRecord({ ...editRec, morning: newM, evening: newE, total: newM + newE, editHistory: hasChange ? [...(editRec.editHistory || []), entry] : (editRec.editHistory || []) });
    setEditRec(null);
  };

  /* ── edit bag state ── */
  const [editDocBag, setEditDocBag] = useState<BagOpenLog | null>(null);
  const [editBagRemainKg, setEditBagRemainKg] = useState("");

  const openEditDocBag = (b: BagOpenLog) => {
    setEditDocBag({ ...b });
    const fs = normalizeFishStock(b.fishStock) || "";
    const existing = (remainLogs || []).find(r => isSameDate(r.date, b.date) && r.brand === b.brand && r.size === b.size && normalizeFishStock(r.fishStock) === fs);
    setEditBagRemainKg(existing ? String(existing.remainingKg) : "");
  };

  const openEditMergedRow = (row: MergedBagRow) => {
    const brand = row.brand && row.brand !== "—" ? row.brand : (invBrands[0] || "");
    const size = row.size && row.size !== "—" ? row.size : (invSizesForBrand(brand)[0] || "");
    const inv = (inventory || []).find(f => f && f.brand === brand && f.size === size);
    const kgPb = row.lastBagLog?.kgPerBag || inv?.weightPerBag || 15;

    const bLog: BagOpenLog = row.lastBagLog || {
      id: uid(),
      date: selDate,
      month: toMon(selDate),
      year: toYr(selDate),
      brand,
      size,
      kgPerBag: kgPb,
      bagsOpened: row.bagsOpened,
      totalKg: row.totalKgOpened || (row.bagsOpened * kgPb),
      fishStock: row.fishStock
    };

    setEditDocBag(bLog);
    const fs = normalizeFishStock(row.fishStock) || "";
    const existing = (remainLogs || []).find(r => isSameDate(r.date, selDate) && r.brand === brand && r.size === size && normalizeFishStock(r.fishStock) === fs);
    setEditBagRemainKg(existing ? String(existing.remainingKg) : (row.remainingKg > 0 ? String(row.remainingKg) : ""));
  };

  const handleSaveEditDocBag = () => {
    if (!editDocBag) return;
    const fs = normalizeFishStock(editDocBag.fishStock) || "";
    const brand = editDocBag.brand || "";
    const size = editDocBag.size || "";
    const bagsDate = editDocBag.date;

    const existingBag = (bagLogs || []).find(b => 
      b.id === editDocBag.id || 
      (isSameDate(b.date, bagsDate) && 
       (size === "—" || (b.size || "").toLowerCase().trim() === size.toLowerCase().trim()) && 
       (brand === "—" || !b.brand || !brand || b.brand.toLowerCase().trim() === brand.toLowerCase().trim()) && 
       (isStockMatch(b.fishStock, editDocBag.fishStock) || normalizeFishStock(b.fishStock) === fs))
    );

    if (existingBag) {
      onEditBagLog && onEditBagLog({
        ...existingBag,
        brand: editDocBag.brand,
        size: editDocBag.size,
        fishStock: fs || existingBag.fishStock,
        bagsOpened: editDocBag.bagsOpened,
        kgPerBag: editDocBag.kgPerBag,
        totalKg: editDocBag.bagsOpened * editDocBag.kgPerBag
      });
    } else if (editDocBag.bagsOpened > 0) {
      onAddBagLog && onAddBagLog({
        ...editDocBag,
        id: editDocBag.id || uid(),
        fishStock: fs || editDocBag.fishStock,
        totalKg: editDocBag.bagsOpened * editDocBag.kgPerBag
      });
    }

    const remKg = Number(editBagRemainKg);
    if (fs) {
      const existingRemain = (remainLogs || []).find(r => 
        isSameDate(r.date, bagsDate) &&
        (size === "—" || (r.size || "").toLowerCase().trim() === size.toLowerCase().trim()) &&
        (brand === "—" || !r.brand || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (isStockMatch(r.fishStock, editDocBag.fishStock) || normalizeFishStock(r.fishStock) === fs)
      );

      if (!isNaN(remKg) && remKg >= 0) {
        if (existingRemain) {
          onEditRemainLog && onEditRemainLog({
            ...existingRemain,
            brand: editDocBag.brand,
            size: editDocBag.size,
            fishStock: fs,
            remainingKg: remKg,
            date: bagsDate
          });
        } else {
          onAddRemainLog && onAddRemainLog({
            id: uid(),
            brand: editDocBag.brand,
            size: editDocBag.size,
            fishStock: fs,
            remainingKg: remKg,
            date: bagsDate
          });
        }
      }
    }
    setEditDocBag(null);
    toast.success("Updated successfully");
  };

  /* ── helper: calculate expected bags and expected remaining for a fish stock, brand, and size on a date ── */
  const getExpectedFeedData = (targetDate: string, fishStock: string, brand: string, size: string, bagsOpenedOverride?: number) => {
    if (!size || !targetDate) {
      return { hasFed: false, totalFed: 0, carryover: 0, bagWeight: 15, expectedBags: 0, expectedRemaining: 0 };
    }

    // When calculating for current selected date, use reconRows directly as the single source of truth
    if (isSameDate(targetDate, selDate) && Array.isArray(reconRows)) {
      const match = reconRows.find(r =>
        isStockMatch(r.fishStock, fishStock) &&
        (size === "—" || (r.size || "").toLowerCase().trim() === size.toLowerCase().trim()) &&
        (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      ) || reconRows.find(r =>
        isStockMatch(r.fishStock, fishStock) &&
        (size === "—" || (r.size || "").toLowerCase().trim() === size.toLowerCase().trim())
      );

      if (match) {
        let expectedRem = match.expectedRemaining;
        if (bagsOpenedOverride !== undefined && bagsOpenedOverride !== match.recordedBags) {
          const customAvailable = match.carryover + (bagsOpenedOverride * match.bagWeight);
          expectedRem = Math.max(0, customAvailable - match.totalFed);
        }
        return {
          hasFed: match.totalFed > 0,
          totalFed: match.totalFed,
          carryover: match.carryover,
          bagWeight: match.bagWeight,
          expectedBags: match.expectedBags,
          expectedRemaining: expectedRem
        };
      }
    }

    const normStock = (fishStock && fishStock !== "—") ? normalizeFishStock(fishStock) : "";
    const dateLabel = toDateLabel(targetDate);
    const mIdx = MIDX_GLOBAL[toMon(targetDate)] ?? MIDX_GLOBAL[dateLabel.split(" ")[0]] ?? viewMonth;
    const yr = toYr(targetDate) || viewYear;
    const dNum = parseInt(dateLabel.split(" ")[1] || "1", 10);
    const prevDt = new Date(yr, mIdx, dNum - 1);
    const prevDateLabel = `${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`;

    const pondsForStock = normStock ? (ponds || []).filter(p => p && (isStockMatch(pondToStock(p.name), normStock) || isStockMatch(p.name, normStock))).map(p => p.name) : [];

    const fedRecords = (feedingRecords || []).filter(r => {
      if (!r) return false;
      const dateMatch = isSameDate(r.date, targetDate) || isSameDate(r.date, dateLabel) || isSameDate(r.date, selDate);
      if (!dateMatch) return false;
      if (size && size !== "—" && r.size && r.size.toLowerCase().trim() !== size.toLowerCase().trim()) return false;
      if (normStock && normStock !== "—") {
        const rStock = r.fishStock || pondToStock(r.pond);
        const matchesStock = isStockMatch(normStock, rStock) ||
                             isStockMatch(normStock, r.fishStock) ||
                             isStockMatch(normStock, pondToStock(r.pond)) ||
                             isStockMatch(normStock, r.pond) ||
                             pondsForStock.some(pn => pn.toLowerCase().trim() === (r.pond || "").toLowerCase().trim());
        if (!matchesStock) return false;
      }
      return true;
    });
    const totalFed = fedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

    const carryoverLogs = (remainLogs || []).filter(r => {
      if (!r) return false;
      const dateMatch = isSameDate(r.date, prevDateLabel) || isSameDate(r.date, `${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`);
      if (!dateMatch) return false;
      if (size && size !== "—" && r.size && r.size.toLowerCase().trim() !== size.toLowerCase().trim()) return false;
      if (normStock && normStock !== "—") {
        return isStockMatch(normStock, r.fishStock);
      }
      return true;
    });
    const carryover = carryoverLogs.length > 0 ? (Number(carryoverLogs[carryoverLogs.length - 1].remainingKg) || 0) : 0;

    const invItem = (inventory || []).find(f => f && (brand && brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && f.size.toLowerCase().trim() === size.toLowerCase().trim()) || (inventory || []).find(f => f && f.size.toLowerCase().trim() === size.toLowerCase().trim());
    const bagWeight = invItem?.weightPerBag || 15;

    const netNeeded = Math.max(0, totalFed - carryover);
    const expectedBags = netNeeded > 0 ? Math.ceil(netNeeded / bagWeight) : 0;
    const loggedBags = getBagsLoggedTodayForStockAndSize(normStock, brand, size, targetDate);
    const effectiveBags = bagsOpenedOverride !== undefined ? bagsOpenedOverride : (totalFed > 0 ? expectedBags : loggedBags);
    const totalAvailable = carryover + (effectiveBags * bagWeight);
    const expectedRemaining = Math.max(0, totalAvailable - totalFed);

    return {
      hasFed: totalFed > 0,
      totalFed,
      carryover,
      bagWeight,
      expectedBags,
      expectedRemaining
    };
  };

  /* ── helper: count bags opened for a given fish stock + brand + pellet size on a date ── */
  const getBagsLoggedTodayForStockAndSize = (stockName: string, brandName: string, palletSize: string, checkDate: string): number => {
    if (!stockName || !palletSize || !checkDate || stockName === "—") return 0;
    const normalizedStock = normalizeFishStock(stockName).toLowerCase().trim();
    const normalizedBrand = (brandName || "").toLowerCase().trim();
    const normalizedSize = palletSize.toLowerCase().trim();
    const dateLabel = toDateLabel(checkDate);
    const matching = (bagLogs || []).filter(b =>
      b &&
      (Number(b.bagsOpened) || 0) > 0 &&
      b.fishStock &&
      b.fishStock !== "—" &&
      (isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel) || isSameDate(b.date, selDate)) &&
      (isStockMatch(b.fishStock, stockName) || normalizeFishStock(b.fishStock).toLowerCase().trim() === normalizedStock) &&
      (normalizedBrand === "" || (b.brand || "").toLowerCase().trim() === normalizedBrand) &&
      (palletSize === "—" || (b.size || "").toLowerCase().trim() === normalizedSize)
    );
    return matching.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
  };
  const isStockAndSizeAlreadyLogged = (stockName: string, brandName: string, palletSize: string, checkDate: string): boolean => {
    return getBagsLoggedTodayForStockAndSize(stockName, brandName, palletSize, checkDate) > 0;
  };

  const getIsoDateForSelDate = (targetDate: string): string => {
    if (!targetDate) return TODAY;
    if (/^\d{4}-\d{2}-\d{2}/.test(targetDate)) {
      return targetDate.slice(0, 10);
    }
    const parts = targetDate.trim().split(" ");
    if (parts.length >= 2) {
      const mIdx = MIDX_GLOBAL[parts[0]];
      const d = parseInt(parts[1], 10);
      if (mIdx !== undefined && !isNaN(d)) {
        return `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    return TODAY;
  };

  /* ── bags opened & leftover modal state ── */
  const [bagsDate, setBagsDate] = useState(TODAY);
  const blankBagRow = (targetDate?: string): BagRow => {
    const fs = activeFishStockOptions[0]?.name || "";
    const b = invBrands[0] || "";
    const allSizes = invSizesForBrand(b);
    const defSize = allSizes[0] || "";
    const inv = (inventory || []).find(f => f && f.brand === b && f.size === defSize);
    return { fishStock: fs, brand: b, size: defSize, kgPerBag: inv?.weightPerBag || 15, qty: "", remainingKg: "" };
  };

  const getBagRowsForDate = (checkDate: string): BagRow[] => {
    const dateLabel = toDateLabel(checkDate);
    const existingBags = (bagLogs || []).filter(b => b && (isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel)));
    const existingRemains = (remainLogs || []).filter(r => r && (isSameDate(r.date, checkDate) || isSameDate(r.date, dateLabel)));

    const map = new Map<string, BagRow>();
    existingBags.forEach(b => {
      const brand = b.brand || invBrands[0] || "";
      const size = b.size || (invSizesForBrand(brand)[0] || "");
      const fs = b.fishStock || (activeFishStockOptions[0]?.name || "");
      const inv = (inventory || []).find(f => f && f.brand === brand && f.size === size);
      const kgPb = Number(b.kgPerBag) || inv?.weightPerBag || 15;
      const key = `${normalizeFishStock(fs)}__${brand}__${size}`;
      map.set(key, {
        id: b.id,
        fishStock: fs,
        brand,
        size,
        kgPerBag: kgPb,
        qty: b.bagsOpened !== undefined && b.bagsOpened !== null ? String(b.bagsOpened) : "",
        remainingKg: ""
      });
    });

    existingRemains.forEach(r => {
      const brand = r.brand || invBrands[0] || "";
      const size = r.size || (invSizesForBrand(brand)[0] || "");
      const fs = r.fishStock || (activeFishStockOptions[0]?.name || "");
      const key = `${normalizeFishStock(fs)}__${brand}__${size}`;
      const entry = map.get(key);
      if (entry) {
        entry.remainingKg = r.remainingKg !== undefined && r.remainingKg !== null ? String(r.remainingKg) : "";
      } else {
        const inv = (inventory || []).find(f => f && f.brand === brand && f.size === size);
        map.set(key, {
          fishStock: fs,
          brand,
          size,
          kgPerBag: inv?.weightPerBag || 15,
          qty: "",
          remainingKg: r.remainingKg !== undefined && r.remainingKg !== null ? String(r.remainingKg) : ""
        });
      }
    });

    if (map.size > 0) {
      return Array.from(map.values());
    }

    // If no bag logs exist yet for this date, look at today's feeding records to pre-fill rows
    const dayFeedRecords = (feedingRecords || []).filter(r =>
      r && (isSameDate(r.date, checkDate) || isSameDate(r.date, dateLabel)) &&
      (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0)
    );

    if (dayFeedRecords.length > 0) {
      const feedGroups = new Map<string, BagRow>();
      dayFeedRecords.forEach(f => {
        const fs = pondToStock(f.pond) || activeFishStockOptions[0]?.name || "";
        const size = f.size || "";
        if (!size) return;
        const brand = f.brand || (inventory || []).find(item => item && item.size === size)?.brand || invBrands[0] || "";
        const key = `${normalizeFishStock(fs)}__${brand}__${size}`;
        if (!feedGroups.has(key)) {
          const inv = (inventory || []).find(item => item && (brand ? item.brand.toLowerCase() === brand.toLowerCase() : true) && item.size.toLowerCase() === size.toLowerCase()) || (inventory || []).find(item => item && item.size.toLowerCase() === size.toLowerCase());
          feedGroups.set(key, {
            fishStock: fs,
            brand: brand || inv?.brand || invBrands[0] || "",
            size,
            kgPerBag: inv?.weightPerBag || 15,
            qty: "",
            remainingKg: ""
          });
        }
      });
      if (feedGroups.size > 0) {
        return Array.from(feedGroups.values());
      }
    }

    return [blankBagRow(checkDate)];
  };

  const [bagRows, setBagRows] = useState<BagRow[]>([]);
  const openBagsModal = () => {
    const initialDate = getIsoDateForSelDate(selDate);
    setBagsDate(initialDate);
    setBagRows(getBagRowsForDate(initialDate));
    setBagsErr({});
    setShowBagsModal(true);
  };

  const handleBagsDateChange = (newDate: string) => {
    setBagsDate(newDate);
    if (newDate) {
      setBagsErr({});
      setBagRows(getBagRowsForDate(newDate));
    }
  };

  const addBagRow = () => setBagRows(prev => [...prev, blankBagRow()]);
  const removeBagRow = (i: number) => setBagRows(prev => prev.filter((_, idx) => idx !== i));
  const updateBagRow = (i: number, k: keyof BagRow, v: string) => setBagRows(prev => prev.map((r, idx) => {
    if (idx !== i) return r;
    if (k === "fishStock") {
      return { ...r, fishStock: v };
    }
    if (k === "brand") {
      const szs = invSizesForBrand(v);
      const newSize = szs.includes(r.size) ? r.size : (szs[0] || "");
      const inv = (inventory || []).find(f => f && f.brand === v && f.size === newSize);
      return { ...r, brand: v, size: newSize, kgPerBag: inv?.weightPerBag || 15 };
    }
    const u = { ...r, [k]: v };
    if (k === "size") {
      const inv = (inventory || []).find(f => f && f.brand === r.brand && f.size === v);
      u.kgPerBag = inv?.weightPerBag || 15;
    }
    return u;
  }));
  const filledBagRows = bagRows.filter(r => (r.qty !== "" && !isNaN(Number(r.qty)) && Number(r.qty) >= 0) || (r.remainingKg !== "" && !isNaN(Number(r.remainingKg)) && Number(r.remainingKg) >= 0));

  const handleSaveBags = async () => {
    const errs: Record<string, string> = {};
    if (!bagRows.length) errs.entries = "Please enter at least one entry";
    if (!bagsDate) errs.date = "Date is required";

    const dateLabel = toDateLabel(bagsDate);
    const formStockSizeKeys = new Set<string>();

    // Calculate total requested bags across all rows grouped by brand and size
    const requestedBagsByBrandSize: Record<string, { brand: string; size: string; totalRequestedBags: number; totalRequestedKg: number }> = {};

    bagRows.forEach((r, idx) => {
      if (!r.fishStock) {
        errs[`fs_${idx}`] = "Fish Stock is required";
        return;
      }
      if (!r.brand) {
        errs[`brand_${idx}`] = "Feed Brand is required";
        return;
      }
      if (!r.size) {
        errs[`size_${idx}`] = "Pellet Size is required";
        return;
      }

      const normalizedStock = normalizeFishStock(r.fishStock).toLowerCase().trim();
      const normalizedBrand = (r.brand || "").toLowerCase().trim();
      const normalizedSize = (r.size || "").toLowerCase().trim();
      const stockSizeKey = `${normalizedStock}__${normalizedBrand}__${normalizedSize}`;

      if (formStockSizeKeys.has(stockSizeKey)) {
        errs[`dup_${idx}`] = "This has already been entered above. Please combine into one entry.";
      }
      formStockSizeKeys.add(stockSizeKey);

      const requestedBags = Number(r.qty);
      if (r.qty !== "" && (isNaN(requestedBags) || requestedBags < 0)) {
        errs[`qty_${idx}`] = "Enter a valid bags quantity (0 or greater)";
        return;
      }
      if (requestedBags > 0) {
        const k = `${normalizedBrand}__${normalizedSize}`;
        if (!requestedBagsByBrandSize[k]) {
          requestedBagsByBrandSize[k] = { brand: r.brand, size: r.size, totalRequestedBags: 0, totalRequestedKg: 0 };
        }
        requestedBagsByBrandSize[k].totalRequestedBags += requestedBags;
        requestedBagsByBrandSize[k].totalRequestedKg += (requestedBags * (r.kgPerBag || 15));
      }

      const remVal = Number(r.remainingKg);
      if (r.remainingKg !== "" && (isNaN(remVal) || remVal < 0)) {
        errs[`rem_${idx}`] = "Enter a valid remaining feed amount (0 or greater)";
      }
    });

    // Check available inventory across all rows for this brand & size (excluding logs on this target date)
    for (const [key, req] of Object.entries(requestedBagsByBrandSize)) {
      const invItems = (inventory || []).filter(f => f && f.brand.toLowerCase().trim() === req.brand.toLowerCase().trim() && f.size.toLowerCase().trim() === req.size.toLowerCase().trim());
      const totalPurchasedBags = invItems.reduce((s, f) => s + (Number(f.bags) || 0), 0);
      const weightPerBag = invItems[0]?.weightPerBag || 15;
      const totalPurchasedKg = invItems.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || weightPerBag))), 0);

      const openedOnOtherDates = (bagLogs || []).filter(b => 
        b && 
        b.brand?.toLowerCase().trim() === req.brand.toLowerCase().trim() && 
        b.size?.toLowerCase().trim() === req.size.toLowerCase().trim() &&
        !isSameDate(b.date, bagsDate) &&
        !isSameDate(b.date, dateLabel)
      );
      const totalOpenedOtherBags = openedOnOtherDates.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
      const totalOpenedOtherKg = openedOnOtherDates.reduce((s, b) => s + (Number(b.totalKg) || (Number(b.bagsOpened) * (Number(b.kgPerBag) || weightPerBag))), 0);

      const availableBags = Math.max(0, totalPurchasedBags - totalOpenedOtherBags);
      const availableKg = Math.max(0, totalPurchasedKg - totalOpenedOtherKg);

      if (req.totalRequestedBags > availableBags || req.totalRequestedKg > availableKg) {
        const errIdx = bagRows.findIndex(r => (r.brand || "").toLowerCase().trim() === req.brand.toLowerCase().trim() && (r.size || "").toLowerCase().trim() === req.size.toLowerCase().trim());
        errs[`stock_${errIdx >= 0 ? errIdx : 0}`] = `Insufficient stock for ${req.brand} ${req.size}. Available: ${availableBags} bag${availableBags !== 1 ? "s" : ""} (${availableKg}kg), requested: ${req.totalRequestedBags} bags.`;
      }
    }

    if (Object.keys(errs).length) { setBagsErr(errs); return; }
    setBagsErr({});

    setShowBagsModal(false);
    toast.success("Bags opened and leftover feed saved");
    setSelDate(dateLabel);
    setDocTab("bags");

    const promises: Promise<any>[] = [];
    for (const r of bagRows) {
      const n = Number(r.qty);
      const fs = normalizeFishStock(r.fishStock) || undefined;

      // Save Bags Opened
      if (r.qty !== "" && !isNaN(n) && n >= 0) {
        const existingRec = (bagLogs || []).find(x => 
          (r.id && x.id === r.id) || 
          (isSameDate(x.date, dateLabel) && 
           x.size?.toLowerCase().trim() === r.size?.toLowerCase().trim() && 
           x.brand?.toLowerCase().trim() === r.brand?.toLowerCase().trim() && 
           isStockMatch(x.fishStock, fs))
        );

        if (existingRec && onEditBagLog) {
          promises.push(Promise.resolve(onEditBagLog({
            ...existingRec,
            date: dateLabel,
            month: toMon(bagsDate),
            year: toYr(bagsDate),
            brand: r.brand,
            size: r.size,
            kgPerBag: r.kgPerBag,
            bagsOpened: n,
            totalKg: n * r.kgPerBag,
            fishStock: fs
          })));
        } else if (n > 0 || (n === 0 && r.remainingKg !== "")) {
          promises.push(Promise.resolve(onAddBagLog({
            id: r.id || uid(),
            date: dateLabel,
            month: toMon(bagsDate),
            year: toYr(bagsDate),
            brand: r.brand,
            size: r.size,
            kgPerBag: r.kgPerBag,
            bagsOpened: n,
            totalKg: n * r.kgPerBag,
            fishStock: fs
          })));
        }
      }

      // Save Remaining Leftover Feed
      const remVal = Number(r.remainingKg);
      if (r.remainingKg !== "" && !isNaN(remVal) && remVal >= 0 && fs) {
        const existingRemain = (remainLogs || []).find(x =>
          x.brand?.toLowerCase().trim() === r.brand?.toLowerCase().trim() &&
          x.size?.toLowerCase().trim() === r.size?.toLowerCase().trim() &&
          (isStockMatch(x.fishStock, fs) || normalizeFishStock(x.fishStock) === fs) &&
          (isSameDate(x.date, bagsDate) || isSameDate(x.date, dateLabel))
        );
        if (existingRemain && onEditRemainLog) {
          promises.push(Promise.resolve(onEditRemainLog({
            ...existingRemain,
            remainingKg: remVal,
            date: dateLabel
          })));
        } else {
          promises.push(Promise.resolve(onAddRemainLog({
            id: uid(),
            brand: r.brand,
            size: r.size,
            fishStock: fs,
            remainingKg: remVal,
            date: dateLabel
          })));
        }
      }
    }

    Promise.all(promises).catch(err => {
      console.error("Failed to save feed logs:", err);
    });
  };

  /* ── merged bags rows for display ── */
  const mergedBagRows = useMemo((): MergedBagRow[] => {
    const dayBagLogs = (bagLogs || []).filter(b => b && isSameDate(b.date, selDate));
    const map = new Map<string, MergedBagRow>();
    dayBagLogs.forEach(b => {
      const fs = normalizeFishStock(b.fishStock) || "—";
      const brand = b.brand || "—";
      const size = b.size || "—";
      const k = `${brand}||${size}||${fs}`;
      const existing = map.get(k);
      const bags = Number(b.bagsOpened) || 0;
      const kgPb = Number(b.kgPerBag) || 15;
      const totalKg = Number(b.totalKg) || (bags * kgPb);
      const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
      const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
        ? formatFishStockDate(matchingPond.stockingDate)
        : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));

      if (existing) {
        // Keep single entry per stock and pallet size rather than accumulating duplicate entries
        existing.bagsOpened = bags;
        existing.totalKgOpened = totalKg;
        existing.lastBagLog = b;
      } else {
        map.set(k, {
          brand,
          size,
          fishStock: fs,
          stockDate: stockDate !== fs ? stockDate : "—",
          bagsOpened: bags,
          totalKgOpened: totalKg,
          remainingKg: 0,
          lastBagLog: b
        });
      }
    });
    const dayRemainLogs = (remainLogs || []).filter(r => r && isSameDate(r.date, selDate));
    dayRemainLogs.forEach(r => {
      const fs = normalizeFishStock(r.fishStock) || "—";
      const brand = r.brand || "—";
      const size = r.size || "—";
      const k = `${brand}||${size}||${fs}`;
      const existing = map.get(k);
      const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
      const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
        ? formatFishStockDate(matchingPond.stockingDate)
        : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));

      if (existing) {
        existing.remainingKg = (Number(r.remainingKg) || 0);
      } else {
        map.set(k, {
          brand,
          size,
          fishStock: fs,
          stockDate: stockDate !== fs ? stockDate : "—",
          bagsOpened: 0,
          totalKgOpened: 0,
          remainingKg: Number(r.remainingKg) || 0,
          lastBagLog: null
        });
      }
    });

    // Also include active feeding records for selDate so missing bag logs appear for reconciliation
    const dayFeedRecords = (feedingRecords || []).filter(r => r && isSameDate(r.date, selDate) && (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0));
    dayFeedRecords.forEach(f => {
      const fs = pondToStock(f.pond) || "—";
      const brand = f.brand || invBrands[0] || "—";
      const size = f.size || "";
      if (!size) return;
      const k = `${brand}||${size}||${fs}`;
      if (!map.has(k)) {
        const anyBrandExisting = Array.from(map.values()).find(m => m.size.toLowerCase().trim() === size.toLowerCase().trim() && isStockMatch(m.fishStock, fs));
        if (!anyBrandExisting) {
          const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
          const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
            ? formatFishStockDate(matchingPond.stockingDate)
            : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));

          map.set(k, {
            brand,
            size,
            fishStock: fs,
            stockDate: stockDate !== fs ? stockDate : "—",
            bagsOpened: 0,
            totalKgOpened: 0,
            remainingKg: 0,
            lastBagLog: null
          });
        }
      }
    });

    return Array.from(map.values());
  }, [bagLogs, remainLogs, feedingRecords, selDate, ponds, invBrands]);

  const filteredMergedBagRows = useMemo(() => {
    if (!bagsSearch.trim()) return mergedBagRows;
    const q = bagsSearch.toLowerCase().trim();
    return mergedBagRows.filter(r =>
      (r.brand && r.brand.toLowerCase().includes(q)) ||
      (r.size && r.size.toLowerCase().includes(q)) ||
      (r.fishStock && r.fishStock.toLowerCase().includes(q)) ||
      (r.stockDate && r.stockDate.toLowerCase().includes(q))
    );
  }, [mergedBagRows, bagsSearch]);

  const filteredReconRows = useMemo(() => {
    if (!reconSearch.trim()) return reconRows;
    const q = reconSearch.toLowerCase().trim();
    return reconRows.filter(r =>
      (r.fishStock && r.fishStock.toLowerCase().includes(q)) ||
      (r.stockDate && r.stockDate.toLowerCase().includes(q)) ||
      (r.brand && r.brand.toLowerCase().includes(q)) ||
      (r.size && r.size.toLowerCase().includes(q)) ||
      (r.ponds && r.ponds.some(p => p && p.toLowerCase().includes(q)))
    );
  }, [reconRows, reconSearch]);



  /* ── bulk log (Log Feeding — All Ponds) ── */
  const [bulkDate, setBulkDate] = useState(TODAY);
  const [bulkBy, setBulkBy] = useState(currentUser?.name || "");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [savingFeed, setSavingFeed] = useState(false);
  const nowTime = () => new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
  const [logTime] = useState(nowTime);

  /* Column reordering for Log Feeding table */
  const DEFAULT_LOG_COLS: LogColKey[] = ["size", "morning", "morningTime", "evening", "eveningTime", "total"];
  const [logColOrder, setLogColOrder] = useState<LogColKey[]>(DEFAULT_LOG_COLS);
  const [draggedLogCol, setDraggedLogCol] = useState<LogColKey | null>(null);

  const handleColDrop = (targetCol: LogColKey) => {
    if (!draggedLogCol || draggedLogCol === targetCol) return;
    setLogColOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(draggedLogCol);
      const toIdx = next.indexOf(targetCol);
      if (fromIdx !== -1 && toIdx !== -1) {
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, draggedLogCol);
      }
      return next;
    });
    setDraggedLogCol(null);
  };

  // Auto-populate bulkBy if currentUser loads or changes
  useEffect(() => {
    if (currentUser?.name && !bulkBy) {
      setBulkBy(currentUser.name);
    }
  }, [currentUser?.name]);

  const getRowsForDate = (targetDate: string) => {
    const dateLabel = toDateLabel(targetDate);
    // Suggest pellet if used on the previous 2 consecutive feeding days for that specific pond
    const getSuggestedPallet = (pondName: string): string | null => {
      const pondRecords = (feedingRecords || [])
        .filter(r => r && r.pond === pondName && r.size && (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0))
        .filter(r => {
          const rDateIso = r.date.match(/^\d{4}-\d{2}-\d{2}/) ? r.date.slice(0, 10) : "";
          if (rDateIso && /^\d{4}-\d{2}-\d{2}/.test(targetDate)) {
            return rDateIso < targetDate;
          }
          return true;
        });

      const dateMap = new Map<string, string>();
      pondRecords.forEach(r => {
        if (r.date && r.size) {
          dateMap.set(r.date, r.size);
        }
      });

      const uniqueDates = Array.from(dateMap.keys());
      if (uniqueDates.length >= 2) {
        uniqueDates.sort((a, b) => {
          const tA = new Date(a).getTime() || 0;
          const tB = new Date(b).getTime() || 0;
          return tB - tA;
        });
        const date1 = uniqueDates[0];
        const date2 = uniqueDates[1];
        const size1 = dateMap.get(date1);
        const size2 = dateMap.get(date2);
        if (size1 && size2 && size1 === size2 && availablePelletSizes.includes(size1)) {
          return size1;
        }
      }
      return null;
    };

    return activePonds.map(p => {
      const existing = (feedingRecords || []).find(r => r && r.pond === p.name && (isSameDate(r.date, targetDate) || r.date === dateLabel));
      const consecutiveSuggestion = getSuggestedPallet(p.name);
      const defSize = existing?.size && availablePelletSizes.includes(existing.size)
        ? existing.size
        : (consecutiveSuggestion || (p.defaultPellet && availablePelletSizes.includes(p.defaultPellet) ? p.defaultPellet : (availablePelletSizes[0] || "4.0 mm")));
      const fsStock = getPondFishStock(p);
      const stockDate = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "—";
      return {
        pondId: p.id,
        pondName: p.name,
        initialStock: p.initialStock || 0,
        currentCount: p.currentCount || 0,
        size: defSize,
        morning: existing ? (existing.morning != null ? String(existing.morning) : "") : "",
        evening: existing ? (existing.evening != null ? String(existing.evening) : "") : "",
        morningTime: existing?.morningTime || "",
        eveningTime: existing?.eveningTime || "",
        fishStock: fsStock,
        stockDate
      };
    });
  };

  const openLog = () => {
    let initialDate = TODAY;
    if (/^\d{4}-\d{2}-\d{2}/.test(selDate)) {
      initialDate = selDate.slice(0, 10);
    } else {
      const parts = selDate.trim().split(" ");
      if (parts.length >= 2) {
        const mIdx = MIDX_GLOBAL[parts[0]];
        const d = parseInt(parts[1], 10);
        if (mIdx !== undefined && !isNaN(d)) {
          initialDate = `${viewYear}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      }
    }
    setBulkDate(initialDate);
    setBulkBy(currentUser?.name || "");
    setBulkRows(getRowsForDate(initialDate));
    setShowLog(true);
  };

  const handleBulkDateChange = (newDate: string) => {
    setBulkDate(newDate);
    if (newDate) {
      setFeedErr(p => ({ ...p, date: "" }));
      setBulkRows(getRowsForDate(newDate));
    }
  };

  const updateRow = (pondId: string, field: keyof BulkRow, value: string) => setBulkRows(prev => prev.map(r => {
    if (r.pondId !== pondId) return r;
    return { ...r, [field]: value };
  }));

  const filledCount = bulkRows.filter(r => r.morning || r.evening).length;
  const grandTotal = bulkRows.reduce((s, r) => { const m = Number(r.morning) || 0; const e = Number(r.evening) || 0; return s + m + e; }, 0);

  const handleSaveAll = async () => {
    const errs: Record<string, string> = {};
    if (!filledCount) errs.amounts = "Please enter at least one feeding amount";
    if (!bulkDate) errs.date = "Date is required";
    if (Object.keys(errs).length) { setFeedErr(errs); return; }

    // Validate pellet availability across all rows being logged
    const requestedPerSize: Record<string, number> = {};
    for (const r of bulkRows) {
      const m = Number(r.morning) || 0;
      const e = Number(r.evening) || 0;
      if (m > 0 || e > 0) {
        if (!r.size) {
          toast.error(`Please select a pellet size for ${r.pondName}`);
          setFeedErr({ amounts: `Please select a pellet size for ${r.pondName}` });
          return;
        }
        requestedPerSize[r.size] = (requestedPerSize[r.size] || 0) + (m + e);
      }
    }

    const dateLabel = toDateLabel(bulkDate);
    for (const [size, requestedKg] of Object.entries(requestedPerSize)) {
      const existingForSizeOnDate = (feedingRecords || [])
        .filter(x => x && (isSameDate(x.date, bulkDate) || x.date === dateLabel) && x.size === size && bulkRows.some(br => br.pondName === x.pond))
        .reduce((s, x) => s + (Number(x.total) || ((Number(x.morning) || 0) + (Number(x.evening) || 0))), 0);

      const stock = getPelletStock(size);
      const effectiveAvailable = stock.availableKg + existingForSizeOnDate;

      if (!stock.exists) {
        toast.error(`Pellet size "${size}" is not available in Feed Inventory. Please add feed stock first.`);
        setFeedErr({ amounts: `Pellet size "${size}" is not in Feed Inventory. Please add feed stock first.` });
        return;
      }
      if (effectiveAvailable <= 0) {
        toast.error(`Pellet size "${size}" is completely empty (0 kg remaining in stock). Please add feed stock before feeding.`);
        setFeedErr({ amounts: `Pellet size "${size}" is completely empty (0 kg remaining in stock).` });
        return;
      }
      if (requestedKg > effectiveAvailable) {
        toast.error(`Insufficient stock for pellet size "${size}". Available: ${Math.round(effectiveAvailable * 10) / 10} kg, requested: ${requestedKg} kg.`);
        setFeedErr({ amounts: `Requested ${requestedKg} kg of ${size}, but only ${Math.round(effectiveAvailable * 10) / 10} kg is available in stock.` });
        return;
      }
    }

    setFeedErr({});

    const now = new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const recorder = bulkBy.trim() || currentUser?.name || "Admin";

    // Immediate UI feedback and instant modal close
    if (bulkDate) {
      const iso = bulkDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) {
        setViewYear(parseInt(iso[1], 10));
        setViewMonth(parseInt(iso[2], 10) - 1);
      }
    }
    setSelDate(dateLabel);
    setShowLog(false);
    toast.success("Feeding records saved");

    const promises: Promise<any>[] = [];
    for (const r of bulkRows) {
      const m = Number(r.morning) || 0;
      const e = Number(r.evening) || 0;
      if (m > 0 || e > 0) {
        const existing = (feedingRecords || []).find(x => x && x.pond === r.pondName && (isSameDate(x.date, bulkDate) || x.date === dateLabel));
        if (existing) {
          const hasChange = m !== existing.morning || e !== existing.evening || r.size !== existing.size;
          const entry: FeedEditEntry = {
            originalMorning: existing.morning,
            updatedMorning: m,
            originalEvening: existing.evening,
            updatedEvening: e,
            editedAt: now,
            editedBy: recorder,
            editedById: ""
          };
          promises.push(Promise.resolve(onEditFeedRecord({
            ...existing,
            size: r.size,
            morning: m,
            evening: e,
            total: m + e,
            recordedBy: recorder,
            morningTime: r.morningTime || existing.morningTime,
            eveningTime: r.eveningTime || existing.eveningTime,
            fishStock: existing.fishStock || pondToStock(r.pondName),
            editHistory: hasChange ? [...(existing.editHistory || []), entry] : (existing.editHistory || [])
          })));
        } else {
          const brandForFeed = (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && b.size === r.size && (!b.fishStock || normalizeFishStock(b.fishStock) === pondToStock(r.pondName)))?.brand || (inventory || []).find(f => f && f.size === r.size)?.brand || "";
          promises.push(Promise.resolve(onAddRecord({
            id: uid(),
            date: dateLabel,
            month: toMon(bulkDate),
            year: toYr(bulkDate),
            pond: r.pondName,
            fishStock: pondToStock(r.pondName),
            brand: brandForFeed,
            size: r.size,
            morning: m,
            evening: e,
            total: m + e,
            recordedBy: recorder,
            morningTime: r.morningTime || undefined,
            eveningTime: r.eveningTime || undefined
          })));
        }
      }
    }
    Promise.all(promises).catch(err => {
      console.error("Error saving feeding records in background:", err);
    });
  };

  /* ── download helpers ── */
  const downloadDayCSV = () => {
    const headers = ["Pond", "Fish Stock", "Pellet Size", "Morning (kg)", "AM Time", "Evening (kg)", "PM Time", "Total (kg)", "Recorded By"];
    const feedRows = dayRows.filter(({ rec }) => !!rec).map(({ pond, rec }) => [pond.name, pondToStock(pond.name), rec!.size, String(rec!.morning), rec!.morningTime || "—", String(rec!.evening), rec!.eveningTime || "—", rec!.total + "kg", rec!.recordedBy]);
    downloadCSV(`feeding-records-${selDate.replace(/\s+/g, "-")}.csv`, headers, feedRows);
  };
  const downloadDayPDF = () => {
    const headers = ["Pond", "Fish Stock", "Pellet Size", "Morning+Evening", "Total", "Recorded By"];
    const feedRows = dayRows.filter(({ rec }) => !!rec).map(({ pond, rec }) => [pond.name, pondToStock(pond.name), rec!.size, `${rec!.morning}+${rec!.evening}kg`, rec!.total + "kg", rec!.recordedBy]);
    openPrintWindow(`Feeding Records — ${selDate}`, headers, feedRows, `${dayRecords.length} session${dayRecords.length !== 1 ? "s" : ""} · ${dayGrand}kg total`);
  };

  /* ── inline styles ── */
  const TI = "w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 text-center";
  const TS = "w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-300";

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full pb-20 sm:pb-8">
      {/* ── Header ── */}
      <div className="space-y-2.5">
        {/* Top Row: Title + Date Picker */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feeding Records</h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight break-words">Record and review daily feeding sessions across all active ponds grouped by Fish Stock.</p>
          </div>

          {/* Date selector (Top Right) */}
          <div className="shrink-0 relative">
            <button onClick={() => setShowCal(p => !p)} className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-green-400 hover:shadow-sm transition-all text-slate-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span className="font-['Barlow_Condensed',sans-serif] text-sm sm:text-base font-bold tracking-tight whitespace-nowrap">{selDate}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCal ? "rotate-180" : ""}`} />
            </button>
            {showCal && (<>
              <div className="fixed inset-0 z-20" onClick={() => setShowCal(false)} />
              <div className="absolute right-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[280px]">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronLeft size={15}/></button>
                  <span className="text-sm font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-wide">{curMonLabel} {viewYear}</span>
                  <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronRight size={15}/></button>
                </div>
                <div className="grid grid-cols-7 mb-1">{DAY_ABBR.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-1">
                  {calCells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const label = `${curMonLabel} ${day}`;
                    const hasRec = daysWithRec.has(day);
                    const isSel = isSelInView && day === selDay;
                    return (
                      <button key={i} onClick={() => { setSelDate(label); setShowCal(false); }} className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-all ${isSel ? "bg-green-600 text-white font-semibold shadow-sm" : hasRec ? "text-slate-800 font-medium hover:bg-green-50" : "text-slate-400 hover:bg-slate-50"}`}>
                        {day}
                        {hasRec && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: "#F97316" }} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#F97316" }} />Has records</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" />Selected</span>
                  </div>
                </div>
              </div>
            </>)}
          </div>
        </div>

        {/* Bottom Row: Action Buttons + Export 3-dots Menu (Aligned to Left) */}
        <div className="flex items-center justify-start gap-1.5 sm:gap-2">
          {canCreate && (
            <>
              <PBtn onClick={openLog} sm className="whitespace-nowrap px-2.5 sm:px-3 text-xs"><Plus size={13} /> Log Feeding</PBtn>
              <PBtn onClick={openBagsModal} sm outline className="whitespace-nowrap px-2.5 sm:px-3 text-xs"><Package size={13} /> Log Bags &amp; Leftover</PBtn>
            </>
          )}
          <div className="shrink-0 relative" ref={feedMobileMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!feedMobileMenuOpen && feedMobileMenuRef.current) {
                  const rect = feedMobileMenuRef.current.getBoundingClientRect();
                  const dropdownWidth = 160;
                  const spaceOnRight = window.innerWidth - rect.left;
                  if (spaceOnRight < dropdownWidth + 16) {
                    setFeedMenuPlacement("right");
                  } else {
                    setFeedMenuPlacement("left");
                  }
                }
                setFeedMobileMenuOpen(p => !p);
              }}
              className="flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export Options"
            >
              <MoreVertical size={15} />
            </button>
            {feedMobileMenuOpen && (
              <div className={`absolute ${feedMenuPlacement === "right" ? "right-0" : "left-0"} top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px] max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95 duration-100`}>
                <button onClick={() => { downloadDayCSV(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 transition-colors"><Download size={13} /> Export CSV</button>
                <button onClick={() => { downloadDayPDF(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 transition-colors"><FileText size={13} /> Export PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats - Desktop Only */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        <StatCard label="Total Ponds" value={String(totalPonds)} sub="active" icon={Layers} />
        <StatCard label="Ponds Fed" value={String(pondsFedToday)} sub={selDate} icon={CheckCircle} hi />
        <StatCard label="Ponds Remaining" value={String(pondsRemaining)} sub="not yet fed" icon={BookOpen} />
        <StatCard label="Bags Opened" value={String(bagsOpenedToday)} sub={selDate} icon={Package} />
      </div>

      {/* ── Sticky Tab bar ── */}
      <div className="sticky top-0 z-20 bg-[#f5f7fa] -mx-4 -mt-2 px-4 py-2 sm:-mx-6 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-200/80 p-1 rounded-xl w-fit">
          {(["daily", "bags", "reconciliation"] as const).map(t => (
            <button key={t} onClick={() => setDocTab(t)} className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${docTab === t ? "bg-white text-green-700 font-bold" : "text-slate-600 hover:text-slate-900"}`}>
              {t === "daily" ? "Daily Feed" : t === "bags" ? "Opened Bags" : "Reconciliation"}
              {t === "reconciliation" && hasMismatchOnSelDate && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3">{docTab === "daily" ? "Daily feed records for the selected date." : docTab === "bags" ? "Bags opened and remaining feed for the selected date." : "Compare expected vs recorded feed usage."}</p>

      {/* ── Daily Feed tab ── */}
      {docTab === "daily" && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{selDate}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Feeding Status Filter */}
                  <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl border border-slate-300/70">
                    {(["all", "fed", "not_fed"] as const).map(st => {
                      const count = st === "all" ? totalPonds : st === "fed" ? pondsFedToday : pondsRemaining;
                      const name = st === "all" ? "All" : st === "fed" ? "Fed" : "Remaining";
                      const isSelected = feedStatusFilter === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setFeedStatusFilter(st)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
                            isSelected
                              ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                              : "text-slate-600 hover:text-slate-900 font-medium"
                          }`}
                        >
                          <span>{name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                              isSelected
                                ? st === "fed" ? "bg-emerald-100 text-emerald-800" : st === "not_fed" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                                : "bg-slate-300/60 text-slate-600"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input value={dailySearch} onChange={e => setDailySearch(e.target.value)} placeholder="Search pond, stock, or size…" className={`${IC} pl-8 w-44 sm:w-52 text-xs py-1.5`} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px] md:min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky left-0 z-20 bg-slate-50">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-[48px] z-20 bg-slate-50 border-r border-slate-200 min-w-[130px]">Pond</th>
                      <th className="hidden md:table-cell px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Stock Date</th>
                      <th className="hidden md:table-cell px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Initial Stock</th>
                      <th className="hidden md:table-cell px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Fish Count</th>
                      {["Pellet Size", "Morning (kg)", "AM Time", "Evening (kg)", "PM Time", "Total (kg)", "Recorded By"].map(h => (
                        <th key={h} className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredDayRows.map(({ pond, rec }, i) => {
                      const hasFeed = !!rec;
                      const pondMaxKgMap = pond.maxKgByPallet;
                      const atMax = hasFeed && pondMaxKgMap && rec!.size in pondMaxKgMap && (feedingRecords || []).filter(r => r && r.pond === pond.name && r.size === rec!.size).reduce((s, r) => s + (Number(r.total) || 0), 0) >= (pondMaxKgMap[rec!.size] || Infinity);
                      const isEdited = (rec?.editHistory?.length || 0) > 0;
                      const stockDateFormatted = pond.stockingDate && pond.stockingDate !== "—" ? formatFishStockDate(pond.stockingDate) : "—";
                      return (
                        <tr key={pond.id} onClick={() => rec && setViewFeedRec(rec)} className={`transition-colors ${hasFeed ? "hover:bg-green-50/30 cursor-pointer" : "opacity-40 hover:opacity-60"}`}>
                          <td className={`w-12 min-w-[48px] max-w-[48px] px-2 py-3.5 text-slate-300 text-xs font-mono text-center sticky left-0 z-10 ${hasFeed ? "bg-white" : "bg-white"}`}>{i + 1}</td>
                          <td className="px-4 py-3.5 min-w-[130px] sticky left-[48px] z-10 bg-white border-r border-slate-100">
                            <p className="font-semibold text-slate-900 leading-tight">{pond.name}</p>
                            {stockDateFormatted !== "—" ? (
                              <p className="text-[11px] text-teal-700 font-medium leading-tight mt-0.5">{stockDateFormatted}</p>
                            ) : (
                              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">—</p>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5 text-xs text-teal-700 font-medium whitespace-nowrap">
                            {stockDateFormatted !== "—" ? (
                              <span className="inline-flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{stockDateFormatted}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5 text-slate-500 font-['Barlow_Condensed',sans-serif] text-base">{pond.initialStock.toLocaleString()}</td>
                          <td className="hidden md:table-cell px-4 py-3.5 font-semibold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{pond.currentCount.toLocaleString()}</td>
                          <td className="px-4 py-3.5">{rec ? <span className="flex items-center gap-1.5"><Bdg label={rec.size} color={atMax ? "red" : "blue"} />{atMax && <span className="text-[10px] font-bold text-red-500">⚠ Limit</span>}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                          <td className="px-4 py-3.5 font-medium">{rec ? `${rec.morning}kg` : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs">{rec?.morningTime || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 font-medium">{rec ? `${rec.evening}kg` : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5 text-slate-500 text-xs">{rec?.eveningTime || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5">{rec ? <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-100 text-green-800 font-bold text-sm font-['Barlow_Condensed',sans-serif]">{rec.total}kg</span>{isEdited && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Edited</span>}</span> : <span className="text-slate-200 text-xs">Not fed</span>}</td>
                          <td className="px-4 py-3.5 text-slate-400 text-xs">{rec?.recordedBy || <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {rec && (isRecordEditable(rec.date) ? (
                                <>
                                  {canEdit && <button onClick={() => openEditRec(rec)} className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit record"><Pencil size={13} /></button>}
                                  {canDelete && onDeleteRecord && <button onClick={() => setDeleteRecId(rec.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete record"><Trash2 size={13} /></button>}
                                </>
                              ) : <button onClick={() => alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1.5 rounded-lg text-slate-200 cursor-not-allowed" title="Locked after 24 hours"><Lock size={13} /></button>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {dayGrand > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td colSpan={11} className="hidden md:table-cell px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-sm font-['Barlow_Condensed',sans-serif]">{dayGrand}kg</span></td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {filteredDayRows.length === 0 && (
                <div className="py-12 text-center">
                  <Droplets size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-400">{dailySearch ? "No ponds match search" : `No feeding recorded on ${selDate}`}</p>
                  <p className="text-xs text-slate-300 mt-1">Select a highlighted date or log a new session</p>
                </div>
              )}
            </Card>
          </div>

          {/* Mobile Isolated Cards View */}
          <div className="md:hidden space-y-3">
            {/* Feeding Status Filter */}
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 p-1 rounded-xl w-fit">
              {(["all", "fed", "not_fed"] as const).map(st => {
                const count = st === "all" ? totalPonds : st === "fed" ? pondsFedToday : pondsRemaining;
                const name = st === "all" ? "All" : st === "fed" ? "Fed" : "Remaining";
                const isSelected = feedStatusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFeedStatusFilter(st)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                        : "text-slate-500 hover:text-slate-800 font-medium"
                    }`}
                  >
                    <span>{name}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                        isSelected
                          ? st === "fed" ? "bg-emerald-100 text-emerald-800" : st === "not_fed" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                          : "bg-slate-200/60 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredDayRows.length === 0 ? (
              <div className="py-10 text-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <Droplets size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">{dailySearch ? "No ponds match search" : `No feeding recorded on ${selDate}`}</p>
                <p className="text-[11px] text-slate-400 mt-1">Select a date or log feeding</p>
              </div>
            ) : (
              filteredDayRows.map(({ pond, rec }, i) => {
                const hasFeed = !!rec;
                const pondMaxKgMap = pond.maxKgByPallet;
                const atMax = hasFeed && pondMaxKgMap && rec!.size in pondMaxKgMap && (feedingRecords || []).filter(r => r && r.pond === pond.name && r.size === rec!.size).reduce((s, r) => s + (Number(r.total) || 0), 0) >= (pondMaxKgMap[rec!.size] || Infinity);
                const isEdited = (rec?.editHistory?.length || 0) > 0;
                const stockDateFormatted = pond.stockingDate && pond.stockingDate !== "—" ? formatFishStockDate(pond.stockingDate) : "—";
                const isMenuOpen = activeDailyMenuId === pond.id;

                return (
                  <div
                    key={pond.id}
                    onClick={() => rec && setViewFeedRec(rec)}
                    className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all relative ${hasFeed ? "hover:border-green-300 hover:shadow-sm cursor-pointer" : "opacity-70"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[220px]" title={pond.name}>
                            {pond.name}
                          </h3>
                          {stockDateFormatted !== "—" && (
                            <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-medium shrink-0">
                              {stockDateFormatted}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          Stock: <strong className="text-slate-700">{pond.currentCount.toLocaleString()}</strong> fish
                          {pond.initialStock > 0 && <span className="text-slate-400"> (Initial: {pond.initialStock.toLocaleString()})</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        {hasFeed && (
                          <span className="font-bold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">
                            {rec.total} kg
                          </span>
                        )}
                        {hasFeed && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveDailyMenuId(isMenuOpen ? null : pond.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => { setActiveDailyMenuId(null); setViewFeedRec(rec); }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye size={13} className="text-slate-400" /> View Details
                                </button>
                                {isRecordEditable(rec.date) ? (
                                  <>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => { setActiveDailyMenuId(null); openEditRec(rec); }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Pencil size={13} className="text-green-600" /> Edit Record
                                      </button>
                                    )}
                                    {canDelete && onDeleteRecord && (
                                      <button
                                        type="button"
                                        onClick={() => { setActiveDailyMenuId(null); setDeleteRecId(rec.id); }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                                      >
                                        <Trash2 size={13} className="text-red-500" /> Delete Record
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <div className="px-3 py-1.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <Lock size={12} /> Locked
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {hasFeed ? (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2">
                        <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Pellet Size</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Bdg label={rec.size} color={atMax ? "red" : "blue"} />
                            {atMax && <span className="text-[10px] font-bold text-red-500">⚠ Limit</span>}
                          </div>
                        </div>
                        <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Morning</span>
                            {rec.morningTime && <span className="text-[9px] text-slate-400 font-mono">{rec.morningTime}</span>}
                          </div>
                          <div className="mt-0.5">
                            <span className="text-base sm:text-lg font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-tight">{rec.morning}</span>
                            <span className="text-xs font-bold text-slate-500 ml-1">kg</span>
                          </div>
                        </div>
                        <div className="bg-slate-50/90 border border-slate-100 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Evening</span>
                            {rec.eveningTime && <span className="text-[9px] text-slate-400 font-mono">{rec.eveningTime}</span>}
                          </div>
                          <div className="mt-0.5">
                            <span className="text-base sm:text-lg font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-tight">{rec.evening}</span>
                            <span className="text-xs font-bold text-slate-500 ml-1">kg</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2 italic">Not fed on {selDate}</p>
                    )}
                  </div>
                );
              })
            )}

            {dayGrand > 0 && (
              <div className="p-4 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-xs">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Total Feed Fed</span>
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-green-600 text-white font-bold text-base font-['Barlow_Condensed',sans-serif]">
                  {dayGrand} kg
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Opened Bags tab ── */}
      {docTab === "bags" && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Opened Bags — {selDate}</p>
                  <p className="text-[11px] text-slate-400">{filteredMergedBagRows.length} entries</p>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input value={bagsSearch} onChange={e => setBagsSearch(e.target.value)} placeholder="Search stock, brand, or size…" className={`${IC} pl-8 w-52 text-xs py-1.5`} />
                </div>
              </div>

              {/* Dismissible Highlighting Banner if navigated from reconciliation */}
              {bagsHighlight && (
                <div className="mx-4 sm:mx-5 my-2.5 px-3.5 py-2.5 bg-orange-50/90 border border-orange-200 rounded-xl flex items-center justify-between text-xs text-orange-950 animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-orange-600 shrink-0" />
                    <span>
                      Showing discrepancy for <strong className="font-bold text-orange-950">{formatFishStock(bagsHighlight.stock)}</strong> ({bagsHighlight.size}). Update the highlighted cell below to reconcile.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBagsHighlight(null)}
                    className="text-orange-700 hover:text-orange-950 font-bold text-xs px-2 py-0.5 hover:bg-orange-100 rounded-lg transition-colors ml-2 shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-3.5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-30 bg-slate-50 border-r border-slate-200 min-w-[130px] max-w-[155px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        Fish Stock
                      </th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Feed Brand</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pellet Size</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bags Opened</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Feed Deducted</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Leftover Feed</th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMergedBagRows.length === 0 && <tr><td colSpan={7} className="text-center text-xs text-slate-400 py-8">No bags logged for {selDate}</td></tr>}
                    {filteredMergedBagRows.map((row, i) => {
                      const isHighlightedRow = Boolean(
                        bagsHighlight &&
                        bagsHighlight.stock &&
                        row.fishStock &&
                        (
                          normalizeFishStock(bagsHighlight.stock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() ||
                          bagsHighlight.stock.toLowerCase().trim() === row.fishStock.toLowerCase().trim() ||
                          normalizeFishStock(bagsHighlight.stock).toLowerCase().trim() === row.fishStock.toLowerCase().trim() ||
                          bagsHighlight.stock.toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim()
                        ) &&
                        (!bagsHighlight.brand || bagsHighlight.brand === "—" || !row.brand || row.brand === "—" || bagsHighlight.brand.toLowerCase().trim() === row.brand.toLowerCase().trim()) &&
                        bagsHighlight.size.toLowerCase().trim() === row.size.toLowerCase().trim()
                      );

                      const isBagsColHighlighted = isHighlightedRow && (bagsHighlight?.col === "bags" || bagsHighlight?.col === "all" || !bagsHighlight?.col);
                      const isRemainColHighlighted = isHighlightedRow && (bagsHighlight?.col === "remaining" || bagsHighlight?.col === "all" || !bagsHighlight?.col);

                      // Find reconciliation discrepancy for this stock & size
                      const reconItem = reconRows.find(r =>
                        normalizeFishStock(r.fishStock) === normalizeFishStock(row.fishStock) &&
                        r.size === row.size &&
                        (!row.brand || row.brand === "—" || !r.brand || r.brand === "—" || (typeof r.brand === "string" && typeof row.brand === "string" && r.brand.toLowerCase().trim() === row.brand.toLowerCase().trim()))
                      ) || reconRows.find(r =>
                        normalizeFishStock(r.fishStock) === normalizeFishStock(row.fishStock) &&
                        r.size === row.size
                      );

                      const hasBagMismatch = Boolean(reconItem && reconItem.expectedBags !== row.bagsOpened);
                      const hasRemainMismatch = Boolean(reconItem && Math.abs(reconItem.expectedRemaining - row.remainingKg) >= 0.1);

                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/80 transition-colors ${isHighlightedRow ? "bg-orange-50/30" : ""}`}
                        >
                          {/* Sticky Fish Stock Column (Solid Opaque Background & High Z-Index) */}
                          <td className={`px-3.5 py-3 sticky left-0 z-20 border-r border-slate-100 min-w-[130px] max-w-[155px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${isHighlightedRow ? "!bg-[#fffbeb]" : "bg-white"}`}>
                            <p className="font-bold text-slate-800 text-xs truncate" title={getStockDisplayName(row.fishStock, row.stockDate)}>
                              {getStockDisplayName(row.fishStock, row.stockDate)}
                            </p>
                          </td>

                          {/* Feed Brand */}
                          <td className="px-4 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">{row.brand}</td>

                          {/* Pellet Size */}
                          <td className="px-4 py-3"><Bdg label={row.size} color="blue" /></td>

                          {/* Bags Opened (with expected bags cleanly under it without boxed fields) */}
                          <td className={`px-4 py-3 relative z-0 transition-all ${isBagsColHighlighted ? "bg-orange-50 ring-1 ring-orange-400 ring-inset rounded" : ""}`}>
                            <div className="font-bold text-slate-900 text-xs">
                              {row.bagsOpened > 0 ? `${row.bagsOpened} bag${row.bagsOpened !== 1 ? "s" : ""}` : <span className="text-slate-300">—</span>}
                            </div>
                            {reconItem ? (
                              <p className={`text-[11px] font-medium mt-0.5 leading-tight ${hasBagMismatch ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                                Exp: {reconItem.expectedBags} bag{reconItem.expectedBags !== 1 ? "s" : ""}
                              </p>
                            ) : null}
                          </td>

                          {/* Feed Deducted (kg) */}
                          <td className="px-4 py-3 font-bold text-green-700 font-['Barlow_Condensed',sans-serif] text-base whitespace-nowrap">
                            {row.totalKgOpened > 0 ? `${row.totalKgOpened} kg` : <span className="text-slate-300 text-xs font-normal">—</span>}
                          </td>

                          {/* Leftover Feed (kg) (with expected leftover cleanly under it without boxed fields) */}
                          <td className={`px-4 py-3 relative z-0 transition-all ${isRemainColHighlighted ? "bg-amber-50 ring-1 ring-amber-400 ring-inset rounded" : ""}`}>
                            <div className="font-semibold text-xs">
                              {row.remainingKg > 0 ? <span className="text-slate-800 font-bold">{row.remainingKg} kg</span> : <span className="text-slate-300 text-xs">—</span>}
                            </div>
                            {reconItem ? (
                              <p className={`text-[11px] font-medium mt-0.5 leading-tight ${hasRemainMismatch ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                                Exp: {reconItem.expectedRemaining} kg
                              </p>
                            ) : null}
                          </td>

                          {/* Edit Button */}
                          <td className="px-3 py-3 text-right">
                            {canEdit && (
                              isRecordEditable(row.lastBagLog?.date || selDate) ? (
                                <button onClick={() => openEditMergedRow(row)} className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit entry">
                                  <Pencil size={13} />
                                </button>
                              ) : (
                                <button onClick={() => alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1.5 rounded text-slate-300 cursor-not-allowed" title="Locked">
                                  <Lock size={13} />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Isolated Cards View */}
          <div className="md:hidden space-y-3">
            {/* Dismissible Highlighting Banner if navigated from reconciliation */}
            {bagsHighlight && (
              <div className="px-3.5 py-2.5 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-between text-xs text-orange-950 shadow-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-orange-600 shrink-0" />
                  <span>
                    Showing discrepancy for <strong className="font-bold text-orange-950">{formatFishStock(bagsHighlight.stock)}</strong> ({bagsHighlight.size}).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setBagsHighlight(null)}
                  className="text-orange-700 hover:text-orange-950 font-bold text-xs px-2 py-0.5 hover:bg-orange-100 rounded-lg transition-colors ml-2 shrink-0"
                >
                  Clear
                </button>
              </div>
            )}

            {filteredMergedBagRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                No bags logged for {selDate}
              </div>
            ) : (
              filteredMergedBagRows.map((row, i) => {
                const isHighlightedRow = Boolean(
                  bagsHighlight &&
                  bagsHighlight.stock &&
                  row.fishStock &&
                  (
                    normalizeFishStock(bagsHighlight.stock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() ||
                    bagsHighlight.stock.toLowerCase().trim() === row.fishStock.toLowerCase().trim() ||
                    normalizeFishStock(bagsHighlight.stock).toLowerCase().trim() === row.fishStock.toLowerCase().trim() ||
                    bagsHighlight.stock.toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim()
                  ) &&
                  (!bagsHighlight.brand || bagsHighlight.brand === "—" || !row.brand || row.brand === "—" || bagsHighlight.brand.toLowerCase().trim() === row.brand.toLowerCase().trim()) &&
                  bagsHighlight.size.toLowerCase().trim() === row.size.toLowerCase().trim()
                );

                const isBagsColHighlighted = isHighlightedRow && (bagsHighlight?.col === "bags" || bagsHighlight?.col === "all" || !bagsHighlight?.col);
                const isRemainColHighlighted = isHighlightedRow && (bagsHighlight?.col === "remaining" || bagsHighlight?.col === "all" || !bagsHighlight?.col);

                const reconItem = reconRows.find(r =>
                  normalizeFishStock(r.fishStock) === normalizeFishStock(row.fishStock) &&
                  r.size === row.size &&
                  (!row.brand || row.brand === "—" || !r.brand || r.brand === "—" || (typeof r.brand === "string" && typeof row.brand === "string" && r.brand.toLowerCase().trim() === row.brand.toLowerCase().trim()))
                ) || reconRows.find(r =>
                  normalizeFishStock(r.fishStock) === normalizeFishStock(row.fishStock) &&
                  r.size === row.size
                );

                const hasBagMismatch = Boolean(reconItem && reconItem.expectedBags !== row.bagsOpened);
                const hasRemainMismatch = Boolean(reconItem && Math.abs(reconItem.expectedRemaining - row.remainingKg) >= 0.1);
                const isMenuOpen = activeBagMenuId === `${row.fishStock}__${row.brand}__${row.size}`;

                return (
                  <div
                    key={i}
                    onClick={() => setViewBagDetail(row)}
                    className={`bg-white border rounded-2xl p-4 shadow-xs transition-all cursor-pointer hover:border-green-300 hover:shadow-sm relative ${
                      isHighlightedRow
                        ? "bg-orange-50/70 border-orange-400 ring-2 ring-orange-400 shadow-md"
                        : "border-slate-200/80"
                    }`}
                  >
                    {isHighlightedRow && (
                      <div className="mb-2.5 flex items-center justify-between gap-1.5 pb-2 border-b border-orange-200/80">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-900 bg-orange-100/90 px-2 py-0.5 rounded-md border border-orange-300">
                          <AlertCircle size={11} className="text-orange-600 shrink-0" /> Discrepancy Highlighted
                        </span>
                        {isBagsColHighlighted && <span className="text-[10px] text-orange-800 font-semibold">Check Bags Opened</span>}
                        {isRemainColHighlighted && !isBagsColHighlighted && <span className="text-[10px] text-amber-800 font-semibold">Check Leftover Feed</span>}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                          {getStockDisplayName(row.fishStock, row.stockDate)}
                        </h3>
                        {row.stockDate && row.stockDate !== "—" && (
                          <p className="text-xs text-slate-500 font-normal leading-tight mt-0.5">{row.stockDate}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                        <span className="text-xs font-semibold text-slate-600">{row.brand}</span>
                        <Bdg label={row.size} color="blue" />
                        {/* 3-dots Menu Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveBagMenuId(isMenuOpen ? null : `${row.fishStock}__${row.brand}__${row.size}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 min-w-[130px] animate-in fade-in zoom-in-95 duration-100">
                              <button
                                type="button"
                                onClick={() => { setActiveBagMenuId(null); setViewBagDetail(row); }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Eye size={13} className="text-slate-400" /> View Details
                              </button>
                              {canEdit && (
                                isRecordEditable(row.lastBagLog?.date || selDate) ? (
                                  <button
                                    type="button"
                                    onClick={() => { setActiveBagMenuId(null); openEditMergedRow(row); }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Pencil size={13} className="text-green-600" /> Edit Entry
                                  </button>
                                ) : (
                                  <div className="px-3 py-1.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <Lock size={12} /> Locked
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Metrics Grid */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                      {/* Bags Opened */}
                      <div className={`rounded-lg p-2 transition-all ${isBagsColHighlighted ? "bg-orange-100/90 border border-orange-400 ring-1 ring-orange-400" : "bg-slate-50"}`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Bags Opened</span>
                        <span className="font-bold text-slate-900 text-xs">
                          {row.bagsOpened > 0 ? `${row.bagsOpened} bag${row.bagsOpened !== 1 ? "s" : ""}` : "—"}
                        </span>
                        {reconItem ? (
                          <p className={`text-[10px] font-medium mt-0.5 ${hasBagMismatch ? "text-amber-700 font-bold" : "text-slate-400"}`}>
                            Exp: {reconItem.expectedBags}
                          </p>
                        ) : null}
                      </div>

                      {/* Feed Deducted */}
                      <div className="bg-slate-50 rounded-lg p-2">
                        <span className="text-[10px] text-slate-400 block mb-0.5">Feed Deducted</span>
                        <span className="font-bold text-green-700 font-['Barlow_Condensed',sans-serif] text-sm">
                          {row.totalKgOpened > 0 ? `${row.totalKgOpened} kg` : "—"}
                        </span>
                      </div>

                      {/* Leftover Feed */}
                      <div className={`rounded-lg p-2 transition-all ${isRemainColHighlighted ? "bg-amber-100/90 border border-amber-400 ring-1 ring-amber-400" : "bg-slate-50"}`}>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Leftover Feed</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {row.remainingKg > 0 ? `${row.remainingKg} kg` : "—"}
                        </span>
                        {reconItem ? (
                          <p className={`text-[10px] font-medium mt-0.5 ${hasRemainMismatch ? "text-amber-700 font-bold" : "text-slate-400"}`}>
                            Exp: {reconItem.expectedRemaining} kg
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Reconciliation tab (Clean, Streamlined & Uncluttered) ── */}
      {docTab === "reconciliation" && (() => {
        const issues = filteredReconRows.filter(r => r.status !== "matched").length;
        return (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Reconciliation — {selDate}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Summary of feed usage and balance. Tap any row for full calculation breakdown.</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input value={reconSearch} onChange={e => setReconSearch(e.target.value)} placeholder="Search stock, brand, or pond…" className={`${IC} pl-8 w-52 text-xs py-1.5`} />
                    </div>
                    {issues > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold">{issues} discrepancy needing review</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">All Balanced</span>
                    )}
                  </div>
                </div>

                {filteredReconRows.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-slate-400">No feeding data to reconcile for {selDate}.</p>
                    <p className="text-xs text-slate-300 mt-1">Log feeding sessions and opened bags to see reconciliation.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[720px]">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-0 z-30 bg-slate-50 border-r border-slate-200 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            Fish Stock &amp; Brand
                          </th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Feed Given</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Bags Opened</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Leftover Feed</th>
                          <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
                          <th className="px-4 py-3 w-8" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredReconRows.map(r => {
                          const rowKey = `${r.fishStock}||${r.size}||${r.brand}`;
                          const highlighted = !!(reconFocus && (reconFocus.key === `${r.fishStock}__${r.size}` || reconFocus.key === `${r.fishStock}__${r.brand}__${r.size}`));
                          const sc = STATUS_CFG[r.status] || STATUS_CFG.matched;
                          const hasBagMismatch = r.status === "bag_mismatch" || r.status === "multiple_mismatches";
                          const hasRemainMismatch = r.status === "remaining_mismatch" || r.status === "multiple_mismatches";

                          return (
                            <tr
                              key={rowKey}
                              onClick={() => setPopupRecon(r)}
                              className={`group cursor-pointer transition-colors hover:bg-slate-50/80 ${highlighted ? "outline outline-2 outline-green-400" : ""}`}
                              title="Click to view full reconciliation breakdown"
                            >
                              {/* Fish Stock & Brand / Pellet Size */}
                              <td className="px-4 py-3.5 sticky left-0 z-20 bg-white group-hover:bg-slate-50/80 border-r border-slate-100 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                                <p className="text-xs font-bold text-slate-800 leading-tight truncate">{getStockDisplayName(r.fishStock, r.stockDate)}</p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Bdg label={r.size} color="blue" />
                                  <span className="text-[11px] text-slate-500 font-medium">{r.brand}</span>
                                </div>
                              </td>

                              {/* Feed Given */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-base">{r.totalFed} kg</span>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[160px]">
                                  {r.ponds.length === 0 ? "No ponds" : r.ponds.length === 1 ? r.ponds[0] : `${r.ponds.length} ponds: ${r.ponds.join(", ")}`}
                                </p>
                              </td>

                              {/* Bags Opened */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {hasBagMismatch ? (
                                  <div>
                                    <span className="text-xs font-bold text-orange-700">{r.recordedBags} bag{r.recordedBags !== 1 ? "s" : ""}</span>
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Exp: {r.expectedBags} bag{r.expectedBags !== 1 ? "s" : ""}</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-xs font-semibold text-slate-800">{r.recordedBags} bag{r.recordedBags !== 1 ? "s" : ""}</span>
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Exp: {r.expectedBags}</span>
                                  </div>
                                )}
                              </td>

                              {/* Leftover Feed */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                {hasRemainMismatch ? (
                                  <div>
                                    <span className="text-xs font-bold text-amber-700">{r.recordedRemaining} kg</span>
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Exp: {r.expectedRemaining} kg</span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-xs font-semibold text-slate-700">{r.recordedRemaining} kg</span>
                                    <span className="text-[11px] text-slate-400 font-medium block mt-0.5">Exp: {r.expectedRemaining} kg</span>
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${sc.cls}`}>
                                  {sc.label}
                                </span>
                              </td>

                              {/* Action Arrow */}
                              <td className="px-4 py-3.5 text-right">
                                <span className="text-slate-300 group-hover:text-green-600 transition-colors inline-block text-xs font-bold">
                                  <ChevronRight size={15} />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>

            {/* Mobile Isolated Cards View */}
            <div className="md:hidden space-y-3">
              {issues > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200/80 text-red-600 text-xs font-semibold">
                    {issues} discrepancy
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold">
                    All Balanced
                  </span>
                </div>
              )}

              {filteredReconRows.length === 0 ? (
                <div className="px-5 py-10 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <p className="text-sm text-slate-400">No feeding data to reconcile for {selDate}.</p>
                  <p className="text-xs text-slate-300 mt-1">Log feeding sessions and opened bags to see reconciliation.</p>
                </div>
              ) : (
                filteredReconRows.map(r => {
                  const rowKey = `${r.fishStock}||${r.size}||${r.brand}`;
                  const highlighted = !!(reconFocus && (reconFocus.key === `${r.fishStock}__${r.size}` || reconFocus.key === `${r.fishStock}__${r.brand}__${r.size}`));
                  const sc = STATUS_CFG[r.status] || STATUS_CFG.matched;
                  const hasBagMismatch = r.status === "bag_mismatch" || r.status === "multiple_mismatches";
                  const hasRemainMismatch = r.status === "remaining_mismatch" || r.status === "multiple_mismatches";
                  const isMenuOpen = activeReconMenuId === rowKey;

                  return (
                    <div
                      key={rowKey}
                      onClick={() => setPopupRecon(r)}
                      className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all cursor-pointer hover:border-green-300 hover:shadow-sm relative ${highlighted ? "outline outline-2 outline-green-400" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
                            {getStockDisplayName(r.fishStock, r.stockDate)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-semibold text-slate-600">{r.brand}</span>
                            <Bdg label={r.size} color="blue" />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${sc.cls}`}>
                            {sc.label}
                          </span>
                          {/* 3-dots Menu Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveReconMenuId(isMenuOpen ? null : rowKey)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  onClick={() => { setActiveReconMenuId(null); setPopupRecon(r); }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye size={13} className="text-slate-400" /> View Breakdown
                                </button>
                                {r.status !== "matched" && (
                                  <button
                                    type="button"
                                    onClick={() => { setActiveReconMenuId(null); goToOpenedBags(r.fishStock, r.size, r.brand); }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                                  >
                                    <Layers size={13} className="text-blue-500" /> Go to Opened Bags
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                        {/* Feed Given */}
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block mb-0.5">Feed Given</span>
                          <span className="font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] text-sm">
                            {r.totalFed} kg
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {r.ponds.length} pond{r.ponds.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Bags Opened */}
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block mb-0.5">Bags Opened</span>
                          <span className={`text-xs font-bold ${hasBagMismatch ? "text-orange-700" : "text-slate-800"}`}>
                            {r.recordedBags} bag{r.recordedBags !== 1 ? "s" : ""}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Exp: {r.expectedBags}
                          </p>
                        </div>

                        {/* Leftover Feed */}
                        <div className="bg-slate-50 rounded-lg p-2">
                          <span className="text-[10px] text-slate-400 block mb-0.5">Leftover Feed</span>
                          <span className={`text-xs font-semibold ${hasRemainMismatch ? "text-amber-700 font-bold" : "text-slate-700"}`}>
                            {r.recordedRemaining} kg
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Exp: {r.expectedRemaining} kg
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        );
      })()}

      {/* ── Reconciliation Popup (Desktop & Mobile Clean Step Flow + Reduced Text Weights) ── */}
      {popupRecon && (() => {
        const pr = popupRecon;
        const bagErr = pr.status === "bag_mismatch" || pr.status === "multiple_mismatches";
        const remErr = pr.status === "remaining_mismatch" || pr.status === "multiple_mismatches";
        const qtyErr = pr.status === "feed_qty_mismatch";
        const pondsForRow = (feedingRecords || []).filter(r =>
          r && isSameDate(r.date, selDate) &&
          r.size === pr.size &&
          (!pr.brand || pr.brand === "—" || !r.brand || r.brand === pr.brand) &&
          (pr.ponds.includes(r.pond) || pondToStock(r.pond) === pr.fishStock) &&
          (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0)
        );
        const ratio = pr.bagWeight > 0 ? (pr.netNeeded / pr.bagWeight).toFixed(2) : "—";
        const sc = STATUS_CFG[pr.status] || STATUS_CFG.matched;

        // Diagnostic summary text
        const getDiagnosticNote = () => {
          if (pr.status === "matched") {
            return {
              title: "Everything Balanced & Reconciled",
              body: `All figures match! Your ponds consumed ${pr.totalFed} kg of feed today. Factoring in ${pr.carryover} kg carried over from yesterday, the ${pr.recordedBags} opened bag(s) (${pr.bagWeight} kg each) and ${pr.recordedRemaining} kg recorded remaining balance out with zero discrepancy.`,
              color: "emerald",
            };
          }
          if (pr.status === "bag_mismatch") {
            if (pr.expectedBags > pr.recordedBags) {
              return {
                title: "Bag Count Under-Reported",
                body: `Your ponds consumed ${pr.totalFed} kg of feed today, which mathematically requires ${pr.expectedBags} bag(s) (${pr.bagWeight} kg/bag), but only ${pr.recordedBags} bag(s) were logged in Opened Bags. Attendants likely opened ${pr.expectedBags} bags but only recorded ${pr.recordedBags}.`,
                color: "orange",
              };
            } else {
              return {
                title: "Bag Count Over-Reported",
                body: `You logged ${pr.recordedBags} bags opened (${pr.recordedBags * pr.bagWeight} kg), but your fish only consumed ${pr.totalFed} kg (which only required ${pr.expectedBags} bag(s)).`,
                color: "orange",
              };
            }
          }
          if (pr.status === "remaining_mismatch") {
            const diffKg = Math.abs(pr.expectedRemaining - pr.recordedRemaining).toFixed(1);
            return {
              title: "Remaining Feed Weight Discrepancy",
              body: `After feeding ${pr.totalFed} kg from ${pr.expectedBags} opened bag(s) (${pr.carryover} kg yesterday carryover + ${pr.expectedBags * pr.bagWeight} kg in bags), the opened bag should mathematically have ${pr.expectedRemaining} kg remaining. However, attendants recorded ${pr.recordedRemaining} kg (difference of ${diffKg} kg).`,
              color: "amber",
            };
          }
          if (pr.status === "feed_qty_mismatch") {
            return {
              title: "Feed Given Exceeds Available Feed",
              body: `Total feed fed to ponds (${pr.totalFed} kg) is greater than the total available feed (${pr.carryover} kg carryover + ${pr.recordedBags * pr.bagWeight} kg from ${pr.recordedBags} opened bags = ${pr.carryover + (pr.recordedBags * pr.bagWeight)} kg).`,
              color: "red",
            };
          }
          return {
            title: "Multiple Discrepancies Detected",
            body: `Both the opened bag count (${pr.recordedBags} recorded vs ${pr.expectedBags} expected) and the remaining feed (${pr.recordedRemaining} kg recorded vs ${pr.expectedRemaining} kg expected) have mismatches.`,
            color: "red",
          };
        };

        const diagnostic = getDiagnosticNote();

        return (
          <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setPopupRecon(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden" style={{ maxHeight: "92vh" }}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Reconciliation Breakdown</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selDate} · <span className="font-semibold text-slate-800">{formatFishStock(pr.fishStock)}</span> {pr.stockDate !== "—" && `(${pr.stockDate})`} · {pr.brand} <span className="font-semibold text-blue-600 font-mono">({pr.size})</span>
                  </p>
                </div>
                <button onClick={() => setPopupRecon(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 text-xs">
                {/* Top Diagnostic Banner */}
                <div className={`rounded-xl p-4 border ${
                  diagnostic.color === "emerald" ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" :
                  diagnostic.color === "orange" ? "bg-orange-50/70 border-orange-200 text-orange-950" :
                  diagnostic.color === "amber" ? "bg-amber-50/70 border-amber-200 text-amber-950" :
                  "bg-red-50/70 border-red-200 text-red-950"
                }`}>
                  {/* Header: Title and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-slate-900 tracking-tight">{diagnostic.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sc.cls}`}>{sc.label}</span>
                  </div>

                  {/* Stock Context Line */}
                  <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-slate-500">Fish Stock:</span>
                    <span className="font-bold text-slate-800">{formatFishStock(pr.fishStock)}</span>
                    {pr.stockDate !== "—" && (
                      <span className="text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 font-medium">
                        {pr.stockDate}
                      </span>
                    )}
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-700">{pr.brand}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">{pr.size}</span>
                  </div>
                </div>

                {/* Steps Flow — Clean Divided List (Clean, Light Typography) */}
                <div className="divide-y divide-slate-100 border-y border-slate-100">
                  {/* Step 1 */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">Step 1 — Total Feed Given</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Sum of feed fed to this stock today</p>
                      {pondsForRow.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {pondsForRow.map(r => (
                            <span key={r.id} className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              {r.pond}: <span className="font-semibold text-slate-800">{r.total} kg</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-semibold text-blue-700 text-sm font-mono shrink-0">{pr.totalFed} kg</span>
                  </div>

                  {/* Step 2 */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800">Step 2 — Yesterday's Carryover</span>
                      <p className="text-[11px] text-slate-500 mt-0.5">Unfinished feed from open bags carried over</p>
                    </div>
                    <span className="font-semibold text-amber-700 text-sm font-mono shrink-0">{pr.carryover} kg</span>
                  </div>

                  {/* Step 3 */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">Step 3 — Required New Feed</span>
                        {qtyErr && <span className="text-[10px] text-red-600 font-semibold">⚠ Exceeds available</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{pr.totalFed}kg − {pr.carryover}kg = {pr.netNeeded}kg</p>
                    </div>
                    <span className={`font-semibold text-sm font-mono shrink-0 ${qtyErr ? "text-red-600" : "text-slate-800"}`}>{pr.netNeeded} kg</span>
                  </div>

                  {/* Step 4 */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800">Step 4 — Expected Bags Opened</span>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{pr.netNeeded}kg ÷ {pr.bagWeight}kg/bag = {ratio} (round up)</p>
                    </div>
                    <span className="font-semibold text-slate-800 text-sm font-mono shrink-0">{pr.expectedBags} bag{pr.expectedBags !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Step 5 */}
                  <div className={`py-2.5 ${bagErr ? "bg-orange-50/50 -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-lg" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800">Step 5 — Recorded Bags Opened</span>
                          {bagErr && <span className="text-[10px] text-orange-600 font-semibold">⚠ Bag Mismatch</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Logged by attendants in Opened Bags</p>
                      </div>
                      <span className={`font-semibold text-sm font-mono shrink-0 ${bagErr ? "text-orange-600 font-bold" : "text-emerald-700 font-bold"}`}>
                        {pr.recordedBags} bag{pr.recordedBags !== 1 ? "s" : ""} {bagErr ? "✗" : "✓"}
                      </span>
                    </div>
                    {bagErr && (
                      <p className="text-[11px] text-orange-900 mt-1.5 bg-orange-100/60 p-2 rounded leading-relaxed">
                        <span className="font-semibold">Note:</span> Expected bag count ({pr.expectedBags} bag{pr.expectedBags !== 1 ? "s" : ""}) is {pr.expectedBags > pr.recordedBags ? "more than" : "different from"} the bags logged ({pr.recordedBags} bag{pr.recordedBags !== 1 ? "s" : ""}).
                      </p>
                    )}
                  </div>

                  {/* Step 6 */}
                  <div className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-800">Step 6 — Expected Remaining Feed</span>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">{pr.carryover + (pr.expectedBags * pr.bagWeight)}kg opened − {pr.totalFed}kg fed</p>
                    </div>
                    <span className="font-semibold text-slate-800 text-sm font-mono shrink-0">{pr.expectedRemaining} kg</span>
                  </div>

                  {/* Step 7 */}
                  <div className={`py-2.5 ${remErr ? "bg-amber-50/50 -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-lg" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800">Step 7 — Recorded Remaining Feed</span>
                          {remErr && <span className="text-[10px] text-amber-700 font-semibold">⚠ Weight Mismatch</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Logged by attendants in Remaining Log</p>
                      </div>
                      <span className={`font-semibold text-sm font-mono shrink-0 ${remErr ? "text-amber-700 font-bold" : "text-emerald-700 font-bold"}`}>
                        {pr.recordedRemaining} kg {remErr ? "✗" : "✓"}
                      </span>
                    </div>
                    {remErr && (
                      <p className="text-[11px] text-amber-950 mt-1.5 bg-amber-100/60 p-2 rounded leading-relaxed">
                        <span className="font-semibold">Note:</span> Expected {pr.expectedRemaining} kg remaining in the open bag, but attendants recorded {pr.recordedRemaining} kg (difference of {Math.abs(pr.expectedRemaining - pr.recordedRemaining).toFixed(1)} kg).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  {bagErr && (
                    <button
                      type="button"
                      onClick={() => goToOpenedBags(pr.fishStock, pr.size, pr.brand, "bags")}
                      className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                    >
                      Go to Opened Bags Tab →
                    </button>
                  )}
                  {remErr && !bagErr && (
                    <button
                      type="button"
                      onClick={() => goToOpenedBags(pr.fishStock, pr.size, pr.brand, "remaining")}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                    >
                      Go to Opened Bags Tab →
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPopupRecon(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Feeding Log Modal (Brand removed, Fish Stock under Pond, Auto-Recorded By) ── */}
      {showLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowLog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{ maxHeight: "92vh" }}>
            <div className="flex items-start justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-white shrink-0 z-30 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Feeding — All Ponds</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter morning &amp; evening amounts for each pond for <span className="font-semibold text-slate-700">{toDateLabel(bulkDate)}</span>.
                </p>
              </div>
              <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>

            {/* Modal scrollable body - scrolls vertically up and down */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50">
              {/* ONLY the table scrolls sideways */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-20 shadow-xs bg-slate-100">
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky top-0 left-0 z-30 bg-slate-100">#</th>
                      <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left min-w-[110px] max-w-[135px] sticky top-0 left-[48px] z-30 bg-slate-100 border-r border-slate-200">Pond</th>
                      {logColOrder.map(col => {
                        let label = "";
                        let align = "text-left";
                        let minW = "min-w-[95px]";
                        switch (col) {
                          case "size": label = "Pellet Size"; align = "text-left"; minW = "min-w-[120px]"; break;
                          case "morning": label = "Morning (kg)"; align = "text-left"; minW = "min-w-[95px]"; break;
                          case "morningTime": label = "AM Time"; align = "text-left"; minW = "min-w-[85px]"; break;
                          case "evening": label = "Evening (kg)"; align = "text-left"; minW = "min-w-[95px]"; break;
                          case "eveningTime": label = "PM Time"; align = "text-left"; minW = "min-w-[85px]"; break;
                          case "total": label = "Total"; align = "text-center"; minW = "min-w-[80px]"; break;
                        }
                        return (
                          <th
                            key={col}
                            draggable
                            onDragStart={e => { e.stopPropagation(); setDraggedLogCol(col); }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleColDrop(col); }}
                            className={`px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${align} ${minW} whitespace-nowrap cursor-grab active:cursor-grabbing hover:bg-slate-200/80 transition-colors select-none`}
                            title="Drag column to reorder"
                          >
                            <div className={`flex items-center gap-1 ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : "justify-start"}`}>
                              <span>{label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {bulkRows.map((row, i) => {
                      const m = Number(row.morning) || 0; const e = Number(row.evening) || 0; const total = m + e;
                      const hasFeed = m > 0 || e > 0;
                      const pondObj = ponds.find(p => p.id === row.pondId || p.name === row.pondName);
                      const rowMaxKg = pondObj?.maxKgByPallet?.[row.size];
                      const cumFed = (feedingRecords || []).filter(r => r && r.pond === row.pondName && r.size === row.size).reduce((s, r) => s + (Number(r.total) || 0), 0);
                      const rowAtMax = !!rowMaxKg && cumFed >= rowMaxKg;
                      return (
                        <tr key={row.pondId} className={`transition-colors ${hasFeed ? "bg-green-50/40" : "hover:bg-slate-50"}`}>
                          <td className={`w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-slate-400 text-xs font-mono text-center sticky left-0 z-10 ${hasFeed ? "bg-[#f2faf4]" : "bg-white"}`}>{i + 1}</td>
                          <td className={`px-3 py-2.5 min-w-[110px] max-w-[135px] sticky left-[48px] z-10 border-r border-slate-200 ${hasFeed ? "bg-[#f2faf4]" : "bg-white"}`}>
                            <p className="font-bold text-slate-900 leading-tight truncate" title={row.pondName}>{row.pondName}</p>
                            {row.stockDate && row.stockDate !== "—" ? (
                              <p className="text-[11px] font-medium text-teal-700 leading-tight mt-0.5 truncate" title={`Stocked: ${row.stockDate}`}>
                                {row.stockDate}
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate" title={row.fishStock || "No stock date"}>
                                {row.fishStock && row.fishStock !== "General Stock" ? row.fishStock : "—"}
                              </p>
                            )}
                          </td>
                          {logColOrder.map(col => {
                            switch (col) {
                              case "size":
                                return (
                                  <td key={col} className="px-2.5 py-2.5">
                                    <select
                                      value={row.size}
                                      onChange={e => updateRow(row.pondId, "size", e.target.value)}
                                      className={TS}
                                    >
                                      {availablePelletSizes.map(s => {
                                        const stock = getPelletStock(s);
                                        const bagCount = stock.inStockBags || 0;
                                        const label = !stock.exists || bagCount <= 0
                                          ? `${s} (0 bags available)`
                                          : `${s} (${bagCount} bag${bagCount !== 1 ? "s" : ""} available)`;
                                        return <option key={s} value={s}>{label}</option>;
                                      })}
                                      {row.size && !availablePelletSizes.includes(row.size) && <option value={row.size}>{row.size}</option>}
                                    </select>
                                    {rowAtMax && <p className="text-[10px] font-bold mt-0.5 text-red-600">⚠ Max weight reached</p>}
                                  </td>
                                );
                            case "morning":
                              return (
                                <td key={col} className="px-2 py-2.5">
                                  <input type="number" value={row.morning} onChange={e => updateRow(row.pondId, "morning", e.target.value)} className={TI} placeholder="0" min="0" step="0.5" />
                                </td>
                              );
                            case "morningTime":
                              return (
                                <td key={col} className="px-2 py-2.5">
                                  <input type="time" value={row.morningTime} onChange={e => updateRow(row.pondId, "morningTime", e.target.value)} className={`${TI} text-xs`} style={{ colorScheme: "light" }} />
                                </td>
                              );
                            case "evening":
                              return (
                                <td key={col} className="px-2 py-2.5">
                                  <input type="number" value={row.evening} onChange={e => updateRow(row.pondId, "evening", e.target.value)} className={TI} placeholder="0" min="0" step="0.5" />
                                </td>
                              );
                            case "eveningTime":
                              return (
                                <td key={col} className="px-2 py-2.5">
                                  <input type="time" value={row.eveningTime} onChange={e => updateRow(row.pondId, "eveningTime", e.target.value)} className={`${TI} text-xs`} style={{ colorScheme: "light" }} />
                                </td>
                              );
                            case "total":
                              return (
                                <td key={col} className="px-3 py-3 text-center">
                                  {total > 0 ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-green-100 text-green-800 font-bold text-sm font-['Barlow_Condensed',sans-serif]">{total}kg</span> : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                              );
                            default:
                              return null;
                          }
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                {bulkRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td colSpan={logColOrder.length + 1} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                      <td className="px-3 py-3 text-center"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-sm font-['Barlow_Condensed',sans-serif]">{grandTotal}kg</span></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl z-30">
              <div>
                <p className="text-sm font-semibold text-slate-700"><span className="text-green-600">{filledCount}</span> of {bulkRows.length} ponds filled</p>
                <p className="text-xs text-slate-400 mt-0.5">Only ponds with a value entered will be saved</p>
                {feedErr.amounts && <p className="text-xs text-red-500 mt-1">{feedErr.amounts}</p>}
                {feedErr.date && <p className="text-xs text-red-500 mt-1">{feedErr.date}</p>}
              </div>
              <div className="flex gap-3">
                <button disabled={savingFeed} onClick={() => { setShowLog(false); setFeedErr({}); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors disabled:opacity-50">Cancel</button>
                <PBtn disabled={savingFeed} onClick={handleSaveAll}>
                  {savingFeed ? (
                    <span className="flex items-center gap-2">Saving...</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><CheckCircle size={15} /> Save {filledCount > 0 ? filledCount : ""} Record{filledCount !== 1 ? "s" : ""}</span>
                  )}
                </PBtn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Opened Bags & Leftover Feed Modal ── */}
      {/* ── Log Opened Bags & Leftover Feed Modal ── */}
      {showBagsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowBagsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden" style={{ maxHeight: "88vh" }}>
            <div className="flex items-start justify-between px-4 sm:px-5 py-3 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Opened Bags &amp; Leftover Feed</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Record bags opened and leftover feed per Fish Stock.</p>
              </div>
              <button onClick={() => setShowBagsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-4 sm:px-5 py-2 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Date:</span>
                <div className="w-36">
                  <DateInput value={bagsDate} onChange={handleBagsDateChange} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">{filledBagRows.length} entr{filledBagRows.length !== 1 ? "ies" : "y"} filled</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2.5">
              {bagRows.map((row, i) => {
                const avail = getStockAvailable(row.brand, row.size, row.id);
                const requestedBags = Number(row.qty) || 0;
                const requestedKg = requestedBags * row.kgPerBag;
                const isOverStock = requestedBags > avail.remainingBags;

                return (
                  <div key={i} className={`p-3 border rounded-xl relative space-y-2.5 ${isOverStock ? "border-red-300 bg-red-50/50" : "border-slate-200/90 bg-slate-50/90"}`}>
                    {bagRows.length > 1 && (
                      <button type="button" onClick={() => removeBagRow(i)} className="absolute top-2.5 right-2.5 p-1 rounded text-slate-300 hover:text-red-500 transition-colors">
                        <X size={13} />
                      </button>
                    )}

                    {/* Fish Stock */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Fish Stock</label>
                      <select
                        value={row.fishStock}
                        onChange={e => updateBagRow(i, "fishStock", e.target.value)}
                        className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400"
                      >
                        <option value="">Select fish stock…</option>
                        {activeFishStockOptions.map(opt => (
                          <option key={opt.name} value={opt.name}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Brand & Pellet Size (Compact 2 columns) */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Feed Brand</label>
                        <SearchableSelect
                          value={row.brand}
                          onChange={v => {
                            updateBagRow(i, "brand", v);
                            const szs = invSizesForBrand(v);
                            if (szs.length > 0 && !szs.includes(row.size)) updateBagRow(i, "size", szs[0]);
                          }}
                          options={invBrands}
                          placeholder="Select brand…"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Pellet Size</label>
                        <select
                          value={row.size}
                          onChange={e => {
                            updateBagRow(i, "size", e.target.value);
                            setBagsErr(p => {
                              const next = { ...p };
                              delete next[`dup_${i}`];
                              delete next[`size_${i}`];
                              return next;
                            });
                          }}
                          className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400 h-[34px]"
                        >
                          {invSizesForBrand(row.brand).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Stock available badge */}
                    <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-[11px] text-slate-500">
                      <span className="text-[10px] uppercase font-medium text-slate-400">Store Stock:</span>
                      <span className={`font-medium ${avail.remainingBags <= 2 ? "text-amber-600" : "text-slate-700"}`}>
                        {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg} kg)
                      </span>
                    </div>

                    {/* Bags Opened & Leftover Feed (2 columns side by side) */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      {/* Left: Bags Opened */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Bags Opened</label>
                        <input
                          type="number"
                          min="0"
                          value={row.qty}
                          onChange={e => updateBagRow(i, "qty", e.target.value)}
                          className={`w-full text-[11px] px-2 py-1 bg-slate-50/50 border ${isOverStock ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-green-400"} rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1`}
                          placeholder="0"
                        />
                        {(() => {
                          const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                          if (exp.hasFed) {
                            return (
                              <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                                Exp: <span className="text-slate-600 font-medium">{exp.expectedBags} bag{exp.expectedBags !== 1 ? "s" : ""}</span>
                                <span className="text-slate-400"> ({exp.totalFed}kg fed)</span>
                                {row.qty !== "" && !isNaN(requestedBags) && requestedBags > 0 && (
                                  <span className="text-slate-500"> · {requestedKg} kg</span>
                                )}
                              </p>
                            );
                          }
                          return (
                            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                              No feed logged {row.qty !== "" && !isNaN(requestedBags) && requestedBags > 0 && <span className="text-slate-500"> · {requestedKg} kg</span>}
                            </p>
                          );
                        })()}
                        {isOverStock && (
                          <p className="text-[10px] font-normal text-red-500">
                            ⚠ Exceeds store ({avail.remainingBags} bags)
                          </p>
                        )}
                      </div>

                      {/* Right: Leftover Feed */}
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                        <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Leftover (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={row.remainingKg}
                          onChange={e => updateBagRow(i, "remainingKg", e.target.value)}
                          className="w-full text-[11px] px-2 py-1 bg-slate-50/50 border border-slate-200 rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-green-400"
                          placeholder="0.0"
                        />
                        {(() => {
                          const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                          return (
                            <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5">
                              Exp: <span className="text-slate-600 font-medium">{exp.expectedRemaining} kg</span>
                              {exp.carryover > 0 && <span className="text-slate-400"> ({exp.carryover}kg c/o)</span>}
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    {(() => {
                      const isDupInForm = bagRows.findIndex((other, idx) =>
                        idx < i &&
                        normalizeFishStock(other.fishStock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() &&
                        (other.brand || "").toLowerCase().trim() === (row.brand || "").toLowerCase().trim() &&
                        other.size.toLowerCase().trim() === row.size.toLowerCase().trim()
                      ) !== -1;

                      if (isDupInForm) {
                        return (
                          <div className="flex items-start gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                            <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                            <span>This stock &amp; size is already entered above.</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
              <button type="button" onClick={addBagRow} className="flex items-center gap-1.5 text-xs text-green-600 font-medium hover:text-green-700 transition-colors py-1">
                <Plus size={13} /> Add another entry
              </button>
            </div>
            <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-2xl flex items-center justify-between">
              <button onClick={() => { setShowBagsModal(false); setBagsErr({}); }} className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors">
                Cancel
              </button>
              <PBtn onClick={handleSaveBags} sm>
                <CheckCircle size={14} /> Save Logs
              </PBtn>
            </div>
          </div>
        </div>
      )}
      {/* ── Edit Feed Record Modal ── */}
      {editRec && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setEditRec(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Daily Feed</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editRec.pond} · {editRec.date}</p>
              </div>
              <button onClick={() => setEditRec(null)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <F label="Feed Size (Pallet)">
                <select value={editRec.size} onChange={e => setEditRec(p => p ? { ...p, size: e.target.value } : p)} className={SC}>
                  {availablePelletSizes.map(s => {
                    const stock = getPelletStock(s, editRec.id);
                    const bagCount = stock.inStockBags || 0;
                    const label = !stock.exists
                      ? `${s} (Not in stock)`
                      : bagCount <= 0
                        ? `${s} (Empty - 0 bags)`
                        : `${s} (${bagCount} bag${bagCount !== 1 ? "s" : ""} available)`;
                    return <option key={s} value={s}>{label}</option>;
                  })}
                  {editRec.size && !availablePelletSizes.includes(editRec.size) && <option value={editRec.size}>{editRec.size}</option>}
                </select>
                {(() => {
                  const stock = getPelletStock(editRec.size, editRec.id);
                  const bagCount = stock.inStockBags || 0;
                  if (!stock.exists) {
                    return <p className="text-xs font-bold text-amber-600 mt-1">⚠ This pellet size is not in Feed Inventory</p>;
                  }
                  if (bagCount <= 0) {
                    return <p className="text-xs font-bold text-red-600 mt-1">⚠ This pellet size is empty (0 bags remaining in stock)</p>;
                  }
                  return <p className="text-xs text-slate-500 mt-1">Stock available: {bagCount} bag{bagCount !== 1 ? "s" : ""}</p>;
                })()}
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Morning (kg)"><NumInput value={editRec.morning} onChange={v => setEditRec(p => p ? { ...p, morning: Number(v) || 0 } : p)} className={IC} placeholder="0" /></F>
                <F label="AM Time"><input type="time" value={editRec.morningTime || ""} onChange={e => setEditRec(p => p ? { ...p, morningTime: e.target.value } : p)} className={IC} style={{ colorScheme: "light" }} /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Evening (kg)"><NumInput value={editRec.evening} onChange={v => setEditRec(p => p ? { ...p, evening: Number(v) || 0 } : p)} className={IC} placeholder="0" /></F>
                <F label="PM Time"><input type="time" value={editRec.eveningTime || ""} onChange={e => setEditRec(p => p ? { ...p, eveningTime: e.target.value } : p)} className={IC} style={{ colorScheme: "light" }} /></F>
              </div>
              <F label="Recorded By"><input type="text" value={editRec.recordedBy} onChange={e => setEditRec(p => p ? { ...p, recordedBy: e.target.value } : p)} className={IC} /></F>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3 rounded-b-2xl">
              <button onClick={() => setEditRec(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditAll}><CheckCircle size={14} /> Save Changes</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Bag Log Modal ── */}
      {editDocBag && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setEditDocBag(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: "88vh" }}>
            <div className="flex items-start justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Bag Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">{toDateLabel(editDocBag.date)} · {getStockDisplayName(editDocBag.fishStock || "General Stock")}</p>
              </div>
              <button onClick={() => setEditDocBag(null)} className="text-slate-400 hover:text-slate-700 p-1.5 ml-4 shrink-0 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 space-y-3.5 text-xs">
              {/* Context Header: Stock, Brand & Pellet Size */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Fish Stock</span>
                    <div className="flex items-center gap-1.5">
                      <Fish size={14} className="text-teal-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {getStockDisplayName(editDocBag.fishStock || "General Stock")}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Pellet Size</span>
                    <Bdg label={editDocBag.size || "—"} color="blue" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Feed Brand:</span>
                    <span className="font-bold text-slate-800">{editDocBag.brand || "—"}</span>
                  </div>
                  {(() => {
                    const avail = getStockAvailable(editDocBag.brand, editDocBag.size, editDocBag.id);
                    return (
                      <div className="text-[11px] text-slate-500">
                        Store Stock: <strong className={avail.remainingBags <= 2 ? "text-amber-700" : "text-slate-800"}>{avail.remainingBags} bags</strong>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Bags Opened */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Bags Opened</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Bags Opened</label>
                    <NumInput value={editDocBag.bagsOpened} onChange={v => setEditDocBag(p => p ? { ...p, bagsOpened: Number(v) || 0 } : p)} className={IC} allowDecimal={false} />
                    {(() => {
                      const exp = getExpectedFeedData(editDocBag.date, editDocBag.fishStock || "", editDocBag.brand, editDocBag.size, editDocBag.bagsOpened);
                      if (exp.hasFed) {
                        return (
                          <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                            <span className="text-green-700 font-semibold">Exp: {exp.expectedBags} bag{exp.expectedBags !== 1 ? "s" : ""}</span>
                            <span className="text-slate-400"> ({exp.totalFed}kg fed)</span>
                          </p>
                        );
                      }
                      return (
                        <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                          No feeding logged on {toDateLabel(editDocBag.date)}
                        </p>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">kg per Bag</label>
                    <NumInput value={editDocBag.kgPerBag} onChange={v => setEditDocBag(p => p ? { ...p, kgPerBag: Number(v) || 0 } : p)} className={IC} />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">Total Deducted: <strong className="text-green-700">{editDocBag.bagsOpened * editDocBag.kgPerBag} kg</strong></p>
              </div>

              {/* Remaining Leftover Feed */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Leftover Feed (kg)</p>
                <div>
                  <input type="number" min="0" step="0.1" value={editBagRemainKg} onChange={e => setEditBagRemainKg(e.target.value)} placeholder="e.g. 3.5" className={IC} />
                  {(() => {
                    const exp = getExpectedFeedData(editDocBag.date, editDocBag.fishStock || "", editDocBag.brand, editDocBag.size, editDocBag.bagsOpened);
                    return (
                      <p className="text-[10px] text-slate-500 font-medium mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-amber-700 font-semibold">Exp Leftover: {exp.expectedRemaining} kg</span>
                        {exp.carryover > 0 && <span className="text-slate-400">({exp.carryover}kg carryover)</span>}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between rounded-b-2xl">
              <button onClick={() => setEditDocBag(null)} className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditDocBag} sm><CheckCircle size={14} /> Save Changes</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── View Opened Bag Full Details Modal ── */}
      {viewBagDetail && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setViewBagDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Opened Bag Record</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selDate} · {getStockDisplayName(viewBagDetail.fishStock, viewBagDetail.stockDate)}</p>
              </div>
              <button onClick={() => setViewBagDetail(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Fish Stock</p>
                  <p className="text-sm font-semibold text-slate-800">{getStockDisplayName(viewBagDetail.fishStock, viewBagDetail.stockDate)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Feed Brand</p>
                  <p className="text-sm font-semibold text-slate-800">{viewBagDetail.brand}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pellet Size</p>
                  <Bdg label={viewBagDetail.size} color="blue" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Recorded By</p>
                  <p className="text-sm text-slate-700">{viewBagDetail.lastBagLog?.recordedBy || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Bags Opened</p>
                  <p className="text-sm font-bold text-slate-800">{viewBagDetail.bagsOpened} bag{viewBagDetail.bagsOpened !== 1 ? "s" : ""}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <p className="text-[10px] uppercase tracking-wider text-green-600 mb-0.5">Total Deducted</p>
                  <p className="text-sm font-black text-green-700">{viewBagDetail.totalKgOpened} kg</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-0.5">Leftover Feed</p>
                  <p className="text-sm font-bold text-amber-800">{viewBagDetail.remainingKg} kg</p>
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-2">
              <button onClick={() => setViewBagDetail(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">Close</button>
              {canEdit && isRecordEditable(viewBagDetail.lastBagLog?.date || selDate) && (
                <button
                  onClick={() => {
                    const rowToEdit = viewBagDetail;
                    setViewBagDetail(null);
                    openEditMergedRow(rowToEdit);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Pencil size={13} /> Edit Entry
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Feed Record Detail / History Popup ── */}
      {viewFeedRec && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={e => e.target === e.currentTarget && setViewFeedRec(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Record Details</h2>
                <p className="text-xs text-slate-400 mt-0.5">{viewFeedRec.pond} · {viewFeedRec.date}</p>
              </div>
              <button onClick={() => setViewFeedRec(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-4 shrink-0"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pond</p><p className="text-sm font-semibold text-slate-800">{viewFeedRec.pond}</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Date</p><p className="text-sm font-semibold text-slate-800">{viewFeedRec.date}</p></div>
              </div>
              {(() => {
                const fs = pondToStock(viewFeedRec.pond);
                const fsDate = pondToStockDate(viewFeedRec.pond);
                return (
                  <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl">
                    <Fish size={12} className="text-teal-600 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-teal-500 mb-0">Fish Stock</p>
                      <p className="text-xs text-teal-800 font-semibold">{fs} {fsDate !== "—" && `(${fsDate})`}</p>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pellet Size {viewFeedRec.brand ? `(${viewFeedRec.brand})` : ""}</p>
                  <Bdg label={viewFeedRec.size} color="blue" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Recorded By</p><p className="text-sm text-slate-700">{viewFeedRec.recordedBy || "—"}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Morning</p>
                    <p className="text-sm font-bold text-slate-800">{viewFeedRec.morning} kg</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{viewFeedRec.morningTime || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Evening</p>
                    <p className="text-sm font-bold text-slate-800">{viewFeedRec.evening} kg</p>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">{viewFeedRec.eveningTime || "—"}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-green-600 mb-0.5">Total</p>
                    <p className="text-base font-black text-green-700">{viewFeedRec.total} kg</p>
                  </div>
                  <p className="text-[10px] text-green-700 font-semibold">Feed Given</p>
                </div>
              </div>
              {viewFeedRec.editHistory && viewFeedRec.editHistory.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <p className="font-semibold mb-1">Edit History ({viewFeedRec.editHistory.length} edit{viewFeedRec.editHistory.length !== 1 ? "s" : ""})</p>
                  <div className="space-y-1 text-[11px] text-amber-800">
                    {viewFeedRec.editHistory.map((h, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>By {h.editedBy || "Staff"} at {h.editedAt}</span>
                        <span className="font-mono">{h.originalMorning + h.originalEvening}kg → {h.updatedMorning + h.updatedEvening}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              {canEdit && isRecordEditable(viewFeedRec.date) && (
                <button
                  type="button"
                  onClick={() => {
                    const r = viewFeedRec;
                    setViewFeedRec(null);
                    openEditRec(r);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              <button onClick={() => setViewFeedRec(null)} className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteRecId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={20} className="text-red-600" /></div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Delete Feeding Record?</h3>
            <p className="text-xs text-slate-400 mb-5">This feeding record will be deleted. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteRecId(null)} className="flex-1 py-2.5 text-sm text-slate-600 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => { onDeleteRecord && onDeleteRecord(deleteRecId); setDeleteRecId(null); }} className="flex-1 py-2.5 text-sm text-white font-semibold bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedDocumentation;
