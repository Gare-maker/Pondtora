import { useState, useMemo, useEffect } from "react";
import {
  Calculator, Plus, Trash2, RotateCcw, Tag, CheckCircle,
  Pencil, Percent
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

const LOCAL_STORAGE_KEY = "pondtora_sales_calc_draft_v3";

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
    return (priceGroups || []).filter(g => g && g.status === "Active");
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

  const [items, setItems] = useState<SalesCalculatorItem[]>(() => {
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

  // Keep draft in local storage for 100% offline support
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  // Set default group when activePriceGroups load if items are empty
  useEffect(() => {
    if (activePriceGroups.length > 0) {
      setItems(prev => {
        if (prev.length === 1 && !prev[0].groupId) {
          return [{ ...prev[0], groupId: activePriceGroups[0].id }];
        }
        return prev;
      });
    }
  }, [activePriceGroups]);

  const addItem = (groupId?: string) => {
    const gid = groupId || activePriceGroups[0]?.id || "";
    setItems(prev => [...prev, { id: uid(), groupId: gid, qtyKg: "", discountPerKg: "" }]);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(x => x && x.id !== id);
      return filtered.length > 0 ? filtered : [{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }];
    });
  };

  const updateItem = (id: string, field: keyof SalesCalculatorItem, val: string) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  const resetCalculator = () => {
    setDiscountType("general");
    setGeneralDiscPerKg("");
    setItems([{ id: uid(), groupId: activePriceGroups[0]?.id || "", qtyKg: "", discountPerKg: "" }]);
    try { localStorage.removeItem(LOCAL_STORAGE_KEY); } catch {}
  };

  // Calculations
  const calculatedRows = useMemo(() => {
    const genDisc = Math.max(0, Number(generalDiscPerKg) || 0);
    return (items || []).filter(Boolean).map(item => {
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

  const totalKg = calculatedRows.reduce((s, r) => s + (r.qtyKgNum || 0), 0);
  const baseSubtotal = calculatedRows.reduce((s, r) => s + (r.baseSubtotal || 0), 0);
  const totalDiscount = calculatedRows.reduce((s, r) => s + (r.rowDiscount || 0), 0);
  const grandTotal = Math.max(0, baseSubtotal - totalDiscount);

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
      farmId: editGroup?.farmId
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
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-5xl mx-auto pb-20 sm:pb-8">
      {/* Top Header Bar */}
      <div className="lg:sticky lg:top-0 lg:z-20 lg:bg-[#f5f7fa] lg:-mx-6 lg:-mt-6 lg:px-6 lg:py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Sales Calculator</h1>
          <p className="text-xs text-slate-400 mt-0.5">Calculate the total amount your customers are to pay for fish purchased.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PBtn
            sm
            outline
            onClick={() => { setShowGroupsPanel(true); setGroupFormMode(false); setEditGroup(null); }}
          >
            <Tag size={13} /> Price Groups ({activePriceGroups.length})
          </PBtn>
          <PBtn sm onClick={resetCalculator}>
            <RotateCcw size={13} /> Clear
          </PBtn>
        </div>
      </div>

      {/* Main Table-style Calculator Card */}
      <Card className="p-3 sm:p-5 space-y-4">
        {/* Compact Discount Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
              <Percent size={12} className="text-green-600" /> Discount Mode
            </span>
            <div className="inline-flex bg-slate-200/70 p-0.5 rounded-lg text-xs font-medium border border-slate-200/60">
              <button
                type="button"
                onClick={() => setDiscountType("general")}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
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
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Discount per kg:</span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">{cs}</span>
                <NumInput
                  value={generalDiscPerKg}
                  onChange={setGeneralDiscPerKg}
                  placeholder="0"
                  className={`${IC} text-xs py-1.5 pl-6 pr-8 text-right font-medium`}
                  allowDecimal={true}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">/kg</span>
              </div>
            </div>
          )}
        </div>

        {/* Calculation Table (Desktop) */}
        <div className="hidden sm:block overflow-x-auto">
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
                      onChange={e => updateItem(row.id, "groupId", e.target.value)}
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
                        onChange={v => updateItem(row.id, "qtyKg", v)}
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
                          onChange={v => updateItem(row.id, "discountPerKg", v)}
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
                        onClick={() => removeItem(row.id)}
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

        {/* Calculation List (Mobile) - Ultra-Clean, Explicitly Labeled */}
        <div className="sm:hidden space-y-3">
          {calculatedRows.map((row, idx) => (
            <div key={row.id} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Fish Item #{idx + 1}</span>
                {calculatedRows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(row.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Price Group</label>
                <select
                  value={row.groupId}
                  onChange={e => updateItem(row.id, "groupId", e.target.value)}
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
              </div>

              <div className={`grid ${discountType === "individual" ? "grid-cols-2" : "grid-cols-1"} gap-2`}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Weight (KG)</label>
                  <div className="relative">
                    <NumInput
                      value={row.qtyKg}
                      onChange={v => updateItem(row.id, "qtyKg", v)}
                      placeholder="0"
                      className={`${IC} text-xs py-1.5 pr-8 text-right font-medium`}
                      allowDecimal={true}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 pointer-events-none">kg</span>
                  </div>
                </div>

                {discountType === "individual" && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Discount ({cs}/kg)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 pointer-events-none">{cs}</span>
                      <NumInput
                        value={row.discountPerKg}
                        onChange={v => updateItem(row.id, "discountPerKg", v)}
                        placeholder="0"
                        className={`${IC} text-xs py-1.5 pl-6 pr-8 text-right font-medium`}
                        allowDecimal={true}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">/kg</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-[11px] font-medium text-slate-500">Subtotal:</span>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {fmt(row.lineTotal, cs)}
                  </span>
                  {row.rowDiscount > 0 && (
                    <span className="text-[10px] text-rose-500 block">
                      −{fmt(row.rowDiscount, cs)} discount
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <div>
          <PBtn
            sm
            outline
            onClick={() => addItem()}
          >
            <Plus size={13} /> Add Fish Size
          </PBtn>
        </div>

        {/* Breakdown & Total Summary (Dark Area) */}
        <div className="mt-3 bg-slate-900 text-white rounded-xl p-3.5 space-y-2.5 shadow-xs">
          {/* Breakdown by Group */}
          {calculatedRows.filter(r => r.qtyKgNum > 0 && r.group).length > 0 && (
            <div className="space-y-1 pb-2 border-b border-slate-800 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Summary by Group
              </span>
              {calculatedRows.filter(r => r.qtyKgNum > 0 && r.group).map(row => (
                <div key={row.id} className="flex items-center justify-between gap-2 text-slate-300 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-bold bg-slate-800 px-1 py-0.5 rounded text-green-400 font-mono shrink-0">
                      {row.group?.group}
                    </span>
                    <span className="truncate text-slate-200">
                      {row.group?.displayName}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({row.qtyKgNum.toLocaleString()} kg)
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-semibold text-white text-xs">
                      {fmt(row.lineTotal, cs)}
                    </span>
                    {row.rowDiscount > 0 && (
                      <span className="text-[10px] text-rose-400 block">
                        −{fmt(row.rowDiscount, cs)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grand Totals */}
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total KG</span>
              <span className="text-base sm:text-lg font-bold text-white font-mono">
                {totalKg.toLocaleString()} <span className="text-xs font-normal text-slate-300">kg</span>
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-400 block">Total Amount</span>
              <span className="text-xl sm:text-2xl font-extrabold text-green-400 font-mono">
                {fmt(grandTotal, cs)}
              </span>
              {totalDiscount > 0 && (
                <span className="text-[10px] text-rose-400 block">
                  (−{fmt(totalDiscount, cs)} discount)
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
