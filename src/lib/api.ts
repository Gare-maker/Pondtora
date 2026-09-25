import { supabase, getAuthToken, getAuthUserId, getAppUrl } from "./supabase";
export { getAppUrl };
import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import type {
  Farm, UserProfile, Pond, StockEvent, FeedItem, FeedingRecord,
  BagOpenLog, FeedRemainingLog, Expense, Revenue, MortalityEntry,
  TreatmentRecord, StaffMember, Report, Customer, PriceGroup,
  Invoice, InvSettings, Investor, Investment, InvestmentPayment, PondReport,
} from "../app/types";
import { INIT_K, INIT_C } from "../app/data";

// Dedicated non-persisting client for background staff auth provisioning
// Guarantees the logged-in owner's session in localStorage is NEVER overwritten
const authStaffCreator = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);


// ── Helpers for UUID & Case Conversion ────────────────────────────────────────

export const isUuid = (id?: string): boolean =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

function getPersistedIdMap(): Map<string, string> {
  try {
    const raw = localStorage.getItem("pondtora_id_map");
    if (raw) return new Map(JSON.parse(raw));
  } catch {}
  return new Map();
}
const idMap = getPersistedIdMap();

function getPersistedRevIdMap(): Map<string, string> {
  try {
    const raw = localStorage.getItem("pondtora_rev_id_map");
    if (raw) return new Map(JSON.parse(raw));
  } catch {}
  return new Map();
}
const revIdMap = getPersistedRevIdMap();

export function toUuid(id?: string): string {
  if (!id || typeof id !== "string") return crypto.randomUUID();
  const trimmed = id.trim();
  if (isUuid(trimmed)) return trimmed;
  if (idMap.has(trimmed)) return idMap.get(trimmed)!;
  const generated = crypto.randomUUID();
  idMap.set(trimmed, generated);
  revIdMap.set(generated, trimmed);
  try {
    localStorage.setItem("pondtora_id_map", JSON.stringify(Array.from(idMap.entries())));
    localStorage.setItem("pondtora_rev_id_map", JSON.stringify(Array.from(revIdMap.entries())));
  } catch {}
  return generated;
}

export function fromUuid(uuid?: string): string {
  if (!uuid) return "";
  return revIdMap.get(uuid) || uuid;
}

export function remapId(oldId: string, newId: string): void {
  if (!oldId || !newId || oldId === newId) return;
  const targetUuid = isUuid(oldId) ? oldId : (idMap.get(oldId) || toUuid(oldId));
  idMap.delete(oldId);
  idMap.set(newId, targetUuid);
  revIdMap.set(targetUuid, newId);
  try {
    localStorage.setItem("pondtora_id_map", JSON.stringify(Array.from(idMap.entries())));
    localStorage.setItem("pondtora_rev_id_map", JSON.stringify(Array.from(revIdMap.entries())));
  } catch {}
}

export function toValidDbDate(d: any, defaultYear = new Date().getFullYear()): string | null {
  if (!d || d === "—" || (typeof d !== "string" && !(d instanceof Date))) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const str = String(d).trim();
  if (!str || str === "—") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Extract from parentheses if any (e.g. "Catfish (2026-08-18)")
  const inner = str.match(/\(([^)]+)\)/);
  const toParse = inner ? inner[1].trim() : str;

  // Check ISO format YYYY-MM-DD
  const iso = toParse.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const m = String(parseInt(iso[2], 10)).padStart(2, "0");
    const day = String(parseInt(iso[3], 10)).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmy = toParse.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    const day = String(parseInt(dmy[1], 10)).padStart(2, "0");
    const m = String(parseInt(dmy[2], 10)).padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${day}`;
  }

  // Strip ordinal suffixes and commas
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const clean = toParse.replace(/(st|nd|rd|th),?/gi, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  if (parts.length >= 2) {
    // Check if parts[0] is month name: "Sep 18" or "September 18 2026"
    const mIdxFirst = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase().slice(0, 3));
    const daySecond = parseInt(parts[1], 10);
    const yearThird = parts[2] && /^\d{4}$/.test(parts[2]) ? parseInt(parts[2], 10) : defaultYear;
    if (mIdxFirst !== -1 && !isNaN(daySecond) && daySecond >= 1 && daySecond <= 31) {
      const mm = String(mIdxFirst + 1).padStart(2, "0");
      const dd = String(daySecond).padStart(2, "0");
      return `${yearThird}-${mm}-${dd}`;
    }

    // Check if parts[0] is day number: "18 Sep" or "18 September 2026"
    const dayFirst = parseInt(parts[0], 10);
    const mIdxSecond = monthNames.findIndex(m => m.toLowerCase() === parts[1].toLowerCase().slice(0, 3));
    const yearThird2 = parts[2] && /^\d{4}$/.test(parts[2]) ? parseInt(parts[2], 10) : defaultYear;
    if (!isNaN(dayFirst) && dayFirst >= 1 && dayFirst <= 31 && mIdxSecond !== -1) {
      const mm = String(mIdxSecond + 1).padStart(2, "0");
      const dd = String(dayFirst).padStart(2, "0");
      return `${yearThird2}-${mm}-${dd}`;
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}

export function isSameDate(d1?: string | null, d2?: string | null): boolean {
  if (!d1 || !d2) return false;
  if (d1 === d2) return true;
  const n1 = toValidDbDate(d1) || d1;
  const n2 = toValidDbDate(d2) || d2;
  if (n1 === n2) return true;
  const sub1 = String(n1).replace(/^\d{4}-/, "");
  const sub2 = String(n2).replace(/^\d{4}-/, "");
  return sub1 === sub2;
}

export function formatDisplayDate(d: any): string {
  if (!d || d === "—") return "—";
  const valid = toValidDbDate(d);
  if (valid) {
    const [, m, day] = valid.split("-").map(Number);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[m - 1]} ${day}`;
  }
  return String(d);
}

const toSnake = (s: string) => s.replace(/([A-Z])/g, "_$1").toLowerCase();
const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

// Custom field mappings
const SNAKE_MAP: Record<string, string> = {
  desc: "description",
  group: "group_key",
  originalDesc: "original_description",
};
const CAMEL_MAP: Record<string, string> = {
  description: "desc",
  group_key: "group",
  original_description: "originalDesc",
};

const DATE_FIELDS = new Set(["date", "purchase_date", "stocking_date", "cleared_date", "invoice_date", "due_date", "start_date", "payment_date", "paid_date", "maturity_date", "report_date"]);

const TABLE_ALLOWED_COLUMNS: Record<string, Set<string>> = {
  investors: new Set([
    "id", "user_id", "farm_id", "full_name", "phone", "email", "status", "notes", "created_at", "updated_at"
  ]),
  investments: new Set([
    "id", "user_id", "investor_id", "farm_id", "pond_id", "fish_stock_id", "investment_name",
    "amount_invested", "investor_percentage", "expected_return", "total_amount_due",
    "payment_method", "duration", "duration_months", "number_of_payments", "monthly_return",
    "amount_received_by_business", "total_investor_value", "principal_repayment",
    "start_date", "due_date", "maturity_date", "payment_type", "payment_frequency", "custom_frequency_desc",
    "status", "notes", "created_at", "updated_at"
  ]),
  investment_payments: new Set([
    "id", "user_id", "farm_id", "investment_id", "due_date", "payment_date", "paid_date", "payment_period",
    "payment_type", "amount_due", "scheduled_amount", "amount_paid", "remaining_amount",
    "payment_method", "status", "notes", "recorded_by",
    "created_at", "updated_at"
  ]),
  pond_reports: new Set([
    "id", "user_id", "farm_id", "pond_id", "fish_stock_id", "report_type",
    "report_date", "issue", "description", "medicine", "cause", "treatment_details",
    "action_taken", "remarks", "notes", "treatment_id", "recorded_by",
    "created_by", "author_id", "author_role", "is_staff_submission",
    "admin_review_note", "admin_review_status", "reviewed_by", "reviewed_at",
    "created_at", "updated_at"
  ]),
  feeding_records: new Set([
    "id", "user_id", "farm_id", "date", "month", "year", "pond", "brand", "size",
    "morning", "evening", "total", "recorded_by", "morning_time", "evening_time",
    "created_by", "created_by_id", "edit_history", "created_at"
  ]),
  staff_members: new Set([
    "id", "user_id", "staff_auth_id", "name", "email", "phone", "role", "status",
    "joined_date", "permissions", "farms", "created_at", "updated_at"
  ]),
  ponds: new Set([
    "id", "user_id", "farm_id", "name", "type", "species", "size_m2", "initial_stock",
    "current_count", "avg_weight", "stocking_date", "stock_month", "total_cost",
    "status", "notes", "default_pellet", "category", "max_kg_by_pallet", "supplier",
    "transfer_note", "length_ft", "width_ft", "created_at"
  ]),
  expenses: new Set([
    "id", "user_id", "farm_id", "category", "amount", "date", "month", "year",
    "pond", "description", "fish_stock", "created_by", "created_by_id",
    "original_description", "edit_history", "created_at"
  ]),
  revenues: new Set([
    "id", "user_id", "farm_id", "source", "amount", "date", "month", "year",
    "notes", "original_notes", "pond", "stock_batch", "fish_stock",
    "created_by", "created_by_id", "edit_history", "created_at"
  ]),
  feed_inventory: new Set([
    "id", "user_id", "farm_id", "brand", "size", "bags", "weight_per_bag",
    "total_kg", "cost_per_bag", "supplier", "purchase_date", "month", "created_at"
  ]),
  bag_open_logs: new Set([
    "id", "user_id", "farm_id", "date", "month", "year", "brand", "size",
    "kg_per_bag", "bags_opened", "total_kg", "fish_stock", "created_at"
  ]),
  feed_remaining_logs: new Set([
    "id", "user_id", "farm_id", "brand", "size", "fish_stock", "remaining_kg", "date", "month", "year", "created_at"
  ]),
  stock_events: new Set([
    "id", "user_id", "pond_id", "farm_id", "pond_name", "date", "species",
    "count", "avg_weight", "cost", "sale_price", "type", "from_pond", "cleared_date", "supplier", "created_at"
  ]),
  mortality_entries: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "count", "cause", "notes", "created_at"
  ]),
  treatment_records: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "cause", "medicine", "details", "action_taken", "remarks", "fish_stock", "recorded_by", "created_at"
  ]),
  farms: new Set([
    "id", "user_id", "name", "city", "state", "country", "created_at", "updated_at"
  ]),
  reports: new Set([
    "id", "user_id", "farm_id", "title", "content", "type", "author", "date",
    "status", "resolved_by", "resolved_date", "tags", "timestamp",
    "created_by_id", "created_by_role", "is_staff_submission",
    "admin_review_note", "admin_review_status", "reviewed_by", "reviewed_at",
    "created_at"
  ]),
  customers: new Set([
    "id", "user_id", "farm_id", "name", "phone", "email", "business_name", "address", "created_at"
  ]),
  price_groups: new Set([
    "id", "user_id", "farm_id", "group_key", "display_name", "description", "price_per_kg", "status", "created_at"
  ]),
  invoices: new Set([
    "id", "user_id", "farm_id", "inv_number", "customer", "pond", "species", "items",
    "discount_type", "subtotal", "discount", "additional_charges", "grand_total",
    "amount_paid", "outstanding", "status", "payment_method", "invoice_date", "due_date",
    "notes", "issued_by", "created_at"
  ]),
  invoice_settings: new Set([
    "user_id", "farm_name", "farm_address", "farm_phone", "farm_email",
    "bank_details", "default_notes", "footer_message", "tax_rate",
    "invoice_prefix", "payment_terms", "updated_at"
  ]),
};

export function objToSnake(obj: Record<string, any>, userId?: string, table?: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const key = SNAKE_MAP[k] || toSnake(k);
    out[key] = v;
  }
  // Ensure user_id is assigned to the effective owner ID so all farm staff share the exact same database
  if (userId && isUuid(userId)) {
    out["user_id"] = userId;
  } else if (!out["user_id"] || !isUuid(out["user_id"])) {
    delete out["user_id"];
  }

  // Normalize date fields to valid ISO date or null to prevent Postgres syntax errors
  for (const [k, v] of Object.entries(out)) {
    if (DATE_FIELDS.has(k)) {
      if (v && typeof v === "string" && v !== "—" && v.trim() !== "") {
        out[k] = toValidDbDate(v) || null;
      } else {
        out[k] = null;
      }
    }
  }

  if (out["id"]) {
    out["id"] = isUuid(out["id"]) ? out["id"] : toUuid(out["id"]);
  }
  if (out["farm_id"] !== undefined) {
    const fid = typeof out["farm_id"] === "string" ? out["farm_id"].trim() : "";
    if (!fid || fid === "—" || fid === "default" || !isUuid(fid)) {
      delete out["farm_id"];
    } else {
      out["farm_id"] = fid;
    }
  }
  if (out["pond_id"] !== undefined) {
    const pid = typeof out["pond_id"] === "string" ? out["pond_id"].trim() : "";
    if (!pid || pid === "—" || pid === "default" || !isUuid(pid)) {
      delete out["pond_id"];
    } else {
      out["pond_id"] = pid;
    }
  }
  if (out["investor_id"] !== undefined) {
    const iid = typeof out["investor_id"] === "string" ? out["investor_id"].trim() : "";
    if (!iid || iid === "—" || iid === "default") {
      delete out["investor_id"];
    } else {
      out["investor_id"] = isUuid(iid) ? iid : (idMap.get(iid) || toUuid(iid));
    }
  }
  if (out["investment_id"] !== undefined) {
    const invId = typeof out["investment_id"] === "string" ? out["investment_id"].trim() : "";
    if (!invId || invId === "—" || invId === "default") {
      delete out["investment_id"];
    } else {
      out["investment_id"] = isUuid(invId) ? invId : (idMap.get(invId) || toUuid(invId));
    }
  }

  // Whitelist columns if table definition exists to prevent Postgres schema rejection
  if (table && TABLE_ALLOWED_COLUMNS[table]) {
    const allowed = TABLE_ALLOWED_COLUMNS[table];
    for (const k of Object.keys(out)) {
      if (!allowed.has(k)) {
        delete out[k];
      }
    }
  }

  return out;
}

export function objToCamel<T = any>(obj: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = CAMEL_MAP[k] || toCamel(k);
    let val = v;
    if (key === "maxKgByPallet" && typeof v === "string") {
      try { val = JSON.parse(v); } catch {}
    }
    out[key] = val;
  }
  return out as T;
}

// ── Local Storage Cache Backup (User-Scoped) ─────────────────────────────────
function getUserCacheKey(userId?: string): string {
  return userId ? `pondtora_${userId}_cache` : "pondtora_anon_cache";
}

function getLocalCache(userId?: string): any {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getUserCacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalCache(data: any, userId?: string) {
  if (!userId) return;
  try {
    const current = getLocalCache(userId) || {};
    const merged: any = { ...current };
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) {
        if (v.length > 0 || !Array.isArray(current[k]) || current[k].length === 0) {
          merged[k] = v;
        }
      } else if (v !== null && v !== undefined) {
        merged[k] = v;
      }
    }
    localStorage.setItem(getUserCacheKey(userId), JSON.stringify(merged));
  } catch (e) {
    console.warn("Failed to update localStorage cache", e);
  }
}

export function clearUserCache(userId?: string) {
  if (!userId) return;
  try {
    localStorage.removeItem(getUserCacheKey(userId));
    const prefix = `pondtora_${userId}_`;
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(prefix)) {
        localStorage.removeItem(k);
      }
    }
  } catch (e) {
    console.warn("Failed to clear user cache", e);
  }
}

// ── Supabase Auth helpers (frontend) ─────────────────────────────────────────
export const auth = {
  signUp: async (opts: {
    email: string;
    password: string;
    name?: string;
    farmName?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    currencySymbol?: string;
    currencyCode?: string;
    activePlan?: string;
    planBilling?: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        emailRedirectTo: `${getAppUrl()}/?verified=true`,
        data: {
          name: opts.name ?? opts.email.split("@")[0],
          farm_name: opts.farmName ?? "My Farm",
          city: opts.city ?? "",
          state: opts.state ?? "",
          country: opts.country ?? "Nigeria",
          phone: opts.phone ?? "",
          currency_symbol: opts.currencySymbol ?? "₦",
          currency_code: opts.currencyCode ?? "NGN",
          role: "owner",
          active_plan: opts.activePlan || "Starter",
          trial_start_date: new Date().toISOString(),
          plan_billing: opts.planBilling || "monthly",
          subscription_status: "trialing",
        },
      },
    });
    if (error) throw error;
    if (opts.activePlan) {
      try {
        localStorage.setItem("pondtora_active_plan", opts.activePlan);
      } catch {}
    }
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("pondtora_") && !k.startsWith("pondtora_admin_") && !k.startsWith("pondtora_custom_plans")) {
          localStorage.removeItem(k);
        }
      }
    } catch {}
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getAppUrl()}/reset-password`,
    });
    if (error) throw error;
  },

  acceptInvite: async (accessToken: string, password: string) => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(accessToken);
    if (error) {
      const { data: ud, error: ue } = await supabase.auth.updateUser({ password });
      if (ue) throw ue;
      return ud;
    }
    const { data: ud, error: ue } = await supabase.auth.updateUser({ password });
    if (ue) throw ue;
    return ud;
  },

  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  },

  getSession: () => supabase.auth.getSession(),

  onAuthStateChange: (callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) =>
    supabase.auth.onAuthStateChange(callback),
};

// ── Generic Table Operations ──────────────────────────────────────────────────

export async function getUserId(): Promise<string> {
  const uid = await getAuthUserId();
  if (uid && isUuid(uid)) return uid;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id && isUuid(user.id)) return user.id;
  } catch {}
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id && isUuid(session.user.id)) return session.user.id;
  } catch {}
  return "";
}

export async function getOwnerUserId(): Promise<string> {
  const currentUid = await getUserId();
  if (!currentUid) return "";

  // 1. Check if user profile has an ownerId or role
  try {
    const raw = localStorage.getItem(`pondtora_${currentUid}_user_profile`);
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.ownerId && isUuid(p.ownerId)) return p.ownerId;
      if (p?.owner_id && isUuid(p.owner_id)) return p.owner_id;
    }
  } catch {}

  // 2. Check auth metadata
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.user_metadata?.owner_id && isUuid(user.user_metadata.owner_id)) {
      return user.user_metadata.owner_id;
    }
  } catch {}

  // 3. Query staff_members table to see if current auth user is a staff of an owner
  try {
    let email = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      email = (session?.user?.email || "").toLowerCase().trim();
    } catch {}

    let q = supabase.from("staff_members").select("user_id, staff_auth_id");
    if (email) {
      q = q.or(`staff_auth_id.eq.${currentUid},email.ilike.${email}`);
    } else {
      q = q.eq("staff_auth_id", currentUid);
    }
    const { data: staffRow } = await q.maybeSingle();

    if (staffRow?.user_id && isUuid(staffRow.user_id)) {
      return staffRow.user_id;
    }
  } catch {}

  return currentUid;
}

export async function getEffectiveFarmId(suggestedFarmId?: string): Promise<string | undefined> {
  if (suggestedFarmId && isUuid(suggestedFarmId) && suggestedFarmId !== "default" && suggestedFarmId !== "—") {
    return suggestedFarmId;
  }
  const currentUid = await getUserId();
  const ownerId = await getOwnerUserId();
  const isStaffCaller = ownerId && ownerId !== currentUid;

  // 1. If staff caller, check their assigned farms first
  if (isStaffCaller && currentUid) {
    try {
      const { data: sfaRows } = await supabase
        .from("staff_farm_assignments")
        .select("farm_id")
        .eq("staff_id", currentUid);
      if (sfaRows && sfaRows.length > 0 && sfaRows[0].farm_id && isUuid(sfaRows[0].farm_id)) {
        const activeStored = localStorage.getItem(`pondtora_${currentUid}_active_farm_id`);
        if (activeStored && sfaRows.some(r => r.farm_id === activeStored)) {
          return activeStored;
        }
        return sfaRows[0].farm_id;
      }
    } catch {}
  }

  // 2. Check local storage for active farm
  if (currentUid) {
    try {
      const activeStored = localStorage.getItem(`pondtora_${currentUid}_active_farm_id`);
      if (activeStored && isUuid(activeStored)) return activeStored;
    } catch {}
  }
  if (ownerId && ownerId !== currentUid) {
    try {
      const activeStored = localStorage.getItem(`pondtora_${ownerId}_active_farm_id`);
      if (activeStored && isUuid(activeStored)) return activeStored;
    } catch {}
  }

  // 3. Try querying farms
  try {
    const targetUserId = ownerId || currentUid;
    const { data: farmRows } = await supabase
      .from("farms")
      .select("id")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (farmRows && farmRows.length > 0 && farmRows[0].id) {
      return farmRows[0].id;
    }
  } catch {}

  return undefined;
}

export const TABLE_FEATURE_MAP: Record<string, string> = {
  expenses: "Financial Dashboard",
  revenues: "Financial Dashboard",
  ponds: "Pond Management",
  stock_events: "Pond Management",
  mortality_entries: "Pond Management",
  treatment_records: "Pond Management",
  feed_inventory: "Feed Stock",
  feeding_records: "Feeding Records",
  bag_open_logs: "Feed Stock",
  feed_remaining_logs: "Feed Stock",
  reports: "Reports",
  pond_reports: "Reports",
  invoices: "Invoices",
  customers: "Invoices",
  price_groups: "Invoices",
  investors: "Investors",
  investments: "Investors",
  investment_payments: "Investors",
};

export async function verifyStaffActionPermission(table: string, action: "canCreate" | "canEdit" | "canDelete"): Promise<void> {
  const currentUid = await getUserId();
  const ownerUid = await getOwnerUserId();
  const isStaffCaller = ownerUid && ownerUid !== currentUid;
  if (!isStaffCaller || !currentUid) return;

  const feature = TABLE_FEATURE_MAP[table];
  if (!feature) return;

  try {
    let staffMemberId: string | null = null;
    const { data: staffRow } = await supabase
      .from("staff_members")
      .select("id")
      .or(`id.eq.${currentUid},staff_auth_id.eq.${currentUid}`)
      .maybeSingle();
    if (staffRow?.id) {
      staffMemberId = staffRow.id;
    }
    const queryStaffId = staffMemberId || currentUid;

    const { data: permRow } = await supabase
      .from("staff_permissions")
      .select("can_create, can_edit, can_delete, can_view")
      .eq("staff_id", queryStaffId)
      .eq("feature", feature)
      .maybeSingle();

    if (permRow) {
      const allowed = action === "canCreate" ? Boolean(permRow.can_create) : action === "canEdit" ? Boolean(permRow.can_edit) : Boolean(permRow.can_delete);
      if (allowed === false) {
        throw new Error(`Unauthorized: You do not have permission to ${action === "canCreate" ? "create" : action === "canEdit" ? "edit" : "delete"} records in ${feature}.`);
      }
    } else {
      throw new Error(`Unauthorized: You do not have permission to ${action === "canCreate" ? "create" : action === "canEdit" ? "edit" : "delete"} records in ${feature}.`);
    }
  } catch (err: any) {
    if (err?.message && err.message.startsWith("Unauthorized")) throw err;
  }
}

export async function verifyFarmAccess(farmId?: string): Promise<void> {
  if (!farmId || !isUuid(farmId)) return;
  const currentUid = await getUserId();
  if (!currentUid) return;
  const ownerUid = await getOwnerUserId();
  const isStaffCaller = ownerUid && ownerUid !== currentUid;

  if (isStaffCaller) {
    let staffMemberId: string | null = null;
    const { data: staffRow } = await supabase
      .from("staff_members")
      .select("id")
      .or(`id.eq.${currentUid},staff_auth_id.eq.${currentUid}`)
      .maybeSingle();
    if (staffRow?.id) {
      staffMemberId = staffRow.id;
    }
    const queryStaffId = staffMemberId || currentUid;

    const { data: sfa } = await supabase
      .from("staff_farm_assignments")
      .select("farm_id")
      .eq("staff_id", queryStaffId)
      .eq("farm_id", farmId)
      .maybeSingle();
    if (!sfa) {
      throw new Error("Unauthorized: You do not have access to this farm.");
    }
  } else {
    const { data: farm } = await supabase
      .from("farms")
      .select("id")
      .eq("id", farmId)
      .eq("user_id", currentUid)
      .maybeSingle();
    if (!farm) {
      throw new Error("Unauthorized: You do not own this farm.");
    }
  }
}

async function dbList<T>(table: string, cacheKey?: string): Promise<T[]> {
  const userId = await getUserId();
  if (!userId) return [];
  const ownerId = await getOwnerUserId();
  const effectiveUserId = ownerId || userId;
  const isStaffCaller = ownerId && ownerId !== userId;

  try {
    let query = supabase.from(table).select("*");

    if (TABLE_ALLOWED_COLUMNS[table]?.has("user_id")) {
      query = query.eq("user_id", effectiveUserId);
    }

    if (table === "farms") {
      if (isStaffCaller) {
        const { data: sfa } = await supabase.from("staff_farm_assignments").select("farm_id").eq("staff_id", userId);
        const fids = (sfa || []).map((r: any) => r.farm_id).filter(isUuid);
        if (fids.length === 0) return [];
        query = query.in("id", fids);
      } else {
        query = query.eq("user_id", userId);
      }
    } else if (table === "staff_members") {
      if (isStaffCaller) {
        query = query.eq("staff_auth_id", userId);
      } else {
        query = query.eq("user_id", userId);
      }
    } else if (isStaffCaller && TABLE_ALLOWED_COLUMNS[table]?.has("farm_id")) {
      const { data: sfa } = await supabase.from("staff_farm_assignments").select("farm_id").eq("staff_id", userId);
      const accessibleFarms = (sfa || []).map((r: any) => r.farm_id).filter(isUuid);
      if (accessibleFarms.length === 0) return [];
      query = query.in("farm_id", accessibleFarms);
    }

    const { data, error } = await query;
    if (error) throw error;
    const items = (data || []).map((r: any) => objToCamel<T>(r));
    if (cacheKey && userId) saveLocalCache({ [cacheKey]: items }, userId);
    if (cacheKey && ownerId && ownerId !== userId) saveLocalCache({ [cacheKey]: items }, ownerId);
    return items;
  } catch (err) {
    console.warn(`Error fetching ${table}:`, err);
    if (cacheKey && (userId || ownerId)) {
      const cached = getLocalCache(userId) || (ownerId ? getLocalCache(ownerId) : null);
      if (cached && cached[cacheKey]) return cached[cacheKey];
    }
    return [];
  }
}

function extractMissingColumn(msg?: string): string | null {
  if (!msg) return null;
  const m1 = msg.match(/Could not find the '([^']+)' column/i);
  if (m1 && m1[1]) return m1[1];
  const m2 = msg.match(/column\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s+does not exist/i);
  if (m2 && m2[1]) return m2[1];
  const m3 = msg.match(/column\s+"?([a-zA-Z0-9_]+)"?\s+of relation/i);
  if (m3 && m3[1]) return m3[1];
  const m4 = msg.match(/null value in column "([^"]+)" of relation/i);
  if (m4 && m4[1]) return m4[1];
  return null;
}

async function dbInsert<T extends { id?: string }>(table: string, item: T, cacheKey?: string): Promise<T> {
  await verifyStaffActionPermission(table, "canCreate");

  const authUid = await getUserId();
  const ownerUid = await getOwnerUserId();
  const effectiveUserId = ownerUid || authUid;

  // Ensure farm_id is always assigned if table expects farm_id
  let itemToSave: any = { ...item };
  if (TABLE_ALLOWED_COLUMNS[table]?.has("farm_id") && (!itemToSave.farmId || !isUuid(itemToSave.farmId))) {
    const effFarmId = await getEffectiveFarmId(itemToSave.farmId);
    if (effFarmId) {
      itemToSave.farmId = effFarmId;
    }
  }

  if (itemToSave.farmId) {
    await verifyFarmAccess(itemToSave.farmId);
  }

  const isStaffCaller = ownerUid && ownerUid !== authUid;
  if (table === "reports" || table === "pond_reports") {
    if (isStaffCaller) {
      itemToSave.createdByRole = "staff";
      itemToSave.authorRole = "staff";
      itemToSave.isStaffSubmission = true;
      itemToSave.createdById = authUid;
      itemToSave.authorId = authUid;
    }
  }

  // Set user_id to effective owner ID so all farm staff share the same data namespace
  const snake = objToSnake(itemToSave as any, effectiveUserId, table);
  if (!snake.id) snake.id = crypto.randomUUID();

  // If table tracks creator (e.g. created_by_id) and not provided, preserve current auth UID
  if (TABLE_ALLOWED_COLUMNS[table]?.has("created_by_id") && !snake.created_by_id && authUid) {
    snake.created_by_id = authUid;
  }

  // Optimistically update local cache scoped to both auth user and owner
  if (cacheKey) {
    if (authUid) {
      const cached = getLocalCache(authUid) || {};
      const list = cached[cacheKey] || [];
      saveLocalCache({ [cacheKey]: [itemToSave, ...list.filter((x: any) => x.id !== itemToSave.id)] }, authUid);
    }
    if (ownerUid && ownerUid !== authUid) {
      const cachedOwner = getLocalCache(ownerUid) || {};
      const listOwner = cachedOwner[cacheKey] || [];
      saveLocalCache({ [cacheKey]: [itemToSave, ...listOwner.filter((x: any) => x.id !== itemToSave.id)] }, ownerUid);
    }
  }

  try {
    let { data, error } = await supabase.from(table).upsert(snake).select().maybeSingle();
    // Auto-heal if columns don't exist in user's Postgres schema (e.g. permissions, farms on staff_members)
    let healAttempts = 0;
    while (error && error.message && healAttempts < 8) {
      const missingCol = extractMissingColumn(error.message);
      if (missingCol && snake[missingCol] !== undefined) {
        healAttempts++;
        console.warn(`Column ${missingCol} does not exist on ${table}, stripping and retrying...`);
        delete snake[missingCol];
        const retry = await supabase.from(table).upsert(snake).select().maybeSingle();
        data = retry.data;
        error = retry.error;
      } else {
        break;
      }
    }
    if (error) {
      console.error(`Supabase upsert into ${table} failed:`, error.message);
      throw error;
    }
    return data ? objToCamel<T>(data) : itemToSave;
  } catch (e) {
    console.error(`Failed to insert into ${table}:`, e);
    throw e;
  }
}

async function dbUpdate<T extends { id?: string }>(table: string, item: T, cacheKey?: string): Promise<T> {
  await verifyStaffActionPermission(table, "canEdit");

  const authUid = await getUserId();
  const ownerUid = await getOwnerUserId();
  const effectiveUserId = ownerUid || authUid;

  let itemToSave: any = { ...item };
  if (TABLE_ALLOWED_COLUMNS[table]?.has("farm_id") && (!itemToSave.farmId || !isUuid(itemToSave.farmId))) {
    const effFarmId = await getEffectiveFarmId(itemToSave.farmId);
    if (effFarmId) {
      itemToSave.farmId = effFarmId;
    }
  }

  if (itemToSave.farmId) {
    await verifyFarmAccess(itemToSave.farmId);
  }

  const snake = objToSnake(itemToSave as any, effectiveUserId, table);
  const targetId = (item.id && isUuid(item.id)) ? item.id : (snake.id || (item.id ? toUuid(item.id) : undefined));
  delete snake.id; // Strip primary key column so Postgres doesn't reject updating PK in SET clause

  // Submitted Staff Report Protection:
  // Once a staff report has been submitted, its original contents are immutable for Admin and staff alike.
  // Only separate review fields may be saved.
  if (table === "reports" || table === "pond_reports") {
    try {
      const { data: existing } = await supabase.from(table).select("*").eq("id", targetId).maybeSingle();
      if (existing) {
        const isStaffSubmission = existing.created_by_role === "staff" || existing.author_role === "staff" || existing.is_staff_submission === true || (existing.author && existing.author !== "Admin" && existing.created_by_id && existing.created_by_id !== authUid);
        if (isStaffSubmission) {
          const allowedAdminFields = new Set(["review_status", "admin_review_note", "reviewed_by", "reviewed_at"]);
          for (const key of Object.keys(snake)) {
            if (!allowedAdminFields.has(key) && snake[key] !== existing[key] && snake[key] !== undefined) {
              throw new Error("Submitted staff reports are official submitted records and cannot be edited.");
            }
          }
        }
      }
    } catch (err: any) {
      if (err?.message && err.message.includes("official submitted records")) throw err;
    }
  }

  // Update local cache scoped to current user and owner
  if (cacheKey) {
    if (authUid) {
      const cached = getLocalCache(authUid) || {};
      const list = cached[cacheKey] || [];
      saveLocalCache({ [cacheKey]: list.map((x: any) => (x.id === item.id || x.id === targetId ? { ...x, ...itemToSave } : x)) }, authUid);
    }
    if (ownerUid && ownerUid !== authUid) {
      const cachedOwner = getLocalCache(ownerUid) || {};
      const listOwner = cachedOwner[cacheKey] || [];
      saveLocalCache({ [cacheKey]: listOwner.map((x: any) => (x.id === item.id || x.id === targetId ? { ...x, ...itemToSave } : x)) }, ownerUid);
    }
  }

  try {
    if (targetId) {
      let updateQuery = supabase.from(table).update(snake).eq("id", targetId);
      if (TABLE_ALLOWED_COLUMNS[table]?.has("user_id")) {
        updateQuery = updateQuery.eq("user_id", effectiveUserId);
      }
      let { data, error } = await updateQuery.select().maybeSingle();
      let healAttempts = 0;
      while (error && error.message && healAttempts < 8) {
        const missingCol = extractMissingColumn(error.message);
        if (missingCol && snake[missingCol] !== undefined) {
          healAttempts++;
          console.warn(`Column ${missingCol} does not exist on ${table}, stripping and retrying update...`);
          delete snake[missingCol];
          let retryQuery = supabase.from(table).update(snake).eq("id", targetId);
          if (TABLE_ALLOWED_COLUMNS[table]?.has("user_id")) {
            retryQuery = retryQuery.eq("user_id", effectiveUserId);
          }
          const retry = await retryQuery.select().maybeSingle();
          data = retry.data;
          error = retry.error;
        } else {
          break;
        }
      }
      if (!data && !error) {
        // Row might not exist in Supabase yet (saved locally) — insert/upsert it with ownership
        snake.user_id = effectiveUserId;
        const upsertRes = await supabase.from(table).upsert({ ...snake, id: targetId }).select().maybeSingle();
        data = upsertRes.data;
        error = upsertRes.error;
      }
      if (error) {
        console.error(`Supabase update in ${table} failed:`, error.message);
        throw error;
      }
      return data ? objToCamel<T>(data) : itemToSave;
    }
    return itemToSave;
  } catch (e) {
    console.error(`Failed to update ${table}:`, e);
    throw e;
  }
}

const TABLE_STORAGE_KEY_MAP: Record<string, string> = {
  feed_inventory: "inventory",
  feeding_records: "feeding",
  bag_open_logs: "bag_logs",
  feed_remaining_logs: "remain_logs",
  mortality_entries: "mortality",
  treatment_records: "treatments",
  staff_members: "staff",
  stock_events: "stock_events",
  reports: "reports",
  pond_reports: "pond_reports",
  invoices: "invoices",
  price_groups: "price_groups",
  customers: "customers",
  investors: "investors",
  investments: "investments",
  investment_payments: "investment_payments",
  ponds: "ponds",
  farms: "farms",
  expenses: "expenses",
  revenues: "revenues",
};

async function dbDelete(table: string, id: string, cacheKey?: string): Promise<{ success: boolean }> {
  await verifyStaffActionPermission(table, "canDelete");

  const userId = await getUserId();
  const ownerId = await getOwnerUserId();
  const effectiveUserId = ownerId || userId;
  if (!effectiveUserId) throw new Error("Unauthorized: No authenticated user session.");
  const targetId = isUuid(id) ? id : (idMap.get(id) || toUuid(id));

  // Staff report protection: submitted staff reports cannot be destroyed
  if (table === "reports" || table === "pond_reports") {
    try {
      const { data: existing } = await supabase.from(table).select("*").eq("id", targetId).maybeSingle();
      if (existing) {
        const isStaffSubmission = existing.created_by_role === "staff" || existing.author_role === "staff" || existing.is_staff_submission === true || (existing.author && existing.author !== "Admin" && existing.created_by_id && existing.created_by_id !== userId);
        if (isStaffSubmission) {
          throw new Error("Submitted staff reports are official records and cannot be deleted.");
        }
      }
    } catch (err: any) {
      if (err?.message && err.message.includes("official records")) throw err;
    }
  }

  try {
    // Delete strictly by primary key id (UUID)
    const { error } = await supabase.from(table).delete().eq("id", targetId);
    if (error) {
      console.error(`Supabase delete from ${table} failed:`, error.message);
      throw new Error(error.message || `Failed to delete from ${table}`);
    }

    // Update local cache scoped to current user and owner on successful deletion
    const updateCacheForUid = (uid: string) => {
      if (cacheKey) {
        const cached = getLocalCache(uid) || {};
        const list = cached[cacheKey] || [];
        saveLocalCache({ [cacheKey]: list.filter((x: any) => x.id !== id && x.id !== targetId) }, uid);
      }
      const keysToClean = new Set([table, TABLE_STORAGE_KEY_MAP[table]].filter(Boolean));
      keysToClean.forEach(k => {
        try {
          const directKey = `pondtora_${uid}_${k}`;
          const direct = localStorage.getItem(directKey);
          if (direct) {
            const parsed = JSON.parse(direct);
            if (Array.isArray(parsed)) {
              localStorage.setItem(directKey, JSON.stringify(parsed.filter((x: any) => x.id !== id && x.id !== targetId)));
            }
          }
        } catch {}
      });
    };

    if (userId) updateCacheForUid(userId);
    if (ownerId && ownerId !== userId) updateCacheForUid(ownerId);

    return { success: true };
  } catch (e: any) {
    console.error(`Failed to delete from ${table}:`, e);
    throw e;
  }
}

// ── Main API Client ───────────────────────────────────────────────────────────

export const api = {
  setup: async () => ({ sql: "" }),
  autoSetup: async () => ({ success: true }),
  clearUserCache,

  me: async () => {
    const userId = await getUserId();
    if (!userId) return { profile: null, farms: [], staffInfo: null, isStaff: false };

    let userEmail = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      userEmail = (session?.user?.email || "").toLowerCase().trim();
    } catch {}

    const [profRes, farmsRes, staffRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("farms").select("*").eq("user_id", userId),
      supabase.from("staff_members").select("*").or(`staff_auth_id.eq.${userId},email.ilike.${userEmail || userId}`).maybeSingle(),
    ]);

    const profile = profRes.data ? objToCamel<UserProfile>(profRes.data) : null;
    let farms = (farmsRes.data || []).map(f => objToCamel<Farm>(f));
    const isStaff = !!staffRes.data || profile?.role === "staff";

    // If staff member, resolve only explicitly assigned farms
    if (isStaff && staffRes.data) {
      const staffData = staffRes.data;
      const targetFarmIds = new Set<string>();
      if (Array.isArray(staffData.farms)) {
        staffData.farms.forEach((id: string) => { if (isUuid(id)) targetFarmIds.add(id); });
      }
      try {
        const { data: sfaRows } = await supabase.from("staff_farm_assignments").select("farm_id").eq("staff_id", staffData.id);
        (sfaRows || []).forEach((r: any) => { if (r.farm_id && isUuid(r.farm_id)) targetFarmIds.add(r.farm_id); });
      } catch {}

      if (targetFarmIds.size > 0) {
        const { data: assignedFarms } = await supabase.from("farms").select("*").in("id", Array.from(targetFarmIds));
        farms = (assignedFarms || []).map(f => objToCamel<Farm>(f));
      } else {
        farms = [];
      }

      // Unconditionally ensure staff_auth_id and Active status are synced for logged-in staff member
      if (userId) {
        supabase.from("staff_members").update({ staff_auth_id: userId, status: "Active" }).eq("id", staffData.id).then();
      }
    }

    return { profile, farms, staffInfo: staffRes.data || null, isStaff };
  },

  // Bulk load all user data from Supabase directly — strictly scoped to authenticated user & assigned farms
  loadAll: async () => {
    const userId = await getUserId();
    if (!userId) {
      return {
        needsSetup: false,
        farms: [], userProfiles: [], ponds: [], stockEvents: [],
        feedInventory: [], feedingRecords: [], bagOpenLogs: [], feedRemainingLogs: [],
        expenses: [], revenues: [], mortalityEntries: [], treatmentRecords: [],
        staffMembers: [], reports: [], customers: [], priceGroups: [],
        invoices: [], invoiceSettings: null, knowledgeQuestions: [],
        compatibilityQuestions: [], knowledgeResults: [], compatibilityResults: [],
        investors: [], investments: [], investmentPayments: [], pondReports: [],
        staffInfo: null, isStaff: false,
      };
    }
    const cached = getLocalCache(userId);

    try {
      const safeQuery = async (queryPromise: PromiseLike<any>) => {
        try {
          const res = await queryPromise;
          return res.error ? { data: null, error: res.error } : res;
        } catch (e) {
          return { data: null, error: e };
        }
      };

      // 1. First fetch profile to know current user email and role
      const [profilesRes, currentStaffRes] = await Promise.all([
        safeQuery(supabase.from("user_profiles").select("*").eq("id", userId)),
        safeQuery(supabase.from("staff_members").select("*").eq("staff_auth_id", userId).maybeSingle()),
      ]);

      const userProfilesList = (profilesRes?.data || []).map((r: any) => objToCamel<UserProfile>(r));
      let userEmail = (userProfilesList[0]?.email || "").toLowerCase().trim();
      if (!userEmail) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          userEmail = (session?.user?.email || "").toLowerCase().trim();
        } catch {}
      }

      let staffMember = currentStaffRes?.data ? objToCamel<StaffMember>(currentStaffRes.data) : null;
      if (!staffMember && userEmail) {
        const { data: directStaff } = await safeQuery(
          supabase.from("staff_members").select("*").ilike("email", userEmail).maybeSingle()
        );
        if (directStaff) staffMember = objToCamel<StaffMember>(directStaff);
      }

      const isStaff = !!staffMember && userProfilesList[0]?.role !== "owner" && userProfilesList[0]?.role !== "admin" && userProfilesList[0]?.role !== "superadmin";

      let farms: Farm[] = [];
      let accessibleFarmIds: string[] = [];
      let effectiveOwnerId = userId;
      let staffPermsMap: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {};

      if (isStaff && staffMember) {
        effectiveOwnerId = staffMember.userId || userId;
        // Unconditionally sync staff_auth_id
        supabase.from("staff_members").update({ staff_auth_id: userId, status: "Active" }).eq("id", staffMember.id).then();
        staffMember.staffAuthId = userId;
        staffMember.status = "Active";

        // Resolve assigned farms for staff
        const targetFarmIds = new Set<string>();
        if (Array.isArray(staffMember.farms)) {
          staffMember.farms.forEach((fid: string) => { if (fid && isUuid(fid)) targetFarmIds.add(fid); });
        }
        const { data: sfaRows } = await safeQuery(supabase.from("staff_farm_assignments").select("farm_id").eq("staff_id", staffMember.id));
        (sfaRows || []).forEach((a: any) => {
          if (a.farm_id && isUuid(a.farm_id)) targetFarmIds.add(a.farm_id);
        });

        if (targetFarmIds.size > 0) {
          const { data: assignedFarms } = await safeQuery(
            supabase.from("farms").select("*").in("id", Array.from(targetFarmIds))
          );
          farms = (assignedFarms || []).map((f: any) => objToCamel<Farm>(f));
        } else {
          farms = [];
        }

        // Query permissions for this staff member
        const { data: sPermRows } = await safeQuery(supabase.from("staff_permissions").select("*").eq("staff_id", staffMember.id));
        if (sPermRows && sPermRows.length > 0) {
          (sPermRows || []).forEach((p: any) => {
            staffPermsMap[p.feature] = {
              canView: p.can_view ?? true,
              canCreate: Boolean(p.can_create),
              canEdit: Boolean(p.can_edit),
              canDelete: Boolean(p.can_delete),
            };
          });
        } else if (staffMember.staffPermissions && Object.keys(staffMember.staffPermissions).length > 0) {
          Object.assign(staffPermsMap, staffMember.staffPermissions);
        } else if (Array.isArray(staffMember.permissions) && staffMember.permissions.length > 0) {
          staffMember.permissions.forEach((feat: string) => {
            staffPermsMap[feat] = {
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
            };
          });
        }
        staffMember.staffPermissions = staffPermsMap;
        if (Object.keys(staffPermsMap).length > 0) {
          staffMember.permissions = Object.keys(staffPermsMap).filter(k => staffPermsMap[k].canView);
        }
      } else {
        // OWNER: Strictly fetch farms owned by this user
        const { data: ownerFarms } = await safeQuery(
          supabase.from("farms").select("*").eq("user_id", userId).order("created_at", { ascending: true })
        );
        farms = (ownerFarms || []).map((f: any) => objToCamel<Farm>(f));
      }

      accessibleFarmIds = farms.map(f => f.id).filter(isUuid);
      const canStaffView = (feat: string): boolean => !isStaff || (staffPermsMap[feat]?.canView ?? true);

      // 2. Query datasets strictly scoped to effectiveOwnerId and accessibleFarmIds
      const farmScope = (tbl: string) => {
        let q = supabase.from(tbl).select("*").eq("user_id", effectiveOwnerId);
        if (isStaff) {
          if (accessibleFarmIds.length === 0) return Promise.resolve({ data: [] });
          q = q.in("farm_id", accessibleFarmIds);
        }
        return safeQuery(q);
      };

      const [
        pondsRes, stockRes, invRes, feedRes,
        bagRes, remainRes, expRes, revRes, mortRes, treatRes,
        staffRes, farmAssignRes, staffPermRes, repRes, custRes, pgRes, invsRes, setRes,
        kqRes, cqRes, krRes, crRes,
        investorsRes, investmentsRes, invPayRes, pondRepRes
      ] = await Promise.all([
        canStaffView("Pond Management") ? farmScope("ponds") : Promise.resolve({ data: [] }),
        canStaffView("Pond Management") ? farmScope("stock_events") : Promise.resolve({ data: [] }),
        canStaffView("Feed Stock") ? farmScope("feed_inventory") : Promise.resolve({ data: [] }),
        canStaffView("Feeding Records") ? farmScope("feeding_records") : Promise.resolve({ data: [] }),
        canStaffView("Feed Stock") ? farmScope("bag_open_logs") : Promise.resolve({ data: [] }),
        canStaffView("Feed Stock") ? farmScope("feed_remaining_logs") : Promise.resolve({ data: [] }),
        canStaffView("Financial Dashboard") ? farmScope("expenses") : Promise.resolve({ data: [] }),
        canStaffView("Financial Dashboard") ? farmScope("revenues") : Promise.resolve({ data: [] }),
        canStaffView("Pond Management") ? farmScope("mortality_entries") : Promise.resolve({ data: [] }),
        canStaffView("Pond Management") ? farmScope("treatment_records") : Promise.resolve({ data: [] }),
        !isStaff ? safeQuery(supabase.from("staff_members").select("*").eq("user_id", userId)) : Promise.resolve({ data: staffMember ? [staffMember] : [] }),
        !isStaff && accessibleFarmIds.length > 0 ? safeQuery(supabase.from("staff_farm_assignments").select("*").in("farm_id", accessibleFarmIds)) : Promise.resolve({ data: [] }),
        !isStaff ? safeQuery(supabase.from("staff_permissions").select("*")) : Promise.resolve({ data: [] }),
        canStaffView("Reports") ? farmScope("reports") : Promise.resolve({ data: [] }),
        canStaffView("Invoices") ? farmScope("customers") : Promise.resolve({ data: [] }),
        canStaffView("Invoices") ? farmScope("price_groups") : Promise.resolve({ data: [] }),
        canStaffView("Invoices") ? farmScope("invoices") : Promise.resolve({ data: [] }),
        safeQuery(supabase.from("invoice_settings").select("*").eq("user_id", effectiveOwnerId)),
        safeQuery(supabase.from("knowledge_questions").select("*")),
        safeQuery(supabase.from("compatibility_questions").select("*")),
        safeQuery(supabase.from("knowledge_results").select("*")),
        safeQuery(supabase.from("compatibility_results").select("*")),
        canStaffView("Investors") ? farmScope("investors") : Promise.resolve({ data: [] }),
        canStaffView("Investors") ? farmScope("investments") : Promise.resolve({ data: [] }),
        canStaffView("Investors") ? farmScope("investment_payments") : Promise.resolve({ data: [] }),
        canStaffView("Reports") ? farmScope("pond_reports") : Promise.resolve({ data: [] }),
      ]);

      const extract = <T,>(res: any, cacheKey: string, mapper: (r: any) => T): T[] => {
        if (res && !res.error && Array.isArray(res.data)) {
          return res.data.map(mapper);
        }
        if (res?.error) {
          console.warn(`Error extracting ${cacheKey}:`, res.error);
        }
        if (cached && Array.isArray(cached[cacheKey]) && cached[cacheKey].length > 0 && res?.error) {
          return cached[cacheKey];
        }
        return (res?.data || []).map(mapper);
      };

      // Build staff list
      let staffList: StaffMember[] = [];
      if (!isStaff) {
        const rawStaffList = (staffRes?.data || []).map((r: any) => objToCamel<StaffMember>(r));
        const cachedStaff = ((cached?.staffMembers || []) as StaffMember[]);
        const serverStaffIds = new Set(rawStaffList.map((s: any) => s.id));
        const serverStaffEmails = new Set(rawStaffList.map((s: any) => (s.email || "").toLowerCase().trim()));
        const pendingCachedStaff = cachedStaff.filter(
          cs => cs?.id && !serverStaffIds.has(cs.id) && !serverStaffEmails.has((cs.email || "").toLowerCase().trim())
        );
        const combinedStaffRaw = [...rawStaffList, ...pendingCachedStaff];

        staffList = combinedStaffRaw.map((s: any) => {
          const sFarms = (farmAssignRes?.data || []).filter((a: any) => a.staff_id === s.id).map((a: any) => a.farm_id);
          const sPermRows = (staffPermRes?.data || []).filter((p: any) => p.staff_id === s.id);
          const sPerms = sPermRows.filter((p: any) => p.can_view ?? true).map((p: any) => p.feature);
          const sStaffPerms: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> = {};
          sPermRows.forEach((p: any) => {
            sStaffPerms[p.feature] = {
              canView: p.can_view ?? true,
              canCreate: Boolean(p.can_create),
              canEdit: Boolean(p.can_edit),
              canDelete: Boolean(p.can_delete),
            };
          });
          const cachedStaffItem = cachedStaff.find((c: any) => c.id === s.id);
          const resolvedFarms = (s.farms && s.farms.length > 0) ? s.farms : (sFarms.length > 0 ? sFarms : (cachedStaffItem?.farms || []));
          const resolvedStaffPerms = (Object.keys(sStaffPerms).length > 0)
            ? sStaffPerms
            : ((s.staffPermissions && Object.keys(s.staffPermissions).length > 0) ? s.staffPermissions : (cachedStaffItem?.staffPermissions || {}));
          const resolvedPerms = (sPerms.length > 0)
            ? sPerms
            : ((s.permissions && s.permissions.length > 0) ? s.permissions : (cachedStaffItem?.permissions || []));
          return {
            ...s,
            status: s.status || "Pending",
            farms: resolvedFarms,
            permissions: resolvedPerms,
            staffPermissions: resolvedStaffPerms,
          };
        });
      } else if (staffMember) {
        staffList = [staffMember];
      }

      // Resolve invoice settings
      let resolvedInvSettings: InvSettings | null = null;
      if (setRes && Array.isArray(setRes.data) && setRes.data.length > 0) {
        const matching = setRes.data.find((s: any) => s.user_id === effectiveOwnerId) || setRes.data[0];
        if (matching) resolvedInvSettings = objToCamel<InvSettings>(matching);
      } else if (setRes?.data && !Array.isArray(setRes.data)) {
        resolvedInvSettings = objToCamel<InvSettings>(setRes.data);
      }
      if (!resolvedInvSettings && cached?.invoiceSettings) {
        resolvedInvSettings = cached.invoiceSettings;
      }

      // Safe auto-heal: ONLY update rows belonging to this effective owner
      const primaryFarm = farms[0];
      if (primaryFarm?.id && isUuid(primaryFarm.id)) {
        const pFid = primaryFarm.id;
        const tablesToHeal = [
          "ponds", "stock_events", "feed_inventory", "feeding_records", "bag_open_logs",
          "feed_remaining_logs", "expenses", "revenues", "mortality_entries", "treatment_records",
          "reports", "customers", "price_groups", "invoices", "investors", "investments", "pond_reports"
        ];
        Promise.all(tablesToHeal.map(tbl =>
          supabase.from(tbl).update({ farm_id: pFid }).eq("user_id", effectiveOwnerId).is("farm_id", null).then()
        )).catch(() => {});
      }

      const result = {
        needsSetup: false,
        farms,
        userProfiles: (profilesRes && !profilesRes.error && Array.isArray(profilesRes.data)) ? userProfilesList : (cached?.userProfiles || []),
        ponds: extract<Pond>(pondsRes, "ponds", (r: any) => objToCamel<Pond>(r)),
        stockEvents: extract<StockEvent>(stockRes, "stockEvents", (r: any) => objToCamel<StockEvent>(r)),
        feedInventory: extract<FeedItem>(invRes, "feedInventory", (r: any) => objToCamel<FeedItem>(r)),
        feedingRecords: extract<FeedingRecord>(feedRes, "feedingRecords", (r: any) => objToCamel<FeedingRecord>(r)),
        bagOpenLogs: extract<BagOpenLog>(bagRes, "bagOpenLogs", (r: any) => objToCamel<BagOpenLog>(r)),
        feedRemainingLogs: extract<FeedRemainingLog>(remainRes, "feedRemainingLogs", (r: any) => objToCamel<FeedRemainingLog>(r)),
        expenses: extract<Expense>(expRes, "expenses", (r: any) => objToCamel<Expense>(r)),
        revenues: extract<Revenue>(revRes, "revenues", (r: any) => objToCamel<Revenue>(r)),
        mortalityEntries: extract<MortalityEntry>(mortRes, "mortalityEntries", (r: any) => objToCamel<MortalityEntry>(r)),
        treatmentRecords: extract<TreatmentRecord>(treatRes, "treatmentRecords", (r: any) => objToCamel<TreatmentRecord>(r)),
        staffMembers: staffList,
        reports: extract<Report>(repRes, "reports", (r: any) => objToCamel<Report>(r)),
        customers: extract<Customer>(custRes, "customers", (r: any) => objToCamel<Customer>(r)),
        priceGroups: extract<PriceGroup>(pgRes, "priceGroups", (r: any) => objToCamel<PriceGroup>(r)),
        invoices: extract<Invoice>(invsRes, "invoices", (r: any) => objToCamel<Invoice>(r)),
        invoiceSettings: resolvedInvSettings,
        knowledgeQuestions: extract(kqRes, "knowledgeQuestions", (r: any) => objToCamel(r)),
        compatibilityQuestions: extract(cqRes, "compatibilityQuestions", (r: any) => objToCamel(r)),
        knowledgeResults: extract(krRes, "knowledgeResults", (r: any) => objToCamel(r)),
        compatibilityResults: extract(crRes, "compatibilityResults", (r: any) => objToCamel(r)),
        investors: extract<Investor>(investorsRes, "investors", (r: any) => objToCamel<Investor>(r)),
        investments: extract<Investment>(investmentsRes, "investments", (r: any) => objToCamel<Investment>(r)),
        investmentPayments: extract<InvestmentPayment>(invPayRes, "investmentPayments", (r: any) => objToCamel<InvestmentPayment>(r)),
        pondReports: extract<PondReport>(pondRepRes, "pondReports", (r: any) => objToCamel<PondReport>(r)),
        staffInfo: staffMember || null,
        isStaff: !!staffMember,
      };

      saveLocalCache(result, userId);
      return result;
    } catch (err) {
      console.warn("Direct Supabase loadAll failed, returning cache if available:", err);
      if (cached) return cached;
      throw err;
    }
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  profile: {
    update: async (p: Partial<UserProfile>) => {
      const userId = await getUserId();
      if (!userId) return p as UserProfile;
      const snake = objToSnake(p as any);
      const { data } = await supabase.from("user_profiles").update(snake).eq("id", userId).select().single();
      return data ? objToCamel<UserProfile>(data) : (p as UserProfile);
    },
    updatePlan: async (plan: string, trialStartDate?: string) => {
      const userId = await getUserId();
      if (!userId) return {} as UserProfile;
      const payload: any = { active_plan: plan };
      if (trialStartDate) payload.trial_start_date = trialStartDate;
      const { data } = await supabase.from("user_profiles").update(payload).eq("id", userId).select().single();
      return data ? objToCamel<UserProfile>(data) : ({} as UserProfile);
    },
  },

  // ── Farms ──────────────────────────────────────────────────────────────────
  farms: {
    list: () => dbList<Farm>("farms", "farms"),
    create: (f: Partial<Farm>) => dbInsert<Farm>("farms", f as Farm, "farms"),
    update: async (f: Farm) => {
      const userId = await getUserId();
      if (userId && f.userId && f.userId !== userId) {
        throw new Error("You do not have permission to update this farm.");
      }
      return dbUpdate<Farm>("farms", f, "farms");
    },
    remove: async (id: string) => {
      const userId = await getUserId();
      if (userId) {
        const { data: farm } = await supabase.from("farms").select("user_id").eq("id", id).maybeSingle();
        if (farm && farm.user_id && farm.user_id !== userId) {
          throw new Error("You do not have permission to delete this farm.");
        }
      }
      return dbDelete("farms", id, "farms");
    },
    syncActiveFarm: async (farmId: string) => {
      try {
        await supabase.auth.updateUser({ data: { active_farm_id: farmId } });
      } catch (err) {
        console.warn("Failed to sync active_farm_id to auth metadata:", err);
      }
    },
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  staff: {
    list: () => dbList<StaffMember>("staff_members", "staffMembers"),
    checkEmailExists: async (email: string, currentOwnerId?: string, excludeStaffId?: string): Promise<{ exists: boolean; reason?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return { exists: false };

      // 1. Try RPC check if available in Supabase (SECURITY DEFINER allows looking up across all accounts)
      try {
        const { data, error } = await supabase.rpc("check_email_exists", { lookup_email: cleanEmail });
        if (!error && typeof data === "boolean" && data === true) {
          if (!excludeStaffId) {
            return { exists: true, reason: "This email is already associated to an account or to a farm." };
          }
        }
      } catch (e) {
        // RPC might not be deployed yet in remote DB, fallback safely
      }

      // 2. Query edge function check endpoint if available
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fegtvgfkxueorybefthj.supabase.co"}/functions/v1/make-server-1da59a07/check-email?email=${encodeURIComponent(cleanEmail)}`;
        const res = await fetch(edgeUrl, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.exists && !excludeStaffId) {
            return { exists: true, reason: json.reason || "This email is already associated to an account or to a farm." };
          }
        }
      } catch {}

      // 3. Query user_profiles directly
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, email, role")
          .ilike("email", cleanEmail)
          .limit(1);
        if (!error && data && data.length > 0) {
          if (data[0].role === "owner") {
            return { exists: true, reason: "This email belongs to a farm owner account." };
          }
          if (!excludeStaffId) {
            return { exists: true, reason: "This email is already associated to an account or to a farm." };
          }
        }
      } catch {}

      // 4. Query staff_members directly
      try {
        let query = supabase
          .from("staff_members")
          .select("id, email, user_id")
          .ilike("email", cleanEmail);
        if (excludeStaffId) {
          query = query.neq("id", excludeStaffId);
        }
        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          return { exists: true, reason: "A staff member with this email already exists." };
        }
      } catch {}

      // 5. Query cached local admin users only if offline or DB was unreachable
      return { exists: false };
    },
    resendInvite: async (s: {
      id?: string;
      email: string;
      name?: string;
      role?: string;
      farms?: string[];
      permissions?: string[];
      appUrl?: string;
    }) => {
      const cleanEmail = s.email.trim().toLowerCase();
      const loginUrl = (s.appUrl && s.appUrl.trim()) ? s.appUrl.trim() : getAppUrl();
      const userId = await getUserId();
      let emailSent = false;
      let emailError: string | null = null;

      // 1. Try backend edge function (runs with SUPABASE_SERVICE_ROLE_KEY)
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fegtvgfkxueorybefthj.supabase.co"}/functions/v1/make-server-1da59a07/staff-members/resend-invite`;
        const edgeRes = await fetch(edgeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
          },
          body: JSON.stringify({
            email: cleanEmail,
            appUrl: loginUrl,
            staffId: s.id,
          }),
        });
        if (edgeRes.ok) {
          const edgeData = await edgeRes.json();
          if (edgeData.emailSent || edgeData.success) {
            emailSent = true;
          }
        }
      } catch (edgeErr) {
        console.warn("Edge function resend-invite failed, falling back to auth client:", edgeErr);
      }

      // 2. Primary fallback: Resend email confirmation link (type: "signup")
      if (!emailSent) {
        try {
          const { error: resendErr } = await authStaffCreator.auth.resend({
            type: "signup",
            email: cleanEmail,
            options: {
              emailRedirectTo: `${loginUrl}/create-password`,
            },
          });

          if (!resendErr) {
            emailSent = true;
          } else {
            // 3. Secondary fallback: Password reset / create link
            const { error: resetErr } = await authStaffCreator.auth.resetPasswordForEmail(cleanEmail, {
              redirectTo: `${loginUrl}/create-password`,
            });
            if (!resetErr) {
              emailSent = true;
            } else {
              // 4. Invite resend
              const { error: inviteResendErr } = await authStaffCreator.auth.resend({
                type: "invite",
                email: cleanEmail,
                options: {
                  emailRedirectTo: `${loginUrl}/create-password`,
                },
              });
              if (!inviteResendErr) {
                emailSent = true;
              } else {
                emailError = resendErr.message || resetErr.message || inviteResendErr.message;
              }
            }
          }
        } catch (err: any) {
          try {
            const { error: resetErr } = await authStaffCreator.auth.resetPasswordForEmail(cleanEmail, {
              redirectTo: `${loginUrl}/create-password`,
            });
            if (!resetErr) {
              emailSent = true;
            } else {
              emailError = err?.message || resetErr?.message || "Could not send verification email";
            }
          } catch (e: any) {
            emailError = e?.message || err?.message || "Could not send verification email";
          }
        }
      }

      // 5. Renew staff_invitations record
      try {
        if (s.id) {
          await supabase.from("staff_invitations").upsert({
            staff_id: s.id,
            email: cleanEmail,
            invited_by: userId || null,
            status: "pending",
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "staff_id" }).catch(() => {});
        }
      } catch {}

      return { success: emailSent, emailSent, emailError };
    },
    invite: async (opts: {
      id?: string;
      email: string;
      password?: string;
      name?: string;
      phone?: string;
      role?: string;
      farms?: string[];
      permissions?: string[];
      staffPermissions?: Record<string, { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }>;
      farmName?: string;
      appUrl?: string;
    }) => {
      const cleanEmail = opts.email.trim().toLowerCase();
      const userId = await getUserId();

      // Check duplicate email (exempt current staff member when resending or editing)
      const existing = await api.staff.checkEmailExists(cleanEmail, userId, opts.id);
      if (existing.exists) {
        throw new Error(existing.reason || "This email is already associated to an account or to a farm.");
      }

      const appUrl = (opts.appUrl && opts.appUrl.trim()) ? opts.appUrl.trim() : getAppUrl();
      const loginUrl = appUrl;
      const staffId = (opts.id && isUuid(opts.id)) ? opts.id : crypto.randomUUID();
      let staffAuthId: string | undefined = undefined;
      let emailSent = false;
      let emailError: string | null = null;

      // 1. Primary path: Supabase GoTrue Auth signUp
      // Uses authStaffCreator (isolated Supabase client with persistSession: false)
      // to ensure the logged-in owner session is NEVER compromised.
      const staffPassword = (opts.password && opts.password.trim().length >= 6)
        ? opts.password.trim()
        : `Pond#${Math.floor(100 + Math.random() * 900)}@${Math.floor(10 + Math.random() * 90)}`;

      try {
        const { data: signUpData, error: signUpErr } = await authStaffCreator.auth.signUp({
          email: cleanEmail,
          password: staffPassword,
          options: {
            emailRedirectTo: `${loginUrl}/create-password`,
            data: {
              name: opts.name || cleanEmail.split("@")[0],
              role: "staff",
              owner_id: userId,
              staff_id: staffId,
              permissions: opts.permissions || [],
              staff_permissions: opts.staffPermissions || {},
              farms: opts.farms || [],
              farm_name: opts.farmName || "",
            },
          },
        });

        if (!signUpErr && signUpData?.user) {
          staffAuthId = signUpData.user.id;
          if (signUpData.user.identities && signUpData.user.identities.length === 0) {
            const { error: resendErr } = await authStaffCreator.auth.resend({
              type: "signup",
              email: cleanEmail,
              options: {
                emailRedirectTo: `${loginUrl}/create-password`,
              },
            });
            if (!resendErr) {
              emailSent = true;
            } else {
              const { error: resetErr } = await authStaffCreator.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${loginUrl}/create-password`,
              });
              if (!resetErr) {
                emailSent = true;
              } else {
                emailError = resendErr.message || resetErr.message;
              }
            }
          } else {
            emailSent = true;
          }
        } else if (signUpErr) {
          const errMsg = (signUpErr.message || "").toLowerCase();
          if (errMsg.includes("already registered") || errMsg.includes("already exists") || errMsg.includes("user already")) {
            const { error: resendErr } = await authStaffCreator.auth.resend({
              type: "signup",
              email: cleanEmail,
              options: {
                emailRedirectTo: `${loginUrl}/create-password`,
              },
            });

            if (!resendErr) {
              emailSent = true;
            } else {
              const { error: resetErr } = await authStaffCreator.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${loginUrl}/create-password`,
              });
              if (!resetErr) {
                emailSent = true;
              } else {
                emailError = resendErr.message || resetErr.message;
              }
            }

            // Sync password if owner provided one:
            if (opts.password && opts.password.trim().length >= 6) {
              try {
                const { data: rpcUid } = await supabase.rpc("provision_staff_auth_user", {
                  p_email: cleanEmail,
                  p_password: opts.password.trim(),
                  p_name: opts.name || cleanEmail.split("@")[0],
                  p_owner_id: userId || null,
                  p_staff_id: staffId,
                });
                if (rpcUid) staffAuthId = rpcUid;
              } catch {}
            }
          } else {
            emailError = signUpErr.message;
          }
        }
      } catch (authErr: any) {
        console.warn("authStaffCreator.auth.signUp error:", authErr);
        emailError = authErr?.message || String(authErr);
      }

      // 2. Emergency fallback: If user was not created and no auth ID yet, provision via RPC
      if (!staffAuthId && opts.password && opts.password.trim().length >= 6) {
        try {
          const { data: rpcUid, error: rpcErr } = await supabase.rpc("provision_staff_auth_user", {
            p_email: cleanEmail,
            p_password: opts.password.trim(),
            p_name: opts.name || cleanEmail.split("@")[0],
            p_owner_id: userId || null,
            p_staff_id: staffId,
          });
          if (!rpcErr && rpcUid) {
            staffAuthId = rpcUid;
            try {
              const { error: resetErr } = await authStaffCreator.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${loginUrl}/create-password`,
              });
              if (!resetErr) emailSent = true;
            } catch {}
          }
        } catch {}
      }

      const staffMember: StaffMember = {
        id: staffId,
        name: opts.name || opts.email.split("@")[0],
        email: cleanEmail,
        phone: opts.phone || "",
        role: opts.role || "General Staff",
        status: "Pending",
        joinedDate: new Date().toISOString(),
        permissions: opts.permissions || [],
        farms: opts.farms || [],
        staffPermissions: opts.staffPermissions || {},
        ...(staffAuthId ? { staffAuthId } : {}),
      };

      // 3. Insert/upsert into staff_members table
      const cleanStaffMember = { ...staffMember };
      delete (cleanStaffMember as any).staffPermissions;
      delete (cleanStaffMember as any).staff_permissions;
      await dbInsert<StaffMember>("staff_members", cleanStaffMember, "staffMembers");

      if (staffAuthId) {
        try {
          await supabase.from("staff_members").update({ staff_auth_id: staffAuthId, status: "Pending" }).eq("id", staffMember.id);
        } catch {}
        try {
          await supabase.from("user_profiles").upsert({
            id: staffAuthId,
            name: staffMember.name,
            email: cleanEmail,
            phone: staffMember.phone,
            role: "staff",
            status: "Pending",
          });
        } catch {}
      }

      // 4. Insert into staff_farm_assignments & staff_permissions in Supabase
      if (opts.farms && opts.farms.length > 0) {
        try {
          await supabase.from("staff_farm_assignments").delete().eq("staff_id", staffMember.id);
          let assignableFarms = opts.farms;
          if (userId) {
            const { data: ownedFarms } = await supabase.from("farms").select("id").eq("user_id", userId);
            const ownedSet = new Set((ownedFarms || []).map(f => f.id));
            assignableFarms = opts.farms.filter(fid => ownedSet.has(fid));
          }
          if (assignableFarms.length > 0) {
            const farmRows = assignableFarms.map(fid => ({
              staff_id: staffMember.id,
              farm_id: fid,
              assigned_by: userId || null,
            }));
            await supabase.from("staff_farm_assignments").insert(farmRows);
          }
        } catch (e) {
          console.warn("Could not insert staff_farm_assignments:", e);
        }
      }

      if (opts.permissions && opts.permissions.length > 0) {
        try {
          await supabase.from("staff_permissions").delete().eq("staff_id", staffMember.id);
          const permRows = opts.permissions.map(feat => {
            const custom = opts.staffPermissions?.[feat];
            return {
              staff_id: staffMember.id,
              feature: feat,
              can_view: custom ? (custom.canView ?? true) : true,
              can_create: custom ? Boolean(custom.canCreate) : false,
              can_edit: custom ? Boolean(custom.canEdit) : false,
              can_delete: custom ? Boolean(custom.canDelete) : false,
            };
          });
          await supabase.from("staff_permissions").insert(permRows);
        } catch (e) {
          console.warn("Could not insert staff_permissions:", e);
        }
      }

      if (userId) {
        const cached = getLocalCache(userId) || {};
        const list = cached.staffMembers || [];
        saveLocalCache({ staffMembers: [staffMember, ...list.filter((x: any) => x.id !== staffMember.id)] }, userId);
        try {
          const direct = localStorage.getItem(`pondtora_${userId}_staff`);
          if (direct) {
            const parsed = JSON.parse(direct);
            if (Array.isArray(parsed)) {
              localStorage.setItem(`pondtora_${userId}_staff`, JSON.stringify([staffMember, ...parsed.filter((x: any) => x.id !== staffMember.id)]));
            }
          }
        } catch {}
      }

      // Also create staff_invitations row for tracking
      try {
        await supabase.from("staff_invitations").insert({
          email: cleanEmail,
          invited_by: userId || null,
          staff_id: staffMember.id,
          status: "pending",
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      } catch (e) {}

      return { success: true, staffMember, invitation: null, emailSent, emailError, inviteLink: loginUrl };
    },
    update: async (s: StaffMember, password?: string) => {
      const cleanStaff = { ...s };
      delete (cleanStaff as any).staffPermissions;
      delete (cleanStaff as any).staff_permissions;

      const res = await dbUpdate<StaffMember>("staff_members", cleanStaff, "staffMembers");
      const userId = await getUserId();
      const targetId = (s.id && isUuid(s.id)) ? s.id : (idMap.get(s.id) || toUuid(s.id));

      if (password && password.trim().length >= 6) {
        try {
          await supabase.rpc("provision_staff_auth_user", {
            p_email: s.email.trim().toLowerCase(),
            p_password: password.trim(),
            p_name: s.name || s.email.split("@")[0],
            p_owner_id: userId || null,
            p_staff_id: targetId,
          });
        } catch (rpcErr) {
          console.warn("provision_staff_auth_user RPC update fallback:", rpcErr);
        }
      }

      if (s.farms !== undefined) {
        try {
          await supabase.from("staff_farm_assignments").delete().eq("staff_id", targetId);
          if (s.farms.length > 0) {
            let assignableFarms = s.farms;
            if (userId) {
              const { data: ownedFarms } = await supabase.from("farms").select("id").eq("user_id", userId);
              const ownedSet = new Set((ownedFarms || []).map(f => f.id));
              assignableFarms = s.farms.filter(fid => ownedSet.has(fid));
            }
            if (assignableFarms.length > 0) {
              await supabase.from("staff_farm_assignments").insert(
                assignableFarms.map(fid => ({ staff_id: targetId, farm_id: fid, assigned_by: userId || null }))
              );
            }
          }
        } catch (e) {
          console.warn("Error updating staff_farm_assignments:", e);
        }
      }
      if (s.permissions !== undefined) {
        try {
          await supabase.from("staff_permissions").delete().eq("staff_id", targetId);
          if (s.permissions.length > 0) {
            const permRows = s.permissions.map(feat => {
              const custom = s.staffPermissions?.[feat];
              return {
                staff_id: targetId,
                feature: feat,
                can_view: custom ? (custom.canView ?? true) : true,
                can_create: custom ? Boolean(custom.canCreate) : false,
                can_edit: custom ? Boolean(custom.canEdit) : false,
                can_delete: custom ? Boolean(custom.canDelete) : false,
              };
            });
            const { error: insErr } = await supabase.from("staff_permissions").insert(permRows);
            if (insErr) console.warn("Error inserting staff_permissions:", insErr);
          }
        } catch (e) {
          console.warn("Error updating staff_permissions:", e);
        }
      }

      if (userId) {
        const cached = getLocalCache(userId) || {};
        const list = cached.staffMembers || [];
        saveLocalCache({ staffMembers: list.map((x: any) => (x.id === s.id || x.id === targetId ? { ...x, ...s } : x)) }, userId);
        try {
          const direct = localStorage.getItem(`pondtora_${userId}_staff`);
          if (direct) {
            const parsed = JSON.parse(direct);
            if (Array.isArray(parsed)) {
              localStorage.setItem(`pondtora_${userId}_staff`, JSON.stringify(parsed.map((x: any) => (x.id === s.id || x.id === targetId ? { ...x, ...s } : x))));
            }
          }
        } catch {}
      }

      return { ...res, staffPermissions: s.staffPermissions };
    },
    remove: async (id: string) => {
      const userId = await getUserId();
      const targetId = isUuid(id) ? id : (idMap.get(id) || toUuid(id));
      if (userId) {
        const cached = getLocalCache(userId) || {};
        const list = cached.staffMembers || [];
        saveLocalCache({ staffMembers: list.filter((x: any) => x.id !== id && x.id !== targetId) }, userId);
        try {
          const direct = localStorage.getItem(`pondtora_${userId}_staff`);
          if (direct) {
            const parsed = JSON.parse(direct);
            if (Array.isArray(parsed)) {
              localStorage.setItem(`pondtora_${userId}_staff`, JSON.stringify(parsed.filter((x: any) => x.id !== id && x.id !== targetId)));
            }
          }
        } catch {}
      }
      try { await supabase.from("staff_farm_assignments").delete().eq("staff_id", targetId); } catch {}
      try { await supabase.from("staff_permissions").delete().eq("staff_id", targetId); } catch {}
      try { await supabase.from("staff_invitations").delete().eq("staff_id", targetId); } catch {}
      return dbDelete("staff_members", id, "staffMembers");
    },
  },

  // ── Ponds ──────────────────────────────────────────────────────────────────
  ponds: {
    list: () => dbList<Pond>("ponds", "ponds"),
    create: async (p: Partial<Pond>) => {
      const dbPond: any = { ...p };
      dbPond.sizeM2 = (typeof p.sizeM2 === "number" && !isNaN(p.sizeM2)) ? p.sizeM2 : (parseFloat(String(p.sizeM2)) || 0);
      dbPond.avgWeight = (typeof p.avgWeight === "number" && !isNaN(p.avgWeight)) ? p.avgWeight : (parseFloat(String(p.avgWeight)) || 0);
      dbPond.initialStock = parseInt(String(p.initialStock ?? 0), 10) || 0;
      dbPond.currentCount = parseInt(String(p.currentCount ?? p.initialStock ?? 0), 10) || 0;
      dbPond.totalCost = parseFloat(String(p.totalCost ?? 0)) || 0;
      if (!p.stockingDate || p.stockingDate === "—" || !String(p.stockingDate).trim()) {
        dbPond.stockingDate = null;
      } else {
        dbPond.stockingDate = toValidDbDate(p.stockingDate) || null;
      }

      const userId = await getUserId();
      if (userId) {
        dbPond.userId = userId;

        // 1. Ensure user_profiles row exists in Supabase so ponds_user_id_fkey does not fail
        try {
          const { data: prof } = await supabase.from("user_profiles").select("id").eq("id", userId).maybeSingle();
          if (!prof) {
            const { data: { user } } = await supabase.auth.getUser();
            const meta = user?.user_metadata || {};
            await supabase.from("user_profiles").upsert({
              id: userId,
              name: meta.name || user?.email?.split("@")[0] || "Farm Owner",
              farm_name: meta.farm_name || "My Farm",
              email: user?.email || "",
              country: meta.country || "Nigeria",
              currency_symbol: meta.currency_symbol || "₦",
              currency_code: meta.currency_code || "NGN",
              role: meta.role || "owner",
              status: "Active"
            }, { onConflict: "id" });
          }
        } catch (e) {
          console.warn("Profile check notice:", e);
        }

        // 2. Ensure farm exists in Supabase so ponds_farm_id_fkey does not fail
        let validFarmId: string | null = null;
        if (p.farmId && isUuid(p.farmId)) {
          const { data: fRow } = await supabase.from("farms").select("id").eq("id", p.farmId).maybeSingle();
          if (fRow?.id) validFarmId = fRow.id;
        }
        if (!validFarmId) {
          // Check if user is staff with assigned farms
          try {
            const { data: staffRow } = await supabase
              .from("staff_members")
              .select("farms, user_id")
              .or(`staff_auth_id.eq.${userId}`)
              .maybeSingle();
            if (staffRow?.farms && Array.isArray(staffRow.farms) && staffRow.farms.length > 0 && isUuid(staffRow.farms[0])) {
              validFarmId = staffRow.farms[0];
            } else if (staffRow?.user_id) {
              const { data: ownerFarms } = await supabase.from("farms").select("id").eq("user_id", staffRow.user_id).order("created_at", { ascending: true }).limit(1);
              if (ownerFarms && ownerFarms.length > 0) validFarmId = ownerFarms[0].id;
            }
          } catch {}
        }
        if (!validFarmId) {
          const { data: userFarms } = await supabase.from("farms").select("id").eq("user_id", userId).order("created_at", { ascending: true }).limit(1);
          if (userFarms && userFarms.length > 0) {
            validFarmId = userFarms[0].id;
          }
        }
        if (validFarmId) {
          dbPond.farmId = validFarmId;
        }
      }

      // Validate duplicate pond name (case-insensitive) for the farm
      if (p.name && p.name.trim()) {
        const trimmedName = p.name.trim();
        let q = supabase
          .from("ponds")
          .select("id, name")
          .ilike("name", trimmedName);
        if (dbPond.farmId && isUuid(dbPond.farmId)) {
          q = q.eq("farm_id", dbPond.farmId);
        } else if (userId) {
          q = q.eq("user_id", userId);
        }
        const { data: existing, error: checkErr } = await q;
        if (!checkErr && existing && existing.length > 0) {
          throw new Error(`A pond named "${trimmedName}" already exists in this farm.`);
        }
      }

      return dbInsert<Pond>("ponds", dbPond as Pond, "ponds");
    },
    update: async (p: Pond) => {
      const dbPond: any = { ...p };
      dbPond.sizeM2 = (typeof p.sizeM2 === "number" && !isNaN(p.sizeM2)) ? p.sizeM2 : (parseFloat(String(p.sizeM2)) || 0);
      dbPond.avgWeight = (typeof p.avgWeight === "number" && !isNaN(p.avgWeight)) ? p.avgWeight : (parseFloat(String(p.avgWeight)) || 0);
      if (p.initialStock !== undefined) dbPond.initialStock = parseInt(String(p.initialStock), 10) || 0;
      if (p.currentCount !== undefined) dbPond.currentCount = parseInt(String(p.currentCount), 10) || 0;
      if (p.totalCost !== undefined) dbPond.totalCost = parseFloat(String(p.totalCost)) || 0;
      if (p.maxKgByPallet !== undefined) {
        dbPond.maxKgByPallet = p.maxKgByPallet || {};
      }
      if (!p.stockingDate || p.stockingDate === "—" || !String(p.stockingDate).trim()) {
        dbPond.stockingDate = null;
      } else {
        dbPond.stockingDate = toValidDbDate(p.stockingDate) || null;
      }

      // Check duplicate name on update if changed
      const userId = await getUserId();
      if (p.name && p.name.trim()) {
        const trimmedName = p.name.trim();
        const targetId = isUuid(p.id) ? p.id : idMap.get(p.id) || p.id;
        let q = supabase
          .from("ponds")
          .select("id, name")
          .ilike("name", trimmedName)
          .neq("id", targetId);
        if (p.farmId && isUuid(p.farmId)) {
          q = q.eq("farm_id", p.farmId);
        } else if (userId) {
          q = q.eq("user_id", userId);
        }
        const { data: existing, error: checkErr } = await q;
        if (!checkErr && existing && existing.length > 0) {
          throw new Error(`A pond named "${trimmedName}" already exists in this farm.`);
        }
      }

      return dbUpdate<Pond>("ponds", dbPond as Pond, "ponds");
    },
    remove: (id: string) => dbDelete("ponds", id, "ponds"),
  },

  // ── Stock events ───────────────────────────────────────────────────────────
  stockEvents: {
    list: () => dbList<StockEvent>("stock_events", "stockEvents"),
    create: (e: Partial<StockEvent>) => {
      const dbEvent: any = { ...e };
      if (e.date) {
        const d = toValidDbDate(e.date);
        if (d) dbEvent.date = d;
      }
      return dbInsert<StockEvent>("stock_events", dbEvent as StockEvent, "stockEvents");
    },
    update: (e: StockEvent) => dbUpdate<StockEvent>("stock_events", e, "stockEvents"),
    remove: (id: string) => dbDelete("stock_events", id, "stockEvents"),
  },

  // ── Feed inventory ─────────────────────────────────────────────────────────
  inventory: {
    list: () => dbList<FeedItem>("feed_inventory", "feedInventory"),
    create: (i: Partial<FeedItem>) => {
      const dbInv: any = { ...i };
      if (i.purchaseDate) {
        const d = toValidDbDate(i.purchaseDate);
        if (d) dbInv.purchaseDate = d;
      }
      return dbInsert<FeedItem>("feed_inventory", dbInv as FeedItem, "feedInventory");
    },
    update: (i: FeedItem) => dbUpdate<FeedItem>("feed_inventory", i, "feedInventory"),
    remove: (id: string) => dbDelete("feed_inventory", id, "feedInventory"),
  },

  // ── Feeding records ────────────────────────────────────────────────────────
  feeding: {
    list: () => dbList<FeedingRecord>("feeding_records", "feedingRecords"),
    create: async (r: Partial<FeedingRecord>) => {
      const dbRec: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRec.date = d;
      }
      // Check pellet stock availability
      if (dbRec.size) {
        const effectiveUid = (await getOwnerUserId()) || (await getUserId());
        if (effectiveUid) {
          const { data: invRows } = await supabase
            .from("feed_inventory")
            .select("size, bags, weight_per_bag, total_kg")
            .eq("user_id", effectiveUid)
            .eq("size", dbRec.size);
          const totalPurchasedKg = (invRows || []).reduce((s: number, f: any) => s + (Number(f.total_kg) || (Number(f.bags) * (Number(f.weight_per_bag) || 15))), 0);
          const totalPurchasedBags = (invRows || []).reduce((s: number, f: any) => s + (Number(f.bags) || 0), 0);
          if (!invRows || invRows.length === 0 || (totalPurchasedBags <= 0 && totalPurchasedKg <= 0)) {
            throw new Error(`Pellet size "${dbRec.size}" is out of stock / empty in Feed Inventory. Please purchase and record feed stock before logging feeding.`);
          }
          const { data: fedRows } = await supabase
            .from("feeding_records")
            .select("morning, evening, total")
            .eq("user_id", effectiveUid)
            .eq("size", dbRec.size);
          const totalFedKg = (fedRows || []).reduce((s: number, fr: any) => s + (Number(fr.total) || ((Number(fr.morning) || 0) + (Number(fr.evening) || 0))), 0);
          const availableKg = totalPurchasedKg - totalFedKg;
          if (availableKg <= 0) {
            throw new Error(`Pellet size "${dbRec.size}" is completely empty (0 kg remaining in stock). Please add feed stock before feeding.`);
          }
          const toFeed = (Number(dbRec.morning) || 0) + (Number(dbRec.evening) || 0);
          if (toFeed > availableKg) {
            throw new Error(`Insufficient stock for pellet size "${dbRec.size}". Available: ${Math.round(availableKg * 10) / 10} kg, but attempting to feed ${toFeed} kg.`);
          }
        }
      }
      return dbInsert<FeedingRecord>("feeding_records", dbRec as FeedingRecord, "feedingRecords");
    },
    update: async (r: FeedingRecord) => {
      const dbRec: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRec.date = d;
      }
      if (dbRec.size) {
        const effectiveUid = (await getOwnerUserId()) || (await getUserId());
        if (effectiveUid) {
          const { data: invRows } = await supabase
            .from("feed_inventory")
            .select("size, bags, weight_per_bag, total_kg")
            .eq("user_id", effectiveUid)
            .eq("size", dbRec.size);
          const totalPurchasedKg = (invRows || []).reduce((s: number, f: any) => s + (Number(f.total_kg) || (Number(f.bags) * (Number(f.weight_per_bag) || 15))), 0);
          const totalPurchasedBags = (invRows || []).reduce((s: number, f: any) => s + (Number(f.bags) || 0), 0);
          if (!invRows || invRows.length === 0 || (totalPurchasedBags <= 0 && totalPurchasedKg <= 0)) {
            throw new Error(`Pellet size "${dbRec.size}" is out of stock / empty in Feed Inventory. Please purchase and record feed stock before logging feeding.`);
          }
          const { data: fedRows } = await supabase
            .from("feeding_records")
            .select("id, morning, evening, total")
            .eq("user_id", effectiveUid)
            .eq("size", dbRec.size);
          const totalFedKg = (fedRows || []).filter((fr: any) => fr.id !== dbRec.id).reduce((s: number, fr: any) => s + (Number(fr.total) || ((Number(fr.morning) || 0) + (Number(fr.evening) || 0))), 0);
          const availableKg = totalPurchasedKg - totalFedKg;
          const toFeed = (Number(dbRec.morning) || 0) + (Number(dbRec.evening) || 0);
          if (availableKg <= 0) {
            throw new Error(`Pellet size "${dbRec.size}" is completely empty (0 kg remaining in stock). Please add feed stock before feeding.`);
          }
          if (toFeed > availableKg) {
            throw new Error(`Insufficient stock for pellet size "${dbRec.size}". Available: ${Math.round(availableKg * 10) / 10} kg, but attempting to feed ${toFeed} kg.`);
          }
        }
      }
      return dbUpdate<FeedingRecord>("feeding_records", dbRec, "feedingRecords");
    },
    remove: (id: string) => dbDelete("feeding_records", id, "feedingRecords"),
  },

  // ── Bag open logs ──────────────────────────────────────────────────────────
  bagLogs: {
    list: () => dbList<BagOpenLog>("bag_open_logs", "bagOpenLogs"),
    create: (b: Partial<BagOpenLog>) => {
      const dbBag: any = { ...b };
      if (b.date) {
        const d = toValidDbDate(b.date);
        if (d) dbBag.date = d;
      }
      return dbInsert<BagOpenLog>("bag_open_logs", dbBag as BagOpenLog, "bagOpenLogs");
    },
    update: (b: BagOpenLog) => {
      const dbBag: any = { ...b };
      if (b.date) {
        const d = toValidDbDate(b.date);
        if (d) dbBag.date = d;
      }
      return dbUpdate<BagOpenLog>("bag_open_logs", dbBag as BagOpenLog, "bagOpenLogs");
    },
    remove: (id: string) => dbDelete("bag_open_logs", id, "bagOpenLogs"),
  },

  // ── Feed remaining logs ────────────────────────────────────────────────────
  remainLogs: {
    list: () => dbList<FeedRemainingLog>("feed_remaining_logs", "feedRemainingLogs"),
    create: (r: Partial<FeedRemainingLog>) => {
      const dbRem: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRem.date = d;
      }
      return dbInsert<FeedRemainingLog>("feed_remaining_logs", dbRem as FeedRemainingLog, "feedRemainingLogs");
    },
    update: (r: FeedRemainingLog) => {
      const dbRem: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRem.date = d;
      }
      return dbUpdate<FeedRemainingLog>("feed_remaining_logs", dbRem as FeedRemainingLog, "feedRemainingLogs");
    },
    remove: (id: string) => dbDelete("feed_remaining_logs", id, "feedRemainingLogs"),
  },

  // ── Expenses ───────────────────────────────────────────────────────────────
  expenses: {
    list: () => dbList<Expense>("expenses", "expenses"),
    create: (e: Partial<Expense>) => {
      const dbExp: any = { ...e };
      if (e.date) {
        const d = toValidDbDate(e.date);
        if (d) dbExp.date = d;
      }
      return dbInsert<Expense>("expenses", dbExp as Expense, "expenses");
    },
    update: (e: Expense) => dbUpdate<Expense>("expenses", e, "expenses"),
    remove: (id: string) => dbDelete("expenses", id, "expenses"),
  },

  // ── Revenues ───────────────────────────────────────────────────────────────
  revenues: {
    list: () => dbList<Revenue>("revenues", "revenues"),
    create: (r: Partial<Revenue>) => {
      const dbRev: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRev.date = d;
      }
      return dbInsert<Revenue>("revenues", dbRev as Revenue, "revenues");
    },
    update: (r: Revenue) => dbUpdate<Revenue>("revenues", r, "revenues"),
    remove: (id: string) => dbDelete("revenues", id, "revenues"),
  },

  // ── Mortality entries ──────────────────────────────────────────────────────
  mortality: {
    list: () => dbList<MortalityEntry>("mortality_entries", "mortalityEntries"),
    create: (m: Partial<MortalityEntry>) => {
      const dbMort: any = { ...m };
      if (m.date) {
        const d = toValidDbDate(m.date);
        if (d) dbMort.date = d;
      }
      return dbInsert<MortalityEntry>("mortality_entries", dbMort as MortalityEntry, "mortalityEntries");
    },
    update: (m: MortalityEntry) => dbUpdate<MortalityEntry>("mortality_entries", m, "mortalityEntries"),
    remove: (id: string) => dbDelete("mortality_entries", id, "mortalityEntries"),
  },

  // ── Treatment records ──────────────────────────────────────────────────────
  treatments: {
    list: () => dbList<TreatmentRecord>("treatment_records", "treatmentRecords"),
    create: (t: Partial<TreatmentRecord>) => {
      const dbTr: any = { ...t };
      if (t.date) {
        const d = toValidDbDate(t.date);
        if (d) dbTr.date = d;
      }
      return dbInsert<TreatmentRecord>("treatment_records", dbTr as TreatmentRecord, "treatmentRecords");
    },
    update: (t: TreatmentRecord) => dbUpdate<TreatmentRecord>("treatment_records", t, "treatmentRecords"),
    remove: (id: string) => dbDelete("treatment_records", id, "treatmentRecords"),
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  reports: {
    list: () => dbList<Report>("reports", "reports"),
    create: (r: Partial<Report>) => {
      const dbRep: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRep.date = d;
      }
      return dbInsert<Report>("reports", dbRep as Report, "reports");
    },
    update: (r: Report) => dbUpdate<Report>("reports", r, "reports"),
    remove: (id: string) => dbDelete("reports", id, "reports"),
  },

  // ── Customers ──────────────────────────────────────────────────────────────
  customers: {
    list: () => dbList<Customer>("customers", "customers"),
    create: (c: Partial<Customer>) => dbInsert<Customer>("customers", c as Customer, "customers"),
    update: (c: Customer) => dbUpdate<Customer>("customers", c, "customers"),
    remove: (id: string) => dbDelete("customers", id, "customers"),
  },

  // ── Price groups ───────────────────────────────────────────────────────────
  priceGroups: {
    list: () => dbList<PriceGroup>("price_groups", "priceGroups"),
    create: (g: Partial<PriceGroup>) => dbInsert<PriceGroup>("price_groups", g as PriceGroup, "priceGroups"),
    update: (g: PriceGroup) => dbUpdate<PriceGroup>("price_groups", g, "priceGroups"),
    remove: (id: string) => dbDelete("price_groups", id, "priceGroups"),
  },

  // ── Invoices ───────────────────────────────────────────────────────────────
  invoices: {
    list: () => dbList<Invoice>("invoices", "invoices"),
    create: (i: Partial<Invoice>) => {
      const dbInv: any = { ...i };
      dbInv.invoiceDate = i.invoiceDate ? toValidDbDate(i.invoiceDate) || null : null;
      dbInv.dueDate = i.dueDate ? toValidDbDate(i.dueDate) || null : null;
      if (i.subtotal !== undefined) dbInv.subtotal = Number(i.subtotal) || 0;
      if (i.discount !== undefined) dbInv.discount = Number(i.discount) || 0;
      if (i.additionalCharges !== undefined) dbInv.additionalCharges = Number(i.additionalCharges) || 0;
      if (i.grandTotal !== undefined) dbInv.grandTotal = Number(i.grandTotal) || 0;
      if (i.amountPaid !== undefined) dbInv.amountPaid = Number(i.amountPaid) || 0;
      if (i.outstanding !== undefined) dbInv.outstanding = Number(i.outstanding) || 0;
      return dbInsert<Invoice>("invoices", dbInv as Invoice, "invoices");
    },
    update: (i: Invoice) => {
      const dbInv: any = { ...i };
      dbInv.invoiceDate = i.invoiceDate ? toValidDbDate(i.invoiceDate) || null : null;
      dbInv.dueDate = i.dueDate ? toValidDbDate(i.dueDate) || null : null;
      if (i.subtotal !== undefined) dbInv.subtotal = Number(i.subtotal) || 0;
      if (i.discount !== undefined) dbInv.discount = Number(i.discount) || 0;
      if (i.additionalCharges !== undefined) dbInv.additionalCharges = Number(i.additionalCharges) || 0;
      if (i.grandTotal !== undefined) dbInv.grandTotal = Number(i.grandTotal) || 0;
      if (i.amountPaid !== undefined) dbInv.amountPaid = Number(i.amountPaid) || 0;
      if (i.outstanding !== undefined) dbInv.outstanding = Number(i.outstanding) || 0;
      return dbUpdate<Invoice>("invoices", dbInv as Invoice, "invoices");
    },
    remove: (id: string) => dbDelete("invoices", id, "invoices"),
  },

  // ── Invoice settings ───────────────────────────────────────────────────────
  invSettings: {
    get: async () => {
      try {
        const ownerId = await getOwnerUserId();
        const userId = ownerId || await getUserId();
        if (!userId) return null;
        const { data } = await supabase.from("invoice_settings").select("*").eq("user_id", userId).maybeSingle();
        return data ? objToCamel<InvSettings>(data) : null;
      } catch (e) {
        console.warn("Failed to get invoice settings", e);
        return null;
      }
    },
    update: async (s: Partial<InvSettings>) => {
      const ownerId = await getOwnerUserId();
      const userId = ownerId || await getUserId();
      const snake = objToSnake(s as any, userId, "invoice_settings");
      if (userId) snake.user_id = userId;
      delete snake.id;
      const { data, error } = await supabase.from("invoice_settings").upsert(snake, { onConflict: "user_id" }).select().single();
      if (error) {
        console.error("Failed to update invoice_settings:", error.message);
        throw error;
      }
      return data ? objToCamel<InvSettings>(data) : (s as InvSettings);
    },
  },

  // ── Investors ─────────────────────────────────────────────────────────────
  investors: {
    list: () => dbList<Investor>("investors", "investors"),
    create: async (item: Investor) => {
      const dbInv: any = { ...item };
      const userId = await getUserId();
      if (userId) {
        dbInv.userId = userId;
        try {
          const { data: prof } = await supabase.from("user_profiles").select("id").eq("id", userId).maybeSingle();
          if (!prof) {
            const { data: { user } } = await supabase.auth.getUser();
            const meta = user?.user_metadata || {};
            await supabase.from("user_profiles").upsert({
              id: userId,
              name: meta.name || user?.email?.split("@")[0] || "Farm Owner",
              farm_name: meta.farm_name || "My Farm",
              email: user?.email || "",
              country: meta.country || "Nigeria",
              currency_symbol: meta.currency_symbol || "₦",
              currency_code: meta.currency_code || "NGN",
              role: meta.role || "owner",
              status: "Active"
            }, { onConflict: "id" });
          }
        } catch {}
      }
      return dbInsert<Investor>("investors", dbInv as Investor, "investors");
    },
    update: (item: Investor) => dbUpdate<Investor>("investors", item, "investors"),
    remove: async (id: string) => {
      try {
        const { data: invs } = await supabase.from("investments").select("id").eq("investor_id", id);
        if (invs && invs.length > 0) {
          const invIds = invs.map((i: any) => i.id);
          await supabase.from("investment_payments").delete().in("investment_id", invIds);
        }
        await supabase.from("investments").delete().eq("investor_id", id);
      } catch (err) {
        console.warn("Cascade pre-delete error on investor remove:", err);
      }
      return dbDelete("investors", id, "investors");
    },
    sendReceiptEmail: async (params: {
      to: string;
      investorName: string;
      farmName: string;
      receiptRef: string;
      htmlContent: string;
      amountInvested?: number;
      currency?: string;
    }) => {
      const { to, investorName, farmName, receiptRef, htmlContent, amountInvested, currency } = params;
      if (!to || !to.includes("@")) {
        throw new Error("A valid email address is required.");
      }

      // 1. Try Supabase Edge Function
      try {
        const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL || "https://fegtvgfkxueorybefthj.supabase.co"}/functions/v1/make-server-1da59a07/investors/send-receipt-email`;
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
          "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
        };

        const res = await fetch(edgeUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            to,
            investorName,
            farmName,
            receiptRef,
            htmlContent,
            amountInvested,
            currency,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success) return { success: true, method: "server" };
        }
      } catch (e) {
        console.warn("Edge function send-receipt-email notice:", e);
      }

      // 2. Direct Resend API if configured
      const resendKey = (import.meta as any).env?.VITE_RESEND_API_KEY;
      if (resendKey) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `${farmName || "Pondtora"} <investments@pondtora.site>`,
              to: [to],
              subject: `Investment Certificate & Receipt - ${receiptRef}`,
              html: htmlContent,
            }),
          });
          if (res.ok) {
            return { success: true, method: "resend_direct" };
          }
        } catch (e) {
          console.warn("Direct Resend API notice:", e);
        }
      }

      return { success: true, method: "ready" };
    },
  },

  // ── Investments ───────────────────────────────────────────────────────────
  investments: {
    list: () => dbList<Investment>("investments", "investments"),
    create: async (item: Investment) => {
      const dbInv: any = { ...item };
      dbInv.amountInvested = Number(item.amountInvested) || 0;
      dbInv.investorPercentage = Number(item.investorPercentage) || 0;
      dbInv.expectedReturn = Number(item.expectedReturn) || 0;
      dbInv.totalAmountDue = Number(item.totalAmountDue) || 0;
      if (item.monthlyReturn !== undefined) dbInv.monthlyReturn = Number(item.monthlyReturn) || 0;
      if (item.amountReceivedByBusiness !== undefined) dbInv.amountReceivedByBusiness = Number(item.amountReceivedByBusiness) || 0;
      if (item.totalInvestorValue !== undefined) dbInv.totalInvestorValue = Number(item.totalInvestorValue) || 0;
      if (item.durationMonths !== undefined) dbInv.durationMonths = parseInt(String(item.durationMonths), 10) || 12;
      if (item.numberOfPayments !== undefined) dbInv.numberOfPayments = parseInt(String(item.numberOfPayments), 10) || 1;
      dbInv.startDate = item.startDate ? toValidDbDate(item.startDate) || null : null;
      dbInv.dueDate = item.dueDate ? toValidDbDate(item.dueDate) || null : null;
      if (item.maturityDate) dbInv.maturityDate = toValidDbDate(item.maturityDate) || null;
      return dbInsert<Investment>("investments", dbInv as Investment, "investments");
    },
    update: async (item: Investment) => {
      const dbInv: any = { ...item };
      if (item.amountInvested !== undefined) dbInv.amountInvested = Number(item.amountInvested) || 0;
      if (item.investorPercentage !== undefined) dbInv.investorPercentage = Number(item.investorPercentage) || 0;
      if (item.expectedReturn !== undefined) dbInv.expectedReturn = Number(item.expectedReturn) || 0;
      if (item.totalAmountDue !== undefined) dbInv.totalAmountDue = Number(item.totalAmountDue) || 0;
      if (item.monthlyReturn !== undefined) dbInv.monthlyReturn = Number(item.monthlyReturn) || 0;
      if (item.amountReceivedByBusiness !== undefined) dbInv.amountReceivedByBusiness = Number(item.amountReceivedByBusiness) || 0;
      if (item.totalInvestorValue !== undefined) dbInv.totalInvestorValue = Number(item.totalInvestorValue) || 0;
      if (item.durationMonths !== undefined) dbInv.durationMonths = parseInt(String(item.durationMonths), 10) || 12;
      if (item.numberOfPayments !== undefined) dbInv.numberOfPayments = parseInt(String(item.numberOfPayments), 10) || 1;
      if (item.startDate) dbInv.startDate = toValidDbDate(item.startDate) || null;
      if (item.dueDate) dbInv.dueDate = toValidDbDate(item.dueDate) || null;
      if (item.maturityDate) dbInv.maturityDate = toValidDbDate(item.maturityDate) || null;
      return dbUpdate<Investment>("investments", dbInv as Investment, "investments");
    },
    remove: async (id: string) => {
      try {
        await supabase.from("investment_payments").delete().eq("investment_id", id);
      } catch (err) {
        console.warn("Cascade pre-delete error on investment remove:", err);
      }
      return dbDelete("investments", id, "investments");
    },
  },

  // ── Investment Payments ───────────────────────────────────────────────────
  investmentPayments: {
    list: () => dbList<InvestmentPayment>("investment_payments", "investmentPayments"),
    create: async (item: InvestmentPayment) => {
      const dbPay: any = { ...item };
      dbPay.amountDue = Number(item.amountDue) || 0;
      dbPay.scheduledAmount = Number(item.scheduledAmount ?? item.amountDue) || 0;
      dbPay.amountPaid = Number(item.amountPaid) || 0;
      dbPay.remainingAmount = Number(item.remainingAmount ?? (dbPay.amountDue - dbPay.amountPaid)) || 0;
      dbPay.dueDate = item.dueDate ? toValidDbDate(item.dueDate) || null : null;
      if (item.paymentDate) dbPay.paymentDate = toValidDbDate(item.paymentDate) || null;
      if (item.paidDate) dbPay.paidDate = toValidDbDate(item.paidDate) || null;
      return dbInsert<InvestmentPayment>("investment_payments", dbPay as InvestmentPayment, "investmentPayments");
    },
    update: async (item: InvestmentPayment) => {
      const dbPay: any = { ...item };
      if (item.amountDue !== undefined) dbPay.amountDue = Number(item.amountDue) || 0;
      if (item.scheduledAmount !== undefined) dbPay.scheduledAmount = Number(item.scheduledAmount) || 0;
      if (item.amountPaid !== undefined) dbPay.amountPaid = Number(item.amountPaid) || 0;
      if (item.remainingAmount !== undefined) dbPay.remainingAmount = Number(item.remainingAmount) || 0;
      if (item.dueDate) dbPay.dueDate = toValidDbDate(item.dueDate) || null;
      if (item.paymentDate) dbPay.paymentDate = toValidDbDate(item.paymentDate) || null;
      if (item.paidDate) dbPay.paidDate = toValidDbDate(item.paidDate) || null;
      return dbUpdate<InvestmentPayment>("investment_payments", dbPay as InvestmentPayment, "investmentPayments");
    },
    remove: (id: string) => dbDelete("investment_payments", id, "investmentPayments"),
  },

  // ── Pond Reports ──────────────────────────────────────────────────────────
  pondReports: {
    list: () => dbList<PondReport>("pond_reports", "pondReports"),
    create: (item: PondReport) => dbInsert<PondReport>("pond_reports", item, "pondReports"),
    update: (item: PondReport) => dbUpdate<PondReport>("pond_reports", item, "pondReports"),
    remove: (id: string) => dbDelete("pond_reports", id, "pondReports"),
  },

  // ── Knowledge questions ────────────────────────────────────────────────────
  kQuestions: {
    list: () => dbList<any>("knowledge_questions", "knowledgeQuestions"),
    create: (q: any) => dbInsert<any>("knowledge_questions", q, "knowledgeQuestions"),
    update: (q: any) => dbUpdate<any>("knowledge_questions", q, "knowledgeQuestions"),
    remove: (id: string) => dbDelete("knowledge_questions", id, "knowledgeQuestions"),
  },

  // ── Compatibility questions ────────────────────────────────────────────────
  cQuestions: {
    list: () => dbList<any>("compatibility_questions", "compatibilityQuestions"),
    create: (q: any) => dbInsert<any>("compatibility_questions", q, "compatibilityQuestions"),
    update: (q: any) => dbUpdate<any>("compatibility_questions", q, "compatibilityQuestions"),
    remove: (id: string) => dbDelete("compatibility_questions", id, "compatibilityQuestions"),
  },

  // ── Knowledge results ──────────────────────────────────────────────────────
  kResults: {
    list: () => dbList<any>("knowledge_results", "knowledgeResults"),
    create: (r: any) => dbInsert<any>("knowledge_results", r, "knowledgeResults"),
    remove: (id: string) => dbDelete("knowledge_results", id, "knowledgeResults"),
  },

  // ── Compatibility results ──────────────────────────────────────────────────
  cResults: {
    list: () => dbList<any>("compatibility_results", "compatibilityResults"),
    create: (r: any) => dbInsert<any>("compatibility_results", r, "compatibilityResults"),
    remove: (id: string) => dbDelete("compatibility_results", id, "compatibilityResults"),
  },

  // ── Public assessment (no auth) ────────────────────────────────────────────
  public: {
    getQuestions: async (type: "knowledge" | "compatibility", ownerId: string) => {
      if (!ownerId || typeof ownerId !== "string" || ownerId.trim() === "") {
        throw new Error("Invalid assessment link: missing organisation ID.");
      }
      const cleanOwnerId = ownerId.trim();
      const table = type === "knowledge" ? "knowledge_questions" : "compatibility_questions";
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", cleanOwnerId)
          .order("created_at", { ascending: true });

        if (error) {
          console.warn(`Supabase public ${table} query notice:`, error.message);
        }

        if (data && data.length > 0) {
          return data.map(r => objToCamel(r));
        }

        // Check if owner profile exists or ownerId is valid UUID
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("id, farm_name")
          .eq("id", cleanOwnerId)
          .maybeSingle();

        if (prof || isUuid(cleanOwnerId)) {
          // Return standard questions so public link loads seamlessly even before custom questions are added
          return (type === "knowledge" ? INIT_K : INIT_C) as any[];
        }

        throw new Error("Invalid or expired assessment link. This assessment is no longer available.");
      } catch (err: any) {
        if (err.message && err.message.includes("Invalid")) throw err;
        return (type === "knowledge" ? INIT_K : INIT_C) as any[];
      }
    },
    submitResult: async (type: "knowledge" | "compatibility", ownerId: string, result: any) => {
      if (!ownerId) throw new Error("Missing organisation ID for submission");
      const cleanOwnerId = ownerId.trim();
      const table = type === "knowledge" ? "knowledge_results" : "compatibility_results";
      const snake = objToSnake(result, cleanOwnerId);
      if (!snake.id) snake.id = crypto.randomUUID();
      snake.user_id = cleanOwnerId;

      const { data, error } = await supabase.from(table).insert(snake).select().single();
      if (error) {
        console.error("Public submit result error:", error);
        throw new Error(error.message || "Failed to submit assessment results");
      }
      return data ? objToCamel(data) : result;
    },
  },
};
