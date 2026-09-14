import React, { useState, useMemo } from "react";
import {
  FileText, Plus, Search, Calendar, Filter, Droplets,
  AlertCircle, CheckCircle2, ChevronRight, Eye, User, X
} from "lucide-react";
import type { Farm, Pond, StockEvent, TreatmentRecord, PondReport } from "../types";
import { Card, Bdg, PBtn, Modal, F, IC, SC, DateInput } from "../shared";
import { TODAY, uid } from "../data";
import { toast } from "sonner";

interface PondReportsProps {
  pondReports: PondReport[];
  treatments: TreatmentRecord[];
  farms: Farm[];
  ponds: Pond[];
  stockEvents: StockEvent[];
  activeFarmId: string;
  defaultPondId?: string;
  fixedPondId?: string;
  currentUser?: { name: string; email: string };
  canManage?: boolean;
  onAddPondReport: (r: PondReport) => Promise<void>;
  onAddTreatment?: (t: TreatmentRecord) => Promise<void>;
  onDeletePondReport?: (id: string) => Promise<void>;
}

export default function PondReportsComponent({
  pondReports,
  treatments,
  farms,
  ponds,
  stockEvents,
  activeFarmId,
  defaultPondId,
  fixedPondId,
  currentUser,
  canManage = true,
  onAddPondReport,
  onAddTreatment,
  onDeletePondReport,
}: PondReportsProps) {
  // Period Controls: Monthly | Quarterly | Yearly | Custom
  const [periodMode, setPeriodMode] = useState<"Monthly" | "Quarterly" | "Yearly" | "Custom">("Monthly");
  const [periodMonth, setPeriodMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [periodQuarter, setPeriodQuarter] = useState<string>(() => {
    const d = new Date();
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()}-Q${q}`;
  });
  const [periodYear, setPeriodYear] = useState<string>(() => String(new Date().getFullYear()));
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<string>(activeFarmId || farms[0]?.id || "");
  const [selectedPondId, setSelectedPondId] = useState<string>(fixedPondId || defaultPondId || "");
  const [selectedFishStockId, setSelectedFishStockId] = useState<string>("");
  const [reportTypeFilter, setReportTypeFilter] = useState<"All" | "treatment" | "other_issue">("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingReport, setViewingReport] = useState<PondReport | null>(null);

  // Form State: Strictly only Treatments and Other Issues (NO sickness/illness)
  const [formType, setFormType] = useState<"treatment" | "other_issue">("other_issue");
  const [formFarmId, setFormFarmId] = useState<string>(fixedPondId ? (ponds.find(p => p.id === fixedPondId)?.farmId || selectedFarmId) : selectedFarmId);
  const [formPondId, setFormPondId] = useState<string>(fixedPondId || selectedPondId || "");
  const [formFishStockId, setFormFishStockId] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(TODAY);

  // Other Issue fields
  const [formIssue, setFormIssue] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");

  // Treatment fields
  const [treatMedicine, setTreatMedicine] = useState<string>("");
  const [treatCause, setTreatCause] = useState<string>("");
  const [treatActionTaken, setTreatActionTaken] = useState<string>("");
  const [treatRemarks, setTreatRemarks] = useState<string>("");

  // Ponds for current farm
  const currentFarmPonds = useMemo(() => {
    return ponds.filter(p => p.farmId === (fixedPondId ? (ponds.find(x => x.id === fixedPondId)?.farmId) : selectedFarmId));
  }, [ponds, selectedFarmId, fixedPondId]);

  // If no pond is selected yet, default to first pond of farm
  React.useEffect(() => {
    if (!fixedPondId && !selectedPondId && currentFarmPonds.length > 0) {
      setSelectedPondId(currentFarmPonds[0].id);
    }
  }, [currentFarmPonds, selectedPondId, fixedPondId]);

  const activePond = useMemo(() => {
    const pid = fixedPondId || selectedPondId;
    return ponds.find(p => p.id === pid) || null;
  }, [ponds, fixedPondId, selectedPondId]);

  // Build fish stock options for current active pond (current stock + historical stock events)
  const availableFishStocks = useMemo(() => {
    if (!activePond) return [];
    const stocks: { id: string; label: string; isCurrent: boolean }[] = [];

    // Current stock of the pond
    const currentLabel = activePond.species && activePond.species !== "—"
      ? `${activePond.species} (${activePond.stockingDate || "Current Stock"})`
      : "Current Stock";
    
    const currentId = `current-${activePond.id}-${activePond.stockingDate || "active"}`;
    stocks.push({ id: currentId, label: `${currentLabel} — (Current Stock)`, isCurrent: true });

    // Historical stock events for this pond
    const events = stockEvents.filter(e => e.pondId === activePond.id);
    events.forEach(ev => {
      const histLabel = `${ev.species || activePond.species} (${ev.date || "Past"}) - Stock #${ev.id.slice(0, 6)}`;
      const evId = `event-${ev.id}`;
      if (!stocks.some(s => s.id === evId)) {
        stocks.push({ id: evId, label: histLabel, isCurrent: false });
      }
    });

    return stocks;
  }, [activePond, stockEvents]);

  // Set default fish stock when pond changes
  React.useEffect(() => {
    if (availableFishStocks.length > 0) {
      if (!selectedFishStockId || !availableFishStocks.some(s => s.id === selectedFishStockId)) {
        setSelectedFishStockId(availableFishStocks[0].id);
      }
    } else {
      setSelectedFishStockId("");
    }
  }, [availableFishStocks, selectedFishStockId]);

  // Auto-sync form pond & fish stock when add modal opens
  const openAddModal = () => {
    const targetPondId = fixedPondId || selectedPondId || (currentFarmPonds[0]?.id || "");
    const targetFarmId = fixedPondId ? (ponds.find(p => p.id === fixedPondId)?.farmId || selectedFarmId) : selectedFarmId;
    
    setFormFarmId(targetFarmId);
    setFormPondId(targetPondId);
    setFormDate(TODAY);
    setFormType("other_issue");
    setFormIssue("");
    setFormDescription("");
    setFormNotes("");
    setTreatMedicine("");
    setTreatCause("");
    setTreatActionTaken("");
    setTreatRemarks("");

    const targetPond = ponds.find(p => p.id === targetPondId);
    if (targetPond) {
      const defaultStock = targetPond.species && targetPond.species !== "—"
        ? `${targetPond.species} (${targetPond.stockingDate || "Current Stock"})`
        : "Current Stock";
      const stockId = selectedFishStockId || `current-${targetPond.id}-${targetPond.stockingDate || "active"}`;
      setFormFishStockId(stockId);
    }

    setShowAddModal(true);
  };

  // Filter pond reports by Period, Farm, Pond, and Fish Stock
  const filteredReports = useMemo(() => {
    return pondReports.filter(report => {
      // 1. Farm check
      if (!fixedPondId && selectedFarmId && report.farmId !== selectedFarmId) return false;

      // 2. Pond check (Mandatory)
      const currentPid = fixedPondId || selectedPondId;
      if (currentPid && report.pondId !== currentPid) return false;

      // 3. Fish Stock check (Mandatory Historical Separation!)
      // If user selected a specific fish stock, only show reports belonging to that stock
      if (selectedFishStockId) {
        // Match either exact ID or compatible current stock identifier
        const matches = report.fishStockId === selectedFishStockId ||
          (selectedFishStockId.startsWith("current-") && report.fishStockId.startsWith("current-"));
        if (!matches) return false;
      }

      // 4. Report Type (Only Treatments or Other Issues)
      if (reportTypeFilter !== "All" && report.reportType !== reportTypeFilter) return false;

      // 5. Period filtering
      if (periodMode === "Monthly" && periodMonth) {
        if (!report.reportDate.startsWith(periodMonth)) return false;
      } else if (periodMode === "Quarterly" && periodQuarter) {
        const [yr, qStr] = periodQuarter.split("-Q");
        const q = parseInt(qStr, 10);
        const [repYr, repM] = report.reportDate.split("-").map(Number);
        if (String(repYr) !== yr) return false;
        const repQ = Math.floor((repM - 1) / 3) + 1;
        if (repQ !== q) return false;
      } else if (periodMode === "Yearly" && periodYear) {
        if (!report.reportDate.startsWith(periodYear)) return false;
      } else if (periodMode === "Custom") {
        if (customStartDate && report.reportDate < customStartDate) return false;
        if (customEndDate && report.reportDate > customEndDate) return false;
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQ =
          (report.issue && report.issue.toLowerCase().includes(q)) ||
          (report.description && report.description.toLowerCase().includes(q)) ||
          (report.notes && report.notes.toLowerCase().includes(q)) ||
          (report.createdBy && report.createdBy.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      return true;
    });
  }, [
    pondReports,
    fixedPondId,
    selectedFarmId,
    selectedPondId,
    selectedFishStockId,
    reportTypeFilter,
    periodMode,
    periodMonth,
    periodQuarter,
    periodYear,
    customStartDate,
    customEndDate,
    searchQuery,
  ]);

  // Handle Save Report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFarmId) {
      toast.error("Farm is required");
      return;
    }
    if (!formPondId) {
      toast.error("Pond is required");
      return;
    }
    if (!formFishStockId) {
      toast.error("Fish stock must be explicitly connected");
      return;
    }
    if (!formDate) {
      toast.error("Report date is required");
      return;
    }

    const reportId = uid();
    let createdTreatmentId: string | undefined = undefined;

    if (formType === "treatment") {
      if (!treatMedicine.trim()) {
        toast.error("Medicine / Treatment name is required");
        return;
      }
      if (!treatCause.trim()) {
        toast.error("Reason / Cause for treatment is required");
        return;
      }

      // 1. Save to existing treatment system (treatment_records)
      const newTreatmentId = uid();
      createdTreatmentId = newTreatmentId;

      if (onAddTreatment) {
        try {
          await onAddTreatment({
            id: newTreatmentId,
            pondId: formPondId,
            farmId: formFarmId,
            date: formDate,
            medicine: treatMedicine.trim(),
            cause: treatCause.trim(),
            remarks: [treatActionTaken.trim(), treatRemarks.trim()].filter(Boolean).join(" | "),
          });
        } catch (err) {
          console.warn("Treatment save error:", err);
        }
      }
    } else {
      if (!formIssue.trim()) {
        toast.error("Issue title is required");
        return;
      }
    }

    const newReport: PondReport = {
      id: reportId,
      farmId: formFarmId,
      pondId: formPondId,
      fishStockId: formFishStockId,
      reportType: formType,
      reportDate: formDate,
      issue: formType === "treatment" ? treatMedicine.trim() : formIssue.trim(),
      description: formType === "treatment" ? treatCause.trim() : (formDescription.trim() || undefined),
      actionTaken: formType === "treatment" ? (treatActionTaken.trim() || undefined) : undefined,
      notes: formType === "treatment" ? (treatRemarks.trim() || undefined) : (formNotes.trim() || undefined),
      treatmentId: createdTreatmentId,
      createdBy: currentUser?.name || "Admin",
      createdAt: new Date().toISOString(),
    };

    try {
      await onAddPondReport(newReport);
      toast.success("Pond report saved successfully");
      setShowAddModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to save pond report");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Period Selector & Category Flow Controls ── */}
      <Card className="p-3.5 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Period Mode Selector (Using darkened tabs fill) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Period:</span>
            <div className="flex gap-1 bg-slate-200/90 border border-slate-300/70 p-1 rounded-xl shadow-2xs">
              {(["Monthly", "Quarterly", "Yearly", "Custom"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPeriodMode(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    periodMode === m
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Period Value Pickers */}
          <div className="flex items-center gap-2 text-xs">
            {periodMode === "Monthly" && (
              <input
                type="month"
                value={periodMonth}
                onChange={e => setPeriodMonth(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs focus:ring-1 focus:ring-green-400"
                style={{ colorScheme: "light" }}
              />
            )}
            {periodMode === "Quarterly" && (
              <select
                value={periodQuarter}
                onChange={e => setPeriodQuarter(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
              >
                {["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4", "2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4"].map(q => (
                  <option key={q} value={q}>{q.replace("-", " ")}</option>
                ))}
              </select>
            )}
            {periodMode === "Yearly" && (
              <select
                value={periodYear}
                onChange={e => setPeriodYear(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
              >
                {["2026", "2025", "2024"].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
            {periodMode === "Custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  placeholder="From"
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                  style={{ colorScheme: "light" }}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  placeholder="To"
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
                  style={{ colorScheme: "light" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Selection Flow: Farm → Pond → Fish Stock → Report Type ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-3 text-xs">
          {/* 1. Farm */}
          {!fixedPondId ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Farm</label>
              <select
                value={selectedFarmId}
                onChange={e => {
                  setSelectedFarmId(e.target.value);
                  setSelectedPondId("");
                  setSelectedFishStockId("");
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
              >
                {farms.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.city})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Farm</label>
              <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold truncate">
                {farms.find(f => f.id === activePond?.farmId)?.name || "Main Farm"}
              </div>
            </div>
          )}

          {/* 2. Pond */}
          {!fixedPondId ? (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Pond</label>
              <select
                value={selectedPondId}
                onChange={e => {
                  setSelectedPondId(e.target.value);
                  setSelectedFishStockId("");
                }}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold text-green-700"
              >
                {currentFarmPonds.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Pond</label>
              <div className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold truncate">
                {activePond?.name}
              </div>
            </div>
          )}

          {/* 3. Fish Stock (Explicit Separation) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Fish Stock</label>
            <select
              value={selectedFishStockId}
              onChange={e => setSelectedFishStockId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs"
            >
              {availableFishStocks.length === 0 ? (
                <option value="">No stock recorded</option>
              ) : (
                availableFishStocks.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))
              )}
            </select>
          </div>

          {/* 4. Report Type (Strictly Treatments or Other Issues) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Report Type</label>
            <select
              value={reportTypeFilter}
              onChange={e => setReportTypeFilter(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold"
            >
              <option value="All">All Types</option>
              <option value="treatment">Treatments</option>
              <option value="other_issue">Other Issues</option>
            </select>
          </div>
        </div>

        {/* Search Bar + Submit Report Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports, description, staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-green-400"
            />
          </div>

          {canManage && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00BB58] hover:bg-[#009e4a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus size={14} /> Submit Pond Report
            </button>
          )}
        </div>
      </Card>

      {/* ── Table of Pond-Based Reports ── */}
      <Card className="overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Report Type</th>
                <th className="text-left px-4 py-3">Issue / Treatment</th>
                <th className="text-left px-4 py-3">Fish Stock</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Recorded By</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <FileText size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="font-semibold text-sm">No pond reports found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No treatments or issues recorded for this pond and fish stock in the selected period.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredReports.map(rep => {
                  const isTreatment = rep.reportType === "treatment";
                  return (
                    <tr
                      key={rep.id}
                      onClick={() => setViewingReport(rep)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{rep.reportDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isTreatment
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {isTreatment ? "Treatment" : "Other Issue"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 group-hover:text-green-700 transition-colors">
                        {rep.issue || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[140px]" title={rep.fishStockId}>
                        {activePond?.species ? `${activePond.species} stock` : "Stock record"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]" title={rep.description || ""}>
                        {rep.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {rep.createdBy || "Admin"}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300 group-hover:text-green-600">
                        <Eye size={15} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Add Pond Report Modal ── */}
      {showAddModal && (
        <Modal title="Submit Pond Report" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleSaveReport} className="space-y-4">
            {/* Farm & Pond selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <F label="Farm" required>
                <select
                  value={formFarmId}
                  onChange={e => {
                    setFormFarmId(e.target.value);
                    const fp = ponds.find(p => p.farmId === e.target.value);
                    setFormPondId(fp?.id || "");
                  }}
                  className={SC}
                  required
                >
                  {farms.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </F>

              <F label="Pond" required>
                <select
                  value={formPondId}
                  onChange={e => setFormPondId(e.target.value)}
                  className={SC}
                  required
                >
                  {ponds.filter(p => p.farmId === formFarmId).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.species})</option>
                  ))}
                </select>
              </F>
            </div>

            {/* Fish Stock (Explicit Connection) */}
            <F label="Connected Fish Stock" required>
              <select
                value={formFishStockId}
                onChange={e => setFormFishStockId(e.target.value)}
                className={SC}
                required
              >
                {availableFishStocks.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </F>

            {/* Report Type: Strictly only 2 choices */}
            <F label="Report Type" required>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormType("treatment")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    formType === "treatment"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-blue-400"
                  }`}
                >
                  Treatments
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("other_issue")}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                    formType === "other_issue"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:border-amber-400"
                  }`}
                >
                  Other Issues
                </button>
              </div>
            </F>

            <F label="Report Date" required>
              <DateInput value={formDate} onChange={setFormDate} />
            </F>

            {/* Form Fields: Treatments */}
            {formType === "treatment" ? (
              <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                <p className="text-xs font-bold text-blue-900">Treatment Details</p>
                <F label="Medicine / Treatment Applied" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oxytetracycline / Salt bath / Potassium permanganate"
                    value={treatMedicine}
                    onChange={e => setTreatMedicine(e.target.value)}
                    className={IC}
                  />
                </F>
                <F label="Cause / Observation" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fin rot symptoms, parasite observation"
                    value={treatCause}
                    onChange={e => setTreatCause(e.target.value)}
                    className={IC}
                  />
                </F>
                <F label="Action Taken">
                  <input
                    type="text"
                    placeholder="e.g. 50g per 1,000 liters, isolated affected fish"
                    value={treatActionTaken}
                    onChange={e => setTreatActionTaken(e.target.value)}
                    className={IC}
                  />
                </F>
                <F label="Notes / Remarks">
                  <textarea
                    rows={2}
                    placeholder="e.g. Fish showed recovery by evening"
                    value={treatRemarks}
                    onChange={e => setTreatRemarks(e.target.value)}
                    className={IC}
                  />
                </F>
              </div>
            ) : (
              /* Form Fields: Other Issues */
              <div className="space-y-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                <p className="text-xs font-bold text-amber-900">Issue Details</p>
                <F label="Issue" required>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pump stopped working / Net torn / Algae bloom"
                    value={formIssue}
                    onChange={e => setFormIssue(e.target.value)}
                    className={IC}
                  />
                </F>
                <F label="Description">
                  <textarea
                    rows={2}
                    placeholder="e.g. Water circulation stopped for approximately two hours."
                    value={formDescription}
                    onChange={e => setFormDescription(e.target.value)}
                    className={IC}
                  />
                </F>
                <F label="Notes">
                  <textarea
                    rows={2}
                    placeholder="e.g. Generator was restarted; pump resumed normal operation."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    className={IC}
                  />
                </F>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00BB58] hover:bg-[#009e4a] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Save Report
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 13. View Report Details Modal ── */}
      {viewingReport && (
        <Modal title="Pond Report Details" onClose={() => setViewingReport(null)}>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Report Date</p>
                <p className="font-bold text-slate-900 font-mono text-sm">{viewingReport.reportDate}</p>
              </div>
              <Bdg
                label={viewingReport.reportType === "treatment" ? "Treatment" : "Other Issue"}
                color={viewingReport.reportType === "treatment" ? "blue" : "amber"}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Farm</span>
                <span className="font-semibold text-slate-800">
                  {farms.find(f => f.id === viewingReport.farmId)?.name || "Main Farm"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Pond</span>
                <span className="font-semibold text-slate-800">
                  {ponds.find(p => p.id === viewingReport.pondId)?.name || "—"}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Fish Stock</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">
                  {activePond?.species ? `${activePond.species} stock` : viewingReport.fishStockId}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Recorded By</span>
                <span className="font-semibold text-slate-800">{viewingReport.createdBy || "Admin"}</span>
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">
                  {viewingReport.reportType === "treatment" ? "Medicine / Treatment" : "Main Issue"}
                </p>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm">
                  {viewingReport.issue || "—"}
                </p>
              </div>

              {viewingReport.description && (
                <div className="pt-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Description / Cause</p>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700">
                    {viewingReport.description}
                  </p>
                </div>
              )}

              {viewingReport.actionTaken && (
                <div className="pt-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Action Taken</p>
                  <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium">
                    {viewingReport.actionTaken}
                  </p>
                </div>
              )}

              {viewingReport.notes && (
                <div className="pt-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Notes</p>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 italic">
                    {viewingReport.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
