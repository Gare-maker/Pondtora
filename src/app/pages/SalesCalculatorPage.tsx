import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, Tag, CheckCircle,
  Pencil, Percent, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ChevronDown, MoreVertical, Eye, Check, Search, X, Clock,
  Phone, User, TrendingUp, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import type { PriceGroup, InvSettings, SalesCalculation, SalesCalculationItem } from "../types";
import { fmt, uid } from "../data";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput, StatCard, Pagination, PER_PAGE } from "../shared";

export interface SalesCalculatorItemState {
  id: string;
  groupId: string;
  qtyKg: string;
  discountPerKg: string;
}

const LOCAL_STORAGE_KEY = "pondtora_sales_calc_draft_v4";
const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Helper to format ISO timestamp into local YYYY-MM-DD
function toLocalYMD(dateVal: string | Date | undefined): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper to format date for short display e.g. "Oct 14" (matching Feeding Records)
function formatShortDate(ymd: string | null | undefined): string {
  if (!ymd || ymd === "All") return "All Dates";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const curYear = new Date().getFullYear();
    const mon = MON_NAMES[mIdx] || parts[1];
    return Number(y) === curYear ? `${mon} ${d}` : `${mon} ${d}, ${y}`;
  }
  return ymd;
}

// Helper to format date for full display e.g. "14 Oct 2026"
function formatReadableDate(ymd: string | null | undefined): string {
  if (!ymd || ymd === "All") return "All dates";
  const parts = ymd.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${MON_NAMES[mIdx] || parts[1]} ${y}`;
  }
  return ymd;
}

// Helper to format date and time e.g. "14 Oct 2026, 08:30 AM"
function formatDateTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const day = d.getDate();
  const mon = MON_NAMES[d.getMonth()];
  const yr = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day} ${mon} ${yr}, ${time}`;
}

export default function SalesCalculatorPage({
  priceGroups = [],
  calculations = [],
  onAddCalculation,
  onEditCalculation,
  onDeleteCalculation,
  onTogglePayment,
  onAddPriceGroup,
  onEditPriceGroup,
  onDeletePriceGroup,
  currency = "₦",
  activeFarmId,
  currentUser,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  priceGroups: PriceGroup[];
  calculations?: SalesCalculation[];
  onAddCalculation?: (c: SalesCalculation, items?: SalesCalculationItem[]) => Promise<void> | void;
  onEditCalculation?: (c: SalesCalculation) => Promise<void> | void;
  onDeleteCalculation?: (id: string) => Promise<void> | void;
  onTogglePayment?: (c: SalesCalculation) => Promise<void> | void;
  onAddPriceGroup: (g: PriceGroup) => void;
  onEditPriceGroup: (g: PriceGroup) => void;
  onDeletePriceGroup: (id: string) => void;
  settings?: InvSettings;
  currency?: string;
  activeFarmId?: string;
  currentUser?: { name: string; email: string };
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const cs = currency;

  // Active price groups
  const activePriceGroups = useMemo(() => {
    return (priceGroups || []).filter(g => g && g.status === "Active");
  }, [priceGroups]);

  // ── Modals State ──
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [groupFormMode, setGroupFormMode] = useState(false);
  const [editGroup, setEditGroup] = useState<PriceGroup | null>(null);
  const [groupF, setGroupF] = useState({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" as "Active" | "Inactive" });
  const [groupErr, setGroupErr] = useState<Record<string, string>>({});

  // Details View Modal
  const [selectedCalc, setSelectedCalc] = useState<SalesCalculation | null>(null);

  // ── Date Filtering (Feeding Records Style Calendar) ──
  const todayYMD = toLocalYMD(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(todayYMD); // Default to today e.g. "2026-10-14"
  const [showCalDropdown, setShowCalDropdown] = useState(false);

  // Calendar View month/year navigation
  const initialDateObj = new Date();
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth());

  const navMonth = (dir: number) => {
    let m = viewMonth + dir;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  };

  const curMonLabel = MON_NAMES[viewMonth];
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const calCells = Array(42).fill(null).map((_, i) => {
    const d = i - firstDayOfWeek + 1;
    return (d >= 1 && d <= daysInMonth) ? d : null;
  });

  // Calculate days in the current calendar view that have saved calculations
  const daysWithCalculations = useMemo(() => {
    const set = new Set<number>();
    (calculations || []).forEach(c => {
      if (!c?.createdAt) return;
      const d = new Date(c.createdAt);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        set.add(d.getDate());
      }
    });
    return set;
  }, [calculations, viewYear, viewMonth]);

  // ── Search & Filter State for List ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Unpaid">("All");
  const [page, setPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close 3-dots action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Calculator Form State ──
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountType, setDiscountType] = useState<"general" | "individual">("general");
  const [generalDiscPerKg, setGeneralDiscPerKg] = useState("");
  const [isSavingCalc, setIsSavingCalc] = useState(false);
  const [calcFormErr, setCalcFormErr] = useState<Record<string, string>>({});

  const [calcItems, setCalcItems] = useState<SalesCalculatorItemState[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: any) => ({
            id: it?.id || uid(),
            groupId: it?.groupId || "",
            qtyKg: String(it?.qtyKg ?? ""),
            discountPerKg: String(it?.discountPerKg ?? "")
          }));
        }
      }
    } catch {}
    return [{ id: uid(), groupId: "", qtyKg: "", discountPerKg: "" }];
  });

  // Keep draft in local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(calcItems));
    } catch {}
  }, [calcItems]);

  // Set default group when activePriceGroups load if items are empty
  useEffect(() => {
    if (activePriceGroups.length > 0) {
      setCalcItems(prev => {
        if (prev.length === 1 && !prev[0].groupId) {
          return [{ ...prev[0], groupId: activePriceGroups[0].id }];
        }
        return prev;
      });
    }
  }, [activePriceGroups]);

  const addCalcItem = (groupId?: string) => {
    const gid = groupId || activePriceGroups[0]?.id || "";
    setCalcItems(prev => [...prev, { id: uid(), groupId: gid, qtyKg: "", discountPerKg: "" }]);
  };

  const removeCalcItem = (id: string) => {
    setCalcItems(prev => {
      const filtered = prev.filter(x => x && x.id !== id);
      return filtered.length > 0 ? filtered : [{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }];
    });
  };

  const updateCalcItem = (id: string, field: keyof SalesCalculatorItemState, val: string) => {
    setCalcItems(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  const resetCalculator = () => {
    setCustomerName("");
    setCustomerPhone("");
    setDiscountType("general");
    setGeneralDiscPerKg("");
    setCalcFormErr({});
    setCalcItems([{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }]);
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
  };

  // ── Calculation Formulas ──
  const calculatedRows = useMemo(() => {
    const genDisc = Math.max(0, Number(generalDiscPerKg) || 0);
    return (calcItems || []).filter(Boolean).map(item => {
      const group = (priceGroups || []).find(g => g && g.id === item?.groupId);
      const pricePerKg = Number(group?.pricePerKg) || 0;
      const qty = Math.max(0, Number(item?.qtyKg) || 0);
      const discPerKg = discountType === "individual" ? Math.max(0, Number(item?.discountPerKg) || 0) : genDisc;
      const baseSubtotal = qty * pricePerKg;
      const rowDiscount = qty * discPerKg;
      const lineTotal = Math.max(0, baseSubtotal - rowDiscount);

      return {
        ...item,
        group,
        groupLabel: group ? `Group ${group.group} – ${group.displayName}` : "Select Group",
        pricePerKg,
        qtyKgNum: qty,
        discPerKg,
        baseSubtotal,
        rowDiscount,
        lineTotal
      };
    });
  }, [calcItems, priceGroups, discountType, generalDiscPerKg]);

  const totalKg = calculatedRows.reduce((s, r) => s + (r.qtyKgNum || 0), 0);
  const baseSubtotal = calculatedRows.reduce((s, r) => s + (r.baseSubtotal || 0), 0);
  const totalDiscount = calculatedRows.reduce((s, r) => s + (r.rowDiscount || 0), 0);
  const grandTotal = Math.max(0, baseSubtotal - totalDiscount);

  // ── Validation for Phone Number ──
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone || !phone.trim()) return true; // Phone is optional
    const clean = phone.replace(/[\s\-\(\)]/g, "");
    // Check that it's a plausible phone number: leading + or digits, 10 to 14 characters
    return /^\+?[0-9]{10,14}$/.test(clean);
  };

  // ── Save Calculation Handler ──
  const handleSaveCalculation = async () => {
    const errors: Record<string, string> = {};
    const trimmedName = customerName.trim();
    if (!trimmedName) {
      errors.customerName = "Customer name is required";
    }

    const trimmedPhone = customerPhone.trim();
    if (trimmedPhone && !validatePhoneNumber(trimmedPhone)) {
      errors.customerPhone = "Enter a valid phone number (e.g. 08012345678 or +234...)";
    }

    const validItems = calculatedRows.filter(r => r.qtyKgNum > 0 && r.group);
    if (validItems.length === 0) {
      errors.items = "Please select a price group and enter a valid weight (kg) for at least one item";
    }

    if (Object.keys(errors).length > 0) {
      setCalcFormErr(errors);
      return;
    }

    setCalcFormErr({});
    setIsSavingCalc(true);

    const calcId = uid();
    const nowIso = new Date().toISOString();

    const snapshotItems: SalesCalculationItem[] = validItems.map(r => ({
      id: uid(),
      calculationId: calcId,
      priceGroupId: r.group?.id,
      priceGroupName: r.group?.displayName || "",
      priceGroupCode: r.group?.group || "",
      quantityKg: r.qtyKgNum,
      unitPrice: r.pricePerKg,
      subtotal: r.baseSubtotal,
      individualDiscountType: discountType,
      individualDiscountValue: r.discPerKg,
      individualDiscountAmount: r.rowDiscount,
      finalAmount: r.lineTotal,
      createdAt: nowIso
    }));

    const newCalculation: SalesCalculation = {
      id: calcId,
      farmId: activeFarmId,
      customerName: trimmedName,
      customerPhone: trimmedPhone ? trimmedPhone : null,
      subtotal: baseSubtotal,
      generalDiscountType: discountType,
      generalDiscountValue: discountType === "general" ? Number(generalDiscPerKg) || 0 : 0,
      generalDiscountAmount: totalDiscount,
      totalAmount: grandTotal,
      amountPaid: 0,
      paymentStatus: "Unpaid",
      items: snapshotItems,
      createdBy: currentUser?.name || "Staff",
      createdAt: nowIso,
      updatedAt: nowIso
    };

    try {
      if (onAddCalculation) {
        await onAddCalculation(newCalculation, snapshotItems);
      }
      toast.success(`Calculation for ${trimmedName} saved successfully!`);
      setShowCalculatorModal(false);
      resetCalculator();
    } catch (err: any) {
      console.error("Failed to save sales calculation:", err);
      toast.error(err?.message || "Failed to save calculation. Please check your network.");
    } finally {
      setIsSavingCalc(false);
    }
  };

  // ── Toggle Payment Status ──
  const handleTogglePayment = async (c: SalesCalculation) => {
    try {
      if (onTogglePayment) {
        await onTogglePayment(c);
      }
      const newStatus = c.paymentStatus === "Paid" ? "Unpaid" : "Paid";
      toast.success(`Marked as ${newStatus}`);
      if (selectedCalc && selectedCalc.id === c.id) {
        setSelectedCalc({
          ...selectedCalc,
          paymentStatus: newStatus,
          amountPaid: newStatus === "Paid" ? selectedCalc.totalAmount : 0
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update payment status");
    }
  };

  // ── Delete Calculation ──
  const handleDeleteCalc = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the calculation for ${name}?`)) return;
    try {
      if (onDeleteCalculation) {
        await onDeleteCalculation(id);
      }
      toast.success("Calculation deleted");
      if (selectedCalc?.id === id) {
        setSelectedCalc(null);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete calculation");
    }
  };

  // ── Date Filtering & Statistics Calculations ──
  // Both statistics cards must calculate values across ALL farm calculations matching the active date filter
  const dateScopedCalculations = useMemo(() => {
    if (!selectedDate || selectedDate === "All") {
      return calculations || [];
    }
    return (calculations || []).filter(c => {
      if (!c?.createdAt) return false;
      return toLocalYMD(c.createdAt) === selectedDate;
    });
  }, [calculations, selectedDate]);

  // Card 1: Total Calculations (distinct count of saved calculations matching active filter)
  const totalCalculationsCount = dateScopedCalculations.length;

  // Card 2: Total Sales (sum of final payable amount for saved calculations matching active filter)
  const totalSalesAmount = dateScopedCalculations.reduce((sum, c) => sum + (Number(c.totalAmount) || 0), 0);

  // Subtitle for statistics cards
  const statDateSubLabel = selectedDate && selectedDate !== "All"
    ? formatReadableDate(selectedDate)
    : "All dates";

  // Filtered list for table (combines date filter with search and status filters)
  const filteredCalculations = useMemo(() => {
    return dateScopedCalculations.filter(c => {
      if (!c) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = (c.customerName || "").toLowerCase().includes(q);
        const matchPhone = (c.customerPhone || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone) return false;
      }
      if (statusFilter !== "All") {
        if (c.paymentStatus !== statusFilter) return false;
      }
      return true;
    });
  }, [dateScopedCalculations, search, statusFilter]);

  // Pagination for table
  const totalPages = Math.ceil(filteredCalculations.length / PER_PAGE);
  const paginatedCalculations = useMemo(() => {
    const start = (page - 1) * PER_PAGE;
    return filteredCalculations.slice(start, start + PER_PAGE);
  }, [filteredCalculations, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedDate, search, statusFilter]);

  // Price Group management handlers
  const handleSaveGroup = () => {
    const errs: Record<string, string> = {};
    if (!groupF.group.trim()) errs.group = "Group code required (e.g. A)";
    if (!groupF.displayName.trim()) errs.displayName = "Display name required";
    if (!groupF.pricePerKg || Number(groupF.pricePerKg) <= 0) errs.pricePerKg = "Valid price per kg required";
    if (Object.keys(errs).length) { setGroupErr(errs); return; }

    const payload: PriceGroup = {
      id: editGroup?.id || uid(),
      group: groupF.group.trim().toUpperCase(),
      displayName: groupF.displayName.trim(),
      description: groupF.description.trim(),
      pricePerKg: Number(groupF.pricePerKg),
      status: groupF.status,
      farmId: editGroup?.farmId || activeFarmId
    };

    if (editGroup) {
      onEditPriceGroup(payload);
      toast.success(`Price Group ${payload.group} updated`);
    } else {
      onAddPriceGroup(payload);
      toast.success(`Price Group ${payload.group} created`);
    }

    setGroupFormMode(false);
    setEditGroup(null);
    setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" });
    setGroupErr({});
  };

  const handleEditClick = (g: PriceGroup) => {
    setEditGroup(g);
    setGroupF({
      group: g.group,
      displayName: g.displayName,
      description: g.description || "",
      pricePerKg: String(g.pricePerKg),
      status: g.status
    });
    setGroupFormMode(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-6xl mx-auto pb-24 sm:pb-12">
      {/* ── Top Header Bar ── */}
      <div className="lg:sticky lg:top-0 lg:z-30 lg:bg-[#f5f7fa] lg:-mx-6 lg:-mt-6 lg:px-6 lg:py-4 space-y-2.5">
        {/* Top Row: Title + Date Selector (Top Right, matching Feeding Records exactly) */}
        <div className="flex items-start justify-between gap-2.5 sm:gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-tight">
              Sales Management
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight break-words">
              Calculate purchases, save customer details, track payments, and monitor sales totals.
            </p>
          </div>

          {/* Date selector (Top Right) */}
          <div className="shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowCalDropdown(p => !p)}
              className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-2 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-green-400 hover:shadow-sm transition-all text-slate-800"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500 shrink-0">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="font-['Barlow_Condensed',sans-serif] text-sm sm:text-base font-bold tracking-tight whitespace-nowrap">
                {formatShortDate(selectedDate)}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showCalDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Calendar Dropdown Popover */}
            {showCalDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowCalDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-[280px]">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                      <ChevronLeft size={15}/>
                    </button>
                    <span className="text-sm font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-wide">
                      {curMonLabel} {viewYear}
                    </span>
                    <button type="button" onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                      <ChevronRight size={15}/>
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-1">
                    {DAY_ABBR.map(d => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-1">
                    {calCells.map((day, i) => {
                      if (!day) return <div key={i} />;
                      const mm = String(viewMonth + 1).padStart(2, "0");
                      const dd = String(day).padStart(2, "0");
                      const cellYMD = `${viewYear}-${mm}-${dd}`;
                      const hasRec = daysWithCalculations.has(day);
                      const isSel = selectedDate === cellYMD;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedDate(cellYMD);
                            setShowCalDropdown(false);
                          }}
                          className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-xs transition-all ${
                            isSel
                              ? "bg-green-600 text-white font-bold shadow-xs"
                              : hasRec
                              ? "text-slate-900 font-semibold hover:bg-green-50"
                              : "text-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {day}
                          {hasRec && !isSel && (
                            <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#F97316" }} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "#F97316" }} />Has records
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />Selected
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(todayYMD);
                          setViewYear(initialDateObj.getFullYear());
                          setViewMonth(initialDateObj.getMonth());
                          setShowCalDropdown(false);
                        }}
                        className="flex-1 text-center py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedDate(null); setShowCalDropdown(false); }}
                        className="flex-1 text-center py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        All Dates
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons Row (NO divider underneath) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Button 1: Update Price Groups */}
            <PBtn
              sm
              outline
              onClick={() => { setShowGroupsPanel(true); setGroupFormMode(false); setEditGroup(null); }}
            >
              <Tag size={13} /> Update Price Groups ({activePriceGroups.length})
            </PBtn>

            {/* Button 2: Calculator */}
            {canCreate && (
              <PBtn sm onClick={() => setShowCalculatorModal(true)}>
                <Calculator size={13} /> Calculator
              </PBtn>
            )}
          </div>

          {/* Active Filter Indicator Tag */}
          {selectedDate && selectedDate !== "All" && (
            <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-xl text-xs font-medium">
              <span>Date: <strong>{formatReadableDate(selectedDate)}</strong></span>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-orange-500 hover:text-orange-800 rounded p-0.5"
                title="Reset to All Dates"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Two Statistics Cards (Side-by-side on mobile and desktop) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Card 1: Total Customers Calculation */}
        <StatCard
          label="Total Customers Calculation"
          value={totalCalculationsCount.toLocaleString()}
          sub={statDateSubLabel}
          icon={Calculator}
          color="blue"
        />

        {/* Card 2: Total Sales */}
        <StatCard
          label="Total Sales"
          value={fmt(totalSalesAmount, cs)}
          sub={statDateSubLabel}
          icon={TrendingUp}
          hi
        />
      </div>

      {/* ── Saved Calculations Header & Filters ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-tight">
            Saved Customer Calculations
          </h2>
          <p className="text-xs text-slate-400">
            Showing {filteredCalculations.length} calculation{filteredCalculations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter by status & search input */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer..."
              className={`${IC} text-xs py-1.5 pl-8 pr-2.5 w-full`}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className={`${SC} text-xs py-1.5 px-2.5 w-auto`}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* ── Desktop Layout: Compact Table ── */}
      <div className="hidden md:block">
        <Card className="overflow-hidden shadow-2xs border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="px-3.5 py-3">Customer</th>
                  <th className="px-3.5 py-3">Date &amp; Time</th>
                  <th className="px-3.5 py-3">Price Groups</th>
                  <th className="px-3.5 py-3 text-right">Quantity (kg)</th>
                  <th className="px-3.5 py-3 text-right">Total Amount</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                  <th className="px-3.5 py-3 text-center w-12">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCalculations.map(c => {
                  const items = c.items || [];
                  const totalKgForCalc = items.reduce((s, it) => s + (Number(it.quantityKg) || 0), 0);
                  const isPaid = c.paymentStatus === "Paid";
                  const groupCodes = Array.from(new Set(items.map(it => it.priceGroupCode || it.priceGroupName).filter(Boolean)));

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCalc(c)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Customer Name & Phone */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-green-50 text-green-700 flex items-center justify-center font-bold text-xs shrink-0 font-['Barlow_Condensed',sans-serif]">
                            {c.customerName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-green-700 transition-colors block">
                              {c.customerName}
                            </span>
                            {c.customerPhone && (
                              <span className="text-[11px] text-slate-400 font-mono block">
                                {c.customerPhone}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatDateTime(c.createdAt)}</span>
                        </div>
                      </td>

                      {/* Price Groups */}
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {groupCodes.length > 0 ? (
                            groupCodes.map((code, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 font-mono"
                              >
                                {code.length <= 3 ? `Group ${code}` : code}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Standard</span>
                          )}
                        </div>
                      </td>

                      {/* Total Weight in KG */}
                      <td className="px-3.5 py-3 text-right font-mono font-semibold text-slate-700">
                        {totalKgForCalc.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">kg</span>
                      </td>

                      {/* Total Amount Payable */}
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900 text-xs sm:text-sm">
                        {fmt(c.totalAmount, cs)}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="px-3.5 py-3 text-center">
                        <Bdg
                          label={c.paymentStatus || "Unpaid"}
                          color={isPaid ? "green" : "amber"}
                        />
                      </td>

                      {/* Three-dot action menu */}
                      <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {openActionMenuId === c.id && (
                            <div
                              ref={actionMenuRef}
                              className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                type="button"
                                onClick={() => { setSelectedCalc(c); setOpenActionMenuId(null); }}
                                className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                              >
                                <Eye size={13} /> View Details
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => { handleTogglePayment(c); setOpenActionMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                                >
                                  <Check size={13} /> Mark as {isPaid ? "Unpaid" : "Paid"}
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => { handleDeleteCalc(c.id, c.customerName); setOpenActionMenuId(null); }}
                                  className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                                >
                                  <Trash2 size={13} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paginatedCalculations.length === 0 && (
            <div className="text-center py-12 px-4 space-y-3">
              <Calculator size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No customer calculations found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {selectedDate
                  ? `No calculations recorded for ${formatReadableDate(selectedDate)}.`
                  : "Start calculating customer purchases using the Calculator button above."}
              </p>
              {canCreate && (
                <PBtn sm onClick={() => setShowCalculatorModal(true)} className="mx-auto mt-2">
                  <Calculator size={13} /> Open Calculator
                </PBtn>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Mobile Layout: Clean Responsive Cards ── */}
      <div className="md:hidden space-y-3">
        {paginatedCalculations.map(c => {
          const items = c.items || [];
          const totalKgForCalc = items.reduce((s, it) => s + (Number(it.quantityKg) || 0), 0);
          const isPaid = c.paymentStatus === "Paid";
          const groupCodes = Array.from(new Set(items.map(it => it.priceGroupCode || it.priceGroupName).filter(Boolean)));

          return (
            <div
              key={c.id}
              onClick={() => setSelectedCalc(c)}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs space-y-2.5 cursor-pointer hover:border-green-300 transition-colors"
            >
              {/* Header: Name, Payment Status, 3-dots */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 truncate">{c.customerName}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{formatDateTime(c.createdAt)}</span>
                    {c.customerPhone && (
                      <span className="font-mono text-slate-500">· {c.customerPhone}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <Bdg label={c.paymentStatus || "Unpaid"} color={isPaid ? "green" : "amber"} />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openActionMenuId === c.id && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs"
                      >
                        <button
                          type="button"
                          onClick={() => { setSelectedCalc(c); setOpenActionMenuId(null); }}
                          className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 flex items-center gap-2"
                        >
                          <Eye size={13} /> View Details
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => { handleTogglePayment(c); setOpenActionMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 flex items-center gap-2"
                          >
                            <Check size={13} /> Mark as {isPaid ? "Unpaid" : "Paid"}
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => { handleDeleteCalc(c.id, c.customerName); setOpenActionMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Groups and Weight */}
              <div className="flex items-center justify-between text-xs py-1.5 border-t border-b border-slate-100">
                <div className="flex flex-wrap gap-1 items-center min-w-0">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Groups:</span>
                  {groupCodes.length > 0 ? (
                    groupCodes.map((code, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono">
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[10px]">Standard</span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {totalKgForCalc.toLocaleString()} kg
                  </span>
                </div>
              </div>

              {/* Total Payable Amount */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] font-medium text-slate-500">Total Payable:</span>
                <span className="text-base font-extrabold text-green-700 font-mono">
                  {fmt(c.totalAmount, cs)}
                </span>
              </div>
            </div>
          );
        })}

        {paginatedCalculations.length === 0 && (
          <div className="text-center py-10 px-4 bg-white border border-slate-200 rounded-2xl space-y-2.5">
            <Calculator size={32} className="mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">No customer calculations found</p>
            {canCreate && (
              <PBtn sm onClick={() => setShowCalculatorModal(true)} className="mx-auto mt-1">
                <Calculator size={13} /> Open Calculator
              </PBtn>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          total={filteredCalculations.length}
          page={page}
          perPage={PER_PAGE}
          onPage={setPage}
        />
      )}

      {/* ── Calculator Modal (Integrated Call-Up Price Calculator) ── */}
      {showCalculatorModal && (
        <Modal
          title="Customer Purchase Calculator"
          onClose={() => { if (!isSavingCalc) setShowCalculatorModal(false); }}
          wide
        >
          <div className="space-y-3.5 pb-2">
            {/* Customer Details Form: Side-by-side on all screens */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Alhaji Musa"
                  className={`${IC} text-xs py-2`}
                />
                {calcFormErr.customerName && <p className="text-red-500 text-[10px] mt-0.5">{calcFormErr.customerName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Phone <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className={`${IC} text-xs py-2`}
                />
                {calcFormErr.customerPhone && <p className="text-red-500 text-[10px] mt-0.5">{calcFormErr.customerPhone}</p>}
              </div>
            </div>

            {/* Discount Bar (Compact and clean) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                  <Percent size={12} className="text-green-600" /> Discount:
                </span>
                <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDiscountType("general")}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      discountType === "general"
                        ? "bg-white text-green-700 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("individual")}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                      discountType === "individual"
                        ? "bg-white text-green-700 shadow-2xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {discountType === "general" && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <span className="text-[11px] text-slate-500 font-medium">Per kg:</span>
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">{cs}</span>
                    <NumInput
                      value={generalDiscPerKg}
                      onChange={setGeneralDiscPerKg}
                      placeholder="0"
                      className={`${IC} text-xs py-1 pl-5 pr-6 text-right font-medium`}
                      allowDecimal={true}
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">/kg</span>
                  </div>
                </div>
              )}
            </div>

            {calcFormErr.items && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{calcFormErr.items}</span>
              </div>
            )}

            {/* Fish Items Table (Desktop) */}
            <div className="hidden sm:block overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-left w-10">#</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-left min-w-[200px]">Price Group</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-left w-36">Weight (KG)</th>
                    {discountType === "individual" && (
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-left min-w-[140px] w-40">Discount ({cs}/kg)</th>
                    )}
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-right w-36">Amount</th>
                    <th className="px-3 py-2 w-8"/>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculatedRows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-slate-400 text-center text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={row.groupId}
                          onChange={e => updateCalcItem(row.id, "groupId", e.target.value)}
                          className={`${SC} text-xs py-1.5 px-2.5`}
                        >
                          <option value="">Select Price Group...</option>
                          {activePriceGroups.map(g => (
                            <option key={g.id} value={g.id}>
                              Group {g.group} – {g.displayName} ({fmt(g.pricePerKg, cs)}/kg)
                            </option>
                          ))}
                        </select>
                        {row.pricePerKg > 0 && (
                          <p className="text-[10px] text-green-700 mt-1 pl-0.5 font-medium">
                            Rate: {fmt(row.pricePerKg, cs)}/kg
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="relative">
                          <NumInput
                            value={row.qtyKg}
                            onChange={v => updateCalcItem(row.id, "qtyKg", v)}
                            placeholder="0"
                            className={`${IC} text-xs py-1.5 pr-8 text-right font-medium`}
                            allowDecimal={true}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">kg</span>
                        </div>
                      </td>
                      {discountType === "individual" && (
                        <td className="px-3 py-2.5">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">{cs}</span>
                            <NumInput
                              value={row.discountPerKg}
                              onChange={v => updateCalcItem(row.id, "discountPerKg", v)}
                              placeholder="0"
                              className={`${IC} text-xs py-1.5 pl-6 pr-8 text-right font-medium`}
                              allowDecimal={true}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">/kg</span>
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-bold text-slate-900 block font-mono">
                          {fmt(row.lineTotal, cs)}
                        </span>
                        {row.rowDiscount > 0 && (
                          <span className="text-[10px] text-rose-500 block">
                            −{fmt(row.rowDiscount, cs)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {calculatedRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCalcItem(row.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Fish Items List (Mobile) */}
            <div className="sm:hidden space-y-2.5">
              {calculatedRows.map((row, idx) => (
                <div key={row.id} className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 font-mono">{fmt(row.lineTotal, cs)}</span>
                      {calculatedRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCalcItem(row.id)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <select
                      value={row.groupId}
                      onChange={e => updateCalcItem(row.id, "groupId", e.target.value)}
                      className={`${SC} text-xs py-1.5 px-2`}
                    >
                      <option value="">Select Price Group...</option>
                      {activePriceGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          Group {g.group} – {g.displayName} ({fmt(g.pricePerKg, cs)}/kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={`grid ${discountType === "individual" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                    <div>
                      <div className="relative">
                        <NumInput
                          value={row.qtyKg}
                          onChange={v => updateCalcItem(row.id, "qtyKg", v)}
                          placeholder="Weight in kg"
                          className={`${IC} text-xs py-1.5 pr-8 text-right font-medium`}
                          allowDecimal={true}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">kg</span>
                      </div>
                    </div>

                    {discountType === "individual" && (
                      <div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">{cs}</span>
                          <NumInput
                            value={row.discountPerKg}
                            onChange={v => updateCalcItem(row.id, "discountPerKg", v)}
                            placeholder="Disc/kg"
                            className={`${IC} text-xs py-1.5 pl-6 pr-8 text-right font-medium`}
                            allowDecimal={true}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">/kg</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Row & Reset Buttons */}
            <div className="flex items-center justify-between pt-1">
              <PBtn sm outline onClick={() => addCalcItem()}>
                <Plus size={13} /> Add Fish Size
              </PBtn>
              <button
                type="button"
                onClick={resetCalculator}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
                disabled={isSavingCalc}
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>

            {/* Summary by Group (if multiple groups) */}
            {calculatedRows.filter(r => r.qtyKgNum > 0 && r.group).length > 1 && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Summary Breakdown
                </span>
                {calculatedRows.filter(r => r.qtyKgNum > 0 && r.group).map(row => (
                  <div key={row.id} className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span className="truncate">Group {row.group?.group} ({row.qtyKgNum.toLocaleString()} kg)</span>
                    <span className="font-semibold text-slate-900 font-mono">{fmt(row.lineTotal, cs)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Sticky Bottom Action & Save Bar (Always Visible!) */}
            <div className="sticky bottom-0 z-20 bg-white border-t border-slate-200 px-4 py-3 -mx-5 -mb-4 flex items-center justify-between gap-3 shadow-lg">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total ({totalKg.toLocaleString()} kg)
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-green-700 font-['Barlow_Condensed',sans-serif] font-mono leading-none">
                  {fmt(grandTotal, cs)}
                </span>
                {totalDiscount > 0 && (
                  <span className="text-[10px] text-rose-500 block">
                    −{fmt(totalDiscount, cs)} discount
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculatorModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                  disabled={isSavingCalc}
                >
                  Cancel
                </button>
                <PBtn
                  onClick={handleSaveCalculation}
                  disabled={isSavingCalc}
                  className="px-4 py-2 text-xs font-bold shadow-sm"
                >
                  <CheckCircle size={14} /> {isSavingCalc ? "Saving..." : "Save Calculation"}
                </PBtn>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Calculation Details Modal ── */}
      {selectedCalc && (
        <Modal
          title={`Calculation Details — ${selectedCalc.customerName}`}
          onClose={() => setSelectedCalc(null)}
          wide
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                    {selectedCalc.customerName}
                  </h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {formatDateTime(selectedCalc.createdAt)}
                  </p>
                </div>
                <Bdg
                  label={selectedCalc.paymentStatus || "Unpaid"}
                  color={selectedCalc.paymentStatus === "Paid" ? "green" : "amber"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                {/* Customer Phone: Only show if provided, completely omitted otherwise */}
                {selectedCalc.customerPhone && selectedCalc.customerPhone.trim() !== "" && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>Phone: <strong className="text-slate-800 font-mono">{selectedCalc.customerPhone}</strong></span>
                  </div>
                )}
                {selectedCalc.createdBy && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span>Recorded By: <strong className="text-slate-800">{selectedCalc.createdBy}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-3.5 py-2.5">Price Group</th>
                    <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                    <th className="px-3.5 py-2.5 text-right">Weight</th>
                    <th className="px-3.5 py-2.5 text-right">Discount</th>
                    <th className="px-3.5 py-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedCalc.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="px-3.5 py-2.5">
                        <span className="font-bold text-slate-800 block">
                          {it.priceGroupCode ? `Group ${it.priceGroupCode}` : "Fish Size"}
                        </span>
                        {it.priceGroupName && (
                          <span className="text-[10px] text-slate-400 block">{it.priceGroupName}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-slate-600">
                        {fmt(it.unitPrice, cs)}/kg
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-slate-800">
                        {it.quantityKg.toLocaleString()} kg
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-rose-500">
                        {it.individualDiscountAmount && it.individualDiscountAmount > 0
                          ? `−${fmt(it.individualDiscountAmount, cs)}`
                          : "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                        {fmt(it.finalAmount, cs)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">{fmt(selectedCalc.subtotal, cs)}</span>
              </div>

              {selectedCalc.generalDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span>General Discount:</span>
                  <span className="font-mono font-semibold">−{fmt(selectedCalc.generalDiscountAmount, cs)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold text-slate-900">
                <span className="text-sm">Final Amount Payable:</span>
                <span className="font-mono text-base text-green-700">{fmt(selectedCalc.totalAmount, cs)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono font-semibold text-slate-800">{fmt(selectedCalc.amountPaid || 0, cs)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Outstanding Balance:</span>
                <span className={`font-mono font-bold ${
                  (selectedCalc.totalAmount - (selectedCalc.amountPaid || 0)) > 0 ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {fmt(Math.max(0, selectedCalc.totalAmount - (selectedCalc.amountPaid || 0)), cs)}
                </span>
              </div>
            </div>

            {/* Quick Actions in Modal */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDeleteCalc(selectedCalc.id, selectedCalc.customerName)}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={13} /> Delete Calculation
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCalc(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Close
                </button>
                {canEdit && (
                  <PBtn
                    sm
                    onClick={() => handleTogglePayment(selectedCalc)}
                    className="text-xs"
                  >
                    <Check size={13} />
                    Mark as {selectedCalc.paymentStatus === "Paid" ? "Unpaid" : "Paid"}
                  </PBtn>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Price Groups Management Modal ── */}
      {showGroupsPanel && (
        <Modal
          title="Fish Price Groups"
          onClose={() => { setShowGroupsPanel(false); setGroupFormMode(false); setEditGroup(null); }}
          wide
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Configure fish size categories, pricing per kg, and active status.</p>
              {!groupFormMode && canCreate && (
                <button
                  onClick={() => { setEditGroup(null); setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" }); setGroupFormMode(true); }}
                  className="px-2.5 py-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Add Price Group
                </button>
              )}
            </div>

            {groupFormMode ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800">{editGroup ? "Edit Price Group" : "Create New Price Group"}</span>
                  <button onClick={() => { setGroupFormMode(false); setEditGroup(null); }} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <F label="Group Code (e.g. A, B, C)" error={groupErr.group}>
                    <input
                      value={groupF.group}
                      onChange={e => setGroupF(p => ({ ...p, group: e.target.value.toUpperCase() }))}
                      className={IC}
                      placeholder="A"
                      maxLength={4}
                    />
                  </F>
                  <F label="Display Name (e.g. Small Size)" error={groupErr.displayName}>
                    <input
                      value={groupF.displayName}
                      onChange={e => setGroupF(p => ({ ...p, displayName: e.target.value }))}
                      className={IC}
                      placeholder="Small Size"
                    />
                  </F>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <F label={`Price Per KG (${cs})`} error={groupErr.pricePerKg}>
                    <NumInput
                      value={groupF.pricePerKg}
                      onChange={v => setGroupF(p => ({ ...p, pricePerKg: v }))}
                      className={IC}
                      placeholder="2000"
                    />
                  </F>
                  <F label="Status">
                    <select
                      value={groupF.status}
                      onChange={e => setGroupF(p => ({ ...p, status: e.target.value as any }))}
                      className={SC}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </F>
                </div>
                <F label="Description (optional)">
                  <input
                    value={groupF.description}
                    onChange={e => setGroupF(p => ({ ...p, description: e.target.value }))}
                    className={IC}
                    placeholder="e.g. Catfish 200g – 400g"
                  />
                </F>
                <div className="flex gap-2 pt-1">
                  <PBtn onClick={handleSaveGroup} sm>
                    <CheckCircle size={13} /> {editGroup ? "Save Changes" : "Create Group"}
                  </PBtn>
                  <button onClick={() => { setGroupFormMode(false); setEditGroup(null); }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                </div>
              </div>
            ) : null}

            {/* List of Price Groups */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {priceGroups.map(g => (
                <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                      {g.group}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{g.displayName}</span>
                        <Bdg label={g.status} color={g.status === "Active" ? "green" : "grey"} />
                      </div>
                      <p className="text-[11px] font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">
                        {fmt(g.pricePerKg, cs)}/kg {g.description && <span className="font-normal text-slate-400 font-sans">· {g.description}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <button
                        onClick={() => handleEditClick(g)}
                        className="p-1 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Edit Group"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Price Group ${g.group} (${g.displayName})?`)) {
                            onDeletePriceGroup(g.id);
                          }
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {priceGroups.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-6">No price groups created yet.</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
