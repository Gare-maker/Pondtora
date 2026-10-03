/* Dynamic shared pricing data — synchronized with Admin Portal */
import { formatPlanForUI, loadStoredPlans, FormattedPlan } from "../lib/plansStore";

export { EVERY_PLAN_INCLUDES, useDynamicPlans, formatPlanForUI } from "../lib/plansStore";

export function getDynamicSingleFarmPlans(): FormattedPlan[] {
  try {
    const plans = loadStoredPlans();
    const active = (plans || []).filter(p => p.status === "Active").map(formatPlanForUI);
    const single = active.filter(
      p => (p.farmLimit === null && !p.farms?.includes("farm")) || (p.farmLimit === 1 && !p.name.toLowerCase().includes("farm"))
    );
    return single.length > 0 ? single : active.slice(0, 3);
  } catch {
    return [];
  }
}

export function getDynamicMultiFarmPlans(): FormattedPlan[] {
  try {
    const plans = loadStoredPlans();
    const active = (plans || []).filter(p => p.status === "Active").map(formatPlanForUI);
    const multi = active.filter(
      p => (p.farmLimit && p.farmLimit > 1) || p.name.toLowerCase().includes("farm") || p.name.toLowerCase().includes("unlimited")
    );
    return multi.length > 0 ? multi : active.slice(3);
  } catch {
    return [];
  }
}
/** monthly price → yearly price with 20% discount */
export const yearlyPrice = (mp: number) => Math.round(mp * 12 * 0.8);
/** savings per year */
export const yearlySaving = (mp: number) => Math.round(mp * 12 * 0.2);

