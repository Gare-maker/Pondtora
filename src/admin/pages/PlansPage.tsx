import React, { useState } from "react";
import { Plus, Edit2, ArchiveX, ArchiveRestore, Package, Sparkles, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Card, PBtn, Bdg, Modal, F, IC, SC } from "../../app/shared";
import type { AdminPlan } from "../types";
import { DEFAULT_PLANS } from "../types";

interface Props {
  plans: AdminPlan[];
  onAdd: (p: Omit<AdminPlan, "id">) => void;
  onUpdate: (p: AdminPlan) => void;
  onResetDefaults?: () => void;
}

const BLANK: Omit<AdminPlan, "id"> = {
  name: "",
  monthlyPrice: 5000,
  yearlyPrice: 48000,
  description: "",
  status: "Active",
  farmLimit: 1,
  pondLimit: null,
};

function PlanForm({
  f,
  setF,
  err,
}: {
  f: Partial<AdminPlan>;
  setF: (x: Partial<AdminPlan>) => void;
  err: Record<string, string>;
}) {
  const handleMonthlyChange = (monthly: number) => {
    setF({
      ...f,
      monthlyPrice: monthly,
      // Automatically calculate 20% discount for yearly price if user hasn't typed custom
      yearlyPrice: Math.round(monthly * 12 * 0.8),
    });
  };

  return (
    <>
      <F label="Plan Name">
        <input
          value={f.name || ""}
          onChange={e => setF({ ...f, name: e.target.value })}
          className={IC + (err.name ? " !border-red-400" : "")}
          placeholder="e.g. Growth"
        />
        {err.name && <p className="text-red-500 text-[11px] mt-0.5">{err.name}</p>}
      </F>

      <F label="Description">
        <input
          value={f.description || ""}
          onChange={e => setF({ ...f, description: e.target.value })}
          className={IC}
          placeholder="e.g. Up to 15 ponds, 1 farm with team collaboration"
        />
      </F>

      <div className="grid grid-cols-2 gap-3">
        <F label="Monthly Price (₦)">
          <input
            type="number"
            min={0}
            step={500}
            value={f.monthlyPrice ?? 0}
            onChange={e => handleMonthlyChange(Number(e.target.value))}
            className={IC}
          />
        </F>
        <F label="Yearly Price (₦)">
          <input
            type="number"
            min={0}
            step={1000}
            value={f.yearlyPrice ?? 0}
            onChange={e => setF({ ...f, yearlyPrice: Number(e.target.value) })}
            className={IC}
          />
        </F>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Farm Limit (leave blank for unlimited)">
          <input
            type="number"
            min={1}
            value={f.farmLimit ?? ""}
            onChange={e => setF({ ...f, farmLimit: e.target.value ? Number(e.target.value) : null })}
            className={IC}
            placeholder="Unlimited"
          />
        </F>
        <F label="Pond Limit (leave blank for unlimited)">
          <input
            type="number"
            min={1}
            value={f.pondLimit ?? ""}
            onChange={e => setF({ ...f, pondLimit: e.target.value ? Number(e.target.value) : null })}
            className={IC}
            placeholder="Unlimited"
          />
        </F>
      </div>

      <F label="Plan Status">
        <select
          value={f.status || "Active"}
          onChange={e => setF({ ...f, status: e.target.value as "Active" | "Inactive" })}
          className={SC}
        >
          <option value="Active">Active (Visible to users)</option>
          <option value="Inactive">Inactive / Archived</option>
        </select>
      </F>
    </>
  );
}

export default function PlansPage({ plans, onAdd, onUpdate, onResetDefaults }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [form, setForm] = useState<Partial<AdminPlan>>({ ...BLANK });
  const [fErr, setFErr] = useState<Record<string, string>>({});
  const [savedNotif, setSavedNotif] = useState(false);

  function validate(f: Partial<AdminPlan>) {
    const e: Record<string, string> = {};
    if (!f.name?.trim()) e.name = "Plan name is required.";
    return e;
  }

  function handleAdd() {
    const e = validate(form);
    setFErr(e);
    if (Object.keys(e).length) return;
    onAdd(form as Omit<AdminPlan, "id">);
    setShowAdd(false);
    setForm({ ...BLANK });
    setFErr({});
    triggerSaved();
  }

  function handleEdit() {
    if (!editing) return;
    const e = validate(form);
    setFErr(e);
    if (Object.keys(e).length) return;
    onUpdate({ ...editing, ...form } as AdminPlan);
    setEditing(null);
    setFErr({});
    triggerSaved();
  }

  function triggerSaved() {
    setSavedNotif(true);
    setTimeout(() => setSavedNotif(false), 3000);
  }

  function fmt(n: number) {
    return n === 0 ? "Free" : "₦" + n.toLocaleString();
  }

  const active = plans.filter(p => p.status === "Active");
  const archived = plans.filter(p => p.status === "Inactive");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-['Barlow_Condensed',sans-serif] text-slate-900">
              Pricing & Plan Regulation
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Owner Controls
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure monthly & annual plan prices, farm limits, and pond capacity across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onResetDefaults && (
            <button
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl text-xs font-semibold transition-colors shadow-sm"
              title="Reset plans to default rates"
            >
              <RefreshCw size={12} /> Reset Defaults
            </button>
          )}
          <PBtn
            onClick={() => {
              setForm({ ...BLANK });
              setFErr({});
              setShowAdd(true);
            }}
          >
            <Plus size={14} /> Add New Plan
          </PBtn>
        </div>
      </div>

      {savedNotif && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle size={15} className="text-green-600 shrink-0" />
          <span>Pricing changes have been saved and applied system-wide!</span>
        </div>
      )}

      {/* Active Plans Table */}
      <Card className="overflow-hidden border border-slate-200/80">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-green-600" />
            <h2 className="text-sm font-bold text-slate-800">Active Subscription Plans</h2>
          </div>
          <Bdg label={`${active.length} active`} color="green" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <th className="px-5 py-3 text-left">Plan Name</th>
                <th className="px-5 py-3 text-left">Description</th>
                <th className="px-5 py-3 text-left">Monthly Rate</th>
                <th className="px-5 py-3 text-left">Yearly Rate</th>
                <th className="px-5 py-3 text-left">Farm Limit</th>
                <th className="px-5 py-3 text-left">Pond Limit</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {active.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No active plans configured.
                  </td>
                </tr>
              )}
              {active.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                  <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                    <span className="group-hover:text-green-700 transition-colors">{p.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 max-w-[220px] truncate">
                    {p.description || "—"}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                    {fmt(p.monthlyPrice)} <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                    {fmt(p.yearlyPrice)} <span className="text-[10px] text-slate-400 font-normal">/yr</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium">
                    {p.farmLimit === null ? (
                      <span className="text-emerald-600 font-bold">Unlimited</span>
                    ) : (
                      `${p.farmLimit} farm${p.farmLimit > 1 ? "s" : ""}`
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium">
                    {p.pondLimit === null ? (
                      <span className="text-emerald-600 font-bold">Unlimited</span>
                    ) : (
                      `${p.pondLimit} ponds`
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setForm({ ...p });
                          setFErr({});
                          setEditing(p);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-green-50 text-slate-600 hover:text-green-700 transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Edit Plan & Pricing"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => onUpdate({ ...p, status: "Inactive" })}
                        className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                        title="Archive Plan"
                      >
                        <ArchiveX size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Archived Plans */}
      {archived.length > 0 && (
        <Card className="overflow-hidden border border-slate-200/80">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-500">Archived / Inactive Plans</h2>
            <Bdg label={`${archived.length} archived`} color="gray" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="px-5 py-2.5 text-left">Plan</th>
                  <th className="px-5 py-2.5 text-left">Description</th>
                  <th className="px-5 py-2.5 text-left">Monthly</th>
                  <th className="px-5 py-2.5 text-left">Yearly</th>
                  <th className="px-5 py-2.5 text-left">Farms</th>
                  <th className="px-5 py-2.5 text-left">Ponds</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {archived.map(p => (
                  <tr key={p.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">{p.name}</td>
                    <td className="px-5 py-3 text-slate-400 max-w-[200px] truncate">{p.description || "—"}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{fmt(p.monthlyPrice)}</td>
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{fmt(p.yearlyPrice)}</td>
                    <td className="px-5 py-3 text-slate-400">{p.farmLimit ?? "∞"}</td>
                    <td className="px-5 py-3 text-slate-400">{p.pondLimit ?? "∞"}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => onUpdate({ ...p, status: "Active" })}
                        className="px-2.5 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-semibold transition-colors flex items-center gap-1 ml-auto"
                        title="Restore Plan"
                      >
                        <ArchiveRestore size={12} /> Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Plan Modal */}
      {showAdd && (
        <Modal
          title="Add New Subscription Plan"
          onClose={() => {
            setShowAdd(false);
            setFErr({});
          }}
          wide
        >
          <div className="space-y-3.5">
            <PlanForm f={form} setF={setForm} err={fErr} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <PBtn
                outline
                onClick={() => {
                  setShowAdd(false);
                  setFErr({});
                }}
              >
                Cancel
              </PBtn>
              <PBtn onClick={handleAdd}>Create Plan</PBtn>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Plan Modal */}
      {editing && (
        <Modal
          title={`Edit Plan — ${editing.name}`}
          onClose={() => {
            setEditing(null);
            setFErr({});
          }}
          wide
        >
          <div className="space-y-3.5">
            <PlanForm f={form} setF={setForm} err={fErr} />
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <PBtn
                outline
                onClick={() => {
                  setEditing(null);
                  setFErr({});
                }}
              >
                Cancel
              </PBtn>
              <PBtn onClick={handleEdit}>Save Pricing & Limits</PBtn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
