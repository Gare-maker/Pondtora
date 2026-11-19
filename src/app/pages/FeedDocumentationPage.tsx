import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus, CheckCircle, X, Layers, Droplets,
  ChevronDown, ChevronLeft, ChevronRight,
  Package, BookOpen, Download, FileText, Pencil, Trash2, MoreVertical, Lock, History, Fish, Search, AlertTriangle, AlertCircle, Eye,
  Calendar, ArrowRightLeft, ArrowRight, Send, Check, Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { FeedingRecord, FeedEditEntry, Pond, FeedItem, BagOpenLog, FeedRemainingLog, FeedTransferRecord, StockEvent } from "../types";
import { TODAY, toMon, toYr, uid, downloadCSV, openPrintWindow, formatFishStockDate, formatFishStock, fmtStockingDate, isSameDate, isFormattedDate, FEED_SIZES, FEED_BRANDS, getPondFishStock, getLagosDateParts, isManualPrevDayBalanceLog } from "../data";
import { toValidDbDate } from "../../lib/api";
import { Card, PBtn, Pagination, PER_PAGE, StatCard, F, IC, SC, SearchableSelect, Bdg, DateInput, NumInput } from "../shared";

interface BulkRow {
  rowId: string;
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
  isExtraPallet?: boolean;
  palletNumber?: number;
  existingRecordId?: string;
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

export interface MismatchStockRow {
  stockKey: string;
  stockName: string;
  stockDate: string;
  brand: string;
  size: string;
  status: "Not Opened" | "Bag Mismatch" | "Remaining Mismatch" | "Multiple Mismatches";
  expectedBags: number;
  recordedBags: number;
  expectedRemaining: number;
  recordedRemaining: number | null;
  totalFed: number;
  carryover: number;
  reason: string;
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
  carryoverKg?: number;
  feedRemainingToday?: number | null;
  hasBagLog?: boolean;
  hasRemainLog?: boolean;
  hasFedToday?: boolean;
  totalFedToday?: number;
  transfersOut?: FeedTransferRecord[];
  transfersIn?: FeedTransferRecord[];
  totalTransferredOutKg?: number;
  totalTransferredInKg?: number;
  availableRemainingKg?: number;
  grossRemainingKg?: number;
  isManualPrevDayBalance?: boolean;
  initialManualRemainingKg?: number;
  manualFedDeductedKg?: number;
  usedKgToday?: number;
};

export interface ManualPrevBalanceRecord {
  id: string;
  brand: string;
  size: string;
  bagsOpened: number;
  kgPerBag: number;
  initialRemainingKg: number;
  currentRemainingKg: number;
  date: string;
  dateIso: string;
  fishStock: string;
  baselineFedKg: number;
  baselineByRecordId?: Record<string, number>;
  createdAt: string;
  createdBy?: string;
  farmId?: string;
}

export type BagRow = {
  id?: string;
  fishStock: string;
  brand: string;
  size: string;
  kgPerBag: number;
  qty: string;
  usedKg?: string;
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
  isOwner,
  currentUser,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  stockEvents = [],
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
  isOwner?: boolean;
  currentUser?: { name: string; email: string; role?: string };
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  stockEvents?: StockEvent[];
}) {
  const isAdmin = isOwner !== undefined
    ? Boolean(isOwner)
    : (!currentUser?.role || currentUser.role === "Admin" || currentUser.role === "Director" || currentUser.role === "owner");
  const lagosToday = useMemo(() => getLagosDateParts(), []);
  const realTodayLabel = `${MON_NAMES[lagosToday.month]} ${lagosToday.day}`;
  const isRecordEditable = (dateLabel?: string | null) => canEditLocked || (dateLabel ? isSameDate(dateLabel, TODAY) || isSameDate(dateLabel, realTodayLabel) : false);

  /* ── ui state ── */
  const [showLog, setShowLog] = useState(false);
  const [feedErr, setFeedErr] = useState<Record<string, string>>({});
  const [showCal, setShowCal] = useState(false);
  const [showBagsModal, setShowBagsModal] = useState(false);
  const [bagsModalLockedStock, setBagsModalLockedStock] = useState<string | null>(null);
  const [bagsErr, setBagsErr] = useState<Record<string, string>>({});
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null);
  const [docTab, setDocTab] = useState<"daily" | "bags" | "mismatch">("daily");
  const [bulkMobileView, setBulkMobileView] = useState<"table" | "card">("table");
  const [bagsHighlight, setBagsHighlight] = useState<{
    stock: string;
    size: string;
    brand?: string;
    col?: "bags" | "remaining" | "all";
  } | null>(null);
  const [feedMobileMenuOpen, setFeedMobileMenuOpen] = useState(false);
  const [feedMenuPlacement, setFeedMenuPlacement] = useState<"left" | "right">("left");
  const feedMobileMenuRef = useRef<HTMLDivElement>(null);
  const [viewBagDetail, setViewBagDetail] = useState<MergedBagRow | null>(null);
  const [activeDailyMenuId, setActiveDailyMenuId] = useState<string | null>(null);
  const [activeBagMenuId, setActiveBagMenuId] = useState<string | null>(null);

  /* ── Stock Selection Filters (Independent per tab) ── */
  const [dailyStockFilter, setDailyStockFilter] = useState<string>("All");
  const [bagsStockFilter, setBagsStockFilter] = useState<string>("All");

  /* ── Feeding Status Filter: all | fed | not_fed ── */
  const [feedStatusFilter, setFeedStatusFilter] = useState<"all" | "fed" | "not_fed">("all");


  useEffect(() => {
    const handleOutsideInteraction = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (feedMobileMenuRef.current && !feedMobileMenuRef.current.contains(target as Node)) {
        setFeedMobileMenuOpen(false);
      }
      if (target?.closest("[data-bag-menu-button]") || target?.closest("[data-bag-menu-dropdown]")) {
        return;
      }
      setActiveBagMenuId(null);
      setActiveDailyMenuId(null);
    };

    const handleScroll = () => {
      setActiveBagMenuId(null);
      setActiveDailyMenuId(null);
    };

    document.addEventListener("pointerdown", handleOutsideInteraction, true);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideInteraction, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  /* ── pellet size normalization helper ── */
  const isSamePelletSize = (a?: string | null, b?: string | null): boolean => {
    if (!a || !b) return false;
    const cleanA = String(a).toLowerCase().replace(/\s+/g, "").trim();
    const cleanB = String(b).toLowerCase().replace(/\s+/g, "").trim();
    if (cleanA === cleanB) return true;
    const numA = parseFloat(cleanA);
    const numB = parseFloat(cleanB);
    if (!isNaN(numA) && !isNaN(numB) && numA === numB) return true;
    return false;
  };

  /* ── calendar state (Africa/Lagos timezone) ── */
  const [viewYear, setViewYear] = useState(lagosToday.year);
  const [viewMonth, setViewMonth] = useState(lagosToday.month);
  const [selDate, setSelDate] = useState(`${MON_NAMES[lagosToday.month]} ${lagosToday.day}`);
  const navMonth = (dir: number) => { let m = viewMonth + dir, y = viewYear; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setViewMonth(m); setViewYear(y); };
  const curMonLabel = MON_NAMES[viewMonth];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const calCells = Array(42).fill(null).map((_, i) => { const d = i - firstDayOfWeek + 1; return (d >= 1 && d <= daysInMonth) ? d : null; });

  /* ── Remaining Feed Transfers State & Persistence ── */
  const activeFarmId = ponds[0]?.farmId || "default";

  /* ── Daily Feed Balance per-brand Quantity Used (kg) persistence (independent of Feed Stock & Feeding Records) ── */
  const dailyBrandUsedStorageKey = useMemo(
    () => `pondtora_daily_brand_used_${activeFarmId || "default"}`,
    [activeFarmId]
  );
  const [dailyBrandUsedMap, setDailyBrandUsedMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(`pondtora_daily_brand_used_${activeFarmId || "default"}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch { }
    return {};
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(dailyBrandUsedStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setDailyBrandUsedMap(parsed);
          return;
        }
      }
    } catch { }
    setDailyBrandUsedMap({});
  }, [dailyBrandUsedStorageKey]);
  const persistDailyBrandUsedMap = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
    setDailyBrandUsedMap(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(dailyBrandUsedStorageKey, JSON.stringify(next));
      } catch { }
      return next;
    });
  }, [dailyBrandUsedStorageKey]);
  const [feedTransfers, setFeedTransfers] = useState<FeedTransferRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`pondtora_feed_transfers_${activeFarmId}`) || localStorage.getItem("pondtora_feed_transfers");
      if (raw) return JSON.parse(raw);
    } catch { }
    return [];
  });

  const saveFeedTransfers = useCallback((updated: FeedTransferRecord[]) => {
    setFeedTransfers(updated);
    try {
      localStorage.setItem(`pondtora_feed_transfers_${activeFarmId}`, JSON.stringify(updated));
      localStorage.setItem("pondtora_feed_transfers", JSON.stringify(updated));
    } catch { }
  }, [activeFarmId]);

  /* ── Manual Previous-Day Feed Balance State & Persistence (Admin Reconciliation) ── */
  const loadMergedManualBalances = useCallback((farmIdStr: string): ManualPrevBalanceRecord[] => {
    try {
      const listA: ManualPrevBalanceRecord[] = JSON.parse(localStorage.getItem(`pondtora_manual_feed_balances_${farmIdStr}`) || "[]");
      const listB: ManualPrevBalanceRecord[] = JSON.parse(localStorage.getItem("pondtora_manual_feed_balances") || "[]");
      const merged: ManualPrevBalanceRecord[] = [];
      [...(Array.isArray(listA) ? listA : []), ...(Array.isArray(listB) ? listB : [])].forEach(item => {
        if (!item || !item.brand || !item.size) return;
        if (!merged.some(m => m.id === item.id || (isSameDate(m.date, item.date) && isSamePelletSize(m.size, item.size) && m.brand.toLowerCase().trim() === item.brand.toLowerCase().trim()))) {
          merged.push(item);
        }
      });
      return merged;
    } catch {
      return [];
    }
  }, []);

  const [manualPrevBalances, setManualPrevBalances] = useState<ManualPrevBalanceRecord[]>(() => loadMergedManualBalances(activeFarmId));

  useEffect(() => {
    const merged = loadMergedManualBalances(activeFarmId);
    if (merged.length > 0) {
      setManualPrevBalances(prev => {
        const combined = [...prev];
        let changed = false;
        merged.forEach(item => {
          if (!combined.some(m => m.id === item.id || (isSameDate(m.date, item.date) && isSamePelletSize(m.size, item.size) && m.brand.toLowerCase().trim() === item.brand.toLowerCase().trim()))) {
            combined.push(item);
            changed = true;
          }
        });
        return changed ? combined : (prev.length === 0 ? merged : prev);
      });
    }
  }, [activeFarmId, loadMergedManualBalances]);

  const saveManualPrevBalances = useCallback((updated: ManualPrevBalanceRecord[]) => {
    setManualPrevBalances(updated);
    try {
      localStorage.setItem(`pondtora_manual_feed_balances_${activeFarmId}`, JSON.stringify(updated));
      localStorage.setItem("pondtora_manual_feed_balances", JSON.stringify(updated));
    } catch { }
  }, [activeFarmId]);

  const isManualPrevDayLog = useCallback((log: any): boolean => {
    if (!log) return false;
    if (log.isManualPrevDayBalance || log.reason === "MANUAL_PREV_DAY_BALANCE") return true;
    if (typeof log.pond === "string" && log.pond.startsWith("__MANUAL_PREV_DAY_BALANCE__")) return true;
    return (manualPrevBalances || []).some(m =>
      m && (
        m.id === log.id ||
        (isSameDate(m.date, log.date) && isSamePelletSize(m.size, log.size) && m.brand.toLowerCase().trim() === (log.brand || "").toLowerCase().trim())
      )
    );
  }, [manualPrevBalances]);

  useEffect(() => {
    const manualBagLogs = (bagLogs || []).filter(b => b && (b.isManualPrevDayBalance || b.reason === "MANUAL_PREV_DAY_BALANCE" || (typeof (b as any).pond === "string" && (b as any).pond.startsWith("__MANUAL_PREV_DAY_BALANCE__"))));
    if (manualBagLogs.length === 0) return;
    setManualPrevBalances(prev => {
      let changed = false;
      const next = [...prev];
      manualBagLogs.forEach(b => {
        if (!next.some(m => m.id === b.id || (m.brand.toLowerCase().trim() === (b.brand || "").toLowerCase().trim() && isSamePelletSize(m.size, b.size) && isSameDate(m.date, b.date)))) {
          const matchingRem = (remainLogs || []).find(r => r && (r.id === b.id || (isSameDate(r.date, b.date) && isSamePelletSize(r.size, b.size) && (r.brand || "").toLowerCase().trim() === (b.brand || "").toLowerCase().trim())));
          let parsedInitRem: number | undefined;
          let parsedBaseFed: number | undefined;
          if (typeof (b as any).pond === "string" && (b as any).pond.startsWith("__MANUAL_PREV_DAY_BALANCE__")) {
            const parts = (b as any).pond.split(":");
            if (parts[1] !== undefined && parts[1] !== "" && !isNaN(Number(parts[1]))) parsedInitRem = Number(parts[1]);
            if (parts[2] !== undefined && parts[2] !== "" && !isNaN(Number(parts[2]))) parsedBaseFed = Number(parts[2]);
          }
          const initRem = b.initialRemainingKg ?? parsedInitRem ?? matchingRem?.initialRemainingKg ?? matchingRem?.remainingKg ?? 0;
          const dIso = toValidDbDate(b.date, viewYear) || TODAY;
          next.push({
            id: b.id,
            farmId: activeFarmId,
            date: toDateLabel(b.date) || b.date,
            dateIso: dIso,
            brand: b.brand,
            size: b.size,
            bagsOpened: Number(b.bagsOpened) || 1,
            kgPerBag: Number(b.kgPerBag) || 15,
            initialRemainingKg: Number(initRem) || 0,
            currentRemainingKg: Number(matchingRem?.remainingKg ?? initRem) || 0,
            baselineFedKg: Number(b.baselineFedKg ?? parsedBaseFed ?? matchingRem?.baselineFedKg ?? 0) || 0,
            fishStock: b.fishStock || "—",
            recordedBy: b.openedBy || "Admin",
            createdAt: new Date().toISOString()
          });
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(`pondtora_manual_feed_balances_${activeFarmId}`, JSON.stringify(next));
          localStorage.setItem("pondtora_manual_feed_balances", JSON.stringify(next));
        } catch { }
        return next;
      }
      return prev;
    });
  }, [bagLogs, remainLogs, activeFarmId, viewYear]);

  const [showManualPrevModal, setShowManualPrevModal] = useState(false);
  const [manualPrevRows, setManualPrevRows] = useState<{
    fishStock: string;
    size: string;
    brand: string;
    bagsOpened: string;
    remainingKg: string;
    kgPerBag: number;
  }[]>([]);
  const [manualErr, setManualErr] = useState<Record<string, string>>({});
  const [isSavingManualPrev, setIsSavingManualPrev] = useState(false);

  /* ── Transfer Pop-up Modal State ── */
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTransferRow, setSelectedTransferRow] = useState<MergedBagRow | null>(null);
  const [transferDestStock, setTransferDestStock] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [transferDate, setTransferDate] = useState(selDate);
  const [transferNotes, setTransferNotes] = useState("");
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  /* ── Transfer History Modal State ── */
  const [isTransferHistoryOpen, setIsTransferHistoryOpen] = useState(false);
  const [historyStockFilter, setHistoryStockFilter] = useState("All");

  const getIsoDateForSelDate = useCallback((targetDate: string): string => {
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
  }, [viewYear]);

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
    (feedingRecords || []).forEach(r => r && processDate(r.date, r.month, r.year));
    (bagLogs || []).forEach(b => b && processDate(b.date, b.month, b.year));
    (remainLogs || []).forEach(rem => rem && processDate(rem.date, rem.month, rem.year));
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

  /* ── pondToStock & normalizeFishStock helpers (Date-Aware for selDate) ── */
  const isPondName = useCallback((str?: string | null): boolean => {
    if (!str || str === "—" || typeof str !== "string" || !str.trim()) return false;
    const lower = str.trim().toLowerCase();
    return (ponds || []).some(p => p && p.name && p.name.trim().toLowerCase() === lower);
  }, [ponds]);

  /* Helper to convert any date representation to comparable ISO format YYYY-MM-DD */
  const dateToIso = useCallback((val?: string | null): string => {
    if (!val || val === "—") return "";
    const s = String(val).trim();
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${String(parseInt(isoMatch[2], 10)).padStart(2, "0")}-${String(parseInt(isoMatch[3], 10)).padStart(2, "0")}`;

    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) return `${dmyMatch[3]}-${String(parseInt(dmyMatch[2], 10)).padStart(2, "0")}-${String(parseInt(dmyMatch[1], 10)).padStart(2, "0")}`;

    const clean = s.replace(/(st|nd|rd|th),?/gi, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
    const parts = clean.split(" ");
    if (parts.length >= 2) {
      const mIdxFirst = MON_NAMES.findIndex(m => m.toLowerCase() === parts[0].toLowerCase().slice(0, 3));
      const daySecond = parseInt(parts[1], 10);
      const yearThird = parts[2] && /^\d{4}$/.test(parts[2]) ? parseInt(parts[2], 10) : (viewYear || new Date().getFullYear());
      if (mIdxFirst !== -1 && !isNaN(daySecond) && daySecond >= 1 && daySecond <= 31) {
        return `${yearThird}-${String(mIdxFirst + 1).padStart(2, "0")}-${String(daySecond).padStart(2, "0")}`;
      }
      const dayFirst = parseInt(parts[0], 10);
      const mIdxSecond = MON_NAMES.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
      const yearThird2 = parts[2] && /^\d{4}$/.test(parts[2]) ? parseInt(parts[2], 10) : (viewYear || new Date().getFullYear());
      if (!isNaN(dayFirst) && dayFirst >= 1 && dayFirst <= 31 && mIdxSecond !== -1) {
        return `${yearThird2}-${String(mIdxSecond + 1).padStart(2, "0")}-${String(dayFirst).padStart(2, "0")}`;
      }
    }

    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return s;
  }, [viewYear]);

  /* Lightweight stock label comparison for lifecycle reconstruction */
  const isRawStockLabelMatch = useCallback((a?: string | null, b?: string | null): boolean => {
    if (!a || !b || a === "—" || b === "—") return false;
    const sa = a.trim().toLowerCase();
    const sb = b.trim().toLowerCase();
    if (sa === sb) return true;
    const da = formatFishStockDate(a);
    const db = formatFishStockDate(b);
    if (da && da !== "—" && isFormattedDate(da) && db && db !== "—" && isFormattedDate(db)) {
      return isSameDate(da, db);
    }
    const fa = formatFishStock(a).trim().toLowerCase();
    const fb = formatFishStock(b).trim().toLowerCase();
    return Boolean(fa && fb && fa !== "—" && fa === fb);
  }, []);

  /* ── Date-aware ponds helper: returns ponds (and historical closed cycles) active on targetDate ──
   * Rule: Stock introduction date <= Selected date < Stock clearance date (if cleared)
   */
  const getPondsActiveOnDate = useCallback((targetDate?: string): Pond[] => {
    const targetIso = targetDate ? (toValidDbDate(targetDate, viewYear) || dateToIso(targetDate)) : TODAY;
    const result: Pond[] = [];
    const includedPondIds = new Set<string>();

    (ponds || []).forEach(p => {
      if (!p) return;
      const pNameCompact = (p.name || "").replace(/\s+/g, "").toLowerCase();

      const pondEvents = (stockEvents || []).filter(e =>
        e && (e.pondId === p.id || (e.pondName && e.pondName.replace(/\s+/g, "").toLowerCase() === pNameCompact))
      );
      const closedCycles = pondEvents.filter(e => e.type === "Closed");
      const pondFeeds = (feedingRecords || []).filter(r =>
        r && ((r.pondId && r.pondId === p.id) || (r.pond && r.pond.replace(/\s+/g, "").toLowerCase() === pNameCompact))
      );

      // 1. First check historical Closed cycles for this pond where introIso <= targetIso < clearIso
      if (targetIso && closedCycles.length > 0) {
        for (const ce of closedCycles) {
          const clearIso = toValidDbDate(ce.clearedDate, viewYear) || dateToIso(ce.clearedDate) || toValidDbDate(ce.date, viewYear) || dateToIso(ce.date);
          let introIso = toValidDbDate(ce.date, viewYear) || dateToIso(ce.date);

          if (!introIso || (clearIso && introIso >= clearIso)) {
            const batchDateStr = ce.batch && ce.batch !== "—" ? formatFishStockDate(ce.batch) : "";
            const batchIso = batchDateStr && batchDateStr !== "—" ? (toValidDbDate(batchDateStr, viewYear) || dateToIso(batchDateStr)) : "";
            if (batchIso && (!clearIso || batchIso < clearIso)) {
              introIso = batchIso;
            } else {
              const priorEventIsos = pondEvents
                .filter(pe => pe.type !== "Closed")
                .map(pe => toValidDbDate(pe.date, viewYear) || dateToIso(pe.date))
                .filter(d => d && (!clearIso || d < clearIso))
                .sort();
              const priorFeedIsos = pondFeeds
                .filter(r => !ce.batch || ce.batch === "—" || !r.fishStock || r.fishStock === "—" || isRawStockLabelMatch(r.fishStock, ce.batch))
                .map(r => toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date))
                .filter(d => d && (!clearIso || d <= clearIso))
                .sort();
              introIso = priorEventIsos[0] || priorFeedIsos[0] || introIso;
            }
          }

          if (introIso && introIso <= targetIso && (!clearIso || targetIso < clearIso)) {
            if (!includedPondIds.has(p.id)) {
              const matchingFeed = pondFeeds.find(r => {
                const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
                return rIso && rIso >= introIso && (!clearIso || rIso < clearIso) && r.fishStock && r.fishStock !== "—";
              });
              const histStockLabel = (ce.batch && ce.batch !== "—")
                ? ce.batch
                : (matchingFeed?.fishStock && matchingFeed.fishStock !== "—" ? matchingFeed.fishStock : formatFishStockDate(introIso));
              const histPond: Pond = {
                ...p,
                status: "Active",
                stockingDate: introIso || ce.date || p.stockingDate,
                fishStock: histStockLabel,
                species: ce.species || p.species || "Catfish",
                initialStock: Number(ce.count) || Number(p.initialStock) || 0,
                currentCount: Number(ce.count) || Number(p.currentCount) || Number(p.initialStock) || 0,
                fishStockId: (ce as any).fishStockId || matchingFeed?.fishStockId || undefined,
              };
              (histPond as any)._isHistoricalClosedStock = true;
              (histPond as any)._closedEventId = ce.id;
              (histPond as any)._closedIntroIso = introIso;
              (histPond as any)._closedClearIso = clearIso;
              result.push(histPond);
              includedPondIds.add(p.id);
              break;
            }
          }
        }
      }

      if (includedPondIds.has(p.id)) return;

      // 2. Check if the pond's CURRENT active stock was active on targetIso
      const count = Number(p.currentCount);
      const init = Number(p.initialStock);
      const hasCurrentFish = p.status === "Active" && (count > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null)));

      const latestClosedIso = closedCycles
        .map(ce => toValidDbDate(ce.clearedDate || ce.date, viewYear) || dateToIso(ce.clearedDate || ce.date))
        .filter(Boolean)
        .sort()
        .pop() || "";

      // If this pond received its current stock via a Transfer event (with no Initial/Restock after latestClosedIso),
      // its occupancy on the Feeding Records page begins on the transfer date rather than the source stock's original stockingDate.
      const transferEventsIntoPond = pondEvents
        .filter(pe => pe.type === "Transfer")
        .map(pe => toValidDbDate(pe.date, viewYear) || dateToIso(pe.date))
        .filter(d => Boolean(d && (!latestClosedIso || d >= latestClosedIso)))
        .sort();
      const directStockEventsIntoPond = pondEvents
        .filter(pe => pe.type === "Initial" || pe.type === "Restock")
        .map(pe => toValidDbDate(pe.date, viewYear) || dateToIso(pe.date))
        .filter(d => Boolean(d && (!latestClosedIso || d >= latestClosedIso)))
        .sort();

      let transferArrivalIso = "";
      if (transferEventsIntoPond.length > 0 && directStockEventsIntoPond.length === 0) {
        transferArrivalIso = transferEventsIntoPond[0];
      } else if (p.transferNote && /received from/i.test(p.transferNote)) {
        const noteDateMatch = p.transferNote.match(/on\s+([A-Za-z]{3,9}\s+\d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i);
        if (noteDateMatch) {
          transferArrivalIso = toValidDbDate(noteDateMatch[1], viewYear) || dateToIso(noteDateMatch[1]);
        }
      }

      let currentIntroIso =
        transferArrivalIso ||
        toValidDbDate(p.stockingDate, viewYear) ||
        dateToIso(p.stockingDate) ||
        toValidDbDate(formatFishStockDate(p.fishStock), viewYear) ||
        dateToIso(formatFishStockDate(p.fishStock));

      if (!currentIntroIso && hasCurrentFish) {
        const curStockLabel = getPondFishStock(p);
        const curFeedIsos = pondFeeds
          .filter(r => {
            const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
            if (!rIso) return false;
            if (latestClosedIso && rIso < latestClosedIso) return false;
            if (p.fishStockId && r.fishStockId) return r.fishStockId === p.fishStockId;
            if (r.fishStock && r.fishStock !== "—" && curStockLabel && curStockLabel !== "General Stock") {
              return isRawStockLabelMatch(r.fishStock, curStockLabel);
            }
            return true;
          })
          .map(r => toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date))
          .filter(Boolean)
          .sort();
        const curEventIsos = pondEvents
          .filter(pe => pe.type !== "Closed")
          .map(pe => toValidDbDate(pe.date, viewYear) || dateToIso(pe.date))
          .filter(d => d && (!latestClosedIso || d >= latestClosedIso))
          .sort();
        currentIntroIso = curEventIsos[0] || curFeedIsos[0] || latestClosedIso || "";
      }

      if (hasCurrentFish) {
        const isCurrentStockActiveOnTarget = currentIntroIso
          ? (!targetIso || currentIntroIso <= targetIso)
          : (!targetIso || targetIso >= TODAY);
        if (isCurrentStockActiveOnTarget) {
          result.push(p);
          includedPondIds.add(p.id);
          return;
        }
      }

      // 3. Fallback: Reconstruct historical stock from actual feedingRecords on or spanning targetIso
      if (targetIso && !includedPondIds.has(p.id) && pondFeeds.length > 0) {
        const histFeeds = pondFeeds.filter(r => {
          const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
          if (!rIso) return false;
          if (hasCurrentFish && currentIntroIso && rIso >= currentIntroIso) return false;
          return true;
        });

        if (histFeeds.length > 0) {
          const feedOnTarget = histFeeds.find(r => {
            const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
            return rIso === targetIso || (targetDate && isSameDate(r.date, targetDate));
          });

          const stockGroups = new Map<string, { label: string; fishStockId?: string; minIso: string; maxIso: string; introIso: string }>();
          histFeeds.forEach(r => {
            const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
            if (!rIso) return;
            const rawLabel = (r.fishStock && r.fishStock !== "—" && !isPondName(r.fishStock)) ? r.fishStock : formatFishStockDate(rIso);
            const key = formatFishStock(rawLabel).toLowerCase().trim() || "hist";
            const parsedStockDate = formatFishStockDate(rawLabel);
            const parsedIntroIso = (parsedStockDate && parsedStockDate !== "—") ? (toValidDbDate(parsedStockDate, viewYear) || dateToIso(parsedStockDate)) : "";
            const existing = stockGroups.get(key);
            if (!existing) {
              const startIso = (parsedIntroIso && parsedIntroIso <= rIso) ? parsedIntroIso : rIso;
              stockGroups.set(key, {
                label: rawLabel,
                fishStockId: r.fishStockId,
                minIso: rIso,
                maxIso: rIso,
                introIso: startIso
              });
            } else {
              if (rIso < existing.minIso) existing.minIso = rIso;
              if (rIso > existing.maxIso) existing.maxIso = rIso;
              if (existing.minIso < existing.introIso) existing.introIso = existing.minIso;
              if (!existing.fishStockId && r.fishStockId) existing.fishStockId = r.fishStockId;
            }
          });

          let matchedGroup: { label: string; fishStockId?: string; minIso: string; maxIso: string; introIso: string } | null = null;
          if (feedOnTarget) {
            const rawLabel = (feedOnTarget.fishStock && feedOnTarget.fishStock !== "—" && !isPondName(feedOnTarget.fishStock))
              ? feedOnTarget.fishStock
              : formatFishStockDate(targetIso);
            const key = formatFishStock(rawLabel).toLowerCase().trim() || "hist";
            matchedGroup = stockGroups.get(key) || {
              label: rawLabel,
              fishStockId: feedOnTarget.fishStockId,
              minIso: targetIso,
              maxIso: targetIso,
              introIso: targetIso
            };
          } else {
            for (const grp of stockGroups.values()) {
              const matchingCe = closedCycles.find(ce => ce.batch && isRawStockLabelMatch(ce.batch, grp.label));
              const clearIso = matchingCe
                ? (toValidDbDate(matchingCe.clearedDate || matchingCe.date, viewYear) || dateToIso(matchingCe.clearedDate || matchingCe.date))
                : "";
              const activeUntilIso = clearIso || grp.maxIso;
              const isWithinWindow = clearIso
                ? (grp.introIso <= targetIso && targetIso < clearIso)
                : (grp.introIso <= targetIso && targetIso <= activeUntilIso);
              if (isWithinWindow) {
                matchedGroup = grp;
                break;
              }
            }
          }

          if (matchedGroup) {
            const histPond: Pond = {
              ...p,
              status: "Active",
              stockingDate: matchedGroup.introIso || p.stockingDate,
              fishStock: matchedGroup.label,
              species: p.species && p.species !== "—" ? p.species : "Catfish",
              initialStock: Number(p.initialStock) || Number(p.currentCount) || 0,
              currentCount: Number(p.currentCount) || Number(p.initialStock) || 0,
              fishStockId: matchedGroup.fishStockId || undefined,
            };
            (histPond as any)._isHistoricalClosedStock = true;
            (histPond as any)._closedIntroIso = matchedGroup.introIso;
            (histPond as any)._closedClearIso = (hasCurrentFish && currentIntroIso) ? currentIntroIso : undefined;
            result.push(histPond);
            includedPondIds.add(p.id);
          }
        }
      }
    });

    // 4. Also synthesize any pond that has a direct feedingRecord on targetDate but whose pond ID/name was not matched above
    if (targetIso) {
      (feedingRecords || []).forEach(r => {
        if (!r || !r.date) return;
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
        const isDateMatch = rIso === targetIso || (targetDate && (isSameDate(r.date, targetDate) || isSameDate(r.date, toDateLabel(targetDate))));
        if (!isDateMatch) return;
        const rPondCompact = (r.pond || "").replace(/\s+/g, "").toLowerCase();
        const alreadyInResult = result.some(p =>
          (r.pondId && p.id === r.pondId) ||
          (rPondCompact && p.name.replace(/\s+/g, "").toLowerCase() === rPondCompact)
        );
        if (!alreadyInResult && (r.pond || r.fishStock)) {
          const basePond = (ponds || []).find(p => p && ((r.pondId && p.id === r.pondId) || (rPondCompact && p.name.replace(/\s+/g, "").toLowerCase() === rPondCompact)));
          const recStockDate = (r.fishStock && formatFishStockDate(r.fishStock) !== "—")
            ? formatFishStockDate(r.fishStock)
            : (basePond?.stockingDate && basePond.stockingDate !== "—" ? basePond.stockingDate : targetIso);
          const synthPond: Pond = basePond
            ? {
              ...basePond,
              status: "Active",
              stockingDate: recStockDate || basePond.stockingDate,
              fishStock: (r.fishStock && r.fishStock !== "—") ? r.fishStock : basePond.fishStock,
              fishStockId: r.fishStockId || basePond.fishStockId,
            }
            : {
              id: r.pondId || `hist-${r.pond || r.id}`,
              name: r.pond || "Historical Pond",
              type: "Earthen",
              species: "Catfish",
              sizeM2: "0",
              initialStock: 0,
              currentCount: 0,
              stockingDate: recStockDate || "—",
              stockMonth: r.month || "",
              totalCost: 0,
              status: "Active",
              notes: "",
              farmId: activeFarmId,
              fishStock: (r.fishStock && r.fishStock !== "—") ? r.fishStock : formatFishStockDate(recStockDate),
              fishStockId: r.fishStockId,
            };
          (synthPond as any)._isHistoricalClosedStock = true;
          result.push(synthPond);
        }
      });
    }

    return result;
  }, [ponds, stockEvents, feedingRecords, viewYear, dateToIso, isPondName, isRawStockLabelMatch, activeFarmId]);

  const pondsActiveOnSelDate = useMemo(() => getPondsActiveOnDate(selDate), [getPondsActiveOnDate, selDate]);

  const pondToStock = useCallback((pondName: string, targetDate?: string): string => {
    if (!pondName) return "General Stock";
    const lower = pondName.toLowerCase().trim();
    const datePonds = targetDate ? getPondsActiveOnDate(targetDate) : pondsActiveOnSelDate;
    const pOnDate = (datePonds || []).find(x => x && x.name && x.name.toLowerCase().trim() === lower);
    if (pOnDate) {
      const s = getPondFishStock(pOnDate);
      if (s && s !== "—" && !isPondName(s)) return s;
    }
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === lower);
    if (!p) return isPondName(pondName) ? "General Stock" : pondName;
    const s = getPondFishStock(p);
    if (!s || s === "—" || isPondName(s)) return "General Stock";
    return s;
  }, [pondsActiveOnSelDate, getPondsActiveOnDate, ponds, isPondName]);

  const pondToStockDate = useCallback((pondName: string, targetDate?: string): string => {
    const lower = (pondName || "").toLowerCase().trim();
    const datePonds = targetDate ? getPondsActiveOnDate(targetDate) : pondsActiveOnSelDate;
    const pOnDate = (datePonds || []).find(x => x && x.name && x.name.toLowerCase().trim() === lower);
    if (pOnDate && pOnDate.stockingDate && pOnDate.stockingDate !== "—") {
      return formatFishStockDate(pOnDate.stockingDate);
    }
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === lower);
    if (!p || !p.stockingDate || p.stockingDate === "—") return "—";
    return formatFishStockDate(p.stockingDate);
  }, [pondsActiveOnSelDate, getPondsActiveOnDate, ponds]);

  const normalizeFishStock = useCallback((stock?: string | null, targetDate?: string): string => {
    if (!stock || stock === "—" || typeof stock !== "string" || !stock.trim()) return "—";
    const trimmed = stock.trim();
    const datePonds = targetDate ? getPondsActiveOnDate(targetDate) : pondsActiveOnSelDate;
    if (isPondName(trimmed)) {
      const pOnDate = (datePonds || []).find(x => x && x.name && x.name.toLowerCase().trim() === trimmed.toLowerCase());
      if (pOnDate) {
        return pondToStock(trimmed, targetDate);
      }
      const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === trimmed.toLowerCase());
      if (p && p.status === "Active" && (Number(p.currentCount) > 0 || (Number(p.initialStock) > 0 && p.currentCount == null))) {
        return pondToStock(trimmed, targetDate);
      }
      return trimmed;
    }
    const matchingDatePond = (datePonds || []).find(p => p && p.name && typeof p.name === "string" && p.name.toLowerCase().trim() === trimmed.toLowerCase());
    if (matchingDatePond) {
      return pondToStock(matchingDatePond.name, targetDate);
    }
    const dateActiveStock = (datePonds || []).map(p => getPondFishStock(p)).find(s => s && typeof s === "string" && !isPondName(s) && s.toLowerCase().trim() === trimmed.toLowerCase());
    if (dateActiveStock) {
      return dateActiveStock;
    }
    const activeStock = (ponds || []).filter(p => p && p.status === "Active").map(p => getPondFishStock(p)).find(s => s && typeof s === "string" && !isPondName(s) && s.toLowerCase().trim() === trimmed.toLowerCase());
    if (activeStock) {
      return activeStock;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const formatted = formatFishStockDate(trimmed);
      if (formatted && formatted !== "—") return formatted;
    }
    return formatFishStock(trimmed);
  }, [pondsActiveOnSelDate, getPondsActiveOnDate, ponds, isPondName, pondToStock]);

  const isStockMatch = useCallback((stockA?: string | null, stockB?: string | null, targetDate?: string): boolean => {
    if (!stockA || !stockB) return false;
    if (stockA === "—" || stockB === "—") return false;
    const a = stockA.trim().toLowerCase();
    const b = stockB.trim().toLowerCase();
    if (a === b) return true;

    // Strict date verification: If both strings contain stocking dates and the dates differ, they CANNOT match
    const da = formatFishStockDate(stockA);
    const db = formatFishStockDate(stockB);
    if (da && da !== "—" && isFormattedDate(da) && db && db !== "—" && isFormattedDate(db)) {
      if (!isSameDate(da, db)) {
        return false;
      }
    }

    const na = normalizeFishStock(stockA, targetDate).trim().toLowerCase();
    const nb = normalizeFishStock(stockB, targetDate).trim().toLowerCase();
    if (na === nb && na !== "—" && !isPondName(na)) return true;

    const fa = formatFishStock(stockA).trim().toLowerCase();
    const fb = formatFishStock(stockB).trim().toLowerCase();
    if (fa === fb && fa !== "—") return true;

    const datePonds = targetDate ? getPondsActiveOnDate(targetDate) : pondsActiveOnSelDate;
    const candidatePonds = [...(datePonds || []), ...(ponds || []).filter(p => p && p.status === "Active")];

    const pA = candidatePonds.find(p => p && p.name && p.name.toLowerCase().trim() === a);
    if (pA) {
      const pADate = pA.stockingDate && pA.stockingDate !== "—" ? formatFishStockDate(pA.stockingDate) : null;
      if (db && isFormattedDate(db) && pADate && isFormattedDate(pADate) && !isSameDate(db, pADate)) {
        return false;
      }
      const psA = getPondFishStock(pA).trim().toLowerCase();
      if (psA === b || psA === nb || psA === fb) return true;
      if (pA.fishStock && pA.fishStock.trim().toLowerCase() === b) return true;
    }
    const pB = candidatePonds.find(p => p && p.name && p.name.toLowerCase().trim() === b);
    if (pB) {
      const pBDate = pB.stockingDate && pB.stockingDate !== "—" ? formatFishStockDate(pB.stockingDate) : null;
      if (da && isFormattedDate(da) && pBDate && isFormattedDate(pBDate) && !isSameDate(da, pBDate)) {
        return false;
      }
      const psB = getPondFishStock(pB).trim().toLowerCase();
      if (psB === a || psB === na || psB === fa) return true;
      if (pB.fishStock && pB.fishStock.trim().toLowerCase() === a) return true;
    }

    return false;
  }, [normalizeFishStock, pondsActiveOnSelDate, getPondsActiveOnDate, ponds, isPondName]);

  const getStockDisplayName = useCallback((fishStock?: string | null, stockDate?: string | null, targetDate?: string): string => {
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
    const datePonds = targetDate ? getPondsActiveOnDate(targetDate) : pondsActiveOnSelDate;
    const matchingDatePond = (datePonds || []).find(p => p && (pondToStock(p.name, targetDate) === fishStock || p.name === fishStock || isStockMatch(p.name, fishStock, targetDate) || isStockMatch(p.fishStock, fishStock, targetDate)));
    if (matchingDatePond?.stockingDate && matchingDatePond.stockingDate !== "—") {
      const fmt = formatFishStockDate(matchingDatePond.stockingDate);
      if (fmt && fmt !== "—") return fmt;
    }
    const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name, targetDate) === fishStock || p.name === fishStock || isStockMatch(p.name, fishStock, targetDate)));
    if (matchingPond?.stockingDate && matchingPond.stockingDate !== "—") {
      const fmt = formatFishStockDate(matchingPond.stockingDate);
      if (fmt && fmt !== "—") return fmt;
    }
    return formatFishStock(fishStock);
  }, [pondsActiveOnSelDate, getPondsActiveOnDate, ponds, pondToStock, isStockMatch]);

  /* ── bags opened & leftover modal state ── */
  const [bagsDate, setBagsDate] = useState(TODAY);
  const [bagRows, setBagRows] = useState<BagRow[]>([]);

  /* ── edit feed record state ── */
  const [editRec, setEditRec] = useState<FeedingRecord | null>(null);
  const [viewFeedRec, setViewFeedRec] = useState<FeedingRecord | null>(null);

  /* ── derived: ponds with active status and positive fish count ── */
  const activePonds = (ponds || []).filter(p => {
    if (!p || p.status !== "Active") return false;
    const count = Number(p.currentCount);
    const init = Number(p.initialStock);
    return count > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null));
  });

  /* Check whether a fish stock currently exists in at least one active pond with fish */
  const isStockCurrentlyActive = useCallback((stockName?: string | null): boolean => {
    if (!stockName || stockName === "—" || typeof stockName !== "string" || !stockName.trim()) return false;
    const trimmed = stockName.trim();
    const norm = normalizeFishStock(trimmed).toLowerCase().trim();
    const fmtDate = formatFishStockDate(trimmed).toLowerCase().trim();

    return activePonds.some(p => {
      if (!p) return false;
      const count = Number(p.currentCount);
      const init = Number(p.initialStock);
      const hasFish = count > 0 || (init > 0 && (p.currentCount === undefined || p.currentCount === null));
      if (!hasFish) return false;

      if (isStockMatch(p.fishStock, trimmed)) return true;
      if (isStockMatch(getPondFishStock(p), trimmed)) return true;
      if (isStockMatch(p.name, trimmed)) return true;
      if (isStockMatch(pondToStock(p.name), trimmed)) return true;

      if (norm && norm !== "—" && norm !== "general stock") {
        if (normalizeFishStock(p.fishStock).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(getPondFishStock(p)).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(p.name).toLowerCase().trim() === norm) return true;
      }

      if (p.stockingDate && p.stockingDate !== "—") {
        const pDateFmt = formatFishStockDate(p.stockingDate).toLowerCase().trim();
        if (fmtDate && fmtDate !== "—" && pDateFmt === fmtDate) return true;
        if (p.stockingDate.toLowerCase().trim() === trimmed.toLowerCase()) return true;
      }

      return false;
    });
  }, [activePonds, isStockMatch, normalizeFishStock, pondToStock]);

  /* Active Feed Stock Groups (single source of truth matching Feed Stock page: inStock > 0) */
  const activeFeedStockGroups = useMemo(() => {
    const grouped: Record<string, { brand: string; size: string; totalBags: number; weightPerBag: number }> = {};
    (inventory || []).forEach(item => {
      if (!item || !item.size || !item.brand) return;
      const brandClean = item.brand.trim();
      const sizeClean = item.size.trim();
      if (!brandClean || !sizeClean || sizeClean === "—") return;
      const key = `${brandClean.toLowerCase()}|${sizeClean.toLowerCase()}|${item.weightPerBag || 15}`;
      if (!grouped[key]) {
        grouped[key] = { brand: brandClean, size: sizeClean, totalBags: 0, weightPerBag: Number(item.weightPerBag) || 15 };
      }
      grouped[key].totalBags += Number(item.bags) || 0;
    });

    const activeList: Array<{ brand: string; size: string; inStockBags: number; weightPerBag: number }> = [];
    Object.values(grouped).forEach(row => {
      const opened = (bagLogs || [])
        .filter(b => b && !isManualPrevDayBalanceLog(b) && (b.brand || "").trim().toLowerCase() === row.brand.toLowerCase() && isSamePelletSize(b.size, row.size))
        .reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
      const inStock = Math.max(0, row.totalBags - opened);
      if (inStock > 0) {
        activeList.push({
          brand: row.brand,
          size: row.size,
          inStockBags: inStock,
          weightPerBag: row.weightPerBag,
        });
      }
    });
    return activeList;
  }, [inventory, bagLogs]);

  const allBrands = useMemo(() => {
    return [...new Set(activeFeedStockGroups.map(f => f.brand).filter(Boolean))];
  }, [activeFeedStockGroups]);

  /* Available pellet sizes strictly from active Feed Stock on the Feed Stock page (inStockBags > 0) */
  const availablePelletSizes = useMemo(() => {
    const activeSizes = activeFeedStockGroups.map(f => f.size).filter(Boolean);
    const uniqueSizes: string[] = [];
    activeSizes.forEach(s => {
      if (!uniqueSizes.some(u => isSamePelletSize(u, s))) {
        uniqueSizes.push(s);
      }
    });
    return uniqueSizes.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  }, [activeFeedStockGroups]);

  /* Brand filtering strictly from active Feed Stock */
  const invBrands = useMemo(() => {
    return [...new Set(activeFeedStockGroups.map(f => f.brand).filter(Boolean))];
  }, [activeFeedStockGroups]);

  /* All registered brands & pellet sizes (unrestricted, for Manual Previous-Day Feed Balance) */
  const allRegisteredBrands = useMemo(() => {
    const set = new Set<string>(FEED_BRANDS);
    (inventory || []).forEach(f => { if (f?.brand && f.brand.trim() && f.brand !== "—") set.add(f.brand.trim()); });
    (feedingRecords || []).forEach(r => { if (r?.brand && r.brand.trim() && r.brand !== "—" && r.brand !== "Not specified") set.add(r.brand.trim()); });
    (manualPrevBalances || []).forEach(m => { if (m?.brand && m.brand.trim() && m.brand !== "—") set.add(m.brand.trim()); });
    return Array.from(set);
  }, [inventory, feedingRecords, manualPrevBalances]);

  const allRegisteredSizes = useMemo(() => {
    const uniqueSizes: string[] = [];
    const addSz = (s?: string | null) => {
      const clean = (s || "").trim();
      if (!clean || clean === "—") return;
      if (!uniqueSizes.some(u => isSamePelletSize(u, clean))) uniqueSizes.push(clean);
    };
    FEED_SIZES.forEach(addSz);
    (inventory || []).forEach(f => addSz(f?.size));
    (feedingRecords || []).forEach(r => addSz(r?.size));
    (manualPrevBalances || []).forEach(m => addSz(m?.size));
    return uniqueSizes.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
  }, [inventory, feedingRecords, manualPrevBalances]);

  const invSizesForBrand = (brand: string) => {
    if (!brand) return availablePelletSizes;
    const brandItems = activeFeedStockGroups.filter(f => f.brand.toLowerCase() === brand.trim().toLowerCase());
    const sizesFromBrand: string[] = [];
    brandItems.forEach(f => {
      if (f.size && !sizesFromBrand.some(u => isSamePelletSize(u, f.size))) {
        sizesFromBrand.push(f.size);
      }
    });
    return sizesFromBrand.length > 0 ? sizesFromBrand : availablePelletSizes;
  };

  /* Date-aware check whether a fish stock was active on selDate */
  const isStockActiveOnSelDate = useCallback((stockName?: string | null): boolean => {
    if (!stockName || stockName === "—" || typeof stockName !== "string" || !stockName.trim()) return false;
    const trimmed = stockName.trim();
    const norm = normalizeFishStock(trimmed, selDate).toLowerCase().trim();
    const fmtDate = formatFishStockDate(trimmed).toLowerCase().trim();

    return pondsActiveOnSelDate.some(p => {
      if (!p) return false;
      if (isStockMatch(p.fishStock, trimmed, selDate)) return true;
      if (isStockMatch(getPondFishStock(p), trimmed, selDate)) return true;
      if (isStockMatch(p.name, trimmed, selDate)) return true;
      if (isStockMatch(pondToStock(p.name, selDate), trimmed, selDate)) return true;
      if (norm && norm !== "—" && norm !== "general stock") {
        if (normalizeFishStock(p.fishStock, selDate).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(getPondFishStock(p), selDate).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(p.name, selDate).toLowerCase().trim() === norm) return true;
      }
      if (p.stockingDate && p.stockingDate !== "—") {
        const pDateFmt = formatFishStockDate(p.stockingDate).toLowerCase().trim();
        if (fmtDate && fmtDate !== "—" && pDateFmt === fmtDate) return true;
        if (p.stockingDate.toLowerCase().trim() === trimmed.toLowerCase()) return true;
      }
      return false;
    });
  }, [pondsActiveOnSelDate, selDate, isStockMatch, normalizeFishStock, pondToStock]);

  /* Helper to resolve the Feed Brand for a FeedingRecord (historical or current) */
  const getRecordFeedBrand = useCallback((rec?: FeedingRecord | null, pond?: Pond): string => {
    if (!rec) return "—";
    if (rec.brand && rec.brand !== "—" && rec.brand !== "Not specified" && rec.brand.trim()) return rec.brand.trim();
    const size = rec.size;
    if (!size || size === "—") return "—";
    const rDate = rec.date || selDate;
    const rIso = toValidDbDate(rDate, rec.year || viewYear) || dateToIso(rDate);
    const fs = rec.fishStock || (pond ? getPondFishStock(pond) : "");
    if (!fs || fs === "—") return "—";

    // 1. Check manual previous-day balances on or before rDate explicitly matching this fishStock & size
    const manualMatch = (manualPrevBalances || []).find(m => {
      if (!m || !isSamePelletSize(m.size, size)) return false;
      if (!m.fishStock || m.fishStock === "—" || !isStockMatch(m.fishStock, fs)) return false;
      const mIso = m.dateIso || toValidDbDate(m.date, viewYear) || dateToIso(m.date);
      return !rIso || !mIso || mIso <= rIso || isSameDate(m.date, rDate);
    });
    if (manualMatch?.brand && manualMatch.brand !== "—") return manualMatch.brand;

    // 2. Check bagLogs on rDate explicitly matching this fishStock & size
    const sameDayBag = (bagLogs || []).find(b =>
      b && b.brand && b.brand !== "—" && isSamePelletSize(b.size, size) &&
      (isSameDate(b.date, rDate) || (toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date)) === rIso) &&
      Boolean(b.fishStock && isStockMatch(b.fishStock, fs))
    );
    if (sameDayBag?.brand) return sameDayBag.brand;

    // 3. Check remainLogs on rDate explicitly matching this fishStock & size
    const sameDayRem = (remainLogs || []).find(r =>
      r && r.brand && r.brand !== "—" && isSamePelletSize(r.size, size) &&
      (isSameDate(r.date, rDate) || (toValidDbDate(r.date, viewYear) || dateToIso(r.date)) === rIso) &&
      Boolean(r.fishStock && isStockMatch(r.fishStock, fs))
    );
    if (sameDayRem?.brand) return sameDayRem.brand;

    // 4. Check prior bagLog or remainLog for this exact fishStock & size strictly before rDate (only if carryover exists)
    const priorBag = (bagLogs || []).find(b => {
      if (!b || !b.brand || b.brand === "—" || !isSamePelletSize(b.size, size)) return false;
      if (!b.fishStock || !isStockMatch(b.fishStock, fs)) return false;
      const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
      return Boolean(rIso && bIso && bIso <= rIso);
    });
    if (priorBag?.brand) return priorBag.brand;

    const priorRem = (remainLogs || []).find(r => {
      if (!r || !r.brand || r.brand === "—" || !isSamePelletSize(r.size, size)) return false;
      if (!r.fishStock || !isStockMatch(r.fishStock, fs)) return false;
      const remIso = toValidDbDate(r.date, viewYear) || dateToIso(r.date);
      return Boolean(rIso && remIso && remIso <= rIso);
    });
    if (priorRem?.brand) return priorRem.brand;

    return "—";
  }, [selDate, viewYear, dateToIso, manualPrevBalances, bagLogs, remainLogs, isStockMatch]);

  /* Helper to retrieve balance for a ManualPrevBalanceRecord on targetDate without auto-deducting feeding entries */
  const getManualBalanceStats = useCallback((entry: ManualPrevBalanceRecord, targetDate?: string) => {
    const tDate = targetDate || selDate;
    const tIso = toValidDbDate(tDate, viewYear) || dateToIso(tDate);
    const eIso = entry.dateIso || toValidDbDate(entry.date, viewYear) || dateToIso(entry.date);

    if (tIso && eIso && tIso < eIso) {
      return {
        startBalanceKg: 0,
        fedTodayKg: 0,
        currentRemainingKg: 0
      };
    }

    const bal = Math.max(0, Math.round((Number(entry.initialRemainingKg) || 0) * 100) / 100);
    return {
      startBalanceKg: bal,
      fedTodayKg: 0,
      currentRemainingKg: bal
    };
  }, [selDate, viewYear, dateToIso]);

  /* Helper to get prior leftover carryover for a fish stock, pallet size, and optional brand strictly before targetDate */
  const getPriorCarryover = useCallback((stockName: string, size: string, targetDate: string, brand?: string): number => {
    if (!stockName || !targetDate) return 0;
    const normStock = normalizeFishStock(stockName);
    const targetIso = dateToIso(targetDate);
    if (!targetIso) return 0;

    const brandFilter = (b?: string | null): boolean => {
      if (!brand || brand === "—" || !b || b === "—") return true;
      return b.trim().toLowerCase() === brand.trim().toLowerCase();
    };

    // Collect all unique ISO dates strictly before targetIso where any feed activity occurred for this stock, size & brand
    const activityDates = new Set<string>();

    (remainLogs || []).forEach(r => {
      if (!r || !r.date) return;
      const iso = dateToIso(r.date);
      if (
        iso && iso < targetIso &&
        isStockMatch(r.fishStock, normStock) &&
        (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
        brandFilter(r.brand)
      ) {
        activityDates.add(iso);
      }
    });

    (bagLogs || []).forEach(b => {
      if (!b || !b.date) return;
      const iso = dateToIso(b.date);
      if (
        iso && iso < targetIso &&
        isStockMatch(b.fishStock, normStock) &&
        (!size || size === "—" || !b.size || b.size === "—" || isSamePelletSize(b.size, size)) &&
        brandFilter(b.brand)
      ) {
        activityDates.add(iso);
      }
    });

    (feedTransfers || []).forEach(t => {
      if (!t) return;
      const tIso = dateToIso(t.transferDate);
      const isDest = isStockMatch(t.destinationStock, normStock);
      const isSrc = isStockMatch(t.sourceStock, normStock);
      if (
        tIso && tIso < targetIso &&
        (isDest || isSrc) &&
        (!size || size === "—" || isSamePelletSize(t.feedSize, size)) &&
        brandFilter(t.feedBrand)
      ) {
        activityDates.add(tIso);
      }
    });

    (feedingRecords || []).forEach(r => {
      if (!r || !r.date) return;
      const iso = dateToIso(r.date);
      if (
        iso && iso < targetIso &&
        (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
        brandFilter(r.brand)
      ) {
        let isMatch = false;
        if (r.fishStock && r.fishStock !== "—") {
          isMatch = isStockMatch(r.fishStock, normStock);
        } else if (r.pond) {
          const rPondLower = r.pond.toLowerCase().trim();
          const activeOnIso = getPondsActiveOnDate(iso);
          const matchedPond = activeOnIso.find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower)) ||
            (ponds || []).find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
          if (matchedPond && (isStockMatch(matchedPond.fishStock, normStock) || isStockMatch(getPondFishStock(matchedPond), normStock))) {
            const pStockDate = toValidDbDate(matchedPond.stockingDate);
            if (!pStockDate || iso >= pStockDate) isMatch = true;
          }
        }
        if (isMatch) activityDates.add(iso);
      }
    });

    if (activityDates.size === 0) {
      return 0;
    }

    const sortedDates = Array.from(activityDates).sort();
    let balance = 0;

    for (const dIso of sortedDates) {
      // 1. Explicit user leftover recorded on this date (sum all contributing logs for this date/stock/brand/size)
      const matchingRemains = (remainLogs || []).filter(r =>
        dateToIso(r.date) === dIso &&
        isStockMatch(r.fishStock, normStock) &&
        (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
        brandFilter(r.brand)
      );
      const seenRemIds = new Set<string>();
      const uniqueRemains = matchingRemains.filter(r => {
        if (!r.id) return true;
        if (seenRemIds.has(r.id)) return false;
        seenRemIds.add(r.id);
        return true;
      });
      const rLog = uniqueRemains.length > 0 ? uniqueRemains[uniqueRemains.length - 1] : null;
      const rLogSum = uniqueRemains.reduce((s, r) => s + (Number(r.remainingKg) || 0), 0);

      // 2. Bags opened on this date
      const dayBags = (bagLogs || []).filter(b =>
        dateToIso(b.date) === dIso &&
        isStockMatch(b.fishStock, normStock) &&
        (!size || size === "—" || !b.size || b.size === "—" || isSamePelletSize(b.size, size)) &&
        brandFilter(b.brand)
      );
      const dayBagsKg = dayBags.reduce((s, b) => s + (Number(b.totalKg) || ((Number(b.bagsOpened) || 0) * (Number(b.kgPerBag) || 15))), 0);

      // 3. Transfers in on this date
      const dayTransfersIn = (feedTransfers || []).filter(t =>
        dateToIso(t.transferDate) === dIso &&
        isStockMatch(t.destinationStock, normStock) &&
        (!size || size === "—" || isSamePelletSize(t.feedSize, size)) &&
        brandFilter(t.feedBrand)
      );
      const dayTransfersInKg = dayTransfersIn.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // 4. Transfers out on this date
      const dayTransfersOut = (feedTransfers || []).filter(t =>
        (dateToIso(t.transferDate) === dIso || dateToIso(t.originalDate) === dIso) &&
        isStockMatch(t.sourceStock, normStock) &&
        (!size || size === "—" || isSamePelletSize(t.feedSize, size)) &&
        brandFilter(t.feedBrand)
      );
      const dayTransfersOutKg = dayTransfersOut.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // 5. Feeding on this date
      const activeOnDIso = getPondsActiveOnDate(dIso);
      const dayFeedings = (feedingRecords || []).filter(r => {
        if (dateToIso(r.date) !== dIso) return false;
        if (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) {
          if (!brandFilter(r.brand)) return false;
          if (r.fishStock && r.fishStock !== "—") {
            return isStockMatch(r.fishStock, normStock);
          }
          if (r.pond) {
            const rPondLower = r.pond.toLowerCase().trim();
            const matchedPond = activeOnDIso.find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower)) ||
              (ponds || []).find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
            if (matchedPond && (isStockMatch(matchedPond.fishStock, normStock) || isStockMatch(getPondFishStock(matchedPond), normStock))) {
              const pStockDate = toValidDbDate(matchedPond.stockingDate);
              return !pStockDate || dIso >= pStockDate;
            }
          }
        }
        return false;
      });
      const dayFedKg = dayFeedings.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      if (rLog && rLog.remainingKg !== undefined && rLog.remainingKg !== null) {
        balance = Math.round(rLogSum * 100) / 100;
      } else {
        balance = Math.max(0, balance + dayBagsKg + dayTransfersInKg - dayTransfersOutKg - dayFedKg);
      }
    }

    return Math.max(0, Math.round(balance * 10) / 10);
  }, [remainLogs, bagLogs, feedingRecords, feedTransfers, dateToIso, normalizeFishStock, isStockMatch, ponds, getPondsActiveOnDate]);

  /* Helper to retrieve all pallets associated with a fish stock */
  const getAssociatedPalletsForStock = useCallback((fishStock: string, targetDate?: string): string[] => {
    if (!fishStock || fishStock === "—") return [];
    const normStock = normalizeFishStock(fishStock);
    const pallets: string[] = [];
    const addSize = (sz?: string | null) => {
      if (!sz || sz === "—" || sz.trim() === "") return;
      const clean = sz.trim();
      if (!pallets.some(p => isSamePelletSize(p, clean))) {
        pallets.push(clean);
      }
    };

    // 1. Feeding records on targetDate / selDate (highest relevance)
    const checkDate = targetDate || selDate;
    const checkIso = dateToIso(checkDate);
    const datePonds = getPondsActiveOnDate(checkDate);
    (feedingRecords || []).filter(r => {
      if (!r) return false;
      const rIso = dateToIso(r.date);
      const isDateMatch = isSameDate(r.date, checkDate) || isSameDate(r.date, toDateLabel(checkDate)) || Boolean(checkIso && rIso && checkIso === rIso);
      if (!isDateMatch) return false;
      if (r.fishStock && r.fishStock !== "—") return isStockMatch(r.fishStock, normStock);
      if (r.pond) {
        const rPondLower = r.pond.toLowerCase().trim();
        const matchedPond = datePonds.find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower)) ||
          (ponds || []).find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
        if (matchedPond && (isStockMatch(matchedPond.fishStock, normStock) || isStockMatch(getPondFishStock(matchedPond), normStock))) {
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          const rDate = toValidDbDate(r.date);
          return !pStockDate || !rDate || rDate >= pStockDate;
        }
      }
      return false;
    }).forEach(r => addSize(r.size));

    // 1b. Bag logs & remain logs on targetDate / selDate (high relevance for that date)
    (bagLogs || []).filter(b => b && (isSameDate(b.date, checkDate) || (checkIso && dateToIso(b.date) === checkIso)) && isStockMatch(b.fishStock, normStock)).forEach(b => addSize(b.size));
    (remainLogs || []).filter(r => r && (isSameDate(r.date, checkDate) || (checkIso && dateToIso(r.date) === checkIso)) && isStockMatch(r.fishStock, normStock)).forEach(r => addSize(r.size));

    // 2. Matching ponds on checkDate and current ponds (defaultPellet & maxKgByPallet)
    const matchingPonds = [...datePonds, ...(ponds || [])].filter(p => p && (
      isStockMatch(p.fishStock, normStock) ||
      isStockMatch(getPondFishStock(p), normStock)
    ));
    matchingPonds.forEach(p => {
      addSize(p.defaultPellet);
      if (p.maxKgByPallet) {
        Object.keys(p.maxKgByPallet).forEach(addSize);
      }
    });

    // 3. Historical feeding records for this stock
    (feedingRecords || []).filter(r => {
      if (!r) return false;
      if (r.fishStock && r.fishStock !== "—") return isStockMatch(r.fishStock, normStock);
      if (r.pond) {
        const rPondLower = r.pond.toLowerCase().trim();
        const matchedPond = [...datePonds, ...(ponds || [])].find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
        if (matchedPond && (isStockMatch(matchedPond.fishStock, normStock) || isStockMatch(getPondFishStock(matchedPond), normStock))) {
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          const rDate = toValidDbDate(r.date);
          return !pStockDate || !rDate || rDate >= pStockDate;
        }
      }
      return false;
    }).forEach(r => addSize(r.size));

    // 4. Bag logs & remain logs for this stock
    (bagLogs || []).filter(b => b && isStockMatch(b.fishStock, normStock)).forEach(b => addSize(b.size));
    (remainLogs || []).filter(r => r && isStockMatch(r.fishStock, normStock)).forEach(r => addSize(r.size));

    // 5. Incoming transfers to this stock
    (feedTransfers || []).filter(t => isStockMatch(t.destinationStock, normStock)).forEach(t => addSize(t.feedSize));

    // Restrict strictly to pallets that currently exist as active stock on the Feed Stock page
    return pallets
      .map(p => availablePelletSizes.find(avail => isSamePelletSize(avail, p)) || "")
      .filter((p, idx, arr) => Boolean(p) && arr.indexOf(p) === idx);
  }, [ponds, feedingRecords, bagLogs, remainLogs, feedTransfers, selDate, dateToIso, getPondsActiveOnDate, availablePelletSizes]);

  /* Helper to get matching brands from active Feed Stock for a selected pallet */
  const getMatchingBrandsForPallet = useCallback((pallet: string): string[] => {
    if (!pallet || pallet === "—" || pallet.trim() === "") return [];
    const activeMatching = [...new Set(
      activeFeedStockGroups
        .filter(f => f && f.brand && isSamePelletSize(f.size, pallet))
        .map(f => f.brand.trim())
        .filter(Boolean)
    )];
    if (activeMatching.length > 0) return activeMatching;
    return [...new Set(
      (inventory || [])
        .filter(f => f && f.brand && isSamePelletSize(f.size, pallet))
        .map(f => f.brand.trim())
        .filter(Boolean)
    )];
  }, [activeFeedStockGroups, inventory]);

  /* ── Remaining Feed Transfer Helpers ── */

  /* Calculates usage, consumption and remaining balance of a transferred feed batch */
  const getTransferUsage = useCallback((transfer: FeedTransferRecord) => {
    const normDest = normalizeFishStock(transfer.destinationStock);
    const transIso = dateToIso(transfer.transferDate);
    const brand = transfer.feedBrand;

    // All feedings for destination stock with this size and brand on or after transferDate
    const feedings = (feedingRecords || []).filter(r => {
      const matchStock = isStockMatch(r.fishStock, normDest) || isStockMatch(pondToStock(r.pond), normDest) || isStockMatch(r.pond, normDest);
      if (!matchStock) return false;
      if (!isSamePelletSize(r.size, transfer.feedSize)) return false;
      if (brand && brand !== "—" && r.brand && r.brand !== "—" && r.brand.trim().toLowerCase() !== brand.trim().toLowerCase()) return false;
      const fIso = dateToIso(r.date);
      if (transIso && fIso && fIso < transIso) return false;
      return true;
    }).sort((a, b) => (dateToIso(a.date) || "").localeCompare(dateToIso(b.date) || ""));

    const totalFedAfter = feedings.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

    // Find all transfers into this destination stock of the same size and brand ordered by transferDate
    const allIn = (feedTransfers || []).filter(t =>
      isStockMatch(t.destinationStock, normDest) &&
      isSamePelletSize(t.feedSize, transfer.feedSize) &&
      (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase())
    ).sort((a, b) => (dateToIso(a.transferDate) || "").localeCompare(dateToIso(b.transferDate) || ""));

    // Allocate feeding in FIFO order
    let remainingFedPool = totalFedAfter;
    let consumedForThis = 0;
    const contributingFeedings: { date: string; pond: string; fedKg: number }[] = [];

    for (const t of allIn) {
      const take = Math.min(t.quantityKg, Math.max(0, remainingFedPool));
      if (t.id === transfer.id) {
        consumedForThis = take;
        break;
      }
      remainingFedPool -= take;
    }

    // Capture which feeding dates contributed to consuming this transfer
    if (consumedForThis > 0) {
      let allocated = 0;
      for (const f of feedings) {
        if (allocated >= consumedForThis) break;
        const fedQty = Number(f.total) || ((Number(f.morning) || 0) + (Number(f.evening) || 0));
        const needed = Math.min(fedQty, consumedForThis - allocated);
        contributingFeedings.push({ date: f.date, pond: f.pond, fedKg: needed });
        allocated += needed;
      }
    }

    const remainingQty = Math.max(0, Math.round((transfer.quantityKg - consumedForThis) * 10) / 10);
    const isFullyConsumed = remainingQty <= 0.01;
    const isPartiallyConsumed = consumedForThis > 0 && !isFullyConsumed;

    let statusLabel = "";
    if (isFullyConsumed) statusLabel = "Fully Consumed";
    else if (isPartiallyConsumed) statusLabel = "Partially Consumed";

    return {
      consumedKg: Math.round(consumedForThis * 10) / 10,
      remainingKg: remainingQty,
      isFullyConsumed,
      isPartiallyConsumed,
      statusLabel,
      contributingFeedings
    };
  }, [feedingRecords, feedTransfers, dateToIso]);

  /* Validates if a destination stock can receive remaining feed (any active stock other than source, or same stock when transferring from a manual daily balance) */
  const checkTransferEligibility = useCallback((destStockName: string, sourceRow: MergedBagRow): { eligible: boolean; reason?: string } => {
    if (!destStockName || !sourceRow) {
      return { eligible: false, reason: "Missing stock information." };
    }
    const normDest = normalizeFishStock(destStockName);
    const normSrc = normalizeFishStock(sourceRow.fishStock);
    const isSameStock = normDest === normSrc || isStockMatch(destStockName, sourceRow.fishStock);
    if (isSameStock && !sourceRow.isManualPrevDayBalance) {
      return { eligible: false, reason: "Destination stock cannot be the same as the source stock." };
    }
    if (!isStockCurrentlyActive(destStockName)) {
      return { eligible: false, reason: "Destination stock is not currently active." };
    }

    return { eligible: true };
  }, [isStockCurrentlyActive, normalizeFishStock, isStockMatch]);

  /* Calculates genuine available remaining feed for transfer */
  const getAvailableRemainingForTransfer = useCallback((row: MergedBagRow): number => {
    if (!row) return 0;
    if (row.availableRemainingKg !== undefined) {
      return Math.max(0, row.availableRemainingKg);
    }
    const fs = row.fishStock;
    const size = row.size;
    const brand = row.brand;

    const baseRemaining = (row.feedRemainingToday !== null && row.feedRemainingToday !== undefined)
      ? row.feedRemainingToday
      : (row.remainingKg ?? (row.carryoverKg || 0));

    const outTransfers = (feedTransfers || []).filter(t =>
      isStockMatch(t.sourceStock, fs) &&
      isSamePelletSize(t.feedSize, size) &&
      (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
      (isSameDate(t.originalDate, selDate) || isSameDate(t.transferDate, selDate))
    );
    const totalOut = outTransfers.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

    return Math.max(0, Math.round((baseRemaining - totalOut) * 10) / 10);
  }, [feedTransfers, selDate]);

  /* Opens Transfer Modal with pre-validated data */
  const openTransferModal = (row: MergedBagRow) => {
    const avail = getAvailableRemainingForTransfer(row);
    if (avail <= 0) {
      toast.error(`No remaining feed available to transfer for ${formatFishStock(row.fishStock)} (${row.size}).`);
      return;
    }
    setSelectedTransferRow(row);
    setTransferQty(String(avail));
    setTransferDestStock("");
    setTransferDate(selDate);
    setTransferNotes("");
    setTransferError(null);
    setTransferModalOpen(true);
  };

  /* Confirms and records feed transfer atomically */
  const handleConfirmTransfer = async () => {
    if (!selectedTransferRow) return;
    if (isSubmittingTransfer) return;

    setTransferError(null);

    // 1. Destination validation
    if (!transferDestStock) {
      setTransferError("Please select an eligible destination fish stock.");
      return;
    }

    const elig = checkTransferEligibility(transferDestStock, selectedTransferRow);
    if (!elig.eligible) {
      setTransferError(elig.reason || "The selected destination stock is not eligible.");
      return;
    }

    // 2. Quantity validation
    const numQty = parseFloat(transferQty);
    if (isNaN(numQty) || numQty <= 0) {
      setTransferError("Please enter a valid transfer quantity greater than 0 kg.");
      return;
    }

    // 3. Re-validate available balance immediately before completing (Section 13)
    const currentAvailable = getAvailableRemainingForTransfer(selectedTransferRow);
    if (numQty > currentAvailable) {
      setTransferError(`Available balance changed to ${currentAvailable} kg. Transfer quantity cannot exceed available balance.`);
      return;
    }

    setIsSubmittingTransfer(true);

    try {
      const sourceFs = selectedTransferRow.fishStock;
      const size = selectedTransferRow.size;
      const brand = selectedTransferRow.brand;
      const origDate = selectedTransferRow.lastBagLog?.date || selDate;
      const tDate = transferDate || selDate;

      const destRow = mergedBagRows.find(r =>
        (isStockMatch(r.fishStock, transferDestStock) || normalizeFishStock(r.fishStock, tDate) === normalizeFishStock(transferDestStock, tDate)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase())
      );
      const destFs = destRow?.fishStock || transferDestStock;

      // Prevent accidental duplicate submission of the exact same transfer
      const nowMs = Date.now();
      const isDuplicateTransfer = (feedTransfers || []).some(t =>
        t &&
        isStockMatch(t.sourceStock, sourceFs) &&
        isStockMatch(t.destinationStock, destFs) &&
        isSamePelletSize(t.feedSize, size) &&
        (t.feedBrand || "").trim().toLowerCase() === (brand || "").trim().toLowerCase() &&
        isSameDate(t.transferDate, tDate) &&
        Math.abs((Number(t.quantityKg) || 0) - numQty) < 0.001 &&
        t.transferTimestamp &&
        (nowMs - new Date(t.transferTimestamp).getTime()) < 5000
      );
      if (isDuplicateTransfer) {
        setTransferModalOpen(false);
        setSelectedTransferRow(null);
        return;
      }

      const newRecord: FeedTransferRecord = {
        id: uid(),
        sourceStock: sourceFs,
        destinationStock: destFs,
        feedSize: size,
        feedBrand: brand,
        pallet: size,
        originalBagLogId: selectedTransferRow.lastBagLog?.id,
        originalDate: origDate,
        transferDate: tDate,
        transferTimestamp: new Date().toISOString(),
        quantityKg: numQty,
        transferredBy: currentUser?.name || currentUser?.email || "Staff",
        notes: transferNotes.trim(),
        farmId: activeFarmId
      };

      // Atomic update of transfers state and persistent localStorage
      const updatedTransfers = [newRecord, ...feedTransfers];
      saveFeedTransfers(updatedTransfers);

      // Deduct from source stock remaining log to maintain consistent balance
      const isSameStockTransfer = isStockMatch(destFs, sourceFs) || normalizeFishStock(destFs) === normalizeFishStock(sourceFs);
      const newSourceRemaining = Math.max(0, Math.round((currentAvailable - numQty) * 10) / 10);

      if (isSameStockTransfer) {
        // Transferring a Manual Daily Feed Balance into the same stock's normal Log Bags Open & Leftover workflow:
        // 1. Reduce the manual balance so it cannot be transferred or deducted twice
        const updatedManualList = (manualPrevBalances || []).map(m => {
          if (!m) return m;
          const matchesManual =
            (m.fishStock && (isStockMatch(m.fishStock, sourceFs) || normalizeFishStock(m.fishStock) === normalizeFishStock(sourceFs))) &&
            (size === "—" || isSamePelletSize(m.size, size)) &&
            (!brand || brand === "—" || !m.brand || m.brand === "—" || m.brand.trim().toLowerCase() === brand.trim().toLowerCase());
          if (!matchesManual) return m;
          const nextInit = Math.max(0, Math.round((m.initialRemainingKg - numQty) * 100) / 100);
          return {
            ...m,
            initialRemainingKg: nextInit,
            currentRemainingKg: newSourceRemaining
          };
        });
        saveManualPrevBalances(updatedManualList);

        const existingManualSourceRemain = (remainLogs || []).find(r =>
          isManualPrevDayLog(r) &&
          isSameDate(r.date, origDate) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isStockMatch(r.fishStock, sourceFs) || normalizeFishStock(r.fishStock) === normalizeFishStock(sourceFs))
        );
        if (existingManualSourceRemain && onEditRemainLog) {
          await onEditRemainLog({
            ...existingManualSourceRemain,
            remainingKg: newSourceRemaining,
            initialRemainingKg: Math.max(0, Math.round(((existingManualSourceRemain.initialRemainingKg ?? existingManualSourceRemain.remainingKg ?? 0) - numQty) * 100) / 100),
            date: origDate
          });
        }

        // 2. Credit the transferred quantity into the stock's normal (non-manual) remainLog
        const existingNormalDestRemain = (remainLogs || []).find(r =>
          !isManualPrevDayLog(r) &&
          isSameDate(r.date, tDate) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isStockMatch(r.fishStock, destFs) || normalizeFishStock(r.fishStock) === normalizeFishStock(destFs))
        );
        const normalPrev = existingNormalDestRemain ? (Number(existingNormalDestRemain.remainingKg) || 0) : 0;
        const nextNormalRemain = Math.max(0, Math.round((normalPrev + numQty) * 10) / 10);

        if (existingNormalDestRemain && onEditRemainLog) {
          await onEditRemainLog({
            ...existingNormalDestRemain,
            fishStock: destFs,
            brand: existingNormalDestRemain.brand && existingNormalDestRemain.brand !== "—" ? existingNormalDestRemain.brand : brand,
            remainingKg: nextNormalRemain,
            date: tDate
          });
        } else if (onAddRemainLog) {
          await onAddRemainLog({
            id: uid(),
            brand,
            size,
            fishStock: destFs,
            remainingKg: nextNormalRemain,
            date: tDate,
            farmId: activeFarmId,
            isManualPrevDayBalance: false
          });
        }
      } else {
        const existingSourceRemain = (remainLogs || []).find(r =>
          isSameDate(r.date, origDate) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isStockMatch(r.fishStock, sourceFs) || normalizeFishStock(r.fishStock) === normalizeFishStock(sourceFs))
        );

        if (existingSourceRemain && onEditRemainLog) {
          await onEditRemainLog({
            ...existingSourceRemain,
            remainingKg: newSourceRemaining,
            date: origDate
          });
        } else if (onAddRemainLog) {
          await onAddRemainLog({
            id: uid(),
            brand,
            size,
            fishStock: sourceFs,
            remainingKg: newSourceRemaining,
            date: origDate
          });
        }

        // Add transferred amount to destination stock remaining balance immediately
        const existingDestRemain = (remainLogs || []).find(r =>
          isSameDate(r.date, tDate) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isStockMatch(r.fishStock, destFs) || normalizeFishStock(r.fishStock) === normalizeFishStock(destFs))
        );

        const destPrevBalance = destRow
          ? ((destRow.feedRemainingToday !== null && destRow.feedRemainingToday !== undefined)
            ? destRow.feedRemainingToday
            : (destRow.availableRemainingKg ?? destRow.remainingKg ?? destRow.carryoverKg ?? 0))
          : 0;
        const updatedDestRemain = Math.max(0, Math.round((destPrevBalance + numQty) * 10) / 10);

        if (existingDestRemain && onEditRemainLog) {
          await onEditRemainLog({
            ...existingDestRemain,
            fishStock: destFs,
            brand: existingDestRemain.brand && existingDestRemain.brand !== "—" ? existingDestRemain.brand : brand,
            remainingKg: updatedDestRemain,
            date: tDate
          });
        } else if (onAddRemainLog) {
          await onAddRemainLog({
            id: uid(),
            brand,
            size,
            fishStock: destFs,
            remainingKg: updatedDestRemain,
            date: tDate,
            farmId: activeFarmId
          });
        }
      }

      toast.success(
        `Transferred ${numQty} kg of ${size} (${brand}) from ${formatFishStock(sourceFs)} to ${formatFishStock(destFs)} successfully.`
      );

      setTransferModalOpen(false);
      setSelectedTransferRow(null);
      setTransferDestStock("");
      setTransferQty("");
      setTransferNotes("");
    } catch (err: any) {
      const errMsg = err?.message || "Failed to complete feed transfer. Please try again.";
      setTransferError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  /* Helper to check current available stock for a Brand + Pellet Size */
  const getStockAvailable = (brand: string, size: string, excludeBagLogId?: string) => {
    const brandTrim = (brand || "").toLowerCase().trim();
    const invItems = (inventory || []).filter(f => f && (f.brand || "").toLowerCase().trim() === brandTrim && isSamePelletSize(f.size, size));
    const totalPurchasedKg = invItems.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || 15))), 0);
    const totalPurchasedBags = invItems.reduce((s, f) => s + (Number(f.bags) || 0), 0);
    const weightPerBag = invItems[0]?.weightPerBag || 15;

    const openedLogs = (bagLogs || []).filter(b => b && !isManualPrevDayBalanceLog(b) && (b.brand || "").toLowerCase().trim() === brandTrim && isSamePelletSize(b.size, size) && (excludeBagLogId ? b.id !== excludeBagLogId : true));
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

  /* Helper to check current available stock for a Pellet Size across ALL brands in inventory and feedings */
  const getPelletStock = (size: string, excludeRecordId?: string) => {
    if (!size) return { availableQty: 0, availableKg: 0, inStockBags: 0, totalPurchasedBags: 0, totalPurchasedKg: 0, totalFedKg: 0, exists: false, weightPerBag: 15 };

    // Group all eligible inventory records matching this pellet size
    const matchingInv = (inventory || []).filter(f => f && isSamePelletSize(f.size, size));
    const totalPurchasedKg = matchingInv.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || 15))), 0);
    const totalPurchasedBags = matchingInv.reduce((s, f) => s + (Number(f.bags) || 0), 0);
    const defaultWpb = totalPurchasedBags > 0 ? (totalPurchasedKg / totalPurchasedBags) : (matchingInv[0]?.weightPerBag || 15);

    // Group inventory by brand + size to calculate exact inStock bags matching FeedInventoryPage
    const brandMap: Record<string, { brand: string; size: string; bags: number; wpb: number }> = {};
    matchingInv.forEach(f => {
      const k = `${(f.brand || "").toLowerCase().trim()}|${(f.size || "").toLowerCase().trim()}`;
      if (!brandMap[k]) brandMap[k] = { brand: f.brand, size: f.size, bags: 0, wpb: Number(f.weightPerBag) || 15 };
      brandMap[k].bags += Number(f.bags) || 0;
    });

    let inStockBags = 0;
    let inStockKg = 0;
    Object.values(brandMap).forEach(row => {
      const opened = (bagLogs || [])
        .filter(b => b && !isManualPrevDayBalanceLog(b) && (b.brand || "").toLowerCase().trim() === (row.brand || "").toLowerCase().trim() && isSamePelletSize(b.size, row.size))
        .reduce((sb, b) => sb + (Number(b.bagsOpened) || 0), 0);
      const rowInStock = Math.max(0, row.bags - opened);
      inStockBags += rowInStock;
      inStockKg += rowInStock * row.wpb;
    });

    // Include available remaining kg from manual previous-day balances so subsequent feeding entries deduct seamlessly
    const selIsoCheck = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    const matchingManual = (manualPrevBalances || []).filter(m => {
      if (!m || !isSamePelletSize(m.size, size)) return false;
      const mIso = m.dateIso || toValidDbDate(m.date, viewYear) || dateToIso(m.date);
      if (selIsoCheck && mIso && mIso > selIsoCheck) return false;
      const supersededByNormal = (bagLogs || []).some(b => {
        if (!b || isManualPrevDayLog(b) || !isSamePelletSize(b.size, m.size)) return false;
        if (m.brand && b.brand && b.brand !== "—" && b.brand.toLowerCase().trim() !== m.brand.toLowerCase().trim()) return false;
        if (m.fishStock && m.fishStock !== "All Active Stocks" && b.fishStock && !isStockMatch(b.fishStock, m.fishStock)) return false;
        const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
        return Boolean(mIso && bIso && bIso > mIso && (!selIsoCheck || bIso <= selIsoCheck));
      });
      return !supersededByNormal;
    });
    const manualAvailKg = matchingManual.reduce((sum, m) => {
      const stats = getManualBalanceStats(m, selDate);
      return sum + Math.max(0, stats.currentRemainingKg);
    }, 0);

    const relevantFeeding = (feedingRecords || []).filter(fr => fr && isSamePelletSize(fr.size, size) && (excludeRecordId ? fr.id !== excludeRecordId : true));
    const totalFedKg = relevantFeeding.reduce((s, fr) => s + (Number(fr.total) || ((Number(fr.morning) || 0) + (Number(fr.evening) || 0))), 0);

    const exists = (matchingInv.length > 0 && (totalPurchasedBags > 0 || totalPurchasedKg > 0)) || matchingManual.length > 0;
    const effectiveAvailableKg = inStockKg + manualAvailKg;
    const effectiveAvailableQty = inStockBags + (manualAvailKg > 0 ? Math.ceil(manualAvailKg / defaultWpb) : 0);

    return {
      availableQty: effectiveAvailableQty,
      availableKg: effectiveAvailableKg,
      inStockBags: effectiveAvailableQty,
      totalPurchasedBags,
      totalPurchasedKg: totalPurchasedKg + matchingManual.reduce((s, m) => s + (Number(m.initialRemainingKg) || 0), 0),
      totalFedKg,
      exists,
      weightPerBag: defaultWpb
    };
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
    setViewMonth(m);
    setDocTab("mismatch");
    setSelDate(reconFocus.date);
  }, [reconFocus]);

  /* ── Date-sensitive Fish Stock Options (Pond status & StockEvent cleared dates) ── */
  const getFishStockOptionsForDate = useCallback((targetDate?: string): FishStockOption[] => {
    const targetDbDate = targetDate ? toValidDbDate(targetDate) : toValidDbDate(TODAY);

    // 1. Gather all unique candidate fish stocks across ponds, stockEvents, and historical logs
    type CandidateInfo = {
      name: string;
      stockDates: string[];
      speciesSet: Set<string>;
      ponds: Set<string>;
      normKey: string;
    };
    const candidateMap = new Map<string, CandidateInfo>();

    const registerCandidate = (
      rawStock?: string | null,
      stockDateRaw?: string | null,
      speciesRaw?: string | null,
      pondNameRaw?: string | null
    ) => {
      if (!rawStock || rawStock === "—" || rawStock === "General Stock" || typeof rawStock !== "string") return;
      const trimmed = rawStock.trim();
      if (!trimmed || trimmed === "—" || trimmed === "General Stock" || isPondName(trimmed)) return;
      const formatted = formatFishStock(trimmed);
      if (!formatted || formatted === "—" || formatted === "General Stock" || isPondName(formatted)) return;

      const normKey = normalizeFishStock(formatted).toLowerCase().trim();
      if (!normKey || normKey === "—" || isPondName(normKey)) return;

      let cand = candidateMap.get(normKey);
      if (!cand) {
        cand = {
          name: formatted,
          stockDates: [],
          speciesSet: new Set<string>(),
          ponds: new Set<string>(),
          normKey,
        };
        candidateMap.set(normKey, cand);
      }

      if (stockDateRaw && stockDateRaw !== "—") {
        const fmtD = formatFishStockDate(stockDateRaw);
        if (fmtD && fmtD !== "—" && !cand.stockDates.includes(fmtD)) {
          cand.stockDates.push(fmtD);
        }
      }
      if (speciesRaw && speciesRaw !== "—" && !isPondName(speciesRaw)) {
        cand.speciesSet.add(speciesRaw.trim());
      }
      if (pondNameRaw && pondNameRaw.trim()) {
        cand.ponds.add(pondNameRaw.trim());
      }
    };

    // Sources of candidates:
    // a. Ponds (both active and empty/historical)
    (ponds || []).forEach(p => {
      if (!p) return;
      const dStr = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "";
      if (p.fishStock && p.fishStock.trim() && p.fishStock !== "—" && !isPondName(p.fishStock)) {
        registerCandidate(p.fishStock, p.stockingDate, p.species, p.name);
      } else if (dStr && dStr !== "—") {
        registerCandidate(dStr, p.stockingDate, p.species, p.name);
      } else if (p.species && p.species !== "—" && !isPondName(p.species)) {
        registerCandidate(p.species, p.stockingDate, p.species, p.name);
      }
    });

    // b. Stock Events (Closed, Initial, Restock, Transfer)
    (stockEvents || []).forEach(se => {
      if (!se) return;
      if (se.batch && se.batch.trim() && se.batch !== "—" && !isPondName(se.batch)) {
        registerCandidate(se.batch, se.date, se.species, se.pondName);
      } else if (se.species && se.species !== "—" && !isPondName(se.species)) {
        registerCandidate(se.species, se.date, se.species, se.pondName);
      } else if (se.date && se.date !== "—") {
        const dStr = formatFishStockDate(se.date);
        if (dStr && dStr !== "—") registerCandidate(dStr, se.date, se.species, se.pondName);
      }
    });

    // c. Historical records (bag logs, remain logs, feeding records)
    (bagLogs || []).forEach(b => b?.fishStock && registerCandidate(b.fishStock, b.date, undefined, undefined));
    (remainLogs || []).forEach(r => r?.fishStock && registerCandidate(r.fishStock, r.date, undefined, undefined));
    (feedingRecords || []).forEach(f => {
      if (f?.fishStock) registerCandidate(f.fishStock, f.date, undefined, f.pond);
      else if (f?.pond && !isPondName(f.pond)) registerCandidate(f.pond, f.date, undefined, undefined);
    });

    // 2. Evaluate each candidate against targetDbDate
    const options: FishStockOption[] = [];

    candidateMap.forEach(cand => {
      // Check if candidate is CURRENTLY in at least one Active stocked pond
      const isCurrentlyActive = (ponds || []).some(p => {
        if (!p || p.status !== "Active") return false;
        const count = Number(p.currentCount);
        const initStock = Number(p.initialStock);
        const hasFish = count > 0 || (initStock > 0 && (p.currentCount === undefined || p.currentCount === null));
        if (!hasFish) return false;

        if (p.fishStock && isStockMatch(p.fishStock, cand.name)) return true;
        if (isStockMatch(getPondFishStock(p), cand.name)) return true;
        if (p.species && isStockMatch(p.species, cand.name)) return true;
        if (p.stockingDate && isStockMatch(formatFishStockDate(p.stockingDate), cand.name)) return true;
        return false;
      });

      // Find earliest stocking date (YYYY-MM-DD)
      const stockDbDates: string[] = [];
      (ponds || []).forEach(p => {
        if (p && (isStockMatch(p.fishStock, cand.name) || isStockMatch(getPondFishStock(p), cand.name) || isStockMatch(p.species, cand.name))) {
          const d = toValidDbDate(p.stockingDate);
          if (d) stockDbDates.push(d);
        }
      });
      (stockEvents || []).forEach(se => {
        if (se && (isStockMatch(se.batch, cand.name) || isStockMatch(se.species, cand.name) || cand.ponds.has(se.pondName))) {
          const d = toValidDbDate(se.date);
          if (d) stockDbDates.push(d);
        }
      });
      cand.stockDates.forEach(sd => {
        const d = toValidDbDate(sd);
        if (d) stockDbDates.push(d);
      });
      stockDbDates.sort();
      const earliestStockDbDate = stockDbDates[0] || null;

      // Find cleared date (YYYY-MM-DD) if stock is NOT currently active in ponds
      let maxClosedDate: string | null = null;
      let latestActivityDate: string | null = null;

      if (!isCurrentlyActive) {
        // Collect all Closed events for this stock
        const closedDates: string[] = [];
        (stockEvents || []).forEach(se => {
          if (!se || se.type !== "Closed") return false;
          const matchBatch = se.batch && isStockMatch(se.batch, cand.name);
          const matchSpecies = se.species && isStockMatch(se.species, cand.name);
          const matchPond = cand.ponds.has(se.pondName);
          const pondObj = (ponds || []).find(p => p && p.id === se.pondId);
          const matchPondObj = pondObj && (isStockMatch(pondObj.fishStock, cand.name) || isStockMatch(getPondFishStock(pondObj), cand.name) || isStockMatch(pondObj.species, cand.name));

          if (matchBatch || matchSpecies || matchPond || matchPondObj) {
            const cd = toValidDbDate(se.clearedDate || se.date);
            if (cd) closedDates.push(cd);
          }
        });
        if (closedDates.length > 0) {
          closedDates.sort();
          maxClosedDate = closedDates[closedDates.length - 1];
        }

        // Fallback: latest activity date among logs
        const actDates: string[] = [];
        (feedingRecords || []).forEach(f => {
          if (f && (isStockMatch(f.fishStock, cand.name) || isStockMatch(pondToStock(f.pond), cand.name))) {
            const d = toValidDbDate(f.date);
            if (d) actDates.push(d);
          }
        });
        (bagLogs || []).forEach(b => {
          if (b && isStockMatch(b.fishStock, cand.name)) {
            const d = toValidDbDate(b.date);
            if (d) actDates.push(d);
          }
        });
        (remainLogs || []).forEach(r => {
          if (r && isStockMatch(r.fishStock, cand.name)) {
            const d = toValidDbDate(r.date);
            if (d) actDates.push(d);
          }
        });
        if (actDates.length > 0) {
          actDates.sort();
          latestActivityDate = actDates[actDates.length - 1];
        }
      }

      // ── Date-Sensitivity Filtering ──
      if (targetDbDate) {
        // 1. If stock is no longer in any active pond today, check if it was cleared on/before targetDbDate
        if (!isCurrentlyActive) {
          if (maxClosedDate && targetDbDate >= maxClosedDate) {
            // Cleared from all ponds on or before target date -> ceases to appear
            return;
          }
          if (!maxClosedDate && latestActivityDate && targetDbDate > latestActivityDate) {
            // Ceased to exist after its latest recorded activity -> ceases to appear
            return;
          }
          if (!maxClosedDate && !latestActivityDate) {
            // No activity and no active pond -> ceases to appear
            return;
          }
        }

        // 2. If targetDate is before the stock was stocked
        if (earliestStockDbDate && targetDbDate < earliestStockDbDate) {
          return;
        }
      } else {
        // No valid target date: only show currently active stocks
        if (!isCurrentlyActive) return;
      }

      // Build option
      const primaryStockDate = cand.stockDates[0] || (earliestStockDbDate ? formatFishStockDate(earliestStockDbDate) : "—");
      const label = primaryStockDate && primaryStockDate !== "—" && !cand.name.toLowerCase().includes(primaryStockDate.toLowerCase())
        ? `${cand.name} (${primaryStockDate})`
        : cand.name;

      options.push({
        id: cand.name,
        name: cand.name,
        stockDate: primaryStockDate,
        species: Array.from(cand.speciesSet)[0] || "—",
        ponds: Array.from(cand.ponds),
        label
      });
    });

    return options;
  }, [ponds, stockEvents, bagLogs, remainLogs, feedingRecords, isPondName]);

  /* ── stockFilterOptions for filtering Feeding Record and Bags Opened by stock (date-aware for selDate) ── */
  const stockFilterOptions = useMemo(() => {
    const list: { key: string; label: string; name: string }[] = [];
    const seen = new Set<string>();
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);

    const addOption = (rawStock?: string | null, rawStockingDate?: string | null) => {
      if (!rawStock || rawStock === "—" || rawStock === "General Stock") return;
      const stock = !isPondName(rawStock) ? formatFishStock(rawStock) : rawStock;
      if (!stock || stock === "—" || stock === "General Stock" || isPondName(stock)) return;

      const norm = normalizeFishStock(stock).toLowerCase().trim();
      if (!norm || seen.has(norm)) return;
      seen.add(norm);

      const dStr = rawStockingDate && rawStockingDate !== "—" ? formatFishStockDate(rawStockingDate) : "";
      const label = dStr && dStr !== "—" && !stock.toLowerCase().includes(dStr.toLowerCase())
        ? `${stock} (${dStr})`
        : stock;

      list.push({ key: norm, label, name: stock });
    };

    pondsActiveOnSelDate.forEach(p => {
      const stock = (p.fishStock && p.fishStock !== "—" && !isPondName(p.fishStock))
        ? formatFishStock(p.fishStock)
        : getPondFishStock(p);
      addOption(stock, p.stockingDate);
    });

    // Also include stocks explicitly logged in feedingRecords, bagLogs, or remainLogs on selDate
    (feedingRecords || []).forEach(r => {
      if (!r || !r.date) return;
      const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
      if (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || (selIso && rIso && rIso === selIso)) {
        addOption(r.fishStock || pondToStock(r.pond), r.fishStock);
      }
    });
    (bagLogs || []).forEach(b => {
      if (!b || !b.date || isManualPrevDayLog(b)) return;
      const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
      if (isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate)) || (selIso && bIso && bIso === selIso)) {
        addOption(b.fishStock, b.fishStock);
      }
    });
    (remainLogs || []).forEach(r => {
      if (!r || !r.date || isManualPrevDayLog(r)) return;
      const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
      if (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || (selIso && rIso && rIso === selIso)) {
        addOption(r.fishStock, r.fishStock);
      }
    });

    return list;
  }, [pondsActiveOnSelDate, feedingRecords, bagLogs, remainLogs, selDate, viewYear, dateToIso, isPondName, isManualPrevDayLog]);

  /* ── Modal Fish Stock Options for Log Bags (date-aware for selDate) ── */
  const modalFishStockOptions = useMemo((): FishStockOption[] => {
    return stockFilterOptions.map(opt => {
      const matchingPonds = pondsActiveOnSelDate.filter(p => {
        const pStock = (p.fishStock && p.fishStock !== "—" && !isPondName(p.fishStock)) ? formatFishStock(p.fishStock) : getPondFishStock(p);
        return isStockMatch(pStock, opt.name);
      });
      const primaryPond = matchingPonds[0] || (ponds || []).find(p => p && isStockMatch(getPondFishStock(p), opt.name));
      const stockDate = primaryPond?.stockingDate && primaryPond.stockingDate !== "—"
        ? formatFishStockDate(primaryPond.stockingDate)
        : (formatFishStockDate(opt.name) !== "—" ? formatFishStockDate(opt.name) : "—");
      return {
        id: opt.name,
        name: opt.name,
        label: opt.label,
        stockDate,
        species: primaryPond?.species || "—",
        ponds: matchingPonds.map(p => p.name)
      };
    });
  }, [stockFilterOptions, pondsActiveOnSelDate, ponds, isPondName]);

  const activeFishStockOptions = modalFishStockOptions;

  /* ── Auto-reset stock selection filters if selected stock is not available on selDate ── */
  useEffect(() => {
    if (dailyStockFilter !== "All") {
      const exists = stockFilterOptions.some(opt =>
        isStockMatch(opt.name, dailyStockFilter) ||
        opt.key === normalizeFishStock(dailyStockFilter).toLowerCase().trim()
      );
      if (!exists) {
        setDailyStockFilter("All");
      }
    }
  }, [stockFilterOptions, dailyStockFilter]);

  useEffect(() => {
    if (bagsStockFilter !== "All") {
      const exists = stockFilterOptions.some(opt =>
        isStockMatch(opt.name, bagsStockFilter) ||
        opt.key === normalizeFishStock(bagsStockFilter).toLowerCase().trim()
      );
      if (!exists) {
        setBagsStockFilter("All");
      }
    }
  }, [stockFilterOptions, bagsStockFilter]);

  /* ── helper: count bags opened for a given fish stock + brand + pellet size on a date ── */
  const getBagsLoggedTodayForStockAndSize = (stockName: string, brandName: string, palletSize: string, checkDate: string): number => {
    if (!stockName || !palletSize || !checkDate || stockName === "—") return 0;
    const normalizedStock = normalizeFishStock(stockName).toLowerCase().trim();
    const normalizedBrand = (brandName || "").toLowerCase().trim();
    const dateLabel = toDateLabel(checkDate);
    const checkIso = dateToIso(checkDate);
    const matching = (bagLogs || []).filter(b => {
      if (!b || isManualPrevDayLog(b) || (Number(b.bagsOpened) || 0) <= 0 || !b.fishStock || b.fishStock === "—") return false;
      const bIso = dateToIso(b.date);
      const isDateMatch = isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel) || Boolean(checkIso && bIso && checkIso === bIso);
      if (!isDateMatch) return false;
      return (
        (isStockMatch(b.fishStock, stockName) || normalizeFishStock(b.fishStock).toLowerCase().trim() === normalizedStock) &&
        (normalizedBrand === "" || (b.brand || "").toLowerCase().trim() === normalizedBrand) &&
        (palletSize === "—" || isSamePelletSize(b.size, palletSize))
      );
    });
    return matching.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
  };
  const isStockAndSizeAlreadyLogged = (stockName: string, brandName: string, palletSize: string, checkDate: string): boolean => {
    return getBagsLoggedTodayForStockAndSize(stockName, brandName, palletSize, checkDate) > 0;
  };

  /* ── helper: calculate expected bags and expected remaining for a fish stock, brand, and size on a date ── */
  const getExpectedFeedData = (targetDate: string, fishStock: string, brand: string, size: string, bagsOpenedOverride?: number) => {
    if (!targetDate) {
      return { hasFed: false, totalFed: 0, carryover: 0, bagWeight: 15, expectedBags: 0, expectedRemaining: 0 };
    }

    const normStock = (fishStock && fishStock !== "—") ? normalizeFishStock(fishStock) : "";
    const dateLabel = toDateLabel(targetDate);
    const targetIso = dateToIso(targetDate);
    const datePonds = getPondsActiveOnDate(targetDate);

    const fedRecords = (feedingRecords || []).filter(r => {
      if (!r) return false;
      const rIso = dateToIso(r.date);
      const dateMatch = isSameDate(r.date, targetDate) || isSameDate(r.date, dateLabel) || Boolean(targetIso && rIso && targetIso === rIso);
      if (!dateMatch) return false;
      if (size && size !== "—" && r.size && !isSamePelletSize(r.size, size)) return false;
      if (brand && brand !== "—" && r.brand && r.brand !== "—" && r.brand.toLowerCase().trim() !== brand.toLowerCase().trim()) return false;
      if (normStock && normStock !== "—") {
        if (r.fishStock && r.fishStock !== "—") {
          if (!isStockMatch(normStock, r.fishStock)) return false;
        } else if (r.pond) {
          const rPond = r.pond.toLowerCase().trim();
          const matchedPond = datePonds.find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond)) ||
            (ponds || []).find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond));
          if (!matchedPond) return false;
          const pStock = getPondFishStock(matchedPond);
          if (!isStockMatch(normStock, pStock) && !isStockMatch(normStock, matchedPond.fishStock)) return false;
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          const rDate = toValidDbDate(r.date);
          if (pStockDate && rDate && rDate < pStockDate) return false;
        } else {
          return false;
        }
      }
      return true;
    });
    const totalFed = fedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

    const carryover = getPriorCarryover(normStock, size, targetDate, brand);

    const invItem = (inventory || []).find(f => f && (brand && brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && isSamePelletSize(f.size, size)) || (inventory || []).find(f => f && isSamePelletSize(f.size, size));
    const bagWeight = invItem?.weightPerBag || 15;

    // Incoming transfers available for destination stock on targetDate
    const transfersInToday = (feedTransfers || []).filter(t =>
      isStockMatch(t.destinationStock, normStock) &&
      isSamePelletSize(t.feedSize, size) &&
      (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
      (isSameDate(t.transferDate, targetDate) || (targetIso && dateToIso(t.transferDate) === targetIso))
    );
    const availableTransfersIn = transfersInToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

    // Outgoing transfers on targetDate
    const transfersOutToday = (feedTransfers || []).filter(t =>
      isStockMatch(t.sourceStock, normStock) &&
      isSamePelletSize(t.feedSize, size) &&
      (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
      (isSameDate(t.originalDate, targetDate) || isSameDate(t.transferDate, targetDate) || (targetIso && (dateToIso(t.originalDate) === targetIso || dateToIso(t.transferDate) === targetIso)))
    );
    const totalTransferredOut = transfersOutToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

    const effectiveCarryover = Math.max(0, carryover + availableTransfersIn - totalTransferredOut);
    const netNeeded = Math.max(0, totalFed - effectiveCarryover);
    const expectedBags = netNeeded > 0 ? Math.ceil(netNeeded / bagWeight) : 0;
    const loggedBags = getBagsLoggedTodayForStockAndSize(normStock, brand, size, targetDate);
    const effectiveBags = bagsOpenedOverride !== undefined ? bagsOpenedOverride : (totalFed > 0 ? expectedBags : loggedBags);
    const totalAvailable = effectiveCarryover + (effectiveBags * bagWeight);
    const expectedRemaining = Math.max(0, Math.round((totalAvailable - totalFed) * 10) / 10);

    return {
      hasFed: totalFed > 0,
      totalFed,
      carryover: effectiveCarryover,
      bagWeight,
      expectedBags,
      expectedRemaining
    };
  };

  const getBrandUsedKey = useCallback((dateStr: string, fishStock: string, brand: string, size: string): string => {
    const dIso = toValidDbDate(dateStr, viewYear) || dateToIso(dateStr) || dateStr;
    const normFs = normalizeFishStock(fishStock, dateStr).toLowerCase().trim();
    const normBr = (brand || "").toLowerCase().trim();
    const normSz = (size || "").toLowerCase().replace(/\s+/g, "").trim();
    return `${dIso}__${normFs}__${normBr}__${normSz}`;
  }, [viewYear, dateToIso, normalizeFishStock]);

  const getBrandUsedKg = useCallback((dateStr: string, fishStock: string, brand: string, size: string): number | null => {
    if (!fishStock || !brand || brand === "—" || !size || size === "—") return null;
    const exactKey = getBrandUsedKey(dateStr, fishStock, brand, size);
    if (dailyBrandUsedMap[exactKey] !== undefined) return dailyBrandUsedMap[exactKey];
    const dIso = toValidDbDate(dateStr, viewYear) || dateToIso(dateStr) || "";
    const normBr = brand.toLowerCase().trim();
    const normSz = size.toLowerCase().replace(/\s+/g, "").trim();
    for (const [k, v] of Object.entries(dailyBrandUsedMap)) {
      const [kDate, kFs, kBr, kSz] = k.split("__");
      if (kDate === dIso && kBr === normBr && kSz === normSz && (isStockMatch(kFs, fishStock) || normalizeFishStock(kFs, dateStr).toLowerCase().trim() === normalizeFishStock(fishStock, dateStr).toLowerCase().trim())) {
        return v;
      }
    }
    return null;
  }, [dailyBrandUsedMap, getBrandUsedKey, viewYear, dateToIso, isStockMatch, normalizeFishStock]);

  const blankBagRow = (targetDate?: string, preferredStock?: string, preferredSize?: string): BagRow => {
    const dateOpts = targetDate ? getFishStockOptionsForDate(targetDate) : modalFishStockOptions;
    const opts = dateOpts.length > 0 ? dateOpts : modalFishStockOptions;
    const isExplicitBlank = preferredStock === "";
    const isPreferredActive = Boolean(preferredStock && opts.some(opt => opt.name === preferredStock || isStockMatch(opt.name, preferredStock)));
    const rawFs = isExplicitBlank ? "" : (isPreferredActive ? preferredStock! : (opts[0]?.name || ""));
    const fs = isExplicitBlank ? "" : (isPondName(rawFs) ? (opts[0]?.name || "") : rawFs);
    const associated = fs ? getAssociatedPalletsForStock(fs, targetDate || bagsDate) : [];
    const pallet = preferredSize !== undefined ? preferredSize : (associated.length > 0 ? associated[0] : "");
    return {
      fishStock: fs,
      brand: "",
      size: pallet,
      kgPerBag: 15,
      qty: "",
      usedKg: "",
      remainingKg: ""
    };
  };

  const getBagRowsForDate = (checkDate: string): BagRow[] => {
    const dateLabel = toDateLabel(checkDate);
    const checkIso = dateToIso(checkDate);
    const existingBags = (bagLogs || []).filter(b => {
      if (!b || isManualPrevDayLog(b)) return false;
      const bIso = dateToIso(b.date);
      return isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel) || Boolean(checkIso && bIso && checkIso === bIso) || (isSameDate(checkDate, getIsoDateForSelDate(selDate)) && isSameDate(b.date, selDate));
    });
    const existingRemains = (remainLogs || []).filter(r => {
      if (!r || isManualPrevDayLog(r)) return false;
      const rIso = dateToIso(r.date);
      return isSameDate(r.date, checkDate) || isSameDate(r.date, dateLabel) || Boolean(checkIso && rIso && checkIso === rIso) || (isSameDate(checkDate, getIsoDateForSelDate(selDate)) && isSameDate(r.date, selDate));
    });

    const dateOptions = getFishStockOptionsForDate(checkDate);
    const map = new Map<string, BagRow>();
    existingBags.forEach(b => {
      const matchedOpt = dateOptions.find(opt =>
        opt.name === b.fishStock ||
        isStockMatch(opt.name, b.fishStock) ||
        normalizeFishStock(opt.name) === normalizeFishStock(b.fishStock) ||
        opt.ponds.some(p => p === b.fishStock || isStockMatch(p, b.fishStock))
      );
      const resolvedFs = matchedOpt?.name || (b.fishStock && isPondName(b.fishStock) ? pondToStock(b.fishStock, checkDate) : b.fishStock) || (dateOptions[0]?.name || "");
      const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;
      const associatedPallets = getAssociatedPalletsForStock(fs, checkDate);
      const size = b.size || (associatedPallets[0] || (invSizesForBrand(b.brand)[0] || ""));
      const matchingBrands = getMatchingBrandsForPallet(size);
      const brand = b.brand || (matchingBrands[0] || (invBrands[0] || ""));

      const inv = (inventory || []).find(f => f && f.brand === brand && isSamePelletSize(f.size, size));
      const kgPb = Number(b.kgPerBag) || inv?.weightPerBag || 15;
      const key = `${normalizeFishStock(fs)}__${brand.toLowerCase().trim()}__${size.toLowerCase().trim()}`;

      const rLog = existingRemains.find(r =>
        (isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock) === normalizeFishStock(fs)) &&
        (!r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (!r.size || r.size === "—" || isSamePelletSize(r.size, size))
      );

      const usedVal = getBrandUsedKg(checkDate, fs, brand, size);
      map.set(key, {
        id: b.id,
        fishStock: fs,
        brand,
        size,
        kgPerBag: kgPb,
        qty: b.bagsOpened !== undefined && b.bagsOpened !== null ? String(b.bagsOpened) : "",
        usedKg: usedVal !== null ? String(usedVal) : "",
        remainingKg: rLog && rLog.remainingKg !== undefined && rLog.remainingKg !== null ? String(rLog.remainingKg) : ""
      });
    });

    // Also include leftover logs that do not have a corresponding bag log
    existingRemains.forEach(r => {
      const matchedOpt = dateOptions.find(opt =>
        opt.name === r.fishStock ||
        isStockMatch(opt.name, r.fishStock) ||
        normalizeFishStock(opt.name) === normalizeFishStock(r.fishStock) ||
        opt.ponds.some(p => p === r.fishStock || isStockMatch(p, r.fishStock))
      );
      const resolvedFs = matchedOpt?.name || (isPondName(r.fishStock) ? pondToStock(r.fishStock, checkDate) : r.fishStock) || (dateOptions[0]?.name || "");
      const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;
      const associatedPallets = getAssociatedPalletsForStock(fs, checkDate);
      const size = r.size || (associatedPallets[0] || "");
      const matchingBrands = getMatchingBrandsForPallet(size);
      const brand = r.brand || (matchingBrands[0] || (invBrands[0] || ""));

      const key = `${normalizeFishStock(fs)}__${brand.toLowerCase().trim()}__${size.toLowerCase().trim()}`;
      if (!map.has(key)) {
        const inv = (inventory || []).find(f => f && f.brand === brand && isSamePelletSize(f.size, size));
        const kgPb = inv?.weightPerBag || 15;
        const usedVal = getBrandUsedKg(checkDate, fs, brand, size);
        map.set(key, {
          fishStock: fs,
          brand,
          size,
          kgPerBag: kgPb,
          qty: "",
          usedKg: usedVal !== null ? String(usedVal) : "",
          remainingKg: r.remainingKg !== undefined && r.remainingKg !== null ? String(r.remainingKg) : ""
        });
      }
    });

    if (map.size > 0) {
      return Array.from(map.values());
    }

    return [];
  };

  const getDefaultBagRowsForDate = (targetDate: string): BagRow[] => {
    const existing = getBagRowsForDate(targetDate);
    if (existing.length > 0) return existing;
    return [blankBagRow(targetDate)];
  };

  const openBagsModal = () => {
    const initialDate = getIsoDateForSelDate(selDate);
    setBagsDate(initialDate);
    setBagsModalLockedStock(null);
    setBagRows(getDefaultBagRowsForDate(initialDate));
    setBagsErr({});
    setShowBagsModal(true);
  };

  const openDailyBalanceForStock = (row: MergedBagRow) => {
    const initialDate = getIsoDateForSelDate(selDate);
    const dateOptions = getFishStockOptionsForDate(initialDate);
    const matchedOpt = dateOptions.find(opt =>
      opt.name === row.fishStock ||
      isStockMatch(opt.name, row.fishStock) ||
      normalizeFishStock(opt.name) === normalizeFishStock(row.fishStock) ||
      opt.ponds.some(p => p === row.fishStock || isStockMatch(p, row.fishStock))
    );
    const resolvedFs = matchedOpt?.name || (isPondName(row.fishStock) ? pondToStock(row.fishStock, initialDate) : row.fishStock) || (dateOptions[0]?.name || "");
    const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;

    setBagsDate(initialDate);
    setBagsModalLockedStock(fs);
    setBagsErr({});

    const existingForStock = getBagRowsForDate(initialDate).filter(r =>
      isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock, initialDate).toLowerCase().trim() === normalizeFishStock(fs, initialDate).toLowerCase().trim()
    );
    if (existingForStock.length > 0) {
      setBagRows(existingForStock);
    } else {
      const sz = row.size && row.size !== "—" ? row.size : (getAssociatedPalletsForStock(fs, initialDate)[0] || "");
      const br = row.brand && row.brand !== "—" ? row.brand : "";
      const inv = br ? (inventory || []).find(f => f && f.brand === br && isSamePelletSize(f.size, sz)) : undefined;
      const usedVal = br ? getBrandUsedKg(initialDate, fs, br, sz) : null;
      setBagRows([{
        id: row.lastBagLog?.id,
        fishStock: fs,
        brand: br,
        size: sz,
        kgPerBag: row.lastBagLog?.kgPerBag || inv?.weightPerBag || 15,
        qty: row.hasBagLog ? String(row.bagsOpened) : "",
        usedKg: usedVal !== null ? String(usedVal) : "",
        remainingKg: row.hasRemainLog && row.feedRemainingToday !== null && row.feedRemainingToday !== undefined ? String(row.feedRemainingToday) : ""
      }]);
    }
    setShowBagsModal(true);
  };

  const handleBagsDateChange = (newDate: string) => {
    setBagsDate(newDate);
    if (newDate) {
      setBagsErr({});
      if (bagsModalLockedStock) {
        const existingForStock = getBagRowsForDate(newDate).filter(r =>
          isStockMatch(r.fishStock, bagsModalLockedStock) ||
          normalizeFishStock(r.fishStock, newDate).toLowerCase().trim() === normalizeFishStock(bagsModalLockedStock, newDate).toLowerCase().trim()
        );
        setBagRows(existingForStock.length > 0 ? existingForStock : [blankBagRow(newDate, bagsModalLockedStock)]);
      } else {
        setBagRows(getDefaultBagRowsForDate(newDate));
      }
    }
  };

  const addBagRow = () => setBagRows(prev => [
    ...prev,
    bagsModalLockedStock ? blankBagRow(bagsDate, bagsModalLockedStock, prev[prev.length - 1]?.size || "") : blankBagRow(bagsDate, "", "")
  ]);
  const addBrandRowForStock = (fishStock: string, preferredSize?: string, insertAfterIdx?: number) => {
    const newRow = blankBagRow(bagsDate, fishStock, preferredSize || "");
    setBagRows(prev => {
      if (insertAfterIdx !== undefined && insertAfterIdx >= 0 && insertAfterIdx < prev.length) {
        const next = [...prev];
        next.splice(insertAfterIdx + 1, 0, newRow);
        return next;
      }
      return [...prev, newRow];
    });
  };
  const removeBagRow = (i: number) => setBagRows(prev => prev.filter((_, idx) => idx !== i));
  const updateBagRow = (i: number, k: keyof BagRow, v: string) => setBagRows(prev => prev.map((r, idx) => {
    if (idx !== i) return r;
    if (k === "fishStock") {
      const associated = getAssociatedPalletsForStock(v, bagsDate);
      let newPallet = r.size;
      if (associated.length === 1) {
        newPallet = associated[0];
      } else if (associated.length > 1) {
        newPallet = associated.some(p => isSamePelletSize(p, r.size)) ? r.size : associated[0];
      } else if (associated.length === 0) {
        newPallet = "";
      }

      const matchingBrands = getMatchingBrandsForPallet(newPallet);
      const newBrand = (r.brand && matchingBrands.some(b => b.toLowerCase().trim() === r.brand.toLowerCase().trim()))
        ? r.brand
        : "";

      const inv = newBrand ? (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, newPallet)) : undefined;
      return { ...r, fishStock: v, size: newPallet, brand: newBrand, kgPerBag: inv?.weightPerBag || 15 };
    }

    if (k === "size") {
      // User changed pallet (size) — keep manual brand only if valid for new pallet; never auto-assign a brand
      const matchingBrands = getMatchingBrandsForPallet(v);
      const newBrand = (r.brand && matchingBrands.some(b => b.toLowerCase().trim() === r.brand.toLowerCase().trim()))
        ? r.brand
        : "";

      const inv = newBrand ? (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, v)) : undefined;
      return { ...r, size: v, brand: newBrand, kgPerBag: inv?.weightPerBag || 15 };
    }

    if (k === "brand") {
      const inv = (inventory || []).find(f => f && f.brand === v && isSamePelletSize(f.size, r.size));
      return { ...r, brand: v, kgPerBag: inv?.weightPerBag || 15 };
    }

    return { ...r, [k]: v };
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
      if (!r.size) {
        errs[`size_${idx}`] = "Pallet size is required";
        return;
      }
      if (!r.brand) {
        errs[`brand_${idx}`] = "Feed Brand is required";
        return;
      }

      // Check brand and pallet compatibility with Feed Stock
      if (inventory.length > 0) {
        const matchingBrands = getMatchingBrandsForPallet(r.size);
        if (matchingBrands.length > 0 && !matchingBrands.some(b => b.toLowerCase().trim() === r.brand.toLowerCase().trim())) {
          errs[`brand_${idx}`] = `Brand "${r.brand}" is not associated with ${r.size} in Feed Stock.`;
        }
      }

      const normalizedStock = normalizeFishStock(r.fishStock).toLowerCase().trim();
      const normalizedBrand = (r.brand || "").toLowerCase().trim();
      const normalizedSize = (r.size || "").toLowerCase().trim();
      const stockSizeKey = `${normalizedStock}__${normalizedBrand}__${normalizedSize}`;

      if (formStockSizeKeys.has(stockSizeKey)) {
        errs[`dup_${idx}`] = "This stock, brand & pallet has already been entered above. Please combine into one entry.";
      }
      formStockSizeKeys.add(stockSizeKey);

      const hasQty = r.qty !== "" && !isNaN(Number(r.qty));
      const hasUsed = r.usedKg !== undefined && r.usedKg !== "" && !isNaN(Number(r.usedKg));
      const hasRemain = r.remainingKg !== "" && !isNaN(Number(r.remainingKg));

      if (!hasQty && !hasUsed && !hasRemain) {
        errs[`qty_${idx}`] = "Enter Bags Opened, Quantity Used, or Leftover Feed";
        return;
      }

      if (r.qty !== "") {
        const requestedBags = Number(r.qty);
        if (isNaN(requestedBags) || requestedBags < 0) {
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
      }

      if (r.usedKg !== undefined && r.usedKg !== "") {
        const usedVal = Number(r.usedKg);
        if (isNaN(usedVal) || usedVal < 0) {
          errs[`used_${idx}`] = "Enter a valid feed used quantity (0 or greater)";
        }
      }

      if (r.remainingKg !== "") {
        const remVal = Number(r.remainingKg);
        if (isNaN(remVal) || remVal < 0) {
          errs[`rem_${idx}`] = "Enter a valid remaining feed amount (0 or greater)";
        }
      }
    });

    // Check available inventory across all rows for this brand & size (excluding logs on this target date)
    for (const [key, req] of Object.entries(requestedBagsByBrandSize)) {
      const invItems = (inventory || []).filter(f => f && f.brand.toLowerCase().trim() === req.brand.toLowerCase().trim() && isSamePelletSize(f.size, req.size));
      const totalPurchasedBags = invItems.reduce((s, f) => s + (Number(f.bags) || 0), 0);
      const weightPerBag = invItems[0]?.weightPerBag || 15;
      const totalPurchasedKg = invItems.reduce((s, f) => s + (Number(f.totalKg) || (Number(f.bags) * (Number(f.weightPerBag) || weightPerBag))), 0);

      const openedOnOtherDates = (bagLogs || []).filter(b =>
        b &&
        !isManualPrevDayBalanceLog(b) &&
        b.brand?.toLowerCase().trim() === req.brand.toLowerCase().trim() &&
        isSamePelletSize(b.size, req.size) &&
        !isSameDate(b.date, bagsDate) &&
        !isSameDate(b.date, dateLabel)
      );
      const totalOpenedOtherBags = openedOnOtherDates.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
      const totalOpenedOtherKg = openedOnOtherDates.reduce((s, b) => s + (Number(b.totalKg) || (Number(b.bagsOpened) * (Number(b.kgPerBag) || weightPerBag))), 0);

      const availableBags = Math.max(0, totalPurchasedBags - totalOpenedOtherBags);
      const availableKg = Math.max(0, totalPurchasedKg - totalOpenedOtherKg);

      if (req.totalRequestedBags > availableBags || req.totalRequestedKg > availableKg) {
        const errIdx = bagRows.findIndex(r => (r.brand || "").toLowerCase().trim() === req.brand.toLowerCase().trim() && isSamePelletSize(r.size, req.size));
        errs[`stock_${errIdx >= 0 ? errIdx : 0}`] = `Insufficient stock for ${req.brand} ${req.size}. Available: ${availableBags} bag${availableBags !== 1 ? "s" : ""} (${availableKg}kg), requested: ${req.totalRequestedBags} bags.`;
      }
    }

    if (Object.keys(errs).length) { setBagsErr(errs); return; }
    setBagsErr({});

    setShowBagsModal(false);
    setBagsModalLockedStock(null);
    toast.success("Daily feed balance saved");
    setSelDate(dateLabel);
    if (docTab !== "mismatch") {
      setDocTab("bags");
    }

    // Count how many distinct brands are being logged per (fishStock, size) so we never attribute a multi-brand feeding to a single brand
    const brandCountByStockSize = new Map<string, Set<string>>();
    for (const r of bagRows) {
      const fsKey = normalizeFishStock(r.fishStock, bagsDate).toLowerCase().trim();
      const szKey = (r.size || "").toLowerCase().replace(/\s+/g, "").trim();
      const brKey = (r.brand || "").toLowerCase().trim();
      if (!fsKey || !szKey || !brKey) continue;
      const groupKey = `${fsKey}__${szKey}`;
      const set = brandCountByStockSize.get(groupKey) || new Set<string>();
      set.add(brKey);
      brandCountByStockSize.set(groupKey, set);
    }

    const usedMapUpdates: { key: string; val: number | null }[] = [];
    const promises: Promise<any>[] = [];
    for (const r of bagRows) {
      const fs = normalizeFishStock(r.fishStock) || undefined;
      const hasQty = r.qty !== "" && !isNaN(Number(r.qty));
      const n = hasQty ? Number(r.qty) : 0;
      const hasUsedVal = r.usedKg !== undefined && r.usedKg !== "" && !isNaN(Number(r.usedKg));
      const usedVal = hasUsedVal ? Math.round(Number(r.usedKg) * 100) / 100 : null;
      const hasRemVal = r.remainingKg !== "" && !isNaN(Number(r.remainingKg));
      const remVal = hasRemVal ? Math.round(Number(r.remainingKg) * 100) / 100 : 0;

      if (fs && r.brand && r.size) {
        usedMapUpdates.push({
          key: getBrandUsedKey(bagsDate, fs, r.brand, r.size),
          val: usedVal
        });
      }

      // ── 1. Save Bags Opened (0 bags when recording used/leftover without opening new bags -> zero inventory deduction) ──
      const existingRec = (bagLogs || []).find(x =>
        !isManualPrevDayLog(x) && (
          (r.id && x.id === r.id) ||
          (isSameDate(x.date, dateLabel) &&
            isSamePelletSize(x.size, r.size) &&
            (!r.brand || !x.brand || x.brand.toLowerCase().trim() === r.brand.toLowerCase().trim()) &&
            isStockMatch(x.fishStock, fs))
        )
      );

      if (hasQty || (hasUsedVal && !hasRemVal)) {
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
        } else if (n > 0 || (n === 0 && (!hasRemVal || hasUsedVal))) {
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

      // ── 2. Save Remaining Leftover Feed (independent per Fish Stock + Brand + Pellet Size) ──
      const existingRemain = (remainLogs || []).find(x =>
        !isManualPrevDayLog(x) &&
        (!r.brand || !x.brand || x.brand.toLowerCase().trim() === r.brand.toLowerCase().trim()) &&
        (!r.size || !x.size || isSamePelletSize(x.size, r.size)) &&
        (isStockMatch(x.fishStock, fs) || normalizeFishStock(x.fishStock) === fs) &&
        (isSameDate(x.date, bagsDate) || isSameDate(x.date, dateLabel))
      );

      if (hasRemVal && fs) {
        if (existingRemain && onEditRemainLog) {
          promises.push(Promise.resolve(onEditRemainLog({
            ...existingRemain,
            brand: r.brand,
            size: r.size,
            fishStock: fs,
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
      } else if (hasQty && !hasUsedVal && existingRemain && onEditRemainLog && fs) {
        // Bags opened saved and leftover empty -> treat as 0 leftover
        promises.push(Promise.resolve(onEditRemainLog({
          ...existingRemain,
          brand: r.brand,
          size: r.size,
          fishStock: fs,
          remainingKg: 0,
          date: dateLabel
        })));
      }

      // Feeding records and Daily Feed Balance records remain completely separate (no brand overwrite on feeding records)
    }

    if (usedMapUpdates.length > 0) {
      persistDailyBrandUsedMap(prev => {
        const next = { ...prev };
        for (const u of usedMapUpdates) {
          if (u.val === null) {
            delete next[u.key];
          } else {
            next[u.key] = u.val;
          }
        }
        return next;
      });
    }

    Promise.all(promises).catch(err => {
      console.error("Failed to save feed logs:", err);
    });
  };

  /* ── mismatchRows (fish stocks active/fed on selDate with bag opening or leftover discrepancies) ── */
  const mismatchRows = useMemo((): MismatchStockRow[] => {
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    const activeStocksMap = new Map<string, { stockName: string; stockDate: string; pondNames: string[]; totalCount: number }>();

    const registerStock = (rawStock?: string | null, rawStockDate?: string | null, pondName?: string | null, count?: number) => {
      if (!rawStock || rawStock === "—" || rawStock === "General Stock") return;
      const stockName = isPondName(rawStock) ? pondToStock(rawStock, selDate) : formatFishStock(rawStock);
      if (!stockName || stockName === "—" || stockName === "General Stock" || isPondName(stockName)) return;
      const stockDate = rawStockDate && rawStockDate !== "—" ? formatFishStockDate(rawStockDate) : (formatFishStockDate(stockName) !== "—" ? formatFishStockDate(stockName) : "—");
      const key = normalizeFishStock(stockName).toLowerCase().trim();
      if (!key || key === "—") return;
      const existing = activeStocksMap.get(key);
      if (existing) {
        if (pondName && !existing.pondNames.includes(pondName)) {
          existing.pondNames.push(pondName);
        }
        existing.totalCount += (count || 0);
      } else {
        activeStocksMap.set(key, {
          stockName,
          stockDate,
          pondNames: pondName ? [pondName] : [],
          totalCount: count || 0
        });
      }
    };

    // 1. Register stocks from ponds active on selDate
    pondsActiveOnSelDate.forEach(p => {
      const stockName = getPondFishStock(p);
      registerStock(stockName, p.stockingDate, p.name, p.currentCount || p.initialStock || 0);
    });

    // 2. Also register stocks with feeding records or bag logs on selDate
    (feedingRecords || []).forEach(r => {
      if (!r || !r.date) return;
      const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
      if (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || (selIso && rIso && rIso === selIso)) {
        registerStock(r.fishStock || pondToStock(r.pond, selDate), r.fishStock, r.pond, 0);
      }
    });
    (bagLogs || []).forEach(b => {
      if (!b || !b.date || isManualPrevDayLog(b)) return;
      const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
      if (isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate)) || (selIso && bIso && bIso === selIso)) {
        registerStock(b.fishStock, b.fishStock, undefined, 0);
      }
    });

    const rows: MismatchStockRow[] = [];

    activeStocksMap.forEach((stockInfo, key) => {
      // Feeding records for this stock on selDate
      const fedRecords = (feedingRecords || []).filter(r => {
        if (!r || !r.date) return false;
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
        const isDateMatch = isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || Boolean(selIso && rIso && rIso === selIso);
        if (!isDateMatch) return false;

        if (r.fishStock && r.fishStock !== "—") {
          if (!isStockMatch(stockInfo.stockName, r.fishStock)) return false;
        } else if (r.pond) {
          const rPond = r.pond.toLowerCase().trim();
          const matchedPond = pondsActiveOnSelDate.find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond)) ||
            (ponds || []).find(p => p && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond));
          if (!matchedPond) return false;
          const pStock = getPondFishStock(matchedPond);
          if (!isStockMatch(stockInfo.stockName, pStock) && !isStockMatch(stockInfo.stockName, matchedPond.fishStock)) return false;
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          if (pStockDate && rIso && rIso < pStockDate) return false;
        } else {
          return false;
        }
        return (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0);
      });

      const totalFedKg = fedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      // Bag logs & remain logs for this stock on selDate (excluding manual previous-day balances)
      const stockBagLogs = (bagLogs || []).filter(b => {
        if (!b || isManualPrevDayLog(b) || !b.date) return false;
        const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
        const isDateMatch = isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate)) || Boolean(selIso && bIso && bIso === selIso);
        return isDateMatch && isStockMatch(b.fishStock, stockInfo.stockName) && (Number(b.bagsOpened) || 0) > 0;
      });

      const stockRemainLogs = (remainLogs || []).filter(r => {
        if (!r || isManualPrevDayLog(r) || !r.date) return false;
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
        const isDateMatch = isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || Boolean(selIso && rIso && rIso === selIso);
        return isDateMatch && isStockMatch(r.fishStock, stockInfo.stockName);
      });

      // If a stock was NOT fed on selDate and had no bags/leftover logged on selDate, skip
      if (totalFedKg <= 0 && stockBagLogs.length === 0) {
        return;
      }

      // Collect candidate (brand, size) pairs from bagLogs, remainLogs, and fedRecords on selDate
      const pairs: { brand: string; size: string }[] = [];
      const addPair = (bRaw?: string | null, szRaw?: string | null) => {
        const sz = (szRaw && szRaw !== "—" && szRaw.trim()) ? szRaw.trim() : "—";
        if (sz === "—") return;
        const br = (bRaw && bRaw !== "—" && bRaw !== "Not specified" && bRaw.trim()) ? bRaw.trim() : "—";
        const existingIdx = pairs.findIndex(p => isSamePelletSize(p.size, sz) && (p.brand === "—" || br === "—" || p.brand.toLowerCase().trim() === br.toLowerCase().trim()));
        if (existingIdx >= 0) {
          if (pairs[existingIdx].brand === "—" && br !== "—") {
            pairs[existingIdx].brand = br;
          }
        } else {
          pairs.push({ brand: br, size: sz });
        }
      };

      stockBagLogs.forEach(b => addPair(b.brand, b.size));
      stockRemainLogs.forEach(r => addPair(r.brand, r.size));
      fedRecords.forEach(r => addPair(r.brand, r.size));

      pairs.forEach(({ brand, size }) => {
        // Check if this size is covered by an active manual previous-day balance on or before selDate
        const isCoveredByManualPrev = (manualPrevBalances || []).some(m => {
          if (!m || !isSamePelletSize(m.size, size)) return false;
          if (m.fishStock && m.fishStock !== "—" && m.fishStock !== "All Active Stocks" && !isStockMatch(m.fishStock, stockInfo.stockName)) return false;
          const mIso = m.dateIso || toValidDbDate(m.date, viewYear) || dateToIso(m.date);
          if (selIso && mIso && mIso > selIso) return false;
          const stats = getManualBalanceStats(m, selDate);
          return stats.startBalanceKg > 0 || stats.currentRemainingKg > 0 || isSameDate(m.date, selDate);
        });
        if (isCoveredByManualPrev) return;

        const sizeFedRecords = fedRecords.filter(r =>
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const rawSizeFedKg = sizeFedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);
        const explicitBrandUsedKg = brand !== "—" ? getBrandUsedKg(selDate, stockInfo.stockName, brand, size) : null;
        const sizeFedKg = explicitBrandUsedKg !== null ? explicitBrandUsedKg : rawSizeFedKg;

        // Carryover from previous feeding records strictly before selDate
        const carryoverKg = getPriorCarryover(stockInfo.stockName, size, selDate, brand);

        // Bag weight
        const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && (size !== "—" ? isSamePelletSize(f.size, size) : true)) ||
          (inventory || []).find(f => f && (size !== "—" ? isSamePelletSize(f.size, size) : true));
        const bagWeight = invItem?.weightPerBag || 15;

        // Incoming & Outgoing transfers on selDate
        const transfersInToday = (feedTransfers || []).filter(t =>
          isStockMatch(t.destinationStock, stockInfo.stockName) &&
          isSamePelletSize(t.feedSize, size) &&
          (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isSameDate(t.transferDate, selDate) || (selIso && dateToIso(t.transferDate) === selIso))
        );
        const availableTransfersIn = transfersInToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

        const transfersOutToday = (feedTransfers || []).filter(t =>
          isStockMatch(t.sourceStock, stockInfo.stockName) &&
          isSamePelletSize(t.feedSize, size) &&
          (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isSameDate(t.originalDate, selDate) || isSameDate(t.transferDate, selDate) || (selIso && (dateToIso(t.originalDate) === selIso || dateToIso(t.transferDate) === selIso)))
        );
        const totalTransferredOut = transfersOutToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

        // Effective feed available BEFORE opening any new bags on selDate
        const effectiveAvailable = Math.max(0, carryoverKg + availableTransfersIn - totalTransferredOut);

        const netNeeded = Math.max(0, sizeFedKg - effectiveAvailable);
        const expectedBags = netNeeded > 0 ? Math.ceil(netNeeded / bagWeight) : 0;

        // Recorded bags opened on selDate
        const bagLogsForSize = stockBagLogs.filter(b =>
          (size === "—" || !b.size || b.size === "—" || isSamePelletSize(b.size, size)) &&
          (brand === "—" || !b.brand || b.brand === "—" || b.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const hasBagLog = bagLogsForSize.length > 0;
        const recordedBags = bagLogsForSize.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);

        // Recorded leftover on selDate
        const remainLogsForSize = stockRemainLogs.filter(r =>
          (size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const hasRemainLog = remainLogsForSize.length > 0;
        const recordedRemaining = hasRemainLog
          ? (Number(remainLogsForSize[remainLogsForSize.length - 1].remainingKg) || 0)
          : null;

        // Expected remaining feed calculation
        const effectiveBagsForExpected = hasBagLog ? recordedBags : expectedBags;
        const totalAvailable = effectiveAvailable + (effectiveBagsForExpected * bagWeight);
        const expectedRemaining = Math.max(0, Math.round((totalAvailable - sizeFedKg) * 10) / 10);

        // Determine discrepancies on selDate
        if (!hasBagLog && !hasRemainLog) {
          if (sizeFedKg > 0 && (expectedBags > 0 || !brand || brand === "—" || brand === "Not specified")) {
            rows.push({
              stockKey: `${key}__${brand}__${size}`,
              stockName: stockInfo.stockName,
              stockDate: stockInfo.stockDate,
              brand: (!brand || brand === "Not specified") ? "—" : brand,
              size: size !== "—" ? size : "",
              status: "Not Opened",
              expectedBags,
              recordedBags: 0,
              expectedRemaining,
              recordedRemaining: null,
              totalFed: sizeFedKg,
              carryover: carryoverKg,
              reason: `Fed ${sizeFedKg} kg on ${toDateLabel(selDate)} (${carryoverKg > 0 ? `${carryoverKg} kg carryover` : "no prior carryover"})${expectedBags > 0 ? `, requiring ${expectedBags} bag${expectedBags !== 1 ? "s" : ""} to be opened` : ""}, but no Bags Opened & Leftover log was recorded.`
            });
          }
          return;
        }

        const isBagCountMismatch = sizeFedKg > 0 && recordedBags !== expectedBags;
        const isRemainValueMismatch = recordedRemaining !== null && Math.abs(recordedRemaining - expectedRemaining) > 0.05;
        const isRemainingMismatch = isRemainValueMismatch;

        let status: "Not Opened" | "Bag Mismatch" | "Remaining Mismatch" | "Multiple Mismatches" | null = null;
        let reason = "";

        if (isBagCountMismatch && isRemainingMismatch) {
          status = "Multiple Mismatches";
          reason = `Recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""} (expected ${expectedBags}) and leftover recorded as ${recordedRemaining} kg (expected ${expectedRemaining} kg) on ${toDateLabel(selDate)}.`;
        } else if (isBagCountMismatch) {
          status = "Bag Mismatch";
          if (recordedBags < expectedBags) {
            reason = `Insufficient bags opened on ${toDateLabel(selDate)}: recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""}, but ${expectedBags} bag${expectedBags !== 1 ? "s" : ""} required for ${sizeFedKg} kg fed.`;
          } else {
            reason = `Over-recorded bags on ${toDateLabel(selDate)}: recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""}, but only ${expectedBags} bag${expectedBags !== 1 ? "s" : ""} expected for ${sizeFedKg} kg fed.`;
          }
        } else if (isRemainingMismatch) {
          status = "Remaining Mismatch";
          reason = `Recorded leftover on ${toDateLabel(selDate)} is ${recordedRemaining} kg, but calculated expected leftover is ${expectedRemaining} kg.`;
        }

        if (status) {
          rows.push({
            stockKey: `${key}__${brand}__${size}`,
            stockName: stockInfo.stockName,
            stockDate: stockInfo.stockDate,
            brand,
            size: size !== "—" ? size : "",
            status,
            expectedBags,
            recordedBags,
            expectedRemaining,
            recordedRemaining,
            totalFed: sizeFedKg,
            carryover: carryoverKg,
            reason
          });
        }
      });
    });

    return rows;
  }, [pondsActiveOnSelDate, ponds, bagLogs, feedingRecords, remainLogs, inventory, feedTransfers, manualPrevBalances, getManualBalanceStats, getMatchingBrandsForPallet, selDate, viewYear, dateToIso, getPriorCarryover, isPondName, isManualPrevDayLog]);

  const handleMismatchClick = (row: MismatchStockRow) => {
    const targetDate = getIsoDateForSelDate(selDate);
    setBagsDate(targetDate);
    setBagsErr({});

    // 1. Identify fish stock
    const dateOptions = getFishStockOptionsForDate(targetDate);
    const matchedOpt = dateOptions.find(opt =>
      opt.name === row.stockName ||
      isStockMatch(opt.name, row.stockName) ||
      normalizeFishStock(opt.name) === normalizeFishStock(row.stockName) ||
      opt.ponds.some(p => p === row.stockName || isStockMatch(p, row.stockName))
    );
    const resolvedFs = matchedOpt?.name || (isPondName(row.stockName) ? pondToStock(row.stockName) : row.stockName) || (dateOptions[0]?.name || "");
    const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;

    // 2. Identify associated pallets and select appropriate pallet
    const associatedPallets = getAssociatedPalletsForStock(fs, targetDate);
    let selectedPallet = "";
    if (row.size && row.size !== "—") {
      selectedPallet = row.size;
    } else if (associatedPallets.length > 0) {
      selectedPallet = associatedPallets[0];
    } else if (availablePelletSizes.length > 0) {
      selectedPallet = availablePelletSizes[0];
    }

    // 3. Do not auto-assign a feed brand unless the mismatch row already has a specific brand logged
    const matchingBrands = getMatchingBrandsForPallet(selectedPallet);
    const selectedBrand = (row.brand && row.brand !== "—" && row.brand !== "Not specified" && (matchingBrands.length === 0 || matchingBrands.includes(row.brand)))
      ? row.brand
      : "";

    const inv = selectedBrand ? (inventory || []).find(f => f && f.brand === selectedBrand && isSamePelletSize(f.size, selectedPallet)) : undefined;
    const kgPb = inv?.weightPerBag || 15;

    // Check existing rows for date filtered to this already-selected fish stock
    setBagsModalLockedStock(fs);
    const existingRows = getBagRowsForDate(targetDate).filter(r =>
      isStockMatch(r.fishStock, fs) ||
      normalizeFishStock(r.fishStock, targetDate).toLowerCase().trim() === normalizeFishStock(fs, targetDate).toLowerCase().trim()
    );
    const existingIdx = existingRows.findIndex(r =>
      isStockMatch(r.fishStock, fs) &&
      isSamePelletSize(r.size, selectedPallet) &&
      (!selectedBrand || !r.brand || r.brand.toLowerCase().trim() === selectedBrand.toLowerCase().trim())
    );

    if (existingIdx >= 0) {
      const updated = [...existingRows];
      const target = { ...updated[existingIdx] };
      if (!target.brand && selectedBrand) target.brand = selectedBrand;
      if (!target.size && selectedPallet) target.size = selectedPallet;
      if (row.status === "Remaining Mismatch") {
        if (!target.qty && row.recordedBags > 0) target.qty = String(row.recordedBags);
      }
      updated[existingIdx] = target;
      const withoutTarget = updated.filter((_, i) => i !== existingIdx);
      setBagRows([target, ...withoutTarget]);
    } else {
      // Create new prefilled row for the missing record under this already-selected fish stock
      const newRow: BagRow = {
        fishStock: fs,
        brand: selectedBrand,
        size: selectedPallet,
        kgPerBag: kgPb,
        qty: row.recordedBags > 0 ? String(row.recordedBags) : "",
        usedKg: "",
        remainingKg: (row.recordedRemaining !== null && row.recordedRemaining > 0) ? String(row.recordedRemaining) : ""
      };
      setBagRows([newRow, ...existingRows]);
    }

    setShowBagsModal(true);
  };

  /* ── mismatch notifications ── */
  const onReconMismatchesRef = useRef(onReconMismatches);
  onReconMismatchesRef.current = onReconMismatches;
  const prevMismatchKeyRef = useRef<string>("");
  useEffect(() => {
    if (!onReconMismatchesRef.current) return;
    const ms = mismatchRows.map(r => ({
      date: selDate,
      brand: r.brand || "—",
      size: r.size || "—",
      fishStock: r.stockName,
      key: r.stockKey,
      status: r.status,
      reason: r.reason
    }));
    const key = ms.map(m => `${m.date}|${m.key}|${m.status}`).join(",");
    if (key === prevMismatchKeyRef.current) return;
    prevMismatchKeyRef.current = key;
    onReconMismatchesRef.current(ms);
  }, [mismatchRows, selDate]);

  /* ── day view (Date-Aware Fish Stock Visibility: Stock introduction date <= Selected date < Stock clearance date) ── */
  const dayRecords = useMemo(() => {
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    return (feedingRecords || []).filter(r => {
      if (!r || !r.date) return false;
      if (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate))) return true;
      const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
      return Boolean(selIso && rIso && rIso === selIso);
    });
  }, [feedingRecords, selDate, viewYear, dateToIso]);
  const dayGrand = dayRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

  const activePondsForSelectedStock = useMemo(() => {
    if (dailyStockFilter === "All") return pondsActiveOnSelDate;
    return pondsActiveOnSelDate.filter(p =>
      isStockMatch(dailyStockFilter, getPondFishStock(p)) ||
      isStockMatch(dailyStockFilter, p.fishStock) ||
      isStockMatch(dailyStockFilter, pondToStock(p.name)) ||
      isStockMatch(dailyStockFilter, p.name)
    );
  }, [pondsActiveOnSelDate, dailyStockFilter]);

  const dayRows = useMemo(() => {
    const list: { pond: Pond; rec: FeedingRecord | null }[] = [];
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    const matchedRecIds = new Set<string>();

    activePondsForSelectedStock.forEach(pond => {
      const pNameCompact = (pond.name || "").replace(/\s+/g, "").toLowerCase();
      const isHistoricalClosed = Boolean((pond as any)._isHistoricalClosedStock);
      const pondIntroIso = (pond as any)._closedIntroIso || toValidDbDate(pond.stockingDate, viewYear) || dateToIso(pond.stockingDate);
      const pondClearIso = (pond as any)._closedClearIso || null;

      const closedEvents = (stockEvents || []).filter(e =>
        (e.pondId === pond.id || (e.pondName && e.pondName.replace(/\s+/g, "").toLowerCase() === pNameCompact)) && e.type === "Closed"
      );

      const recs = dayRecords.filter(r => {
        const matchesPond = (r.pondId && r.pondId === pond.id) || (r.pond && r.pond.replace(/\s+/g, "").toLowerCase() === pNameCompact);
        if (!matchesPond) return false;

        const rDate = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date) || selIso;

        // If viewing a historical closed stock cycle that was active on selDate, include records belonging to that pond on selDate
        if (isHistoricalClosed) {
          if (pondClearIso && rDate && rDate >= pondClearIso) return false;
          if (r.fishStock && r.fishStock !== "—" && pond.fishStock && pond.fishStock !== "—" && !isPondName(r.fishStock) && !isPondName(pond.fishStock)) {
            if (!isStockMatch(r.fishStock, pond.fishStock) && !isStockMatch(r.fishStock, getPondFishStock(pond))) {
              // Only reject if another pond entry on selDate matches r.fishStock
              const otherMatches = activePondsForSelectedStock.some(op => op.id !== pond.id && isStockMatch(r.fishStock, op.fishStock));
              if (otherMatches) return false;
            }
          }
          return true;
        }

        const rStock = (r.fishStock || "").trim();
        // Check if this record explicitly matches an older closed cycle that was ALREADY cleared on or before rDate
        const matchesAlreadyClearedCycle = Boolean(rStock && rStock !== "—") && closedEvents.some(ce => {
          const ceBatch = ce.batch || (ce.date ? fmtStockingDate(ce.date) : null);
          const ceClear = toValidDbDate(ce.clearedDate || ce.date, viewYear) || dateToIso(ce.clearedDate || ce.date);
          if (!ceClear || (rDate && rDate < ceClear)) return false;
          return Boolean(ceBatch && (isStockMatch(rStock, ceBatch) || isSameDate(rStock, ce.date)) && !isStockMatch(rStock, pond.fishStock));
        });
        if (matchesAlreadyClearedCycle) return false;

        // Exclude records strictly before the current stock's introduction date
        if (pondIntroIso && rDate && rDate < pondIntroIso) return false;

        return true;
      });

      if (recs.length > 0) {
        recs.forEach(rec => {
          if (rec.id) matchedRecIds.add(rec.id);
          list.push({ pond, rec });
        });
      } else {
        list.push({ pond, rec: null });
      }
    });

    // Guarantee complete historical restoration: any feeding record recorded on selDate that was not yet attached to a pond row is restored with its historical pond & stock
    dayRecords.forEach(rec => {
      if (!rec) return;
      if (rec.id && matchedRecIds.has(rec.id)) return;
      const alreadyIncluded = list.some(item => item.rec === rec || (rec.id && item.rec?.id === rec.id));
      if (alreadyIncluded) return;

      if (dailyStockFilter !== "All") {
        const matchesFilter =
          isStockMatch(dailyStockFilter, rec.fishStock) ||
          isStockMatch(dailyStockFilter, pondToStock(rec.pond)) ||
          isStockMatch(dailyStockFilter, rec.pond);
        if (!matchesFilter) return;
      }

      const rPondCompact = (rec.pond || "").replace(/\s+/g, "").toLowerCase();
      const basePond = (ponds || []).find(p => p && ((rec.pondId && p.id === rec.pondId) || (p.name && p.name.replace(/\s+/g, "").toLowerCase() === rPondCompact)));
      const recStockDate = rec.fishStock && formatFishStockDate(rec.fishStock) !== "—"
        ? formatFishStockDate(rec.fishStock)
        : (basePond?.stockingDate && basePond.stockingDate !== "—" ? basePond.stockingDate : rec.date);
      const histPond: Pond = basePond
        ? {
          ...basePond,
          stockingDate: recStockDate || basePond.stockingDate,
          fishStock: (rec.fishStock && rec.fishStock !== "—") ? rec.fishStock : basePond.fishStock,
          fishStockId: rec.fishStockId || basePond.fishStockId,
        }
        : {
          id: rec.pondId || `hist-${rec.pond || rec.id}`,
          name: rec.pond || "Historical Pond",
          type: "Earthen",
          species: "Catfish",
          sizeM2: "0",
          initialStock: 0,
          currentCount: 0,
          stockingDate: recStockDate || "—",
          stockMonth: rec.month || "",
          totalCost: 0,
          status: "Active",
          notes: "",
          farmId: activeFarmId,
          fishStock: (rec.fishStock && rec.fishStock !== "—") ? rec.fishStock : formatFishStockDate(recStockDate),
          fishStockId: rec.fishStockId,
        };

      // If basePond was added with rec: null above, replace the null placeholder with this actual historical record
      const nullIdx = list.findIndex(item => item.rec === null && (item.pond.id === histPond.id || item.pond.name.replace(/\s+/g, "").toLowerCase() === rPondCompact));
      if (nullIdx >= 0) {
        list[nullIdx] = { pond: histPond, rec };
      } else {
        list.push({ pond: histPond, rec });
      }
      if (rec.id) matchedRecIds.add(rec.id);
    });

    return list;
  }, [activePondsForSelectedStock, dayRecords, stockEvents, ponds, dailyStockFilter, activeFarmId, selDate, viewYear, dateToIso, isPondName]);

  const totalPonds = Math.max(activePondsForSelectedStock.length, [...new Set(dayRows.map(r => r.pond.id || r.pond.name))].length);
  const pondsFedToday = useMemo(() => {
    return [...new Set(dayRows.filter(r => r.rec !== null).map(r => r.pond.id || r.pond.name))].length;
  }, [dayRows]);
  const pondsRemaining = Math.max(0, totalPonds - pondsFedToday);
  const bagsOpenedToday = useMemo(() => {
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    const fromBags = (bagLogs || [])
      .filter(b => {
        if (!b || !b.date) return false;
        const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
        const isDateMatch = isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate)) || Boolean(selIso && bIso && bIso === selIso);
        if (!isDateMatch) return false;
        return dailyStockFilter === "All" || isStockMatch(dailyStockFilter, b.fishStock) || isManualPrevDayLog(b);
      })
      .reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
    const unbackedManual = (manualPrevBalances || [])
      .filter(m => {
        if (!m || !m.date) return false;
        const mIso = m.dateIso || toValidDbDate(m.date, viewYear) || dateToIso(m.date);
        const isDateMatch = isSameDate(m.date, selDate) || isSameDate(m.date, toDateLabel(selDate)) || Boolean(selIso && mIso && mIso === selIso);
        if (!isDateMatch) return false;
        return !(bagLogs || []).some(b => b && (b.id === m.id || (isManualPrevDayLog(b) && (isSameDate(b.date, m.date) || (mIso && dateToIso(b.date) === mIso)) && isSamePelletSize(b.size, m.size) && (b.brand || "").toLowerCase().trim() === m.brand.toLowerCase().trim() && (!m.fishStock || !b.fishStock || isStockMatch(b.fishStock, m.fishStock)))));
      })
      .reduce((s, m) => s + (Number(m.bagsOpened) || 0), 0);
    return Math.round((fromBags + unbackedManual) * 100) / 100;
  }, [bagLogs, manualPrevBalances, selDate, viewYear, dateToIso, dailyStockFilter, isManualPrevDayLog]);

  const filteredDayRows = useMemo(() => {
    let list = dayRows;
    if (feedStatusFilter === "fed") {
      list = list.filter(({ rec }) => !!rec);
    } else if (feedStatusFilter === "not_fed") {
      list = list.filter(({ rec }) => !rec);
    }
    return list;
  }, [dayRows, feedStatusFilter]);

  const openEditRec = (rec: FeedingRecord) => {
    const initialDate = getIsoDateForSelDate(rec.date || selDate);
    setBulkDate(initialDate);
    setBulkBy(rec.recordedBy || currentUser?.name || "");
    setBulkRows(getRowsForDate(initialDate));
    setFeedErr({});
    setShowLog(true);
    if (rec.id) {
      setTimeout(() => {
        const els = document.querySelectorAll(`[data-bulk-row-id="${rec.id}"]`);
        els.forEach(el => {
          if ((el as HTMLElement).offsetParent !== null) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        });
      }, 100);
    }
  };

  const handleSaveEditAll = () => {
    if (!editRec) return;
    const newM = Number(editRec.morning) || 0;
    const newE = Number(editRec.evening) || 0;
    const toFeed = newM + newE;

    // Prevent duplicate feed sizes for the same fish stock / pond on the same date
    if (editRec.size && editRec.date) {
      const isDup = (feedingRecords || []).some(r =>
        r.id !== editRec.id &&
        isSameDate(r.date, editRec.date) &&
        ((r.pond && editRec.pond && r.pond.trim().toLowerCase() === editRec.pond.trim().toLowerCase()) ||
          (r.fishStock && editRec.fishStock && isStockMatch(r.fishStock, editRec.fishStock))) &&
        isSamePelletSize(r.size, editRec.size)
      );
      if (isDup) {
        toast.error(`Feed size "${editRec.size}" has already been logged for ${editRec.fishStock || editRec.pond} on ${editRec.date}. Duplicate feed sizes are not permitted.`);
        return;
      }
    }

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
    onEditFeedRecord({ ...editRec, morning: newM, evening: newE, total: newM + newE, editHistory: hasChange ? [...(editRec.editHistory || []), entry] : (editRec.editHistory || []), _skipInventoryCheck: true } as any);
    setEditRec(null);
  };

  /* ── edit bag state ── */
  const [editDocBag, setEditDocBag] = useState<BagOpenLog | null>(null);
  const [editBagRemainKg, setEditBagRemainKg] = useState("");
  const editModalFishStockOptions = useMemo(() => getFishStockOptionsForDate(editDocBag?.date || selDate), [getFishStockOptionsForDate, editDocBag?.date, selDate]);

  const openEditDocBag = (b: BagOpenLog) => {
    setEditDocBag({ ...b });
    const fs = normalizeFishStock(b.fishStock) || "";
    const existing = (remainLogs || []).find(r => isSameDate(r.date, b.date) && r.brand === b.brand && r.size === b.size && normalizeFishStock(r.fishStock) === fs);
    setEditBagRemainKg(existing ? String(existing.remainingKg) : "");
  };

  const openEditMergedRow = (row: MergedBagRow) => {
    const dateOptions = getFishStockOptionsForDate(selDate);
    const matchedOpt = dateOptions.find(opt =>
      opt.name === row.fishStock ||
      isStockMatch(opt.name, row.fishStock) ||
      normalizeFishStock(opt.name) === normalizeFishStock(row.fishStock) ||
      opt.ponds.some(p => p === row.fishStock || isStockMatch(p, row.fishStock))
    );
    const resolvedFs = matchedOpt?.name || (isPondName(row.fishStock) ? pondToStock(row.fishStock) : row.fishStock) || (dateOptions[0]?.name || "");
    const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;

    const associated = getAssociatedPalletsForStock(fs, selDate);
    const size = row.size && row.size !== "—" ? row.size : (associated[0] || (availablePelletSizes[0] || ""));
    const matchingBrands = getMatchingBrandsForPallet(size);
    const brand = row.brand && row.brand !== "—" ? row.brand : (matchingBrands[0] || (invBrands[0] || ""));

    const inv = (inventory || []).find(f => f && f.brand === brand && isSamePelletSize(f.size, size));
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
      fishStock: fs
    };

    setEditDocBag({ ...bLog, fishStock: fs, brand, size, kgPerBag: kgPb });
    const existing = (remainLogs || []).find(r =>
      (isSameDate(r.date, selDate) || isSameDate(r.date, bLog.date)) &&
      (!r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
      (!r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
      (isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock) === normalizeFishStock(fs))
    );
    setEditBagRemainKg(existing ? String(existing.remainingKg) : (row.hasRemainLog && row.feedRemainingToday !== null && row.feedRemainingToday !== undefined ? String(row.feedRemainingToday) : ""));
  };

  const [isSavingEditDocBag, setIsSavingEditDocBag] = useState(false);

  const handleSaveEditDocBag = async () => {
    if (!editDocBag || isSavingEditDocBag) return;
    const rawFs = editDocBag.fishStock || "";
    const normFs = normalizeFishStock(rawFs);
    const fs = normFs !== "—" && normFs ? normFs : rawFs;
    const brand = (editDocBag.brand || "").trim();
    const size = (editDocBag.size || "").trim();
    const rawDate = editDocBag.date || selDate;
    const dateLabel = toDateLabel(rawDate);
    const dateIso = toValidDbDate(rawDate, viewYear) || dateToIso(rawDate) || TODAY;
    const dateParts = dateLabel.split(" ");
    const monStr = dateParts[0] || editDocBag.month || curMonLabel;
    const yrNum = Number(dateParts[2]) || editDocBag.year || viewYear;
    const bagsVal = Number(editDocBag.bagsOpened);
    const remKg = Number(editBagRemainKg);

    if (!brand) {
      toast.error("Please select a Feed Brand.");
      return;
    }
    if (!size) {
      toast.error("Please select a Pallet (Feed Size).");
      return;
    }
    if (isNaN(bagsVal) || bagsVal < 0) {
      toast.error("Enter a valid number of bags opened.");
      return;
    }
    if (editBagRemainKg !== "" && (isNaN(remKg) || remKg < 0)) {
      toast.error("Enter a valid non-negative leftover quantity (kg).");
      return;
    }

    const existingBag = (bagLogs || []).find(b => b.id === editDocBag.id) || (bagLogs || []).find(b =>
      isSameDate(b.date, dateLabel) &&
      (size === "—" || isSamePelletSize(b.size, size)) &&
      (brand === "—" || !b.brand || !brand || b.brand.toLowerCase().trim() === brand.toLowerCase()) &&
      (isStockMatch(b.fishStock, editDocBag.fishStock) || normalizeFishStock(b.fishStock) === fs)
    );
    const isManualEntry = Boolean(
      editDocBag.isManualPrevDayBalance ||
      isManualPrevDayLog(editDocBag) ||
      (existingBag && isManualPrevDayLog(existingBag))
    );

    const effectiveRemKg = editBagRemainKg !== "" && !isNaN(remKg) && remKg >= 0 ? Math.round(remKg * 100) / 100 : 0;

    setIsSavingEditDocBag(true);
    try {
      const updatedBagPayload: BagOpenLog = {
        ...(existingBag || editDocBag),
        id: existingBag?.id || editDocBag.id || uid(),
        date: dateLabel,
        month: monStr,
        year: yrNum,
        brand,
        size,
        fishStock: fs || existingBag?.fishStock || editDocBag.fishStock,
        bagsOpened: bagsVal,
        kgPerBag: editDocBag.kgPerBag || 15,
        totalKg: Math.round(bagsVal * (editDocBag.kgPerBag || 15) * 100) / 100,
        ...(isManualEntry ? {
          isManualPrevDayBalance: true,
          reason: "MANUAL_PREV_DAY_BALANCE",
          initialRemainingKg: effectiveRemKg
        } : {})
      };

      if (existingBag && onEditBagLog) {
        await onEditBagLog(updatedBagPayload);
      } else if (bagsVal >= 0 && onAddBagLog) {
        await onAddBagLog(updatedBagPayload);
      }

      if (fs || isManualEntry) {
        const existingRemain = (remainLogs || []).find(r => r.id === updatedBagPayload.id) || (remainLogs || []).find(r =>
          isSameDate(r.date, dateLabel) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase()) &&
          (isStockMatch(r.fishStock, editDocBag.fishStock) || normalizeFishStock(r.fishStock) === fs)
        );

        if (editBagRemainKg !== "" && !isNaN(remKg) && remKg >= 0) {
          const remainPayload: FeedRemainingLog = {
            ...(existingRemain || {}),
            id: existingRemain?.id || updatedBagPayload.id || uid(),
            brand,
            size,
            fishStock: fs || "All Active Stocks",
            remainingKg: effectiveRemKg,
            date: dateLabel,
            month: monStr,
            year: yrNum,
            ...(isManualEntry ? {
              isManualPrevDayBalance: true,
              initialRemainingKg: effectiveRemKg
            } : {})
          };
          if (existingRemain && onEditRemainLog) {
            await onEditRemainLog(remainPayload);
          } else if (onAddRemainLog) {
            await onAddRemainLog(remainPayload);
          }
        } else if (editBagRemainKg === "" && existingRemain && onEditRemainLog) {
          await onEditRemainLog({
            ...existingRemain,
            brand,
            size,
            fishStock: fs || "All Active Stocks",
            remainingKg: 0,
            date: dateLabel,
            month: monStr,
            year: yrNum,
            ...(isManualEntry ? {
              isManualPrevDayBalance: true,
              initialRemainingKg: 0
            } : {})
          });
        }
      }

      // Keep manualPrevBalances state & localStorage synchronized when editing a manual balance
      if (isManualEntry) {
        const manualIdx = manualPrevBalances.findIndex(m =>
          m && (
            m.id === updatedBagPayload.id ||
            (isSameDate(m.date, existingBag?.date || editDocBag.date) &&
              m.brand.toLowerCase().trim() === (existingBag?.brand || editDocBag.brand || "").toLowerCase().trim() &&
              isSamePelletSize(m.size, existingBag?.size || editDocBag.size) &&
              (!m.fishStock || !editDocBag.fishStock || isStockMatch(m.fishStock, editDocBag.fishStock)))
          )
        );
        const updatedManual: ManualPrevBalanceRecord = {
          ...(manualIdx >= 0 ? manualPrevBalances[manualIdx] : {
            id: updatedBagPayload.id,
            baselineFedKg: 0,
            createdAt: new Date().toISOString()
          }),
          id: manualIdx >= 0 ? manualPrevBalances[manualIdx].id : updatedBagPayload.id,
          farmId: activeFarmId,
          date: dateLabel,
          dateIso,
          brand,
          size,
          bagsOpened: Math.round(bagsVal * 100) / 100,
          kgPerBag: editDocBag.kgPerBag || 15,
          initialRemainingKg: effectiveRemKg,
          currentRemainingKg: effectiveRemKg,
          fishStock: fs || "All Active Stocks"
        };
        const nextManualList = manualIdx >= 0
          ? manualPrevBalances.map((m, idx) => idx === manualIdx ? updatedManual : m)
          : [updatedManual, ...manualPrevBalances];
        saveManualPrevBalances(nextManualList);
      }

      setEditDocBag(null);
      toast.success("Updated successfully");
    } catch (err: any) {
      console.error("Failed to save bag log edit:", err);
      toast.error(err?.message || "Failed to update record in database. Please try again.");
    } finally {
      setIsSavingEditDocBag(false);
    }
  };

  /* ── merged bags rows for display (strictly date-dependent for selDate: bags opened, leftover, active stocks & carryover on selDate) ── */
  const mergedBagRows = useMemo((): MergedBagRow[] => {
    const selIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    const dayBagLogs = (bagLogs || []).filter(b => {
      if (!b || !b.date) return false;
      const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
      return isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate)) || Boolean(selIso && bIso && bIso === selIso);
    });
    const dayRemainLogs = (remainLogs || []).filter(r => {
      if (!r || !r.date) return false;
      const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
      return isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate)) || Boolean(selIso && rIso && rIso === selIso);
    });
    const dayFeedRecords = dayRecords;

    const map = new Map<string, MergedBagRow>();

    // 1. Map all stocks active on selDate (date-aware: includes historical stocks active on selDate)
    const activePondsList = pondsActiveOnSelDate;
    const activeStocksMap = new Map<string, {
      stockName: string;
      stockDate: string;
      species: string;
      pondNames: string[];
      defaultPellet?: string;
    }>();

    activePondsList.forEach(p => {
      const stockName = getPondFishStock(p);
      if (!stockName || stockName === "—" || stockName === "General Stock") return;
      const key = normalizeFishStock(stockName).toLowerCase().trim();
      const stockDate = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "—";
      const existing = activeStocksMap.get(key);
      if (existing) {
        if (!existing.pondNames.includes(p.name)) existing.pondNames.push(p.name);
        if (!existing.defaultPellet && p.defaultPellet) existing.defaultPellet = p.defaultPellet;
      } else {
        activeStocksMap.set(key, {
          stockName,
          stockDate,
          species: p.species || "—",
          pondNames: [p.name],
          defaultPellet: p.defaultPellet
        });
      }
    });

    const populatedStockKeys = new Set<string>();
    const canonSizeKey = (sz?: string | null) => {
      const clean = (sz || "").trim();
      const num = parseFloat(clean);
      return !isNaN(num) ? `${num}mm` : clean.toLowerCase();
    };
    const findRowKey = (brand: string, size: string, fs: string): string => {
      const bNorm = (brand || "—").trim().toLowerCase();
      const szNorm = canonSizeKey(size);
      const fsNorm = (fs || "—").trim().toLowerCase();
      const directKey = `${bNorm}||${szNorm}||${fsNorm}`;
      if (map.has(directKey)) return directKey;
      for (const [existingKey, existingRow] of map.entries()) {
        const sameStock = isStockMatch(existingRow.fishStock, fs) ||
          normalizeFishStock(existingRow.fishStock, selDate).toLowerCase().trim() === normalizeFishStock(fs, selDate).toLowerCase().trim();
        const sameSize = (size === "—" && existingRow.size === "—") || isSamePelletSize(existingRow.size, size);
        const sameBrand = bNorm === "—" || existingRow.brand.trim().toLowerCase() === "—" || existingRow.brand.trim().toLowerCase() === bNorm;
        if (sameStock && sameSize && sameBrand) {
          return existingKey;
        }
      }
      return directKey;
    };
    const sumUniqueDayRemains = (fs: string, size: string, brand: string) => {
      const seen = new Set<string>();
      const matches = dayRemainLogs.filter(r => {
        if (!r) return false;
        if (r.id && seen.has(r.id)) return false;
        const stockMatch = isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock, selDate) === normalizeFishStock(fs, selDate);
        const sizeMatch = size === "—" || isSamePelletSize(r.size, size);
        const brandMatch = brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim();
        if (stockMatch && sizeMatch && brandMatch) {
          if (r.id) seen.add(r.id);
          return true;
        }
        return false;
      });
      if (matches.length === 0) return { hasRemain: false, totalRem: 0 };
      const totalRem = Math.round(matches.reduce((s, r) => s + (Number(r.remainingKg) || 0), 0) * 100) / 100;
      return { hasRemain: true, totalRem };
    };

    // 2. Process ALL dayBagLogs (both normal & manual entries merge and accumulate into the same stock group)
    dayBagLogs.forEach(b => {
      const isManualBag = isManualPrevDayLog(b);
      const fs = normalizeFishStock(b.fishStock, selDate) || "—";
      const bags = Number(b.bagsOpened) || 0;
      const brand = b.brand || "—";
      const size = b.size || "—";
      const k = findRowKey(brand, size, fs);
      const existing = map.get(k);
      const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && (size !== "—" ? isSamePelletSize(f.size, size) : true));
      const kgPb = Number(b.kgPerBag) || invItem?.weightPerBag || 15;
      const totalKg = Number(b.totalKg) || (bags * kgPb);

      const matchingPond = pondsActiveOnSelDate.find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs))) ||
        (ponds || []).find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs)));
      const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
        ? formatFishStockDate(matchingPond.stockingDate)
        : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));

      const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
      const remAgg = sumUniqueDayRemains(fs, size, brand);
      const feedRemainingToday: number | null = remAgg.hasRemain ? remAgg.totalRem : null;

      if (existing) {
        existing.bagsOpened = Math.round((existing.bagsOpened + bags) * 100) / 100;
        existing.totalKgOpened = Math.round((existing.totalKgOpened + totalKg) * 100) / 100;
        if (!isManualBag || !existing.lastBagLog) existing.lastBagLog = b;
        existing.hasBagLog = true;
        existing.carryoverKg = carryoverKg;
        existing.feedRemainingToday = feedRemainingToday;
        existing.remainingKg = feedRemainingToday ?? 0;
        existing.hasRemainLog = remAgg.hasRemain;
        if (isManualBag) existing.isManualPrevDayBalance = true;
      } else {
        map.set(k, {
          brand,
          size,
          fishStock: fs,
          stockDate: stockDate !== fs ? stockDate : "—",
          bagsOpened: bags,
          totalKgOpened: totalKg,
          remainingKg: feedRemainingToday ?? 0,
          carryoverKg,
          feedRemainingToday,
          hasBagLog: true,
          hasRemainLog: remAgg.hasRemain,
          lastBagLog: b,
          isManualPrevDayBalance: isManualBag
        });
      }
      populatedStockKeys.add(fs.toLowerCase().trim());
      populatedStockKeys.add(normalizeFishStock(fs, selDate).toLowerCase().trim());
    });

    // 3. Process ALL dayRemainLogs without bagLog on selDate (both normal & manual)
    dayRemainLogs.forEach(r => {
      const isManualRem = isManualPrevDayLog(r);
      const fs = normalizeFishStock(r.fishStock, selDate) || "—";
      const remVal = Number(r.remainingKg) || 0;
      if (!isManualRem && !isStockActiveOnSelDate(r.fishStock) && !isStockActiveOnSelDate(fs) && remVal <= 0) return;
      const brand = r.brand || "—";
      const size = r.size || "—";
      const k = findRowKey(brand, size, fs);
      const existing = map.get(k);
      const remAgg = sumUniqueDayRemains(fs, size, brand);

      if (existing) {
        existing.remainingKg = remAgg.hasRemain ? remAgg.totalRem : remVal;
        existing.feedRemainingToday = remAgg.hasRemain ? remAgg.totalRem : remVal;
        existing.hasRemainLog = true;
        if (isManualRem) existing.isManualPrevDayBalance = true;
      } else {
        const matchingPond = pondsActiveOnSelDate.find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs))) ||
          (ponds || []).find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs)));
        const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
          ? formatFishStockDate(matchingPond.stockingDate)
          : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));
        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);

        map.set(k, {
          brand,
          size,
          fishStock: fs,
          stockDate: stockDate !== fs ? stockDate : "—",
          bagsOpened: 0,
          totalKgOpened: 0,
          remainingKg: remAgg.hasRemain ? remAgg.totalRem : remVal,
          carryoverKg,
          feedRemainingToday: remAgg.hasRemain ? remAgg.totalRem : remVal,
          hasBagLog: false,
          hasRemainLog: true,
          lastBagLog: null,
          isManualPrevDayBalance: isManualRem
        });
      }
      populatedStockKeys.add(fs.toLowerCase().trim());
      populatedStockKeys.add(normalizeFishStock(fs, selDate).toLowerCase().trim());
    });

    // 4. Carry over unconsumed feed from prior days for stocks active on selDate
    activeStocksMap.forEach((stockInfo, key) => {
      const fs = stockInfo.stockName;
      const fedForStock = dayFeedRecords.filter(r =>
        isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond, selDate), fs) || isStockMatch(r.pond, fs)
      );

      const candidatePairs: { brand: string; size: string }[] = [];
      const addCandidate = (bRaw?: string | null, szRaw?: string | null) => {
        if (!szRaw || szRaw === "—" || !szRaw.trim()) return;
        const sz = szRaw.trim();
        const b = (bRaw && bRaw !== "—" && bRaw.trim()) ? bRaw.trim() : (getMatchingBrandsForPallet(sz)[0] || "—");
        if (!candidatePairs.some(cp => cp.brand.toLowerCase().trim() === b.toLowerCase().trim() && isSamePelletSize(cp.size, sz))) {
          candidatePairs.push({ brand: b, size: sz });
        }
      };

      (remainLogs || []).filter(r => !isManualPrevDayLog(r) && isStockMatch(r.fishStock, fs)).forEach(r => addCandidate(r.brand, r.size));
      (bagLogs || []).filter(b => !isManualPrevDayLog(b) && isStockMatch(b.fishStock, fs)).forEach(b => addCandidate(b.brand, b.size));
      (feedTransfers || []).filter(t => isStockMatch(t.destinationStock, fs)).forEach(t => addCandidate(t.feedBrand, t.feedSize));

      candidatePairs.forEach(({ brand, size }) => {
        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
        const fedForSize = fedForStock.filter(r =>
          isSamePelletSize(r.size, size) &&
          (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

        // Only include if there was genuine unconsumed carryover from prior days (feeding alone without carryover or bag log goes to Mismatch)
        if (carryoverKg <= 0) return;

        const feedRemainingToday = Math.max(0, Math.round((carryoverKg - totalFed) * 10) / 10);

        const k = findRowKey(brand, size, fs);
        if (!map.has(k)) {
          map.set(k, {
            brand,
            size,
            fishStock: fs,
            stockDate: stockInfo.stockDate && stockInfo.stockDate !== fs ? stockInfo.stockDate : "—",
            bagsOpened: 0,
            totalKgOpened: 0,
            remainingKg: feedRemainingToday,
            carryoverKg,
            feedRemainingToday: carryoverKg > 0 ? feedRemainingToday : null,
            hasBagLog: false,
            lastBagLog: null
          });
        }
      });
    });

    // 4b. Ensure incoming transfers received on selDate are present in map
    (feedTransfers || []).filter(t => t && (isSameDate(t.transferDate, selDate) || (selIso && dateToIso(t.transferDate) === selIso))).forEach(t => {
      const destStock = t.destinationStock;
      if (!isStockActiveOnSelDate(destStock)) return;
      const brand = t.feedBrand || "—";
      const size = t.feedSize || "—";
      const stockInfo = activeStocksMap.get(normalizeFishStock(destStock, selDate).toLowerCase().trim()) ||
        Array.from(activeStocksMap.values()).find(s => isStockMatch(s.stockName, destStock));
      const fs = stockInfo ? stockInfo.stockName : destStock;
      const k = findRowKey(brand, size, fs);

      if (!map.has(k)) {
        const matchingPond = pondsActiveOnSelDate.find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs))) ||
          (ponds || []).find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs)));
        const stockDate = stockInfo?.stockDate && stockInfo.stockDate !== fs
          ? stockInfo.stockDate
          : (matchingPond?.stockingDate && matchingPond.stockingDate !== "—" ? formatFishStockDate(matchingPond.stockingDate) : "—");

        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
        const matchingRemain = dayRemainLogs.find(r =>
          !isManualPrevDayLog(r) &&
          isStockMatch(r.fishStock, fs) &&
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const initialRemaining = matchingRemain ? (Number(matchingRemain.remainingKg) || 0) : null;

        map.set(k, {
          brand,
          size,
          fishStock: fs,
          stockDate: stockDate !== fs ? stockDate : "—",
          bagsOpened: 0,
          totalKgOpened: 0,
          remainingKg: initialRemaining ?? 0,
          carryoverKg,
          feedRemainingToday: initialRemaining,
          hasBagLog: false,
          hasRemainLog: Boolean(matchingRemain),
          lastBagLog: null
        });
      }
    });

    // 4d. Inject Manual Previous-Day Feed Balances (Admin reconciliation entries)
    // These entries use an explicit starting balance and deduct subsequent feedings directly without relying on historical feeding records.
    const selIsoForManual = toValidDbDate(selDate, viewYear) || dateToIso(selDate);
    (manualPrevBalances || []).forEach(m => {
      if (!m) return;
      const mIso = m.dateIso || toValidDbDate(m.date, viewYear) || dateToIso(m.date);
      const isCreatedOnSelDate = isSameDate(m.date, selDate) || (Boolean(selIsoForManual && mIso) && selIsoForManual === mIso);
      const isBeforeSelDate = Boolean(selIsoForManual && mIso && mIso < selIsoForManual);
      if (!isCreatedOnSelDate && !isBeforeSelDate) return;

      const stats = getManualBalanceStats(m, selDate);
      if (!isCreatedOnSelDate && stats.startBalanceKg <= 0 && stats.currentRemainingKg <= 0) return;

      const defaultActiveStock = activeStocksMap.size > 0
        ? Array.from(activeStocksMap.values())[0].stockName
        : (pondsActiveOnSelDate[0] ? getPondFishStock(pondsActiveOnSelDate[0]) : "All Active Stocks");
      const rawStock = (m.fishStock && m.fishStock !== "—") ? m.fishStock : defaultActiveStock;
      const fs = normalizeFishStock(rawStock, selDate) !== "—" ? normalizeFishStock(rawStock, selDate) : rawStock;
      const brand = m.brand || "—";
      const size = m.size || "—";
      const k = findRowKey(brand, size, fs || "All Active Stocks");

      const matchingBagLog = (bagLogs || []).find(b => b && (b.id === m.id || (isManualPrevDayLog(b) && isSameDate(b.date, m.date) && isSamePelletSize(b.size, m.size) && (b.brand || "").toLowerCase().trim() === brand.toLowerCase().trim() && (!m.fishStock || !b.fishStock || isStockMatch(b.fishStock, m.fishStock)))));
      const matchingPond = pondsActiveOnSelDate.find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs))) ||
        (ponds || []).find(p => p && (pondToStock(p.name, selDate) === fs || p.name === fs || isStockMatch(p.name, fs)));
      const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
        ? formatFishStockDate(matchingPond.stockingDate)
        : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : "—");

      const existingRow = map.get(k);
      if (existingRow) {
        // Already present in the consolidated group (via dayBagLogs/dayRemainLogs or normal carryover)
        if (isCreatedOnSelDate && !matchingBagLog) {
          existingRow.bagsOpened = Math.round((existingRow.bagsOpened + (Number(m.bagsOpened) || 0)) * 100) / 100;
          existingRow.totalKgOpened = Math.round((existingRow.totalKgOpened + (Number(m.bagsOpened) * (Number(m.kgPerBag) || 15))) * 100) / 100;
          existingRow.remainingKg = Math.round((existingRow.remainingKg + stats.currentRemainingKg) * 100) / 100;
          existingRow.feedRemainingToday = existingRow.remainingKg;
          existingRow.hasBagLog = true;
          existingRow.hasRemainLog = true;
        }
        if (isCreatedOnSelDate) {
          existingRow.isManualPrevDayBalance = true;
          if (existingRow.initialManualRemainingKg === undefined) existingRow.initialManualRemainingKg = m.initialRemainingKg;
          if (existingRow.manualFedDeductedKg === undefined) existingRow.manualFedDeductedKg = stats.fedTodayKg;
        }
        return;
      }

      map.set(k, {
        brand,
        size,
        fishStock: fs || "All Active Stocks",
        stockDate: stockDate !== fs ? stockDate : "—",
        bagsOpened: isCreatedOnSelDate ? (Number(m.bagsOpened) || 0) : 0,
        totalKgOpened: isCreatedOnSelDate ? (Number(m.bagsOpened) * (Number(m.kgPerBag) || 15)) : 0,
        remainingKg: stats.currentRemainingKg,
        carryoverKg: stats.startBalanceKg,
        feedRemainingToday: stats.currentRemainingKg,
        availableRemainingKg: stats.currentRemainingKg,
        grossRemainingKg: stats.startBalanceKg,
        hasBagLog: isCreatedOnSelDate,
        hasRemainLog: isCreatedOnSelDate,
        lastBagLog: matchingBagLog || null,
        isManualPrevDayBalance: isCreatedOnSelDate,
        initialManualRemainingKg: m.initialRemainingKg,
        manualFedDeductedKg: stats.fedTodayKg,
        hasFedToday: stats.fedTodayKg > 0,
        totalFedToday: stats.fedTodayKg
      });
    });

    // 5. Apply remaining feed transfers: update balances and attach transfer metadata
    map.forEach(entry => {
      const fs = entry.fishStock;
      const size = entry.size;
      const brand = entry.brand;

      // 1. Outgoing transfers from this stock & size & brand (associated with selDate or origDate)
      const transfersOut = (feedTransfers || []).filter(t =>
        isStockMatch(t.sourceStock, fs) &&
        (size === "—" || isSamePelletSize(t.feedSize, size)) &&
        (brand === "—" || !t.feedBrand || t.feedBrand === "—" || !brand || t.feedBrand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (isSameDate(t.originalDate, selDate) || isSameDate(t.transferDate, selDate) || (selIso && (dateToIso(t.originalDate) === selIso || dateToIso(t.transferDate) === selIso)))
      );
      const totalTransferredOutKg = transfersOut.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // 2. Incoming transfers to this stock & size & brand received on selDate
      const transfersIn = (feedTransfers || []).filter(t =>
        isStockMatch(t.destinationStock, fs) &&
        (size === "—" || isSamePelletSize(t.feedSize, size)) &&
        (brand === "—" || !t.feedBrand || t.feedBrand === "—" || !brand || t.feedBrand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (isSameDate(t.transferDate, selDate) || (selIso && dateToIso(t.transferDate) === selIso))
      );
      const totalTransferredInKg = transfersIn.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // If this is a pure manual previous-day balance without normal non-manual logs on selDate, preserve its direct deduction stats
      const hasNormalLogsOnSelDate = dayBagLogs.some(b =>
        !isManualPrevDayLog(b) &&
        (isStockMatch(b.fishStock, fs) || normalizeFishStock(b.fishStock, selDate) === normalizeFishStock(fs, selDate)) &&
        (size === "—" || isSamePelletSize(b.size, size)) &&
        (brand === "—" || !b.brand || b.brand === "—" || b.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      ) || dayRemainLogs.some(r =>
        !isManualPrevDayLog(r) &&
        (isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock, selDate) === normalizeFishStock(fs, selDate)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      );

      if (entry.isManualPrevDayBalance && !hasNormalLogsOnSelDate) {
        const adjRem = Math.max(0, Math.round(((entry.remainingKg || 0) + totalTransferredInKg - totalTransferredOutKg) * 100) / 100);
        entry.transfersOut = transfersOut;
        entry.transfersIn = transfersIn;
        entry.totalTransferredOutKg = totalTransferredOutKg;
        entry.totalTransferredInKg = totalTransferredInKg;
        entry.feedRemainingToday = adjRem;
        entry.remainingKg = adjRem;
        entry.availableRemainingKg = adjRem;
        return;
      }

      // Feeding for this stock, pellet size, and brand on selDate
      const fedForSize = dayFeedRecords.filter(r =>
        (isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond, selDate), fs) || isStockMatch(r.pond, fs)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      );
      const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      // Sum all explicit leftover entries for selDate (merging manual + normal entries in this consolidated group)
      const remAgg = sumUniqueDayRemains(fs, size, entry.brand);

      const grossRemainingKg = (entry.carryoverKg || 0) + (entry.totalKgOpened || 0) + totalTransferredInKg;
      const computedAvailable = Math.max(0, Math.round((grossRemainingKg - totalTransferredOutKg - totalFed) * 10) / 10);

      let finalRemaining: number | null = null;
      if (remAgg.hasRemain) {
        finalRemaining = remAgg.totalRem;
        entry.hasRemainLog = true;
      } else {
        const hasBalance = (entry.carryoverKg || 0) > 0 || totalTransferredInKg > 0 || (entry.totalKgOpened || 0) > 0;
        finalRemaining = hasBalance ? computedAvailable : null;
        entry.hasRemainLog = false;
      }

      const explicitUsedToday = getBrandUsedKg(selDate, fs, brand, size);
      entry.usedKgToday = explicitUsedToday !== null ? explicitUsedToday : undefined;
      entry.transfersOut = transfersOut;
      entry.transfersIn = transfersIn;
      entry.totalTransferredOutKg = totalTransferredOutKg;
      entry.totalTransferredInKg = totalTransferredInKg;
      entry.feedRemainingToday = finalRemaining;
      entry.remainingKg = finalRemaining !== null ? finalRemaining : computedAvailable;
      entry.availableRemainingKg = finalRemaining !== null ? finalRemaining : computedAvailable;
      entry.grossRemainingKg = grossRemainingKg;
      entry.hasFedToday = totalFed > 0 || (explicitUsedToday !== null && explicitUsedToday > 0);
      entry.totalFedToday = explicitUsedToday !== null ? explicitUsedToday : totalFed;
    });

    return Array.from(map.values()).filter(row =>
      row.isManualPrevDayBalance ||
      row.hasBagLog ||
      row.hasRemainLog ||
      (row.usedKgToday !== undefined && row.usedKgToday > 0) ||
      (row.bagsOpened && row.bagsOpened > 0) ||
      (isStockActiveOnSelDate(row.fishStock) && (
        (row.remainingKg && row.remainingKg > 0.001) ||
        (row.feedRemainingToday && row.feedRemainingToday > 0.001) ||
        (row.availableRemainingKg && row.availableRemainingKg > 0.001) ||
        (row.carryoverKg && row.carryoverKg > 0.001)
      ))
    );
  }, [bagLogs, remainLogs, dayRecords, feedTransfers, manualPrevBalances, getManualBalanceStats, pondsActiveOnSelDate, getTransferUsage, selDate, viewYear, ponds, inventory, getPriorCarryover, dateToIso, getAssociatedPalletsForStock, getMatchingBrandsForPallet, availablePelletSizes, isStockActiveOnSelDate, isManualPrevDayLog, getBrandUsedKg]);

  /* Manual previous-day balances are only updated by explicit user edits or transfers, never by feeding entries. */

  const filteredMergedBagRows = useMemo(() => {
    let list = mergedBagRows;
    // Bags Opened view: Display rows where bags were opened on selDate OR leftover/carryover/transfer/used belongs to selDate
    list = list.filter(r =>
      r.isManualPrevDayBalance ||
      r.hasBagLog ||
      r.hasRemainLog ||
      (r.usedKgToday !== undefined && r.usedKgToday > 0) ||
      (r.bagsOpened && r.bagsOpened > 0) ||
      (isStockActiveOnSelDate(r.fishStock) && (
        (r.remainingKg && r.remainingKg > 0.001) ||
        (r.feedRemainingToday && r.feedRemainingToday > 0.001) ||
        (r.availableRemainingKg && r.availableRemainingKg > 0.001) ||
        (r.carryoverKg && r.carryoverKg > 0.001) ||
        (r.totalTransferredInKg && r.totalTransferredInKg > 0.001)
      ))
    );
    if (bagsStockFilter !== "All") {
      list = list.filter(r =>
        r.isManualPrevDayBalance ||
        isStockMatch(bagsStockFilter, r.fishStock) ||
        normalizeFishStock(r.fishStock, selDate).toLowerCase() === normalizeFishStock(bagsStockFilter, selDate).toLowerCase()
      );
    }
    return list;
  }, [mergedBagRows, bagsStockFilter, selDate, isStockActiveOnSelDate]);

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

  const getRowsForDate = (targetDate: string): BulkRow[] => {
    const dateLabel = toDateLabel(targetDate);
    const targetIso = toValidDbDate(targetDate, viewYear) || dateToIso(targetDate);

    // Suggest pellet if used on the previous 2 consecutive feeding days or bags opened on targetDate for that specific active stock
    const getSuggestedPallet = (pondName: string, pObj?: Pond): string | null => {
      const fsStock = pObj ? getPondFishStock(pObj) : pondToStock(pondName, targetDate);

      // 1. Check if bags were opened or leftover recorded for this stock on targetDate
      const bagOnTargetDate = (bagLogs || []).find(b => {
        if (!b || !b.size || b.size === "—") return false;
        const bIso = toValidDbDate(b.date, b.year || viewYear) || dateToIso(b.date);
        const isDateMatch = isSameDate(b.date, targetDate) || isSameDate(b.date, dateLabel) || Boolean(targetIso && bIso && targetIso === bIso);
        return isDateMatch && (isStockMatch(b.fishStock, fsStock) || isStockMatch(b.fishStock, pondName));
      });
      if (bagOnTargetDate?.size && availablePelletSizes.includes(bagOnTargetDate.size)) {
        return bagOnTargetDate.size;
      }

      const remainOnTargetDate = (remainLogs || []).find(r => {
        if (!r || !r.size || r.size === "—") return false;
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
        const isDateMatch = isSameDate(r.date, targetDate) || isSameDate(r.date, dateLabel) || Boolean(targetIso && rIso && targetIso === rIso);
        return isDateMatch && (isStockMatch(r.fishStock, fsStock) || isStockMatch(r.fishStock, pondName));
      });
      if (remainOnTargetDate?.size && availablePelletSizes.includes(remainOnTargetDate.size)) {
        return remainOnTargetDate.size;
      }

      // 2. Check previous consecutive feeding records for this pond/stock before targetDate
      const pStockDbDate = pObj ? ((pObj as any)._closedIntroIso || toValidDbDate(pObj.stockingDate)) : null;
      const pClearDbDate = pObj ? ((pObj as any)._closedClearIso || null) : null;
      const pondRecords = (feedingRecords || [])
        .filter(r => {
          if (!r || !r.size) return false;
          const matchPond = (r.pondId && pObj && r.pondId === pObj.id) || (r.pond || "").trim().toLowerCase() === pondName.trim().toLowerCase();
          if (!matchPond) return false;
          const rDate = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
          if (pStockDbDate && rDate && rDate < pStockDbDate) return false;
          if (pClearDbDate && rDate && rDate >= pClearDbDate) return false;
          if (targetIso && rDate && rDate >= targetIso) return false;
          return (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0);
        });

      const dateMap = new Map<string, string>();
      pondRecords.forEach(r => {
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date) || r.date;
        if (rIso && r.size) {
          dateMap.set(rIso, r.size);
        }
      });

      const uniqueDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
      if (uniqueDates.length >= 2) {
        const size1 = dateMap.get(uniqueDates[0]);
        const size2 = dateMap.get(uniqueDates[1]);
        if (size1 && size2 && isSamePelletSize(size1, size2) && availablePelletSizes.includes(size1)) {
          return size1;
        }
      } else if (uniqueDates.length === 1) {
        const size1 = dateMap.get(uniqueDates[0]);
        if (size1 && availablePelletSizes.includes(size1)) {
          return size1;
        }
      }
      return null;
    };

    const rows: BulkRow[] = [];
    const matchedRecIds = new Set<string>();

    // Pre-populate ALL ponds that were active on targetDate (including historical stocks active on targetDate)
    const eligiblePondsForDate = getPondsActiveOnDate(targetDate);
    eligiblePondsForDate.forEach(p => {
      const pNameCompact = (p.name || "").replace(/\s+/g, "").toLowerCase();
      const isHistoricalClosed = Boolean((p as any)._isHistoricalClosedStock);
      const pondIntroIso = (p as any)._closedIntroIso || toValidDbDate(p.stockingDate, viewYear) || dateToIso(p.stockingDate);
      const pondClearIso = (p as any)._closedClearIso || null;

      const existingList = (feedingRecords || []).filter(r => {
        if (!r || !r.date) return false;
        const matchesPond = (r.pondId && r.pondId === p.id) || (r.pond || "").replace(/\s+/g, "").toLowerCase() === pNameCompact;
        if (!matchesPond) return false;
        const rIso = toValidDbDate(r.date, r.year || viewYear) || dateToIso(r.date);
        const matchesDate = isSameDate(r.date, targetDate) || isSameDate(r.date, dateLabel) || Boolean(targetIso && rIso && targetIso === rIso);
        if (!matchesDate) return false;

        if (isHistoricalClosed) {
          if (pondClearIso && rIso && rIso >= pondClearIso) return false;
          if (r.fishStock && r.fishStock !== "—" && p.fishStock && p.fishStock !== "—" && !isPondName(r.fishStock) && !isPondName(p.fishStock)) {
            if (!isStockMatch(r.fishStock, p.fishStock) && !isStockMatch(r.fishStock, getPondFishStock(p))) {
              const otherMatches = eligiblePondsForDate.some(op => op.id !== p.id && isStockMatch(r.fishStock, op.fishStock));
              if (otherMatches) return false;
            }
          }
          return true;
        }

        if (pondIntroIso && rIso && rIso < pondIntroIso) return false;
        return true;
      });

      const fsStock = getPondFishStock(p);
      const stockDate = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "—";

      if (existingList.length > 0) {
        existingList.forEach((existing, idx) => {
          if (existing.id) matchedRecIds.add(existing.id);
          const matchedActiveSize = existing.size
            ? (availablePelletSizes.find(s => isSamePelletSize(s, existing.size)) || existing.size)
            : (availablePelletSizes[0] || "");
          rows.push({
            rowId: existing.id || `row-${p.id}-${idx}`,
            pondId: p.id,
            pondName: p.name,
            initialStock: p.initialStock || 0,
            currentCount: p.currentCount || 0,
            size: matchedActiveSize,
            morning: existing.morning != null ? String(existing.morning) : "",
            evening: existing.evening != null ? String(existing.evening) : "",
            morningTime: existing.morningTime || "",
            eveningTime: existing.eveningTime || "",
            fishStock: (existing.fishStock && existing.fishStock !== "—") ? existing.fishStock : fsStock,
            stockDate: (existing.fishStock && formatFishStockDate(existing.fishStock) !== "—") ? formatFishStockDate(existing.fishStock) : stockDate,
            isExtraPallet: idx > 0,
            palletNumber: idx + 1,
            existingRecordId: existing.id
          });
        });
      } else {
        const consecutiveSuggestion = getSuggestedPallet(p.name, p);
        const defaultPondPellet = p.defaultPellet
          ? availablePelletSizes.find(s => isSamePelletSize(s, p.defaultPellet))
          : undefined;
        const defSize = consecutiveSuggestion || defaultPondPellet || (availablePelletSizes[0] || "");
        rows.push({
          rowId: `row-${p.id}-0`,
          pondId: p.id,
          pondName: p.name,
          initialStock: p.initialStock || 0,
          currentCount: p.currentCount || 0,
          size: defSize,
          morning: "",
          evening: "",
          morningTime: "",
          eveningTime: "",
          fishStock: fsStock,
          stockDate,
          isExtraPallet: false,
          palletNumber: 1
        });
      }
    });

    // Also include any historical feeding record recorded on targetDate whose pond was not already matched
    (feedingRecords || []).forEach(existing => {
      if (!existing || !existing.date) return;
      if (existing.id && matchedRecIds.has(existing.id)) return;
      const rIso = toValidDbDate(existing.date, existing.year || viewYear) || dateToIso(existing.date);
      const matchesDate = isSameDate(existing.date, targetDate) || isSameDate(existing.date, dateLabel) || Boolean(targetIso && rIso && targetIso === rIso);
      if (!matchesDate) return;

      const rPondCompact = (existing.pond || "").replace(/\s+/g, "").toLowerCase();
      const basePond = eligiblePondsForDate.find(p => p && ((existing.pondId && p.id === existing.pondId) || p.name.replace(/\s+/g, "").toLowerCase() === rPondCompact)) ||
        (ponds || []).find(p => p && ((existing.pondId && p.id === existing.pondId) || p.name.replace(/\s+/g, "").toLowerCase() === rPondCompact));
      const recStockDate = existing.fishStock && formatFishStockDate(existing.fishStock) !== "—"
        ? formatFishStockDate(existing.fishStock)
        : (basePond?.stockingDate && basePond.stockingDate !== "—" ? formatFishStockDate(basePond.stockingDate) : "—");
      const emptyIdx = rows.findIndex(r => !r.existingRecordId && !r.morning && !r.evening && (r.pondId === (basePond?.id || existing.pondId) || r.pondName.replace(/\s+/g, "").toLowerCase() === rPondCompact));

      const matchedActiveSize = existing.size
        ? (availablePelletSizes.find(s => isSamePelletSize(s, existing.size)) || existing.size)
        : (availablePelletSizes[0] || "");
      const filledRow: BulkRow = {
        rowId: existing.id || `row-hist-${existing.pond || rows.length}`,
        pondId: basePond?.id || existing.pondId || `hist-${existing.pond || existing.id}`,
        pondName: basePond?.name || existing.pond || "Historical Pond",
        initialStock: basePond?.initialStock || 0,
        currentCount: basePond?.currentCount || 0,
        size: matchedActiveSize,
        morning: existing.morning != null ? String(existing.morning) : "",
        evening: existing.evening != null ? String(existing.evening) : "",
        morningTime: existing.morningTime || "",
        eveningTime: existing.eveningTime || "",
        fishStock: (existing.fishStock && existing.fishStock !== "—") ? existing.fishStock : (basePond ? getPondFishStock(basePond) : recStockDate),
        stockDate: recStockDate,
        isExtraPallet: false,
        palletNumber: 1,
        existingRecordId: existing.id
      };

      if (emptyIdx >= 0) {
        rows[emptyIdx] = filledRow;
      } else {
        rows.push(filledRow);
      }
      if (existing.id) matchedRecIds.add(existing.id);
    });

    return rows;
  };

  /* ── Manual Previous-Day Feed Balance Modal Handlers (Admin Only) ── */
  const blankManualPrevRow = useCallback((targetDate?: string) => {
    const tIso = getIsoDateForSelDate(targetDate || selDate);
    const defaultStock = modalFishStockOptions.length === 1 ? modalFishStockOptions[0].name : "";
    const associated = defaultStock ? getAssociatedPalletsForStock(defaultStock, tIso) : [];
    const defaultSize = associated[0] || allRegisteredSizes[0] || "";
    const matchingBrands = defaultSize ? getMatchingBrandsForPallet(defaultSize) : [];
    const defaultBrand = matchingBrands[0] || allRegisteredBrands.find(b => b.toLowerCase() === "blue crown") || allRegisteredBrands[0] || "";
    const inv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === defaultBrand.toLowerCase().trim() && isSamePelletSize(f.size, defaultSize)) ||
      (inventory || []).find(f => f && isSamePelletSize(f.size, defaultSize));
    return {
      fishStock: defaultStock,
      size: defaultSize,
      brand: defaultBrand,
      bagsOpened: "",
      remainingKg: "",
      kgPerBag: Number(inv?.weightPerBag) || 15
    };
  }, [getIsoDateForSelDate, selDate, modalFishStockOptions, getAssociatedPalletsForStock, allRegisteredSizes, getMatchingBrandsForPallet, allRegisteredBrands, inventory]);

  const openManualPrevBalanceModal = () => {
    if (!isAdmin) {
      toast.error("Access denied: Only Admins can add a manual previous-day feed balance.");
      return;
    }
    setManualPrevRows([blankManualPrevRow(selDate)]);
    setManualErr({});
    setIsSavingManualPrev(false);
    setShowManualPrevModal(true);
  };

  const addManualPrevRow = () => {
    setManualPrevRows(prev => [...prev, blankManualPrevRow(selDate)]);
  };

  const removeManualPrevRow = (idx: number) => {
    setManualPrevRows(prev => prev.filter((_, i) => i !== idx));
    setManualErr({});
  };

  const updateManualPrevRow = (idx: number, key: "fishStock" | "size" | "brand" | "bagsOpened" | "remainingKg", val: string) => {
    const tIso = getIsoDateForSelDate(selDate);
    setManualPrevRows(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      if (key === "fishStock") {
        const associated = getAssociatedPalletsForStock(val, tIso);
        let newSize = r.size;
        if (associated.length === 1) {
          newSize = associated[0];
        } else if (associated.length > 1) {
          newSize = associated.some(p => isSamePelletSize(p, r.size)) ? r.size : associated[0];
        } else if (associated.length === 0) {
          newSize = allRegisteredSizes.some(p => isSamePelletSize(p, r.size)) ? r.size : (allRegisteredSizes[0] || "");
        }
        const matchingBrands = newSize ? getMatchingBrandsForPallet(newSize) : [];
        const brandPool = matchingBrands.length > 0 ? matchingBrands : allRegisteredBrands;
        let newBrand = r.brand || "";
        if (brandPool.length > 0) {
          newBrand = brandPool.some(b => b.toLowerCase().trim() === (r.brand || "").toLowerCase().trim()) ? r.brand : brandPool[0];
        }
        const inv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === newBrand.toLowerCase().trim() && isSamePelletSize(f.size, newSize));
        return { ...r, fishStock: val, size: newSize, brand: newBrand, kgPerBag: Number(inv?.weightPerBag) || 15 };
      }
      if (key === "size") {
        const matchingBrands = getMatchingBrandsForPallet(val);
        const brandPool = matchingBrands.length > 0 ? matchingBrands : allRegisteredBrands;
        let newBrand = r.brand || "";
        if (brandPool.length > 0) {
          newBrand = brandPool.some(b => b.toLowerCase().trim() === (r.brand || "").toLowerCase().trim()) ? r.brand : brandPool[0];
        }
        const inv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === newBrand.toLowerCase().trim() && isSamePelletSize(f.size, val));
        return { ...r, size: val, brand: newBrand, kgPerBag: Number(inv?.weightPerBag) || 15 };
      }
      if (key === "brand") {
        const inv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === val.toLowerCase().trim() && isSamePelletSize(f.size, r.size));
        return { ...r, brand: val, kgPerBag: Number(inv?.weightPerBag) || 15 };
      }
      return { ...r, [key]: val };
    }));
  };

  const handleSaveManualPrevBalance = () => {
    if (!isAdmin) {
      toast.error("Access denied: Only Admins can record a manual previous-day feed balance.");
      return;
    }
    if (isSavingManualPrev) return;

    const errs: Record<string, string> = {};
    if (!manualPrevRows.length) {
      errs.entries = "Please add at least one feed stock entry.";
    }

    const seenKeys = new Set<string>();
    const preparedRows: {
      fishStock: string;
      brandClean: string;
      sizeClean: string;
      bagsVal: number;
      remVal: number;
      kgPerBag: number;
    }[] = [];

    manualPrevRows.forEach((r, idx) => {
      const stockClean = (r.fishStock || "").trim();
      const brandClean = (r.brand || "").trim();
      const sizeClean = (r.size || "").trim();
      const bagsVal = Number(r.bagsOpened);
      const remVal = Number(r.remainingKg);

      if (!stockClean) errs[`fs_${idx}`] = "Feed Stock is required.";
      if (!sizeClean) errs[`size_${idx}`] = "Feed Size is required.";
      if (!brandClean) errs[`brand_${idx}`] = "Feed Brand is required.";

      if (stockClean && sizeClean && brandClean) {
        const dupKey = `${normalizeFishStock(stockClean).toLowerCase().trim()}__${brandClean.toLowerCase()}__${sizeClean.toLowerCase()}`;
        if (seenKeys.has(dupKey)) {
          errs[`dup_${idx}`] = "Duplicate entry for this Feed Stock, Brand & Feed Size. Remove or combine into one entry.";
        }
        seenKeys.add(dupKey);
      }

      if (r.bagsOpened.trim() === "" || isNaN(bagsVal) || bagsVal <= 0) {
        errs[`bags_${idx}`] = "Enter a valid positive number of bags opened.";
      }
      if (r.remainingKg.trim() === "" || isNaN(remVal) || remVal < 0) {
        errs[`rem_${idx}`] = "Enter a valid non-negative remaining feed quantity (kg).";
      }

      const matchingInv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === brandClean.toLowerCase() && isSamePelletSize(f.size, sizeClean)) ||
        (inventory || []).find(f => f && isSamePelletSize(f.size, sizeClean));
      const kgPerBag = Number(matchingInv?.weightPerBag) || r.kgPerBag || 15;
      const maxOpenedKg = Math.round(bagsVal * kgPerBag * 100) / 100;

      if (!isNaN(bagsVal) && bagsVal > 0 && !isNaN(remVal) && remVal > maxOpenedKg + 0.001) {
        errs[`rem_${idx}`] = `Feed Remaining (${remVal} kg) cannot exceed quantity opened (${maxOpenedKg} kg for ${bagsVal} bag${bagsVal !== 1 ? "s" : ""}).`;
      }

      preparedRows.push({
        fishStock: stockClean,
        brandClean,
        sizeClean,
        bagsVal,
        remVal,
        kgPerBag
      });
    });

    if (Object.keys(errs).length > 0) {
      setManualErr(errs);
      return;
    }

    setIsSavingManualPrev(true);
    try {
      const dateLabel = toDateLabel(selDate);
      const dateIso = toValidDbDate(selDate, viewYear) || dateToIso(selDate) || TODAY;
      const dateParts = dateLabel.split(" ");
      const monStr = dateParts[0] || selMonLabel || curMonLabel;
      const yrNum = selYear || viewYear || new Date().getFullYear();

      let updatedList = [...manualPrevBalances];

      preparedRows.forEach(item => {
        const resolvedStock = normalizeFishStock(item.fishStock, selDate) !== "—"
          ? normalizeFishStock(item.fishStock, selDate)
          : item.fishStock;

        // Capture baseline feeding on selDate at the moment this manual balance is created so ONLY subsequent feedings deduct from remVal
        const baselineByRecordId: Record<string, number> = {};
        let baselineFedKg = 0;
        (feedingRecords || []).forEach(r => {
          if (!r) return;
          const rIso = toValidDbDate(r.date, viewYear) || dateToIso(r.date);
          if ((isSameDate(r.date, selDate) || rIso === dateIso) && isSamePelletSize(r.size, item.sizeClean)) {
            const recStock = (r.fishStock && r.fishStock !== "—") ? r.fishStock : pondToStock(r.pond, r.date || selDate);
            const stockMatches = !resolvedStock || resolvedStock === "All Active Stocks" || !recStock || recStock === "—" || isStockMatch(recStock, resolvedStock);
            if (stockMatches && (!r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === item.brandClean.toLowerCase())) {
              const tot = Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0));
              if (r.id) baselineByRecordId[r.id] = tot;
              baselineFedKg += tot;
            }
          }
        });

        const existingIdx = updatedList.findIndex(m =>
          m &&
          isSameDate(m.date, dateLabel) &&
          m.brand.toLowerCase().trim() === item.brandClean.toLowerCase() &&
          isSamePelletSize(m.size, item.sizeClean) &&
          (isStockMatch(m.fishStock, resolvedStock) || normalizeFishStock(m.fishStock, selDate).toLowerCase().trim() === resolvedStock.toLowerCase().trim())
        );

        const entryId = existingIdx >= 0 ? updatedList[existingIdx].id : uid();
        const newManualEntry: ManualPrevBalanceRecord = {
          id: entryId,
          farmId: activeFarmId,
          date: dateLabel,
          dateIso,
          brand: item.brandClean,
          size: item.sizeClean,
          bagsOpened: Math.round(item.bagsVal * 100) / 100,
          kgPerBag: item.kgPerBag,
          initialRemainingKg: Math.round(item.remVal * 100) / 100,
          currentRemainingKg: Math.round(item.remVal * 100) / 100,
          baselineFedKg: Math.round(baselineFedKg * 100) / 100,
          baselineByRecordId,
          fishStock: resolvedStock,
          createdBy: currentUser?.name || "Admin",
          createdAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          updatedList[existingIdx] = newManualEntry;
        } else {
          updatedList = [newManualEntry, ...updatedList];
        }

        // Persist in bagLogs & remainLogs so Feed Stock / Bags Opened stay synchronized across sessions
        const bagLogEntry: BagOpenLog = {
          id: newManualEntry.id,
          date: dateLabel,
          month: monStr,
          year: yrNum,
          brand: item.brandClean,
          size: item.sizeClean,
          bagsOpened: newManualEntry.bagsOpened,
          kgPerBag: item.kgPerBag,
          totalKg: Math.round(newManualEntry.bagsOpened * item.kgPerBag * 100) / 100,
          fishStock: resolvedStock,
          reason: "MANUAL_PREV_DAY_BALANCE",
          isManualPrevDayBalance: true,
          initialRemainingKg: newManualEntry.initialRemainingKg,
          baselineFedKg: newManualEntry.baselineFedKg
        };

        if (existingIdx >= 0 && onEditBagLog) {
          onEditBagLog(bagLogEntry);
        } else {
          onAddBagLog(bagLogEntry);
        }

        const remainLogEntry: FeedRemainingLog = {
          id: newManualEntry.id,
          date: dateLabel,
          month: monStr,
          year: yrNum,
          brand: item.brandClean,
          size: item.sizeClean,
          fishStock: resolvedStock,
          remainingKg: newManualEntry.initialRemainingKg,
          isManualPrevDayBalance: true,
          initialRemainingKg: newManualEntry.initialRemainingKg,
          baselineFedKg: newManualEntry.baselineFedKg
        };

        if (existingIdx >= 0 && onEditRemainLog) {
          onEditRemainLog(remainLogEntry);
        } else if (onAddRemainLog) {
          onAddRemainLog(remainLogEntry);
        }
      });

      saveManualPrevBalances(updatedList);
      setShowManualPrevModal(false);
      setDocTab("bags");
      if (preparedRows.length === 1) {
        const one = preparedRows[0];
        toast.success(`Saved opening feed balance: ${one.brandClean} (${one.sizeClean}) — ${Math.round(one.remVal * 100) / 100} kg remaining`);
      } else {
        toast.success(`Saved ${preparedRows.length} opening feed balances for ${selDate}`);
      }
    } finally {
      setIsSavingManualPrev(false);
    }
  };

  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const handleSaveSingleRow = async (r: BulkRow) => {
    const m = Number(r.morning) || 0;
    const e = Number(r.evening) || 0;
    if (m <= 0 && e <= 0) {
      toast.error(`Please enter morning or evening kg for ${r.pondName}`);
      return;
    }
    if (!r.size) {
      toast.error(`Please select a pellet size for ${r.pondName}`);
      return;
    }

    const dateLabel = toDateLabel(bulkDate);
    const stock = getPelletStock(r.size);
    const existingForSizeOnDate = (feedingRecords || [])
      .filter(x => x && (isSameDate(x.date, bulkDate) || x.date === dateLabel) && isSamePelletSize(x.size, r.size) && (x.id === r.existingRecordId || (x.pond || "").toLowerCase().trim() === r.pondName.toLowerCase().trim()))
      .reduce((s, x) => s + (Number(x.total) || ((Number(x.morning) || 0) + (Number(x.evening) || 0))), 0);
    const effectiveAvailable = stock.availableKg + existingForSizeOnDate;
    const requestedKg = m + e;

    if (!stock.exists) {
      toast.error(`Pellet size "${r.size}" is not available in Feed Inventory. Please add feed stock first.`);
      return;
    }
    if (effectiveAvailable <= 0) {
      toast.error(`Pellet size "${r.size}" is completely empty (0 kg remaining in stock). Please add feed stock before feeding.`);
      return;
    }
    if (requestedKg > effectiveAvailable) {
      toast.error(`Insufficient stock for pellet size "${r.size}". Available: ${Math.round(effectiveAvailable * 10) / 10} kg, requested: ${requestedKg} kg.`);
      return;
    }

    setSavingRowId(r.rowId);
    const now = new Date().toLocaleString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const recorder = bulkBy.trim() || currentUser?.name || "Admin";
    const cleanPondName = (r.pondName || "").trim();
    const cleanCompact = cleanPondName.replace(/\s+/g, "").toLowerCase();
    const dateActivePonds = getPondsActiveOnDate(bulkDate);
    const targetPond = dateActivePonds.find(p => p.id === r.pondId || p.name.replace(/\s+/g, "").toLowerCase() === cleanCompact) ||
      ponds.find(p => p.id === r.pondId || p.name.replace(/\s+/g, "").toLowerCase() === cleanCompact);
    const pondId = r.pondId || targetPond?.id;
    const fishStockId = targetPond?.fishStockId || pondId;
    const fishStock = r.fishStock || (targetPond ? getPondFishStock(targetPond) : pondToStock(cleanPondName, bulkDate));

    try {
      const existing = r.existingRecordId
        ? (feedingRecords || []).find(x => x && x.id === r.existingRecordId)
        : (feedingRecords || []).find(x =>
          x &&
          ((x.pondId && pondId && x.pondId === pondId) || (x.pond || "").replace(/\s+/g, "").toLowerCase() === cleanCompact) &&
          (isSameDate(x.date, bulkDate) || x.date === dateLabel) &&
          isSamePelletSize(x.size, r.size)
        );

      const targetFishStock = pondToStock(cleanPondName, bulkDate);
      const resolvedBrandForFeed =
        (manualPrevBalances || []).find(mb => mb && isSamePelletSize(mb.size, r.size) && mb.fishStock && isStockMatch(mb.fishStock, targetFishStock))?.brand ||
        (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && isSamePelletSize(b.size, r.size) && b.fishStock && (normalizeFishStock(b.fishStock, bulkDate) === targetFishStock || isStockMatch(b.fishStock, targetFishStock)))?.brand ||
        (remainLogs || []).find(rm => (isSameDate(rm.date, bulkDate) || isSameDate(rm.date, dateLabel)) && isSamePelletSize(rm.size, r.size) && rm.fishStock && (normalizeFishStock(rm.fishStock, bulkDate) === targetFishStock || isStockMatch(rm.fishStock, targetFishStock)))?.brand ||
        "";

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
          pondId: existing.pondId || pondId,
          fishStockId: existing.fishStockId || fishStockId,
          pond: targetPond?.name || cleanPondName || existing.pond,
          brand: existing.brand && existing.brand !== "—" ? existing.brand : resolvedBrandForFeed,
          size: r.size,
          morning: m,
          evening: e,
          total: m + e,
          recordedBy: recorder,
          morningTime: r.morningTime || existing.morningTime,
          eveningTime: r.eveningTime || existing.eveningTime,
          fishStock: r.fishStock || existing.fishStock || fishStock,
          editHistory: hasChange ? [...(existing.editHistory || []), entry] : (existing.editHistory || []),
          _skipInventoryCheck: true
        });
        toast.success(`Feeding record updated for ${cleanPondName} (${r.size})`);
      } else {
        const brandForFeed = resolvedBrandForFeed;
        const newId = uid();
        await onAddRecord({
          id: newId,
          date: dateLabel,
          month: toMon(bulkDate),
          year: toYr(bulkDate),
          pond: targetPond?.name || cleanPondName,
          pondId,
          fishStockId,
          fishStock,
          brand: brandForFeed,
          size: r.size,
          morning: m,
          evening: e,
          total: m + e,
          recordedBy: recorder,
          morningTime: r.morningTime || undefined,
          eveningTime: r.eveningTime || undefined,
          _skipInventoryCheck: true
        });
        setBulkRows(prev => prev.map(item => item.rowId === r.rowId ? { ...item, existingRecordId: newId } : item));
        toast.success(`Feeding record saved for ${cleanPondName} (${r.size})`);
      }
    } catch (err: any) {
      console.error("Error saving feeding record:", err);
      toast.error(err?.message || "Failed to save feeding record.");
    } finally {
      setSavingRowId(null);
    }
  };

  const openLog = () => {
    const initialDate = getIsoDateForSelDate(selDate);
    setBulkDate(initialDate);
    setBulkBy(currentUser?.name || "");
    setBulkRows(getRowsForDate(initialDate));
    setShowLog(true);
  };

  const updateRow = (rowId: string, field: keyof BulkRow, value: string) => {
    if (field === "size") {
      const target = bulkRows.find(r => r.rowId === rowId);
      if (target) {
        const hasDuplicate = bulkRows.some(r =>
          r.rowId !== rowId &&
          (r.pondId === target.pondId || r.pondName.toLowerCase().trim() === target.pondName.toLowerCase().trim()) &&
          isSamePelletSize(r.size, value)
        );
        if (hasDuplicate) {
          toast.error(`Feed size "${value}" is already logged for ${target.fishStock || target.pondName} on ${toDateLabel(bulkDate)}. Duplicate feed sizes are not permitted.`);
          return;
        }
      }
    }
    setBulkRows(prev => prev.map(r => {
      if (r.rowId !== rowId) return r;
      return { ...r, [field]: value };
    }));
  };

  /* ── Pallet Options Modal state ── */
  const [palletPondModal, setPalletPondModal] = useState<{
    pondId: string;
    pondName: string;
    fishStock: string;
    stockDate: string;
    rowId?: string;
    isExtra?: boolean;
    palletNumber?: number;
  } | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef(false);

  const handlePondSectionMouseDown = (row: BulkRow) => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try { navigator.vibrate(50); } catch { }
      }
      setPalletPondModal({
        pondId: row.pondId,
        pondName: row.pondName,
        fishStock: row.fishStock,
        stockDate: row.stockDate,
        rowId: row.rowId,
        isExtra: row.isExtraPallet,
        palletNumber: row.palletNumber
      });
    }, 500);
  };

  const handlePondSectionMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePondSectionContextMenu = (e: React.MouseEvent, row: BulkRow) => {
    e.preventDefault();
    setPalletPondModal({
      pondId: row.pondId,
      pondName: row.pondName,
      fishStock: row.fishStock,
      stockDate: row.stockDate,
      rowId: row.rowId,
      isExtra: row.isExtraPallet,
      palletNumber: row.palletNumber
    });
  };

  const handleAddAnotherPallet = (pondId: string) => {
    const pondRows = bulkRows.filter(r => r.pondId === pondId);
    if (pondRows.length === 0) return;
    const baseRow = pondRows[0];
    const usedSizes = pondRows.map(r => r.size);
    const unusedSizes = availablePelletSizes.filter(s => !usedSizes.some(u => isSamePelletSize(u, s)));

    if (unusedSizes.length === 0) {
      toast.error(`Cannot add another pallet: All available feed sizes (${availablePelletSizes.join(", ")}) have already been logged for ${baseRow.pondName} on ${toDateLabel(bulkDate)}.`);
      return;
    }

    const nextSize = unusedSizes[0];
    const newRowId = `row-${pondId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newPalletNum = pondRows.length + 1;

    const newRow: BulkRow = {
      rowId: newRowId,
      pondId: baseRow.pondId,
      pondName: baseRow.pondName,
      initialStock: baseRow.initialStock,
      currentCount: baseRow.currentCount,
      size: nextSize,
      morning: "",
      evening: "",
      morningTime: "",
      eveningTime: "",
      fishStock: baseRow.fishStock,
      stockDate: baseRow.stockDate,
      isExtraPallet: true,
      palletNumber: newPalletNum
    };

    setBulkRows(prev => {
      const lastPondIdx = prev.reduce((lastIdx, r, i) => r.pondId === pondId ? i : lastIdx, -1);
      if (lastPondIdx === -1) return [...prev, newRow];
      const next = [...prev];
      next.splice(lastPondIdx + 1, 0, newRow);
      return next;
    });

    toast.success(`Added Pallet ${newPalletNum} (${nextSize}) for ${baseRow.pondName}`);
    setPalletPondModal(null);
  };

  const handleRemoveExtraPallet = (rowId: string) => {
    const rowToRemove = bulkRows.find(r => r.rowId === rowId);
    if (!rowToRemove) return;
    if (rowToRemove.existingRecordId && onDeleteRecord) {
      if (confirm(`Delete this saved feeding record (${rowToRemove.size} · ${(Number(rowToRemove.morning) || 0) + (Number(rowToRemove.evening) || 0)}kg) from ${rowToRemove.pondName}?`)) {
        onDeleteRecord(rowToRemove.existingRecordId);
      } else {
        return;
      }
    }
    setBulkRows(prev => prev.filter(r => r.rowId !== rowId));
    toast.success(`Removed extra pallet entry from ${rowToRemove.pondName}`);
    setPalletPondModal(null);
  };

  const filledCount = bulkRows.filter(r => r.morning || r.evening).length;
  const grandTotal = bulkRows.reduce((s, r) => { const m = Number(r.morning) || 0; const e = Number(r.evening) || 0; return s + m + e; }, 0);

  const handleSaveAll = async () => {
    const errs: Record<string, string> = {};
    if (!filledCount) errs.amounts = "Please enter at least one feeding amount";
    if (!bulkDate) errs.date = "Date is required";
    if (Object.keys(errs).length) { setFeedErr(errs); return; }

    // Enforce Duplicate Feed Size Prevention across all rows being saved
    const filledRows = bulkRows.filter(r => (Number(r.morning) || 0) > 0 || (Number(r.evening) || 0) > 0);
    const seenPondSizes = new Set<string>();
    for (const r of filledRows) {
      const pKey = `${(r.pondName || "").toLowerCase().trim()}||${(r.fishStock || "").toLowerCase().trim()}||${(r.size || "").toLowerCase().trim()}`;
      if (seenPondSizes.has(pKey)) {
        const errMsg = `Duplicate feed size "${r.size}" detected for ${r.fishStock || r.pondName} on ${toDateLabel(bulkDate)}. Each entry must use a different feed size.`;
        toast.error(errMsg);
        setFeedErr({ amounts: errMsg });
        return;
      }
      seenPondSizes.add(pKey);
    }

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
        .filter(x => x && (isSameDate(x.date, bulkDate) || x.date === dateLabel) && isSamePelletSize(x.size, size) && bulkRows.some(br => br.pondName.toLowerCase().trim() === (x.pond || "").toLowerCase().trim()))
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
      const dateActivePonds = getPondsActiveOnDate(bulkDate);
      const recordsToSave: Array<{ type: "edit" | "add"; record: any; pondName: string }> = [];
      for (const r of bulkRows) {
        const m = Number(r.morning) || 0;
        const e = Number(r.evening) || 0;
        if (m > 0 || e > 0) {
          const cleanPondName = (r.pondName || "").trim();
          const cleanCompact = cleanPondName.replace(/\s+/g, "").toLowerCase();
          const targetPond = dateActivePonds.find(p => p.id === r.pondId || p.name.replace(/\s+/g, "").toLowerCase() === cleanCompact) ||
            ponds.find(p => p.id === r.pondId || p.name.replace(/\s+/g, "").toLowerCase() === cleanCompact);
          const pondId = targetPond?.id || r.pondId;
          const canonicalPondName = targetPond?.name || cleanPondName;
          const fishStockId = targetPond?.fishStockId || pondId;
          const fishStock = r.fishStock || (targetPond ? getPondFishStock(targetPond) : pondToStock(cleanPondName, bulkDate));

          const existing = r.existingRecordId
            ? (feedingRecords || []).find(x => x && x.id === r.existingRecordId)
            : (feedingRecords || []).find(x =>
              x &&
              ((x.pondId && pondId && x.pondId === pondId) || (x.pond || "").replace(/\s+/g, "").toLowerCase() === cleanCompact) &&
              (isSameDate(x.date, bulkDate) || x.date === dateLabel) &&
              isSamePelletSize(x.size, r.size)
            );

          const resolvedBrandForFeed =
            (manualPrevBalances || []).find(mb => mb && isSamePelletSize(mb.size, r.size))?.brand ||
            (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && isSamePelletSize(b.size, r.size) && (!b.fishStock || normalizeFishStock(b.fishStock, bulkDate) === pondToStock(cleanPondName, bulkDate)))?.brand ||
            (bagLogs || []).find(b => isSamePelletSize(b.size, r.size) && b.brand && b.brand !== "—")?.brand ||
            (inventory || []).find(f => f && isSamePelletSize(f.size, r.size))?.brand ||
            "";

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
            recordsToSave.push({
              type: "edit",
              pondName: canonicalPondName,
              record: {
                ...existing,
                pondId: existing.pondId || pondId,
                fishStockId: existing.fishStockId || fishStockId,
                pond: canonicalPondName || existing.pond,
                brand: existing.brand && existing.brand !== "—" ? existing.brand : resolvedBrandForFeed,
                size: r.size,
                morning: m,
                evening: e,
                total: m + e,
                recordedBy: recorder,
                morningTime: r.morningTime || existing.morningTime,
                eveningTime: r.eveningTime || existing.eveningTime,
                fishStock: r.fishStock || existing.fishStock || fishStock,
                editHistory: hasChange ? [...(existing.editHistory || []), entry] : (existing.editHistory || []),
                _skipInventoryCheck: true
              }
            });
          } else {
            const brandForFeed = resolvedBrandForFeed;
            recordsToSave.push({
              type: "add",
              pondName: canonicalPondName,
              record: {
                id: uid(),
                date: dateLabel,
                month: toMon(bulkDate),
                year: toYr(bulkDate),
                pond: canonicalPondName,
                pondId,
                fishStockId,
                fishStock,
                brand: brandForFeed,
                size: r.size,
                morning: m,
                evening: e,
                total: m + e,
                recordedBy: recorder,
                morningTime: r.morningTime || undefined,
                eveningTime: r.eveningTime || undefined,
                _skipInventoryCheck: true
              }
            });
          }
        }
      }

      let successCount = 0;
      let failCount = 0;
      for (const item of recordsToSave) {
        try {
          if (item.type === "edit") {
            await onEditFeedRecord(item.record);
          } else {
            await onAddRecord(item.record);
          }
          successCount++;
        } catch (err: any) {
          console.error(`Failed to save feeding record for ${item.pondName}:`, err);
          failCount++;
          toast.error(`Failed to save feeding for ${item.pondName}: ${err?.message || "Error saving record"}`);
        }
      }

      setBulkRows(prev => prev.map(r => {
        const rNameCompact = (r.pondName || "").replace(/\s+/g, "").toLowerCase();
        const savedItem = recordsToSave.find(item =>
          item.record.id === r.existingRecordId ||
          (item.record.pondId && r.pondId && item.record.pondId === r.pondId) ||
          item.pondName.replace(/\s+/g, "").toLowerCase() === rNameCompact
        );
        if (savedItem) {
          return {
            ...r,
            existingRecordId: savedItem.record.id,
            morning: String(savedItem.record.morning || ""),
            evening: String(savedItem.record.evening || ""),
            morningTime: savedItem.record.morningTime || "",
            eveningTime: savedItem.record.eveningTime || "",
          };
        }
        return r;
      }));

      if (failCount === 0 && successCount > 0) {
        toast.success(`Successfully saved feeding records for ${successCount} pond${successCount > 1 ? "s" : ""}`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Saved feeding for ${successCount} pond${successCount > 1 ? "s" : ""}, but ${failCount} failed.`);
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
      toast.success("Feeding records saved successfully");
    } catch (err: any) {
      console.error("Error saving feeding records:", err);
      toast.error(err?.message || "Failed to save feeding records");
    } finally {
      setSavingFeed(false);
    }
  };

  /* ── download helpers ── */
  const downloadDayCSV = () => {
    const headers = ["Pond", "Fish Stock", "Feed Brand", "Pellet Size", "Morning (kg)", "AM Time", "Evening (kg)", "PM Time", "Total (kg)", "Recorded By"];
    const feedRows = dayRows.filter(({ rec }) => !!rec).map(({ pond, rec }) => [pond.name, rec?.fishStock || pondToStock(pond.name), getRecordFeedBrand(rec, pond), rec!.size, String(rec!.morning), rec!.morningTime || "—", String(rec!.evening), rec!.eveningTime || "—", rec!.total + "kg", rec!.recordedBy]);
    downloadCSV(`feeding-records-${selDate.replace(/\s+/g, "-")}.csv`, headers, feedRows);
  };
  const downloadDayPDF = () => {
    const headers = ["Pond", "Fish Stock", "Feed Brand", "Pellet Size", "Morning+Evening", "Total", "Recorded By"];
    const feedRows = dayRows.filter(({ rec }) => !!rec).map(({ pond, rec }) => [pond.name, rec?.fishStock || pondToStock(pond.name), getRecordFeedBrand(rec, pond), rec!.size, `${rec!.morning}+${rec!.evening}kg`, rec!.total + "kg", rec!.recordedBy]);
    openPrintWindow(`Feeding Records — ${selDate}`, headers, feedRows, `${dayRecords.length} session${dayRecords.length !== 1 ? "s" : ""} · ${dayGrand}kg total`);
  };

  /* ── inline styles ── */
  const TI = "w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-green-300 text-center";
  const TS = "w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-300";

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full pb-20 sm:pb-8">
      {/* ── Header ── */}
      <div className="lg:sticky lg:top-0 lg:z-30 lg:bg-[#f5f7fa] lg:-mx-6 lg:-mt-6 lg:px-6 lg:py-4 space-y-2.5">
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
                  <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronLeft size={15} /></button>
                  <span className="text-sm font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-wide">{curMonLabel} {viewYear}</span>
                  <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"><ChevronRight size={15} /></button>
                </div>
                <div className="grid grid-cols-7 mb-1">{DAY_ABBR.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-y-1">
                  {calCells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const label = `${curMonLabel} ${day}`;
                    const hasRec = daysWithRec.has(day);
                    const isSel = isSelInView && day === selDay;
                    const isToday = viewYear === lagosToday.year && viewMonth === lagosToday.month && day === lagosToday.day;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelDate(label); setShowCal(false); }}
                        className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-all ${isSel
                            ? "bg-green-600 text-white font-semibold shadow-sm"
                            : hasRec
                              ? "text-slate-800 font-medium hover:bg-green-50"
                              : "text-slate-400 hover:bg-slate-50"
                          } ${isToday && !isSel ? "ring-2 ring-emerald-500 font-bold text-emerald-800 bg-emerald-50/60" : ""}`}
                        title={isToday ? "Today (Nigeria - Africa/Lagos)" : undefined}
                      >
                        {day}
                        {hasRec && !isSel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: "#F97316" }} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#F97316" }} />Has records</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full ring-2 ring-emerald-500 bg-emerald-100 inline-block" />Today</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-600 inline-block" />Selected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViewYear(lagosToday.year);
                      setViewMonth(lagosToday.month);
                      setSelDate(`${MON_NAMES[lagosToday.month]} ${lagosToday.day}`);
                      setShowCal(false);
                    }}
                    className="w-full text-center py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Today ({MON_NAMES[lagosToday.month]} {lagosToday.day})
                  </button>
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
              <PBtn onClick={openBagsModal} sm outline className="whitespace-nowrap px-2.5 sm:px-3 text-xs"><Package size={13} /> Log Bags Opened &amp; Leftover</PBtn>
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
              <div className={`absolute ${feedMenuPlacement === "right" ? "right-0" : "left-0"} top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[215px] max-w-[calc(100vw-24px)] animate-in fade-in zoom-in-95 duration-100`}>
                <button onClick={() => { downloadDayCSV(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 transition-colors"><Download size={13} /> Export CSV</button>
                <button onClick={() => { downloadDayPDF(); setFeedMobileMenuOpen(false); }} className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 transition-colors"><FileText size={13} /> Export PDF</button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedMobileMenuOpen(false);
                      openManualPrevBalanceModal();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-semibold text-teal-800 hover:bg-teal-50 hover:text-teal-900 flex items-center gap-2 border-t border-slate-100 transition-colors"
                  >
                    <Package size={13} className="text-teal-600 shrink-0" />
                    <span>Add Previous-Day Feed Balance</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats - Desktop Only */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        <StatCard label="Total Ponds" value={String(totalPonds)} sub={`active on ${selDate}`} icon={Layers} />
        <StatCard label="Ponds Fed" value={String(pondsFedToday)} sub={selDate} icon={CheckCircle} hi />
        <StatCard label="Ponds Remaining" value={String(pondsRemaining)} sub={`unfed on ${selDate}`} icon={BookOpen} />
        <StatCard label="Bags Opened" value={String(bagsOpenedToday)} sub={selDate} icon={Package} />
      </div>

      {/* ── Tab bar (sticky on mobile only) ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-[#f5f7fa] md:static md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent overflow-x-auto no-scrollbar">
        <div className="flex gap-1 bg-slate-200/80 p-1 rounded-xl w-fit shrink-0">
          {(["daily", "bags", "mismatch"] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setDocTab(t);
                document.querySelector("main")?.scrollTo({ top: 0, behavior: "instant" });
                window.scrollTo({ top: 0, behavior: "instant" });
                document.documentElement.scrollTo({ top: 0, behavior: "instant" });
              }}
              className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${docTab === t ? "bg-white text-green-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>{t === "daily" ? "Daily Feed" : t === "bags" ? "Bags Opened" : "Mismatch"}</span>
              {t === "mismatch" && mismatchRows.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse shrink-0" title={`${mismatchRows.length} unrecorded bag mismatch${mismatchRows.length !== 1 ? "es" : ""}`} />
              )}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-1 mb-3">
        {docTab === "daily"
          ? "Daily feed records for the selected date."
          : docTab === "bags"
            ? "Bags opened and remaining feed for the selected date."
            : "Active fish stocks with missing bag opening records for the selected date."}
      </p>

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
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${isSelected
                              ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                              : "text-slate-600 hover:text-slate-900 font-medium"
                            }`}
                        >
                          <span>{name}</span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${isSelected
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

                  {/* Stock Selection Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Stock:</span>
                    <select
                      value={dailyStockFilter}
                      onChange={e => setDailyStockFilter(e.target.value)}
                      className={`${SC} py-1.5 text-xs w-auto`}
                    >
                      <option value="All">All Stocks</option>
                      {stockFilterOptions.map(s => (
                        <option key={s.key} value={s.name}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px] md:min-w-[950px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky left-0 z-20 bg-slate-50">#</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left sticky left-[48px] z-20 bg-slate-50 border-r border-slate-200 min-w-[130px]">Pond</th>
                      <th className="hidden md:table-cell px-4 py-3 text-xs font-bold text-teal-800 uppercase tracking-wider text-left whitespace-nowrap bg-teal-50/70 border-y border-teal-200/80">Fish Stock Date</th>
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
                      const atMax = hasFeed && pondMaxKgMap && rec!.size in pondMaxKgMap && (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pond.id : r.pond === pond.name) && r.size === rec!.size && ((pond as any).fishStockId ? r.fishStockId === (pond as any).fishStockId : (!pond.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pond.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0) >= (pondMaxKgMap[rec!.size] || Infinity);
                      const isEdited = (rec?.editHistory?.length || 0) > 0;
                      const recStockDate = rec?.fishStock && formatFishStockDate(rec.fishStock) !== "—"
                        ? formatFishStockDate(rec.fishStock)
                        : (pond.stockingDate && pond.stockingDate !== "—"
                          ? formatFishStockDate(pond.stockingDate)
                          : (pondToStockDate(pond.name) !== "—" ? pondToStockDate(pond.name) : "—"));
                      return (
                        <tr key={rec ? rec.id : `pond-${pond.id}`} onClick={() => rec && setViewFeedRec(rec)} className={`transition-colors ${hasFeed ? "hover:bg-green-50/30 cursor-pointer" : "opacity-40 hover:opacity-60"}`}>
                          <td className={`w-12 min-w-[48px] max-w-[48px] px-2 py-3.5 text-slate-300 text-xs font-mono text-center sticky left-0 z-10 ${hasFeed ? "bg-white" : "bg-white"}`}>{i + 1}</td>
                          <td className="px-4 py-3.5 min-w-[130px] sticky left-[48px] z-10 bg-white border-r border-slate-100">
                            <p className="font-semibold text-slate-900 leading-tight">{pond.name}</p>
                            {recStockDate !== "—" ? (
                              <p className="text-[11px] text-teal-800 font-semibold leading-tight mt-1 flex items-center gap-1">
                                <span className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Stock:</span> {recStockDate}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 leading-tight mt-0.5 italic">—</p>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3.5 whitespace-nowrap">
                            {recStockDate !== "—" ? (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-300 text-teal-950 shadow-2xs">
                                <Calendar size={14} className="text-teal-600 shrink-0" />
                                <span className="text-xs sm:text-sm font-bold tracking-tight">{recStockDate}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 text-xs italic">—</span>
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
                  <p className="text-sm font-semibold text-slate-400">{dailyStockFilter !== "All" ? `No ponds found for ${dailyStockFilter}` : `No feeding recorded on ${selDate}`}</p>
                  <p className="text-xs text-slate-300 mt-1">Select a highlighted date or log a new session</p>
                </div>
              )}
            </Card>
          </div>

          {/* Mobile Feeding Records: Table / Card View with Toggle */}
          <div className="md:hidden space-y-3">
            {/* Mobile Controls Toolbar: Feeding Status Filter First + Stock Filter Side-by-Side */}
            <div className="flex items-center justify-between gap-1.5 flex-nowrap bg-white border border-slate-200/80 rounded-2xl p-1.5 sm:p-2 shadow-2xs">
              {/* Feeding Status Filter (First) */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shrink-0">
                {(["all", "fed", "not_fed"] as const).map(st => {
                  const count = st === "all" ? totalPonds : st === "fed" ? pondsFedToday : pondsRemaining;
                  const name = st === "all" ? "All" : st === "fed" ? "Fed" : "Remaining";
                  const isSelected = feedStatusFilter === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFeedStatusFilter(st)}
                      className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[10.5px] sm:text-xs transition-all ${isSelected
                          ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800 font-medium"
                        }`}
                    >
                      <span className="truncate max-w-[58px] sm:max-w-none">{name}</span>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-full leading-none shrink-0 ${isSelected
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

              {/* Stock Filter (Second, side-by-side, shrunk to fit without wrapping) */}
              <div className="flex items-center min-w-0 flex-1 max-w-[130px] sm:max-w-[170px] justify-end">
                <select
                  value={dailyStockFilter}
                  onChange={e => setDailyStockFilter(e.target.value)}
                  className={`${SC} py-1 px-2 text-[11px] sm:text-xs w-full truncate`}
                  aria-label="Filter by Stock"
                >
                  <option value="All">All Stocks</option>
                  {stockFilterOptions.map(s => (
                    <option key={s.key} value={s.name}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile Card View */}
            {filteredDayRows.length === 0 ? (
              <div className="py-10 text-center bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <Droplets size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">{dailyStockFilter !== "All" ? `No ponds found for ${dailyStockFilter}` : `No feeding recorded on ${selDate}`}</p>
                <p className="text-[11px] text-slate-400 mt-1">Select a date or log feeding</p>
              </div>
            ) : (
              filteredDayRows.map(({ pond, rec }, i) => {
                const hasFeed = !!rec;
                const pondMaxKgMap = pond.maxKgByPallet;
                const atMax = hasFeed && pondMaxKgMap && rec!.size in pondMaxKgMap && (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pond.id : r.pond === pond.name) && r.size === rec!.size && ((pond as any).fishStockId ? r.fishStockId === (pond as any).fishStockId : (!pond.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pond.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0) >= (pondMaxKgMap[rec!.size] || Infinity);
                const isEdited = (rec?.editHistory?.length || 0) > 0;
                const recStockDate = rec?.fishStock && formatFishStockDate(rec.fishStock) !== "—"
                  ? formatFishStockDate(rec.fishStock)
                  : (pond.stockingDate && pond.stockingDate !== "—"
                    ? formatFishStockDate(pond.stockingDate)
                    : (pondToStockDate(pond.name) !== "—" ? pondToStockDate(pond.name) : "—"));
                const rowKey = rec ? rec.id : `pond-${pond.id}`;
                const isMenuOpen = activeDailyMenuId === rowKey;

                return (
                  <div
                    key={rowKey}
                    onClick={() => rec && setViewFeedRec(rec)}
                    className={`bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs transition-all relative ${hasFeed ? "hover:border-green-300 hover:shadow-sm cursor-pointer" : "opacity-70"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-[190px]" title={pond.name}>
                          {pond.name}
                        </h3>
                        {recStockDate !== "—" ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-teal-50 border border-teal-200/90 text-teal-900 shadow-2xs">
                            <Calendar size={11} className="text-teal-600 shrink-0" />
                            <span className="text-[11px] font-bold">Stock: {recStockDate}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block">Empty Pond</span>
                        )}
                        <p className="text-[11px] text-slate-500 truncate">
                          Fish Count: <strong className="text-slate-700">{pond.currentCount.toLocaleString()}</strong> fish
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
                              onClick={() => setActiveDailyMenuId(isMenuOpen ? null : rowKey)}
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

      {/* ── Bags Opened tab ── */}
      {docTab === "bags" && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Bags Opened — {selDate}</p>
                  <p className="text-[11px] text-slate-400">{filteredMergedBagRows.length} entries</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Stock Selection Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Stock:</span>
                    <select
                      value={bagsStockFilter}
                      onChange={e => setBagsStockFilter(e.target.value)}
                      className={`${SC} py-1.5 text-xs w-auto`}
                    >
                      <option value="All">All Stocks</option>
                      {stockFilterOptions.map(s => (
                        <option key={s.key} value={s.name}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  {/* Transfer History Button */}
                  <button
                    type="button"
                    onClick={() => { setHistoryStockFilter("All"); setIsTransferHistoryOpen(true); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="View remaining feed transfer history"
                  >
                    <ArrowRightLeft size={13} className="text-teal-600" />
                    <span>Transfer History</span>
                    {feedTransfers.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full">
                        {feedTransfers.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Dismissible Highlighting Banner if highlighted */}
              {bagsHighlight && (
                <div className="mx-4 sm:mx-5 my-2.5 px-3.5 py-2.5 bg-orange-50/90 border border-orange-200 rounded-xl flex items-center justify-between text-xs text-orange-950 animate-in fade-in duration-200 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="text-orange-600 shrink-0" />
                    <span>
                      Showing discrepancy for <strong className="font-bold text-orange-950">{formatFishStock(bagsHighlight.stock)}</strong> ({bagsHighlight.size}). Update the highlighted cell below.
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
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Feed Remaining from Previous Day</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bags Opened Today</th>
                      <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Feed Remaining Today</th>
                      <th className="px-3 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredMergedBagRows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-xs text-slate-400 py-8">
                          No bags logged for {selDate}
                        </td>
                      </tr>
                    )}
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

                      const expData = getExpectedFeedData(selDate, row.fishStock, row.brand, row.size, row.hasBagLog ? row.bagsOpened : undefined);
                      const isBagsMismatch = Boolean(!row.isManualPrevDayBalance && expData.hasFed && (row.bagsOpened !== expData.expectedBags || (!row.hasBagLog && expData.expectedBags > 0)));
                      const isRemainMismatch = Boolean(!row.isManualPrevDayBalance && row.hasRemainLog && expData.hasFed && Math.abs(((row.feedRemainingToday ?? row.remainingKg) || 0) - expData.expectedRemaining) > 0.05);

                      const rowUniqueKey = `desktop__${i}__${row.lastBagLog?.id || ""}__${row.fishStock}__${row.brand}__${row.size}`;

                      return (
                        <tr
                          key={rowUniqueKey}
                          className={`hover:bg-slate-50/80 transition-colors ${isHighlightedRow ? "bg-orange-50/30" : ""}`}
                        >
                          {/* Sticky Fish Stock Column (Solid Opaque Background & High Z-Index) */}
                          <td className={`px-3.5 py-3 sticky left-0 z-20 border-r border-slate-100 min-w-[130px] max-w-[155px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${isHighlightedRow ? "!bg-[#fffbeb]" : "bg-white"}`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800 text-xs truncate" title={getStockDisplayName(row.fishStock, row.stockDate)}>
                                {getStockDisplayName(row.fishStock, row.stockDate)}
                              </p>
                              {row.isManualPrevDayBalance && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200" title="Manual Previous-Day Feed Balance (Admin Reconciliation)">
                                  Manual Prev-Day Balance
                                </span>
                              )}
                              {!row.isManualPrevDayBalance && !isStockActiveOnSelDate(row.fishStock) && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="This stock is cleared from all ponds, but remaining feed is still available">
                                  Cleared
                                </span>
                              )}
                            </div>
                            {/* Transfer Badges */}
                            {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                              <div className="mt-1">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${(row.availableRemainingKg || 0) === 0
                                    ? "bg-teal-50 text-teal-800 border-teal-200"
                                    : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`} title={`Transferred to ${row.transfersOut?.map(t => formatFishStock(t.destinationStock)).join(", ")}`}>
                                  <ArrowRightLeft size={10} className="shrink-0" />
                                  {(row.availableRemainingKg || 0) === 0 ? "Feed Transferred" : "Partially Transferred"}
                                </span>
                              </div>
                            ) : null}
                            {row.totalTransferredInKg && row.totalTransferredInKg > 0 ? (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-800 border-blue-200" title={`Received ${row.totalTransferredInKg} kg from ${row.transfersIn?.map(t => `${t.quantityKg} kg from ${formatFishStock(t.sourceStock)}`).join(", ")}`}>
                                  <Package size={10} className="shrink-0" />
                                  Received {row.totalTransferredInKg} kg
                                </span>
                              </div>
                            ) : null}
                          </td>

                          {/* Feed Brand */}
                          <td className="px-4 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">{row.brand}</td>

                          {/* Pellet Size */}
                          <td className="px-4 py-3"><Bdg label={row.size} color="blue" /></td>

                          {/* Feed Remaining from Previous Day */}
                          <td className="px-4 py-3 font-bold text-slate-800 text-sm whitespace-nowrap font-['Barlow_Condensed',sans-serif]">
                            {row.carryoverKg !== undefined ? `${row.carryoverKg} kg` : "0 kg"}
                          </td>

                          {/* Bags Opened Today */}
                          <td className={`px-4 py-3 relative z-0 transition-all ${isBagsColHighlighted ? "bg-orange-50 ring-1 ring-orange-400 ring-inset rounded" : ""}`}>
                            <div className={`font-bold text-sm font-['Barlow_Condensed',sans-serif] ${isBagsMismatch ? "text-red-600 font-bold" : "text-slate-900"}`}>
                              {row.bagsOpened > 0 ? (
                                `${row.bagsOpened} bag${row.bagsOpened !== 1 ? "s" : ""}`
                              ) : (
                                <span className={isBagsMismatch ? "text-red-600 font-bold" : "text-slate-700"}>0 bags</span>
                              )}
                            </div>
                            {!row.isManualPrevDayBalance && expData.hasFed && (
                              <p className={`text-[11px] font-medium mt-0.5 leading-tight ${isBagsMismatch ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                                Exp: {expData.expectedBags} bag{expData.expectedBags !== 1 ? "s" : ""}
                              </p>
                            )}
                          </td>

                          {/* Feed Remaining Today */}
                          <td className={`px-4 py-3 relative z-0 transition-all ${isRemainColHighlighted ? "bg-amber-50 ring-1 ring-amber-400 ring-inset rounded" : ""}`}>
                            <div className="font-bold text-sm font-['Barlow_Condensed',sans-serif]">
                              {(() => {
                                const remToDisplay = row.hasRemainLog && row.feedRemainingToday !== null && row.feedRemainingToday !== undefined
                                  ? row.feedRemainingToday
                                  : (row.feedRemainingToday !== null && row.feedRemainingToday !== undefined ? row.feedRemainingToday : (row.availableRemainingKg ?? 0));
                                return (
                                  <span className={isRemainMismatch ? "text-red-600 font-bold" : remToDisplay > 0 ? "text-emerald-800 font-bold" : "text-slate-400 font-normal"}>
                                    {remToDisplay} kg
                                  </span>
                                );
                              })()}
                            </div>
                            {row.usedKgToday !== undefined && row.usedKgToday > 0 && (
                              <p className="text-[10px] text-emerald-700 font-semibold leading-tight mt-0.5">
                                Used: {row.usedKgToday} kg
                              </p>
                            )}
                            {row.isManualPrevDayBalance && (row.manualFedDeductedKg ?? 0) > 0 && (
                              <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                                ({row.carryoverKg} kg − {row.manualFedDeductedKg} kg fed)
                              </p>
                            )}
                            {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                              <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                                ({row.totalTransferredOutKg} kg transferred)
                              </p>
                            ) : null}
                            {!row.isManualPrevDayBalance && expData.hasFed && (
                              <p className={`text-[11px] font-medium mt-0.5 leading-tight ${isRemainMismatch ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                                Exp: {expData.expectedRemaining} kg
                              </p>
                            )}
                          </td>

                          {/* Actions: Quick Edit & 3-Dots Menu */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 relative">
                              {canEdit && (
                                <button onClick={() => openEditMergedRow(row)} className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Edit">
                                  <Pencil size={13} />
                                </button>
                              )}
                              {/* 3-dots Menu Button */}
                              <div className="relative">
                                <button
                                  type="button"
                                  data-bag-menu-button="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveBagMenuId(activeBagMenuId === rowUniqueKey ? null : rowUniqueKey);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="Actions"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                {activeBagMenuId === rowUniqueKey && (
                                  <div
                                    data-bag-menu-dropdown="true"
                                    onClick={e => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => { setActiveBagMenuId(null); setViewBagDetail(row); }}
                                      className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                    >
                                      <Eye size={13} className="text-slate-400" /> View Details
                                    </button>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => { setActiveBagMenuId(null); openEditMergedRow(row); }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Pencil size={13} className="text-green-600" /> Edit
                                      </button>
                                    )}
                                    {/* Transfer Remaining Feed Option (Section 3) */}
                                    <button
                                      type="button"
                                      disabled={!canEdit || (row.availableRemainingKg ?? 0) <= 0}
                                      onClick={() => {
                                        setActiveBagMenuId(null);
                                        openTransferModal(row);
                                      }}
                                      className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${(row.availableRemainingKg ?? 0) > 0 && canEdit
                                          ? "text-teal-700 hover:bg-teal-50 font-semibold"
                                          : "text-slate-300 cursor-not-allowed"
                                        }`}
                                      title={(row.availableRemainingKg ?? 0) > 0 ? "Transfer unused remaining feed to another compatible stock" : "No remaining feed to transfer"}
                                    >
                                      <ArrowRightLeft size={13} className={(row.availableRemainingKg ?? 0) > 0 ? "text-teal-600" : "text-slate-300"} />
                                      <span>Transfer Remaining Feed</span>
                                      {(row.availableRemainingKg ?? 0) > 0 && (
                                        <span className="ml-auto text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                                          {row.availableRemainingKg} kg
                                        </span>
                                      )}
                                    </button>
                                    {((row.transfersOut && row.transfersOut.length > 0) || (row.transfersIn && row.transfersIn.length > 0)) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveBagMenuId(null);
                                          setHistoryStockFilter(row.fishStock);
                                          setIsTransferHistoryOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                                      >
                                        <History size={13} className="text-slate-400" /> Transfer History
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
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
            {/* Mobile Controls: Stock Filter and Transfer History */}
            <div className="flex items-center justify-between gap-2">
              <select
                value={bagsStockFilter}
                onChange={e => setBagsStockFilter(e.target.value)}
                className={`${SC} py-1.5 px-3 text-xs w-full max-w-[200px] bg-white border border-slate-200 rounded-xl shadow-2xs font-medium text-slate-700`}
              >
                <option value="All">All Stocks</option>
                {stockFilterOptions.map(s => (
                  <option key={s.key} value={s.name}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => { setHistoryStockFilter("All"); setIsTransferHistoryOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-2xs shrink-0"
                title="View transfer history"
              >
                <ArrowRightLeft size={13} className="text-teal-600" />
                <span>History</span>
                {feedTransfers.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-teal-100 text-teal-800 text-[10px] font-bold rounded-full">
                    {feedTransfers.length}
                  </span>
                )}
              </button>
            </div>

            {/* Dismissible Highlighting Banner */}
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

                const expData = getExpectedFeedData(selDate, row.fishStock, row.brand, row.size, row.hasBagLog ? row.bagsOpened : undefined);
                const isBagsMismatch = Boolean(!row.isManualPrevDayBalance && expData.hasFed && (row.bagsOpened !== expData.expectedBags || (!row.hasBagLog && expData.expectedBags > 0)));
                const isRemainMismatch = Boolean(!row.isManualPrevDayBalance && row.hasRemainLog && expData.hasFed && Math.abs(((row.feedRemainingToday ?? row.remainingKg) || 0) - expData.expectedRemaining) > 0.05);
                const mobileMenuKey = `mobile__${i}__${row.lastBagLog?.id || ""}__${row.fishStock}__${row.brand}__${row.size}`;
                const isMenuOpen = activeBagMenuId === mobileMenuKey;

                return (
                  <div
                    key={mobileMenuKey}
                    onClick={() => setViewBagDetail(row)}
                    className={`bg-white border rounded-2xl p-4 shadow-xs transition-all cursor-pointer hover:border-green-300 hover:shadow-sm relative ${isHighlightedRow
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
                        {isRemainColHighlighted && !isBagsColHighlighted && <span className="text-[10px] text-amber-800 font-semibold">Check Feed Remaining</span>}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{getStockDisplayName(row.fishStock, row.stockDate)}</span>
                          {row.isManualPrevDayBalance && (
                            <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              Manual Prev-Day Balance
                            </span>
                          )}
                          {!row.isManualPrevDayBalance && !isStockActiveOnSelDate(row.fishStock) && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Cleared
                            </span>
                          )}
                        </h3>
                        {row.stockDate && row.stockDate !== "—" && (
                          <p className="text-xs text-slate-500 font-normal leading-tight mt-0.5">{row.stockDate}</p>
                        )}
                        {/* Mobile Transfer Badges */}
                        {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${(row.availableRemainingKg || 0) === 0
                                ? "bg-teal-50 text-teal-800 border-teal-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}>
                              <ArrowRightLeft size={10} className="shrink-0" />
                              {(row.availableRemainingKg || 0) === 0 ? "Feed Transferred" : "Partially Transferred"} ({row.totalTransferredOutKg} kg)
                            </span>
                          </div>
                        ) : null}
                        {row.totalTransferredInKg && row.totalTransferredInKg > 0 ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-800 border-blue-200" title={`Received ${row.totalTransferredInKg} kg from ${row.transfersIn?.map(t => `${t.quantityKg} kg from ${formatFishStock(t.sourceStock)}`).join(", ")}`}>
                              <Package size={10} className="shrink-0" />
                              Received {row.totalTransferredInKg} kg
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-slate-600">{row.brand}</span>
                        <Bdg label={row.size} color="blue" />
                        {/* 3-dots Menu Button */}
                        <div className="relative">
                          <button
                            type="button"
                            data-bag-menu-button="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveBagMenuId(isMenuOpen ? null : mobileMenuKey);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Actions"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {isMenuOpen && (
                            <div
                              data-bag-menu-dropdown="true"
                              onClick={e => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 min-w-[190px] animate-in fade-in zoom-in-95 duration-100 text-left"
                            >
                              <button
                                type="button"
                                onClick={() => { setActiveBagMenuId(null); setViewBagDetail(row); }}
                                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Eye size={13} className="text-slate-400" /> View Details
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveBagMenuId(null); openEditMergedRow(row); }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Pencil size={13} className="text-green-600" /> Edit
                                </button>
                              )}
                              {/* Transfer Remaining Feed (Section 3) */}
                              <button
                                type="button"
                                disabled={!canEdit || (row.availableRemainingKg ?? 0) <= 0}
                                onClick={() => {
                                  setActiveBagMenuId(null);
                                  openTransferModal(row);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${(row.availableRemainingKg ?? 0) > 0 && canEdit
                                    ? "text-teal-700 hover:bg-teal-50 font-semibold"
                                    : "text-slate-300 cursor-not-allowed"
                                  }`}
                                title={(row.availableRemainingKg ?? 0) > 0 ? "Transfer remaining feed to another stock" : "No remaining feed to transfer"}
                              >
                                <ArrowRightLeft size={13} className={(row.availableRemainingKg ?? 0) > 0 ? "text-teal-600" : "text-slate-300"} />
                                <span>Transfer Remaining Feed</span>
                                {(row.availableRemainingKg ?? 0) > 0 && (
                                  <span className="ml-auto text-[10px] px-1.5 py-0.2 bg-teal-100 text-teal-800 rounded font-bold">
                                    {row.availableRemainingKg} kg
                                  </span>
                                )}
                              </button>
                              {((row.transfersOut && row.transfersOut.length > 0) || (row.transfersIn && row.transfersIn.length > 0)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveBagMenuId(null);
                                    setHistoryStockFilter(row.fishStock);
                                    setIsTransferHistoryOpen(true);
                                  }}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                                >
                                  <History size={13} className="text-slate-400" /> Transfer History
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Metrics Grid */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
                      {/* Feed Remaining from Previous Day (First on the left) */}
                      <div className="bg-slate-50 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[10px] text-slate-500 block mb-1 font-semibold leading-tight">
                          Feed Remaining from Previous Day
                        </span>
                        <span className="font-bold text-slate-900 text-sm sm:text-base font-['Barlow_Condensed',sans-serif] tracking-tight">
                          {row.carryoverKg !== undefined ? `${row.carryoverKg} kg` : "0 kg"}
                        </span>
                      </div>

                      {/* Bags Opened Today */}
                      <div className={`rounded-xl p-2.5 flex flex-col justify-between transition-all ${isBagsColHighlighted ? "bg-orange-100/90 border border-orange-400 ring-1 ring-orange-400" : isBagsMismatch ? "bg-red-50/80 border border-red-200" : "bg-slate-50"}`}>
                        <span className={`text-[10px] block mb-1 font-semibold leading-tight ${isBagsMismatch ? "text-red-600 font-bold" : "text-slate-500"}`}>
                          Bags Opened Today
                        </span>
                        <span className={`font-bold text-sm sm:text-base font-['Barlow_Condensed',sans-serif] tracking-tight ${isBagsMismatch ? "text-red-600 font-bold" : "text-slate-900"}`}>
                          {row.bagsOpened > 0 ? (
                            `${row.bagsOpened} bag${row.bagsOpened !== 1 ? "s" : ""}`
                          ) : (
                            <span className={isBagsMismatch ? "text-red-600 font-bold" : "text-slate-600"}>0 bags</span>
                          )}
                        </span>
                        {row.usedKgToday !== undefined && row.usedKgToday > 0 && (
                          <p className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                            Used: {row.usedKgToday} kg
                          </p>
                        )}
                        {!row.isManualPrevDayBalance && expData.hasFed && (
                          <p className={`text-[10px] font-medium mt-0.5 ${isBagsMismatch ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                            Exp: {expData.expectedBags}
                          </p>
                        )}
                      </div>

                      {/* Feed Remaining Today */}
                      <div className={`rounded-xl p-2.5 flex flex-col justify-between transition-all ${isRemainColHighlighted ? "bg-amber-100/90 border border-amber-400 ring-1 ring-amber-400" : isRemainMismatch ? "bg-red-50/80 border border-red-200" : "bg-emerald-50/50 border border-emerald-100/60"}`}>
                        <span className={`text-[10px] block mb-1 font-semibold leading-tight ${isRemainMismatch ? "text-red-600 font-bold" : "text-slate-500"}`}>
                          Feed Remaining Today
                        </span>
                        {(() => {
                          const remToDisplay = row.hasRemainLog && row.feedRemainingToday !== null && row.feedRemainingToday !== undefined
                            ? row.feedRemainingToday
                            : (row.feedRemainingToday !== null && row.feedRemainingToday !== undefined ? row.feedRemainingToday : (row.availableRemainingKg ?? 0));
                          return (
                            <span className={`font-bold text-sm sm:text-base font-['Barlow_Condensed',sans-serif] tracking-tight ${isRemainMismatch ? "text-red-600 font-bold" : remToDisplay > 0 ? "text-emerald-800" : "text-slate-400 font-normal"}`}>
                              {remToDisplay} kg
                            </span>
                          );
                        })()}
                        {row.isManualPrevDayBalance && (row.manualFedDeductedKg ?? 0) > 0 && (
                          <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                            ({row.carryoverKg} kg − {row.manualFedDeductedKg} kg fed)
                          </p>
                        )}
                        {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                          <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                            ({row.totalTransferredOutKg} kg transferred)
                          </p>
                        ) : null}
                        {!row.isManualPrevDayBalance && expData.hasFed && (
                          <p className={`text-[10px] font-medium mt-0.5 ${isRemainMismatch ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                            Exp: {expData.expectedRemaining} kg
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Mismatch tab ── */}
      {docTab === "mismatch" && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Fish Stock
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Bags Opened
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Leftover Feed
                      </th>
                      <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Discrepancy Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mismatchRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-xs text-slate-400 py-8">
                          No mismatches for {selDate}
                        </td>
                      </tr>
                    ) : (
                      mismatchRows.map(row => {
                        const statusConfig = {
                          "Not Opened": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500" },
                          "Bag Mismatch": { bg: "bg-orange-50 text-orange-700 border-orange-200/80", dot: "bg-orange-500" },
                          "Remaining Mismatch": { bg: "bg-amber-50 text-amber-700 border-amber-200/80", dot: "bg-amber-500" },
                          "Multiple Mismatches": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500" },
                        }[row.status] || { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500" };

                        return (
                          <tr key={row.stockKey} onClick={() => handleMismatchClick(row)} className="hover:bg-red-50/40 transition-colors bg-red-50/5 cursor-pointer group" title="Click to view and update in Bags Opened">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-slate-900 text-xs group-hover:text-red-700 transition-colors">
                                  {getStockDisplayName(row.stockName, row.stockDate)}
                                </p>
                                {row.size && <Bdg label={row.size} color="blue" />}
                              </div>
                              {row.stockDate && row.stockDate !== "—" && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{row.stockDate}</p>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${statusConfig.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${statusConfig.dot}`} />
                                {row.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-xs">
                              <div className="font-semibold text-slate-800">
                                Rec: <span className={row.recordedBags !== row.expectedBags ? "font-bold text-red-600" : ""}>{row.recordedBags}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                Exp: <span className="font-bold text-slate-900">{row.expectedBags}</span> bag{row.expectedBags !== 1 ? "s" : ""}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs">
                              <div className="font-semibold text-slate-800">
                                {row.recordedRemaining !== null ? (
                                  <>
                                    Rec: <span className={Math.abs(row.recordedRemaining - row.expectedRemaining) > 0.05 ? "font-bold text-red-600" : ""}>{row.recordedRemaining} kg</span>
                                    <span className="text-slate-400 mx-1">/</span>
                                    Exp: <span className="font-bold text-slate-900">{row.expectedRemaining} kg</span>
                                  </>
                                ) : (
                                  <>
                                    Rec: <span className="font-bold text-red-600">None</span>
                                    <span className="text-slate-400 mx-1">/</span>
                                    Exp: <span className="font-bold text-slate-900">{row.expectedRemaining} kg</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-600">
                              <div className="flex items-center justify-between gap-2">
                                <p className="leading-snug">{row.reason}</p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMismatchClick(row);
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                                  title="Tap to Fix"
                                >
                                  Tap to Fix →
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Isolated Cards View */}
          <div className="md:hidden space-y-3">
            {mismatchRows.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                No mismatches for {selDate}
              </div>
            ) : (
              mismatchRows.map(row => {
                const statusConfig = {
                  "Not Opened": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500", border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/15" },
                  "Bag Mismatch": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500", border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/15" },
                  "Remaining Mismatch": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500", border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/15" },
                  "Multiple Mismatches": { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500", border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/15" },
                }[row.status] || { bg: "bg-red-50 text-red-700 border-red-200/80", dot: "bg-red-500", border: "border-red-300 ring-1 ring-red-200/60 bg-red-50/15" };

                return (
                  <div key={row.stockKey} onClick={() => handleMismatchClick(row)} className={`bg-white border-2 rounded-2xl p-4 shadow-xs space-y-3 cursor-pointer hover:shadow-md active:scale-[0.99] transition-all ${statusConfig.border}`} title="Tap to view and update in Bags Opened">
                    <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {getStockDisplayName(row.stockName, row.stockDate)}
                          </h3>
                          {row.size && <Bdg label={row.size} color="blue" />}
                        </div>
                        {row.stockDate && row.stockDate !== "—" && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{row.stockDate}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border shrink-0 ${statusConfig.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${statusConfig.dot}`} />
                        {row.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Bags Opened</span>
                        <p className="font-semibold text-slate-800">
                          Rec: <span className={row.recordedBags !== row.expectedBags ? "font-bold text-red-600" : ""}>{row.recordedBags}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          Exp: <span className="font-bold text-slate-900">{row.expectedBags}</span>
                        </p>
                      </div>
                      <div className="bg-white/80 rounded-lg p-2 border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Leftover Feed</span>
                        <p className="font-semibold text-slate-800">
                          {row.recordedRemaining !== null ? (
                            <>
                              Rec: <span className={Math.abs(row.recordedRemaining - row.expectedRemaining) > 0.05 ? "font-bold text-red-600" : ""}>{row.recordedRemaining}kg</span>
                              <span className="text-slate-400 mx-1">/</span>
                              Exp: <span className="font-bold text-slate-900">{row.expectedRemaining}kg</span>
                            </>
                          ) : (
                            <>
                              Rec: <span className="font-bold text-red-600">None</span>
                              <span className="text-slate-400 mx-1">/</span>
                              Exp: <span className="font-bold text-slate-900">{row.expectedRemaining}kg</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100/80 text-xs text-slate-600 flex items-center justify-between gap-2">
                      <p className="leading-snug">{row.reason}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMismatchClick(row);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
                        title="Tap to Fix"
                      >
                        Tap to Fix →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}










      {showLog && (() => {
        const bulkDateLabel = toDateLabel(bulkDate);
        const bulkDatePonds = getPondsActiveOnDate(bulkDate);

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-6" onClick={e => e.target === e.currentTarget && setShowLog(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden h-[90vh] max-h-[90dvh]">
              <div className="flex items-start justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white shrink-0 z-30 shadow-xs">
                <div className="min-w-0 flex-1 mr-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Feeding</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Record or update feeding for stocks active on <span className="font-semibold text-slate-800">{bulkDateLabel}</span>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold shadow-2xs">
                        <Calendar size={13} className="text-teal-600 shrink-0" />
                        <span>{bulkDateLabel || bulkDate}</span>
                      </div>
                      {/* Mobile Table / Card Toggle (Mobile Only) */}
                      <div className="flex md:hidden items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                        <button
                          type="button"
                          onClick={() => setBulkMobileView("table")}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all ${bulkMobileView === "table"
                              ? "bg-white text-green-700 font-bold shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-800 font-medium"
                            }`}
                        >
                          Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkMobileView("card")}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all ${bulkMobileView === "card"
                              ? "bg-white text-green-700 font-bold shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-800 font-medium"
                            }`}
                        >
                          Cards
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowLog(false)} className="text-slate-400 hover:text-slate-700 p-1 shrink-0 rounded-lg hover:bg-slate-100 transition-colors"><X size={20} /></button>
              </div>

              {/* Modal scrollable body - single overflow-auto container for seamless vertical + horizontal scrolling */}
              <div className="flex-1 min-h-0 overflow-auto bg-slate-50">
                {/* Desktop Table or Mobile Table View */}
                <div className={bulkMobileView === "card" ? "hidden md:block min-w-full" : "min-w-full"}>
                  <table className="w-full text-sm border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr className="bg-slate-100">
                        <th className="w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center sticky top-0 left-0 z-20 bg-slate-100 border-b border-slate-200">#</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left min-w-[130px] max-w-[170px] sticky top-0 left-[48px] z-20 bg-slate-100 border-b border-r border-slate-200">Pond / Stock</th>
                        {logColOrder.map(col => {
                          let label = "";
                          let align = "text-left";
                          let minW = "min-w-[95px]";
                          switch (col) {
                            case "size": label = "Pellet Size"; align = "text-left"; minW = "min-w-[130px]"; break;
                            case "morning": label = "Morning (kg)"; align = "text-left"; minW = "min-w-[105px]"; break;
                            case "morningTime": label = "AM Time"; align = "text-left"; minW = "min-w-[95px]"; break;
                            case "evening": label = "Evening (kg)"; align = "text-left"; minW = "min-w-[105px]"; break;
                            case "eveningTime": label = "PM Time"; align = "text-left"; minW = "min-w-[95px]"; break;
                            case "total": label = "Total"; align = "text-center"; minW = "min-w-[85px]"; break;
                          }
                          return (
                            <th
                              key={col}
                              draggable
                              onDragStart={e => { e.stopPropagation(); setDraggedLogCol(col); }}
                              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                              onDrop={e => { e.preventDefault(); e.stopPropagation(); handleColDrop(col); }}
                              className={`sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${align} ${minW} whitespace-nowrap cursor-grab active:cursor-grabbing hover:bg-slate-200/80 transition-colors select-none`}
                              title="Drag column to reorder"
                            >
                              <div className={`flex items-center gap-1 ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : "justify-start"}`}>
                                <span>{label}</span>
                              </div>
                            </th>
                          );
                        })}
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center border-b border-slate-200 min-w-[125px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {bulkRows.map((row, i) => {
                        const m = Number(row.morning) || 0; const e = Number(row.evening) || 0; const total = m + e;
                        const hasFeed = m > 0 || e > 0;
                        const pondObj = bulkDatePonds.find(p => p.id === row.pondId || p.name === row.pondName) || ponds.find(p => p.id === row.pondId || p.name === row.pondName);
                        const rowMaxKg = pondObj?.maxKgByPallet?.[row.size];
                        const cumFed = (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pondObj?.id : r.pond === row.pondName) && r.size === row.size && ((pondObj as any)?.fishStockId ? r.fishStockId === (pondObj as any).fishStockId : (!pondObj?.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pondObj.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0);
                        const rowAtMax = !!rowMaxKg && cumFed >= rowMaxKg;
                        return (
                          <tr key={row.rowId} data-bulk-row-id={row.rowId} className={`transition-colors ${hasFeed ? "bg-green-50/40" : "hover:bg-slate-50/80"}`}>
                            <td className={`w-12 min-w-[48px] max-w-[48px] px-2 py-3 text-slate-400 text-xs font-mono text-center sticky left-0 z-10 border-b border-slate-100 ${hasFeed ? "bg-[#f2faf4]" : "bg-white"}`}>{i + 1}</td>
                            <td
                              className={`px-3 py-2.5 min-w-[130px] max-w-[170px] sticky left-[48px] z-10 border-b border-r border-slate-200 select-none cursor-pointer group ${hasFeed ? "bg-[#f2faf4]" : "bg-white"}`}
                              onMouseDown={() => handlePondSectionMouseDown(row)}
                              onMouseUp={handlePondSectionMouseUp}
                              onMouseLeave={handlePondSectionMouseUp}
                              onTouchStart={() => handlePondSectionMouseDown(row)}
                              onTouchEnd={handlePondSectionMouseUp}
                              onTouchCancel={handlePondSectionMouseUp}
                              onContextMenu={e => handlePondSectionContextMenu(e, row)}
                              title="Long-press or click + to add another pallet for this stock"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-bold text-slate-900 leading-tight truncate" title={row.pondName}>
                                  {row.pondName}
                                  {row.isExtraPallet && (
                                    <span className="ml-1 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800">
                                      P{row.palletNumber || 2}
                                    </span>
                                  )}
                                </p>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setPalletPondModal({
                                        pondId: row.pondId,
                                        pondName: row.pondName,
                                        fishStock: row.fishStock,
                                        stockDate: row.stockDate,
                                        rowId: row.rowId,
                                        isExtra: row.isExtraPallet,
                                        palletNumber: row.palletNumber
                                      });
                                    }}
                                    className="p-0.5 rounded text-teal-600 hover:bg-teal-50 transition-colors"
                                    title="Pallet Options (Add Another Pallet)"
                                  >
                                    <Plus size={13} className="stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
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
                                    <td key={col} className="px-2.5 py-2.5 border-b border-slate-100 bg-transparent">
                                      <select
                                        value={availablePelletSizes.some(s => isSamePelletSize(s, row.size)) ? (availablePelletSizes.find(s => isSamePelletSize(s, row.size)) || row.size) : ""}
                                        onChange={e => updateRow(row.rowId, "size", e.target.value)}
                                        className={TS}
                                      >
                                        {availablePelletSizes.length === 0 && (
                                          <option value="">No active feed stock</option>
                                        )}
                                        {availablePelletSizes.length > 0 && !availablePelletSizes.some(s => isSamePelletSize(s, row.size)) && (
                                          <option value="">Select pallet…</option>
                                        )}
                                        {availablePelletSizes.map(s => {
                                          const stock = getPelletStock(s);
                                          const bagCount = stock.inStockBags || 0;
                                          const label = `${s} (${bagCount} bag${bagCount !== 1 ? "s" : ""} available)`;
                                          return <option key={s} value={s}>{label}</option>;
                                        })}
                                      </select>
                                      {rowAtMax && <p className="text-[10px] font-bold mt-0.5 text-red-600">⚠ Max weight reached</p>}
                                    </td>
                                  );
                                case "morning":
                                  return (
                                    <td key={col} className="px-2 py-2.5 border-b border-slate-100 bg-transparent">
                                      <input type="number" value={row.morning} onChange={e => updateRow(row.rowId, "morning", e.target.value)} className={TI} placeholder="0" min="0" step="0.5" />
                                    </td>
                                  );
                                case "morningTime":
                                  return (
                                    <td key={col} className="px-2 py-2.5 border-b border-slate-100 bg-transparent">
                                      <input type="time" value={row.morningTime} onChange={e => updateRow(row.rowId, "morningTime", e.target.value)} className={`${TI} text-xs`} style={{ colorScheme: "light" }} />
                                    </td>
                                  );
                                case "evening":
                                  return (
                                    <td key={col} className="px-2 py-2.5 border-b border-slate-100 bg-transparent">
                                      <input type="number" value={row.evening} onChange={e => updateRow(row.rowId, "evening", e.target.value)} className={TI} placeholder="0" min="0" step="0.5" />
                                    </td>
                                  );
                                case "eveningTime":
                                  return (
                                    <td key={col} className="px-2 py-2.5 border-b border-slate-100 bg-transparent">
                                      <input type="time" value={row.eveningTime} onChange={e => updateRow(row.rowId, "eveningTime", e.target.value)} className={`${TI} text-xs`} style={{ colorScheme: "light" }} />
                                    </td>
                                  );
                                case "total":
                                  return (
                                    <td key={col} className="px-3 py-3 text-center border-b border-slate-100 bg-transparent">
                                      {total > 0 ? <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-green-100 text-green-800 font-bold text-sm font-['Barlow_Condensed',sans-serif]">{total}kg</span> : <span className="text-slate-300 text-xs">—</span>}
                                    </td>
                                  );
                                default:
                                  return null;
                              }
                            })}
                            <td className="px-3 py-2.5 text-center border-b border-slate-100 bg-transparent">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={savingRowId === row.rowId}
                                  onClick={() => handleSaveSingleRow(row)}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${row.existingRecordId
                                      ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 shadow-2xs"
                                      : "bg-green-600 hover:bg-green-700 text-white shadow-xs"
                                    }`}
                                  title={row.existingRecordId ? "Update saved feeding record" : "Save this fish stock record"}
                                >
                                  {savingRowId === row.rowId ? "Saving..." : (row.existingRecordId ? "Update" : "Save")}
                                </button>
                                {row.isExtraPallet && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveExtraPallet(row.rowId)}
                                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Remove extra pallet"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {bulkRows.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                          <td colSpan={logColOrder.length + 2} className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Grand Total</td>
                          <td className="px-3 py-3 text-center"><span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-600 text-white font-bold text-sm font-['Barlow_Condensed',sans-serif]">{grandTotal}kg</span></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Mobile Card View (Mobile Only when Card toggle selected) */}
                {bulkMobileView === "card" && (
                  <div className="md:hidden p-3 space-y-3">
                    {bulkRows.map((row, i) => {
                      const m = Number(row.morning) || 0;
                      const e = Number(row.evening) || 0;
                      const total = m + e;
                      const hasFeed = m > 0 || e > 0;
                      const pondObj = bulkDatePonds.find(p => p.id === row.pondId || p.name === row.pondName) || ponds.find(p => p.id === row.pondId || p.name === row.pondName);
                      const rowMaxKg = pondObj?.maxKgByPallet?.[row.size];
                      const cumFed = (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pondObj?.id : r.pond === row.pondName) && r.size === row.size && ((pondObj as any)?.fishStockId ? r.fishStockId === (pondObj as any).fishStockId : (!pondObj?.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pondObj.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0);
                      const rowAtMax = !!rowMaxKg && cumFed >= rowMaxKg;

                      return (
                        <div
                          key={row.rowId}
                          data-bulk-row-id={row.rowId}
                          className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all ${hasFeed ? "border-green-300 bg-green-50/20 ring-1 ring-green-200/50" : "border-slate-200/80"
                            }`}
                        >
                          {/* Card Header: Pond Name + Fish Count + Total badge */}
                          <div
                            className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 cursor-pointer select-none"
                            onMouseDown={() => handlePondSectionMouseDown(row)}
                            onMouseUp={handlePondSectionMouseUp}
                            onTouchStart={() => handlePondSectionMouseDown(row)}
                            onTouchEnd={handlePondSectionMouseUp}
                            onTouchCancel={handlePondSectionMouseUp}
                            onContextMenu={e => handlePondSectionContextMenu(e, row)}
                            title="Long-press to open Pallet Options"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center font-mono">
                                  {i + 1}
                                </span>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5 flex-wrap">
                                  {row.pondName}
                                  {row.isExtraPallet && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                      Pallet {row.palletNumber || 2}
                                    </span>
                                  )}
                                </h3>
                              </div>
                              {row.stockDate && row.stockDate !== "—" ? (
                                <p className="text-[11px] font-medium text-teal-700 mt-0.5 ml-6.5">Stocked: {row.stockDate}</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 mt-0.5 ml-6.5">{row.fishStock || "No stock"}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setPalletPondModal({
                                    pondId: row.pondId,
                                    pondName: row.pondName,
                                    fishStock: row.fishStock,
                                    stockDate: row.stockDate,
                                    rowId: row.rowId,
                                    isExtra: row.isExtraPallet,
                                    palletNumber: row.palletNumber
                                  });
                                }}
                                className="p-1 px-2 rounded-lg text-teal-700 bg-teal-50 border border-teal-200 text-[11px] font-bold flex items-center gap-1"
                                title="Pallet options"
                              >
                                <Plus size={12} /> Pallet
                              </button>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-['Barlow_Condensed',sans-serif] ${total > 0 ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400"
                                }`}>
                                {total > 0 ? `${total} kg` : "0 kg"}
                              </span>
                            </div>
                          </div>

                          {/* Pellet Size Selection */}
                          <div className="mt-2.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pellet Size</label>
                            <select
                              value={availablePelletSizes.some(s => isSamePelletSize(s, row.size)) ? (availablePelletSizes.find(s => isSamePelletSize(s, row.size)) || row.size) : ""}
                              onChange={ev => updateRow(row.rowId, "size", ev.target.value)}
                              className={`${TS} text-xs py-1.5`}
                            >
                              {availablePelletSizes.length === 0 && (
                                <option value="">No active feed stock</option>
                              )}
                              {availablePelletSizes.length > 0 && !availablePelletSizes.some(s => isSamePelletSize(s, row.size)) && (
                                <option value="">Select pallet…</option>
                              )}
                              {availablePelletSizes.map(s => {
                                const stock = getPelletStock(s);
                                const bagCount = stock.inStockBags || 0;
                                const label = `${s} (${bagCount} bag${bagCount !== 1 ? "s" : ""} available)`;
                                return <option key={s} value={s}>{label}</option>;
                              })}
                            </select>
                            {rowAtMax && <p className="text-[10px] font-bold mt-0.5 text-red-600">⚠ Max weight reached for this size</p>}
                          </div>

                          {/* Morning & Evening Inputs */}
                          <div className="grid grid-cols-2 gap-2 mt-2.5">
                            {/* Morning */}
                            <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Morning (kg)</span>
                              <input
                                type="number"
                                value={row.morning}
                                onChange={ev => updateRow(row.rowId, "morning", ev.target.value)}
                                className={`${TI} text-xs py-1.5`}
                                placeholder="0"
                                min="0"
                                step="0.5"
                              />
                              <input
                                type="time"
                                value={row.morningTime}
                                onChange={ev => updateRow(row.rowId, "morningTime", ev.target.value)}
                                className={`${TI} text-[11px] py-1 mt-1`}
                                style={{ colorScheme: "light" }}
                              />
                            </div>

                            {/* Evening */}
                            <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Evening (kg)</span>
                              <input
                                type="number"
                                value={row.evening}
                                onChange={ev => updateRow(row.rowId, "evening", ev.target.value)}
                                className={`${TI} text-xs py-1.5`}
                                placeholder="0"
                                min="0"
                                step="0.5"
                              />
                              <input
                                type="time"
                                value={row.eveningTime}
                                onChange={ev => updateRow(row.rowId, "eveningTime", ev.target.value)}
                                className={`${TI} text-[11px] py-1 mt-1`}
                                style={{ colorScheme: "light" }}
                              />
                            </div>
                          </div>

                          {/* Mobile Card Action Buttons */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                            {row.isExtraPallet ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveExtraPallet(row.rowId)}
                                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 text-xs"
                                title="Remove extra pallet"
                              >
                                <Trash2 size={13} />
                                <span className="text-[11px]">Remove Pallet</span>
                              </button>
                            ) : <div />}
                            <button
                              type="button"
                              disabled={savingFeed || savingRowId === row.rowId || (Number(row.morning) || 0) + (Number(row.evening) || 0) <= 0}
                              onClick={() => handleSaveSingleRow(row)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${(Number(row.morning) || 0) + (Number(row.evening) || 0) > 0
                                  ? row.existingRecordId
                                    ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                                    : "bg-teal-600 text-white shadow-xs hover:bg-teal-700"
                                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                            >
                              <CheckCircle size={13} />
                              {savingRowId === row.rowId ? "Saving..." : (row.existingRecordId ? "Update Record" : "Save Record")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl z-30">
                <div>
                  <p className="text-sm font-semibold text-slate-700"><span className="text-green-600">{filledCount}</span> of {bulkRows.length} entry{bulkRows.length !== 1 ? "ies" : "y"} filled</p>
                  <p className="text-xs text-slate-400 mt-0.5">Save individual fish stocks above or save all filled entries together</p>
                  {feedErr.amounts && <p className="text-xs text-red-500 mt-1">{feedErr.amounts}</p>}
                  {feedErr.date && <p className="text-xs text-red-500 mt-1">{feedErr.date}</p>}
                </div>
                <div className="flex gap-3">
                  <button disabled={savingFeed} onClick={() => { setShowLog(false); setFeedErr({}); }} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-semibold transition-colors disabled:opacity-50">Done</button>
                  <PBtn disabled={savingFeed || filledCount === 0} onClick={handleSaveAll}>
                    {savingFeed ? (
                      <span className="flex items-center gap-2">Saving...</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><CheckCircle size={15} /> Save All {filledCount > 0 ? `(${filledCount})` : ""}</span>
                    )}
                  </PBtn>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Pallet Options Modal (Long-Press / + Pallet) ── */}
      {palletPondModal && (
        <div className="fixed inset-0 bg-slate-950/60 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setPalletPondModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                    Pallet Options — {palletPondModal.pondName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {palletPondModal.fishStock || "Fish Stock"} · {toDateLabel(bulkDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPalletPondModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Active Pallets for this Pond on this Day */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Logged Feed Sizes on {toDateLabel(bulkDate)}
                </span>
                <div className="space-y-1.5">
                  {bulkRows.filter(r => r.pondId === palletPondModal.pondId).map((r, idx) => {
                    const totalKg = (Number(r.morning) || 0) + (Number(r.evening) || 0);
                    return (
                      <div key={r.rowId} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800">{r.size}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-teal-800 font-['Barlow_Condensed',sans-serif] text-sm">
                            {totalKg > 0 ? `${totalKg} kg` : "0 kg"}
                          </span>
                          {r.isExtraPallet && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraPallet(r.rowId)}
                              className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 text-[11px]"
                              title="Remove this pallet entry"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action: Add Another Pallet */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddAnotherPallet(palletPondModal.pondId)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all hover:shadow-md cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Add Another Pallet</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  Record feeding for an additional feed size (e.g. 3mm to 4mm transition) for this fish stock on the same day.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setPalletPondModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Opened Bags & Leftover Feed / Daily Feed Balance Modal ── */}
      {showBagsModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && (setShowBagsModal(false), setBagsModalLockedStock(null))}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh]">
            <div className="flex items-start justify-between px-4 sm:px-5 py-3 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  {bagsModalLockedStock ? "Daily Feed Balance" : "Log Opened Bags & Leftover Feed"}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {bagsModalLockedStock
                    ? "Record one or more feed brands, quantities used, and leftovers for this fish stock."
                    : "Record bags opened, feed used, and leftover feed per Fish Stock."}
                </p>
              </div>
              <button onClick={() => { setShowBagsModal(false); setBagsModalLockedStock(null); }} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date:</span>
                <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                  {toDateLabel(bagsDate) || bagsDate}
                </span>
                {bagsModalLockedStock && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {getStockDisplayName(bagsModalLockedStock)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-500 font-medium">{bagRows.length} {bagRows.length === 1 ? "entry" : "entries"}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3 space-y-3">
              {bagRows.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No entries logged for {toDateLabel(bagsDate) || bagsDate}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">You have not logged any feed balance entries for this date.</p>
                  <button
                    type="button"
                    onClick={addBagRow}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus size={13} /> Add Entry
                  </button>
                </div>
              ) : (
                bagRows.map((row, i) => {
                  const avail = getStockAvailable(row.brand, row.size, row.id);
                  const requestedBags = Number(row.qty) || 0;
                  const requestedKg = requestedBags * row.kgPerBag;
                  const isOverStock = requestedBags > avail.remainingBags;
                  const rowNormFs = normalizeFishStock(row.fishStock, bagsDate).toLowerCase().trim();
                  const isSiblingBrandRow = !bagsModalLockedStock && Boolean(rowNormFs) && bagRows.findIndex((other, idx) =>
                    idx < i && normalizeFishStock(other.fishStock, bagsDate).toLowerCase().trim() === rowNormFs
                  ) !== -1;
                  const isLastOfSameStock = Boolean(rowNormFs) && !bagRows.slice(i + 1).some(other =>
                    normalizeFishStock(other.fishStock, bagsDate).toLowerCase().trim() === rowNormFs
                  );

                  return (
                    <div key={i} className={`p-3 border rounded-xl relative space-y-2.5 ${isOverStock ? "border-red-300 bg-red-50/50" : "border-slate-200/90 bg-slate-50/90"}`}>
                      {bagRows.length > 1 && (
                        <button type="button" onClick={() => removeBagRow(i)} className="absolute top-2.5 right-2.5 p-1 rounded text-slate-300 hover:text-red-500 transition-colors" title="Remove entry">
                          <X size={13} />
                        </button>
                      )}

                      {/* Fish Stock (hidden when already locked or sibling brand entry for the same fish stock) */}
                      {bagsModalLockedStock ? (
                        <div className="flex items-center justify-between pr-6">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Brand Entry #{i + 1}
                          </span>
                        </div>
                      ) : isSiblingBrandRow ? (
                        <div className="flex items-center justify-between pr-6">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Additional Brand · {getStockDisplayName(row.fishStock)}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Fish Stock</label>
                          <select
                            value={row.fishStock}
                            onChange={e => {
                              updateBagRow(i, "fishStock", e.target.value);
                              setBagsErr(p => {
                                const next = { ...p };
                                delete next[`fs_${i}`];
                                delete next[`stock_${i}`];
                                delete next[`size_${i}`];
                                delete next[`brand_${i}`];
                                return next;
                              });
                            }}
                            className="w-full text-[11px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400"
                          >
                            <option value="">Select fish stock…</option>
                            {modalFishStockOptions.map(opt => (
                              <option key={opt.name} value={opt.name}>{opt.label}</option>
                            ))}
                          </select>
                          {(bagsErr[`fs_${i}`] || bagsErr[`stock_${i}`]) && (
                            <p className="text-[10px] text-red-500 mt-1">{bagsErr[`fs_${i}`] || bagsErr[`stock_${i}`]}</p>
                          )}
                        </div>
                      )}

                      {/* Pallet Size & Feed Brand (Pallet first, Feed Brand second) */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* 1. Pallet (Pellet Size) */}
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Pallet (Pellet Size)</label>
                          {(() => {
                            const associated = getAssociatedPalletsForStock(row.fishStock, bagsDate);
                            const otherSizes = availablePelletSizes.filter(s => !associated.includes(s));
                            return (
                              <select
                                value={availablePelletSizes.some(s => isSamePelletSize(s, row.size)) ? (availablePelletSizes.find(s => isSamePelletSize(s, row.size)) || row.size) : ""}
                                onChange={e => {
                                  updateBagRow(i, "size", e.target.value);
                                  setBagsErr(p => {
                                    const next = { ...p };
                                    delete next[`dup_${i}`];
                                    delete next[`size_${i}`];
                                    delete next[`brand_${i}`];
                                    return next;
                                  });
                                }}

                                className={`w-full text-[11px] px-2.5 py-1.5 bg-white border rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 h-[34px] ${bagsErr[`size_${i}`] ? "border-red-300 focus:ring-red-300" : "border-slate-200 focus:ring-green-400"}`}
                              >
                                <option value="">{availablePelletSizes.length === 0 ? "No active feed stock" : "Select pallet…"}</option>
                                {associated.length > 0 && (
                                  <optgroup label="Associated Pallets">
                                    {associated.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {otherSizes.length > 0 && (
                                  <optgroup label={associated.length > 0 ? "Other Pallets" : "Available Pallets"}>
                                    {otherSizes.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            );
                          })()}
                          {bagsErr[`size_${i}`] && (
                            <p className="text-[10px] text-red-500 mt-1">{bagsErr[`size_${i}`]}</p>
                          )}
                        </div>

                        {/* 2. Feed Brand (Filtered by selected pallet) */}
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1">Feed Brand</label>
                          {(() => {
                            const matchingBrands = getMatchingBrandsForPallet(row.size);
                            const brandOptions = matchingBrands.length > 0 ? matchingBrands : invBrands;
                            return (
                              <select
                                value={row.brand}
                                onChange={e => {
                                  updateBagRow(i, "brand", e.target.value);
                                  setBagsErr(p => {
                                    const next = { ...p };
                                    delete next[`brand_${i}`];
                                    delete next[`dup_${i}`];
                                    return next;
                                  });
                                }}
                                className={`w-full text-[11px] px-2.5 py-1.5 bg-white border rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 h-[34px] ${bagsErr[`brand_${i}`] ? "border-red-300 focus:ring-red-300" : "border-slate-200 focus:ring-green-400"}`}
                              >
                                <option value="">Select brand…</option>
                                {brandOptions.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                                {row.brand && !brandOptions.includes(row.brand) && (
                                  <option value={row.brand}>{row.brand}</option>
                                )}
                              </select>
                            );
                          })()}
                          {bagsErr[`brand_${i}`] && (
                            <p className="text-[10px] text-red-500 mt-1">{bagsErr[`brand_${i}`]}</p>
                          )}
                        </div>
                      </div>

                      {/* Stock available badge */}
                      <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-[11px] text-slate-500">
                        <span className="text-[10px] uppercase font-medium text-slate-400">Store Stock:</span>
                        <span className={`font-medium ${avail.remainingBags <= 2 ? "text-amber-600" : "text-slate-700"}`}>
                          {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg} kg)
                        </span>
                      </div>

                      {/* Compact Side-by-Side Bags Open & Leftovers (50% / 50% on mobile and desktop) */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Left (50%): Bags Open */}
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-1 min-w-0">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Bags Open</label>
                          <input
                            type="number"
                            min="0"
                            value={row.qty}
                            onChange={e => {
                              updateBagRow(i, "qty", e.target.value);
                              setBagsErr(p => {
                                const next = { ...p };
                                delete next[`qty_${i}`];
                                return next;
                              });
                            }}
                            className={`w-full h-[32px] text-xs px-2 py-1 bg-slate-50/50 border ${isOverStock || bagsErr[`qty_${i}`] ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-green-400"} rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1`}
                            placeholder="0"
                          />
                          {bagsErr[`qty_${i}`] && (
                            <p className="text-[10px] text-red-500 font-semibold leading-tight">{bagsErr[`qty_${i}`]}</p>
                          )}
                          {(() => {
                            const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                            return (
                              <p className="text-[10px] text-slate-500 font-normal leading-tight truncate">
                                Exp:{" "}
                                <span className="text-emerald-700 font-bold">
                                  {exp.expectedBags} bag{exp.expectedBags !== 1 ? "s" : ""}
                                </span>
                                {row.qty !== "" && !isNaN(requestedBags) && requestedBags > 0 && (
                                  <span className="text-slate-500"> · {requestedKg}kg</span>
                                )}
                              </p>
                            );
                          })()}
                          {isOverStock && (
                            <p className="text-[10px] font-normal text-red-500 leading-tight">
                              ⚠ Exceeds store ({avail.remainingBags})
                            </p>
                          )}
                        </div>

                        {/* Right (50%): Leftovers */}
                        <div className="bg-white p-2 rounded-lg border border-slate-200/80 space-y-1 min-w-0">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">Leftovers (kg)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.remainingKg}
                            onChange={e => {
                              updateBagRow(i, "remainingKg", e.target.value);
                              setBagsErr(p => {
                                const next = { ...p };
                                delete next[`rem_${i}`];
                                delete next[`qty_${i}`];
                                return next;
                              });
                            }}
                            className={`w-full h-[32px] text-xs px-2 py-1 bg-slate-50/50 border rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 ${bagsErr[`rem_${i}`] ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-green-400"}`}
                            placeholder="0.0"
                          />
                          {bagsErr[`rem_${i}`] && (
                            <p className="text-[10px] text-red-500 font-semibold leading-tight">{bagsErr[`rem_${i}`]}</p>
                          )}
                          {(() => {
                            const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                            return (
                              <p className="text-[10px] text-slate-500 font-normal leading-tight truncate">
                                Exp:{" "}
                                <span className="text-amber-700 font-bold">
                                  {exp.expectedRemaining} kg
                                </span>
                                {exp.carryover > 0 && <span className="text-slate-400"> ({exp.carryover}kg c/o)</span>}
                              </p>
                            );
                          })()}
                        </div>
                      </div>

                      {(() => {
                        const isDupInForm = Boolean(row.fishStock && row.brand && row.size) && bagRows.findIndex((other, idx) =>
                          idx < i &&
                          normalizeFishStock(other.fishStock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() &&
                          (other.brand || "").toLowerCase().trim() === (row.brand || "").toLowerCase().trim() &&
                          isSamePelletSize(other.size, row.size)
                        ) !== -1;

                        if (isDupInForm || bagsErr[`dup_${i}`]) {
                          return (
                            <div className="flex items-start gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              <span>{bagsErr[`dup_${i}`] || "This stock, brand & pellet size is already entered above."}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Combined multi-brand summary & Add Another Brand button for the same Fish Stock */}
                      {(() => {
                        if (!row.fishStock || !isLastOfSameStock) return null;
                        const sameStockRows = bagRows.filter(other =>
                          normalizeFishStock(other.fishStock, bagsDate).toLowerCase().trim() === rowNormFs
                        );
                        // Group by pellet size when 2+ entries exist for the same stock & size
                        const sizeGroups = new Map<string, { size: string; count: number; totalBags: number; totalLeftover: number }>();
                        sameStockRows.forEach(sr => {
                          if (!sr.size) return;
                          const sk = sr.size.toLowerCase().replace(/\s+/g, "").trim();
                          const ex = sizeGroups.get(sk) || { size: sr.size, count: 0, totalBags: 0, totalLeftover: 0 };
                          ex.count += 1;
                          ex.totalBags = Math.round((ex.totalBags + (Number(sr.qty) || 0)) * 100) / 100;
                          ex.totalLeftover = Math.round((ex.totalLeftover + (Number(sr.remainingKg) || 0)) * 100) / 100;
                          sizeGroups.set(sk, ex);
                        });
                        const multiBrandGroups = Array.from(sizeGroups.values()).filter(g => g.count > 1);
                        return (
                          <div className="space-y-1.5 pt-1">
                            {multiBrandGroups.map(g => (
                              <div key={g.size} className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900">
                                <span className="font-semibold">Combined ({g.size} · {g.count} brands)</span>
                                <span className="font-bold">
                                  Bags: {g.totalBags} · Leftovers: {g.totalLeftover} kg
                                </span>
                              </div>
                            ))}
                            {!bagsModalLockedStock && (
                              <button
                                type="button"
                                onClick={() => addBrandRowForStock(row.fishStock, row.size, i)}
                                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-teal-300 text-teal-700 hover:bg-teal-50/70 text-[11px] font-semibold transition-colors"
                              >
                                <Plus size={12} /> Add Another Brand for {getStockDisplayName(row.fishStock)}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })
              )}
              {bagRows.length > 0 && (
                <button
                  type="button"
                  onClick={addBagRow}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50/70 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus size={14} /> {bagsModalLockedStock ? "Add Another Brand" : "Add Another Stock"}
                </button>
              )}
            </div>
            <div className="shrink-0 sticky bottom-0 bg-slate-50 border-t border-slate-100 px-4 sm:px-5 py-3 rounded-b-2xl flex items-center justify-between z-10">
              <button onClick={() => { setShowBagsModal(false); setBagsModalLockedStock(null); setBagsErr({}); }} className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors">
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
                <select
                  value={availablePelletSizes.some(s => isSamePelletSize(s, editRec.size)) ? (availablePelletSizes.find(s => isSamePelletSize(s, editRec.size)) || editRec.size) : ""}
                  onChange={e => setEditRec(p => p ? { ...p, size: e.target.value } : p)}
                  className={SC}
                >
                  {availablePelletSizes.length === 0 && <option value="">No active feed stock</option>}
                  {availablePelletSizes.length > 0 && !availablePelletSizes.some(s => isSamePelletSize(s, editRec.size)) && (
                    <option value="">Select pallet…</option>
                  )}
                  {availablePelletSizes.map(s => {
                    const stock = getPelletStock(s, editRec.id);
                    const bagCount = stock.inStockBags || 0;
                    const label = `${s} (${bagCount} bag${bagCount !== 1 ? "s" : ""} available)`;
                    return <option key={s} value={s}>{label}</option>;
                  })}
                </select>
                {(() => {
                  const stock = getPelletStock(editRec.size, editRec.id);
                  if (!stock.exists) {
                    return <p className="text-xs font-bold text-amber-600 mt-1">⚠ This pellet size is not in Feed Inventory</p>;
                  }
                  if (stock.inStockBags <= 0 && stock.availableKg <= 0) {
                    return <p className="text-xs font-bold text-red-600 mt-1">⚠ This pellet size is empty (0 bags in stock)</p>;
                  }
                  return <p className="text-xs text-slate-500 mt-1">Stock available: {stock.inStockBags} bag{stock.inStockBags !== 1 ? "s" : ""}{stock.availableKg > 0 ? ` (${Math.round(stock.availableKg * 10) / 10}kg)` : ""}</p>;
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
              {/* Stock Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Stock Date</label>
                <input
                  type="date"
                  value={toValidDbDate(editDocBag.date, viewYear) || dateToIso(editDocBag.date) || TODAY}
                  onChange={e => {
                    const nextIso = e.target.value;
                    if (!nextIso) return;
                    const nextLabel = toDateLabel(nextIso);
                    const parts = nextLabel.split(" ");
                    setEditDocBag(p => p ? { ...p, date: nextLabel, month: parts[0] || p.month, year: Number(parts[2]) || p.year } : p);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>

              {/* Fish Stock */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Fish Stock</label>
                <select
                  value={editDocBag.fishStock}
                  onChange={e => {
                    const v = e.target.value;
                    const associated = getAssociatedPalletsForStock(v, editDocBag.date);
                    let newPallet = editDocBag.size;
                    if (associated.length === 1) {
                      newPallet = associated[0];
                    } else if (associated.length > 1) {
                      newPallet = associated.includes(editDocBag.size) ? editDocBag.size : associated[0];
                    } else {
                      newPallet = "";
                    }
                    const matchingBrands = newPallet ? getMatchingBrandsForPallet(newPallet) : [];
                    let newBrand = "";
                    if (matchingBrands.length === 1) {
                      newBrand = matchingBrands[0];
                    } else if (matchingBrands.length > 1) {
                      newBrand = matchingBrands.includes(editDocBag.brand) ? editDocBag.brand : matchingBrands[0];
                    } else {
                      newBrand = "";
                    }
                    const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, newPallet));
                    const kgPb = inv?.weightPerBag || editDocBag.kgPerBag || 15;
                    setEditDocBag(p => p ? { ...p, fishStock: v, size: newPallet, brand: newBrand, kgPerBag: kgPb, totalKg: p.bagsOpened * kgPb } : p);
                  }}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400"
                >
                  <option value="">Select fish stock…</option>
                  {editModalFishStockOptions.map(opt => (
                    <option key={opt.name} value={opt.name}>{opt.label}</option>
                  ))}
                  {editDocBag.fishStock && !editModalFishStockOptions.some(opt => opt.name === editDocBag.fishStock) && !isPondName(editDocBag.fishStock) && (
                    <option value={editDocBag.fishStock}>{editDocBag.fishStock}</option>
                  )}
                </select>
              </div>

              {/* Pallet Size & Feed Brand (Pallet first, Feed Brand second) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Pallet (Pellet Size) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Pallet (Pellet Size)</label>
                  {(() => {
                    const isManualEdit = Boolean(editDocBag.isManualPrevDayBalance || isManualPrevDayLog(editDocBag));
                    const sizePool = isManualEdit ? allRegisteredSizes : availablePelletSizes;
                    const associated = getAssociatedPalletsForStock(editDocBag.fishStock || "", editDocBag.date);
                    const otherSizes = sizePool.filter(s => !associated.includes(s));
                    const matchedSizeVal = sizePool.find(s => isSamePelletSize(s, editDocBag.size)) || editDocBag.size || "";
                    return (
                      <select
                        value={matchedSizeVal}
                        onChange={e => {
                          const newSize = e.target.value;
                          const matchingBrands = getMatchingBrandsForPallet(newSize);
                          const brandPool = isManualEdit
                            ? (matchingBrands.length > 0 ? matchingBrands : allRegisteredBrands)
                            : (matchingBrands.length > 0 ? matchingBrands : invBrands);
                          let newBrand = editDocBag.brand || "";
                          if (brandPool.length > 0) {
                            newBrand = brandPool.some(b => b.toLowerCase().trim() === (editDocBag.brand || "").toLowerCase().trim()) ? editDocBag.brand : brandPool[0];
                          }
                          const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, newSize));
                          const kgPb = inv?.weightPerBag || editDocBag.kgPerBag || 15;
                          setEditDocBag(p => p ? { ...p, size: newSize, brand: newBrand, kgPerBag: kgPb, totalKg: p.bagsOpened * kgPb } : p);
                        }}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400 h-[34px]"
                      >
                        <option value="">{sizePool.length === 0 ? "No active feed stock" : "Select pallet…"}</option>
                        {associated.length > 0 && (
                          <optgroup label="Associated Pallets">
                            {associated.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        )}
                        {otherSizes.length > 0 && (
                          <optgroup label={associated.length > 0 ? "Other Pallets" : "Available Pallets"}>
                            {otherSizes.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </optgroup>
                        )}
                        {editDocBag.size && !sizePool.some(s => isSamePelletSize(s, editDocBag.size)) && (
                          <option value={editDocBag.size}>{editDocBag.size}</option>
                        )}
                      </select>
                    );
                  })()}
                </div>

                {/* 2. Feed Brand */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Feed Brand</label>
                  {(() => {
                    const isManualEdit = Boolean(editDocBag.isManualPrevDayBalance || isManualPrevDayLog(editDocBag));
                    const matchingBrands = getMatchingBrandsForPallet(editDocBag.size);
                    const brandOptions = isManualEdit
                      ? allRegisteredBrands
                      : (matchingBrands.length > 0 ? matchingBrands : invBrands);
                    return (
                      <select
                        value={editDocBag.brand}
                        onChange={e => {
                          const newBrand = e.target.value;
                          const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, editDocBag.size));
                          const kgPb = inv?.weightPerBag || editDocBag.kgPerBag || 15;
                          setEditDocBag(p => p ? { ...p, brand: newBrand, kgPerBag: kgPb, totalKg: p.bagsOpened * kgPb } : p);
                        }}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400 h-[34px]"
                      >
                        {!editDocBag.brand && <option value="">Select brand…</option>}
                        {brandOptions.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                        {editDocBag.brand && !brandOptions.includes(editDocBag.brand) && (
                          <option value={editDocBag.brand}>{editDocBag.brand}</option>
                        )}
                      </select>
                    );
                  })()}
                </div>
              </div>

              {/* Store Stock badge */}
              {(() => {
                const avail = getStockAvailable(editDocBag.brand, editDocBag.size, editDocBag.id);
                return (
                  <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Store Stock Available:</span>
                    <span className={`font-semibold ${avail.remainingBags <= 2 ? "text-amber-700" : "text-slate-800"}`}>
                      {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg} kg)
                    </span>
                  </div>
                );
              })()}

              {/* Bags Opened */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Bags Opened</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <NumInput
                      value={editDocBag.bagsOpened}
                      onChange={v => {
                        const num = Number(v) || 0;
                        setEditDocBag(p => p ? { ...p, bagsOpened: num, totalKg: num * p.kgPerBag } : p);
                      }}
                      className={IC}
                      allowDecimal={false}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg h-[34px]">
                      <span className="text-slate-400">Total Deducted:</span>
                      <strong className="text-green-700">{editDocBag.bagsOpened * editDocBag.kgPerBag} kg</strong>
                    </div>
                  </div>
                </div>
                {(() => {
                  const exp = getExpectedFeedData(editDocBag.date, editDocBag.fishStock || "", editDocBag.brand, editDocBag.size, editDocBag.bagsOpened);
                  return (
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[10px] text-slate-500 font-normal leading-tight">
                        Expected Bags Open: <span className="text-emerald-700 font-bold">{exp.expectedBags} bag{exp.expectedBags !== 1 ? "s" : ""}</span>
                        {exp.hasFed && <span className="text-slate-400"> ({exp.totalFed} kg fed)</span>}
                        {editDocBag.bagsOpened > 0 && <span className="text-slate-500"> · {editDocBag.bagsOpened * editDocBag.kgPerBag} kg</span>}
                      </p>
                      {!exp.hasFed && (
                        <p className="text-[9px] text-slate-400 leading-tight">No feeding logged on {toDateLabel(editDocBag.date)}</p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Remaining Leftover Feed */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Leftover Feed (kg)</label>
                <div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editBagRemainKg}
                    onChange={e => setEditBagRemainKg(e.target.value)}
                    placeholder="0.0"
                    className={IC}
                  />
                  {(() => {
                    const exp = getExpectedFeedData(editDocBag.date, editDocBag.fishStock || "", editDocBag.brand, editDocBag.size, editDocBag.bagsOpened);
                    return (
                      <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                        Expected Leftover: <span className="text-amber-700 font-bold">{exp.expectedRemaining} kg</span>
                        {exp.carryover > 0 && <span className="text-slate-400"> ({exp.carryover}kg carryover)</span>}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between rounded-b-2xl">
              <button disabled={isSavingEditDocBag} onClick={() => setEditDocBag(null)} className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors">Cancel</button>
              <PBtn onClick={handleSaveEditDocBag} disabled={isSavingEditDocBag} sm><CheckCircle size={14} /> {isSavingEditDocBag ? "Saving..." : "Save Changes"}</PBtn>
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Feed Remaining from Previous Day</p>
                  <p className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">{viewBagDetail.carryoverKg !== undefined ? `${viewBagDetail.carryoverKg} kg` : "0 kg"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Bags Opened Today</p>
                  <p className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">{viewBagDetail.bagsOpened} bag{viewBagDetail.bagsOpened !== 1 ? "s" : ""}</p>
                  {viewBagDetail.usedKgToday !== undefined && viewBagDetail.usedKgToday > 0 && (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Used: {viewBagDetail.usedKgToday} kg</p>
                  )}
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 mb-0.5">Feed Remaining Today</p>
                  <p className="text-base font-bold text-amber-800 font-['Barlow_Condensed',sans-serif]">
                    {(() => {
                      const remToDisplay = viewBagDetail.hasRemainLog && viewBagDetail.feedRemainingToday !== null && viewBagDetail.feedRemainingToday !== undefined
                        ? viewBagDetail.feedRemainingToday
                        : (viewBagDetail.feedRemainingToday !== null && viewBagDetail.feedRemainingToday !== undefined ? viewBagDetail.feedRemainingToday : (viewBagDetail.availableRemainingKg ?? 0));
                      return `${remToDisplay} kg`;
                    })()}
                  </p>
                </div>
              </div>

              {/* ── Remaining Feed Transfer Details (Section 8, 9, 11) ── */}
              {((viewBagDetail.transfersOut && viewBagDetail.transfersOut.length > 0) || (viewBagDetail.transfersIn && viewBagDetail.transfersIn.length > 0)) && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
                      <ArrowRightLeft size={12} className="text-teal-600" /> Transfer Records & Traceability
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const targetStock = viewBagDetail.fishStock;
                        setViewBagDetail(null);
                        setHistoryStockFilter(targetStock);
                        setIsTransferHistoryOpen(true);
                      }}
                      className="text-[10px] text-teal-700 hover:text-teal-800 font-semibold"
                    >
                      View Full Audit Trail
                    </button>
                  </div>

                  {/* Outgoing Transfers */}
                  {viewBagDetail.transfersOut?.map(t => {
                    const usage = getTransferUsage(t);
                    return (
                      <div key={t.id} className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-semibold text-teal-900 flex items-center gap-1">
                            <ArrowRight size={11} className="text-teal-600" /> Transferred {t.quantityKg} kg → {formatFishStock(t.destinationStock)}
                          </span>
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-full">
                            {viewBagDetail.availableRemainingKg === 0 ? "Remaining Feed Transferred" : "Partially Transferred"}
                          </span>
                        </div>
                        <div className="text-[10px] text-teal-700 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Transfer Date: {t.transferDate}</span>
                          {t.originalDate !== t.transferDate && <span>Orig Date: {t.originalDate}</span>}
                          <span>By: {t.transferredBy || "Staff"}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Incoming Transfers */}
                  {viewBagDetail.transfersIn?.map(t => {
                    const usage = getTransferUsage(t);
                    return (
                      <div key={t.id} className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-semibold text-blue-900 flex items-center gap-1">
                            <Package size={11} className="text-blue-600" /> Received {t.quantityKg} kg from {formatFishStock(t.sourceStock)}
                          </span>
                          {usage.statusLabel ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${usage.isFullyConsumed
                                ? "bg-slate-100 text-slate-700"
                                : "bg-amber-100 text-amber-800"
                              }`}>
                              {usage.statusLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-blue-700 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span>Available: {usage.remainingKg} kg</span>
                          <span>Consumed: {usage.consumedKg} kg</span>
                          <span>Transferred: {t.transferDate}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-2">
              <button onClick={() => setViewBagDetail(null)} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">Close</button>
              <div className="flex items-center gap-2">
                {canEdit && (viewBagDetail.availableRemainingKg ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const rowToTransfer = viewBagDetail;
                      setViewBagDetail(null);
                      openTransferModal(rowToTransfer);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    <ArrowRightLeft size={13} /> Transfer Remaining ({viewBagDetail.availableRemainingKg} kg)
                  </button>
                )}
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
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pond</p>
                <p className="text-base font-bold text-slate-900">{viewFeedRec.pond}</p>
              </div>

              {/* Explicit distinction: Feeding Record Date vs Fish Stock Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Feeding Record Date (Date Fish Fed) */}
                <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/90 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar size={16} className="text-blue-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-blue-700 font-bold mb-0.5">Feeding Record Date</p>
                    <p className="text-sm font-bold text-blue-950 truncate">{viewFeedRec.date}</p>
                    <p className="text-[10px] text-blue-600/90 mt-0.5">Date fish were fed</p>
                  </div>
                </div>

                {/* Fish Stock Date (Stocking Date) */}
                {(() => {
                  const modalStockDate = viewFeedRec.fishStock && formatFishStockDate(viewFeedRec.fishStock) !== "—"
                    ? formatFishStockDate(viewFeedRec.fishStock)
                    : (pondToStockDate(viewFeedRec.pond) !== "—"
                      ? pondToStockDate(viewFeedRec.pond)
                      : "—");
                  const fsName = pondToStock(viewFeedRec.pond);
                  return (
                    <div className="bg-teal-50/90 border border-teal-200 rounded-xl p-3 flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-100/90 flex items-center justify-center shrink-0 mt-0.5">
                        <Fish size={16} className="text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-teal-700 font-bold mb-0.5">Fish Stock Date</p>
                        <p className="text-sm font-bold text-teal-950 truncate">{modalStockDate !== "—" ? modalStockDate : "Not Specified"}</p>
                        <p className="text-[10px] text-teal-600/90 mt-0.5 truncate">{fsName && fsName !== "General Stock" ? fsName : "Stocking Date of Batch"}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Pellet Size</p>
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

      {/* ── Transfer Remaining Feed Pop-up Modal ── */}
      {transferModalOpen && selectedTransferRow && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={e => e.target === e.currentTarget && !isSubmittingTransfer && setTransferModalOpen(false)}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg flex flex-col overflow-hidden max-h-[92vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-3 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] leading-tight">
                    Transfer Remaining Feed
                  </h2>
                  <p className="text-[11px] text-slate-500">Move leftover feed to another fish stock</p>
                </div>
              </div>
              <button
                onClick={() => !isSubmittingTransfer && setTransferModalOpen(false)}
                disabled={isSubmittingTransfer}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
              {/* Clean Source Summary */}
              {(() => {
                const currentAvail = getAvailableRemainingForTransfer(selectedTransferRow);
                return (
                  <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">From Fish Stock</span>
                      <h4 className="font-bold text-slate-900 text-sm truncate" title={selectedTransferRow.fishStock}>
                        {formatFishStock(selectedTransferRow.fishStock)}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {selectedTransferRow.size} · {selectedTransferRow.brand}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Available</span>
                      <span className="text-base font-bold text-teal-700 font-['Barlow_Condensed',sans-serif]">
                        {currentAvail} kg
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Destination Stock Selection */}
              {(() => {
                const eligibleStocks = stockFilterOptions.filter(s => s.name !== "All" && checkTransferEligibility(s.name, selectedTransferRow).eligible);
                const currentAvail = getAvailableRemainingForTransfer(selectedTransferRow);
                const numQty = parseFloat(transferQty) || 0;

                return (
                  <div className="space-y-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                        To Destination Stock *
                      </label>
                      {eligibleStocks.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <AlertCircle size={14} className="text-amber-600 shrink-0" />
                            <span>No other active fish stocks</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            There are no other active fish stocks available on the farm to receive transferred feed.
                          </p>
                        </div>
                      ) : (
                        <select
                          value={transferDestStock}
                          onChange={e => {
                            setTransferDestStock(e.target.value);
                            setTransferError(null);
                          }}
                          className={`${SC} w-full py-2.5 px-3 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500`}
                        >
                          <option value="">— Select destination stock —</option>
                          {eligibleStocks.map(s => {
                            const isSameAsSource = selectedTransferRow && (isStockMatch(s.name, selectedTransferRow.fishStock) || normalizeFishStock(s.name) === normalizeFishStock(selectedTransferRow.fishStock));
                            return (
                              <option key={s.key} value={s.name}>
                                {isSameAsSource ? `${s.label} (Normal Log Bags Open & Leftover)` : s.label}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    {/* Quantity & Date Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                            Quantity (kg) *
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setTransferQty(String(currentAvail));
                              setTransferError(null);
                            }}
                            className="text-[10px] text-teal-700 hover:text-teal-800 font-semibold cursor-pointer"
                          >
                            All ({currentAvail} kg)
                          </button>
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max={currentAvail}
                          value={transferQty}
                          onChange={e => {
                            setTransferQty(e.target.value);
                            setTransferError(null);
                          }}
                          placeholder={`Max ${currentAvail} kg`}
                          className={`w-full py-2 px-3 text-xs bg-white border ${numQty > currentAvail || (numQty <= 0 && transferQty !== "")
                              ? "border-red-400 focus:ring-red-400"
                              : "border-slate-200 focus:ring-teal-500 focus:border-teal-500"
                            } rounded-xl shadow-2xs text-slate-900 font-semibold focus:outline-none focus:ring-2`}
                        />
                        {numQty > currentAvail && (
                          <p className="text-[10px] text-red-600 mt-1 font-medium">
                            Cannot transfer more than {currentAvail} kg.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Transfer Date
                        </label>
                        <input
                          type="text"
                          value={transferDate}
                          onChange={e => setTransferDate(e.target.value)}
                          placeholder="e.g. 20 October 2026"
                          className="w-full py-2 px-3 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </div>
                    </div>

                    {/* Error Banner */}
                    {transferError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                        <AlertCircle size={14} className="shrink-0 text-red-600" />
                        <span>{transferError}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                disabled={isSubmittingTransfer}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={
                  isSubmittingTransfer ||
                  !transferDestStock ||
                  !transferQty ||
                  parseFloat(transferQty) <= 0 ||
                  parseFloat(transferQty) > getAvailableRemainingForTransfer(selectedTransferRow)
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingTransfer ? (
                  <>
                    <Loader2 size={14} className="animate-spin shrink-0" />
                    <span>Processing Transfer…</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Remaining Feed Transfer History Modal ── */}
      {isTransferHistoryOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={e => e.target === e.currentTarget && setIsTransferHistoryOpen(false)}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-3xl flex flex-col overflow-hidden max-h-[94vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-3 sm:zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <History size={18} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] leading-tight">
                    Remaining Feed Transfer History
                  </h2>
                  <p className="text-[11px] text-slate-500">Audit trail of feed transferred between fish stocks</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferHistoryOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Toolbar (Direction indicator removed per request) */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Filter by Fish Stock:</span>
                <select
                  value={historyStockFilter}
                  onChange={e => setHistoryStockFilter(e.target.value)}
                  className={`${SC} py-1.5 px-3 text-xs w-auto bg-white border border-slate-200 rounded-lg text-slate-800 shadow-2xs focus:ring-teal-500`}
                >
                  <option value="All">All Fish Stocks</option>
                  {stockFilterOptions.map(s => (
                    <option key={s.key} value={s.name}>{s.label}</option>
                  ))}
                </select>
              </div>

              {(() => {
                let records = feedTransfers;
                if (historyStockFilter !== "All") {
                  records = records.filter(t =>
                    isStockMatch(t.sourceStock, historyStockFilter) ||
                    isStockMatch(t.destinationStock, historyStockFilter)
                  );
                }
                return (
                  <span className="text-slate-400 text-[11px] font-medium">
                    {records.length} record{records.length !== 1 ? "s" : ""}
                  </span>
                );
              })()}
            </div>

            {/* Transfer Records List */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-xs">
              {(() => {
                let records = feedTransfers;
                if (historyStockFilter !== "All") {
                  records = records.filter(t =>
                    isStockMatch(t.sourceStock, historyStockFilter) ||
                    isStockMatch(t.destinationStock, historyStockFilter)
                  );
                }

                if (records.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <ArrowRightLeft size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600">No feed transfers found</p>
                      <p className="text-[11px] max-w-sm mx-auto text-slate-400">
                        When fish stocks have unused feed in opened bags, you can transfer it from the Bags Opened tab directly to other compatible stocks.
                      </p>
                    </div>
                  );
                }

                return records.map(t => {
                  const usage = getTransferUsage(t);
                  return (
                    <div key={t.id} className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3 hover:border-slate-300 transition-colors">
                      {/* Top Header of Record */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-bold text-slate-900">
                            {formatFishStock(t.sourceStock)}
                          </span>
                          <ArrowRight size={14} className="text-teal-600 shrink-0" />
                          <span className="font-bold text-teal-800">
                            {formatFishStock(t.destinationStock)}
                          </span>
                        </div>

                        {/* Status Badge (Feed Received tag removed per request) */}
                        {usage.statusLabel ? (
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${usage.isFullyConsumed
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}>
                            {usage.statusLabel}
                          </span>
                        ) : null}
                      </div>

                      {/* Clean 4-Stat Metric Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-slate-50/80 rounded-lg p-2.5">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Transferred</span>
                          <span className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">
                            {t.quantityKg} kg
                          </span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2.5">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Consumed</span>
                          <span className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif]">
                            {usage.consumedKg} kg
                          </span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2.5">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Remaining</span>
                          <span className={`font-bold text-sm font-['Barlow_Condensed',sans-serif] ${usage.remainingKg > 0 ? "text-teal-700" : "text-slate-600"}`}>
                            {usage.remainingKg} kg
                          </span>
                        </div>
                        <div className="bg-slate-50/80 rounded-lg p-2.5">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Feed Spec</span>
                          <span className="font-semibold text-slate-800 text-xs block truncate" title={`${t.feedSize} · ${t.feedBrand}`}>
                            {t.feedSize} · {t.feedBrand}
                          </span>
                        </div>
                      </div>

                      {/* Traceability Metadata Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-y-1 text-[11px] text-slate-500 pt-0.5">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                          <span><strong>Date:</strong> {t.transferDate}</span>
                          {t.originalDate !== t.transferDate && (
                            <span><strong>Original Feed Date:</strong> {t.originalDate}</span>
                          )}
                          <span><strong>By:</strong> {t.transferredBy || "Staff"}</span>
                        </div>
                        {t.notes && (
                          <span className="italic text-slate-600 bg-slate-50 px-2 py-0.5 rounded text-[10px]">
                            "{t.notes}"
                          </span>
                        )}
                      </div>

                      {/* Contributing Feeding Consumption History */}
                      {usage.contributingFeedings && usage.contributingFeedings.length > 0 && (
                        <div className="bg-slate-50/70 border border-slate-100 rounded-lg p-2.5 text-[10px] text-slate-600 space-y-1">
                          <span className="font-semibold text-slate-700 block">Subsequent Feedings:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {usage.contributingFeedings.map((c, idx) => (
                              <span key={idx} className="bg-white border border-slate-200/80 px-2 py-0.5 rounded font-medium">
                                {c.date} ({c.pond}): <strong className="text-slate-800">{c.fedKg} kg fed</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsTransferHistoryOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Previous-Day Feed Balance Modal (Admin Only) ── */}
      {showManualPrevModal && isAdmin && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-[80] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isSavingManualPrev) {
              setShowManualPrevModal(false);
              setManualErr({});
            }
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center">
                  <Package size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Add Previous-Day Feed Balance</h3>
                  <p className="text-[11px] text-slate-400">Opening feed balances for {selDate}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingManualPrev}
                onClick={() => {
                  setShowManualPrevModal(false);
                  setManualErr({});
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5">
              <div className="p-3 bg-teal-50/90 border border-teal-200 rounded-xl text-xs text-teal-900 leading-relaxed">
                <p className="font-semibold text-teal-950 mb-0.5">Opening Feed Balance ({selDate})</p>
                <p className="text-teal-800">
                  Enter existing opened batches and actual remaining feed for each stock. Pondtora will save these as your starting balances and deduct subsequent feedings from here.
                </p>
              </div>

              {manualErr.entries && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
                  {manualErr.entries}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500 font-medium">
                  {manualPrevRows.length} feed stock {manualPrevRows.length === 1 ? "entry" : "entries"}
                </p>
              </div>

              {manualPrevRows.map((row, i) => {
                const tIso = getIsoDateForSelDate(selDate);
                const associated = row.fishStock ? getAssociatedPalletsForStock(row.fishStock, tIso) : [];
                const otherSizes = allRegisteredSizes.filter(s => !associated.includes(s));
                const avail = getStockAvailable(row.brand, row.size);
                const bagsNum = Number(row.bagsOpened) || 0;
                const remNum = Number(row.remainingKg);
                const hasValidRem = row.remainingKg.trim() !== "" && !isNaN(remNum) && remNum >= 0;
                const matchingInv = (inventory || []).find(f => f && (f.brand || "").toLowerCase().trim() === (row.brand || "").toLowerCase().trim() && isSamePelletSize(f.size, row.size)) ||
                  (inventory || []).find(f => f && isSamePelletSize(f.size, row.size));
                const wpb = Number(matchingInv?.weightPerBag) || row.kgPerBag || 15;
                const maxOpenedKg = Math.round(bagsNum * wpb * 100) / 100;
                const isDupInForm = manualPrevRows.findIndex((other, idx) =>
                  idx < i &&
                  other.fishStock && row.fishStock &&
                  normalizeFishStock(other.fishStock).toLowerCase().trim() === normalizeFishStock(row.fishStock).toLowerCase().trim() &&
                  (other.brand || "").toLowerCase().trim() === (row.brand || "").toLowerCase().trim() &&
                  isSamePelletSize(other.size, row.size)
                ) !== -1;

                return (
                  <div key={i} className="bg-slate-50/90 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Entry #{i + 1}
                      </span>
                      {manualPrevRows.length > 1 && (
                        <button
                          type="button"
                          disabled={isSavingManualPrev}
                          onClick={() => removeManualPrevRow(i)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-0.5 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={12} /> Remove
                        </button>
                      )}
                    </div>

                    {/* 1. Feed Stock */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Feed Stock <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={row.fishStock}
                        onChange={e => {
                          updateManualPrevRow(i, "fishStock", e.target.value);
                          setManualErr(p => { const c = { ...p }; delete c[`fs_${i}`]; delete c[`dup_${i}`]; return c; });
                        }}
                        className={`${SC} ${manualErr[`fs_${i}`] ? "border-red-400 bg-red-50/30" : ""}`}
                      >
                        <option value="">Select feed stock…</option>
                        {modalFishStockOptions.map(opt => (
                          <option key={opt.name} value={opt.name}>{opt.label}</option>
                        ))}
                      </select>
                      {manualErr[`fs_${i}`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{manualErr[`fs_${i}`]}</p>}
                    </div>

                    {/* 2. Feed Size & 3. Feed Brand */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Feed Size (Pallet) <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={allRegisteredSizes.some(s => isSamePelletSize(s, row.size)) ? (allRegisteredSizes.find(s => isSamePelletSize(s, row.size)) || row.size) : ""}
                          onChange={e => {
                            updateManualPrevRow(i, "size", e.target.value);
                            setManualErr(p => { const c = { ...p }; delete c[`size_${i}`]; delete c[`brand_${i}`]; delete c[`dup_${i}`]; return c; });
                          }}
                          className={`${SC} ${manualErr[`size_${i}`] ? "border-red-400 bg-red-50/30" : ""}`}
                        >
                          <option value="">Select feed size…</option>
                          {associated.length > 0 && (
                            <optgroup label="Associated Pallets">
                              {associated.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </optgroup>
                          )}
                          {otherSizes.length > 0 && (
                            <optgroup label={associated.length > 0 ? "All Other Pellet Sizes" : "All Registered Pellet Sizes"}>
                              {otherSizes.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        {manualErr[`size_${i}`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{manualErr[`size_${i}`]}</p>}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Feed Brand <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={row.brand}
                          onChange={e => {
                            updateManualPrevRow(i, "brand", e.target.value);
                            setManualErr(p => { const c = { ...p }; delete c[`brand_${i}`]; delete c[`dup_${i}`]; return c; });
                          }}
                          className={`${SC} ${manualErr[`brand_${i}`] ? "border-red-400 bg-red-50/30" : ""}`}
                        >
                          <option value="">Select Feed Brand</option>
                          {allRegisteredBrands.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          {row.brand && !allRegisteredBrands.includes(row.brand) && (
                            <option value={row.brand}>{row.brand}</option>
                          )}
                        </select>
                        {manualErr[`brand_${i}`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{manualErr[`brand_${i}`]}</p>}
                      </div>
                    </div>

                    {row.brand && row.size && avail.exists && (
                      <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-[11px] text-slate-500">
                        <span className="text-[10px] uppercase font-medium text-slate-400">Store Stock ({wpb} kg/bag, not deducted):</span>
                        <span className={`font-medium ${avail.remainingBags <= 2 ? "text-amber-600" : "text-slate-700"}`}>
                          {avail.remainingBags} bag{avail.remainingBags !== 1 ? "s" : ""} ({avail.remainingKg} kg)
                        </span>
                      </div>
                    )}

                    {/* 4. Batch Open & 5. Feed Remaining (kg) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Batch Open (Bags) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0.1}
                          step="any"
                          value={row.bagsOpened}
                          onChange={e => {
                            updateManualPrevRow(i, "bagsOpened", e.target.value);
                            setManualErr(p => { const c = { ...p }; delete c[`bags_${i}`]; delete c[`rem_${i}`]; return c; });
                          }}
                          placeholder="e.g. 5"
                          className={`${IC} ${manualErr[`bags_${i}`] ? "border-red-400 bg-red-50/30" : ""}`}
                        />
                        {manualErr[`bags_${i}`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{manualErr[`bags_${i}`]}</p>}
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                          Feed Remaining (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={row.remainingKg}
                          onChange={e => {
                            updateManualPrevRow(i, "remainingKg", e.target.value);
                            setManualErr(p => { const c = { ...p }; delete c[`rem_${i}`]; return c; });
                          }}
                          placeholder={bagsNum > 0 ? `Max ${maxOpenedKg} kg` : "e.g. 16"}
                          className={`${IC} ${manualErr[`rem_${i}`] ? "border-red-400 bg-red-50/30" : ""}`}
                        />
                        {manualErr[`rem_${i}`] && <p className="text-[11px] font-semibold text-red-600 mt-1">{manualErr[`rem_${i}`]}</p>}
                      </div>
                    </div>

                    {(isDupInForm || manualErr[`dup_${i}`]) && (
                      <div className="flex items-start gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                        <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span>{manualErr[`dup_${i}`] || "This Feed Stock, Brand & Size is already entered above."}</span>
                      </div>
                    )}

                    {(bagsNum > 0 || hasValidRem) && (
                      <div className="p-2.5 bg-white border border-slate-200/80 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-800">{row.fishStock || "—"}</span> · {row.brand || "—"} ({row.size || "—"})
                          {bagsNum > 0 && <span className="ml-1.5 text-slate-500">· {bagsNum} bag{bagsNum !== 1 ? "s" : ""} ({maxOpenedKg} kg)</span>}
                        </div>
                        {hasValidRem && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold font-['Barlow_Condensed',sans-serif] text-sm">
                            Starting Balance: {remNum} kg
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                disabled={isSavingManualPrev}
                onClick={addManualPrevRow}
                className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-teal-300 text-teal-700 hover:bg-teal-50/70 rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Another Feed Stock
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-end gap-2">
              <PBtn
                outline
                onClick={() => {
                  if (!isSavingManualPrev) {
                    setShowManualPrevModal(false);
                    setManualErr({});
                  }
                }}
              >
                Cancel
              </PBtn>
              <PBtn onClick={handleSaveManualPrevBalance} disabled={isSavingManualPrev}>
                <Check size={14} /> {isSavingManualPrev ? "Saving..." : "Save Feed Balances"}
              </PBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeedDocumentation;
