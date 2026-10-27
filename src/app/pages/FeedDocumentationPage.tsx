import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus, CheckCircle, X, Layers, Droplets,
  ChevronDown, ChevronLeft, ChevronRight,
  Package, BookOpen, Download, FileText, Pencil, Trash2, MoreVertical, Lock, History, Fish, Search, AlertTriangle, AlertCircle, Eye,
  Calendar, ArrowRightLeft, ArrowRight, Send, Check, Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { FeedingRecord, FeedEditEntry, Pond, FeedItem, BagOpenLog, FeedRemainingLog, FeedTransferRecord, StockEvent } from "../types";
import { TODAY, toMon, toYr, uid, downloadCSV, openPrintWindow, formatFishStockDate, formatFishStock, fmtStockingDate, isSameDate, FEED_SIZES, FEED_BRANDS, getPondFishStock, getLagosDateParts } from "../data";
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
  currentUser?: { name: string; email: string };
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  stockEvents?: StockEvent[];
}) {
  const lagosToday = useMemo(() => getLagosDateParts(), []);
  const realTodayLabel = `${MON_NAMES[lagosToday.month]} ${lagosToday.day}`;
  const isRecordEditable = (dateLabel?: string | null) => canEditLocked || (dateLabel ? isSameDate(dateLabel, TODAY) || isSameDate(dateLabel, realTodayLabel) : false);

  /* ── ui state ── */
  const [showLog, setShowLog] = useState(false);
  const [feedErr, setFeedErr] = useState<Record<string, string>>({});
  const [showCal, setShowCal] = useState(false);
  const [showBagsModal, setShowBagsModal] = useState(false);
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
  const [feedTransfers, setFeedTransfers] = useState<FeedTransferRecord[]>(() => {
    try {
      const raw = localStorage.getItem(`pondtora_feed_transfers_${activeFarmId}`) || localStorage.getItem("pondtora_feed_transfers");
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });

  const saveFeedTransfers = useCallback((updated: FeedTransferRecord[]) => {
    setFeedTransfers(updated);
    try {
      localStorage.setItem(`pondtora_feed_transfers_${activeFarmId}`, JSON.stringify(updated));
      localStorage.setItem("pondtora_feed_transfers", JSON.stringify(updated));
    } catch {}
  }, [activeFarmId]);

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
  const isPondName = useCallback((str?: string | null): boolean => {
    if (!str || str === "—" || typeof str !== "string" || !str.trim()) return false;
    const lower = str.trim().toLowerCase();
    return (ponds || []).some(p => p && p.name && p.name.trim().toLowerCase() === lower);
  }, [ponds]);

  const pondToStock = (pondName: string): string => {
    if (!pondName) return "General Stock";
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === pondName.toLowerCase().trim());
    if (!p) return isPondName(pondName) ? "General Stock" : pondName;
    const s = getPondFishStock(p);
    if (!s || s === "—" || isPondName(s)) return "General Stock";
    return s;
  };

  const pondToStockDate = (pondName: string): string => {
    const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === (pondName || "").toLowerCase().trim());
    if (!p || !p.stockingDate || p.stockingDate === "—") return "—";
    return formatFishStockDate(p.stockingDate);
  };

  const normalizeFishStock = (stock?: string | null): string => {
    if (!stock || stock === "—" || typeof stock !== "string" || !stock.trim()) return "—";
    const trimmed = stock.trim();
    if (isPondName(trimmed)) {
      const p = (ponds || []).find(x => x && x.name && x.name.toLowerCase().trim() === trimmed.toLowerCase());
      if (p && p.status === "Active" && (Number(p.currentCount) > 0 || (Number(p.initialStock) > 0 && p.currentCount == null))) {
        return pondToStock(trimmed);
      }
      return trimmed;
    }
    const matchingPond = (ponds || []).find(p => p && p.name && typeof p.name === "string" && p.name.toLowerCase().trim() === trimmed.toLowerCase());
    if (matchingPond && matchingPond.status === "Active" && (Number(matchingPond.currentCount) > 0 || (Number(matchingPond.initialStock) > 0 && matchingPond.currentCount == null))) {
      return pondToStock(matchingPond.name);
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
  };

  const isStockMatch = (stockA?: string | null, stockB?: string | null): boolean => {
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

    const na = normalizeFishStock(stockA).trim().toLowerCase();
    const nb = normalizeFishStock(stockB).trim().toLowerCase();
    if (na === nb && na !== "—" && !isPondName(na)) return true;

    const fa = formatFishStock(stockA).trim().toLowerCase();
    const fb = formatFishStock(stockB).trim().toLowerCase();
    if (fa === fb && fa !== "—" && !isFormattedDate(fa)) return true;

    const pA = (ponds || []).find(p => p && p.name && p.name.toLowerCase().trim() === a);
    if (pA && pA.status === "Active") {
      const pADate = pA.stockingDate && pA.stockingDate !== "—" ? formatFishStockDate(pA.stockingDate) : null;
      if (db && isFormattedDate(db) && pADate && isFormattedDate(pADate) && !isSameDate(db, pADate)) {
        return false;
      }
      const psA = getPondFishStock(pA).trim().toLowerCase();
      if (psA === b || psA === nb || psA === fb) return true;
      if (pA.fishStock && pA.fishStock.trim().toLowerCase() === b) return true;
    }
    const pB = (ponds || []).find(p => p && p.name && p.name.toLowerCase().trim() === b);
    if (pB && pB.status === "Active") {
      const pBDate = pB.stockingDate && pB.stockingDate !== "—" ? formatFishStockDate(pB.stockingDate) : null;
      if (da && isFormattedDate(da) && pBDate && isFormattedDate(pBDate) && !isSameDate(da, pBDate)) {
        return false;
      }
      const psB = getPondFishStock(pB).trim().toLowerCase();
      if (psB === a || psB === na || psB === fa) return true;
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

      // Check direct stock match with pond fishStock and pond name
      if (isStockMatch(p.fishStock, trimmed)) return true;
      if (isStockMatch(getPondFishStock(p), trimmed)) return true;
      if (isStockMatch(p.name, trimmed)) return true;
      if (isStockMatch(pondToStock(p.name), trimmed)) return true;

      // Check normalized stock names
      if (norm && norm !== "—" && norm !== "general stock") {
        if (normalizeFishStock(p.fishStock).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(getPondFishStock(p)).toLowerCase().trim() === norm) return true;
        if (normalizeFishStock(p.name).toLowerCase().trim() === norm) return true;
      }

      // Check stocking date matches
      if (p.stockingDate && p.stockingDate !== "—") {
        const pDateFmt = formatFishStockDate(p.stockingDate).toLowerCase().trim();
        if (fmtDate && fmtDate !== "—" && pDateFmt === fmtDate) return true;
        if (p.stockingDate.toLowerCase().trim() === trimmed.toLowerCase()) return true;
      }

      return false;
    });
  }, [activePonds, isStockMatch, normalizeFishStock, pondToStock]);

  const allBrands = [...new Set((inventory || []).map(f => f?.brand).filter(Boolean))];

  /* Available pellet sizes drawn from all pellets in Feed Stock (inventory & opened bags) */
  const availablePelletSizes = useMemo(() => {
    const fromInv = (inventory || []).map(f => f?.size).filter(Boolean);
    const fromBags = (bagLogs || []).map(b => b?.size).filter(Boolean);
    const combined = [...new Set([...fromInv, ...fromBags])];
    if (combined.length > 0) {
      const uniqueSizes: string[] = [];
      combined.forEach(s => {
        if (!uniqueSizes.some(u => isSamePelletSize(u, s))) {
          uniqueSizes.push(s);
        }
      });
      return uniqueSizes.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
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
          const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
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
      // 1. Explicit user leftover recorded on this date (if any)
      const matchingRemains = (remainLogs || []).filter(r => 
        dateToIso(r.date) === dIso && 
        isStockMatch(r.fishStock, normStock) && 
        (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
        brandFilter(r.brand)
      );
      const rLog = matchingRemains.length > 0 ? matchingRemains[matchingRemains.length - 1] : null;

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
      const dayFeedings = (feedingRecords || []).filter(r => {
        if (dateToIso(r.date) !== dIso) return false;
        if (!size || size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) {
          if (!brandFilter(r.brand)) return false;
          if (r.fishStock && r.fishStock !== "—") {
            return isStockMatch(r.fishStock, normStock);
          }
          if (r.pond) {
            const rPondLower = r.pond.toLowerCase().trim();
            const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
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
        balance = Number(rLog.remainingKg) || 0;
      } else {
        balance = Math.max(0, balance + dayBagsKg + dayTransfersInKg - dayTransfersOutKg - dayFedKg);
      }
    }

    return Math.max(0, Math.round(balance * 10) / 10);
  }, [remainLogs, bagLogs, feedingRecords, feedTransfers, dateToIso, normalizeFishStock, isStockMatch, ponds]);

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
    (feedingRecords || []).filter(r => {
      if (!r || !isSameDate(r.date, checkDate)) return false;
      if (r.fishStock && r.fishStock !== "—") return isStockMatch(r.fishStock, normStock);
      if (r.pond) {
        const rPondLower = r.pond.toLowerCase().trim();
        const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
        if (matchedPond && (isStockMatch(matchedPond.fishStock, normStock) || isStockMatch(getPondFishStock(matchedPond), normStock))) {
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          const rDate = toValidDbDate(r.date);
          return !pStockDate || !rDate || rDate >= pStockDate;
        }
      }
      return false;
    }).forEach(r => addSize(r.size));

    // 2. Matching active ponds (defaultPellet & maxKgByPallet)
    const matchingPonds = (ponds || []).filter(p => p && p.status === "Active" && (
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
        const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPondLower));
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

    return pallets;
  }, [ponds, feedingRecords, bagLogs, remainLogs, feedTransfers, selDate]);

  /* Helper to get matching brands from Feed Stock (inventory) for a selected pallet */
  const getMatchingBrandsForPallet = useCallback((pallet: string): string[] => {
    if (!pallet || pallet === "—" || pallet.trim() === "") return [];
    const matching = [...new Set(
      (inventory || [])
        .filter(f => f && f.brand && isSamePelletSize(f.size, pallet))
        .map(f => f.brand.trim())
        .filter(Boolean)
    )];
    return matching;
  }, [inventory]);

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

  /* Validates if a destination stock can receive remaining feed (any active stock other than source) */
  const checkTransferEligibility = useCallback((destStockName: string, sourceRow: MergedBagRow): { eligible: boolean; reason?: string } => {
    if (!destStockName || !sourceRow) {
      return { eligible: false, reason: "Missing stock information." };
    }
    const normDest = normalizeFishStock(destStockName);
    const normSrc = normalizeFishStock(sourceRow.fishStock);
    if (normDest === normSrc || isStockMatch(destStockName, sourceRow.fishStock)) {
      return { eligible: false, reason: "Destination stock cannot be the same as the source stock." };
    }
    if (!isStockCurrentlyActive(destStockName)) {
      return { eligible: false, reason: "Destination stock is not currently active." };
    }

    return { eligible: true };
  }, [isStockCurrentlyActive]);

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
      const destFs = transferDestStock;
      const size = selectedTransferRow.size;
      const brand = selectedTransferRow.brand;
      const origDate = selectedTransferRow.lastBagLog?.date || selDate;
      const tDate = transferDate || selDate;

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
      const newSourceRemaining = Math.max(0, Math.round((currentAvailable - numQty) * 10) / 10);
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

      const destRow = mergedBagRows.find(r =>
        (isStockMatch(r.fishStock, destFs) || normalizeFishStock(r.fishStock) === normalizeFishStock(destFs)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (!brand || brand === "—" || !r.brand || r.brand === "—" || r.brand.trim().toLowerCase() === brand.trim().toLowerCase())
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

    const openedLogs = (bagLogs || []).filter(b => b && (b.brand || "").toLowerCase().trim() === brandTrim && isSamePelletSize(b.size, size) && (excludeBagLogId ? b.id !== excludeBagLogId : true));
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
    if (!size) return { availableQty: 0, availableKg: 0, inStockBags: 0, totalPurchasedBags: 0, totalPurchasedKg: 0, totalFedKg: 0, exists: false };

    // Group inventory by brand for this pellet size to mirror Feed Stock per-brand inventory calculation
    const brandMap = new Map<string, { brand: string; purchasedBags: number; weightPerBag: number; totalKg: number }>();
    (inventory || []).filter(f => f && isSamePelletSize(f.size, size)).forEach(f => {
      const bKey = (f.brand || "").toLowerCase().trim();
      const existing = brandMap.get(bKey);
      const wpb = Number(f.weightPerBag) || 15;
      const bags = Number(f.bags) || 0;
      const kg = Number(f.totalKg) || (bags * wpb);
      if (existing) {
        existing.purchasedBags += bags;
        existing.totalKg += kg;
      } else {
        brandMap.set(bKey, { brand: f.brand, purchasedBags: bags, weightPerBag: wpb, totalKg: kg });
      }
    });

    let totalPurchasedBags = 0;
    let totalPurchasedKg = 0;
    let inStockBags = 0;
    let inStockKg = 0;
    const defaultWpb = brandMap.values().next().value?.weightPerBag || 15;

    brandMap.forEach((grp, bKey) => {
      totalPurchasedBags += grp.purchasedBags;
      totalPurchasedKg += grp.totalKg;
      const brandOpened = (bagLogs || [])
        .filter(b => b && (b.brand || "").toLowerCase().trim() === bKey && isSamePelletSize(b.size, size))
        .reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
      const bInStock = Math.max(0, grp.purchasedBags - brandOpened);
      inStockBags += bInStock;
      inStockKg += bInStock * (grp.weightPerBag || defaultWpb);
    });

    const openedLogs = (bagLogs || []).filter(b => b && isSamePelletSize(b.size, size));
    const totalOpenedBags = openedLogs.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
    // If brandMap is empty, fallback to simple difference
    if (brandMap.size === 0) {
      inStockBags = Math.max(0, totalPurchasedBags - totalOpenedBags);
      inStockKg = inStockBags * defaultWpb;
    }

    const exists = brandMap.size > 0 && (totalPurchasedBags > 0 || totalPurchasedKg > 0);
    const weightPerBag = defaultWpb;

    const relevantFeeding = (feedingRecords || []).filter(fr => fr && isSamePelletSize(fr.size, size) && (excludeRecordId ? fr.id !== excludeRecordId : true));
    const totalFedKg = relevantFeeding.reduce((s, fr) => s + (Number(fr.total) || ((Number(fr.morning) || 0) + (Number(fr.evening) || 0))), 0);
    const totalOpenedKg = openedLogs.reduce((s, b) => s + (Number(b.totalKg) || (Number(b.bagsOpened) * (Number(b.kgPerBag) || weightPerBag))), 0);
    const remainingOpenedKg = Math.max(0, totalOpenedKg - totalFedKg);
    const availableKg = Math.max(0, inStockKg + remainingOpenedKg);

    // Available pallet quantity dynamically reflects total available across all brands
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

  /* ── stockFilterOptions for filtering Feeding Record and Bags Opened by stock (active ponds only) ── */
  const stockFilterOptions = useMemo(() => {
    const list: { key: string; label: string; name: string }[] = [];
    const seen = new Set<string>();

    activePonds.forEach(p => {
      const stock = (p.fishStock && p.fishStock !== "—" && !isPondName(p.fishStock))
        ? formatFishStock(p.fishStock)
        : getPondFishStock(p);
      if (!stock || stock === "—" || stock === "General Stock" || isPondName(stock)) return;

      const norm = normalizeFishStock(stock).toLowerCase().trim();
      if (!norm || seen.has(norm)) return;
      seen.add(norm);

      const dStr = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "";
      const label = dStr && dStr !== "—" && !stock.toLowerCase().includes(dStr.toLowerCase())
        ? `${stock} (${dStr})`
        : stock;

      list.push({ key: norm, label, name: stock });
    });

    return list;
  }, [activePonds, isPondName]);

  /* ── Modal Fish Stock Options for Log Bags (ONLY active stocks in at least one pond) ── */
  const modalFishStockOptions = useMemo((): FishStockOption[] => {
    return stockFilterOptions.map(opt => {
      const matchingPonds = activePonds.filter(p => {
        const pStock = (p.fishStock && p.fishStock !== "—" && !isPondName(p.fishStock)) ? formatFishStock(p.fishStock) : getPondFishStock(p);
        return isStockMatch(pStock, opt.name);
      });
      const primaryPond = matchingPonds[0];
      const stockDate = primaryPond?.stockingDate && primaryPond.stockingDate !== "—" ? formatFishStockDate(primaryPond.stockingDate) : "—";
      return {
        id: opt.name,
        name: opt.name,
        label: opt.label,
        stockDate,
        species: primaryPond?.species || "—",
        ponds: matchingPonds.map(p => p.name)
      };
    });
  }, [stockFilterOptions, activePonds, isPondName]);

  const activeFishStockOptions = modalFishStockOptions;

  /* ── Auto-reset stock selection filters if selected stock has been cleared ── */
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
    const matching = (bagLogs || []).filter(b =>
      b &&
      (Number(b.bagsOpened) || 0) > 0 &&
      b.fishStock &&
      b.fishStock !== "—" &&
      (isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel)) &&
      (isStockMatch(b.fishStock, stockName) || normalizeFishStock(b.fishStock).toLowerCase().trim() === normalizedStock) &&
      (normalizedBrand === "" || (b.brand || "").toLowerCase().trim() === normalizedBrand) &&
      (palletSize === "—" || isSamePelletSize(b.size, palletSize))
    );
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

    const pondsForStock = normStock ? (ponds || []).filter(p => p && p.status === "Active" && (isStockMatch(pondToStock(p.name), normStock) || isStockMatch(p.name, normStock))).map(p => p.name) : [];

    const fedRecords = (feedingRecords || []).filter(r => {
      if (!r) return false;
      const dateMatch = isSameDate(r.date, targetDate) || isSameDate(r.date, dateLabel);
      if (!dateMatch) return false;
      if (size && size !== "—" && r.size && !isSamePelletSize(r.size, size)) return false;
      if (brand && brand !== "—" && r.brand && r.brand !== "—" && r.brand.toLowerCase().trim() !== brand.toLowerCase().trim()) return false;
      if (normStock && normStock !== "—") {
        if (r.fishStock && r.fishStock !== "—") {
          if (!isStockMatch(normStock, r.fishStock)) return false;
        } else if (r.pond) {
          const rPond = r.pond.toLowerCase().trim();
          const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond));
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
      isSameDate(t.transferDate, targetDate)
    );
    const availableTransfersIn = transfersInToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

    // Outgoing transfers on targetDate
    const transfersOutToday = (feedTransfers || []).filter(t => 
      isStockMatch(t.sourceStock, normStock) && 
      isSamePelletSize(t.feedSize, size) && 
      (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
      (isSameDate(t.originalDate, targetDate) || isSameDate(t.transferDate, targetDate))
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

  const blankBagRow = (targetDate?: string, preferredStock?: string, preferredSize?: string): BagRow => {
    const opts = modalFishStockOptions;
    const isPreferredActive = preferredStock && opts.some(opt => opt.name === preferredStock || isStockMatch(opt.name, preferredStock));
    const rawFs = isPreferredActive ? preferredStock : (opts[0]?.name || "");
    const fs = isPondName(rawFs) ? (opts[0]?.name || "") : rawFs;
    const associated = getAssociatedPalletsForStock(fs, targetDate || bagsDate);
    const pallet = preferredSize || (associated.length > 0 ? associated[0] : "");
    const matchingBrands = pallet ? getMatchingBrandsForPallet(pallet) : [];
    const brand = matchingBrands.length > 0 ? matchingBrands[0] : "";
    const inv = (inventory || []).find(f => f && f.brand === brand && isSamePelletSize(f.size, pallet));
    return {
      fishStock: fs,
      brand,
      size: pallet,
      kgPerBag: inv?.weightPerBag || 15,
      qty: "",
      remainingKg: ""
    };
  };

  const getBagRowsForDate = (checkDate: string): BagRow[] => {
    const dateLabel = toDateLabel(checkDate);
    const existingBags = (bagLogs || []).filter(b => b && (isSameDate(b.date, checkDate) || isSameDate(b.date, dateLabel) || (isSameDate(checkDate, getIsoDateForSelDate(selDate)) && isSameDate(b.date, selDate))));
    const existingRemains = (remainLogs || []).filter(r => r && (isSameDate(r.date, checkDate) || isSameDate(r.date, dateLabel) || (isSameDate(checkDate, getIsoDateForSelDate(selDate)) && isSameDate(r.date, selDate))));

    const dateOptions = getFishStockOptionsForDate(checkDate);
    const map = new Map<string, BagRow>();
    existingBags.forEach(b => {
      const matchedOpt = dateOptions.find(opt => 
        opt.name === b.fishStock || 
        isStockMatch(opt.name, b.fishStock) || 
        normalizeFishStock(opt.name) === normalizeFishStock(b.fishStock) ||
        opt.ponds.some(p => p === b.fishStock || isStockMatch(p, b.fishStock))
      );
      const resolvedFs = matchedOpt?.name || (b.fishStock && isPondName(b.fishStock) ? pondToStock(b.fishStock) : b.fishStock) || (dateOptions[0]?.name || "");
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

      map.set(key, {
        id: b.id,
        fishStock: fs,
        brand,
        size,
        kgPerBag: kgPb,
        qty: b.bagsOpened !== undefined && b.bagsOpened !== null ? String(b.bagsOpened) : "",
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
      const resolvedFs = matchedOpt?.name || (isPondName(r.fishStock) ? pondToStock(r.fishStock) : r.fishStock) || (dateOptions[0]?.name || "");
      const fs = isPondName(resolvedFs) ? (dateOptions[0]?.name || "") : resolvedFs;
      const associatedPallets = getAssociatedPalletsForStock(fs, checkDate);
      const size = r.size || (associatedPallets[0] || "");
      const matchingBrands = getMatchingBrandsForPallet(size);
      const brand = r.brand || (matchingBrands[0] || (invBrands[0] || ""));

      const key = `${normalizeFishStock(fs)}__${brand.toLowerCase().trim()}__${size.toLowerCase().trim()}`;
      if (!map.has(key)) {
        const inv = (inventory || []).find(f => f && f.brand === brand && isSamePelletSize(f.size, size));
        const kgPb = inv?.weightPerBag || 15;
        map.set(key, {
          fishStock: fs,
          brand,
          size,
          kgPerBag: kgPb,
          qty: "",
          remainingKg: r.remainingKg !== undefined && r.remainingKg !== null ? String(r.remainingKg) : ""
        });
      }
    });

    // Also include stocks and pellet sizes fed on checkDate that do not have a bag log yet
    const dayFeedings = (feedingRecords || []).filter(f => f && (isSameDate(f.date, checkDate) || isSameDate(f.date, dateLabel) || (isSameDate(checkDate, getIsoDateForSelDate(selDate)) && isSameDate(f.date, selDate))));
    dayFeedings.forEach(f => {
      const rawFs = f.fishStock || pondToStock(f.pond);
      if (!rawFs || rawFs === "—" || rawFs === "General Stock") return;
      const matchedOpt = dateOptions.find(opt => 
        opt.name === rawFs || 
        isStockMatch(opt.name, rawFs) || 
        normalizeFishStock(opt.name) === normalizeFishStock(rawFs) ||
        opt.ponds.some(p => p === rawFs || isStockMatch(p, rawFs))
      );
      const fs = matchedOpt?.name || (isPondName(rawFs) ? (dateOptions[0]?.name || "") : rawFs);
      const size = f.size;
      if (!size || size === "—") return;
      const matchingBrands = getMatchingBrandsForPallet(size);
      const brand = f.brand || (matchingBrands[0] || (invBrands[0] || ""));

      const key = `${normalizeFishStock(fs)}__${brand.toLowerCase().trim()}__${size.toLowerCase().trim()}`;
      if (!map.has(key)) {
        const inv = (inventory || []).find(it => it && it.brand === brand && isSamePelletSize(it.size, size));
        const kgPb = inv?.weightPerBag || 15;
        map.set(key, {
          fishStock: fs,
          brand,
          size,
          kgPerBag: kgPb,
          qty: "",
          remainingKg: ""
        });
      }
    });

    // Also include stocks and pellet sizes received via feed transfers on checkDate that do not have a bag log yet
    const dayTransfersIn = (feedTransfers || []).filter(t => t && isSameDate(t.transferDate, checkDate));
    dayTransfersIn.forEach(t => {
      const rawFs = t.destinationStock;
      if (!rawFs || rawFs === "—" || rawFs === "General Stock") return;
      const matchedOpt = dateOptions.find(opt => 
        opt.name === rawFs || 
        isStockMatch(opt.name, rawFs) || 
        normalizeFishStock(opt.name) === normalizeFishStock(rawFs) ||
        opt.ponds.some(p => p === rawFs || isStockMatch(p, rawFs))
      );
      const fs = matchedOpt?.name || (isPondName(rawFs) ? (dateOptions[0]?.name || "") : rawFs);
      const size = t.feedSize;
      if (!size || size === "—") return;
      const matchingBrands = getMatchingBrandsForPallet(size);
      const brand = t.feedBrand || (matchingBrands[0] || (invBrands[0] || ""));

      const key = `${normalizeFishStock(fs)}__${brand.toLowerCase().trim()}__${size.toLowerCase().trim()}`;
      if (!map.has(key)) {
        const inv = (inventory || []).find(it => it && it.brand === brand && isSamePelletSize(it.size, size));
        const kgPb = inv?.weightPerBag || 15;
        map.set(key, {
          fishStock: fs,
          brand,
          size,
          kgPerBag: kgPb,
          qty: "",
          remainingKg: ""
        });
      }
    });

    if (map.size > 0) {
      return Array.from(map.values());
    }

    return [];
  };

  const openBagsModal = () => {
    const initialDate = getIsoDateForSelDate(selDate);
    setBagsDate(initialDate);
    const existing = getBagRowsForDate(initialDate).filter(r => isStockCurrentlyActive(r.fishStock));
    setBagRows(existing.length > 0 ? existing : [blankBagRow(initialDate)]);
    setBagsErr({});
    setShowBagsModal(true);
  };

  const handleBagsDateChange = (newDate: string) => {
    setBagsDate(newDate);
    if (newDate) {
      setBagsErr({});
      const existing = getBagRowsForDate(newDate).filter(r => isStockCurrentlyActive(r.fishStock));
      setBagRows(existing.length > 0 ? existing : [blankBagRow(newDate)]);
    }
  };

  const addBagRow = () => setBagRows(prev => [...prev, blankBagRow(bagsDate)]);
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
      let newBrand = "";
      if (matchingBrands.length === 1) {
        newBrand = matchingBrands[0];
      } else if (matchingBrands.length > 1) {
        newBrand = matchingBrands.some(b => b.toLowerCase().trim() === (r.brand || "").toLowerCase().trim()) ? r.brand : matchingBrands[0];
      } else {
        newBrand = "";
      }

      const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, newPallet));
      return { ...r, fishStock: v, size: newPallet, brand: newBrand, kgPerBag: inv?.weightPerBag || 15 };
    }

    if (k === "size") {
      // User changed pallet (size)
      const matchingBrands = getMatchingBrandsForPallet(v);
      let newBrand = "";
      if (matchingBrands.length === 1) {
        newBrand = matchingBrands[0];
      } else if (matchingBrands.length > 1) {
        newBrand = matchingBrands.some(b => b.toLowerCase().trim() === (r.brand || "").toLowerCase().trim()) ? r.brand : matchingBrands[0];
      } else {
        newBrand = "";
      }

      const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, v));
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
      const hasRemain = r.remainingKg !== "" && !isNaN(Number(r.remainingKg));

      if (!hasQty && !hasRemain) {
        errs[`qty_${idx}`] = "Enter Bags Opened or Leftover Feed";
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
    toast.success("Bags opened and leftover feed saved");
    setSelDate(dateLabel);
    if (docTab !== "mismatch") {
      setDocTab("bags");
    }

    const promises: Promise<any>[] = [];
    for (const r of bagRows) {
      const fs = normalizeFishStock(r.fishStock) || undefined;
      const hasQty = r.qty !== "" && !isNaN(Number(r.qty));
      const n = hasQty ? Number(r.qty) : 0;
      const hasRemVal = r.remainingKg !== "" && !isNaN(Number(r.remainingKg));
      const remVal = hasRemVal ? Number(r.remainingKg) : 0;

      // ── 1. Save Bags Opened ───────────────────────────────────────────
      const existingRec = (bagLogs || []).find(x => 
        (r.id && x.id === r.id) || 
        (isSameDate(x.date, dateLabel) && 
         isSamePelletSize(x.size, r.size) && 
         (!r.brand || !x.brand || x.brand.toLowerCase().trim() === r.brand.toLowerCase().trim()) && 
         isStockMatch(x.fishStock, fs))
      );

      if (hasQty) {
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
        } else if (n > 0 || (n === 0 && !hasRemVal)) {
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

      // ── 2. Save Remaining Leftover Feed ───────────────────────────────
      const existingRemain = (remainLogs || []).find(x =>
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
      } else if (hasQty && existingRemain && onEditRemainLog && fs) {
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
    }

    Promise.all(promises).catch(err => {
      console.error("Failed to save feed logs:", err);
    });
  };

  /* ── mismatchRows (active fish stocks fed today with bag opening or leftover discrepancies) ── */
  const mismatchRows = useMemo((): MismatchStockRow[] => {
    const activeStocksMap = new Map<string, { stockName: string; stockDate: string; pondNames: string[]; totalCount: number }>();

    (ponds || []).filter(p => p && p.status === "Active" && (p.currentCount === undefined || p.currentCount > 0)).forEach(p => {
      const stockName = getPondFishStock(p);
      if (!stockName || stockName === "—") return;
      const stockDate = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "—";
      const key = normalizeFishStock(stockName);
      const existing = activeStocksMap.get(key);
      if (existing) {
        if (!existing.pondNames.includes(p.name)) {
          existing.pondNames.push(p.name);
        }
        existing.totalCount += (p.currentCount || 0);
      } else {
        activeStocksMap.set(key, {
          stockName,
          stockDate,
          pondNames: [p.name],
          totalCount: p.currentCount || 0
        });
      }
    });

    const mIdx = MIDX_GLOBAL[selMonLabel] ?? viewMonth;
    const prevDt = new Date(selYear || viewYear, mIdx, (selDay || 1) - 1);
    const prevDate = `${MON_NAMES[prevDt.getMonth()]} ${prevDt.getDate()}`;

    const rows: MismatchStockRow[] = [];

    activeStocksMap.forEach((stockInfo, key) => {
      const pondsForStock = (ponds || []).filter(p => p && p.status === "Active" && (isStockMatch(pondToStock(p.name), stockInfo.stockName) || isStockMatch(p.name, stockInfo.stockName))).map(p => p.name);

      // Feeding records for this stock on selDate
      const fedRecords = (feedingRecords || []).filter(r => {
        if (!r || !isSameDate(r.date, selDate)) return false;
        if (r.fishStock && r.fishStock !== "—") {
          if (!isStockMatch(stockInfo.stockName, r.fishStock)) return false;
        } else if (r.pond) {
          const rPond = r.pond.toLowerCase().trim();
          const matchedPond = (ponds || []).find(p => p && p.status === "Active" && (p.id === r.pondId || p.name.toLowerCase().trim() === rPond));
          if (!matchedPond) return false;
          const pStock = getPondFishStock(matchedPond);
          if (!isStockMatch(stockInfo.stockName, pStock) && !isStockMatch(stockInfo.stockName, matchedPond.fishStock)) return false;
          const pStockDate = toValidDbDate(matchedPond.stockingDate);
          const rDate = toValidDbDate(r.date);
          if (pStockDate && rDate && rDate < pStockDate) return false;
        } else {
          return false;
        }
        return (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0);
      });

      const totalFedKg = fedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      // If a stock was NOT fed on the selected date at all, DO NOT flag it as mismatch
      if (totalFedKg <= 0) {
        return;
      }

      // Group feed by brand and pellet size
      const pairs: { brand: string; size: string }[] = [];
      const addMismatchPair = (bRaw?: string | null, szRaw?: string | null) => {
        const sz = (szRaw && szRaw !== "—" && szRaw.trim()) ? szRaw.trim() : "—";
        const b = (bRaw && bRaw !== "—" && bRaw.trim()) ? bRaw.trim() : (sz !== "—" ? (getMatchingBrandsForPallet(sz)[0] || "—") : "—");
        if (!pairs.some(p => p.brand.toLowerCase().trim() === b.toLowerCase().trim() && isSamePelletSize(p.size, sz))) {
          pairs.push({ brand: b, size: sz });
        }
      };

      fedRecords.forEach(r => addMismatchPair(r.brand, r.size));
      (bagLogs || []).filter(b => b && isSameDate(b.date, selDate) && isStockMatch(b.fishStock, stockInfo.stockName)).forEach(b => addMismatchPair(b.brand, b.size));
      (remainLogs || []).filter(r => r && isSameDate(r.date, selDate) && isStockMatch(r.fishStock, stockInfo.stockName)).forEach(r => addMismatchPair(r.brand, r.size));
      const pairsToEvaluate = pairs.length > 0 ? pairs : [{ brand: "—", size: "—" }];

      pairsToEvaluate.forEach(({ brand, size }) => {
        const sizeFedRecords = fedRecords.filter(r => 
          (size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const sizeFedKg = sizeFedRecords.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

        // Carryover from previous feeding records
        const carryoverKg = getPriorCarryover(stockInfo.stockName, size, selDate, brand);

        // Bag weight
        const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && (size !== "—" ? isSamePelletSize(f.size, size) : true)) ||
                        (inventory || []).find(f => f && (size !== "—" ? isSamePelletSize(f.size, size) : true));
        const bagWeight = invItem?.weightPerBag || 15;

        // Incoming & Outgoing transfers today
        const transfersInToday = (feedTransfers || []).filter(t => 
          isStockMatch(t.destinationStock, stockInfo.stockName) && 
          isSamePelletSize(t.feedSize, size) && 
          (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          isSameDate(t.transferDate, selDate)
        );
        const availableTransfersIn = transfersInToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

        const transfersOutToday = (feedTransfers || []).filter(t => 
          isStockMatch(t.sourceStock, stockInfo.stockName) && 
          isSamePelletSize(t.feedSize, size) && 
          (!brand || brand === "—" || !t.feedBrand || t.feedBrand === "—" || t.feedBrand.trim().toLowerCase() === brand.trim().toLowerCase()) &&
          (isSameDate(t.originalDate, selDate) || isSameDate(t.transferDate, selDate))
        );
        const totalTransferredOut = transfersOutToday.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

        // Effective feed available BEFORE opening any new bags today
        const effectiveAvailable = Math.max(0, carryoverKg + availableTransfersIn - totalTransferredOut);

        const netNeeded = Math.max(0, sizeFedKg - effectiveAvailable);
        const expectedBags = netNeeded > 0 ? Math.ceil(netNeeded / bagWeight) : 0;

        // Recorded bags opened on selDate
        const bagLogsForSize = (bagLogs || []).filter(b =>
          b && isSameDate(b.date, selDate) && isStockMatch(b.fishStock, stockInfo.stockName) && 
          (size === "—" || !b.size || b.size === "—" || isSamePelletSize(b.size, size)) &&
          (brand === "—" || !b.brand || b.brand === "—" || b.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const hasBagLog = bagLogsForSize.length > 0;
        if (!hasBagLog) {
          if (expectedBags > 0) {
            rows.push({
              stockKey: `${key}__${brand}__${size}`,
              stockName: stockInfo.stockName,
              stockDate: stockInfo.stockDate,
              brand,
              size,
              status: "Not Opened",
              expectedBags,
              recordedBags: 0,
              expectedRemaining: Math.max(0, Math.round((effectiveAvailable + (expectedBags * bagWeight) - sizeFedKg) * 10) / 10),
              recordedRemaining: null,
              totalFed: sizeFedKg,
              carryover: carryoverKg,
              reason: `Feeding recorded (${sizeFedKg} kg), but bags opened have not been logged for today (expected ${expectedBags} bag${expectedBags !== 1 ? "s" : ""}).`
            });
          }
          return;
        }

        const recordedBags = bagLogsForSize.reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);

        // Expected remaining feed calculation
        const totalAvailable = effectiveAvailable + (recordedBags * bagWeight);
        const expectedRemaining = Math.max(0, Math.round((totalAvailable - sizeFedKg) * 10) / 10);

        // Recorded leftover on selDate
        const remainLogsForSize = (remainLogs || []).filter(r =>
          r && isSameDate(r.date, selDate) && isStockMatch(r.fishStock, stockInfo.stockName) && 
          (size === "—" || !r.size || r.size === "—" || isSamePelletSize(r.size, size)) &&
          (brand === "—" || !r.brand || r.brand === "—" || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const hasRemainLog = remainLogsForSize.length > 0;
        const recordedRemaining = hasRemainLog 
          ? (Number(remainLogsForSize[remainLogsForSize.length - 1].remainingKg) || 0) 
          : null;

        // Determine discrepancies
        const isBagCountMismatch = recordedBags !== expectedBags;
        const isRemainValueMismatch = recordedRemaining !== null && Math.abs(recordedRemaining - expectedRemaining) > 0.05;
        const isRemainingMismatch = isRemainValueMismatch;

        let status: "Bag Mismatch" | "Remaining Mismatch" | "Multiple Mismatches" | null = null;
        let reason = "";

        if (isBagCountMismatch && isRemainingMismatch) {
          status = "Multiple Mismatches";
          reason = `Recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""} (expected ${expectedBags}) and leftover recorded as ${recordedRemaining} kg (expected ${expectedRemaining} kg).`;
        } else if (isBagCountMismatch) {
          status = "Bag Mismatch";
          if (recordedBags < expectedBags) {
            reason = `Insufficient bags opened: recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""}, but ${expectedBags} bag${expectedBags !== 1 ? "s" : ""} required for ${sizeFedKg} kg fed.`;
          } else {
            reason = `Over-recorded bags: recorded ${recordedBags} bag${recordedBags !== 1 ? "s" : ""}, but only ${expectedBags} bag${expectedBags !== 1 ? "s" : ""} expected for ${sizeFedKg} kg fed.`;
          }
        } else if (isRemainingMismatch) {
          status = "Remaining Mismatch";
          reason = `Recorded leftover is ${recordedRemaining} kg, but calculated expected leftover is ${expectedRemaining} kg.`;
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
  }, [ponds, bagLogs, feedingRecords, remainLogs, inventory, feedTransfers, getTransferUsage, selDate, selMonLabel, selDay, selYear, viewYear, viewMonth, getPriorCarryover]);

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

    // 3. Identify feed brand based on selected pallet (Section 5)
    const matchingBrands = getMatchingBrandsForPallet(selectedPallet);
    let selectedBrand = "";
    if (matchingBrands.length === 1) {
      selectedBrand = matchingBrands[0];
    } else if (matchingBrands.length > 1) {
      selectedBrand = (row.brand && matchingBrands.includes(row.brand)) ? row.brand : matchingBrands[0];
    } else {
      selectedBrand = (row.brand && row.brand !== "—") ? row.brand : (invBrands[0] || "");
    }

    const inv = (inventory || []).find(f => f && f.brand === selectedBrand && isSamePelletSize(f.size, selectedPallet));
    const kgPb = inv?.weightPerBag || 15;

    // Check existing rows for date
    const existingRows = getBagRowsForDate(targetDate);
    const existingIdx = existingRows.findIndex(r => 
      isStockMatch(r.fishStock, fs) && 
      isSamePelletSize(r.size, selectedPallet)
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
      // Create new prefilled row for the missing record
      const newRow: BagRow = {
        fishStock: fs,
        brand: selectedBrand,
        size: selectedPallet,
        kgPerBag: kgPb,
        qty: row.recordedBags > 0 ? String(row.recordedBags) : "",
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

  /* ── day view ── */
  const dayRecords = (feedingRecords || []).filter(r => r && isSameDate(r.date, selDate));
  const dayGrand = dayRecords.reduce((s, r) => s + (Number(r.total) || 0), 0);

  const activePondsForSelectedStock = useMemo(() => {
    if (dailyStockFilter === "All") return activePonds;
    return activePonds.filter(p =>
      isStockMatch(dailyStockFilter, getPondFishStock(p)) ||
      isStockMatch(dailyStockFilter, p.fishStock) ||
      isStockMatch(dailyStockFilter, pondToStock(p.name)) ||
      isStockMatch(dailyStockFilter, p.name)
    );
  }, [activePonds, dailyStockFilter]);

  const dayRows = useMemo(() => {
    const list: { pond: Pond; rec: FeedingRecord | null }[] = [];
    activePondsForSelectedStock.forEach(pond => {
      const pNameNorm = (pond.name || "").trim().toLowerCase();
      const closedEvents = (stockEvents || []).filter(e =>
        (e.pondId === pond.id || (e.pondName && e.pondName.trim().toLowerCase() === pNameNorm)) && e.type === "Closed"
      );
      const latestClosedDate = closedEvents.length > 0
        ? closedEvents.map(e => toValidDbDate(e.clearedDate || e.date)).filter(Boolean).sort().reverse()[0]
        : null;
      const pondStock = getPondFishStock(pond);
      const pondStockDbDate = toValidDbDate(pond.stockingDate);

      const recs = dayRecords.filter(r => {
        const matchesPond = (r.pondId && r.pondId === pond.id) || (r.pond || "").trim().toLowerCase() === pNameNorm;
        if (!matchesPond) return false;

        const rStock = (r.fishStock || "").trim();
        // Check if this record explicitly matches a closed cycle for this pond
        const matchesClosed = Boolean(rStock && rStock !== "—") && closedEvents.some(ce => {
          const ceBatch = ce.batch || (ce.date ? fmtStockingDate(ce.date) : null);
          return Boolean(ceBatch && (isStockMatch(rStock, ceBatch) || isSameDate(rStock, ce.date)));
        });
        if (matchesClosed) return false;

        const rDate = toValidDbDate(r.date);
        // If there's a closed date and this record is on or before it, it belongs to closed stock
        if (latestClosedDate && rDate && rDate <= latestClosedDate) return false;

        // If pond has a specific fishStockId, enforce it if record has one:
        if ((pond as any).fishStockId && r.fishStockId && r.fishStockId !== (pond as any).fishStockId) {
          return false;
        }

        // If record date is before pond's current stocking date, it cannot belong to this stock
        if (pondStockDbDate && rDate && rDate < pondStockDbDate) {
          return false;
        }

        // If rStock is specified and differs from the current active stock of the pond:
        if (rStock && rStock !== "—") {
          const matchesCurrentStock = 
            isStockMatch(rStock, pondStock) ||
            isStockMatch(rStock, pond.fishStock) ||
            (pond.stockingDate && isSameDate(rStock, pond.stockingDate));
          if (!matchesCurrentStock) {
            // It belongs to a different stock
            return false;
          }
        }

        return true;
      });

      if (recs.length > 0) {
        recs.forEach(rec => {
          list.push({ pond, rec });
        });
      } else {
        list.push({ pond, rec: null });
      }
    });
    return list;
  }, [activePondsForSelectedStock, dayRecords, stockEvents]);

  const totalPonds = activePondsForSelectedStock.length;
  const pondsFedToday = useMemo(() => {
    return [...new Set(dayRows.filter(r => r.rec !== null).map(r => r.pond.id || r.pond.name))].length;
  }, [dayRows]);
  const pondsRemaining = Math.max(0, totalPonds - pondsFedToday);
  const bagsOpenedToday = useMemo(() => {
    return (bagLogs || [])
      .filter(b => b && isSameDate(b.date, selDate) && (dailyStockFilter === "All" || isStockMatch(dailyStockFilter, b.fishStock)) && isStockCurrentlyActive(b.fishStock))
      .reduce((s, b) => s + (Number(b.bagsOpened) || 0), 0);
  }, [bagLogs, selDate, dailyStockFilter, isStockCurrentlyActive]);

  const filteredDayRows = useMemo(() => {
    let list = dayRows;
    if (feedStatusFilter === "fed") {
      list = list.filter(({ rec }) => !!rec);
    } else if (feedStatusFilter === "not_fed") {
      list = list.filter(({ rec }) => !rec);
    }
    return list;
  }, [dayRows, feedStatusFilter]);

  const openEditRec = (rec: FeedingRecord) => setEditRec({ ...rec });

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
    onEditFeedRecord({ ...editRec, morning: newM, evening: newE, total: newM + newE, editHistory: hasChange ? [...(editRec.editHistory || []), entry] : (editRec.editHistory || []) });
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

  const handleSaveEditDocBag = () => {
    if (!editDocBag) return;
    const rawFs = editDocBag.fishStock || "";
    const normFs = normalizeFishStock(rawFs);
    const fs = normFs !== "—" && normFs ? normFs : rawFs;
    const brand = editDocBag.brand || "";
    const size = editDocBag.size || "";
    const bagsDate = editDocBag.date;

    const existingBag = (bagLogs || []).find(b => 
      b.id === editDocBag.id || 
      (isSameDate(b.date, bagsDate) && 
       (size === "—" || isSamePelletSize(b.size, size)) && 
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
    } else if (editDocBag.bagsOpened >= 0) {
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
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        (isStockMatch(r.fishStock, editDocBag.fishStock) || normalizeFishStock(r.fishStock) === fs)
      );

      if (editBagRemainKg !== "" && !isNaN(remKg) && remKg >= 0) {
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
      } else if (editBagRemainKg === "" && existingRemain && onEditRemainLog) {
        onEditRemainLog({
          ...existingRemain,
          brand: editDocBag.brand,
          size: editDocBag.size,
          fishStock: fs,
          remainingKg: 0,
          date: bagsDate
        });
      }
    }
    setEditDocBag(null);
    toast.success("Updated successfully");
  };

  /* ── merged bags rows for display (includes all active stocks, bags opened, and feed tracking) ── */
  const mergedBagRows = useMemo((): MergedBagRow[] => {
    const dayBagLogs = (bagLogs || []).filter(b => b && (isSameDate(b.date, selDate) || isSameDate(b.date, toDateLabel(selDate))));
    const dayRemainLogs = (remainLogs || []).filter(r => r && (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate))));
    const dayFeedRecords = (feedingRecords || []).filter(r => r && (isSameDate(r.date, selDate) || isSameDate(r.date, toDateLabel(selDate))));

    const map = new Map<string, MergedBagRow>();

    // 1. Map all active stocks from active ponds (status === "Active" with fish)
    const activePondsList = activePonds;
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

    // 2. Process dayBagLogs (stocks with bags opened logged today)
    dayBagLogs.forEach(b => {
      const fs = normalizeFishStock(b.fishStock) || "—";
      const bags = Number(b.bagsOpened) || 0;
      if (!isStockCurrentlyActive(b.fishStock) && !isStockCurrentlyActive(fs) && bags <= 0) return;
      const brand = b.brand || "—";
      const size = b.size || "—";
      const k = `${brand.toLowerCase().trim()}||${size.toLowerCase().trim()}||${fs.toLowerCase().trim()}`;
      const existing = map.get(k);
      const invItem = (inventory || []).find(f => f && (brand !== "—" ? f.brand.toLowerCase().trim() === brand.toLowerCase().trim() : true) && (size !== "—" ? isSamePelletSize(f.size, size) : true));
      const kgPb = Number(b.kgPerBag) || invItem?.weightPerBag || 15;
      const totalKg = Number(b.totalKg) || (bags * kgPb);

      const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
      const stockDate = matchingPond?.stockingDate && matchingPond.stockingDate !== "—"
        ? formatFishStockDate(matchingPond.stockingDate)
        : (fs && /^\d{4}-\d{2}-\d{2}/.test(fs) ? formatFishStockDate(fs) : (fs !== "—" && fs !== "General Stock" ? formatFishStock(fs) : "—"));

      const carryoverKg = getPriorCarryover(fs, size, selDate, brand);

      // Feeding records for this stock and size today
      const fedForSize = dayFeedRecords.filter(r =>
        (isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond), fs) || isStockMatch(r.pond, fs)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      );
      const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      // Check for explicit leftover entry
      const matchingRemain = dayRemainLogs.find(r =>
        isStockMatch(r.fishStock, fs) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      );

      let feedRemainingToday: number | null = null;
      if (matchingRemain && matchingRemain.remainingKg !== undefined && matchingRemain.remainingKg !== null) {
        feedRemainingToday = Number(matchingRemain.remainingKg) || 0;
      } else {
        feedRemainingToday = null;
      }

      if (existing) {
        existing.bagsOpened = bags;
        existing.totalKgOpened = totalKg;
        existing.lastBagLog = b;
        existing.hasBagLog = true;
        existing.carryoverKg = carryoverKg;
        existing.feedRemainingToday = feedRemainingToday;
        existing.remainingKg = feedRemainingToday ?? 0;
        existing.hasRemainLog = Boolean(matchingRemain);
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
          hasRemainLog: Boolean(matchingRemain),
          lastBagLog: b
        });
      }
      populatedStockKeys.add(fs.toLowerCase().trim());
      populatedStockKeys.add(normalizeFishStock(fs).toLowerCase().trim());
    });

    // 3. Process dayRemainLogs without bagLog
    dayRemainLogs.forEach(r => {
      const fs = normalizeFishStock(r.fishStock) || "—";
      const remVal = Number(r.remainingKg) || 0;
      if (!isStockCurrentlyActive(r.fishStock) && !isStockCurrentlyActive(fs) && remVal <= 0) return;
      const brand = r.brand || "—";
      const size = r.size || "—";
      const k = `${brand.toLowerCase().trim()}||${size.toLowerCase().trim()}||${fs.toLowerCase().trim()}`;
      const existing = map.get(k);

      if (existing) {
        existing.remainingKg = remVal;
        existing.feedRemainingToday = remVal;
        existing.hasRemainLog = true;
      } else {
        const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
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
          remainingKg: remVal,
          carryoverKg,
          feedRemainingToday: remVal,
          hasBagLog: false,
          hasRemainLog: true,
          lastBagLog: null
        });
      }
      populatedStockKeys.add(fs.toLowerCase().trim());
      populatedStockKeys.add(normalizeFishStock(fs).toLowerCase().trim());
    });

    // 4. Carry over unconsumed feed from prior days for active stocks
    activeStocksMap.forEach((stockInfo, key) => {
      const fs = stockInfo.stockName;
      const fedForStock = dayFeedRecords.filter(r =>
        isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond), fs) || isStockMatch(r.pond, fs)
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

      (remainLogs || []).filter(r => isStockMatch(r.fishStock, fs)).forEach(r => addCandidate(r.brand, r.size));
      (bagLogs || []).filter(b => isStockMatch(b.fishStock, fs)).forEach(b => addCandidate(b.brand, b.size));
      fedForStock.forEach(r => addCandidate(r.brand, r.size));
      (feedTransfers || []).filter(t => isStockMatch(t.destinationStock, fs)).forEach(t => addCandidate(t.feedBrand, t.feedSize));
      if (stockInfo.defaultPellet) {
        addCandidate(null, stockInfo.defaultPellet);
      }

      candidatePairs.forEach(({ brand, size }) => {
        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
        const fedForSize = fedForStock.filter(r => 
          isSamePelletSize(r.size, size) &&
          (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

        // Only include if there was genuine unconsumed carryover from prior days
        if (carryoverKg <= 0) return;

        const feedRemainingToday = Math.max(0, Math.round((carryoverKg - totalFed) * 10) / 10);

        const k = `${brand.toLowerCase().trim()}||${size.toLowerCase().trim()}||${key}`;
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
            feedRemainingToday,
            hasBagLog: false,
            lastBagLog: null
          });
        }
      });
    });

    // 4b. Ensure incoming transfers received on selDate are present in map
    (feedTransfers || []).filter(t => isSameDate(t.transferDate, selDate)).forEach(t => {
      const destStock = t.destinationStock;
      if (!isStockCurrentlyActive(destStock)) return;
      const brand = t.feedBrand || "—";
      const size = t.feedSize || "—";
      const stockInfo = activeStocksMap.get(normalizeFishStock(destStock).toLowerCase().trim()) ||
                        Array.from(activeStocksMap.values()).find(s => isStockMatch(s.stockName, destStock));
      const stockKey = stockInfo ? normalizeFishStock(stockInfo.stockName).toLowerCase().trim() : normalizeFishStock(destStock).toLowerCase().trim();
      const fs = stockInfo ? stockInfo.stockName : destStock;
      const k = `${brand.toLowerCase().trim()}||${size.toLowerCase().trim()}||${stockKey}`;

      if (!map.has(k)) {
        const matchingPond = (ponds || []).find(p => p && (pondToStock(p.name) === fs || p.name === fs || isStockMatch(p.name, fs)));
        const stockDate = stockInfo?.stockDate && stockInfo.stockDate !== fs 
          ? stockInfo.stockDate 
          : (matchingPond?.stockingDate && matchingPond.stockingDate !== "—" ? formatFishStockDate(matchingPond.stockingDate) : "—");

        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
        const matchingRemain = dayRemainLogs.find(r =>
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

    // 4c. Carry over unconsumed feed from prior days for cleared stocks (stocks not currently active in any pond)
    const allKnownStockNames = new Set<string>();
    (bagLogs || []).forEach(b => { if (b?.fishStock && !isPondName(b.fishStock)) allKnownStockNames.add(b.fishStock); });
    (remainLogs || []).forEach(r => { if (r?.fishStock && !isPondName(r.fishStock)) allKnownStockNames.add(r.fishStock); });
    (feedTransfers || []).forEach(t => {
      if (t?.sourceStock && !isPondName(t.sourceStock)) allKnownStockNames.add(t.sourceStock);
      if (t?.destinationStock && !isPondName(t.destinationStock)) allKnownStockNames.add(t.destinationStock);
    });

    allKnownStockNames.forEach(stockName => {
      if (isStockCurrentlyActive(stockName)) return;
      const fs = stockName;
      const key = normalizeFishStock(fs).toLowerCase().trim();
      if (!key) return;

      const candidatePairs: { brand: string; size: string }[] = [];
      const addCandidate = (bRaw?: string | null, szRaw?: string | null) => {
        if (!szRaw || szRaw === "—" || !szRaw.trim()) return;
        const sz = szRaw.trim();
        const b = (bRaw && bRaw !== "—" && bRaw.trim()) ? bRaw.trim() : (getMatchingBrandsForPallet(sz)[0] || "—");
        if (!candidatePairs.some(cp => cp.brand.toLowerCase().trim() === b.toLowerCase().trim() && isSamePelletSize(cp.size, sz))) {
          candidatePairs.push({ brand: b, size: sz });
        }
      };

      (remainLogs || []).filter(r => isStockMatch(r.fishStock, fs)).forEach(r => addCandidate(r.brand, r.size));
      (bagLogs || []).filter(b => isStockMatch(b.fishStock, fs)).forEach(b => addCandidate(b.brand, b.size));
      (feedTransfers || []).filter(t => isStockMatch(t.sourceStock, fs) || isStockMatch(t.destinationStock, fs)).forEach(t => addCandidate(t.feedBrand, t.feedSize));

      candidatePairs.forEach(({ brand, size }) => {
        const carryoverKg = getPriorCarryover(fs, size, selDate, brand);
        if (carryoverKg <= 0) return;

        const fedForSize = dayFeedRecords.filter(r =>
          (isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond), fs) || isStockMatch(r.pond, fs)) &&
          isSamePelletSize(r.size, size) &&
          (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
        );
        const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);
        const feedRemainingToday = Math.max(0, Math.round((carryoverKg - totalFed) * 10) / 10);

        const k = `${brand.toLowerCase().trim()}||${size.toLowerCase().trim()}||${key}`;
        if (!map.has(k)) {
          map.set(k, {
            brand,
            size,
            fishStock: fs,
            stockDate: "—",
            bagsOpened: 0,
            totalKgOpened: 0,
            remainingKg: feedRemainingToday,
            carryoverKg,
            feedRemainingToday,
            hasBagLog: false,
            lastBagLog: null
          });
        }
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
        (isSameDate(t.originalDate, selDate) || isSameDate(t.transferDate, selDate))
      );
      const totalTransferredOutKg = transfersOut.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // 2. Incoming transfers to this stock & size & brand received on selDate
      const transfersIn = (feedTransfers || []).filter(t =>
        isStockMatch(t.destinationStock, fs) &&
        (size === "—" || isSamePelletSize(t.feedSize, size)) &&
        (brand === "—" || !t.feedBrand || t.feedBrand === "—" || !brand || t.feedBrand.toLowerCase().trim() === brand.toLowerCase().trim()) &&
        isSameDate(t.transferDate, selDate)
      );
      const totalTransferredInKg = transfersIn.reduce((s, t) => s + (Number(t.quantityKg) || 0), 0);

      // Feeding for this stock, pellet size, and brand on selDate
      const fedForSize = dayFeedRecords.filter(r =>
        (isStockMatch(r.fishStock, fs) || isStockMatch(pondToStock(r.pond), fs) || isStockMatch(r.pond, fs)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (brand === "—" || !r.brand || r.brand === "—" || !brand || r.brand.toLowerCase().trim() === brand.toLowerCase().trim())
      );
      const totalFed = fedForSize.reduce((s, r) => s + (Number(r.total) || ((Number(r.morning) || 0) + (Number(r.evening) || 0))), 0);

      // Check if user has an explicit leftover entry for today (e.g. from manual edit or log)
      const matchingRemain = dayRemainLogs.find(r =>
        (isStockMatch(r.fishStock, fs) || normalizeFishStock(r.fishStock) === normalizeFishStock(fs)) &&
        (size === "—" || isSamePelletSize(r.size, size)) &&
        (entry.brand === "—" || !r.brand || r.brand === "—" || !entry.brand || r.brand.toLowerCase().trim() === entry.brand.toLowerCase().trim())
      );

      const grossRemainingKg = (entry.carryoverKg || 0) + (entry.totalKgOpened || 0) + totalTransferredInKg;
      const computedAvailable = Math.max(0, Math.round((grossRemainingKg - totalTransferredOutKg - totalFed) * 10) / 10);

      let finalRemaining: number | null = null;
      if (matchingRemain && matchingRemain.remainingKg !== undefined && matchingRemain.remainingKg !== null) {
        // Explicit user entry/edit takes precedence so manual edits always save and display properly
        finalRemaining = Number(matchingRemain.remainingKg) || 0;
        entry.hasRemainLog = true;
      } else {
        const hasBalance = (entry.carryoverKg || 0) > 0 || totalTransferredInKg > 0 || (entry.totalKgOpened || 0) > 0;
        finalRemaining = hasBalance ? computedAvailable : null;
        entry.hasRemainLog = false;
      }

      entry.transfersOut = transfersOut;
      entry.transfersIn = transfersIn;
      entry.totalTransferredOutKg = totalTransferredOutKg;
      entry.totalTransferredInKg = totalTransferredInKg;
      entry.feedRemainingToday = finalRemaining;
      entry.remainingKg = finalRemaining !== null ? finalRemaining : computedAvailable;
      entry.availableRemainingKg = finalRemaining !== null ? finalRemaining : computedAvailable;
      entry.grossRemainingKg = grossRemainingKg;
      entry.hasFedToday = totalFed > 0;
      entry.totalFedToday = totalFed;
    });

    return Array.from(map.values()).filter(row => 
      isStockCurrentlyActive(row.fishStock) ||
      (row.remainingKg && row.remainingKg > 0.001) ||
      (row.feedRemainingToday && row.feedRemainingToday > 0.001) ||
      (row.availableRemainingKg && row.availableRemainingKg > 0.001) ||
      (row.carryoverKg && row.carryoverKg > 0.001) ||
      row.hasBagLog ||
      row.hasRemainLog ||
      row.hasFedToday
    );
  }, [bagLogs, remainLogs, feedingRecords, feedTransfers, getTransferUsage, selDate, ponds, inventory, getPriorCarryover, dateToIso, getAssociatedPalletsForStock, getMatchingBrandsForPallet, availablePelletSizes, isStockCurrentlyActive]);

  const filteredMergedBagRows = useMemo(() => {
    let list = mergedBagRows;
    // Bags Opened view: Only display rows where bags were opened today OR feed is remaining OR stock was fed today
    list = list.filter(r => 
      r.hasBagLog || 
      r.hasRemainLog ||
      (r.bagsOpened && r.bagsOpened > 0) || 
      (r.remainingKg && r.remainingKg > 0.001) || 
      (r.feedRemainingToday && r.feedRemainingToday > 0.001) ||
      (r.availableRemainingKg && r.availableRemainingKg > 0.001) ||
      (r.carryoverKg && r.carryoverKg > 0.001) ||
      (r.totalTransferredInKg && r.totalTransferredInKg > 0.001) ||
      (r.hasFedToday && isStockCurrentlyActive(r.fishStock))
    );
    if (bagsStockFilter !== "All") {
      list = list.filter(r =>
        isStockMatch(bagsStockFilter, r.fishStock) ||
        normalizeFishStock(r.fishStock).toLowerCase() === normalizeFishStock(bagsStockFilter).toLowerCase()
      );
    }
    return list;
  }, [mergedBagRows, bagsStockFilter, isStockCurrentlyActive]);

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
    // Suggest pellet if used on the previous 2 consecutive feeding days for that specific active stock
    const getSuggestedPallet = (pondName: string, pObj?: Pond): string | null => {
      const pStockDbDate = pObj ? toValidDbDate(pObj.stockingDate) : null;
      const pondRecords = (feedingRecords || [])
        .filter(r => {
          if (!r || !r.size) return false;
          const matchPond = (r.pondId && pObj && r.pondId === pObj.id) || (r.pond || "").trim().toLowerCase() === pondName.trim().toLowerCase();
          if (!matchPond) return false;
          if (pObj && (pObj as any).fishStockId && r.fishStockId && r.fishStockId !== (pObj as any).fishStockId) return false;
          const rDate = toValidDbDate(r.date);
          if (pStockDbDate && rDate && rDate < pStockDbDate) return false;
          return (Number(r.total) > 0 || Number(r.morning) > 0 || Number(r.evening) > 0);
        })
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

    const rows: BulkRow[] = [];

    // Pre-populate all active ponds directly so every active pond shows up
    activePonds.forEach(p => {
      const pStockDbDate = toValidDbDate(p.stockingDate);
      const existingList = (feedingRecords || []).filter(r => {
        if (!r) return false;
        const matchesPond = (r.pondId && r.pondId === p.id) || (r.pond || "").trim().toLowerCase() === p.name.trim().toLowerCase();
        if (!matchesPond) return false;
        const matchesDate = isSameDate(r.date, targetDate) || r.date === dateLabel;
        if (!matchesDate) return false;
        if ((p as any).fishStockId && r.fishStockId && r.fishStockId !== (p as any).fishStockId) return false;
        const rDate = toValidDbDate(r.date);
        if (pStockDbDate && rDate && rDate < pStockDbDate) return false;
        return true;
      });
      const fsStock = getPondFishStock(p);
      const stockDate = p.stockingDate && p.stockingDate !== "—" ? formatFishStockDate(p.stockingDate) : "—";

      if (existingList.length > 0) {
        existingList.forEach((existing, idx) => {
          rows.push({
            rowId: existing.id || `row-${p.id}-${idx}`,
            pondId: p.id,
            pondName: p.name,
            initialStock: p.initialStock || 0,
            currentCount: p.currentCount || 0,
            size: existing.size && availablePelletSizes.includes(existing.size)
              ? existing.size
              : (availablePelletSizes[0] || "4.0 mm"),
            morning: existing.morning != null ? String(existing.morning) : "",
            evening: existing.evening != null ? String(existing.evening) : "",
            morningTime: existing.morningTime || "",
            eveningTime: existing.eveningTime || "",
            fishStock: existing.fishStock || fsStock,
            stockDate,
            isExtraPallet: idx > 0,
            palletNumber: idx + 1,
            existingRecordId: existing.id
          });
        });
      } else {
        const consecutiveSuggestion = getSuggestedPallet(p.name, p);
        const defSize = consecutiveSuggestion || (p.defaultPellet && availablePelletSizes.includes(p.defaultPellet) ? p.defaultPellet : (availablePelletSizes[0] || "4.0 mm"));
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

    return rows;
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
    const cleanLower = cleanPondName.toLowerCase();
    const targetPond = ponds.find(p => p.id === r.pondId || p.name.trim().toLowerCase() === cleanLower);
    const pondId = r.pondId || targetPond?.id;
    const fishStockId = targetPond?.fishStockId || pondId;
    const fishStock = r.fishStock || (targetPond ? getPondFishStock(targetPond) : pondToStock(cleanPondName));

    try {
      const existing = r.existingRecordId
        ? (feedingRecords || []).find(x => x && x.id === r.existingRecordId)
        : (feedingRecords || []).find(x =>
            x &&
            ((x.pondId && pondId && x.pondId === pondId) || (x.pond || "").trim().toLowerCase() === cleanLower) &&
            (isSameDate(x.date, bulkDate) || x.date === dateLabel) &&
            isSamePelletSize(x.size, r.size)
          );

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
          size: r.size,
          morning: m,
          evening: e,
          total: m + e,
          recordedBy: recorder,
          morningTime: r.morningTime || existing.morningTime,
          eveningTime: r.eveningTime || existing.eveningTime,
          fishStock: r.fishStock || existing.fishStock || fishStock,
          editHistory: hasChange ? [...(existing.editHistory || []), entry] : (existing.editHistory || [])
        });
        toast.success(`Feeding record updated for ${cleanPondName} (${r.size})`);
      } else {
        const brandForFeed = (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && isSamePelletSize(b.size, r.size) && (!b.fishStock || normalizeFishStock(b.fishStock) === pondToStock(cleanPondName)))?.brand || (inventory || []).find(f => f && isSamePelletSize(f.size, r.size))?.brand || "";
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
          eveningTime: r.eveningTime || undefined
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
        try { navigator.vibrate(50); } catch {}
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
      const promises: Promise<any>[] = [];
      for (const r of bulkRows) {
        const m = Number(r.morning) || 0;
        const e = Number(r.evening) || 0;
        if (m > 0 || e > 0) {
          const cleanPondName = (r.pondName || "").trim();
          const cleanLower = cleanPondName.toLowerCase();
          const targetPond = ponds.find(p => p.id === r.pondId || p.name.trim().toLowerCase() === cleanLower);
          const pondId = targetPond?.id || r.pondId;
          const canonicalPondName = targetPond?.name || cleanPondName;
          const fishStockId = targetPond?.fishStockId || pondId;
          const fishStock = r.fishStock || (targetPond ? getPondFishStock(targetPond) : pondToStock(cleanPondName));

          const existing = r.existingRecordId
            ? (feedingRecords || []).find(x => x && x.id === r.existingRecordId)
            : (feedingRecords || []).find(x =>
                x &&
                ((x.pondId && pondId && x.pondId === pondId) || (x.pond || "").trim().toLowerCase() === cleanLower) &&
                (isSameDate(x.date, bulkDate) || x.date === dateLabel) &&
                isSamePelletSize(x.size, r.size)
              );
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
              pondId: existing.pondId || pondId,
              fishStockId: existing.fishStockId || fishStockId,
              pond: canonicalPondName || existing.pond,
              size: r.size,
              morning: m,
              evening: e,
              total: m + e,
              recordedBy: recorder,
              morningTime: r.morningTime || existing.morningTime,
              eveningTime: r.eveningTime || existing.eveningTime,
              fishStock: r.fishStock || existing.fishStock || fishStock,
              editHistory: hasChange ? [...(existing.editHistory || []), entry] : (existing.editHistory || [])
            })));
          } else {
            const brandForFeed = (bagLogs || []).find(b => (isSameDate(b.date, bulkDate) || isSameDate(b.date, dateLabel)) && isSamePelletSize(b.size, r.size) && (!b.fishStock || normalizeFishStock(b.fishStock) === pondToStock(cleanPondName)))?.brand || (inventory || []).find(f => f && isSamePelletSize(f.size, r.size))?.brand || "";
            promises.push(Promise.resolve(onAddRecord({
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
              eveningTime: r.eveningTime || undefined
            })));
          }
        }
      }

      await Promise.all(promises);

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
                    const isToday = viewYear === lagosToday.year && viewMonth === lagosToday.month && day === lagosToday.day;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelDate(label); setShowCal(false); }}
                        className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-all ${
                          isSel
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

      {/* ── Tab bar (sticky on mobile only) ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-[#f5f7fa] md:static md:z-auto md:mx-0 md:px-0 md:py-0 md:bg-transparent overflow-x-auto no-scrollbar">
        <div className="flex gap-1 bg-slate-200/80 p-1 rounded-xl w-fit shrink-0">
          {(["daily", "bags", "mismatch"] as const).map(t => (
            <button
              key={t}
              onClick={() => setDocTab(t)}
              className={`relative px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                docTab === t ? "bg-white text-green-700 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
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
                      className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[10.5px] sm:text-xs transition-all ${
                        isSelected
                          ? "bg-white text-slate-900 font-bold shadow-xs border border-slate-200/80"
                          : "text-slate-500 hover:text-slate-800 font-medium"
                      }`}
                    >
                      <span className="truncate max-w-[58px] sm:max-w-none">{name}</span>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded-full leading-none shrink-0 ${
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
                      const isBagsMismatch = Boolean(expData.hasFed && (row.bagsOpened !== expData.expectedBags || (!row.hasBagLog && expData.expectedBags > 0)));
                      const isRemainMismatch = Boolean(row.hasRemainLog && expData.hasFed && Math.abs(((row.feedRemainingToday ?? row.remainingKg) || 0) - expData.expectedRemaining) > 0.05);

                      return (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/80 transition-colors ${isHighlightedRow ? "bg-orange-50/30" : ""}`}
                        >
                          {/* Sticky Fish Stock Column (Solid Opaque Background & High Z-Index) */}
                          <td className={`px-3.5 py-3 sticky left-0 z-20 border-r border-slate-100 min-w-[130px] max-w-[155px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)] ${isHighlightedRow ? "!bg-[#fffbeb]" : "bg-white"}`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800 text-xs truncate" title={getStockDisplayName(row.fishStock, row.stockDate)}>
                                {getStockDisplayName(row.fishStock, row.stockDate)}
                              </p>
                              {!isStockCurrentlyActive(row.fishStock) && (
                                <span className="shrink-0 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="This stock is cleared from all ponds, but remaining feed is still available">
                                  Cleared
                                </span>
                              )}
                            </div>
                            {/* Transfer Badges */}
                            {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                              <div className="mt-1">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                  (row.availableRemainingKg || 0) === 0
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
                            {expData.hasFed && (
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
                            {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                              <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                                ({row.totalTransferredOutKg} kg transferred)
                              </p>
                            ) : null}
                            {expData.hasFed && (
                              <p className={`text-[11px] font-medium mt-0.5 leading-tight ${isRemainMismatch ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                                Exp: {expData.expectedRemaining} kg
                              </p>
                            )}
                          </td>

                          {/* Actions: Quick Edit & 3-Dots Menu */}
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 relative">
                              {canEdit && (
                                isRecordEditable(row.lastBagLog?.date || selDate) ? (
                                  <button onClick={() => openEditMergedRow(row)} className="p-1.5 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title={row.hasBagLog ? "Edit entry" : "Log bags / leftover"}>
                                    <Pencil size={13} />
                                  </button>
                                ) : (
                                  <button onClick={() => alert("This record can only be edited by an Administrator or Manager after 24 hours.")} className="p-1.5 rounded text-slate-300 cursor-not-allowed" title="Locked">
                                    <Lock size={13} />
                                  </button>
                                )
                              )}
                              {/* 3-dots Menu Button */}
                              <div className="relative">
                                <button
                                  type="button"
                                  data-bag-menu-button="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const mId = `desktop__${row.fishStock}__${row.brand}__${row.size}`;
                                    setActiveBagMenuId(activeBagMenuId === mId ? null : mId);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="Actions"
                                >
                                  <MoreVertical size={14} />
                                </button>
                                {activeBagMenuId === `desktop__${row.fishStock}__${row.brand}__${row.size}` && (
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
                                    {canEdit && isRecordEditable(row.lastBagLog?.date || selDate) && (
                                      <button
                                        type="button"
                                        onClick={() => { setActiveBagMenuId(null); openEditMergedRow(row); }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                      >
                                        <Pencil size={13} className="text-green-600" /> {row.hasBagLog ? "Edit Entry" : "Log Bags"}
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
                                      className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${
                                        (row.availableRemainingKg ?? 0) > 0 && canEdit
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
                const isBagsMismatch = Boolean(expData.hasFed && (row.bagsOpened !== expData.expectedBags || (!row.hasBagLog && expData.expectedBags > 0)));
                const isRemainMismatch = Boolean(row.hasRemainLog && expData.hasFed && Math.abs(((row.feedRemainingToday ?? row.remainingKg) || 0) - expData.expectedRemaining) > 0.05);
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
                        {isRemainColHighlighted && !isBagsColHighlighted && <span className="text-[10px] text-amber-800 font-semibold">Check Feed Remaining</span>}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate flex items-center gap-1.5">
                          <span className="truncate">{getStockDisplayName(row.fishStock, row.stockDate)}</span>
                          {!isStockCurrentlyActive(row.fishStock) && (
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
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                              (row.availableRemainingKg || 0) === 0
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
                              setActiveBagMenuId(isMenuOpen ? null : `${row.fishStock}__${row.brand}__${row.size}`);
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
                                isRecordEditable(row.lastBagLog?.date || selDate) ? (
                                  <button
                                    type="button"
                                    onClick={() => { setActiveBagMenuId(null); openEditMergedRow(row); }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Pencil size={13} className="text-green-600" /> {row.hasBagLog ? "Edit Entry" : "Log Bags"}
                                  </button>
                                ) : (
                                  <div className="px-3 py-1.5 text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <Lock size={12} /> Locked
                                  </div>
                                )
                              )}
                              {/* Transfer Remaining Feed (Section 3) */}
                              <button
                                type="button"
                                disabled={!canEdit || (row.availableRemainingKg ?? 0) <= 0}
                                onClick={() => {
                                  setActiveBagMenuId(null);
                                  openTransferModal(row);
                                }}
                                className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 transition-colors ${
                                  (row.availableRemainingKg ?? 0) > 0 && canEdit
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
                        {expData.hasFed && (
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
                        {row.totalTransferredOutKg && row.totalTransferredOutKg > 0 ? (
                          <p className="text-[10px] text-teal-700 font-medium leading-tight mt-0.5">
                            ({row.totalTransferredOutKg} kg transferred)
                          </p>
                        ) : null}
                        {expData.hasFed && (
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










      {showLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-6" onClick={e => e.target === e.currentTarget && setShowLog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden h-[90vh] max-h-[90dvh]">
            <div className="flex items-start justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white shrink-0 z-30 shadow-xs">
              <div className="min-w-0 flex-1 mr-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Feeding</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Record feeding for active ponds for <span className="font-semibold text-slate-800">{toDateLabel(bulkDate)}</span>.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold shadow-2xs">
                      <Calendar size={13} className="text-teal-600 shrink-0" />
                      <span>{toDateLabel(bulkDate) || bulkDate}</span>
                    </div>
                    {/* Mobile Table / Card Toggle (Mobile Only) */}
                    <div className="flex md:hidden items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => setBulkMobileView("table")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          bulkMobileView === "table"
                            ? "bg-white text-green-700 font-bold shadow-xs border border-slate-200/80"
                            : "text-slate-500 hover:text-slate-800 font-medium"
                        }`}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkMobileView("card")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                          bulkMobileView === "card"
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
                      const pondObj = ponds.find(p => p.id === row.pondId || p.name === row.pondName);
                      const rowMaxKg = pondObj?.maxKgByPallet?.[row.size];
                      const cumFed = (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pondObj?.id : r.pond === row.pondName) && r.size === row.size && ((pondObj as any)?.fishStockId ? r.fishStockId === (pondObj as any).fishStockId : (!pondObj?.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pondObj.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0);
                      const rowAtMax = !!rowMaxKg && cumFed >= rowMaxKg;
                      return (
                        <tr key={row.rowId} className={`transition-colors ${hasFeed ? "bg-green-50/40" : "hover:bg-slate-50/80"}`}>
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
                                      value={row.size}
                                      onChange={e => updateRow(row.rowId, "size", e.target.value)}
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
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                row.existingRecordId
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
                  const pondObj = ponds.find(p => p.id === row.pondId || p.name === row.pondName);
                  const rowMaxKg = pondObj?.maxKgByPallet?.[row.size];
                  const cumFed = (feedingRecords || []).filter(r => r && (r.pondId ? r.pondId === pondObj?.id : r.pond === row.pondName) && r.size === row.size && ((pondObj as any)?.fishStockId ? r.fishStockId === (pondObj as any).fishStockId : (!pondObj?.stockingDate || toValidDbDate(r.date) >= toValidDbDate(pondObj.stockingDate)))).reduce((s, r) => s + (Number(r.total) || 0), 0);
                  const rowAtMax = !!rowMaxKg && cumFed >= rowMaxKg;

                  return (
                    <div
                      key={row.rowId}
                      className={`bg-white border rounded-2xl p-3.5 shadow-2xs transition-all ${
                        hasFeed ? "border-green-300 bg-green-50/20 ring-1 ring-green-200/50" : "border-slate-200/80"
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold font-['Barlow_Condensed',sans-serif] ${
                            total > 0 ? "bg-green-600 text-white" : "bg-slate-100 text-slate-400"
                          }`}>
                            {total > 0 ? `${total} kg` : "0 kg"}
                          </span>
                        </div>
                      </div>

                      {/* Pellet Size Selection */}
                      <div className="mt-2.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pellet Size</label>
                        <select
                          value={row.size}
                          onChange={ev => updateRow(row.rowId, "size", ev.target.value)}
                          className={`${TS} text-xs py-1.5`}
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
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                            (Number(row.morning) || 0) + (Number(row.evening) || 0) > 0
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
      )}

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

      {/* ── Log Opened Bags & Leftover Feed Modal ── */}
      {/* ── Log Opened Bags & Leftover Feed Modal ── */}
      {showBagsModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-3 sm:p-6" onClick={e => e.target === e.currentTarget && setShowBagsModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90dvh] sm:max-h-[85vh]">
            <div className="flex items-start justify-between px-4 sm:px-5 py-3 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Log Opened Bags &amp; Leftover Feed</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Record bags opened and leftover feed per Fish Stock.</p>
              </div>
              <button onClick={() => setShowBagsModal(false)} className="text-slate-400 hover:text-slate-700 p-1 ml-4 shrink-0 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date:</span>
                <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg shadow-2xs">
                  {toDateLabel(bagsDate) || bagsDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-500 font-medium">{bagRows.length} card{bagRows.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3 space-y-3">
              {bagRows.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No bags logged for {toDateLabel(bagsDate) || bagsDate}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">You have not logged any opened bags for this date.</p>
                  <button
                    type="button"
                    onClick={addBagRow}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus size={13} /> Add Bag Log Entry
                  </button>
                </div>
              ) : (
                bagRows.map((row, i) => {
                  const avail = getStockAvailable(row.brand, row.size, row.id);
                  const requestedBags = Number(row.qty) || 0;
                  const requestedKg = requestedBags * row.kgPerBag;
                  const isOverStock = requestedBags > avail.remainingBags;

                  return (
                    <div key={i} className={`p-3 border rounded-xl relative space-y-2.5 ${isOverStock ? "border-red-300 bg-red-50/50" : "border-slate-200/90 bg-slate-50/90"}`}>
                      {bagRows.length > 1 && (
                        <button type="button" onClick={() => removeBagRow(i)} className="absolute top-2.5 right-2.5 p-1 rounded text-slate-300 hover:text-red-500 transition-colors" title="Remove card">
                          <X size={13} />
                        </button>
                      )}

                      {/* Fish Stock */}
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
                                value={row.size}
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
                                {!row.size && <option value="">Select pallet…</option>}
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
                                {row.size && !availablePelletSizes.includes(row.size) && !associated.includes(row.size) && (
                                  <option value={row.size}>{row.size}</option>
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
                                {!row.brand && <option value="">Select brand…</option>}
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

                      {/* Bags Opened & Leftover Feed (2 columns side by side) */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        {/* Left: Bags Opened */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                          <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider">Bags Opened</label>
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
                            className={`w-full text-[11px] px-2 py-1 bg-slate-50/50 border ${isOverStock || bagsErr[`qty_${i}`] ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-green-400"} rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1`}
                            placeholder="0"
                          />
                          {bagsErr[`qty_${i}`] && (
                            <p className="text-[10px] text-red-500 font-semibold">{bagsErr[`qty_${i}`]}</p>
                          )}
                          {(() => {
                            const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                            return (
                              <div className="space-y-0.5 mt-1">
                                <p className="text-[10px] text-slate-500 font-normal leading-tight">
                                  Expected Bags Open:{" "}
                                  <span className="text-emerald-700 font-bold">
                                    {exp.expectedBags} bag{exp.expectedBags !== 1 ? "s" : ""}
                                  </span>
                                  {exp.hasFed && <span className="text-slate-400"> ({exp.totalFed} kg fed)</span>}
                                  {row.qty !== "" && !isNaN(requestedBags) && requestedBags > 0 && (
                                    <span className="text-slate-500"> · {requestedKg} kg</span>
                                  )}
                                </p>
                                {!exp.hasFed && (
                                  <p className="text-[9px] text-slate-400 leading-tight">No feeding records on this date</p>
                                )}
                              </div>
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
                            onChange={e => {
                              updateBagRow(i, "remainingKg", e.target.value);
                              setBagsErr(p => {
                                const next = { ...p };
                                delete next[`rem_${i}`];
                                delete next[`qty_${i}`];
                                return next;
                              });
                            }}
                            className={`w-full text-[11px] px-2 py-1 bg-slate-50/50 border rounded-md font-normal text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-1 ${bagsErr[`rem_${i}`] ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:ring-green-400"}`}
                            placeholder="0.0"
                          />
                          {bagsErr[`rem_${i}`] && (
                            <p className="text-[10px] text-red-500 font-semibold">{bagsErr[`rem_${i}`]}</p>
                          )}
                          {(() => {
                            const exp = getExpectedFeedData(bagsDate, row.fishStock, row.brand, row.size, requestedBags);
                            return (
                              <p className="text-[10px] text-slate-500 font-normal leading-tight mt-1">
                                Expected Leftover:{" "}
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
                })
              )}
              {bagRows.length > 0 && (
                <button
                  type="button"
                  onClick={addBagRow}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50/70 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus size={14} /> Add Another Entry
                </button>
              )}
            </div>
            <div className="shrink-0 sticky bottom-0 bg-slate-50 border-t border-slate-100 px-4 sm:px-5 py-3 rounded-b-2xl flex items-center justify-between z-10">
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
                    const associated = getAssociatedPalletsForStock(editDocBag.fishStock || "", editDocBag.date);
                    const otherSizes = availablePelletSizes.filter(s => !associated.includes(s));
                    return (
                      <select
                        value={editDocBag.size}
                        onChange={e => {
                          const newSize = e.target.value;
                          const matchingBrands = getMatchingBrandsForPallet(newSize);
                          let newBrand = "";
                          if (matchingBrands.length === 1) {
                            newBrand = matchingBrands[0];
                          } else if (matchingBrands.length > 1) {
                            newBrand = matchingBrands.includes(editDocBag.brand) ? editDocBag.brand : matchingBrands[0];
                          } else {
                            newBrand = "";
                          }
                          const inv = (inventory || []).find(f => f && f.brand === newBrand && isSamePelletSize(f.size, newSize));
                          const kgPb = inv?.weightPerBag || editDocBag.kgPerBag || 15;
                          setEditDocBag(p => p ? { ...p, size: newSize, brand: newBrand, kgPerBag: kgPb, totalKg: p.bagsOpened * kgPb } : p);
                        }}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-normal focus:outline-none focus:ring-1 focus:ring-green-400 h-[34px]"
                      >
                        {!editDocBag.size && <option value="">Select pallet…</option>}
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
                        {editDocBag.size && !availablePelletSizes.includes(editDocBag.size) && !associated.includes(editDocBag.size) && (
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
                    const matchingBrands = getMatchingBrandsForPallet(editDocBag.size);
                    const brandOptions = matchingBrands.length > 0 ? matchingBrands : invBrands;
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
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Feed Remaining from Previous Day</p>
                  <p className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">{viewBagDetail.carryoverKg !== undefined ? `${viewBagDetail.carryoverKg} kg` : "0 kg"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Bags Opened Today</p>
                  <p className="text-base font-bold text-slate-800 font-['Barlow_Condensed',sans-serif]">{viewBagDetail.bagsOpened} bag{viewBagDetail.bagsOpened !== 1 ? "s" : ""}</p>
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
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              usage.isFullyConsumed
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
                          {eligibleStocks.map(s => (
                            <option key={s.key} value={s.name}>
                              {s.label}
                            </option>
                          ))}
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
                          className={`w-full py-2 px-3 text-xs bg-white border ${
                            numQty > currentAvail || (numQty <= 0 && transferQty !== "")
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
                          <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            usage.isFullyConsumed
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
    </div>
  );
}

export default FeedDocumentation;
