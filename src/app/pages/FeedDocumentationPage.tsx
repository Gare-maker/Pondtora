import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Plus, CheckCircle, X, Layers, Droplets,
  ChevronDown, ChevronLeft, ChevronRight,
  Package, BookOpen, Download, FileText, Pencil, Trash2, MoreVertical, Lock, History, Fish, Search, AlertTriangle
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
  matched: { cls: "bg-green-100 text-green-700", label: "🟢 Matched", rowBg: "hover:bg-slate-50" },
  remaining_mismatch: { cls: "bg-amber-100 text-amber-700", label: "🟡 Remaining Mismatch", rowBg: "bg-amber-50/20 hover:bg-amber-50/50" },
  bag_mismatch: { cls: "bg-orange-100 text-orange-700", label: "🟠 Bag Count Mismatch", rowBg: "bg-orange-50/20 hover:bg-orange-50/50" },
  feed_qty_mismatch: { cls: "bg-red-100 text-red-600", label: "🔴 Feed Qty Mismatch", rowBg: "bg-red-50/20 hover:bg-red-50/50" },
  multiple_mismatches: { cls: "bg-red-200 text-red-800", label: "⛔ Multiple Mismatches", rowBg: "bg-red-50/30 hover:bg-red-50/60" },
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
  const [showRemainModal, setShowRemainModal] = useState(false);
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<"daily" | "bags" | "reconciliation">("daily");
  const [reconExpanded, setReconExpanded] = useState<string | null>(null);
  const [feedMobileMenuOpen, setFeedMobileMenuOpen] = useState(false);
  const feedMobileMenuRef = useRef<HTMLDivElement>(null);

  /* ── search state for tabs ── */
  const [dailySearch, setDailySearch] = useState("");
  const [bagsSearch, setBagsSearch] = useState("");
  const [reconSearch, setReconSearch] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => { if (feedMobileMenuRef.current && !feedMobileMenuRef.current.contains(e.target as Node)) setFeedMobileMenuOpen(false); };
    if (feedMobileMenuOpen) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [feedMobileMenuOpen]);

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
    const p = (ponds || []).find(x => x && x.name === pondName);
    if (!p) return pondName;
    return getPondFishStock(p);
  };

  const pondToStockDate = (pondName: string): string => {
    const p = (ponds || []).find(x => x && x.name === pondName);
    if (!p || !p.stockingDate || p.stockingDate === "—") return "—";
    return formatFishStockDate(p.stockingDate);
  };

  const normalizeFishStock = (stock?: string | null): string => {
    if (!stock || stock === "—" || !stock.trim()) return "—";
    const trimmed = stock.trim();
    const matchingPond = (ponds || []).find(p => p && p.name.toLowerCase() === trimmed.toLowerCase());
    if (matchingPond) {
      return pondToStock(matchingPond.name);
    }
    const activeStock = (ponds || []).map(p => getPondFishStock(p)).find(s => s && s.toLowerCase().trim() === trimmed.toLowerCase());
    if (activeStock) {
      return activeStock;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const formatted = formatFishStockDate(trimmed);
      if (formatted && formatted !== "—") return formatted;
    }
    return trimmed;
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
    activePonds.forEach(p => {
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
  }, [activePonds]);

  /* ── ReconRow type ── */
  type ReconRow = {
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

  /* ── reconRows (selDate only, grouped strictly by Fish Stock + Pellet Size across all ponds in that stock) ── */
  const reconRows = useMemo((): ReconRow[] => {
    const mIdx = MIDX_GLOBAL[selMonLabel] ?? viewMonth;
    const prevDt = new Date(selYear || viewYear, mIdx, (selDay || 1) - 1);
    const prevDate = `${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`;
    const keySet = new Set<string>();

    (feedingRecords || []).filter(r => r && isSameDate(r.date, selDate)).forEach(r => {
      const fs = pondToStock(r.pond);
      keySet.add(`${fs}||${r.size || "—"}`);
    });
    (bagLogs || []).filter(b => b && isSameDate(b.date, selDate)).forEach(b => {
      const fs = normalizeFishStock(b.fishStock);
      if (fs && fs !== "—") keySet.add(`${fs}||${b.size || "—"}`);
    });
    (remainLogs || []).filter(r => r && isSameDate(r.date, selDate)).forEach(r => {
      const fs = normalizeFishStock(r.fishStock);
      if (fs && fs !== "—") keySet.add(`${fs}||${r.size || "—"}`);
    });

    const rows: ReconRow[] = [];
    for (const compositeKey of Array.from(keySet)) {
      const parts = compositeKey.split("||");
      const fishStock = parts[0];
      const size = parts[1];
      const pondsForStock = (ponds || []).filter(p => p && pondToStock(p.name) === fishStock).map(p => p.name);

      // Resolve brand for this fishStock + size:
      const brandFromBag = (bagLogs || []).find(b => isSameDate(b.date, selDate) && b.size === size && normalizeFishStock(b.fishStock) === fishStock && b.brand)?.brand;
      const brandFromRemain = (remainLogs || []).find(r => isSameDate(r.date, selDate) && r.size === size && normalizeFishStock(r.fishStock) === fishStock && r.brand)?.brand;
      const brandFromFeed = (feedingRecords || []).find(r => isSameDate(r.date, selDate) && r.size === size && pondToStock(r.pond) === fishStock && r.brand)?.brand;
      const brandFromInv = (inventory || []).find(f => f && f.size === size && f.brand)?.brand;
      const brand = brandFromBag || brandFromRemain || brandFromFeed || brandFromInv || "—";

      const fedRecords = (feedingRecords || []).filter(r =>
        r && isSameDate(r.date, selDate) &&
        r.size === size &&
        (pondsForStock.length === 0 || pondsForStock.includes(r.pond) || pondToStock(r.pond) === fishStock) &&
        (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0)
      );
      const fedPonds = Array.from(new Set(fedRecords.map(r => r.pond).filter(Boolean)));

      const totalFed = (feedingRecords || []).filter(r =>
        r && isSameDate(r.date, selDate) &&
        r.size === size &&
        (pondsForStock.length === 0 || pondsForStock.includes(r.pond) || pondToStock(r.pond) === fishStock)
      ).reduce((s, r) => s + (Number(r.total) || 0), 0);

      const matchingBagLogs = (bagLogs || []).filter(b =>
        b && isSameDate(b.date, selDate) &&
        b.size === size &&
        (!b.fishStock || normalizeFishStock(b.fishStock) === fishStock)
      );
      // If multiple duplicate bag logs exist for the same stock and pallet on this day, use the single session amount
      const recordedBags = matchingBagLogs.length > 0 ? (Number(matchingBagLogs[matchingBagLogs.length - 1].bagsOpened) || 0) : 0;

      const carryover = (remainLogs || []).filter(r =>
        r && isSameDate(r.date, prevDate) &&
        r.size === size &&
        normalizeFishStock(r.fishStock) === fishStock
      ).reduce((s, r) => s + (Number(r.remainingKg) || 0), 0);

      const recordedRemaining = (remainLogs || []).filter(r =>
        r && isSameDate(r.date, selDate) &&
        r.size === size &&
        normalizeFishStock(r.fishStock) === fishStock
      ).reduce((s, r) => s + (Number(r.remainingKg) || 0), 0);

      // If neither feed nor bags nor remaining was logged, skip
      if (totalFed === 0 && recordedBags === 0 && recordedRemaining === 0) continue;

      const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand === brand : true) && f.size === size) || (inventory || []).find(f => f && f.size === size);
      const bagWeight = invItem?.weightPerBag || 15;
      const kgOpened = recordedBags * bagWeight;
      const kgConsumed = totalFed;
      const netNeeded = Math.max(0, kgConsumed - carryover);
      const expectedBags = netNeeded === 0 ? 0 : Math.ceil(netNeeded / bagWeight);
      const expectedRemaining = Math.max(0, carryover + kgOpened - kgConsumed);
      const remainingKg = Math.max(0, (carryover + kgOpened) - kgConsumed);
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

      const stockDate = (ponds || []).find(p => p && pondToStock(p.name) === fishStock)?.stockingDate || fishStock;

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

  const filteredDayRows = useMemo(() => {
    if (!dailySearch.trim()) return dayRows;
    const q = dailySearch.toLowerCase().trim();
    return dayRows.filter(({ pond, rec }) => {
      const fs = pondToStock(pond.name);
      return (
        pond.name.toLowerCase().includes(q) ||
        (pond.species && pond.species.toLowerCase().includes(q)) ||
        fs.toLowerCase().includes(q) ||
        (rec?.size && rec.size.toLowerCase().includes(q)) ||
        (rec?.recordedBy && rec.recordedBy.toLowerCase().includes(q))
      );
    });
  }, [dayRows, dailySearch, ponds]);

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
    const fs = b.fishStock || "";
    const existing = (remainLogs || []).find(r => isSameDate(r.date, b.date) && r.brand === b.brand && r.size === b.size && r.fishStock === fs);
    setEditBagRemainKg(existing ? String(existing.remainingKg) : "");
  };

  const handleSaveEditDocBag = () => {
    if (!editDocBag) return;
    onEditBagLog && onEditBagLog({ ...editDocBag, totalKg: editDocBag.bagsOpened * editDocBag.kgPerBag });
    const remKg = Number(editBagRemainKg);
    const fs = editDocBag.fishStock || "";
    if (remKg > 0 && fs) {
      const existing = (remainLogs || []).find(r => r.brand === editDocBag.brand && r.size === editDocBag.size && r.fishStock === fs && isSameDate(r.date, editDocBag.date));
      if (existing) { onEditRemainLog({ ...existing, remainingKg: remKg }); }
      else { onAddRemainLog({ id: uid(), brand: editDocBag.brand, size: editDocBag.size, fishStock: fs, remainingKg: remKg, date: editDocBag.date }); }
    }
    setEditDocBag(null);
  };

  /* ── helper: check if Fish Stock + Pellet Size is already recorded for a given date ── */
  const isStockAndSizeAlreadyLogged = (stockName: string, palletSize: string, checkDate: string): boolean => {
    if (!stockName || !palletSize || !checkDate) return false;
    const normalizedStock = normalizeFishStock(stockName).toLowerCase().trim();
    const normalizedSize = palletSize.toLowerCase().trim();
    const dateLabel = toDateLabel(checkDate);
    return (bagLogs || []).some(b =>
      (isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel)) &&
      normalizeFishStock(b.fishStock).toLowerCase().trim() === normalizedStock &&
      (b.size || "").toLowerCase().trim() === normalizedSize
    );
  };

  /* ── bags opened modal state ── */
  const [bagsDate, setBagsDate] = useState(TODAY);
  type BagRow = { fishStock: string; brand: string; size: string; kgPerBag: number; qty: string };
  const blankBagRow = (targetDate?: string): BagRow => {
    const fs = activeFishStockOptions[0]?.name || "";
    const b = invBrands[0] || "";
    const allSizes = invSizesForBrand(b);
    const dateToCheck = targetDate || bagsDate;
    const unloggedSize = allSizes.find(s => !isStockAndSizeAlreadyLogged(fs, s, dateToCheck)) || allSizes[0] || "";
    const inv = (inventory || []).find(f => f && f.brand === b && f.size === unloggedSize);
    return { fishStock: fs, brand: b, size: unloggedSize, kgPerBag: inv?.weightPerBag || 15, qty: "" };
  };
  const [bagRows, setBagRows] = useState<BagRow[]>([]);
  const openBagsModal = () => {
    let initialDate = TODAY;
    if (/^\d{4}-\d{2}-\d{2}/.test(selDate)) {
      initialDate = selDate.slice(0, 10);
    } else {
      const parts = selDate.trim().split(" ");
      if (parts.length >= 2) {
        const mIdx = MIDX_GLOBAL[parts[0]];
        const d = parseInt(parts[1], 10);
        if (mIdx !== undefined && !isNaN(d)) {
          const y = viewYear || new Date().getFullYear();
          initialDate = `${y}-${String(mIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      }
    }
    setBagsDate(initialDate);
    setBagRows([blankBagRow(initialDate)]);
    setBagsErr({});
    setShowBagsModal(true);
  };
  const addBagRow = () => setBagRows(prev => [...prev, blankBagRow()]);
  const removeBagRow = (i: number) => setBagRows(prev => prev.filter((_, idx) => idx !== i));
  const updateBagRow = (i: number, k: keyof BagRow, v: string) => setBagRows(prev => prev.map((r, idx) => {
    if (idx !== i) return r;
    if (k === "fishStock") {
      const allSizes = invSizesForBrand(r.brand);
      const isCurLogged = isStockAndSizeAlreadyLogged(v, r.size, bagsDate);
      let newSize = r.size;
      if (isCurLogged) {
        const unloggedSize = allSizes.find(s => !isStockAndSizeAlreadyLogged(v, s, bagsDate));
        if (unloggedSize) newSize = unloggedSize;
      }
      const inv = (inventory || []).find(f => f && f.brand === r.brand && f.size === newSize);
      return { ...r, fishStock: v, size: newSize, kgPerBag: inv?.weightPerBag || 15 };
    }
    if (k === "brand") {
      const szs = invSizesForBrand(v);
      const unloggedSize = szs.find(s => !isStockAndSizeAlreadyLogged(r.fishStock, s, bagsDate)) || szs[0] || "";
      const inv = (inventory || []).find(f => f && f.brand === v && f.size === unloggedSize);
      return { ...r, brand: v, size: unloggedSize, kgPerBag: inv?.weightPerBag || 15 };
    }
    const u = { ...r, [k]: v };
    if (k === "size") {
      const inv = (inventory || []).find(f => f && f.brand === r.brand && f.size === v);
      u.kgPerBag = inv?.weightPerBag || 15;
    }
    return u;
  }));
  const filledBagRows = bagRows.filter(r => Number(r.qty) > 0);

  const handleSaveBags = () => {
    const errs: Record<string, string> = {};
    if (!filledBagRows.length) errs.entries = "Please enter at least one bags-opened entry";
    if (!bagsDate) errs.date = "Date is required";

    const dateLabel = toDateLabel(bagsDate);

    // Track combinations within the form to prevent duplicate rows in single submission
    const formStockSizeKeys = new Set<string>();

    filledBagRows.forEach((r, idx) => {
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
      const normalizedSize = r.size.toLowerCase().trim();
      const stockSizeKey = `${normalizedStock}__${normalizedSize}`;

      // Duplicate check 1: Duplicate within the form for the same stock and pallet size
      if (formStockSizeKeys.has(stockSizeKey)) {
        errs[`dup_${idx}`] = `Duplicate entry in form: Fish Stock "${r.fishStock}" with pellet size "${r.size}" has already been entered. You can only log for the same stock if the pallet size is different.`;
      }
      formStockSizeKeys.add(stockSizeKey);

      // Duplicate check 2: Duplicate against existing records for the same date and stock + pallet size
      const alreadyLogged = isStockAndSizeAlreadyLogged(r.fishStock, r.size, bagsDate);
      if (alreadyLogged) {
        errs[`dup_${idx}`] = `Cannot log bag open twice: Fish Stock "${r.fishStock}" with pellet size "${r.size}" has already been recorded for ${dateLabel}. You can only log for this stock if the pallet size is different.`;
      }

      const requestedBags = Number(r.qty) || 0;
      if (requestedBags <= 0) {
        errs[`qty_${idx}`] = "Enter valid bags quantity";
        return;
      }
      const avail = getStockAvailable(r.brand, r.size);
      if (requestedBags > avail.remainingBags || (requestedBags * r.kgPerBag) > avail.remainingKg) {
        errs[`stock_${idx}`] = `Insufficient stock for ${r.brand} ${r.size}. Available: ${avail.remainingBags} bag${avail.remainingBags !== 1 ? "s" : ""} (${avail.remainingKg}kg), requested: ${requestedBags} bag${requestedBags !== 1 ? "s" : ""} (${requestedBags * r.kgPerBag}kg).`;
      }
    });

    if (Object.keys(errs).length) { setBagsErr(errs); return; }
    setBagsErr({});
    filledBagRows.forEach(r => {
      const n = Number(r.qty);
      onAddBagLog({
        id: uid(),
        date: dateLabel,
        month: toMon(bagsDate),
        year: toYr(bagsDate),
        brand: r.brand,
        size: r.size,
        kgPerBag: r.kgPerBag,
        bagsOpened: n,
        totalKg: n * r.kgPerBag,
        fishStock: normalizeFishStock(r.fishStock) || undefined
      });
    });
    setSelDate(dateLabel);
    setDocTab("bags");
    setShowBagsModal(false);
  };

  /* ── merged bags rows for display ── */
  type MergedBagRow = { brand: string; size: string; fishStock: string; stockDate: string; bagsOpened: number; totalKgOpened: number; remainingKg: number; lastBagLog: BagOpenLog | null };
  const mergedBagRows = useMemo((): MergedBagRow[] => {
    const dayBagLogs = (bagLogs || []).filter(b => b && isSameDate(b.date, selDate));
    const map = new Map<string, MergedBagRow>();
    dayBagLogs.forEach(b => {
      const fs = normalizeFishStock(b.fishStock) || "—";
      const k = `${b.brand}||${b.size}||${fs}`;
      const existing = map.get(k);
      const bags = Number(b.bagsOpened) || 0;
      const kgPb = Number(b.kgPerBag) || 15;
      const totalKg = Number(b.totalKg) || (bags * kgPb);
      if (existing) {
        // Keep single entry per stock and pallet size rather than accumulating duplicate entries
        existing.bagsOpened = bags;
        existing.totalKgOpened = totalKg;
        existing.lastBagLog = b;
      } else {
        map.set(k, {
          brand: b.brand,
          size: b.size,
          fishStock: fs,
          stockDate: formatFishStockDate(fs),
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
      const k = `${r.brand}||${r.size}||${fs}`;
      const existing = map.get(k);
      if (existing) {
        existing.remainingKg += (Number(r.remainingKg) || 0);
      } else {
        map.set(k, {
          brand: r.brand,
          size: r.size,
          fishStock: fs,
          stockDate: formatFishStockDate(fs),
          bagsOpened: 0,
          totalKgOpened: 0,
          remainingKg: Number(r.remainingKg) || 0,
          lastBagLog: null
        });
      }
    });
    return Array.from(map.values());
  }, [bagLogs, remainLogs, selDate, ponds]);

  const filteredMergedBagRows = useMemo(() => {
    if (!bagsSearch.trim()) return mergedBagRows;
    const q = bagsSearch.toLowerCase().trim();
    return mergedBagRows.filter(r =>
      r.brand.toLowerCase().includes(q) ||
      r.size.toLowerCase().includes(q) ||
      r.fishStock.toLowerCase().includes(q) ||
      r.stockDate.toLowerCase().includes(q)
    );
  }, [mergedBagRows, bagsSearch]);

  const filteredReconRows = useMemo(() => {
    if (!reconSearch.trim()) return reconRows;
    const q = reconSearch.toLowerCase().trim();
    return reconRows.filter(r =>
      r.fishStock.toLowerCase().includes(q) ||
      r.stockDate.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q) ||
      r.size.toLowerCase().includes(q) ||
      r.ponds.some(p => p.toLowerCase().includes(q))
    );
  }, [reconRows, reconSearch]);

  /* ── log remaining feed state ── */
  type RemainRow = { id?: string; brand: string; size: string; fishStock: string; remainingKg: string };
  const blankRemainRow = (): RemainRow => {
    const b = invBrands[0] || "";
    const s = invSizesForBrand(b)[0] || "";
    return { brand: b, size: s, fishStock: activeFishStockOptions[0]?.name || "", remainingKg: "" };
  };
  const [remainRows, setRemainRows] = useState<RemainRow[]>([blankRemainRow()]);
  const addRemainRow = () => setRemainRows(prev => [...prev, blankRemainRow()]);
  const removeRemainRow = (i: number) => setRemainRows(prev => prev.filter((_, idx) => idx !== i));
  const updateRemainRow = (i: number, k: keyof RemainRow, v: string) => setRemainRows(prev => prev.map((r, idx) => {
    if (idx !== i) return r;
    if (k === "brand") {
      const szs = invSizesForBrand(v);
      const newSize = szs.includes(r.size) ? r.size : (szs[0] || "");
      return { ...r, brand: v, size: newSize };
    }
    return { ...r, [k]: v };
  }));

  const openRemainModal = () => {
    const existing = (remainLogs || []).filter(r => r && isSameDate(r.date, selDate));
    if (existing.length > 0) {
      setRemainRows(existing.map(r => ({
        id: r.id,
        brand: r.brand || invBrands[0] || "",
        size: r.size || (invSizesForBrand(r.brand || "")[0] || ""),
        fishStock: r.fishStock || (activeFishStockOptions[0]?.name || ""),
        remainingKg: r.remainingKg != null ? String(r.remainingKg) : ""
      })));
    } else {
      setRemainRows([blankRemainRow()]);
    }
    setRemainValidErr("");
    setShowRemainModal(true);
  };

  const [remainValidErr, setRemainValidErr] = useState("");
  const handleSaveRemain = async () => {
    const invalid = remainRows.find(r => !r.brand || !r.size || !r.fishStock || !(Number(r.remainingKg) >= 0 && r.remainingKg.trim() !== ""));
    if (invalid) {
      setRemainValidErr("All fields are required. Please complete Feed Brand, Pellet Size, Fish Stock, and Remaining Feed for every entry.");
      return;
    }

    // Duplicate check: combination is Brand + Fish Stock + Pallet Size
    const seen = new Set<string>();
    for (const r of remainRows) {
      const normStock = normalizeFishStock(r.fishStock).toLowerCase().trim();
      const key = `${r.brand.toLowerCase().trim()}__${normStock}__${r.size.toLowerCase().trim()}`;
      if (seen.has(key)) {
        setRemainValidErr("This has already been logged for this brand, fish stock, and pallet size.");
        return;
      }
      seen.add(key);

      // Check against other saved remainLogs for that date (excluding the record being edited)
      const isDupInSaved = (remainLogs || []).some(existing => {
        if (r.id && existing.id === r.id) return false;
        if (!isSameDate(existing.date, selDate)) return false;
        const exKey = `${(existing.brand || "").toLowerCase().trim()}__${normalizeFishStock(existing.fishStock || "").toLowerCase().trim()}__${(existing.size || "").toLowerCase().trim()}`;
        return exKey === key;
      });
      if (isDupInSaved) {
        setRemainValidErr("This has already been logged for this brand, fish stock, and pallet size.");
        return;
      }
    }

    setRemainValidErr("");
    try {
      for (const r of remainRows) {
        const val = Number(r.remainingKg) || 0;
        if (r.id) {
          const existingRec = (remainLogs || []).find(x => x.id === r.id);
          if (existingRec && onEditRemainLog) {
            await onEditRemainLog({
              ...existingRec,
              brand: r.brand,
              size: r.size,
              fishStock: normalizeFishStock(r.fishStock),
              remainingKg: val,
              date: selDate
            });
          }
        } else {
          await onAddRemainLog({
            id: uid(),
            brand: r.brand,
            size: r.size,
            fishStock: normalizeFishStock(r.fishStock),
            remainingKg: val,
            date: selDate
          });
        }
      }
      toast.success("Remaining feed logged");
      setShowRemainModal(false);
    } catch (err: any) {
      setRemainValidErr(err?.message || "Failed to save remaining feed");
    }
  };

  /* ── bulk log (Log Feeding — All Ponds) ── */
  const [bulkDate, setBulkDate] = useState(TODAY);
  const [bulkBy, setBulkBy] = useState(currentUser?.name || "");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [savingFeed, setSavingFeed] = useState(false);
  const nowTime = () => new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
  const [logTime] = useState(nowTime);

  /* Column reordering for Log Feeding table */
  type LogColKey = "initialStock" | "fishCount" | "size" | "morning" | "morningTime" | "evening" | "eveningTime" | "total";
  const DEFAULT_LOG_COLS: LogColKey[] = ["initialStock", "fishCount", "size", "morning", "morningTime", "evening", "eveningTime", "total"];
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
    return activePonds.map(p => {
      const existing = (feedingRecords || []).find(r => r && r.pond === p.name && (isSameDate(r.date, targetDate) || r.date === dateLabel));
      const defSize = existing?.size && availablePelletSizes.includes(existing.size)
        ? existing.size
        : (p.defaultPellet && availablePelletSizes.includes(p.defaultPellet) ? p.defaultPellet : (availablePelletSizes[0] || "4.0 mm"));
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
    setSavingFeed(true);

    const now = new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const recorder = bulkBy.trim() || currentUser?.name || "Admin";

    try {
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
            await onEditFeedRecord({
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
            });
          } else {
            const brandForFeed = (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && b.size === r.size && (!b.fishStock || normalizeFishStock(b.fishStock) === pondToStock(r.pondName)))?.brand || (inventory || []).find(f => f && f.size === r.size)?.brand || "";
            await onAddRecord({
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
            });
          }
        }
      }
      if (bulkDate) {
        const iso = bulkDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) {
          setViewYear(parseInt(iso[1], 10));
          setViewMonth(parseInt(iso[2], 10) - 1);
        }
      }
      setSelDate(dateLabel);
      setShowLog(false);
    } catch (err: any) {
      console.error("Error saving feeding records:", err);
      setFeedErr({ amounts: "Failed to save records. Please check connection." });
    } finally {
      setSavingFeed(false);
    }
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
    <div className="p-4 sm:p-6 space-y-5 w-full">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feeding Records</h1>
            <p className="text-xs text-slate-400 mt-0.5">Record and review daily feeding sessions across all active ponds grouped by Fish Stock.</p>
          </div>
          <div className="shrinking-0 relative" ref={feedMobileMenuRef}>
            <button onClick={() => setFeedMobileMenuOpen(p => !p)} className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-green-400 hover:text-green-600 transition-colors"><MoreVertical size={15} /></button>
            {feedMobileMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[150px]">
                <button onClick={() => { downloadDayCSV(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><Download size={13} /> Export CSV</button>
                <button onClick={() => { downloadDayPDF(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"><FileText size={13} /> Export PDF</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Date selector */}
          <div className="relative">
            <button onClick={() => setShowCal(p => !p)} className="flex items-center gap-2.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-green-400 hover:shadow-sm transition-all text-xs font-semibold text-slate-700">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
              <span className="font-['Barlow_Condensed',sans-serif] text-sm tracking-tight">{selDate}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${showCal ? "rotate-180" : ""}`} />
            </button>
            {showCal && (<>
              <div className="fixed inset-0 z-20" onClick={() => setShowCal(false)} />
              <div className="absolute left-0 top-full mt-2 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[280px]">
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
          {canCreate && (
            <div className="flex flex-wrap gap-2">
              <PBtn onClick={openLog} sm><Plus size={13} /> Log Feeding</PBtn>
              <PBtn onClick={openBagsModal} sm outline><Package size={13} /> Log Opened Bags</PBtn>
              <PBtn onClick={openRemainModal} sm outline><Droplets size={13} /> Log Remaining Feed</PBtn>
            </div>
          )}
        </div>
      </div>

      {/* Feeding Alert */}
      {(() => {
        const fedPonds = new Set((feedingRecords || []).filter(r => r && isSameDate(r.date, TODAY)).map(r => r.pond));
        const unfed = activePonds.filter(p => !fedPonds.has(p.name));
        if (unfed.length === 0) return null;
        return (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center shrink-0 mt-0.5"><span className="text-amber-800 font-bold text-xs">!</span></div>
            <div>
              <p className="text-xs font-bold text-amber-800">Feeding Alert — {unfed.length} pond{unfed.length !== 1 ? "s" : ""} not yet fed today</p>
              <p className="text-xs text-amber-700 mt-0.5">{unfed.map(p => p.name).join(", ")} have not been fed today.</p>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      {(() => {
        const totalPonds = activePonds.length;
        const pondsFedToday = [...new Set((feedingRecords || []).filter(r => r && isSameDate(r.date, selDate)).map(r => r.pond))].length;
        const pondsRemaining = Math.max(0, totalPonds - pondsFedToday);
        const bagsOpenedToday = (bagLogs || []).filter(b => b && isSameDate(b.date, selDate)).reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Ponds" value={String(totalPonds)} sub="active" icon={Layers} />
            <StatCard label="Ponds Fed" value={String(pondsFedToday)} sub={selDate} icon={CheckCircle} hi />
            <StatCard label="Ponds Remaining" value={String(pondsRemaining)} sub="not yet fed" icon={BookOpen} />
            <StatCard label="Bags Opened" value={String(bagsOpenedToday)} sub={selDate} icon={Package} />
          </div>
        );
      })()}

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-slate-200/90 border border-slate-300/70 p-1 rounded-xl w-fit shadow-2xs">
        {(["daily", "bags", "reconciliation"] as const).map(t => (
          <button key={t} onClick={() => setDocTab(t)} className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${docTab === t ? "bg-white text-green-700 font-bold shadow-sm border border-slate-200/80" : "text-slate-600 hover:text-slate-900"}`}>
            {t === "daily" ? "Daily Feed" : t === "bags" ? "Opened Bags" : "Reconciliation"}
            {t === "reconciliation" && hasMismatchOnSelDate && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-2 ring-white" />}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3">{docTab === "daily" ? "Daily feed records for the selected date." : docTab === "bags" ? "Bags opened and remaining feed for the selected date." : "Compare expected vs recorded feed usage."}</p>

      {/* ── Daily Feed tab ── */}
      {docTab === "daily" && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">{selDate}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{dayRecords.length > 0 ? `${dayRecords.length} session${dayRecords.length !== 1 ? "s" : ""} · ${dayGrand}kg total feed` : "No feeding records for this date"}</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input value={dailySearch} onChange={e => setDailySearch(e.target.value)} placeholder="Search pond, stock, or size…" className={`${IC} pl-8 w-52 text-xs py-1.5`} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky left-0 z-20 bg-slate-50">#</th>
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-[48px] z-20 bg-slate-50 border-r border-slate-200 min-w-[130px]">Pond</th>
                  {["Stock Date", "Initial Stock", "Fish Count", "Pellet Size", "Morning (kg)", "AM Time", "Evening (kg)", "PM Time", "Total (kg)", "Recorded By"].map(h => (
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
                        <p className="font-semibold text-slate-900">{pond.name}</p>
                        <p className="text-[11px] text-slate-400">{pond.type || "—"}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-teal-700 font-medium whitespace-nowrap">
                        {stockDateFormatted !== "—" ? (
                          <span className="inline-flex items-center gap-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{stockDateFormatted}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-['Barlow_Condensed',sans-serif] text-base">{pond.initialStock.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{pond.currentCount.toLocaleString()}</td>
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
                    <td colSpan={11} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
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
      )}

      {/* ── Opened Bags tab ── */}
      {docTab === "bags" && (
        <Card>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Fish Stock</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Stock Date</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Feed Brand</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Pellet Size</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Bags Opened</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Feed Deducted (kg)</th>
                  <th className="text-left px-4 py-3 text-[11px] text-slate-500 uppercase tracking-wider">Leftover Feed (kg)</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMergedBagRows.length === 0 && <tr><td colSpan={8} className="text-center text-xs text-slate-400 py-8">No bags logged for {selDate}</td></tr>}
                {filteredMergedBagRows.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatFishStock(row.fishStock)}</td>
                    <td className="px-4 py-3 text-teal-700 text-xs font-medium">{row.stockDate !== "—" ? <span className="bg-teal-50 px-2 py-0.5 rounded border border-teal-200">{row.stockDate}</span> : "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{row.brand}</td>
                    <td className="px-4 py-3"><Bdg label={row.size} color="blue" /></td>
                    <td className="px-4 py-3 font-bold text-slate-900">{row.bagsOpened > 0 ? `${row.bagsOpened} bag${row.bagsOpened !== 1 ? "s" : ""}` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 font-bold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">{row.totalKgOpened > 0 ? `${row.totalKgOpened} kg` : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">{row.remainingKg > 0 ? <span className="font-semibold text-amber-600">{row.remainingKg} kg</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3">{canEdit && row.lastBagLog && (isRecordEditable(row.lastBagLog.date) ? <button onClick={() => openEditDocBag(row.lastBagLog!)} className="p-1 rounded text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit"><Pencil size={13} /></button> : <button onClick={() => alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1 rounded text-slate-200 cursor-not-allowed" title="Locked"><Lock size={13} /></button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Reconciliation tab ── */}
      {docTab === "reconciliation" && (() => {
        const issues = filteredReconRows.filter(r => r.status !== "matched").length;
        return (
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Reconciliation — {selDate}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Organized by Fish Stock. Aggregates all ponds per Fish Stock. Tap a row for the breakdown.</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input value={reconSearch} onChange={e => setReconSearch(e.target.value)} placeholder="Search stock, brand, or pond…" className={`${IC} pl-8 w-52 text-xs py-1.5`} />
                </div>
                {issues > 0 && <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">{issues} issue{issues !== 1 ? "s" : ""}</span>}
              </div>
            </div>
            {filteredReconRows.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-400">No feeding data to reconcile for {selDate}.</p>
                <p className="text-xs text-slate-300 mt-1">Log feeding sessions and opened bags to see reconciliation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[160px]">Fish Stock</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Pellet Size</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Feed Brand</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Ponds</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Exp. Feed (kg)</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Exp. Bags</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Rec. Bags</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Exp. Remaining</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Rec. Remaining</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReconRows.map(r => {
                      const rowKey = `${r.fishStock}||${r.size}`;
                      const highlighted = !!(reconFocus && (reconFocus.key === `${r.fishStock}__${r.size}` || reconFocus.key === `${r.fishStock}__${r.brand}__${r.size}`));
                      const sc = STATUS_CFG[r.status] || STATUS_CFG.matched;
                      const bagErr = r.status === "bag_mismatch" || r.status === "multiple_mismatches";
                      const remErr = r.status === "remaining_mismatch" || r.status === "multiple_mismatches";
                      return (
                        <tr
                          key={rowKey}
                          onClick={() => setPopupRecon(r)}
                          className={`cursor-pointer transition-colors ${sc.rowBg} ${highlighted ? "outline outline-2 outline-green-400" : ""}`}
                          title="Click to view reconciliation detail popup"
                        >
                          <td className="px-4 py-3 sticky left-0 z-10 bg-white border-r border-slate-100 min-w-[160px]">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{formatFishStock(r.fishStock)}</p>
                            {r.stockDate && r.stockDate !== "—" && (
                              <p className="text-[10px] text-teal-700 font-medium mt-0.5">{r.stockDate}</p>
                            )}
                          </td>
                          <td className="px-4 py-3"><Bdg label={r.size} color="blue" /></td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{r.brand}</td>
                          <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                            {r.ponds.length === 0 ? (
                              <span className="text-slate-400 italic">None logged</span>
                            ) : r.ponds.length <= 2 ? (
                              <span className="font-medium">{r.ponds.join(", ")}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5" title={r.ponds.join(", ")}>
                                <span className="font-medium">{r.ponds.slice(0, 2).join(", ")}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 cursor-help" title={r.ponds.join(", ")}>
                                  +{r.ponds.length - 2} more
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{r.totalFed} kg</td>
                          <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{r.expectedBags}</td>
                          <td className={`px-4 py-3 font-semibold whitespace-nowrap ${bagErr ? "text-red-600 font-bold" : "text-slate-700"}`}>{r.recordedBags}</td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.expectedRemaining > 0 ? `${r.expectedRemaining} kg` : <span className="text-slate-300">—</span>}</td>
                          <td className={`px-4 py-3 font-semibold whitespace-nowrap ${remErr ? "text-red-600 font-bold" : "text-slate-600"}`}>{r.recordedRemaining > 0 ? `${r.recordedRemaining} kg` : <span className="text-slate-300">—</span>}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${sc.cls}`}>
                              {sc.label}
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
        );
      })()}

      {/* ── Reconciliation Popup (Desktop & Mobile 7-Step Breakdown) ── */}
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

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setPopupRecon(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150" style={{ maxHeight: "90vh" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Reconciliation Detail</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selDate} · <strong className="text-slate-700">{formatFishStock(pr.fishStock)}</strong> {pr.stockDate !== "—" && `(${pr.stockDate})`}</p>
                  <p className="text-xs text-slate-400">{pr.brand} · <span className="font-semibold text-blue-600">{pr.size}</span></p>
                </div>
                <button onClick={() => setPopupRecon(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
                <div className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center ${sc.cls}`}>{sc.label}</div>

                {/* Step 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Step 1 — Total Feed Given to Fish Stock</p>
                  <div className="space-y-1 mb-2">
                    {pondsForRow.length === 0 ? (
                      <p className="text-slate-400 italic text-xs py-1">No feeding recorded for this feed today.</p>
                    ) : (
                      pondsForRow.map(r => (
                        <div key={r.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                          <span className="text-slate-600 font-medium">{r.pond}</span>
                          <span className="font-bold text-slate-800">{r.total} kg</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                    <span className="font-bold text-slate-700">Total Feed Given ({formatFishStock(pr.fishStock)})</span>
                    <span className="font-black text-blue-700 text-sm">{pr.totalFed} kg</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Step 2 — Yesterday's Remaining</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Carryover from Yesterday</span>
                    <span className="font-semibold text-amber-600">{pr.carryover} kg</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`rounded-xl p-4 border ${qtyErr ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${qtyErr ? "text-red-500" : "text-slate-400"}`}>
                    Step 3 — Required New Feed{qtyErr && " ⚠ Feed Qty Mismatch"}
                  </p>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] pl-1 font-mono">
                    <span>{pr.totalFed} kg − {pr.carryover} kg</span>
                    <span>=</span>
                    <span className={`font-black text-sm ${qtyErr ? "text-red-600" : "text-blue-600"}`}>{pr.netNeeded} kg</span>
                  </div>
                  {qtyErr && (
                    <p className="text-[11px] text-red-600 font-semibold mt-1.5">
                      Feed given ({pr.totalFed}kg) exceeds available ({pr.carryover}kg carryover + {pr.recordedBags * pr.bagWeight}kg bags = {pr.carryover + (pr.recordedBags * pr.bagWeight)}kg)
                    </p>
                  )}
                </div>

                {/* Step 4 */}
                <div className={`rounded-xl p-4 border ${bagErr ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${bagErr ? "text-red-500" : "text-slate-400"}`}>
                    Step 4 — Expected Bags Opened{bagErr && " ⚠ Bag Count Mismatch"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Bag Weight ({pr.brand} {pr.size})</span>
                      <span className="font-semibold text-slate-700">{pr.bagWeight} kg/bag</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] pl-1 font-mono">
                      <span>{pr.netNeeded} kg ÷ {pr.bagWeight} kg</span>
                      <span>=</span>
                      <span className="font-bold text-slate-600">{ratio}</span>
                    </div>
                    <div className={`flex items-center justify-between border-t pt-1.5 ${bagErr ? "border-red-200" : "border-slate-100"}`}>
                      <span className="font-bold text-slate-600">Rounded up to</span>
                      <span className={`font-black text-sm ${bagErr ? "text-red-600" : "text-slate-900"}`}>{pr.expectedBags} bags</span>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className={`rounded-xl p-4 border ${bagErr ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${bagErr ? "text-red-500" : "text-slate-400"}`}>
                    Step 5 — Recorded Bags Opened
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Recorded Bags</span>
                    <span className={`font-black text-sm ${bagErr ? "text-red-600" : "text-green-600"}`}>
                      {pr.recordedBags} bag{pr.recordedBags !== 1 ? "s" : ""} {bagErr ? "✗" : "✓"}
                    </span>
                  </div>
                  {bagErr && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1.5">
                      Expected {pr.expectedBags} bags, recorded {pr.recordedBags} bags
                    </p>
                  )}
                </div>

                {/* Step 6 */}
                <div className={`rounded-xl p-4 border ${remErr ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${remErr ? "text-red-500" : "text-slate-400"}`}>
                    Step 6 — Expected Remaining{remErr && " ⚠ Remaining Mismatch"}
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] pl-1 font-mono">
                      <span>{pr.carryover}kg + ({pr.expectedBags} × {pr.bagWeight}kg) − {pr.totalFed}kg</span>
                      <span>=</span>
                      <span className="font-bold text-slate-800">{pr.expectedRemaining} kg</span>
                    </div>
                  </div>
                </div>

                {/* Step 7 */}
                <div className={`rounded-xl p-4 border ${remErr ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${remErr ? "text-red-500" : "text-slate-400"}`}>
                    Step 7 — Recorded Remaining
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Expected</p>
                      <p className="font-bold text-slate-800">{pr.expectedRemaining} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Recorded</p>
                      <p className={`font-bold ${remErr ? "text-red-600" : "text-green-600"}`}>
                        {pr.recordedRemaining} kg {remErr ? "✗" : "✓"}
                      </p>
                    </div>
                  </div>
                  {remErr && (
                    <p className="text-[11px] text-red-500 font-semibold mt-1.5">
                      Difference of {Math.abs(pr.expectedRemaining - pr.recordedRemaining).toFixed(1)} kg
                    </p>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                <button onClick={() => setPopupRecon(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Bulk Feeding Log Modal (Brand removed, Fish Stock under Pond, Auto-Recorded By) ── */}
      {showLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowLog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden" style={{ maxHeight: "92vh" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0 z-20">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Feeding — All Ponds</h2>
                <p className="text-xs text-slate-400 mt-0.5">Enter morning &amp; evening amounts for each pond. Fish Stock and Stocked Date are tied directly to each pond.</p>
              </div>
              <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-end">
                <div className="min-w-[160px]">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Date</label>
                  <DateInput value={bulkDate} onChange={handleBulkDateChange} />
                </div>
                <div className="min-w-[220px]">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">Recorded By</label>
                    {currentUser?.name && (
                      <span className="text-[10px] text-green-600 font-medium">Auto-populated</span>
                    )}
                  </div>
                  <input
                    value={bulkBy}
                    onChange={e => setBulkBy(e.target.value)}
                    className={IC}
                    placeholder={currentUser?.name || "Employee / Admin name"}
                  />
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-slate-400">Session time:</span>
                  <span className="text-sm font-semibold text-slate-700 font-['Barlow_Condensed',sans-serif]">{logTime}</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-30 shadow-xs bg-slate-50">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky top-0 left-0 z-40 bg-slate-100">#</th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left min-w-[160px] sticky top-0 left-[48px] z-40 bg-slate-100 border-r border-slate-200">Pond</th>
                    {logColOrder.map(col => {
                      let label = "";
                      let align = "text-left";
                      let minW = "min-w-[95px]";
                      switch (col) {
                        case "initialStock": label = "Initial Stock"; align = "text-right"; minW = "min-w-[85px]"; break;
                        case "fishCount": label = "Fish Count"; align = "text-right"; minW = "min-w-[85px]"; break;
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
                <tbody className="divide-y divide-slate-100">
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
                        <td className={`px-4 py-3 min-w-[160px] sticky left-[48px] z-10 border-r border-slate-200 ${hasFeed ? "bg-[#f2faf4]" : "bg-white"}`}>
                          <p className="font-bold text-slate-900 leading-tight">{row.pondName}</p>
                          <p className="text-[11px] font-medium text-teal-700 leading-tight mt-0.5">
                            {row.fishStock || "Current Stock"}
                          </p>
                        </td>
                        {logColOrder.map(col => {
                          switch (col) {
                            case "initialStock":
                              return (
                                <td key={col} className="px-3 py-3 text-right text-slate-500 font-['Barlow_Condensed',sans-serif] text-base">
                                  {row.initialStock.toLocaleString()}
                                </td>
                              );
                            case "fishCount":
                              return (
                                <td key={col} className="px-3 py-3 text-right">
                                  <span className="font-semibold text-green-700 font-['Barlow_Condensed',sans-serif] text-base">
                                    {row.currentCount.toLocaleString()}
                                  </span>
                                </td>
                              );
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
                                      const label = !stock.exists || stock.availableQty <= 0
                                        ? `${s} (0 available)`
                                        : `${s} (${stock.availableQty} available)`;
                                      return <option key={s} value={s}>{label}</option>;
                                    })}
                                    {row.size && !availablePelletSizes.includes(row.size) && <option value={row.size}>{row.size}</option>}
                                  </select>
                                  {rowAtMax && <p className="text-[10px] font-bold mt-0.5 text-red-600">⚠ Max weight reached</p>}
                                  {(() => {
                                    const stock = getPelletStock(row.size);
                                    if (!stock.exists || stock.availableQty <= 0) {
                                      return <p className="text-[10px] font-bold mt-0.5 text-red-600">0 available</p>;
                                    }
                                    return <p className="text-[10px] font-medium mt-0.5 text-slate-500">{stock.availableQty} available</p>;
                                  })()}
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
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
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

      {/* ── Log Opened Bags Modal (5-Step Workflow with Deduction Validation) ── */}
      {showBagsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowBagsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{ maxHeight: "88vh" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Opened Bags</h2>
                <p className="text-xs text-slate-400 mt-0.5">Select Fish Stock, Brand &amp; Pellet Size to record bags and deduct from inventory.</p>
              </div>
              <button onClick={() => setShowBagsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="min-w-[160px] max-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">Date</label>
                <DateInput value={bagsDate} onChange={v => { setBagsDate(v); if (v) setBagsErr(p => ({ ...p, date: "" })); }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {bagRows.map((row, i) => {
                const avail = getStockAvailable(row.brand, row.size);
                const requestedBags = Number(row.qty) || 0;
                const requestedKg = requestedBags * row.kgPerBag;
                const isOverStock = requestedBags > avail.remainingBags;

                return (
                  <div key={i} className={`p-4 border rounded-xl relative space-y-3 ${isOverStock ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50"}`}>
                    {bagRows.length > 1 && <button type="button" onClick={() => removeBagRow(i)} className="absolute top-3 right-3 p-1 rounded text-slate-300 hover:text-red-400 transition-colors"><X size={13} /></button>}

                    {/* 1. Fish Stock Selection */}
                    <F label="1. Fish Stock (Grouping & Date)">
                      <select value={row.fishStock} onChange={e => updateBagRow(i, "fishStock", e.target.value)} className={SC}>
                        <option value="">Select fish stock…</option>
                        {activeFishStockOptions.map(opt => (
                          <option key={opt.name} value={opt.name}>{opt.label}</option>
                        ))}
                      </select>
                    </F>

                    {/* 2. Brand & 3. Pellet Size */}
                    <div className="grid grid-cols-2 gap-3">
                      <F label="2. Feed Brand">
                        <SearchableSelect value={row.brand} onChange={v => { updateBagRow(i, "brand", v); const szs = invSizesForBrand(v); if (szs.length > 0 && !szs.includes(row.size)) updateBagRow(i, "size", szs[0]); }} options={invBrands} placeholder="Select brand…" />
                      </F>
                      <F label="3. Pellet Size">
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
                          className={SC}
                        >
                          {invSizesForBrand(row.brand).map(s => {
                            const alreadyLogged = isStockAndSizeAlreadyLogged(row.fishStock, s, bagsDate);
                            return (
                              <option key={s} value={s}>
                                {s}{alreadyLogged ? " (Already Logged Today)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </F>
                    </div>

                    {/* Available Feed in Stock Indicator */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs">
                      <span className="text-slate-500">Available Feed in Stock:</span>
                      <span className={`font-bold ${avail.remainingBags <= 2 ? "text-amber-700" : "text-slate-800"}`}>
                        {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg} kg)
                      </span>
                    </div>

                    {/* 4. Bags Opened */}
                    <F label="4. Bags Opened">
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={e => updateBagRow(i, "qty", e.target.value)}
                        className={`${IC} ${isOverStock ? "border-red-400 focus:ring-red-200" : ""}`}
                        placeholder="0"
                      />
                    </F>

                    {/* 5. Live Calculated KG & Validation Warning */}
                    {requestedBags > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-green-700 font-bold">
                          Total: {requestedKg} kg ({requestedBags} bag{requestedBags !== 1 ? "s" : ""} × {row.kgPerBag} kg/bag)
                        </p>
                        {isOverStock && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100/70 px-3 py-1.5 rounded-lg border border-red-200">
                            <AlertTriangle size={13} className="shrink-0" />
                            <span>Insufficient stock! Available: {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg}kg). Cannot deduct {requestedBags} bags.</span>
                          </div>
                        )}
                      </div>
                    )}
                    {(() => {
                      const isAlreadyLogged = isStockAndSizeAlreadyLogged(row.fishStock, row.size, bagsDate);
                      const isDupInForm = bagRows.findIndex((other, idx) =>
                        idx < i &&
                        normalizeFishStock(other.fishStock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() &&
                        other.size.toLowerCase().trim() === row.size.toLowerCase().trim()
                      ) !== -1;

                      if (isAlreadyLogged) {
                        return (
                          <div className="flex items-start gap-2 text-xs font-semibold text-red-800 bg-red-100/90 px-3.5 py-2.5 rounded-xl border border-red-300">
                            <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-red-900">Cannot log bag open twice!</p>
                              <p className="text-[11px] text-red-700 font-normal mt-0.5">
                                Fish Stock <strong>{row.fishStock}</strong> with pellet size <strong>{row.size}</strong> has already been recorded for {toDateLabel(bagsDate)}. You can only log for this stock if the pellet size is different.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      if (isDupInForm) {
                        return (
                          <div className="flex items-start gap-2 text-xs font-semibold text-amber-800 bg-amber-100/90 px-3.5 py-2.5 rounded-xl border border-amber-300">
                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-900">Duplicate in this form</p>
                              <p className="text-[11px] text-amber-700 font-normal mt-0.5">
                                <strong>{row.fishStock}</strong> with pellet size <strong>{row.size}</strong> is already entered above. You can only log for the same stock if the pellet size is different.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      if (bagsErr[`dup_${i}`]) {
                        return (
                          <div className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-100/90 px-3.5 py-2 rounded-lg border border-red-300">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600" />
                            <span>{bagsErr[`dup_${i}`]}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })}
              <button type="button" onClick={addBagRow} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:text-green-700 transition-colors py-1"><Plus size={13} /> Add another entry</button>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 rounded-b-2xl">
              <div className="flex items-center justify-end gap-3">
                <p className="text-sm text-slate-500 mr-auto"><span className="font-semibold text-green-600">{filledBagRows.length}</span> entr{filledBagRows.length !== 1 ? "ies" : "y"} filled</p>
                <button onClick={() => { setShowBagsModal(false); setBagsErr({}); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
                <PBtn onClick={handleSaveBags} sm><CheckCircle size={14} /> Save Log</PBtn>
              </div>
              {Object.keys(bagsErr).length > 0 && (
                <div className="mt-2 space-y-0.5">
                  {Object.entries(bagsErr).map(([k, msg]) => (
                    <p key={k} className="text-xs text-red-500">{msg}</p>
                  ))}
                </div>
              )}
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
                    const label = !stock.exists
                      ? `${s} (Not in stock)`
                      : stock.availableKg <= 0
                        ? `${s} (Empty - 0kg)`
                        : `${s} (${Math.round(stock.availableKg * 10) / 10}kg available)`;
                    return <option key={s} value={s}>{label}</option>;
                  })}
                  {editRec.size && !availablePelletSizes.includes(editRec.size) && <option value={editRec.size}>{editRec.size}</option>}
                </select>
                {(() => {
                  const stock = getPelletStock(editRec.size, editRec.id);
                  if (!stock.exists) {
                    return <p className="text-xs font-bold text-amber-600 mt-1">⚠ This pellet size is not in Feed Inventory</p>;
                  }
                  if (stock.availableKg <= 0) {
                    return <p className="text-xs font-bold text-red-600 mt-1">⚠ This pellet size is empty (0 kg remaining in stock)</p>;
                  }
                  return <p className="text-xs text-slate-500 mt-1">Stock available: {Math.round(stock.availableKg * 10) / 10} kg</p>;
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
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Edit Bag Log</h2>
                <p className="text-xs text-slate-400 mt-0.5">{editDocBag.brand} · {editDocBag.size} · {editDocBag.date}</p>
              </div>
              <button onClick={() => setEditDocBag(null)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Bags Opened</p>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Bags Opened"><NumInput value={editDocBag.bagsOpened} onChange={v => setEditDocBag(p => p ? { ...p, bagsOpened: Number(v) || 0 } : p)} className={IC} allowDecimal={false} /></F>
                  <F label="kg per Bag"><NumInput value={editDocBag.kgPerBag} onChange={v => setEditDocBag(p => p ? { ...p, kgPerBag: Number(v) || 0 } : p)} className={IC} /></F>
                </div>
                <p className="text-xs text-slate-400 mt-1">Total: <strong className="text-slate-700">{editDocBag.bagsOpened * editDocBag.kgPerBag} kg</strong></p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Remaining Feed</p>
                <F label="Remaining Feed (kg)">
                  <input type="number" min="0" step="0.1" value={editBagRemainKg} onChange={e => setEditBagRemainKg(e.target.value)} placeholder="e.g. 3.5" className={IC} />
                </F>
                {editDocBag.fishStock && <p className="text-[11px] text-slate-500 mt-1">Linked to: <span className="font-semibold">{editDocBag.fishStock}</span></p>}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3 rounded-b-2xl">
              <button onClick={() => setEditDocBag(null)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditDocBag}><CheckCircle size={14} /> Save Changes</PBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Remaining Feed Modal ── */}
      {showRemainModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowRemainModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col" style={{ maxHeight: "88vh" }}>
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Remaining Feed</h2>
                <p className="text-xs text-slate-400 mt-0.5">Record leftover feed for {selDate}</p>
              </div>
              <button onClick={() => setShowRemainModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {remainRows.map((row, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative space-y-3">
                  {remainRows.length > 1 && <button type="button" onClick={() => removeRemainRow(i)} className="absolute top-3 right-3 p-1 rounded text-slate-300 hover:text-red-400 transition-colors"><X size={13} /></button>}
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Feed Brand">
                      <SearchableSelect value={row.brand} onChange={v => { updateRemainRow(i, "brand", v); const szs = invSizesForBrand(v); if (szs.length > 0 && !szs.includes(row.size)) updateRemainRow(i, "size", szs[0]); }} options={invBrands} placeholder="Select brand…" />
                    </F>
                    <F label="Pellet Size">
                      <select value={row.size} onChange={e => updateRemainRow(i, "size", e.target.value)} className={SC}>{invSizesForBrand(row.brand).map(s => <option key={s}>{s}</option>)}</select>
                    </F>
                  </div>
                  <F label="Fish Stock">
                    <select value={row.fishStock} onChange={e => updateRemainRow(i, "fishStock", e.target.value)} className={SC}>
                      <option value="">Select fish stock…</option>
                      {activeFishStockOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.label}</option>)}
                    </select>
                  </F>
                  <F label="Remaining Feed (kg)">
                    <input type="number" min="0" step="0.1" value={row.remainingKg} onChange={e => updateRemainRow(i, "remainingKg", e.target.value)} className={IC} placeholder="e.g. 3.5" />
                  </F>
                </div>
              ))}
              <button type="button" onClick={addRemainRow} className="flex items-center gap-1.5 text-xs text-green-600 font-semibold hover:text-green-700 transition-colors py-1"><Plus size={13} /> Add another entry</button>
            </div>
            {remainValidErr && <div className="mx-6 mb-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">{remainValidErr}</div>}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowRemainModal(false); setRemainValidErr(""); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveRemain} sm><CheckCircle size={14} /> Save Log</PBtn>
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
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Feed Record</h2>
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
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pellet Size</p><Bdg label={viewFeedRec.size} color="blue" /></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Recorded By</p><p className="text-sm text-slate-700">{viewFeedRec.recordedBy || "—"}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Morning</p><p className="text-sm font-bold text-slate-800">{viewFeedRec.morning} kg</p></div>
                <div className="bg-slate-50 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Evening</p><p className="text-sm font-bold text-slate-800">{viewFeedRec.evening} kg</p></div>
                <div className="bg-green-50 rounded-xl p-3 border border-green-200"><p className="text-[10px] uppercase tracking-wider text-green-600 mb-0.5">Total</p><p className="text-sm font-black text-green-700">{viewFeedRec.total} kg</p></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 shrink-0">
              <button onClick={() => setViewFeedRec(null)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-colors">Close</button>
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
