import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, Tag, CheckCircle,
  Pencil, Percent, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  ChevronDown, MoreVertical, Eye, Check, Search, X, Clock,
  Phone, User, TrendingUp, AlertCircle, History, Loader2
} from "lucide-react";
import { toast } from "sonner";
import type { PriceGroup, InvSettings, SalesCalculation, SalesCalculationItem, SalesCalculationEditHistoryEntry, SalesCalculationPayment } from "../types";
import { fmt, uid, getLagosTodayStr, getLagosDateParts } from "../data";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput, StatCard, Pagination, PER_PAGE } from "../shared";
import { api } from "../../lib/api";

export interface SalesCalculatorItemState {
  id: string;
  groupId: string;
  qtyKg: string;
  discountPerKg: string;
}

const LOCAL_STORAGE_KEY = "pondtora_sales_calc_draft_v4";
const MON_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Helper to format ISO timestamp into Lagos/Nigeria YYYY-MM-DD
function toLocalYMD(dateVal: string | Date | undefined): string {
  if (!dateVal) return "";
  const d = typeof dateVal === "string" ? new Date(dateVal) : dateVal;
  if (isNaN(d.getTime())) return "";
  return getLagosTodayStr(d);
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
  onEditCalculation?: (c: SalesCalculation, items?: SalesCalculationItem[], historyEntry?: SalesCalculationEditHistoryEntry | SalesCalculationEditHistoryEntry[]) => Promise<void> | void;
  onDeleteCalculation?: (id: string) => Promise<void> | void;
  onTogglePayment?: (c: SalesCalculation, reason?: string) => Promise<void> | void;
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
  const [isSavingGroup, setIsSavingGroup] = useState(false);
  const [isTogglingPayment, setIsTogglingPayment] = useState(false);

  // Unpaid audit correction modal state
  const [unpaidCorrectionTarget, setUnpaidCorrectionTarget] = useState<SalesCalculation | null>(null);
  const [unpaidCorrectionReason, setUnpaidCorrectionReason] = useState("");
  const [isCorrectingUnpaid, setIsCorrectingUnpaid] = useState(false);

  // Details View Modal & Payment History State
  const [selectedCalc, setSelectedCalc] = useState<SalesCalculation | null>(null);
  const [calcPayments, setCalcPayments] = useState<SalesCalculationPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [calcHistory, setCalcHistory] = useState<SalesCalculationEditHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Date Filtering (Lagos, Nigeria timezone) ──
  const lagosParts = useMemo(() => getLagosDateParts(), []);
  const todayYMD = useMemo(() => getLagosTodayStr(), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayYMD);
  const [showCalDropdown, setShowCalDropdown] = useState(false);

  // Calendar View month/year navigation (strictly Lagos timezone)
  const [viewYear, setViewYear] = useState(lagosParts.year);
  const [viewMonth, setViewMonth] = useState(lagosParts.month);

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
  const [statusFilter, setStatusFilter] = useState<"All" | "Paid" | "Partially Paid" | "Unpaid">("All");
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
  const [editingCalcTarget, setEditingCalcTarget] = useState<SalesCalculation | null>(null);
  const [editReasonInput, setEditReasonInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [salesSchedule, setSalesSchedule] = useState("");
  const [discountType, setDiscountType] = useState<"none" | "general" | "individual">("none");
  const [generalDiscPerKg, setGeneralDiscPerKg] = useState("");
  const [isSavingCalc, setIsSavingCalc] = useState(false);
  const [calcFormErr, setCalcFormErr] = useState<Record<string, string>>({});

  // ── Payment Recording Modal State (for recording partial / full payments) ──
  const [paymentModalCalc, setPaymentModalCalc] = useState<SalesCalculation | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");
  const [payMethodInput, setPayMethodInput] = useState("Cash");
  const [payDateInput, setPayDateInput] = useState(toLocalYMD(new Date()));
  const [payNotesInput, setPayNotesInput] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

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

  // Keep draft in local storage (only when creating new calculation)
  useEffect(() => {
    if (!editingCalcTarget) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(calcItems));
      } catch {}
    }
  }, [calcItems, editingCalcTarget]);

  // Set default group when activePriceGroups load if items are empty
  useEffect(() => {
    if (activePriceGroups.length > 0 && !editingCalcTarget) {
      setCalcItems(prev => {
        if (prev.length === 1 && !prev[0].groupId) {
          return [{ ...prev[0], groupId: activePriceGroups[0].id }];
        }
        return prev;
      });
    }
  }, [activePriceGroups, editingCalcTarget]);

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

  const openEditCalculation = (c: SalesCalculation) => {
    setEditingCalcTarget(c);
    setCustomerName(c.customerName || "");
    setCustomerPhone(c.customerPhone || "");
    setSalesSchedule(c.salesSchedule || "");
    setDiscountType(c.generalDiscountType || (c.generalDiscountAmount ? "general" : "none"));
    setGeneralDiscPerKg(c.generalDiscountValue ? String(c.generalDiscountValue) : "");
    setEditReasonInput("");
    setCalcFormErr({});

    if (c.items && c.items.length > 0) {
      setCalcItems(
        c.items.map(it => ({
          id: it.id || uid(),
          groupId: it.priceGroupId || "",
          qtyKg: String(it.quantityKg || ""),
          discountPerKg: String(it.individualDiscountValue || "")
        }))
      );
    } else {
      setCalcItems([{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }]);
    }

    setShowCalculatorModal(true);
  };

  const resetCalculator = () => {
    setEditingCalcTarget(null);
    setEditReasonInput("");
    setCustomerName("");
    setCustomerPhone("");
    setSalesSchedule("");
    setDiscountType("none");
    setGeneralDiscPerKg("");
    setCalcFormErr({});
    setCalcItems([{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }]);
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
  };

  // ── Calculation Formulas ──
  const calculatedRows = useMemo(() => {
    const genDisc = discountType === "general" ? Math.max(0, Number(generalDiscPerKg) || 0) : 0;
    return (calcItems || []).filter(Boolean).map(item => {
      const group = (priceGroups || []).find(g => g && g.id === item?.groupId);
      const pricePerKg = Number(group?.pricePerKg) || 0;
      const qty = Math.max(0, Number(item?.qtyKg) || 0);
      const discPerKg = discountType === "individual"
        ? Math.max(0, Number(item?.discountPerKg) || 0)
        : discountType === "general"
        ? genDisc
        : 0;
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
    return /^\+?[0-9]{10,14}$/.test(clean);
  };

  // ── Save Calculation Handler ──
  const handleSaveCalculation = async () => {
    if (isSavingCalc) return;

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

    const nowIso = new Date().toISOString();

    if (editingCalcTarget) {
      const prevTotal = Number(editingCalcTarget.totalAmount) || 0;
      const prevWeightKg = (editingCalcTarget.items || []).reduce((s, it) => s + (Number(it.quantityKg) || 0), 0);
      const diff = grandTotal - prevTotal;

      const snapshotItems: SalesCalculationItem[] = validItems.map(r => ({
        id: uid(),
        calculationId: editingCalcTarget.id,
        priceGroupId: r.group?.id,
        priceGroupName: r.group?.displayName || "",
        priceGroupCode: r.group?.group || "",
        quantityKg: r.qtyKgNum,
        unitPrice: r.pricePerKg,
        subtotal: r.baseSubtotal,
        individualDiscountType: discountType === "none" ? undefined : discountType,
        individualDiscountValue: r.discPerKg,
        individualDiscountAmount: r.rowDiscount,
        finalAmount: r.lineTotal,
        createdAt: nowIso
      }));

      const itemsSummary = snapshotItems
        .map(it => `${it.priceGroupCode ? `Group ${it.priceGroupCode}` : it.priceGroupName}: ${it.quantityKg}kg`)
        .join(", ");

      // Detect discount change to reflect in audit history
      const prevDiscountType = editingCalcTarget.generalDiscountType || "none";
      const prevDiscountValue = Number(editingCalcTarget.generalDiscountValue) || 0;
      const prevDiscountAmount = Number(editingCalcTarget.generalDiscountAmount) || 0;

      const newDiscountType = discountType;
      const newDiscountValue = discountType === "general" ? (Number(generalDiscPerKg) || 0) : 0;
      const newDiscountAmount = totalDiscount;

      const discountChanged =
        Math.abs(prevDiscountAmount - newDiscountAmount) > 0.001 ||
        prevDiscountType !== newDiscountType ||
        (discountType === "general" && Math.abs(prevDiscountValue - newDiscountValue) > 0.001);

      const describeDisc = (dtype: string, dval: number, damt: number) => {
        if (dtype === "none" || damt <= 0) return "None";
        if (dtype === "general") return `${cs}${dval}/kg (${cs}${damt.toLocaleString()})`;
        return `Individual (${cs}${damt.toLocaleString()})`;
      };
      const prevDesc = describeDisc(prevDiscountType, prevDiscountValue, prevDiscountAmount);
      const newDesc = describeDisc(newDiscountType, newDiscountValue, newDiscountAmount);

      const userReason = editReasonInput.trim();
      const changedBy = currentUser?.name || currentUser?.email || "Staff";
      const generatedEntries: SalesCalculationEditHistoryEntry[] = [];

      // 1. Sales Schedule change
      const prevSchedule = (editingCalcTarget.salesSchedule || "").trim();
      const newSchedule = salesSchedule.trim();
      if (prevSchedule !== newSchedule) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Sales Schedule",
          fieldChanged: "salesSchedule",
          previousValue: prevSchedule || "None",
          newValue: newSchedule || "None",
          previousTotal: prevTotal,
          newTotal: grandTotal,
          previousWeightKg: prevWeightKg,
          newWeightKg: totalKg,
          difference: diff,
          actionReason: userReason || "Sales schedule updated",
          changedBy,
          createdAt: nowIso
        });
      }

      // 2. Quantity / Total Weight change
      if (Math.abs(prevWeightKg - totalKg) > 0.001) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Quantity (Weight)",
          fieldChanged: "quantityKg",
          previousValue: `${prevWeightKg.toLocaleString()} kg`,
          newValue: `${totalKg.toLocaleString()} kg`,
          previousTotal: prevTotal,
          newTotal: grandTotal,
          previousWeightKg: prevWeightKg,
          newWeightKg: totalKg,
          difference: diff,
          itemsSummary,
          actionReason: userReason || `Quantity changed (${itemsSummary})`,
          changedBy,
          createdAt: nowIso
        });
      }

      // 3. Customer Name change
      if (editingCalcTarget.customerName.trim() !== trimmedName) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Customer Name",
          fieldChanged: "customerName",
          previousValue: editingCalcTarget.customerName,
          newValue: trimmedName,
          previousTotal: prevTotal,
          newTotal: grandTotal,
          previousWeightKg: prevWeightKg,
          newWeightKg: totalKg,
          difference: diff,
          actionReason: userReason || "Customer name updated",
          changedBy,
          createdAt: nowIso
        });
      }

      // 4. Customer Phone change
      const prevPhone = (editingCalcTarget.customerPhone || "").trim();
      if (prevPhone !== trimmedPhone) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Customer Phone",
          fieldChanged: "customerPhone",
          previousValue: prevPhone || "None",
          newValue: trimmedPhone || "None",
          previousTotal: prevTotal,
          newTotal: grandTotal,
          previousWeightKg: prevWeightKg,
          newWeightKg: totalKg,
          difference: diff,
          actionReason: userReason || "Customer phone updated",
          changedBy,
          createdAt: nowIso
        });
      }

      // 5. Discount change
      if (discountChanged) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Discount",
          fieldChanged: "discount",
          previousValue: prevDesc,
          newValue: newDesc,
          previousTotal: prevTotal,
          newTotal: grandTotal,
          previousWeightKg: prevWeightKg,
          newWeightKg: totalKg,
          difference: diff,
          actionReason: userReason || "Discount updated",
          changedBy,
          createdAt: nowIso
        });
      }

      // 6. Total Amount change
      if (Math.abs(prevTotal - grandTotal) > 0.01) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Total Amount",
          fieldChanged: "totalAmount",
          previousValue: fmt(prevTotal, cs),
          newValue: fmt(grandTotal, cs),
          previousTotal: prevTotal,
          newTotal: grandTotal,
          difference: diff,
          actionReason: userReason || "Total amount updated",
          changedBy,
          createdAt: nowIso
        });
      }

      // Fallback if no specific difference was caught
      if (generatedEntries.length === 0) {
        generatedEntries.push({
          id: uid(),
          calculationId: editingCalcTarget.id,
          fieldName: "Calculation",
          fieldChanged: "calculation",
          previousValue: fmt(prevTotal, cs),
          newValue: fmt(grandTotal, cs),
          previousTotal: prevTotal,
          newTotal: grandTotal,
          difference: diff,
          itemsSummary,
          actionReason: userReason || "Calculation modified",
          changedBy,
          createdAt: nowIso
        });
      }

      const existingPaid = Number(editingCalcTarget.amountPaid) || 0;
      const nextStatus: "Paid" | "Partially Paid" | "Unpaid" =
        existingPaid >= grandTotal
          ? "Paid"
          : existingPaid > 0
          ? "Partially Paid"
          : "Unpaid";

      const newHistoryIds = new Set(generatedEntries.map(g => g.id));
      const cleanExistingHistory = (editingCalcTarget.editHistory || []).filter(h => h && !newHistoryIds.has(h.id));

      const updatedCalculation: SalesCalculation = {
        ...editingCalcTarget,
        customerName: trimmedName,
        customerPhone: trimmedPhone ? trimmedPhone : null,
        salesSchedule: newSchedule || undefined,
        subtotal: baseSubtotal,
        generalDiscountType: discountType === "none" ? undefined : discountType,
        generalDiscountValue: discountType === "general" ? Number(generalDiscPerKg) || 0 : 0,
        generalDiscountAmount: totalDiscount,
        totalAmount: grandTotal,
        amountPaid: existingPaid,
        paymentStatus: nextStatus,
        items: snapshotItems,
        editHistory: [...generatedEntries, ...cleanExistingHistory],
        updatedAt: nowIso
      };

      try {
        if (onEditCalculation) {
          await onEditCalculation(updatedCalculation, snapshotItems, generatedEntries);
        }
        toast.success(`Calculation for ${trimmedName} updated successfully!`);
        setShowCalculatorModal(false);
        if (selectedCalc && selectedCalc.id === editingCalcTarget.id) {
          setSelectedCalc(updatedCalculation);
          setCalcHistory(updatedCalculation.editHistory || []);
        }
        resetCalculator();
      } catch (err: any) {
        console.error("Failed to update sales calculation in cloud:", err);
        setCalcFormErr({ general: err?.message || "Failed to sync updated calculation with database. Please try again." });
      } finally {
        setIsSavingCalc(false);
      }
      return;
    }

    const calcId = uid();

    const snapshotItems: SalesCalculationItem[] = validItems.map(r => ({
      id: uid(),
      calculationId: calcId,
      priceGroupId: r.group?.id,
      priceGroupName: r.group?.displayName || "",
      priceGroupCode: r.group?.group || "",
      quantityKg: r.qtyKgNum,
      unitPrice: r.pricePerKg,
      subtotal: r.baseSubtotal,
      individualDiscountType: discountType === "none" ? undefined : discountType,
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
      salesSchedule: salesSchedule.trim() || undefined,
      subtotal: baseSubtotal,
      generalDiscountType: discountType === "none" ? undefined : discountType,
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
      console.error("Failed to save sales calculation in cloud:", err);
      setCalcFormErr({ general: err?.message || "Failed to sync new calculation with database. Please try again." });
    } finally {
      setIsSavingCalc(false);
    }
  };

  // Load payment records and permanent edit history whenever selectedCalc is opened or changed
  useEffect(() => {
    if (selectedCalc?.id) {
      let active = true;

      // Seed calcHistory immediately from calculation so user never sees empty flash
      const match = (calculations || []).find(c => c.id === selectedCalc.id);
      const immediateHist = (match?.editHistory && match.editHistory.length > 0)
        ? match.editHistory
        : (selectedCalc.editHistory || []);
      setCalcHistory(immediateHist);

      setLoadingPayments(true);
      api.salesCalculations.listPayments(selectedCalc.id)
        .then(payments => {
          if (active) setCalcPayments(payments);
        })
        .catch(err => {
          console.warn("Failed to load payment history:", err);
        })
        .finally(() => {
          if (active) setLoadingPayments(false);
        });

      setLoadingHistory(true);
      api.salesCalculations.listHistory(selectedCalc.id)
        .then(hist => {
          if (active) {
            const serverList = Array.isArray(hist) ? hist : [];
            const latestMatch = (calculations || []).find(c => c.id === selectedCalc.id);
            const localHist = (latestMatch?.editHistory && latestMatch.editHistory.length > 0)
              ? latestMatch.editHistory
              : (selectedCalc.editHistory || []);
            const seenIds = new Set(serverList.map(h => h.id));
            const merged = [...serverList, ...localHist.filter(h => !seenIds.has(h.id))];
            merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setCalcHistory(merged);
          }
        })
        .catch(err => {
          console.warn("Failed to load calculation edit history:", err);
          if (active) {
            const fallback = (match?.editHistory && match.editHistory.length > 0)
              ? match.editHistory
              : (selectedCalc.editHistory || []);
            setCalcHistory(fallback);
          }
        })
        .finally(() => {
          if (active) setLoadingHistory(false);
        });

      return () => { active = false; };
    } else {
      setCalcPayments([]);
      setCalcHistory([]);
    }
  }, [selectedCalc?.id, selectedCalc?.amountPaid, selectedCalc?.paymentStatus, selectedCalc?.updatedAt, calculations]);

  // ── Open Payment Recording Modal ──
  const openPaymentModal = (c: SalesCalculation, fillFullBalance = false) => {
    setPaymentModalCalc(c);
    const prevPaid = c.paymentStatus === "Paid"
      ? (c.amountPaid > 0 ? c.amountPaid : c.totalAmount)
      : (Number(c.amountPaid) || 0);
    const outstanding = Math.max(0, c.totalAmount - prevPaid);
    setPayAmountInput(fillFullBalance && outstanding > 0 ? String(outstanding) : "");
    setPayMethodInput("Cash");
    setPayDateInput(getLagosTodayStr());
    setPayNotesInput("");
  };

  // ── Record Payment (Full or Partial) ──
  const handleRecordPayment = async () => {
    if (!paymentModalCalc || isRecordingPayment) return;
    const payNum = Number(payAmountInput);
    if (isNaN(payNum) || payNum <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const prevPaid = paymentModalCalc.paymentStatus === "Paid"
      ? (paymentModalCalc.amountPaid > 0 ? paymentModalCalc.amountPaid : paymentModalCalc.totalAmount)
      : (Number(paymentModalCalc.amountPaid) || 0);
    const outstanding = Math.max(0, paymentModalCalc.totalAmount - prevPaid);

    // Prevent payment exceeding the outstanding balance
    if (payNum > outstanding + 0.0001) {
      toast.error(`Payment amount (${fmt(payNum, cs)}) cannot exceed outstanding balance (${fmt(outstanding, cs)})`);
      return;
    }

    setIsRecordingPayment(true);
    try {
      const newAmountPaid = prevPaid + payNum;
      const nextStatus: "Paid" | "Partially Paid" | "Unpaid" =
        newAmountPaid >= paymentModalCalc.totalAmount - 0.0001
          ? "Paid"
          : newAmountPaid > 0
          ? "Partially Paid"
          : "Unpaid";

      const updated: SalesCalculation = {
        ...paymentModalCalc,
        amountPaid: newAmountPaid,
        paymentStatus: nextStatus,
        updatedAt: new Date().toISOString()
      };

      // Record separate payment transaction with date and notes
      await api.salesCalculations.recordPayment(
        paymentModalCalc.id,
        payNum,
        payMethodInput,
        currentUser?.name || "Staff",
        payDateInput || getLagosTodayStr(),
        payNotesInput.trim() || undefined
      );

      if (onEditCalculation) {
        await Promise.resolve(onEditCalculation(updated));
      }

      toast.success(`Payment of ${fmt(payNum, cs)} recorded successfully (${nextStatus})!`);
      setPaymentModalCalc(null);
      if (selectedCalc && selectedCalc.id === paymentModalCalc.id) {
        setSelectedCalc(updated);
        api.salesCalculations.listPayments(updated.id).then(setCalcPayments).catch(console.warn);
      }
    } catch (err: any) {
      console.error("Error recording payment:", err);
      toast.error(err?.message || "Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // ── Correct Paid Sale to Unpaid (with audit trail) ──
  const handleCorrectToUnpaid = async () => {
    if (!unpaidCorrectionTarget || isCorrectingUnpaid) return;
    const reason = unpaidCorrectionReason.trim();
    if (!reason) {
      toast.error("Please provide a reason for correcting this payment to Unpaid.");
      return;
    }

    setIsCorrectingUnpaid(true);
    try {
      if (onTogglePayment) {
        await onTogglePayment(unpaidCorrectionTarget, reason);
      }

      const updated: SalesCalculation = {
        ...unpaidCorrectionTarget,
        paymentStatus: "Unpaid",
        amountPaid: 0,
        updatedAt: new Date().toISOString()
      };

      toast.success("Payment status corrected to Unpaid.");
      setUnpaidCorrectionTarget(null);
      setUnpaidCorrectionReason("");
      if (selectedCalc && selectedCalc.id === unpaidCorrectionTarget.id) {
        setSelectedCalc(updated);
        api.salesCalculations.listPayments(updated.id).then(setCalcPayments).catch(console.warn);
      }
    } catch (err: any) {
      console.error("Error correcting payment status:", err);
      toast.error(err?.message || "Failed to correct payment status");
    } finally {
      setIsCorrectingUnpaid(false);
    }
  };

  // ── Toggle Payment Status (routes to audit correction or settle full balance) ──
  const handleTogglePayment = async (c: SalesCalculation) => {
    if (c.paymentStatus === "Paid") {
      setUnpaidCorrectionTarget(c);
      setUnpaidCorrectionReason("");
    } else {
      openPaymentModal(c, true);
    }
  };



  // ── Date Filtering & Statistics Calculations ──
  // Calculate values across ALL farm calculations matching the active date filter
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

  // Card 2: Amount Calculated (sum of total amount for saved calculations matching active filter)
  const totalAmountCalculated = dateScopedCalculations.reduce(
    (sum, c) => sum + (Number(c.totalAmount) || 0),
    0
  );

  // Card 3: Payment Collected (sum of amounts paid so far for calculations matching active filter)
  const totalPaymentCollected = dateScopedCalculations.reduce((sum, c) => {
    const paid = c.paymentStatus === "Paid"
      ? (Number(c.amountPaid) > 0 ? Number(c.amountPaid) : (Number(c.totalAmount) || 0))
      : (Number(c.amountPaid) || 0);
    return sum + paid;
  }, 0);

  // Card 4: Outstanding (sum of unpaid balance)
  const totalOutstanding = dateScopedCalculations.reduce((sum, c) => {
    const total = Number(c.totalAmount) || 0;
    const paid = c.paymentStatus === "Paid"
      ? (Number(c.amountPaid) > 0 ? Number(c.amountPaid) : total)
      : (Number(c.amountPaid) || 0);
    return sum + Math.max(0, total - paid);
  }, 0);

  const paidCount = dateScopedCalculations.filter(c => c.paymentStatus === "Paid").length;
  const unpaidCount = dateScopedCalculations.filter(c => c.paymentStatus !== "Paid").length;

  // Subtitle for statistics cards
  const statDateSubLabel = selectedDate && selectedDate !== "All"
    ? formatReadableDate(selectedDate)
    : "All dates";

  // Filtered list for table (combines date filter with search and status filters)
  const filteredCalculations = useMemo(() => {
    const seenIds = new Set<string>();
    return dateScopedCalculations.filter(c => {
      if (!c || !c.id) return false;
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
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
  const handleSaveGroup = async () => {
    if (isSavingGroup) return;
    const errs: Record<string, string> = {};
    if (!groupF.group.trim()) errs.group = "Group code required (e.g. A)";
    if (!groupF.displayName.trim()) errs.displayName = "Display name required";
    if (!groupF.pricePerKg || Number(groupF.pricePerKg) <= 0) errs.pricePerKg = "Valid price per kg required";
    if (Object.keys(errs).length) { setGroupErr(errs); return; }

    setIsSavingGroup(true);
    try {
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
        await onEditPriceGroup(payload);
        toast.success(`Price Group ${payload.group} updated successfully!`);
      } else {
        await onAddPriceGroup(payload);
        toast.success(`Price Group ${payload.group} created successfully!`);
      }

      setGroupFormMode(false);
      setEditGroup(null);
      setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" });
      setGroupErr({});
    } finally {
      setIsSavingGroup(false);
    }
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
                      const isToday = cellYMD === todayYMD;
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
                              : isToday
                              ? "ring-2 ring-emerald-500 font-bold text-emerald-900 bg-emerald-50/70"
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
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 inline-block" />Today
                      </span>
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
                          setViewYear(lagosParts.year);
                          setViewMonth(lagosParts.month);
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
        </div>
      </div>

      {/* ── Statistics Cards: Received & Outstanding (2 equal columns) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
        {/* Card 1: Payment Received */}
        <StatCard
          label="Received"
          value={fmt(totalPaymentCollected, cs)}
          sub={`${paidCount} paid in full`}
          icon={CheckCircle}
          color="green"
        />

        {/* Card 2: Outstanding */}
        <StatCard
          label="Outstanding"
          value={fmt(totalOutstanding, cs)}
          sub={`${unpaidCount} unpaid / partial`}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* ── Saved Calculations Header & Filters ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 font-['Barlow_Condensed',sans-serif] tracking-tight">
            Saved Customer Calculations
          </h2>
          <p className="text-xs text-slate-400">
            Showing {filteredCalculations.length} calculation{filteredCalculations.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filter by status & search input: side-by-side, equal width on mobile maintaining system padding */}
        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center">
          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer..."
              className={`${IC} text-xs py-1.5 pl-8 pr-7 w-full`}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={12} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className={`${SC} text-xs py-1.5 px-2.5 w-full sm:w-40`}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
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
                  <th className="px-3.5 py-3 text-center w-20">Actions</th>
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

                      {/* Price Groups & Items breakdown */}
                      <td className="px-3.5 py-3">
                        <div className="space-y-1">
                          {items.length > 0 ? (
                            items.map((it, idx) => (
                              <div key={it.id || idx} className="flex items-center justify-between gap-3 text-xs">
                                <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                  {it.priceGroupCode ? `Group ${it.priceGroupCode}` : it.priceGroupName || "Fish"}: {(Number(it.quantityKg) || 0).toLocaleString()} kg
                                </span>
                                <span className="font-mono text-slate-900 font-semibold">
                                  {fmt(Number(it.finalAmount) || Number(it.subtotal) || 0, cs)}
                                </span>
                              </div>
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
                      <td className="px-3.5 py-3 text-right">
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm block">
                          {fmt(c.totalAmount, cs)}
                        </span>
                        {(() => {
                          const paidAmt = c.paymentStatus === "Paid"
                            ? (c.amountPaid > 0 ? c.amountPaid : c.totalAmount)
                            : (Number(c.amountPaid) || 0);
                          const outstanding = Math.max(0, c.totalAmount - paidAmt);
                          if (paidAmt > 0 && outstanding > 0) {
                            return (
                              <span className="text-[10px] text-amber-700 font-mono font-medium block">
                                Bal: {fmt(outstanding, cs)}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="px-3.5 py-3 text-center">
                        <Bdg
                          label={c.paymentStatus || "Unpaid"}
                          color={c.paymentStatus === "Paid" ? "green" : c.paymentStatus === "Partially Paid" ? "blue" : "amber"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-3.5 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="More Actions"
                            >
                              <MoreVertical size={14} />
                            </button>

                            {openActionMenuId === c.id && (
                              <div
                                ref={actionMenuRef}
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95 duration-100"
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
                                    onClick={() => { openPaymentModal(c); setOpenActionMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                                  >
                                    <Plus size={13} /> Record Payment
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => { handleTogglePayment(c); setOpenActionMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2"
                                  >
                                    {isPaid ? (
                                      <>
                                        <RotateCcw size={13} className="text-amber-600" />
                                        <span>Correct to Unpaid...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check size={13} className="text-emerald-600" />
                                        <span>Settle Full Balance</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => { openEditCalculation(c); setOpenActionMenuId(null); }}
                                    className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 hover:text-green-700 flex items-center gap-2 border-t border-slate-100"
                                  >
                                    <Pencil size={13} /> Edit Calculation
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

                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <Bdg
                    label={c.paymentStatus || "Unpaid"}
                    color={c.paymentStatus === "Paid" ? "green" : c.paymentStatus === "Partially Paid" ? "blue" : "amber"}
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenActionMenuId(openActionMenuId === c.id ? null : c.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                      title="Actions Menu"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openActionMenuId === c.id && (
                      <div
                        ref={actionMenuRef}
                        className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-xs"
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
                            onClick={() => { openPaymentModal(c); setOpenActionMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 flex items-center gap-2"
                          >
                            <Plus size={13} /> Record Payment
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => { handleTogglePayment(c); setOpenActionMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 flex items-center gap-2"
                          >
                            {isPaid ? (
                              <>
                                <RotateCcw size={13} className="text-amber-600" />
                                <span>Correct to Unpaid...</span>
                              </>
                            ) : (
                              <>
                                <Check size={13} className="text-emerald-600" />
                                <span>Settle Full Balance</span>
                              </>
                            )}
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => { openEditCalculation(c); setOpenActionMenuId(null); }}
                            className="w-full text-left px-3 py-1.5 text-slate-700 hover:bg-green-50 flex items-center gap-2 border-t border-slate-100"
                          >
                            <Pencil size={13} /> Edit Calculation
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Groups and Items breakdown: Group, Weight, and Amount */}
              <div className="py-2 border-t border-b border-slate-100 space-y-1.5">
                {items.length > 0 ? (
                  items.map((it, idx) => (
                    <div key={it.id || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {it.priceGroupCode ? `Group ${it.priceGroupCode}` : it.priceGroupName || "Fish"}
                        </span>
                        <span className="text-slate-500 font-medium">
                          {(Number(it.quantityKg) || 0).toLocaleString()} kg
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 text-xs shrink-0">
                        {fmt(Number(it.finalAmount) || Number(it.subtotal) || 0, cs)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Standard</span>
                    <span className="font-mono font-bold text-slate-800">{totalKgForCalc.toLocaleString()} kg</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
                  <span>Total Weight</span>
                  <span className="font-mono font-bold text-slate-700">{totalKgForCalc.toLocaleString()} kg</span>
                </div>
              </div>

              {/* Total Payable Amount & Balance */}
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">Total Payable:</span>
                  <span className="text-base font-extrabold text-green-700 font-mono">
                    {fmt(c.totalAmount, cs)}
                  </span>
                </div>
                {(() => {
                  const paidAmt = c.paymentStatus === "Paid"
                    ? (c.amountPaid > 0 ? c.amountPaid : c.totalAmount)
                    : (Number(c.amountPaid) || 0);
                  const outstanding = Math.max(0, c.totalAmount - paidAmt);
                  if (paidAmt > 0 || outstanding > 0) {
                    return (
                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-emerald-700 font-medium">Paid: {fmt(paidAmt, cs)}</span>
                        {outstanding > 0 ? (
                          <span className="text-amber-700 font-bold">Bal: {fmt(outstanding, cs)}</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">Fully Paid</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
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
          title={editingCalcTarget ? `Edit Calculation — ${editingCalcTarget.customerName}` : "Customer Purchase Calculator"}
          onClose={() => {
            if (!isSavingCalc) {
              setShowCalculatorModal(false);
              resetCalculator();
            }
          }}
          wide
          footer={
            <div className="flex items-center justify-between gap-3">
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
                  onClick={() => {
                    setShowCalculatorModal(false);
                    resetCalculator();
                  }}
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
                  {isSavingCalc ? (
                    <><Loader2 className="animate-spin" size={14} /> {editingCalcTarget ? "Updating Calculation..." : "Saving Calculation..."}</>
                  ) : (
                    <><CheckCircle size={14} /> {editingCalcTarget ? "Update Calculation" : "Save Calculation"}</>
                  )}
                </PBtn>
              </div>
            </div>
          }
        >
          <div className="space-y-3.5 pb-2">
            {/* Customer Details Form: Side-by-side on all screens */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
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
                  disabled={isSavingCalc}
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
                  disabled={isSavingCalc}
                />
                {calcFormErr.customerPhone && <p className="text-red-500 text-[10px] mt-0.5">{calcFormErr.customerPhone}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                  Sales Schedule <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={salesSchedule}
                  onChange={e => setSalesSchedule(e.target.value)}
                  placeholder="e.g. 2026-11-05 / Morning"
                  className={`${IC} text-xs py-2`}
                  disabled={isSavingCalc}
                />
              </div>
            </div>

            {calcFormErr.general && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                {calcFormErr.general}
              </div>
            )}

            {/* Optional Reason for Edit (Shown only when editing an existing calculation) */}
            {editingCalcTarget && (
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3 space-y-1">
                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <History size={12} className="text-amber-700 shrink-0" />
                  Reason for Edit / Modification Note <span className="text-amber-600/70 font-normal text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={editReasonInput}
                  onChange={e => setEditReasonInput(e.target.value)}
                  placeholder="e.g. Adjusted weight after reweighing batch, applied customer loyalty discount"
                  className={`${IC} text-xs py-1.5 bg-white border-amber-300 focus:ring-amber-500`}
                />
              </div>
            )}

            {/* Discount Section (Light Green Fill, NO stroke, high contrast) */}
            <div className="bg-emerald-50 rounded-xl p-3.5 space-y-2.5 border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                  <Percent size={13} className="text-emerald-700" /> Discount Type:
                </span>
                <div className="inline-flex bg-emerald-100/90 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setDiscountType("none")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      discountType === "none"
                        ? "bg-white text-emerald-950 shadow-xs font-bold"
                        : "text-emerald-800 hover:text-emerald-950"
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("general")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      discountType === "general"
                        ? "bg-white text-emerald-950 shadow-xs font-bold"
                        : "text-emerald-800 hover:text-emerald-950"
                    }`}
                  >
                    General
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("individual")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      discountType === "individual"
                        ? "bg-white text-emerald-950 shadow-xs font-bold"
                        : "text-emerald-800 hover:text-emerald-950"
                    }`}
                  >
                    Individual
                  </button>
                </div>
              </div>

              {discountType === "general" && (
                <div className="w-full pt-1 space-y-1">
                  <label className="block text-[11px] font-bold text-emerald-950 uppercase tracking-wide">
                    General Discount per kg ({cs})
                  </label>
                  <div className="relative w-full">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-800 pointer-events-none">
                      {cs}
                    </span>
                    <NumInput
                      value={generalDiscPerKg}
                      onChange={setGeneralDiscPerKg}
                      placeholder="0.00"
                      className="w-full bg-white border border-emerald-300 rounded-xl text-xs py-2 pl-7 pr-12 text-left font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      allowDecimal={true}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">
                      /kg
                    </span>
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
                        <div className="relative w-full">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 pointer-events-none select-none">
                            kg
                          </span>
                          <NumInput
                            value={row.qtyKg}
                            onChange={v => updateCalcItem(row.id, "qtyKg", v)}
                            placeholder="0"
                            className={`${IC} text-xs py-1.5 pl-8 pr-2 text-left font-medium`}
                            allowDecimal={true}
                          />
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
                            className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            title="Remove row"
                          >
                            <Trash2 size={13} className="text-red-500" />
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
                          className="p-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={13} className="text-red-500" />
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
                      <div className="relative w-full">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-500 pointer-events-none select-none">
                          kg
                        </span>
                        <NumInput
                          value={row.qtyKg}
                          onChange={v => updateCalcItem(row.id, "qtyKg", v)}
                          placeholder="0"
                          className={`${IC} text-xs py-1.5 pl-8 pr-2 text-left font-medium`}
                          allowDecimal={true}
                        />
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
          </div>
        </Modal>
      )}

      {/* ── Calculation Details Modal ── */}
      {selectedCalc && (
        <Modal
          title={`Calculation Details — ${selectedCalc.customerName}`}
          onClose={() => setSelectedCalc(null)}
          wide
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 w-full">
              {/* Left Group: Dismiss / Close button */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedCalc(null)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl transition-all shadow-2xs text-center"
                >
                  Close
                </button>
              </div>

              {/* Right Group: Action buttons logically organized with clear hierarchy */}
              <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const calcToEdit = selectedCalc;
                      setSelectedCalc(null);
                      openEditCalculation(calcToEdit);
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs"
                  >
                    <Pencil size={14} className="text-emerald-600 shrink-0" />
                    <span>Edit Calculation</span>
                  </button>
                )}

                {canEdit && selectedCalc.paymentStatus !== "Paid" && (
                  <button
                    type="button"
                    onClick={() => openPaymentModal(selectedCalc)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-all shadow-2xs"
                  >
                    <Plus size={14} className="text-emerald-700 shrink-0" />
                    <span>Record Payment</span>
                  </button>
                )}

                {canEdit && selectedCalc.paymentStatus !== "Paid" && (
                  <PBtn
                    sm
                    onClick={() => openPaymentModal(selectedCalc, true)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs"
                  >
                    <Check size={14} />
                    <span>Settle Full Balance</span>
                  </PBtn>
                )}

                {canEdit && selectedCalc.paymentStatus === "Paid" && (
                  <button
                    type="button"
                    onClick={() => {
                      setUnpaidCorrectionTarget(selectedCalc);
                      setUnpaidCorrectionReason("");
                    }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-2xs"
                  >
                    <RotateCcw size={14} className="text-amber-600 shrink-0" />
                    <span>Correct to Unpaid</span>
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header info (Light Green Fill, NO border, matching discount section) */}
            <div className="bg-emerald-50 rounded-2xl p-3.5 space-y-2.5 border-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-emerald-950 font-['Barlow_Condensed',sans-serif]">
                    {selectedCalc.customerName}
                  </h3>
                  <p className="text-xs text-emerald-700/80 flex items-center gap-1 mt-0.5">
                    <Clock size={12} /> {formatDateTime(selectedCalc.createdAt)}
                  </p>
                </div>
                <Bdg
                  label={selectedCalc.paymentStatus || "Unpaid"}
                  color={selectedCalc.paymentStatus === "Paid" ? "green" : selectedCalc.paymentStatus === "Partially Paid" ? "blue" : "amber"}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-200/60 text-xs">
                {/* Customer Phone: Only show if provided, completely omitted otherwise */}
                {selectedCalc.customerPhone && selectedCalc.customerPhone.trim() !== "" && (
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <Phone size={13} className="text-emerald-700 shrink-0" />
                    <span>Phone: <strong className="text-emerald-950 font-mono">{selectedCalc.customerPhone}</strong></span>
                  </div>
                )}
                {selectedCalc.salesSchedule && selectedCalc.salesSchedule.trim() !== "" && (
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <Clock size={13} className="text-emerald-700 shrink-0" />
                    <span>Schedule: <strong className="text-emerald-950">{selectedCalc.salesSchedule}</strong></span>
                  </div>
                )}
                {selectedCalc.createdBy && (
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <User size={13} className="text-emerald-700 shrink-0" />
                    <span>Recorded By: <strong className="text-emerald-950">{selectedCalc.createdBy}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Table (Scrollable container for full visibility) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-3.5 py-2.5">Price Group</th>
                      <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                      <th className="px-3.5 py-2.5 text-right">Weight</th>
                      <th className="px-3.5 py-2.5 text-right">Discount</th>
                      <th className="px-3.5 py-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
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
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-slate-800">{fmt(selectedCalc.subtotal, cs)}</span>
              </div>

              {selectedCalc.generalDiscountAmount !== undefined && Number(selectedCalc.generalDiscountAmount) > 0 && (
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

            {/* Payment History & Records Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle size={13} className="text-emerald-600" /> Payment History & Records
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {calcPayments.length} {calcPayments.length === 1 ? "payment" : "payments"} recorded
                </span>
              </div>

              {loadingPayments ? (
                <p className="text-[11px] text-slate-400 italic py-1">Loading payment history...</p>
              ) : calcPayments.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-lg p-2.5 text-xs text-slate-500 flex items-center justify-between">
                  <span>{selectedCalc.paymentStatus === "Paid" ? "Paid in full (initial transaction)." : "No individual payments logged yet."}</span>
                  {canEdit && selectedCalc.paymentStatus !== "Paid" && (
                    <button
                      type="button"
                      onClick={() => openPaymentModal(selectedCalc)}
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] underline"
                    >
                      + Record First Payment
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {calcPayments.map((p, pIdx) => {
                    const isReversal = p.amount < 0 || (p.notes && p.notes.toLowerCase().includes("revers"));
                    return (
                      <div
                        key={p.id || pIdx}
                        className={`border rounded-lg p-2.5 text-xs space-y-1 shadow-2xs ${
                          isReversal
                            ? "bg-amber-50/60 border-amber-200 text-amber-900"
                            : "bg-white border-slate-200/90 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-sm">
                            {isReversal ? "−" : "+"}{fmt(Math.abs(p.amount), cs)}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {p.paymentMethod || "Cash"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                          <span>{formatDateTime(p.createdAt)}</span>
                          <span className="text-slate-600 font-medium">By: {p.recordedBy || "Staff"}</span>
                        </div>
                        {p.notes && (
                          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100">
                            Note: {p.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Edit History Section (Deduplicated & Permanently Persisted) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              {(() => {
                const matchCalc = (calculations || []).find(c => c.id === selectedCalc.id);
                const localPropHist = matchCalc?.editHistory || [];
                const historyList = calcHistory && calcHistory.length > 0
                  ? calcHistory
                  : (selectedCalc.editHistory && selectedCalc.editHistory.length > 0 ? selectedCalc.editHistory : localPropHist);
                const seenHist = new Set<string>();
                const deduplicatedHistory = historyList.filter(h => {
                  if (!h || !h.id) return false;
                  if (seenHist.has(h.id)) return false;
                  seenHist.add(h.id);
                  return true;
                });

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <History size={13} className="text-slate-500" /> Edit History
                      </span>
                      <div className="flex items-center gap-2">
                        {loadingHistory && <Loader2 size={12} className="animate-spin text-slate-400" />}
                        <span className="text-[11px] font-semibold text-slate-400">
                          {deduplicatedHistory.length} {deduplicatedHistory.length === 1 ? "entry" : "entries"}
                        </span>
                      </div>
                    </div>

                    {deduplicatedHistory.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No edits recorded for this calculation yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                        {deduplicatedHistory.map(entry => {
                          const fieldLabel = entry.fieldName || entry.fieldChanged;
                          return (
                            <div key={entry.id} className="bg-white border border-slate-200/90 rounded-lg p-2.5 text-xs space-y-1 shadow-2xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-700 flex items-center gap-1">
                                  <User size={11} className="text-slate-400" /> {entry.changedBy || "Staff"}
                                </span>
                                <span className="text-slate-400 font-mono text-[10px]">
                                  {formatDateTime(entry.createdAt)}
                                </span>
                              </div>

                              {fieldLabel ? (
                                <div className="space-y-0.5 pt-1 border-t border-slate-100">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 font-medium">Field Edited:</span>
                                    <span className="font-semibold text-slate-800">{fieldLabel}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Previous:</span>
                                    <span className="font-mono text-slate-600 line-through text-[10px] max-w-[200px] truncate" title={entry.previousValue || "-"}>
                                      {entry.previousValue || "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Updated:</span>
                                    <span className="font-mono font-bold text-emerald-700 text-[10px] max-w-[200px] truncate" title={entry.newValue || "-"}>
                                      {entry.newValue || "-"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                                  <span className="text-slate-500">Calculation Change:</span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {fmt(entry.previousTotal, cs)} → {fmt(entry.newTotal, cs)}
                                    {entry.difference !== undefined && entry.difference !== 0 && (
                                      <span className={`ml-1 text-[10px] ${entry.difference > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                        ({entry.difference > 0 ? "+" : ""}{fmt(entry.difference, cs)})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}

                              {entry.itemsSummary && (
                                <p className="text-[10px] text-slate-500 truncate" title={entry.itemsSummary}>
                                  <span className="font-semibold text-slate-600">Items:</span> {entry.itemsSummary}
                                </p>
                              )}
                              {entry.actionReason && (
                                <p className="text-[10px] text-slate-600 italic bg-slate-50 px-2 py-1 rounded">
                                  "{entry.actionReason}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Record Payment Modal ── */}
      {paymentModalCalc && (
        <Modal
          title={`Record Payment — ${paymentModalCalc.customerName}`}
          onClose={() => { if (!isRecordingPayment) setPaymentModalCalc(null); }}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => setPaymentModalCalc(null)}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                disabled={isRecordingPayment}
              >
                Cancel
              </button>
              <PBtn
                onClick={handleRecordPayment}
                disabled={
                  isRecordingPayment ||
                  !payAmountInput ||
                  Number(payAmountInput) <= 0 ||
                  (() => {
                    const prevPaid = paymentModalCalc.paymentStatus === "Paid"
                      ? (paymentModalCalc.amountPaid > 0 ? paymentModalCalc.amountPaid : paymentModalCalc.totalAmount)
                      : (Number(paymentModalCalc.amountPaid) || 0);
                    const outstanding = Math.max(0, paymentModalCalc.totalAmount - prevPaid);
                    return Number(payAmountInput) > outstanding + 0.0001;
                  })()
                }
                className="px-4 py-2 text-xs font-bold shadow-sm"
              >
                {isRecordingPayment ? (
                  <><Loader2 className="animate-spin" size={14} /> Recording Payment...</>
                ) : (
                  <><CheckCircle size={14} /> Save Payment</>
                )}
              </PBtn>
            </div>
          }
        >
          {(() => {
            const prevPaid = paymentModalCalc.paymentStatus === "Paid"
              ? (paymentModalCalc.amountPaid > 0 ? paymentModalCalc.amountPaid : paymentModalCalc.totalAmount)
              : (Number(paymentModalCalc.amountPaid) || 0);
            const outstanding = Math.max(0, paymentModalCalc.totalAmount - prevPaid);
            const enteredAmount = Number(payAmountInput) || 0;
            const remainingAfterPayment = Math.max(0, outstanding - enteredAmount);
            const isOverpaying = enteredAmount > outstanding + 0.0001;

            return (
              <div className="space-y-3.5 pb-1">
                {/* Balance Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Sale</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono">
                      {fmt(paymentModalCalc.totalAmount, cs)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Paid So Far</span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-700 font-mono">
                      {fmt(prevPaid, cs)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Outstanding</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-600 font-mono">
                      {fmt(outstanding, cs)}
                    </span>
                  </div>
                </div>

                {/* Amount to Pay Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      Amount Paid Now ({cs}) <span className="text-red-500">*</span>
                    </label>
                    {outstanding > 0 && (
                      <button
                        type="button"
                        onClick={() => setPayAmountInput(String(outstanding))}
                        className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                      >
                        Pay Full Balance ({fmt(outstanding, cs)})
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">
                      {cs}
                    </span>
                    <NumInput
                      value={payAmountInput}
                      onChange={setPayAmountInput}
                      placeholder="0.00"
                      className={`${IC} text-sm py-2 pl-7 pr-3 text-left font-semibold`}
                      allowDecimal={true}
                    />
                  </div>
                </div>

                {/* Overpayment Warning */}
                {isOverpaying && (
                  <div className="p-2.5 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700 font-semibold flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-red-600" />
                    <span>Payment amount cannot exceed the outstanding balance of {fmt(outstanding, cs)}.</span>
                  </div>
                )}

                {/* Payment Date & Method Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={payDateInput}
                      onChange={e => setPayDateInput(e.target.value)}
                      className={`${IC} text-xs py-2`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Payment Method
                    </label>
                    <select
                      value={payMethodInput}
                      onChange={e => setPayMethodInput(e.target.value)}
                      className={`${SC} text-xs py-2`}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Transfer">Bank Transfer</option>
                      <option value="POS">POS / Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* Payment Reference / Notes */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                    Reference / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={payNotesInput}
                    onChange={e => setPayNotesInput(e.target.value)}
                    placeholder="e.g. Bank transfer ref, teller #, or customer receipt note"
                    className={`${IC} text-xs py-2`}
                  />
                </div>

                {/* Balance Projection Banner */}
                {enteredAmount > 0 && !isOverpaying && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                    remainingAfterPayment === 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}>
                    <span>
                      {remainingAfterPayment === 0 ? "✓ This payment fully clears the balance" : "Remaining balance after payment:"}
                    </span>
                    <span className="font-mono font-bold">
                      {fmt(remainingAfterPayment, cs)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ── Correct Payment to Unpaid (Audit Correction Modal) ── */}
      {unpaidCorrectionTarget && (
        <Modal
          title={`Correct Payment Status — ${unpaidCorrectionTarget.customerName}`}
          onClose={() => { if (!isCorrectingUnpaid) { setUnpaidCorrectionTarget(null); setUnpaidCorrectionReason(""); } }}
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => { setUnpaidCorrectionTarget(null); setUnpaidCorrectionReason(""); }}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                disabled={isCorrectingUnpaid}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCorrectToUnpaid}
                disabled={isCorrectingUnpaid || !unpaidCorrectionReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCorrectingUnpaid ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>{isCorrectingUnpaid ? "Correcting Payment..." : "Confirm Correction to Unpaid"}</span>
              </button>
            </div>
          }
        >
          <div className="space-y-3.5 pb-1">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>Audit Correction Notice</span>
              </div>
              <p>
                You are changing this sale from <strong>{unpaidCorrectionTarget.paymentStatus}</strong> to <strong>Unpaid</strong>.
                The recorded amount paid ({fmt(unpaidCorrectionTarget.amountPaid || unpaidCorrectionTarget.totalAmount, cs)}) will be reset to {cs}0.00 and an audit reversal entry will be permanently logged.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                Reason for Correction <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={unpaidCorrectionReason}
                onChange={e => setUnpaidCorrectionReason(e.target.value)}
                placeholder="e.g. Mistakenly recorded as paid; customer bank transfer was reversed; bounced cheque..."
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                This reason will be stored in the permanent audit trail for this sale.
              </p>
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
                  <PBtn onClick={handleSaveGroup} disabled={isSavingGroup} sm>
                    {isSavingGroup ? (
                      <><Loader2 className="animate-spin" size={13} /> {editGroup ? "Saving Changes..." : "Creating Group..."}</>
                    ) : (
                      <><CheckCircle size={13} /> {editGroup ? "Save Changes" : "Create Group"}</>
                    )}
                  </PBtn>
                  <button onClick={() => { if (!isSavingGroup) { setGroupFormMode(false); setEditGroup(null); } }} disabled={isSavingGroup} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-50">Cancel</button>
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
