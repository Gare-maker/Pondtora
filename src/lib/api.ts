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
  if (!d || d === "—" || typeof d !== "string" || d.trim() === "") return null;
  const str = d.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts = str.split(" ");
  if (parts.length === 2) {
    const mIdx = monthNames.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
    const day = parseInt(parts[1], 10);
    if (mIdx !== -1 && !isNaN(day) && day >= 1 && day <= 31) {
      const mm = String(mIdx + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${defaultYear}-${mm}-${dd}`;
    }
  }
  const parsed = new Date(str);
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
  return n1 === n2;
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

const DATE_FIELDS = new Set(["date", "purchase_date", "stocking_date", "cleared_date", "invoice_date", "due_date", "start_date", "payment_date", "report_date"]);

const TABLE_ALLOWED_COLUMNS: Record<string, Set<string>> = {
  investors: new Set([
    "id", "user_id", "farm_id", "full_name", "phone", "email", "status", "notes", "created_at", "updated_at"
  ]),
  investments: new Set([
    "id", "user_id", "investor_id", "farm_id", "pond_id", "fish_stock_id",
    "amount_invested", "investor_percentage", "expected_return", "total_amount_due",
    "start_date", "due_date", "payment_type", "payment_frequency", "custom_frequency_desc",
    "status", "notes", "created_at", "updated_at"
  ]),
  investment_payments: new Set([
    "id", "user_id", "farm_id", "investment_id", "due_date", "payment_date", "payment_period",
    "amount_due", "amount_paid", "payment_method", "status", "notes", "recorded_by",
    "created_at", "updated_at"
  ]),
  pond_reports: new Set([
    "id", "user_id", "farm_id", "pond_id", "fish_stock_id", "report_type",
    "report_date", "issue", "description", "action_taken", "notes", "treatment_id",
    "created_by", "created_at", "updated_at"
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
    "id", "user_id", "farm_id", "brand", "size", "fish_stock", "remaining_kg", "date", "created_at"
  ]),
  stock_events: new Set([
    "id", "user_id", "pond_id", "farm_id", "pond_name", "date", "species",
    "count", "avg_weight", "cost", "sale_price", "type", "from_pond", "cleared_date", "supplier", "created_at"
  ]),
  mortality_entries: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "count", "cause", "notes", "created_at"
  ]),
  treatment_records: new Set([
    "id", "user_id", "pond_id", "farm_id", "date", "cause", "medicine", "remarks", "created_at"
  ]),
  farms: new Set([
    "id", "user_id", "name", "city", "state", "country", "created_at", "updated_at"
  ]),
  reports: new Set([
    "id", "user_id", "farm_id", "title", "content", "type", "author", "date",
    "status", "resolved_by", "resolved_date", "tags", "timestamp", "created_at"
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
  // Preserve existing user_id if valid; otherwise assign current authenticated userId
  if (!out["user_id"] || !isUuid(out["user_id"])) {
    if (userId && isUuid(userId)) {
      out["user_id"] = userId;
    } else {
      delete out["user_id"];
    }
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
  try {
    const raw = localStorage.getItem("pondtora_user_profile");
    if (raw) {
      const p = JSON.parse(raw);
      if (p?.id && isUuid(p.id)) return p.id;
    }
  } catch {}
  return "";
}

export async function getOwnerUserId(): Promise<string> {
  const currentUid = await getUserId();
  if (!currentUid) return "";

  // 1. Check if user profile has an ownerId or role
  try {
    const raw = localStorage.getItem(`pondtora_${currentUid}_user_profile`) || localStorage.getItem("pondtora_user_profile");
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
  if (currentUid) {
    try {
      const activeStored = localStorage.getItem(`pondtora_${currentUid}_active_farm_id`);
      if (activeStored && isUuid(activeStored)) return activeStored;
    } catch {}
  }
  const ownerId = await getOwnerUserId();
  if (ownerId && ownerId !== currentUid) {
    try {
      const activeStored = localStorage.getItem(`pondtora_${ownerId}_active_farm_id`);
      if (activeStored && isUuid(activeStored)) return activeStored;
    } catch {}
  }
  // Try querying farms
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

async function dbList<T>(table: string, cacheKey?: string): Promise<T[]> {
  const userId = await getUserId();
  const ownerId = await getOwnerUserId();
  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    const items = (data || []).map(r => objToCamel<T>(r));
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

async function dbInsert<T extends { id?: string }>(table: string, item: T, cacheKey?: string): Promise<T> {
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
    while (error && error.message && error.message.includes("column") && error.message.includes("does not exist") && healAttempts < 6) {
      healAttempts++;
      const match = error.message.match(/column "([^"]+)"/);
      if (match && match[1]) {
        console.warn(`Column ${match[1]} does not exist on ${table}, stripping and retrying...`);
        delete snake[match[1]];
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

  const snake = objToSnake(itemToSave as any, effectiveUserId, table);
  const targetId = (item.id && isUuid(item.id)) ? item.id : (snake.id || (item.id ? toUuid(item.id) : undefined));
  delete snake.id; // Strip primary key column so Postgres doesn't reject updating PK in SET clause

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
      let { data, error } = await supabase.from(table).update(snake).eq("id", targetId).select().maybeSingle();
      let healAttempts = 0;
      while (error && error.message && error.message.includes("column") && error.message.includes("does not exist") && healAttempts < 6) {
        healAttempts++;
        const match = error.message.match(/column "([^"]+)"/);
        if (match && match[1]) {
          console.warn(`Column ${match[1]} does not exist on ${table}, stripping and retrying update...`);
          delete snake[match[1]];
          const retry = await supabase.from(table).update(snake).eq("id", targetId).select().maybeSingle();
          data = retry.data;
          error = retry.error;
        } else {
          break;
        }
      }
      if (!data && !error) {
        // Row might not exist in Supabase yet (saved locally) — insert/upsert it
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

async function dbDelete(table: string, id: string, cacheKey?: string): Promise<{ success: boolean }> {
  const userId = await getUserId();
  const ownerId = await getOwnerUserId();
  const targetId = isUuid(id) ? id : (idMap.get(id) || toUuid(id));

  // Update local cache scoped to current user and owner immediately
  const updateCacheForUid = (uid: string) => {
    if (cacheKey) {
      const cached = getLocalCache(uid) || {};
      const list = cached[cacheKey] || [];
      saveLocalCache({ [cacheKey]: list.filter((x: any) => x.id !== id && x.id !== targetId) }, uid);
    }
    try {
      const directKey = `pondtora_${uid}_${table}`;
      const direct = localStorage.getItem(directKey);
      if (direct) {
        const parsed = JSON.parse(direct);
        if (Array.isArray(parsed)) {
          localStorage.setItem(directKey, JSON.stringify(parsed.filter((x: any) => x.id !== id && x.id !== targetId)));
        }
      }
    } catch {}
  };

  if (userId) updateCacheForUid(userId);
  if (ownerId && ownerId !== userId) updateCacheForUid(ownerId);

  try {
    const { error } = await supabase.from(table).delete().eq("id", targetId);
    if (error) console.warn(`Supabase delete from ${table} failed:`, error.message);
    return { success: !error };
  } catch (e) {
    console.warn(`Failed to delete from ${table}:`, e);
    return { success: false };
  }
}

// ── Main API Client ───────────────────────────────────────────────────────────

export const api = {
  setup: async () => ({ sql: "" }),
  autoSetup: async () => ({ success: true }),

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

    // If staff member, resolve all assigned or owner farms
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
        (assignedFarms || []).forEach((f: any) => {
          if (!farms.some(x => x.id === f.id)) farms.push(objToCamel<Farm>(f));
        });
      } else if (staffData.user_id && farms.length === 0) {
        const { data: ownerFarms } = await supabase.from("farms").select("*").eq("user_id", staffData.user_id);
        (ownerFarms || []).forEach((f: any) => {
          if (!farms.some(x => x.id === f.id)) farms.push(objToCamel<Farm>(f));
        });
      }

      // Self-heal staff_auth_id if not yet linked
      if (!staffData.staff_auth_id && userId) {
        supabase.from("staff_members").update({ staff_auth_id: userId, status: "Active" }).eq("id", staffData.id).then();
      }
    }

    return { profile, farms, staffInfo: staffRes.data || null, isStaff };
  },

  // Bulk load all user data from Supabase directly
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
      // Safe query helper: individual catch handlers ensure a single failure doesn't abort all data loading
      const safeQuery = async (queryPromise: PromiseLike<any>) => {
        try {
          const res = await queryPromise;
          return res.error ? { data: null, error: res.error } : res;
        } catch (e) {
          return { data: null, error: e };
        }
      };

      const [
        farmsRes, profilesRes, pondsRes, stockRes, invRes, feedRes,
        bagRes, remainRes, expRes, revRes, mortRes, treatRes,
        staffRes, farmAssignRes, staffPermRes, repRes, custRes, pgRes, invsRes, setRes,
        kqRes, cqRes, krRes, crRes,
        investorsRes, investmentsRes, invPayRes, pondRepRes
      ] = await Promise.all([
        safeQuery(supabase.from("farms").select("*").order("created_at", { ascending: true })),
        safeQuery(supabase.from("user_profiles").select("*").eq("id", userId)),
        safeQuery(supabase.from("ponds").select("*")),
        safeQuery(supabase.from("stock_events").select("*")),
        safeQuery(supabase.from("feed_inventory").select("*")),
        safeQuery(supabase.from("feeding_records").select("*")),
        safeQuery(supabase.from("bag_open_logs").select("*")),
        safeQuery(supabase.from("feed_remaining_logs").select("*")),
        safeQuery(supabase.from("expenses").select("*")),
        safeQuery(supabase.from("revenues").select("*")),
        safeQuery(supabase.from("mortality_entries").select("*")),
        safeQuery(supabase.from("treatment_records").select("*")),
        safeQuery(supabase.from("staff_members").select("*")),
        safeQuery(supabase.from("staff_farm_assignments").select("*")),
        safeQuery(supabase.from("staff_permissions").select("*")),
        safeQuery(supabase.from("reports").select("*")),
        safeQuery(supabase.from("customers").select("*")),
        safeQuery(supabase.from("price_groups").select("*")),
        safeQuery(supabase.from("invoices").select("*")),
        safeQuery(supabase.from("invoice_settings").select("*")),
        safeQuery(supabase.from("knowledge_questions").select("*")),
        safeQuery(supabase.from("compatibility_questions").select("*")),
        safeQuery(supabase.from("knowledge_results").select("*")),
        safeQuery(supabase.from("compatibility_results").select("*")),
        safeQuery(supabase.from("investors").select("*")),
        safeQuery(supabase.from("investments").select("*")),
        safeQuery(supabase.from("investment_payments").select("*")),
        safeQuery(supabase.from("pond_reports").select("*")),
      ]);

      // Robust extract helper: uses authoritative query data when present; falls back to cached data only on query failure
      const extract = <T,>(res: any, cacheKey: string, mapper: (r: any) => T): T[] => {
        if (res && !res.error && Array.isArray(res.data)) {
          return res.data.map(mapper);
        }
        if (res?.error) {
          console.warn(`Query for ${cacheKey} returned error:`, res.error);
        }
        if (cached && Array.isArray(cached[cacheKey]) && cached[cacheKey].length > 0) {
          return cached[cacheKey];
        }
        return (res?.data || []).map(mapper);
      };

      let farms = extract<Farm>(farmsRes, "farms", (r: any) => objToCamel<Farm>(r));

      // Build complete staff list with linked farms and permissions
      const rawStaffList = (staffRes?.data || []).map((r: any) => objToCamel<StaffMember>(r));
      const cachedStaff = ((cached?.staffMembers || []) as StaffMember[]);
      const serverStaffIds = new Set(rawStaffList.map((s: any) => s.id));
      const serverStaffEmails = new Set(rawStaffList.map((s: any) => (s.email || "").toLowerCase().trim()));
      const pendingCachedStaff = cachedStaff.filter(
        cs => cs?.id && !serverStaffIds.has(cs.id) && !serverStaffEmails.has((cs.email || "").toLowerCase().trim())
      );
      const combinedStaffRaw = [...rawStaffList, ...pendingCachedStaff];

      const staffList: StaffMember[] = combinedStaffRaw.map((s: any) => {
        const sFarms = (farmAssignRes?.data || []).filter((a: any) => a.staff_id === s.id).map((a: any) => a.farm_id);
        const sPerms = (staffPermRes?.data || []).filter((p: any) => p.staff_id === s.id && (p.can_view ?? true)).map((p: any) => p.feature);
        const cachedStaffItem = cachedStaff.find((c: any) => c.id === s.id);
        return {
          ...s,
          farms: (s.farms && s.farms.length > 0) ? s.farms : (sFarms.length > 0 ? sFarms : (cachedStaffItem?.farms || [])),
          permissions: (s.permissions && s.permissions.length > 0) ? s.permissions : (sPerms.length > 0 ? sPerms : (cachedStaffItem?.permissions || [])),
        };
      });

      // If user is staff with assigned farms, resolve all their accessible farms
      const userProfilesList = (profilesRes?.data || []).map((r: any) => objToCamel<UserProfile>(r));
      let userEmail = (userProfilesList[0]?.email || "").toLowerCase().trim();
      if (!userEmail) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          userEmail = (session?.user?.email || "").toLowerCase().trim();
        } catch {}
      }

      let staffMember = staffList.find((s: any) => s.staffAuthId === userId || (userEmail && s.email?.toLowerCase() === userEmail));
      if (!staffMember && userEmail) {
        // Fallback direct check if staff row wasn't in list due to RLS
        const { data: directStaff } = await safeQuery(
          supabase.from("staff_members").select("*").or(`staff_auth_id.eq.${userId},email.ilike.${userEmail}`).maybeSingle()
        );
        if (directStaff) {
          staffMember = objToCamel<StaffMember>(directStaff);
          if (!staffList.some(s => s.id === staffMember!.id)) {
            staffList.push(staffMember);
          }
        }
      }

      if (staffMember) {
        // Self-heal staff_auth_id and status if not yet linked
        if (!staffMember.staffAuthId && userId) {
          supabase.from("staff_members").update({ staff_auth_id: userId, status: "Active" }).eq("id", staffMember.id).then();
          staffMember.staffAuthId = userId;
        }

        const targetFarmIds = new Set<string>();
        if (Array.isArray(staffMember.farms)) {
          staffMember.farms.forEach((fid: string) => { if (fid && isUuid(fid)) targetFarmIds.add(fid); });
        }
        (farmAssignRes?.data || []).filter((a: any) => a.staff_id === staffMember!.id).forEach((a: any) => {
          if (a.farm_id && isUuid(a.farm_id)) targetFarmIds.add(a.farm_id);
        });

        if (targetFarmIds.size > 0) {
          const missingFarmIds = Array.from(targetFarmIds).filter(fid => !farms.some(f => f.id === fid));
          if (missingFarmIds.length > 0) {
            const { data: assignedFarms } = await safeQuery(
              supabase.from("farms").select("*").in("id", missingFarmIds)
            );
            if (assignedFarms) {
              for (const af of assignedFarms) {
                if (!farms.some(f => f.id === af.id)) {
                  farms.push(objToCamel<Farm>(af));
                }
              }
            }
          }
        } else if (staffMember.userId) {
          // If no specific farm assignment restriction, grant access to all owner's farms
          const { data: ownerFarms } = await safeQuery(
            supabase.from("farms").select("*").eq("user_id", staffMember.userId)
          );
          if (ownerFarms) {
            for (const of of ownerFarms) {
              if (!farms.some(f => f.id === of.id)) {
                farms.push(objToCamel<Farm>(of));
              }
            }
          }
        }
      }

      const finalStaffMembers = staffList.length > 0
        ? staffList
        : (cachedStaff.length > 0 ? cachedStaff : []);

      // Resolve invoice settings: match current user or owner
      let resolvedInvSettings: InvSettings | null = null;
      if (setRes && Array.isArray(setRes.data) && setRes.data.length > 0) {
        const ownerUid = staffMember?.userId || userId;
        const matching = setRes.data.find((s: any) => s.user_id === ownerUid) || setRes.data.find((s: any) => s.user_id === userId) || setRes.data[0];
        if (matching) resolvedInvSettings = objToCamel<InvSettings>(matching);
      } else if (setRes?.data && !Array.isArray(setRes.data)) {
        resolvedInvSettings = objToCamel<InvSettings>(setRes.data);
      }
      if (!resolvedInvSettings && cached?.invoiceSettings) {
        resolvedInvSettings = cached.invoiceSettings;
      }

      // Auto-heal in background: assign primary farmId to any existing unlinked rows
      const primaryFarm = farms[0];
      if (primaryFarm?.id && isUuid(primaryFarm.id)) {
        const pFid = primaryFarm.id;
        const tablesToHeal = [
          "ponds", "stock_events", "feed_inventory", "feeding_records", "bag_open_logs",
          "feed_remaining_logs", "expenses", "revenues", "mortality_entries", "treatment_records",
          "reports", "customers", "price_groups", "invoices", "investors", "investments", "pond_reports"
        ];
        Promise.all(tablesToHeal.map(tbl =>
          supabase.from(tbl).update({ farm_id: pFid }).is("farm_id", null).then()
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
        staffMembers: finalStaffMembers,
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

      // Save to user-scoped cache and owner cache as backup
      saveLocalCache(result, userId);
      if (staffMember?.userId && staffMember.userId !== userId) {
        saveLocalCache(result, staffMember.userId);
      }
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
    update: (f: Farm) => dbUpdate<Farm>("farms", f, "farms"),
    remove: (id: string) => dbDelete("farms", id, "farms"),
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
    invite: async (opts: {
      id?: string;
      email: string;
      password?: string;
      name?: string;
      phone?: string;
      role?: string;
      farms?: string[];
      permissions?: string[];
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
      // Calling auth.signUp creates the user in Supabase Auth and triggers the official
      // email verification link to /create-password.
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
              farms: opts.farms || [],
              farm_name: opts.farmName || "",
            },
          },
        });

        if (!signUpErr && signUpData?.user) {
          staffAuthId = signUpData.user.id;
          emailSent = true;
        } else if (signUpErr) {
          const errMsg = (signUpErr.message || "").toLowerCase();
          if (errMsg.includes("already registered") || errMsg.includes("already exists") || errMsg.includes("user already")) {
            // User already exists in Supabase Auth.
            // First attempt: Resend verification email
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
              // If resend failed (e.g. email was already confirmed or rate limit),
              // send password recovery email which provides an immediate secure link to /create-password:
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
            // Attempt to send a recovery link so they still receive an email verification
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
        ...(staffAuthId ? { staffAuthId } : {}),
      };

      // 3. Insert/upsert into staff_members table
      await dbInsert<StaffMember>("staff_members", staffMember, "staffMembers");

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
          const farmRows = opts.farms.map(fid => ({
            staff_id: staffMember.id,
            farm_id: fid,
            assigned_by: userId || null,
          }));
          await supabase.from("staff_farm_assignments").insert(farmRows);
        } catch (e) {
          console.warn("Could not insert staff_farm_assignments:", e);
        }
      }

      if (opts.permissions && opts.permissions.length > 0) {
        try {
          await supabase.from("staff_permissions").delete().eq("staff_id", staffMember.id);
          const permRows = opts.permissions.map(feat => ({
            staff_id: staffMember.id,
            feature: feat,
            can_view: true,
            can_create: true,
            can_edit: true,
            can_delete: false,
          }));
          await supabase.from("staff_permissions").insert(permRows);
        } catch (e) {
          console.warn("Could not insert staff_permissions:", e);
        }
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
      const res = await dbUpdate<StaffMember>("staff_members", s, "staffMembers");
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
            await supabase.from("staff_farm_assignments").insert(
              s.farms.map(fid => ({ staff_id: targetId, farm_id: fid, assigned_by: userId || null }))
            );
          }
        } catch {}
      }
      if (s.permissions !== undefined) {
        try {
          await supabase.from("staff_permissions").delete().eq("staff_id", targetId);
          if (s.permissions.length > 0) {
            await supabase.from("staff_permissions").insert(
              s.permissions.map(feat => ({
                staff_id: targetId,
                feature: feat,
                can_view: true,
                can_create: true,
                can_edit: true,
                can_delete: false,
              }))
            );
          }
        } catch {}
      }
      return res;
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
      return dbInsert<FeedingRecord>("feeding_records", dbRec as FeedingRecord, "feedingRecords");
    },
    update: async (r: FeedingRecord) => {
      const dbRec: any = { ...r };
      if (r.date) {
        const d = toValidDbDate(r.date);
        if (d) dbRec.date = d;
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
    create: (item: Investor) => dbInsert<Investor>("investors", item, "investors"),
    update: (item: Investor) => dbUpdate<Investor>("investors", item, "investors"),
    remove: (id: string) => dbDelete("investors", id, "investors"),
  },

  // ── Investments ───────────────────────────────────────────────────────────
  investments: {
    list: () => dbList<Investment>("investments", "investments"),
    create: (item: Investment) => dbInsert<Investment>("investments", item, "investments"),
    update: (item: Investment) => dbUpdate<Investment>("investments", item, "investments"),
    remove: (id: string) => dbDelete("investments", id, "investments"),
  },

  // ── Investment Payments ───────────────────────────────────────────────────
  investmentPayments: {
    list: () => dbList<InvestmentPayment>("investment_payments", "investmentPayments"),
    create: (item: InvestmentPayment) => dbInsert<InvestmentPayment>("investment_payments", item, "investmentPayments"),
    update: (item: InvestmentPayment) => dbUpdate<InvestmentPayment>("investment_payments", item, "investmentPayments"),
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
