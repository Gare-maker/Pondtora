import React, { useState, useMemo } from "react";
import {
  Landmark, Search, Plus, Filter, ChevronLeft, Calendar,
  DollarSign, CheckCircle2, Clock, AlertCircle, Phone, Mail,
  TrendingUp, CreditCard, Droplets, Fish, ArrowUpRight,
  MoreVertical, Check, Edit3, Trash2, ArrowDownRight,
  Receipt, User, FileText, ChevronRight
} from "lucide-react";
import type { Farm, Pond, StockEvent, Investor, Investment, InvestmentPayment } from "../types";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput, DateInput, StatCard } from "../shared";
import { TODAY, fmt, uid } from "../data";
import { toast } from "sonner";

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
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("All");
  const [farmFilter, setFarmFilter] = useState<string>("All");
  const [pondFilter, setPondFilter] = useState<string>("All");
  const [dueDateFilter, setDueDateFilter] = useState<string>("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [paymentTargetPeriod, setPaymentTargetPeriod] = useState<InvestmentPayment | null>(null);
  const [showEditInvestmentModal, setShowEditInvestmentModal] = useState(false);

  // Add Investor Form State
  const [addForm, setAddForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    notes: "",
    amountInvested: "",
    startDate: TODAY,
    dueDate: "",
    investorPercentage: "",
    paymentType: "one-time" as "one-time" | "recurring",
    paymentFrequency: "Monthly" as "Monthly" | "Quarterly" | "Annually" | "Custom",
    customFrequencyDesc: "",
    installmentCount: "12",
    farmId: activeFarmId || farms[0]?.id || "",
    pondId: "",
    fishStockId: "",
  });

  // Record Payment Form State
  const [payForm, setPayForm] = useState({
    paymentDate: TODAY,
    amountPaid: "",
    paymentMethod: "Bank Transfer",
    notes: "",
  });

  // Current selected investor & their investments/payments
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

  // Overall Statistics across all investments and payments
  const stats = useMemo(() => {
    const totalInvestorsCount = investors.length;
    const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amountInvested) || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
    
    // Total due across all investments
    const totalDueAcrossAll = investments.reduce((sum, inv) => sum + (Number(inv.totalAmountDue) || 0), 0);
    const totalOutstanding = Math.max(0, totalDueAcrossAll - totalPaid);

    return {
      totalInvestors: totalInvestorsCount,
      totalInvested,
      totalPaid,
      totalOutstanding,
    };
  }, [investors, investments, payments]);

  // Enriched investor list for main table
  const enrichedInvestors = useMemo(() => {
    return investors.map(inv => {
      const invList = investments.filter(item => item.investorId === inv.id);
      const primaryInv = invList[0];
      const invPayments = primaryInv ? payments.filter(p => p.investmentId === primaryInv.id) : [];

      const totalInvested = invList.reduce((s, i) => s + (Number(i.amountInvested) || 0), 0);
      const totalDue = invList.reduce((s, i) => s + (Number(i.totalAmountDue) || 0), 0);
      const totalPaid = invPayments.reduce((s, p) => s + (Number(p.amountPaid) || 0), 0);
      const outstanding = Math.max(0, totalDue - totalPaid);

      const farmObj = farms.find(f => f.id === (primaryInv?.farmId || inv.farmId));
      const pondObj = ponds.find(p => p.id === primaryInv?.pondId);

      // Determine overall status
      let derivedStatus: "Active" | "Paid" | "Overdue" | "Completed" = "Active";
      const isPastDue = primaryInv?.dueDate && new Date(primaryInv.dueDate) < new Date(TODAY);

      if (totalDue > 0 && totalPaid >= totalDue) {
        derivedStatus = "Paid";
      } else if (isPastDue && outstanding > 0) {
        derivedStatus = "Overdue";
      } else if (inv.status === "Completed") {
        derivedStatus = "Completed";
      } else {
        derivedStatus = "Active";
      }

      return {
        ...inv,
        investment: primaryInv,
        totalInvested,
        totalDue,
        totalPaid,
        outstanding,
        farmName: farmObj?.name || "Main Farm",
        pondName: pondObj?.name || "—",
        derivedStatus,
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
        item.pondName.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== "All" && item.derivedStatus !== statusFilter) {
        return false;
      }

      // Payment Type
      if (paymentTypeFilter !== "All") {
        const pType = item.investment?.paymentType || "one-time";
        if (paymentTypeFilter === "One-time" && pType !== "one-time") return false;
        if (paymentTypeFilter === "Recurring" && pType !== "recurring") return false;
      }

      // Farm
      if (farmFilter !== "All" && item.farmId !== farmFilter && item.investment?.farmId !== farmFilter) {
        return false;
      }

      // Pond
      if (pondFilter !== "All" && item.investment?.pondId !== pondFilter) {
        return false;
      }

      // Due date
      if (dueDateFilter && item.investment?.dueDate) {
        if (!item.investment.dueDate.startsWith(dueDateFilter)) return false;
      }

      return true;
    });
  }, [enrichedInvestors, searchQuery, statusFilter, paymentTypeFilter, farmFilter, pondFilter, dueDateFilter]);

  // Calculations for Add Form preview
  const calcAmount = Number(addForm.amountInvested) || 0;
  const calcPct = Number(addForm.investorPercentage) || 0;
  const calcReturn = Math.round((calcAmount * calcPct) / 100);
  const calcTotalDue = calcReturn; // As per specification: distinction between investment & expected return

  // Ponds filtered by selected farm in modal
  const availablePondsForAdd = useMemo(() => {
    return ponds.filter(p => p.farmId === addForm.farmId);
  }, [ponds, addForm.farmId]);

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
    if (calcAmount <= 0) {
      toast.error("Please enter a valid investment amount");
      return;
    }
    if (calcPct <= 0) {
      toast.error("Please enter an investor percentage greater than 0%");
      return;
    }
    if (!addForm.dueDate) {
      toast.error("Due date is required");
      return;
    }
    if (!addForm.farmId) {
      toast.error("Farm selection is required");
      return;
    }

    const investorId = uid();
    const investmentId = uid();

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
      amountInvested: calcAmount,
      investorPercentage: calcPct,
      expectedReturn: calcReturn,
      totalAmountDue: calcTotalDue,
      startDate: addForm.startDate || TODAY,
      dueDate: addForm.dueDate,
      paymentType: addForm.paymentType,
      paymentFrequency: addForm.paymentType === "recurring" ? addForm.paymentFrequency : undefined,
      customFrequencyDesc: addForm.paymentType === "recurring" && addForm.paymentFrequency === "Custom"
        ? addForm.customFrequencyDesc
        : undefined,
      status: "Active",
      notes: addForm.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Generate initial payment schedule
    const generatedPayments: InvestmentPayment[] = [];

    if (addForm.paymentType === "one-time") {
      generatedPayments.push({
        id: uid(),
        investmentId: investmentId,
        dueDate: addForm.dueDate,
        paymentPeriod: "Agreed Return",
        amountDue: calcTotalDue,
        amountPaid: 0,
        paymentMethod: "Bank Transfer",
        status: "Pending",
        notes: "Full investment return payout",
        createdAt: new Date().toISOString(),
      });
    } else {
      // Recurring schedule
      const installments = Math.max(1, parseInt(addForm.installmentCount, 10) || 12);
      const perPeriodDue = Math.round(calcTotalDue / installments);
      const start = new Date(addForm.startDate || TODAY);
      const dueEnd = new Date(addForm.dueDate);

      // Distribute installments over months
      for (let i = 0; i < installments; i++) {
        const periodDate = new Date(start);
        if (addForm.paymentFrequency === "Monthly") {
          periodDate.setMonth(periodDate.getMonth() + i + 1);
        } else if (addForm.paymentFrequency === "Quarterly") {
          periodDate.setMonth(periodDate.getMonth() + (i + 1) * 3);
        } else if (addForm.paymentFrequency === "Annually") {
          periodDate.setFullYear(periodDate.getFullYear() + i + 1);
        } else {
          // Custom: evenly divide time between start and dueEnd
          const diffTime = Math.max(0, dueEnd.getTime() - start.getTime());
          const stepTime = diffTime / installments;
          periodDate.setTime(start.getTime() + stepTime * (i + 1));
        }

        const dateStr = periodDate.toISOString().split("T")[0];
        const monthLabel = periodDate.toLocaleString("en-US", { month: "short", year: "numeric" });
        
        // Ensure the last installment rounds out precisely to calcTotalDue
        const currentAmountDue = (i === installments - 1)
          ? (calcTotalDue - perPeriodDue * (installments - 1))
          : perPeriodDue;

        generatedPayments.push({
          id: uid(),
          investmentId: investmentId,
          dueDate: dateStr,
          paymentPeriod: `${monthLabel} (Period ${i + 1})`,
          amountDue: Math.max(0, currentAmountDue),
          amountPaid: 0,
          paymentMethod: "Bank Transfer",
          status: "Pending",
          createdAt: new Date().toISOString(),
        });
      }
    }

    try {
      await onAddInvestor(newInvestor, newInvestment, generatedPayments);
      toast.success("Investor and investment recorded successfully");
      setShowAddModal(false);
      setAddForm({
        fullName: "",
        phone: "",
        email: "",
        notes: "",
        amountInvested: "",
        startDate: TODAY,
        dueDate: "",
        investorPercentage: "",
        paymentType: "one-time",
        paymentFrequency: "Monthly",
        customFrequencyDesc: "",
        installmentCount: "12",
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
      const remainingForPeriod = Math.max(0, targetPayment.amountDue - targetPayment.amountPaid);
      setPayForm({
        paymentDate: TODAY,
        amountPaid: remainingForPeriod.toString(),
        paymentMethod: targetPayment.paymentMethod || "Bank Transfer",
        notes: targetPayment.notes || "",
      });
    } else {
      // Pick first unpaid or partial payment
      const firstUnpaid = investmentPayments.find(p => p.amountPaid < p.amountDue) || investmentPayments[0];
      setPaymentTargetPeriod(firstUnpaid || null);
      const remainingForPeriod = firstUnpaid ? Math.max(0, firstUnpaid.amountDue - firstUnpaid.amountPaid) : 0;
      setPayForm({
        paymentDate: TODAY,
        amountPaid: remainingForPeriod ? remainingForPeriod.toString() : "",
        paymentMethod: "Bank Transfer",
        notes: "",
      });
    }
    setShowRecordPaymentModal(true);
  };

  // Submit Payment Record
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTargetPeriod) {
      toast.error("No payment period selected");
      return;
    }
    const payAmt = Number(payForm.amountPaid);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error("Please enter a valid amount paid");
      return;
    }

    const newAmountPaid = (paymentTargetPeriod.amountPaid || 0) + payAmt;
    const isFull = newAmountPaid >= paymentTargetPeriod.amountDue;
    const isPastDue = new Date(paymentTargetPeriod.dueDate) < new Date(TODAY);

    let newStatus: "Pending" | "Partial" | "Paid" | "Overdue" = "Partial";
    if (isFull) {
      newStatus = "Paid";
    } else if (isPastDue) {
      newStatus = "Overdue";
    }

    const updatedPayment: InvestmentPayment = {
      ...paymentTargetPeriod,
      amountPaid: newAmountPaid,
      paymentDate: payForm.paymentDate || TODAY,
      paymentMethod: payForm.paymentMethod,
      status: newStatus,
      notes: payForm.notes.trim() || paymentTargetPeriod.notes,
      recordedBy: currentUser?.name || "Admin",
      updatedAt: new Date().toISOString(),
    };

    try {
      await onRecordPayment(updatedPayment);
      toast.success(`Payment of ${currency}${payAmt.toLocaleString()} recorded`);
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
        paymentDate: TODAY,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
                Manage farm investors, investment capital, percentage returns, and payout schedules
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00BB58] hover:bg-[#009e4a] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
            >
              <Plus size={15} /> Add Investor
            </button>
          )}
        </div>
      </div>

      {/* ── 1. INVESTOR DASHBOARD: 4 KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Investors</p>
            <p className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] mt-0.5">
              {stats.totalInvestors}
            </p>
            <p className="text-[10px] text-slate-400 truncate">Recorded investors</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Money Invested</p>
            <p className="text-xl font-bold text-emerald-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
              {currency}{stats.totalInvested.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 truncate">Active & recorded capital</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Total Paid Out</p>
            <p className="text-xl font-bold text-purple-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
              {currency}{stats.totalPaid.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 truncate">Paid to investors</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 truncate">Outstanding Payments</p>
            <p className="text-xl font-bold text-amber-700 font-['Barlow_Condensed',sans-serif] mt-0.5">
              {currency}{stats.totalOutstanding.toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 truncate">Unpaid obligations</p>
          </div>
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
                  placeholder="Search investors, phone, farm, pond..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              {/* Status Filter Tabs (Using Darkened Tabs Track) */}
              <div className="flex gap-1 bg-slate-200/90 border border-slate-300/70 p-1 rounded-xl shadow-2xs overflow-x-auto">
                {["All", "Active", "Paid", "Overdue", "Completed"].map(st => (
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
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Payment Type</label>
                <select
                  value={paymentTypeFilter}
                  onChange={e => setPaymentTypeFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                >
                  <option value="All">All Types</option>
                  <option value="One-time">One-time</option>
                  <option value="Recurring">Recurring</option>
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
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Due Date</label>
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

          {/* ── Investor Table ── */}
          <Card className="overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[950px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="text-left px-4 py-3">Investor</th>
                    <th className="text-left px-4 py-3">Phone Number</th>
                    <th className="text-right px-4 py-3">Investment</th>
                    <th className="text-center px-4 py-3">%</th>
                    <th className="text-left px-4 py-3">Farm</th>
                    <th className="text-left px-4 py-3">Pond</th>
                    <th className="text-left px-4 py-3">Start Date</th>
                    <th className="text-left px-4 py-3">Due Date</th>
                    <th className="text-center px-4 py-3">Payment Type</th>
                    <th className="text-right px-4 py-3">Paid</th>
                    <th className="text-right px-4 py-3">Outstanding</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="px-3 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredInvestors.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-slate-400">
                        <Landmark size={36} className="mx-auto text-slate-200 mb-2" />
                        <p className="font-semibold text-sm">No investors found</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {searchQuery || statusFilter !== "All"
                            ? "Try adjusting your filters or search terms."
                            : "Click '+ Add Investor' above to record your first farm investor."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvestors.map(item => {
                      const statusColor =
                        item.derivedStatus === "Paid"
                          ? "blue"
                          : item.derivedStatus === "Overdue"
                          ? "red"
                          : item.derivedStatus === "Completed"
                          ? "gray"
                          : "green";

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedInvestorId(item.id)}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          {/* Investor */}
                          <td className="px-4 py-3 font-semibold text-slate-900 group-hover:text-green-700 transition-colors">
                            <div className="font-medium text-sm">{item.fullName}</div>
                            {item.email && (
                              <div className="text-[10px] text-slate-400 font-normal">{item.email}</div>
                            )}
                          </td>

                          {/* Phone */}
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {item.phone}
                          </td>

                          {/* Investment */}
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {currency}{item.totalInvested.toLocaleString()}
                          </td>

                          {/* % */}
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 text-[11px]">
                              {item.investment?.investorPercentage || 0}%
                            </span>
                          </td>

                          {/* Farm */}
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]" title={item.farmName}>
                            {item.farmName}
                          </td>

                          {/* Pond */}
                          <td className="px-4 py-3 text-slate-600">
                            {item.pondName !== "—" ? (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                                {item.pondName}
                              </span>
                            ) : "—"}
                          </td>

                          {/* Start Date */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {item.investment?.startDate || "—"}
                          </td>

                          {/* Due Date */}
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {item.investment?.dueDate || "—"}
                          </td>

                          {/* Payment Type */}
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.investment?.paymentType === "recurring"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                              {item.investment?.paymentType === "recurring"
                                ? `Recurring (${item.investment.paymentFrequency || "Monthly"})`
                                : "One-time"}
                            </span>
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

                          {/* Arrow link */}
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
           8. INVESTOR DETAILS VIEW
        ═══════════════════════════════════════════════════════════════════ */
        <div className="space-y-5">
          {/* Action Header for Details */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#00BB58] font-bold text-lg">
                {selectedInvestor?.fullName?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  {selectedInvestor?.fullName}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" /> {selectedInvestor?.phone}
                  </span>
                  {selectedInvestor?.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={12} className="text-slate-400" /> {selectedInvestor.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openRecordPayment()}
                className="flex items-center gap-1 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <Receipt size={14} /> Record Payment
              </button>
              {canManage && (
                <button
                  onClick={() => setShowEditInvestmentModal(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  <Edit3 size={14} /> Edit Investment
                </button>
              )}
            </div>
          </div>

          {/* Cards: Investor Profile & Investment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Investor Profile */}
            <Card className="p-4 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <User size={14} className="text-slate-500" /> Investor Profile
              </h3>
              <div className="space-y-2.5 text-xs">
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
                  <span className="text-slate-400">Investment Start Date</span>
                  <span className="font-semibold text-slate-900">{activeInvestment?.startDate || "—"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Current Status</span>
                  <Bdg label={selectedInvestor?.status || "Active"} color="green" />
                </div>
              </div>
            </Card>

            {/* Investment Summary */}
            <Card className="p-4 bg-white shadow-xs">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign size={14} className="text-slate-500" /> Investment Summary
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Amount Invested</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {currency}{(Number(activeInvestment?.amountInvested) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Investor Percentage</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {activeInvestment?.investorPercentage || 0}%
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Expected Return</span>
                  <span className="font-semibold text-emerald-700">
                    {currency}{(Number(activeInvestment?.expectedReturn) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Amount Due</span>
                  <span className="font-bold text-slate-900">
                    {currency}{(Number(activeInvestment?.totalAmountDue) || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Total Paid</span>
                  <span className="font-bold text-purple-700">
                    {currency}{investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Outstanding</span>
                  <span className="font-bold text-amber-700">
                    {currency}{Math.max(0, (Number(activeInvestment?.totalAmountDue) || 0) - investmentPayments.reduce((s, p) => s + (p.amountPaid || 0), 0)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Payment Type</span>
                  <span className="font-semibold text-slate-700 capitalize">
                    {activeInvestment?.paymentType || "one-time"} ({activeInvestment?.paymentFrequency || "Single"})
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Farm / Pond</span>
                  <span className="font-semibold text-slate-700">
                    {farms.find(f => f.id === activeInvestment?.farmId)?.name || "Main Farm"}
                    {activeInvestment?.pondId ? ` · ${ponds.find(p => p.id === activeInvestment?.pondId)?.name}` : ""}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* ── 9. PAYMENT SCHEDULE & HISTORY TABLE ── */}
          <Card className="overflow-hidden bg-white shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                  Payment Schedule & History
                </h3>
                <p className="text-[11px] text-slate-400">
                  Historical record of all payout obligations and completed payments
                </p>
              </div>
              <button
                onClick={() => openRecordPayment()}
                className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800"
              >
                <Plus size={14} /> Add Payment
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <th className="text-left px-4 py-2.5">Due Date</th>
                    <th className="text-left px-4 py-2.5">Payment Period</th>
                    <th className="text-left px-4 py-2.5">Payment Date</th>
                    <th className="text-right px-4 py-2.5">Amount Due</th>
                    <th className="text-right px-4 py-2.5">Amount Paid</th>
                    <th className="text-right px-4 py-2.5">Outstanding</th>
                    <th className="text-center px-4 py-2.5">Method</th>
                    <th className="text-center px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {investmentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400">
                        No payments recorded for this investment yet.
                      </td>
                    </tr>
                  ) : (
                    investmentPayments.map(p => {
                      const outstandingPeriod = Math.max(0, p.amountDue - p.amountPaid);
                      const isPaid = p.amountPaid >= p.amountDue;
                      const isPastDue = new Date(p.dueDate) < new Date(TODAY);

                      let displayStatus: "Paid" | "Partial" | "Pending" | "Overdue" = "Pending";
                      if (isPaid) displayStatus = "Paid";
                      else if (p.amountPaid > 0) displayStatus = "Partial";
                      else if (isPastDue) displayStatus = "Overdue";

                      const statusColor =
                        displayStatus === "Paid"
                          ? "blue"
                          : displayStatus === "Partial"
                          ? "amber"
                          : displayStatus === "Overdue"
                          ? "red"
                          : "gray";

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{p.dueDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.paymentPeriod}</td>
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{p.paymentDate || "—"}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{currency}{p.amountDue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700">{currency}{p.amountPaid.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-700">{currency}{outstandingPeriod.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-slate-500">{p.paymentMethod || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <Bdg label={displayStatus} color={statusColor as any} />
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            {!isPaid && (
                              <>
                                <button
                                  onClick={() => handleQuickMarkPaid(p)}
                                  className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg border border-emerald-200 transition-colors"
                                  title="Mark period as fully paid"
                                >
                                  Mark as Paid
                                </button>
                                <button
                                  onClick={() => openRecordPayment(p)}
                                  className="px-2.5 py-1 text-[11px] bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors"
                                >
                                  Record
                                </button>
                              </>
                            )}
                            {isPaid && (
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
         3. ADD INVESTOR MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <Modal title="Add New Investor" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateInvestor} className="space-y-4">
            {/* ── Section 1: Investor Information ── */}
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Investor Information</p>
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

            {/* ── Section 2: Investment Information ── */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">2. Investment Information</p>
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Amount Invested (Capital)" required>
                    <NumInput
                      value={addForm.amountInvested}
                      onChange={v => setAddForm(p => ({ ...p, amountInvested: v }))}
                      placeholder="e.g. 1000000"
                    />
                  </F>
                  <F label="Investor Agreed Percentage (%)" required>
                    <NumInput
                      value={addForm.investorPercentage}
                      onChange={v => setAddForm(p => ({ ...p, investorPercentage: v }))}
                      placeholder="e.g. 10"
                    />
                  </F>
                </div>

                {/* Live Return Calculation Preview Banner */}
                {calcAmount > 0 && calcPct > 0 && (
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Original Capital Invested:</span>
                      <span className="font-bold text-slate-900">{currency}{calcAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Agreed Return Rate:</span>
                      <span className="font-bold text-emerald-700">{calcPct}%</span>
                    </div>
                    <div className="flex justify-between text-emerald-800 font-bold border-t border-emerald-200/60 pt-1">
                      <span>Expected Investor Return (Total Due):</span>
                      <span className="text-sm text-emerald-700">{currency}{calcReturn.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 italic">
                      * Original investment is kept distinct from investor return obligations.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Investment Start Date" required>
                    <DateInput
                      value={addForm.startDate}
                      onChange={v => setAddForm(p => ({ ...p, startDate: v }))}
                    />
                  </F>
                  <F label="Due Date" required>
                    <DateInput
                      value={addForm.dueDate}
                      onChange={v => setAddForm(p => ({ ...p, dueDate: v }))}
                    />
                  </F>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <F label="Payment Type" required>
                    <select
                      value={addForm.paymentType}
                      onChange={e => setAddForm(p => ({ ...p, paymentType: e.target.value as any }))}
                      className={SC}
                    >
                      <option value="one-time">One-time</option>
                      <option value="recurring">Recurring</option>
                    </select>
                  </F>

                  {addForm.paymentType === "recurring" && (
                    <F label="Frequency" required>
                      <select
                        value={addForm.paymentFrequency}
                        onChange={e => setAddForm(p => ({ ...p, paymentFrequency: e.target.value as any }))}
                        className={SC}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Annually">Annually</option>
                        <option value="Custom">Custom Interval</option>
                      </select>
                    </F>
                  )}
                </div>

                {addForm.paymentType === "recurring" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <F label="Number of Installment Periods">
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={addForm.installmentCount}
                        onChange={e => setAddForm(p => ({ ...p, installmentCount: e.target.value }))}
                        className={IC}
                        placeholder="e.g. 12"
                      />
                    </F>
                    {addForm.paymentFrequency === "Custom" && (
                      <F label="Custom Frequency Details">
                        <input
                          type="text"
                          placeholder="e.g. Every 2 months, 50% split"
                          value={addForm.customFrequencyDesc}
                          onChange={e => setAddForm(p => ({ ...p, customFrequencyDesc: e.target.value }))}
                          className={IC}
                        />
                      </F>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Farm / Fish Information ── */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">3. Farm / Fish Stock Link</p>
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

                <F label="Additional Notes">
                  <textarea
                    rows={2}
                    placeholder="e.g. Agreement details, lawyer reference, payout account..."
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
         10. RECORD PAYMENT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showRecordPaymentModal && (
        <Modal title="Record Investor Payment" onClose={() => setShowRecordPaymentModal(false)}>
          <form onSubmit={handleSavePayment} className="space-y-3.5">
            {paymentTargetPeriod && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Period:</span>
                  <span className="font-bold text-slate-800">{paymentTargetPeriod.paymentPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Period Amount Due:</span>
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
                  placeholder="e.g. 50000"
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

            <F label="Payment Notes">
              <textarea
                rows={2}
                placeholder="e.g. Bank transaction reference, receipt number..."
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
                Save Payment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
