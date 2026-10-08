import React, { useState, useMemo } from "react";
import {
  Wrench, Plus, CheckCircle, X, Search, Pencil, Trash2,
  Package, AlertTriangle, Check, Layers, Download, FileText,
  TrendingUp, Settings, ChevronDown, Eye, Filter
} from "lucide-react";
import type { FarmEquipment } from "../types";
import { TODAY, uid, downloadCSV, openPrintWindow } from "../data";
import { Card, Bdg, PBtn, Pagination, PER_PAGE, StatCard, Modal, F, IC, SC } from "../shared";

export const EQUIPMENT_CATEGORIES = [
  "Machinery & Generators",
  "Pumps & Plumbing",
  "Electrical & Solar",
  "Tools & Hardware",
  "Nets & Harvesting",
  "Aerators & Blowers",
  "Feed & Storage",
  "Water Quality & Testing",
  "General Equipment"
] as const;

export const EQUIPMENT_CONDITIONS = [
  "Working",
  "Needs Repair",
  "In Storage",
  "Damaged"
] as const;

interface FarmEquipmentPageProps {
  equipment?: FarmEquipment[];
  onAddEquipment: (item: FarmEquipment) => Promise<void> | void;
  onEditEquipment: (item: FarmEquipment) => Promise<void> | void;
  onDeleteEquipment?: (id: string) => Promise<void> | void;
  activeFarmId: string;
  currency?: string;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  currentUser?: { name: string; email: string };
}

export default function FarmEquipmentPage({
  equipment = [],
  onAddEquipment,
  onEditEquipment,
  onDeleteEquipment,
  activeFarmId,
  currency = "₦",
  canCreate = true,
  canEdit = true,
  canDelete = true,
  currentUser,
}: FarmEquipmentPageProps) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [condFilter, setCondFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<FarmEquipment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<Record<string, string>>({});

  const [form, setForm] = useState<{
    name: string;
    category: string;
    quantity: string;
    condition: "Working" | "Needs Repair" | "In Storage" | "Damaged";
    location: string;
    purchaseDate: string;
    cost: string;
    notes: string;
  }>({
    name: "",
    category: EQUIPMENT_CATEGORIES[0],
    quantity: "1",
    condition: "Working",
    location: "",
    purchaseDate: TODAY,
    cost: "",
    notes: "",
  });

  // Filtered equipment list
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      if (catFilter !== "All" && item.category !== catFilter) return false;
      if (condFilter !== "All" && item.condition !== condFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(q);
        const matchCat = item.category?.toLowerCase().includes(q);
        const matchLoc = item.location?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchLoc && !matchNotes) return false;
      }
      return true;
    });
  }, [equipment, catFilter, condFilter, search]);

  // Statistics
  const totalItems = equipment.length;
  const totalQuantity = equipment.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const workingCount = equipment.filter(item => item.condition === "Working").reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const repairCount = equipment.filter(item => item.condition === "Needs Repair" || item.condition === "Damaged").reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const openAddModal = () => {
    setForm({
      name: "",
      category: EQUIPMENT_CATEGORIES[0],
      quantity: "1",
      condition: "Working",
      location: "",
      purchaseDate: TODAY,
      cost: "",
      notes: "",
    });
    setFormErr({});
    setShowAdd(true);
  };

  const openEditModal = (item: FarmEquipment) => {
    setEditingItem(item);
    setForm({
      name: item.name || "",
      category: item.category || EQUIPMENT_CATEGORIES[0],
      quantity: String(item.quantity || 1),
      condition: item.condition || "Working",
      location: item.location || "",
      purchaseDate: item.purchaseDate || TODAY,
      cost: item.cost !== undefined && item.cost !== null ? String(item.cost) : "",
      notes: item.notes || "",
    });
    setFormErr({});
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Equipment name is required";
    const qty = Number(form.quantity);
    if (isNaN(qty) || qty < 0) errs.quantity = "Please enter a valid quantity (0 or more)";

    if (Object.keys(errs).length > 0) {
      setFormErr(errs);
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const updated: FarmEquipment = {
          ...editingItem,
          name: form.name.trim(),
          category: form.category,
          quantity: qty,
          condition: form.condition,
          location: form.location.trim() || undefined,
          purchaseDate: form.purchaseDate || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          notes: form.notes.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
        await onEditEquipment(updated);
        setEditingItem(null);
      } else {
        const newItem: FarmEquipment = {
          id: uid(),
          farmId: activeFarmId,
          name: form.name.trim(),
          category: form.category,
          quantity: qty,
          condition: form.condition,
          location: form.location.trim() || undefined,
          purchaseDate: form.purchaseDate || undefined,
          cost: form.cost ? Number(form.cost) : undefined,
          notes: form.notes.trim() || undefined,
          createdBy: currentUser?.name || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await onAddEquipment(newItem);
        setShowAdd(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickQuantityAdjust = async (item: FarmEquipment, delta: number) => {
    if (!canEdit) return;
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    await onEditEquipment({
      ...item,
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
  };

  const conditionColor = (cond: string): "green" | "yellow" | "blue" | "red" | "gray" => {
    switch (cond) {
      case "Working": return "green";
      case "Needs Repair": return "yellow";
      case "In Storage": return "blue";
      case "Damaged": return "red";
      default: return "gray";
    }
  };

  const exportCSV = () => {
    const headers = ["Equipment Name", "Category", "Quantity", "Condition", "Location", "Purchase Date", "Cost", "Notes"];
    const rows = filteredEquipment.map(item => [
      item.name,
      item.category,
      item.quantity,
      item.condition,
      item.location || "—",
      item.purchaseDate || "—",
      item.cost ? `${currency}${item.cost}` : "—",
      item.notes || "—"
    ]);
    downloadCSV("farm_equipment_inventory.csv", [headers, ...rows]);
  };

  const printReport = () => {
    const content = `
      <h2>Farm Equipment Inventory Report</h2>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;text-align:left;font-size:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th>#</th>
            <th>Name</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Condition</th>
            <th>Location</th>
            <th>Purchase Date</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${filteredEquipment.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${item.name}</strong></td>
              <td>${item.category}</td>
              <td>${item.quantity}</td>
              <td>${item.condition}</td>
              <td>${item.location || "—"}</td>
              <td>${item.purchaseDate || "—"}</td>
              <td>${item.cost ? `${currency}${item.cost.toLocaleString()}` : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    openPrintWindow("Farm Equipment Inventory", content);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full pb-20 sm:pb-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">
            Farm Equipment Inventory
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track and manage farm machinery, equipment, tools, and hardware assets.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-semibold transition-colors shadow-2xs"
            title="Export CSV"
          >
            <Download size={13} /> Export CSV
          </button>
          <button
            type="button"
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-semibold transition-colors shadow-2xs"
            title="Print Report"
          >
            <FileText size={13} /> Print
          </button>
          {canCreate && (
            <PBtn onClick={openAddModal} sm className="shadow-xs">
              <Plus size={14} /> Add Equipment
            </PBtn>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Equipment" value={String(totalItems)} sub="cataloged types" icon={Wrench} />
        <StatCard label="Total Units" value={String(totalQuantity)} sub="available units" icon={Layers} hi />
        <StatCard label="Working Order" value={String(workingCount)} sub="operational" icon={CheckCircle} />
        <StatCard label="Needs Attention" value={String(repairCount)} sub="repair or damaged" icon={AlertTriangle} />
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs">
        <div className="relative w-full sm:w-64">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search equipment, tools, location…"
            className={`${IC} pl-8 pr-7 w-full text-xs py-1.5`}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 hidden md:inline">Category:</span>
            <select
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value); setPage(1); }}
              className={`${SC} text-xs py-1.5 w-auto max-w-[150px] sm:max-w-none`}
            >
              <option value="All">All Categories</option>
              {EQUIPMENT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 hidden md:inline">Condition:</span>
            <select
              value={condFilter}
              onChange={e => { setCondFilter(e.target.value); setPage(1); }}
              className={`${SC} text-xs py-1.5 w-auto`}
            >
              <option value="All">All Conditions</option>
              {EQUIPMENT_CONDITIONS.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="w-12 px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">#</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Equipment / Tool Name</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Category</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Quantity</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Condition</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Location</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left">Purchase Info</th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Wrench size={32} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-600">No equipment found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Click "Add Equipment" to record tools, generators, pipes, and machinery.</p>
                  </td>
                </tr>
              ) : (
                filteredEquipment
                  .slice((page - 1) * PER_PAGE, page * PER_PAGE)
                  .map((item, idx) => {
                    const rowIdx = (page - 1) * PER_PAGE + idx + 1;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="w-12 px-3 py-3.5 text-center text-xs font-mono text-slate-400">
                          {rowIdx}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                          {item.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleQuickQuantityAdjust(item, -1)}
                                disabled={item.quantity <= 0}
                                className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs"
                                title="Reduce quantity"
                              >
                                -
                              </button>
                            )}
                            <span className="px-2 font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] text-base min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleQuickQuantityAdjust(item, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-xs shadow-2xs"
                                title="Add quantity"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Bdg label={item.condition} color={conditionColor(item.condition)} />
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {item.location || <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                          {item.cost ? (
                            <p className="font-semibold text-slate-800">{currency}{item.cost.toLocaleString()}</p>
                          ) : null}
                          <p className="text-[11px] text-slate-400">{item.purchaseDate || "—"}</p>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                title="Edit equipment"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {canDelete && onDeleteEquipment && (
                              <button
                                type="button"
                                onClick={() => setDeleteId(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete equipment"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
        {filteredEquipment.length > PER_PAGE && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <Pagination
              page={page}
              total={filteredEquipment.length}
              perPage={PER_PAGE}
              onPage={setPage}
            />
          </div>
        )}
      </Card>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {filteredEquipment.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <Wrench size={28} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No equipment found</p>
            <p className="text-xs text-slate-400 mt-0.5">Tap "+ Add Equipment" above to add tools and machinery.</p>
          </div>
        ) : (
          filteredEquipment.map(item => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{item.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.category}
                    </span>
                    <Bdg label={item.condition} color={conditionColor(item.condition)} />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && onDeleteEquipment && (
                    <button
                      type="button"
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Quantity Adjuster & Details Row */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleQuickQuantityAdjust(item, -1)}
                        disabled={item.quantity <= 0}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold disabled:opacity-40"
                      >
                        -
                      </button>
                    )}
                    <span className="font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] text-lg px-1">
                      {item.quantity}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleQuickQuantityAdjust(item, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {item.location && (
                    <p className="text-slate-600 font-medium">📍 {item.location}</p>
                  )}
                  {item.cost ? (
                    <p className="text-slate-700 font-bold mt-0.5">{currency}{item.cost.toLocaleString()}</p>
                  ) : null}
                </div>
              </div>

              {item.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  {item.notes}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Equipment Modal */}
      {(showAdd || editingItem) && (
        <Modal
          title={editingItem ? "Edit Farm Equipment" : "Add Farm Equipment"}
          onClose={() => { setShowAdd(false); setEditingItem(null); }}
        >
          <div className="space-y-3.5">
            <F label="Equipment / Tool Name" error={formErr.name}>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 5.5KVA Generator, 2-inch PVC Pipe, Submersible Pump"
                className={IC}
                autoFocus
              />
            </F>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Category">
                <select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className={SC}
                >
                  {EQUIPMENT_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </F>

              <F label="Condition">
                <select
                  value={form.condition}
                  onChange={e => setForm(p => ({ ...p, condition: e.target.value as any }))}
                  className={SC}
                >
                  {EQUIPMENT_CONDITIONS.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </F>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Quantity" error={formErr.quantity}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                  className={IC}
                  placeholder="1"
                />
              </F>

              <F label="Storage Location / Assigned Area">
                <input
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Pump House, Store Room, Shed"
                  className={IC}
                />
              </F>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Purchase Date">
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))}
                  className={IC}
                />
              </F>

              <F label={`Estimated Cost (${currency})`}>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.cost}
                  onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                  placeholder="0"
                  className={IC}
                />
              </F>
            </div>

            <F label="Notes / Specifications / Serial No.">
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optional specifications, brand model, serial numbers, maintenance notes..."
                rows={2}
                className={IC}
              />
            </F>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setShowAdd(false); setEditingItem(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <PBtn disabled={saving} onClick={handleSave}>
                <CheckCircle size={14} /> {editingItem ? "Save Changes" : "Add Equipment"}
              </PBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1">Delete Equipment?</h3>
            <p className="text-xs text-slate-400 mb-5">
              This item will be removed from your equipment inventory. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm text-slate-600 font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteEquipment && deleteId) {
                    await onDeleteEquipment(deleteId);
                  }
                  setDeleteId(null);
                }}
                className="flex-1 py-2.5 text-sm text-white font-semibold bg-red-500 hover:bg-red-600 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
