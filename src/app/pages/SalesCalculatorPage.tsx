import { useState, useMemo, useEffect } from "react";
import {
  Calculator, Plus, Trash2, Printer, RotateCcw, Tag, CheckCircle,
  FileText, Layers, Edit3, X, Info
} from "lucide-react";
import type { PriceGroup, InvSettings } from "../types";
import { fmt, uid, TODAY } from "../data";
import { Card, Bdg, PBtn, Modal, F, IC, SC, NumInput } from "../shared";

export interface SalesCalculatorItem {
  id: string;
  groupId: string;
  qtyKg: string;
  discountPerKg: string;
}

const LOCAL_STORAGE_KEY = "pond_sales_calc_draft_v1";

export default function SalesCalculatorPage({
  priceGroups = [],
  settings,
  onAddPriceGroup,
  onEditPriceGroup,
  onDeletePriceGroup,
  onConvertToInvoice,
  currency = "₦",
  canEditLocked = true,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: {
  priceGroups: PriceGroup[];
  settings?: InvSettings;
  onAddPriceGroup: (g: PriceGroup) => void;
  onEditPriceGroup: (g: PriceGroup) => void;
  onDeletePriceGroup: (id: string) => void;
  onConvertToInvoice?: (data: { items: any[]; discountType: "general" | "individual"; generalDiscount: number; additionalCharges: number; customerName: string; notes: string }) => void;
  currency?: string;
  canEditLocked?: boolean;
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
  const [customerName, setCustomerName] = useState("");
  const [calcDate, setCalcDate] = useState(TODAY);
  const [notes, setNotes] = useState("");
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
    setCustomerName("");
    setCalcDate(TODAY);
    setNotes("");
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
    if (!groupF.group.trim()) errs.group = "Group code is required (e.g. A, B)";
    if (!groupF.displayName.trim()) errs.displayName = "Display name is required (e.g. Small Size)";
    if (!groupF.pricePerKg || Number(groupF.pricePerKg) <= 0) errs.pricePerKg = "Valid price per kg is required";
    if (Object.keys(errs).length) { setGroupErr(errs); return; }
    setGroupErr({});

    if (editGroup) {
      onEditPriceGroup({ ...editGroup, ...groupF, pricePerKg: Number(groupF.pricePerKg) });
    } else {
      onAddPriceGroup({ id: uid(), ...groupF, pricePerKg: Number(groupF.pricePerKg) });
    }
    setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" });
    setGroupFormMode(false);
    setEditGroup(null);
  };

  // Print Slip Generator
  const printSalesSlip = () => {
    const farmName = settings?.farmName || "Fish Farm Sales Slip";
    const farmPhone = settings?.farmPhone ? `Phone: ${settings.farmPhone}` : "";
    const farmAddress = settings?.farmAddress ? `${settings.farmAddress}` : "";
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const rowsHtml = calculatedRows.filter(r => r.qtyKgNum > 0).map(r => `
      <div style="margin:6px 0;padding-bottom:5px;border-bottom:1px dotted #ccc">
        <div style="font-weight:700;font-size:12px">${r.groupLabel}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#444;margin-top:2px">
          <span>${r.qtyKgNum} kg × ${fmt(r.pricePerKg, cs)}/kg</span>
          <span style="font-weight:700">${fmt(r.baseSubtotal, cs)}</span>
        </div>
        ${r.rowDiscount > 0 ? `
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#c00;margin-top:1px">
            <span>Discount (${fmt(r.discPerKg, cs)}/kg)</span>
            <span>-${fmt(r.rowDiscount, cs)}</span>
          </div>
        ` : ""}
        <div style="text-align:right;font-weight:800;font-size:12px;margin-top:2px">${fmt(r.lineTotal, cs)}</div>
      </div>
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sales Calculation Slip</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',Courier,monospace;width:300px;margin:0 auto;padding:12px 10px;font-size:11px;color:#111;background:#fff}
    .text-center{text-align:center}
    .r{display:flex;justify-content:space-between;margin:3px 0;font-size:11px}
    .lbl{color:#666}
    .b{font-weight:700}
    .grand{display:flex;justify-content:space-between;font-size:16px;font-weight:900;border-top:2px solid #111;border-bottom:2px solid #111;padding:6px 0;margin:8px 0}
    @media print{body{width:100%;padding:0}}
  </style>
</head>
<body>
  <div class="text-center" style="font-size:14px;font-weight:900;text-transform:uppercase">${farmName}</div>
  ${farmAddress ? `<div class="text-center" style="font-size:10px;color:#555;margin-top:2px">${farmAddress}</div>` : ""}
  ${farmPhone ? `<div class="text-center" style="font-size:10px;color:#555">${farmPhone}</div>` : ""}
  <hr style="border:none;border-top:1.5px solid #111;margin:8px 0">
  <div class="text-center" style="font-weight:800;font-size:13px;letter-spacing:1px">SALES CALCULATION SLIP</div>
  <hr style="border:none;border-top:1px dashed #999;margin:8px 0">
  
  <div class="r"><span class="lbl">Date:</span><span>${calcDate} ${now}</span></div>
  ${customerName ? `<div class="r"><span class="lbl">Customer:</span><span class="b">${customerName}</span></div>` : ""}
  
  <hr style="border:none;border-top:1px dashed #999;margin:8px 0">
  <div style="font-size:10px;font-weight:700;color:#666;text-transform:uppercase;margin-bottom:4px">Fish Items</div>
  ${rowsHtml || '<div style="text-align:center;padding:10px;color:#777">No items added</div>'}
  
  <hr style="border:none;border-top:1.5px solid #111;margin:8px 0">
  <div class="r"><span class="lbl">Total Weight:</span><span class="b">${totalKg} kg</span></div>
  <div class="r"><span class="lbl">Subtotal:</span><span>${fmt(baseSubtotal, cs)}</span></div>
  ${totalDiscount > 0 ? `<div class="r"><span class="lbl">Total Discount:</span><span style="color:#c00">−${fmt(totalDiscount, cs)}</span></div>` : ""}
  ${additionalChargesNum > 0 ? `<div class="r"><span class="lbl">Additional Charges:</span><span>+${fmt(additionalChargesNum, cs)}</span></div>` : ""}
  
  <div class="grand">
    <span>AMOUNT TO PAY</span>
    <span>${fmt(grandTotal, cs)}</span>
  </div>

  ${notes ? `<div style="font-size:10px;color:#555;margin:6px 0;font-style:italic">Note: ${notes}</div>` : ""}
  <div style="font-size:9px;text-align:center;color:#777;margin-top:12px">*** Thank you for your business! ***</div>
</body>
</html>`;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", left: "-9999px", top: "-9999px", width: "1px", height: "1px", border: "none", visibility: "hidden" });
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1500);
      }, 300);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full pb-20 sm:pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#f5f7fa] -mx-4 -mt-4 px-4 py-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-['Barlow_Condensed',sans-serif]">Sales Calculator</h1>
              <p className="text-xs text-slate-400 mt-0.5">Quickly compute fish sales, apply individual or general discounts, and print sales slips.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGroupsPanel(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Tag size={13} className="text-green-600" /> Set Price Groups ({activePriceGroups.length})
          </button>
          <button
            onClick={resetCalculator}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Reset Calculator"
          >
            <RotateCcw size={12} /> Clear
          </button>
          <PBtn onClick={printSalesSlip} sm>
            <Printer size={13} /> Print Slip
          </PBtn>
        </div>
      </div>

      {/* Quick Price Group Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Tag size={13} className="text-green-600" /> Active Price Groups
          </span>
          <button
            onClick={() => { setEditGroup(null); setGroupF({ group: "", displayName: "", description: "", pricePerKg: "", status: "Active" }); setGroupFormMode(true); setShowGroupsPanel(true); }}
            className="text-xs font-semibold text-green-700 hover:text-green-800 flex items-center gap-1"
          >
            <Plus size={12} /> Add Group
          </button>
        </div>

        {activePriceGroups.length === 0 ? (
          <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl flex items-center justify-between">
            <span>No active price groups configured yet.</span>
            <button onClick={() => setShowGroupsPanel(true)} className="underline font-bold">Configure Now</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {activePriceGroups.map(pg => (
              <button
                key={pg.id}
                type="button"
                onClick={() => addItem(pg.id)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-green-400 hover:bg-green-50/50 transition-all text-left flex items-center gap-2 group"
                title="Click to add this fish group to calculation"
              >
                <span className="w-6 h-6 rounded-lg bg-green-100 text-green-800 font-bold text-xs flex items-center justify-center font-mono group-hover:bg-green-600 group-hover:text-white transition-colors">
                  {pg.group}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-tight">{pg.displayName}</p>
                  <p className="text-[11px] font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">{fmt(pg.pricePerKg, cs)}/kg</p>
                </div>
                <Plus size={12} className="text-slate-300 group-hover:text-green-600 ml-1 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Calculator Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Item Entry Table / Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Fish Sales Items</h2>
                <p className="text-xs text-slate-400">Select price group and enter kilograms sold</p>
              </div>
              <button
                type="button"
                onClick={() => addItem()}
                className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
              >
                <Plus size={13} /> Add Fish Size
              </button>
            </div>

            {/* Item Rows */}
            <div className="space-y-3">
              {calculatedRows.map((item, idx) => (
                <div key={item.id} className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-3.5 space-y-3 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[11px] font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">Fish Group #{idx + 1}</span>
                    </div>
                    {calculatedRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors"
                        title="Remove line item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Select Group */}
                    <div className="sm:col-span-5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Price Group / Size</label>
                      <select
                        value={item.groupId}
                        onChange={e => updateItem(item.id, "groupId", e.target.value)}
                        className={`${SC} text-xs font-semibold`}
                      >
                        <option value="">Select Group...</option>
                        {activePriceGroups.map(g => (
                          <option key={g.id} value={g.id}>
                            Group {g.group} – {g.displayName} ({fmt(g.pricePerKg, cs)}/kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* KG Input */}
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Weight (KG)</label>
                      <div className="relative">
                        <NumInput
                          value={item.qtyKg}
                          onChange={v => updateItem(item.id, "qtyKg", v)}
                          placeholder="e.g. 25"
                          className={`${IC} text-sm font-bold text-slate-900 pr-8`}
                          allowDecimal={true}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
                      </div>
                    </div>

                    {/* Individual Discount (if selected) */}
                    {discountType === "individual" && (
                      <div className="sm:col-span-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block mb-1">Discount / kg ({cs})</label>
                        <div className="relative">
                          <NumInput
                            value={item.discountPerKg}
                            onChange={v => updateItem(item.id, "discountPerKg", v)}
                            placeholder="0"
                            className={`${IC} text-xs text-amber-900 pr-8 border-amber-200 bg-amber-50/40`}
                            allowDecimal={true}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600">/{cs}</span>
                        </div>
                      </div>
                    )}

                    {/* Line Total Display */}
                    <div className={discountType === "individual" ? "sm:col-span-12 flex justify-between items-center pt-2 border-t border-slate-200/60" : "sm:col-span-4 flex flex-col justify-end"}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Row Amount</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                          {fmt(item.lineTotal, cs)}
                        </span>
                        {item.rowDiscount > 0 && (
                          <span className="text-[11px] font-bold text-red-500">
                            (-{fmt(item.rowDiscount, cs)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Discount Mode Selector */}
            <div className="mt-5 pt-4 border-t border-slate-100 bg-slate-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Discount Mode</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="discType"
                      checked={discountType === "general"}
                      onChange={() => setDiscountType("general")}
                      className="accent-green-600"
                    />
                    General Discount
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="discType"
                      checked={discountType === "individual"}
                      onChange={() => setDiscountType("individual")}
                      className="accent-green-600"
                    />
                    Individual Discount
                  </label>
                </div>
              </div>

              {discountType === "general" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">General Discount Rate ({cs} per kg)</label>
                    <div className="relative">
                      <NumInput
                        value={generalDiscPerKg}
                        onChange={setGeneralDiscPerKg}
                        placeholder="e.g. 50 (deducts ₦50 on every kg)"
                        className={`${IC} text-xs font-semibold`}
                        allowDecimal={true}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/{cs}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Additional Charges ({cs})</label>
                    <NumInput
                      value={additionalCharges}
                      onChange={setAdditionalCharges}
                      placeholder="e.g. 1000 for transport or ice"
                      className={`${IC} text-xs font-semibold`}
                      allowDecimal={true}
                    />
                  </div>
                </div>
              )}

              {discountType === "individual" && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Additional Charges ({cs})</label>
                  <NumInput
                    value={additionalCharges}
                    onChange={setAdditionalCharges}
                    placeholder="e.g. 1000 for transport or ice"
                    className={`${IC} text-xs font-semibold w-full sm:w-1/2`}
                    allowDecimal={true}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Customer / Notes optional metadata */}
          <Card className="p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Optional Sale Details</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Customer / Buyer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Alh. Ibrahim, Mama Chukwudi"
                  className={`${IC} text-xs`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Date</label>
                <input
                  type="date"
                  value={calcDate}
                  onChange={e => setCalcDate(e.target.value)}
                  className={`${IC} text-xs font-bold`}
                  style={{ colorScheme: "light" }}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 block mb-1">Sale Note</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Harvested from Pond 2, Cash on delivery"
                className={`${IC} text-xs`}
              />
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Big Beautiful Calculation Summary & Actions */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-lg space-y-4 font-['Barlow',sans-serif]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Calculation</span>
              <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full border border-green-500/30">Live Total</span>
            </div>

            {/* Total Weight */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300">Total Fish Weight:</span>
              <span className="text-lg font-extrabold text-white font-['Barlow_Condensed',sans-serif]">
                {totalKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span>
              </span>
            </div>

            {/* Base Subtotal */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-300">Base Subtotal:</span>
              <span className="text-sm font-bold text-slate-200">
                {fmt(baseSubtotal, cs)}
              </span>
            </div>

            {/* Discount */}
            {totalDiscount > 0 && (
              <div className="flex items-baseline justify-between text-rose-400">
                <span className="text-xs">Discount Deducted:</span>
                <span className="text-sm font-bold">
                  −{fmt(totalDiscount, cs)}
                </span>
              </div>
            )}

            {/* Additional Charges */}
            {additionalChargesNum > 0 && (
              <div className="flex items-baseline justify-between text-slate-300">
                <span className="text-xs">Additional Charges:</span>
                <span className="text-sm font-bold">
                  +{fmt(additionalChargesNum, cs)}
                </span>
              </div>
            )}

            {/* Big Grand Total Callout */}
            <div className="pt-3 border-t border-slate-700/80 mt-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Amount to Pay</span>
              <div className="text-3xl font-extrabold text-green-400 font-['Barlow_Condensed',sans-serif] tracking-tight">
                {fmt(grandTotal, cs)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {totalKg > 0 ? `Avg: ${fmt(totalKg > 0 ? grandTotal / totalKg : 0, cs)}/kg` : "Enter kg to calculate"}
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="pt-3 space-y-2">
              <button
                type="button"
                onClick={printSalesSlip}
                className="w-full py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Calculation Slip
              </button>

              {onConvertToInvoice && (
                <button
                  type="button"
                  onClick={() => {
                    const validItems = calculatedRows.filter(r => r.qtyKgNum > 0 && r.groupId);
                    if (validItems.length === 0) {
                      alert("Please enter quantities for at least one fish group before converting to invoice.");
                      return;
                    }
                    onConvertToInvoice({
                      items: validItems.map(r => ({
                        id: uid(),
                        groupId: r.groupId,
                        qty: String(r.qtyKgNum),
                        discount: String(r.discPerKg)
                      })),
                      discountType,
                      generalDiscount: Number(generalDiscPerKg) || 0,
                      additionalCharges: additionalChargesNum,
                      customerName,
                      notes
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <FileText size={14} /> Create Invoice from this Sale
                </button>
              )}
            </div>
          </div>

          {/* Quick instructions / tips card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info size={14} className="text-green-600" /> Offline Capable
            </div>
            <p className="leading-relaxed text-[11px]">
              The Sales Calculator works fully offline on mobile and desktop. Calculations and customized price groups are cached automatically on your device.
            </p>
          </div>
        </div>
      </div>

      {/* Price Groups Management Modal */}
      {showGroupsPanel && (
        <Modal title="Fish Price Groups" onClose={() => { setShowGroupsPanel(false); setGroupFormMode(false); setEditGroup(null); }} wide>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">Manage fish size categories and selling price per kilogram.</p>
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
                  <F label="Group Code (e.g. A, B, C, EX)" error={groupErr.group}>
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
                <F label="Description / Fish Size details">
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
                        <Bdg label={g.status} color={g.status === "Active" ? "green" : "gray"} />
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{g.description || "No description"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-green-700 font-['Barlow_Condensed',sans-serif]">
                      {fmt(g.pricePerKg, cs)}/kg
                    </span>
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => { setEditGroup(g); setGroupF({ group: g.group, displayName: g.displayName, description: g.description, pricePerKg: String(g.pricePerKg), status: g.status }); setGroupFormMode(true); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Edit group"
                        >
                          <Edit3 size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete price group ${g.group} (${g.displayName})?`)) onDeletePriceGroup(g.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowGroupsPanel(false); setGroupFormMode(false); setEditGroup(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
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
