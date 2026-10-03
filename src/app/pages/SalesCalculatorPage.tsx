import { useState, useMemo, useEffect } from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, Tag, CheckCircle,
  Pencil, X, Percent
} from "lucide-react";
import type { PriceGroup, InvSettings } from "../types";
import { fmt, uid } from "../data";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput } from "../shared";

export interface SalesCalculatorItem {
  id: string;
  groupId: string;
  qtyKg: string;
  discountPerKg: string;
}

const LOCAL_STORAGE_KEY = "pondtora_sales_calc_draft_v2";

export default function SalesCalculatorPage({
  priceGroups = [],
  currency = "₦",
  onAddPriceGroup,
  onEditPriceGroup,
  onDeletePriceGroup,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  priceGroups: PriceGroup[];
  settings?: InvSettings;
  currency?: string;
  onAddPriceGroup: (g: PriceGroup) => void;
  onEditPriceGroup: (g: PriceGroup) => void;
  onDeletePriceGroup: (id: string) => void;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const cs = currency;

  // Active price groups
  const activePriceGroups = useMemo(() => {
    return priceGroups.filter(g => g.status === "Active");
  }, [priceGroups]);

  // Manage price groups modal
  const [showGroupsPanel, setShowGroupsPanel] = useState(false);
  const [groupFormMode, setGroupFormMode] = useState(false);
  const [editGroup, setEditGroup] = useState<PriceGroup | null>(null);
  const [groupF, setGroupF] = useState({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" as "Active" | "Inactive" });
  const [groupErr, setGroupErr] = useState<Record<string, string>>({});

  // Calculator State
  const [discountType, setDiscountType] = useState<"general" | "individual">("general");
  const [generalDiscPerKg, setGeneralDiscPerKg] = useState("");
  const [additionalCharges, setAdditionalCharges] = useState("");

  const [items, setItems] = useState<SalesCalculatorItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }];
  });

  // Keep draft in local storage for 100% offline support
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Set default group when activePriceGroups load if items are empty
  useEffect(() => {
    if (activePriceGroups.length > 0 && items.length === 1 && !items[0].groupId) {
      setItems([{ ...items[0], groupId: activePriceGroups[0].id }]);
    }
  }, [activePriceGroups]);

  const addItem = (groupId?: string) => {
    const gid = groupId || activePriceGroups[0]?.id || "";
    setItems(prev => [...prev, { id: uid(), groupId: gid, qtyKg: "", discountPerKg: "" }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(x => x.id !== id);
      return filtered.length > 0 ? filtered : [{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }];
    });
  };

  const updateItem = (id: string, field: keyof SalesCalculatorItem, val: string) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  const resetCalculator = () => {
    setDiscountType("general");
    setGeneralDiscPerKg("");
    setAdditionalCharges("");
    setItems([{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }]);
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
  };

  // Calculations
  const calculatedRows = useMemo(() => {
    const genDisc = Number(generalDiscPerKg) || 0;
    return items.map(item => {
      const group = priceGroups.find(g => g.id === item.groupId);
      const pricePerKg = group?.pricePerKg || 0;
      const qty = Number(item.qtyKg) || 0;
      const discPerKg = discountType === "individual" ? (Number(item.discountPerKg) || 0) : genDisc;
      const baseSubtotal = qty * pricePerKg;
      const rowDiscount = qty * discPerKg;
      const lineTotal = Math.max(0, baseSubtotal - rowDiscount);

      return {
        ...item,
        group,
        groupLabel: group ? `${group.group} – ${group.displayName}` : "Select Group",
        pricePerKg,
        qtyKgNum: qty,
        discPerKg,
        baseSubtotal,
        rowDiscount,
        lineTotal
      };
    });
  }, [items, priceGroups, discountType, generalDiscPerKg]);

  const totalKg = calculatedRows.reduce((s, r) => s + r.qtyKgNum, 0);
  const baseSubtotal = calculatedRows.reduce((s, r) => s + r.baseSubtotal, 0);
  const totalDiscount = calculatedRows.reduce((s, r) => s + r.rowDiscount, 0);
  const additionalChargesNum = Number(additionalCharges) || 0;
  const grandTotal = Math.max(0, baseSubtotal - totalDiscount + additionalChargesNum);

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
      status: groupF.status
    };

    if (editGroup) {
      onEditPriceGroup(payload);
    } else {
      onAddPriceGroup(payload);
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
    <div className="p-4 sm:p-6 space-y-4 w-full max-w-5xl mx-auto pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Calculator size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] leading-tight">Sales Calculator</h1>
            <p className="text-xs text-slate-400">Compute fish sales and calculate amount to pay in real-time.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowGroupsPanel(true); setGroupFormMode(false); setEditGroup(null); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Tag size={13} className="text-green-600" /> Set Price Groups ({activePriceGroups.length})
          </button>
          <button
            onClick={resetCalculator}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Reset All Inputs"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>

      {/* Main Table-style Calculator Card */}
      <Card className="p-4 sm:p-5 space-y-4">
        {/* Discount & Charges Config Bar */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Percent size={13} className="text-green-600" /> Discount Mode:
            </span>
            <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDiscountType("general")}
                className={`px-3 py-1 rounded-md transition-all ${
                  discountType === "general"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                General Discount
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("individual")}
                className={`px-3 py-1 rounded-md transition-all ${
                  discountType === "individual"
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Individual Discount
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {discountType === "general" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Discount/kg ({cs}):</span>
                <NumInput
                  value={generalDiscPerKg}
                  onChange={setGeneralDiscPerKg}
                  placeholder="0"
                  className={`${IC} w-24 py-1 text-xs font-bold text-amber-800 bg-amber-50/50 border-amber-200`}
                  allowDecimal={true}
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Additional Charges ({cs}):</span>
              <NumInput
                value={additionalCharges}
                onChange={setAdditionalCharges}
                placeholder="0"
                className={`${IC} w-28 py-1 text-xs font-semibold`}
                allowDecimal={true}
              />
            </div>
          </div>
        </div>

        {/* Calculation Table (Desktop) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-slate-500">
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-left w-10">#</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-left min-w-[240px]">Price Group / Fish Size</th>
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-left w-36">Weight (KG)</th>
                {discountType === "individual" && (
                  <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-left w-36">Discount / kg ({cs})</th>
                )}
                <th className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right w-40">Amount to Pay</th>
                <th className="px-3 py-2.5 w-10"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculatedRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-3 text-xs font-mono text-slate-400 text-center font-bold">
                    {idx + 1}
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={row.groupId}
                      onChange={e => updateItem(row.id, "groupId", e.target.value)}
                      className={`${SC} py-1.5 text-xs font-bold text-slate-800`}
                    >
                      <option value="">Select Price Group...</option>
                      {activePriceGroups.map(g => (
                        <option key={g.id} value={g.id}>
                          Group {g.group} – {g.displayName} ({fmt(g.pricePerKg, cs)}/kg)
                        </option>
                      ))}
                    </select>
                    {row.pricePerKg > 0 && (
                      <p className="text-[11px] font-semibold text-green-700 mt-1 pl-1 font-['Barlow_Condensed',sans-serif]">
                        Rate: {fmt(row.pricePerKg, cs)} per kg
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="relative">
                      <NumInput
                        value={row.qtyKg}
                        onChange={v => updateItem(row.id, "qtyKg", v)}
                        placeholder="0"
                        className={`${IC} py-1.5 text-sm font-bold text-slate-900 pr-8`}
                        allowDecimal={true}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                    </div>
                  </td>
                  {discountType === "individual" && (
                    <td className="px-3 py-3">
                      <div className="relative">
                        <NumInput
                          value={row.discountPerKg}
                          onChange={v => updateItem(row.id, "discountPerKg", v)}
                          placeholder="0"
                          className={`${IC} py-1.5 text-xs font-bold text-amber-900 bg-amber-50/50 border-amber-200 pr-8`}
                          allowDecimal={true}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-amber-600">/{cs}</span>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-3 text-right">
                    <span className="text-base font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] block">
                      {fmt(row.lineTotal, cs)}
                    </span>
                    {row.rowDiscount > 0 && (
                      <span className="text-[11px] font-bold text-rose-500 block">
                        −{fmt(row.rowDiscount, cs)} disc
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {calculatedRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Remove row"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Cards (Mobile) */}
        <div className="sm:hidden space-y-3">
          {calculatedRows.map((row, idx) => (
            <div key={row.id} className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Fish Size #{idx + 1}</span>
                {calculatedRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(row.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Price Group</label>
                <select
                  value={row.groupId}
                  onChange={e => updateItem(row.id, "groupId", e.target.value)}
                  className={`${SC} py-1.5 text-xs font-bold text-slate-800`}
                >
                  <option value="">Select Price Group...</option>
                  {activePriceGroups.map(g => (
                    <option key={g.id} value={g.id}>
                      Group {g.group} – {g.displayName} ({fmt(g.pricePerKg, cs)}/kg)
                    </option>
                  ))}
                </select>
                {row.pricePerKg > 0 && (
                  <p className="text-[11px] font-semibold text-green-700 mt-1 pl-0.5 font-['Barlow_Condensed',sans-serif]">
                    Rate: {fmt(row.pricePerKg, cs)} per kg
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Weight (KG)</label>
                  <div className="relative">
                    <NumInput
                      value={row.qtyKg}
                      onChange={v => updateItem(row.id, "qtyKg", v)}
                      placeholder="0"
                      className={`${IC} py-1.5 text-sm font-bold text-slate-900 pr-8`}
                      allowDecimal={true}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                  </div>
                </div>

                {discountType === "individual" ? (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">Discount/kg ({cs})</label>
                    <div className="relative">
                      <NumInput
                        value={row.discountPerKg}
                        onChange={v => updateItem(row.id, "discountPerKg", v)}
                        placeholder="0"
                        className={`${IC} py-1.5 text-xs font-bold text-amber-900 bg-amber-50/50 border-amber-200 pr-8`}
                        allowDecimal={true}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600">/{cs}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Row Total</label>
                    <div className="py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-sm font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      {fmt(row.lineTotal, cs)}
                    </div>
                  </div>
                )}
              </div>

              {discountType === "individual" && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                  <span className="text-xs font-bold text-slate-500">Row Total:</span>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                      {fmt(row.lineTotal, cs)}
                    </span>
                    {row.rowDiscount > 0 && (
                      <span className="text-[10px] font-bold text-rose-500 block">
                        −{fmt(row.rowDiscount, cs)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => addItem()}
            className="px-3.5 py-2 text-xs font-bold text-green-700 bg-green-50/80 hover:bg-green-100 border border-green-200/90 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Fish Size
          </button>
        </div>

        {/* Total Calculation Summary Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200/90 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Fish Weight</span>
              <span className="text-xl sm:text-2xl font-extrabold text-white font-['Barlow_Condensed',sans-serif]">
                {totalKg.toLocaleString()} <span className="text-xs font-normal text-slate-300">kg</span>
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Base Subtotal</span>
              <span className="text-lg sm:text-xl font-bold text-slate-200 font-['Barlow_Condensed',sans-serif]">
                {fmt(baseSubtotal, cs)}
              </span>
            </div>

            {(totalDiscount > 0 || additionalChargesNum > 0) && (
              <div>
                {totalDiscount > 0 && (
                  <div className="text-rose-400">
                    <span className="text-[10px] uppercase font-bold tracking-wider block">Total Discount</span>
                    <span className="text-sm font-bold font-['Barlow_Condensed',sans-serif]">−{fmt(totalDiscount, cs)}</span>
                  </div>
                )}
                {additionalChargesNum > 0 && (
                  <div className="text-slate-300 mt-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider block">Charges</span>
                    <span className="text-sm font-bold font-['Barlow_Condensed',sans-serif]">+{fmt(additionalChargesNum, cs)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="col-span-2 sm:col-span-1 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 block">Total Amount to Pay</span>
              <span className="text-2xl sm:text-3xl font-extrabold text-green-400 font-['Barlow_Condensed',sans-serif]">
                {fmt(grandTotal, cs)}
              </span>
              {totalKg > 0 && (
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Avg: {fmt(grandTotal / totalKg, cs)}/kg
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Price Groups Management Modal */}
      {showGroupsPanel && (
        <Modal
          title="Fish Price Groups"
          onClose={() => { setShowGroupsPanel(false); setGroupFormMode(false); setEditGroup(null); }}
          wide
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Configure fish size categories, pricing per kg, and active status.</p>
              {!groupFormMode && canCreate && (
                <button
                  onClick={() => { setEditGroup(null); setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" }); setGroupFormMode(true); }}
                  className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Add Price Group
                </button>
              )}
            </div>

            {groupFormMode ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800">{editGroup ? "Edit Price Group" : "Create New Price Group"}</span>
                  <button onClick={() => { setGroupFormMode(false); setEditGroup(null); }} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="flex gap-2 pt-2">
                  <PBtn onClick={handleSaveGroup} sm>
                    <CheckCircle size={13} /> {editGroup ? "Save Changes" : "Create Group"}
                  </PBtn>
                  <button onClick={() => { setGroupFormMode(false); setEditGroup(null); }} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800">Cancel</button>
                </div>
              </div>
            ) : null}

            {/* List of Price Groups */}
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {priceGroups.map(g => (
                <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center font-mono shrink-0">
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Edit Group"
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Price Group ${g.group} (${g.displayName})?`)) {
                            onDeletePriceGroup(g.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 size={13} />
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
