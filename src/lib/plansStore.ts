import { useState, useEffect } from "react";
import type { AdminPlan } from "../admin/types";
import { DEFAULT_PLANS } from "../admin/types";

export interface FormattedPlan {
  id: string;
  name: string;
  limit: string;
  pondLimit: string;
  farmLimit: number | null;
  farms?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  yearlySaving: number;
  color: string;
  badge: string;
  desc: string;
  status: "Active" | "Inactive";
}

const STORAGE_KEY = "pondtora_admin_plans";

export const EVERY_PLAN_INCLUDES = [
  "Financial Dashboard",
  "Pond Management",
  "Feed Stock",
  "Feeding Records",
  "Fish Stock History",
  "Sales Invoicing",
  "Staff Management",
  "Reports & Analytics",
  "CSV Export",
  "PDF Export",
];

// Helper to format plan metadata for UI display
export function formatPlanForUI(plan: AdminPlan): FormattedPlan {
  const isMulti = (plan.farmLimit ?? 1) > 1 || plan.name.toLowerCase().includes("farm");
  const isStarter = plan.name.toLowerCase() === "starter";
  const isGrowth = plan.name.toLowerCase() === "growth";
  const isCommercial = plan.name.toLowerCase() === "commercial";
  const is3Farm = plan.name.toLowerCase().includes("3-farm");
  const is5Farm = plan.name.toLowerCase().includes("5-farm");
  const isUnlimited = plan.name.toLowerCase().includes("unlimited");

  let badge = "";
  let color = "border-slate-200";

  if (isGrowth || is5Farm) {
    badge = "Popular";
    color = "border-green-500";
  } else if (isCommercial || isUnlimited) {
    badge = "Best Value";
    color = "border-orange-500";
  }

  const pondLimitStr =
    plan.pondLimit === null
      ? "Unlimited active ponds"
      : `Up to ${plan.pondLimit} active ponds`;

  const farmLimitStr =
    plan.farmLimit === null
      ? "Unlimited farms"
      : plan.farmLimit === 1
      ? "1 farm"
      : `Up to ${plan.farmLimit} farms`;

  const calculatedYearly = plan.yearlyPrice > 0 ? plan.yearlyPrice : Math.round(plan.monthlyPrice * 12 * 0.8);
  const saving = Math.round(plan.monthlyPrice * 12 - calculatedYearly);

  return {
    id: plan.id,
    name: plan.name,
    limit: pondLimitStr,
    pondLimit: plan.pondLimit ? `${plan.pondLimit} ponds` : "Unlimited",
    farmLimit: plan.farmLimit,
    farms: farmLimitStr,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: calculatedYearly,
    yearlySaving: Math.max(0, saving),
    color,
    badge,
    desc: plan.description || (isMulti ? `Run ${farmLimitStr} from one account. Unlimited ponds per farm.` : "Full farm management for your aquaculture business."),
    status: plan.status,
  };
}

export function loadStoredPlans(): AdminPlan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PLANS;
}

export function saveStoredPlans(plans: AdminPlan[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    localStorage.setItem("pondtora_custom_plans", JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent("pondtora:plans_updated", { detail: plans }));
  } catch {}
}

/**
 * Custom React Hook that returns the live, reactive plan lists
 * synchronized with Admin pricing changes.
 */
export function useDynamicPlans() {
  const [plans, setPlans] = useState<AdminPlan[]>(loadStoredPlans);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPlans(e.detail);
      } else {
        setPlans(loadStoredPlans());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === "pondtora_custom_plans") {
        setPlans(loadStoredPlans());
      }
    };

    window.addEventListener("pondtora:plans_updated", handleUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("pondtora:plans_updated", handleUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const activePlans = plans.filter(p => p.status === "Active");
  const formatted = activePlans.map(formatPlanForUI);

  const singleFarmPlans = formatted.filter(
    p => (p.farmLimit === null && !p.farms?.includes("farm")) || (p.farmLimit === 1 && !p.name.toLowerCase().includes("farm"))
  );

  const multiFarmPlans = formatted.filter(
    p => (p.farmLimit && p.farmLimit > 1) || p.name.toLowerCase().includes("farm") || p.name.toLowerCase().includes("unlimited")
  );

  return {
    rawPlans: plans,
    activePlans,
    singleFarmPlans: singleFarmPlans.length > 0 ? singleFarmPlans : formatted.slice(0, 3),
    multiFarmPlans: multiFarmPlans.length > 0 ? multiFarmPlans : formatted.slice(3),
    savePlans: (newPlans: AdminPlan[]) => {
      saveStoredPlans(newPlans);
      setPlans(newPlans);
    },
  };
}
