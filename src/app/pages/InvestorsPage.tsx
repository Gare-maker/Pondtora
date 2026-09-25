import React, { useState, useMemo, useEffect } from "react";
import {
  Landmark, Search, Plus, Filter, ChevronLeft, Calendar,
  DollarSign, CheckCircle2, Clock, AlertCircle, Phone, Mail,
  TrendingUp, CreditCard, Droplets, Fish, ArrowUpRight,
  MoreVertical, Check, Edit3, Trash2, ArrowDownRight,
  Receipt, User, FileText, ChevronRight, AlertTriangle,
  Layers, ArrowRight, ShieldCheck, Sparkles, RefreshCw
} from "lucide-react";
import type {
  Farm, Pond, StockEvent, Investor, Investment, InvestmentPayment,
  InvestmentPaymentMethod, InvestmentPaymentStatus, InvestmentStatus, InvestmentPaymentType
} from "../types";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput, DateInput, StatCard } from "../shared";
import { TODAY, fmt, uid, isSameDate } from "../data";
import { toast } from "sonner";
import {
  calculateReturnAmount,
  calculateMonthlyReturn,
  calculatePrincipalPlusReturn,
  calculateAmountReceivedByBusiness,
  calculateTotalInvestorValue,
  generateInvestmentSchedule,
  derivePaymentStatus,
  deriveInvestmentStatus,
  formatPaymentMethod,
  calculateInvestmentDashboardStats,
  roundCurrency,
} from "../../lib/investmentUtils";

interface InvestorsPageProps {
  investors: Investor[];
  investments: Investment[];
  payments: InvestmentPayment[];
  farms: Farm[];
  ponds: Pond[];
  stockEvents: StockEvent[];
  activeFarmId: string;
  currency?: string;
  currentUser?: { name: string; email: string };
  isOwner?: boolean;
  canManage?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onAddInvestor: (investor: Investor, investment: Investment, payments: InvestmentPayment[]) => Promise<void>;
  onEditInvestor: (investor: Investor) => Promise<void>;
  onEditInvestment: (investment: Investment) => Promise<void>;
  onDeleteInvestor: (investorId: string) => Promise<void>;
  onRecordPayment: (payment: InvestmentPayment) => Promise<void>;
  onMarkPaymentPaid: (paymentId: string) => Promise<void>;
}

export default function InvestorsPage({
  investors,
  investments,
  payments,
  farms,
  ponds,
  stockEvents,
  activeFarmId,
  currency = "₦",
  currentUser,
  isOwner = true,
  canManage = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  onAddInvestor,
  onEditInvestor,
  onEditInvestment,
  onDeleteInvestor,
  onRecordPayment,
  onMarkPaymentPaid,
}: InvestorsPageProps) {
  // Navigation: Selected Investor Detail
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed">("All");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentTargetPeriod, setPaymentTargetPeriod] = useState<InvestmentPayment | null>(null);
  const [showEditInvestmentModal, setShowEditInvestmentModal] = useState(false);

  // Add Investor Form State
  const [addForm, setAddForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    notes: string;
    paymentMethod: InvestmentPaymentMethod;
    amountInvested: string;
    investorPercentage: string;
    durationMonths: string;
    numberOfPayments: string;
    startDate: string;
    dueDate: string;
    principalRepayment: string;
    farmId: string;
    pondId: string;
    fishStockId: string;
  }>({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
    paymentMethod: "monthly_return",
    amountInvested: "",
    investorPercentage: "",
    durationMonths: "12",
    numberOfPayments: "12",
    startDate: TODAY,
    dueDate: "",
    principalRepayment: "Principal capital returned at maturity",
    farmId: activeFarmId || farms[0]?.id || "",
    pondId: "",
    fishStockId: "",
  });

  // Calculate default due date when start date or duration changes for monthly_return
  useEffect(() => {
    if (addForm.startDate && addForm.durationMonths && addForm.paymentMethod === "monthly_return") {
      try {
        const d = new Date(addForm.startDate);
        const months = parseInt(addForm.durationMonths, 10) || 12;
        d.setMonth(d.getMonth() + months);
        const autoDue = d.toISOString().split("T")[0];
        setAddForm(p => ({ ...p, dueDate: autoDue, numberOfPayments: String(months) }));
      } catch {}
    }
  }, [addForm.startDate, addForm.durationMonths, addForm.paymentMethod]);

  // Record Payment Form State
  const [payForm, setPayForm] = useState({
    investorId: "",
    paymentId: "",
    paymentPeriod: "",
    paymentDate: TODAY,
    amountPaid: "",
    paymentMethod: "Bank Transfer",
    notes: "",
  });

  // Edit Investment & Investor Form State
  const [editForm, setEditForm] = useState<{
    fullName: string;
    phone: string;
    email: string;
    status: InvestmentStatus;
    notes: string;
    paymentMethod: InvestmentPaymentMethod;
    amountInvested: string;
    investorPercentage: string;
    durationMonths: string;
    numberOfPayments: string;
    startDate: string;
    dueDate: string;
    principalRepayment: string;
    farmId: string;
    pondId: string;
    fishStockId: string;
  }>({
    fullName: "",
    phone: "",
    email: "",
    status: "Active",
    notes: "",
    paymentMethod: "monthly_return",
    amountInvested: "",
    investorPercentage: "",
    durationMonths: "12",
    numberOfPayments: "12",
    startDate: TODAY,
    dueDate: "",
    principalRepayment: "",
    farmId: activeFarmId || farms[0]?.id || "",
    pondId: "",
    fishStockId: "",
  });

  // Selected investor & associated records
  const selectedInvestor = useMemo(() => {
    if (!selectedInvestorId) return null;
    return investors.find(i => i.id === selectedInvestorId) || null;
  }, [selectedInvestorId, investors]);

  const investorInvestments = useMemo(() => {
    if (!selectedInvestorId) return [];
    return investments.filter(inv => inv.investorId === selectedInvestorId);
  }, [selectedInvestorId, investments]);

  const activeInvestment = useMemo(() => {
    return investorInvestments[0] || null;
  }, [investorInvestments]);

  const investmentPayments = useMemo(() => {
    if (!activeInvestment) return [];
    return payments
      .filter(p => p.investmentId === activeInvestment.id)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [activeInvestment, payments]);

  // Derived status of active investment
  const activeInvestmentDerivedStatus = useMemo(() => {
    if (!activeInvestment) return "Active";
    return deriveInvestmentStatus(activeInvestment, investmentPayments);
  }, [activeInvestment, investmentPayments]);

  // ── 4 Core KPI Stat Cards ──
  const stats = useMemo(() => {
    return calculateInvestmentDashboardStats(investments, payments, investors, TODAY);
  }, [investments, payments, investors]);

  // Enriched investor list for table/cards
  const enrichedInvestors = useMemo(() => {
    return investors.map(inv => {
      const invList = investments.filter(item => item.investorId === inv.id);
      const primaryInv = invList[0];
      const invPayments = primaryInv ? payments.filter(p => p.investmentId === primaryInv.id) : [];

      const totalInvested = invList.reduce((s, i) => s + (Number(i.amountInvested) || 0), 0);
      const totalReturn = invList.reduce((s, i) => s + (Number(i.expectedReturn) || 0), 0);
      const totalDue = invPayments.reduce((s, p) => s + (Number(p.amountDue) || 0), 0) || (primaryInv ? Number(primaryInv.totalAmountDue) || 0 : 0);
      const totalPaid = invPayments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
      const outstanding = Math.max(0, totalDue - totalPaid);

      const farmObj = farms.find(f => f.id === (primaryInv?.farmId || inv.farmId));
      const pondObj = ponds.find(p => p.id === primaryInv?.pondId);

      const derivedStatus = primaryInv
        ? deriveInvestmentStatus(primaryInv, invPayments)
        : ((inv.status as InvestmentStatus) || "Active");

      // Find next upcoming payment
      const nextUnpaidPayment = invPayments
        .filter(p => (Number(p.amountPaid) || 0) < (Number(p.amountDue) || 0))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

      return {
        ...inv,
        investment: primaryInv,
        totalInvested,
        totalReturn,
        totalDue,
        totalPaid,
        outstanding,
        farmName: farmObj?.name || "Main Farm",
        pondName: pondObj?.name || "—",
        derivedStatus,
        nextPayment: nextUnpaidPayment || null,
        paymentMethodLabel: formatPaymentMethod(primaryInv?.paymentMethod),
      };
    });
  }, [investors, investments, payments, farms, ponds]);

  // Filtered Investors (Only Search + Active / Completed tabs)
  const filteredInvestors = useMemo(() => {
    return enrichedInvestors.filter(item => {
      // Search query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        item.farmName.toLowerCase().includes(q) ||
        item.paymentMethodLabel.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status Filter: Active vs Completed
      if (statusFilter === "Active") {
        if (item.derivedStatus === "Completed") return false;
      } else if (statusFilter === "Completed") {
        if (item.derivedStatus !== "Completed") return false;
      }

      return true;
    });
  }, [enrichedInvestors, searchQuery, statusFilter]);

  // ── Live Calculations for Add Form ──
  const addAmt = Number(addForm.amountInvested) || 0;
  const addPct = Number(addForm.investorPercentage) || 0;
  const addNumPayments = Math.max(1, parseInt(addForm.numberOfPayments, 10) || 12);
  const addReturnAmt = calculateReturnAmount(addAmt, addPct);
  const addMonthlyReturn = calculateMonthlyReturn(addReturnAmt, addNumPayments);
  const addPrincipalPlusReturn = calculatePrincipalPlusReturn(addAmt, addReturnAmt);
  const addAmountReceivedByBusiness = calculateAmountReceivedByBusiness(addAmt, addReturnAmt);
  const addTotalInvestorValue = calculateTotalInvestorValue(addAmt, addReturnAmt);

  // ── Live Calculations for Edit Form ──
  const editAmt = Number(editForm.amountInvested) || 0;
  const editPct = Number(editForm.investorPercentage) || 0;
  const editNumPayments = Math.max(1, parseInt(editForm.numberOfPayments, 10) || 12);
  const editReturnAmt = calculateReturnAmount(editAmt, editPct);
  const editMonthlyReturn = calculateMonthlyReturn(editReturnAmt, editNumPayments);
  const editPrincipalPlusReturn = calculatePrincipalPlusReturn(editAmt, editReturnAmt);
  const editAmountReceivedByBusiness = calculateAmountReceivedByBusiness(editAmt, editReturnAmt);
  const editTotalInvestorValue = calculateTotalInvestorValue(editAmt, editReturnAmt);

  // Ponds filtered by selected farm
  const availablePondsForAdd = useMemo(() => {
    return ponds.filter(p => p.farmId === addForm.farmId);
  }, [ponds, addForm.farmId]);

  const availablePondsForEdit = useMemo(() => {
    return ponds.filter(p => p.farmId === (editForm.farmId || activeFarmId));
  }, [ponds, editForm.farmId, activeFarmId]);

  // Open Edit Investment Modal
  const openEditInvestmentModal = () => {
    if (!selectedInvestor) return;
    const inv = activeInvestment;
    setEditForm({
      fullName: selectedInvestor.fullName || "",
      phone: selectedInvestor.phone || "",
      email: selectedInvestor.email || "",
      status: (selectedInvestor.status as InvestmentStatus) || "Active",
      notes: selectedInvestor.notes || "",
      paymentMethod: inv?.paymentMethod || "monthly_return",
      amountInvested: String(inv?.amountInvested || ""),
      investorPercentage: String(inv?.investorPercentage || ""),
      durationMonths: String(inv?.durationMonths || "12"),
      numberOfPayments: String(inv?.numberOfPayments || "12"),
      startDate: inv?.startDate || TODAY,
      dueDate: inv?.dueDate || "",
      principalRepayment: inv?.principalRepayment || "Principal capital returned at maturity",
      farmId: inv?.farmId || activeFarmId || farms[0]?.id || "",
      pondId: inv?.pondId || "",
      fishStockId: inv?.fishStockId || "",
    });
    setShowEditInvestmentModal(true);
  };

  // Save Edit Investment
  const handleSaveEditInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor) return;
    if (!editForm.fullName.trim()) {
      toast.error("Investor full name is required");
      return;
    }
    if (editAmt <= 0) {
      toast.error("Please enter a valid investment amount");
      return;
    }
    if (editPct <= 0) {
      toast.error("Agreed return percentage must be greater than 0%");
      return;
    }
    if (!editForm.dueDate) {
      toast.error("Maturity / Due date is required");
      return;
    }

    let totalAmountDue = editReturnAmt;
    if (editForm.paymentMethod === "principal_plus_return") {
      totalAmountDue = editPrincipalPlusReturn;
    } else if (editForm.paymentMethod === "return_upfront") {
      totalAmountDue = editAmt;
    }

    const updatedInvestor: Investor = {
      ...selectedInvestor,
      fullName: editForm.fullName.trim(),
      phone: editForm.phone.trim(),
      email: editForm.email.trim() || undefined,
      status: editForm.status,
      notes: editForm.notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedInvestment: Investment = activeInvestment
      ? {
          ...activeInvestment,
          farmId: editForm.farmId,
          pondId: editForm.pondId || undefined,
          fishStockId: editForm.fishStockId || undefined,
          paymentMethod: editForm.paymentMethod,
          amountInvested: editAmt,
          investorPercentage: editPct,
          expectedReturn: editReturnAmt,
          totalAmountDue,
          monthlyReturn: editForm.paymentMethod === "monthly_return" ? editMonthlyReturn : undefined,
          duration: `${editForm.durationMonths} months`,
          durationMonths: parseInt(editForm.durationMonths, 10) || 12,
          numberOfPayments: editForm.paymentMethod === "monthly_return" ? editNumPayments : 1,
          amountReceivedByBusiness: editForm.paymentMethod === "return_upfront" ? editAmountReceivedByBusiness : editAmt,
          totalInvestorValue: editTotalInvestorValue,
          principalRepayment: editForm.principalRepayment,
          startDate: editForm.startDate,
          dueDate: editForm.dueDate,
          maturityDate: editForm.dueDate,
          updatedAt: new Date().toISOString(),
        }
      : {
          id: uid(),
          investorId: selectedInvestor.id,
          farmId: editForm.farmId,
          pondId: editForm.pondId || undefined,
          fishStockId: editForm.fishStockId || undefined,
          paymentMethod: editForm.paymentMethod,
          amountInvested: editAmt,
          investorPercentage: editPct,
          expectedReturn: editReturnAmt,
          totalAmountDue,
          monthlyReturn: editForm.paymentMethod === "monthly_return" ? editMonthlyReturn : undefined,
          duration: `${editForm.durationMonths} months`,
          durationMonths: parseInt(editForm.durationMonths, 10) || 12,
          numberOfPayments: editForm.paymentMethod === "monthly_return" ? editNumPayments : 1,
          amountReceivedByBusiness: editForm.paymentMethod === "return_upfront" ? editAmountReceivedByBusiness : editAmt,
          totalInvestorValue: editTotalInvestorValue,
          principalRepayment: editForm.principalRepayment,
          startDate: editForm.startDate,
          dueDate: editForm.dueDate,
          maturityDate: editForm.dueDate,
          status: "Active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    try {
      await onEditInvestor(updatedInvestor);
      await onEditInvestment(updatedInvestment);
      toast.success("Investment updated successfully");
      setShowEditInvestmentModal(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update investment");
    }
  };

  // Handle Add Investor
  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = addForm.fullName.trim();
    if (!nameTrimmed) {
      toast.error("Investor full name is required");
      return;
    }
    if (!addForm.phone.trim()) {
      toast.error("Investor phone number is required");
      return;
    }
    if (addAmt <= 0) {
      toast.error("Please enter a valid investment amount");
      return;
    }
    if (addPct <= 0) {
      toast.error("Please enter an agreed return percentage greater than 0%");
      return;
    }
    if (!addForm.dueDate) {
      toast.error("Due date / Maturity date is required");
      return;
    }
    if (!addForm.farmId) {
      toast.error("Farm selection is required");
      return;
    }

    // ── DUPLICATE VALIDATION: Do not allow logging same investor name and start/due date twice ──
    const nameLower = nameTrimmed.toLowerCase();
    const existingInvestorWithSameName = investors.find(i => i.fullName?.trim().toLowerCase() === nameLower);
    if (existingInvestorWithSameName) {
      const existingInvs = investments.filter(inv => inv.investorId === existingInvestorWithSameName.id);
      const hasDuplicateDate = existingInvs.some(
        inv => isSameDate(inv.startDate, addForm.startDate) || isSameDate(inv.dueDate, addForm.dueDate)
      );
      if (hasDuplicateDate) {
        toast.error(`An investment for "${nameTrimmed}" with date ${addForm.startDate} already exists. Duplicate entry blocked.`);
        return;
      }
    }

    const investorId = uid();
    const investmentId = uid();

    let totalAmountDue = addReturnAmt;
    if (addForm.paymentMethod === "principal_plus_return") {
      totalAmountDue = addPrincipalPlusReturn;
    } else if (addForm.paymentMethod === "return_upfront") {
      totalAmountDue = addAmt;
    }

    const newInvestor: Investor = {
      id: investorId,
      farmId: addForm.farmId,
      fullName: nameTrimmed,
      phone: addForm.phone.trim(),
      email: addForm.email.trim() || undefined,
      status: "Active",
      notes: addForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const newInvestment: Investment = {
      id: investmentId,
      investorId: investorId,
      farmId: addForm.farmId,
      pondId: addForm.pondId || undefined,
      fishStockId: addForm.fishStockId || undefined,
      paymentMethod: addForm.paymentMethod,
      amountInvested: addAmt,
      investorPercentage: addPct,
      expectedReturn: addReturnAmt,
      totalAmountDue,
      monthlyReturn: addForm.paymentMethod === "monthly_return" ? addMonthlyReturn : undefined,
      duration: `${addForm.durationMonths} months`,
      durationMonths: parseInt(addForm.durationMonths, 10) || 12,
      numberOfPayments: addForm.paymentMethod === "monthly_return" ? addNumPayments : 1,
      amountReceivedByBusiness: addForm.paymentMethod === "return_upfront" ? addAmountReceivedByBusiness : addAmt,
      totalInvestorValue: addTotalInvestorValue,
      principalRepayment: addForm.principalRepayment,
      startDate: addForm.startDate || TODAY,
      dueDate: addForm.dueDate,
      maturityDate: addForm.dueDate,
      status: "Active",
      notes: addForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Automated payment schedule generation
    const generatedPayments = generateInvestmentSchedule({
      investmentId,
      farmId: addForm.farmId,
      paymentMethod: addForm.paymentMethod,
      investmentAmount: addAmt,
      returnPercentage: addPct,
      startDate: addForm.startDate || TODAY,
      dueDate: addForm.dueDate,
      durationMonths: parseInt(addForm.durationMonths, 10) || 12,
      numberOfPayments: addNumPayments,
    });

    try {
      await onAddInvestor(newInvestor, newInvestment, generatedPayments);
      setShowAddModal(false);
      setAddForm({
        fullName: "",
        phone: "",
        email: "",
        notes: "",
        paymentMethod: "monthly_return",
        amountInvested: "",
        investorPercentage: "",
        durationMonths: "12",
        numberOfPayments: "12",
        startDate: TODAY,
        dueDate: "",
        principalRepayment: "Principal capital returned at maturity",
        farmId: activeFarmId || farms[0]?.id || "",
        pondId: "",
        fishStockId: "",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save investor");
    }
  };

  // Open Record Payment Modal (Can be triggered anytime from list or details)
  const openRecordPayment = (targetPayment?: InvestmentPayment, targetInvestorId?: string) => {
    const invId = targetInvestorId || selectedInvestorId || (targetPayment ? investments.find(i => i.id === targetPayment.investmentId)?.investorId : "") || investors[0]?.id || "";
    const invInvestments = investments.filter(i => i.investorId === invId);
    const primaryInv = invInvestments[0];
    const invPayments = primaryInv ? payments.filter(p => p.investmentId === primaryInv.id) : [];

    if (targetPayment) {
      setPaymentTargetPeriod(targetPayment);
      const remaining = Math.max(0, (Number(targetPayment.amountDue) || 0) - (Number(targetPayment.amountPaid) || 0));
      setPayForm({
        investorId: invId,
        paymentId: targetPayment.id,
        paymentPeriod: targetPayment.paymentPeriod || "",
        paymentDate: TODAY,
        amountPaid: remaining > 0 ? remaining.toString() : targetPayment.amountDue.toString(),
        paymentMethod: targetPayment.paymentMethod || "Bank Transfer",
        notes: targetPayment.notes || "",
      });
    } else {
      const firstUnpaid = invPayments.find(p => (Number(p.amountPaid) || 0) < (Number(p.amountDue) || 0));
      setPaymentTargetPeriod(firstUnpaid || null);
      const remaining = firstUnpaid ? Math.max(0, (Number(firstUnpaid.amountDue) || 0) - (Number(firstUnpaid.amountPaid) || 0)) : 0;
      setPayForm({
        investorId: invId,
        paymentId: firstUnpaid?.id || "",
        paymentPeriod: firstUnpaid?.paymentPeriod || "Payout",
        paymentDate: TODAY,
        amountPaid: remaining > 0 ? remaining.toString() : "",
        paymentMethod: "Bank Transfer",
        notes: "",
      });
    }
    setShowRecordPaymentModal(true);
  };

  // Submit Record Payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = Number(payForm.amountPaid);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error("Please enter a valid amount paid");
      return;
    }

    const invId = payForm.investorId || selectedInvestorId || investors[0]?.id;
    const invInvestments = investments.filter(i => i.investorId === invId);
    const primaryInv = invInvestments[0];
    const fid = primaryInv?.farmId || activeFarmId || farms[0]?.id || "";

    if (paymentTargetPeriod) {
      const currentPaid = Number(paymentTargetPeriod.amountPaid) || 0;
      const newTotalPaid = currentPaid + payAmt;
      const due = Number(paymentTargetPeriod.amountDue) || 0;
      const newRemaining = Math.max(0, due - newTotalPaid);
      const derivedStatus = derivePaymentStatus({
        ...paymentTargetPeriod,
        amountPaid: newTotalPaid,
        amountDue: due,
      });

      const updatedPayment: InvestmentPayment = {
        ...paymentTargetPeriod,
        farmId: fid,
        amountPaid: newTotalPaid,
        remainingAmount: newRemaining,
        paymentDate: payForm.paymentDate || TODAY,
        paidDate: derivedStatus === "Paid" ? (payForm.paymentDate || TODAY) : paymentTargetPeriod.paidDate,
        paymentMethod: payForm.paymentMethod,
        status: derivedStatus,
        notes: payForm.notes.trim() || paymentTargetPeriod.notes,
        recordedBy: currentUser?.name || "Admin",
        updatedAt: new Date().toISOString(),
      };

      try {
        await onRecordPayment(updatedPayment);
        setShowRecordPaymentModal(false);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to record payment");
      }
    } else if (primaryInv) {
      // Record unscheduled/ad-hoc payment anytime
      const newPayment: InvestmentPayment = {
        id: uid(),
        farmId: fid,
        investmentId: primaryInv.id,
        dueDate: payForm.paymentDate || TODAY,
        paymentDate: payForm.paymentDate || TODAY,
        paidDate: payForm.paymentDate || TODAY,
        paymentPeriod: payForm.paymentPeriod.trim() || `Payout on ${payForm.paymentDate || TODAY}`,
        paymentType: "Ad-hoc Payout",
        amountDue: payAmt,
        scheduledAmount: payAmt,
        amountPaid: payAmt,
        remainingAmount: 0,
        paymentMethod: payForm.paymentMethod,
        status: "Paid",
        notes: payForm.notes.trim() || undefined,
        recordedBy: currentUser?.name || "Admin",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await onRecordPayment(newPayment);
        setShowRecordPaymentModal(false);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to record payment");
      }
    } else {
      toast.error("No active investment found for this investor. Please add an investment first.");
    }
  };

  // Quick Mark as Paid
  const handleQuickMarkPaid = async (payment: InvestmentPayment) => {
    try {
      const updatedPayment: InvestmentPayment = {
        ...payment,
        amountPaid: payment.amountDue,
        remainingAmount: 0,
        paymentDate: TODAY,
        paidDate: TODAY,
        status: "Paid",
        recordedBy: currentUser?.name || "Admin",
        updatedAt: new Date().toISOString(),
      };
      await onRecordPayment(updatedPayment);
      toast.success(`Period "${payment.paymentPeriod}" marked as fully paid`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to mark as paid");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full font-['Barlow',sans-serif]">
      {/* ── Top Header / Breadcrumbs (No bottom divider) ── */}
      <div className="sticky top-0 z-10 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {selectedInvestorId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedInvestorId(null)}
                className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:text-green-800 hover:underline transition-colors"
              >
                <ChevronLeft size={16} /> Investors
              </button>
              <span className="text-slate-300">/</span>
              <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                {selectedInvestor?.fullName}
              </h1>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">
                Investors
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage farm investors, return structures, payment schedules, and payouts
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <PBtn sm outline onClick={() => openRecordPayment()}>
                <Receipt size={14} /> Record Payment
              </PBtn>
              <PBtn sm onClick={() => setShowAddModal(true)}>
                <Plus size={14} /> Add Investor
              </PBtn>
            </>
          )}
        </div>
      </div>

      {/* ── VIEW SWITCH: LIST VS DETAILS ── */}
      {!selectedInvestorId ? (
        /* ═══════════════════════════════════════════════════════════════════
           MAIN INVESTOR TABLE VIEW
        ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-3.5">
          {/* ── 4 KEY DASHBOARD STAT CARDS (Main List Only) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <StatCard
              label="Total Investors"
              value={String(stats.totalInvestors)}
              sub={`${stats.activeInvestmentsCount} active · ${stats.completedInvestmentsCount} completed`}
              icon={User}
              color="blue"
            />
            <StatCard
              label="Total Money Invested"
              value={`${currency}${stats.totalInvestment.toLocaleString()}`}
              sub="Capital recorded"
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              label="Total Paid Out"
              value={`${currency}${stats.totalPaid.toLocaleString()}`}
              sub="Disbursed to date"
              icon={CheckCircle2}
              color="purple"
            />
            <StatCard
              label="Outstanding Payments"
              value={`${currency}${stats.totalRemaining.toLocaleString()}`}
              sub={stats.dueTodayCount > 0 ? `${stats.dueTodayCount} due today` : stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : "Remaining obligations"}
              icon={Clock}
              color={stats.overdueCount > 0 ? "red" : stats.dueTodayCount > 0 ? "amber" : "amber"}
            />
          </div>
          {/* ── Search and Active/Completed Filters Only ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by investor name, phone, structure..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
              />
            </div>

            {/* Filter Tabs: All / Active / Completed */}
            <div className="flex items-center gap-1 bg-slate-100/90 border border-slate-200/90 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "All"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({enrichedInvestors.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "Active"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active ({stats.activeInvestmentsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === "Completed"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed ({stats.completedInvestmentsCount})
              </button>
            </div>
          </div>

          {/* ── Main Investors Table (Names Sticky to Left) ── */}
          <Card className="overflow-hidden bg-white shadow-xs border border-slate-200/80 rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    {/* Sticky Investor Name Column */}
                    <th className="text-left px-4 py-3 sticky left-0 bg-slate-50 z-20 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] border-r border-slate-200/70 min-w-[180px] sm:min-w-[220px]">
                      Investor Name
                    </th>
                    <th className="text-left px-4 py-3">Payment Structure</th>
                    <th className="text-right px-4 py-3">Amount Invested</th>
                    <th className="text-left px-4 py-3">Due Date</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-3 py-3 w-10 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">
                        <Landmark size={36} className="mx-auto text-slate-200 mb-2" />
                        <p className="font-semibold text-sm text-slate-700">No investors found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {searchQuery || statusFilter !== "All"
                            ? "Try adjusting your search query or filter tab."
                            : "Click '+ Add Investor' above to record your first farm investor."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvestors.map(item => {
                      const statusColor =
                        item.derivedStatus === "Completed"
                          ? "blue"
                          : item.derivedStatus === "Overdue"
                          ? "red"
                          : item.derivedStatus === "Payment Due"
                          ? "amber"
                          : item.derivedStatus === "Partially Paid"
                          ? "purple"
                          : "green";

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedInvestorId(item.id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          {/* Sticky Name Column */}
                          <td className="px-4 py-3 font-semibold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] border-r border-slate-100 min-w-[180px] sm:min-w-[220px] transition-colors">
                            <div className="font-bold text-sm text-slate-900 group-hover:text-green-700 transition-colors">
                              {item.fullName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-normal mt-0.5 font-mono">
                              <Phone size={10} className="text-slate-400" />
                              <span>{item.phone}</span>
                            </div>
                          </td>

                          {/* Payment Structure */}
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {item.paymentMethodLabel}
                            </span>
                          </td>

                          {/* Amount Invested */}
                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                            {currency}{item.totalInvested.toLocaleString()}
                          </td>

                          {/* Due Date */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                            <span
                              className={
                                item.derivedStatus === "Overdue"
                                  ? "text-red-600 font-bold"
                                  : item.derivedStatus === "Payment Due"
                                  ? "text-amber-600 font-bold"
                                  : "text-slate-700 font-medium"
                              }
                            >
                              {item.investment?.dueDate || "—"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <Bdg label={item.derivedStatus} color={statusColor as any} />
                          </td>

                          {/* Arrow Link */}
                          <td className="px-3 py-3 text-right text-slate-300 group-hover:text-green-600 transition-colors">
                            <ChevronRight size={16} />
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
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
           INVESTOR DETAILS & PAYMENT SCHEDULE VIEW (CLEAN & UNCLUTTERED)
        ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedInvestorId(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors"
                title="Back to Investors List"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                    {selectedInvestor?.fullName}
                  </h2>
                  <Bdg
                    label={activeInvestmentDerivedStatus}
                    color={
                      activeInvestmentDerivedStatus === "Completed"
                        ? "blue"
                        : activeInvestmentDerivedStatus === "Overdue"
                        ? "red"
                        : activeInvestmentDerivedStatus === "Payment Due"
                        ? "amber"
                        : "green"
                    }
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone size={12} className="text-slate-400" /> {selectedInvestor?.phone}
                  </span>
                  {selectedInvestor?.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" /> {selectedInvestor.email}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold text-[11px]">
                    {formatPaymentMethod(activeInvestment?.paymentMethod)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (
                <PBtn sm onClick={() => openRecordPayment()}>
                  <Receipt size={14} /> Record Payment
                </PBtn>
              )}
              {canEdit && (
                <PBtn sm outline onClick={openEditInvestmentModal}>
                  <Edit3 size={14} /> Edit
                </PBtn>
              )}
              {canDelete && onDeleteInvestor && (
                <PBtn sm danger onClick={async () => {
                  if (confirm(`Delete investor "${selectedInvestor?.fullName}" and all associated payment schedules?`)) {
                    await onDeleteInvestor(selectedInvestor!.id);
                    setSelectedInvestorId(null);
                    toast.success("Investor deleted");
                  }
                }}>
                  <Trash2 size={14} /> Delete
                </PBtn>
              )}
            </div>
          </div>

          {/* ── Clean Investment Overview Presentation ── */}
          <Card className="p-4 sm:p-5 bg-white shadow-xs border border-slate-200/80 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Investment Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-slate-400 text-[11px] block">Amount Invested</span>
                <span className="font-bold text-slate-900 text-base">
                  {currency}{(Number(activeInvestment?.amountInvested) || 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Return / Profit</span>
                <span className="font-bold text-emerald-700 text-base">
                  {activeInvestment?.investorPercentage || 0}% ({currency}{(Number(activeInvestment?.expectedReturn) || 0).toLocaleString()})
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Total Paid Out</span>
                <span className="font-bold text-purple-700 text-base">
                  {currency}{investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Outstanding Balance</span>
                <span className="font-bold text-amber-700 text-base">
                  {currency}{Math.max(0, investmentPayments.reduce((s, p) => s + (p.amountDue || 0), 0) - investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0)).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3.5 mt-3.5 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Payment Structure</span>
                <span className="font-semibold text-slate-800">
                  {formatPaymentMethod(activeInvestment?.paymentMethod)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Start Date</span>
                <span className="font-medium text-slate-700 font-mono">
                  {activeInvestment?.startDate || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Due / Maturity Date</span>
                <span className="font-medium text-slate-700 font-mono">
                  {activeInvestment?.dueDate || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Farm / Location</span>
                <span className="font-medium text-slate-700">
                  {farms.find(f => f.id === activeInvestment?.farmId)?.name || "Main Farm"}
                </span>
              </div>
            </div>
          </Card>

          {/* ── Basic & Clean Payment Schedule Table ── */}
          <Card className="overflow-hidden bg-white shadow-xs border border-slate-200/80 rounded-2xl">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  {activeInvestment?.paymentMethod === "monthly_return" ? "Monthly Payment Schedule" : "Payment Obligation"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {activeInvestment?.paymentMethod === "monthly_return"
                    ? "Monthly returns paid to the investor and remaining installments"
                    : "Scheduled payout date and payment records"}
                </p>
              </div>
              {canCreate && (
                <PBtn sm outline onClick={() => openRecordPayment()}>
                  <Plus size={14} /> Record Payment
                </PBtn>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="text-left px-4 py-2.5">Due Date</th>
                    <th className="text-left px-4 py-2.5">Period / Description</th>
                    <th className="text-right px-4 py-2.5">Amount Due</th>
                    <th className="text-right px-4 py-2.5">Amount Paid</th>
                    <th className="text-left px-4 py-2.5">Paid Date</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {investmentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No payments scheduled for this investment.
                      </td>
                    </tr>
                  ) : (
                    investmentPayments.map(p => {
                      const derivedStatus = derivePaymentStatus(p);
                      const isPaid = derivedStatus === "Paid";

                      const statusColor =
                        derivedStatus === "Paid"
                          ? "blue"
                          : derivedStatus === "Partially Paid"
                          ? "purple"
                          : derivedStatus === "Due"
                          ? "amber"
                          : derivedStatus === "Overdue"
                          ? "red"
                          : "gray";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-700 font-medium whitespace-nowrap">{p.dueDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{p.paymentPeriod}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{currency}{p.amountDue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">{currency}{p.amountPaid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono">{p.paymentDate || p.paidDate || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <Bdg label={derivedStatus} color={statusColor as any} />
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            {!isPaid ? (
                              <>
                                {canEdit && (
                                  <button
                                    onClick={() => handleQuickMarkPaid(p)}
                                    className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 transition-colors"
                                    title="Mark period as fully paid"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                                {canCreate && (
                                  <button
                                    onClick={() => openRecordPayment(p)}
                                    className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors"
                                  >
                                    Record
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-emerald-600 text-[11px] font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 size={13} /> Paid
                              </span>
                            )}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         ADD INVESTOR & PAYMENT STRUCTURE MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <Modal title="Add New Investor & Investment" onClose={() => setShowAddModal(false)} wide>
          <form onSubmit={handleCreateInvestor} className="space-y-4">
            {/* ── Section 1: Investor Profile ── */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Investor Profile</p>
              <div className="space-y-2.5">
                <F label="Full Name" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alhaji Babatunde Adeleke"
                    value={addForm.fullName}
                    onChange={e => setAddForm(p => ({ ...p, fullName: e.target.value }))}
                    className={IC}
                  />
                </F>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Phone Number" required>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={addForm.phone}
                      onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                      className={IC}
                    />
                  </F>
                  <F label="Email Address">
                    <input
                      type="email"
                      placeholder="e.g. investor@gmail.com"
                      value={addForm.email}
                      onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                      className={IC}
                    />
                  </F>
                </div>
              </div>
            </div>

            {/* ── Section 2: Payment Structure Selector ── */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Payment Method / Structure</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                {/* Option 1: Monthly Return */}
                <button
                  type="button"
                  onClick={() => setAddForm(p => ({ ...p, paymentMethod: "monthly_return" }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    addForm.paymentMethod === "monthly_return"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Option 1: Monthly Return</span>
                    {addForm.paymentMethod === "monthly_return" && <CheckCircle2 size={14} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Agreed return divided into monthly installments across investment period.
                  </p>
                </button>

                {/* Option 2: Principal + Return on Date */}
                <button
                  type="button"
                  onClick={() => setAddForm(p => ({ ...p, paymentMethod: "principal_plus_return" }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    addForm.paymentMethod === "principal_plus_return"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Option 2: Principal + Return</span>
                    {addForm.paymentMethod === "principal_plus_return" && <CheckCircle2 size={14} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Original capital plus full return paid on one selected maturity date.
                  </p>
                </button>

                {/* Option 3: Return Paid Upfront */}
                <button
                  type="button"
                  onClick={() => setAddForm(p => ({ ...p, paymentMethod: "return_upfront" }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    addForm.paymentMethod === "return_upfront"
                      ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">Option 3: Upfront Return</span>
                    {addForm.paymentMethod === "return_upfront" && <CheckCircle2 size={14} className="text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Return deducted upfront; full original investment value returned at maturity.
                  </p>
                </button>
              </div>

              {/* ── Form Inputs by Structure ── */}
              <div className="space-y-3">
                {/* Structure 1: Monthly Return */}
                {addForm.paymentMethod === "monthly_return" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Investment Amount (₦)" required>
                        <NumInput
                          value={addForm.amountInvested}
                          onChange={v => setAddForm(p => ({ ...p, amountInvested: v }))}
                          className={IC}
                          placeholder="e.g. 1000000"
                        />
                      </F>
                      <F label="Return (%)" required>
                        <NumInput
                          value={addForm.investorPercentage}
                          onChange={v => setAddForm(p => ({ ...p, investorPercentage: v }))}
                          className={IC}
                          placeholder="e.g. 15"
                        />
                      </F>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Duration (Months)" required>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={addForm.durationMonths}
                          onChange={e => setAddForm(p => ({ ...p, durationMonths: e.target.value, numberOfPayments: e.target.value }))}
                          className={IC}
                          placeholder="12"
                        />
                      </F>
                      <F label="Number of Payments" required>
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={addForm.numberOfPayments}
                          onChange={e => setAddForm(p => ({ ...p, numberOfPayments: e.target.value }))}
                          className={IC}
                          placeholder="12"
                        />
                      </F>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Start Date" required>
                        <DateInput
                          value={addForm.startDate}
                          onChange={v => setAddForm(p => ({ ...p, startDate: v }))}
                        />
                      </F>
                      <F label="End Date / Maturity" required>
                        <DateInput
                          value={addForm.dueDate}
                          onChange={v => setAddForm(p => ({ ...p, dueDate: v }))}
                        />
                      </F>
                    </div>

                    <F label="Principal Repayment Details">
                      <input
                        type="text"
                        value={addForm.principalRepayment}
                        onChange={e => setAddForm(p => ({ ...p, principalRepayment: e.target.value }))}
                        className={IC}
                        placeholder="e.g. Principal capital returned at maturity"
                      />
                    </F>

                    {/* Structure 1 Live Preview Banner */}
                    {addAmt > 0 && addPct > 0 && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Investment:</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return:</span>
                          <span className="font-bold text-emerald-700">{addPct}%</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Total Return:</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Duration:</span>
                          <span>{addForm.durationMonths} months</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/70 pt-1">
                          <span>Monthly Return:</span>
                          <span className="text-sm font-bold text-emerald-700">{currency}{addMonthlyReturn.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-800 font-bold">
                          <span>Total Investment Value:</span>
                          <span>{currency}{addTotalInvestorValue.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Structure 2: Principal + Return on Date */}
                {addForm.paymentMethod === "principal_plus_return" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Investment Amount (₦)" required>
                        <NumInput
                          value={addForm.amountInvested}
                          onChange={v => setAddForm(p => ({ ...p, amountInvested: v }))}
                          className={IC}
                          placeholder="e.g. 1000000"
                        />
                      </F>
                      <F label="Return (%)" required>
                        <NumInput
                          value={addForm.investorPercentage}
                          onChange={v => setAddForm(p => ({ ...p, investorPercentage: v }))}
                          className={IC}
                          placeholder="e.g. 15"
                        />
                      </F>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Start Date" required>
                        <DateInput
                          value={addForm.startDate}
                          onChange={v => setAddForm(p => ({ ...p, startDate: v }))}
                        />
                      </F>
                      <F label="Payment / Maturity Date" required>
                        <DateInput
                          value={addForm.dueDate}
                          onChange={v => setAddForm(p => ({ ...p, dueDate: v }))}
                        />
                      </F>
                    </div>

                    {/* Structure 2 Live Preview Banner */}
                    {addAmt > 0 && addPct > 0 && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Investment:</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return:</span>
                          <span className="font-bold text-emerald-700">{addPct}%</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return Amount:</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Payment Date:</span>
                          <span>{addForm.dueDate || "—"}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/70 pt-1">
                          <span>Total Amount Due:</span>
                          <span className="text-sm font-bold text-emerald-700">{currency}{addPrincipalPlusReturn.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Status:</span>
                          <span className="font-semibold text-emerald-600">Active</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Structure 3: Return Paid Upfront */}
                {addForm.paymentMethod === "return_upfront" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Investment Value / Face Value (₦)" required>
                        <NumInput
                          value={addForm.amountInvested}
                          onChange={v => setAddForm(p => ({ ...p, amountInvested: v }))}
                          className={IC}
                          placeholder="e.g. 1000000"
                        />
                      </F>
                      <F label="Return (%)" required>
                        <NumInput
                          value={addForm.investorPercentage}
                          onChange={v => setAddForm(p => ({ ...p, investorPercentage: v }))}
                          className={IC}
                          placeholder="e.g. 15"
                        />
                      </F>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <F label="Start Date" required>
                        <DateInput
                          value={addForm.startDate}
                          onChange={v => setAddForm(p => ({ ...p, startDate: v }))}
                        />
                      </F>
                      <F label="Maturity Date" required>
                        <DateInput
                          value={addForm.dueDate}
                          onChange={v => setAddForm(p => ({ ...p, dueDate: v }))}
                        />
                      </F>
                    </div>

                    {/* Structure 3 Live Preview Banner */}
                    {addAmt > 0 && addPct > 0 && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Investment Value:</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return:</span>
                          <span className="font-bold text-emerald-700">{addPct}%</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return Paid Upfront:</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Amount Received by Business:</span>
                          <span className="font-bold text-blue-700">{currency}{addAmountReceivedByBusiness.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Maturity Payment:</span>
                          <span className="font-bold text-slate-900">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/70 pt-1">
                          <span>Total Investor Value:</span>
                          <span className="text-sm font-bold text-emerald-700">{currency}{addTotalInvestorValue.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Farm & Fish Stock Link ── */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Farm & Pond Link</p>
              <div className="space-y-2.5">
                <F label="Farm" required>
                  <select
                    value={addForm.farmId}
                    onChange={e => setAddForm(p => ({ ...p, farmId: e.target.value, pondId: "", fishStockId: "" }))}
                    className={SC}
                    required
                  >
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.city})</option>
                    ))}
                  </select>
                </F>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Pond (Optional)">
                    <select
                      value={addForm.pondId}
                      onChange={e => setAddForm(p => ({ ...p, pondId: e.target.value }))}
                      className={SC}
                    >
                      <option value="">General Farm (No specific pond)</option>
                      {availablePondsForAdd.map(pond => (
                        <option key={pond.id} value={pond.id}>
                          {pond.name} — {pond.species} ({pond.status})
                        </option>
                      ))}
                    </select>
                  </F>

                  <F label="Fish Stock / Batch (Optional)">
                    <input
                      type="text"
                      placeholder="e.g. Stock #18 Catfish"
                      value={addForm.fishStockId}
                      onChange={e => setAddForm(p => ({ ...p, fishStockId: e.target.value }))}
                      className={IC}
                    />
                  </F>
                </div>

                <F label="Agreement Notes & References">
                  <textarea
                    rows={2}
                    placeholder="e.g. Contract agreement reference, bank payout details..."
                    value={addForm.notes}
                    onChange={e => setAddForm(p => ({ ...p, notes: e.target.value }))}
                    className={IC}
                  />
                </F>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00BB58] hover:bg-[#009e4a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Save Investor & Schedule
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         RECORD PAYMENT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showRecordPaymentModal && (
        <Modal title="Record Investor Payout" onClose={() => setShowRecordPaymentModal(false)}>
          <form onSubmit={handleSavePayment} className="space-y-3.5">
            {!selectedInvestorId && (
              <F label="Select Investor" required>
                <select
                  value={payForm.investorId}
                  onChange={e => {
                    const newId = e.target.value;
                    const invInvs = investments.filter(i => i.investorId === newId);
                    const pInv = invInvs[0];
                    const pPays = pInv ? payments.filter(p => p.investmentId === pInv.id) : [];
                    const firstUnpaid = pPays.find(p => (Number(p.amountPaid) || 0) < (Number(p.amountDue) || 0));
                    setPaymentTargetPeriod(firstUnpaid || null);
                    const rem = firstUnpaid ? Math.max(0, (Number(firstUnpaid.amountDue) || 0) - (Number(firstUnpaid.amountPaid) || 0)) : 0;
                    setPayForm(p => ({
                      ...p,
                      investorId: newId,
                      paymentId: firstUnpaid?.id || "",
                      paymentPeriod: firstUnpaid?.paymentPeriod || "Payout",
                      amountPaid: rem > 0 ? String(rem) : p.amountPaid,
                    }));
                  }}
                  className={SC}
                >
                  {investors.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.fullName} ({inv.phone})
                    </option>
                  ))}
                </select>
              </F>
            )}

            {paymentTargetPeriod && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Period:</span>
                  <span className="font-bold text-slate-800">{paymentTargetPeriod.paymentPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Type:</span>
                  <span className="font-semibold text-slate-700">{paymentTargetPeriod.paymentType || "Scheduled"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Due:</span>
                  <span className="font-bold text-slate-900">{currency}{paymentTargetPeriod.amountDue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-semibold text-purple-700">{currency}{paymentTargetPeriod.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-700 border-t border-slate-200 pt-1">
                  <span>Balance Due:</span>
                  <span>{currency}{Math.max(0, paymentTargetPeriod.amountDue - paymentTargetPeriod.amountPaid).toLocaleString()}</span>
                </div>
              </div>
            )}

            {!paymentTargetPeriod && (
              <F label="Period / Description (Optional)">
                <input
                  type="text"
                  placeholder="e.g. Interim Return, Month 1 Payout..."
                  value={payForm.paymentPeriod}
                  onChange={e => setPayForm(p => ({ ...p, paymentPeriod: e.target.value }))}
                  className={IC}
                />
              </F>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <F label="Payment Date" required>
                <DateInput
                  value={payForm.paymentDate}
                  onChange={v => setPayForm(p => ({ ...p, paymentDate: v }))}
                />
              </F>

              <F label="Amount Paid" required>
                <NumInput
                  value={payForm.amountPaid}
                  onChange={v => setPayForm(p => ({ ...p, amountPaid: v }))}
                  className={IC}
                  placeholder="e.g. 12500"
                />
              </F>
            </div>

            <F label="Payment Method" required>
              <select
                value={payForm.paymentMethod}
                onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))}
                className={SC}
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="POS">POS</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </F>

            <F label="Transaction Notes / Reference">
              <textarea
                rows={2}
                placeholder="e.g. Bank transaction receipt number, transfer reference..."
                value={payForm.notes}
                onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                className={IC}
              />
            </F>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowRecordPaymentModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Payout Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         EDIT INVESTMENT & INVESTOR MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showEditInvestmentModal && (
        <Modal
          title="Edit Investment & Investor Profile"
          onClose={() => setShowEditInvestmentModal(false)}
          wide
        >
          <form onSubmit={handleSaveEditInvestment} className="space-y-4">
            {/* Section 1: Investor Profile */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Investor Profile</p>
              <div className="space-y-2.5">
                <F label="Full Name" required>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    className={IC}
                    placeholder="e.g. Chief Adeleke Adele"
                  />
                </F>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Phone Number" required>
                    <input
                      type="tel"
                      required
                      value={editForm.phone}
                      onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                      className={IC}
                    />
                  </F>
                  <F label="Email Address">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                      className={IC}
                    />
                  </F>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Investor Status">
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm(p => ({ ...p, status: e.target.value as any }))}
                      className={SC}
                    >
                      <option value="Active">Active</option>
                      <option value="Payment Due">Payment Due</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Completed">Completed</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </F>
                  <F label="Investor Notes">
                    <input
                      type="text"
                      value={editForm.notes}
                      onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                      className={IC}
                      placeholder="Internal reference notes…"
                    />
                  </F>
                </div>
              </div>
            </div>

            {/* Section 2: Structure & Financial Details */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Investment Agreement & Structure</p>
              
              <F label="Payment Structure" required>
                <select
                  value={editForm.paymentMethod}
                  onChange={e => setEditForm(p => ({ ...p, paymentMethod: e.target.value as any }))}
                  className={SC}
                >
                  <option value="monthly_return">Option 1: Monthly Return</option>
                  <option value="principal_plus_return">Option 2: Principal + Return on Date</option>
                  <option value="return_upfront">Option 3: Return Paid Upfront</option>
                </select>
              </F>

              <div className="space-y-2.5 mt-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Investment Capital / Face Value (₦)" required>
                    <NumInput
                      value={editForm.amountInvested}
                      onChange={v => setEditForm(p => ({ ...p, amountInvested: v }))}
                      className={IC}
                    />
                  </F>
                  <F label="Agreed Return (%)" required>
                    <NumInput
                      value={editForm.investorPercentage}
                      onChange={v => setEditForm(p => ({ ...p, investorPercentage: v }))}
                      className={IC}
                    />
                  </F>
                </div>

                {editForm.paymentMethod === "monthly_return" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <F label="Duration (Months)">
                      <input
                        type="number"
                        value={editForm.durationMonths}
                        onChange={e => setEditForm(p => ({ ...p, durationMonths: e.target.value, numberOfPayments: e.target.value }))}
                        className={IC}
                      />
                    </F>
                    <F label="Number of Payments">
                      <input
                        type="number"
                        value={editForm.numberOfPayments}
                        onChange={e => setEditForm(p => ({ ...p, numberOfPayments: e.target.value }))}
                        className={IC}
                      />
                    </F>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Start Date" required>
                    <DateInput
                      value={editForm.startDate}
                      onChange={v => setEditForm(p => ({ ...p, startDate: v }))}
                    />
                  </F>
                  <F label="Maturity / Due Date" required>
                    <DateInput
                      value={editForm.dueDate}
                      onChange={v => setEditForm(p => ({ ...p, dueDate: v }))}
                    />
                  </F>
                </div>

                {editAmt > 0 && editPct > 0 && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span>Capital / Face Value:</span>
                      <span className="font-bold">{currency}{editAmt.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Return ({editPct}%):</span>
                      <span className="font-bold text-emerald-700">{currency}{editReturnAmt.toLocaleString()}</span>
                    </div>
                    {editForm.paymentMethod === "monthly_return" && (
                      <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/60 pt-1">
                        <span>Monthly Return:</span>
                        <span>{currency}{editMonthlyReturn.toLocaleString()} / month</span>
                      </div>
                    )}
                    {editForm.paymentMethod === "return_upfront" && (
                      <div className="flex justify-between text-blue-800 font-bold border-t border-emerald-200/60 pt-1">
                        <span>Amount Received by Business:</span>
                        <span>{currency}{editAmountReceivedByBusiness.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Farm Link */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Farm & Pond Link</p>
              <div className="space-y-2.5">
                <F label="Farm">
                  <select
                    value={editForm.farmId}
                    onChange={e => setEditForm(p => ({ ...p, farmId: e.target.value, pondId: "" }))}
                    className={SC}
                  >
                    {farms.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.city})</option>
                    ))}
                  </select>
                </F>

                <F label="Pond (Optional)">
                  <select
                    value={editForm.pondId}
                    onChange={e => setEditForm(p => ({ ...p, pondId: e.target.value }))}
                    className={SC}
                  >
                    <option value="">General Farm (No specific pond)</option>
                    {availablePondsForEdit.map(pond => (
                      <option key={pond.id} value={pond.id}>{pond.name} ({pond.species})</option>
                    ))}
                  </select>
                </F>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowEditInvestmentModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
