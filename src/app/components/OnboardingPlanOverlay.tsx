import React, { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, Fish, Building2 } from "lucide-react";
import { useDynamicPlans } from "../pricingData";

interface OnboardingPlanOverlayProps {
  currencySymbol?: string;
  onConfirm: (planName: string, farmType: "single" | "multi") => Promise<void> | void;
  loading?: boolean;
}

export default function OnboardingPlanOverlay({
  currencySymbol = "₦",
  onConfirm,
  loading = false,
}: OnboardingPlanOverlayProps) {
  const { singleFarmPlans = [], multiFarmPlans = [] } = useDynamicPlans();
  const [farmType, setFarmType] = useState<"single" | "multi" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleFarmTypeChange = (type: "single" | "multi") => {
    if (type !== farmType) {
      setFarmType(type);
      // Mutually exclusive & clear previously selected plan when switching categories
      setSelectedPlan(null);
    }
  };

  const handlePlanChange = (planName: string) => {
    setSelectedPlan(planName);
  };

  const currentPlans = farmType === "single" ? singleFarmPlans : farmType === "multi" ? multiFarmPlans : [];

  const handleStartTrial = () => {
    if (farmType && selectedPlan && !loading) {
      onConfirm(selectedPlan, farmType);
    }
  };

  const isStartDisabled = !farmType || !selectedPlan || loading;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-['Barlow',sans-serif]">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Badge & Title */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles size={13} className="text-emerald-600" />
            <span>30-Day Free Trial</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Barlow_Condensed',sans-serif] text-slate-900 tracking-wide">
            Your 30-Day Free Trial Starts Here
          </h2>
          <div className="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed space-y-1">
            <p className="font-semibold text-slate-700">How would you like to use your free trial?</p>
            <p>
              Choose the plan that best fits your fish-farming operation. Explore Pondtora free for 30 days before your selected plan&apos;s subscription charges begin.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Step 1: Farm Type Radio Selection */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              1. Select Your Farm Operation Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Single Farm Option */}
              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  farmType === "single"
                    ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="farm-type"
                  value="single"
                  checked={farmType === "single"}
                  onChange={() => handleFarmTypeChange("single")}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    farmType === "single"
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {farmType === "single" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Fish size={14} className={farmType === "single" ? "text-emerald-600" : "text-slate-400"} />
                    <span className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">
                      Single Farm
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    For users managing one fish farm.
                  </p>
                </div>
              </label>

              {/* Multiple Farms Option */}
              <label
                className={`relative flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  farmType === "multi"
                    ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="farm-type"
                  value="multi"
                  checked={farmType === "multi"}
                  onChange={() => handleFarmTypeChange("multi")}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    farmType === "multi"
                      ? "border-emerald-600 bg-emerald-600"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {farmType === "multi" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={14} className={farmType === "multi" ? "text-emerald-600" : "text-slate-400"} />
                    <span className="text-sm font-bold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">
                      Multiple Farms
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    For users managing more than one fish farm.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Step 2: Subscription Plan Radio Selection */}
          {farmType && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                2. Choose Subscription Plan ({farmType === "single" ? "Single Farm" : "Multiple Farms"})
              </label>
              <div className="space-y-2">
                {currentPlans.map((plan) => {
                  const isSelected = selectedPlan === plan.name;
                  const priceFormatted = `${currencySymbol}${plan.monthlyPrice.toLocaleString()}/month`;

                  return (
                    <label
                      key={plan.name}
                      className={`relative flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500"
                          : "border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="radio"
                          name="subscription-plan"
                          value={plan.name}
                          checked={isSelected}
                          onChange={() => handlePlanChange(plan.name)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-600"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm sm:text-base font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif] tracking-wide">
                              {plan.name}
                            </span>
                            {plan.badge && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md leading-none ${
                                  plan.badge === "Popular"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {plan.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {farmType === "single"
                              ? plan.limit || "Up to 5 active ponds"
                              : `${plan.farms || "Multiple Farms"} · Unlimited ponds`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="block text-sm sm:text-base font-extrabold text-slate-900 font-['Barlow_Condensed',sans-serif]">
                          {priceFormatted}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 block">
                          after 30-day trial
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trial terms footnote */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-slate-600">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px] sm:text-xs">
              <strong>Zero charges today.</strong> You can explore all features free for 30 days. Your selected plan&apos;s subscription charges begin only after your trial period ends.
            </p>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={isStartDisabled}
            onClick={handleStartTrial}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer font-['Barlow_Condensed',sans-serif] tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Starting Free Trial…</span>
              </>
            ) : (
              <span>Start Free Trial</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
