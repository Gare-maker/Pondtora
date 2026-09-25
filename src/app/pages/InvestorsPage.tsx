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
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("All");
  const [farmFilter, setFarmFilter] = useState<string>("All");
  const [pondFilter, setPondFilter] = useState<string>("All");
  const [dueDateFilter, setDueDateFilter] = useState<string>("");

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
    principalRepayment: "Original principal capital returned at maturity",
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
    paymentId: "",
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

  // ── 9 Dashboard KPI Metrics ──
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

  // Filtered Investors
  const filteredInvestors = useMemo(() => {
    return enrichedInvestors.filter(item => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.fullName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        item.farmName.toLowerCase().includes(q) ||
        item.pondName.toLowerCase().includes(q) ||
        item.paymentMethodLabel.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== "All" && item.derivedStatus !== statusFilter) {
        return false;
      }

      // Payment Method Filter
      if (paymentMethodFilter !== "All") {
        const method = item.investment?.paymentMethod || "monthly_return";
        if (paymentMethodFilter !== method) return false;
      }

      // Farm Filter
      if (farmFilter !== "All" && item.farmId !== farmFilter && item.investment?.farmId !== farmFilter) {
        return false;
      }

      // Pond Filter
      if (pondFilter !== "All" && item.investment?.pondId !== pondFilter) {
        return false;
      }

      // Due Date Filter
      if (dueDateFilter && item.investment?.dueDate) {
        if (!item.investment.dueDate.startsWith(dueDateFilter)) return false;
      }

      return true;
    });
  }, [enrichedInvestors, searchQuery, statusFilter, paymentMethodFilter, farmFilter, pondFilter, dueDateFilter]);

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
      principalRepayment: inv?.principalRepayment || "Original principal capital returned at maturity",
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
      totalAmountDue = editAmt; // Principal returned at maturity
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
    if (!addForm.fullName.trim()) {
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
      fullName: addForm.fullName.trim(),
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
      toast.success("Investor and payment schedule created successfully");
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
        principalRepayment: "Original principal capital returned at maturity",
        farmId: activeFarmId || farms[0]?.id || "",
        pondId: "",
        fishStockId: "",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save investor");
    }
  };

  // Open Record Payment Modal
  const openRecordPayment = (targetPayment?: InvestmentPayment) => {
    if (targetPayment) {
      setPaymentTargetPeriod(targetPayment);
      const remaining = Math.max(0, targetPayment.amountDue - targetPayment.amountPaid);
      setPayForm({
        paymentId: targetPayment.id,
        paymentDate: TODAY,
        amountPaid: remaining > 0 ? remaining.toString() : targetPayment.amountDue.toString(),
        paymentMethod: targetPayment.paymentMethod || "Bank Transfer",
        notes: targetPayment.notes || "",
      });
    } else {
      const firstUnpaid = investmentPayments.find(p => p.amountPaid < p.amountDue) || investmentPayments[0];
      setPaymentTargetPeriod(firstUnpaid || null);
      const remaining = firstUnpaid ? Math.max(0, firstUnpaid.amountDue - firstUnpaid.amountPaid) : 0;
      setPayForm({
        paymentId: firstUnpaid?.id || "",
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
    if (!paymentTargetPeriod) {
      toast.error("No payment schedule period selected");
      return;
    }
    const payAmt = Number(payForm.amountPaid);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error("Please enter a valid amount paid");
      return;
    }

    const currentPaid = paymentTargetPeriod.amountPaid || 0;
    const newTotalPaid = currentPaid + payAmt;
    const due = paymentTargetPeriod.amountDue;
    const newRemaining = Math.max(0, due - newTotalPaid);
    const derivedStatus = derivePaymentStatus({
      ...paymentTargetPeriod,
      amountPaid: newTotalPaid,
      amountDue: due,
    });

    const updatedPayment: InvestmentPayment = {
      ...paymentTargetPeriod,
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
      toast.success(`Payment of ${currency}${payAmt.toLocaleString()} recorded successfully`);
      setShowRecordPaymentModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to record payment");
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
      {/* ── Top Header / Breadcrumbs ── */}
      <div className="sticky top-0 z-10 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/60 mb-2">
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
                Investment Management & Payment Structures
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated return calculations, multi-structure schedules, payment tracking, and due notifications
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <PBtn sm onClick={() => setShowAddModal(true)}>
              <Plus size={14} /> Add Investment
            </PBtn>
          )}
        </div>
      </div>

      {/* ── 9 DASHBOARD KPI METRICS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Investment */}
        <StatCard
          label="Total Investment"
          value={`${currency}${stats.totalInvestment.toLocaleString()}`}
          sub={`${stats.totalInvestors} total investors`}
          icon={TrendingUp}
          color="green"
        />

        {/* Total Return */}
        <StatCard
          label="Total Return"
          value={`${currency}${stats.totalReturn.toLocaleString()}`}
          sub="Agreed returns"
          icon={Sparkles}
          color="blue"
        />

        {/* Total Paid */}
        <StatCard
          label="Total Paid"
          value={`${currency}${stats.totalPaid.toLocaleString()}`}
          sub="Disbursed to date"
          icon={CheckCircle2}
          color="purple"
        />

        {/* Total Remaining */}
        <StatCard
          label="Total Remaining"
          value={`${currency}${stats.totalRemaining.toLocaleString()}`}
          sub="Outstanding obligations"
          icon={Clock}
          color="amber"
        />

        {/* Due Today */}
        <StatCard
          label="Due Today"
          value={stats.dueTodayCount > 0 ? `${stats.dueTodayCount} (${currency}${stats.dueTodayAmount.toLocaleString()})` : "0"}
          sub={stats.dueTodayCount > 0 ? "Requires action today" : "No payments due today"}
          icon={AlertCircle}
          color={stats.dueTodayCount > 0 ? "red" : "gray"}
        />
      </div>

      {/* Secondary Status & Schedule Indicator Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-500 font-medium">Active Investments:</span>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
            {stats.activeInvestmentsCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-500 font-medium">Completed:</span>
          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
            {stats.completedInvestmentsCount}
          </span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-500 font-medium">Upcoming (7 Days):</span>
          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
            {stats.upcomingCount} ({currency}{stats.upcomingAmount.toLocaleString()})
          </span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
          <span className="text-slate-500 font-medium">Overdue Payments:</span>
          <span className={`font-bold px-2 py-0.5 rounded-lg border ${
            stats.overdueCount > 0
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-slate-600 bg-slate-50 border-slate-200"
          }`}>
            {stats.overdueCount} ({currency}{stats.overdueAmount.toLocaleString()})
          </span>
        </div>
      </div>

      {/* ── VIEW SWITCH: LIST VS DETAILS ── */}
      {!selectedInvestorId ? (
        /* ═══════════════════════════════════════════════════════════════════
           MAIN INVESTOR TABLE VIEW
        ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-4">
          {/* ── Search and Filters ── */}
          <Card className="p-3.5 bg-white shadow-xs">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search investors, phone, payment structure, farm, pond..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex gap-1 bg-slate-200/90 border border-slate-300/70 p-1 rounded-xl shadow-2xs overflow-x-auto">
                {["All", "Active", "Payment Due", "Partially Paid", "Overdue", "Completed"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === st
                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Dropdown Filters Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 mt-3 border-t border-slate-100 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Payment Structure</label>
                <select
                  value={paymentMethodFilter}
                  onChange={e => setPaymentMethodFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="All">All Structures</option>
                  <option value="monthly_return">Monthly Return</option>
                  <option value="principal_plus_return">Principal + Return on Date</option>
                  <option value="return_upfront">Return Paid Upfront</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Farm</label>
                <select
                  value={farmFilter}
                  onChange={e => setFarmFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="All">All Farms</option>
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Pond</label>
                <select
                  value={pondFilter}
                  onChange={e => setPondFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="All">All Ponds</option>
                  {ponds.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Maturity / Due Date</label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={dueDateFilter}
                    onChange={e => setDueDateFilter(e.target.value)}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                    style={{ colorScheme: "light" }}
                  />
                  {dueDateFilter && (
                    <button
                      onClick={() => setDueDateFilter("")}
                      className="text-[10px] text-red-500 hover:underline shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* ── Mobile Card List ── */}
          <div className="sm:hidden space-y-3">
            {filteredInvestors.length === 0 ? (
              <Card className="p-8 text-center bg-white shadow-xs">
                <Landmark size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm text-slate-700">No investments found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery || statusFilter !== "All"
                    ? "Try adjusting your filters or search terms."
                    : "Click '+ Add Investment' above to record your first farm investment."}
                </p>
              </Card>
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
                  <Card
                    key={item.id}
                    onClick={() => setSelectedInvestorId(item.id)}
                    className="p-4 bg-white shadow-xs border border-slate-200/80 cursor-pointer hover:border-green-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm font-['Barlow_Condensed',sans-serif] tracking-wide">
                          {item.fullName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5 font-mono">
                          <Phone size={11} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap font-medium">{item.phone}</span>
                        </div>
                      </div>
                      <Bdg label={item.derivedStatus} color={statusColor as any} />
                    </div>

                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.paymentMethodLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Investment Capital</span>
                        <span className="font-bold text-slate-900">{currency}{item.totalInvested.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Return %</span>
                        <span className="font-bold text-emerald-700">{item.investment?.investorPercentage || 0}%</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Paid Out</span>
                        <span className="font-bold text-purple-700">{currency}{item.totalPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Outstanding</span>
                        <span className="font-bold text-amber-700">{currency}{item.outstanding.toLocaleString()}</span>
                      </div>
                    </div>

                    {item.nextPayment && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg text-[11px] flex justify-between items-center">
                        <span className="text-slate-500">Next Due: {item.nextPayment.dueDate}</span>
                        <span className="font-bold text-slate-800">{currency}{(item.nextPayment.amountDue - item.nextPayment.amountPaid).toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-50 text-[11px] text-slate-500">
                      <span className="truncate max-w-[200px]">{item.farmName} {item.pondName !== "—" ? `· ${item.pondName}` : ""}</span>
                      <span className="text-green-600 font-semibold flex items-center gap-0.5 shrink-0">
                        Details & Schedule <ChevronRight size={13} />
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          {/* ── Desktop Investor Table ── */}
          <Card className="hidden sm:block overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="text-left px-4 py-3">Investor</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap min-w-[130px]">Phone Number</th>
                    <th className="text-left px-4 py-3">Payment Structure</th>
                    <th className="text-right px-4 py-3">Investment</th>
                    <th className="text-center px-4 py-3">Return %</th>
                    <th className="text-right px-4 py-3">Total Return</th>
                    <th className="text-left px-4 py-3">Next Due</th>
                    <th className="text-right px-4 py-3">Paid</th>
                    <th className="text-right px-4 py-3">Outstanding</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400">
                        <Landmark size={36} className="mx-auto text-slate-200 mb-2" />
                        <p className="font-semibold text-sm">No investments found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {searchQuery || statusFilter !== "All"
                            ? "Try adjusting your filters or search terms."
                            : "Click '+ Add Investment' above to record your first farm investment."}
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
                          {/* Investor Name */}
                          <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-green-700 transition-colors">
                            <div className="font-medium text-sm">{item.fullName}</div>
                            {item.email && (
                              <div className="text-[10px] text-slate-400 font-normal">{item.email}</div>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap min-w-[130px]">
                            {item.phone}
                          </td>

                          {/* Structure */}
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                              {item.paymentMethodLabel}
                            </span>
                            {item.investment?.paymentMethod === "monthly_return" && item.investment.monthlyReturn && (
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                {currency}{item.investment.monthlyReturn.toLocaleString()}/mo
                              </div>
                            )}
                          </td>

                          {/* Investment */}
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {currency}{item.totalInvested.toLocaleString()}
                          </td>

                          {/* Return % */}
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 text-[11px]">
                              {item.investment?.investorPercentage || 0}%
                            </span>
                          </td>

                          {/* Total Return */}
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {currency}{item.totalReturn.toLocaleString()}
                          </td>

                          {/* Next Due */}
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {item.nextPayment ? (
                              <div>
                                <span className="font-medium text-slate-900">{item.nextPayment.dueDate}</span>
                                <div className="text-[10px] text-slate-400">
                                  {currency}{(item.nextPayment.amountDue - item.nextPayment.amountPaid).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">All Settled</span>
                            )}
                          </td>

                          {/* Paid */}
                          <td className="px-4 py-3 text-right font-bold text-purple-700">
                            {currency}{item.totalPaid.toLocaleString()}
                          </td>

                          {/* Outstanding */}
                          <td className="px-4 py-3 text-right font-bold text-amber-700">
                            {currency}{item.outstanding.toLocaleString()}
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
           INVESTOR DETAILS & PAYMENT SCHEDULE VIEW
        ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-5">
          {/* Action Header for Details */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00BB58] font-bold text-lg">
                {selectedInvestor?.fullName?.slice(0, 2).toUpperCase()}
              </div>
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
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" /> {selectedInvestor?.phone}
                  </span>
                  {selectedInvestor?.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" /> {selectedInvestor.email}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
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
                  <Edit3 size={14} /> Edit Investment
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

          {/* Cards: Investor Profile, Structure Details & Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Investor Profile */}
            <Card className="p-4 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" /> Investor Profile
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Full Name</span>
                  <span className="font-semibold text-slate-900">{selectedInvestor?.fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Phone Number</span>
                  <span className="font-semibold text-slate-900">{selectedInvestor?.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Email Address</span>
                  <span className="font-semibold text-slate-900">{selectedInvestor?.email || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Farm / Location</span>
                  <span className="font-semibold text-slate-800">
                    {farms.find(f => f.id === activeInvestment?.farmId)?.name || "Main Farm"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Pond Assigned</span>
                  <span className="font-semibold text-slate-800">
                    {ponds.find(p => p.id === activeInvestment?.pondId)?.name || "General Farm"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Structure-Specific Terms */}
            <Card className="p-4 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Landmark size={14} className="text-slate-500" /> Structure Terms
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Payment Structure</span>
                  <span className="font-bold text-emerald-700">
                    {formatPaymentMethod(activeInvestment?.paymentMethod)}
                  </span>
                </div>

                {activeInvestment?.paymentMethod === "monthly_return" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Monthly Return Payout</span>
                      <span className="font-bold text-emerald-700">
                        {currency}{(activeInvestment?.monthlyReturn || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Installment Count</span>
                      <span className="font-semibold text-slate-900">
                        {activeInvestment?.numberOfPayments || activeInvestment?.durationMonths || 12} payments
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Principal Tracking</span>
                      <span className="font-semibold text-slate-900">
                        {currency}{(activeInvestment?.amountInvested || 0).toLocaleString()} (Separate)
                      </span>
                    </div>
                  </>
                )}

                {activeInvestment?.paymentMethod === "principal_plus_return" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Payment / Maturity Date</span>
                      <span className="font-bold text-slate-900">{activeInvestment?.dueDate}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Lump Sum Due</span>
                      <span className="font-bold text-emerald-700">
                        {currency}{(activeInvestment?.totalAmountDue || 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}

                {activeInvestment?.paymentMethod === "return_upfront" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Return Paid Upfront</span>
                      <span className="font-bold text-emerald-700">
                        {currency}{(activeInvestment?.expectedReturn || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Received by Business</span>
                      <span className="font-bold text-slate-900">
                        {currency}{(activeInvestment?.amountReceivedByBusiness || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">Maturity Repayment</span>
                      <span className="font-bold text-slate-900">
                        {currency}{(activeInvestment?.amountInvested || 0).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Start Date</span>
                  <span className="font-semibold text-slate-900">{activeInvestment?.startDate || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">End / Maturity Date</span>
                  <span className="font-semibold text-slate-900">{activeInvestment?.dueDate || "—"}</span>
                </div>
              </div>
            </Card>

            {/* Financial Summary */}
            <Card className="p-4 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign size={14} className="text-slate-500" /> Financial Balances
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Capital / Face Value</span>
                  <span className="font-bold text-slate-900">
                    {currency}{(Number(activeInvestment?.amountInvested) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Agreed Return</span>
                  <span className="font-semibold text-emerald-700">
                    {activeInvestment?.investorPercentage || 0}% ({currency}{(Number(activeInvestment?.expectedReturn) || 0).toLocaleString()})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Investor Value</span>
                  <span className="font-bold text-slate-900">
                    {currency}{(Number(activeInvestment?.totalInvestorValue) || (Number(activeInvestment?.amountInvested || 0) + Number(activeInvestment?.expectedReturn || 0))).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Paid Out</span>
                  <span className="font-bold text-purple-700">
                    {currency}{investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-bold">Remaining Balance</span>
                  <span className="font-bold text-amber-700 text-sm">
                    {currency}{Math.max(0, investmentPayments.reduce((s, p) => s + (p.amountDue || 0), 0) - investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── PAYMENT SCHEDULE & HISTORY TABLE ── */}
          <Card className="overflow-hidden bg-white shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  Automated Payment Schedule & Payout Tracking
                </h3>
                <p className="text-[11px] text-slate-400">
                  Scheduled payment dates, installment obligations, amounts paid, and permanent payout records
                </p>
              </div>
              {canCreate && (
                <PBtn sm outline onClick={() => openRecordPayment()}>
                  <Plus size={14} /> Record Payment
                </PBtn>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[780px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="text-left px-4 py-2.5">Due Date</th>
                    <th className="text-left px-4 py-2.5">Schedule Period</th>
                    <th className="text-left px-4 py-2.5">Payment Type</th>
                    <th className="text-right px-4 py-2.5">Scheduled Amount</th>
                    <th className="text-right px-4 py-2.5">Amount Paid</th>
                    <th className="text-right px-4 py-2.5">Remaining</th>
                    <th className="text-left px-4 py-2.5">Payment Date</th>
                    <th className="text-center px-4 py-2.5">Method</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {investmentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        No payments scheduled for this investment.
                      </td>
                    </tr>
                  ) : (
                    investmentPayments.map(p => {
                      const outstandingPeriod = Math.max(0, p.amountDue - p.amountPaid);
                      const derivedStatus = derivePaymentStatus(p);

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

                      const isPaid = derivedStatus === "Paid";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{p.dueDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.paymentPeriod}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.paymentType || "Scheduled Payment"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{currency}{p.amountDue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">{currency}{p.amountPaid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{currency}{outstandingPeriod.toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.paymentDate || "—"}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{p.paymentMethod || "—"}</td>
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
                                    Mark as Paid
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
                              <span className="text-emerald-600 text-[11px] font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 size={13} /> Completed
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
        <Modal title="Add New Investment & Payment Structure" onClose={() => setShowAddModal(false)} wide>
          <form onSubmit={handleCreateInvestor} className="space-y-4">
            {/* ── Section 1: Investor Information ── */}
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

            {/* ── Section 2: Payment Method Selector ── */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Investment Payment Structure</p>
              
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
                    Agreed return is divided into monthly installments throughout the duration.
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
                    Original investment plus entire agreed return paid together on selected maturity date.
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

              {/* ── Form Fields Based on Selected Structure ── */}
              <div className="space-y-3">
                {/* Structure 1: Monthly Return Fields */}
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
                      <F label="Agreed Return (%)" required>
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
                        placeholder="e.g. ₦1,000,000 principal returned separately at end of tenure"
                      />
                    </F>

                    {/* Structure 1 Live Preview Banner */}
                    {addAmt > 0 && addPct > 0 && (
                      <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>Investment Amount:</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Agreed Return ({addPct}%):</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Duration & Payments:</span>
                          <span className="font-semibold">{addForm.durationMonths} months · {addNumPayments} payments</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/70 pt-1">
                          <span>Monthly Return:</span>
                          <span className="text-sm font-bold text-emerald-700">{currency}{addMonthlyReturn.toLocaleString()} / month</span>
                        </div>
                        <div className="flex justify-between text-slate-800 font-bold">
                          <span>Total Investment Value:</span>
                          <span>{currency}{addTotalInvestorValue.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Structure 2: Principal + Return on Date Fields */}
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
                          <span>Investment Principal:</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return ({addPct}%):</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Payment Date:</span>
                          <span className="font-semibold">{addForm.dueDate || "—"}</span>
                        </div>
                        <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/70 pt-1">
                          <span>Total Amount Due at Maturity:</span>
                          <span className="text-sm font-bold text-emerald-700">{currency}{addPrincipalPlusReturn.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Structure 3: Return Paid Upfront Fields */}
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
                          <span>Investment Value (Face Value):</span>
                          <span className="font-bold">{currency}{addAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Return Paid Upfront ({addPct}%):</span>
                          <span className="font-bold text-emerald-700">{currency}{addReturnAmt.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Amount Received by Business:</span>
                          <span className="font-bold text-blue-700">{currency}{addAmountReceivedByBusiness.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-700">
                          <span>Maturity Payment (Principal):</span>
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
                Save Investment & Generate Schedule
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
          title="Edit Investment Agreement & Profile"
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
